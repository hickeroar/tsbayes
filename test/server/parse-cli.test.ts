import { describe, expect, it, vi } from "vitest";

import { loadConfig } from "../../src/server/config.js";
import { parseCliArgs, printHelp } from "../../src/server/parse-cli.js";

const argv = (args: string[]) => ["node", "tsbayes", ...args];

describe("parseCliArgs", () => {
  it("returns help true for --help", () => {
    const result = parseCliArgs(argv(["--help"]));
    expect(result.help).toBe(true);
    expect(result.envOverrides).toEqual({});
  });

  it("returns help true for -h", () => {
    const result = parseCliArgs(argv(["-h"]));
    expect(result.help).toBe(true);
  });

  it("parses --host", () => {
    const result = parseCliArgs(argv(["--host", "127.0.0.1"]));
    expect(result.help).toBe(false);
    expect(result.envOverrides.TSBAYES_HOST).toBe("127.0.0.1");
  });

  it("parses --port", () => {
    const result = parseCliArgs(argv(["--port", "3000"]));
    expect(result.envOverrides.TSBAYES_PORT).toBe("3000");
  });

  it("parses --auth-token", () => {
    const result = parseCliArgs(argv(["--auth-token", "secret"]));
    expect(result.envOverrides.TSBAYES_AUTH_TOKEN).toBe("secret");
  });

  it("parses --language", () => {
    const result = parseCliArgs(argv(["--language", "spanish"]));
    expect(result.envOverrides.TSBAYES_LANGUAGE).toBe("spanish");
  });

  it("parses --remove-stop-words", () => {
    const result = parseCliArgs(argv(["--remove-stop-words"]));
    expect(result.envOverrides.TSBAYES_REMOVE_STOP_WORDS).toBe("true");
  });

  it("parses --verbose", () => {
    const result = parseCliArgs(argv(["--verbose"]));
    expect(result.envOverrides.TSBAYES_VERBOSE).toBe("true");
  });

  it("parses -v", () => {
    const result = parseCliArgs(argv(["-v"]));
    expect(result.envOverrides.TSBAYES_VERBOSE).toBe("true");
  });

  it("returns empty envOverrides when no options", () => {
    const result = parseCliArgs(argv([]));
    expect(result.help).toBe(false);
    expect(result.envOverrides).toEqual({});
  });

  it("parses multiple options", () => {
    const result = parseCliArgs(argv(["--host", "0.0.0.0", "--port", "9999", "--verbose"]));
    expect(result.help).toBe(false);
    expect(result.envOverrides.TSBAYES_HOST).toBe("0.0.0.0");
    expect(result.envOverrides.TSBAYES_PORT).toBe("9999");
    expect(result.envOverrides.TSBAYES_VERBOSE).toBe("true");
  });

  it("CLI overrides env: loadConfig with merged env yields CLI values", () => {
    const { envOverrides } = parseCliArgs(argv(["--port", "9999"]));
    const config = loadConfig({
      ...process.env,
      TSBAYES_PORT: "8000",
      ...envOverrides
    });
    expect(config.port).toBe(9999);
  });
});

describe("printHelp", () => {
  it("writes to stdout", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    printHelp();
    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0]!.join(" ");
    expect(output).toContain("Usage:");
    expect(output).toContain("tsbayes");
    expect(output).toContain("Options");
    expect(output).toContain("--help");
    expect(output).toContain("--verbose");
    logSpy.mockRestore();
  });
});
