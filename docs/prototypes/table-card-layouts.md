# Table↔card prototype — primary source (ticket #72)

Decision: **stacked list** card layout with the `total_owed` field labelled "Total Compras"/"Total Purchases" (i18n).

## Explored card layouts (structural variants)

- **Stacked list** (WINNER) — title in bold on top, each remaining field as its own label/value row, divided by hairlines. Tall cards, single-column reading. Chosen for the debt/purchases/shipping tables.
- **2-col grid** — title + balance on a header line, remaining fields in a 2-column grid. Dense; rejected in favor of stacked for the label clarity on financial rows.
- **Compact one-liner** — just title + primary value on one line. Minimal; rejected as hiding the multi-field breakdown these tables carry.

## Implementation outcome

The prototypes were thrown away; the winner was promoted into the production deep module
`frontend/src/components/ResponsiveTable.tsx` (columns + rows interface; owns the table vs (below md) card flip). Consumers refactored onto it: `DebtTable.tsx`, `PurchasesList.tsx`, `ShippingPackages.tsx`. Added i18n term `totalPurchases` = "Total Purchases"/"Total Compras" used as the card label for `total_owed`.