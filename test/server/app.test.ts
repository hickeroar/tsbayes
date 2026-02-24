import { describe, expect, it, vi } from "vitest";

import { Readiness } from "../../src/server/readiness.js";
import { createApp } from "../../src/server/app.js";
import { TextClassifier } from "../../src/core/classifier.js";

interface ClassificationPayload {
  category: string | null;
  score: number;
}

interface ScorePayload {
  [category: string]: number;
}

interface InfoPayload {
  categories: Array<{ category: string; tokenTally: number }>;
}

describe("HTTP API", () => {
  it("supports train score classify and flush flow", async () => {
    const context = createApp({ authToken: null });
    const { app } = context;
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/train/pets",
      payload: "cats and dogs"
    });
    await app.inject({
      method: "POST",
      url: "/train/tech",
      payload: "software and servers"
    });

    const classify = await app.inject({
      method: "POST",
      url: "/classify",
      payload: "cats are lovely"
    });
    expect(classify.statusCode).toBe(200);
    const classifyPayload = classify.json<ClassificationPayload>();
    expect(classifyPayload.category).toBe("pets");

    const score = await app.inject({
      method: "POST",
      url: "/score",
      payload: "servers"
    });
    expect(score.statusCode).toBe(200);
    const scorePayload = score.json<ScorePayload>();
    expect(scorePayload.tech).toBeGreaterThan(0);

    const info = await app.inject({ method: "GET", url: "/info" });
    expect(info.statusCode).toBe(200);
    const infoPayload = info.json<InfoPayload>();
    expect(infoPayload.categories.length).toBe(2);

    const flush = await app.inject({ method: "POST", url: "/flush" });
    expect(flush.statusCode).toBe(204);

    await app.close();
  });

  it("returns 400 for invalid category route values", async () => {
    const { app } = createApp({ authToken: null });
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/train/invalid*category",
      payload: "text"
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid request" });
    await app.close();
  });

  it("enforces optional bearer authentication with probe bypass", async () => {
    const { app } = createApp({ authToken: "secret-token" });
    await app.ready();

    const probe = await app.inject({ method: "GET", url: "/healthz" });
    expect(probe.statusCode).toBe(200);

    const denied = await app.inject({
      method: "POST",
      url: "/train/pets",
      payload: "cats"
    });
    expect(denied.statusCode).toBe(401);
    expect(denied.headers["www-authenticate"]).toBe("Bearer");

    const allowed = await app.inject({
      method: "POST",
      url: "/train/pets",
      payload: "cats",
      headers: { authorization: "Bearer secret-token" }
    });
    expect(allowed.statusCode).toBe(204);

    await app.close();
  });

  it("allows probe paths with query strings to bypass auth", async () => {
    const { app } = createApp({ authToken: "secret-token" });
    await app.ready();

    const healthz = await app.inject({ method: "GET", url: "/healthz?x=1" });
    expect(healthz.statusCode).toBe(200);

    const readyz = await app.inject({ method: "GET", url: "/readyz?foo=bar" });
    expect(readyz.statusCode).toBe(200);

    await app.close();
  });

  it("returns 503 when readiness is disabled", async () => {
    const readiness = new Readiness();
    const { app } = createApp({ authToken: null, readiness });
    await app.ready();

    readiness.setReady(false);
    const response = await app.inject({ method: "GET", url: "/readyz" });
    expect(response.statusCode).toBe(503);
    expect(response.json()).toEqual({ error: "not ready" });

    await app.close();
  });

  it("returns ready status when readiness is enabled", async () => {
    const { app } = createApp({ authToken: null });
    await app.ready();
    const response = await app.inject({ method: "GET", url: "/readyz" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ready" });
    await app.close();
  });

  it("enforces 1MiB body limit", async () => {
    const { app } = createApp({ authToken: null });
    await app.ready();
    const payload = "x".repeat(1024 * 1024 + 1);

    const response = await app.inject({
      method: "POST",
      url: "/classify",
      payload
    });
    expect(response.statusCode).toBe(413);
    expect(response.json()).toEqual({ error: "payload too large" });

    await app.close();
  });

  it("rejects non-utf8 charset declaration", async () => {
    const { app } = createApp({ authToken: null });
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/classify",
      payload: "hello",
      headers: {
        "content-type": "text/plain; charset=iso-8859-1"
      }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "content must be utf-8" });
    await app.close();
  });

  it("handles empty classify body", async () => {
    const { app } = createApp({ authToken: null });
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/classify"
    });
    expect(response.statusCode).toBe(200);
    expect(response.json<ClassificationPayload>()).toEqual({
      category: null,
      score: 0
    });
    await app.close();
  });

  it("accepts content-type without charset", async () => {
    const { app } = createApp({ authToken: null });
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/classify",
      payload: "hello",
      headers: {
        "content-type": "text/plain"
      }
    });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("returns 404 from not-found handler for unknown routes", async () => {
    const { app } = createApp({ authToken: null });
    await app.ready();
    const response = await app.inject({
      method: "GET",
      url: "/missing"
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "not found" });
    await app.close();
  });

  it("returns 500 when classifier throws unexpected error", async () => {
    const classifier = new TextClassifier() as TextClassifier & {
      score(input: string): Record<string, number>;
    };
    classifier.score = () => {
      throw new Error("boom");
    };
    const { app } = createApp({ authToken: null, classifier });
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/score",
      payload: "anything"
    });
    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({ error: "internal server error" });
    await app.close();
  });

  it("supports untrain route for valid category", async () => {
    const { app } = createApp({ authToken: null });
    await app.ready();
    await app.inject({
      method: "POST",
      url: "/train/pets",
      payload: "cats cats"
    });
    const response = await app.inject({
      method: "POST",
      url: "/untrain/pets",
      payload: "cats"
    });
    expect(response.statusCode).toBe(204);
    const info = await app.inject({ method: "GET", url: "/info" });
    const payload = info.json<InfoPayload>();
    expect(payload.categories[0]?.tokenTally).toBe(1);
    await app.close();
  });

  it("returns 400 for invalid untrain category route value", async () => {
    const { app } = createApp({ authToken: null });
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/untrain/bad*category",
      payload: "text"
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "invalid request" });
    await app.close();
  });

  it("accepts empty bodies for train and untrain", async () => {
    const { app } = createApp({ authToken: null });
    await app.ready();

    const trainResponse = await app.inject({
      method: "POST",
      url: "/train/empty",
      payload: ""
    });
    expect(trainResponse.statusCode).toBe(204);

    const untrainResponse = await app.inject({
      method: "POST",
      url: "/untrain/empty",
      payload: ""
    });
    expect(untrainResponse.statusCode).toBe(204);
    await app.close();
  });

  it("rejects malformed bearer format with extra segments", async () => {
    const { app } = createApp({ authToken: "secret-token" });
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/train/pets",
      payload: "cats",
      headers: { authorization: "Bearer secret-token extra" }
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "unauthorized" });
    await app.close();
  });

  it("verbose mode logs classify tokens and scores", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { app } = createApp({ authToken: null, verbose: true });
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/train/pets",
      payload: "cats are lovely"
    });
    await app.inject({
      method: "POST",
      url: "/classify",
      payload: "cats are lovely"
    });

    const output = errorSpy.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(output).toContain("classify");
    expect(output).toContain("tokens=");
    expect(output).toContain("scores=");
    expect(output).toContain("category=");

    errorSpy.mockRestore();
    await app.close();
  });

  it("verbose mode logs score tokens and scores", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { app } = createApp({ authToken: null, verbose: true });
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/train/tech",
      payload: "servers"
    });
    await app.inject({
      method: "POST",
      url: "/score",
      payload: "servers"
    });

    const output = errorSpy.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(output).toContain("score");
    expect(output).toContain("tokens=");
    expect(output).toContain("scores=");

    errorSpy.mockRestore();
    await app.close();
  });

  it("verbose mode logs train category and body", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { app } = createApp({ authToken: null, verbose: true });
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/train/pets",
      payload: "cats and dogs"
    });

    const output = errorSpy.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(output).toContain("train");
    expect(output).toContain("pets");
    expect(output).toContain("cats and dogs");

    errorSpy.mockRestore();
    await app.close();
  });

  it("verbose mode logs untrain category and body", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { app } = createApp({ authToken: null, verbose: true });
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/train/spam",
      payload: "buy now"
    });
    await app.inject({
      method: "POST",
      url: "/untrain/spam",
      payload: "buy now"
    });

    const output = errorSpy.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(output).toContain("untrain");
    expect(output).toContain("spam");
    expect(output).toContain("buy now");

    errorSpy.mockRestore();
    await app.close();
  });

  it("verbose mode handles null body in preValidation for GET", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { app } = createApp({ authToken: null, verbose: true });
    await app.ready();

    await app.inject({ method: "GET", url: "/healthz" });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
    await app.close();
  });

  it("verbose mode handles non-string body in preValidation", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { app } = createApp({ authToken: null, verbose: true });
    await app.ready();

    await app.inject({
      method: "POST",
      url: "/classify",
      payload: { value: "hello" },
      headers: { "content-type": "application/json" }
    });

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
    await app.close();
  });

  it("verbose false responds without verbose hooks", async () => {
    const { app } = createApp({ authToken: null, verbose: false });
    await app.ready();

    const response = await app.inject({
      method: "POST",
      url: "/classify",
      payload: "cats"
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("returns 400 when JSON body is sent to text endpoints", async () => {
    const { app } = createApp({ authToken: null });
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/classify",
      payload: { value: "hello" },
      headers: {
        "content-type": "application/json"
      }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "body must be text" });
    await app.close();
  });
});
