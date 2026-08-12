# Research: librerías UI $0 para un rediseño estilo Apple/macOS

**Fecha:** 2026-08-07
**Contexto:** Frontend React 19.2 + Vite 8 + Tailwind CSS v4.3 (`@import "tailwindcss"`), TypeScript 6, iconos lucide-react, clsx + tailwind-merge. Objetivo: una estética de app nativa de Mac / Apple.com (glass/vibrancy, transiciones suaves, inputs/select/toggle animados). Restricción dura: **todo debe costar $0** (open source, sin planes de pago obligatorios) y ser compatible con React 19 + Tailwind v4. Investigación de cada librería que el usuario nombró y de alternativas gratuitas relevantes.

---

## Decision (resumen de una línea)

**Ninguna librería "$0" entrega un look macOS "nativo" listo para usar.** La vía recomendada: construir sobre **shadcn/ui + Radix UI + Motion** como base de comportamiento (dialog, popover, select, toggle como primitivas accesibles), **estilizar el aspecto Apple a mano con Tailwind v4** (glassmorphism/vibrancy, sombras, radios, springs) y **añadir** componentes animados de **Kokonut UI** (o piezas sueltas de **Lightswind UI** si se quiere impacto visual).

De las librerías que nombró el usuario, la única con valor real para este proyecto es **Kokonut UI** (MIT, React 19 + Tailwind v4 + Motion, 100+ componentes con animación). **UntitledUI** es muy potente y $0 en su capa open-source, pero plantea un choque de ecosistema (React Aria) y gran parte de su valor vive en el PRO ($499). **AnimatedUI**, **BadtzUI** y **LightswindUI** son $0 pero de nicho o inmaduras. **uiverse.io** solo sirve como inspiración (HTML/CSS suelto, sin React).

---

## Comparativa principal

| Librería | Licencia / Costo $0 | React 19 | Tailwind v4 | Mantenimiento | ¿Primitivas estilo Apple? | Verdict |
|---|---|---|---|---|---|---|
| **Kokonut UI** | MIT, $0 | ✅ | ✅ | ~2k ⭐, activo | Parcial (animaciones pulidas, no "mac") | ✅ **Usar** (animación) |
| **Untitled UI (React)** | MIT (capa open-source) $0; PRO $499 | ✅ | ✅ | ~1.8k ⭐, activo | Parcial (SaaS, no native-mac) | ⚠️ Usable pero ecosistema React Aria |
| **AnimatedUI / Animate UI** | MIT **+ Commons Clause** $0 | ✅ | ✅ | ~4k ⭐, activo | Parcial (micro-interacciones animadas) | ⚠️ Piezas sueltas |
| **BadtzUI** | MIT **+ cláusula anti-reventa** $0 | ✅ | ✅ | ~255 ⭐, poco usado | Animado, no mac | ⚠️ Secundario |
| **Lightswind UI** | Free tier $0 + **PRO de pago** | ✅ | ✅ Vite | repo espejo, poco consolidado | Animado + WebGL | ⚠️ Free ok / PRO pago |
| **uiverse.io (galaxy)** | MIT, $0 | ❌ (HTML/CSS, hay que migrar a mano) | ✅ | ~11k ⭐ | No; comunidad CSS | ⚠️ Solo inspiración |

### Alternativas gratuitas relevantes

