# Security

DebtControl is an open-source debt/expense tracking demo (Go/Gin + React/Vite).
This file is the public-facing entry point; the full internal standard lives in
[`docs/sec/README-security-standard.md`](docs/sec/README-security-standard.md)
and the decision log in [`docs/adr/`](docs/adr/).

## Reporting a vulnerability

Please **do not** open a public issue for a security bug. Report privately to the
maintainer by email with:

- affected endpoint / module and version,
- steps to reproduce,
- expected vs actual behavior,
- a suggested fix if you have one.

Reports are acknowledged within 3 business days. Validated issues are fixed
before public disclosure (where applicable).

## Supported / scope

The security scope is **OWASP ASVS Level 1 / OWASP Top 10** across the Go backend
and React frontend. See the [threat model](docs/adr/0003-security-model.md) for
the adopted mitigations and [pen-test baseline](docs/sec/pen-test-baseline.md)
for the remediation backlog.

### Current posture (2026-08-07)

- Registration closed by default (feature flag) — admin-only user creation.
- Rotating refresh tokens + real revocation; `HttpOnly`/`Secure`/`SameSite` cookies + CSRF.
- Optional TOTP MFA; per-IP rate limits; password policy ≥ 12 characters.
- Password reset via 6-digit email OTP (Resend), single-use ticket, anti-enumeration.
- Secrets fail-hard in non-development environments; AES-256-GCM field encryption.
- PDF upload validated (size/magic/structural) to prevent DoS.
- CSP (production build), HSTS, `Permissions-Policy`, `X-Content-Type-Options`.

See [ADR-0003](docs/adr/0003-security-model.md) and the `docs/sec/` runbook for
details.

## Policy

- No secrets in the repo. Generate at deploy time or use `.env`.
- Do not weaken a mitigation without a new ADR.
- Ask for a security review on any endpoint that touches auth, uploads, or money.