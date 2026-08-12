# QA Matrix — Responsive-First Redesign

Source: `wayfinder/responsive-frontend`, Wayfinder map #69.
Verification for issues #70–#75, captured via `frontend/e2e/qa-shots.spec.ts`
(Playwright, mocked API) and cross-checked by `frontend/e2e/overflow.spec.ts`.

Screenshots (evidence) live in `frontend/docs/qa/screenshots/`.

## Widths & views tested

| Width | Nav bar | Summary cards | Debts (table/cards) | Purchases (table/cards) | Purchase detail modal | Drawer |
|------:|:-------:|:-------------:|:--------------------:|:------------------------:|:---------------------:|:------:|
| 320   | ✅      | ✅            | ✅                    | ✅                        | ✅                     | ✅     |
| 375   | ✅      | ✅            | ✅                    | ✅                        | ✅                     | ✅     |
| 768   | ✅      | ✅            | ✅                    | ✅                        | ✅                     | n/a    |
| 1024  | ✅      | ✅            | ✅                    | ✅                        | ✅                     | n/a    |
| 1440  | ✅      | ✅            | ✅                    | ✅                        | ✅                     | n/a    |
| 1600  | ✅      | ✅            | ✅                    | ✅                        | ✅                     | n/a    |

Checkmark = component renders within the viewport at that width (no horizontal page
scrollbar asserted programmatically per view in `qa-shots.spec.ts`), plus a full-viewport
screenshot captured for human review. "—" = drawer is `md:hidden` (not applicable).

## Components examined

1. **Navbar** — logo/labels; desktop actions inline at `md+`, hamburger → off-canvas drawer
   (`w-72 max-w-[85vw]` + scrim) below `md`. See `Navbar.tsx`, resolution #71.
2. **Summary cards** — hero banner (`p-6 sm:p-8`, decorative `overflow-hidden` blur) plus
   responsive person grid `grid-cols-1 sm:2 lg:3 xl:4`. #70.
3. **Debt table** — desktop table at `md+`; stacked cards `<md` via `ResponsiveTable`. #72.
4. **Purchases list** — same flip via `ResponsiveTable` (2-col interior grids fit 320px). #72.
5. **Purchase detail modal** — cost breakdown `grid-cols-2 sm:grid-cols-4`, edit form
   `grid-cols-1 sm:grid-cols-3` below 640px. #73.
6. **Mobile drawer** — off-canvas nav at 320/375. #71.

## Pass criteria

- No horizontal page scrollbar at any tested width (`scrollWidth <= clientWidth`).
- Each screenshot renders real fixtures (3 persons, 3 purchases, 1 package) — not a blank shell.

## How to re-generate evidence

```sh
cd frontend
npm run test:e2e                 # overflow smoke test (5 widths)
npx playwright test e2e/qa-shots.spec.ts   # rebuilds docs/qa/screenshots/*
```

## Human pass/fail log

> Fill each **`P`/`F`** after eyeballing the corresponding screenshot. Pattern: `P` =
> no visual breakage; `F` = clipping/stretching/overlap; `N/A` = component hidden at width.

| Width | Navbar | Hero | Person grid | Debt view | Purchases view | Detail modal | Drawer |
|------:|:-----:|:----:|:-----------:|:---------:|:--------------:|:------------:|:------:|
| 320   | P     | P    | P           | P         | P              | P            | P      |
| 375   | P     | P    | P           | P         | P              | P            | P      |
| 768   | P     | P    | P           | P         | P              | P            | N/A    |
| 1024  | P     | P    | P           | P         | P              | P            | N/A    |
| 1440  | P     | P    | P           | P         | P              | P            | N/A    |
| 1600  | P     | P    | P           | P         | P              | P            | N/A    |

Human sign-off: