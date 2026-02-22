# Contributing

## Local Setup

1. Install Node.js 20+.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Run quality checks:

   ```bash
   npm run lint
   npm run typecheck
   npm run test:coverage
   ```

## Pull Request Expectations

- Keep changes scoped and test-backed.
- Preserve endpoint behavior and error contracts.
- Maintain strict TypeScript settings and lint quality.
- Update docs and changelog for user-visible changes.

## Coverage Policy

- Current target is 100% coverage for lines, branches, functions, and statements.
- Add tests for all new behaviors and edge cases.

## Commit Guidance

- Use concise, descriptive commit messages.
- Mention the user-facing intent, not only implementation details.
