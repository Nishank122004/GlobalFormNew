import './config/env.js';
import app from './app.js';
import { testConnection } from './config/database.js';

const PORT = process.env.PORT || 5000;
const SHUTDOWN_GRACE_MS = 25_000;
let shuttingDown = false;
let httpServer;

export async function startServer() {
  // Test MySQL connection on boot
  const dbStatus = await testConnection();
  if (dbStatus.ok) {
    console.log('✅ Connected to MySQL database successfully.');
  } else {
    console.warn(`⚠️ Warning: Database connection check failed (${dbStatus.error}). The server will still start; database operations may be unavailable.`);
  }

  if (shuttingDown) return null;

  httpServer = app.listen(PORT, () => {
    console.log(`🚀 Global Form Backend running on http://localhost:${PORT}`);
  });
  return httpServer;
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[SERVER] ${signal} received; stopping HTTP listener.`);

  const deadline = setTimeout(() => {
    console.warn('[SERVER] Graceful shutdown is still waiting for active requests.');
  }, SHUTDOWN_GRACE_MS);
  deadline.unref();

  try {
    if (httpServer) {
      await new Promise((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve()));
    }
    const { default: pool } = await import('./config/database.js');
    await pool.end();
    console.log('[SERVER] HTTP listener and database pool closed.');
  } catch (error) {
    console.error('[SERVER] Graceful shutdown failed:', error.name);
    process.exitCode = 1;
  } finally {
    clearTimeout(deadline);
  }
}

process.once('SIGTERM', () => { void shutdown('SIGTERM'); });
process.once('SIGINT', () => { void shutdown('SIGINT'); });

startServer().catch((error) => {
  console.error('[SERVER] Startup failed:', error.message);
  process.exitCode = 1;
});
