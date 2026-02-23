import { describe, expect, it } from "vitest";

import { createTokenizer, tokenize } from "../../src/core/tokenizer.js";

describe("tokenize", () => {
  it("normalizes unicode and lowercases", () => {
    const tokens = tokenize("CAFÉ cafe\u0301");
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0]).toBe(tokens[1]);
  });

  it("splits on punctuation and stems english words", () => {
    const tokens = tokenize("running, runs; runner");
    expect(tokens[0]).toBe("run");
    expect(tokens).toContain("runner");
  });
});

describe("createTokenizer", () => {
  it("creates tokenizer with spanish language", () => {
    const tokenizeSpanish = createTokenizer({ language: "spanish" });
    const tokens = tokenizeSpanish("corriendo");
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("filters stop words when removeStopWords is true", () => {
    const tokenizeNoStop = createTokenizer({ language: "english", removeStopWords: true });
    const tokens = tokenizeNoStop("the cat and the dog");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("and");
    expect(tokens.length).toBeLessThan(5);
  });

  it("falls back to english for unsupported language", () => {
    const tokenizeFallback = createTokenizer({ language: "klingon" });
    const tokens = tokenizeFallback("running");
    expect(tokens[0]).toBe("run");
  });

  it("tokenize default keeps same behavior", () => {
    const defaultTokens = tokenize("running, runs");
    const createdTokens = createTokenizer()("running, runs");
    expect(defaultTokens).toEqual(createdTokens);
  });

  it("keeps original token when stemmer throws", () => {
    const throwingStemmer = {
      stem: (w: string): string => {
        if (w === "throwme") throw new Error("stem error");
        return w === "running" ? "run" : w;
      }
    };
    const tokenizeThrows = createTokenizer({
      language: "english",
      removeStopWords: false,
      _stemmer: throwingStemmer
    });
    const tokens = tokenizeThrows("running throwme");
    expect(tokens[0]).toBe("run");
    expect(tokens[1]).toBe("throwme");
  });

  it("keeps original token when stemmer returns empty string", () => {
    const emptyReturnStemmer = {
      stem: (w: string): string => (w === "empty" ? "" : w)
    };
    const tokenizeEmpty = createTokenizer({
      language: "english",
      removeStopWords: false,
      _stemmer: emptyReturnStemmer
    });
    const tokens = tokenizeEmpty("hello empty world");
    expect(tokens).toEqual(["hello", "empty", "world"]);
  });
});
