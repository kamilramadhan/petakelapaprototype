// Auth screens — Login + Register with role-based account.
// Persists user to localStorage. Role selected at registration is permanent.

const { useState, useEffect } = React;

const ROLE_INFO = {
  kementan: { label: "Kementan", full: "Staf Kementerian Pertanian", className: "kementan" },
  investor: { label: "Investor", full: "Investor / Pengembang Bisnis", className: "investor" },
  peneliti: { label: "Peneliti", full: "Peneliti / Akademisi", className: "peneliti" },
};
window.ROLE_INFO = ROLE_INFO;

// Mock seed accounts
const DEMO_ACCOUNTS = [
  { email: "kementan@demo.id", password: "password123", name: "Bp. A. Pratama",  instansi: "Kementerian Pertanian RI", role: "kementan" },
  { email: "investor@demo.id", password: "password123", name: "Ibu S. Halim",    instansi: "PT Nusantara Coco Ventures", role: "investor" },
  { email: "peneliti@demo.id", password: "password123", name: "Dr. R. Wijaya",   instansi: "Institut Pertanian Bogor",   role: "peneliti" },
];

function getAccounts() {
  try {
    const raw = localStorage.getItem("pkd_accounts");
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  localStorage.setItem("pkd_accounts", JSON.stringify(DEMO_ACCOUNTS));
  return DEMO_ACCOUNTS;
}
function saveAccounts(accs) {
  localStorage.setItem("pkd_accounts", JSON.stringify(accs));
}

window.AuthAPI = {
  SESSION_TTL_DAYS: 7,
  getCurrent() {
    try {
      const raw = localStorage.getItem("pkd_session");
      if (!raw) return null;
      const data = JSON.parse(raw);
      // Check expiry — 7 days from login
      if (data.expiresAt && Date.now() > data.expiresAt) {
        localStorage.removeItem("pkd_session");
        sessionStorage.setItem("pkd_session_expired", "1");
        return null;
      }
      return data;
    } catch (e) { return null; }
  },
  consumeExpiredFlag() {
    const v = sessionStorage.getItem("pkd_session_expired");
    if (v) sessionStorage.removeItem("pkd_session_expired");
    return !!v;
  },
  appendAccessLog(entry) {
    try {
      const raw = localStorage.getItem("pkd_access_log");
      const log = raw ? JSON.parse(raw) : [];
      log.unshift({ ...entry, ts: new Date().toISOString().slice(0, 16).replace("T", " ") });
      // Cap at 100 entries
      localStorage.setItem("pkd_access_log", JSON.stringify(log.slice(0, 100)));
    } catch (e) {}
  },
  getAccessLog() {
    try {
      const raw = localStorage.getItem("pkd_access_log");
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  },
  login(email, password) {
    const accounts = getAccounts();
    const u = accounts.find(a => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
    if (!u) return { ok: false, error: "Email atau password salah." };
    const expiresAt = Date.now() + this.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    const session = { name: u.name, email: u.email, instansi: u.instansi, role: u.role, expiresAt };
    localStorage.setItem("pkd_session", JSON.stringify(session));
    this.appendAccessLog({ event: "LOGIN", user: u.name, email: u.email, role: u.role });
    return { ok: true, user: session };
  },
  register(payload) {
    const accounts = getAccounts();
    if (accounts.find(a => a.email.toLowerCase() === payload.email.toLowerCase())) {
      return { ok: false, error: "Email sudah terdaftar." };
    }
    const newAcc = { ...payload };
    accounts.push(newAcc);
    saveAccounts(accounts);
    this.appendAccessLog({ event: "REGISTER", user: newAcc.name, email: newAcc.email, role: newAcc.role });
    return { ok: true, user: newAcc };
  },
  finalizeRegistration(payload) {
    // Called after the user clicks "Lanjut ke Login" / verification step.
    const expiresAt = Date.now() + this.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    const session = { name: payload.name, email: payload.email, instansi: payload.instansi, role: payload.role, expiresAt };
    localStorage.setItem("pkd_session", JSON.stringify(session));
    this.appendAccessLog({ event: "VERIFIED", user: payload.name, email: payload.email, role: payload.role });
    return { ok: true, user: session };
  },
  logout() {
    const sess = this.getCurrent();
    if (sess) this.appendAccessLog({ event: "LOGOUT", user: sess.name, email: sess.email, role: sess.role });
    localStorage.removeItem("pkd_session");
  }
};

function BrandHeader() {
  return (
    <div className="auth-brand">
      <svg width="32" height="32" viewBox="0 0 32 32">
        <defs>
          <linearGradient id="leaf-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2D6A4F" />
            <stop offset="100%" stopColor="#52A77D" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14" fill="#F8F9FA" stroke="#2D6A4F" strokeWidth="1.5" />
        <path d="M 16 8 C 13 11, 11 14, 11 17 C 11 20, 13 22, 16 22 C 19 22, 21 20, 21 17 C 21 14, 19 11, 16 8 Z" fill="url(#leaf-grad)" />
        <path d="M 16 9 L 16 21" stroke="white" strokeWidth="0.8" />
      </svg>
      <span className="auth-brand-name">PetaKelapa<span style={{ color: "var(--primary)" }}>.id</span></span>
    </div>
  );
}

window.LoginScreen = function LoginScreen({ onAuthed, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(() => AuthAPI.consumeExpiredFlag() ? "Sesi Anda telah berakhir, silakan masuk kembali." : "");
  const [loading, setLoading] = useState(false);

  function submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const r = AuthAPI.login(email, password);
      if (r.ok) {
        onAuthed(r.user);
      } else {
        setError(r.error);
        setLoading(false);
      }
    }, 800);
  }

  function useDemo(em) {
    setEmail(em);
    setPassword("password123");
  }

  return (
    <div className="auth-stage">
      <div className="auth-card">
        <BrandHeader />
        <h1 className="auth-h1">Masuk ke akun Anda</h1>
        <p className="auth-sub">Platform geospasial industri kelapa Indonesia</p>

        {error && <div className="auth-error">⚠ {error}</div>}

        <form onSubmit={submit}>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="nama@instansi.id" />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Masuk…</> : "Masuk"}
          </button>
        </form>

        <div className="demo-hint">
          <b>Coba demo:</b>
          <div className="demo-row" style={{ marginTop: 6 }}>
            <span className="role-pill kementan">Kementan</span>
            <button className="use-demo" onClick={() => useDemo("kementan@demo.id")}>kementan@demo.id / password123</button>
          </div>
          <div className="demo-row" style={{ marginTop: 4 }}>
            <span className="role-pill investor">Investor</span>
            <button className="use-demo" onClick={() => useDemo("investor@demo.id")}>investor@demo.id / password123</button>
          </div>
          <div className="demo-row" style={{ marginTop: 4 }}>
            <span className="role-pill peneliti">Peneliti</span>
            <button className="use-demo" onClick={() => useDemo("peneliti@demo.id")}>peneliti@demo.id / password123</button>
          </div>
        </div>

        <div className="auth-foot">
          Belum punya akun?
          <button onClick={onSwitch}>Daftar</button>
        </div>
      </div>
    </div>
  );
};