| Librería | Licencia / Costo | React 19 | Tailwind v4 | Mantenimiento | Rol en el look Apple | Verdict |
|---|---|---|---|---|---|---|
| **shadcn/ui** | MIT | ✅ | ✅ (v4 de base) | ~120k ⭐, todos | Base de componentes copiados a tu repo | ✅ **Base** |
| **Radix UI** | MIT (WorkOS) | ✅ | N/A (sin estilo) | ~19k ⭐ | Primitivos accesibles (dialog, popover, select, dropdown, switch) | ✅ **Base** |
| **Motion** | MIT | ✅ (18 y 19) | N/A | ~33k ⭐ · +17M descargas/mes | Motor de animación (sucesor de framer-motion) | ✅ **Motor** |
| **Magic UI** | MIT | ✅ | ✅ | ~21.8k ⭐ | Efectos / componentes animados | ✅ Piezas |
| **Aceternity UI** | MIT (free) + pago por bloques | ✅ | ✅ | Popular | Landing pages animadas | ⚠️ Parte free |
| **HyperUI** | MIT | ✅ | ✅ v4 | ~12k ⭐ | Componentes HTML/Tailwind marketing y web-app | ✅ Complemento |
| **Flowbite / Flowbite React** | MIT | ✅ | ✅ v4 | ~9.3k ⭐ | Botones, modales, dropdowns | ❌ Estética ajena a Apple |

---

## Decisión (detalle) — mezcla 100 % $0 recomendada

1. **Base de comportamiento: shadcn/ui + Radix UI** (`@radix-ui/react-dialog`, `react-popover`, `react-select`, `react-dropdown-menu`, `react-switch`, `react-checkbox`, `react-tabs`). shadcn copia el código a tu repo (no es un paquete), lo que da control total del estilo y **$0**. Radix aporta accesibilidad, teclado y trampa de foco, lo que un look "nativo" necesita.
2. **Estilo Apple a mano con Tailwind v4:** la estética mac viene de *vibrancy/glass*, radios grandes, bordes 1px con alpha, sombras suaves y toggles/selects líquidos. Ninguna librería la entrega lista; se construye con tokens CSS de Tailwind v4.
3. **Animación suave: Motion** (`motion/react`), el sucesor de framer-motion, MIT. Aporta springs y `AnimatePresence` para transiciones tipo macOS. Es el motor que ya usa la mayoría de las librerías de la lista.
4. **Componentes de show / microinteracción: Kokonut UI** (o Magic UI). Se instala por copy-paste sobre shadcn, sin dependencia extra.
5. **uiverse.io** como banco de ideas visuales para botones/toggles/glass, copiando a mano.

---

## Detalle por librería (evidencia)

### 1. AnimatedUI → "Animate UI" (imskyleen/animate-ui)
- Repo: github.com/imskyleen/animate-ui · sitio: animate-ui.com · **~4k ⭐**.
- **Licencia:** MIT **+ Commons Clause** — gratis para uso comercial, pero **no se pueden vender/redistribuir los componentes en su forma original**. En la práctica no bloquea el uso en tu app.
- **Stack:** React + Tailwind (v4) + Motion; distribución "copy-first" tipo shadcn (CLI de shadcn).
- **Mantenimiento:** activo, ~4k ⭐.
- **Compatibilidad:** React 19 OK · Tailwind v4 OK.
- **Aporta al look Apple:** componentes de microinteracción/typo animada (headings, marquee, resaltado de texto); no primitivas nativas (sin inputs/modales/tablas estilo macOS).
- **Verdict:** ⚠️ Adoptar piezas sueltas concretas; no como base.

### 2. BadtzUI (badtzx0/badtz-ui)
- Repo: github.com/badtzx0/badtz-ui · sitio: badtz-ui.com · **~255 ⭐**.
- **Licencia:** MIT **+ cláusula que restringe la reventa** de versiones sin modificar.
- **Stack:** React, Tailwind (migrado a **v4**, `@theme`), TypeScript; instalación `npx shadcn@latest add https://badtz-ui.com/r/<comp>.json`.
- **Aportable al look Apple:** moderno/animado, pero no macOS-native.
- **Mantenimiento:** repo pequeño (~255 ⭐), sin una comunidad grande.
- **Verdict:** ⚠️ Secundario; no aporta nada que Kokonut no cubra con más madurez.

