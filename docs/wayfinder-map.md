# Wayfinder Map - DebtControl Platform

## Destination
A production-ready, monorepo Debt Control & Expense Tracking platform (Go backend + React frontend) with Hexagonal Architecture, Domain-Driven Design (DDD), PostgreSQL, Redis, Docker containerization, user authentication, and strict GitHub Pull Request workflows.

---

## Standing Preferences & Constraints
* **Language & Naming**: 100% English code. Self-descriptive variables/functions. No single-letter parameter names (`r` replaced with `requestContext` / `ginContext`).
* **Branch Strategy**: `main` (production), `staging` (pre-prod), `development` (integration), and `feature/*` development branches. `main` and `development` never receive direct pushes; all changes merged exclusively via PR.
* **Architecture**: Monorepo with Go API (`backend/`) and React Vite SPA (`frontend/`).

---

## Decisions So Far (Map Log)

1. **[DDD Aggregate Boundaries](file:///Users/guillejimenez/Documents/TestProyects/Deudas/backend/internal/core/domain/debt.go)** — `Person` is modeled as the primary Aggregate Root encapsulating purchase items, payment transactions, and balance recalculations within a transaction boundary.
2. **[Database Migration Strategy](file:///Users/guillejimenez/Documents/TestProyects/Deudas/backend/migrations/000001_create_debtcontrol_tables.up.sql)** — Selected `golang-migrate` for versioned raw SQL migration files (`000001_create_debtcontrol_tables.up.sql`) instead of ORM auto-migrations.
3. **[Centralized Domain Error Mapping](file:///Users/guillejimenez/Documents/TestProyects/Deudas/backend/pkg/errors/errors.go)** — Mapped domain sentinel errors (`ErrInvalidAmount`, `ErrPersonNotFound`, `ErrUserAlreadyExists`) to RFC 7807/standardized HTTP JSON error responses via `pkg/errors/errors.go`.
4. **[GitHub Actions CI Pipeline](file:///Users/guillejimenez/Documents/TestProyects/Deudas/.github/workflows/ci.yml)** — Configured automated PR validation (`.github/workflows/ci.yml`) including Go unit tests with race detection, `gosec` security scanning, React production build, and TypeScript typechecking.
5. **[Shipping & Flight Batch Aggregate](file:///Users/guillejimenez/Documents/TestProyects/Deudas/backend/internal/core/domain/debt.go)** — Modeled `ShippingBatch` as an aggregate root grouping packages into monthly flight dispatches (July/August batches), tracking warehouse receipt states and flight dispatch costs ($81.50, $18.50).

---

## Out of Scope
* Single-letter variable names or ambiguous parameters (`r`, `i`, `e`).
* Direct commits to `main` or `development` branches.
