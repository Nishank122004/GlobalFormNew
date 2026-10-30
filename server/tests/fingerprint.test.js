import { describe, it, expect } from 'vitest';
import { computeSubmissionFingerprint } from '../src/utils/fingerprint.js';

describe('computeSubmissionFingerprint - Canonical Record Fingerprinting', () => {
  const baseRecord = {
    fullName: 'Maria Garcia',
    email: 'maria@example.com',
    countryCode: 'ES',
    mobileNumber: '+34612345678',
    dateOfBirth: '1995-05-15',
    gender: 'female',
    city: 'Madrid',
    postalCode: '28001',
    preferredLanguage: 'es'
  };

  it('produces identical fingerprints for identical normalized 9-field records', () => {
    const hash1 = computeSubmissionFingerprint(baseRecord);
    const hash2 = computeSubmissionFingerprint({ ...baseRecord });

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string
  });

  it('normalizes surrounding whitespace, email domain case, and country code case', () => {
    const hash1 = computeSubmissionFingerprint(baseRecord);
    const hash2 = computeSubmissionFingerprint({
      ...baseRecord,
      fullName: '  Maria Garcia  ',
      email: 'MARIA@example.com ',
      countryCode: 'es',
      city: ' Madrid '
    });

    expect(hash1).toBe(hash2);
  });

  it('compares optional NULL values consistently (null, undefined, empty string)', () => {
    const recordNull = {
      ...baseRecord,
      gender: null,
      postalCode: null,
      preferredLanguage: null
    };

    const recordEmpty = {
      ...baseRecord,
      gender: '',
      postalCode: '  ',
      preferredLanguage: undefined
    };

    const hashNull = computeSubmissionFingerprint(recordNull);
    const hashEmpty = computeSubmissionFingerprint(recordEmpty);

    expect(hashNull).toBe(hashEmpty);
  });

  it('distinguishes two records that share the same email but differ in another field', () => {
    const recordA = { ...baseRecord, email: 'shared@example.com', fullName: 'Alice Smith' };
    const recordB = { ...baseRecord, email: 'shared@example.com', fullName: 'Bob Jones' };

    const hashA = computeSubmissionFingerprint(recordA);
    const hashB = computeSubmissionFingerprint(recordB);

    expect(hashA).not.toBe(hashB);
  });

  it('distinguishes two records that share the same name but differ in another field', () => {
    const recordA = { ...baseRecord, fullName: 'John Doe', city: 'London' };
    const recordB = { ...baseRecord, fullName: 'John Doe', city: 'Manchester' };

    const hashA = computeSubmissionFingerprint(recordA);
    const hashB = computeSubmissionFingerprint(recordB);

    expect(hashA).not.toBe(hashB);
  });

  it('supports international Unicode scripts (Hindi, Arabic)', () => {
    const recordHindi1 = {
      fullName: 'राहुल शर्मा',
      email: 'rahul@example.com',
      countryCode: 'IN',
      mobileNumber: '+919876543210',
      dateOfBirth: '1998-08-10',
      gender: null,
      city: 'नई दिल्ली',
      postalCode: '110001',
      preferredLanguage: 'hi'
    };

    const recordHindi2 = { ...recordHindi1 };
    expect(computeSubmissionFingerprint(recordHindi1)).toBe(computeSubmissionFingerprint(recordHindi2));
  });
});
