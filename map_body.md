## Destination

Rediseñar la arquitectura para soportar múltiples módulos independientes (Órdenes de Amazon y Gastos de Gatos) con control de acceso por módulo y sub-permisos. Construir el módulo de Gastos de Gatos integrando scraping de tasas del BCV (USD/EUR) y registro multi-moneda.

## Notes

- **Domain**: Arquitectura Hexagonal, React (Vite) + Tailwind, Go (Gin) + Postgres.
- **Skills**: `/domain-modeling`, `/prototype`, `/tdd`.
- **Standing preferences**: Almacenar los montos siempre en USD pero guardando la moneda original y la tasa de cambio de ese momento para conversiones exactas en el histórico. Mantener el diseño limpio y reutilizable.

## Decisions so far

## Frontier (Tickets)

- [ ] #120 Update database schema for module-level access
- [ ] #121 Create Exchange Rates service & BCV scraper
- [ ] #122 Create database schema for Cat Expenses
- [ ] #123 Build UI for Exchange Rates modal & Cat module tab
- [ ] #124 Build backend CRUD for Cat Expenses
- [ ] #125 Build UI for Cat Expenses CRUD

## Not yet specified

- Estructura exacta de sub-módulos futuros (se definió que "Amazon" usará los *assigned persons* como sub-roles y "Gatos" será booleano por ahora).
- Posibles analíticas o gráficos para el módulo de gatos (actualmente solo registro y listado).
- Alternativas de fallback si la página del BCV cambia agresivamente su DOM y el scraper falla (por ahora se depende de confirmación manual en un modal).

## Out of scope

- Migración de deudas pasadas a un nuevo esquema multi-moneda (las órdenes de Amazon siguen como estaban).
