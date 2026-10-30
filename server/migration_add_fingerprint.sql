-- =====================================================================
-- Migration: Add submission_fingerprint to personal_information table
-- Purpose: Prevent duplicate user submissions while preserving existing data
-- =====================================================================

USE global_form_db;

-- 1. Safely add submission_fingerprint column if it does not exist
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
    AND table_name = 'personal_information' 
    AND column_name = 'submission_fingerprint'
);

SET @add_col_sql = IF(@col_exists = 0,
  'ALTER TABLE personal_information ADD COLUMN submission_fingerprint CHAR(64) NULL AFTER id',
  'SELECT "Column submission_fingerprint already exists." AS status'
);

PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

-- 2. Populate fingerprints for any existing rows that lack one
-- Computes the SHA-256 hash across the 9 normalized fields matching the Node.js implementation
UPDATE personal_information
SET submission_fingerprint = SHA2(
  CONCAT(
    TRIM(full_name), CHAR(31),
    LOWER(TRIM(email)), CHAR(31),
    UPPER(TRIM(country_code)), CHAR(31),
    TRIM(mobile_number), CHAR(31),
    DATE_FORMAT(date_of_birth, '%Y-%m-%d'), CHAR(31),
    IF(gender IS NOT NULL AND TRIM(gender) != '', TRIM(gender), '__NULL__'), CHAR(31),
    TRIM(city), CHAR(31),
    IF(postal_code IS NOT NULL AND TRIM(postal_code) != '', TRIM(postal_code), '__NULL__'), CHAR(31),
    IF(preferred_language IS NOT NULL AND TRIM(preferred_language) != '', LOWER(TRIM(preferred_language)), '__NULL__')
  ),
  256
)
WHERE submission_fingerprint IS NULL;

-- 3. Modify column to NOT NULL once all rows have a fingerprint
ALTER TABLE personal_information 
  MODIFY COLUMN submission_fingerprint CHAR(64) NOT NULL COMMENT 'SHA-256 canonical fingerprint of all 9 normalized fields';

-- 4. Add UNIQUE constraint if it does not already exist
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
    AND table_name = 'personal_information' 
    AND index_name = 'uq_submission_fingerprint'
);

SET @add_idx_sql = IF(@idx_exists = 0,
  'ALTER TABLE personal_information ADD UNIQUE INDEX uq_submission_fingerprint (submission_fingerprint)',
  'SELECT "Unique index uq_submission_fingerprint already exists." AS status'
);

PREPARE add_idx_stmt FROM @add_idx_sql;
EXECUTE add_idx_stmt;
DEALLOCATE PREPARE add_idx_stmt;

SELECT "Migration complete: submission_fingerprint column and unique constraint are active." AS result;
