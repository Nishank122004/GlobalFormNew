import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MySQL Connection Pool Configuration.
 * 
 * Why use a connection pool instead of a single connection?
 * 1. Performance: Reuses existing connections rather than opening and closing a new TCP socket for every query.
 * 2. Scalability: Limits maximum concurrent connections to prevent exhausting database server memory.
 * 3. Resilience: Automatically reconnects and handles broken connections gracefully.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'global_form_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

/**
 * Verifies that the database server is reachable.
 * Useful for startup health checks and reporting friendly errors.
 */
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
