# Research: estética "app nativa macOS" en el navegador (glassmorphism + traffic lights + stack de motion)

**Fecha:** 2026-08-07
**Contexto:** Frontend React 19 + Vite + Tailwind CSS v4, app de modo oscuro (hoy toda la app es dark *hardcoded*, `bg-slate-950`, con clases custom `.glass-panel` / `.glass-card` en `frontend/src/index.css`). Se quiere una estética realista de **app nativa de macOS corriendo en el navegador** — NADA nativo, sin Electron/Tauri. Estética glassmorphism tipo Dock de macOS, controles de ventana "traffic lights", title bar / sidebar translúcido con vibración. Todo **$0**, compatible con React 19 y Tailwind v4.

---

## Decision (una línea)

**Stock recomendado: `motion` (antes framer-motion), `lucide-react` se conserva, y para el chrome de ventana se replica los "traffic lights" con puro CSS + pseudo-elementos sobre SVG inline en un title bar decorativo `sticky` con `backdrop-blur`.** El "vibrancy" de macOS se emula con `backdrop-filter: blur() + saturate()` (blur con saturación al 150–200% para que no se vea lavado), no con magia propietaria: es el mismo truco que usa Apple y está soportado en todos los navegadores modernos (94%+ global).

Resumen por tema:
1. **Vibrancy/glass:** `backdrop-blur-*` + `backdrop-saturate-*` de Tailwind v4 sobre un fondo semitransparente. Windows y Safari 9+, Chrome 76+, Firefox 103+ dan soporte. Con `-webkit-` prefijo ya lo añade Tailwind.
2. **Window chrome / traffic lights:** 100% decorativo, HTML/CSS puro en un header sticky. No hay ventana real en un tab; el header replica la barra de título.
3. **Motion:** `motion` v12, MIT, $0, soporta React 19. `@react-spring/web` como alternativa válida (v10 ya soporta React 19) pero se recomienda Motion.
4. **Iconos:** **mantener `lucide-react`** (ya está instalada, tree-shakeable, estilo lineal fino tipo SF Symbols; activa y con soporte TS). Reemplazar sería más trabajo que beneficio.
5. **Dark mode:** ya estás en dark puro; si algún día quieres toggle, `@custom-variant dark (&:where(.dark, .dark *))`. Para "true blacks" vs "elevated grays": macOS en 2026 tiende a grays levemente elevados traslúcidos sobre contenido vibrante, no negro puro.

---

## 1) Vibrancy / translucency / glassmorphism en CSS (2026)

### Soporte real (datos caniuse 2026)

| Feature | Estado 2026 | Nota |
|---|---|---|
| `backdrop-filter` | **94.63% global** — Chrome/Edge 76+, Safari 9+ (historically needs `-webkit-`), Firefox 103+, Opera 64+ | Cuasi-Baseline; Safari 18 (sep 2024) ya lo soporta sin prefijo, pero se sigue escribiendo el prefijo por retrocompat iOS/macOS antiguos |
| `backdrop-invert` / `backdrop-saturate` | Parte de `backdrop-filter`, mismo respaldo que el blur | Se compone dentro del backdrop-filter |
| `color-mix()` | Soporte amplio en Chromium/Safari/Firefox modernos | Útil para tintes dinámicos pero OPCIONAL — no necesaria para el efecto base |
| pseudo-elementos (`::before` overlay + blur) | Truco para evitar bugs de Chrome con blur anidado / bordes duros al scroll | Ver "gotchas" abajo |

**La receta real de macOS "Vibrancy" no es nada mágico**: es `backdrop-filter: blur(<X>px) saturate(150–200%)` aplicado sobre un fondo con algo de color detrás (gradiente/mesh). El blur solo deja los colores lavados hacia gris; el `saturate()` mantiene el "punch" y eso es lo que le da vida al cristal helado. Sobre un fondo plano monocromático el efecto es invisible — necesita un backdrop con color.

### Tailwind v4 concreto

