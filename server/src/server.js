import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { testConnection } from './config/database.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  // Test MySQL connection on boot
  const dbStatus = await testConnection();
  if (dbStatus.ok) {
    console.log('✅ Connected to MySQL database successfully.');
  } else {
    console.warn(`⚠️ Warning: Database connection failed (${dbStatus.error}). The server will still start, but database operations will return 503 until MySQL is configured.`);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Global Form Backend running on http://localhost:${PORT}`);
  });
}

startServer();
