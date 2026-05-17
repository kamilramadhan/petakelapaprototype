// Auth screens — Login + Register with group/institution support.
// Persists user to localStorage.

const { useState, useEffect } = React;

const DEFAULT_ROLE = "user";

// Preset institution groups — layers owned by an institution are visible to all its members
const INSTITUTIONS = [
  { id: "kementan",   name: "Kementerian Pertanian RI",        type: "pemerintah" },
  { id: "bps",        name: "BPS — Badan Pusat Statistik",     type: "pemerintah" },
  { id: "brin",       name: "BRIN / LAPAN (Penginderaan Jauh)", type: "pemerintah" },
  { id: "ipb",        name: "IPB University",                   type: "akademik"  },
  { id: "ugm",        name: "Universitas Gadjah Mada",          type: "akademik"  },
  { id: "its",        name: "Institut Teknologi Sepuluh Nopember", type: "akademik" },
  { id: "nusantara",  name: "PT Nusantara Coco Ventures",       type: "swasta"    },
  { id: "idh",        name: "IDH Sustainable Trade Initiative", type: "ngo"       },
  { id: "other",      name: "Lainnya (isi manual)",             type: "other"     },
];
window.INSTITUTIONS = INSTITUTIONS;

const DEMO_ACCOUNTS = [
  {
    email: "demo@petakelapa.id", password: "password123",
    name: "Sdri. N. Anggraini", instansi: "PT Nusantara Coco Ventures",
    instansiId: "nusantara", role: DEFAULT_ROLE,
  },
  {
    email: "peneliti@ipb.ac.id", password: "ipb12345",
    name: "Dr. R. Wijaya", instansi: "IPB University",
    instansiId: "ipb", role: DEFAULT_ROLE,
  },
  {
    email: "admin@kementan.go.id", password: "kementan123",
    name: "Bp. A. Pratama", instansi: "Kementerian Pertanian RI",
    instansiId: "kementan", role: DEFAULT_ROLE,
  },
];

function getAccounts() {
  try {
    const raw = localStorage.getItem("pkd_accounts");
    if (raw) {
      const accs = JSON.parse(raw);
      DEMO_ACCOUNTS.forEach(demo => {
        if (!accs.some(a => a.email.toLowerCase() === demo.email.toLowerCase())) accs.push(demo);
      });
      localStorage.setItem("pkd_accounts", JSON.stringify(accs));
      return accs;
    }
  } catch (e) {}
  localStorage.setItem("pkd_accounts", JSON.stringify(DEMO_ACCOUNTS));
  return [...DEMO_ACCOUNTS];
}
function saveAccounts(accs) { localStorage.setItem("pkd_accounts", JSON.stringify(accs)); }

