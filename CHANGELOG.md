# Changelog

All notable changes to this project are documented here.

## [1.2.0] - 2026-02-23

- Multi-language stemming and stop words (createTokenizer, TextClassifier language/removeStopWords options).
- Stop words module with get(), supported(), supportedLanguages() (languages match snowball-stemmers exactly).
- Tokenizer config persisted in model state when using language options.
- Exported ValidationError and PersistenceError for typed error handling.
- Fixed Error prototype chain in custom error classes.
- Auth probe path now handles query strings (e.g. /healthz?x=1 bypasses auth).
- Fastify validation error handling checks error.validation.
- Server env vars: TSBAYES_LANGUAGE, TSBAYES_REMOVE_STOP_WORDS.

## [1.0.1] - 2026-02-22

- Patch release metadata and workflow alignment updates.

## [1.0.0] - 2026-02-21

- Initial TypeScript implementation of the classifier core.
- Added HTTP service with training, scoring, classification, and lifecycle endpoints.
- Invalid `/train/:category` and `/untrain/:category` params now return `400` with `{"error":"invalid request"}`.
- Added JSON model persistence with validation and atomic file writes.
- Added strict testing, linting, and CI foundations.
- Added scoped security audit policy in CI (blocking production dependency audit + non-blocking full-tree visibility report).
- Pinned vulnerable transitive `minimatch` via npm `overrides` to clear high-severity audit findings.
