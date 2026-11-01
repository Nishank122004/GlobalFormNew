
import './env.js';
import mysql from 'mysql2/promise';

// Read the complete PEM certificate from Render.
const caCertificate = process.env.DB_CA_CERT
  ? process.env.DB_CA_CERT.replace(/\\n/g, '\n').trim()
  : undefined;

const useSSL = process.env.DB_SSL === 'true';

const isProduction = process.env.NODE_ENV === 'production';
const requiredProductionSettings = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingProductionSettings = isProduction
  ? requiredProductionSettings.filter((name) => !process.env[name]?.trim())
  : [];

if (missingProductionSettings.length) {
  throw new Error(`Missing required production database settings: ${missingProductionSettings.join(', ')}.`);
}

if (isProduction && !useSSL) {
  throw new Error('DB_SSL=true is required in production.');
}

if (process.env.DB_PORT && (!/^\d+$/.test(process.env.DB_PORT) || Number(process.env.DB_PORT) < 1 || Number(process.env.DB_PORT) > 65535)) {
  throw new Error('DB_PORT must be a valid TCP port number.');
}

if (!process.env.DB_NAME) {
  throw new Error('DB_NAME is required. Set it to the intended MySQL database (defaultdb for Aiven).');
}

if (useSSL && !caCertificate) {
  throw new Error('DB_CA_CERT is missing. Cannot establish verified SSL connection.');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME,

  ...(useSSL && {
    ssl: {
      ca: caCertificate,
      rejectUnauthorized: true
    }
  }),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 20,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

const POOL_ACQUIRE_TIMEOUT_MS = 3000;
const QUERY_TIMEOUT_MS = 5000;

export class DatabasePoolError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'DatabasePoolError';
    this.code = code;
  }
}

export async function executeDatabaseQuery(sql, values = []) {
  let timer;
  let acquisitionTimedOut = false;
  const acquisition = pool.getConnection();
  const connection = await new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      acquisitionTimedOut = true;
      reject(new DatabasePoolError('Database connection acquisition timed out.', 'POOL_ACQUIRE_TIMEOUT'));
    }, POOL_ACQUIRE_TIMEOUT_MS);
    acquisition.then((conn) => {
      if (acquisitionTimedOut) conn.release();
      else { clearTimeout(timer); resolve(conn); }
    }, (error) => {
      clearTimeout(timer);
      if (error.message === 'Queue limit reached.') {
        reject(new DatabasePoolError('Database connection queue is full.', 'POOL_QUEUE_FULL'));
      } else reject(error);
    });
  });

  try {
    return await connection.execute({ sql, values, timeout: QUERY_TIMEOUT_MS });
  } finally {
    connection.release();
  }
}

export async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();
    console.log('Connected to MySQL database successfully');
    return { ok: true };
  } catch (error) {
    console.error('[DB] Startup connectivity check failed:', classifyDatabaseError(error));
    return { ok: false, error: classifyDatabaseError(error) };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export function classifyDatabaseError(error) {
  if (error.code === 'POOL_ACQUIRE_TIMEOUT') return 'pool_acquire_timeout';
  if (error.code === 'POOL_QUEUE_FULL' || error.message === 'Queue limit reached.') return 'pool_queue_full';
  if (['ECONNREFUSED', 'PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'EHOSTUNREACH'].includes(error.code)) return 'connection_unavailable';
  if (error.code === 'PROTOCOL_SEQUENCE_TIMEOUT') return 'query_timeout';
  if (['ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'].includes(error.code)) return 'database_configuration';
  return 'database_error';
}

export default pool;
