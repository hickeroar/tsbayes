import { ValidationError } from "../core/errors.js";

export interface ServerConfig {
  host: string;
  port: number;
  authToken: string | null;
  language: string;
  removeStopWords: boolean;
  verbose: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv): ServerConfig {
  const host = env.TSBAYES_HOST ?? "0.0.0.0";
  const port = parsePort(env.TSBAYES_PORT ?? "8000");
  const authToken = (env.TSBAYES_AUTH_TOKEN ?? "").trim();
  const language = (env.TSBAYES_LANGUAGE ?? "english").trim().toLowerCase() || "english";
  const removeStopWords = parseBool(env.TSBAYES_REMOVE_STOP_WORDS ?? "false");
  const verbose = parseBool(env.TSBAYES_VERBOSE ?? "false");

  return {
    host,
    port,
    authToken: authToken.length > 0 ? authToken : null,
    language,
    removeStopWords,
    verbose
  };
}

function parseBool(raw: string): boolean {
  const v = raw.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function parsePort(raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new ValidationError("invalid port");
  }
  return value;
}
