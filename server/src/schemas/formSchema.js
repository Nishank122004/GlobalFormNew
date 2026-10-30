import { z } from 'zod';
import validator from 'validator';
import { validateAndNormalizePhone } from '../utils/phoneValidator.js';

/**
 * Regex for Full Name:
 * - Must NOT contain digits (0-9)
 * - Must contain at least one Unicode letter (\p{L})
 * - Allows Unicode letters, combining marks (accents/matras \p{M}), spaces, apostrophes, and hyphens.
 */
const UNICODE_NAME_REGEX = /^[\p{L}\p{M}\s'-]+$/u;
const CONTAINS_DIGIT_REGEX = /\d/u;
const CONTAINS_LETTER_REGEX = /\p{L}/u;

/**
 * Permissive postal code fallback regex for countries not indexed in validator.isPostalCode.
 * Allows 2-12 alphanumeric characters, spaces, and hyphens.
 */
const PERMISSIVE_POSTAL_REGEX = /^[A-Za-z0-9\s-]{2,12}$/;

/**
 * List of locales supported by validator.isPostalCode (all in uppercase).
 */
const VALIDATOR_POSTAL_LOCALES = new Set([
  'AD', 'AT', 'AU', 'AZ', 'BA', 'BE', 'BG', 'BR', 'BY', 'CA', 'CH', 'CN', 'CZ', 'DE',
  'DK', 'DO', 'DZ', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HT', 'HU', 'ID', 'IE',
  'IL', 'IN', 'IR', 'IS', 'IT', 'JP', 'KE', 'KR', 'LI', 'LT', 'LU', 'LV', 'MG', 'MT',
  'MX', 'MY', 'NL', 'NO', 'NP', 'NZ', 'PL', 'PR', 'PT', 'RO', 'RU', 'SA', 'SE', 'SG',
  'SI', 'SK', 'TH', 'TN', 'TW', 'UA', 'US', 'ZA', 'ZM'
]);

/**
 * Validates a postal code against country-specific rules or fallback.
 */
function validatePostalCodeForCountry(code, countryCode) {
  if (!code) return true; // Optional field
  const trimmedCode = code.trim();
  if (trimmedCode === '') return true;

  const upperCountry = countryCode ? countryCode.toUpperCase() : '';

  // If validator directly supports this country locale, use its strict pattern
  if (VALIDATOR_POSTAL_LOCALES.has(upperCountry)) {
    return validator.isPostalCode(trimmedCode, upperCountry);
  }

  // Otherwise, use a safe permissive fallback so legitimate international users aren't locked out
  return PERMISSIVE_POSTAL_REGEX.test(trimmedCode);
}

/**
 * Backend Zod validation schema for POST /api/personal-info.
 */
export const personalInfoSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required.' })
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, { message: 'Full name is required.' })
    .refine((val) => !CONTAINS_DIGIT_REGEX.test(val), { message: 'Name cannot contain numbers.' })
    .refine((val) => CONTAINS_LETTER_REGEX.test(val), { message: 'Please enter a valid name.' })
    .refine((val) => UNICODE_NAME_REGEX.test(val), { message: 'Please enter a valid name.' })
    .refine((val) => val.length >= 2 && val.length <= 100, {
      message: 'Name must be between 2 and 100 characters.'
    }),

  email: z
    .string({ required_error: 'Email address is required.' })
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, { message: 'Email address is required.' })
    .refine((val) => validator.isEmail(val), { message: 'Enter a valid email address.' })
    .transform((val) => {
      // Normalize email domain to lowercase without mangling user-defined local part unnecessarily
      const parts = val.split('@');
      if (parts.length === 2) {
        return `${parts[0]}@${parts[1].toLowerCase()}`;
      }
      return val.toLowerCase();
    }),

  countryCode: z
    .string({ required_error: 'Country of residence is required.' })
    .transform((val) => val.trim().toUpperCase())
    .refine((val) => /^[A-Z]{2}$/.test(val), { message: 'Select a valid country.' }),

  mobileNumber: z
    .string({ required_error: 'Mobile number is required.' })
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, { message: 'Mobile number is required.' }),

  dateOfBirth: z
    .string({ required_error: 'Date of birth is required.' })
    .transform((val) => val.trim())
    .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), { message: 'Enter a valid date in YYYY-MM-DD format.' })
    .refine((val) => {
      const date = new Date(val + 'T00:00:00Z');
      return !isNaN(date.getTime());
    }, { message: 'Enter a valid date.' })
    .refine((val) => {
      const birthDate = new Date(val + 'T00:00:00Z');
      const today = new Date();
      // Reset today to UTC midnight to avoid local timezone offsets falsely marking today as future
      const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      return birthDate <= todayUTC;
    }, { message: 'Date of birth cannot be in the future.' }),

  gender: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== '' ? val.trim() : null))
    .refine((val) => val === null || ['male', 'female', 'other', 'prefer_not_to_say'].includes(val), {
      message: 'Select a valid gender option.'
    }),

  city: z
    .string({ required_error: 'City/Town is required.' })
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, { message: 'City/Town is required.' })
    .refine((val) => val.length >= 2 && val.length <= 100, {
      message: 'City must be between 2 and 100 characters.'
    }),

  postalCode: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== '' ? val.trim() : null)),

  preferredLanguage: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val && val.trim() !== '' ? val.trim().toLowerCase() : null))
    .refine((val) => val === null || ['en', 'hi', 'fr', 'es', 'ar'].includes(val), {
      message: 'Select a valid preferred language.'
    })
}).superRefine((data, ctx) => {
  // Cross-field validation: Validate phone number against selected countryCode
  const phoneResult = validateAndNormalizePhone(data.mobileNumber, data.countryCode);
  if (!phoneResult.isValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Enter a valid mobile number for the selected country.',
      path: ['mobileNumber']
    });
  } else {
    // Attach normalized E.164 phone number to the validated data
    data.normalizedPhone = phoneResult.normalized;
  }

  // Cross-field validation: Validate postal code if provided
  if (data.postalCode) {
    const isPostalValid = validatePostalCodeForCountry(data.postalCode, data.countryCode);
    if (!isPostalValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid postal/ZIP code for the selected country.',
        path: ['postalCode']
      });
    }
  }
});
