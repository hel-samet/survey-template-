import pg from 'pg';
import { env } from './env.js';

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: env.databaseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected idle client error:', err.message);
});

export const query = (text, params) => pool.query(text, params);

// JSONB params must be serialized explicitly, otherwise pg turns JS arrays into Postgres arrays.
export const toJson = (value) => (value === undefined ? null : JSON.stringify(value));

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
