import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Validates and normalizes an international phone number based on ISO country code.
 * 
 * Why libphonenumber-js?
 * - Different countries have vastly different telephone numbering plans (e.g. 7 to 15 digits).
 * - A generic regex like /^\d{10}$/ falsely rejects legitimate global numbers (e.g., Singapore 8 digits, UK 10/11 digits).
 * - Parses and converts valid numbers into the standard E.164 format (e.g. +14155552671).
 * 
 * @param {string} rawPhone - The phone number entered by the user.
 * @param {string} countryCode - Two-letter ISO 3166-1 alpha-2 code (e.g. 'US', 'IN').
 * @returns {{ isValid: boolean, normalized: string | null }}
 */
export function validateAndNormalizePhone(rawPhone, countryCode) {
  if (!rawPhone || typeof rawPhone !== 'string') {
    return { isValid: false, normalized: null };
  }

  const trimmed = rawPhone.trim();
  if (!trimmed) {
    return { isValid: false, normalized: null };
  }

  try {
    const phoneNumber = parsePhoneNumberFromString(trimmed, countryCode ? countryCode.toUpperCase() : undefined);

    if (phoneNumber && phoneNumber.isValid()) {
      return {
        isValid: true,
        normalized: phoneNumber.format('E.164') // standard international format
      };
    }

    return { isValid: false, normalized: null };
  } catch {
    return { isValid: false, normalized: null };
  }
}
