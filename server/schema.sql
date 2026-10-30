-- =====================================================================
-- Database and Table Creation Script
-- Project: Global Personal Information Form
-- =====================================================================

-- 1. Create the database if it doesn't already exist
CREATE DATABASE IF NOT EXISTS global_form_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE global_form_db;

-- 2. Create personal_information table
-- We use utf8mb4 encoding to properly support international names,
-- characters, and accents from all languages (Hindi, Arabic, French, Spanish, etc.)
CREATE TABLE IF NOT EXISTS personal_information (
  id INT AUTO_INCREMENT PRIMARY KEY,
  submission_fingerprint CHAR(64) NOT NULL UNIQUE COMMENT 'SHA-256 canonical fingerprint of all 9 normalized fields to prevent duplicate records',
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  country_code CHAR(2) NOT NULL COMMENT 'ISO 3166-1 alpha-2 country code',
  mobile_number VARCHAR(30) NOT NULL COMMENT 'Normalized international E.164 phone number',
  date_of_birth DATE NOT NULL COMMENT 'YYYY-MM-DD format',
  gender VARCHAR(30) DEFAULT NULL COMMENT 'Optional: male, female, other, prefer_not_to_say',
  city VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) DEFAULT NULL COMMENT 'Optional: string to preserve leading zeroes and alphanumeric formats',
  preferred_language VARCHAR(10) DEFAULT NULL COMMENT 'Optional: en, hi, fr, es, ar',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes for search and integrity
  INDEX idx_country_code (country_code),
  INDEX idx_email (email),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