window.AuthAPI = {
  SESSION_TTL_DAYS: 7,
  getCurrent() {
    try {
      const raw = localStorage.getItem("pkd_session");
      if (!raw) return null;
      const data = JSON.parse(raw);
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
  login(email, password) {
    const accounts = getAccounts();
    const u = accounts.find(a => a.email.toLowerCase() === email.toLowerCase() && a.password === password);
    if (!u) return { ok: false, error: "Email atau password salah." };
    const expiresAt = Date.now() + this.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    const session = {
      name: u.name, email: u.email, instansi: u.instansi,
      instansiId: u.instansiId || "other", role: u.role || DEFAULT_ROLE, expiresAt,
    };
    localStorage.setItem("pkd_session", JSON.stringify(session));
    return { ok: true, user: session };
  },
  register(payload) {
    const accounts = getAccounts();
    if (accounts.find(a => a.email.toLowerCase() === payload.email.toLowerCase()))
      return { ok: false, error: "Email sudah terdaftar." };
    const newAcc = { ...payload, role: DEFAULT_ROLE };
    accounts.push(newAcc);
    saveAccounts(accounts);
    return { ok: true, user: newAcc };
  },
  finalizeRegistration(payload) {
    const expiresAt = Date.now() + this.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
    const session = {
      name: payload.name, email: payload.email,
      instansi: payload.instansi, instansiId: payload.instansiId || "other",
      role: DEFAULT_ROLE, expiresAt,
    };
    localStorage.setItem("pkd_session", JSON.stringify(session));
    return { ok: true, user: session };
  },
  logout() { localStorage.removeItem("pkd_session"); },
  // Return all layers (user-created) that belong to same institution as current user
  getSharedLayersForUser(currentUser) {
    if (!currentUser) return [];
    try {
      const raw = localStorage.getItem("pkd_user_layers");
      const layers = raw ? JSON.parse(raw) : [];
      return layers.filter(l => l.shared && l.instansi === currentUser.instansi && l.createdBy !== currentUser.email);
    } catch (e) { return []; }
  },
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
    e.preventDefault(); setError(""); setLoading(true);
    setTimeout(() => {
      const r = AuthAPI.login(email, password);
      if (r.ok) { onAuthed(r.user); } else { setError(r.error); setLoading(false); }
    }, 500);
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
            {loading ? "Masuk…" : "Masuk"}
          </button>
        </form>

        <div className="demo-hint">
          <b>Demo accounts:</b>
          {DEMO_ACCOUNTS.map(d => (
            <div key={d.email} className="demo-row" style={{ marginTop: 5 }}>
              <button className="use-demo" onClick={() => { setEmail(d.email); setPassword(d.password); }}
                style={{ fontFamily: "var(--mono)", fontSize: 11, background: "none", border: "none", color: "var(--primary)", cursor: "pointer", textAlign: "left" }}>
                {d.email}
              </button>
              <span style={{ fontSize: 10, color: "var(--ink-3)", marginLeft: 6 }}>· {d.instansi}</span>
            </div>
          ))}
        </div>

        <div className="auth-foot">
          Belum punya akun? <button onClick={onSwitch}>Daftar</button>
        </div>
      </div>
    </div>
  );
};

window.RegisterScreen = function RegisterScreen({ onAuthed, onSwitch }) {
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "",
    instansiId: "", instansiCustom: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyStep, setVerifyStep] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const selectedInst = INSTITUTIONS.find(i => i.id === form.instansiId);
  const instansiName = form.instansiId === "other" ? form.instansiCustom : (selectedInst?.name || "");

  function submit(e) {
    e.preventDefault(); setError("");
    if (form.password.length < 6) { setError("Password minimal 6 karakter."); return; }
    if (form.password !== form.confirm) { setError("Konfirmasi password tidak cocok."); return; }
    if (!instansiName) { setError("Pilih atau isi nama instansi/grup."); return; }
    setLoading(true);
    setTimeout(() => {
      const r = AuthAPI.register({
        name: form.name, instansi: instansiName, instansiId: form.instansiId,
        email: form.email, password: form.password,
      });
      if (r.ok) { setLoading(false); setVerifyStep(true); }
      else { setError(r.error); setLoading(false); }
    }, 500);
  }

  function finishVerification() {
    const r = AuthAPI.finalizeRegistration({
      name: form.name, instansi: instansiName, instansiId: form.instansiId, email: form.email,
    });
    if (r.ok) onAuthed(r.user);
  }

  if (verifyStep) {
    return (
      <div className="auth-stage">
        <div className="auth-card">
          <BrandHeader />
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--ok-bg)", color: "var(--ok-ink)", display: "grid", placeItems: "center", margin: "0 auto 16px", fontSize: 26 }}>✉</div>
          <h1 className="auth-h1" style={{ textAlign: "center" }}>Konfirmasi email Anda</h1>
          <p className="auth-sub" style={{ textAlign: "center" }}>
            Link konfirmasi dikirim ke <b style={{ color: "var(--ink)" }}>{form.email}</b>.
          </p>
          <div style={{ background: "var(--surface)", padding: "12px 14px", borderRadius: 8, marginBottom: 16, fontSize: 12.5 }}>
            <b style={{ color: "var(--ink)", display: "block", marginBottom: 5 }}>Ringkasan akun:</b>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}><span style={{ color: "var(--ink-2)" }}>Nama</span><b>{form.name}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}><span style={{ color: "var(--ink-2)" }}>Grup/Institusi</span><b>{instansiName}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: 12 }}><span style={{ color: "var(--ink-2)" }}>Email</span><b>{form.email}</b></div>
          </div>
          <button className="auth-submit" onClick={finishVerification}>✓ Saya sudah verifikasi — Masuk</button>
          <p style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 10, textAlign: "center", fontStyle: "italic" }}>
            Demo: tombol di atas langsung masuk tanpa email sungguhan.
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
        <p className="auth-sub">Layer yang Anda buat dapat dibagikan kepada sesama anggota institusi.</p>
        {error && <div className="auth-error">⚠ {error}</div>}
        <form onSubmit={submit}>
          <div className="auth-field">
            <label>Nama Lengkap</label>
            <input required value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nama Anda" />
          </div>

          {/* Institution / group selector */}
          <div className="auth-field">
            <label>Grup / Institusi</label>
            <select required value={form.instansiId} onChange={e => set("instansiId", e.target.value)}
              style={{ width: "100%", height: 44, padding: "0 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", fontSize: 14 }}>
              <option value="">— Pilih institusi / grup —</option>
              {["pemerintah", "akademik", "swasta", "ngo", "other"].map(type => (
                <optgroup key={type} label={type.charAt(0).toUpperCase() + type.slice(1)}>
                  {INSTITUTIONS.filter(i => i.type === type).map(i => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {form.instansiId === "other" && (
            <div className="auth-field">
              <label>Nama Institusi / Grup</label>
              <input value={form.instansiCustom} onChange={e => set("instansiCustom", e.target.value)} placeholder="Nama organisasi Anda" required />
            </div>
          )}

          {selectedInst && form.instansiId !== "other" && (
            <div style={{ background: "var(--primary-soft)", borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 11.5, color: "var(--primary-ink)" }}>
              Layer yang dibagikan (shared) akan dapat diakses oleh seluruh anggota <b>{selectedInst.name}</b>.
            </div>
          )}

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
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Memproses…" : "Buat Akun"}
          </button>
        </form>
        <div className="auth-foot">Sudah punya akun? <button onClick={onSwitch}>Masuk</button></div>
      </div>
    </div>
  );
};
