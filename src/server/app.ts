import Fastify, { type FastifyInstance } from "fastify";

import { TextClassifier } from "../core/classifier.js";
import { CATEGORY_PATTERN } from "../core/constants.js";
import { ValidationError } from "../core/errors.js";
import { createTokenizer } from "../core/tokenizer.js";
import { Readiness } from "./readiness.js";
import { checkAuthorization } from "./auth.js";
import { truncate, verboseLog } from "./verbose-logger.js";

const MAX_BODY_SIZE_BYTES = 1024 * 1024;
const VERBOSE_BODY_MAX = 200;
const CATEGORY_PARAMS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["category"],
  properties: {
    category: {
      type: "string",
      minLength: 1,
      maxLength: 64,
      pattern: CATEGORY_PATTERN.source
    }
  }
} as const;

export interface AppOptions {
  authToken: string | null;
  classifier?: TextClassifier;
  readiness?: Readiness;
  language?: string;
  removeStopWords?: boolean;
  verbose?: boolean;
}

export interface AppContext {
  app: FastifyInstance;
  classifier: TextClassifier;
  readiness: Readiness;
}

/** Builds the Fastify app and wires classifier, auth, validation, and health endpoints. */
export function createApp(options: AppOptions): AppContext {
  const classifier =
    options.classifier ??
    new TextClassifier({
      language: options.language ?? "english",
      removeStopWords: options.removeStopWords ?? false
    });
  const readiness = options.readiness ?? new Readiness();

  const app = Fastify({
    logger: false,
    bodyLimit: MAX_BODY_SIZE_BYTES
  });

  // Parse all payloads as UTF-8 text; endpoint handlers decide how to use content.
  app.addContentTypeParser("*", { parseAs: "buffer" }, (request, body, done) => {
    done(null, body.toString("utf8"));
  });

  app.addHook("onRequest", async (request, reply) => {
    // Charset checks happen early so invalid content types fail consistently.
    const charset = parseCharset(request.headers["content-type"]);
    if (charset && charset.toLowerCase() !== "utf-8") {
      throw new ValidationError("content must be utf-8");
    }

    if (!checkAuthorization(options.authToken, request, reply)) {
      return reply;
    }
    return undefined;
  });

  if (options.verbose) {
    app.addHook("preValidation", async (request) => {
      const body = bodyAsTextSafe(request.body);
      verboseLog(
        true,
        request.method,
        request.url,
        'body="' + truncate(body, VERBOSE_BODY_MAX) + '"'
      );
      await Promise.resolve();
    });

    app.addHook("onSend", (request, reply, payload) => {
      const statusCode = reply.statusCode;
      const body = typeof payload === "string" ? payload : JSON.stringify(payload ?? "");
      verboseLog(true, statusCode, truncate(body, VERBOSE_BODY_MAX));
      return Promise.resolve(payload);
    });
  }

  app.get("/healthz", () => ({ status: "ok" }));
  app.get("/readyz", (request, reply) => {
    if (!readiness.isReady()) {
      return reply.code(503).send({ error: "not ready" });
    }
    return { status: "ready" };
  });

  app.get("/info", () => ({ categories: classifier.categorySummaries() }));

  const lang = options.language ?? "english";
  const removeStopWords = options.removeStopWords ?? false;

  app.post<{ Params: { category: string } }>(
    "/train/:category",
    { schema: { params: CATEGORY_PARAMS_SCHEMA } },
    async (request, reply) => {
      const { category } = request.params;
      const body = bodyAsText(request.body);
      classifier.train(category, body);
      if (options.verbose) {
        verboseLog(
          true,
          "train",
          "category=" + category,
          'body="' + truncate(body, VERBOSE_BODY_MAX) + '"'
        );
      }
      return reply.code(204).send();
    }
  );

  app.post<{ Params: { category: string } }>(
    "/untrain/:category",
    { schema: { params: CATEGORY_PARAMS_SCHEMA } },
    async (request, reply) => {
      const { category } = request.params;
      const body = bodyAsText(request.body);
      classifier.untrain(category, body);
      if (options.verbose) {
        verboseLog(
          true,
          "untrain",
          "category=" + category,
          'body="' + truncate(body, VERBOSE_BODY_MAX) + '"'
        );
      }
      return reply.code(204).send();
    }
  );

  app.post("/classify", (request) => {
    const text = bodyAsText(request.body);
    const result = classifier.classificationResult(text);
    if (options.verbose) {
      const tokenizer = createTokenizer({ language: lang, removeStopWords });
      const tokens = tokenizer(text);
      const scores = classifier.score(text);
      verboseLog(
        true,
        "classify",
        "tokens=" + JSON.stringify(tokens),
        "scores=" + JSON.stringify(scores),
        "category=" + result.category,
        "score=" + result.score
      );
    }
    return result;
  });

  app.post("/score", (request) => {
    const text = bodyAsText(request.body);
    const scores = classifier.score(text);
    if (options.verbose) {
      const tokenizer = createTokenizer({ language: lang, removeStopWords });
      const tokens = tokenizer(text);
      verboseLog(
        true,
        "score",
        "tokens=" + JSON.stringify(tokens),
        "scores=" + JSON.stringify(scores)
      );
    }
    return scores;
  });
  app.post("/flush", (request, reply) => {
    classifier.flush();
    return reply.code(204).send();
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ValidationError) {
      return reply.code(400).send({ error: error.message });
    }
    if (
      (error as { validation?: unknown }).validation ||
      (error as { code?: string }).code === "FST_ERR_VALIDATION"
    ) {
      // Route-schema validation failures map to one stable API error.
      return reply.code(400).send({ error: "invalid request" });
    }
    if ((error as { code?: string }).code === "FST_ERR_CTP_BODY_TOO_LARGE") {
      return reply.code(413).send({ error: "payload too large" });
    }
    request.log.error(error);
    return reply.code(500).send({ error: "internal server error" });
  });

  app.setNotFoundHandler((request, reply) => reply.code(404).send({ error: "not found" }));

  return { app, classifier, readiness };
}

function bodyAsText(body: unknown): string {
  if (body == null) {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  throw new ValidationError("body must be text");
}

function bodyAsTextSafe(body: unknown): string {
  if (body == null) {
    return "";
  }
  if (typeof body === "string") {
    return body;
  }
  return "";
}

/** Extracts optional charset from Content-Type (for example "text/plain; charset=utf-8"). */
function parseCharset(contentType: string | undefined): string | null {
  if (!contentType) {
    return null;
  }
  const parts = contentType.split(";").map((part) => part.trim());
  for (const part of parts) {
    if (part.toLowerCase().startsWith("charset=")) {
      return part.slice("charset=".length).trim();
    }
  }
  return null;
}
