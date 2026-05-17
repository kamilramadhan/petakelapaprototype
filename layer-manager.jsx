// layer-manager.jsx — Add Layer Modal, Create Group Modal, Intersection Type Panel, CIAS User Layers Summary

// ---- Geometry type definitions ----
const GEOM_TYPES = [
  { id: "polygon", label: "Polygon",  icon: "⬡", dim: 2, accept: ".geojson,.json,.shp,.kml,.gpkg", desc: "Batas wilayah, area tutupan lahan" },
  { id: "points",  label: "Points",   icon: "⬤", dim: 0, accept: ".geojson,.json,.csv,.shp,.kml",  desc: "Lokasi titik: sumur, stasiun, dsb." },
  { id: "line",    label: "Line",     icon: "〰", dim: 1, accept: ".geojson,.json,.shp,.kml,.gpkg", desc: "Jalan, sungai, pipa, jaringan" },
  { id: "raster",  label: "Raster",   icon: "▦", dim: 2, accept: ".tif,.tiff,.geotiff,.asc,.nc",   desc: "Data grid: elevasi, suhu, curah hujan" },
  { id: "mesh",    label: "Mesh 3D",  icon: "⬡̈", dim: 3, accept: ".obj,.gltf,.glb,.las,.laz",     desc: "Model permukaan 3D / LiDAR point cloud" },
];
window.GEOM_TYPES = GEOM_TYPES;

// ---- Intersection result type logic ----
function intersectionResultType(typeA, typeB) {
  const ga = GEOM_TYPES.find(t => t.id === typeA) || { dim: 2, id: typeA };
  const gb = GEOM_TYPES.find(t => t.id === typeB) || { dim: 2, id: typeB };

  // Raster special cases
  if (typeA === "raster" && typeB === "raster")
    return { type: "raster",   icon: "▦", label: "Raster",        desc: "Pixel-wise overlay / algebra raster" };
  if (typeA === "raster" || typeB === "raster") {
    const other = typeA === "raster" ? gb : ga;
    if (other.dim === 0) return { type: "points",  icon: "⬤", label: "Points",  desc: "Nilai raster di-sample pada lokasi titik" };
    if (other.dim === 1) return { type: "line",    icon: "〰", label: "Line",    desc: "Profil nilai raster sepanjang garis" };
    return               { type: "raster",  icon: "▦", label: "Raster (clip)", desc: "Raster di-clip ke batas polygon" };
  }
  if (typeA === "mesh" || typeB === "mesh")
    return { type: "mesh", icon: "⬡̈", label: "Mesh 3D", desc: "Intersection volumetrik / 3D clip" };

  // Vector × vector: result = min dimension
  const minDim = Math.min(ga.dim, gb.dim);
  if (minDim >= 2) return { type: "polygon", icon: "⬡", label: "Polygon", desc: "Irisan area — polygon overlap keduanya" };
  if (minDim === 1) return { type: "points",  icon: "⬤", label: "Points",  desc: "Titik-titik persimpangan antar garis" };
  return               { type: "points",  icon: "⬤", label: "Points",  desc: "Titik-titik yang co-location" };
}
window.intersectionResultType = intersectionResultType;

const ATTR_TYPES = ["string", "number", "boolean", "date", "enum"];

