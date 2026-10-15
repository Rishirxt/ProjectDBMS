import 'dotenv/config';
import { pool } from './db.js';

await pool.query(`
  DROP TABLE IF EXISTS warden_notifications CASCADE;
  DROP TABLE IF EXISTS emergency_requests CASCADE;
  DROP TABLE IF EXISTS ambulances CASCADE;
  DROP TABLE IF EXISTS wardens CASCADE;
  DROP TABLE IF EXISTS health_camp_registrations CASCADE;
  DROP TABLE IF EXISTS health_camps CASCADE;
  DROP TYPE IF EXISTS emergency_status;
  ALTER TABLE patients DROP COLUMN IF EXISTS vit_registration_number;
  ALTER TABLE patients DROP COLUMN IF EXISTS hostel_block;
  ALTER TABLE patients DROP COLUMN IF EXISTS room_number;
  ALTER TABLE patients DROP COLUMN IF EXISTS hostel_emergency_contact;
`);
console.log('Removed unused emergency, ambulance, warden, and health-camp data structures.');
await pool.end();
