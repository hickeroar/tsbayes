import { parseArgs } from "node:util";

const OPTIONS = {
  host: { type: "string" as const },
  port: { type: "string" as const },
  "auth-token": { type: "string" as const },
  language: { type: "string" as const },
  "remove-stop-words": { type: "boolean" as const, default: false },
  verbose: { type: "boolean" as const, short: "v", default: false },
  help: { type: "boolean" as const, short: "h", default: false }
};

export interface ParseCliResult {
  help: boolean;
  envOverrides: Record<string, string>;
}

export function parseCliArgs(argv: string[]): ParseCliResult {
  const { values } = parseArgs({ args: argv.slice(2), options: OPTIONS });

  if (values.help) {
    return { help: true, envOverrides: {} };
  }

  const envOverrides: Record<string, string> = {};

  if (values.host !== undefined) {
    envOverrides.TSBAYES_HOST = values.host;
  }
  if (values.port !== undefined) {
    envOverrides.TSBAYES_PORT = values.port;
  }
  if (values["auth-token"] !== undefined) {
    envOverrides.TSBAYES_AUTH_TOKEN = values["auth-token"];
  }
  if (values.language !== undefined) {
    envOverrides.TSBAYES_LANGUAGE = values.language;
  }
  if (values["remove-stop-words"] === true) {
    envOverrides.TSBAYES_REMOVE_STOP_WORDS = "true";
  }
  if (values.verbose === true) {
    envOverrides.TSBAYES_VERBOSE = "true";
  }

  return { help: false, envOverrides };
}

export function printHelp(): void {
  const text = `tsbayes - Bayesian text classifier HTTP API

Usage: tsbayes [options]

Options:
  -h, --help                 Show this help
  -v, --verbose              Log requests, responses, and classifier details
  --host <host>              Listen host (default: 0.0.0.0)
  --port <port>              Listen port (default: 8000)
  --auth-token <token>       Bearer token for API auth
  --language <lang>          Stemmer language (default: english)
  --remove-stop-words        Filter stop words

Environment variables (overridden by CLI): TSBAYES_HOST, TSBAYES_PORT,
  TSBAYES_AUTH_TOKEN, TSBAYES_LANGUAGE, TSBAYES_REMOVE_STOP_WORDS,
  TSBAYES_VERBOSE
`;
  console.log(text);
}