Tailwind v4 tiene utilities para cada función del backdrop-filter. Las combinables: `backdrop-blur`, `backdrop-brightness`, `backdrop-contrast`, `backdrop-grayscale`, `backdrop-hue-rotate`, `backdrop-invert`, `backdrop-opacity`, `backdrop-saturate`, `backdrop-sepia`. Arbitrary values con `[ ]`.

Ejemplo de panel mac-style dark (equivalente a vuestro `.glass-panel` actual pero con saturación tipo vibrancy):

```html
<div class="sticky top-0 z-10 backdrop-blur-xl backdrop-saturate-[1.8] bg-slate-900/70 border-b border-white/10">
  ...
</div>
```

Documentado oficial v4: `backdrop-blur-*` genera `backdrop-filter: blur(...)`, y se puede forzar valor arbitrario `backdrop-blur-[2px]`. Custom theme: `@theme { --backdrop-blur-xxl: 72px; }`.

### Receta recomendada (con saturación, para que se vea "cristal", no "niebla")

Dado que ya tenéis `.glass-panel`/`.glass-card` en `index.css`, la mejora clave es **añadir `saturate(160–200%)`** al backdrop-filter y subir un poco el alpha de fondo en dark (el dark glass necesita MÁS opacidad, ~0.5–0.8, o se ve turbio; el border ha de ser low-alpha 0.06–0.15).

Ejemplos concretos para el área dark-mode:

```css
.glass-panel {              /* equivalente dark "muro alto" */
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.glass-card {               /* tarjeta/glass sobre mesh gradient */
  background: rgba(30, 41, 59, 0.55);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

> El `body` ya tiene el mesh gradient (dos radial-gradient indigo/fuchsia) en `index.css` — perfecto, es el "backdrop" de color que hace que el glass se vea. No añadir contenido plano detrás del glass o no se apreciará.

### Key gotchas de `backdrop-filter` (2026)

- **Necesita fondo semitransparente**: si el elemento tiene `background` opaco, el blur no se ve (solo blurs lo que hay detrás de los píxeles TRANSPARENTES).
- **Un ancestro con `opacity < 1` o su propio `filter`/`transform` se vuelve "backdrop root"**: entonces el backdrop-blur del hijo solo ve contenido desde ese ancestro hacia abajo, no toda la página (bug clásico de Chrome con anidados / `overflow` al recortar). Solución: poner el `backdrop-filter` en un pseudo-elemento `::before`/`::after` sin hijos (truco de Josh W. Comeau), o no anidar blues.
- **Nested `backdrop-filter`**: un anidado dentro de otro solo se combina en Safari; en Chrome el interior no "sabe" del blur exterior. Evitar apilar capas de glass.
- **Performance**: blur en áreas grandes/scroll puede costar; acotar blur a paneles/header, no a toda la página; considerar `will-change` solo donde hace falta.
- **Firefox quirk histórico**: iba detrás de un flag; desde Firefox 103 (2022) va por defecto. Sigue dándose un fallback @supports por si acaso.
- **Fallback con `@supports`** (v4: `supports-[backdrop-filter]:backdrop-blur-lg`):
  ```html
  <div class="bg-slate-900/95 supports-[backdrop-filter]:bg-slate-900/70 supports-[backdrop-filter]:backdrop-blur-xl">
  ```
  Sin soporte queda un bg casi opaco (legible); con soporte, translúcido + blur.

### Pseudo-element overlay trick (cuándo hará falta)

Para títulos/serials "vídrio que nunca falla" incluso con hijos/overflow, el patrón válido es un `::before` absolute que lleva todo el blur:

```html
<header class="relative overflow-hidden sticky top-0">
  <div aria-hidden class="absolute inset-0 -z-10 -webkit-backdrop-blur-xl backdrop-blur-xl backdrop-saturate-150 bg-slate-900/60"></div>
  ...
