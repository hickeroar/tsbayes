import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TextClassifier } from "../../src/core/classifier.js";
import { PersistenceError } from "../../src/core/errors.js";
import { loadFromFile, saveToFile, saveToTempFile } from "../../src/core/persistence.js";

describe("persistence", () => {
  it("round-trips model state to file", async () => {
    const classifier = new TextClassifier();
    classifier.train("pets", "cats dogs");
    classifier.train("tech", "servers");

    const dir = await mkdtemp(join(tmpdir(), "tsbayes-test-"));
    const filePath = join(dir, "model.json");
    await saveToFile(classifier, filePath);

    const next = new TextClassifier();
    await loadFromFile(next, filePath);
    expect(next.categorySummaries()).toEqual(classifier.categorySummaries());
    expect(next.classificationResult("cats").category).toBe("pets");
  });

  it("rejects non-absolute model path", async () => {
    const classifier = new TextClassifier();
    await expect(saveToFile(classifier, "relative.json")).rejects.toBeInstanceOf(PersistenceError);
  });

  it("rejects invalid model shape on load", () => {
    const classifier = new TextClassifier();
    expect(() =>
      classifier.load({
        version: 1,
        categories: {
          pets: {
            tally: 10,
            tokens: { cat: 1 }
          }
        }
      })
    ).toThrow(PersistenceError);
  });

  it("writes json payload", async () => {
    const classifier = new TextClassifier();
    classifier.train("pets", "cats");
    const dir = await mkdtemp(join(tmpdir(), "tsbayes-test-"));
    const filePath = join(dir, "model.json");
    await saveToFile(classifier, filePath);
    const payload = await readFile(filePath, "utf8");
    expect(payload).toContain('"version":1');
  });

  it("rejects non-absolute path for load", async () => {
    const classifier = new TextClassifier();
    await expect(loadFromFile(classifier, "relative.json")).rejects.toBeInstanceOf(PersistenceError);
  });

  it("rejects invalid json content", async () => {
    const classifier = new TextClassifier();
    const dir = await mkdtemp(join(tmpdir(), "tsbayes-test-"));
    const filePath = join(dir, "broken.json");
    await writeFile(filePath, "{not json", "utf8");
    await expect(loadFromFile(classifier, filePath)).rejects.toBeInstanceOf(PersistenceError);
  });

  it("saves to generated temp file path", async () => {
    const classifier = new TextClassifier();
    classifier.train("pets", "cats");
    const filePath = await saveToTempFile(classifier);
    expect(filePath).toContain("tsbayes-");
    const payload = await readFile(filePath, "utf8");
    expect(payload).toContain('"version":1');
  });
});
