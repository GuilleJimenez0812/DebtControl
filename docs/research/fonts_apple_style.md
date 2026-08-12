# Research: stack de fuentes estilo Apple/macOS (SF Pro) 100 % $0

**Date:** 2026-08-07
**Context:** Rediseño UI estética Apple/macOS para DebtControl. Frontend React 19 + Vite + Tailwind v4. Hoy la app usa sistema `sans` por defecto + `font-mono` para los importes de dinero. Requisito crítico: **todo $0** — sin licencias de pago, sin redistribuir fuentes propietarias. Desbloquea el ticket de "sistema de diseño".

---

## Decisión (una opción concreta)

Self-hostear **Inter (variable)** como `--font-sans` y **JetBrains Mono (variable)** como `--font-mono`, con el **system UI stack** como fallback. Inter y JetBrains Mono son OFL (open license), 100 % gratuitas y libremente redistribuibles; ambas se self-hostean gratis vía npm `@fontsource-variable/*` (o Google Fonts). SF Pro no se usa porque su licencia prohíbe su uso web.

```css
@theme {
  --font-sans: "Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

Instalación exacta (en `frontend/`):

```bash
npm i @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

Importar (en la entrada de la app, p.ej. `src/main.tsx`):

```ts
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
```

---

## 1. Licencia de SF Pro en web: por qué no se puede self-hostear

