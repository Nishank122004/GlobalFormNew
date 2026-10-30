import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import * as formService from '../src/services/formService.js';

describe('POST /api/personal-info', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const validPayload = {
    fullName: 'Maria Garcia-Hernandez',
    email: 'maria.garcia@example.com',
    countryCode: 'ES',
    mobileNumber: '+34612345678',
    dateOfBirth: '1995-05-15',
    gender: 'female',
    city: 'Madrid',
    postalCode: '28001',
    preferredLanguage: 'es'
  };

  it('should successfully validate and insert a new valid submission (201)', async () => {
    vi.spyOn(formService, 'findDuplicateRecord').mockResolvedValueOnce(false);
    vi.spyOn(formService, 'savePersonalInfo').mockResolvedValueOnce({
      id: 101,
      fullName: validPayload.fullName,
      email: validPayload.email,
      countryCode: validPayload.countryCode,
      mobileNumber: '+34612345678',
      createdAt: new Date().toISOString()
    });

    const res = await request(app)
      .post('/api/personal-info')
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(101);
    expect(formService.findDuplicateRecord).toHaveBeenCalledTimes(1);
    expect(formService.savePersonalInfo).toHaveBeenCalledTimes(1);
  });

  it('should return 409 Conflict when submitting an exact duplicate record', async () => {
    // Simulate that the record already exists in the database
    vi.spyOn(formService, 'findDuplicateRecord').mockResolvedValueOnce(true);
    const saveSpy = vi.spyOn(formService, 'savePersonalInfo');

    const res = await request(app)
      .post('/api/personal-info')
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('DUPLICATE_USER');
    expect(res.body.message).toBe('User already exists. This information has already been submitted.');
    // Ensure no insert query was made!
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('should allow records that share the same email but differ in remaining fields', async () => {
    // When fields differ, findDuplicateRecord returns false
    vi.spyOn(formService, 'findDuplicateRecord').mockResolvedValueOnce(false);
    vi.spyOn(formService, 'savePersonalInfo').mockResolvedValueOnce({
      id: 104,
      fullName: 'Carlos Garcia', // different name
      email: validPayload.email,
      countryCode: 'ES',
      mobileNumber: '+34699999999'
    });

    const res = await request(app)
      .post('/api/personal-info')
      .send({
        ...validPayload,
        fullName: 'Carlos Garcia',
        mobileNumber: '+34699999999'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should allow records that share the same full name but differ in other fields', async () => {
    vi.spyOn(formService, 'findDuplicateRecord').mockResolvedValueOnce(false);
    vi.spyOn(formService, 'savePersonalInfo').mockResolvedValueOnce({
      id: 105,
      fullName: validPayload.fullName,
      email: 'maria.different@example.com'
    });

    const res = await request(app)
      .post('/api/personal-info')
      .send({
        ...validPayload,
        email: 'maria.different@example.com'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should handle concurrent duplicate submissions via ER_DUP_ENTRY unique constraint', async () => {
    // Simulate pre-insert check passed concurrently, but database UNIQUE constraint blocked duplicate
    vi.spyOn(formService, 'findDuplicateRecord').mockResolvedValueOnce(false);
    const dupError = new Error('Duplicate entry');
    dupError.code = 'ER_DUP_ENTRY';
    vi.spyOn(formService, 'savePersonalInfo').mockRejectedValueOnce(dupError);

    const res = await request(app)
      .post('/api/personal-info')
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('DUPLICATE_USER');
    expect(res.body.message).toBe('User already exists. This information has already been submitted.');
  });

  it('should support international Unicode names (e.g. Hindi, Arabic)', async () => {
    vi.spyOn(formService, 'findDuplicateRecord').mockResolvedValueOnce(false);
    vi.spyOn(formService, 'savePersonalInfo').mockResolvedValueOnce({
      id: 102,
      fullName: 'राहुल शर्मा',
      email: 'rahul@example.com'
    });

    const res = await request(app)
      .post('/api/personal-info')
      .send({
        fullName: 'राहुल शर्मा',
        email: 'rahul@example.com',
        countryCode: 'IN',
        mobileNumber: '+919876543210',
        dateOfBirth: '1998-08-10',
        city: 'नई दिल्ली',
        postalCode: '110001'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should reject a name containing numbers', async () => {
    const res = await request(app)
      .post('/api/personal-info')
      .send({
        ...validPayload,
        fullName: 'John123 Doe'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.fullName).toBe('Name cannot contain numbers.');
  });

  it('should reject an invalid email address', async () => {
    const invalidEmails = ['abc', 'abc@', 'abc@gmail', 'abc@@gmail.com'];

    for (const email of invalidEmails) {
      const res = await request(app)
        .post('/api/personal-info')
        .send({
          ...validPayload,
          email
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.email).toBe('Enter a valid email address.');
    }
  });

  it('should reject a date of birth in the future', async () => {
    const res = await request(app)
      .post('/api/personal-info')
      .send({
        ...validPayload,
        dateOfBirth: '2099-01-01'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.dateOfBirth).toBe('Date of birth cannot be in the future.');
  });

  it('should reject an invalid phone number for the selected country', async () => {
    const res = await request(app)
      .post('/api/personal-info')
      .send({
        ...validPayload,
        countryCode: 'US',
        mobileNumber: '123' // impossible US number
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.mobileNumber).toBe('Enter a valid mobile number for the selected country.');
  });

  it('should reject an invalid postal code for a supported country', async () => {
    const res = await request(app)
      .post('/api/personal-info')
      .send({
        ...validPayload,
        countryCode: 'US',
        postalCode: 'INVALID_ZIP_CODE'
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.postalCode).toBe('Enter a valid postal/ZIP code for the selected country.');
  });

  it('should accept blank/null optional fields (gender, postalCode, preferredLanguage)', async () => {
    vi.spyOn(formService, 'findDuplicateRecord').mockResolvedValueOnce(false);
    vi.spyOn(formService, 'savePersonalInfo').mockResolvedValueOnce({
      id: 103,
      fullName: 'Jane Doe',
      gender: null,
      postalCode: null,
      preferredLanguage: null
    });

    const res = await request(app)
      .post('/api/personal-info')
      .send({
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        countryCode: 'US',
        mobileNumber: '+14155552671',
        dateOfBirth: '1992-04-20',
        city: 'San Francisco',
        gender: '',
        postalCode: '',
        preferredLanguage: ''
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 for malformed JSON payloads', async () => {
    const res = await request(app)
      .post('/api/personal-info')
      .set('Content-Type', 'application/json')
      .send('{ "fullName": "Test", malformed json');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Malformed JSON');
  });

  it('should return 503 if the database is unavailable during duplicate check', async () => {
    const dbError = new Error('Connection refused');
    dbError.code = 'ECONNREFUSED';
    vi.spyOn(formService, 'findDuplicateRecord').mockRejectedValueOnce(dbError);

    const res = await request(app)
      .post('/api/personal-info')
      .send(validPayload);

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('database service is temporarily unavailable');
  });
});
