-- Migration: add `status` and `is_approved` to `products`
-- Safe: only adds columns if they do not already exist. Sets `is_approved` from existing `status='approved'`.

USE pethub_db;

-- Add `status` column if missing
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = 'pethub_db' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'status') = 0,
    "ALTER TABLE products ADD COLUMN status VARCHAR(50) DEFAULT 'pending'",
    "SELECT 'status column exists'"
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add `is_approved` column if missing
SET @sql2 = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = 'pethub_db' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'is_approved') = 0,
    "ALTER TABLE products ADD COLUMN is_approved TINYINT(1) DEFAULT 0",
    "SELECT 'is_approved column exists'"
  )
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Populate `is_approved` from existing `status` values if applicable
UPDATE products SET is_approved = 1 WHERE status = 'approved';

-- Optional: add an index on status for faster admin filters
SET @sql3 = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = 'pethub_db' AND TABLE_NAME = 'products' AND INDEX_NAME = 'idx_products_status') = 0,
    'CREATE INDEX idx_products_status ON products(status)',
    "SELECT 'index exists'"
  )
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Migration end
