import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const targets = [
  "README.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "src/index.ts",
  ".github/workflows/ci.yml"
];

const forbiddenPatterns = [
  /\/Users\/ryan\/Developer\//,
  /reference implementation/i,
  /ported from/i
];

const violations = [];
for (const target of targets) {
  const filePath = resolve(process.cwd(), target);
  const content = await readFile(filePath, "utf8");
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      violations.push(`${target} matched ${pattern}`);
    }
  }
}

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(violation);
  }
  process.exit(1);
}

console.log("Standalone audit passed.");
