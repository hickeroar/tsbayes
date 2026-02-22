import { loadConfig } from "./server/config.js";
import { startServer } from "./server/start.js";

async function run(): Promise<void> {
  const config = loadConfig(process.env);
  const context = await startServer(config);

  const shutdown = async (): Promise<void> => {
    context.readiness.setReady(false);
    await context.app.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown());
  process.on("SIGINT", () => void shutdown());
}

void run();
