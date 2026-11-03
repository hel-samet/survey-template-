// Usage:
//   npm run db:setup   -> applies database/schema.sql
//   npm run db:seed    -> applies schema.sql and then seed.sql
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/database.js';

const databaseDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../database');

async function run(fileName) {
  const sql = await readFile(path.join(databaseDir, fileName), 'utf8');
  await pool.query(sql);
  console.log(`[db] Applied ${fileName}`);
}

try {
  await run('schema.sql');
  if (process.argv.includes('--seed')) {
    await run('seed.sql');
  }
} catch (err) {
  console.error('[db] Setup failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
