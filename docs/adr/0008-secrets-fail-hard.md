# Secrets fail-hard and hardened security headers

**Status:** Accepted · **Ticket:** #90 · **Decision:** fail-hard secrets + build-time CSP + HSTS/Permissions-Policy.

## Context
`JWT_SECRET`/`ENCRYPTION_KEY` had insecure hard-coded defaults, so a misconfigured
prod deploy would silently run with a predictable key (pen test # A05/A02). Headers
were partial: no CSP, HSTS, or `Permissions-Policy`. The CSV/PDF export surface also
benefits from consistent framing.

## Decisions

1. **Secrets fail-hard** (`pkg/secrets`): `Resolve(envVar, appEnv, devDefault)` returns an
   error → `log.Fatal` when a secret is **missing in any `APP_ENV != development`**
   (`production`, name anything else). Only `development` may fall back to a dev default.
   `APP_ENV` defaults to `development`; `render.yaml` pins it to `production`.
2. **Security headers** (`SecurityHeadersMiddleware`): `X-Content-Type-Options: nosniff`,
   **HSTS** (`max-age=31536000; includeSubDomains`) on HTTPS, and
   `Permissions-Policy: geolocation=(), camera=(), microphone=()` (waive the legacy
   `feature-policy`).
3. **CSP injected only in production build** (`vite.config.ts` `cspPlugin`):
   `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src
   'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri
   'self'; form-action 'self'; object-src 'none'`. Verifiable in `dist/index.html`.

## Considered Options

| Option | Verdict |
|---|---|
| **fail-hard on missing secret in non-dev** | ✅ accepted — misconfig is an error, not a zero day |
| Fail-open / sample keys | rejected — predictable signing keys |
| Runtime CSP injection | rejected — token must live in the served HTML; build-time matches Render |
| No CSP | rejected — A05 |

## Consequences
- Production cannot boot with a weak/absent key; the failure is loud, not silent.
- All serving is HTTPS (HSTS only emitted over HTTPS; harmless otherwise).
- CSP is a build artifact: `npm run build` output is CDN/Render-safe.
- `APP_ENV` is the single signal for fail-hard; set per environment.