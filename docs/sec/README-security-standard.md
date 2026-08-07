# DebtControl — Security Standard

Security posture and hardening for **DebtControl** (Go/Gin backend + React/Vite
frontend, deployed on Render free tier). Scope: **OWASP Top 10** and **OWASP ASVS
Level 1**. This is the single reference for how threats are handled and how to
report vulnerabilities.

## How to use this document

- **Threat model**: see [ADR-0003](docs/adr/0003-security-model.md).
- **Per-ticket decisions**: see the decision log tables below and `docs/sec/`.
- **Baseline pentest**: `docs/sec/pen-test-baseline.md`.
- **New code**: read this standard, then follow the relevant ADR before merging.

## Reporting a vulnerability

DebtControl is an open-source demo. Report issues **privately** by email to the
maintainer rather than opening a public issue, so users can be patched before
disclosure. Include: affected endpoint/module, steps to reproduce, expected vs
actual behavior, and any suggested fix. Maintainers will acknowledge within 3
business days.

## Threat model (OWASP Top 10 → adopted mitigations)

| OWASP | Adoption | Where |
|---|---|---|
| **A01 Broken Access Control** | Registration gated by feature flag (`REGISTRATION_ENABLED`, default **false**), admin-only user creation; CORS allow-list; `/debts/seed` admin-only | [ADR-0004] `router.go`, `main.go` |
| **A02 Crypto/Secret Failures** | Secrets generated at runtime in Render (`JWT_SECRET`, `ENCRYPTION_KEY`), **fail-hard** when absent in non-dev; AES-256-GCM field encryption; bcrypt passwords; OTP constant-time | [ADR-0008] `pkg/secrets` |
| **A03 Injections** | GORM parameterized queries (no raw SQL in the codebase) | `pkg/secrets`, repositories |
| **A04 Insecure Design** (incl. **PDF upload DoS**) | PDF validated ≤5 MB, magic `%PDF-` bytes, structural parse, suspicious-token block, `io.LimitReader` — never buffered unsized | `pkg/pdf`, `debt_handler.go` |
| **A05 Security Misconfig** | CSP (build-only, prod), HSTS, `Permissions-Policy`, `X-Content-Type-Options`; secrets fail-hard; env-var config | `vite.config.ts`, middleware · [ADR-0008] |
| **A07 Identification & Auth Failures** | Rotating refresh tokens with real revocation; `HttpOnly`+`Secure`+`SameSite` cookies + CSRF; optional TOTP MFA; rate-limited login; password policy ≥12 chars | [ADR-0005][ADR-0006][ADR-0007] `auth_service.go` |

> The baseline pen test (docs/sec/pen-test-baseline.md) found **no** SQLi, stored-XSS,
> or leaked secrets; residual items were design-hardening already closed by #83–#90.

## Config & secret inventory

| Variable | Default | Prod | Fail behavior |
|---|---|---|---|
| `REGISTRATION_ENABLED` | `false` | set to `false` explicitly | closed (deny) |
| `JWT_SECRET` | none | required | **fail-hard** (log.Fatal) |
| `ENCRYPTION_KEY` | none | required | **fail-hard** (log.Fatal) |
| `RESEND_API_KEY` / `EMAIL_FROM` | `EMAIL_FROM` default set | optional (email OTP) | dev-mode logs; no-op |
| `APP_ENV` | `development` | `production` | gates fail-hard semantics |

## Writing secure code here

- **No new plaintext secrets in the repo.** Generate at deploy time or `.env`.
- **Use HTTP-only, Secure, SameSite cookies** for tokens; never accept tokens via
  query params.
- **Validate all uploads** (size + content sniffing) before reading into memory.
- **Rate-limit** auth and any enumeration-prone endpoint.
- **Constant-time compare** for OTP/code/tokens.

## References

- [ADR-0003 — Security model](docs/adr/0003-security-model.md)
- [ADR-0004 — Feature flag gate](docs/adr/0004-feature-flag-gate.md)
- [ADR-0005 — Refresh rotation & revocation](docs/adr/0005-refresh-rotation-revocation.md)
- [ADR-0006 — TOTP MFA](docs/adr/0006-totp-mfa.md)
- [ADR-0007 — Redis rate-limit & Turnstile](docs/adr/0007-redis-rate-limit-turnstile.md)
- [ADR-0008 — Secrets fail-hard](docs/adr/0008-secrets-fail-hard.md)
- [Pen test baseline](docs/sec/pen-test-baseline.md)
- [Forgot-password OTP](docs/sec/forgot-password-otp.md)
- [Secrets & headers](docs/sec/secrets-fail-hard-and-headers.md)

_See also the standalone `SECURITY.md` at repo root for the public-facing policy._