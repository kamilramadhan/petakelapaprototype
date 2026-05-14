// Main app — auth flow + role-based dashboard

const { useState, useEffect, useMemo } = React;

// Role-based config: tabs, allowed layer groups, allowed modes
const ROLE_CONFIG = {
  kementan: {
    tabs: [
      { id: "peta",     label: "Peta",              ic: "🗺️" },
      { id: "cias",     label: "CIAS & Kebijakan",  ic: "📊" },
      { id: "gap",      label: "Industri & Gap",    ic: "🏭" },
      { id: "simulasi", label: "Simulasi",          ic: "🧪" },
      { id: "admin",    label: "Admin",             ic: "⚙️" },
    ],
    layerGroups: null, // all
    modes: ["default", "cias", "gap"],
    showCompare: false,
    show3DBar: false,
    showInterseksi: false,
  },
  investor: {
    tabs: [
      { id: "peta",        label: "Peta",              ic: "🗺️" },
      { id: "rekomendasi", label: "Rekomendasi Lokasi",ic: "💼" },
      { id: "komparasi",   label: "Komparasi",         ic: "⚖" },
      { id: "rantai",      label: "Rantai Pasok",      ic: "🔗" },
    ],
    layerGroups: ["Pertanian", "Industri", "Infrastruktur (OSM)", "Pendukung"],
    modes: ["default", "investasi"],
    showCompare: true,
    show3DBar: false,
    showInterseksi: false,
  },
  peneliti: {
    tabs: [
      { id: "peta",       label: "Peta",          ic: "🗺️" },
      { id: "analisis",   label: "Analisis Layer",ic: "📊" },
      { id: "interseksi", label: "Interseksi",    ic: "🔬" },
      { id: "statistik",  label: "Statistik",     ic: "Σ" },
      { id: "upload",     label: "Upload Riset",  ic: "⇪" },
    ],
    layerGroups: null,
    modes: ["default", "interseksi"],
    showCompare: false,
    show3DBar: true,
    showInterseksi: true,
  },
};

