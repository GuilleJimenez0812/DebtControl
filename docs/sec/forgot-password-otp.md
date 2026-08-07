# Recuperación de contraseña por OTP por email

> **Epic**: ciberseguridad (#79) · **Tarea**: #87 · **Provider**: Resend (decisión #81)

Flujo de "olvidé contraseña" en tres pasos, con OTP de 6 dígitos enviado por
email vía **Resend** (plan free $0, decisión en `docs/research/email_provider_otp.md`).

## Flujo

1. **`POST /api/v1/auth/forgot-password`** `{email}` — genera un OTP de 6 dígitos
   (crypto/rand, uniforme 000000-999999), lo guarda en el session store clave por
   email (TTL 10 min, tope de 5 intentos) y lo envía por email. Respuesta idéntica
   para emails registrados o no (**anti-enumeración**: nunca revela si existe cuenta).
2. **`POST /api/v1/auth/verify-reset-otp`** `{email, code}` — valida el OTP en
   **tiempo constante** (`subtle.ConstantTimeCompare`); cada acierto lo consume
   (single-use) y a los 5 fallos lo invalida. Éxito ⇒ entrega un **ticket
   single-use** (10 min) que desbloquea el reset.
3. **`POST /api/v1/auth/reset-password`** `{reset_ticket, new_password}` — canjea
   el ticket (GETDEL / mapa atómico), aplica la política de contraseña
   (mín. 12 chars, `pkg/security.ValidatePasswordPolicy`), persiste el nuevo hash
   bcrypt y **revoca todas las sesiones** del usuario (coordinado con #85).

## Conexión con almacenes

- `SessionStore` añade: `StorePasswordResetOTP`, `VerifyPasswordResetOTP`,
  `StorePasswordResetTicket`, `ConsumePasswordResetTicket`. Implementado en Redis
  (SET/GETDEL/TTL) y en el fallback en memoria (mutex). Verificación de intentos
  atómica y single-use.
- En el servicio, `AuthService` ahora recibe un `ports.EmailSender`.

## Email (proveedor)

- `pkg`/`internal/adapters/email`: `ResendSender` usa `resend-go/v3`. Lee
  `RESEND_API_KEY`; **sin clave es un no-op que loguea el código** (dev/test nunca
  fallan ni bloquean al usuario).
- Env: `RESEND_API_KEY`, `EMAIL_FROM` (ej. `DebtControl <otp@mail.yourdomain.com>`
  — el dominio debe estar verificado en Resend).

## Rate-limiting (coordina con #88)

- `/forgot-password`: **3 por 15 min por IP** (evita inundar buzones).
- `/verify-reset-otp` y `/reset-password`: **10 por 15 min por IP** (evita adivinar
  el código).

## Nota sobre el límite free de Resend

Cada recuperación cuesta 1 email. Tolerancia frente al tope de 100/día: el OTP
expira en 10 min, `EmailSender` loguea `sent.Id`/errores para no bloquear
silenciosamente; el rate-limit por IP reduce picos.