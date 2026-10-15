import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const doctors = [
  ['DOC1001', 'Dr. Maya Sharma', 'maya.sharma@college.demo', 'DOC-101', 'General Medicine', 'General Physician', 'MBBS, MD', 9, '09:00', '13:00'],
  ['DOC1002', 'Dr. Vikram Nair', 'vikram.nair@college.demo', 'DOC-102', 'ENT', 'Otolaryngology', 'MBBS, MS (ENT)', 7, '10:00', '14:00'],
  ['DOC1003', 'Dr. Priya Menon', 'priya.menon@college.demo', 'DOC-103', 'Dental', 'Dental Surgery', 'BDS, MDS', 8, '09:00', '13:00'],
  ['DOC1004', 'Dr. Karan Mehta', 'karan.mehta@college.demo', 'DOC-104', 'Orthopedics', 'Sports Medicine', 'MBBS, MS Ortho', 10, '14:00', '18:00'],
  ['DOC1005', 'Dr. Anjali Rao', 'anjali.rao@college.demo', 'DOC-105', 'Dermatology', 'Clinical Dermatology', 'MBBS, MD Dermatology', 6, '10:00', '15:00'],
  ['DOC1006', 'Dr. Neha Kapoor', 'neha.kapoor@college.demo', 'DOC-106', 'Ophthalmology', 'Ophthalmology', 'MBBS, MS Ophthalmology', 8, '09:00', '13:00'],
  ['DOC1007', 'Dr. Rohan Das', 'rohan.das@college.demo', 'DOC-107', 'Cardiology', 'Preventive Cardiology', 'MBBS, MD Medicine', 11, '11:00', '16:00'],
  ['DOC1008', 'Dr. Sana Ali', 'sana.ali@college.demo', 'DOC-108', 'Emergency', 'Emergency Medicine', 'MBBS, MEM', 5, '08:00', '14:00'],
];

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const passwordHash = await bcrypt.hash('Doctor@123', 10);
const client = await pool.connect();

try {
  await client.query('BEGIN');
  for (const [username, fullName, email, employeeId, department, specialization, qualification, experience, startTime, endTime] of doctors) {
    const departmentResult = await client.query('SELECT id FROM departments WHERE name = $1', [department]);
    if (!departmentResult.rowCount) throw new Error(`Missing department: ${department}`);
    const userResult = await client.query(`INSERT INTO users (username, password_hash, full_name, email, role) VALUES ($1, $2, $3, $4, 'staff') ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, role = 'staff', is_active = true RETURNING id`, [username, passwordHash, fullName, email]);
    const doctorResult = await client.query(`INSERT INTO doctors (user_id, employee_id, department_id, specialization, qualification, experience) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (employee_id) DO UPDATE SET user_id = EXCLUDED.user_id, department_id = EXCLUDED.department_id, specialization = EXCLUDED.specialization, qualification = EXCLUDED.qualification, experience = EXCLUDED.experience RETURNING id`, [userResult.rows[0].id, employeeId, departmentResult.rows[0].id, specialization, qualification, experience]);
    for (const day of weekdays) await client.query(`INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time) VALUES ($1, $2, $3, $4) ON CONFLICT (doctor_id, day_of_week, start_time, end_time) DO NOTHING`, [doctorResult.rows[0].id, day, startTime, endTime]);
  }
  await client.query('COMMIT');
  console.log(`Seeded ${doctors.length} fictional doctors with Monday–Friday availability.`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
