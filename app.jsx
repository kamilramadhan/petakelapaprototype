// Main app — auth flow + unified single-role dashboard with /peta and /analitik routes.

const { useState, useEffect, useMemo, useRef } = React;

function App() {
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("login");
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    // Auto-seed Cesium Ion tokens
    if (!localStorage.getItem("pkd_cesium_token")) {
      localStorage.setItem("pkd_cesium_token",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiYWYzYjJmMC0xNzYwLTQ2MGUtOTZjNC0zOTAzNWM2ZDM2MTAiLCJpZCI6Mzk0MjA3LCJpYXQiOjE3NzIwMjA0NjV9.OJTIGUAuVdyedsXSZl_MhFL3Zcx3MsYUmAr0B4LuHjI"
      );
    }
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

function readRoute() {
  const h = window.location.hash || "";
  if (h.includes("analitik")) return "analitik";
  return "peta";
}

function Dashboard({ user, onLogout }) {
  const [route, setRoute] = useState(readRoute());

  useEffect(() => {
    function onHash() { setRoute(readRoute()); }
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function nav(r) {
    window.location.hash = r === "peta" ? "/peta" : "/analitik";
    setRoute(r);
  }

  // Layer state
  const defaultActive = new Set();
  PKD.LAYERS.forEach(g => g.items.forEach(i => { if (i.default) defaultActive.add(i.id); }));
  const [activeLayers, setActiveLayers] = useState(defaultActive);
  const [opacities, setOpacities] = useState({});

  // Per-layer overridden thresholds (defaults loaded from PKD.THRESHOLDS)
  const [thresholds, setThresholds] = useState(() => {
    const t = {};
    Object.entries(PKD.THRESHOLDS).forEach(([k, v]) => { t[k] = { ...v }; });
    return t;
  });

  // Layer data overrides — when user uploads, mark the layer as "user-data"
  const [layerOverrides, setLayerOverrides] = useState({});

  // Selections
  const [selectedKab, setSelectedKab] = useState(null);
  const [selectedPort, setSelectedPort] = useState(null);
  const [selectedFactory, setSelectedFactory] = useState(null);

  // Map mode & investor derivatif
  const [mode, setMode] = useState("default");
  const [investDerivatif, setInvestDerivatif] = useState("VCO");
  const [derivatifFilter, setDerivatifFilter] = useState("semua");

  // Intersection state
  const [conditions, setConditions] = useState([]);
  const [intersectionHits, setIntersectionHits] = useState(null);
  const [intersectionRuntime, setIntersectionRuntime] = useState(0);
  const [computing, setComputing] = useState(false);
  const [intersOpen, setIntersOpen] = useState(false);

  // Scenario
  const [simParams, setSimParams] = useState({ konversi: 0, kapasitas: 0, road: "rendah" });
  const [scenarios, setScenarios] = useState(PKD.SCENARIOS);
  const [scenarioDelta, setScenarioDelta] = useState(0);

  // Comparison
  const [cmpItems, setCmpItems] = useState([]);

  // Bar3D
  const [bar3D, setBar3D] = useState({ enabled: false, variable: "curah-hujan" });

  // Threshold editor modal state
  const [thresholdEditor, setThresholdEditor] = useState(null); // layerId or null
  const [uploadEditor, setUploadEditor] = useState(null);       // layerId or null

  // User popover
  const [showUserPop, setShowUserPop] = useState(false);

  function runIntersection() {
    setComputing(true);
    setIntersectionHits(null);
    const start = performance.now();
    setTimeout(() => {
      const hits = new Set();
      PKD.KABUPATEN.forEach(k => {
        let ok = true;
        conditions.forEach(c => {
          const v = PKD.layerValue(k, c.layer);
          if (c.op === ">") ok = ok && (v > c.val);
          else if (c.op === "<") ok = ok && (v < c.val);
          else if (c.op === "=") ok = ok && Math.abs(v - c.val) < (Math.abs(c.val) * 0.05);
          else if (c.op === "between") ok = ok && (v >= c.val && v <= c.val2);
        });
        if (ok) hits.add(k.id);
      });
      setIntersectionHits(hits);
      setIntersectionRuntime((performance.now() - start) / 1000 + 0.8 + Math.random() * 0.8);
      setComputing(false);
    }, 1100);
  }

  function saveScenario(delta) {
    const ts = new Date().toISOString().slice(0, 16).replace("T", " ");
    setScenarios([...scenarios, { id: "sc-" + Date.now(), name: `Skenario ${scenarios.length + 1}`, delta, ts }]);
    setScenarioDelta(delta);
  }

  function addToCompare(kab) {
    if (!kab) return;
    if (cmpItems.find(k => k.id === kab.id)) return;
    if (cmpItems.length >= 4) return;
    setCmpItems([...cmpItems, kab]);
  }

  function clickKab(k) {
    setSelectedKab(k); setSelectedPort(null); setSelectedFactory(null);
  }

  // ============ PETA ROUTE ============
  if (route === "peta") {
    return (
      <div className="app">
        <div className="stage">
          <Rail current="peta" onNav={nav} user={user} onLogout={onLogout} showUserPop={showUserPop} setShowUserPop={setShowUserPop} />

          <LayerSidebar
            active={activeLayers}
            setActive={setActiveLayers}
            opacities={opacities}
            setOpacities={setOpacities}
            allowedGroups={null}
            onAdjustThreshold={(id) => setThresholdEditor(id)}
            onUpload={(id) => setUploadEditor(id)}
            thresholds={thresholds}
            layerOverrides={layerOverrides}
          />

          <main className="map-area">
            {window.Cesium && localStorage.getItem("pkd_cesium_token") ? (
              <CesiumPetaMap
                mode={mode}
                activeLayers={activeLayers}
                derivatifFilter={derivatifFilter}
                onSelectKab={clickKab}
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
                onSelectKab={clickKab}
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
            {mode === "investasi" && (
              <KesesuaianControl derivatif={investDerivatif} setDerivatif={setInvestDerivatif} />
            )}

            <ModePill
              modes={["default", "cias", "investasi", "interseksi"]}
              mode={mode}
              setMode={(m) => {
                setMode(m);
                if (m === "interseksi") {
                  // Build a starter condition list from active layers that have thresholds
                  if (conditions.length === 0) {
                    const seeds = [];
                    Array.from(activeLayers).slice(0, 3).forEach(id => {
                      const t = thresholds[id];
                      if (t) seeds.push({ layer: id, op: t.op === "between" ? ">" : t.op, val: t.val, val2: t.val2 });
                    });
                    if (seeds.length === 0) seeds.push({ layer: "ph", op: ">", val: 5.5 });
                    setConditions(seeds);
                  }
                  setIntersOpen(true);
                } else {
                  setIntersOpen(false);
                }
              }}
            />

            {/* Floating port/factory cards still use the absolute info-card */}
            {(selectedPort || selectedFactory) && (
              <InfoFloating
                port={selectedPort}
                factory={selectedFactory}
                onClose={() => { setSelectedPort(null); setSelectedFactory(null); }}
              />
            )}

            {intersOpen && (
              <InterseksiPanel
                computing={computing}
                onClose={() => { setIntersOpen(false); setMode("default"); }}
                onRun={runIntersection}
                conditions={conditions} setConditions={setConditions}
                hits={intersectionHits} runtime={intersectionRuntime}
              />
            )}
          </main>

          <RightDetailsPanel
            kab={selectedKab}
            activeLayers={activeLayers}
            thresholds={thresholds}
            layerOverrides={layerOverrides}
            scenarioDelta={scenarioDelta}
            onCompare={addToCompare}
            onSelectKab={clickKab}
          />
        </div>

        {thresholdEditor && (
          <ThresholdEditorModal
            layerId={thresholdEditor}
            threshold={thresholds[thresholdEditor]}
            onClose={() => setThresholdEditor(null)}
            onSave={(t) => {
              setThresholds(prev => ({ ...prev, [thresholdEditor]: t }));
              setThresholdEditor(null);
            }}
            onReset={() => {
              const def = PKD.THRESHOLDS[thresholdEditor];
              if (def) setThresholds(prev => ({ ...prev, [thresholdEditor]: { ...def } }));
            }}
          />
        )}
        {uploadEditor && (
          <UploadOverrideModal
            layerId={uploadEditor}
            existingOverride={layerOverrides[uploadEditor]}
            onClose={() => setUploadEditor(null)}
            onApply={(meta) => {
              setLayerOverrides(prev => ({ ...prev, [uploadEditor]: meta }));
              setUploadEditor(null);
            }}
            onRemove={() => {
              setLayerOverrides(prev => {
                const n = { ...prev }; delete n[uploadEditor]; return n;
              });
              setUploadEditor(null);
            }}
          />
        )}
      </div>
    );
  }

  // ============ ANALITIK ROUTE ============
  return (
    <div className="app">
      <div className="stage an-route">
        <Rail current="analitik" onNav={nav} user={user} onLogout={onLogout} showUserPop={showUserPop} setShowUserPop={setShowUserPop} />
        <AnalitikPage
          scenarios={scenarios}
          simParams={simParams}
          setSimParams={setSimParams}
          onSaveScenario={saveScenario}
          scenarioDelta={scenarioDelta}
          cmpItems={cmpItems}
          setCmpItems={setCmpItems}
          thresholds={thresholds}
          onSelectKab={(k) => { clickKab(k); nav("peta"); }}
        />
      </div>
    </div>
  );
}

function Rail({ current, onNav, user, onLogout, showUserPop, setShowUserPop }) {
  const initials = user.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <aside className="rail">
      <div className="rail-brand">
        <svg width="28" height="28" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="rail-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#2D6A4F" /><stop offset="100%" stopColor="#52A77D" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="14" fill="#F8F9FA" stroke="#2D6A4F" strokeWidth="1.5" />
          <path d="M 16 8 C 13 11, 11 14, 11 17 C 11 20, 13 22, 16 22 C 19 22, 21 20, 21 17 C 21 14, 19 11, 16 8 Z" fill="url(#rail-grad)" />
        </svg>
      </div>
      <button className={"rail-btn " + (current === "peta" ? "on" : "")} onClick={() => onNav("peta")}>
        🗺
        <span className="rail-label">Peta · Layer & Land Details</span>
      </button>
      <button className={"rail-btn " + (current === "analitik" ? "on" : "")} onClick={() => onNav("analitik")}>
        📊
        <span className="rail-label">Analitik · Rank & Simulasi</span>
      </button>
      <div className="rail-spacer" />
      <div style={{ position: "relative" }}>
        <button className="rail-avatar" onClick={() => setShowUserPop(s => !s)}>{initials}</button>
        {showUserPop && (
          <div className="rail-popover" onClick={e => e.stopPropagation()}>
            <div className="rp-name">{user.name}</div>
            <div className="rp-email">{user.email}</div>
            <div className="rp-instansi">{user.instansi}</div>
            <hr />
            <button onClick={() => { setShowUserPop(false); onLogout(); }}>↪  Keluar</button>
          </div>
        )}
      </div>
    </aside>
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
      <button className="mt-btn" title="Reset view" onClick={() => window.__pkdMapReset && window.__pkdMapReset()}>⌖</button>
    </div>
  );
}

function KesesuaianControl({ derivatif, setDerivatif }) {
  return (
    <div className="kesesuaian-ctrl">
      <span className="kc-label">Derivatif</span>
      <select value={derivatif} onChange={e => setDerivatif(e.target.value)}>
        {PKD.DERIVATIF.map(d => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  );
}

function ModePill({ modes, mode, setMode }) {
  const labels = {
    "default":    { label: "Peta",       ic: "🗺" },
    "cias":       { label: "CIAS",       ic: "📊" },
    "investasi":  { label: "Kesesuaian", ic: "💼" },
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

// Floating card kept ONLY for ports & factories (kabupaten now lives in right panel)
function InfoFloating({ port, factory, onClose }) {
  if (factory) {
    return (
      <div className="info-card">
        <div className="ic-head">
          <div>
            <div className="ic-eyebrow">PABRIK · {factory.derivatif.toUpperCase()}</div>
            <h2 className="ic-title">{factory.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="metric-grid">
          <div className="metric"><div className="m-label">Kapasitas</div><div className="m-value">{factory.capacity.toLocaleString("id-ID")} <span className="m-unit">t/thn</span></div></div>
          <div className="metric"><div className="m-label">Status</div><div className={"m-value " + (factory.status === "Operasi" ? "good" : "")}>{factory.status}</div></div>
        </div>
      </div>
    );
  }
  if (port) {
    return (
      <div className="info-card">
        <div className="ic-head">
          <div>
            <div className="ic-eyebrow">PELABUHAN · {port.kelas}</div>
            <h2 className="ic-title">{port.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="metric-grid">
          <div className="metric"><div className="m-label">Kapasitas</div><div className="m-value">{port.kapasitas.toLocaleString("id-ID")} <span className="m-unit">TEU/bln</span></div></div>
          <div className="metric"><div className="m-label">Status</div><div className="m-value">{port.status}</div></div>
        </div>
      </div>
    );
  }
  return null;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
