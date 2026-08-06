-- Up Migration: Add logical delete (deleted_at) and the Order<->Package foreign key
--
-- ADR-0001: purchase_items and shipping_packages gain a nullable deleted_at marker.
-- shipping_packages also gains purchase_item_id -> purchase_items.id (ON DELETE CASCADE)
-- as the canonical Order<->Package link, replacing the unindexed order_number string join
-- for the cascade path. The order_number column remains as denormalized display data.

ALTER TABLE purchase_items
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

ALTER TABLE shipping_packages
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE NULL;

ALTER TABLE shipping_packages
    ADD COLUMN IF NOT EXISTS purchase_item_id VARCHAR(64) NULL;

-- Backfill: link each package to the Order with the same order number, preferring a match
-- that shares the same monthly period (detail_period = batch_month). Order numbers are not
-- unique; when a package matches multiple Orders and no period preference resolves it,
-- the FK is left NULL (the package keeps working via its stored data).
UPDATE shipping_packages
SET purchase_item_id = best.purchase_item_id
FROM (
    SELECT candidate.package_id,
           candidate.purchase_item_id,
           ROW_NUMBER() OVER (
               PARTITION BY candidate.package_id
               ORDER BY candidate.same_period DESC, candidate.purchase_item_id
           ) AS preference_rank,
           COUNT(*) FILTER (WHERE candidate.same_period) OVER (PARTITION BY candidate.package_id) AS same_period_count,
           COUNT(*) OVER (PARTITION BY candidate.package_id) AS total_count
    FROM (
        SELECT shipping_packages.id AS package_id,
               purchase_items.id AS purchase_item_id,
               (purchase_items.detail_period = shipping_packages.batch_month) AS same_period
        FROM shipping_packages
        JOIN purchase_items
          ON purchase_items.order_number = shipping_packages.order_number
         AND purchase_items.deleted_at IS NULL
    ) candidate
) best
WHERE shipping_packages.id = best.package_id
  AND best.preference_rank = 1
  AND (
      (best.same_period_count = 1 AND best.total_count >= 1)
      OR (best.same_period_count = 0 AND best.total_count = 1)
  );

CREATE INDEX IF NOT EXISTS idx_shipping_packages_purchase_item
    ON shipping_packages(purchase_item_id);

-- Physical integrity only: the ORM's soft delete means this cascade never fires, but bulk
-- physical resets stay consistent.
ALTER TABLE shipping_packages
    ADD CONSTRAINT fk_shipping_packages_purchase_item
    FOREIGN KEY (purchase_item_id)
    REFERENCES purchase_items(id)
    ON DELETE CASCADE;
