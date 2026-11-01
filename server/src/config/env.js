import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

let environmentLoaded = false;

/**
 * Loads the application environment configuration.
 * Priority:
 * 1. Explicit process.env.ENV_FILE if specified (e.g. ENV_FILE=.env.aiven)
 * 2. .env.aiven if present in server directory or current working directory (full demo dataset)
 * 3. .env if present (local development database)
 * 4. Ambient environment variables (Render / production deployment)
 */
export function loadEnvironment() {
  if (environmentLoaded) return;
  environmentLoaded = true;

  const isTest = process.env.NODE_ENV === 'test';
  const cwd = process.cwd();

  // 1. Explicit ENV_FILE override
  if (process.env.ENV_FILE) {
    const customCandidates = [
      path.resolve(cwd, process.env.ENV_FILE),
      path.resolve(cwd, 'server', process.env.ENV_FILE)
    ];
    for (const candidate of customCandidates) {
      if (fs.existsSync(candidate)) {
        dotenv.config({ path: candidate });
        if (!isTest) console.log(`[ENV] Loaded environment from ${process.env.ENV_FILE}`);
        return;
      }
    }
  }

  // 2. Prefer .env.aiven if available for complete feature support (10k CSV demo records)
  const aivenCandidates = [
    path.resolve(cwd, '.env.aiven'),
    path.resolve(cwd, 'server', '.env.aiven')
  ];
  for (const candidate of aivenCandidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      if (!isTest) console.log(`[ENV] Loaded database configuration from ${path.basename(candidate)}`);
      return;
    }
  }

  // 3. Fallback to default .env
  const localCandidates = [
    path.resolve(cwd, '.env'),
    path.resolve(cwd, 'server', '.env')
  ];
  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      if (!isTest) console.log(`[ENV] Loaded database configuration from ${path.basename(candidate)}`);
      return;
    }
  }

  // 4. Default dotenv behavior for host-injected environment (e.g. Render)
  dotenv.config();
}

// Auto-execute on import to guarantee environment is populated before dependent modules read process.env
loadEnvironment();
