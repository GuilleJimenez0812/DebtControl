# Feature flag standard: toggling `POST /auth/register`

**Date:** 2026-08-06
**Context:** Small single-service Go + Gin backend, deployed on Render free tier via Docker. Goal: keep `POST /auth/register` in code but disabled-by-default in production; user creation becomes admin-only; per-environment defaults (dev open, prod closed). $0 cost, no extra infrastructure.

---

## Recommendation (one concrete option)

Use a **plain environment-variable flag** read once at config load and injected into the
router/handler as a boolean.

- **Env var name:** `REGISTRATION_ENABLED`
- **Type:** boolean-in-string, parsed with `strconv.ParseBool` (`"true"`/`"false"`, also `"1"`, `"0"`, `"on"`, `"off"`).
- **Default when unset:** **`false`** (closed). This is the safe default and matches "off by default in production" while still letting dev environments opt in explicitly.
- **Where it's read:** in `main.go` at startup, exactly where the other config is already loaded today (`getEnvOrDefault` at `backend/cmd/api/main.go:21`). It is passed down to `SetupRouter` alongside `allowedOrigins` and used to decide whether to register the route.
- **Why no new infra:** it needs exactly zero dependencies, is set per-env in the Render dashboard / `render.yaml`, and production only has to *not* set the variable (or set it to `false`) to keep registration closed.

### Illustrative Go snippet (example only, not to be committed)

```go
// main.go (config load — mirrors the existing getEnvOrDefault pattern)
registrationEnabled, _ := strconv.ParseBool(getEnvOrDefault("REGISTRATION_ENABLED", "false"))
routerEngine := httpAdapter.SetupRouter(authService, debtService, adminService, allowedOrigins, registrationEnabled)
```

```go
// router.go (wiring — conditional route registration)
func SetupRouter(authUseCase ports.AuthUseCase, debtUseCase ports.DebtUseCase,
	adminUseCase ports.AdminUseCase, allowedOrigins []string, registrationEnabled bool) *gin.Engine {

	routerEngine := gin.Default()
	// ... security headers, CORS ...

	authHandler := NewAuthHandler(authUseCase)

	apiGroup := routerEngine.Group("/api/v1")
	{
		authGroup := apiGroup.Group("/auth")
		{
			if registrationEnabled {
				authGroup.POST("/register", authHandler.Register)
			}
			authGroup.POST("/login", authHandler.Login)
			authGroup.POST("/logout", authHandler.Logout)
			authGroup.GET("/me", AuthMiddleware(authUseCase), authHandler.GetCurrentUser)
		}
		// ... remaining routes ...
	}

	return routerEngine
}
```

Registration is disabled at the **edge** (route is never registered), which means the handler code
stays in the repo but is unreachable when closed. This is Fowler/Hodgson's "toggle at the edge"
recommendation — cheapest, and the disabled route 404s rather than being silently reachable.

### Testability

