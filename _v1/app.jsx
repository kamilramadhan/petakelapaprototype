// Main app — Peta Kelapa Indonesia
const { useState, useEffect, useMemo } = React;

function App() {
  // Active tab
  const [tab, setTab] = useState("peta"); // peta | cias | gap | investasi | riset | admin
  // Map mode (bottom toolbar)
  const [mode, setMode] = useState("default"); // default | cias | gap | investasi | interseksi

  // Layer state
  const defaultActive = new Set();
  PKD.LAYERS.forEach(g => g.items.forEach(i => { if (i.default) defaultActive.add(i.id); }));
  const [activeLayers, setActiveLayers] = useState(defaultActive);
  const [opacities, setOpacities] = useState({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const [simOpen, setSimOpen] = useState(false);
  const [simParams, setSimParams] = useState({ konversi: 0, kapasitas: 0, road: "rendah" });
  const [scenarios, setScenarios] = useState(PKD.SCENARIOS);
  const [scenarioDelta, setScenarioDelta] = useState(0);
  const [cmpOpen, setCmpOpen] = useState(false);
  const [cmpItems, setCmpItems] = useState([]);
  const [adminOpen, setAdminOpen] = useState(false);

  // Gap derivative filter
  const [derivatifFilter, setDerivatifFilter] = useState("semua");

  // 3D bar mode
  const [bar3D, setBar3D] = useState({ enabled: false, variable: "curah-hujan" });

  // Sync tab → mode/panel
  useEffect(() => {
    if (tab === "cias") { setMode("cias"); setCiasOpen(true); setGapOpen(false); setInvestOpen(false); setIntersOpen(false); setAdminOpen(false); }
    else if (tab === "gap") { setMode("gap"); setGapOpen(true); setCiasOpen(false); setInvestOpen(false); setIntersOpen(false); setAdminOpen(false); }
    else if (tab === "investasi") { setMode("investasi"); setInvestOpen(true); setCiasOpen(false); setGapOpen(false); setIntersOpen(false); setAdminOpen(false); }
    else if (tab === "riset") { setMode("interseksi"); setIntersOpen(true); setCiasOpen(false); setGapOpen(false); setInvestOpen(false); setAdminOpen(false); }
    else if (tab === "admin") { setMode("default"); setAdminOpen(true); setCiasOpen(false); setGapOpen(false); setInvestOpen(false); setIntersOpen(false); }
    else { setMode("default"); setCiasOpen(false); setGapOpen(false); setInvestOpen(false); setIntersOpen(false); setAdminOpen(false); }
  }, [tab]);

  function runIntersection() {
    const start = performance.now();
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
    // simulate ~1.5s computation
    setTimeout(() => {
      setIntersectionHits(hits);
      setIntersectionRuntime((performance.now() - start) / 1000 + 1.2 + Math.random() * 1.5);
    }, 700);
  }

  function saveScenario(delta) {
    const now = new Date();
    const ts = now.toISOString().slice(0, 16).replace("T", " ");
    setScenarios([
      ...scenarios,
      { id: "sc-" + Date.now(), name: `Skenario ${scenarios.length + 1}`, delta, ts }
    ]);
    setScenarioDelta(delta);
  }

  function addToCompare(kab) {
    if (cmpItems.find(k => k.id === kab.id)) return;
    if (cmpItems.length >= 4) return;
    setCmpItems([...cmpItems, kab]);
    setCmpOpen(true);
  }

  return (
    <div className="app">
      <TopNav tab={tab} setTab={setTab} bar3D={bar3D} setBar3D={setBar3D} onOpenCompare={() => setCmpOpen(true)} onOpenSim={() => setSimOpen(true)} cmpCount={cmpItems.length} />

      <div className="stage">
        <LayerSidebar
          active={activeLayers}
          setActive={setActiveLayers}
          opacities={opacities}
          setOpacities={setOpacities}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="map-area">
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

          <Legend mode={mode} scenarioDelta={scenarioDelta} derivatifFilter={mode === "investasi" ? investDerivatif : derivatifFilter} />

          <MapToolbar bar3D={bar3D} setBar3D={setBar3D} />

          <BottomToolbar mode={mode} setMode={setMode} onOpenSim={() => setSimOpen(true)} onOpenCmp={() => setCmpOpen(true)} />

          {bar3D.enabled && (
            <div className="bar3d-controls">
              <span className="dock-eyebrow">3D BAR VISUALISASI</span>
              <select value={bar3D.variable} onChange={e => setBar3D({ ...bar3D, variable: e.target.value })}>
                <option value="curah-hujan">Curah Hujan (mm/thn)</option>
                <option value="suhu">Suhu Rata-rata (°C)</option>
                <option value="ph">pH H₂O 15–30cm</option>
                <option value="soc">Soil Organic Carbon</option>
                <option value="night-light">Night Light VIIRS</option>
              </select>
              <button className="icon-btn" onClick={() => setBar3D({ ...bar3D, enabled: false })}>✕</button>
            </div>
          )}

          {/* Dock-style panels — slide up from bottom of map */}
          <CIASPanel open={ciasOpen} onClose={() => { setCiasOpen(false); if (tab === "cias") setTab("peta"); }} onSelect={setSelectedKab} selected={selectedKab} scenarioDelta={scenarioDelta} range={ciasRange} setRange={setCiasRange} />
          {gapOpen && <GapPanel derivatif={derivatifFilter} setDerivatif={setDerivatifFilter} onClose={() => { setGapOpen(false); if (tab === "gap") setTab("peta"); }} onSelect={setSelectedKab} />}
          {investOpen && <InvestasiPanel derivatif={investDerivatif} setDerivatif={setInvestDerivatif} onClose={() => { setInvestOpen(false); if (tab === "investasi") setTab("peta"); }} onSelect={setSelectedKab} selectedKab={selectedKab} />}
          {intersOpen && <InterseksiPanel onClose={() => { setIntersOpen(false); if (tab === "riset") setTab("peta"); }} onRun={runIntersection} conditions={conditions} setConditions={setConditions} hits={intersectionHits} runtime={intersectionRuntime} />}
          {adminOpen && <AdminPanel onClose={() => { setAdminOpen(false); if (tab === "admin") setTab("peta"); }} />}

          {simOpen && <SimulasiPanel onClose={() => setSimOpen(false)} params={simParams} setParams={setSimParams} scenarios={scenarios} onSave={saveScenario} />}
          {cmpOpen && <KomparasiPanel items={cmpItems} onAdd={addToCompare} onRemove={id => setCmpItems(cmpItems.filter(k => k.id !== id))} onClose={() => setCmpOpen(false)} />}
        </main>

        <InfoPanel
          kab={selectedKab}
          port={selectedPort}
          factory={selectedFactory}
          onClose={() => { setSelectedKab(null); setSelectedPort(null); setSelectedFactory(null); }}
          onCompare={addToCompare}
          scenarioDelta={scenarioDelta}
        />
      </div>

      {/* Cesium token banner */}
      <CesiumBanner />
    </div>
  );
}

function CesiumBanner() {
  const [token, setToken] = useState("");
  const [dismissed, setDismissed] = useState(false);
  if (dismissed || token.length > 20) return null;
  return (
    <div className="cesium-banner">
      <span className="cb-pill">CESIUM</span>
      <span className="cb-text">Masukkan Cesium Ion Access Token untuk mengaktifkan terrain & 3D tiles realistis.</span>
      <input className="cb-input" placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp..." value={token} onChange={e => setToken(e.target.value)} />
      <button className="primary-btn sm" onClick={() => setDismissed(true)}>Lewati</button>
      <button className="icon-btn" onClick={() => setDismissed(true)}>✕</button>
    </div>
  );
}

function TopNav({ tab, setTab, bar3D, setBar3D, onOpenCompare, onOpenSim, cmpCount }) {
  const tabs = [
    { id: "peta", label: "Peta", icon: "🗺️" },
    { id: "cias", label: "CIAS & Kebijakan", icon: "📊" },
    { id: "gap", label: "Industri & Gap", icon: "🏭" },
    { id: "investasi", label: "Investasi", icon: "💼" },
    { id: "riset", label: "Riset & Analisis", icon: "🔬" },
    { id: "admin", label: "Admin", icon: "⚙️" },
  ];
  return (
    <header className="topnav">
      <div className="brand">
        <div className="brand-logo">
          <svg viewBox="0 0 32 32" width="28" height="28">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00C896" /><stop offset="100%" stopColor="#FFB800" />
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="13" fill="none" stroke="url(#lg)" strokeWidth="2" />
            <circle cx="16" cy="16" r="6" fill="#00C896" />
            <circle cx="16" cy="16" r="2" fill="#0A1628" />
            <line x1="16" y1="3" x2="16" y2="29" stroke="#7A9B8E" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1="3" y1="16" x2="29" y2="16" stroke="#7A9B8E" strokeWidth="0.5" strokeDasharray="2 2" />
          </svg>
        </div>
        <div className="brand-text">
          <div className="brand-title">PetaKelapa<span className="brand-id">.id</span></div>
          <div className="brand-sub">Sistem Informasi Geospasial Industri Kelapa Indonesia</div>
        </div>
      </div>

      <nav className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={"tab " + (tab === t.id ? "on" : "")} onClick={() => setTab(t.id)}>
            <span className="tab-ic">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="tn-actions">
        <button className={"icon-tool " + (bar3D.enabled ? "on" : "")} title="3D Bar Visualization" onClick={() => setBar3D({ ...bar3D, enabled: !bar3D.enabled })}>
          📶
        </button>
        <button className="icon-tool" title="Simulasi Kebijakan" onClick={onOpenSim}>🧪</button>
        <button className="icon-tool" title="Komparasi" onClick={onOpenCompare}>
          ⚖
          {cmpCount > 0 && <span className="badge">{cmpCount}</span>}
        </button>
        <div className="divider" />
        <div className="notif">
          <span className="notif-ic">🔔</span>
          <span className="notif-dot" />
        </div>
        <div className="profile">
          <div className="avatar">DR</div>
          <div className="prof-info">
            <div className="prof-name">Dr. R. Wijaya</div>
            <div className="prof-role">Peneliti · IPB</div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MapToolbar({ bar3D, setBar3D }) {
  return (
    <div className="map-toolbar">
      <button className="mt-btn" title="Zoom in" onClick={() => window.__pkdMapZoom && window.__pkdMapZoom(1.3)}>＋</button>
      <button className="mt-btn" title="Zoom out" onClick={() => window.__pkdMapZoom && window.__pkdMapZoom(0.77)}>−</button>
      <div className="mt-sep" />
      <button className="mt-btn" title="Tilt up" onClick={() => window.__pkdMapTilt && window.__pkdMapTilt(5)}>↑</button>
      <button className="mt-btn" title="Tilt down" onClick={() => window.__pkdMapTilt && window.__pkdMapTilt(-5)}>↓</button>
      <div className="mt-sep" />
      <button className="mt-btn" title="Reset view ke Indonesia" onClick={() => window.__pkdMapReset && window.__pkdMapReset()}>⌖</button>
      <button className="mt-btn" title="Full screen">⛶</button>
    </div>
  );
}

function BottomToolbar({ mode, setMode, onOpenSim, onOpenCmp }) {
  const modes = [
    { id: "default", label: "Default", icon: "🌐" },
    { id: "cias", label: "CIAS", icon: "📊" },
    { id: "gap", label: "Gap", icon: "🏭" },
    { id: "investasi", label: "Investasi", icon: "💼" },
    { id: "interseksi", label: "Interseksi", icon: "🔬" },
  ];
  return (
    <div className="bottom-toolbar">
      <div className="bt-modes">
        <span className="bt-label">MODE</span>
        {modes.map(m => (
          <button key={m.id} className={"bt-mode " + (mode === m.id ? "on" : "")} onClick={() => setMode(m.id)}>
            <span>{m.icon}</span>{m.label}
          </button>
        ))}
      </div>
      <div className="bt-spacer" />
      <div className="bt-status">
        <span className="status-dot live" />
        <span className="status-text">CesiumJS · OSM Imagery · CWT terrain</span>
        <span className="status-sep">|</span>
        <span className="mono">EPSG:4326</span>
        <span className="status-sep">|</span>
        <span className="mono">{PKD.KABUPATEN.length} kab · {PKD.FACTORIES.length} pabrik · {PKD.PORTS.length} pelabuhan</span>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
