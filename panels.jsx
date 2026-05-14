// Panels & secondary UI — light theme, role-aware.

const { Fragment } = React;

function tierClass(c) {
  if (c >= 0.8) return "tier-1";
  if (c >= 0.6) return "tier-2";
  if (c >= 0.4) return "tier-3";
  return "tier-4";
}
function tierLabel(c) {
  if (c >= 0.8) return "Tier 1";
  if (c >= 0.6) return "Tier 2";
  if (c >= 0.4) return "Tier 3";
  return "Tier 4";
}
function tierColor(c) {
  if (c >= 0.8) return "#2D6A4F";
  if (c >= 0.6) return "#0369A1";
  if (c >= 0.4) return "#92400E";
  return "#991B1B";
}
window.tierClass = tierClass;
window.tierLabel = tierLabel;
window.tierColor = tierColor;

// CSV/Excel download helper — generates a CSV-with-BOM blob (Excel-friendly) and triggers download
function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? "");
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
}
window.downloadCSV = downloadCSV;

// ========================= LAYER SIDEBAR =========================
window.LayerSidebar = function LayerSidebar({ active, setActive, opacities, setOpacities, allowedGroups }) {
  const [openGroup, setOpenGroup] = React.useState({
    "Pertanian": true, "Industri": true,
    "Lingkungan": false, "Tanah (SoilGrids/HWSD2)": false,
    "Infrastruktur (OSM)": false, "Pendukung": false
  });
  const [query, setQuery] = React.useState("");

  function toggleLayer(id) {
    const next = new Set(active);
    if (next.has(id)) next.delete(id); else next.add(id);
    setActive(next);
  }

  const visibleGroups = PKD.LAYERS.filter(g => !allowedGroups || allowedGroups.includes(g.group));

  return (
    <aside className="sidebar">
      <div className="sb-head">
        <div className="sb-title">Layer Manager</div>
        <button className="icon-btn" title="Sembunyikan">‹</button>
      </div>
      <div className="sb-search">
        <input placeholder="Cari layer…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      <div className="sb-scroll">
        {visibleGroups.map(group => {
          const open = openGroup[group.group];
          const items = query ? group.items.filter(i => i.name.toLowerCase().includes(query.toLowerCase())) : group.items;
          if (items.length === 0) return null;
          const count = items.filter(i => active.has(i.id)).length;
          return (
            <div key={group.group} className="sb-group">
              <button className="sb-group-head" onClick={() => setOpenGroup(s => ({ ...s, [group.group]: !open }))}>
                <span className={"sb-chev " + (open ? "open" : "")}>▸</span>
                <span className="sb-group-name">{group.group}</span>
                <span className="sb-group-badge">{count}/{items.length}</span>
              </button>
              {(open || query) && (
                <div className="sb-items">
                  {items.map(layer => {
                    const on = active.has(layer.id);
                    return (
                      <Fragment key={layer.id}>
                        <div className="sb-item">
                          <span className="sb-item-ic">{layer.icon}</span>
                          <span className="sb-item-name">{layer.name}</span>
                          <label className="toggle">
                            <input type="checkbox" checked={on} onChange={() => toggleLayer(layer.id)} />
                            <span className="toggle-track" />
                          </label>
                          <button className="sb-item-info" title="Info layer">i</button>
                        </div>
                        {on && (
                          <div className="sb-item">
                            <span></span>
                            <div className="sb-opacity">
                              <input
                                type="range" min={0} max={100}
                                value={Math.round((opacities[layer.id] ?? layer.opacity) * 100)}
                                onChange={e => setOpacities(o => ({ ...o, [layer.id]: parseInt(e.target.value) / 100 }))}
                              />
                              <span className="opv">{Math.round((opacities[layer.id] ?? layer.opacity) * 100)}%</span>
                            </div>
                          </div>
                        )}
                      </Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="sb-foot">
        <span>{active.size} layer aktif</span>
        <button className="btn-ghost" onClick={() => setActive(new Set())} style={{ padding: "4px 10px", fontSize: 11.5 }}>Bersihkan</button>
      </div>
    </aside>
  );
};

// ========================= INFO PANEL (floating card, bottom-right) =========================
window.InfoPanel = function InfoPanel({ kab, port, factory, onClose, onCompare, onSelectFactory, scenarioDelta, role }) {
  if (!kab && !port && !factory) return null;

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
        <div className="ic-body">
          <div className="metric-grid">
            <div className="metric"><div className="m-label">Kapasitas</div><div className="m-value">{factory.capacity.toLocaleString("id-ID")} <span className="m-unit">t/thn</span></div></div>
            <div className="metric"><div className="m-label">Status</div><div className={"m-value " + (factory.status === "Operasi" ? "good" : "")}>{factory.status}</div></div>
            <div className="metric"><div className="m-label">Derivatif</div><div className="m-value">{factory.derivatif}</div></div>
          </div>
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
        <div className="ic-body">
          <div className="metric-grid">
            <div className="metric"><div className="m-label">Kapasitas</div><div className="m-value">{port.kapasitas.toLocaleString("id-ID")} <span className="m-unit">TEU/bln</span></div></div>
            <div className="metric"><div className="m-label">Status</div><div className="m-value">{port.status}</div></div>
            <div className="metric"><div className="m-label">Koordinat</div><div className="m-value mono">{port.coord[1].toFixed(2)}, {port.coord[0].toFixed(2)}</div></div>
          </div>
        </div>
      </div>
    );
  }

  const finalCias = Math.min(1, kab.cias + (scenarioDelta || 0));
  const showCiasDetail = role !== "investor"; // investors see a summary, not the decomp

  return (
    <div className="info-card">
      <div className="ic-head">
        <div>
          <div className="ic-eyebrow">KABUPATEN · {kab.province}</div>
          <h2 className="ic-title">{kab.name}</h2>
          <div className="ic-sub">
            <span className={"tier-badge " + tierClass(finalCias)}>{tierLabel(finalCias)}</span>
            <span className="muted mono">{(420 + kab.name.length * 18).toLocaleString("id-ID")} km²</span>
          </div>
        </div>
        <button className="icon-btn" onClick={onClose}>✕</button>
      </div>
      <div className="ic-body">
        <div className="cias-headline">
          <div className="cias-val">
            {finalCias.toFixed(2)}
            {scenarioDelta ? <span className="cias-delta">+{scenarioDelta.toFixed(2)}</span> : null}
          </div>
          <div className="cias-label">Composite Industrial Attractiveness</div>
        </div>

        {showCiasDetail && (
          <div className="decomp">
            <div className="decomp-row">
              <span>Environmental Suitability</span>
              <div className="bar"><span style={{ width: (kab.envSuit * 100) + "%", background: "#52A77D" }} /></div>
              <b>{kab.envSuit.toFixed(2)}</b>
            </div>
            <div className="decomp-row">
              <span>Processing Strength</span>
              <div className="bar"><span style={{ width: (kab.procStrength * 100) + "%", background: "#F4A261" }} /></div>
              <b>{kab.procStrength.toFixed(2)}</b>
            </div>
            <div className="decomp-row">
              <span>Logistics Penalty</span>
              <div className="bar"><span style={{ width: (kab.logisticsPenalty * 100) + "%", background: "#E76F51" }} /></div>
              <b>−{kab.logisticsPenalty.toFixed(2)}</b>
            </div>
          </div>
        )}

        {role === "investor" && (
          <div className="metric-grid">
            <div className="metric"><div className="m-label">Volume Suplai</div><div className="m-value mono">{(kab.production / 1000).toFixed(0)}K <span className="m-unit">t/thn</span></div></div>
            <div className="metric"><div className="m-label">Pabrik Aktif</div><div className="m-value mono">{kab.factories}</div></div>
            <div className="metric"><div className="m-label">Jarak Pelabuhan</div><div className="m-value mono">{kab.distToPort} <span className="m-unit">km</span></div></div>
            <div className="metric"><div className="m-label">LFI</div><div className="m-value good mono">{kab.lfi.toFixed(2)}</div></div>
          </div>
        )}

        {role === "peneliti" && (
          <>
            <h4 className="ic-h4">Statistik Layer Aktif</h4>
            <div className="stat-table">
              <StatRow name="Produksi kelapa" min="12.4K" max="187K" avg={(kab.production / 1000).toFixed(0) + "K"} p25="38K" p75="94K" />
              <StatRow name="Curah hujan (12mo)" min="1.420" max="2.890" avg={(1500 + (kab.cias * 1200)).toFixed(0)} p25="1.680" p75="2.310" />
              <StatRow name="pH H₂O 15–30cm" min="4.8" max="6.7" avg={(5 + kab.envSuit * 1.4).toFixed(1)} p25="5.2" p75="6.1" />
              <StatRow name="SOC 15–30cm" min="6" max="38" avg={(10 + kab.envSuit * 22).toFixed(0)} p25="14" p75="28" />
            </div>
          </>
        )}

        {role === "kementan" && (
          <>
            <h4 className="ic-h4">Statistik Ringkas</h4>
            <div className="stat-table">
              <StatRow name="Produksi" min="12.4K" max="187K" avg={(kab.production / 1000).toFixed(0) + "K"} p25="38K" p75="94K" />
              <StatRow name="Curah hujan" min="1.420" max="2.890" avg={(1500 + (kab.cias * 1200)).toFixed(0)} p25="1.680" p75="2.310" />
            </div>
          </>
        )}

        <h4 className="ic-h4">Logistik</h4>
        <div className="logistics-card">
          <div>
            <div className="ic-eyebrow" style={{ color: "var(--ink-2)" }}>Pelabuhan terdekat</div>
            <div className="ic-strong">{kab.nearestPort.name}</div>
            <div className="muted mono" style={{ fontSize: 11 }}>{kab.distToPort} km · {kab.nearestPort.kelas}</div>
          </div>
          <div className="lfi">
            <div className="lfi-val">{kab.lfi.toFixed(2)}</div>
            <div className="lfi-label">LFI</div>
          </div>
        </div>

        {(() => {
          const facs = PKD.FACTORIES.filter(f => f.kab === kab.id);
          if (facs.length === 0) return null;
          return (
            <>
              <h4 className="ic-h4">Pabrik di Kabupaten ({facs.length})</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {facs.map(f => (
                  <button key={f.id}
                    onClick={() => onSelectFactory && onSelectFactory(f)}
                    style={{ display: "grid", gridTemplateColumns: "12px 1fr auto auto", gap: 10, alignItems: "center",
                             padding: "8px 10px", background: "var(--surface)", border: "1px solid var(--border-soft)",
                             borderRadius: 6, cursor: "pointer", textAlign: "left", color: "var(--ink)" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--primary)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-soft)"}>
                    <span style={{ width: 10, height: 10, background: PKD.DERIVATIF_COLOR[f.derivatif] || "#F4A261", borderRadius: 2, transform: "rotate(45deg)" }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12 }}>{f.name}</div>
                      <div className="muted" style={{ fontSize: 10.5 }}>{f.derivatif} · {f.capacity.toLocaleString("id-ID")} t/thn</div>
                    </div>
                    <span className={"check-badge " + (f.status === "Operasi" ? "ok" : "no")} style={{ fontSize: 9.5 }}>{f.status}</span>
                    <span className="muted" style={{ fontSize: 11 }}>→</span>
                  </button>
                ))}
              </div>
            </>
          );
        })()}

        <h4 className="ic-h4">Sumber Data</h4>
        <ul className="src-list">
          <li><span className="src-tag">SoilGrids</span> 2024-Q4</li>
          <li><span className="src-tag">WorldClim</span> v2.1</li>
          <li><span className="src-tag">BPS</span> 2025</li>
          <li><span className="src-tag">OSM</span> 2026-04</li>
        </ul>

        <div className="ic-actions">
          {role === "investor" && <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => onCompare(kab)}>+ Tambah Komparasi</button>}
          {role !== "investor" && <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => onCompare(kab)}>+ Komparasi</button>}
          <button className="btn-ghost">⇣ PDF</button>
        </div>
      </div>
    </div>
  );
};

function StatRow({ name, min, max, avg, p25, p75, tier }) {
  return (
    <div className="stat-row">
      <div className="sr-name">
        {name}
        {tier && <span className={"tier-badge " + tier.cls} style={{ marginLeft: 8, fontSize: 9, padding: "1px 6px" }}>{tier.label}</span>}
      </div>
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
window.RadarChart = function RadarChart({ items, size = 280 }) {
  const axes = [
    { key: "cias", label: "CIAS" },
    { key: "envSuit", label: "Env Suit" },
    { key: "procStrength", label: "Proc Str" },
    { key: "logistics", label: "Logistics" },
    { key: "production", label: "Produksi" },
    { key: "lfi", label: "LFI" },
  ];
  const R = size / 2 - 36;
  const cx = size / 2, cy = size / 2;
  function pt(angle, r) {
    return [cx + Math.cos(angle - Math.PI / 2) * r, cy + Math.sin(angle - Math.PI / 2) * r];
  }
  return (
    <svg width={size} height={size} className="radar">
      {[0.25, 0.5, 0.75, 1].map(t => (
        <polygon key={t} points={axes.map((_, i) => {
          const [x, y] = pt((i / axes.length) * Math.PI * 2, R * t);
          return `${x},${y}`;
        }).join(" ")} fill="none" stroke="#E9ECEF" strokeWidth={0.8} />
      ))}
      {axes.map((ax, i) => {
        const [x, y] = pt((i / axes.length) * Math.PI * 2, R);
        const [lx, ly] = pt((i / axes.length) * Math.PI * 2, R + 18);
        return (
          <g key={ax.key}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#E9ECEF" strokeWidth={0.6} />
            <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle">{ax.label}</text>
          </g>
        );
      })}
      {items.map((it, idx) => {
        const points = axes.map((ax, i) => {
          const v = Math.max(0.02, Math.min(1, it.values[ax.key]));
          const [x, y] = pt((i / axes.length) * Math.PI * 2, R * v);
          return `${x},${y}`;
        }).join(" ");
        return (
          <g key={idx}>
            <polygon points={points} fill={it.color} fillOpacity={0.18} stroke={it.color} strokeWidth={1.6} />
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
window.Legend = function Legend({ mode, derivatifFilter }) {
  if (mode === "default") return null;
  let title = "", min = "0.00", max = "1.00";
  let stops = "linear-gradient(90deg, #F8C5C5 0%, #FACDBC 25%, #FDE3C8 50%, #D4EBE0 75%, #2D6A4F 100%)";
  if (mode === "cias") title = "Composite Industrial Attractiveness Score";
  else if (mode === "gap") { title = "Gap Produksi vs Pengolahan"; min = "Surplus"; max = "Defisit"; stops = "linear-gradient(90deg, #D4EBE0, #FDE3C8, #FACDBC, #F8C5C5)"; }
  else if (mode === "investasi") title = `Suitability Lokasi · ${derivatifFilter || "—"}`;
  else if (mode === "interseksi") { title = "Hasil Interseksi Multi-Layer"; min = "Tidak"; max = "Memenuhi"; stops = "linear-gradient(90deg, #F3F4F6, #FBD38D)"; }
  return (
    <div className="legend">
      <div className="legend-title">{title}</div>
      <div className="legend-bar" style={{ background: stops }} />
      <div className="legend-labels">
        <span>{min}</span><span>0.25</span><span>0.50</span><span>0.75</span><span>{max}</span>
      </div>
    </div>
  );
};

// ========================= CIAS PANEL =========================
window.CIASPanel = function CIASPanel({ onClose, onSelect, selected, scenarioDelta, range, setRange }) {
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
          <button className="btn-ghost" onClick={() => {
            const rows = [["Rank","Kabupaten","Provinsi","CIAS","Tier","Env","Proc","Logistics_Penalty","Produksi_t_thn","Pabrik","LFI"]];
            sorted.forEach((k, i) => rows.push([i+1, k.name, k.province, k.ciasFinal.toFixed(3), tierLabel(k.ciasFinal), k.envSuit.toFixed(2), k.procStrength.toFixed(2), k.logisticsPenalty.toFixed(2), k.production, k.factories, k.lfi.toFixed(2)]));
            downloadCSV(`CIAS_Ranking_${new Date().toISOString().slice(0,10)}.csv`, rows);
          }}>⇣ Excel</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body">
        <table className="ranking-table">
          <thead>
            <tr>
              <th>#</th><th>Kabupaten</th><th>Provinsi</th><th>CIAS</th><th>Tier</th>
              <th>Env</th><th>Proc</th><th>−Log</th>
              <th>Produksi (t/thn)</th><th>Pabrik</th><th>LFI</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((k, i) => {
              const sel = selected && selected.id === k.id;
              return (
                <tr key={k.id} className={sel ? "sel" : ""} onClick={() => onSelect(k)}>
                  <td className="mono">{i + 1}</td>
                  <td><b>{k.name}</b></td>
                  <td className="muted">{k.province}</td>
                  <td><b style={{ color: tierColor(k.ciasFinal) }}>{k.ciasFinal.toFixed(2)}</b></td>
                  <td><span className={"tier-badge " + tierClass(k.ciasFinal)}>{tierLabel(k.ciasFinal)}</span></td>
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
  const list = React.useMemo(() =>
    [...PKD.KABUPATEN].map(k => {
      const gap = (k.production / 420000) - (k.factories / 10);
      return { ...k, gap };
    }).sort((a, b) => b.gap - a.gap).slice(0, 12)
  , []);

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
          <button className="btn-ghost" onClick={() => {
            const rows = [["Kabupaten","Provinsi","Produksi_t_thn","Pabrik","Gap_Score"]];
            list.forEach(k => rows.push([k.name, k.province, k.production, k.factories, k.gap.toFixed(3)]));
            downloadCSV(`Gap_Produksi_${new Date().toISOString().slice(0,10)}.csv`, rows);
          }}>⇣ Excel</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body">
        <div className="gap-grid">
          {list.map(k => {
            const intensity = Math.max(0, Math.min(1, (k.gap + 0.1) * 2));
            const color = k.gap > 0.5 ? "#C53030" : k.gap > 0.25 ? "#E76F51" : k.gap > 0.05 ? "#F4A261" : "#2D6A4F";
            return (
              <div key={k.id} className="gap-card" onClick={() => onSelect(k)}>
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

// ========================= INVESTASI =========================
window.InvestasiPanel = function InvestasiPanel({ derivatif, setDerivatif, onClose, onSelect }) {
  const top5 = React.useMemo(() =>
    [...PKD.KABUPATEN].sort((a, b) => b.cias - a.cias).slice(0, 5)
  , []);

  return (
    <div className="dock-panel">
      <div className="dock-head">
        <div>
          <div className="dock-eyebrow">REKOMENDASI · LOKASI OPTIMAL</div>
          <h3>Top Lokasi untuk Pabrik {derivatif}</h3>
        </div>
        <div className="dock-tools">
          <span className="dock-label">Derivatif:</span>
          <select value={derivatif} onChange={e => setDerivatif(e.target.value)}>
            {PKD.DERIVATIF.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="btn-ghost" onClick={() => {
            const rows = [["Rank","Lokasi","Provinsi","CIAS","Suplai_t_thn","LFI","Env_Suit","Jarak_Pelabuhan_km","Pabrik_Kompetitor","Derivatif_Target"]];
            top5.forEach((k, i) => rows.push([i+1, k.name, k.province, k.cias.toFixed(2), k.production, k.lfi.toFixed(2), k.envSuit.toFixed(2), k.distToPort, k.factories, derivatif]));
            downloadCSV(`Business_Plan_${derivatif}_${new Date().toISOString().slice(0,10)}.csv`, rows);
          }}>⇣ Business Plan</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body">
        <div className="invest-list">
          <div className="invest-head">
            <span>#</span><span>Lokasi</span><span>Skor</span>
            <span>Suplai</span><span>Logistik</span><span>Pasar</span>
            <span>Jarak Pelabuhan</span><span>Kompetitor</span><span></span>
          </div>
          {top5.map((k, i) => {
            const supply = k.production > 100_000;
            const logistic = k.lfi > 0.5;
            const market = k.envSuit > 0.7;
            return (
              <div key={k.id} className="invest-row" onClick={() => onSelect(k)}>
                <span className="rank">#{i + 1}</span>
                <span><b>{k.name}</b> <span className="muted">· {k.province}</span></span>
                <span><b style={{ color: tierColor(k.cias) }}>{k.cias.toFixed(2)}</b></span>
                <span><Badge ok={supply} label="suplai" /></span>
                <span><Badge ok={logistic} label="logistik" /></span>
                <span><Badge ok={market} label="pasar" /></span>
                <span className="mono">{k.distToPort} km</span>
                <span className="mono">{k.factories} pabrik</span>
                <span><button className="btn-outline-primary">Detail</button></span>
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

// ========================= INTERSEKSI =========================
window.InterseksiPanel = function InterseksiPanel({ onClose, onRun, conditions, setConditions, hits, runtime, computing }) {
  const layerOpts = [
    { id: "ph",         label: "pH H₂O",          unit: "" },
    { id: "rain",       label: "Curah hujan",     unit: "mm" },
    { id: "elev",       label: "Elevasi",         unit: "m" },
    { id: "dist-port",  label: "Jarak pelabuhan", unit: "km" },
    { id: "soc",        label: "Soil Organic Carbon", unit: "g/kg" },
    { id: "production", label: "Produksi",        unit: "t/thn" },
  ];
  const ops = [">", "<", "=", "between"];

  function addCondition() { setConditions([...conditions, { layer: "ph", op: ">", val: 5.5, val2: 6.5 }]); }
  function update(i, patch) { setConditions(conditions.map((c, j) => j === i ? { ...c, ...patch } : c)); }
  function remove(i) { setConditions(conditions.filter((_, j) => j !== i)); }

  return (
    <div className="dock-panel">
      <div className="dock-head">
        <div>
          <div className="dock-eyebrow">RISET · INTERSEKSI MULTI-LAYER</div>
          <h3>Layer Cross Analysis</h3>
        </div>
        <div className="dock-tools">
          <button className="btn-primary" onClick={onRun} disabled={computing}>
            {computing ? <><span className="spinner" /> Menghitung…</> : "▶ Hitung Interseksi"}
          </button>
          <button className="btn-ghost" disabled={!hits || hits.size === 0} onClick={() => {
            const features = Array.from(hits || []).map(id => {
              const k = PKD.KABUPATEN.find(x => x.id === id);
              return { type: "Feature", geometry: { type: "Point", coordinates: k.centroid }, properties: { id: k.id, name: k.name, province: k.province, cias: k.cias, production: k.production } };
            });
            const blob = new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], { type: "application/geo+json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a"); a.href = url; a.download = `interseksi_${new Date().toISOString().slice(0,10)}.geojson`;
            document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 200);
          }}>⇣ Ekspor GeoJSON</button>
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
                <input type="number" value={c.val} onChange={e => update(i, { val: parseFloat(e.target.value) })} />
                {c.op === "between" && (
                  <>
                    <span className="cond-unit">—</span>
                    <input type="number" value={c.val2} onChange={e => update(i, { val2: parseFloat(e.target.value) })} />
                  </>
                )}
                <span className="cond-unit">{lay.unit}</span>
                <button className="icon-btn" onClick={() => remove(i)}>✕</button>
              </div>
            );
          })}
          <button className="btn-ghost" onClick={addCondition}>+ Tambah Kondisi</button>
        </div>

        {hits && (
          <div className="cond-result">
            <div className="cr-stats">
              <div><b className="big">{hits.size}</b><span>kabupaten memenuhi</span></div>
              <div><b className="big mono">{runtime.toFixed(2)}s</b><span>waktu komputasi</span></div>
              <div><b className="big">{Math.round(hits.size / PKD.KABUPATEN.length * 100)}%</b><span>dari total</span></div>
            </div>
            <div className="cr-chips">
              {Array.from(hits).slice(0, 28).map(id => {
                const k = PKD.KABUPATEN.find(x => x.id === id);
                return <span key={id} className="hit-chip">{k.name}</span>;
              })}
              {hits.size > 28 && <span className="hit-chip muted">+{hits.size - 28} lainnya</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ========================= SIMULASI =========================
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
          <button className="btn-primary" onClick={() => onSave(delta)}>Simpan Skenario</button>
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
            <div className="delta-label">Delta CIAS Nasional</div>
            <div className="delta-val">+{delta.toFixed(3)}</div>
            <div className="delta-sub">vs baseline 2026</div>
            <div className="delta-bars">
              <div><span>Sulawesi</span><div className="bar"><span style={{ width: Math.min(100, delta * 380) + "%", background: "#2D6A4F" }} /></div></div>
              <div><span>Sumatera</span><div className="bar"><span style={{ width: Math.min(100, delta * 280) + "%", background: "#52A77D" }} /></div></div>
              <div><span>Maluku</span><div className="bar"><span style={{ width: Math.min(100, delta * 320) + "%", background: "#F4A261" }} /></div></div>
              <div><span>Papua</span><div className="bar"><span style={{ width: Math.min(100, delta * 220) + "%", background: "#E76F51" }} /></div></div>
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
  const colors = ["#2D6A4F", "#F4A261", "#3B82F6", "#9B7BD1"];
  const results = query.length > 0
    ? PKD.KABUPATEN.filter(k => k.name.toLowerCase().includes(query.toLowerCase()) || k.province.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

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
          <button className="btn-ghost" disabled={items.length === 0} onClick={() => {
            const rows = [["Lokasi","Provinsi","CIAS","LFI","Produksi_t_thn","Pabrik","Jarak_Pelabuhan_km","Derivatif_Utama"]];
            items.forEach(k => {
              const fs = PKD.FACTORIES.filter(f => f.kab === k.id);
              rows.push([k.name, k.province, k.cias.toFixed(2), k.lfi.toFixed(2), k.production, k.factories, k.distToPort, fs[0]?.derivatif || "-"]);
            });
            downloadCSV(`Komparasi_Lokasi_${new Date().toISOString().slice(0,10)}.csv`, rows);
          }}>⇣ Excel</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body cmp-body">
        {items.length === 0 ? (
          <div className="muted" style={{ padding: "40px 20px", textAlign: "center" }}>
            Belum ada lokasi. Cari di kolom pencarian di atas, atau klik kabupaten di peta lalu pilih "+ Komparasi".
          </div>
        ) : (
          <>
            <table className="cmp-table">
              <thead>
                <tr>
                  <th></th><th>CIAS</th><th>LFI</th><th>Produksi</th>
                  <th>Pabrik</th><th>Jarak Pel.</th><th>Derivatif Utama</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((k, i) => {
                  const factories = PKD.FACTORIES.filter(f => f.kab === k.id);
                  const topDer = factories[0]?.derivatif || "—";
                  return (
                    <tr key={k.id}>
                      <td>
                        <span className="cmp-dot" style={{ background: colors[i] }} />
                        <b>{k.name}</b>
                        <div className="muted">{k.province}</div>
                      </td>
                      <td><b style={{ color: tierColor(k.cias) }}>{k.cias.toFixed(2)}</b></td>
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
            <div className="cmp-radar-wrap">
              <h4 className="cmp-h4">Radar Multidimensi</h4>
              <div className="cmp-radar">
                <RadarChart size={320} items={items.map((k, i) => ({
                  name: k.name, color: colors[i],
                  values: {
                    cias: k.cias, envSuit: k.envSuit, procStrength: k.procStrength,
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
          </>
        )}
      </div>
    </div>
  );
};

// ========================= SUPPLY CHAIN (investor) =========================
window.SupplyChainPanel = function SupplyChainPanel({ onClose, selectedKab }) {
  const k = selectedKab || PKD.KABUPATEN[0];
  const factories = PKD.FACTORIES.filter(f => f.kab === k.id);
  const port = k.nearestPort;

  return (
    <div className="dock-panel">
      <div className="dock-head">
        <div>
          <div className="dock-eyebrow">ANALISIS · RANTAI PASOK</div>
          <h3>Jalur Distribusi dari {k.name}</h3>
        </div>
        <div className="dock-tools">
          <select defaultValue={k.id}>
            {PKD.KABUPATEN.slice(0, 10).map(kk => <option key={kk.id} value={kk.id}>{kk.name}</option>)}
          </select>
          <button className="btn-ghost">⇣ Laporan</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body">
        <div className="sc-body">
          <div className="sc-vis">
            <h4 className="ic-h4" style={{ marginTop: 0 }}>Alur Logistik</h4>
            <div className="sc-flow">
              <div className="sc-arrow" style={{ left: "10%", right: "10%" }} />
              <div className="sc-node">
                <div className="sc-node-ic">🌴</div>
                <div className="sc-node-name">Kebun</div>
                <div className="sc-node-val">{(k.production / 1000).toFixed(0)}K t/thn</div>
              </div>
              <div className="sc-node">
                <div className="sc-node-ic">📦</div>
                <div className="sc-node-name">Pengumpul</div>
                <div className="sc-node-val">3 hub</div>
              </div>
              <div className="sc-node">
                <div className="sc-node-ic">🏭</div>
                <div className="sc-node-name">Pabrik</div>
                <div className="sc-node-val">{factories.length} fasilitas</div>
              </div>
              <div className="sc-node">
                <div className="sc-node-ic">🚛</div>
                <div className="sc-node-name">Transportasi</div>
                <div className="sc-node-val">{k.distToPort} km</div>
              </div>
              <div className="sc-node">
                <div className="sc-node-ic">⚓</div>
                <div className="sc-node-name">Pelabuhan</div>
                <div className="sc-node-val">{port.name.split(" ").slice(-1)[0]}</div>
              </div>
            </div>
          </div>
          <div className="sc-metrics">
            <div className="sc-metric">
              <div>
                <div className="ic-eyebrow" style={{ color: "var(--ink-2)" }}>Estimasi Biaya Logistik</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>per ton CPO setara</div>
              </div>
              <div className="sc-metric-val">Rp {(180_000 + k.distToPort * 850).toLocaleString("id-ID")}</div>
            </div>
            <div className="sc-metric">
              <div>
                <div className="ic-eyebrow" style={{ color: "var(--ink-2)" }}>LFI Jalur</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>logistic friendliness</div>
              </div>
              <div className="sc-metric-val" style={{ color: "var(--primary)" }}>{k.lfi.toFixed(2)}</div>
            </div>
            <div className="sc-metric">
              <div>
                <div className="ic-eyebrow" style={{ color: "var(--ink-2)" }}>Lead Time</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>kebun → ekspor</div>
              </div>
              <div className="sc-metric-val">{Math.round(5 + k.distToPort / 60)} hari</div>
            </div>
            <div className="sc-metric">
              <div>
                <div className="ic-eyebrow" style={{ color: "var(--ink-2)" }}>Kapasitas Pelabuhan</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{port.name}</div>
              </div>
              <div className="sc-metric-val">{port.kapasitas.toLocaleString("id-ID")}</div>
            </div>
            <div className="sc-metric">
              <div>
                <div className="ic-eyebrow" style={{ color: "var(--ink-2)" }}>Ekspor Premium</div>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>tersedia dengan upgrade</div>
              </div>
              <div className="sc-metric-val"><span className="role-pill investor" style={{ fontSize: 9.5 }}>Premium</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================= ADMIN UPLOAD =========================
window.AdminPanel = function AdminPanel({ onClose, mode }) {
  // mode: "admin" (kementan) | "research" (peneliti)
  const isResearch = mode === "research";
  const [adminTab, setAdminTab] = React.useState("upload"); // upload | layers | audit (kementan only)
  const [stage, setStage] = React.useState("idle");
  const [file, setFile] = React.useState(null);
  const [progress, setProgress] = React.useState(0);
  const [columns, setColumns] = React.useState([]);
  const [errors, setErrors] = React.useState([]);
  const [meta, setMeta] = React.useState({ namaRiset: "", institusi: "", tahun: "2026", metode: "" });
  const [visibility, setVisibility] = React.useState(isResearch ? "publik" : "publik");
  const intervalRef = React.useRef();

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) loadFile(f);
  }
  function loadFile(f) {
    setFile(f);
    setStage("preview");
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
          <div className="dock-eyebrow">{isResearch ? "RISET · UPLOAD DATA" : "ADMIN · LAYER MANAGEMENT"}</div>
          <h3>{isResearch ? "Upload Data Riset" : (adminTab === "upload" ? "Upload Layer Data" : adminTab === "layers" ? "Manajemen Layer" : "Log Audit")}</h3>
        </div>
        <div className="dock-tools">
          {!isResearch && (
            <div className="seg" style={{ marginRight: 6 }}>
              <button className={adminTab === "upload" ? "on" : ""} onClick={() => setAdminTab("upload")}>⇪ Upload</button>
              <button className={adminTab === "layers" ? "on" : ""} onClick={() => setAdminTab("layers")}>🗂 Layer</button>
              <button className={adminTab === "audit" ? "on" : ""} onClick={() => setAdminTab("audit")}>📜 Audit</button>
            </div>
          )}
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body">
        {!isResearch && adminTab === "layers" && <LayerManagerView />}
        {!isResearch && adminTab === "audit" && <AuditLogView />}
        {(isResearch || adminTab === "upload") && (
        <div className="upload-grid">
          <div className="drop-zone" onDragOver={e => e.preventDefault()} onDrop={handleDrop}>
            <div className="dz-icon">⇪</div>
            <div className="dz-title">Drag & drop file di sini</div>
            <div className="dz-sub">atau</div>
            <label className="btn-primary">
              Pilih File
              <input type="file" hidden onChange={e => e.target.files[0] && loadFile(e.target.files[0])} />
            </label>
            <div className="dz-formats">CSV · GeoJSON · Shapefile ZIP · GeoTIFF</div>
          </div>

          <div className="upload-preview">
            {stage === "idle" && (
              <div className="placeholder-card">
                <h4>Preview Kolom & Validasi</h4>
                <p>Pilih file untuk melihat preview kolom, validasi schema, dan progress upload.</p>
                <ul>
                  <li>Validasi otomatis: lon/lat range, tipe numerik, nilai missing</li>
                  <li>Estimasi waktu upload berdasarkan ukuran</li>
                  <li>Layer baru muncul di sidebar dalam ≤ 30 detik</li>
                  {!isResearch && <li>Pengaturan visibilitas: Publik / Terbatas / Internal</li>}
                  {!isResearch && <li>Log audit setiap perubahan layer</li>}
                  {isResearch && <li>Metadata riset tersimpan untuk reproducibility</li>}
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

                {isResearch && (
                  <>
                    <h4>Metadata Riset</h4>
                    <div className="meta-grid">
                      <div className="meta-field">
                        <label>Nama Riset</label>
                        <input value={meta.namaRiset} onChange={e => setMeta({ ...meta, namaRiset: e.target.value })} placeholder="contoh: Pemetaan pH tanah kebun kelapa Sulut 2025" />
                      </div>
                      <div className="meta-field">
                        <label>Institusi</label>
                        <input value={meta.institusi} onChange={e => setMeta({ ...meta, institusi: e.target.value })} placeholder="contoh: IPB · Fakultas Pertanian" />
                      </div>
                      <div className="meta-field">
                        <label>Tahun</label>
                        <input value={meta.tahun} onChange={e => setMeta({ ...meta, tahun: e.target.value })} />
                      </div>
                      <div className="meta-field">
                        <label>Metode</label>
                        <input value={meta.metode} onChange={e => setMeta({ ...meta, metode: e.target.value })} placeholder="contoh: Sampling stratified" />
                      </div>
                    </div>
                  </>
                )}

                <h4>Kolom Terdeteksi</h4>
                <div className="cols-grid">
                  {columns.map(c => (
                    <div key={c.name} className={"col-card " + (c.valid ? "ok" : "err")}>
                      <div className="col-name">{c.name}</div>
                      <div className="col-type">{c.type}</div>
                      <div className="col-sample">{c.sample}</div>
                    </div>
                  ))}
                </div>
                {errors.length > 0 && (
                  <div className="err-list">
                    <b>{errors.length} error ditemukan</b>
                    {errors.map((e, i) => (
                      <div key={i} className="err-row">
                        <span className="err-row-i">baris {e.row}</span><span>{e.msg}</span>
                      </div>
                    ))}
                  </div>
                )}

                <h4>Visibilitas</h4>
                <div className="vis-options">
                  {isResearch ? (
                    <>
                      <div className={"vis-option " + (visibility === "publik" ? "on" : "")} onClick={() => setVisibility("publik")}>
                        <b>🌐 Publik</b><span>Bisa diakses semua pengguna</span>
                      </div>
                      <div className={"vis-option " + (visibility === "komunitas" ? "on" : "")} onClick={() => setVisibility("komunitas")}>
                        <b>🔬 Komunitas Riset</b><span>Hanya akun peneliti</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={"vis-option " + (visibility === "publik" ? "on" : "")} onClick={() => setVisibility("publik")}>
                        <b>🌐 Publik</b><span>Semua pengguna</span>
                      </div>
                      <div className={"vis-option " + (visibility === "terbatas" ? "on" : "")} onClick={() => setVisibility("terbatas")}>
                        <b>🔒 Terbatas</b><span>Role tertentu</span>
                      </div>
                      <div className={"vis-option " + (visibility === "internal" ? "on" : "")} onClick={() => setVisibility("internal")}>
                        <b>🏛️ Internal</b><span>Hanya Kementan</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="up-actions">
                  <button className="btn-primary" onClick={startUpload} disabled={errors.length > 0}>▶ Mulai Upload</button>
                  <button className="btn-ghost" onClick={() => setStage("idle")}>Batal</button>
                </div>
              </>
            )}
            {stage === "uploading" && (
              <div className="up-progress">
                <h4>Mengunggah & memproses…</h4>
                <div className="prog-bar"><span style={{ width: progress + "%" }} /></div>
                <div className="prog-stats">
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
                <h4>{isResearch ? "Data riset berhasil diunggah" : "Layer berhasil dipublikasi"}</h4>
                <p className="muted">"{file.name}" tersedia sebagai layer baru di sidebar.</p>
                <button className="btn-primary" onClick={() => { setStage("idle"); setFile(null); }}>Upload Lagi</button>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

// ========================= LAYER MANAGER (Kementan CRUD) =========================
function LayerManagerView() {
  const [layers, setLayers] = React.useState(() => [
    { id: "lyr-001", name: "Produksi Kelapa Sulut 2025",         category: "Pertanian",   tags: ["produksi","BPS"],       geom: "polygon", format: "GeoJSON",  size: "2.4 MB",  version: "v3",  active: true,  visibility: "Publik",     updated: "2026-05-08", uploader: "Bp. A. Pratama" },
    { id: "lyr-002", name: "Pabrik VCO Sulawesi",                 category: "Industri",    tags: ["pabrik","VCO"],         geom: "point",   format: "GeoJSON",  size: "120 KB",  version: "v2",  active: true,  visibility: "Publik",     updated: "2026-05-02", uploader: "Bp. A. Pratama" },
    { id: "lyr-003", name: "pH Tanah 15-30cm — IPB 2024",         category: "Tanah",       tags: ["pH","SoilGrids"],       geom: "polygon", format: "GeoTIFF",  size: "48 MB",   version: "v1",  active: true,  visibility: "Publik",     updated: "2026-04-21", uploader: "Dr. R. Wijaya" },
    { id: "lyr-004", name: "Curah Hujan WorldClim 2.5m",          category: "Lingkungan",  tags: ["curah-hujan"],          geom: "polygon", format: "GeoTIFF",  size: "126 MB",  version: "v1",  active: true,  visibility: "Publik",     updated: "2026-03-14", uploader: "Sistem" },
    { id: "lyr-005", name: "Kapasitas Pelabuhan 2026 (draft)",    category: "Industri",    tags: ["pelabuhan","logistik"], geom: "point",   format: "CSV",      size: "12 KB",   version: "v1",  active: false, visibility: "Internal",   updated: "2026-05-12", uploader: "Bp. A. Pratama" },
    { id: "lyr-006", name: "Roads OSM Maluku 2026",               category: "Infrastruktur", tags: ["roads","OSM"],        geom: "line",    format: "Shapefile", size: "82 MB", version: "v4",  active: true,  visibility: "Publik",     updated: "2026-04-30", uploader: "Sistem" },
    { id: "lyr-007", name: "Indeks Investasi VCO (deprecated)",   category: "Pendukung",   tags: ["indeks","VCO"],         geom: "polygon", format: "GeoJSON",  size: "340 KB",  version: "v2",  active: false, visibility: "Terbatas",   updated: "2026-02-09", uploader: "Bp. A. Pratama" },
  ]);
  const [filter, setFilter] = React.useState("");
  const [showEdit, setShowEdit] = React.useState(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newLayer, setNewLayer] = React.useState({
    name: "", category: "Pertanian", geom: "polygon", tags: "", description: "", visibility: "Publik", source: ""
  });

  function toggleActive(id) {
    setLayers(layers.map(l => l.id === id ? { ...l, active: !l.active } : l));
  }
  function changeVisibility(id, vis) {
    setLayers(layers.map(l => l.id === id ? { ...l, visibility: vis } : l));
  }
  function rollback(id) {
    setLayers(layers.map(l => l.id === id
      ? { ...l, version: "v" + Math.max(1, parseInt(l.version.slice(1)) - 1), updated: new Date().toISOString().slice(0, 10) }
      : l));
  }
  function deleteLayer(id) {
    if (confirm("Hapus layer ini? Data dasar tetap tersimpan dan dapat dipulihkan dari versi sebelumnya.")) {
      setLayers(layers.filter(l => l.id !== id));
    }
  }
  function createLayer() {
    if (!newLayer.name.trim()) return;
    const id = "lyr-" + String(Date.now()).slice(-3);
    setLayers([{
      id,
      name: newLayer.name,
      category: newLayer.category,
      tags: newLayer.tags.split(",").map(s => s.trim()).filter(Boolean),
      geom: newLayer.geom,
      format: "GeoJSON",
      size: "—",
      version: "v1",
      active: true,
      visibility: newLayer.visibility,
      updated: new Date().toISOString().slice(0, 10),
      uploader: AuthAPI.getCurrent()?.name || "Bp. A. Pratama",
    }, ...layers]);
    setShowCreate(false);
    setNewLayer({ name: "", category: "Pertanian", geom: "polygon", tags: "", description: "", visibility: "Publik", source: "" });
  }

  const filtered = layers.filter(l =>
    l.name.toLowerCase().includes(filter.toLowerCase()) ||
    l.category.toLowerCase().includes(filter.toLowerCase()) ||
    (l.tags || []).some(t => t.toLowerCase().includes(filter.toLowerCase()))
  );

  const geomIcon = { point: "•", polygon: "▰", line: "╱" };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <input
          placeholder="Cari layer / kategori / tag…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ flex: "1 1 240px", padding: "7px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, outline: "none" }}
        />
        <span className="muted" style={{ fontSize: 12 }}>{filtered.filter(l => l.active).length} aktif dari {layers.length} total</span>
        <button className="btn-primary sm" onClick={() => setShowCreate(true)}>+ Buat Layer Baru</button>
      </div>

      <table className="ranking-table">
        <thead>
          <tr>
            <th>Status</th><th>Nama Layer</th><th>Tipe</th><th>Kategori</th><th>Tag</th><th>Format</th>
            <th>Versi</th><th>Visibilitas</th><th>Diperbarui</th><th>Pengunggah</th><th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(l => (
            <tr key={l.id} className={!l.active ? "muted" : ""}>
              <td>
                <label className="toggle" style={{ display: "inline-block" }}>
                  <input type="checkbox" checked={l.active} onChange={() => toggleActive(l.id)} />
                  <span className="toggle-track" />
                </label>
              </td>
              <td><b>{l.name}</b></td>
              <td title={l.geom} style={{ fontSize: 14 }}>{geomIcon[l.geom] || "?"} <span className="muted" style={{ fontSize: 10.5 }}>{l.geom}</span></td>
              <td className="muted">{l.category}</td>
              <td>
                {(l.tags || []).map(t => (
                  <span key={t} className="src-tag" style={{ marginRight: 3, fontSize: 9.5 }}>{t}</span>
                ))}
              </td>
              <td className="mono" style={{ fontSize: 11 }}>{l.format}</td>
              <td><span className="src-tag">{l.version}</span></td>
              <td>
                <select value={l.visibility} onChange={e => changeVisibility(l.id, e.target.value)}
                        style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px", fontSize: 11 }}>
                  <option value="Publik">Publik</option>
                  <option value="Terbatas">Terbatas</option>
                  <option value="Internal">Internal</option>
                </select>
              </td>
              <td className="mono" style={{ fontSize: 11 }}>{l.updated}</td>
              <td className="muted" style={{ fontSize: 11 }}>{l.uploader}</td>
              <td>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="icon-btn" title="Edit metadata" onClick={() => setShowEdit(l)}>✎</button>
                  <button className="icon-btn" title="Rollback ke versi sebelumnya" onClick={() => rollback(l.id)}>↶</button>
                  <button className="icon-btn" title="Hapus" onClick={() => deleteLayer(l.id)}>🗑</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showEdit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", zIndex: 200 }} onClick={() => setShowEdit(null)}>
          <div style={{ background: "var(--bg)", padding: 24, borderRadius: 12, width: 440, maxWidth: "calc(100vw - 40px)" }} onClick={e => e.stopPropagation()}>
            <div className="ic-eyebrow">EDIT METADATA</div>
            <h3 style={{ margin: "4px 0 16px" }}>{showEdit.name}</h3>
            <div className="meta-grid">
              <div className="meta-field"><label>Nama Layer</label><input defaultValue={showEdit.name} /></div>
              <div className="meta-field"><label>Kategori</label><input defaultValue={showEdit.category} /></div>
              <div className="meta-field"><label>Tag (pisahkan dengan koma)</label><input defaultValue={(showEdit.tags || []).join(", ")} /></div>
              <div className="meta-field"><label>Visibilitas</label>
                <select defaultValue={showEdit.visibility}>
                  <option>Publik</option><option>Terbatas</option><option>Internal</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setShowEdit(null)}>Batal</button>
              <button className="btn-primary" onClick={() => setShowEdit(null)}>Simpan Perubahan</button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "grid", placeItems: "center", zIndex: 200 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: "var(--bg)", padding: 24, borderRadius: 12, width: 520, maxWidth: "calc(100vw - 40px)" }} onClick={e => e.stopPropagation()}>
            <div className="ic-eyebrow">LAYER BARU</div>
            <h3 style={{ margin: "4px 0 4px" }}>Buat Layer dari Dataset</h3>
            <p className="muted" style={{ fontSize: 12, marginBottom: 16 }}>
              Pilih dataset yang telah diunggah dan konfigurasi tipe objek geometri.
            </p>
            <div className="meta-grid">
              <div className="meta-field" style={{ gridColumn: "1 / -1" }}>
                <label>Nama Layer</label>
                <input value={newLayer.name} onChange={e => setNewLayer({ ...newLayer, name: e.target.value })} placeholder="contoh: Produksi Kopra Sulteng 2025" />
              </div>
              <div className="meta-field">
                <label>Tipe Objek Geometri</label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { id: "point",   ic: "•",  label: "Titik" },
                    { id: "polygon", ic: "▰",  label: "Polygon" },
                    { id: "line",    ic: "╱",  label: "Garis" },
                  ].map(g => (
                    <button key={g.id}
                      onClick={() => setNewLayer({ ...newLayer, geom: g.id })}
                      style={{
                        flex: 1, padding: "10px 8px",
                        background: newLayer.geom === g.id ? "var(--primary-soft)" : "var(--bg)",
                        border: "1px solid " + (newLayer.geom === g.id ? "var(--primary)" : "var(--border)"),
                        borderRadius: 6, fontSize: 12, fontWeight: 500,
                        color: newLayer.geom === g.id ? "var(--primary-ink)" : "var(--ink)",
                        cursor: "pointer"
                      }}>
                      <div style={{ fontSize: 18 }}>{g.ic}</div>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="meta-field">
                <label>Kategori</label>
                <select value={newLayer.category} onChange={e => setNewLayer({ ...newLayer, category: e.target.value })}>
                  <option>Pertanian</option>
                  <option>Industri</option>
                  <option>Lingkungan</option>
                  <option>Tanah</option>
                  <option>Infrastruktur</option>
                  <option>Pendukung</option>
                  <option>Logistik</option>
                </select>
              </div>
              <div className="meta-field" style={{ gridColumn: "1 / -1" }}>
                <label>Deskripsi</label>
                <input value={newLayer.description} onChange={e => setNewLayer({ ...newLayer, description: e.target.value })} placeholder="Deskripsi singkat tujuan layer ini" />
              </div>
              <div className="meta-field" style={{ gridColumn: "1 / -1" }}>
                <label>Tag Kategori (pisahkan dengan koma)</label>
                <input value={newLayer.tags} onChange={e => setNewLayer({ ...newLayer, tags: e.target.value })} placeholder="contoh: kopra, BPS, regional" />
              </div>
              <div className="meta-field">
                <label>Sumber Dataset</label>
                <select value={newLayer.source} onChange={e => setNewLayer({ ...newLayer, source: e.target.value })}>
                  <option value="">— Pilih dataset terunggah —</option>
                  <option>produksi_sulut_apr2026.geojson</option>
                  <option>pabrik_vco_sulteng_2026.geojson</option>
                  <option>pelabuhan_2026_q2.csv</option>
                </select>
              </div>
              <div className="meta-field">
                <label>Visibilitas</label>
                <select value={newLayer.visibility} onChange={e => setNewLayer({ ...newLayer, visibility: e.target.value })}>
                  <option>Publik</option><option>Terbatas</option><option>Internal</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <button className="btn-ghost" onClick={() => setShowCreate(false)}>Batal</button>
              <button className="btn-primary" onClick={createLayer} disabled={!newLayer.name.trim()}>✓ Buat Layer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================= AUDIT LOG (Kementan) =========================
function AuditLogView() {
  const dataEvents = [
    { ts: "2026-05-12 14:32", user: "Bp. A. Pratama",   action: "TOGGLE",   target: "Kapasitas Pelabuhan 2026 (draft)",  detail: "Nonaktifkan layer (visibility: Internal)", role: "kementan" },
    { ts: "2026-05-12 11:08", user: "Bp. A. Pratama",   action: "UPLOAD",   target: "produksi_sulut_apr2026.geojson",    detail: "1,248 features · 2.1 MB · validasi OK", role: "kementan" },
    { ts: "2026-05-10 16:55", user: "Dr. R. Wijaya",    action: "UPLOAD",   target: "pH_tanah_sulut_2024_v1.tif",        detail: "GeoTIFF 48 MB · visibilitas: Komunitas Riset", role: "peneliti" },
    { ts: "2026-05-09 09:48", user: "Bp. A. Pratama",   action: "PUBLISH",  target: "Skenario: Konversi +50K ha Sulawesi", detail: "Δ CIAS +0.07 · disimpan ke registry", role: "kementan" },
    { ts: "2026-05-08 14:22", user: "Sistem",           action: "REFRESH",  target: "WorldClim v2.1 sync",                detail: "Auto-update layer Curah Hujan 12 bulan", role: "system" },
    { ts: "2026-05-08 10:14", user: "Bp. A. Pratama",   action: "EDIT",     target: "Pabrik VCO Sulawesi",                detail: "Visibilitas: Terbatas → Publik", role: "kementan" },
    { ts: "2026-05-05 17:33", user: "Bp. A. Pratama",   action: "ROLLBACK", target: "Indeks Investasi VCO",               detail: "v3 → v2 (formula bobot direvisi)", role: "kementan" },
    { ts: "2026-05-03 13:21", user: "Ibu S. Halim",     action: "VIEW",     target: "CIAS Ranking Nasional",              detail: "Ekspor Excel · 31 kabupaten", role: "investor" },
    { ts: "2026-04-30 09:10", user: "Sistem",           action: "UPLOAD",   target: "Roads OSM Maluku 2026 v4",           detail: "82 MB · auto-sync OSM", role: "system" },
    { ts: "2026-04-21 15:45", user: "Bp. A. Pratama",   action: "CREATE",   target: "Layer Kustom: Indeks Logistik",      detail: "Formula: 0.6 × LFI + 0.4 × jarak_pelabuhan", role: "kementan" },
  ];
  // Pull session access events from AuthAPI access log
  const sessionEvents = AuthAPI.getAccessLog().map(e => ({
    ts: e.ts,
    user: e.user,
    action: e.event, // LOGIN, LOGOUT, REGISTER, VERIFIED
    target: "Sesi pengguna",
    detail: `${e.email} · ${e.role}`,
    role: e.role,
  }));
  const events = [...sessionEvents, ...dataEvents].slice(0, 30);

  const actionColors = {
    UPLOAD:   { bg: "var(--ok-bg)",     ink: "var(--ok-ink)" },
    EDIT:     { bg: "var(--info-bg)",   ink: "var(--info-ink)" },
    TOGGLE:   { bg: "var(--warn-bg)",   ink: "var(--warn-ink)" },
    ROLLBACK: { bg: "var(--warn-bg)",   ink: "var(--warn-ink)" },
    PUBLISH:  { bg: "var(--ok-bg)",     ink: "var(--ok-ink)" },
    REFRESH:  { bg: "var(--surface-2)", ink: "var(--ink-2)" },
    VIEW:     { bg: "var(--surface-2)", ink: "var(--ink-2)" },
    CREATE:   { bg: "var(--info-bg)",   ink: "var(--info-ink)" },
    LOGIN:    { bg: "#E0E7FF",          ink: "#3730A3" },
    LOGOUT:   { bg: "#F3F4F6",          ink: "#4B5563" },
    REGISTER: { bg: "#FCE7F3",          ink: "#9D174D" },
    VERIFIED: { bg: "var(--ok-bg)",     ink: "var(--ok-ink)" },
  };
  const [actionFilter, setActionFilter] = React.useState("ALL");
  const filtered = actionFilter === "ALL" ? events :
    (actionFilter === "SESSION" ? events.filter(e => ["LOGIN","LOGOUT","REGISTER","VERIFIED"].includes(e.action)) :
     events.filter(e => e.action === actionFilter));

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <span className="muted" style={{ fontSize: 12 }}>Filter aksi:</span>
        <div className="seg">
          {[
            { id: "ALL", label: "Semua" },
            { id: "UPLOAD", label: "UPLOAD" },
            { id: "EDIT", label: "EDIT" },
            { id: "PUBLISH", label: "PUBLISH" },
            { id: "ROLLBACK", label: "ROLLBACK" },
            { id: "TOGGLE", label: "TOGGLE" },
            { id: "SESSION", label: "Sesi" },
          ].map(a => (
            <button key={a.id} className={actionFilter === a.id ? "on" : ""} onClick={() => setActionFilter(a.id)}>{a.label}</button>
          ))}
        </div>
        <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>{filtered.length} entri</span>
        <button className="btn-ghost" onClick={() => {
          const rows = [["Timestamp","Aksi","Target","Detail","Pengguna","Role"]];
          filtered.forEach(e => rows.push([e.ts, e.action, e.target, e.detail, e.user, e.role]));
          downloadCSV(`Audit_Log_${new Date().toISOString().slice(0,10)}.csv`, rows);
        }}>⇣ Ekspor CSV</button>
      </div>

      <div style={{ background: "var(--surface)", borderRadius: 8, padding: 4 }}>
        {filtered.map((e, i) => {
          const c = actionColors[e.action] || actionColors.VIEW;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "130px 80px 1fr 200px", gap: 14, alignItems: "center", padding: "10px 14px", borderBottom: i === filtered.length - 1 ? "none" : "1px solid var(--border-soft)", background: "var(--bg)", borderRadius: 6, margin: 4 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-2)" }}>{e.ts}</span>
              <span style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: c.bg, color: c.ink, textAlign: "center", letterSpacing: 0.04 + "em" }}>{e.action}</span>
              <div>
                <b style={{ fontSize: 13 }}>{e.target}</b>
                <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{e.detail}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={"role-pill " + (e.role === "system" ? "" : e.role)} style={{ fontSize: 9.5 }}>{e.role === "system" ? "Sistem" : (e.role === "kementan" ? "Kementan" : e.role === "investor" ? "Investor" : "Peneliti")}</span>
                <span className="muted" style={{ fontSize: 11 }}>{e.user}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ========================= STATISTIK PANEL (peneliti) =========================
window.StatistikPanel = function StatistikPanel({ onClose, onSelect, selected, activeLayers }) {
  const formula = React.useRef([
    { variable: "ph", weight: 0.3 },
    { variable: "rain", weight: 0.4 },
    { variable: "soc", weight: 0.3 },
  ]);
  const [formulaRows, setFormulaRows] = React.useState(formula.current);
  const [layerName, setLayerName] = React.useState("Indeks Kesesuaian Kelapa v1");
  const [layerDesc, setLayerDesc] = React.useState("Weighted sum pH + curah hujan + SOC");
  const [shareMode, setShareMode] = React.useState("private"); // private | community | public
  const [savedLayers, setSavedLayers] = React.useState([
    { name: "Indeks Kesesuaian Varietas X (Genjah Salak)", share: "community", author: "Dr. R. Wijaya · IPB", date: "2026-04-12" },
    { name: "Komposit Risiko Banjir Kebun",                share: "public",    author: "Dr. A. Setiawan · BRIN", date: "2026-03-28" },
  ]);

  function saveLayer() {
    setSavedLayers([
      { name: layerName, share: shareMode, author: AuthAPI.getCurrent()?.name || "Saya", date: new Date().toISOString().slice(0, 10) },
      ...savedLayers
    ]);
  }

  const varOptions = [
    { id: "ph", label: "pH H₂O" },
    { id: "rain", label: "Curah hujan" },
    { id: "soc", label: "SOC" },
    { id: "nitrogen", label: "Nitrogen" },
    { id: "elev", label: "Elevasi" },
    { id: "dist-port", label: "Jarak pelabuhan" },
  ];
  function updateRow(i, patch) { setFormulaRows(formulaRows.map((r, j) => j === i ? { ...r, ...patch } : r)); }
  function addRow() { setFormulaRows([...formulaRows, { variable: "ph", weight: 0.1 }]); }
  function removeRow(i) { setFormulaRows(formulaRows.filter((_, j) => j !== i)); }

  return (
    <div className="dock-panel">
      <div className="dock-head">
        <div>
          <div className="dock-eyebrow">RISET · STATISTIK & LAYER KUSTOM</div>
          <h3>Formula Builder + Statistik per Wilayah</h3>
        </div>
        <div className="dock-tools">
          <button className="btn-primary">💾 Simpan Layer</button>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="dock-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <h4 className="ic-h4">Statistik Layer Aktif</h4>
            {selected ? (
              <>
                <div className="ic-strong" style={{ marginBottom: 10 }}>{selected.name} · <span className="muted">{selected.province}</span></div>
                <div className="stat-table">
                  <StatRow name="Produksi kelapa" min="12.4K" max="187K" avg={(selected.production / 1000).toFixed(0) + "K"} p25="38K" p75="94K"
                    tier={selected.production > 150_000 ? { cls: "tier-1", label: "Tinggi" } : selected.production > 80_000 ? { cls: "tier-2", label: "Sedang" } : { cls: "tier-3", label: "Rendah" }} />
                  <StatRow name="Curah hujan (12mo)" min="1.420" max="2.890" avg={(1500 + (selected.cias * 1200)).toFixed(0)} p25="1.680" p75="2.310"
                    tier={selected.cias > 0.7 ? { cls: "tier-1", label: "Optimal" } : selected.cias > 0.5 ? { cls: "tier-2", label: "Cukup" } : { cls: "tier-3", label: "Marginal" }} />
                  <StatRow name="pH H₂O 15–30cm" min="4.8" max="6.7" avg={(5 + selected.envSuit * 1.4).toFixed(1)} p25="5.2" p75="6.1"
                    tier={selected.envSuit > 0.8 ? { cls: "tier-1", label: "Ideal" } : selected.envSuit > 0.6 ? { cls: "tier-2", label: "Sesuai" } : { cls: "tier-3", label: "Suboptimal" }} />
                  <StatRow name="SOC 15–30cm" min="6" max="38" avg={(10 + selected.envSuit * 22).toFixed(0)} p25="14" p75="28"
                    tier={selected.envSuit > 0.8 ? { cls: "tier-1", label: "Subur" } : selected.envSuit > 0.6 ? { cls: "tier-2", label: "Cukup" } : { cls: "tier-3", label: "Miskin" }} />
                  <StatRow name="Nitrogen" min="0.5" max="3.8" avg={(0.5 + selected.envSuit * 2.5).toFixed(1)} p25="1.2" p75="2.4"
                    tier={selected.envSuit > 0.8 ? { cls: "tier-1", label: "Tinggi" } : selected.envSuit > 0.6 ? { cls: "tier-2", label: "Sedang" } : { cls: "tier-3", label: "Rendah" }} />
                </div>
                <p className="muted" style={{ fontSize: 11, marginTop: 10, fontStyle: "italic" }}>
                  Sitasi: BPS (2025) · SoilGrids v2.0 (2024) · WorldClim v2.1 (2022) — diakses 2026-05-12
                </p>
                <button className="btn-ghost" style={{ marginTop: 12 }}>⇣ Ekspor PDF</button>
              </>
            ) : (
              <div className="muted" style={{ padding: 18 }}>Klik kabupaten di peta untuk melihat statistik per layer.</div>
            )}
          </div>
          <div>
            <h4 className="ic-h4">Formula Builder (Layer Kustom)</h4>
            <div className="meta-grid">
              <div className="meta-field">
                <label>Nama Layer</label>
                <input value={layerName} onChange={e => setLayerName(e.target.value)} />
              </div>
              <div className="meta-field">
                <label>Deskripsi</label>
                <input value={layerDesc} onChange={e => setLayerDesc(e.target.value)} />
              </div>
            </div>
            <div className="formula-builder">
              {formulaRows.map((r, i) => (
                <div key={i} className="formula-row">
                  <select value={r.variable} onChange={e => updateRow(i, { variable: e.target.value })}>
                    {varOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                  <input type="number" step={0.05} value={r.weight} onChange={e => updateRow(i, { weight: parseFloat(e.target.value) })} />
                  <button className="icon-btn" onClick={() => removeRow(i)}>✕</button>
                </div>
              ))}
              <button className="btn-ghost" onClick={addRow}>+ Tambah Variabel</button>
              <div className="formula-preview">
                <b>indeks</b> = {formulaRows.map(r => `${r.weight} × ${r.variable}`).join("  +  ")}
                <div style={{ marginTop: 6 }}>Σ bobot = <b>{formulaRows.reduce((s, r) => s + r.weight, 0).toFixed(2)}</b></div>
              </div>

              <h4 className="ic-h4" style={{ marginTop: 18 }}>Berbagi Layer Ini</h4>
              <div className="vis-options">
                <div className={"vis-option " + (shareMode === "private" ? "on" : "")} onClick={() => setShareMode("private")}>
                  <b>🔒 Pribadi</b><span>Hanya saya</span>
                </div>
                <div className={"vis-option " + (shareMode === "community" ? "on" : "")} onClick={() => setShareMode("community")}>
                  <b>🔬 Komunitas Riset</b><span>Semua peneliti</span>
                </div>
                <div className={"vis-option " + (shareMode === "public" ? "on" : "")} onClick={() => setShareMode("public")}>
                  <b>🌐 Publik</b><span>Semua pengguna</span>
                </div>
              </div>
              <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                Metadata formula tersimpan otomatis untuk reproducibility & sitasi akademik.
              </p>
              <button className="btn-primary sm" style={{ marginTop: 10 }} onClick={saveLayer}>💾 Simpan & Bagikan</button>
            </div>

            <h4 className="ic-h4" style={{ marginTop: 18 }}>Layer Kustom Tersimpan ({savedLayers.length})</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {savedLayers.map((l, i) => {
                const shareLabel = l.share === "private" ? "🔒 Pribadi" : l.share === "community" ? "🔬 Komunitas" : "🌐 Publik";
                const shareCls = l.share === "private" ? "" : l.share === "community" ? "info-bg" : "ok-bg";
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "10px 12px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 12.5 }}>{l.name}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{l.author} · {l.date}</div>
                    </div>
                    <span style={{ fontSize: 10.5, padding: "3px 9px", borderRadius: 999, background: l.share === "private" ? "var(--surface)" : l.share === "community" ? "var(--info-bg)" : "var(--ok-bg)", color: l.share === "private" ? "var(--ink-2)" : l.share === "community" ? "var(--info-ink)" : "var(--ok-ink)", fontWeight: 500 }}>
                      {shareLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
