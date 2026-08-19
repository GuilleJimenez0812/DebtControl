# DebtControl

DebtControl is a debt control and expense tracking platform. It tracks purchases loaded against persons, and their balances are derived from what they owe and what they have paid.

## Domain Terminology

- **Person**: The individual a debt is tracked for. It is the aggregate root owning purchases, payments, and the derived balance.
- **Order** (Code: `PurchaseItem`): A purchase loaded against a Person, with item, tax, and shipping amounts.
- **Package**: A physical shipment belonging to an Order, grouped into Shipping Batches for dispatch.
- **Payment**: Money recorded against a Person. Payments never belong to a specific Order.
- **Reassign**: Correcting the Person an Order was loaded against. Balances are recalculated but Payments remain with the person who made them.
- **Logical Delete**: Records are marked as deleted (`deleted_at`) but not removed, purely for traceability.

## Project Structure

- **frontend/**: Client-side application.
- **backend/**: Server-side application.
- **docs/**: Project documentation, including ADRs and security standards.

## Security

Security is a primary focus for DebtControl. The standard threat model and mitigation rules are defined in [SECURITY.md](SECURITY.md) and inside the `docs/sec/` directory. All new endpoints dealing with auth, uploads, or money require a security review.
