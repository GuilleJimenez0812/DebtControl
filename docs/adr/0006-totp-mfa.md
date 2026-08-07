# Optional TOTP MFA (2FA)

**Status:** Accepted · **Ticket:** #84 · **Decision:** optional time-based one-time password (TOTP, RFC 6238) enrollable per user.

## Context

ASVS L1 requires some 2FA option; the app has none. Full SMS/email-OTP providers
cost money; the project is $0. TOTP (authenticator apps) is free, standard,
offline-verifiable, and per-user.

## Decision

- TOTP via RFC 6238 / RFC 4226 (standard authenticator apps: Google Authenticator,
  Aegis, 1Password).
- **Per-user opt-in**: a user enrolls a secret (`/auth/mfa/enroll`), gets a QR code
  (otpauth URI) and verifies with a first code before it becomes active.
- **Enforced on login** only for users who enrolled; no shared global secret.
- Recovery codes (one-time-use) offered at enrollment.
- Secret stored per-user, encrypted at rest (AES-256-GCM via `pkg/secrets`).
- Constant-time comparison of the TOTP result.

## Considered Options

| Option | Verdict |
|---|---|
| **TOTP (RFC 6238)** | ✅ accepted — $0, offline, per-user, no dependency on email provider |
| SMS OTP | rejected — carrier cost + SIM-swap risk |
| Email OTP at login | rejected — Reuses the reset-OTP path but weakens it; inbox is not a strong factor |
| WebAuthn | rejected — infra/UX complexity beyond free-tier scope for now |

## Consequences
- Login flow branches on `user.mfa_secret != nil`; verification code field required.
- Brute-force protection per IP (ADR-0007) still applies to the MFA step.
- Feature must not brick users: recovery codes + "disable MFA" flow with password
  re-auth.