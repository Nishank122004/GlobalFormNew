# CSV import validation report

Generated from `sample_records_10000.csv` using the Node.js importer in dry-run mode.

| Check | Result |
|---|---:|
| Data rows | 10,000 |
| Required values missing (`username`, `email`, `mobile`) | 0 |
| Rows exceeding proposed schema lengths | 0 |
| Invalid row shapes | 0 |
| Blank city values (mapped to SQL `NULL`) | 59 |
| Blank postal code values (mapped to SQL `NULL`) | 101 |
| Duplicate usernames within file | 0 |
| Database inserts attempted | 0 |

`mobile` and `postal_code` are handled as text; leading zeroes are not parsed or normalized. Duplicate usernames already present in the target database can only be counted as skipped in explicit execution mode, using the table's unique username constraint. This report validates the local CSV only and does not assert anything about a database.
