import crypto from 'crypto';

/**
 * Computes a deterministic SHA-256 fingerprint for a 9-field personal information submission.
 * 
 * Why this approach?
 * - Compares ALL 9 fields rather than name or email alone (allowing different users to share emails or names).
 * - Treats nullable optional fields (gender, postalCode, preferredLanguage) consistently using a fixed null token.
 * - Encodes string in UTF-8 to reliably support international scripts (Hindi, Arabic, etc.).
 * - Generates a 64-character hexadecimal digest protected by a UNIQUE database constraint.
 * 
 * @param {Object} data - Normalized form submission object
 * @returns {string} 64-character hex SHA-256 hash
 */
export function computeSubmissionFingerprint({
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
}) {
  const phone = (normalizedPhone || mobileNumber || '').trim();

  const parts = [
    (fullName || '').trim(),
    (email || '').trim().toLowerCase(),
    (countryCode || '').trim().toUpperCase(),
    phone,
    (dateOfBirth || '').trim(),
    gender && gender.trim() !== '' ? gender.trim() : '__NULL__',
    (city || '').trim(),
    postalCode && postalCode.trim() !== '' ? postalCode.trim() : '__NULL__',
    preferredLanguage && preferredLanguage.trim() !== '' ? preferredLanguage.trim().toLowerCase() : '__NULL__'
  ];

  // Join using ASCII Unit Separator (\x1F), which cannot collide with standard text
  const canonicalString = parts.join('\x1F');

  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}
