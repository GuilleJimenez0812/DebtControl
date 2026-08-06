-- Down Migration: Remove the Order<->Package foreign key and logical delete markers

ALTER TABLE shipping_packages
    DROP CONSTRAINT IF EXISTS fk_shipping_packages_purchase_item;

DROP INDEX IF EXISTS idx_shipping_packages_purchase_item;

ALTER TABLE shipping_packages
    DROP COLUMN IF EXISTS purchase_item_id;

ALTER TABLE shipping_packages
    DROP COLUMN IF EXISTS deleted_at;

ALTER TABLE purchase_items
    DROP COLUMN IF EXISTS deleted_at;
