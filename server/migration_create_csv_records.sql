-- =====================================================================
-- Migration: Create csv_records for separately imported CSV records
-- =====================================================================

USE global_form_db;

CREATE TABLE csv_records (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  email VARCHAR(254) NOT NULL,
  mobile VARCHAR(32) NOT NULL,
  city VARCHAR(100) NULL,
  postal_code VARCHAR(32) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_csv_records_username (username)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
