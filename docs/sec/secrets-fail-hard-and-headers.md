# Secretos fail-safe y headers de seguridad

> **Epic**: ciberseguridad (#79) · **Tarea**: #90

Dos mejoras transversales de seguridad:

1. **Secrets fail-hard**: `JWT_SECRET` y `ENCRYPTION_KEY` solo usan defaults
   inseguros fuera de producción; en `production` el backend aborta el arranque
   si faltan.
2. **Headers de seguridad y CSP**: razonados y probados en backend y frontend.

## Secrets fail-hard

Paquete `pkg/secrets` — `secrets.Resolve(envVar, appEnv, devDefault)`:

- Si la variable está definida (y no es solo espacios) → devuelve su valor.
- Si falta y `appEnv == "development"` → devuelve `devDefault` (permitido solo en
  desarrollo local).
- Si falta en **cualquier otro entorno** (`production`, `staging`, preview, ...)
  → error. `cmd/api/main.go` hace `log.Fatalf` y el proceso no arranca con un
  secreto inseguro.

El entorno se lee de `APP_ENV` con default `development`. En `render.yaml` el
servicio API define `APP_ENV: production`, y los secrets `JWT_SECRET` y
`ENCRYPTION_KEY` se generan con `generateValue: true`.

Secretos cubiertos: `ENCRYPTION_KEY` (cifrado AES-256-GCM de campos) y
`JWT_SECRET` (firma de access/refresh tokens).

## Headers de seguridad

### Backend — `SecurityHeadersMiddleware` (se aplica a toda respuesta)

| Header | Valor | Motivo |
|---|---|---|
| `X-Frame-Options` | `DENY` | Evita framing (clickjacking). |
| `X-Content-Type-Options` | `nosniff` | Evita MIME-sniffing. |
| `X-XSS-Protection` | `1; mode=block` | Legado, refuerza al CSP. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Recorta la URL de referrer en saltos cross-origin. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Fuerza HTTPS tras el primer acceso. Solo tiene efecto sobre HTTPS, que Render siempre termina. |
| `Permissions-Policy` | `geolocation=(), camera=(), microphone=()` | Deshabilita funciones que la app no usa; menos superficie de ataque. |

No interfiere con el trabajo de sesión (#85): los cookies ya son `HttpOnly` +
`SameSite=Strict` y el CSRF usa cookie + header.

### Frontend — CSP solo en el build de producción

La API se llama same-origin (`/api/v1`), así que `connect-src 'self'` es
suficiente. El CSP se inyecta con el plugin `cspPlugin` en `vite.config.ts`
**solo al construir** (`apply: 'build'`); en dev se omite porque el HMR de Vite
usa scripts inline y websockets que un CSP estricto bloquearía.

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self'; connect-src 'self';
frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
```

- `style-src 'unsafe-inline'`: estilos inline de Tailwind/React.
- `frame-ancestors 'none'` + `X-Frame-Options: DENY` del backend: anti-clickjacking.
- `connect-src 'self'`: llama al API `/api/v1` del propio origen.

## Alternativas consideradas

- **CSP fija en `index.html`**: descartada porque rompe el dev-server (HMR);
  por eso se inyecta únicamente en el build.
- **HSTS condicional a TLS del request**: descartado por simplicidad; se envía
  siempre y solo tiene efecto sobre HTTPS, que Render garantiza.
- **CSP servida desde el backend**: el backend solo sirve JSON, no HTML; el CSP
  va en el frontend.