La licencia de la **Apple SF Font** es clara y estricta (aviso visible al descargar de [developer.apple.com/fonts](https://developer.apple.com/fonts/)):

> **IMPORTANT NOTE:** THE APPLE SAN FRANCISCO FONT IS TO BE USED SOLELY FOR CREATING MOCK-UPS OF USER INTERFACES TO BE USED IN SOFTWARE PRODUCTS RUNNING ON APPLE'S iOS, macOS OR tvOS OPERATING SYSTEMS, AS APPLICABLE.

Y la sección *2. Permitted License Uses and Restrictions* detalla por qué **no** vale para web:

- **Uso limitado (2.A):** solo para crear mock-ups de UI de productos que corran en iOS / macOS / tvOS, y solo si eres un *registered Apple Developer* o por permiso escrito de Apple.
- **Otras restricciones (2.B):**
  > You may **not embed the Apple Font in any software programs or other products**. Except as expressly provided for herein, you may not use the Apple Font to create, develop, display or otherwise distribute any documentation, artwork, **website content** or any other work product.
  - Solo **un usuario a la vez**, sin ponerlo "disponible en red" para múltiples equipos.
  - No se puede alquilar, prestar, vender, sublicenciar ni **redistribuir** de forma no autorizada.
- Si dejas el programa de desarrollador registrado, la licencia **termina** y debes destruir las copias.

Consecuencia práctica: **no se puede servir `sf-pro-display.woff2` desde nuestro frontend** para usuarios finales de una app web. Eso es "embed en producto web" + "distribución" + "uso en no-Apple", las tres cosas prohibidas. Los clones alojados en repos como `San-Francisco-family` o `SFWindows` **siguen siendo archivos propietarios de Apple** y quedan en zona gris/ilegal.

**Los únicos usos legales de SF Pro para nosotros:**
1. **No descargar ni servir el archivo**: referenciar la fuente *del sistema* (`-apple-system` / `system-ui`), que es la SF Pro nativa que macOS/iOS ya tienen instalada — no se redistribuye, la sirve el propio OS.
2. Mock-ups de UI de productos Apple (no aplicable a esta app multiplataforma).
3. Uso personal/local: instalar la fuente en la máquina del diseñador para revisar pruebas de *design* (igual que cualquier licencia de escritorio).

> Para los *users que quieren el feel nativo Apple*, se accede vía `-apple-system`/`system-ui` (la fuente real SF Pro **del sistema**, que no es "embebida" sino servida por el OS). Para usuarios en Windows/Linux se recurre a un clon/open typeface $0 (ver sección 2).

---

## 2. Recomendación de stack $0 estilo Apple: comparativa

Objetivo: reproducir el look "Apple" (SF Pro) sin SF Pro. Los candidatos $0:

| Fuente | Licencia | Self-host (npm) | Variable | Parecido a SF | Veredicto |
|---|---|---|---|---|---|
| **Inter** | OFL-1.1 ✅ | `@fontsource-variable/inter` | 100–900 (+italic) | ~88 % (más cercano) | **✅ Ganadora** |
| System UI stack (`-apple-system/BlinkMacSystemFont/…`) | nativa del SO (no se distribuye) | — | n/a | 100 % en macOS (es la real) | Fallback imprescindible |
| Wix Madefor | OFL ✅ | `@fontsource/wix-madefor-text` (+ var) | Sí | buena, carácter más ancho | alternativa interesante |
| Public Sans | OFL ✅ | `@fontsource-variable/public-sans` | Sí | media, notablemente distinta | prescindible |
| Figtree | OFL ✅ | `@fontsource-variable/figtree` | Sí | media-baja | prescindible |
| Gellini / IBM Plex Sans | OFL ✅ | `@fontsource/ibm-plex-sans` | sí/No | media | prescindible |

**Por qué Inter es la mejor** (ratings de la comunidad y diseño, p. ej. `fontalternatives.com` la puntúa ~88 % de similitud con SF Pro):
- **OFL-1.1**: libre, uso comercial, modificación y redistribución sin restricciones. $0 real y documentado.
- **Variable (100–900)**: un solo archivo WOFF2 con todos los pesos → menos requests y bytes; mapea directo a los pesos de SF Pro (SF Pro va de ultralight 100 a black 900).
- Mapeo de jerarquía SF: **titulares** usan pesos light/semibold (SF usa `SF Pro Display` en ≥20px); **cuerpo/UI** usan regular/medium (SF Pro Text); **labels** usan medium/semibold. Inter reproduce ese rango.
- Es el estándar *de facto* para imitar estética Apple en web (github de Vercel/Linear etc. lo usan como sustituto "closest free substitute" de SF Pro).

> 📌 La **variable Inter** es la elección: aunque la system-ui nativa en macOS es la real SF Pro, en Windows/Linux/Android **cae a un feo sistema**. Self-hostear Inter consigue la misma *estética Apple* en todas las plataformas. El system-stack se sitúa como *fallback* robusto.

---

## 3. Fuente mono para el dinero (tipo SF Mono)

Montos de $ con `font-mono`. El objetivo es un mono técnico tipo **SF Mono** ($0, self-hostable) con buen soporte de **tabulación/cifras** para columnas alineadas verticalmente.

| Fuente | Licencia | Variable | Puntos fuertes | Veredicto |
|---|---|---|---|---|
| **JetBrains Mono** | OFL ✅ | `@fontsource-variable/jetbrains-mono` | x-height alto, cifras claras 0/1/l, ligaduras opcionales, gran legibilidad en UI; muy popular, buen hinting | **✅ Ganadora** |
| IBM Plex Mono | OFL ✅ | `@fontsource-variable/ibm-plex-mono` | neutral, corporativo, serio | buen runner-up |
| Geist Mono | OFL ✅ | `@fontsource-variable/geist-mono` | moderno, inspirado en SF Mono, minimal | runner-up cercano a la estética Vercel |
| Source Code Pro | OFL ✅ | `@fontsource-variable/source-code-pro` | clásico (Adobe), sin ligaduras | alternativa sólida |

**Ganador: JetBrains Mono (variable).**

Razones frente a SF Mono:
- Ya es la opción mono más usada en design systems modernos y reproduce la estética *technical-money* de SF.
- **Cifras monoespaciadas** → alineación vertical de columnas de importes (igual que SF Mono en tablas/finanzas).
- Hinting muy cuidado para tamaños pequeños (es el objetivo primero de un importe de $).
- OFL, self-hostable con `@fontsource-variable/jetbrains-mono`.
- Personalidad neutra y "engineered"; se combina bien con Inter.

> Preferencia de la app **hoy**: `ui-monospace, SFMono-Regular, Menlo`. La nueva `--font-mono` mantiene esa familia como fallback, pero la primera es JetBrains Mono para una estética consistente multiplataforma.

---

## 4. Opciones $0 de self-hosting

Hay dos caminos $0:

### 4.1 Self-host por npm `@fontsource-variable/*` (RECOMENDADO)
- Empaqueta los WOFF2 + CSS en tu bundle; **cero latencia/DNS extra, sin tracker de terceros** (Google Fonts recopila datos de uso), versionado como cualquier dependencia, funcional offline/PWA.
- **Ventaja**: los fonts quedan dentro del bundle como parte del deploy, sin dependencia de red ni de un tercero.
- **Contra**: un paquete de dependencia más; hay que añadir el import en la entrada de la app.

**Instalar** (en `frontend/`):

```bash
npm i @fontsource-variable/inter @fontsource-variable/jetbrains-mono
```

Importar en `src/main.tsx`:

```ts
import "@fontsource-variable/inter";             // Inter Variable (wght 100–900)
import "@fontsource-variable/jetbrains-mono";   // JetBrains Mono Variable
```

El nombre de familia CSS resultante es `Inter Variable` y `JetBrains Mono Variable` (puedes verlo en el propio `README` del paquete).

### 4.2 Google Fonts (alternativa $0)
Misma licencia OFL, gratuita y sin fricción, pero:
- Depende de un tercero (datos de tráfico para Google).
- Otro salto de DNS/red para el usuario (más latencia; no reproducible offline).
- Funciona igual con `@import` en CSS o `<link>` en el HTML.

Se **recomienda self-hosting por npm** (opción 4.1): es la más $0, robusta y con una estética uniforme en todos los entornos.

---

## 5. Tokens finales del design system (Tailwind v4)

En Tailwind v4 los tokens de tipografía se definen en el CSS base con `@theme` (no hace falta `tailwind.config`). Los nombres `--font-sans` y `--font-mono` son los que crear las utilities `font-sans` / `font-mono`.

**`frontend/src/index.css`:**

```css
@import "tailwindcss";

@theme {
  --font-sans: "Inter Variable", -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, SFMono-Regular, Menlo,
    Monaco, monospace;
}
```

### Notas de mapeo / jerarquía (Apple)
- **Titulares** (`Display`): pesos `font-light` 200–300 + `font-semibold` 600 → Inter 300–600.
- **Body y números**: Regular (400)–Medium (500) → `--font-sans` con 400/500.
- **Labels / captions**: Medium (500)–Semibold (600), con tracking ligero → Inter 500/600.
- **Montos de dinero**: `font-mono` → JetBrains Mono 400–600. Opcional `tabular-nums` si se necesita alinear columnas; JetBrains ya es monoespaciada.

### Claro / oscuro + hinting
- **Hinting**: Inter y JetBrains Mono tienen buen hinting para pantalla; self-hosting sirve la variable, con el `wght` aplicado según jerarquía.
- **Claro (`light`)**: se ve mejor con peso *regular* (400) y tracking normal; evita pesos muy finos sobre fondos blancos puros. Mantén `-webkit-font-smoothing: antialiased` en el `body` (el `index.css` ya lo aplica).
- **Oscuro (`dark`)**: Inter conserva buena reproducción sobre fondos oscuros; **para los montos (mono) en dark usa JetBrains 500** para máxima legibilidad. Ajusta `letter-spacing` en titulares grandes en dark (+0.01em) para compensar el brillo.
- **Fallbacks**: ambos stacks cierran con fuentes nativas (sans-serif / mono) en plataformas que no las soporten. El toke `-apple-system` mantiene el feel nativo real en macOS/iOS mientras Inter no cargue.

---

## Desbloqueo / uso

Este doc desbloquea el ticket de "**sistema de diseño**": ya queda la decisión tipográfica $0 (Inter + JetBrains Mono, self-hosteada, con stack del sistema de fallback) lista para convertir en tokens de `@theme`. Pasos para implementar:

1. En `frontend/`: `npm i @fontsource-variable/inter @fontsource-variable/jetbrains-mono`.
2. En `src/main.tsx`: importar ambos paquetes.
3. En `src/index.css`: añadir el bloque `@theme` anterior (los tokens `--font-sans` / `--font-mono` alimentan las utilities `font-*` de Tailwind v4).
4. Verificar `font-mono` en los montos de la tabla y revisar en claro + oscuro.

---

## Sources / fuentes

- Apple San Francisco Font License (texto oficial en la página de descarga): https://developer.apple.com/fonts/ — "solely for creating mock-ups … Apple's iOS, macOS or tvOS", "may not embed the Apple Font in any software programs", "may not … redistribute" (texto de la cláusula 2, recuperado del sitio oficial 2026-08).
- Inter (proyecto oficial / licencia OFL): https://rsms.me/inter/ · https://github.com/rsms/inter
- `@fontsource-variable/inter` (npm): https://www.npmjs.com/package/@fontsource-variable/inter · https://fontsource.org/fonts/inter
- JetBrains Mono (OFL, pesos 100–800, buen hinting): https://www.jetbrains.com/lp/mono/ · https://github.com/JetBrains/JetBrainsMono
- `@fontsource-variable/jetbrains-mono` (npm): https://www.npmjs.com/package/@fontsource-variable/jetbrains-mono
- Vercel Geist (inspirado en SF Mono/SF Pro, OFL): https://github.com/vercel/geist-font
- Comparativa de similitud (Inter ≈ 88 % con SF Pro, fuente secundaria): https://fontalternatives.com/compare/inter-vs-sf-pro-display/
- Apple Developer Forums (uso web de SF no permitido): https://developer.apple.com/forums/thread/733267 y https://developer.apple.com/forums/thread/127350

### Nota de metodología
Las puntuaciones de "parecido" (p. ej. "88 %") y la comparativa de fuentes proceden del conocimiento general y de fuentes secundarias de referencia (fontalternatives, madegooddesigns); los datos de *licencia* (prohibición de SF, licencia OFL de las demás) están verificados contra el texto oficial de Apple y los repos oficiales de cada fuente.