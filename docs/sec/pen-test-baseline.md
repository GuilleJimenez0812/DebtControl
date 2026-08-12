# Pen test de línea base — DebtControl

**Fecha:** 2026-08-07
**Alcance:** capa de aplicación de DebtControl (backend Go/Gin + frontend React/Vite, docker-compose local y Render free). Criterio: OWASP Top 10 + OWASP ASVS L1.
**Ticket fuente:** mapa wayfinder #79 — ticket #80.

## Resumen ejecutivo

Se ejecutaron tres capas de análisis contra el código local:

1. **`govulncheck`** (dependencias Go) — 1 vulnerabilidad de severidad alta en `github.com/quic-go/quic-go@v0.59.0` (GO-2026-5676, HTTP/3 QPACK DoS). **Corregido** en esta sesión (→ v0.59.1).
2. **`gosec`** (análisis estático) → 2 hallazgos de severidad **baja** (G104, errores de `Close()` sin manejar en `pkg/pdf/parser.go`). **Corregidos** en esta sesión.
3. **`npm audit`** (frontend) → 0 vulnerabilidades.
4. **Revisión manual OWASP Top 10** → varios hallazgos de diseño, mapeados a tickets del mapa.

Línea base establecida: **no** se detectó inyección SQL (GORM parametrized), riesgo XSS almacenado crítico, ni fuga de secretos en el repo (los keys se generan en Render). Los hallazgos pendientes son de *endurecimiento de diseño* ya contemplados por el mapa.

## Hallazgos automáticos (resueltos)

| Herramienta | Hallazgo | Severidad | Estado |
|---|---|---|---|
| govulncheck | GO-2026-5676 quic-go v0.59.0 (HTTP/3 QPACK DoS) | Alta | **Corregido** → v0.59.1 |
| gosec | G104 errors-unhandled en `pkg/pdf/parser.go:164,167` | Baja | **Corregido** |
| npm audit | — | — | Limpio (0) |

Tras el fix, `go test ./...` ✅ y `gosec` ✅ (0 issues).

## Hallazgos de diseño (OWASP Top 10 → tickets del mapa)

| # | OWASP | Hallazgo | Referencia de código | Ticket |
|---|---|---|---|---|
| A01 Broken Access Control | Correlato CORS hardcoded + roles ok; **registro abierto** (cualquiera crea cuenta; la primera cuenta queda admin) | `router.go:34`, `auth_service.go:46-49` | **#83** |
| A07 Auth Failures | Cookies `access_token`/`refresh_token` sin `Secure`/`SameSite` | `auth_handler.go:60-61` | **#85** |
| A07 Auth Failures | "Refresh" es un JWT de 7 días sin rotación ni revocación real | `auth_service.go:81` | **#85** |
| A07 Auth Failures | Sin rate-limit/lockout en login (fuerza bruta) | `router.go` (sin middleware) | **#88** |
| A07 Auth Failures | Sin 2FA opcional | — | **#84** |
| A05 Security Misconfig | `JWT_SECRET`/`ENCRYPTION_KEY` con defaults inseguros en código | `main.go:32,107` | **#90** |
| A02 Crypto Failures | Claves de sesión/encriptación sin fail-open en prod | `main.go` | **#90** |
| A05 Security Misconfig | Headers parciales (sin CSP, HSTS, Permissions-Policy) | `middleware.go:66` | **#90** |
| A03 Injection (upload) | El endpoint sube el archivo entero a memoria sin límite ni validación de tipo; DoS | `debt_handler.go:237` | **#89** |
| A01 Broken Access Control | Endpoint `/debts/seed` expuesto (administrador-only pero útil para abuso) | `router.go:58` | evaluar |

Nota positiva: el modelo ya usa bcrypt para contraseñas, AES-256-GCM para campos cifrados y registros de auditoría (`AuditLogModel`). Buenas bases.

## Recomendaciones que alimentan tickets

- **#83** Cerrar registro con feature flag `REGISTRATION_ENABLED` (default off); creación solo por admin.
- **#85** Refresh rotativo + revocación destructiva + cookies `HttpOnly`+`Secure`+`SameSite`+CSRF.
- **#88** Rate-limit Redis por IP+cuenta + Turnstile en login/register.
- **#89** Validar upload: ≤5MB, solo PDF por magic bytes + estructural, abortar antes de cargar en memoria.
- **#90** Secrets fail-hard y CSP/HSTS/Permissions-Policy.

## Estado

- ✅ govulncheck: limpio (0 en código).
- ✅ gosec: 0 issues.
- ✅ npm audit: 0.
- ✅ `go build ./...`, `go test ./...` (verdes).
- 🟡 Pendientes endurecimiento de diseño → tickets del mapa.

## Anexo — cómo reproducir

```bash
cd backend
go install golang.org/x/vuln/cmd/govulncheck@latest
go install github.com/securego/gosec/v2/cmd/gosec@latest
govulncheck ./...
gosec ./...
cd ../frontend && npm audit
```