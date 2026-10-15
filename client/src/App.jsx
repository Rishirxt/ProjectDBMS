import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import api from "./services/api";
const rolePath = (r) => `/${r}/dashboard`;
const fmt = (t) =>
  new Date(`2000-01-01T${t}`).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
const dateOnly = (v) => String(v || "").slice(0, 10);
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const date = (v) => {
  const [year, month, day] = dateOnly(v).split("-").map(Number);
  return v &&
    new Date(year, month - 1, day).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
};
const isUpcoming = (appointment) =>
  appointment.status === "scheduled" && dateOnly(appointment.appointment_date) >= today();
function Guard({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center">Loading your portal…</div>;
  return user ? (
    roles.includes(user.role) ? (
      children
    ) : (
      <Navigate to={rolePath(user.role)} />
    )
  ) : (
    <Navigate to="/login" />
  );
}
function Landing() {
  return (
    <main className="landing">
      <div className="utility-bar"><span>VIT Chennai · Campus health services</span><span>For medical emergencies, contact campus security</span></div>
      <nav className="landing-nav">
        <Link className="landing-brand" to="/"><img className="vit-logo" src="/vitlogo.png" alt="VIT Chennai" /><span><b>VIT Chennai</b><small>Campus Medical Centre</small></span></Link>
        <span className="landing-actions">
          <Link to="/login">Patient portal</Link>
          <Link className="button" to="/signup">Register</Link>
        </span>
      </nav>
      <section className="hero hero-wrap">
        <div className="hero-copy">
          <p className="eyebrow">YOUR HEALTH, HERE ON CAMPUS</p>
          <h1>Care that keeps<br /><em>you moving forward.</em></h1>
          <p>Trusted healthcare for the VIT Chennai community. Find a doctor, book a visit and keep your health information close at hand.</p>
          <div className="hero-buttons"><Link className="button" to="/signup">Book an appointment <span aria-hidden="true">→</span></Link><Link className="secondary-link" to="/login">Already registered? Sign in</Link></div>
          <div className="hero-note"><span className="live-dot" /> Serving students, faculty and staff</div>
        </div>
        <div className="hero-visual" aria-label="Campus medical care">
          <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
          <div className="medical-cross">✚</div>
          <div className="care-card"><span className="care-icon">✚</span><div><b>Campus Medical Centre</b><small>Here when you need us</small></div><span className="care-arrow">↗</span></div>
          <div className="care-hours"><span className="hours-dot"/><div><b>Appointments made simple</b><small>Browse doctors and available times</small></div></div>
          <div className="visual-caption">VIT CHENNAI <span>·</span> STUDENT HEALTH</div>
        </div>
      </section>
      <section className="quick-info">
        <div><span className="info-icon">⌕</span><p><b>Find your doctor</b><small>Explore campus clinicians and departments</small></p><Link to="/login" aria-label="Find a doctor">↗</Link></div>
        <div><span className="info-icon">▦</span><p><b>Book a visit</b><small>Choose a convenient appointment slot</small></p><Link to="/login" aria-label="Book an appointment">↗</Link></div>
        <div><span className="info-icon">♡</span><p><b>Your care, together</b><small>Appointments and prescriptions in one place</small></p><Link to="/login" aria-label="Open patient portal">↗</Link></div>
      </section>
      <section className="steps">
        <div className="section-heading"><p className="eyebrow">SUPPORT FOR YOUR WELLBEING</p><h2>Healthcare for campus life.</h2><p>Simple, connected services to help you get the care you need.</p></div>
        {["Meet with a doctor","Manage appointments","Access prescriptions"].map((x, i) => (
          <div className="step" key={x}><span className="step-number">0{i + 1}</span><h3>{x}</h3><p>{["Browse available doctors and find the right department for your needs.","Book, review and manage your upcoming campus consultations.","Keep your care instructions and prescription history together."][i]}</p><Link to="/login">Explore service <span>→</span></Link></div>
        ))}
      </section>
      <footer className="landing-footer"><span>VIT Chennai Campus Medical Centre</span><span>Care for the campus community</span></footer>
    </main>
  );
}
function Login() {
  const { login } = useAuth(),
    nav = useNavigate(),
    [form, setForm] = useState({ username: "", password: "" }),
    [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      const u = await login(form);
      nav(rolePath(u.role));
    } catch (e) {
      setErr(e.response?.data?.message || "Unable to login");
    }
  };
  return (
    <AuthShell title="Welcome back" sub="Sign in to College Hospital">
      <form onSubmit={submit}>
        {err && <p className="error">{err}</p>}
        <Input
          label="Username"
          value={form.username}
          onChange={(v) => setForm({ ...form, username: v.toUpperCase() })}
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
        />
        <button>Login</button>
        <p>
          New here? <Link to="/signup">Create an account</Link>
        </p>
        <small>Demo: 24BAI1278 / Student@123</small>
      </form>
    </AuthShell>
  );
}
function Signup() {
  const nav = useNavigate(),
    [f, setF] = useState({
      username: "",
      fullName: "",
      email: "",
      password: "",
      confirm: "",
      phone: "",
      patientType: "student",
      department: "",
      dateOfBirth: "",
      gender: "",
      address: "",
      emergencyContact: "",
      block: "",
      academicYear: "",
    }),
    [err, setErr] = useState("");
  const go = async (e) => {
    e.preventDefault();
    if (!/^[0-9]{2}[A-Z]{3}[0-9]{4}$/.test(f.username))
      return setErr("Username must match 24BLC1056 format.");
    if (!/^[A-Z0-9._%+-]+@gmail\.com$/i.test(f.email))
      return setErr("Email must be a valid @gmail.com address.");
    if (!/^\d{10}$/.test(f.phone))
      return setErr("Phone number must contain exactly 10 digits.");
    if (f.password !== f.confirm) return setErr("Passwords do not match.");
    try {
      await api.post("/auth/signup", f);
      nav("/login");
    } catch (e) {
      setErr(e.response?.data?.message || "Registration failed");
    }
  };
  return (
    <AuthShell
      title="Create your account"
      sub="Student registration for College Hospital"
    >
      <form onSubmit={go}>
        {err && <p className="error">{err}</p>}
        <Input
          label="College username"
          value={f.username}
          onChange={(v) => setF({ ...f, username: v.toUpperCase() })}
        />
        <Input
          label="Full name"
          value={f.fullName}
          onChange={(v) => setF({ ...f, fullName: v })}
        />
        <Input
          label="Email"
          type="email"
          value={f.email}
          onChange={(v) => setF({ ...f, email: v })}
        />
        <Input
          label="Phone number"
          value={f.phone}
          onChange={(v) => setF({ ...f, phone: v })}
        />
        <Input
          label="College department"
          value={f.department}
          onChange={(v) => setF({ ...f, department: v })}
        />
        <label>Campus block<select required value={f.block} onChange={(e) => setF({ ...f, block: e.target.value })}><option value="">Select your block</option>{["Block A","Block B","Block D","Block E","Block F"].map((b)=><option key={b}>{b}</option>)}</select></label>
        <label>Year of study<select required value={f.academicYear} onChange={(e) => setF({ ...f, academicYear: e.target.value })}><option value="">Select year</option>{[1,2,3,4,5,6].map((y)=><option key={y} value={y}>Year {y}</option>)}</select></label>
        <details>
          <summary>Optional profile and emergency details</summary>
          <Input label="Date of birth" type="date" required={false} value={f.dateOfBirth} onChange={(v) => setF({ ...f, dateOfBirth: v })} />
          <label>Gender<select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}><option value="">Prefer not to say</option><option>Female</option><option>Male</option><option>Other</option></select></label>
          <Input label="Address" required={false} value={f.address} onChange={(v) => setF({ ...f, address: v })} />
          <Input label="Emergency contact" required={false} value={f.emergencyContact} onChange={(v) => setF({ ...f, emergencyContact: v })} />
        </details>
        <Input
          label="Password"
          type="password"
          value={f.password}
          onChange={(v) => setF({ ...f, password: v })}
        />
        <Input
          label="Confirm password"
          type="password"
          value={f.confirm}
          onChange={(v) => setF({ ...f, confirm: v })}
        />
        <button>Register</button>
        <p>
          Already registered? <Link to="/login">Login</Link>
        </p>
      </form>
    </AuthShell>
  );
}
function Input({ label, onChange, required = true, ...p }) {
  return (
    <label>
      {label}
      <input {...p} required={required} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function AuthShell(p) {
  return (
    <div className="auth">
      <Link className="brand" to="/">
        <img className="vit-logo" src="/vitlogo.png" alt="VIT Chennai" /> VIT Chennai College Hospital
      </Link>
      <div className="authcard">
        <h1>{p.title}</h1>
        <p>{p.sub}</p>
        {p.children}
      </div>
    </div>
  );
}
const studentLinks = [
  ["Dashboard", "dashboard"],
  ["My profile", "profile"],
  ["Find doctors", "doctors"],
  ["Book appointment", "book-appointment"],
  ["Upcoming appointments", "appointments"],
  ["Appointment history", "history"],
  ["My prescriptions", "prescriptions"],
  ["Online pharmacy", "pharmacy"],
  ["🚑 Emergency", "emergency"],
  ["My referrals", "referrals"],
  ["Notices", "notices"],
];
const staffLinks = [
  ["Staff dashboard", "dashboard"],
  ["All appointments", "appointments"],
  ["Student search", "students"],
  ["Create prescription", "prescriptions"],
  ["Pharmacy management", "pharmacy"],
  ["Ambulance / Emergency", "ambulances"],
  ["Hospital referrals", "referrals"],
  ["Doctors & schedules", "doctors"],
  ["Notices", "notices"],
];
const adminLinks = [
  ["Dashboard", "dashboard"],
  ["Doctors", "doctors"],
  ["Departments", "departments"],
  ["Appointments", "appointments"],
  ["Notices", "notices"],
  ["Reports", "reports"],
  ["Pharmacy", "pharmacy"],
  ["Ambulance / Emergency", "ambulances"],
  ["Hospital referrals", "referrals"],
];
function Layout({ children }) {
  const { user, logout } = useAuth();
  let links =
    user.role === "student"
      ? studentLinks
      : user.role === "staff"
        ? staffLinks
        : adminLinks;
  return (
    <div className="shell">
      <aside>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
          <img className="vit-logo sidebar-logo" src="/vitlogo.png" alt="VIT Chennai" />
          <div>
            <strong style={{padding:0,lineHeight:1.1,fontSize:'.98rem'}}>VIT Chennai</strong>
            <span style={{fontSize:'.68rem',color:'#38bdf8',letterSpacing:'.06em',fontWeight:700,display:'block'}}>CAMPUS HOSPITAL</span>
          </div>
        </div>
        <small>{user.role === 'student' ? (user.block ? `${user.block} · Active` : 'Student Portal') : user.role === 'staff' ? 'Medical Staff' : 'Hospital Admin'}</small>
        <nav>
          {links.map((x) => (
            <Link key={x[1]} to={`/${user.role}/${x[1]}`}>
              {x[0]}
            </Link>
          ))}
        </nav>
        <button className="ghost" onClick={logout}>
          Logout
        </button>
      </aside>
      <section className="content">
        <header>
          <div>
            <p className="eyebrow">{user.role} PORTAL</p>
            <h2>Welcome, {user.fullName || user.username}</h2>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{textAlign:'right',lineHeight:1.2}}>
              <b style={{fontSize:'.92rem',display:'block',color:'var(--text-main)'}}>{user.fullName || user.username}</b>
              <small style={{color:'var(--text-muted)',fontSize:'.78rem'}}>
                {user.role === 'student' ? `${user.username}${user.block ? ' · ' + user.block : ''}` : user.role.toUpperCase()}
              </small>
            </div>
            <span className="avatar">{(user.fullName || user.username)?.[0]?.toUpperCase()}</span>
          </div>
        </header>
        {children}
      </section>
    </div>
  );
}
function Dashboard() {
  const { user } = useAuth(),
    [apps, setApps] = useState([]),
    [docs, setDocs] = useState([]),
    [rx, setRx] = useState([]);
  useEffect(() => {
    const load = async () => {
      try {
        const [appointments, doctors, prescriptions] = await Promise.all([
          api.get("/appointments"),
          api.get("/doctors"),
          api.get("/prescriptions"),
        ]);
        setApps(appointments.data);
        setDocs(doctors.data);
        setRx(prescriptions.data);
      } catch (error) {
        if (error.response?.status === 401) localStorage.removeItem("token");
      }
    };
    load();
  }, []);
  if (user.role === "admin") return <AdminDashboard />;
  let cards =
    user.role === "student"
      ? [
          [
            "Upcoming appointments",
            apps.filter(isUpcoming).length,
          ],
          [
            "Completed appointments",
            apps.filter((a) => a.status === "completed").length,
          ],
          ["Available doctors", docs.length],
          ["Prescriptions", rx.length],
        ]
      : [
          [
            "Today’s appointments",
            apps.filter(
              (a) =>
                dateOnly(a.appointment_date) === today(),
            ).length,
          ],
          [
            "Upcoming appointments",
            apps.filter((a) => a.status === "scheduled").length,
          ],
          [
            "Completed consultations",
            apps.filter((a) => a.status === "completed").length,
          ],
          ["Total patients", new Set(apps.map((a) => a.patient_id)).size],
        ];
  return (
    <>
      {user.role === "student" && <div className="emergency-banner"><div><b>Emergency ambulance</b><span>Request urgent help from campus hospital staff</span></div><Link className="button" to="/student/emergency">Request ambulance</Link></div>}
      <div className="cards">
        {cards.map((c) => (
          <article key={c[0]}>
            <span>{c[0]}</span>
            <b>{c[1]}</b>
          </article>
        ))}
      </div>
      <h3>
        {user.role === "staff"
          ? "Your scheduled consultations"
          : "Upcoming appointments"}
      </h3>
      <Appointments
        rows={apps.filter(isUpcoming).slice(0, 5)}
      />
    </>
  );
}
function AdminDashboard() {
  const [s, setS] = useState(null);
  useEffect(() => {
    api.get("/reports").then((r) => setS(r.data.summary));
  }, []);
  return (
    <>
      {s ? (
        <div className="cards">
          {[
            ["Total patients", s.patients],
            ["Total doctors", s.doctors],
            ["Departments", s.departments],
            ["Today’s appointments", s.today],
          ].map((x) => (
            <article key={x[0]}>
              <span>{x[0]}</span>
              <b>{x[1]}</b>
            </article>
          ))}
        </div>
      ) : (
        <p>Loading statistics…</p>
      )}
      <h3>Operations overview</h3>
      <p className="muted">
        Manage doctors, departments, appointments and campus notices from the
        sidebar.
      </p>
    </>
  );
}
function Doctors() {
  const { user } = useAuth(),
    [docs, setDocs] = useState([]),
    [deps, setDeps] = useState([]),
    [filter, setFilter] = useState({ search: "", department: "" });
  useEffect(() => {
    api.get("/departments").then((r) => setDeps(r.data));
    api.get("/doctors").then((r) => setDocs(r.data));
  }, []);
  let shown = docs.filter(
    (d) =>
      (!filter.search ||
        d.full_name.toLowerCase().includes(filter.search.toLowerCase())) &&
      (!filter.department || String(d.department_id) === filter.department),
  );
  return (
    <>
      <div className="toolbar">
        <input
          placeholder="Search doctor"
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
        />
        <select
          onChange={(e) => setFilter({ ...filter, department: e.target.value })}
        >
          <option value="">All departments</option>
          {deps.map((d) => (
            <option value={d.id} key={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      <div className="doctorgrid">
        {shown.map((d) => (
          <article className="doctor" key={d.id}>
            <span className="doctoricon">Dr</span>
            <h3>{d.full_name}</h3>
            <p>{d.department}</p>
            <small>
              {d.specialization} · {d.qualification}
              <br />
              {d.experience} years experience
            </small>
            {user.role === "student" && (
              <Link
                className="button"
                to={`/student/book-appointment?doctor=${d.id}`}
              >
                Book appointment
              </Link>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
function Booking() {
  const [deps, setDeps] = useState([]),
    [docs, setDocs] = useState([]),
    [f, setF] = useState({
      departmentId: "",
      doctorId: "",
      date: "",
      time: "",
      reason: "",
    }),
    [slots, setSlots] = useState([]),
    [msg, setMsg] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const lastBookableDate = new Date(Date.now() + 9 * 86400000).toISOString().slice(0, 10);
  useEffect(() => {
    api.get("/departments").then((r) => setDeps(r.data));
    api.get("/doctors").then((r) => setDocs(r.data));
  }, []);
  useEffect(() => {
    if (f.doctorId && f.date)
      api
        .get(`/doctors/${f.doctorId}/slots?date=${f.date}`)
        .then((r) => setSlots(r.data.slots))
        .catch(() => setSlots([]));
  }, [f.doctorId, f.date]);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/appointments", {
        doctorId: f.doctorId,
        date: f.date,
        time: f.time,
        reason: f.reason,
      });
      setMsg("Appointment booked successfully!");
      setF({ ...f, time: "", reason: "" });
      api
        .get(`/doctors/${f.doctorId}/slots?date=${f.date}`)
        .then((r) => setSlots(r.data.slots));
    } catch (e) {
      setMsg(e.response?.data?.message || "Booking failed");
    }
  };
  return (
    <form className="panel booking" onSubmit={submit}>
      <h3>Book an appointment</h3>
      {msg && <p className="notice">{msg}</p>}
      <label>
        Department
        <select
          required
          value={f.departmentId}
          onChange={(e) =>
            setF({ ...f, departmentId: e.target.value, doctorId: "", time: "" })
          }
        >
          <option value="">Choose department</option>
          {deps.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Doctor
        <select
          required
          value={f.doctorId}
          onChange={(e) => setF({ ...f, doctorId: e.target.value, time: "" })}
        >
          <option value="">Choose doctor</option>
          {docs
            .filter((d) => String(d.department_id) === f.departmentId)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name} — {d.specialization}
              </option>
            ))}
        </select>
      </label>
      <label>
        Date
        <input
          type="date"
          required
          min={today}
          max={lastBookableDate}
          value={f.date}
          onChange={(e) => setF({ ...f, date: e.target.value, time: "" })}
        />
      </label>
      {f.date && (
        <div>
          <label>Available time slots</label>
          <div className="slots">
            {slots.map((s) => (
              <button
                type="button"
                className={f.time === s ? "selected" : ""}
                onClick={() => setF({ ...f, time: s })}
                key={s}
              >
                {fmt(s)}
              </button>
            ))}
          </div>
          {!slots.length && (
            <p className="muted">No availability for this date.</p>
          )}
        </div>
      )}
      <label>
        Reason for visit
        <textarea
          required
          value={f.reason}
          onChange={(e) => setF({ ...f, reason: e.target.value })}
        />
      </label>
      <button disabled={!f.time}>Confirm appointment</button>
    </form>
  );
}
function Appointments({ rows: initial }) {
  const { user } = useAuth(),
    [rows, setRows] = useState(initial || []);
  useEffect(() => {
    if (initial) setRows(initial);
    else api.get("/appointments").then((r) => setRows(r.data));
  }, [initial]);
  const change = async (id, status) => {
    await api.put(`/appointments/${id}`, { status });
    setRows(rows.map((x) => (x.id === id ? { ...x, status } : x)));
  };
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Doctor</th>
            {user.role !== "student" && <th>Student</th>}
            <th>Department</th>
            <th>Time</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td>{date(a.appointment_date)}</td>
              <td>{a.doctor_name}</td>
              {user.role !== "student" && <td>{a.patient_username}</td>}
              <td>{a.department}</td>
              <td>{fmt(a.appointment_time)}</td>
              <td>
                <span className={"badge " + a.status}>{a.status}</span>
              </td>
              <td>
                {user.role === "student" && a.status === "scheduled" && (
                  <button
                    className="textbtn"
                    onClick={() => change(a.id, "cancelled")}
                  >
                    Cancel
                  </button>
                )}
                {user.role === "staff" && a.status === "scheduled" && (
                  <button
                    className="textbtn"
                    onClick={() => change(a.id, "completed")}
                  >
                    Complete
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan="7" className="muted">
                No appointments to show.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function Prescriptions() {
  const [r, setR] = useState([]);
  useEffect(() => {
    api.get("/prescriptions").then((x) => setR(x.data));
  }, []);
  return (
    <>
      <h3>Prescriptions</h3>
      <div className="list">
        {r.map((p) => (
          <article className="panel" key={p.id}>
            <b>{p.diagnosis}</b>
            <p>
              Dr. {p.doctor_name} · {date(p.appointment_date)}
            </p>
            <strong>Medicines</strong>
            <p>{p.medicines}</p>
            <strong>Instructions</strong>
            <p>{p.instructions}</p>
          </article>
        ))}
        {!r.length && <p className="muted">No prescriptions available yet.</p>}
      </div>
    </>
  );
}
function Notices() {
  const [n, setN] = useState([]);
  useEffect(() => {
    api.get("/notices").then((r) => setN(r.data));
  }, []);
  return (
    <>
      <h3>Hospital notices</h3>
      <div className="list">
        {n.map((x) => (
          <article className="panel" key={x.id}>
            <b>{x.title}</b>
            <p>{x.description}</p>
            <small>
              Posted by {x.author} · {date(x.created_at)}
            </small>
          </article>
        ))}
      </div>
    </>
  );
}
function Availability() {
  const { user } = useAuth(),
    [docs, setDocs] = useState([]),
    [choice, setChoice] = useState(""),
    [entries, setEntries] = useState([]),
    [f, setF] = useState({
      dayOfWeek: "Monday",
      startTime: "09:00",
      endTime: "13:00",
    });
  useEffect(() => {
    api.get("/doctors").then((r) => {
        setDocs(r.data);
        if (user.role === "staff") {
          let d = r.data.find((x) => x.username === user.username);
          setChoice(String(d?.id || ""));
        }
      });
  }, [user]);
  useEffect(() => {
    if (choice)
      api
        .get(`/doctors/${choice}/availability`)
        .then((r) => setEntries(r.data));
  }, [choice]);
  const add = async (e) => {
    e.preventDefault();
    let r = await api.post(`/doctors/${choice}/availability`, f);
    setEntries([...entries, r.data]);
  };
  const del = async (id) => {
    await api.delete(`/availability/${id}`);
    setEntries(entries.filter((x) => x.id !== id));
  };
  return (
    <div className="panel">
      <h3>Weekly availability</h3>
      {user.role === "admin" && (
        <label>
          Doctor
          <select value={choice} onChange={(e) => setChoice(e.target.value)}>
            <option value="">Choose doctor</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}
              </option>
            ))}
          </select>
        </label>
      )}
      <ul>
        {entries.map((x) => (
          <li key={x.id}>
            {x.day_of_week} · {fmt(x.start_time)} – {fmt(x.end_time)}{" "}
            <button className="textbtn" onClick={() => del(x.id)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      {choice && (
        <form className="inline" onSubmit={add}>
          <select
            value={f.dayOfWeek}
            onChange={(e) => setF({ ...f, dayOfWeek: e.target.value })}
          >
            {[
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <input
            type="time"
            value={f.startTime}
            onChange={(e) => setF({ ...f, startTime: e.target.value })}
          />
          <input
            type="time"
            value={f.endTime}
            onChange={(e) => setF({ ...f, endTime: e.target.value })}
          />
          <button>Add</button>
        </form>
      )}
    </div>
  );
}
function Departments() {
  const [d, setD] = useState([]),
    [f, setF] = useState({ name: "", description: "" });
  useEffect(() => {
    api.get("/departments").then((r) => setD(r.data));
  }, []);
  const add = async (e) => {
    e.preventDefault();
    let r = await api.post("/departments", f);
    setD([...d, r.data]);
    setF({ name: "", description: "" });
  };
  return (
    <>
      <form className="panel inline" onSubmit={add}>
        <input
          placeholder="Department name"
          required
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <input
          placeholder="Description"
          value={f.description}
          onChange={(e) => setF({ ...f, description: e.target.value })}
        />
        <button>Add department</button>
      </form>
      <div className="list">
        {d.map((x) => (
          <article className="panel" key={x.id}>
            <b>{x.name}</b>
            <p>{x.description}</p>
          </article>
        ))}
      </div>
    </>
  );
}
function Reports() {
  const [r, setR] = useState(null);
  useEffect(() => {
    api.get("/reports").then((x) => setR(x.data));
  }, []);
  return r ? (
    <>
      <div className="cards">
        {Object.entries(r.summary).map(([k, v]) => (
          <article key={k}>
            <span>{k.replace(/([A-Z])/g, " $1")}</span>
            <b>{v}</b>
          </article>
        ))}
      </div>
      <h3>Appointments by department</h3>
      <div className="tablewrap">
        <table>
          <tbody>
            {r.byDepartment.map((x) => (
              <tr key={x.name}>
                <td>{x.name}</td>
                <td>{x.appointments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  ) : (
    <p>Loading report…</p>
  );
}
/* Removed emergency, ambulance, warden, and health-camp interface.
function Emergency() {
  const { user } = useAuth(), [rows, setRows] = useState([]), [msg, setMsg] = useState(""), [f, setF] = useState({ location: "", description: "", severity: "serious" });
  const load = () => api.get("/emergencies").then((r) => setRows(r.data));
  useEffect(() => {
    load();
  }, []);
  const request = async (e) => { e.preventDefault(); try { const r = await api.post("/emergencies", f); setMsg(r.data.ambulance_label ? `Ambulance assigned: ${r.data.ambulance_label}. Hostel warden is notified for serious emergencies.` : "Request received. No ambulance is presently available; dispatch has been alerted."); setF({ location: "", description: "", severity: "serious" }); load(); } catch (e) { setMsg(e.response?.data?.message || "Could not send emergency request."); } };
  const change = async (id, status) => { await api.put(`/emergencies/${id}`, { status }); load(); };
  return <><h3>{user.role === "patient" ? "Campus emergency & ambulance" : "Live campus emergencies"}</h3>{user.role === "patient" && <form className="panel booking" onSubmit={request}><p className="muted">Enter your hostel block and room in your profile with the medical centre. Serious and critical requests notify the matching hostel warden automatically.</p>{msg && <p className="notice">{msg}</p>}<label>Current location<input required placeholder="e.g. MH-A, Room 312" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></label><label>Severity<select value={f.severity} onChange={(e) => setF({ ...f, severity: e.target.value })}>{["low", "medium", "serious", "critical"].map((x) => <option key={x}>{x}</option>)}</select></label><label>What happened?<textarea required value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label><button>Request campus ambulance</button></form>}<div className="tablewrap"><table><thead><tr><th>Requested</th><th>Student / location</th><th>Severity</th><th>Ambulance</th><th>Status</th>{user.role === "admin" && <th>Action</th>}</tr></thead><tbody>{rows.map((x) => <tr key={x.id}><td>{date(x.requested_at)}</td><td>{user.role === "admin" && <><b>{x.patient_name}</b><br /></>}{x.location}</td><td><span className={'badge ' + x.severity}>{x.severity}</span></td><td>{x.ambulance_label || "Awaiting availability"}</td><td>{x.status}</td>{user.role === "admin" && <td>{["assigned", "en_route", "completed"].filter((s) => s !== x.status).map((s) => <button className="textbtn" key={s} onClick={() => change(x.id, s)}>{s}</button>)}</td>}</tr>)}{!rows.length && <tr><td colSpan="6" className="muted">No emergency requests.</td></tr>}</tbody></table></div></>;
}
function Camps() {
  const { user } = useAuth(), [camps, setCamps] = useState([]), [msg, setMsg] = useState(""), [f, setF] = useState({ title: "", campType: "Vaccination", campDate: "", startTime: "09:00", endTime: "16:00", venue: "", capacity: "", description: "" });
  const load = () => api.get("/camps").then((r) => setCamps(r.data));
  useEffect(() => {
    load();
  }, []);
  const register = async (id, registered) => { try { registered ? await api.delete(`/camps/${id}/register`) : await api.post(`/camps/${id}/register`); load(); } catch (e) { setMsg(e.response?.data?.message || "Registration could not be updated."); } };
  const create = async (e) => { e.preventDefault(); try { await api.post("/camps", { ...f, capacity: Number(f.capacity) }); setMsg("Health camp created."); setF({ ...f, title: "", campDate: "", venue: "", capacity: "", description: "" }); load(); } catch (e) { setMsg(e.response?.data?.message || "Could not create camp."); } };
  return <><h3>VIT health camps</h3>{msg && <p className="notice">{msg}</p>}{user.role === "admin" && <form className="panel inline campform" onSubmit={create}><input required placeholder="Camp title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /><input required placeholder="Type" value={f.campType} onChange={(e) => setF({ ...f, campType: e.target.value })} /><input required type="date" value={f.campDate} onChange={(e) => setF({ ...f, campDate: e.target.value })} /><input required type="time" value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} /><input required type="time" value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} /><input required placeholder="Venue" value={f.venue} onChange={(e) => setF({ ...f, venue: e.target.value })} /><input required type="number" min="1" placeholder="Capacity" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} /><button>Create camp</button></form>}<div className="list">{camps.map((c) => { const registered = Boolean(c.registered_patient_id); const full = c.registration_count >= c.capacity; return <article className="panel" key={c.id}><b>{c.title}</b><p>{c.camp_type} · {date(c.camp_date)} · {fmt(c.start_time)}–{fmt(c.end_time)}<br />{c.venue} · {c.registration_count}/{c.capacity} registered</p><p>{c.description}</p>{user.role === "patient" && <button disabled={!registered && full} onClick={() => register(c.id, registered)}>{registered ? "Cancel registration" : full ? "Camp full" : "Register"}</button>}</article>})}{!camps.length && <p className="muted">No upcoming camps have been published.</p>}</div></>;
}
*/
function Profile() {
  const { user } = useAuth();
  return <><h3>My profile</h3><article className="panel"><p><b>Name:</b> {user.fullName}</p><p><b>College username:</b> {user.username}</p><p><b>Department:</b> {user.college_department || 'Not recorded'}</p><p><b>Year:</b> {user.academic_year || 'Not recorded'}</p><p><b>Campus block:</b> {user.block || 'Not recorded'}</p><p><b>Email:</b> {user.email}</p><p><b>Phone:</b> {user.phone || 'Not provided'}</p></article></>;}
function StudentSearch() {
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const find = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      const r = await api.get('/patients', { params: { search } });
      setStudents(r.data);
      if (!r.data.length) setMsg('No students found matching your search.');
    } catch { setMsg('Could not load students.'); }
    setLoading(false);
  };
  return <><h3>Student search</h3>
    <form className="panel inline" onSubmit={find}>
      <input placeholder="Username, name or email" value={search} onChange={e => setSearch(e.target.value)} />
      <button>Search</button>
    </form>
    {msg && <p className="notice" style={{background:'#fff0f0',color:'#b22d2d'}}>{msg}</p>}
    {loading && <p className="muted">Searching…</p>}
    <div className="list">
      {students.map(s => (
        <article className="panel" key={s.id} style={{borderLeft:'4px solid var(--primary)'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <b style={{fontSize:'1.05rem'}}>{s.full_name}</b>
            <span className="badge Confirmed" style={{fontSize:'.75rem'}}>{s.block ? `Campus ${s.block}` : 'Block not set'}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))',gap:'10px 20px',marginTop:'14px',fontSize:'.88rem'}}>
            <p style={{margin:0}}><span style={{color:'var(--text-muted)',fontWeight:600,fontSize:'.75rem'}}>USERNAME</span><br/><b>{s.username}</b></p>
            <p style={{margin:0}}><span style={{color:'var(--text-muted)',fontWeight:600,fontSize:'.75rem'}}>DEPARTMENT</span><br/>{s.college_department || 'Not recorded'}</p>
            <p style={{margin:0}}><span style={{color:'var(--text-muted)',fontWeight:600,fontSize:'.75rem'}}>YEAR OF STUDY</span><br/>{s.academic_year ? `Year ${s.academic_year}` : 'Not recorded'}</p>
            <p style={{margin:0}}><span style={{color:'var(--text-muted)',fontWeight:600,fontSize:'.75rem'}}>EMAIL</span><br/>{s.email}</p>
            <p style={{margin:0}}><span style={{color:'var(--text-muted)',fontWeight:600,fontSize:'.75rem'}}>PHONE</span><br/>{s.phone || 'Not provided'}</p>
            {s.emergency_contact && <p style={{margin:0,gridColumn:'1/-1'}}><span style={{color:'var(--text-muted)',fontWeight:600,fontSize:'.75rem'}}>EMERGENCY CONTACT</span><br/>{s.emergency_contact}</p>}
          </div>
        </article>
      ))}
    </div>
  </>;
}
function StaffAppointments() {
  const [rows, setRows] = useState([]), [doctors, setDoctors] = useState([]), [departments, setDepartments] = useState([]), [filters, setFilters] = useState({ search: '', date: '', doctorId: '', departmentId: '', status: '' });
  const load = () => api.get('/appointments', { params: filters }).then((r) => setRows(r.data));
  useEffect(() => { api.get('/doctors').then((r) => setDoctors(r.data)); api.get('/departments').then((r) => setDepartments(r.data)); }, []);
  useEffect(() => { load(); }, [filters.search, filters.date, filters.doctorId, filters.departmentId, filters.status]);
  const update = async (id, status) => { await api.put(`/appointments/${id}`, { status }); load(); };
  return <><h3>Hospital appointments</h3><div className="panel inline"><input placeholder="Student username or name" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /><input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} /><select value={filters.doctorId} onChange={(e) => setFilters({ ...filters, doctorId: e.target.value })}><option value="">All doctors</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}</select><select value={filters.departmentId} onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}><option value="">All departments</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{['scheduled', 'completed', 'cancelled'].map((x) => <option key={x}>{x}</option>)}</select></div><div className="tablewrap"><table><thead><tr><th>Date</th><th>Time</th><th>Student</th><th>Username</th><th>Doctor</th><th>Department</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead><tbody>{rows.map((a) => <tr key={a.id}><td>{date(a.appointment_date)}</td><td>{fmt(a.appointment_time)}</td><td>{a.patient_name}</td><td>{a.patient_username}</td><td>{a.doctor_name}</td><td>{a.department}</td><td>{a.reason}</td><td>{a.status}</td><td>{a.status === 'scheduled' && <button className="textbtn" onClick={() => update(a.id, 'completed')}>Complete</button>}</td></tr>)}{!rows.length && <tr><td colSpan="9" className="muted">No appointments found.</td></tr>}</tbody></table></div></>;
}
function StaffPrescriptions() {
  const [username, setUsername] = useState(''), [student, setStudent] = useState(null), [history, setHistory] = useState([]), [message, setMessage] = useState(''), [form, setForm] = useState({ diagnosis: '', medicines: '', instructions: '', prescriptionNotes: '' });
  const find = async (e) => { e.preventDefault(); try { const r = await api.get('/patients', { params: { search: username } }); const match = r.data.find((p) => p.username === username.toUpperCase()); if (!match) throw new Error(); setStudent(match); const prescriptions = await api.get('/prescriptions', { params: { username } }); setHistory(prescriptions.data); setMessage(''); } catch { setStudent(null); setHistory([]); setMessage('Student not found.'); } };
  const save = async (e) => { e.preventDefault(); try { await api.post('/prescriptions', { patientUsername: student.username, ...form }); setMessage('Prescription saved to the student account.'); setForm({ diagnosis: '', medicines: '', instructions: '', prescriptionNotes: '' }); const r = await api.get('/prescriptions', { params: { username: student.username } }); setHistory(r.data); } catch (err) { setMessage(err.response?.data?.message || 'Could not save prescription.'); } };
  return <><h3>Create student prescription</h3><form className="panel inline" onSubmit={find}><input required placeholder="College username, e.g. 24BAI1278" value={username} onChange={(e) => setUsername(e.target.value.toUpperCase())} /><button>Find student</button></form>{message && <p className="notice">{message}</p>}{student && <><article className="panel"><b>{student.full_name}</b><p>{student.username} · {student.email} · {student.college_department || 'Department not recorded'}</p></article><form className="panel booking" onSubmit={save}><label>Diagnosis<textarea required value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></label><label>Medicines<textarea required value={form.medicines} onChange={(e) => setForm({ ...form, medicines: e.target.value })} /></label><label>Instructions<textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></label><label>Prescription notes<textarea value={form.prescriptionNotes} onChange={(e) => setForm({ ...form, prescriptionNotes: e.target.value })} /></label><button>Save prescription</button></form><h3>Student prescription history</h3>{history.map((p) => <article className="panel" key={p.id}><b>{p.diagnosis}</b><p>{p.medicines}</p></article>)}</>}</>;
}
function Pharmacy() {
  const {user}=useAuth(), [meds,setMeds]=useState([]),[orders,setOrders]=useState([]),[cart,setCart]=useState({}),[search,setSearch]=useState(''),[msg,setMsg]=useState(''),[form,setForm]=useState({name:'',dosage:'',stock:0});
  const load=()=>Promise.all([api.get('/pharmacy/medicines',{params:{search}}),api.get('/pharmacy/orders')]).then(([m,o])=>{setMeds(m.data);setOrders(o.data)});
  useEffect(()=>{load()},[search]);
  const place=async()=>{try{await api.post('/pharmacy/orders',{items:Object.entries(cart).filter(([,quantity])=>quantity>0).map(([medicineId,quantity])=>({medicineId:Number(medicineId),quantity:Number(quantity)}))});setCart({});setMsg('Order placed successfully. Collect it at the campus pharmacy when ready.');load()}catch(e){setMsg(e.response?.data?.message||'Could not place order.')}};
  const save=async(e)=>{e.preventDefault();try{await api.post('/pharmacy/medicines',form);setForm({name:'',dosage:'',stock:0});load()}catch(e){setMsg(e.response?.data?.message||'Could not save medicine.')}};
  const update=async(id,status)=>{await api.put(`/pharmacy/orders/${id}`,{status});load()};
  return <>
    <h3>{user.role==='student'?'Campus online pharmacy':'Pharmacy inventory & orders'}</h3>
    {msg&&<p className="notice">{msg}</p>}
    {user.role!=='student'&&<form className="panel inline" onSubmit={save}><input required placeholder="Medicine name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input placeholder="Dosage (e.g. 500mg, 10ml)" value={form.dosage} onChange={e=>setForm({...form,dosage:e.target.value})}/><input type="number" min="0" placeholder="Available stock" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/><button>Save inventory</button></form>}
    <div style={{display:'flex',gap:'12px',alignItems:'center',marginBottom:'14px'}}>
      <input style={{margin:0}} placeholder="🔍 Search medicines by name (e.g. Paracetamol, Cetirizine)..." value={search} onChange={e=>setSearch(e.target.value)}/>
    </div>
    <div className="doctorgrid">
      {meds.map(m=>(
        <article className="doctor" key={m.id}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'10px'}}>
            <h3 style={{margin:0,fontSize:'1.1rem'}}>{m.name}</h3>
            <span className={`badge ${m.stock > 10 ? 'completed' : m.stock > 0 ? 'Requested' : 'cancelled'}`} style={{fontSize:'.72rem',whiteSpace:'nowrap'}}>
              {m.stock > 0 ? `${m.stock} in stock` : 'Out of stock'}
            </span>
          </div>
          <p style={{margin:'6px 0',color:'var(--primary)',fontSize:'.84rem',fontWeight:600}}>{m.dosage || 'Standard dispensary formulation'}</p>
          <small style={{color:'var(--text-muted)',lineHeight:1.5,marginBottom:'14px'}}>{m.description || 'Campus dispensary prescription medicine'}</small>
          {user.role==='student' && (
            <label style={{marginTop:'auto',display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px',background:'var(--surface-hover)',padding:'6px 12px',borderRadius:'var(--radius-sm)'}}>
              <span>Quantity</span>
              <input type="number" min="0" max={m.stock} style={{width:'70px',margin:0,padding:'6px 8px',textAlign:'center'}} value={cart[m.id]||0} onChange={e=>setCart({...cart,[m.id]:Math.min(m.stock, Math.max(0, Number(e.target.value)))})}/>
            </label>
          )}
        </article>
      ))}
      {!meds.length && <p className="muted" style={{gridColumn:'1/-1'}}>No medicines match your search.</p>}
    </div>
    {user.role==='student'&& (
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'30px'}}>
        <button onClick={place} disabled={!Object.values(cart).some(x=>Number(x)>0)} style={{padding:'12px 24px',fontSize:'.95rem'}}>
          🛒 Place pharmacy order ({Object.values(cart).reduce((a,b)=>a+Number(b||0),0)} items)
        </button>
      </div>
    )}
    <h3>{user.role==='student'?'My pharmacy orders':'All student pharmacy orders'}</h3>
    <div className="list">
      {orders.map(o=>(
        <article className="panel" key={o.id}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'10px'}}>
            <b>{o.order_code}</b>
            <span className={`status-badge status-${(o.status||'').toLowerCase().replace(/\s+/g,'-')}`}>{o.status}</span>
          </div>
          <p style={{margin:'8px 0 0'}}>
            {user.role!=='student'&&<span style={{color:'var(--text-sub)',fontWeight:600}}>{o.patient_name} ({o.patient_username}) · </span>}
            {(o.items||[]).map(i=>`${i.name} × ${i.quantity}`).join(', ')}
          </p>
          {user.role!=='student'&&(
            <div style={{marginTop:'12px',display:'flex',alignItems:'center',gap:'10px'}}>
              <span style={{fontSize:'.82rem',color:'var(--text-muted)'}}>Update status:</span>
              <select value={o.status} onChange={e=>update(o.id,e.target.value)} style={{width:'auto',margin:0,padding:'6px 12px'}}>
                {['Pending','Confirmed','Preparing','Ready for Collection','Collected','Cancelled'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          )}
        </article>
      ))}
      {!orders.length && <p className="muted">No pharmacy orders placed yet.</p>}
    </div>
  </>;
}
function Emergency() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [block, setBlock] = useState(user?.block || 'Block A');
  useEffect(() => { if (user?.block) setBlock(user.block); }, [user]);
  const load = () => api.get('/ambulance-requests').then(r => setRows(r.data));
  useEffect(() => { load(); }, []);
  const submit = async () => {
    try {
      await api.post('/ambulance-requests', { block });
      setOpen(false);
      setMsg(`Emergency request sent to campus hospital staff for ${block}.`);
      load();
    } catch(e) {
      setMsg(e.response?.data?.message || 'Could not send request.');
    }
  };
  return <>
    <h3>Emergency ambulance</h3>
    <p className="emergency-banner">
      <b>For urgent campus medical assistance</b>
      <button className="danger" onClick={() => setOpen(true)}>🚑 Request ambulance</button>
    </p>
    {msg && <p className="notice">{msg}</p>}
    {open && (
      <div className="modal-backdrop">
        <section className="panel modal" style={{maxWidth:'460px'}}>
          <h3 style={{color:'#c53030'}}>🚑 Urgent: Call Ambulance</h3>
          <p>An ambulance will be alerted and dispatched immediately.</p>
          <label style={{display:'block',marginTop:'12px',fontWeight:600}}>
            Pickup campus block
            <select value={block} onChange={e => setBlock(e.target.value)} style={{width:'100%',marginTop:'4px',padding:'8px'}}>
              {['Block A','Block B','Block D','Block E','Block F'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>
          <div style={{display:'flex',gap:'10px',marginTop:'18px',justifyContent:'flex-end'}}>
            <button className="ghost light" onClick={() => setOpen(false)}>Cancel</button>
            <button className="danger" onClick={submit}>Confirm & Call Ambulance</button>
          </div>
        </section>
      </div>
    )}
    <h3>My ambulance requests</h3>
    <div className="list">
      {rows.map(r => (
        <article className="panel" key={r.id}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <b>{r.request_code}</b>
            <span className={`status-badge status-${(r.status||'').toLowerCase().replace(/\s+/g,'-')}`}>{r.status}</span>
          </div>
          <p style={{margin:'6px 0 0'}}>
            Campus location: <b>{r.block}</b> · Vehicle: <b>{r.vehicle_code || 'Awaiting assignment'}</b>
          </p>
          <small className="muted">Requested on {date(r.requested_at)}</small>
        </article>
      ))}
      {!rows.length && <p className="muted">No past ambulance requests.</p>}
    </div>
  </>;
}
function Ambulances() {
 const {user}=useAuth(); const [rows,setRows]=useState([]),[units,setUnits]=useState([]);const load=()=>Promise.all([api.get('/ambulance-requests'),api.get('/ambulances')]).then(([r,u])=>{setRows(r.data);setUnits(u.data)});useEffect(()=>{load()},[]);const update=async(id,status,ambulanceId)=>{await api.put(`/ambulance-requests/${id}`,{status,ambulanceId:ambulanceId||undefined});load()};return <><h3>Emergency requests</h3>{user.role==='admin'&&<form className="panel inline" onSubmit={async e=>{e.preventDefault();const d=new FormData(e.currentTarget);await api.post('/ambulances',{vehicleCode:d.get('vehicle')});e.currentTarget.reset();load()}}><input name="vehicle" required placeholder="Ambulance vehicle code"/><button>Add ambulance</button></form>}<div className="tablewrap"><table><thead><tr><th>Request</th><th>Student</th><th>Username</th><th>Block</th><th>Time</th><th>Ambulance</th><th>Status</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.request_code}</td><td>{r.patient_name}</td><td>{r.patient_username}</td><td>{r.block}</td><td>{date(r.requested_at)}</td><td><select value={r.ambulance_id||''} onChange={e=>update(r.id,'Assigned',e.target.value)}><option value="">Unassigned</option>{units.map(u=><option key={u.id} value={u.id}>{u.vehicle_code}</option>)}</select></td><td><select value={r.status} onChange={e=>update(r.id,e.target.value,r.ambulance_id)}>{['Requested','Assigned','Ambulance Dispatched','Arrived','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table></div></>;
}
function Referrals() {
 const {user}=useAuth(),[rows,setRows]=useState([]),[hospitals,setHospitals]=useState([]),[units,setUnits]=useState([]),[message,setMessage]=useState('');const load=()=>api.get('/referrals').then(r=>setRows(r.data));useEffect(()=>{load();if(user.role!=='student'){api.get('/referrals/hospitals').then(r=>setHospitals(r.data));api.get('/ambulances').then(r=>setUnits(r.data))}},[]);const create=async e=>{e.preventDefault();const d=new FormData(e.currentTarget);try{await api.post('/referrals',{username:d.get('username'),hospitalId:Number(d.get('hospital')),reason:d.get('reason'),medicalNotes:d.get('notes'),ambulanceRequired:d.get('ambulance')==='yes'});setMessage('Referral created.');e.currentTarget.reset();load()}catch(e){setMessage(e.response?.data?.message||'Could not create referral.')}};const update=async(id,status,ambulanceId)=>{await api.put(`/referrals/${id}`,{status,ambulanceId:ambulanceId||undefined});load()};return <><h3>{user.role==='student'?'My hospital referrals':'Hospital referrals'}</h3>{message&&<p className="notice">{message}</p>}{user.role!=='student'&&<form className="panel booking" onSubmit={create}><label>Student username<input name="username" required placeholder="24BAI1278"/></label><label>External hospital<select required name="hospital"><option value="">Select hospital</option>{hospitals.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}</select></label><label>Referral reason<textarea name="reason" required/></label><label>Medical notes<textarea name="notes"/></label><label>Ambulance required<select name="ambulance"><option value="no">No</option><option value="yes">Yes</option></select></label><button>Generate referral</button></form>}<div className="list">{rows.map(r=><article className="panel" key={r.id}><b>{r.referral_code} · {r.hospital}</b><p>{r.patient_name} · {r.patient_username} · {r.block}</p><p>{r.reason}</p><p>Ambulance: {r.vehicle_code|| (r.ambulance_required?'Required':'No')} · Status: <b>{r.status}</b> · Created {date(r.created_at)}</p>{user.role!=='student'&&r.ambulance_required&&<label>Assign ambulance<select value={r.ambulance_id||''} onChange={e=>update(r.id,'Ambulance Assigned',e.target.value)}><option value=''>Select ambulance</option>{units.map(a=><option key={a.id} value={a.id}>{a.vehicle_code}</option>)}</select></label>}{user.role!=='student'&&<select value={r.status} onChange={e=>update(r.id,e.target.value)}>{['Referral Created','Hospital Selected','Ambulance Assigned','Patient Dispatched','Patient Referred','Completed','Cancelled'].map(s=><option key={s}>{s}</option>)}</select>}</article>)}</div></>;
}
function PortalPage({ page }) {
  const { user } = useAuth();
  return (
    <Layout>
      {page === "dashboard" ? (
        <Dashboard />
      ) : page === "doctors" ? (
        <Doctors />
      ) : page === "book-appointment" ? (
        <Booking />
      ) : page === "appointments" ? (
        user.role === "staff" ? <StaffAppointments /> : <Appointments />
      ) : page === "history" ? (
        <Appointments />
      ) : page === "students" ? (
        <StudentSearch />
      ) : page === "prescriptions" ? (
        user.role === "staff" ? <StaffPrescriptions /> : <Prescriptions />
      ) : page === "profile" ? (
        <Profile />
      ) : page === "pharmacy" ? (
        <Pharmacy />
      ) : page === "notices" ? (
        <Notices />
      ) : page === "availability" ? (
        <Availability />
      ) : page === "departments" ? (
        <Departments />
      ) : page === "reports" ? (
        <Reports />
      ) : page === "emergency" ? (
        <Emergency />
      ) : page === "ambulances" ? (
        <Ambulances />
      ) : page === "referrals" ? (
        <Referrals />
      ) : (
        <p className="muted">
          This section is available from the dashboard workflow.
        </p>
      )}
    </Layout>
  );
}
export default function App() {
  let p = (role, page) => (
    <Guard roles={[role]}>
      <PortalPage page={page} />
    </Guard>
  );
  let multi = (roles, page) => (
    <Guard roles={roles}>
      <PortalPage page={page} />
    </Guard>
  );
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      {["dashboard", "profile", "doctors", "book-appointment", "appointments", "prescriptions", "history", "notices", "pharmacy", "emergency", "referrals"].map((x) => (
        <Route key={"s" + x} path={"/student/" + x} element={p("student", x)} />
      ))}
      {["dashboard", "appointments", "students", "prescriptions", "doctors", "notices", "pharmacy", "ambulances", "referrals"].map((x) => (
        <Route key={"st" + x} path={"/staff/" + x} element={p("staff", x)} />
      ))}
      {[
        "dashboard",
        "doctors",
        "departments",
        "appointments",
        "notices",
        "reports",
        "availability",
        "pharmacy",
        "ambulances",
        "referrals",
      ].map((x) => (
        <Route key={"a" + x} path={"/admin/" + x} element={p("admin", x)} />
      ))}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
