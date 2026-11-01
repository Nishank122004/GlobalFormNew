import { createReadStream } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultCsvPath = path.resolve(scriptDir, '../../sample_records_10000.csv');
const BATCH_SIZE = 250;
const EXPECTED_HEADERS = ['username', 'email', 'mobile', 'city', 'postal_code'];
const INSERT_SQL = `
  INSERT IGNORE INTO csv_records (username, email, mobile, city, postal_code)
  VALUES ${Array.from({ length: BATCH_SIZE }, () => '(?, ?, ?, ?, ?)').join(', ')}
`;

function parseArgs(argv) {
  let csvPath = defaultCsvPath;
  let dryRun = true;
  let executeRequested = false;
  let envFile;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') { dryRun = true; executeRequested = false; }
    else if (arg === '--execute') { dryRun = false; executeRequested = true; }
    else if (arg === '--env-file' && argv[i + 1]) envFile = argv[++i];
    else if (arg === '--file' && argv[i + 1]) csvPath = path.resolve(argv[++i]);
    else if (arg === '--help') {
      console.log('Usage: node scripts/importCsvRecords.js [--dry-run | --execute --env-file .env.aiven] [--file path]');
      process.exit(0);
    } else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  if (executeRequested && !envFile) {
    throw new Error('Execution requires both --execute and --env-file .env.aiven.');
  }
  if (!executeRequested && envFile) {
    throw new Error('--env-file can only be used together with --execute.');
  }
  return { csvPath, dryRun, executeRequested, envFile };
}

async function loadAivenEnvironment(envFile) {
  const serverRoot = path.resolve(scriptDir, '..');
  const resolvedEnvPath = path.resolve(serverRoot, envFile);
  if (resolvedEnvPath !== serverRoot && !resolvedEnvPath.startsWith(`${serverRoot}${path.sep}`)) {
    throw new Error('--env-file must resolve to a file inside the server directory.');
  }
  await access(resolvedEnvPath);
  const parsed = dotenv.parse(await readFile(resolvedEnvPath));
  const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_SSL', 'DB_CA_CERT'];
  const missing = required.filter((name) => !parsed[name]?.trim());
  if (missing.length) {
    throw new Error(`Aiven environment file is missing required settings: ${missing.join(', ')}.`);
  }
  if (parsed.DB_NAME !== 'defaultdb') {
    throw new Error('Aiven importer configuration requires DB_NAME=defaultdb.');
  }
  if (parsed.DB_SSL !== 'true') {
    throw new Error('Aiven importer configuration requires DB_SSL=true.');
  }
  // Explicit options ensure server/.env and inherited shell values cannot override this file.
  for (const name of required) process.env[name] = parsed[name];
}

function parseCsvLine(line) {
  const fields = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === ',' && !quoted) {
      fields.push(field); field = '';
    } else if (char === '"' && field === '') quoted = true;
    else field += char;
  }
  if (quoted) throw new Error('Unclosed quoted CSV field');
  fields.push(field);
  return fields;
}

function validateRecord(values, lineNumber) {
  if (values.length !== EXPECTED_HEADERS.length) {
    return { error: `Expected ${EXPECTED_HEADERS.length} fields, found ${values.length}` };
  }
  // Values stay strings throughout parsing; no numeric coercion is performed.
  const [username, email, mobile, city, postalCode] = values;
  if (!username.trim()) return { error: 'username is required' };
  if (username.length > 64) return { error: 'username exceeds VARCHAR(64)' };
  if (!email.trim()) return { error: 'email is required' };
  if (email.length > 254) return { error: 'email exceeds VARCHAR(254)' };
  if (!mobile.trim()) return { error: 'mobile is required' };
  if (mobile.length > 32) return { error: 'mobile exceeds VARCHAR(32)' };
  if (city.length > 100) return { error: 'city exceeds VARCHAR(100)' };
  if (postalCode.length > 32) return { error: 'postal_code exceeds VARCHAR(32)' };
  return {
    record: [username, email, mobile, city === '' ? null : city, postalCode === '' ? null : postalCode],
    lineNumber
  };
}

async function* readCsv(csvPath) {
  const input = readline.createInterface({ input: createReadStream(csvPath, { encoding: 'utf8' }), crlfDelay: Infinity });
  let lineNumber = 0;
  let headers;
  for await (let line of input) {
    lineNumber += 1;
    if (lineNumber === 1) line = line.replace(/^\uFEFF/, '');
    if (lineNumber === 1) {
      headers = parseCsvLine(line);
      if (headers.length !== EXPECTED_HEADERS.length || headers.some((h, i) => h !== EXPECTED_HEADERS[i])) {
        throw new Error(`Unexpected CSV headers. Expected: ${EXPECTED_HEADERS.join(', ')}`);
      }
      continue;
    }
    if (line === '') {
      yield { lineNumber, error: 'blank row' };
      continue;
    }
    const parsed = parseCsvLine(line);
    yield validateRecord(parsed, lineNumber);
  }
  if (!headers) throw new Error('CSV file is empty');
}

async function run() {
  const { csvPath, dryRun, executeRequested, envFile } = parseArgs(process.argv.slice(2));
  const report = { mode: dryRun ? 'dry-run' : 'execute', totalRows: 0, validRows: 0, inserted: 0, skipped: 0, failed: 0, errors: [] };
  let pool;
  let connection;
  let batch = [];

  async function flushBatch() {
    if (!batch.length || dryRun) { batch = []; return; }
    await connection.beginTransaction();
    try {
      const parameters = batch.flatMap((item) => item.record);
      const [result] = await connection.execute(INSERT_SQL, parameters);
      report.inserted += result.affectedRows;
      report.skipped += batch.length - result.affectedRows;
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      report.failed += batch.length;
      report.errors.push({ line: batch[0].lineNumber, error: `Batch rolled back due to database error (${error.code || error.name || 'unknown'}).` });
    }
    batch = [];
  }

  try {
    if (!dryRun) {
      if (!executeRequested) throw new Error('Database import requires --execute.');
      await loadAivenEnvironment(envFile);
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { ca: process.env.DB_CA_CERT.replace(/\\n/g, '\n').trim(), rejectUnauthorized: true },
        waitForConnections: true,
        connectionLimit: 1,
        queueLimit: 1
      });
      connection = await pool.getConnection();
    }

    for await (const row of readCsv(csvPath)) {
      report.totalRows += 1;
      if (row.error) {
        report.failed += 1;
        if (report.errors.length < 100) report.errors.push({ line: row.lineNumber, error: row.error });
        continue;
      }
      report.validRows += 1;
      if (dryRun) continue;
      batch.push(row);
      if (batch.length === BATCH_SIZE) await flushBatch();
    }
    await flushBatch();
    console.log(JSON.stringify(report, null, 2));
    if (report.failed) process.exitCode = 1;
  } finally {
    if (connection) connection.release();
    if (pool) await pool.end();
  }
}

run().catch((error) => {
  console.error(`CSV import stopped: ${error.message}`);
  process.exitCode = 1;
});
