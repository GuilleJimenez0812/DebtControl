# DebtControl

Debt control and expense tracking platform: purchases are loaded against persons, whose balances derive from what they owe and what they have paid.

## Language

**Person**:
The individual a debt is tracked for. Aggregate root owning purchases, payments, and derived balance.
_Avoid_: User (a User is an authenticated account, not a debtor), customer

**Order**:
A purchase loaded against a Person, with item, tax, and shipping amounts. Modeled in code as `PurchaseItem`.
_Avoid_: Purchase (in user-facing language), transaction

**Package**:
A physical shipment belonging to an Order, grouped into Shipping Batches for dispatch. Lives strictly below its Order: it cannot outlive it.
_Avoid_: Shipment, parcel

**Payment**:
Money recorded against a Person, never against a specific Order. Reassigning or deleting an Order never moves or removes Payments.
_Avoid_: Refund, credit

**Reassign**:
Correcting the Person an Order was loaded against. Balances of both Persons are recalculated; Payments stay with the Person who made them.
_Avoid_: Transfer, move

**Logical Delete**:
Marking a record as deleted (`deleted_at`) without removing the row, purely for traceability. Deleted records are excluded from all reads and balances and are never restorable. Deleting an Order logically deletes its Packages in the same transaction (cascade flows downward only, never to the Person).
_Avoid_: Soft delete with restore, archive, hard delete
