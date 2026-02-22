import { describe, expect, it } from "vitest";

import { tokenize } from "../../src/core/tokenizer.js";

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
