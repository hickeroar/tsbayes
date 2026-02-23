import { afterEach, describe, expect, it } from "vitest";
import type { AppContext } from "../../src/server/app.js";
import { startServer } from "../../src/server/start.js";

describe("server process", () => {
  const contexts: AppContext[] = [];

  afterEach(async () => {
    await Promise.all(contexts.map((context) => context.app.close()));
    contexts.length = 0;
  });

  it("serves health and classification requests", async () => {
    const port = 8054;
    const context = await startServer({
      host: "127.0.0.1",
      port,
      authToken: null,
      language: "english",
      removeStopWords: false
    });
    contexts.push(context);

    await waitForReady(`http://127.0.0.1:${port}/healthz`);

    const train = await fetch(`http://127.0.0.1:${port}/train/pets`, {
      method: "POST",
      body: "cats and dogs"
    });
    expect(train.status).toBe(204);

    const classify = await fetch(`http://127.0.0.1:${port}/classify`, {
      method: "POST",
      body: "cats"
    });
    expect(classify.status).toBe(200);
    const data = (await classify.json()) as { category: string | null; score: number };
    expect(data.category).toBe("pets");
    expect(data.score).toBeGreaterThan(0);
  });
});

async function waitForReady(url: string): Promise<void> {
  for (let i = 0; i < 150; i += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep polling until service is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("server did not become ready");
}