### 3. Lightswind UI (verificación de nombre)
- **El producto correcto:** **Lightswind UI** (lightswind.com; repo espejo github.com/codewithMUHILAN/Lightswind-UI-Library). La búsqueda por "Lightswitch" devuelve solo un **componente de tema claro/oscuro** genérico de otras librerías — ese no es el nombre del producto. Verificado.
- **Free tier ($0):** 160+ componentes vía CLI (`npx lightswind@latest init`), **Tailwind v3/v4 ready**, soporta **Vite**, CRA y Next.js. Se basa en Framer Motion + GSAP.
- **PRO (de pago):** "Lightswind Pro" — 137+ componentes premium, 80+ elementos **WebGL/Three.js/GSAP 3D**, acceso de pago (pro.lightswind.com). **No todo es $0.**
- **Mantenimiento:** el repo es espejo de la web, poco consolidado como librería formal.
- **Verdict:** ⚠️ El nivel free es $0 y cubre parte de la estética animada, pero el valor 3D/WebGL está tras un paywall de "PRO". Útil como vitrina visual, no como base para producción.

### 4. Kokonut UI (kokonut-labs/kokonutui)
- Repo: github.com/kokonut-labs/kokonutui · sitio: kokonutui.com · **~2k ⭐**, MIT.
- **Stack:** **React 19 + Tailwind CSS v4 + shadcn/ui + Motion** — exactamente tu stack actual. Instalación `npx shadcn@latest add @kokonutui/<comp>`, copy-paste.
- **Mantenimiento:** activo, soporte del programa OSS de Vercel.
- **Aportable al look Apple:** componentes pulidos, accesibles, con microinteracciones líquidas.
- **Verdict:** ✅ **Recomendada** como capa de animación sobre tu base shadcn, sin dependencia adicional.

### 5. Untitled UI (untitleduico/react)
- Repo: github.com/untitleduico/react · sitio: untitledui.com/react · **~1.8k ⭐**, MIT (capa open-source).
- **Recurso:** los "base components" son **100% free / MIT**; **React 19.2 + Tailwind v4.3 + React Aria**. La colección grande, 250+ páginas ejemplo y 5k+ componentes están en **PRO de pago** (desde $499 single-user).
- **Aportable al look Apple:** estética muy profesional tipo SaaS/Apple.com, muchos bloques útiles.
- **Preocupación técnica:** basado en **React Aria**, cuyo modelo de renderizado/gestos difiere de Radix/shadcn. Integrarlo en un proyecto shadcn/Radix actual añade fricción; y lo más jugoso está en PRO.
- **Verdict:** ✅ solo en un proyecto *greenfield* que adopte React Aria; ⚠️ en tu repo actual añade complejidad.

### 6. uiverse.io (uiverse.io)
- Repo: github.com/uiverse-io/galaxy · sitio: uiverse.io · **~11k ⭐** · MIT.
- **No es una librería npm/React:** es un archivo/colección de **HTML/CSS snippets** (con versiones Tailwind "class-only", sin `@apply`). Framework-agnóstico: pegas el bloque y lo migras a JSX a mano (sin paso de build).
- **Detalles:** calidad variable (comunidad), sin design tokens ni props.
- **Verdict:** ⚠️ Solo inspiración para botones/toggles/glass; no motor de estructura.

---

## Alternativas libres (evidencia)

- **shadcn/ui** (github.com/shadcn-ui/ui, ~120k ⭐, MIT): copia de código, soporta Vite + Tailwind v4 — base recomendada.
- **Radix UI** (github.com/radix-ui/primitives, ~19k ⭐, MIT, mantenida por WorkOS): primitivos sin estilo y accesibles (dialog, popover, select, dropdown, switch, checkbox, tabs). **Núcleo de los primitivos de Apple.**
- **Motion 13** (github.com/motiondivision/motion, ~33k ⭐, MIT, React ^18 || ^19, +17M descargas/mes): el motor de animación que usan casi todas las librerías anteriores.
- **Magic UI** (github.com/magicuidesign/magicui, ~21.8k ⭐, MIT): efectos y componentes animados de bajo esfuerzo para landings.
- **HyperUI** (github.com/markmead/hyperui, ~12k ⭐, MIT, Tailwind v4): markup HTML/Tailwind para web-app y marketing.
- **Aceternity UI** (ui.aceternity.com): componentes de marketing free + "All-Access Pass" de pago; los free se copian a mano.
- **Flowbite / Flowbite React** (github.com/themesberg/flowbite, ~9.3k ⭐, MIT, Tailwind v4): completo pero con estética genérica ajena al matiz de Apple — **descartada** para este fin.

