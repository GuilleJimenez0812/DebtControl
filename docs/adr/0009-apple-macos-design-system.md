# Apple/macOS-native design system

El frontend de DebtControl adopta un **design system propio estilo macOS nativo** (claros y translúcidos) con un acento apple.com suave reservado al login. Este ADR fija los tokens, la arquitectura de primitivos y las dependencias, y es la fuente de verdad para el rediseño (mapa wayfinder #93, ticket #99).

## Decisions

### Tokens de color y tema (Q1)

Basados en la **Variant A** aprobada en el prototipo. Modo claro por defecto; modo oscuro elegante. Acentos apple.com **solo en login** (glow suave).

| Token | Light | Dark |
|-------|-------|------|
| `--color-canvas` | `#FAFAFA` | `#1D1D1F` |
| `--color-panel` | `#FFFFFF` | `#2C2C2E` |
| `--color-sidebar` | `#ECECF0/60` translúcido | `#1D1D1F/60` translúcido |
| `--color-titlebar` | `#E8E8ED/80` translúcido | `#2C2C2E/80` translúcido |
| `--color-accent` | `#0071E3` | `#0A84FF` (o `#409CFF` para contraste) |
| `--color-accent-glow` | `#0071E3`→`#BF5AF2` (login) | idem |
| `--color-success` | `#34C759` | `#30D158` |
| `--color-warning` | `#FF9F0A` | `#FFD60A` |
| `--color-danger` | `#FF453A` | `#FF453A` |
| text primario/secundario/terciario | `#1D1D1F` / `#6E6E73` / `#86868B` | `#F5F5F7` / `#A1A1A6` / `#6E6E73` |

Vibrancy/translucencia: `backdrop-filter: blur() + saturate(150–200%)` (ver research #96). Bordes `1px` alpha de bajo contraste (`black/10` en light, `white/10` en dark). Radios macOS: cards `12px`, modales `12–14px`, inputs/buttons `8px`, traffic-lights `50%`. Sombras suaves tipo `0 2px 12px rgba(0,0,0,0.08)`.

### Tipografía (Q2)

Stack de la research #95, vía `@fontsource-variable/*` auto-hosted en `frontend/`:

- `--font-sans`: `"Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`
- `--font-mono`: `"JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, Monaco, monospace`
- El dinero y los numerales usan `--font-mono` con `tabular-nums`.

Tailwind v4 (`@theme` en `frontend/src/index.css`): `--font-sans`, `--font-mono`, y la rueda de colores como variables de tema.

### Arquitectura de primitivos (Q3)

Base comportamental **Radix UI** (dialog, popover, switch, select, dropdown — accesibles) + **primitivos propios estilo macOS** construidos en Tailwind v4 sobre ellos:

- `TitleBar` (title bar macOS con traffic-lights + translucencia + acciones)
- `Sidebar` (translúcida, colapsa a drawer en móvil)
- `Button` (primary/secondary/ghost/danger, radios `8px`)
- `Input`, `Select`, `Switch` (toggle macOS), `Checkbox`
- `Modal` (Radix Dialog + Panel translúcido + overlay blur)
- `Popover`/`DropdownMenu` (Radix)
- `Table` (ResponsiveTable re-estilizada, flip a cards en `md`)
- `Toast` (feedback in-app, reemplaza `alert()`)
- `Tags`/`Badge`, `Avatar` (initials), `ProgressBar`

Sin librería de skin "nativa"; el look macOS sale de los tokens + primitivos. Referencias visuales de piezas derivan de ejemplos de Kokonut UI / Animate UI (validados en #94) sin adoptarlos como dependencia.

### Layout (Q4)

- **Desktop**: `TitleBar` sticky translúcido arriba (traffic-lights + título de app + acciones globales) + `Sidebar` translúcida izquierda con navegación (Resumen/Compras/Pagos/Facturas/admin). El contenido principal en columna centrada.
- **Móvil**: la sidebar colapsa a **drawer** (hamburguesa); se preserva ADR-0002 (breakpoints, `md` como límite tabla↔card, touch `h-12`) y el `@media print` (re-mappped a la nueva paleta).
- Login con **glow apple.com** (gradiente difumido azul→violeta) detrás de la card de acceso; el resto 100% macOS nativo.

### Dependencias nuevas (Q5)

Solo entran en `package.json` (todas $0 / MIT / ISC):

- `motion` (v12, sucesor framer-motion) — animaciones / springs tipo macOS.
- Radix primitives packages (`@radix-ui/react-dialog`, `-popover`, `-switch`, `-select`, `-dropdown-menu`) según necesidad.
- `@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`.
- Se **mantiene `lucide-react`** (trazo fino, tipo SF Symbols).

No se adoptan: Kokonut UI, BadtzUI, Animate UI, UntitledUI, uiverse.io como dependencias runtime.

### Print + tests (Q6)

- Se **mantiene** `@media print` (monocromo A4) re-tokenizando a la nueva paleta.
- Se **mantienen** los e2e Playwright como gate; se actualizan donde el texto/estructura cambie (XPath/test-ids estables).

## Considered Options

- **Kokonut UI / libs animadas como base**: rechazado — ninguna librería $0 trae piel macOS nativa (#94); la base propia con tokens es más mantenible y $0 seguro.
- **Design tokens aislados sin primitivos**: rechazado — duplica estilos por superficie; la capa de primitivos es la fuente de verdad.
- **Dark como default**: rechazado — macOS apps y apple.com son nativas de light; el usuario eligió light-first.

## Consequences

- Todo el rediseño (title bar, sidebar, dashboard, tablas, listas, modales, auth, drawer móvil, print, tests) presupone estos tokens y primitivos.
- El orden de implementación lo dictan los tickets que graduó el frente (tokens+base → layout shell → superficies → flujos → auth).
- Cualquier pieza nueva debe construirse sobre los primitivos, no sobre clases sueltas.