</header>
```

No es obligatorio; se menciona como recurso cuando el blur anidado no se ve en Chrome.

---

## 2) Window chrome: "traffic lights" en el navegador

**No hay windowing nativo en un tab**: YouTube/tab no expone botones de cerrar/minimizar/zoom de la ventana. Lo que SÍ se puede es **una barra de título decorativa dentro de la app** (in-app title bar), habitualmente `sticky top-0`, que visualmente imita la ventana de macOS. Es el patrón de VS Code/Obsidian/Linear "custom title bar", replicable al 100% con HTML/CSS. No controla la ventana del navegador (eso es imposible en un tab); solo es estética pero ayuda muchísimo.

### El patrón recomendado (puro Tailwind + un mínimo de JS solo para el sticky-scroll)

1. Header `sticky top-0 z-10` con `backdrop-blur-xl backdrop-saturate-150 bg-slate-900/60 border-b border-white/8`.
2. Dentro, a la izquierda, el grupo de 3 botones "traffic lights"; a la derecha, el título/nav de tu app (el logo de DebtControl, acciones).
3. **Translúcido persistente**: se aplica siempre el `backdrop-blur-xl` con un bg semitransparente; opcionalmente un `transition` del color y un `window.addEventListener('scroll')` que conmutan entre `bg-slate-900/0` y `bg-slate-900/60 backdrop-blur-xl` cuando `window.scrollY > N`. Este es el recipe típico de header translúcido sticky.

Receta sticky-translúcida (sin librería, React + Tailwind):

```tsx
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}, []);

<header className={cn(
  "sticky top-0 z-40 transition-all duration-300 border-b",
  scrolled
    ? "bg-slate-900/70 backdrop-blur-xl backdrop-saturate-150 border-white/10"
    : "bg-transparent border-transparent"
)}>
```

### Botones traffic lights — puro CSS (colores reales de macOS)

Los 3 puntos son círculos de 12px con `box-sizing: border-box`, border `rgba(0,0,0,0.06)`, separados ~8px, con los **hex reales**:

- Cerrar (red): `#ff5f57` → active `#e0443e`
- Minimizar (amarillo): `#febc2e` → active `#d89e24`
- Zoom (verde): `#28c840` → active `#23a23a`
- Desenfocado/inactivo: `#ddd`

El arte de los glyphs (×, −, ⤢/fullscreen) **solo aparece al hacer hover** sobre el grupo (comportamiento nativo macOS). Eso se logra con pseudo-elementos `::before`/`::after` con `opacity-0 group-hover:opacity-100`, dibujando líneas rotadas:

```html
<div class="flex items-center gap-2">
  <button aria-label="Cerrar" class="group relative h-3 w-3 rounded-full bg-[#ff5f57] border border-black/10">
    <span class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
      <span class="absolute inset-0 m-auto h-[1px] w-[6px] bg-[#4d0000] rotate-45"></span>
      <span class="absolute inset-0 m-auto h-[1px] w-[6px] bg-[#4d0000] -rotate-45"></span>
    </span>
  </button>
  <button aria-label="Minimizar" class="relative h-3 w-3 rounded-full bg-[#febc2e] border border-black/10">
    <span class="absolute inset-x-0 top-1/2 mx-auto hidden h-[1px] w-[6px] bg-[#995700] group-hover:block"></span>
  </button>
  <button aria-label="Zoom" class="relative h-3 w-3 rounded-full bg-[#28c840] border border-black/10">
    ... glyph fullscreen (∡) ...
  </button>
</div>
```

> Alternativa válida, y muy pulida: un pacacz **`macos-traffic-lights`** (MIT, npm, de `aw3r1se`, SVGs con estados default/hover/active/unfocused). Pero para 3 círculos es innecesaria una dependencia: puro CSS basta y se controla al 100% con Tailwind.

**Resumen del patrón:** buttons circulares con colores hex reales + glyphs `::before/::after` visibles solo en `group-hover` + header `sticky backdrop-blur` con `@supports` fallback. 100% tailwind-able.

---

## 3) Librerías de animación para React 19

| Librería | Licencia | Coste | React 19 | Bundle aprox | Fricción Tailwind v4 | Veredicto |
|---|---|---|---|---|---|---|
| **`motion`** (sucesor de framer-motion) | **MIT** | **$0** (Motion+ es un add-on pago opcional, no necesario) | **Sí** (v12, React 18–19) | ~30kb full / ~15kb lazy | Ninguna (es biblioteca JS, no CSS) | ✅ **Recomendado** |
| `@react-spring/web` | MIT | $0 | **Sí** (v10.1.x ya mudó a React 19) | ~25kb | Ninguna | ✅ Alternativa sólida solo para springs "físicas" |
| CSS transitions / keyframes nativos | — | $0 | — | 0kb | Nativísimo | Para hoversmientos simples |

