import { describe, expect, it } from "vitest";

import { isProbePath } from "../../src/server/auth.js";
import { createApp } from "../../src/server/app.js";

describe("auth paths", () => {
  it("rejects malformed authorization scheme", async () => {
    const { app } = createApp({ authToken: "secret-token" });
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/train/pets",
      payload: "cats",
      headers: { authorization: "Basic abc" }
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "unauthorized" });
    await app.close();
  });

  it("rejects incorrect bearer token", async () => {
    const { app } = createApp({ authToken: "secret-token" });
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/train/pets",
      payload: "cats",
      headers: { authorization: "Bearer wrong-token" }
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "unauthorized" });
    await app.close();
  });

  it("isProbePath handles url with and without query string", () => {
    expect(isProbePath("/healthz")).toBe(true);
    expect(isProbePath("/healthz?x=1")).toBe(true);
    expect(isProbePath("/readyz")).toBe(true);
    expect(isProbePath("/readyz?foo=bar")).toBe(true);
    expect(isProbePath("/api/train")).toBe(false);
    expect(isProbePath("")).toBe(false);
    expect(isProbePath(undefined as unknown as string)).toBe(false);
  });

  it("rejects short bearer token to cover constant-time mismatch path", async () => {
    const { app } = createApp({ authToken: "very-long-secret-token" });
    await app.ready();
    const response = await app.inject({
      method: "POST",
      url: "/train/pets",
      payload: "cats",
      headers: { authorization: "Bearer short" }
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "unauthorized" });
    await app.close();
  });
});
