# Responsive-first breakpoint and layout policy

The DebtControl frontend is responsive-first: every surface must render without horizontal overflow from a `320px` phone up to ultra-wide monitors, and remain printable. This ADR fixes the breakpoint tiers, the ultra-wide container behavior, and the touch-target / spacing baseline that all responsive work keys off.

## Decisions

### Breakpoint tiers (Q1)

Keep Tailwind v4's default tiers for phone → laptop, and add two explicit ultra-wide tiers so ≥`1536px` behavior is intentional rather than inherited from `2xl`:

| Tier | Min width | Purpose |
|------|-----------|---------|
| (base) | `0` | small phone — single column, cards, hamburger nav |
| `sm` | `640px` | tablets portrait / large phones landscape |
| `md` | `768px` | tablets landscape; **tables become real tables here** (below: cards) |
| `lg` | `1024px` | laptops |
| `xl` | `1280px` | desktop comfort width |
| `2xl` | `1536px` | large desktop |
| `3xl` | `1600px` | ultra-wide — extra gutter room, wider container |
| `4xl` | `2000px` | very large monitors — widest container |

Tier names: `3xl` and `4xl` map to Tailwind v4's `min-3xl` / `min-4xl` variants and to `max-w-[...]` container widths.

## Ultra-wide container behavior (Q2)

The app centers its main column with `max-w-7xl` today. On ultra-wide screens the column widens gradually instead of leaving huge empty gutters:

- defaults and up to `xl`: `max-w-7xl` (current behavior).
- `3xl` (≥1600px): `max-w-[90rem]`.
- `4xl` (≥2000px): `max-w-[110rem]`.

Padding still derives from the existing `px-4 sm:px-6 lg:px-8` rhythm; tiers only change the container width.

## Touch-target and spacing baseline (Q3)

Standardize these across cards, avatars, rows, and modals so small-screen interactions feel identical everywhere:

- Tappable rows / buttons / rows: `h-12` (48px) minimum on touch.
- Card padding: `p-4` at base, `sm:p-6` at `sm`.
- Grid gaps: `gap-3` at base, `sm:gap-4` at `sm`.
- Status badges and icon buttons keep their current `w-8 h-8` / `h-9` footprint; the row/button height is the touch baseline.

## Considered Options

- **Tailwind defaults only**: rejected — left the ultra-wide tier (`>1536px`) undefined, so wide monitors would silently fall back to `2xl` gutters instead of an intentional layout.
- **Hard 1280px cap at all sizes**: rejected for the `3xl/4xl` decision — it leaves large empty gutters on ultrawide displays.
- **Per-component spacing overrides everywhere**: rejected — inconsistent gutters/touch targets across the app; a shared baseline is the source of truth.

## Consequences

- All responsive work (navbar drawer, table↔card flip, modal interiors) keys off the tiers and baseline above.
- The extra tiers are comments + `max-w-*` utilities in `frontend/src/index.css` so the policy lives in the repo and survives.
- The `md` breakpoint is the table→card boundary — any table that flips below this becomes a card stack.