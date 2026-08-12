# Security model (OWASP Top 10 / ASVS L1) — status 2026-08-07

**Status:** Accepted · **Drives:** the whole `#79` security epic (tickets #80–#91).

## Context

DebtControl is an account-based money/expense tracker deployed on free-tier infra
(Go/Gin on Render, React/Vite). Attack surface: public auth, person/order/payment
CRUD behind JWT, an invoice PDF upload, and an admin area. The product has no
budget for paid scanners, so the standard is achieved with built-in tooling plus
deliberate architectural choices. Goal: meet **OWASP ASVS L1** (foundational) and
tour the **OWASP Top 10**, with a documented, reproducible baseline.

## Decision

Adopt a layered security model with these non-negotiables, each backed by a follow-up ADR:

1. **A01 Access Control** — registration gated off-by-default (`REGISTRATION_ENABLED=false`),
   admin-only account creation, CORS allow-list, admin-only `/debts/seed`.
   ➜ [ADR-0004](0004-feature-flag-gate.md)
2. **A02 Crypto/Secret Failures** — runtime-generated secrets, fail-hard in non-dev,
   AES-256-GCM field encryption, bcrypt, constant-time OTP.
   ➜ [ADR-0007](0007-redis-rate-limit-turnstile.md) · [ADR-0008](0008-secrets-fail-hard.md)
3. **A03 Injection** — GORM parameterized queries only; no hand-written SQL in commits.
4. **A05 Misconfig** — CSP (prod build), HSTS+`Permissions-Policy`+nosniff headers,
   fail-hard config. ➜ [ADR-0008]
5. **A07 Auth** — rotating refresh + real revocation, `HttpOnly`/`Secure`/`SameSite` cookies
   + CSRF, optional TOTP MFA, per-IP rate limits, password ≥12 chars.
   ➜ [ADR-0005](0005-refresh-rotation-revocation.md) · [ADR-0006](0006-totp-mfa.md)
6. **Upload abuse (A04/DoS)** — ≤5 MB, `%PDF-` magic, structural parse, token block, `LimitReader`.

The pen test (#80) reconciled this list with reality: it closed fixed findings
and opened the residual design items above.

## Consequences

- Security is **enforceable at the edge** (route registration, middleware, cookie
  flags) and **decidable at deploy time** (env vars) — no in-app security switches
  changeable at runtime.
- New endpoints must map to a threat in the model above (or an ADR) or be explicitly reviewed before merge.
- Removing a mitigation is a decision, not a refactor: it requires a new ADR.

## Sources

- OWASP Top 10 (2021), ASVS 4.0 L1, Twelve-Factor, martinfowler feature toggles.