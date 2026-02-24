import { createApp, type AppContext } from "./app.js";
import type { ServerConfig } from "./config.js";

export async function startServer(config: ServerConfig): Promise<AppContext> {
  const context = createApp({
    authToken: config.authToken,
    language: config.language,
    removeStopWords: config.removeStopWords,
    verbose: config.verbose
  });
  await context.app.listen({
    host: config.host,
    port: config.port
  });
  return context;
}
