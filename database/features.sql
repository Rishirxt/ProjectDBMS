CREATE TABLE IF NOT EXISTS student_blocks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(20) UNIQUE NOT NULL CHECK (name IN ('Block A','Block B','Block D','Block E','Block F'))
);
INSERT INTO student_blocks(name) VALUES ('Block A'),('Block B'),('Block D'),('Block E'),('Block F') ON CONFLICT (name) DO NOTHING;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS block_id INTEGER REFERENCES student_blocks(id);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS academic_year SMALLINT;
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_academic_year_check;
ALTER TABLE patients ADD CONSTRAINT patients_academic_year_check CHECK (academic_year BETWEEN 1 AND 5);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS medicines (
  id SERIAL PRIMARY KEY, name VARCHAR(160) NOT NULL, description TEXT, dosage VARCHAR(120),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0), is_available BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(name)
);
CREATE TABLE IF NOT EXISTS pharmacy_orders (
  id BIGSERIAL PRIMARY KEY, order_code VARCHAR(24) UNIQUE NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id), status VARCHAR(30) NOT NULL DEFAULT 'Pending'
    CHECK(status IN ('Pending','Confirmed','Preparing','Ready for Collection','Collected','Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pharmacy_order_items (
  id BIGSERIAL PRIMARY KEY, order_id BIGINT NOT NULL REFERENCES pharmacy_orders(id) ON DELETE CASCADE,
  medicine_id INTEGER NOT NULL REFERENCES medicines(id), quantity INTEGER NOT NULL CHECK(quantity > 0),
  medicine_name VARCHAR(160) NOT NULL,
  UNIQUE(order_id,medicine_id)
);
CREATE TABLE IF NOT EXISTS ambulances (
  id SERIAL PRIMARY KEY, vehicle_code VARCHAR(30) UNIQUE NOT NULL, is_available BOOLEAN NOT NULL DEFAULT true,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS ambulance_requests (
  id BIGSERIAL PRIMARY KEY, request_code VARCHAR(24) UNIQUE NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id), block_id INTEGER NOT NULL REFERENCES student_blocks(id),
  ambulance_id INTEGER REFERENCES ambulances(id), status VARCHAR(30) NOT NULL DEFAULT 'Requested'
    CHECK(status IN ('Requested','Assigned','Ambulance Dispatched','Arrived','Completed','Cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS external_hospitals (
  id SERIAL PRIMARY KEY, name VARCHAR(180) UNIQUE NOT NULL, address TEXT, phone VARCHAR(30), is_active BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO external_hospitals(name) VALUES ('Chettinad Hospital'),('Tagore Hospital') ON CONFLICT(name) DO NOTHING;
CREATE TABLE IF NOT EXISTS hospital_referrals (
  id BIGSERIAL PRIMARY KEY, referral_code VARCHAR(24) UNIQUE NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id), appointment_id INTEGER REFERENCES appointments(id),
  hospital_id INTEGER NOT NULL REFERENCES external_hospitals(id), created_by INTEGER NOT NULL REFERENCES users(id),
  ambulance_request_id BIGINT REFERENCES ambulance_requests(id), ambulance_required BOOLEAN NOT NULL DEFAULT false,
  reason TEXT NOT NULL, medical_notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'Referral Created'
    CHECK(status IN ('Referral Created','Hospital Selected','Ambulance Assigned','Patient Dispatched','Patient Referred','Completed','Cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
