import pg from 'pg';
import fs from 'fs';
import 'dotenv/config';

const adminUrl = process.env.POSTGRES_ADMIN_URL || 'postgresql://postgres:rishi@localhost:5432/postgres';
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:rishi@localhost:5432/college_hospital';
const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname=$1', ['college_hospital']);
if (!exists.rowCount) await admin.query('CREATE DATABASE college_hospital');
await admin.end();

const db = new pg.Client({ connectionString: databaseUrl });
await db.connect();
const tables = await db.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema='public'");
if (tables.rows[0].count === 0) {
  await db.query(fs.readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf8'));
  await db.query(fs.readFileSync(new URL('../database/seed.sql', import.meta.url), 'utf8'));
  console.log('Database created and seeded.');
} else {
  console.log('Database already contains the required hospital-management tables.');
}
await db.query(fs.readFileSync(new URL('../database/features.sql', import.meta.url), 'utf8'));
console.log('Feature tables and student blocks are ready.');
const departments = await db.query('SELECT count(*)::int AS count FROM departments');
console.log(`Departments: ${departments.rows[0].count}`);
await db.end();
