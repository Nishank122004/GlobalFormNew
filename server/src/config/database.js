
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const caCertificate = process.env.DB_CA_CERT
  ? `-----BEGIN CERTIFICATE-----\n${process.env.DB_CA_CERT.match(/.{1,64}/g).join('\n')}\n-----END CERTIFICATE-----`
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'global_form_db',

  ...(process.env.DB_SSL === 'true' && {
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
  try {
    const connection = await pool.getConnection();
    connection.release();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export default pool;
