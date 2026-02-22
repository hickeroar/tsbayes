import { describe, expect, it } from "vitest";

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
