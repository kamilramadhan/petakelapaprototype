// Panels & secondary UI: layer sidebar, info panel, CIAS panel, gap panel,
// investasi, interseksi, simulator, compare, admin upload, radar chart.

const { Fragment } = React;

// ========================= LAYER SIDEBAR =========================
window.LayerSidebar = function LayerSidebar({ active, setActive, opacities, setOpacities, badgeCounts, collapsed, onToggleCollapse }) {
  const [openGroup, setOpenGroup] = React.useState({ "Pertanian": true, "Industri": true, "Lingkungan": false, "Tanah (SoilGrids/HWSD2)": false, "Infrastruktur (OSM)": false, "Pendukung": false });

  function toggleLayer(id) {
    const next = new Set(active);
    if (next.has(id)) next.delete(id); else next.add(id);
    setActive(next);
  }

  return (
    <aside className={"layer-sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="ls-header">
        <div className="ls-title">
          <span className="ls-dot" />
          Layer Manager
        </div>
        <button className="icon-btn" onClick={onToggleCollapse} title="Collapse">
          {collapsed ? "›" : "‹"}
        </button>
      </div>
      <div className="ls-search">
        <input placeholder="Cari layer…" />
      </div>
      <div className="ls-scroll">
        {PKD.LAYERS.map(group => {
          const open = openGroup[group.group];
          const count = group.items.filter(i => active.has(i.id)).length;
          return (
            <div key={group.group} className="ls-group">
              <button className="ls-group-head" onClick={() => setOpenGroup(s => ({ ...s, [group.group]: !open }))}>
                <span className={"chev " + (open ? "open" : "")}>▸</span>
                <span className="ls-group-name">{group.group}</span>
                <span className="ls-group-badge">{count}/{group.items.length}</span>
              </button>
              {open && (
                <div className="ls-items">
                  {group.items.map(layer => {
                    const on = active.has(layer.id);
                    return (
                      <div key={layer.id} className={"ls-item" + (on ? " on" : "")}>
                        <button className="ls-grip" title="Drag untuk urutkan">⋮⋮</button>
                        <label className="ls-check">
                          <input type="checkbox" checked={on} onChange={() => toggleLayer(layer.id)} />
                          <span className="ls-box" />
                        </label>
                        <span className="ls-icon">{layer.icon}</span>
                        <span className="ls-name">{layer.name}</span>
                        <button className="ls-info" title="Info layer">i</button>
                        {on && (
                          <div className="ls-opacity">
                            <input
                              type="range" min={0} max={100}
                              value={Math.round((opacities[layer.id] ?? layer.opacity) * 100)}
                              onChange={e => setOpacities(o => ({ ...o, [layer.id]: parseInt(e.target.value) / 100 }))}
                            />
                            <span className="op-val">{Math.round((opacities[layer.id] ?? layer.opacity) * 100)}%</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="ls-footer">
        <div className="ls-count">{active.size} layer aktif</div>
        <button className="ghost-btn" onClick={() => setActive(new Set())}>Bersihkan</button>
      </div>
    </aside>
  );
};

// ========================= INFO PANEL (right slide-in) =========================
window.InfoPanel = function InfoPanel({ kab, port, factory, onClose, onCompare, scenarioDelta }) {
  if (!kab && !port && !factory) return null;

  if (factory) {
    return (
      <div className="info-panel slide-in">
        <div className="ip-head">
          <div>
            <div className="ip-eyebrow">PABRIK · {factory.derivatif.toUpperCase()}</div>
            <h2 className="ip-title">{factory.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="ip-body">
          <div className="metric-grid">
            <Metric label="Kapasitas" value={factory.capacity.toLocaleString("id-ID")} unit="ton/thn" />
            <Metric label="Status" value={factory.status} good={factory.status === "Operasi"} />
            <Metric label="Derivatif" value={factory.derivatif} />
          </div>
          <p className="ip-note">Sumber: factories.geojson · diperbarui 2026-04-21</p>
        </div>
      </div>
    );
  }

  if (port) {
    return (
      <div className="info-panel slide-in">
        <div className="ip-head">
          <div>
            <div className="ip-eyebrow">PELABUHAN · {port.kelas}</div>
            <h2 className="ip-title">{port.name}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="ip-body">
          <div className="metric-grid">
            <Metric label="Kapasitas" value={port.kapasitas.toLocaleString("id-ID")} unit="TEU/bln" />
            <Metric label="Status" value={port.status} />
            <Metric label="Koordinat" value={`${port.coord[1].toFixed(2)}, ${port.coord[0].toFixed(2)}`} mono />
          </div>
          <p className="ip-note">Sumber: pelabuhan.geojson · BPS + Pelindo</p>
        </div>
      </div>
    );
  }

  const t = PKD.tier(kab.cias + (scenarioDelta || 0));
  return (
    <div className="info-panel slide-in">
      <div className="ip-head">
        <div>
          <div className="ip-eyebrow">KABUPATEN · {kab.province}</div>
          <h2 className="ip-title">{kab.name}</h2>
          <div className="ip-sub">
            <span className="tier-badge" style={{ background: t.color + "22", color: t.color, borderColor: t.color + "55" }}>
              {t.label}
            </span>
            <span className="ip-coord">Luas ≈ {(420 + kab.name.length * 18).toLocaleString("id-ID")} km²</span>
          </div>
        </div>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>

      <div className="ip-body">
        <div className="cias-headline">
          <div className="cias-val" style={{ color: t.color }}>
            {(kab.cias + (scenarioDelta || 0)).toFixed(2)}
            {scenarioDelta ? <span className="cias-delta">Δ +{scenarioDelta.toFixed(2)}</span> : null}
          </div>
          <div className="cias-label">Composite Industrial Attractiveness Score</div>
        </div>

        <div className="decomp">
          <div className="decomp-row">
            <span>Environmental Suitability</span>
            <div className="bar"><span style={{ width: (kab.envSuit * 100) + "%", background: "#7BE39A" }} /></div>
            <b>{kab.envSuit.toFixed(2)}</b>
          </div>
          <div className="decomp-row">
            <span>Processing Strength</span>
            <div className="bar"><span style={{ width: (kab.procStrength * 100) + "%", background: "#FFB800" }} /></div>
            <b>{kab.procStrength.toFixed(2)}</b>
          </div>
          <div className="decomp-row">
            <span>Logistics Penalty</span>
            <div className="bar"><span style={{ width: (kab.logisticsPenalty * 100) + "%", background: "#FF4444" }} /></div>
            <b>−{kab.logisticsPenalty.toFixed(2)}</b>
          </div>
        </div>

        <h4 className="ip-h4">Statistik Layer Aktif</h4>
        <div className="stat-table">
          <StatRow name="Produksi kelapa" min="12.4K" max="187K" avg={kab.production.toLocaleString("id-ID")} p25="38K" p75="94K" unit="t/thn" />
          <StatRow name="Curah hujan (12mo)" min="1.420" max="2.890" avg={(1500 + (kab.cias * 1200)).toFixed(0)} p25="1.680" p75="2.310" unit="mm" />
          <StatRow name="pH H₂O 15–30cm" min="4.8" max="6.7" avg={(5 + kab.envSuit * 1.4).toFixed(1)} p25="5.2" p75="6.1" unit="" />
          <StatRow name="SOC 15–30cm" min="6" max="38" avg={(10 + kab.envSuit * 22).toFixed(0)} p25="14" p75="28" unit="g/kg" />
        </div>

        <h4 className="ip-h4">Logistik</h4>
        <div className="logistics-card">
          <div>
            <div className="ip-eyebrow">Pelabuhan terdekat</div>
            <div className="ip-strong">{kab.nearestPort.name}</div>
            <div className="ip-coord">{kab.distToPort} km · {kab.nearestPort.kelas}</div>
          </div>
          <div className="lfi">
            <div className="lfi-val">{kab.lfi.toFixed(2)}</div>
            <div className="lfi-label">LFI</div>
          </div>
        </div>

        <h4 className="ip-h4">Sumber Data</h4>
        <ul className="src-list">
          <li><span className="src-tag">SoilGrids</span> 2024-Q4</li>
          <li><span className="src-tag">WorldClim</span> v2.1 2.5m</li>
          <li><span className="src-tag">BPS</span> Produksi 2025</li>
          <li><span className="src-tag">OSM</span> 2026-04</li>
        </ul>

        <div className="ip-actions">
          <button className="primary-btn" onClick={() => onCompare(kab)}>+ Tambah ke Komparasi</button>
          <button className="ghost-btn">⇣ Ekspor PDF</button>
        </div>
      </div>
    </div>
  );
};

function Metric({ label, value, unit, good, mono }) {
  return (
    <div className="metric">
      <div className="m-label">{label}</div>
      <div className={"m-value" + (good ? " good" : "") + (mono ? " mono" : "")}>{value} {unit && <span className="m-unit">{unit}</span>}</div>
    </div>
  );
}

function StatRow({ name, min, max, avg, p25, p75, unit }) {
  return (
    <div className="stat-row">
      <div className="sr-name">{name}</div>
      <div className="sr-cells">
        <div><span>min</span><b>{min}</b></div>
        <div><span>p25</span><b>{p25}</b></div>
        <div><span>avg</span><b className="hi">{avg}</b></div>
        <div><span>p75</span><b>{p75}</b></div>
        <div><span>max</span><b>{max}</b></div>
      </div>
    </div>
  );
}

// ========================= RADAR CHART =========================
window.RadarChart = function RadarChart({ items, size = 260 }) {
  // items: [{ name, color, values: { cias, envSuit, procStrength, logistics, production, lfi } }]
  const axes = [
    { key: "cias", label: "CIAS" },
    { key: "envSuit", label: "Env Suit" },
    { key: "procStrength", label: "Proc Str" },
    { key: "logistics", label: "Logistics" },
    { key: "production", label: "Produksi" },
    { key: "lfi", label: "LFI" },
  ];
  const R = size / 2 - 30;
  const cx = size / 2, cy = size / 2;
  function pt(angle, r) {
    return [cx + Math.cos(angle - Math.PI / 2) * r, cy + Math.sin(angle - Math.PI / 2) * r];
  }

  return (
    <svg width={size} height={size} className="radar">
      {/* grid */}
      {[0.25, 0.5, 0.75, 1].map(t => (
        <polygon key={t} points={axes.map((_, i) => {
          const [x, y] = pt((i / axes.length) * Math.PI * 2, R * t);
          return `${x},${y}`;
        }).join(" ")} fill="none" stroke="#244a72" strokeWidth={0.6} />
      ))}
      {/* axes */}
      {axes.map((ax, i) => {
        const [x, y] = pt((i / axes.length) * Math.PI * 2, R);
        const [lx, ly] = pt((i / axes.length) * Math.PI * 2, R + 16);
        return (
          <g key={ax.key}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#244a72" strokeWidth={0.5} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={10} fill="#7A9B8E" fontFamily="Inter, sans-serif">{ax.label}</text>
          </g>
        );
      })}
      {/* polygons */}
      {items.map((it, idx) => {
        const points = axes.map((ax, i) => {
          const v = Math.max(0.02, Math.min(1, it.values[ax.key]));
          const [x, y] = pt((i / axes.length) * Math.PI * 2, R * v);
          return `${x},${y}`;
        }).join(" ");
        return (
          <g key={idx}>
            <polygon points={points} fill={it.color} fillOpacity={0.18} stroke={it.color} strokeWidth={1.5} />
            {axes.map((ax, i) => {
              const v = Math.max(0.02, Math.min(1, it.values[ax.key]));
              const [x, y] = pt((i / axes.length) * Math.PI * 2, R * v);
              return <circle key={i} cx={x} cy={y} r={2.5} fill={it.color} />;
            })}
          </g>
        );
      })}
    </svg>
  );
};

// ========================= LEGEND =========================
window.Legend = function Legend({ mode, scenarioDelta, derivatifFilter }) {
  if (mode === "default") return null;
  let title = "", min = "0.00", max = "1.00";
  let stops = "linear-gradient(90deg, #FF4444 0%, #FF8844 25%, #FFB800 50%, #7BE39A 75%, #00C896 100%)";
  if (mode === "cias") title = "Composite Industrial Attractiveness Score";
  else if (mode === "gap") { title = "Gap Produksi vs Pengolahan"; min = "Surplus"; max = "Defisit"; stops = "linear-gradient(90deg, #00C896, #FFB800, #FF8844, #FF4444)"; }
  else if (mode === "investasi") title = `Suitability Lokasi · ${derivatifFilter || "—"}`;
  else if (mode === "interseksi") { title = "Hasil Interseksi Multi-Layer"; min = "Tidak"; max = "Memenuhi"; stops = "linear-gradient(90deg, #1a3553, #FFD84D)"; }

  return (
    <div className="legend">
      <div className="legend-title">{title}</div>
      <div className="legend-bar" style={{ background: stops }} />
      <div className="legend-labels">
        <span>{min}</span>
        <span>0.25</span>
        <span>0.50</span>
        <span>0.75</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

// ========================= CIAS PANEL (slide-up table) =========================
window.CIASPanel = function CIASPanel({ open, onClose, onSelect, selected, scenarioDelta, range, setRange }) {
  const [sort, setSort] = React.useState("cias-desc");
  const sorted = React.useMemo(() => {
    const arr = [...PKD.KABUPATEN].map(k => ({ ...k, ciasFinal: Math.min(1, k.cias + (scenarioDelta || 0)) }));
    arr.sort((a, b) => {
      if (sort === "cias-desc") return b.ciasFinal - a.ciasFinal;
      if (sort === "cias-asc") return a.ciasFinal - b.ciasFinal;
      if (sort === "prod-desc") return b.production - a.production;
      if (sort === "lfi-desc") return b.lfi - a.lfi;
      return 0;
    });
    return arr.filter(k => k.ciasFinal >= range[0] && k.ciasFinal <= range[1]);
  }, [sort, scenarioDelta, range]);

  if (!open) return null;

  return (
    <div className="dock-panel">
      <div className="dock-head">
        <div>
          <div className="dock-eyebrow">ANALISIS · CIAS</div>
          <h3>Ranking Kabupaten — {sorted.length} hasil</h3>
        </div>
        <div className="dock-tools">
          <div className="range-wrap">
            <span>Skor</span>
            <input type="range" min={0} max={1} step={0.05} value={range[0]} onChange={e => setRange([parseFloat(e.target.value), range[1]])} />
            <input type="range" min={0} max={1} step={0.05} value={range[1]} onChange={e => setRange([range[0], parseFloat(e.target.value)])} />
            <span className="mono">{range[0].toFixed(2)}–{range[1].toFixed(2)}</span>
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="cias-desc">CIAS ↓</option>
            <option value="cias-asc">CIAS ↑</option>
            <option value="prod-desc">Produksi ↓</option>
            <option value="lfi-desc">LFI ↓</option>
          </select>
          <button className="ghost-btn">⇣ Excel</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body">
        <table className="ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Kabupaten</th>
              <th>Provinsi</th>
              <th>CIAS</th>
              <th>Tier</th>
              <th>Env</th>
              <th>Proc</th>
              <th>−Log</th>
              <th>Produksi (t/thn)</th>
              <th>Pabrik</th>
              <th>LFI</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((k, i) => {
              const t = PKD.tier(k.ciasFinal);
              const sel = selected && selected.id === k.id;
              return (
                <tr key={k.id} className={sel ? "sel" : ""} onClick={() => onSelect(k)}>
                  <td className="mono">{i + 1}</td>
                  <td><b>{k.name}</b></td>
                  <td className="muted">{k.province}</td>
                  <td><b style={{ color: t.color }}>{k.ciasFinal.toFixed(2)}</b></td>
                  <td><span className="tier-badge sm" style={{ background: t.color + "22", color: t.color, borderColor: t.color + "55" }}>{t.label}</span></td>
                  <td className="mono">{k.envSuit.toFixed(2)}</td>
                  <td className="mono">{k.procStrength.toFixed(2)}</td>
                  <td className="mono">−{k.logisticsPenalty.toFixed(2)}</td>
                  <td className="mono">{k.production.toLocaleString("id-ID")}</td>
                  <td className="mono">{k.factories}</td>
                  <td className="mono">{k.lfi.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ========================= GAP PANEL =========================
window.GapPanel = function GapPanel({ derivatif, setDerivatif, onClose, onSelect }) {
  const list = React.useMemo(() => {
    return [...PKD.KABUPATEN].map(k => {
      const gap = (k.production / 420000) - (k.factories / 10);
      return { ...k, gap };
    }).sort((a, b) => b.gap - a.gap).slice(0, 12);
  }, []);

  return (
    <div className="dock-panel">
      <div className="dock-head">
        <div>
          <div className="dock-eyebrow">ANALISIS · GAP</div>
          <h3>Gap Produksi vs Kapasitas Pengolahan</h3>
        </div>
        <div className="dock-tools">
          <span className="dock-label">Derivatif:</span>
          <select value={derivatif} onChange={e => setDerivatif(e.target.value)}>
            <option value="semua">Semua</option>
            {PKD.DERIVATIF.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="ghost-btn">⇣ Excel</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body">
        <div className="gap-grid">
          {list.map(k => {
            const intensity = Math.max(0, Math.min(1, (k.gap + 0.1) * 2));
            const color = k.gap > 0.5 ? "#FF4444" : k.gap > 0.25 ? "#FF8844" : k.gap > 0.05 ? "#FFB800" : "#00C896";
            return (
              <div key={k.id} className="gap-card" onClick={() => onSelect(k)} style={{ borderColor: color + "55" }}>
                <div className="gap-bar"><span style={{ width: (intensity * 100) + "%", background: color }} /></div>
                <div className="gap-name">{k.name}</div>
                <div className="gap-prov">{k.province}</div>
                <div className="gap-stats">
                  <span><b>{(k.production / 1000).toFixed(0)}K</b> t/thn</span>
                  <span>·</span>
                  <span><b>{k.factories}</b> pabrik</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ========================= INVESTASI PANEL =========================
window.InvestasiPanel = function InvestasiPanel({ derivatif, setDerivatif, onClose, onSelect, selectedKab }) {
  const top5 = React.useMemo(() => {
    return [...PKD.KABUPATEN].sort((a, b) => b.cias - a.cias).slice(0, 5);
  }, []);

  return (
    <div className="dock-panel">
      <div className="dock-head">
        <div>
          <div className="dock-eyebrow">REKOMENDASI INVESTASI</div>
          <h3>Lokasi Optimal Pabrik · {derivatif}</h3>
        </div>
        <div className="dock-tools">
          <span className="dock-label">Derivatif:</span>
          <select value={derivatif} onChange={e => setDerivatif(e.target.value)}>
            {PKD.DERIVATIF.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="ghost-btn">⇣ Laporan</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body">
        <div className="invest-list">
          <div className="invest-head">
            <span>#</span>
            <span>Lokasi</span>
            <span>Skor</span>
            <span>Suplai</span>
            <span>Logistik</span>
            <span>Pasar</span>
            <span>Jarak Pelabuhan</span>
            <span>Kompetitor</span>
            <span></span>
          </div>
          {top5.map((k, i) => {
            const supply = k.production > 100_000;
            const logistic = k.lfi > 0.5;
            const market = k.envSuit > 0.7;
            const t = PKD.tier(k.cias);
            return (
              <div key={k.id} className="invest-row" onClick={() => onSelect(k)}>
                <span className="mono rank">#{i + 1}</span>
                <span><b>{k.name}</b> <span className="muted">· {k.province}</span></span>
                <span><b style={{ color: t.color }}>{k.cias.toFixed(2)}</b></span>
                <span><Badge ok={supply} label="suplai" /></span>
                <span><Badge ok={logistic} label="logistik" /></span>
                <span><Badge ok={market} label="pasar" /></span>
                <span className="mono">{k.distToPort} km · {k.nearestPort.name.split(" ").slice(-1)[0]}</span>
                <span className="mono">{k.factories} pabrik</span>
                <span><button className="primary-btn sm">Detail</button></span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
function Badge({ ok, label }) {
  return <span className={"check-badge " + (ok ? "ok" : "no")}>{ok ? "✓" : "—"} {label}</span>;
}

// ========================= INTERSEKSI PANEL =========================
window.InterseksiPanel = function InterseksiPanel({ onClose, onRun, conditions, setConditions, hits, runtime }) {
  const layerOpts = [
    { id: "ph", label: "pH H₂O", min: 4.5, max: 7.5, def: 5.5, unit: "" },
    { id: "rain", label: "Curah hujan", min: 800, max: 4000, def: 1500, unit: "mm" },
    { id: "elev", label: "Elevasi", min: 0, max: 1500, def: 500, unit: "m" },
    { id: "dist-port", label: "Jarak pelabuhan", min: 0, max: 600, def: 100, unit: "km" },
    { id: "soc", label: "Soil Organic Carbon", min: 0, max: 40, def: 15, unit: "g/kg" },
    { id: "production", label: "Produksi", min: 0, max: 500000, def: 80000, unit: "t/thn" },
  ];
  const ops = [">", "<", "=", "between"];

  function addCondition() {
    setConditions([...conditions, { layer: "ph", op: ">", val: 5.5, val2: 6.5 }]);
  }
  function update(i, patch) {
    setConditions(conditions.map((c, j) => j === i ? { ...c, ...patch } : c));
  }
  function remove(i) {
    setConditions(conditions.filter((_, j) => j !== i));
  }

  return (
    <div className="dock-panel">
      <div className="dock-head">
        <div>
          <div className="dock-eyebrow">ANALISIS · INTERSEKSI MULTI-LAYER</div>
          <h3>Layer Cross Analysis</h3>
        </div>
        <div className="dock-tools">
          <button className="primary-btn" onClick={onRun}>▶ Hitung Interseksi</button>
          <button className="ghost-btn">⇣ Ekspor GeoJSON</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body">
        <div className="cond-list">
          {conditions.map((c, i) => {
            const lay = layerOpts.find(l => l.id === c.layer) || layerOpts[0];
            return (
              <div key={i} className="cond-row">
                <span className="cond-conj">{i === 0 ? "WHERE" : "AND"}</span>
                <select value={c.layer} onChange={e => update(i, { layer: e.target.value })}>
                  {layerOpts.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                </select>
                <select value={c.op} onChange={e => update(i, { op: e.target.value })}>
                  {ops.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <input type="number" value={c.val} onChange={e => update(i, { val: parseFloat(e.target.value) })} min={lay.min} max={lay.max} />
                {c.op === "between" && (
                  <>
                    <span>—</span>
                    <input type="number" value={c.val2} onChange={e => update(i, { val2: parseFloat(e.target.value) })} min={lay.min} max={lay.max} />
                  </>
                )}
                <span className="cond-unit">{lay.unit}</span>
                <button className="icon-btn" onClick={() => remove(i)}>✕</button>
              </div>
            );
          })}
          <button className="ghost-btn" onClick={addCondition}>+ Tambah Kondisi</button>
        </div>

        {hits && (
          <div className="cond-result">
            <div className="cr-stats">
              <div><b className="big">{hits.size}</b><span> kabupaten memenuhi</span></div>
              <div><b className="big mono">{runtime.toFixed(2)}s</b><span> waktu komputasi</span></div>
              <div><b className="big">{Math.round(hits.size / PKD.KABUPATEN.length * 100)}%</b><span> dari total</span></div>
            </div>
            <div className="cr-chips">
              {Array.from(hits).slice(0, 24).map(id => {
                const k = PKD.KABUPATEN.find(x => x.id === id);
                return <span key={id} className="hit-chip">{k.name}</span>;
              })}
              {hits.size > 24 && <span className="hit-chip muted">+{hits.size - 24} lainnya</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================= SIMULASI KEBIJAKAN =========================
window.SimulasiPanel = function SimulasiPanel({ onClose, params, setParams, scenarios, onSave }) {
  const delta =
    (params.konversi / 100000) * 0.06 +
    (params.kapasitas / 5000) * 0.04 +
    (params.road === "tinggi" ? 0.05 : params.road === "sedang" ? 0.025 : 0);

  return (
    <div className="dock-panel">
      <div className="dock-head">
        <div>
          <div className="dock-eyebrow">SKENARIO · WHAT-IF</div>
          <h3>Simulasi Kebijakan</h3>
        </div>
        <div className="dock-tools">
          <button className="primary-btn" onClick={() => onSave(delta)}>💾 Simpan Skenario</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body sim-body">
        <div className="sim-controls">
          <div className="sim-ctrl">
            <label>Konversi lahan → kebun kelapa</label>
            <input type="range" min={0} max={200000} step={5000} value={params.konversi} onChange={e => setParams({ ...params, konversi: parseInt(e.target.value) })} />
            <div className="sim-val"><b>{params.konversi.toLocaleString("id-ID")}</b> ha</div>
          </div>
          <div className="sim-ctrl">
            <label>Penambahan kapasitas pelabuhan</label>
            <input type="range" min={0} max={20000} step={500} value={params.kapasitas} onChange={e => setParams({ ...params, kapasitas: parseInt(e.target.value) })} />
            <div className="sim-val">+<b>{params.kapasitas.toLocaleString("id-ID")}</b> ton/thn</div>
          </div>
          <div className="sim-ctrl">
            <label>Road density improvement</label>
            <div className="seg">
              {["rendah", "sedang", "tinggi"].map(o => (
                <button key={o} className={params.road === o ? "on" : ""} onClick={() => setParams({ ...params, road: o })}>{o}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="sim-output">
          <div className="delta-card">
            <div className="delta-label">DELTA CIAS NASIONAL</div>
            <div className="delta-val">+{delta.toFixed(3)}</div>
            <div className="delta-sub">vs baseline 2026</div>
            <div className="delta-bars">
              <div><span>Sulawesi</span><div className="bar"><span style={{ width: Math.min(100, delta * 380) + "%", background: "#00C896" }} /></div></div>
              <div><span>Sumatera</span><div className="bar"><span style={{ width: Math.min(100, delta * 280) + "%", background: "#7BE39A" }} /></div></div>
              <div><span>Maluku</span><div className="bar"><span style={{ width: Math.min(100, delta * 320) + "%", background: "#FFB800" }} /></div></div>
              <div><span>Papua</span><div className="bar"><span style={{ width: Math.min(100, delta * 220) + "%", background: "#FF8844" }} /></div></div>
            </div>
          </div>

          <div className="scenario-history">
            <div className="sh-head">Riwayat Skenario</div>
            {scenarios.map(s => (
              <div key={s.id} className="sh-row">
                <div>
                  <div className="sh-name">{s.name}</div>
                  <div className="sh-ts mono">{s.ts}</div>
                </div>
                <div className="sh-delta">Δ +{s.delta.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================= KOMPARASI =========================
window.KomparasiPanel = function KomparasiPanel({ items, onRemove, onAdd, onClose }) {
  const [query, setQuery] = React.useState("");
  const colors = ["#00C896", "#FFB800", "#5BB8FF", "#FF8844"];
  const results = query.length > 0 ? PKD.KABUPATEN.filter(k => k.name.toLowerCase().includes(query.toLowerCase()) || k.province.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : [];

  return (
    <div className="dock-panel">
      <div className="dock-head">
        <div>
          <div className="dock-eyebrow">KOMPARASI MULTI-LOKASI</div>
          <h3>{items.length} lokasi dipilih (maks 4)</h3>
        </div>
        <div className="dock-tools">
          <div className="search-wrap">
            <input placeholder="Tambah kabupaten / provinsi…" value={query} onChange={e => setQuery(e.target.value)} />
            {results.length > 0 && (
              <div className="search-results">
                {results.map(k => (
                  <button key={k.id} onClick={() => { onAdd(k); setQuery(""); }}>
                    <b>{k.name}</b><span> · {k.province}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="ghost-btn">⇣ Excel</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body cmp-body">
        <table className="cmp-table">
          <thead>
            <tr>
              <th></th>
              <th>CIAS</th>
              <th>LFI</th>
              <th>Produksi</th>
              <th>Pabrik</th>
              <th>Jarak Pel.</th>
              <th>Derivatif Utama</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((k, i) => {
              const t = PKD.tier(k.cias);
              const factories = PKD.FACTORIES.filter(f => f.kab === k.id);
              const topDer = factories[0]?.derivatif || "—";
              return (
                <tr key={k.id}>
                  <td>
                    <span className="cmp-dot" style={{ background: colors[i] }} />
                    <b>{k.name}</b>
                    <div className="muted">{k.province}</div>
                  </td>
                  <td><b style={{ color: t.color }}>{k.cias.toFixed(2)}</b></td>
                  <td className="mono">{k.lfi.toFixed(2)}</td>
                  <td className="mono">{k.production.toLocaleString("id-ID")}</td>
                  <td className="mono">{k.factories}</td>
                  <td className="mono">{k.distToPort} km</td>
                  <td>{topDer}</td>
                  <td><button className="icon-btn" onClick={() => onRemove(k.id)}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {items.length > 0 && (
          <div className="cmp-radar-wrap">
            <h4 className="cmp-h4">Radar Multidimensi</h4>
            <div className="cmp-radar">
              <RadarChart size={320} items={items.map((k, i) => ({
                name: k.name,
                color: colors[i],
                values: {
                  cias: k.cias,
                  envSuit: k.envSuit,
                  procStrength: k.procStrength,
                  logistics: 1 - k.logisticsPenalty,
                  production: Math.min(1, k.production / 400000),
                  lfi: k.lfi
                }
              }))} />
              <div className="cmp-legend">
                {items.map((k, i) => (
                  <div key={k.id} className="cmp-legend-row">
                    <span className="cmp-dot" style={{ background: colors[i] }} />
                    <span>{k.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================= ADMIN UPLOAD =========================
window.AdminPanel = function AdminPanel({ onClose }) {
  const [stage, setStage] = React.useState("idle"); // idle | preview | uploading | done | error
  const [file, setFile] = React.useState(null);
  const [progress, setProgress] = React.useState(0);
  const [columns, setColumns] = React.useState([]);
  const [errors, setErrors] = React.useState([]);
  const intervalRef = React.useRef();

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }
  function loadFile(f) {
    setFile(f);
    setStage("preview");
    // Mock column detection
    const mockCols = [
      { name: "longitude", type: "number", valid: true, sample: "120.85" },
      { name: "latitude", type: "number", valid: true, sample: "-1.42" },
      { name: "nilai_produksi", type: "number", valid: true, sample: "142300" },
      { name: "kab_name", type: "string", valid: true, sample: "Minahasa Utara" },
      { name: "tahun", type: "number", valid: true, sample: "2025" },
    ];
    if (f.name.toLowerCase().includes("bad")) {
      setErrors([
        { row: 42, msg: "Nilai 'lat' tidak valid: 'abc'" },
        { row: 87, msg: "Kolom 'value' kosong" },
      ]);
    } else {
      setErrors([]);
    }
    setColumns(mockCols);
  }
  function startUpload() {
    setStage("uploading");
    setProgress(0);
    intervalRef.current = setInterval(() => {
      setProgress(p => {
        const np = p + 4 + Math.random() * 7;
        if (np >= 100) {
          clearInterval(intervalRef.current);
          setStage("done");
          return 100;
        }
        return np;
      });
    }, 180);
  }
  React.useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div className="dock-panel">
      <div className="dock-head">
        <div>
          <div className="dock-eyebrow">ADMIN · LAYER MANAGEMENT</div>
          <h3>Upload Data Layer</h3>
        </div>
        <div className="dock-tools">
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body admin-body">
        <div className="upload-grid">
          <div className="drop-zone" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            <div className="dz-icon">⇪</div>
            <div className="dz-title">Drag & drop file di sini</div>
            <div className="dz-sub">atau</div>
            <label className="primary-btn">
              Pilih File
              <input type="file" hidden onChange={e => e.target.files[0] && loadFile(e.target.files[0])} />
            </label>
            <div className="dz-formats">CSV · GeoJSON · Shapefile ZIP · GeoTIFF</div>
          </div>

          <div className="upload-preview">
            {stage === "idle" && (
              <div className="placeholder-card">
                <h4>Preview Kolom & Validasi</h4>
                <p className="muted">Pilih file untuk melihat preview kolom, validasi schema, dan progress upload.</p>
                <ul className="muted">
                  <li>Validasi otomatis: lon/lat range, tipe numerik, nilai missing</li>
                  <li>Estimasi waktu upload berdasarkan ukuran</li>
                  <li>Layer baru muncul di sidebar dalam ≤ 30 detik</li>
                </ul>
              </div>
            )}
            {stage === "preview" && (
              <>
                <div className="up-file">
                  <span className="up-icon">📄</span>
                  <div>
                    <b>{file.name}</b>
                    <div className="muted mono">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <h4>Kolom Terdeteksi</h4>
                <div className="cols-grid">
                  {columns.map(c => (
                    <div key={c.name} className={"col-card " + (c.valid ? "ok" : "err")}>
                      <div className="col-name">{c.name}</div>
                      <div className="col-type">{c.type}</div>
                      <div className="col-sample mono">{c.sample}</div>
                    </div>
                  ))}
                </div>
                {errors.length > 0 && (
                  <div className="err-list">
                    <b>{errors.length} error ditemukan</b>
                    {errors.map((e, i) => (
                      <div key={i} className="err-row">
                        <span className="err-row-i mono">baris {e.row}</span>
                        <span>{e.msg}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="up-actions">
                  <button className="primary-btn" onClick={startUpload} disabled={errors.length > 0}>▶ Mulai Upload</button>
                  <button className="ghost-btn" onClick={() => setStage("idle")}>Batal</button>
                </div>
              </>
            )}
            {stage === "uploading" && (
              <div className="up-progress">
                <h4>Mengunggah & memproses…</h4>
                <div className="prog-bar"><span style={{ width: progress + "%" }} /></div>
                <div className="prog-stats mono">
                  <span>{progress.toFixed(0)}%</span>
                  <span>~{Math.max(1, Math.ceil((100 - progress) / 12))}s tersisa</span>
                </div>
                <ul className="up-steps">
                  <li className={progress > 20 ? "done" : ""}>✓ Validasi schema</li>
                  <li className={progress > 50 ? "done" : ""}>{progress > 50 ? "✓" : "•"} Konversi geometri</li>
                  <li className={progress > 80 ? "done" : ""}>{progress > 80 ? "✓" : "•"} Membangun tile cache</li>
                  <li className={progress >= 100 ? "done" : ""}>{progress >= 100 ? "✓" : "•"} Publish ke layer registry</li>
                </ul>
              </div>
            )}
            {stage === "done" && (
              <div className="up-done">
                <div className="done-check">✓</div>
                <h4>Layer berhasil diunggah</h4>
                <p className="muted">"{file.name}" tersedia sebagai layer baru di sidebar.</p>
                <button className="primary-btn" onClick={() => { setStage("idle"); setFile(null); }}>Upload Lagi</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
