# Contributing

## Local Setup

1. Install Node.js 20+.
2. Install dependencies:

   ```bash
   npm ci
   ```

3. Run quality checks:

   ```bash
   npm run format:check
   npm run lint
   npm run typecheck
   npm run test:coverage
   npm run build
   ```

4. Optional local guard before commit:

   ```bash
   npm run precommit
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
- Prefer Conventional Commit prefixes (`feat`, `fix`, `docs`, `chore`, `test`, `refactor`) for cleaner release notes.

## Release Notes Process

- Update `CHANGELOG.md` for user-visible changes before tagging.
- Ensure `prepublishOnly` succeeds locally:

  ```bash
  npm run prepublishOnly
  ```
