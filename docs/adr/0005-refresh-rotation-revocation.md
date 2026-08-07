# Rotating refresh tokens with real revocation

**Status:** Accepted · **Ticket:** #85 · **Decision:** rotating refresh + destructive revocation + hardened cookies.

## Context

The original auth had a long-lived (7-day) refresh JWT with **no rotation and no
revocation**: logging out / changing passwords didn't actually invalidate tokens,
and the cookies lacked `Secure`/`SameSite` (pen test A07). Refresh-token reuse
attacks and stolen-cookie replay were unmitigated.

## Decision

1. **Rotate on every use**: each refresh returns a new pair; reusing an old,
   already-consumed refresh token is treated as compromise → whole session revoked.
2. **Revocation is real**: a revoked session can't refresh again, and changing
   password / logging out revokes **all** of the user's sessions (`RevokeAllUserSessions`).
3. **Hardened cookies**: `HttpOnly`, `Secure`, `SameSite=Lax/Strict` for tokens;
   CSRF token issued separately via middleware.

## Considered Options

| Option | Verdict |
|---|---|
| **Rotate + revoke-all-upon-password-change / logout** | ✅ accepted |
| JWT-Max-Age-only refresh (no rotation) | rejected — reuse/replay window |
| Stateless blacklist-free JWTs | rejected — no revocation possible |

## Consequences
- `/auth/refresh` is idempotent-safe: replay of a rotated token nukes the session.
- Password change revokes all sessions (defense-in-depth for leaked tokens).
- Frontend must refresh cookies atomically and treat 401-with-revoked as logout.
- Server keeps a short-lived allow/deny side-channel (Redis keyset) to back revocation.