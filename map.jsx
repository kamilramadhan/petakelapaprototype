// Map component — light theme custom SVG map of Indonesia.
// Uses d3-geo (CDN) for proper projection. Adds zoom/pan, choropleth coloring,
// markers for factories/ports, hover/click interactions.

const { useRef, useEffect, useState, useMemo, useCallback } = React;

window.PetaMap = function PetaMap(props) {
  const {
    mode,
    activeLayers,
    derivatifFilter,
    onSelectKab,
    selectedKab,
    selectedDerivatif,
    intersectionHits,
    bar3D,
    scenarioDelta,
    userLayers,
    opacities: mapOpacities,
  } = props;

  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 1000, h: 600 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [tilt, setTilt] = useState(14);
  const [hoverKab, setHoverKab] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function onResize() {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    }
    onResize();
    window.addEventListener("resize", onResize);
    const id = setInterval(() => setTick(t => t + 1), 1600);
    return () => { window.removeEventListener("resize", onResize); clearInterval(id); };
  }, []);

  const projection = useMemo(() => {
    return d3.geoMercator()
      .center([118, -2.5])
      .scale(Math.max(size.w, 800) * 1.1)
      .translate([size.w / 2, size.h / 2]);
  }, [size.w, size.h]);

  const path = useMemo(() => d3.geoPath(projection), [projection]);

  function ringToD(ring) { return path({ type: "Polygon", coordinates: [ring] }); }
  function pt(lonlat) { return projection(lonlat); }

  function ciasColor(c) {
    if (c >= 0.8) return "#2D6A4F";
    if (c >= 0.6) return "#52A77D";
    if (c >= 0.4) return "#F4A261";
    if (c >= 0.25) return "#E76F51";
    return "#C53030";
  }
  function ciasFill(c) {
    if (c >= 0.8) return "#D4EBE0";
    if (c >= 0.6) return "#E0F0E8";
    if (c >= 0.4) return "#FDE3C8";
    if (c >= 0.25) return "#FACDBC";
    return "#F8C5C5";
  }

  function kabFill(k) {
    if (intersectionHits && intersectionHits.has(k.id)) return "#FBD38D";
    if (mode === "cias") return ciasFill(Math.min(1, k.cias + (scenarioDelta || 0)));
    if (mode === "gap") {
      const gap = (k.production / 420000) - (k.factories / 10);
      if (gap > 0.5) return "#F8C5C5";
      if (gap > 0.25) return "#FACDBC";
      if (gap > 0.05) return "#FDE3C8";
      return "#D4EBE0";
    }
    if (mode === "investasi" && selectedDerivatif) {
      const seed = (k.id.charCodeAt(0) + selectedDerivatif.length) % 100 / 100;
      const score = Math.min(1, (k.cias * 0.7) + 0.3 * seed);
      return ciasFill(score);
    }
    return "#DCE4D2"; // default — darker than land for visibility
  }

  function kabStroke(k) {
    if (intersectionHits && intersectionHits.has(k.id)) return "#D97706";
    if (mode === "cias") return ciasColor(Math.min(1, k.cias + (scenarioDelta || 0)));
    if (mode === "gap") {
      const gap = (k.production / 420000) - (k.factories / 10);
      if (gap > 0.5) return "#C53030";
      if (gap > 0.25) return "#E76F51";
      if (gap > 0.05) return "#F4A261";
      return "#2D6A4F";
    }
    return "#A8B898";
  }

  // Pan/zoom
  const drag = useRef({ active: false, x: 0, y: 0 });
  function onMouseDown(e) {
    if (e.target.closest('.dock-panel, .info-card, .legend, .mode-pill, .bar3d-ctrl, .map-toolbar, .cesium-banner')) return;
    drag.current = { active: true, x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  }
  function onMouseMove(e) {
    if (wrapRef.current) {
      const r = wrapRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - r.left, y: e.clientY - r.top });
    }
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setTransform(t => ({ ...t, x: drag.current.tx + dx, y: drag.current.ty + dy }));
  }
  function onMouseUp() { drag.current.active = false; }
  function onWheel(e) {
    if (e.target.closest('.dock-panel, .info-card')) return;
    e.preventDefault();
    const dk = e.deltaY < 0 ? 1.15 : 0.87;
    setTransform(t => ({ ...t, k: Math.max(0.6, Math.min(6, t.k * dk)) }));
  }

  window.__pkdMapReset = () => { setTransform({ x: 0, y: 0, k: 1 }); setTilt(14); };
  window.__pkdMapZoom = (delta) => setTransform(t => ({ ...t, k: Math.max(0.6, Math.min(6, t.k * delta)) }));
  window.__pkdMapTilt = (d) => setTilt(t => Math.max(0, Math.min(40, t + d)));

  function barValue(k) {
    if (!bar3D || !bar3D.enabled) return null;
    const v = bar3D.variable;
    const seed = (k.id.charCodeAt(1) || 5) / 26;
    if (v === "curah-hujan") return 1500 + seed * 1800;
    if (v === "suhu") return 22 + seed * 8;
    if (v === "ph") return 4.8 + seed * 2;
    if (v === "soc") return 8 + seed * 30;
    if (v === "nitrogen") return 0.5 + seed * 3.5;
    if (v === "night-light") return seed * 90;
    return seed * 100;
  }
  function barMax() {
    const v = bar3D && bar3D.variable;
    if (v === "curah-hujan") return 3300;
    if (v === "suhu") return 30;
    if (v === "ph") return 6.8;
    if (v === "soc") return 38;
    if (v === "nitrogen") return 4;
    return 90;
  }
  function barColor() {
    const v = bar3D && bar3D.variable;
    if (v === "curah-hujan") return "#3B82F6";
    if (v === "suhu") return "#F4A261";
    if (v === "ph") return "#2D6A4F";
    if (v === "soc") return "#52A77D";
    if (v === "nitrogen") return "#9B7BD1";
    if (v === "night-light") return "#FBBF24";
    return "#2D6A4F";
  }

  const transformStyle = `perspective(1800px) rotateX(${tilt}deg)`;

  return (
    <div
      ref={wrapRef}
      className="map-wrap"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      <div className="map-bg" />
      <div className="map-grid" />

      <svg width={size.w} height={size.h} style={{ transform: transformStyle, transformOrigin: "center 55%", position: "relative" }}>
        <defs>
          <pattern id="rasterDots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.9" fill="#2D6A4F" opacity="0.45" />
          </pattern>
          <pattern id="rasterRain" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect x="1.2" y="0" width="0.9" height="3" fill="#3B82F6" opacity="0.35" />
          </pattern>
          <pattern id="rasterTemp" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="6" fill="#F4A261" opacity="0.22" />
          </pattern>
          <pattern id="rasterNight" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="0.7" fill="#FBBF24" opacity="0.55" />
          </pattern>
          <filter id="mapShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.5" />
            <feOffset dx="0" dy="2" result="off" />
            <feFlood floodColor="#000" floodOpacity="0.08" />
            <feComposite in2="off" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Region landmasses */}
          {PKD.REGIONS.map(r => (
            <path key={r.id} d={ringToD(r.ring)} fill="#E8EDE3" stroke="#A8B898" strokeWidth={0.8} filter="url(#mapShadow)" />
          ))}

          {/* Coconut density raster overlay */}
          {activeLayers.has("kebun-kelapa") && (
            <g opacity={0.7}>
              {PKD.KABUPATEN.map(k => {
                const intensity = Math.min(1, k.production / 250_000);
                return (
                  <circle
                    key={"cn-" + k.id}
                    cx={pt(k.centroid)[0]}
                    cy={pt(k.centroid)[1]}
                    r={6 + intensity * 26}
                    fill="url(#rasterDots)"
                    opacity={0.4 + intensity * 0.5}
                    style={{ pointerEvents: "none" }}
                  />
                );
              })}
            </g>
          )}
          {activeLayers.has("curah-hujan") && (
            <g opacity={0.5}>
              {PKD.KABUPATEN.map(k => (
                <circle key={"rn-" + k.id} cx={pt(k.centroid)[0]} cy={pt(k.centroid)[1]} r={28} fill="url(#rasterRain)" style={{ pointerEvents: "none" }} />
              ))}
            </g>
          )}
          {activeLayers.has("suhu") && (
            <g opacity={0.45}>
              {PKD.KABUPATEN.map(k => (
                <circle key={"tm-" + k.id} cx={pt(k.centroid)[0]} cy={pt(k.centroid)[1]} r={32} fill="url(#rasterTemp)" style={{ pointerEvents: "none" }} />
              ))}
            </g>
          )}
          {activeLayers.has("nightlight") && (
            <g opacity={0.6}>
              {PKD.PORTS.map(p => (
                <circle key={"nl-" + p.id} cx={pt(p.coord)[0]} cy={pt(p.coord)[1]} r={22} fill="url(#rasterNight)" style={{ pointerEvents: "none" }} />
              ))}
            </g>
          )}

          {/* Kabupaten polygons — ALWAYS rendered so they are always clickable.
               Fill/stroke reflects active mode; opacity is reduced when in default mode
               to give a subtle "background" feel. */}
          {PKD.KABUPATEN.map(k => {
            const isSel = selectedKab && selectedKab.id === k.id;
            const isHover = hoverKab && hoverKab.id === k.id;
            const isHit = intersectionHits && intersectionHits.has(k.id);
            // In default mode show a light fill so polygons are visible but not
            // distracting.  In CIAS / gap / investasi mode show full choropleth.
            const fill = kabFill(k);
            const opacity = isHit ? 0.9 :
              (mode === "default" ? (isHover || isSel ? 0.65 : 0.45) : 0.78);
            return (
              <path
                key={k.id}
                d={ringToD(k.ring)}
                fill={fill}
                fillOpacity={opacity}
                stroke={isSel ? "#2D6A4F" : (isHover ? "#2D6A4F" : kabStroke(k))}
                strokeWidth={isSel ? 2.5 : (isHover ? 1.6 : 0.9)}
                style={{ cursor: "pointer", transition: "stroke 120ms, stroke-width 120ms, fill-opacity 120ms" }}
                onMouseEnter={() => setHoverKab(k)}
                onMouseLeave={() => setHoverKab(null)}
                onClick={(e) => { e.stopPropagation(); onSelectKab(k); }}
              />
            );
          })}

          {/* Region boundaries */}
          {activeLayers.has("batas") && PKD.REGIONS.map(r => (
            <path key={"b-" + r.id} d={ringToD(r.ring)} fill="none" stroke="#7CA083" strokeWidth={0.5} strokeDasharray="3 2" opacity={0.6} />
          ))}

          {/* 3D bar chart */}
          {bar3D && bar3D.enabled && PKD.KABUPATEN.map(k => {
            const [x, y] = pt(k.centroid);
            const v = barValue(k);
            const h = (v / barMax()) * 80;
            const w = 7;
            return (
              <g key={"bar-" + k.id}>
                <rect x={x - w / 2} y={y - h} width={w} height={h} fill={barColor()} opacity={0.85} />
                <rect x={x - w / 2} y={y - h} width={w} height={2} fill="#fff" opacity={0.7} />
                <line x1={x - w / 2} y1={y} x2={x - w / 2} y2={y - h} stroke="rgba(0,0,0,0.25)" strokeWidth={0.8} />
              </g>
            );
          })}

          {/* Pelabuhan */}
          {activeLayers.has("pelabuhan") && PKD.PORTS.map(p => {
            const [x, y] = pt(p.coord);
            return (
              <g key={p.id} style={{ cursor: "pointer" }}
                 onClick={(e) => { e.stopPropagation(); props.onSelectPort && props.onSelectPort(p); }}>
                <circle cx={x} cy={y} r={8} fill="#3B82F6" fillOpacity={0.18} />
                <circle cx={x} cy={y} r={4.5} fill="#3B82F6" stroke="white" strokeWidth={1.2} />
              </g>
            );
          })}

          {/* Pabrik */}
          {activeLayers.has("factories") && PKD.FACTORIES
            .filter(f => derivatifFilter === "semua" || f.derivatif === derivatifFilter)
            .map(f => {
              const [x, y] = pt(f.coord);
              const c = PKD.DERIVATIF_COLOR[f.derivatif] || "#F4A261";
              return (
                <g key={f.id} style={{ cursor: "pointer" }}
                   onClick={(e) => { e.stopPropagation(); props.onSelectFactory && props.onSelectFactory(f); }}>
                  <rect x={x - 3.5} y={y - 3.5} width={7} height={7} fill={c} stroke="white" strokeWidth={1} transform={`rotate(45 ${x} ${y})`} />
                </g>
              );
            })}

          {/* Selected pulse */}
          {selectedKab && (() => {
            const [x, y] = pt(selectedKab.centroid);
            const r = 18 + ((tick % 2) === 0 ? 4 : 10);
            return (
              <g key="pulse">
                <circle cx={x} cy={y} r={r} fill="none" stroke="#2D6A4F" strokeWidth={1.5} opacity={0.55 - ((tick % 2) === 0 ? 0.1 : 0.35)} />
                <circle cx={x} cy={y} r={5} fill="#2D6A4F" stroke="white" strokeWidth={1.5} />
              </g>
            );
          })()}

          {/* Roads (synthetic) */}
          {activeLayers.has("roads") && PKD.KABUPATEN.map(k => {
            const a = pt(k.centroid);
            const b = pt(k.nearestPort.coord);
            return (
              <line key={"rd-" + k.id} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#F4A261" strokeWidth={0.6} opacity={0.5} strokeDasharray="3 2" />
            );
          })}
          {activeLayers.has("waterways") && PKD.REGIONS.map(r => (
            <path key={"ww-" + r.id} d={ringToD(r.ring)} fill="none" stroke="#3B82F6" strokeWidth={0.4} strokeDasharray="1 3" opacity={0.4} />
          ))}
          {activeLayers.has("buildings") && PKD.KABUPATEN.map(k => {
            const [x, y] = pt(k.centroid);
            return <circle key={"bd-" + k.id} cx={x} cy={y} r={1.5} fill="#6B7280" opacity={0.5} />;
          })}
        </g>

        {/* User layers overlay */}
        {(userLayers || []).filter(l => activeLayers.has(l.id)).map(layer => {
          const opacity = (mapOpacities?.[layer.id] ?? layer.opacity ?? 0.75);
          const color = layer.color || "#F4A261";

          // Drawn on map — drawnPoints is array of [lon, lat]
          if (layer.drawnPoints && layer.drawnPoints.length > 0) {
            const pxPts = layer.drawnPoints.map(coord => pt(coord));
            if (layer.geomType === "polygon" && pxPts.length >= 3) {
              return (
                <polygon key={layer.id}
                  points={pxPts.map(p => p.join(",")).join(" ")}
                  fill={color} fillOpacity={opacity * 0.3}
                  stroke={color} strokeWidth={2} strokeOpacity={opacity}
                  style={{ pointerEvents: "none" }} />
              );
            }
            if (layer.geomType === "line" && pxPts.length >= 2) {
              return (
                <polyline key={layer.id}
                  points={pxPts.map(p => p.join(",")).join(" ")}
                  fill="none" stroke={color} strokeWidth={2.5} strokeOpacity={opacity}
                  style={{ pointerEvents: "none" }} />
              );
            }
            // points / mesh
            return (
              <g key={layer.id} opacity={opacity} style={{ pointerEvents: "none" }}>
                {pxPts.map((p, i) => (
                  <g key={i}>
                    <circle cx={p[0]} cy={p[1]} r={7} fill={color} stroke="white" strokeWidth={2} />
                    <text x={p[0]} y={p[1] - 10} textAnchor="middle" fontSize={9} fill={color} fontWeight="700">{layer.name}</text>
                  </g>
                ))}
              </g>
            );
          }

          // Intersection result layer — has geometry array with {coord, props}
          if (layer.geometry && layer.geometry.length > 0) {
            return (
              <g key={layer.id} opacity={opacity} style={{ pointerEvents: "none" }}>
                {layer.geometry.map((g, i) => {
                  const [x, y] = pt(g.coord);
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r={6} fill={color} stroke="white" strokeWidth={2} />
                    </g>
                  );
                })}
                {/* Layer name label at centroid of first point */}
                {(() => { const [x, y] = pt(layer.geometry[0].coord); return <text key="lbl" x={x} y={y - 12} textAnchor="middle" fontSize={9} fill={color} fontWeight="700">{layer.name}</text>; })()}
              </g>
            );
          }

          // Layer has no geometry yet (upload-only, not yet drawn) — show a legend indicator only
          return null;
        })}

        {/* Coord ticks (fixed) */}
        <g transform={`translate(0, ${size.h - 22})`} className="map-coords">
          {[95, 100, 105, 110, 115, 120, 125, 130, 135, 140].map(lon => {
            const x = projection([lon, 0])[0];
            return (
              <g key={lon} transform={`translate(${x}, 0)`}>
                <line y1={0} y2={5} stroke="#C8D2BD" strokeWidth={0.6} />
                <text y={16} textAnchor="middle" fontSize={9} fill="#9CA3AF" fontFamily="JetBrains Mono, monospace">{lon}°E</text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* HUD */}
      <div className="map-hud">
        <span className="hud-label">LAT</span>
        <span className="hud-val">{hoverKab ? hoverKab.centroid[1].toFixed(3) : "—"}</span>
        <span className="hud-label">LON</span>
        <span className="hud-val">{hoverKab ? hoverKab.centroid[0].toFixed(3) : "—"}</span>
        <span className="hud-label">ZOOM</span>
        <span className="hud-val">{transform.k.toFixed(2)}×</span>
        <span className="hud-label">TILT</span>
        <span className="hud-val">{tilt}°</span>
      </div>

      {hoverKab && (
        <div className="hover-card" style={{ left: mousePos.x + 14, top: Math.max(8, mousePos.y - 90) }}>
          <div className="hc-name">{hoverKab.name}</div>
          <div className="hc-prov">{hoverKab.province}</div>
          <div className="hc-row"><span>CIAS</span><b style={{ color: ciasColor(hoverKab.cias) }}>{hoverKab.cias.toFixed(2)}</b></div>
          <div className="hc-row"><span>Produksi</span><b>{hoverKab.production.toLocaleString("id-ID")} t/thn</b></div>
          <div className="hc-row"><span>Pabrik</span><b>{hoverKab.factories}</b></div>
        </div>
      )}
    </div>
  );
};