// ========================= ADD LAYER MODAL =========================
window.AddLayerModal = function AddLayerModal({ onClose, onSave, existingGroups, user, onStartDrawing }) {
  const [step, setStep] = React.useState(1);
  const [form, setForm] = React.useState({
    name: "", description: "", geomType: "polygon",
    group: "", newGroup: "", color: "#2D6A4F",
    shared: false,
    attributes: [{ name: "name", type: "string", rule: "not null", required: true }],
  });
  const [file, setFile] = React.useState(null);
  const [progress, setProgress] = React.useState(0);
  const [uploading, setUploading] = React.useState(false);
  const [uploadDone, setUploadDone] = React.useState(false);
  const [savedLayer, setSavedLayer] = React.useState(null);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function addAttr() {
    setForm(f => ({ ...f, attributes: [...f.attributes, { name: "", type: "number", rule: "", required: false }] }));
  }
  function removeAttr(i) {
    setForm(f => ({ ...f, attributes: f.attributes.filter((_, idx) => idx !== i) }));
  }
  function updateAttr(i, k, v) {
    setForm(f => { const a = [...f.attributes]; a[i] = { ...a[i], [k]: v }; return { ...f, attributes: a }; });
  }

  function doUpload() {
    setUploading(true); setProgress(0);
    let p = 0;
    const iv = setInterval(() => {
      p += 14 + Math.random() * 14;
      if (p >= 100) {
        clearInterval(iv); setProgress(100);
        setUploading(false); setUploadDone(true);
      } else setProgress(Math.min(99, p));
    }, 140);
  }

  function buildLayer() {
    const groupName = form.group === "__new" ? form.newGroup : form.group;
    return {
      id: "user-" + Date.now(),
      name: form.name,
      geomType: form.geomType,
      description: form.description,
      group: groupName || "User Layers",
      color: form.color,
      shared: form.shared,
      attributes: form.attributes,
      fileName: file?.name || null,
      createdBy: user?.email,
      instansi: user?.instansi,
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      active: true,
      opacity: 0.75,
      validationPassRate: 0.60 + Math.random() * 0.35,
      icon: GEOM_TYPES.find(t => t.id === form.geomType)?.icon || "⬤",
    };
  }

  function doSave() {
    const layer = buildLayer();
    setSavedLayer(layer);
    onSave(layer, layer.group);
    setStep(4);
  }

  const geomType = GEOM_TYPES.find(t => t.id === form.geomType);
  const groups = [...(existingGroups || [])].filter(Boolean);

  const stepLabels = ["Info", "Atribut", "Upload", "Selesai"];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card wide" style={{ width: 560, maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
        <div className="mc-head">
          <div>
            <div className="mc-eyebrow">LAYER MANAGER · {stepLabels[step - 1]}</div>
            <h3>{step === 4 ? "✓ Layer berhasil dibuat" : "Tambah Layer Baru"}</h3>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", marginBottom: 18, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {stepLabels.map((s, i) => (
            <div key={i} style={{ flex: 1, padding: "7px 0", background: step === i + 1 ? "var(--primary)" : step > i + 1 ? "var(--primary-soft)" : "var(--surface)", color: step === i + 1 ? "white" : step > i + 1 ? "var(--primary-ink)" : "var(--ink-3)", textAlign: "center", fontSize: 11, fontWeight: 600, borderRight: i < 3 ? "1px solid var(--border)" : "none" }}>
              {step > i + 1 ? "✓ " : ""}{s}
            </div>
          ))}
        </div>

        {/* STEP 1 — Info */}
        {step === 1 && (
          <div>
            <div className="auth-field">
              <label>Nama Layer *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="cth: Suhu Rata-rata Malang 2025" />
            </div>
            <div className="auth-field">
              <label>Deskripsi</label>
              <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Sumber data, periode, unit, dsb." />
            </div>

            <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 8 }}>Tipe Geometri *</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 14 }}>
              {GEOM_TYPES.map(gt => (
                <button key={gt.id} onClick={() => set("geomType", gt.id)}
                  style={{ padding: "9px 11px", background: form.geomType === gt.id ? "var(--primary-soft)" : "var(--surface)", border: `1px solid ${form.geomType === gt.id ? "var(--primary)" : "var(--border)"}`, borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5, color: form.geomType === gt.id ? "var(--primary-ink)" : "var(--ink)" }}>{gt.icon} {gt.label}</div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-2)", marginTop: 2 }}>{gt.desc}</div>
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 5 }}>Grup Layer</div>
                <select value={form.group} onChange={e => set("group", e.target.value)}
                  style={{ width: "100%", height: 36, padding: "0 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}>
                  <option value="">— Tanpa grup —</option>
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                  <option value="__new">+ Buat grup baru…</option>
                </select>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 5 }}>Warna Layer</div>
                <input type="color" value={form.color} onChange={e => set("color", e.target.value)}
                  style={{ width: "100%", height: 36, padding: 2, border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }} />
              </div>
            </div>

            {form.group === "__new" && (
              <div className="auth-field">
                <label>Nama Grup Baru</label>
                <input value={form.newGroup} onChange={e => set("newGroup", e.target.value)} placeholder="cth: Lingkungan, Sosial Ekonomi…" />
              </div>
            )}

            <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--border-soft)", cursor: "pointer", marginBottom: 4 }}>
              <label className="toggle">
                <input type="checkbox" checked={form.shared} onChange={e => set("shared", e.target.checked)} />
                <span className="toggle-track" />
              </label>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>Bagikan ke institusi</div>
                <div style={{ fontSize: 11, color: "var(--ink-2)" }}>Anggota {user?.instansi || "institusi Anda"} dapat melihat layer ini</div>
              </div>
            </label>
          </div>
        )}

        {/* STEP 2 — Attributes & Validation */}
        {step === 2 && (
          <div>
            <div className="threshold-help" style={{ marginBottom: 12 }}>
              Definisikan atribut layer beserta aturan validasi. Aturan ini digunakan saat data di-upload dan untuk menghitung skor CIAS.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr 1.5fr 36px 24px", gap: 5, marginBottom: 5, padding: "0 4px" }}>
              {["Nama Atribut", "Tipe Data", "Aturan Validasi", "Wajib", ""].map((h, i) => (
                <div key={i} style={{ fontSize: 10, fontWeight: 600, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 10 }}>
              {form.attributes.map((attr, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 0.9fr 1.5fr 36px 24px", gap: 5, alignItems: "center", padding: "6px 8px", background: "var(--surface)", borderRadius: 6 }}>
                  <input value={attr.name} onChange={e => updateAttr(i, "name", e.target.value)} placeholder="nama_atribut"
                    style={{ height: 28, padding: "0 7px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11.5, background: "var(--bg)" }} />
                  <select value={attr.type} onChange={e => updateAttr(i, "type", e.target.value)}
                    style={{ height: 28, padding: "0 4px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11.5, background: "var(--bg)" }}>
                    {ATTR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input value={attr.rule} onChange={e => updateAttr(i, "rule", e.target.value)}
                    placeholder={attr.type === "number" ? "> 0 | between 0 100" : "not null"}
                    style={{ height: 28, padding: "0 7px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11, background: "var(--bg)", fontFamily: "var(--mono)" }} />
                  <label className="toggle" style={{ margin: "0 auto" }}>
                    <input type="checkbox" checked={attr.required} onChange={e => updateAttr(i, "required", e.target.checked)} />
                    <span className="toggle-track" />
                  </label>
                  <button className="icon-btn" style={{ width: 22, height: 22, fontSize: 10 }} onClick={() => removeAttr(i)} disabled={i === 0}>✕</button>
                </div>
              ))}
            </div>
            <button className="btn-ghost" onClick={addAttr} style={{ width: "100%", textAlign: "center" }}>+ Tambah Atribut</button>
            <div className="validation-card" style={{ marginTop: 12 }}>
              <h5>Contoh Aturan Validasi</h5>
              <ul>
                <li>Number: <code>{"> 0"}</code>, <code>{"between 0 100"}</code>, <code>{"not null"}</code></li>
                <li>String: <code>{"not null"}</code>, <code>{"in [A,B,C]"}</code>, <code>{"regex ^[A-Z]"}</code></li>
                <li>Date: <code>{"after 2020-01-01"}</code></li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 3 — Upload or Draw on Map */}
        {step === 3 && (
          <div>
            {/* Mode tabs */}
            {form.geomType !== "raster" && (
              <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 3, gap: 3, marginBottom: 14 }}>
                {[["upload", "⇪ Upload File"], ["draw", "✏ Gambar di Peta"]].map(([mode, label]) => (
                  <button key={mode} onClick={() => setForm(f => ({ ...f, _inputMode: mode }))}
                    style={{ flex: 1, padding: "8px 0", background: (form._inputMode || "upload") === mode ? "var(--primary)" : "transparent", color: (form._inputMode || "upload") === mode ? "white" : "var(--ink-2)", border: 0, borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Upload mode */}
            {(form._inputMode || "upload") === "upload" && (
              <>
                <div className="validation-card">
                  <h5>Format yang Diterima — {geomType?.label}</h5>
                  <ul>
                    <li>Format: <code>{geomType?.accept}</code></li>
                    <li>Sistem koordinat: <code>EPSG:4326 (WGS84)</code></li>
                    <li>Maks. ukuran: <code>200 MB</code></li>
                  </ul>
                </div>
                {!file && !uploading && (
                  <div className="drop-zone"
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}>
                    <div className="dz-icon">{geomType?.icon}</div>
                    <div className="dz-title">Drag &amp; drop file {geomType?.label}</div>
                    <div className="dz-sub">atau</div>
                    <label className="btn-primary" style={{ display: "inline-flex", alignItems: "center" }}>
                      Pilih File
                      <input type="file" hidden accept={geomType?.accept} onChange={e => e.target.files[0] && setFile(e.target.files[0])} />
                    </label>
                    <div className="dz-formats">{geomType?.accept}</div>
                  </div>
                )}
                {file && !uploading && !uploadDone && (
                  <div>
                    <div className="up-file">
                      <span className="up-icon">{geomType?.icon}</span>
                      <div><b>{file.name}</b><div className="muted mono">{(file.size / 1024).toFixed(1)} KB · {geomType?.label}</div></div>
                      <button className="icon-btn" style={{ marginLeft: "auto" }} onClick={() => setFile(null)}>✕</button>
                    </div>
                    <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={doUpload}>⇪ Upload &amp; Validasi</button>
                  </div>
                )}
                {uploading && (
                  <div>
                    <div className="prog-bar"><span style={{ width: progress + "%" }} /></div>
                    <ul className="up-steps">
                      <li className={progress > 20 ? "done" : ""}>✓ Cek format &amp; CRS</li>
                      <li className={progress > 45 ? "done" : ""}>{progress > 45 ? "✓" : "•"} Validasi skema atribut</li>
                      <li className={progress > 70 ? "done" : ""}>{progress > 70 ? "✓" : "•"} Validasi rule per atribut</li>
                      <li className={progress > 90 ? "done" : ""}>{progress > 90 ? "✓" : "•"} Indexing spasial</li>
                    </ul>
                  </div>
                )}
                {uploadDone && (
                  <div className="validation-card" style={{ background: "var(--ok-bg)", borderColor: "#A7E0BD" }}>
                    <h5 style={{ color: "var(--ok-ink)" }}>✓ Upload berhasil</h5>
                    <div style={{ fontSize: 12, color: "var(--ok-ink)" }}>{file?.name} siap divisualisasikan.</div>
                  </div>
                )}
                <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-3)", textAlign: "center", fontStyle: "italic" }}>Upload opsional — bisa ditambahkan nanti.</div>
              </>
            )}

            {/* Draw on map mode */}
            {(form._inputMode || "upload") === "draw" && (
              <div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px", textAlign: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{geomType?.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Gambar {geomType?.label} di Peta</div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6, marginBottom: 12 }}>
                    {geomType?.id === "polygon" && "Klik beberapa titik di peta untuk membentuk polygon. Double-click atau klik Selesai untuk menutup."}
                    {geomType?.id === "points" && "Klik sekali di peta untuk menempatkan titik lokasi."}
                    {geomType?.id === "line" && "Klik beberapa titik berurutan untuk menggambar garis. Double-click atau klik Selesai untuk mengakhiri."}
                    {geomType?.id === "mesh" && "Klik beberapa titik untuk menentukan batas area mesh 3D."}
                  </div>
                </div>
                <div className="threshold-help">
                  Modal ini akan ditutup sementara. Gambar di peta, lalu klik Selesai — layer akan langsung dibuat.
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4 — Done */}
        {step === 4 && (
          <div className="up-done">
            <div className="done-check">✓</div>
            <h3 style={{ margin: "0 0 6px" }}>{form.name}</h3>
            <p style={{ color: "var(--ink-2)", fontSize: 13 }}>
              Layer berhasil dibuat dan aktif di peta.{form.shared && <> Dibagikan ke <b>{user?.instansi}</b>.</>}
            </p>
            <div className="metric-grid" style={{ textAlign: "left", marginTop: 14 }}>
              <div className="metric"><div className="m-label">Tipe</div><div className="m-value">{geomType?.icon} {geomType?.label}</div></div>
              <div className="metric"><div className="m-label">Grup</div><div className="m-value">{(form.group === "__new" ? form.newGroup : form.group) || "User Layers"}</div></div>
              <div className="metric"><div className="m-label">Atribut</div><div className="m-value">{form.attributes.length}</div></div>
              <div className="metric"><div className="m-label">Akses</div><div className="m-value">{form.shared ? "Institusi" : "Private"}</div></div>
            </div>
          </div>
        )}

        <div className="mc-actions">
          {step > 1 && step < 4 && <button className="btn-ghost" onClick={() => setStep(s => s - 1)}>← Kembali</button>}
          {step < 4 && <button className="btn-ghost" onClick={onClose}>Batal</button>}
          {step === 1 && <button className="btn-primary" disabled={!form.name} onClick={() => setStep(2)}>Lanjut →</button>}
          {step === 2 && <button className="btn-primary" onClick={() => setStep(3)}>Lanjut →</button>}
          {step === 3 && (
            <button className="btn-primary"
              onClick={() => {
                if ((form._inputMode || "upload") === "draw") {
                  onStartDrawing && onStartDrawing(form);
                } else {
                  doSave();
                }
              }}>
              {(form._inputMode || "upload") === "draw" ? "✏ Mulai Menggambar" : uploadDone ? "✓ Buat Layer" : "Lewati & Buat Layer"}
            </button>
          )}
          {step === 4 && <button className="btn-primary" onClick={onClose}>Buka di Peta →</button>}
        </div>
      </div>
    </div>
  );
};

// ========================= CREATE LAYER GROUP MODAL =========================
window.CreateLayerGroupModal = function CreateLayerGroupModal({ userLayers, onClose, onSave }) {
  const [groupName, setGroupName] = React.useState("");
  const [selected, setSelected] = React.useState(new Set());

  const allItems = [
    ...PKD.LAYERS.flatMap(g => g.items.map(i => ({ ...i, source: "system", groupLabel: g.group }))),
    ...(userLayers || []).map(l => ({ ...l, source: "user", groupLabel: l.group || "User Layer" })),
  ];

  function toggle(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card wide" onClick={e => e.stopPropagation()}>
        <div className="mc-head">
          <div><div className="mc-eyebrow">LAYER MANAGER · BUAT GRUP</div><h3>Buat Layer Group</h3></div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="threshold-help">
          Kelompokkan beberapa layer menjadi satu grup tematik (cth: "Lingkungan", "Sosial Ekonomi"). Grup memudahkan manajemen dan analisis CIAS bersama.
        </div>
        <div className="auth-field">
          <label>Nama Grup *</label>
          <input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="cth: Lingkungan, Infrastruktur, Sosial Ekonomi…" />
        </div>
        <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 7 }}>Pilih layer yang akan dimasukkan:</div>
        <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
          {allItems.map(item => (
            <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: selected.has(item.id) ? "var(--primary-soft)" : "var(--surface)", border: `1px solid ${selected.has(item.id) ? "var(--primary)" : "var(--border-soft)"}`, borderRadius: 6, cursor: "pointer" }}>
              <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggle(item.id)} />
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: selected.has(item.id) ? 600 : 400 }}>{item.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--ink-2)" }}>{item.groupLabel} · {item.source === "user" ? "User" : "Sistem"}</div>
              </div>
              {selected.has(item.id) && <span style={{ color: "var(--primary)" }}>✓</span>}
            </label>
          ))}
        </div>
        <div style={{ marginTop: 8, padding: "7px 10px", background: "var(--surface)", borderRadius: 5, fontSize: 11.5, color: "var(--ink-2)" }}>
          {selected.size} layer dipilih
        </div>
        <div className="mc-actions">
          <button className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn-primary" disabled={!groupName || selected.size === 0}
            onClick={() => { onSave(groupName, Array.from(selected)); onClose(); }}>
            ✓ Buat Grup ({selected.size} layer)
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================= INTERSECTION TYPE EXPLORER =========================
window.IntersectionTypePanel = function IntersectionTypePanel({ userLayers }) {
  const [layerA, setLayerA] = React.useState("");
  const [layerB, setLayerB] = React.useState("");

  const systemLayers = PKD.LAYERS.flatMap(g => g.items.map(i => ({ ...i, geomType: "polygon", source: "system" })));
  const combined = [
    ...systemLayers,
    ...(userLayers || []).map(l => ({ ...l, source: "user" })),
  ];

  const infoA = combined.find(l => l.id === layerA);
  const infoB = combined.find(l => l.id === layerB);
  const result = layerA && layerB && layerA !== layerB
    ? intersectionResultType(infoA?.geomType || "polygon", infoB?.geomType || "polygon")
    : null;

  const DIMS = ["raster", "polygon", "line", "points"];
  const selectStyle = { height: 32, padding: "0 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, width: "100%" };

  return (
    <div style={{ marginBottom: 16 }}>
      <div className="rp-section-title" style={{ marginTop: 8 }}><span>Intersection Type Explorer</span></div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 10 }}>
        <select value={layerA} onChange={e => setLayerA(e.target.value)} style={selectStyle}>
          <option value="">— Layer A —</option>
          {combined.map(l => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
        </select>
        <span style={{ fontSize: 20, color: "var(--primary)", fontWeight: 700, textAlign: "center" }}>∩</span>
        <select value={layerB} onChange={e => setLayerB(e.target.value)} style={selectStyle}>
          <option value="">— Layer B —</option>
          {combined.map(l => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
        </select>
      </div>

      {result && (
        <div style={{ background: "linear-gradient(135deg, var(--primary-soft), #EEF7F1)", border: "1px solid #C8E0D2", borderRadius: 8, padding: "11px 13px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--primary-ink)", marginBottom: 5 }}>Hasil Interseksi</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>{result.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--primary-ink)" }}>{result.label}</div>
              <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 1 }}>{result.desc}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, fontSize: 11, color: "var(--ink-2)", fontFamily: "var(--mono)", flexWrap: "wrap" }}>
            <span style={{ background: "var(--bg)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>{infoA?.name}</span>
            <span>∩</span>
            <span style={{ background: "var(--bg)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)" }}>{infoB?.name}</span>
            <span>→</span>
            <span style={{ background: "var(--primary)", padding: "2px 8px", borderRadius: 4, color: "white", fontWeight: 700 }}>{result.label}</span>
          </div>
        </div>
      )}

      {/* Matrix */}
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-2)", marginBottom: 5 }}>Matriks Tipe Hasil</div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ fontSize: 10, borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ padding: "4px 7px", background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--border)", textAlign: "left" }}>∩</th>
              {DIMS.map(d => {
                const gt = GEOM_TYPES.find(t => t.id === d);
                return <th key={d} style={{ padding: "4px 7px", background: "var(--surface)", color: "var(--ink-2)", border: "1px solid var(--border)", textAlign: "center" }}>{gt?.icon} {d}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {DIMS.map(rowType => (
              <tr key={rowType}>
                <td style={{ padding: "4px 7px", background: "var(--surface)", fontWeight: 600, color: "var(--ink-2)", border: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                  {GEOM_TYPES.find(t => t.id === rowType)?.icon} {rowType}
                </td>
                {DIMS.map(colType => {
                  const r = intersectionResultType(rowType, colType);
                  const isHighlighted = result && infoA?.geomType === rowType && infoB?.geomType === colType;
                  return (
                    <td key={colType} style={{ padding: "4px 7px", textAlign: "center", border: "1px solid var(--border)", background: isHighlighted ? "var(--primary-soft)" : "var(--bg)", fontWeight: isHighlighted ? 700 : 400, color: isHighlighted ? "var(--primary-ink)" : "var(--ink)" }}>
                      {r.icon} <span style={{ fontSize: 9 }}>{r.type}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ========================= EDIT LAYER MODAL =========================
window.EditLayerModal = function EditLayerModal({ layer, onClose, onSave, onDelete, allGroupNames }) {
  const [form, setForm] = React.useState({
    name: layer.name || "",
    description: layer.description || "",
    color: layer.color || "#2D6A4F",
    group: layer.group || "",
    shared: layer.shared || false,
    attributes: JSON.parse(JSON.stringify(layer.attributes || [])),
  });
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const geomType = GEOM_TYPES.find(t => t.id === layer.geomType);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }
  function addAttr() { setForm(f => ({ ...f, attributes: [...f.attributes, { name: "", type: "string", rule: "", required: false }] })); }
  function removeAttr(i) { setForm(f => ({ ...f, attributes: f.attributes.filter((_, idx) => idx !== i) })); }
  function updateAttr(i, k, v) { setForm(f => { const a = [...f.attributes]; a[i] = { ...a[i], [k]: v }; return { ...f, attributes: a }; }); }

  const groups = [...new Set([...(allGroupNames || []), form.group].filter(Boolean))];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card wide" style={{ width: 520 }} onClick={e => e.stopPropagation()}>
        <div className="mc-head">
          <div>
            <div className="mc-eyebrow">LAYER MANAGER · EDIT</div>
            <h3>{geomType?.icon} {layer.name}</h3>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }}>
          <div className="auth-field" style={{ marginBottom: 10 }}>
            <label>Nama Layer</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} />
          </div>
          <div className="auth-field" style={{ marginBottom: 10 }}>
            <label>Deskripsi</label>
            <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Sumber data, periode, unit…" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5 }}>Grup</label>
              <select value={form.group} onChange={e => set("group", e.target.value)}
                style={{ width: "100%", height: 36, padding: "0 8px", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
                <option value="__new">+ Grup baru…</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5 }}>Warna</label>
              <input type="color" value={form.color} onChange={e => set("color", e.target.value)}
                style={{ width: "100%", height: 36, padding: 2, border: "1px solid var(--border)", borderRadius: 6 }} />
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "var(--surface)", borderRadius: 8, marginBottom: 14, cursor: "pointer" }}>
            <label className="toggle">
              <input type="checkbox" checked={form.shared} onChange={e => set("shared", e.target.checked)} />
              <span className="toggle-track" />
            </label>
            <span style={{ fontSize: 12.5 }}>Bagikan ke institusi saya</span>
          </label>

          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6 }}>Atribut &amp; Validasi</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 1.5fr 28px 22px", gap: 5, marginBottom: 4, padding: "0 4px" }}>
            {["Nama", "Tipe", "Aturan", "Req", ""].map((h, i) => (
              <div key={i} style={{ fontSize: 9.5, fontWeight: 600, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8, maxHeight: 160, overflowY: "auto" }}>
            {form.attributes.map((attr, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.5fr 0.9fr 1.5fr 28px 22px", gap: 5, alignItems: "center", padding: "5px 6px", background: "var(--surface)", borderRadius: 5 }}>
                <input value={attr.name} onChange={e => updateAttr(i, "name", e.target.value)}
                  style={{ height: 26, padding: "0 6px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11, background: "var(--bg)" }} />
                <select value={attr.type} onChange={e => updateAttr(i, "type", e.target.value)}
                  style={{ height: 26, padding: "0 3px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 11, background: "var(--bg)" }}>
                  {["string","number","boolean","date","enum"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input value={attr.rule} onChange={e => updateAttr(i, "rule", e.target.value)} placeholder="> 0 | not null"
                  style={{ height: 26, padding: "0 6px", border: "1px solid var(--border)", borderRadius: 4, fontSize: 10.5, background: "var(--bg)", fontFamily: "var(--mono)" }} />
                <label className="toggle" style={{ margin: "0 auto", transform: "scale(0.8)" }}>
                  <input type="checkbox" checked={attr.required} onChange={e => updateAttr(i, "required", e.target.checked)} />
                  <span className="toggle-track" />
                </label>
                <button onClick={() => removeAttr(i)} disabled={i === 0}
                  style={{ background: "none", border: 0, color: "var(--ink-3)", cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>
              </div>
            ))}
          </div>
          <button className="btn-ghost" onClick={addAttr} style={{ width: "100%", textAlign: "center", fontSize: 12, marginBottom: 14 }}>+ Tambah Atribut</button>
        </div>

        <div className="mc-actions">
          {!confirmDelete
            ? <button className="btn-ghost" style={{ color: "var(--danger-ink)", borderColor: "#FECACA", marginRight: "auto" }} onClick={() => setConfirmDelete(true)}>🗑 Hapus</button>
            : <div style={{ display: "flex", gap: 8, alignItems: "center", marginRight: "auto" }}>
                <span style={{ fontSize: 12, color: "var(--danger-ink)" }}>Yakin?</span>
                <button className="btn-ghost" style={{ color: "var(--danger-ink)", borderColor: "#FECACA" }} onClick={() => { onDelete(layer.id); onClose(); }}>Ya, Hapus</button>
                <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Batal</button>
              </div>
          }
          <button className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn-primary" onClick={() => { onSave({ ...layer, ...form }); onClose(); }}>✓ Simpan</button>
        </div>
      </div>
    </div>
  );
};

// ========================= DRAWING OVERLAY (draw on map) =========================
window.DrawingOverlay = function DrawingOverlay({ geomType, onComplete, onCancel }) {
  const [points, setPoints] = React.useState([]);
  const [mouse, setMouse] = React.useState(null);
  const overlayRef = React.useRef(null);

  function getPos(e) {
    const rect = overlayRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  // Convert pixel to approximate WGS84 (Indonesia bbox)
  function pixelToLatLon(x, y) {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return [0, 0];
    const lon = 95 + (x / rect.width) * 46;   // 95°E → 141°E
    const lat = 6 - (y / rect.height) * 17;    // 6°N → -11°S
    return [parseFloat(lon.toFixed(4)), parseFloat(lat.toFixed(4))];
  }

  function handleClick(e) {
    if (e.detail >= 2) return;
    e.stopPropagation();
    const pos = getPos(e);
    if (geomType === "points") {
      onComplete([pos], [pixelToLatLon(pos.x, pos.y)], "points");
      return;
    }
    setPoints(prev => [...prev, { ...pos, coord: pixelToLatLon(pos.x, pos.y) }]);
  }

  function handleDoubleClick(e) {
    e.stopPropagation();
    if (geomType === "line" && points.length >= 2) {
      onComplete(points, points.map(p => p.coord), "line");
    } else if (geomType === "polygon" && points.length >= 3) {
      onComplete(points, points.map(p => p.coord), "polygon");
    }
  }

  function handleFinish() {
    if (geomType === "line" && points.length >= 2) onComplete(points, points.map(p => p.coord), "line");
    else if (geomType === "polygon" && points.length >= 3) onComplete(points, points.map(p => p.coord), "polygon");
  }

  const preview = mouse ? [...points, { ...mouse }] : points;
  const minPts = geomType === "polygon" ? 3 : geomType === "line" ? 2 : 1;
  const canFinish = points.length >= minPts;

  const instrText = {
    points:  "Klik sekali di peta untuk menempatkan titik",
    line:    points.length === 0 ? "Klik untuk mulai menggambar garis" : `${points.length} titik · klik lanjut · double-click selesai`,
    polygon: points.length < 3   ? `${points.length}/3 titik minimum · terus klik` : `${points.length} titik · double-click atau Selesai`,
    mesh:    "Pilih batas area mesh di peta",
    raster:  "Raster tidak bisa digambar manual — gunakan upload file",
  }[geomType] || "Klik untuk menggambar";

  return (
    <div ref={overlayRef} style={{ position: "absolute", inset: 0, zIndex: 20, cursor: "crosshair" }}
      onClick={handleClick} onDoubleClick={handleDoubleClick}
      onMouseMove={e => { const p = getPos(e); setMouse(p); }}>

      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {/* polygon fill preview */}
        {geomType === "polygon" && preview.length >= 3 && (
          <polygon points={preview.map(p => `${p.x},${p.y}`).join(" ")}
            fill="rgba(45,106,79,0.14)" stroke="#2D6A4F" strokeWidth={1.5} strokeDasharray="5 3" />
        )}
        {/* line/polygon edges */}
        {(geomType === "line" || geomType === "polygon") && preview.length >= 2 && (
          <polyline points={preview.map(p => `${p.x},${p.y}`).join(" ")}
            fill="none" stroke="#2D6A4F" strokeWidth={2} />
        )}
        {/* vertices */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={6} fill="#2D6A4F" stroke="white" strokeWidth={2} />
            <text x={p.x + 9} y={p.y + 4} fontSize="10" fill="#1B4332" fontWeight="600">{i + 1}</text>
          </g>
        ))}
        {/* cursor preview dot */}
        {mouse && geomType !== "points" && (
          <circle cx={mouse.x} cy={mouse.y} r={4} fill="rgba(45,106,79,0.45)" stroke="#2D6A4F" strokeWidth={1.5} />
        )}
        {mouse && geomType === "points" && (
          <g>
            <circle cx={mouse.x} cy={mouse.y} r={10} fill="rgba(45,106,79,0.15)" />
            <circle cx={mouse.x} cy={mouse.y} r={4} fill="#2D6A4F" />
          </g>
        )}
      </svg>

      {/* Floating instruction bar */}
      <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", background: "rgba(27,67,50,0.93)", color: "white", padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", backdropFilter: "blur(6px)", whiteSpace: "nowrap" }}>
        <span>{instrText}</span>
        {canFinish && (
          <button onClick={e => { e.stopPropagation(); handleFinish(); }}
            style={{ background: "#52A77D", color: "white", border: 0, borderRadius: 6, padding: "5px 13px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
            ✓ Selesai
          </button>
        )}
        <button onClick={e => { e.stopPropagation(); onCancel(); }}
          style={{ background: "rgba(255,255,255,0.15)", color: "white", border: 0, borderRadius: 6, padding: "5px 11px", fontSize: 12, cursor: "pointer" }}>
          Batal
        </button>
      </div>

      {/* Coordinates readout */}
      {mouse && (
        <div style={{ position: "absolute", bottom: 80, right: 16, background: "rgba(27,67,50,0.8)", color: "white", padding: "4px 10px", borderRadius: 6, fontSize: 10.5, fontFamily: "var(--mono)" }}>
          {pixelToLatLon(mouse.x, mouse.y).map(n => n.toFixed(4)).join(", ")}
        </div>
      )}
    </div>
  );
};

// ========================= SAVE INTERSECTION AS LAYER =========================
window.SaveIntersectionAsLayer = function SaveIntersectionAsLayer({ hits, conditions, onSave, onClose }) {
  const [name, setName] = React.useState("Hasil Interseksi " + new Date().toISOString().slice(5, 10));
  const [group, setGroup] = React.useState("Hasil Analisis");
  const [color, setColor] = React.useState("#F4A261");

  function save() {
    const kabList = Array.from(hits).map(id => PKD.KABUPATEN.find(k => k.id === id)).filter(Boolean);
    const layer = {
      id: "intersect-" + Date.now(),
      name,
      geomType: "points",
      description: `Interseksi: ${conditions.map(c => `${c.layer} ${c.op} ${c.val}`).join(" AND ")}`,
      group,
      color,
      shared: false,
      attributes: [
        { name: "name", type: "string", rule: "not null", required: true },
        { name: "cias", type: "number", rule: "> 0", required: false },
        { name: "production", type: "number", rule: "> 0", required: false },
      ],
      geometry: kabList.map(k => ({ coord: k.centroid, props: { name: k.name, cias: k.cias, production: k.production } })),
      fileName: null,
      createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
      active: true,
      opacity: 0.85,
      validationPassRate: 0.82 + Math.random() * 0.15,
      icon: "⬤",
      source: "intersection",
    };
    onSave(layer, group);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
        <div className="mc-head">
          <div>
            <div className="mc-eyebrow">INTERSEKSI → LAYER BARU</div>
            <h3>Simpan Hasil sebagai Layer</h3>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div style={{ background: "var(--surface)", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 12, color: "var(--ink-2)" }}>
          <b style={{ color: "var(--ink)" }}>{hits?.size || 0} kabupaten</b> akan disimpan sebagai layer titik baru yang dapat ditoggle, dipindah grup, dan dianalisis lebih lanjut.
        </div>
        <div className="auth-field" style={{ marginBottom: 10 }}>
          <label>Nama Layer</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5 }}>Grup</label>
            <input value={group} onChange={e => setGroup(e.target.value)}
              style={{ width: "100%", height: 34, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, background: "var(--bg)" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 5 }}>Warna</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)}
              style={{ width: "100%", height: 34, padding: 2, border: "1px solid var(--border)", borderRadius: 6 }} />
          </div>
        </div>
        <div className="mc-actions">
          <button className="btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn-primary" disabled={!name} onClick={save}>✓ Simpan sebagai Layer</button>
        </div>
      </div>
    </div>
  );
};
window.CIASUserLayersSummary = function CIASUserLayersSummary({ userLayers, activeLayers }) {
  const activeUL = (userLayers || []).filter(l => activeLayers && activeLayers.has(l.id));
  if (activeUL.length === 0) return null;

  const byGroup = {};
  activeUL.forEach(l => {
    const g = l.group || "User Layers";
    if (!byGroup[g]) byGroup[g] = [];
    byGroup[g].push(l);
  });

  const avgPassRate = activeUL.reduce((s, l) => s + (l.validationPassRate || 0.7), 0) / activeUL.length;

  return (
    <div style={{ marginBottom: 14 }}>
      <div className="cias-gauge" style={{ marginBottom: 10 }}>
        <div className="cg-val">{avgPassRate.toFixed(2)}</div>
        <div className="cg-label">CIAS · User Layers</div>
        <div className="cg-sub">{activeUL.length} layer aktif · {Object.keys(byGroup).length} grup</div>
      </div>
      {Object.entries(byGroup).map(([group, layers]) => {
        const gs = layers.reduce((s, l) => s + (l.validationPassRate || 0.7), 0) / layers.length;
        return (
          <div key={group}>
            <div className="rp-section-title" style={{ marginTop: 4 }}>
              <span>{group}</span>
              <span className="count" style={{ color: gs >= 0.7 ? "var(--ok-ink)" : "var(--warn-ink)" }}>{gs.toFixed(2)}</span>
            </div>
            {layers.map(l => {
              const score = l.validationPassRate || 0.7;
              return (
                <div key={l.id} style={{ display: "grid", gridTemplateColumns: "16px 1fr auto auto", gap: 8, alignItems: "center", padding: "6px 8px", background: "var(--surface)", borderRadius: 6, marginBottom: 4, borderLeft: `3px solid ${l.color || "var(--primary)"}` }}>
                  <span style={{ fontSize: 11 }}>{l.icon}</span>
                  <div>
                    <div style={{ fontSize: 11.5, fontWeight: 500 }}>{l.name}</div>
                    <div style={{ fontSize: 9.5, color: "var(--ink-3)", fontFamily: "var(--mono)" }}>{l.geomType} · {l.attributes?.length || 0} attr</div>
                  </div>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 700, color: score >= 0.7 ? "var(--primary)" : "var(--warn-ink)" }}>{score.toFixed(2)}</span>
                  <span className={"sub-pill " + (score >= 0.7 ? "pass" : "fail")}>{score >= 0.7 ? "OK" : "!"}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