function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("login");
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    // Auto-seed Cesium Ion tokens
    // Read token — for viewer terrain/imagery
    if (!localStorage.getItem("pkd_cesium_token")) {
      localStorage.setItem("pkd_cesium_token",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYWYzYjJmMC0xNzYwLTQ2MGUtOTZjNC0zOTAzNWM2ZDM2MTAiLCJpZCI6Mzk0MjA3LCJpYXQiOjE3NzIwMjA0NjV9.OJTIGUAuVdyedsXSZl_MhFL3Zcx3MsYUmAr0B4LuHjI"
      );
    }
    // Upload token — for publishing custom assets to Cesium Ion
    if (!localStorage.getItem("pkd_cesium_upload_token")) {
      localStorage.setItem("pkd_cesium_upload_token",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiNGM4NjgyOS03OWQ0LTQ0ZGEtODJlOS1jYmJkMzJlM2JkZTEiLCJpZCI6Mzk0MjA3LCJpYXQiOjE3NzY5MTYxMzF9.BdlXfKXdTyxJOExQlnkMyNcpXJfglaWJmpoJAkJlnMA"
      );
    }
    setTimeout(() => {
      const sess = AuthAPI.getCurrent();
      if (sess) setUser(sess);
      setBootLoading(false);
    }, 250);
  }, []);

  function handleLogout() {
    AuthAPI.logout();
    setUser(null);
    setAuthView("login");
  }

  if (bootLoading) {
    return <div className="full-loading"><span className="spinner" /></div>;
  }

  if (!user) {
    if (authView === "register") {
      return <RegisterScreen onAuthed={setUser} onSwitch={() => setAuthView("login")} />;
    }
    return <LoginScreen onAuthed={setUser} onSwitch={() => setAuthView("register")} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

function Dashboard({ user, onLogout }) {
  const cfg = ROLE_CONFIG[user.role];

  const [tab, setTab] = useState("peta");
  const [mode, setMode] = useState("default");

  // Layer state — initial defaults filtered by allowed groups
  const defaultActive = new Set();
  PKD.LAYERS.forEach(g => {
    if (!cfg.layerGroups || cfg.layerGroups.includes(g.group)) {
      g.items.forEach(i => { if (i.default) defaultActive.add(i.id); });
    }
  });
  const [activeLayers, setActiveLayers] = useState(defaultActive);
  const [opacities, setOpacities] = useState({});

  // Selection state
  const [selectedKab, setSelectedKab] = useState(null);
  const [selectedPort, setSelectedPort] = useState(null);
  const [selectedFactory, setSelectedFactory] = useState(null);

  // Panel state
  const [ciasOpen, setCiasOpen] = useState(false);
  const [ciasRange, setCiasRange] = useState([0, 1]);
  const [gapOpen, setGapOpen] = useState(false);
  const [investOpen, setInvestOpen] = useState(false);
  const [investDerivatif, setInvestDerivatif] = useState("VCO");
  const [intersOpen, setIntersOpen] = useState(false);
  const [conditions, setConditions] = useState([
    { layer: "ph", op: ">", val: 5.5 },
    { layer: "rain", op: ">", val: 1500 },
    { layer: "dist-port", op: "<", val: 150 },
  ]);
  const [intersectionHits, setIntersectionHits] = useState(null);
  const [intersectionRuntime, setIntersectionRuntime] = useState(0);
  const [computing, setComputing] = useState(false);
  const [simOpen, setSimOpen] = useState(false);
  const [simParams, setSimParams] = useState({ konversi: 0, kapasitas: 0, road: "rendah" });
  const [scenarios, setScenarios] = useState(PKD.SCENARIOS);
  const [scenarioDelta, setScenarioDelta] = useState(0);
  const [cmpOpen, setCmpOpen] = useState(false);
  const [cmpItems, setCmpItems] = useState([]);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminMode, setAdminMode] = useState("admin");
  const [statOpen, setStatOpen] = useState(false);
  const [chainOpen, setChainOpen] = useState(false);

  const [derivatifFilter, setDerivatifFilter] = useState("semua");
  const [bar3D, setBar3D] = useState({ enabled: false, variable: "curah-hujan" });

  // Tab → panel mapping per role
  useEffect(() => {
    // close all panels
    setCiasOpen(false); setGapOpen(false); setInvestOpen(false);
    setIntersOpen(false); setSimOpen(false); setAdminOpen(false);
    setStatOpen(false); setChainOpen(false);

    if (user.role === "kementan") {
      if (tab === "cias")     { setMode("cias"); setCiasOpen(true); }
      else if (tab === "gap") { setMode("gap"); setGapOpen(true); }
      else if (tab === "simulasi") { setMode("default"); setSimOpen(true); }
      else if (tab === "admin") { setMode("default"); setAdminMode("admin"); setAdminOpen(true); }
      else setMode("default");
    } else if (user.role === "investor") {
      if (tab === "rekomendasi") { setMode("investasi"); setInvestOpen(true); }
      else if (tab === "komparasi") { setMode("default"); setCmpOpen(true); }
      else if (tab === "rantai") { setMode("default"); setChainOpen(true); }
      else setMode("default");
    } else if (user.role === "peneliti") {
      if (tab === "analisis") { setMode("default"); setStatOpen(true); }
      else if (tab === "interseksi") { setMode("interseksi"); setIntersOpen(true); }
      else if (tab === "statistik") { setMode("default"); setStatOpen(true); }
      else if (tab === "upload") { setMode("default"); setAdminMode("research"); setAdminOpen(true); }
      else setMode("default");
    }
  }, [tab, user.role]);

  function runIntersection() {
    setComputing(true);
    setIntersectionHits(null);
    const start = performance.now();
    setTimeout(() => {
      const hits = new Set();
      PKD.KABUPATEN.forEach(k => {
        let ok = true;
        conditions.forEach(c => {
          const lookup = {
            "ph": 5 + k.envSuit * 1.4,
            "rain": 1500 + k.envSuit * 1300,
            "elev": 100 + (k.centroid[1] + 5) * 60,
            "dist-port": k.distToPort,
            "soc": 10 + k.envSuit * 22,
            "production": k.production,
          };
          const v = lookup[c.layer];
          if (c.op === ">") ok = ok && (v > c.val);
          else if (c.op === "<") ok = ok && (v < c.val);
          else if (c.op === "=") ok = ok && Math.abs(v - c.val) < (c.val * 0.05);
          else if (c.op === "between") ok = ok && (v >= c.val && v <= c.val2);
        });
        if (ok) hits.add(k.id);
      });
      setIntersectionHits(hits);
      setIntersectionRuntime((performance.now() - start) / 1000 + 1.2 + Math.random() * 1.5);
      setComputing(false);
    }, 1400);
  }

  function saveScenario(delta) {
    const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
    setScenarios([...scenarios, { id: "sc-" + Date.now(), name: `Skenario ${scenarios.length + 1}`, delta, ts }]);
    setScenarioDelta(delta);
  }

  function addToCompare(kab) {
    if (cmpItems.find(k => k.id === kab.id)) return;
    if (cmpItems.length >= 4) return;
    setCmpItems([...cmpItems, kab]);
    if (cfg.showCompare) setCmpOpen(true);
  }

  // Available modes for current role
  const availableModes = cfg.modes;

  return (
    <div className="app">
      <Navbar user={user} cfg={cfg} tab={tab} setTab={setTab} bar3D={bar3D} setBar3D={setBar3D} cmpCount={cmpItems.length} onOpenCompare={() => setCmpOpen(true)} onLogout={onLogout} />

      <div className="stage">
        <LayerSidebar
          active={activeLayers}
          setActive={setActiveLayers}
          opacities={opacities}
          setOpacities={setOpacities}
          allowedGroups={cfg.layerGroups}
        />

        <main className="map-area">
          {window.Cesium && localStorage.getItem("pkd_cesium_token") ? (
            <CesiumPetaMap
              mode={mode}
              activeLayers={activeLayers}
              derivatifFilter={derivatifFilter}
              onSelectKab={k => { setSelectedKab(k); setSelectedPort(null); setSelectedFactory(null); }}
              onSelectPort={p => { setSelectedPort(p); setSelectedKab(null); setSelectedFactory(null); }}
              onSelectFactory={f => { setSelectedFactory(f); setSelectedKab(null); setSelectedPort(null); }}
              selectedKab={selectedKab}
              selectedDerivatif={mode === "investasi" ? investDerivatif : null}
              intersectionHits={mode === "interseksi" ? intersectionHits : null}
              bar3D={bar3D}
              scenarioDelta={scenarioDelta}
            />
          ) : (
            <PetaMap
              mode={mode}
              activeLayers={activeLayers}
              derivatifFilter={derivatifFilter}
              onSelectKab={k => { setSelectedKab(k); setSelectedPort(null); setSelectedFactory(null); }}
              onSelectPort={p => { setSelectedPort(p); setSelectedKab(null); setSelectedFactory(null); }}
              onSelectFactory={f => { setSelectedFactory(f); setSelectedKab(null); setSelectedPort(null); }}
              selectedKab={selectedKab}
              selectedDerivatif={mode === "investasi" ? investDerivatif : null}
              intersectionHits={mode === "interseksi" ? intersectionHits : null}
              bar3D={bar3D}
              scenarioDelta={scenarioDelta}
            />
          )}

          <MapToolbar />
          <Legend mode={mode} derivatifFilter={mode === "investasi" ? investDerivatif : derivatifFilter} />

          {/* Derivatif selector — investor only, visible when investasi mode active */}
          {user.role === "investor" && mode === "investasi" && (
            <div style={{
              position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--bg)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-pill)", padding: "6px 10px",
              boxShadow: "var(--shadow-card)", zIndex: 11,
            }}>
              <span style={{ fontSize: 11, color: "var(--ink-2)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Derivatif</span>
              {PKD.DERIVATIF.map(d => (
                <button key={d}
                  onClick={() => setInvestDerivatif(d)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: "var(--radius-pill)",
                    border: "1px solid " + (investDerivatif === d ? "transparent" : "var(--border)"),
                    background: investDerivatif === d ? (PKD.DERIVATIF_COLOR[d] || "var(--primary)") : "var(--bg)",
                    color: investDerivatif === d ? (d === "kelapa-muda" || d === "nata" ? "#1a3a25" : "white") : "var(--ink)",
                    fontWeight: investDerivatif === d ? 600 : 400,
                    fontSize: 12,
                    cursor: "pointer",
                    transition: "all 120ms",
                  }}
                >{d}</button>
              ))}
            </div>
          )}

          {/* Available modes for current role */}
          {availableModes.length > 1 && (
            <ModePill modes={availableModes} mode={mode} setMode={setMode} />
          )}

          {cfg.show3DBar && bar3D.enabled && (
            <div className="bar3d-ctrl">
              <span className="dock-eyebrow">3D BAR</span>
              <select value={bar3D.variable} onChange={e => setBar3D({ ...bar3D, variable: e.target.value })}>
                <option value="curah-hujan">Curah Hujan (mm/thn)</option>
                <option value="suhu">Suhu Rata-rata (°C)</option>
                <option value="ph">pH H₂O 15–30cm</option>
                <option value="soc">Soil Organic Carbon</option>
                <option value="nitrogen">Nitrogen</option>
                <option value="night-light">Night Light VIIRS</option>
              </select>
              <button className="icon-btn" onClick={() => setBar3D({ ...bar3D, enabled: false })}>✕</button>
            </div>
          )}

          {/* Info card — floating bottom-right */}
          <InfoPanel
            kab={selectedKab}
            port={selectedPort}
            factory={selectedFactory}
            onClose={() => { setSelectedKab(null); setSelectedPort(null); setSelectedFactory(null); }}
            onCompare={addToCompare}
            onSelectFactory={f => { setSelectedFactory(f); setSelectedKab(null); setSelectedPort(null); }}
            scenarioDelta={scenarioDelta}
            role={user.role}
          />

          {/* Dock panels — conditional */}
          {ciasOpen && <CIASPanel onClose={() => { setCiasOpen(false); if (tab !== "peta") setTab("peta"); }} onSelect={setSelectedKab} selected={selectedKab} scenarioDelta={scenarioDelta} range={ciasRange} setRange={setCiasRange} />}
          {gapOpen && <GapPanel derivatif={derivatifFilter} setDerivatif={setDerivatifFilter} onClose={() => { setGapOpen(false); if (tab !== "peta") setTab("peta"); }} onSelect={setSelectedKab} />}
          {investOpen && <InvestasiPanel derivatif={investDerivatif} setDerivatif={setInvestDerivatif} onClose={() => { setInvestOpen(false); if (tab !== "peta") setTab("peta"); }} onSelect={setSelectedKab} />}
          {intersOpen && <InterseksiPanel computing={computing} onClose={() => { setIntersOpen(false); if (tab !== "peta") setTab("peta"); }} onRun={runIntersection} conditions={conditions} setConditions={setConditions} hits={intersectionHits} runtime={intersectionRuntime} />}
          {adminOpen && <AdminPanel mode={adminMode} onClose={() => { setAdminOpen(false); if (tab !== "peta") setTab("peta"); }} />}
          {simOpen && <SimulasiPanel onClose={() => { setSimOpen(false); if (tab !== "peta") setTab("peta"); }} params={simParams} setParams={setSimParams} scenarios={scenarios} onSave={saveScenario} />}
          {cmpOpen && <KomparasiPanel items={cmpItems} onAdd={addToCompare} onRemove={id => setCmpItems(cmpItems.filter(k => k.id !== id))} onClose={() => { setCmpOpen(false); if (tab === "komparasi") setTab("peta"); }} />}
          {chainOpen && <SupplyChainPanel selectedKab={selectedKab} onClose={() => { setChainOpen(false); if (tab === "rantai") setTab("peta"); }} />}
          {statOpen && <StatistikPanel onClose={() => { setStatOpen(false); if (tab !== "peta") setTab("peta"); }} onSelect={setSelectedKab} selected={selectedKab} activeLayers={activeLayers} />}
        </main>
      </div>

      <CesiumBanner />
    </div>
  );
}

