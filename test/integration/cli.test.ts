import { spawn, spawnSync } from "node:child_process";
import { describe, expect, it, beforeAll } from "vitest";

const CLI_ENTRY = "dist/cli.js";
const EXIT_TIMEOUT_MS = 10000;

beforeAll(() => {
  const result = spawnSync("npm", ["run", "build"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "ignore"
  });
  if (result.status !== 0) {
    throw new Error("failed to build dist/cli.js before integration tests");
  }
});

function randomPort(): number {
  return 20000 + Math.floor(Math.random() * 20000);
}

describe("cli process", () => {
  it("starts server and shuts down on SIGTERM", async () => {
    const port = randomPort();
    const child = spawn(process.execPath, [CLI_ENTRY], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TSBAYES_HOST: "127.0.0.1",
        TSBAYES_PORT: String(port),
        TSBAYES_AUTH_TOKEN: ""
      },
      stdio: "ignore"
    });

    try {
      await waitForReady(`http://127.0.0.1:${port}/healthz`);
      const statusBeforeStop = await fetch(`http://127.0.0.1:${port}/readyz`);
      expect(statusBeforeStop.status).toBe(200);

      child.kill("SIGTERM");
      const { code, signal } = await waitForExit(child, EXIT_TIMEOUT_MS);
      expect(signal).toBeNull();
      expect(code).toBe(0);
    } finally {
      if (!child.killed) {
        child.kill("SIGKILL");
      }
    }
  });

  it("exits with non-zero status on invalid configuration", async () => {
    const child = spawn(process.execPath, [CLI_ENTRY], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        TSBAYES_PORT: "0"
      },
      stdio: "ignore"
    });

    const { code } = await waitForExit(child, EXIT_TIMEOUT_MS);
    expect(code).not.toBe(0);
  });
});

async function waitForReady(url: string): Promise<void> {
  for (let i = 0; i < 100; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling while the process starts.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server did not become ready");
}

function waitForExit(
  child: ReturnType<typeof spawn>,
  timeoutMs: number
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeoutMs);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      resolve({ code, signal });
    });
  });
}
