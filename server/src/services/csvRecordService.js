import { executeDatabaseQuery } from '../config/database.js';

export async function findCsvRecordByUsername(username) {
  const [rows] = await executeDatabaseQuery(
    'SELECT username, email, mobile, city, postal_code FROM csv_records WHERE username = ? LIMIT 1',
    [username]
  );
  return rows[0] || null;
}
