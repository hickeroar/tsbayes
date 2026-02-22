import Fastify, { type FastifyInstance } from "fastify";

import { TextClassifier } from "../core/classifier.js";
import { CATEGORY_PATTERN } from "../core/constants.js";
import { ValidationError } from "../core/errors.js";
import { Readiness } from "./readiness.js";
import { checkAuthorization } from "./auth.js";

const MAX_BODY_SIZE_BYTES = 1024 * 1024;
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
}

export interface AppContext {
  app: FastifyInstance;
  classifier: TextClassifier;
  readiness: Readiness;
}

export function createApp(options: AppOptions): AppContext {
  const classifier = options.classifier ?? new TextClassifier();
  const readiness = options.readiness ?? new Readiness();

  const app = Fastify({
    logger: false,
    bodyLimit: MAX_BODY_SIZE_BYTES
  });

  app.addContentTypeParser("*", { parseAs: "buffer" }, (request, body, done) => {
    done(null, body.toString("utf8"));
  });

  app.addHook("onRequest", async (request, reply) => {
    const charset = parseCharset(request.headers["content-type"]);
    if (charset && charset.toLowerCase() !== "utf-8") {
      throw new ValidationError("content must be utf-8");
    }

    if (!checkAuthorization(options.authToken, request, reply)) {
      return reply;
    }
    return undefined;
  });

  app.get("/healthz", () => ({ status: "ok" }));
  app.get("/readyz", (request, reply) => {
    if (!readiness.isReady()) {
      return reply.code(503).send({ error: "not ready" });
    }
    return { status: "ready" };
  });

  app.get("/info", () => ({ categories: classifier.categorySummaries() }));

  app.post<{ Params: { category: string } }>(
    "/train/:category",
    { schema: { params: CATEGORY_PARAMS_SCHEMA } },
    async (request, reply) => {
      const { category } = request.params;
      classifier.train(category, bodyAsText(request.body));
      return reply.code(204).send();
    }
  );

  app.post<{ Params: { category: string } }>(
    "/untrain/:category",
    { schema: { params: CATEGORY_PARAMS_SCHEMA } },
    async (request, reply) => {
      const { category } = request.params;
      classifier.untrain(category, bodyAsText(request.body));
      return reply.code(204).send();
    }
  );

  app.post("/classify", (request) => classifier.classificationResult(bodyAsText(request.body)));
  app.post("/score", (request) => classifier.score(bodyAsText(request.body)));
  app.post("/flush", (request, reply) => {
    classifier.flush();
    return reply.code(204).send();
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ValidationError) {
      return reply.code(400).send({ error: error.message });
    }
    if ((error as { code?: string }).code === "FST_ERR_VALIDATION") {
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
