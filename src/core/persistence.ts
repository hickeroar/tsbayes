import { mkdtemp, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { tmpdir } from "node:os";

import { DEFAULT_MODEL_FILE_PATH } from "./constants.js";
import { PersistenceError } from "./errors.js";
import type { TextClassifier } from "./classifier.js";
import type { PersistedModelState } from "./types.js";

export async function saveToFile(classifier: TextClassifier, filePath = DEFAULT_MODEL_FILE_PATH): Promise<void> {
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

export async function loadFromFile(classifier: TextClassifier, filePath = DEFAULT_MODEL_FILE_PATH): Promise<void> {
  if (!isAbsolute(filePath)) {
    throw new PersistenceError("model path must be absolute");
  }

  const content = await readFile(filePath, "utf8");
  let model: PersistedModelState;
  try {
    model = JSON.parse(content) as PersistedModelState;
  } catch {
    throw new PersistenceError("model file is not valid JSON");
  }
  classifier.load(model);
}

export async function saveToTempFile(classifier: TextClassifier): Promise<string> {
  const path = join(tmpdir(), `tsbayes-${Date.now()}.json`);
  await saveToFile(classifier, path);
  return path;
}
