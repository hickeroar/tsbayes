import { describe, expect, it } from "vitest";

import { MODEL_VERSION } from "../../src/core/constants.js";
import { TextClassifier, validateModelState } from "../../src/core/classifier.js";
import { PersistenceError, ValidationError } from "../../src/core/errors.js";

describe("TextClassifier", () => {
  it("trains and classifies deterministic winner", () => {
    const classifier = new TextClassifier();
    classifier.train("pets", "cats are lovely pets");
    classifier.train("tech", "servers and networks and software");

    const result = classifier.classificationResult("cats and pets");
    expect(result.category).toBe("pets");
    expect(result.score).toBeGreaterThan(0);
  });

  it("returns null category and zero score when empty", () => {
    const classifier = new TextClassifier();
    expect(classifier.classificationResult("anything")).toEqual({
      category: null,
      score: 0
    });
    expect(classifier.score("anything")).toEqual({});
  });

  it("uses lexical tie-break for equal scores", () => {
    const classifier = new TextClassifier();
    classifier.train("alpha", "same token");
    classifier.train("beta", "same token");

    const result = classifier.classificationResult("same");
    expect(result.category).toBe("alpha");
  });

  it("ignores untrain for unknown category", () => {
    const classifier = new TextClassifier();
    classifier.untrain("unknown", "text");
    expect(classifier.categorySummaries()).toEqual([]);
  });

  it("removes category when tally reaches zero", () => {
    const classifier = new TextClassifier();
    classifier.train("pets", "cats cats");
    classifier.untrain("pets", "cats cats");
    expect(classifier.categorySummaries()).toEqual([]);
  });

  it("supports partial untrain and keeps category", () => {
    const classifier = new TextClassifier();
    classifier.train("pets", "cats cats cats");
    classifier.untrain("pets", "cats");
    expect(classifier.categorySummaries()).toEqual([
      {
        category: "pets",
        tokenTally: 2
      }
    ]);
  });

  it("ignores untrain tokens not present in category", () => {
    const classifier = new TextClassifier();
    classifier.train("pets", "cats");
    classifier.untrain("pets", "dogs");
    expect(classifier.categorySummaries()).toEqual([
      {
        category: "pets",
        tokenTally: 1
      }
    ]);
  });

  it("retains zero-tally category when trained with empty text", () => {
    const classifier = new TextClassifier();
    classifier.train("empty", "");
    expect(classifier.categorySummaries()).toEqual([
      {
        category: "empty",
        tokenTally: 0
      }
    ]);
  });

  it("handles mixed zero and non-zero category tallies while scoring", () => {
    const classifier = new TextClassifier();
    classifier.train("empty", "");
    classifier.train("pets", "cats");
    const result = classifier.score("cats");
    expect(result.pets).toBeGreaterThan(0);
  });

  it("flushes state", () => {
    const classifier = new TextClassifier();
    classifier.train("pets", "cats");
    classifier.flush();
    expect(classifier.categorySummaries()).toEqual([]);
  });

  it("rejects invalid category names", () => {
    const classifier = new TextClassifier();
    expect(() => classifier.train("bad*name", "text")).toThrow(ValidationError);
  });

  it("classify() returns top category", () => {
    const classifier = new TextClassifier();
    classifier.train("pets", "cats dogs");
    expect(classifier.classify("cats")).toBe("pets");
  });

  it("reuses existing category state when training same category", () => {
    const classifier = new TextClassifier();
    classifier.train("pets", "cats");
    classifier.train("pets", "dogs");
    expect(classifier.categorySummaries()).toEqual([
      {
        category: "pets",
        tokenTally: 2
      }
    ]);
  });

  it("loads valid model state with empty categories", () => {
    const classifier = new TextClassifier();
    classifier.load({
      version: MODEL_VERSION,
      categories: {}
    });
    expect(classifier.categorySummaries()).toEqual([]);
  });

  it("validateModelState rejects unsupported version", () => {
    expect(() =>
      validateModelState({
        version: MODEL_VERSION + 1,
        categories: {}
      })
    ).toThrow(PersistenceError);
  });

  it("validateModelState rejects invalid category key", () => {
    expect(() =>
      validateModelState({
        version: MODEL_VERSION,
        categories: {
          "bad*category": { tally: 1, tokens: { x: 1 } }
        }
      })
    ).toThrow(PersistenceError);
  });

  it("validateModelState rejects invalid tally", () => {
    expect(() =>
      validateModelState({
        version: MODEL_VERSION,
        categories: {
          pets: { tally: -1, tokens: {} }
        }
      })
    ).toThrow(PersistenceError);
  });

  it("validateModelState rejects empty token keys", () => {
    expect(() =>
      validateModelState({
        version: MODEL_VERSION,
        categories: {
          pets: { tally: 1, tokens: { "": 1 } }
        }
      })
    ).toThrow(PersistenceError);
  });

  it("validateModelState rejects non-positive token counts", () => {
    expect(() =>
      validateModelState({
        version: MODEL_VERSION,
        categories: {
          pets: { tally: 1, tokens: { cat: 0 } }
        }
      })
    ).toThrow(PersistenceError);
  });

  it("respects overridden score output ordering", () => {
    const classifier = new TextClassifier();
    Object.defineProperty(classifier, "score", {
      value: () => ({ beta: 1, alpha: 1 }),
      configurable: true
    });
    expect(classifier.classificationResult("ignored")).toEqual({
      category: "alpha",
      score: 1
    });
  });
});