- Because the boolean is a plain parameter of `SetupRouter`, tests construct the engine with
  `registrationEnabled: true` or `false` and assert the route exists 404s / 201 passes, respectively,
  with no mocking of flag infrastructure (mirrors the strategy-friendly test shown in
  Fowler's "Inversion of Decision" pattern).
- Unit-test `Register` handler logic independently via the handler's method directly, or via an
  engine built with the flag true.

---

## Comparison

| Option | Cost / infra | Per-env defaults | Runtime re-config | Fits Go config struct | Verdict |
|---|---|---|---|---|---|
| **Env-var flag** (recommended) | $0, none | Yes — set per env | Requires redeploy/restart | Yes — one bool field | ✅ Best fit |
| Config file (yaml/env file) | $0 | Override per env, but adds a file + parsing dep | Requires redeploy | Yes | Works, but redundant: 12-factor prefers env vars over files; risks checking in files |
| LaunchDarkly | Paid SaaS | Yes | Real-time | Adds SDK dep + network | Overkill for a single static toggle |
| Unleash | Self-hosted infra (DB, server, UI) | Yes | Real-time | Heavy | Overkill on Render free tier |
| gofeatureflag | OSS lib, ≤ free tier | Yes | Real-time (flag file / relays) | Adds dep | Unnecessary for one static bool |
| Flipt | Self-hosted server + storage | Yes | Real-time | Adds dep | Overkill for one static toggle |
| Gin middleware | — | — | — | Not a config source | Only a *mechanism*; the toggle must still come from somewhere (env). See below. |

---

## Why not heavy libraries

All dedicated feature-flag systems buy you dynamic, real-time re-routing, cohorts, A/B testing,
and centralized management. This toggle is the opposite:

1. **Static:** a Release/Ops-style toggle that only flips on deployment (see Fowler's
   "static vs dynamic toggles"). Fowler explicitly prefers **static configuration** driven by
   source control / env vars when the flag is not highly dynamic.
2. **Single flag, single service:** the coordination problems heavy systems solve (coordinating
   config across a fleet of processes) don't exist on a single Render free instance.
3. **Infra mismatch:** LaunchDarkly is paid; Unleash/Flipt add a server process + storage
   — none of that fits "free tier, no extra infrastructure".
4. **Dependency bloat:** adding an SDK/network hop for one bool adds startup failure modes,
   secrets, and egress costs to a tiny app.

Rule of thumb: reach for a dedicated flag service only when you need *runtime* flipping, user
cohorting, or multi-service coordination. Otherwise, an env var is the standard.

### Gin middleware pattern — not a replacement

Gin has plenty of middleware (the repo already uses `AuthMiddleware`/`RequireAdminRole`), but a
middleware can **enforce** the flag (return 403/404) — it cannot **declare defaults or be the
config source**. If you want middleware, the flag still needs to be read from an env var at
startup. The recommended approach (conditional route registration) is simpler than middleware and
achieves the same effect with less per-request work.

---

## Per-environment wiring

- **Production (Render):** do not set the variable — falls back to default **false** → registration closed, admin-only user creation. Optionally set `REGISTRATION_ENABLED=false` explicitly in `render.yaml` / the service's env vars for clarity and to survive rename defaults. Changing it is a redeploy or a Render env var + redeploy.
- **Development (local / `docker-compose.yml`):** set `REGISTRATION_ENABLED: "true"` (via the `.env` or compose `environment`) → open registration.
- **Pre-production / smoke tests:** because default is `false`, the artifact is already the production-safe build; tests should exercise **both** states (flag on/off) as advised by Fowler's "Feature toggles introduce validation complexity".

Defaults are *not* encoded as build-time "environments" (dev/prod branches) — per 12-factor III
("Config"), each env var is granular and orthogonal, set independently per deploy.

## Env-var naming

- **`REGISTRATION_ENABLED`** — descriptive, service = `REGISTRATION`, actor = `_ENABLED`, reads naturally, greps cleanly. Consistent with existing names in this repo (`REDIS_ENABLED`, `JWT_SECRET`, `DATABASE_URL`, `ENCRYPTION_KEY`, `ALLOWED_ORIGINS`).
- **Boolean-typed value** with `strconv.ParseBool` and a `_ENABLED` suffix pattern is clearer than a string like `REGISTRATION=open` and avoids string-parsing drift.
- Option: treat unknowns leniently — parse the value, default to `false` if unset or unparseable.

### Documentation for other devs

- Declare the variable once with a comment in `main.go` near the other config reads.
- List it in the environment-variable table in the deploy docs (`docs/deploy-free.md`) so it is discoverable.
- If applying the "Expose current toggle configuration" practice, the flag is immutable at runtime, so a `/health` or `/configz` that echoes `REGISTRATION_ENABLED` is optional (not required at this scale).

---

## Sources / standards

- Twelve-Factor App, **"III. Config — store config in the environment."** — https://12factor.net/config
- Pete Hodgson (martinfowler.com), **"Feature Toggles (aka Feature Flags)."** — categories,
  static vs dynamic, "Toggle at the edge", validation complexity, structured config. —
  https://martinfowler.com/articles/feature-toggles.html
- OWASP does not mandate a feature-flag mechanism, but its *Configuration* guidance
  (and the wider "Insecure Defaults" theme) favors: least privilege, security defaults on,
  and keeping configuration out of code. An env-var flag defaulting to **false** matches
  "fail-safe default": closed unless explicitly enabled.

### Note on methodology

LaunchDarkly, Unleash, gofeatureflag, and flipt feature sets are described at a high level from
established knowledge of those products (SaaS vs self-hosted, real-time vs static) and were
evaluated qualitatively against the requirement; pricing/infra details were not re-verified
online at write time.