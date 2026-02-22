import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import { loadConfig } from "../../src/server/config.js";

describe("loadConfig", () => {
  it("loads defaults", () => {
    const config = loadConfig({});
    expect(config).toEqual({
      host: "0.0.0.0",
      port: 8000,
      authToken: null
    });
  });

  it("loads custom environment values", () => {
    const config = loadConfig({
      TSBAYES_HOST: "127.0.0.1",
      TSBAYES_PORT: "9000",
      TSBAYES_AUTH_TOKEN: "secret"
    });
    expect(config).toEqual({
      host: "127.0.0.1",
      port: 9000,
      authToken: "secret"
    });
  });

  it("rejects invalid port values", () => {
    expect(() => loadConfig({ TSBAYES_PORT: "0" })).toThrow(ValidationError);
    expect(() => loadConfig({ TSBAYES_PORT: "70000" })).toThrow(ValidationError);
    expect(() => loadConfig({ TSBAYES_PORT: "abc" })).toThrow(ValidationError);
  });
});
