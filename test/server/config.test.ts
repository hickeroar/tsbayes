import { describe, expect, it } from "vitest";

import { ValidationError } from "../../src/core/errors.js";
import { loadConfig } from "../../src/server/config.js";

describe("loadConfig", () => {
  it("loads defaults", () => {
    const config = loadConfig({});
    expect(config).toEqual({
      host: "0.0.0.0",
      port: 8000,
      authToken: null,
      language: "english",
      removeStopWords: false
    });
  });

  it("loads custom environment values", () => {
    const config = loadConfig({
      TSBAYES_HOST: "127.0.0.1",
      TSBAYES_PORT: "9000",
      TSBAYES_AUTH_TOKEN: "secret",
      TSBAYES_LANGUAGE: "spanish",
      TSBAYES_REMOVE_STOP_WORDS: "true"
    });
    expect(config).toEqual({
      host: "127.0.0.1",
      port: 9000,
      authToken: "secret",
      language: "spanish",
      removeStopWords: true
    });
  });

  it("parses TSBAYES_REMOVE_STOP_WORDS as boolean", () => {
    expect(loadConfig({ TSBAYES_REMOVE_STOP_WORDS: "1" }).removeStopWords).toBe(true);
    expect(loadConfig({ TSBAYES_REMOVE_STOP_WORDS: "yes" }).removeStopWords).toBe(true);
    expect(loadConfig({ TSBAYES_REMOVE_STOP_WORDS: "0" }).removeStopWords).toBe(false);
    expect(loadConfig({}).removeStopWords).toBe(false);
  });

  it("rejects invalid port values", () => {
    expect(() => loadConfig({ TSBAYES_PORT: "0" })).toThrow(ValidationError);
    expect(() => loadConfig({ TSBAYES_PORT: "70000" })).toThrow(ValidationError);
    expect(() => loadConfig({ TSBAYES_PORT: "abc" })).toThrow(ValidationError);
  });
});
