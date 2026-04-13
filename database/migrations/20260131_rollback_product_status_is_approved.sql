-- Rollback: remove `status` and `is_approved` from `products` if present

USE pethub_db;

-- Drop `is_approved` if exists
SET @sql = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = 'pethub_db' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'is_approved') = 1,
    'ALTER TABLE products DROP COLUMN is_approved',
    "SELECT 'no is_approved'"
  )
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop `status` if exists
SET @sql2 = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = 'pethub_db' AND TABLE_NAME = 'products' AND COLUMN_NAME = 'status') = 1,
    'ALTER TABLE products DROP COLUMN status',
    "SELECT 'no status'"
  )
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Drop index if exists
SET @sql3 = (
  SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = 'pethub_db' AND TABLE_NAME = 'products' AND INDEX_NAME = 'idx_products_status') = 1,
    'DROP INDEX idx_products_status ON products',
    "SELECT 'no index'"
  )
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Rollback end