---

## Desbloquea / uso

Instalaciones (a ejecutar dentro de `frontend/`, solo para documentación de referencia):

```bash
# 1. Base de componentes copiable (no es un paquete) para tu proyecto Vite:
npx shadcn@latest init

# 2. Primitivos de comportamiento (ya vienen con shadcn; puedes usarlos sueltos):
npm install @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-select \
  @radix-ui/react-switch @radix-ui/react-dropdown-menu @radix-ui/react-tooltip

# 3. Motor de animación (sucesor de framer-motion):
npm install motion
```

Otra fuente de componentes (copy-paste sobre shadcn, sin dependencia adicional):
```bash
# Kokonut UI (registro de shadcn):
npx shadcn@latest add @kokonutui/<componente>

# Animate UI (CLI de shadcn):
npx shadcn@latest add <url de la pieza>
```

### Guía para el look "mac"
- **Vibrancy / glass:** `backdrop-blur` combinado con fondos translúcidos (`bg-white/60` en claro, `bg-black/40` en oscuro) y bordes `border-white/10` para el típico acabado de "barra de herramientas" de macOS.
- **Toggles / selects:** Radix Switch/Select con clases Tailwind `rounded-full`, colores sutil y un `spring` de Motion para el trazo.
- **Modales / popovers / tablas:** `@radix-ui/react-dialog` y `react-popover` con animación de entrada (scale+opacity); para tablas usa el `table` estilizado de shadcn + @tanstack/react-table si hace falta (opcional).
- **Token personalizado:** define en tu `tailwind.css` (tema de shadcn) radios, sombras, fuentes (`-apple-system, BlinkMacSystemFont, Segoe UI`) y duraciones.

### Nota sobre "Lightswind"
No hay una librería "Lightswitch"; el producto es **Lightswind UI** y su atractivo 3D/WebGL queda mayormente tras el tier **PRO (de pago)**. Solo su capa free de 160+ componentes es $0. No apostar la base ahí.

---

## Fuentes

- Animate UI: github.com/imskyleen/animate-ui · animate-ui.com
- BadtzUI: github.com/badtzx0/badtz-ui · badtz-ui.com
- Lightswind UI: lightswind.com · repositorio espejo github.com/codewithMUHILAN/Lightswind-UI-Library · PRO pro.lightswind.com
- Kokonut UI: github.com/kokonut-labs/kokonutui · kokonutui.com
- Untitled UI React: github.com/untitleduico/react · untitledui.com/react
- Uiverse / galaxy: github.com/uiverse-io/galaxy · uiverse.io
- shadcn/ui: github.com/shadcn-ui/ui · ui.shadcn.com
- Radix UI: github.com/radix-ui/primitives
- Motion: github.com/motiondivision/motion
- Magic UI: github.com/magicuidesign/magicui
- HyperUI: github.com/markmead/hyperui
- Aceternity UI: ui.aceternity.com
- Flowbite / React: github.com/themesberg/flowbite · flowbite-react

### Nota metodológica
Números de ⭐ tomados de las tarjetas de GitHub en el momento de la búsqueda (2026-08-07); precios (PRO de Lightswind / Untitled) citados de las páginas de precios oficiales. Las licencias ("MIT + Commons Clause", "MIT + cláusula de reventa") se basan en los archivos LICENSE/README de cada repositorio.