**Por qué Motion:**
- **Sucesor oficial de framer-motion** (mismo repo `motiondivision/motion`), API idéntica, solo cambia el import a `motion/react`. Migración incremental trivial.
- **Perfecta para el "spring de macOS"**: los springs de Motion reproducen el bounce/overshoot característico de macOS (abrir un panel, minimizar al dock, tintar un panel). `transition={{ type: "spring", stiffness/bounce }}`.
- **Híbrido**: JS + Web Animations API, GPU-accelerated, 120fps; `AnimatePresence` cubic para exit animations (cerrar el panel glass etc.).
- MIT en su cabecera (`"Motion is MIT licensed"`), y el add-on pago (Motion+) es opcional: la librería base es gratis.
- **Reduced motion de serie**: `MotionConfig reducedMotion="user"` a nivel de app (respeta `prefers-reduced-motion`) + el hook `useReducedMotion()` por componente; a WS tu app la panelers), WCAG 2.3.3.

```jsx
import { motion, AnimatePresence, MotionConfig } from "motion/react";

<MotionConfig reducedMotion="user">
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        className="glass-card"
      />
    )}
  </AnimatePresence>
</MotionConfig>
```

**`@react-spring/web`** — también gratis y gratuita, especializada en springs "físicas", y v10 ya soporta React 19. Pero su modelo se centra solo en springs, y la DX para orquestar sequences, layout transitions o exit animations no es tan declarativa como la de Motion. Si únicamente quieres "springs" y nada más, es válido; para el abanico completo (springs, layout, `AnimatePresence`, reduced-motion) la recomendación es Motion.

**Reduced motion / spring concerns:**
- Envolver la app con `<MotionConfig reducedMotion="user">` — Motion apaga transform/layout animations cuando el usuario pide reducción, mantiene `opacity/backgroundColor` (evitar ataques vestibulares), y cumple WCAG 2.3.3.
- En CSS, `motion-safe:` / `motion-reduce:` de Tailwind para las transiciones puras CSS que no usen Motion.

---

## 4) Iconos: mantener `lucide-react`

| Set | Stocke | Licencia | React 19 | Aesthetic tipo SF Symbols | Veredicto |
|---|---|---|---|---|---|
| **`lucide-react`** (instalado) | $0 (ISC) | TS + tree-shake | **Sí** | outline, trazo delgado (estilo más cercano a SF Symbols de Apple) | ✅ **Mantener** |
| `@primer/octicons-react` | MIT | Sí | Ersatz, perfilado para GitHub (repo/PR/commit) — no genérico | Sufrido para app de finanzas; pocos iconos (280) | ❌ |
| feather (react-feather) | MIT | Ya, pero repo **archivada/I- actualizado** | Interfaz antigua | — | ❌ |
| remixicon (`@remixicon/react`) | Apache-2.0 | Sí | Muchísimos (3.200+), solero mit line+fill | Aspecto más "neutral/system", no del todo Apple | Alternativa aceptable |
| Phosphor (`@phosphor-icons/react`) | MIT | Sí | 6 pesos (thin/light...) | Muy bueno, más flexible | 🔶 Para evaluar si ya estabas meta |

**Decisión: mantener `lucide-react`.** Está ya en dependencies, es el sucesor de Feather (estilo de curva fina, el que más se acerca a los SF Symbols de Apple), es FREE, activo, tree-shakeable (solo importas lo que usas), soporta React 19, y su licencia ISC equivale a MIT. Cambiar de librería de iconos es churn sin valor visible para el objetivo (la estética de la app, no la iconografía).

Si más adelante quiseras acercarte aún más al "sistema" de SF Symbols con pesos variables, la única opción que valdría la pena es `@phosphor-icons/react` (peso `thin`/`light`), no Octicons ni feather.

