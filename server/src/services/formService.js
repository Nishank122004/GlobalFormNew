import pool from '../config/database.js';
import { computeSubmissionFingerprint } from '../utils/fingerprint.js';

/**
 * Checks whether an existing record in MySQL matches all nine normalized form fields.
 * Uses the indexed submission_fingerprint for an O(1) database lookup.
 * 
 * @param {Object} formData - Normalized form fields
 * @returns {Promise<boolean>} True if an identical submission already exists
 */
export async function findDuplicateRecord(formData) {
  const fingerprint = computeSubmissionFingerprint(formData);

  const sql = `
    SELECT id 
    FROM personal_information 
    WHERE submission_fingerprint = ? 
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [fingerprint]);
  return rows.length > 0;
}

/**
 * Service layer responsible for persisting form submissions into MySQL.
 * 
 * Why use parameterized queries (? placeholders)?
 * - Separation of Code and Data: The database driver sends the SQL command and the parameter values
 *   in separate protocol packets.
 * - Complete immunity to SQL Injection: User input can never alter query syntax or structure.
 * 
 * Why store submission_fingerprint?
 * - Enforces database-level uniqueness across all 9 normalized fields.
 * - Guarantees data integrity even under high-concurrency race conditions.
 */
export async function savePersonalInfo(formData) {
  const {
    fullName,
    email,
    countryCode,
    normalizedPhone,
    mobileNumber,
    dateOfBirth,
    gender,
    city,
    postalCode,
    preferredLanguage
  } = formData;

  const phoneToSave = normalizedPhone || mobileNumber;
  const fingerprint = computeSubmissionFingerprint({
    ...formData,
    mobileNumber: phoneToSave
  });

  const sql = `
    INSERT INTO personal_information (
      submission_fingerprint,
      full_name,
      email,
      country_code,
      mobile_number,
      date_of_birth,
      gender,
      city,
      postal_code,
      preferred_language
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    fingerprint,
    fullName,
    email,
    countryCode,
    phoneToSave,
    dateOfBirth,
    gender || null,
    city,
    postalCode || null,
    preferredLanguage || null
  ];

  // pool.execute uses prepared statements for optimal performance and safety
  const [result] = await pool.execute(sql, values);

  return {
    id: result.insertId,
    submissionFingerprint: fingerprint,
    fullName,
    email,
    countryCode,
    mobileNumber: phoneToSave,
    createdAt: new Date().toISOString()
  };
}
