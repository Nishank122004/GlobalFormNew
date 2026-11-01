import { beforeEach, describe, expect, it, vi } from 'vitest';

const { executeMock } = vi.hoisted(() => ({ executeMock: vi.fn() }));
vi.mock('../src/config/database.js', () => ({ executeDatabaseQuery: executeMock }));

import { findCsvRecordByUsername } from '../src/services/csvRecordService.js';
import { getCsvRecord } from '../src/controllers/csvRecordController.js';

const record = {
  username: 'sample_user', email: 'sample@example.com', mobile: '001234',
  city: 'Testville', postal_code: '00123'
};

function responseMock() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    set(name, value) { this.headers[name] = value; return this; }
  };
}

describe('CSV username retrieval service', () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it('performs exact parameterized indexed lookup and returns row', async () => {
    executeMock.mockResolvedValue([[record]]);
    await expect(findCsvRecordByUsername('sample_user')).resolves.toEqual(record);
    expect(executeMock).toHaveBeenCalledWith(
      'SELECT username, email, mobile, city, postal_code FROM csv_records WHERE username = ? LIMIT 1',
      ['sample_user']
    );
  });

  it('returns null when no row matches', async () => {
    executeMock.mockResolvedValue([[]]);
    await expect(findCsvRecordByUsername('unknown')).resolves.toBeNull();
  });

  it('propagates database failures', async () => {
    executeMock.mockImplementation(async () => { throw new Error('db unavailable'); });
    let caught;
    try {
      await findCsvRecordByUsername('sample_user');
    } catch (error) {
      caught = error;
    }
    expect(executeMock).toHaveBeenCalledOnce();
    expect(caught).toBeInstanceOf(Error);
    expect(caught.message).toBe('db unavailable');
  });
});

describe('CSV username retrieval controller', () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  it('trims whitespace and returns exactly five CSV fields (case-insensitive lookup is collation-backed)', async () => {
    executeMock.mockResolvedValue([[record]]);
    const req = { params: { username: '  SAMPLE_USER  ' } };
    const res = responseMock();
    const next = vi.fn();
    await getCsvRecord(req, res, next);

    expect(executeMock.mock.calls[0][1]).toEqual(['SAMPLE_USER']);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Record retrieved successfully.', data: record });
    expect(Object.keys(res.body.data).sort()).toEqual(['city', 'email', 'mobile', 'postal_code', 'username']);
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 for unknown username', async () => {
    executeMock.mockResolvedValue([[]]);
    const res = responseMock();
    await getCsvRecord({ params: { username: 'unknown' } }, res, vi.fn());
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, message: 'No matching record found.' });
  });

  it.each(['', '   ', 'bad/name', 'x'.repeat(65)])('rejects invalid username %j before querying', async (username) => {
    const res = responseMock();
    await getCsvRecord({ params: { username } }, res, vi.fn());
    expect(res.statusCode).toBe(400);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('forwards database errors without returning records', async () => {
    executeMock.mockImplementation(async () => { throw new Error('internal db detail'); });
    const res = responseMock();
    const next = vi.fn();
    await getCsvRecord({ params: { username: 'sample_user' } }, res, next);
    expect(executeMock).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(next.mock.calls[0][0].message).toBe('internal db detail');
    expect(res.body).toBeUndefined();
  });
});
