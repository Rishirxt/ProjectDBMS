import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Resolve the backend configuration relative to this file so `node server/server.js`
// works from the repository root as well as `npm run dev` from server/.
dotenv.config({ path: fileURLToPath(new URL('./.env', import.meta.url)) });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is missing. Set it in server/.env.');
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

pool.on('error', (error) => {
  console.error('[database] Idle PostgreSQL connection error:', error.message);
});
