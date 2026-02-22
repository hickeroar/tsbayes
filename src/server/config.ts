import { ValidationError } from "../core/errors.js";

export interface ServerConfig {
  host: string;
  port: number;
  authToken: string | null;
}

export function loadConfig(env: NodeJS.ProcessEnv): ServerConfig {
  const host = env.TSBAYES_HOST ?? "0.0.0.0";
  const port = parsePort(env.TSBAYES_PORT ?? "8000");
  const authToken = (env.TSBAYES_AUTH_TOKEN ?? "").trim();

  return {
    host,
    port,
    authToken: authToken.length > 0 ? authToken : null
  };
}

function parsePort(raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new ValidationError("invalid port");
  }
  return value;
}
