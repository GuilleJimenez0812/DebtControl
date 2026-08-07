# Redis-backed rate limiting + Cloudflare Turnstile

**Status:** Accepted · **Ticket:** #88 · **Decision:** multi-policy limiter on Redis + Turnstile challenge on auth.

## Context

`/auth/login` had no brute-force protection (pen test # A07). Free-tier infra means
an in-process only limiter resets on every Render instance restart, so cross-instance
protection needs a shared store. Real CAPTCHAs also cost money; Turnstile is
Cloudflare's free, invisible, open-source challenge.

## Decision

1. **Rate limiter** (`pkg/ratelimit`): token-bucket-ish keyed by **IP and per-account**
   for login/register/OTP endpoints, with a small **memory-store fallback** for tests/dev
   and a **Redis store** for shared production state. Returns `429` + `Retry-After`.
2. **Cloudflare Turnstile** on `login` and `register`: invisible challenge, site/key
   secret via env (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET`); fails **open** in dev
   (no secret), **closed** in prod when configured.

## Considered Options

| Option | Verdict |
|---|---|
| **Redis limiter + memory fallback** | ✅ accepted — shared across instances, $0 (Upstash free tier) |
| In-memory-only limiter | rejected — resets on deploy; single-instance only |
| **Cloudflare Turnstile** | ✅ accepted — free, invisible, no 2FA frame to end-users |
| reCAPTCHA | rejected — paid after quota; heavier UX |
| hCaptcha | rejected — fine but Turnstile integrates with existing Cloudflare posture |

## Consequences
- Login/register/forgot-password carry the limiter/Turnstile middleware.
- Without Redis, the memory store still works but only counts per-process (documented).
- `Retry-After` enables proper client backoff and tests.
- Coordinated with #87 (forgot-password) reuse of the same middleware with its own
  policies.