---

## 5) Dark mode macOS-like en Tailwind v4

Tu app ya es *todas dark* (`bg-slate-950`, no hay `dark:` variant). Dos problemas de "verdadero negro vs grises elevados":

- macOS (Big Sur→Tahoe) en dark **no usa negro puro**; usa grises/elevated con luz apenas mayor y paneles translúcidos con blur sobre un wallpaper de color. El negro #000 se ve "muerto"; los paneles veteen elevate (slate-900/slate-800) + translucidez + blur.
- Si solo quieres esto, ya lo logras con los valores actuales (slate-950 base + paneles glass). Lo que **añadirás** es la posibilidad de un toggle y/o un `dark:` consistente.

### Configuración del `dark` variant (v4 CSS-first)

Por defecto en v4, `dark:` sigue `prefers-color-scheme` (media strategy, cero JS). Por un toggle manual (botón claro/oscuro, persistente por usuario) se **sobrescribe la variant en el CSS**:

```css
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));
```

- Toggles a `.dark` en `<html>` (compat clarity; o `[data-theme="dark"]` si prefieres atributo). El `:where()` mantiene specificity 0.
- **Debe ir DESPUÉS de `@import "tailwindcss"`** — si va antes, el override se ignora y `dark:` sigue la media query del SO.
- Evitar la forma defectuosa que escribe a veces la herramienta de upgrade: `@custom-variant dark (@media not print { .dark & })` — no se comporta como toggle por clase.

Anti-FOUC (sin parpadeo), script inline en `<head>`:

```js
document.documentElement.classList.toggle(
  "dark",
  localStorage.theme === "dark" ||
    (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches)
);
```

y escuchar `matchMedia(...).addEventListener("change", ...)` para modo "system" mientras el tab está abierto.

### Best practice: tokens `@theme` en vez de 100 `dark:` por utilidad

Para una app real (muchos surface) se define **tokens de tema** UNA VEZ y se deja que el `dark:`/`.dark` los flipèe:

```css
@theme {
  --color-surface: oklch(0.98 0 0);
  --color-ink: oklch(0.2 0 0);
}
.dark {
  --color-surface: oklch(0.16 0.01 260);   /* gris elevado NO negro puro */
  --color-ink: oklch(0.92 0 0);
}
```

Y en el markup solo `bg-surface text-ink`. Así el "modo oscuro tipo macOS" es un conjunto de tokens bien ajustado (elevated grays + alpha) en un solo sitio, no una casuística de `dark:bg-*` repartida.

**Recomendación dark concreta:** mantener dark-only si no hay requisito de toggle; si se añade toggle, usar `@custom-variant dark` + tokens `@theme` con **gris elevado translúcido** (`oklch ~0.15–0.18`) sobre el mesh gradient y paneles glass `bg-surface/70 + backdrop-blur-*`, nunca negro `#000`. La translucidad del dark!panel que ya tienes es el patrón correcto.

---

## Novedades menores / a evitar

- No introducir Electron/Tauri: no se pide y no cabe ("app en el navegador").
- El "Liquid Glass" de WWDC25/iOS26/Tahoe (refracción + especulares + motion-response) **no es reproducible 100%** con CSS plain; el glassmorphism clásico (blur + saturate + border + shadow) es lo que CSS te da de forma nativa.
- Evitar abusar del glass en Tablas/long text: legibilidad. Modo foto: blur translucido en mucho — usar glass en nav del producto (header/sidebar/modals/direct), no en tablas o lectura.

---

## Desbloqueo / uso (cómo llevarlo a la app)

Para el rediseño a "macOS nativo en el navegador" de DebtControl, el plan de desbloqueo:

