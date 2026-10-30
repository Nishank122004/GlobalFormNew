
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Read the complete PEM certificate from Render.
const caCertificate = process.env.DB_CA_CERT
  ? process.env.DB_CA_CERT.replace(/\\n/g, '\n').trim()
  : undefined;

const useSSL = process.env.DB_SSL === 'true';

if (useSSL && !caCertificate) {
  throw new Error('DB_CA_CERT is missing. Cannot establish verified SSL connection.');
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'global_form_db',

  ...(useSSL && {
    ssl: {
      ca: caCertificate,
      rejectUnauthorized: true
    }
  }),

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

export async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();
    console.log('Connected to MySQL database successfully');
    return { ok: true };
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    return { ok: false, error: error.message };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export default pool;