window.RegisterScreen = function RegisterScreen({ onAuthed, onSwitch }) {
  const [form, setForm] = useState({
    name: "", instansi: "", email: "", password: "", confirm: "", role: "investor"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyStep, setVerifyStep] = useState(false); // email confirmation screen

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function submit(e) {
    e.preventDefault();
    setError("");
    if (form.password.length < 6) { setError("Password minimal 6 karakter."); return; }
    if (form.password !== form.confirm) { setError("Konfirmasi password tidak cocok."); return; }
    setLoading(true);
    setTimeout(() => {
      const r = AuthAPI.register({
        name: form.name, instansi: form.instansi, email: form.email,
        password: form.password, role: form.role
      });
      if (r.ok) {
        setLoading(false);
        setVerifyStep(true);
      } else { setError(r.error); setLoading(false); }
    }, 800);
  }

  function finishVerification() {
    const r = AuthAPI.finalizeRegistration({
      name: form.name, instansi: form.instansi, email: form.email, role: form.role
    });
    if (r.ok) onAuthed(r.user);
  }

  if (verifyStep) {
    const role = ROLE_INFO[form.role];
    return (
      <div className="auth-stage">
        <div className="auth-card">
          <BrandHeader />
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--ok-bg)", color: "var(--ok-ink)", display: "grid", placeItems: "center", margin: "0 auto 18px", fontSize: 28 }}>✉</div>
          <h1 className="auth-h1" style={{ textAlign: "center" }}>Konfirmasi email Anda</h1>
          <p className="auth-sub" style={{ textAlign: "center" }}>
            Kami telah mengirim email konfirmasi ke <b style={{ color: "var(--ink)" }}>{form.email}</b>.
            Silakan klik tautan di dalam email untuk mengaktifkan akun.
          </p>
          <div style={{ background: "var(--surface)", padding: "14px 16px", borderRadius: 8, marginBottom: 18, fontSize: 12.5, color: "var(--ink-2)" }}>
            <b style={{ color: "var(--ink)", display: "block", marginBottom: 6 }}>Ringkasan akun:</b>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span>Nama</span><b style={{ color: "var(--ink)" }}>{form.name}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span>Instansi</span><b style={{ color: "var(--ink)" }}>{form.instansi}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0" }}>
              <span>Peran</span><span className={"role-pill " + role.className}>{role.label}</span>
            </div>
          </div>
          <button className="auth-submit" onClick={finishVerification}>
            ✓ Saya sudah verifikasi — Masuk ke Dashboard
          </button>
          <div className="auth-foot">
            Tidak terima email?
            <button>Kirim ulang</button>
          </div>
          <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 14, textAlign: "center", fontStyle: "italic" }}>
            Demo: tombol di atas memverifikasi akun secara instan.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-stage">
      <div className="auth-card wide">
        <BrandHeader />
        <h1 className="auth-h1">Buat akun baru</h1>
        <p className="auth-sub">Role akun melekat permanen. Pilih sesuai posisi Anda.</p>

        {error && <div className="auth-error">⚠ {error}</div>}

        <form onSubmit={submit}>
          <div className="auth-field">
            <label>Nama lengkap</label>
            <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nama Anda" />
          </div>
          <div className="auth-field">
            <label>Instansi / Perusahaan</label>
            <input required value={form.instansi} onChange={e => set("instansi", e.target.value)} placeholder="Universitas, perusahaan, atau lembaga" />
          </div>
          <div className="auth-field">
            <label>Email</label>
            <input type="email" required value={form.email} onChange={e => set("email", e.target.value)} placeholder="nama@instansi.id" />
          </div>
          <div className="auth-field-row">
            <div className="auth-field">
              <label>Password</label>
              <input type="password" required value={form.password} onChange={e => set("password", e.target.value)} placeholder="Min. 6 karakter" />
            </div>
            <div className="auth-field">
              <label>Konfirmasi Password</label>
              <input type="password" required value={form.confirm} onChange={e => set("confirm", e.target.value)} placeholder="Ulangi password" />
            </div>
          </div>
          <div className="auth-field">
            <label>Daftar sebagai</label>
            <select value={form.role} onChange={e => set("role", e.target.value)}>
              <option value="kementan">Staf Kementerian Pertanian</option>
              <option value="investor">Investor / Pengembang Bisnis</option>
              <option value="peneliti">Peneliti / Akademisi</option>
            </select>
          </div>
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Memproses…</> : "Buat Akun"}
          </button>
        </form>

        <div className="auth-foot">
          Sudah punya akun?
          <button onClick={onSwitch}>Masuk</button>
        </div>
      </div>
    </div>
  );
};
