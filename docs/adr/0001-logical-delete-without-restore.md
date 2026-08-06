# Logical delete without restore, with logical cascade

Orders (and their Packages) are deleted logically (`deleted_at` marker) rather than physically, purely to preserve traceability — deleted records are excluded from every read and balance calculation and are **never restorable**, by explicit product decision. A real foreign key (`shipping_packages.purchase_item_id` → `purchase_items.id`) exists for referential integrity and indexed joins, but its `ON DELETE CASCADE` never fires: since rows are never physically removed, the Order→Package cascade happens logically in the service layer, inside one transaction. Cascade flows downward only — deleting an Order never touches its Person or their Payments.

## Considered Options

- **Hard delete + audit log**: rejected — the product owner wants the rows themselves retained for traceability.
- **Soft delete with restore UI**: rejected — restore is deliberately out of scope; recoverability is not the goal, traceability is.

## Consequences

- Every query touching `purchase_items` or `shipping_packages` must filter `deleted_at IS NULL` (GORM's `gorm.DeletedAt` does this automatically).
- `deleted_at` is added only to tables that have a delete feature (`purchase_items`, `shipping_packages` for now); other tables adopt the pattern when their delete features arrive.
