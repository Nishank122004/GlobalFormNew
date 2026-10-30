
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Decode Aiven's Base64 CA certificate into certificate bytes.
const caCertificate = process.env.DB_CA_CERT
  ? Buffer.from(
      process.env.DB_CA_CERT.replace(/\s/g, ''),
      'base64'
    )
  : undefined;

// Configure MySQL connection pool.
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'global_form_db',

  // Enable verified SSL for cloud database connections.
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

// Test database connectivity.
export async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();

    return { ok: true };
  } catch (error) {
    console.error('Database connection test failed:', error.message);

    return {
      ok: false,
      error: error.message
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

export default pool;