1. **Vibrancy** — Añadir `backdrop-saturate-150/160/180` a los `.glass-panel`/`.glass-card` en `frontend/src/index.css`, subir alpha en dark (0.7–0.8 para el header, 0.55–0.6 para cards), y usar `backdrop-blur-xl` en el header/sidebar. Asegúrate de que el mesh gradient de `body` tenga colores vibrantes detrás para que el glass se aprecie.
2. **Title bar estático con traffic lights:** crear un componente `<TitleBar>` (o opcional `header`) `sticky top-0` con los 3 puntos en CSS puro (colores reales), títulos del app a la derecha, y un scroll listener que aplique `backdrop-blur-xl + bg-slate-900/70 + border-white/10` al pasar `window.scrollY > 8`. Todo esto ES 100% tailwind (salvo el listener de scroll que es React).
3. **Sidebar translúcido**: mismo panel `backdrop-blur` en el nav lateral, con `dark` glass tone.
4. **Añadir `motion`**: `npm i motion`; usar `<MotionConfig reducedMotion="user">` al nivel de App; mover las transiciones de peso (springs para popovers y quitar/poner paneles) a `motion.div` — por ejemplo, el abrir/cerrar de formularios/modales con `AnimatePresence` y spring `stiffness:500 damping:40` (efecto macOS).
5. **Iconos**: mantener `lucide-react`, no migrar.
6. **Reduced motion / accesibilidad**: `MotionConfig reducedMotion="user"` + `motion-reduce:` en el CSS del propio; optparse scroll listener con `{ passive:true }`.

Orden de coste: el 90% del "look macOS" sale de vibrancy + traffic lights (puro CSS/Tailwind); la librería de motion es el pulido del que mobe logic really.

---

## Sources

- caniuse "CSS Backdrop Filter" (94.63% global; Chrome/Edge/Safari/Firefox modernos; WebKit prefijo; Safari iOS listo): https://caniuse.com/css-backdrop-filter
- MDN — `backdrop-filter`: https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
- Josh W. Comeau — "Next-level frosted glass with backdrop-filter" (pseudo-element recap, `mask-image`, Chrome nested bugs): https://www.joshwcomeau.com/css/backdrop-filter/
- GoogleML — "Glassmorphism: the honest vector" (saturate 150–200% = Apple vibrancy; reflexes; 4 propiedades): https://generalistprogrammer.com / https://thisdevtool.com/blog/glassmorphism-css-guide / superdesign.dev/styles/glassmorphism
- Tailwind v4 — backdrop-filter: https://tailwindcss.com/docs/backdrop-filter y de blur: https://tailwindcss.com/docs/backdrop-filter-blur
- NerdLevelTech — "Tailwind v4 Dark Mode: @custom-variant dark (&:where(.dark, .dark *))" (v4 CSS-first, FOUC, anti-upgrade trap): https://nerdleveltech.com/tailwind-v4-dark-mode
- Tailwind v4 Docs — Dark mode: https://tailwindcss.com/docs/dark-mode
- `motion` (npm) — MIT; README "Motion is MIT licensed"; Motion+ es add-on opcional pago: https://www.npmjs.com/package/motion
- Motion for React reducción de motion: `useReducedMotion` https://motion.dev/docs/react-use-reduced-motion y `MotionConfig reducedMotion="user"` https://motion.dev/docs/react-motion-config
- react-spring — v10 mudó a React 19: https://www.react-spring.dev/docs y changelog; `@react-spring/web` latest 10.1.0 (may 2026): https://www.npmjs.com/package/@react-spring/web ; React 19 support issue cerrado #2341
- Traffic lights CSS (colores reales `#ff5f57`/`#febc2e`/`#28c840`, glyphs en hover, estados focus/active, glifos): CodePen por atdrago (https://codepen.io/atdrago/pen/yezrBR) y cssshowcase; también usos en El Electron custom-title-bar doc para carrou del patrón (decoros).
- `macos-traffic-lights` npm/MIT (SVGs con states default/hover/active/unfocused): https://github.com/aw3r1se/macOS-traffic-lights
- Iconos — lucide (ISC, tree-shakable), @primer/octicons (MIT, 280, estilo GitHub), remixicon (Apache): iconsearch y npm-compare; la release lucide-react 1.0 renombró varios iconos.
- Electron custom title bar doc (cómo se hace en un runtime desktop, útil como contexto del patrón; NOTA: aquí NO es aplicable, no usar Electron): https://electronjs.org/docs/latest/tutorial/custom-title-bar