function CesiumBanner() {
  const [token, setToken] = useState("");
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem("pkd_cesium_dismissed") === "1" ||
    !!localStorage.getItem("pkd_cesium_token")
  );
  function save() {
    if (token.length < 20) return;
    localStorage.setItem("pkd_cesium_token", token);
    sessionStorage.setItem("pkd_cesium_dismissed", "1");
    setDismissed(true);
    setTimeout(() => location.reload(), 250);
  }
  if (dismissed) return null;
  return (
    <div className="cesium-banner">
      <span className="cb-pill">CESIUM</span>
      <span className="cb-text">Masukkan Cesium Ion Access Token untuk mengaktifkan terrain & 3D tiles realistis.</span>
      <input className="cb-input" placeholder="YOUR_CESIUM_ION_TOKEN" value={token} onChange={e => setToken(e.target.value)} />
      <button className="btn-primary sm" onClick={save} disabled={token.length < 20}>Simpan</button>
      <button className="icon-btn" onClick={() => { sessionStorage.setItem("pkd_cesium_dismissed", "1"); setDismissed(true); }}>✕</button>
    </div>
  );
}

function Navbar({ user, cfg, tab, setTab, bar3D, setBar3D, cmpCount, onOpenCompare, onLogout }) {
  const role = ROLE_INFO[user.role];
  const initials = user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <header className="navbar">
      <div className="nav-brand">
        <svg width="28" height="28" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="nav-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2D6A4F" /><stop offset="100%" stopColor="#52A77D" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="14" fill="#F8F9FA" stroke="#2D6A4F" strokeWidth="1.5" />
          <path d="M 16 8 C 13 11, 11 14, 11 17 C 11 20, 13 22, 16 22 C 19 22, 21 20, 21 17 C 21 14, 19 11, 16 8 Z" fill="url(#nav-grad)" />
        </svg>
        <span className="nav-brand-name">PetaKelapa<span style={{ color: "var(--primary)" }}>.id</span></span>
      </div>

      <nav className="nav-tabs">
        {cfg.tabs.map(t => (
          <button key={t.id} className={"nav-tab " + (tab === t.id ? "on" : "")} onClick={() => setTab(t.id)}>
            <span className="tab-ic">{t.ic}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="nav-right">
        <div className="nav-tools">
          {cfg.show3DBar && (
            <button className={"tool-btn " + (bar3D.enabled ? "on" : "")} title="3D Bar Visualization" onClick={() => setBar3D({ ...bar3D, enabled: !bar3D.enabled })}>📶</button>
          )}
          {cfg.showCompare && (
            <button className="tool-btn" title="Komparasi" onClick={onOpenCompare}>
              ⚖
              {cmpCount > 0 && <span className="badge">{cmpCount}</span>}
            </button>
          )}
        </div>

        <button className="notif-btn" title="Notifikasi">🔔<span className="notif-dot" /></button>

        <div className="user-chip">
          <div className="avatar">{initials}</div>
          <div className="user-info">
            <div className="user-name">{user.name}</div>
            <div className="user-instansi">{user.instansi}</div>
          </div>
          <span className={"role-pill " + role.className}>{role.label}</span>
        </div>

        <button className="logout-btn" onClick={onLogout}>Keluar</button>
      </div>
    </header>
  );
}

function MapToolbar() {
  return (
    <div className="map-toolbar">
      <button className="mt-btn" title="Zoom in" onClick={() => window.__pkdMapZoom && window.__pkdMapZoom(1.3)}>＋</button>
      <button className="mt-btn" title="Zoom out" onClick={() => window.__pkdMapZoom && window.__pkdMapZoom(0.77)}>−</button>
      <div className="mt-sep" />
      <button className="mt-btn" title="Tilt up" onClick={() => window.__pkdMapTilt && window.__pkdMapTilt(5)}>↑</button>
      <button className="mt-btn" title="Tilt down" onClick={() => window.__pkdMapTilt && window.__pkdMapTilt(-5)}>↓</button>
      <div className="mt-sep" />
      <button className="mt-btn" title="Reset view ke Indonesia" onClick={() => window.__pkdMapReset && window.__pkdMapReset()}>⌖</button>
    </div>
  );
}

function ModePill({ modes, mode, setMode }) {
  const labels = {
    "default":    { label: "Peta",       ic: "🗺️" },
    "cias":       { label: "CIAS",       ic: "📊" },
    "gap":        { label: "Gap",        ic: "🏭" },
    "investasi":  { label: "Investasi",  ic: "💼" },
    "interseksi": { label: "Interseksi", ic: "🔬" },
  };
  return (
    <div className="mode-pill">
      {modes.map(m => (
        <button key={m} className={"mode-pill-tab " + (mode === m ? "on" : "")} onClick={() => setMode(m)}>
          <span>{labels[m].ic}</span>{labels[m].label}
        </button>
      ))}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
