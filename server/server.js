import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import "dotenv/config";
import { pool } from "./db.js";
import { authenticateToken, authorizeRoles } from "./auth.js";
const app = express(),
  usernameRegex = /^[0-9]{2}[A-Z]{3}[0-9]{4}$/,
  gmailRegex = /^[A-Z0-9._%+-]+@gmail\.com$/i,
  phoneRegex = /^\d{10}$/;

// Express 4 does not forward rejected async route handlers to error middleware.
// Wrap async handlers at registration time so database failures get a response.
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
  const register = app[method].bind(app);
  app[method] = (...args) => register(...args.map((handler) =>
    Array.isArray(handler)
      ? handler.map((item) => item?.constructor?.name === 'AsyncFunction' ? asyncRoute(item) : item)
      : handler?.constructor?.name === 'AsyncFunction' ? asyncRoute(handler) : handler,
  ));
}
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());
const userFields =
  "u.id,u.username,u.full_name,u.email,u.phone,u.role,u.created_at";
app.get("/", (_, res) => res.json({ status: "ok", service: "college-hospital-api" }));
app.get("/api/health", (_, res) => res.json({ status: "ok" }));
app.post("/api/auth/signup", async (req, res) => {
  try {
    let {
      username,
      fullName,
      email,
      password,
      phone,
      patientType,
      department,
      dateOfBirth,
      gender,
      address,
      emergencyContact,
      block,
      academicYear,
    } = req.body;
    username = username?.trim().toUpperCase();
    email = email?.trim().toLowerCase();
    phone = phone?.trim();
    console.log("[AUTH SIGNUP]", { username, email, block, academicYear });
    if (!usernameRegex.test(username))
      return res
        .status(400)
        .json({ message: "Username must match 24BAI1278 format." });
    if (
      !fullName || !block || !['Block A','Block B','Block D','Block E','Block F'].includes(block) || ![1,2,3,4,5].includes(Number(academicYear)) ||
      !email ||
      !password ||
      patientType !== "student"
    )
      return res
        .status(400)
        .json({ message: "Please complete all required fields." });
    if (!gmailRegex.test(email))
      return res.status(400).json({ message: "Use a valid Gmail address ending in @gmail.com." });
    if (!phoneRegex.test(phone))
      return res.status(400).json({ message: "Phone number must contain exactly 10 digits." });
    const hash = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const u = await client.query(
        "INSERT INTO users(username,password_hash,full_name,email,phone,role) VALUES($1,$2,$3,$4,$5,'student') RETURNING id,username,full_name,email,phone,role",
        [username, hash, fullName, email, phone],
      );
      await client.query(
        "INSERT INTO patients(user_id,patient_type,college_department,date_of_birth,gender,address,emergency_contact,block_id,academic_year) VALUES($1,$2,$3,$4,$5,$6,$7,(SELECT id FROM student_blocks WHERE name=$8),$9)",
        [u.rows[0].id, patientType, department || null, dateOfBirth || null, gender || null, address || null, emergencyContact || null, block, Number(academicYear)],
      );
      await client.query("COMMIT");
      res.status(201).json({ user: u.rows[0] });
    } catch (e) {
      await client.query("ROLLBACK");
      if (e.code === "23505") {
        const detail = e.detail || "";
        const constraint = e.constraint || "";
        if (constraint.includes("username") || detail.includes("username") || detail.includes("Key (username)")) {
          return res
            .status(409)
            .json({ message: `College registration number '${username}' is already registered. Please login instead or use your registration number.` });
        }
        if (constraint.includes("email") || detail.includes("email") || detail.includes("Key (email)")) {
          return res
            .status(409)
            .json({ message: `Email address '${email}' is already registered. Please use another email or login.` });
        }
        return res
          .status(409)
          .json({ message: "Username or email already exists." });
      }
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Could not create account." });
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const q = await pool.query(
      "SELECT u.*,sb.name block,p.academic_year,p.college_department FROM users u LEFT JOIN patients p ON p.user_id=u.id LEFT JOIN student_blocks sb ON sb.id=p.block_id WHERE u.username=$1 AND u.is_active=true",
      [username?.trim().toUpperCase()],
    );
    if (
      !q.rowCount ||
      !(await bcrypt.compare(password, q.rows[0].password_hash))
    )
      return res
        .status(401)
        .json({ message: "Invalid VIT registration number or password" });
    const u = q.rows[0],
      token = jwt.sign(
        { id: u.id, role: u.role, username: u.username },
        process.env.JWT_SECRET,
        { expiresIn: "8h" },
      );
    res.json({
      token,
      user: {
        id: u.id,
        username: u.username,
        fullName: u.full_name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        block: u.block,
        academic_year: u.academic_year,
        college_department: u.college_department,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Login failed" });
  }
});
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  const q = await pool.query(
    `SELECT ${userFields},sb.name block,p.academic_year,p.college_department FROM users u LEFT JOIN patients p ON p.user_id=u.id LEFT JOIN student_blocks sb ON sb.id=p.block_id WHERE u.id=$1`,
    [req.user.id],
  );
  res.json({ user: { ...q.rows[0], fullName: q.rows[0].full_name } });
});
app.get("/api/departments", async (_, res) =>
  res.json((await pool.query("SELECT * FROM departments ORDER BY name")).rows),
);
app.get("/api/student-blocks", async (_, res) =>
  res.json((await pool.query("SELECT * FROM student_blocks ORDER BY name")).rows),
);
app.get(
  "/api/patients",
  authenticateToken,
  authorizeRoles("admin", "staff"),
  async (req, res) => {
    const s = "%" + (req.query.search || "") + "%";
    res.json(
      (
        await pool.query(
          `SELECT p.*,u.username,u.full_name,u.email,u.phone,sb.name block FROM patients p JOIN users u ON u.id=p.user_id LEFT JOIN student_blocks sb ON sb.id=p.block_id WHERE u.username ILIKE $1 OR u.full_name ILIKE $1 OR u.email ILIKE $1 OR p.patient_type::text ILIKE $1 ORDER BY u.full_name`,
          [s],
        )
      ).rows,
    );
  },
);
app.get("/api/patients/:id", authenticateToken, async (req, res) => {
  const own = await pool.query(
    "SELECT p.*,u.username,u.full_name,u.email,u.phone,sb.name block FROM patients p JOIN users u ON u.id=p.user_id LEFT JOIN student_blocks sb ON sb.id=p.block_id WHERE p.id=$1",
    [req.params.id],
  );
  if (!own.rowCount)
    return res.status(404).json({ message: "Patient not found" });
  if (req.user.role === "student" && own.rows[0].user_id !== req.user.id)
    return res.status(403).json({ message: "Insufficient permissions" });
  res.json(own.rows[0]);
});
app.put("/api/patients/:id", authenticateToken, async (req, res) => {
  const q = await pool.query("SELECT user_id FROM patients WHERE id=$1", [
    req.params.id,
  ]);
  if (!q.rowCount)
    return res.status(404).json({ message: "Patient not found" });
  if (!['admin', 'staff'].includes(req.user.role) && q.rows[0].user_id !== req.user.id)
    return res.status(403).json({ message: "Insufficient permissions" });
  const b = req.body;
  let blockIdClause = '';
  const params = [b.dateOfBirth, b.gender, b.address, b.emergencyContact, req.params.id];
  if (b.block) {
    const sb = await pool.query("SELECT id FROM student_blocks WHERE name=$1", [b.block]);
    if (sb.rowCount) {
      params.push(sb.rows[0].id);
      blockIdClause = `, block_id=$${params.length}`;
    }
  }
  if (b.academicYear) {
    params.push(Number(b.academicYear));
    blockIdClause += `, academic_year=$${params.length}`;
  }
  const r = await pool.query(
    `UPDATE patients SET date_of_birth=COALESCE($1,date_of_birth),gender=COALESCE($2,gender),address=COALESCE($3,address),emergency_contact=COALESCE($4,emergency_contact)${blockIdClause} WHERE id=$5 RETURNING *`,
    params,
  );
  res.json(r.rows[0]);
});
app.delete(
  "/api/patients/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    await pool.query(
      "UPDATE users SET is_active=false WHERE id=(SELECT user_id FROM patients WHERE id=$1)",
      [req.params.id],
    );
    res.status(204).end();
  },
);
app.post(
  "/api/departments",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const q = await pool.query(
      "INSERT INTO departments(name,description) VALUES($1,$2) RETURNING *",
      [req.body.name, req.body.description],
    );
    res.status(201).json(q.rows[0]);
  },
);
app.put(
  "/api/departments/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const q = await pool.query(
      "UPDATE departments SET name=$1,description=$2 WHERE id=$3 RETURNING *",
      [req.body.name, req.body.description, req.params.id],
    );
    res.json(q.rows[0]);
  },
);
app.delete(
  "/api/departments/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    await pool.query("DELETE FROM departments WHERE id=$1", [req.params.id]);
    res.status(204).end();
  },
);
app.get("/api/doctors", authenticateToken, async (req, res) => {
  const { department, search, specialization } = req.query;
  // Keep account identifiers and contact details out of student doctor listings.
  let sql = `SELECT d.id,d.department_id,d.specialization,d.qualification,d.experience,u.full_name,dp.name department FROM doctors d JOIN users u ON u.id=d.user_id JOIN departments dp ON dp.id=d.department_id WHERE u.is_active=true`,
    p = [];
  if (department) {
    p.push(department);
    sql += ` AND d.department_id=$${p.length}`;
  }
  if (search) {
    p.push("%" + search + "%");
    sql += ` AND u.full_name ILIKE $${p.length}`;
  }
  if (specialization) {
    p.push("%" + specialization + "%");
    sql += ` AND d.specialization ILIKE $${p.length}`;
  }
  res.json((await pool.query(sql + " ORDER BY u.full_name", p)).rows);
});
app.post(
  "/api/doctors",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const b = req.body;
    if (!b.username || !b.password || !b.fullName || !b.departmentId)
      return res.status(400).json({ message: "Missing doctor fields" });
    const hash = await bcrypt.hash(b.password, 10),
      c = await pool.connect();
    try {
      await c.query("BEGIN");
      const u = await c.query(
        "INSERT INTO users(username,password_hash,full_name,email,phone,role) VALUES($1,$2,$3,$4,$5,'staff') RETURNING id",
        [b.username, hash, b.fullName, b.email, b.phone],
      );
      const d = await c.query(
        "INSERT INTO doctors(user_id,employee_id,department_id,specialization,qualification,experience) VALUES($1,$2,$3,$4,$5,$6) RETURNING *",
        [
          u.rows[0].id,
          b.employeeId,
          b.departmentId,
          b.specialization,
          b.qualification,
          b.experience,
        ],
      );
      await c.query("COMMIT");
      res.status(201).json(d.rows[0]);
    } catch (e) {
      await c.query("ROLLBACK");
      res
        .status(400)
        .json({
          message:
            e.code === "23505"
              ? "Username, email, or employee ID already exists."
              : "Could not add doctor.",
        });
    } finally {
      c.release();
    }
  },
);
app.get("/api/doctors/:id", authenticateToken, async (req, res) => {
  const q = await pool.query(
    `SELECT d.id,d.department_id,d.specialization,d.qualification,d.experience,u.full_name,dp.name department FROM doctors d JOIN users u ON u.id=d.user_id JOIN departments dp ON dp.id=d.department_id WHERE d.id=$1 AND u.is_active=true`,
    [req.params.id],
  );
  if (!q.rowCount) return res.status(404).json({ message: "Doctor not found" });
  res.json(q.rows[0]);
});
app.put(
  "/api/doctors/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const b = req.body,
      q = await pool.query(
        "UPDATE doctors SET department_id=COALESCE($1,department_id),specialization=COALESCE($2,specialization),qualification=COALESCE($3,qualification),experience=COALESCE($4,experience) WHERE id=$5 RETURNING *",
        [
          b.departmentId,
          b.specialization,
          b.qualification,
          b.experience,
          req.params.id,
        ],
      );
    if (!q.rowCount)
      return res.status(404).json({ message: "Doctor not found" });
    res.json(q.rows[0]);
  },
);
app.delete(
  "/api/doctors/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    await pool.query(
      "UPDATE users SET is_active=false WHERE id=(SELECT user_id FROM doctors WHERE id=$1)",
      [req.params.id],
    );
    res.status(204).end();
  },
);
app.get("/api/doctors/:id/availability", async (req, res) =>
  res.json(
    (
      await pool.query(
        "SELECT * FROM doctor_availability WHERE doctor_id=$1 ORDER BY day_of_week,start_time",
        [req.params.id],
      )
    ).rows,
  ),
);
app.post(
  "/api/doctors/:id/availability",
  authenticateToken,
  authorizeRoles("staff", "admin"),
  async (req, res) => {
    if (req.user.role === "staff") {
      const d = await pool.query("SELECT id FROM doctors WHERE user_id=$1", [
        req.user.id,
      ]);
      if (String(d.rows[0]?.id) !== req.params.id)
        return res
          .status(403)
          .json({ message: "You can manage only your availability." });
    }
    const { dayOfWeek, startTime, endTime } = req.body;
    const q = await pool.query(
      "INSERT INTO doctor_availability(doctor_id,day_of_week,start_time,end_time) VALUES($1,$2,$3,$4) RETURNING *",
      [req.params.id, dayOfWeek, startTime, endTime],
    );
    res.status(201).json(q.rows[0]);
  },
);
app.delete(
  "/api/availability/:id",
  authenticateToken,
  authorizeRoles("staff", "admin"),
  async (req, res) => {
    await pool.query("DELETE FROM doctor_availability WHERE id=$1", [
      req.params.id,
    ]);
    res.status(204).end();
  },
);
app.put(
  "/api/availability/:id",
  authenticateToken,
  authorizeRoles("staff", "admin"),
  async (req, res) => {
    const b = req.body,
      q = await pool.query(
        "UPDATE doctor_availability SET day_of_week=$1,start_time=$2,end_time=$3 WHERE id=$4 RETURNING *",
        [b.dayOfWeek, b.startTime, b.endTime, req.params.id],
      );
    if (!q.rowCount)
      return res.status(404).json({ message: "Availability not found" });
    res.json(q.rows[0]);
  },
);
app.get("/api/doctors/:id/slots", authenticateToken, async (req, res) => {
  const date = req.query.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || ""))
    return res.status(400).json({ message: "Valid date required" });
  const selectedDate = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastBookableDate = new Date(today);
  lastBookableDate.setDate(today.getDate() + 9);
  if (selectedDate < today || selectedDate > lastBookableDate)
    return res.status(400).json({ message: "Appointments are available only for the next 10 days." });
  const day = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][new Date(date + "T12:00:00").getDay()];
  const a = await pool.query(
    "SELECT start_time,end_time FROM doctor_availability WHERE doctor_id=$1 AND day_of_week=$2",
    [req.params.id, day],
  );
  const booked = (
    await pool.query(
    "SELECT to_char(appointment_time,'HH24:MI') time FROM appointments WHERE doctor_id=$1 AND appointment_date=$2",
      [req.params.id, date],
    )
  ).rows.map((x) => x.time);
  let slots = [];
  a.rows.forEach((x) => {
    let t = x.start_time.slice(0, 5),
      end = x.end_time.slice(0, 5);
    while (t < end) {
      if (!booked.includes(t)) slots.push(t);
      let [h, m] = t.split(":").map(Number);
      m += 30;
      if (m === 60) {
        h++;
        m = 0;
      }
      t = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  });
  res.json({ date, slots });
});
const apptSQL = `SELECT a.*,u.full_name patient_name,u.username patient_username,du.full_name doctor_name,dp.name department,p.patient_type FROM appointments a JOIN patients p ON p.id=a.patient_id JOIN users u ON u.id=p.user_id JOIN doctors d ON d.id=a.doctor_id JOIN users du ON du.id=d.user_id JOIN departments dp ON dp.id=d.department_id`;
app.get("/api/appointments", authenticateToken, async (req, res) => {
  let where = "",
    p = [];
  if (req.user.role === "student") {
    where = " WHERE p.user_id=$1";
    p = [req.user.id];
  } else {
    const filters = [];
    const add = (condition, value) => {
      if (value) {
        p.push(value);
        filters.push(condition.replace('?', `$${p.length}`));
      }
    };
    add("a.appointment_date=?", req.query.date);
    add("a.doctor_id=?", req.query.doctorId);
    add("d.department_id=?", req.query.departmentId);
    add("a.status=?", req.query.status);
    if (req.query.search) {
      p.push(`%${req.query.search}%`);
      filters.push(`(u.username ILIKE $${p.length} OR u.full_name ILIKE $${p.length} OR du.full_name ILIKE $${p.length})`);
    }
    if (filters.length) where = ` WHERE ${filters.join(' AND ')}`;
  }
  res.json(
    (
      await pool.query(
        apptSQL +
          where +
          " ORDER BY a.appointment_date DESC,a.appointment_time DESC",
        p,
      )
    ).rows,
  );
});
app.post(
  "/api/appointments",
  authenticateToken,
  authorizeRoles("student"),
  async (req, res) => {
    const { doctorId, date, time, reason } = req.body;
    try {
      const selectedDate = new Date(`${date}T00:00:00`);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastBookableDate = new Date(today);
      lastBookableDate.setDate(today.getDate() + 9);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || selectedDate < today || selectedDate > lastBookableDate)
        return res.status(400).json({ message: "Appointments are available only for the next 10 days." });
      const pat = await pool.query("SELECT id FROM patients WHERE user_id=$1", [
        req.user.id,
      ]);
      const occupied = await pool.query(
        "SELECT 1 FROM appointments WHERE doctor_id=$1 AND appointment_date=$2 AND appointment_time=$3",
        [doctorId, date, time],
      );
      if (occupied.rowCount)
        return res.status(409).json({ message: "This appointment slot is already booked. Please select another time." });
      const q = await pool.query(
        "INSERT INTO appointments(patient_id,doctor_id,appointment_date,appointment_time,reason) VALUES($1,$2,$3,$4,$5) RETURNING *",
        [pat.rows[0].id, doctorId, date, time, reason],
      );
      res.status(201).json(q.rows[0]);
    } catch (e) {
      if (e.code === "23505")
        return res
          .status(409)
          .json({ message: "This appointment slot is already booked. Please select another time." });
      res.status(400).json({ message: "Could not book appointment." });
    }
  },
);
app.put("/api/appointments/:id", authenticateToken, async (req, res) => {
  const { status } = req.body;
  let ownership =
    req.user.role === "student"
      ? " AND patient_id=(SELECT id FROM patients WHERE user_id=$3)"
      : "";
  if (req.user.role === "student" && status !== "cancelled")
    return res
      .status(403)
      .json({ message: "Patients can only cancel appointments." });
  if (!['staff', 'admin'].includes(req.user.role) && req.user.role !== 'student')
    return res.status(403).json({ message: "Insufficient permissions" });
  const q = await pool.query(
    `UPDATE appointments SET status=$1 WHERE id=$2${ownership} RETURNING *`,
    ['staff', 'admin'].includes(req.user.role)
      ? [status, req.params.id]
      : [status, req.params.id, req.user.id],
  );
  if (!q.rowCount)
    return res.status(404).json({ message: "Appointment not found" });
  res.json(q.rows[0]);
});
app.put(
  "/api/appointments/:id/reschedule",
  authenticateToken,
  authorizeRoles("staff", "admin"),
  async (req, res) => {
    const { date, time } = req.body;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "") || !/^\d{2}:\d{2}$/.test(time || ""))
      return res.status(400).json({ message: "A valid appointment date and time are required." });

    const [year, month, dayOfMonth] = date.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, dayOfMonth);
    if (selectedDate.getFullYear() !== year || selectedDate.getMonth() !== month - 1 || selectedDate.getDate() !== dayOfMonth)
      return res.status(400).json({ message: "A valid appointment date and time are required." });
    const [hour, minute] = time.split(":").map(Number);
    if (hour > 23 || minute > 59)
      return res.status(400).json({ message: "A valid appointment date and time are required." });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastBookableDate = new Date(today);
    lastBookableDate.setDate(today.getDate() + 9);
    if (selectedDate < today || selectedDate > lastBookableDate)
      return res.status(400).json({ message: "Appointments can only be rescheduled within the next 10 days." });

    const appointment = await pool.query(
      "SELECT doctor_id FROM appointments WHERE id=$1 AND status='scheduled'",
      [req.params.id],
    );
    if (!appointment.rowCount)
      return res.status(409).json({ message: "Only scheduled appointments can be rescheduled." });

    const day = [
      "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
    ][new Date(`${date}T12:00:00`).getDay()];
    const availability = await pool.query(
      "SELECT start_time,end_time FROM doctor_availability WHERE doctor_id=$1 AND day_of_week=$2",
      [appointment.rows[0].doctor_id, day],
    );
    const selectedMinutes = hour * 60 + minute;
    const hasSlot = availability.rows.some((window) => {
      const [startHour, startMinute] = window.start_time.slice(0, 5).split(":").map(Number);
      const [endHour, endMinute] = window.end_time.slice(0, 5).split(":").map(Number);
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;
      return selectedMinutes >= startMinutes &&
        selectedMinutes < endMinutes &&
        (selectedMinutes - startMinutes) % 30 === 0;
    });
    if (!hasSlot)
      return res.status(400).json({ message: "The selected time is outside the doctor's available slots." });

    const occupied = await pool.query(
      "SELECT 1 FROM appointments WHERE doctor_id=$1 AND appointment_date=$2 AND appointment_time=$3 AND id<>$4",
      [appointment.rows[0].doctor_id, date, time, req.params.id],
    );
    if (occupied.rowCount)
      return res.status(409).json({ message: "That appointment slot is already booked." });

    try {
      const updated = await pool.query(
        "UPDATE appointments SET appointment_date=$1,appointment_time=$2,rescheduled_at=NOW() WHERE id=$3 AND status='scheduled' RETURNING *",
        [date, time, req.params.id],
      );
      if (!updated.rowCount)
        return res.status(409).json({ message: "Only scheduled appointments can be rescheduled." });
      res.json(updated.rows[0]);
    } catch (error) {
      if (error.code === "23505")
        return res.status(409).json({ message: "That appointment slot is already booked." });
      throw error;
    }
  },
);
const prescriptionSql = `SELECT pr.*, p.user_id, u.username patient_username, u.full_name patient_name,
  COALESCE(st.full_name, du.full_name, 'Hospital Staff') prescribed_by,
  a.appointment_date, a.appointment_time
  FROM prescriptions pr
  JOIN patients p ON p.id=pr.patient_id
  JOIN users u ON u.id=p.user_id
  LEFT JOIN users st ON st.id=pr.staff_id
  LEFT JOIN doctors d ON d.id=pr.doctor_id
  LEFT JOIN users du ON du.id=d.user_id
  LEFT JOIN appointments a ON a.id=pr.appointment_id`;
