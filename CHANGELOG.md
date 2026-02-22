# Changelog

All notable changes to this project are documented here.

## [1.0.0] - 2026-02-21

- Initial TypeScript implementation of the classifier core.
- Added HTTP service with training, scoring, classification, and lifecycle endpoints.
- Invalid `/train/:category` and `/untrain/:category` params now return `400` with `{"error":"invalid request"}`.
- Added JSON model persistence with validation and atomic file writes.
- Added strict testing, linting, and CI foundations.
- Added scoped security audit policy in CI (blocking production dependency audit + non-blocking full-tree visibility report).
- Pinned vulnerable transitive `minimatch` via npm `overrides` to clear high-severity audit findings.
