import { z } from 'zod';
import validator from 'validator';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

const UNICODE_NAME_REGEX = /^[\p{L}\p{M}\s'-]+$/u;
const CONTAINS_DIGIT_REGEX = /\d/u;
const CONTAINS_LETTER_REGEX = /\p{L}/u;
const PERMISSIVE_POSTAL_REGEX = /^[A-Za-z0-9\s-]{2,12}$/;

// Set of country codes with dedicated regex in validator.isPostalCode
const VALIDATOR_POSTAL_LOCALES = new Set([
  'AD', 'AT', 'AU', 'AZ', 'BA', 'BE', 'BG', 'BR', 'BY', 'CA', 'CH', 'CN', 'CZ', 'DE',
  'DK', 'DO', 'DZ', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HT', 'HU', 'ID', 'IE',
  'IL', 'IN', 'IR', 'IS', 'IT', 'JP', 'KE', 'KR', 'LI', 'LT', 'LU', 'LV', 'MG', 'MT',
  'MX', 'MY', 'NL', 'NO', 'NP', 'NZ', 'PL', 'PR', 'PT', 'RO', 'RU', 'SA', 'SE', 'SG',
  'SI', 'SK', 'TH', 'TN', 'TW', 'UA', 'US', 'ZA', 'ZM'
]);

/**
 * Validates whether a postal code matches the format for a given country.
 */
export function validatePostalCode(code, countryCode) {
  if (!code || code.trim() === '') return true; // Optional field
  const trimmed = code.trim();
  const upperCountry = countryCode ? countryCode.toUpperCase() : '';

  if (VALIDATOR_POSTAL_LOCALES.has(upperCountry)) {
    return validator.isPostalCode(trimmed, upperCountry);
  }
  return PERMISSIVE_POSTAL_REGEX.test(trimmed);
}

/**
 * Validates whether a mobile number is valid for a given country using libphonenumber-js.
 */
export function validatePhoneNumber(phone, countryCode) {
  if (!phone || phone.trim() === '') return false;
  try {
    const parsed = parsePhoneNumberFromString(phone.trim(), countryCode ? countryCode.toUpperCase() : undefined);
    return Boolean(parsed && parsed.isValid());
  } catch {
    return false;
  }
}

/**
 * Factory that creates a localized Zod schema using the active i18next translation function.
 * @param {Function} t - i18next translation function
 */
export function createFormSchema(t) {
  return z
    .object({
      fullName: z
        .string({ required_error: t('validation.fullNameRequired') })
        .transform((val) => (val || '').trim())
        .refine((val) => val.length > 0, { message: t('validation.fullNameRequired') })
        .refine((val) => !CONTAINS_DIGIT_REGEX.test(val), { message: t('validation.fullNameNoNumbers') })
        .refine((val) => CONTAINS_LETTER_REGEX.test(val), { message: t('validation.fullNameInvalid') })
        .refine((val) => UNICODE_NAME_REGEX.test(val), { message: t('validation.fullNameInvalid') })
        .refine((val) => val.length >= 2 && val.length <= 100, {
          message: t('validation.fullNameLength')
        }),

      email: z
        .string({ required_error: t('validation.emailRequired') })
        .transform((val) => (val || '').trim())
        .refine((val) => val.length > 0, { message: t('validation.emailRequired') })
        .refine((val) => validator.isEmail(val), { message: t('validation.emailInvalid') }),

      countryCode: z
        .string({ required_error: t('validation.countryRequired') })
        .transform((val) => (val || '').trim().toUpperCase())
        .refine((val) => /^[A-Z]{2}$/.test(val), { message: t('validation.countryRequired') }),

      mobileNumber: z
        .string({ required_error: t('validation.phoneRequired') })
        .transform((val) => (val || '').trim())
        .refine((val) => val.length > 0, { message: t('validation.phoneRequired') }),

      dateOfBirth: z
        .string({ required_error: t('validation.dobRequired') })
        .transform((val) => (val || '').trim())
        .refine((val) => val.length > 0, { message: t('validation.dobRequired') })
        .refine((val) => /^\d{4}-\d{2}-\d{2}$/.test(val), { message: t('validation.dobInvalid') })
        .refine((val) => {
          const date = new Date(val + 'T00:00:00Z');
          return !isNaN(date.getTime());
        }, { message: t('validation.dobInvalid') })
        .refine((val) => {
          const birthDate = new Date(val + 'T00:00:00Z');
          const today = new Date();
          const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
          return birthDate <= todayUTC;
        }, { message: t('validation.dobFuture') }),

      gender: z
        .string()
        .optional()
        .nullable()
        .transform((val) => (val && val.trim() !== '' ? val.trim() : null)),

      city: z
        .string({ required_error: t('validation.cityRequired') })
        .transform((val) => (val || '').trim())
        .refine((val) => val.length > 0, { message: t('validation.cityRequired') })
        .refine((val) => val.length >= 2 && val.length <= 100, {
          message: t('validation.cityLength')
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
    })
    .superRefine((data, ctx) => {
      // Cross-field phone validation
      if (data.mobileNumber) {
        const isPhoneValid = validatePhoneNumber(data.mobileNumber, data.countryCode);
        if (!isPhoneValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('validation.phoneInvalid'),
            path: ['mobileNumber']
          });
        }
      }

      // Cross-field postal code validation
      if (data.postalCode) {
        const isPostalValid = validatePostalCode(data.postalCode, data.countryCode);
        if (!isPostalValid) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t('validation.postalInvalid'),
            path: ['postalCode']
          });
        }
      }
    });
}
