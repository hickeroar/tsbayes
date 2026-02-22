# Security Policy

## Reporting a Vulnerability

Please report suspected vulnerabilities by opening a private security advisory in GitHub for this repository.

If private advisory reporting is unavailable, open an issue with minimal details and request a private follow-up channel.

Include:

- affected version/commit
- reproduction details
- impact assessment
- any suggested mitigation

## Response Expectations

- Initial acknowledgement target: within 3 business days
- Status updates during triage and remediation
- Coordinated disclosure after a fix is available

## Temporary Audit Scope Policy

- CI blocks on high vulnerabilities in production dependencies via `npm audit --omit=dev --audit-level=high`.
- CI also runs a full-tree audit report as non-blocking visibility for dev-tooling and transitive issues.
- This temporary scope exists to avoid merge deadlocks from upstream dev-only advisories while still preserving visibility.
- Policy target: remove this temporary scope and restore full blocking audits once upstream dependency fixes are available.
