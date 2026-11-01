# CSV records importer

`importCsvRecords.js` streams `sample_records_10000.csv` (or a path supplied with `--file`), validates each row, and processes at most 250 records at a time. It uses the existing `mysql2` dependency; no new package is required.

## Dry run (default)

From the `server` directory:

```sh
node scripts/importCsvRecords.js --dry-run
```

Dry-run is the default. It reads and validates the CSV without loading a database environment file, creating a database pool, connecting to a database, or inserting anything. Output includes row totals and validation failures (up to 100 examples).

## Database import (explicit opt-in)

Only after the approved table migration has been manually applied and the target database is confirmed, run:

```sh
node scripts/importCsvRecords.js --execute --env-file .env.aiven
```

Actual import requires both `--execute` and `--env-file`. The `.env.aiven` file must contain the Aiven connection settings and verified SSL configuration, including the CA certificate. The importer requires `DB_NAME=defaultdb` and `DB_SSL=true`. Never commit `.env.aiven` or share its credentials or certificate contents. The file is explicitly loaded only for execution mode and should remain ignored by Git.

An alternate CSV file can be specified with `--file path/to/file.csv`. The script does not display environment values. Each 250-row batch is a transaction. Parameterized `INSERT IGNORE` respects the unique username constraint: duplicate usernames are counted as skipped and existing rows are not overwritten. Other batch-level database errors roll back that batch and count its rows as failed.

Empty `city` and `postal_code` values become SQL `NULL`. Username, email, mobile, and postal code remain strings; leading zeroes are preserved. Required username, email, and mobile values and schema lengths are checked before insertion.

The importer does not run the migration. It must only be run after a human confirms the intended database and the table exists. No database operation is performed by dry-run mode.
