import { mkdtemp, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { tmpdir } from "node:os";

import { DEFAULT_MODEL_FILE_PATH } from "./constants.js";
import { PersistenceError } from "./errors.js";
import type { TextClassifier } from "./classifier.js";
import type { PersistedModelState } from "./types.js";

export async function saveToFile(
  classifier: TextClassifier,
  filePath = DEFAULT_MODEL_FILE_PATH
): Promise<void> {
  if (!isAbsolute(filePath)) {
    throw new PersistenceError("model path must be absolute");
  }

  const model = classifier.save();
  const dir = dirname(filePath);
  const tmpDir = await mkdtemp(join(dir, ".tsbayes-"));
  const tmpFile = join(tmpDir, "model.json.tmp");
  const payload = `${JSON.stringify(model)}\n`;

  try {
    await writeFile(tmpFile, payload, "utf8");
    const handle = await open(tmpFile, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(tmpFile, filePath);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

export async function loadFromFile(
  classifier: TextClassifier,
  filePath = DEFAULT_MODEL_FILE_PATH
): Promise<void> {
  if (!isAbsolute(filePath)) {
    throw new PersistenceError("model path must be absolute");
  }

  const content = await readFile(filePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    throw new PersistenceError("model file is not valid JSON");
  }
  if (!isPersistedModelStateShape(parsed)) {
    throw new PersistenceError("model file has invalid structure");
  }
  classifier.load(parsed);
}

export async function saveToTempFile(classifier: TextClassifier): Promise<string> {
  const path = join(tmpdir(), `tsbayes-${Date.now()}.json`);
  await saveToFile(classifier, path);
  return path;
}

function isPersistedModelStateShape(value: unknown): value is PersistedModelState {
  if (!isRecord(value)) {
    return false;
  }
  if (!Number.isInteger(value.version)) {
    return false;
  }
  if (!isRecord(value.categories)) {
    return false;
  }

  for (const [categoryName, categoryValue] of Object.entries(value.categories)) {
    if (categoryName.length === 0 || !isRecord(categoryValue)) {
      return false;
    }
    const tally = categoryValue.tally;
    if (typeof tally !== "number" || !Number.isInteger(tally) || tally < 0) {
      return false;
    }
    if (!isRecord(categoryValue.tokens)) {
      return false;
    }
    for (const [token, count] of Object.entries(categoryValue.tokens)) {
      if (
        token.length === 0 ||
        typeof count !== "number" ||
        !Number.isInteger(count) ||
        count <= 0
      ) {
        return false;
      }
    }
  }

  return true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
