import { loadConfig } from "./server/config.js";
import { parseCliArgs, printHelp } from "./server/parse-cli.js";
import { startServer } from "./server/start.js";

async function run(): Promise<void> {
  const { help, envOverrides } = parseCliArgs(process.argv);
  if (help) {
    printHelp();
    process.exit(0);
  }

  const env = { ...process.env, ...envOverrides };
  const config = loadConfig(env);
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
