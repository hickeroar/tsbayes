# tsbayes

A memory-based, optional-persistence naive Bayesian text classification package and web API for TypeScript/Node.js.

[![CI](https://github.com/hickeroar/tsbayes/actions/workflows/ci.yml/badge.svg)](https://github.com/hickeroar/tsbayes/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40hickeroar%2Ftsbayes.svg)](https://www.npmjs.com/package/@hickeroar/tsbayes)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## Why?

```text
Bayesian text classification is useful for things like spam detection,
sentiment determination, and general category routing.

You gather representative samples for each category, train the model,
then classify new text based on learned token patterns.

Once the model is trained, you can:
- classify input into a best-fit category
- inspect relative per-category scores
- persist and reload model state
```

## Installation

Requires Node.js 20 or newer.

Package usage:

```bash
npm install @hickeroar/tsbayes
```

Contributor/development setup:

```bash
git clone <your-repo-url>
cd tsbayes
npm ci
```

---

## Run as an API Server

See [Running the Server](#running-the-server) for all run methods. CLI options override environment variables.

```bash
npm run dev
```

---

## Running the Server

### Global install

```bash
npm install -g @hickeroar/tsbayes
tsbayes
tsbayes --port 3000 --verbose
```

### Local install (non-global)

```bash
npm install @hickeroar/tsbayes
npx tsbayes
# or
./node_modules/.bin/tsbayes
```

### From source (npm run start)

```bash
npm run build
npm run start
npm run start -- --port 3000
```

### Environment variables

```bash
TSBAYES_PORT=9000 TSBAYES_VERBOSE=true tsbayes
```

### Help

```bash
tsbayes --help
```

### CLI options

| Option                 | Short | Description                                     |
| ---------------------- | ----- | ----------------------------------------------- |
| `-h, --help`           |       | Show help                                       |
| `-v, --verbose`        |       | Log requests, responses, and classifier details |
| `--host <host>`        |       | Listen host (default: 0.0.0.0)                  |
| `--port <port>`        |       | Listen port (default: 8000)                     |
| `--auth-token <token>` |       | Bearer token for API auth                       |
| `--language <lang>`    |       | Stemmer language (default: english)             |
| `--remove-stop-words`  |       | Filter stop words                               |

### Environment variables (overridden by CLI)

```text
TSBAYES_HOST             default: "0.0.0.0"
TSBAYES_PORT             default: "8000"
TSBAYES_AUTH_TOKEN
TSBAYES_LANGUAGE         default: "english" — stemmer language for the server classifier
TSBAYES_REMOVE_STOP_WORDS   default: "false" — set to "true", "1", or "yes" to filter stop words
TSBAYES_VERBOSE          default: "false" — set to "true", "1", or "yes" for request/response logging
```

When `TSBAYES_AUTH_TOKEN` is configured, all API endpoints except `/healthz` and `/readyz` (and their query-string variants, e.g. `/healthz?x=1`) require:

```text
Authorization: Bearer <token>
```

## Use as a Library in Your App

Import and create a classifier:

```ts
import { TextClassifier, loadFromFile, saveToFile } from "@hickeroar/tsbayes";

const classifier = new TextClassifier();

classifier.train("spam", "buy now limited offer click here");
classifier.train("ham", "team meeting schedule for tomorrow");

const classification = classifier.classificationResult("limited offer today");
console.log(`category=${classification.category} score=${classification.score}`);

const scores = classifier.score("team schedule update");
console.log(scores);

classifier.untrain("spam", "buy now limited offer click here");

await saveToFile(classifier, "/tmp/tsbayes-model.json");
const loaded = new TextClassifier();
await loadFromFile(loaded, "/tmp/tsbayes-model.json");
console.log(loaded.classificationResult("limited offer today"));
```

Notes for library usage:

- Classifier operations are safe for concurrent request handling in a single Node process.
- Scores are relative values; compare scores within the same model.
- Default tokenization applies Unicode NFKC normalization, lowercasing, non-word splitting, and English stemming.
- Category names accepted by `train` and `untrain` match `^[-_A-Za-z0-9]{1,64}$`.

### Multi-language and stop words

Supported languages match [snowball-stemmers](https://github.com/nicksrandall/node-snowball-stemmers) exactly (e.g. `english`, `spanish`, `french`, `german`, `tamil`). Use `supportedLanguages()` to list them.

Create a custom tokenizer with `createTokenizer({ language?, removeStopWords? })`:

```ts
const tokenizer = createTokenizer({ language: "spanish", removeStopWords: true });
const classifier = new TextClassifier({ tokenizer });
// Or pass options directly:
const classifier = new TextClassifier({ language: "spanish", removeStopWords: true });
```

When using `language` or `removeStopWords` options (not a custom tokenizer), persisted models store the tokenizer config; loading restores it.

### Errors

`ValidationError` and `PersistenceError` are thrown by:

- `train` / `untrain` — invalid category names
- `saveToFile` / `loadFromFile` — invalid paths or corrupted model state

Import and use for typed error handling:

```ts
import { TextClassifier, ValidationError, PersistenceError } from "@hickeroar/tsbayes";

try {
  await loadFromFile(classifier, path);
} catch (e) {
  if (e instanceof PersistenceError) {
    console.error("Model load failed:", e.message);
  }
}
```

File API notes:

- `saveToFile` and `loadFromFile` default to `/tmp/tsbayes-model.json` when no path is provided.
- Provided file paths must be absolute.

## Development Checks

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run build
```

Security checks used by CI:

```bash
npm audit --omit=dev --audit-level=high
npm audit --audit-level=high
```

---

## Using the HTTP API

### API Notes

- Category names in `/train/:category` and `/untrain/:category` must match `^[-_A-Za-z0-9]{1,64}$`.
- Invalid category path params return `400` with `{"error":"invalid request"}`.
- Request body size is capped at 1 MiB.
- Error responses are JSON: `{"error":"<message>"}`.
- If `charset` is declared in `Content-Type`, it must be UTF-8.
- The HTTP service stores classifier state in memory; process restarts clear training data.
- Empty request bodies are accepted for `/train/:category` and `/untrain/:category`; this is a no-op for model token tallies.

### Common Error Responses

| Status | When                                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------------- |
| `400`  | Invalid payload or route params (for example non-UTF-8 charset, non-text body, or invalid category pattern) |
| `401`  | Missing/invalid bearer token when auth is enabled                                                           |
| `404`  | Invalid route                                                                                               |
| `413`  | Request body exceeds 1 MiB                                                                                  |
| `500`  | Unexpected server error                                                                                     |

### Training the Classifier

##### Endpoint:

```text
/train/:category
Example: /train/spam
Accepts: POST
Body: raw text/plain
```

Example:

```bash
curl -s -X POST "http://localhost:8000/train/spam" \
  -H "Content-Type: text/plain" \
  --data "buy now limited offer click here"
```

### Untraining the Classifier

##### Endpoint:

```text
/untrain/:category
Example: /untrain/spam
Accepts: POST
Body: raw text/plain
```

### Getting Classifier Status

##### Endpoint:

```text
/info
Accepts: GET
```

Example response:

```json
{
  "categories": [
    {
      "category": "spam",
      "tokenTally": 6
    }
  ]
}
```

### Classifying Text

##### Endpoint:

```text
/classify
Accepts: POST
Body: raw text/plain
```

Example response:

```json
{
  "category": "spam",
  "score": 3.2142857142857144
}
```

If no category can be selected (for example, untrained model), `category` is returned as `null`.

### Scoring Text

##### Endpoint:

```text
/score
Accepts: POST
Body: raw text/plain
```

Example response:

```json
{
  "spam": 3.2142857142857144,
  "ham": 0.7857142857142857
}
```

### Flushing Training Data

##### Endpoint:

```text
/flush
Accepts: POST
Body: raw text/plain (optional)
```

### Health and Readiness

##### Liveness endpoint

```text
/healthz
Accepts: GET
```

##### Readiness endpoint

```text
/readyz
Accepts: GET
```

`/healthz` and `/readyz` (including query-string variants like `/healthz?x=1`) are intentionally unauthenticated even when API auth is enabled.

## Operational Notes

- The HTTP server is in-memory by default; deploys/restarts wipe trained state.
- Use `saveToFile` and `loadFromFile` in library workflows to persist/reload model state.
- `/readyz` returns `200` while accepting traffic and `503` when draining during shutdown.
