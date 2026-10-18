# College Hospital Management System

A React, Express and PostgreSQL academic project for a **free campus medical centre**. It has no billing, payments, fees, revenue, or financial workflows.

## Features

- JWT authentication and backend-enforced student, hospital staff, and admin roles
- College username validation for public registrations: `^[0-9]{2}[A-Z]{3}[0-9]{4}$`
- Doctor directory, weekly availability, generated 30-minute slots and database-enforced double-booking prevention
- Patient appointment history, cancellation, notices and prescriptions
- Doctor consultations, appointment completion, prescriptions and availability management
- Admin departments, doctors, appointment completion and rescheduling, notices and aggregate reports
- Student campus block and study year, visible in staff student search
- Free online medicine ordering with stock reservation and collection statuses (no payment flow)
- Emergency ambulance requests with staff assignment and live status management
- External hospital referrals with staff managed referral and ambulance status

## Architecture

`React/Vite → Axios → Express REST API → PostgreSQL (pg)`

Tables include `users`, `departments`, `patients`, `student_blocks`, `doctors`, `doctor_availability`, `appointments`, `prescriptions`, `notices`, `medicines`, `pharmacy_orders`, `pharmacy_order_items`, `ambulances`, `ambulance_requests`, `external_hospitals`, and `hospital_referrals`. `database/features.sql` is an idempotent feature migration and runs as part of `npm run db:init --prefix server`, including for an existing database.

## Setup

1. Copy `server/.env.example` to `server/.env` and set `DATABASE_URL` and a secure `JWT_SECRET`.
2. Run `npm install`, `npm install --prefix server`, and `npm install --prefix client`.
3. Run `npm run db:init --prefix server` to create and seed the local `college_hospital` database (or run `database/schema.sql`, then `database/seed.sql` manually).
4. Start both apps with `npm run dev`.

The web app runs at `http://localhost:5173`; the API runs at `http://localhost:5000`.

## Demo accounts

| Role | Username | Password |
|---|---|---|
| Patient | `24BAI1278` | `Student@123` |
| Hospital staff | `STAFF0001` | `Staff@123` |
| Admin | `ADMIN0001` | `Admin@123` |

## Main API routes

- `POST /api/auth/signup`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/departments`, `POST/PUT/DELETE /api/departments/:id`
- `GET/POST /api/doctors`, `GET /api/doctors/:id/availability`
- `GET /api/doctors/:id/slots?date=YYYY-MM-DD`
- `GET/POST/PUT /api/appointments`, `PUT /api/appointments/:id/reschedule` (staff/admin)
- `GET/POST /api/prescriptions`, `GET/POST /api/notices`
- `GET /api/reports` (admin)
- `/api/pharmacy/*`, `/api/ambulance-requests`, `/api/ambulances`, `/api/referrals/*` (role checked)

## Username regex

`^` start · `[0-9]{2}` exactly two digits · `[A-Z]{3}` exactly three uppercase letters · `[0-9]{4}` exactly four digits · `$` end.