app.get("/api/prescriptions", authenticateToken, async (req, res) => {
  if (!['student', 'staff', 'admin'].includes(req.user.role))
    return res.status(403).json({ message: "Insufficient permissions" });
  const params = [];
  let where = '';
  if (req.user.role === 'student') {
    params.push(req.user.id);
    where = ' WHERE p.user_id=$1';
  } else if (req.query.username) {
    params.push(req.query.username.toUpperCase());
    where = ' WHERE u.username=$1';
  }
  res.json((await pool.query(`${prescriptionSql}${where} ORDER BY pr.created_at DESC`, params)).rows);
});
app.post("/api/prescriptions", authenticateToken, authorizeRoles("staff", "admin"), async (req, res) => {
  const { patientUsername, diagnosis, medicines, instructions, prescriptionNotes, appointmentId } = req.body;
  if (!patientUsername || !diagnosis || !medicines)
    return res.status(400).json({ message: 'Student username, diagnosis, and medicines are required.' });
  const patient = await pool.query(`SELECT p.id FROM patients p JOIN users u ON u.id=p.user_id WHERE u.username=$1`, [patientUsername.trim().toUpperCase()]);
  if (!patient.rowCount) return res.status(404).json({ message: 'Student not found.' });
  if (appointmentId) {
    const appointment = await pool.query('SELECT 1 FROM appointments WHERE id=$1 AND patient_id=$2', [appointmentId, patient.rows[0].id]);
    if (!appointment.rowCount) return res.status(400).json({ message: 'Appointment does not belong to this student.' });
  }
  const doctor = await pool.query('SELECT id FROM doctors WHERE user_id=$1', [req.user.id]);
  const q = await pool.query(`INSERT INTO prescriptions(appointment_id,doctor_id,staff_id,patient_id,diagnosis,medicines,instructions,prescription_notes)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [appointmentId || null, doctor.rows[0]?.id || null, req.user.id, patient.rows[0].id, diagnosis, medicines, instructions || null, prescriptionNotes || null]);
  res.status(201).json(q.rows[0]);
});
app.get("/api/notices", authenticateToken, async (_, res) =>
  res.json(
    (
      await pool.query(
        "SELECT n.*,u.full_name author FROM notices n JOIN users u ON u.id=n.created_by ORDER BY n.created_at DESC",
      )
    ).rows,
  ),
);
app.post(
  "/api/notices",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const q = await pool.query(
      "INSERT INTO notices(title,description,created_by) VALUES($1,$2,$3) RETURNING *",
      [req.body.title, req.body.description, req.user.id],
    );
    res.status(201).json(q.rows[0]);
  },
);
app.put(
  "/api/notices/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const q = await pool.query(
      "UPDATE notices SET title=$1,description=$2 WHERE id=$3 RETURNING *",
      [req.body.title, req.body.description, req.params.id],
    );
    if (!q.rowCount)
      return res.status(404).json({ message: "Notice not found" });
    res.json(q.rows[0]);
  },
);
app.delete(
  "/api/notices/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    await pool.query("DELETE FROM notices WHERE id=$1", [req.params.id]);
    res.status(204).end();
  },
);
app.get(
  "/api/reports",
  authenticateToken,
  authorizeRoles("admin"),
  async (_, res) => {
    const [counts, byDept] = await Promise.all([
      pool.query(
        'SELECT (SELECT count(*) FROM patients) patients,(SELECT count(*) FROM doctors) doctors,(SELECT count(*) FROM departments) departments,(SELECT count(*) FROM appointments WHERE appointment_date=CURRENT_DATE) today,(SELECT count(*) FROM appointments WHERE appointment_date>=date_trunc(\'week\',CURRENT_DATE)) week,(SELECT count(*) FROM appointments WHERE appointment_date>=date_trunc(\'month\',CURRENT_DATE)) "month"',
      ),
      pool.query(
        "SELECT d.name,count(a.id)::int appointments FROM departments d LEFT JOIN doctors dr ON dr.department_id=d.id LEFT JOIN appointments a ON a.doctor_id=dr.id GROUP BY d.name ORDER BY appointments DESC",
      ),
    ]);
    res.json({ summary: counts.rows[0], byDepartment: byDept.rows });
  },
);
/* Removed emergency, ambulance, warden, and health-camp API routes.
const emergencySelect = `SELECT e.*,u.full_name patient_name,u.username vit_registration_number,p.hostel_block,p.room_number,a.label ambulance_label,a.vehicle_number FROM emergency_requests e JOIN patients p ON p.id=e.patient_id JOIN users u ON u.id=p.user_id LEFT JOIN ambulances a ON a.id=e.ambulance_id`;
app.get("/api/emergencies", authenticateToken, async (req, res) => {
  let where = "",
    params = [];
  if (req.user.role === "patient") {
    where = " WHERE p.user_id=$1";
    params = [req.user.id];
  }
  res.json(
    (
      await pool.query(
        emergencySelect + where + " ORDER BY e.requested_at DESC",
        params,
      )
    ).rows,
  );
});
app.post(
  "/api/emergencies",
  authenticateToken,
  authorizeRoles("patient"),
  async (req, res) => {
    const { location, description, severity } = req.body;
    if (
      !location ||
      !description ||
      !["low", "medium", "serious", "critical"].includes(severity)
    )
      return res
        .status(400)
        .json({
          message: "Location, description and valid severity are required.",
        });
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const patient = (
        await c.query("SELECT * FROM patients WHERE user_id=$1", [req.user.id])
      ).rows[0];
      const ambulance = (
        await c.query(
          "SELECT * FROM ambulances WHERE is_available=true ORDER BY updated_at ASC LIMIT 1 FOR UPDATE",
        )
      ).rows[0];
      const status = ambulance ? "assigned" : "requested";
      const e = (
        await c.query(
          "INSERT INTO emergency_requests(patient_id,location,description,severity,status,ambulance_id,assigned_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
          [
            patient.id,
            location,
            description,
            severity,
            status,
            ambulance?.id || null,
            ambulance ? new Date() : null,
          ],
        )
      ).rows[0];
      if (ambulance)
        await c.query(
          "UPDATE ambulances SET is_available=false,updated_at=NOW() WHERE id=$1",
          [ambulance.id],
        );
      if (["serious", "critical"].includes(severity) && patient.hostel_block) {
        const w = (
          await c.query(
            "SELECT * FROM wardens WHERE hostel_block=$1 AND is_active=true",
            [patient.hostel_block],
          )
        ).rows[0];
        if (w)
          await c.query(
            "INSERT INTO warden_notifications(emergency_request_id,warden_id,notified_by,message) VALUES($1,$2,$3,$4)",
            [
              e.id,
              w.id,
              req.user.id,
              `Serious student emergency: ${location}. Room ${patient.room_number || "not recorded"}. Please coordinate with medical services.`,
            ],
          );
      }
      await c.query("COMMIT");
      res.status(201).json({ ...e, ambulance_label: ambulance?.label || null });
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  },
);
app.put(
  "/api/emergencies/:id",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { status } = req.body;
    if (!["assigned", "en_route", "completed", "cancelled"].includes(status))
      return res.status(400).json({ message: "Invalid emergency status" });
    const q = await pool.query(
      "UPDATE emergency_requests SET status=$1 WHERE id=$2 RETURNING *",
      [status, req.params.id],
    );
    if (!q.rowCount)
      return res.status(404).json({ message: "Emergency not found" });
    if (["completed", "cancelled"].includes(status) && q.rows[0].ambulance_id)
      await pool.query(
        "UPDATE ambulances SET is_available=true,updated_at=NOW() WHERE id=$1",
        [q.rows[0].ambulance_id],
      );
    res.json(q.rows[0]);
  },
);
app.get(
  "/api/ambulances",
  authenticateToken,
  authorizeRoles("admin"),
  async (_, res) =>
    res.json(
      (
        await pool.query(
          "SELECT * FROM ambulances ORDER BY is_available DESC,label",
        )
      ).rows,
    ),
);
app.post(
  "/api/ambulances",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const { vehicleNumber, label, currentLocation } = req.body;
    if (!vehicleNumber || !label)
      return res
        .status(400)
        .json({ message: "Vehicle number and label are required" });
    const q = await pool.query(
      "INSERT INTO ambulances(vehicle_number,label,current_location) VALUES($1,$2,$3) RETURNING *",
      [vehicleNumber, label, currentLocation || "Medical Centre"],
    );
    res.status(201).json(q.rows[0]);
  },
);
app.get("/api/camps", authenticateToken, async (req, res) => {
  const patient =
    req.user.role === "patient"
      ? (
          await pool.query("SELECT id FROM patients WHERE user_id=$1", [
            req.user.id,
          ])
        ).rows[0]
      : null;
  const sql = `SELECT c.*,count(r.id) FILTER (WHERE r.status='registered')::int registration_count ${patient ? ",max(r.patient_id) FILTER (WHERE r.patient_id=$1 AND r.status='registered') AS registered_patient_id" : ""} FROM health_camps c LEFT JOIN health_camp_registrations r ON r.camp_id=c.id GROUP BY c.id ORDER BY c.camp_date`;
  res.json((await pool.query(sql, patient ? [patient.id] : [])).rows);
});
app.post(
  "/api/camps",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    const b = req.body;
    if (
      !b.title ||
      !b.campType ||
      !b.campDate ||
      !b.startTime ||
      !b.endTime ||
      !b.venue ||
      !b.capacity
    )
      return res.status(400).json({ message: "Complete all camp details." });
    const q = await pool.query(
      "INSERT INTO health_camps(title,camp_type,camp_date,start_time,end_time,venue,capacity,description,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      [
        b.title,
        b.campType,
        b.campDate,
        b.startTime,
        b.endTime,
        b.venue,
        b.capacity,
        b.description || null,
        req.user.id,
      ],
    );
    res.status(201).json(q.rows[0]);
  },
);
app.post(
  "/api/camps/:id/register",
  authenticateToken,
  authorizeRoles("patient"),
  async (req, res) => {
    const p = (
      await pool.query("SELECT id FROM patients WHERE user_id=$1", [
        req.user.id,
      ])
    ).rows[0];
    const q = await pool.query(
      `INSERT INTO health_camp_registrations(camp_id,patient_id) SELECT $1,$2 WHERE (SELECT count(*) FROM health_camp_registrations WHERE camp_id=$1 AND status='registered') < (SELECT capacity FROM health_camps WHERE id=$1) RETURNING *`,
      [req.params.id, p.id],
    );
    if (!q.rowCount)
      return res
        .status(409)
        .json({ message: "This camp is full or unavailable." });
    res.status(201).json(q.rows[0]);
  },
);
app.delete(
  "/api/camps/:id/register",
  authenticateToken,
  authorizeRoles("patient"),
  async (req, res) => {
    await pool.query(
      "UPDATE health_camp_registrations SET status='cancelled' WHERE camp_id=$1 AND patient_id=(SELECT id FROM patients WHERE user_id=$2)",
      [req.params.id, req.user.id],
    );
    res.status(204).end();
  },
);
*/
const code = (prefix) => `${prefix}${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2,5).toUpperCase()}`;
app.get('/api/pharmacy/medicines', authenticateToken, async (req,res) => {
  const q = (req.query.search || '').trim();
  res.json((await pool.query('SELECT id,name,description,dosage,stock,is_available FROM medicines WHERE ($1::boolean OR is_available=true) AND name ILIKE $2 ORDER BY name', [req.user.role !== 'student', `%${q}%`])).rows);
});
app.post('/api/pharmacy/medicines', authenticateToken, authorizeRoles('staff','admin'), async (req,res) => {
  const {name,description,dosage,stock=0,isAvailable=true}=req.body;
  if(!name || !Number.isInteger(Number(stock)) || Number(stock)<0) return res.status(400).json({message:'Medicine name and valid stock are required.'});
  const q=await pool.query('INSERT INTO medicines(name,description,dosage,stock,is_available) VALUES($1,$2,$3,$4,$5) ON CONFLICT(name) DO UPDATE SET description=EXCLUDED.description,dosage=EXCLUDED.dosage,stock=EXCLUDED.stock,is_available=EXCLUDED.is_available,updated_at=NOW() RETURNING *',[name.trim(),description||null,dosage||null,Number(stock),!!isAvailable]); res.status(201).json(q.rows[0]);
});
app.put('/api/pharmacy/medicines/:id', authenticateToken, authorizeRoles('staff','admin'), async (req,res) => {
  const b=req.body; const q=await pool.query('UPDATE medicines SET stock=COALESCE($1,stock),is_available=COALESCE($2,is_available),description=COALESCE($3,description),dosage=COALESCE($4,dosage),updated_at=NOW() WHERE id=$5 RETURNING *',[b.stock==null?null:Number(b.stock),b.isAvailable,b.description,b.dosage,req.params.id]); if(!q.rowCount)return res.status(404).json({message:'Medicine not found'});res.json(q.rows[0]);
});
app.get('/api/pharmacy/orders', authenticateToken, async (req,res) => {
  const own=req.user.role==='student'; const search=`%${req.query.search||''}%`;
  const q=await pool.query(`SELECT o.*,u.username patient_username,u.full_name patient_name,json_agg(json_build_object('medicine_id',i.medicine_id,'name',i.medicine_name,'quantity',i.quantity)) items FROM pharmacy_orders o JOIN patients p ON p.id=o.patient_id JOIN users u ON u.id=p.user_id JOIN pharmacy_order_items i ON i.order_id=o.id WHERE ($1::int IS NULL OR p.user_id=$1) AND ($2::text='%%' OR u.username ILIKE $2) GROUP BY o.id,u.username,u.full_name ORDER BY o.created_at DESC`,[own?req.user.id:null,own?'%%':search]);res.json(q.rows);
});
app.post('/api/pharmacy/orders', authenticateToken, authorizeRoles('student'), async(req,res)=>{
 const cart=Array.isArray(req.body.items)?req.body.items:[]; if(!cart.length||cart.length>20)return res.status(400).json({message:'Add at least one medicine.'});
 const c=await pool.connect();try{await c.query('BEGIN');const patient=(await c.query('SELECT id FROM patients WHERE user_id=$1',[req.user.id])).rows[0];const order=(await c.query("INSERT INTO pharmacy_orders(order_code,patient_id) VALUES($1,$2) RETURNING *",[code('PH'),patient.id])).rows[0];for(const line of cart){const qty=Number(line.quantity);if(!Number.isInteger(qty)||qty<1||qty>100)throw Object.assign(new Error('Quantity must be between 1 and 100.'),{status:400});const m=await c.query('SELECT * FROM medicines WHERE id=$1 AND is_available=true FOR UPDATE',[line.medicineId]);if(!m.rowCount||m.rows[0].stock<qty)throw Object.assign(new Error(`Insufficient stock for ${m.rows[0]?.name||'selected medicine'}.`),{status:409});await c.query('UPDATE medicines SET stock=stock-$1,updated_at=NOW() WHERE id=$2',[qty,m.rows[0].id]);await c.query('INSERT INTO pharmacy_order_items(order_id,medicine_id,quantity,medicine_name) VALUES($1,$2,$3,$4)',[order.id,m.rows[0].id,qty,m.rows[0].name]);}await c.query('COMMIT');res.status(201).json(order);}catch(e){await c.query('ROLLBACK');res.status(e.status||400).json({message:e.message||'Could not place order.'});}finally{c.release();}
});
app.put('/api/pharmacy/orders/:id', authenticateToken, authorizeRoles('staff','admin'), async(req,res)=>{const statuses=['Pending','Confirmed','Preparing','Ready for Collection','Collected','Cancelled'];if(!statuses.includes(req.body.status))return res.status(400).json({message:'Invalid order status.'});const c=await pool.connect();try{await c.query('BEGIN');const old=await c.query('SELECT * FROM pharmacy_orders WHERE id=$1 FOR UPDATE',[req.params.id]);if(!old.rowCount){await c.query('ROLLBACK');return res.status(404).json({message:'Order not found'});}if(['Cancelled','Collected'].includes(old.rows[0].status)&&req.body.status!==old.rows[0].status){await c.query('ROLLBACK');return res.status(409).json({message:'This order is closed and cannot be changed.'});}if(req.body.status==='Cancelled'&&old.rows[0].status!=='Cancelled'){await c.query('UPDATE medicines m SET stock=m.stock+i.quantity FROM (SELECT medicine_id,SUM(quantity)::int quantity FROM pharmacy_order_items WHERE order_id=$1 GROUP BY medicine_id) i WHERE i.medicine_id=m.id',[req.params.id]);}const q=await c.query('UPDATE pharmacy_orders SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',[req.body.status,req.params.id]);await c.query('COMMIT');res.json(q.rows[0]);}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}});
app.get('/api/ambulances', authenticateToken, authorizeRoles('staff','admin'), async(_,res)=>res.json((await pool.query('SELECT * FROM ambulances ORDER BY vehicle_code')).rows));
app.post('/api/ambulances', authenticateToken, authorizeRoles('admin'), async(req,res)=>{if(!req.body.vehicleCode)return res.status(400).json({message:'Vehicle code is required.'});const q=await pool.query('INSERT INTO ambulances(vehicle_code,notes) VALUES($1,$2) RETURNING *',[req.body.vehicleCode,req.body.notes||null]);res.status(201).json(q.rows[0]);});
app.post('/api/ambulance-requests', authenticateToken, authorizeRoles('student','patient'), async(req,res,next)=>{
  try {
    const check = await pool.query('SELECT p.id, p.block_id FROM patients p WHERE p.user_id=$1', [req.user.id]);
    if (!check.rowCount) return res.status(404).json({ message: 'Student profile not found.' });
    let blockId = check.rows[0].block_id;
    if (req.body.block) {
      const bRes = await pool.query('SELECT id FROM student_blocks WHERE name=$1', [req.body.block]);
      if (bRes.rowCount) blockId = bRes.rows[0].id;
    } else if (req.body.blockId) {
      blockId = req.body.blockId;
    }
    if (!blockId) {
      const fallback = await pool.query("SELECT id FROM student_blocks ORDER BY id LIMIT 1");
      blockId = fallback.rowCount ? fallback.rows[0].id : 1;
      // Also save this back to patient profile so future requests have it
      await pool.query('UPDATE patients SET block_id=$1 WHERE id=$2', [blockId, check.rows[0].id]);
    }
    const q = await pool.query(
      'INSERT INTO ambulance_requests(request_code,patient_id,block_id) VALUES($1,$2,$3) RETURNING *',
      [code('AMB'), check.rows[0].id, blockId]
    );
    res.status(201).json(q.rows[0]);
  } catch(e) { next(e); }
});
app.get('/api/ambulance-requests', authenticateToken, async(req,res)=>{const own=['student','patient'].includes(req.user.role);const q=await pool.query(`SELECT a.*,u.username patient_username,u.full_name patient_name,COALESCE(b.name, 'Block A') block,am.vehicle_code FROM ambulance_requests a JOIN patients p ON p.id=a.patient_id JOIN users u ON u.id=p.user_id LEFT JOIN student_blocks b ON b.id=a.block_id LEFT JOIN ambulances am ON am.id=a.ambulance_id WHERE ($1::int IS NULL OR p.user_id=$1) AND NOT EXISTS (SELECT 1 FROM hospital_referrals r WHERE r.ambulance_request_id=a.id) ORDER BY a.requested_at DESC`,[own?req.user.id:null]);res.json(q.rows);});
app.put('/api/ambulance-requests/:id', authenticateToken, authorizeRoles('staff','admin'), async(req,res)=>{const states=['Requested','Assigned','Ambulance Dispatched','Arrived','Completed','Cancelled'];if(!states.includes(req.body.status))return res.status(400).json({message:'Invalid ambulance status.'});const c=await pool.connect();try{await c.query('BEGIN');const old=await c.query('SELECT ambulance_id FROM ambulance_requests WHERE id=$1 FOR UPDATE',[req.params.id]);if(!old.rowCount){await c.query('ROLLBACK');return res.status(404).json({message:'Request not found'});}const q=await c.query('UPDATE ambulance_requests SET status=$1,ambulance_id=COALESCE($2,ambulance_id),updated_at=NOW() WHERE id=$3 RETURNING *',[req.body.status,req.body.ambulanceId||null,req.params.id]);if(req.body.ambulanceId)await c.query('UPDATE ambulances SET is_available=false WHERE id=$1',[req.body.ambulanceId]);if(['Completed','Cancelled'].includes(req.body.status)&&old.rows[0].ambulance_id)await c.query('UPDATE ambulances SET is_available=true WHERE id=$1',[old.rows[0].ambulance_id]);await c.query('COMMIT');res.json(q.rows[0]);}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}});
app.get('/api/referrals/hospitals', authenticateToken, authorizeRoles('staff','admin'), async(_,res)=>res.json((await pool.query('SELECT * FROM external_hospitals WHERE is_active ORDER BY name')).rows));
app.post('/api/referrals/hospitals', authenticateToken, authorizeRoles('admin'), async(req,res)=>{if(!req.body.name)return res.status(400).json({message:'Hospital name is required.'});const q=await pool.query('INSERT INTO external_hospitals(name,address,phone) VALUES($1,$2,$3) RETURNING *',[req.body.name,req.body.address||null,req.body.phone||null]);res.status(201).json(q.rows[0]);});
app.get('/api/referrals', authenticateToken, async(req,res)=>{const own=req.user.role==='student';const q=await pool.query(`SELECT r.*,u.username patient_username,u.full_name patient_name,b.name block,h.name hospital,am.vehicle_code,ar.ambulance_id FROM hospital_referrals r JOIN patients p ON p.id=r.patient_id JOIN users u ON u.id=p.user_id LEFT JOIN student_blocks b ON b.id=p.block_id JOIN external_hospitals h ON h.id=r.hospital_id LEFT JOIN ambulance_requests ar ON ar.id=r.ambulance_request_id LEFT JOIN ambulances am ON am.id=ar.ambulance_id WHERE ($1::int IS NULL OR p.user_id=$1) ORDER BY r.created_at DESC`,[own?req.user.id:null]);res.json(q.rows);});
app.post('/api/referrals', authenticateToken, authorizeRoles('staff','admin'), async(req,res,next)=>{
  try {
    const b=req.body;
    const p=await pool.query('SELECT p.id,p.block_id FROM patients p JOIN users u ON u.id=p.user_id WHERE u.username=$1',[b.username?.trim().toUpperCase()]);
    if(!p.rowCount) return res.status(404).json({message:'Student not found.'});
    if(!b.hospitalId||!b.reason) return res.status(400).json({message:'Hospital and referral reason are required.'});
    if(b.appointmentId){
      const a=await pool.query('SELECT 1 FROM appointments WHERE id=$1 AND patient_id=$2',[b.appointmentId,p.rows[0].id]);
      if(!a.rowCount) return res.status(400).json({message:'Appointment does not belong to this student.'});
    }
    if(b.ambulanceRequired && !p.rows[0].block_id) {
      return res.status(400).json({message:'Cannot assign ambulance: this student does not have a campus block recorded in their profile.'});
    }
    const c=await pool.connect();
    try{
      await c.query('BEGIN');
      let ar=null;
      if(b.ambulanceRequired){
        ar=(await c.query("INSERT INTO ambulance_requests(request_code,patient_id,block_id) VALUES($1,$2,$3) RETURNING id",[code('AMB'),p.rows[0].id,p.rows[0].block_id])).rows[0].id;
      }
      const q=await c.query("INSERT INTO hospital_referrals(referral_code,patient_id,appointment_id,hospital_id,created_by,ambulance_required,ambulance_request_id,reason,medical_notes,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'Hospital Selected') RETURNING *",[code('REF'),p.rows[0].id,b.appointmentId||null,b.hospitalId,req.user.id,!!b.ambulanceRequired,ar,b.reason,b.medicalNotes||null]);
      await c.query('COMMIT');
      res.status(201).json(q.rows[0]);
    }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
  } catch(e) { next(e); }
});
app.put('/api/referrals/:id', authenticateToken, authorizeRoles('staff','admin'), async(req,res)=>{const states=['Referral Created','Hospital Selected','Ambulance Assigned','Patient Dispatched','Patient Referred','Completed','Cancelled'];if(!states.includes(req.body.status))return res.status(400).json({message:'Invalid referral status.'});const c=await pool.connect();try{await c.query('BEGIN');if(req.body.ambulanceId){const a=await c.query('UPDATE ambulance_requests SET ambulance_id=$1,status=\'Assigned\',updated_at=NOW() WHERE id=(SELECT ambulance_request_id FROM hospital_referrals WHERE id=$2) RETURNING id',[req.body.ambulanceId,req.params.id]);if(!a.rowCount){await c.query('ROLLBACK');return res.status(400).json({message:'This referral does not have an ambulance request.'});}await c.query('UPDATE ambulances SET is_available=false WHERE id=$1',[req.body.ambulanceId]);}const q=await c.query('UPDATE hospital_referrals SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING *',[req.body.ambulanceId?'Ambulance Assigned':req.body.status,req.params.id]);if(!q.rowCount){await c.query('ROLLBACK');return res.status(404).json({message:'Referral not found'});}await c.query('COMMIT');res.json(q.rows[0]);}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}});
app.use((err, req, res, _) => {
  console.error(`[api] ${req.method} ${req.originalUrl} failed:`, err);
  if (res.headersSent) return;
  const status = Number.isInteger(err.status) && err.status >= 400 && err.status < 500
    ? err.status
    : Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 500
      ? err.statusCode
      : 500;
  res.status(status).json({
    message: status === 500
      ? 'Unexpected server error. Check the API server log for details.'
      : err.type === 'entity.parse.failed'
        ? 'Request body must contain valid JSON.'
        : err.message,
  });
});
app.listen(process.env.PORT || 5000, () => console.log("API listening"));
