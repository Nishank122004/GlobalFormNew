import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createPoolMock, poolMock } = vi.hoisted(() => ({
  createPoolMock: vi.fn(),
  poolMock: { getConnection: vi.fn(), end: vi.fn() }
}));
vi.mock('mysql2/promise', () => ({ default: { createPool: createPoolMock } }));

let db;
let connection;

async function loadDatabaseModule() {
  vi.resetModules();
  return import('../src/config/database.js');
}

beforeEach(() => {
  vi.useRealTimers();
  createPoolMock.mockReset().mockReturnValue(poolMock);
  poolMock.getConnection.mockReset();
  poolMock.end.mockReset();
  connection = { execute: vi.fn(), release: vi.fn() };
  process.env.DB_NAME = 'pool_unit_test_db';
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.DB_NAME;
});

describe('executeDatabaseQuery with a mocked mysql pool', () => {
  it('returns query result and releases connection once', async () => {
    connection.execute.mockResolvedValue(['rows', 'fields']);
    poolMock.getConnection.mockResolvedValue(connection);
    db = await loadDatabaseModule();
    await expect(db.executeDatabaseQuery('SELECT ?', [1])).resolves.toEqual(['rows', 'fields']);
    expect(connection.execute).toHaveBeenCalledWith({ sql: 'SELECT ?', values: [1], timeout: 5000 });
    expect(connection.release).toHaveBeenCalledOnce();
    expect(createPoolMock).toHaveBeenCalledOnce();
  });

  it('releases connection once when query fails', async () => {
    poolMock.getConnection.mockResolvedValue(connection);
    connection.execute.mockRejectedValue(new Error('query failure'));
    db = await loadDatabaseModule();
    await expect(db.executeDatabaseQuery('SELECT 1')).rejects.toThrow('query failure');
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('returns acquisition timeout and releases a late-arriving connection', async () => {
    vi.useFakeTimers();
    let resolveAcquisition;
    poolMock.getConnection.mockReturnValue(new Promise((resolve) => { resolveAcquisition = resolve; }));
    db = await loadDatabaseModule();
    const query = db.executeDatabaseQuery('SELECT 1');
    const assertion = expect(query).rejects.toMatchObject({ code: 'POOL_ACQUIRE_TIMEOUT' });
    await vi.advanceTimersByTimeAsync(3000);
    await assertion;
    resolveAcquisition(connection);
    await Promise.resolve();
    expect(connection.release).toHaveBeenCalledOnce();
    expect(connection.execute).not.toHaveBeenCalled();
  });

  it('maps pool queue exhaustion to POOL_QUEUE_FULL', async () => {
    poolMock.getConnection.mockRejectedValue(new Error('Queue limit reached.'));
    db = await loadDatabaseModule();
    await expect(db.executeDatabaseQuery('SELECT 1')).rejects.toMatchObject({ code: 'POOL_QUEUE_FULL' });
  });

  it('reuses one pool for repeated queries and passes query inactivity timeout', async () => {
    poolMock.getConnection.mockResolvedValue(connection);
    connection.execute.mockResolvedValue(['ok']);
    db = await loadDatabaseModule();
    await db.executeDatabaseQuery('SELECT 1');
    await db.executeDatabaseQuery('SELECT 2');
    expect(createPoolMock).toHaveBeenCalledOnce();
    expect(poolMock.getConnection).toHaveBeenCalledTimes(2);
    expect(connection.release).toHaveBeenCalledTimes(2);
    expect(connection.execute).toHaveBeenNthCalledWith(1, { sql: 'SELECT 1', values: [], timeout: 5000 });
    expect(connection.execute).toHaveBeenNthCalledWith(2, { sql: 'SELECT 2', values: [], timeout: 5000 });
  });
});
