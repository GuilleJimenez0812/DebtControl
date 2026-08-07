# Feature-flag gate for registration

**Status:** Accepted · **Ticket:** #83 · **Decision:** env-var flag `REGISTRATION_ENABLED`.

## Context

`POST /api/v1/auth/register` was open to anyone; the first registered account
became the admin. Per the pen test (#80, A01) this must be closed by default in
production while staying available for local development and tests. The project
runs on a single Render free instance with a $0 infra budget, so dedicated
feature-flag services (LaunchDarkly, Unleash, Flipt, gofeatureflag) are out of
scope.

## Decision

Use a **plain environment-variable flag** read once at startup and injected into
`SetupRouter` as a boolean:

- **`REGISTRATION_ENABLED`**, `strconv.ParseBool`, **default `false`** (closed).
- Registration route is **never registered** when false — it 404s rather than
  being reachable-but-rejected (Fowler/Hodgson "toggle at the edge").
- Production (Render) sets `REGISTRATION_ENABLED: "false"` explicitly in
  `render.yaml`; dev/compose sets `"true"`.
- Handler code stays in the repo; only the route registration is conditional.
- Test both flag states in `router_test.go` (route 404 vs 201).

## Considered Options

| Option | Verdict |
|---|---|
| **Env-var bool flag** | ✅ accepted — $0, no deps, per-env defaults, testable |
| Config file | rejected — 12-factor prefers env vars; risks committed files |
| LaunchDarkly / Unleash / Flipt / gofeatureflag | rejected — paid/infra-heavy for a single static toggle |
| Gin middleware enforcing the flag | rejected as *config source*; fine as *mechanism*, but flag still comes from env |

## Consequences

- Registration closed by default → first-user-admin footgun gone.
- Flipping the flag requires a redeploy (acceptable: it is a release/ops toggle).
- Defaults are granular and orthogonal (12-factor III); no build-time dev/prod branches.