import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const client = await pool.connect();
try {
  await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'student'");
  await client.query("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'staff'");
  await client.query('BEGIN');
  await client.query("UPDATE users SET role = 'student' WHERE role = 'patient'");
  await client.query("UPDATE users SET role = 'staff' WHERE role = 'doctor'");
  await client.query("UPDATE patients SET patient_type = 'student' WHERE patient_type::text IN ('faculty', 'staff')");
  await client.query('ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS staff_id INTEGER REFERENCES users(id)');
  await client.query('ALTER TABLE prescriptions ADD COLUMN IF NOT EXISTS prescription_notes TEXT');
  await client.query('ALTER TABLE prescriptions ALTER COLUMN appointment_id DROP NOT NULL');
  await client.query('ALTER TABLE prescriptions ALTER COLUMN doctor_id DROP NOT NULL');
  const hash = await bcrypt.hash('Staff@123', 10);
  await client.query(`INSERT INTO users (username, password_hash, full_name, email, phone, role)
    VALUES ('STAFF0001', $1, 'Nisha Patel', 'nisha.patel@college.demo', '9876500020', 'staff')
    ON CONFLICT (username) DO UPDATE SET role = 'staff', is_active = true`, [hash]);
  await client.query('COMMIT');
  console.log('Staff workflow migration completed. Demo staff: STAFF0001 / Staff@123');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
