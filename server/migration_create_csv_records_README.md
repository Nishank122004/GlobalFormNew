# `csv_records` migration

This migration creates a separate `csv_records` table in `global_form_db`. It does not alter `personal_information` and does not import CSV data.

## Schema contents

- `id`: unsigned auto-incrementing `BIGINT` primary key.
- `username`: required `VARCHAR(64)`, unique through `uq_csv_records_username`.
- `email`: required `VARCHAR(254)`.
- `mobile`: required `VARCHAR(32)` so leading zeroes remain intact.
- `city`: nullable `VARCHAR(100)`.
- `postal_code`: nullable `VARCHAR(32)` so leading zeroes remain intact.
- `created_at`: insertion timestamp, defaulting to the current time.
- `updated_at`: timestamp that automatically updates when the row changes.
- Storage: InnoDB with `utf8mb4` and `utf8mb4_unicode_ci` collation.

## Manual execution (later)

After taking the normal database backup and confirming the intended database, run manually from a MySQL client:

```sh
mysql --host=YOUR_HOST --port=YOUR_PORT --user=YOUR_USER --password global_form_db < server/migration_create_csv_records.sql
```

The client prompts for the password. Replace host, port, and user with approved connection settings; do not put credentials in this file or commit them. This command is documentation only; the migration has not been executed.

## Verify table existence (later)

```sql
SHOW TABLES LIKE 'csv_records';
SHOW CREATE TABLE csv_records;
```

Confirm that the table definition includes the primary key and unique username index. These verification queries were not run.
