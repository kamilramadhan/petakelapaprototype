// Map component — custom 3D-styled SVG renderer for Indonesia.
// Uses d3-geo (CDN) for proper projection. Adds zoom/pan, choropleth coloring,
// markers for factories/ports, hover/click interactions.

const { useRef, useEffect, useState, useMemo, useCallback } = React;

window.PetaMap = function PetaMap(props) {
  const {
    mode,           // 'default' | 'cias' | 'gap' | 'investasi' | 'interseksi'
    activeLayers,   // Set of layer ids
    derivatifFilter,// string or 'semua'
    onSelectKab,    // (kab) => void
    selectedKab,
    selectedDerivatif, // for investment heatmap
    intersectionHits,  // Set of kab ids
    bar3D,          // { enabled, variable }
    scenarioDelta,  // number — adds CIAS boost visualization
  } = props;

  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 1000, h: 600 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [tilt, setTilt] = useState(18); // degrees — perspective for 3D effect
  const [hoverKab, setHoverKab] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    function onResize() {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    }
    onResize();
    window.addEventListener("resize", onResize);
    const id = setInterval(() => setTick(t => t + 1), 1600); // for pulse
    return () => { window.removeEventListener("resize", onResize); clearInterval(id); };
  }, []);

  // d3 projection centered on Indonesia
  const projection = useMemo(() => {
    const proj = d3.geoMercator()
      .center([118, -2.5])
      .scale(Math.max(size.w, 800) * 1.05)
      .translate([size.w / 2, size.h / 2]);
    return proj;
  }, [size.w, size.h]);

  const path = useMemo(() => d3.geoPath(projection), [projection]);

  function ringToD(ring) {
    return path({ type: "Polygon", coordinates: [ring] });
  }
  function pt(lonlat) {
    return projection(lonlat);
  }

  // Color helpers
  function ciasColor(c) {
    // red→yellow→green
    if (c >= 0.8) return "#00C896";
    if (c >= 0.6) return "#7BE39A";
    if (c >= 0.4) return "#FFB800";
    if (c >= 0.25) return "#FF8844";
    return "#FF4444";
  }

  function kabFill(k) {
    if (intersectionHits && intersectionHits.has(k.id)) return "#FFD84D";
    if (mode === "cias") return ciasColor(Math.min(1, k.cias + (scenarioDelta || 0)));
    if (mode === "gap") {
      // Gap = production high, factories low
      const gap = (k.production / 420000) - (k.factories / 10);
      if (gap > 0.5) return "#FF4444";
      if (gap > 0.25) return "#FF8844";
      if (gap > 0.05) return "#FFB800";
      return "#00C896";
    }
    if (mode === "investasi" && selectedDerivatif) {
      // Suitability score per derivative — pseudo-derived
      const seed = (k.id.charCodeAt(0) + selectedDerivatif.length) % 100 / 100;
      const score = Math.min(1, (k.cias * 0.7) + 0.3 * seed);
      return ciasColor(score);
    }
    return "#3a6491"; // default landmass — lighter for visibility against deep navy bg
  }

  // Pan/zoom handlers
  const drag = useRef({ active: false, x: 0, y: 0 });
  function onMouseDown(e) {
    drag.current = { active: true, x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  }
  function onMouseMove(e) {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setTransform(t => ({ ...t, x: drag.current.tx + dx, y: drag.current.ty + dy }));
  }
  function onMouseUp() { drag.current.active = false; }
  function onWheel(e) {
    e.preventDefault();
    const dk = e.deltaY < 0 ? 1.15 : 0.87;
    setTransform(t => {
      const nk = Math.max(0.6, Math.min(6, t.k * dk));
      return { ...t, k: nk };
    });
  }

  function resetView() {
    setTransform({ x: 0, y: 0, k: 1 });
    setTilt(18);
  }
  // expose to toolbar
  window.__pkdMapReset = resetView;
  window.__pkdMapZoom = (delta) => setTransform(t => ({ ...t, k: Math.max(0.6, Math.min(6, t.k * delta)) }));
  window.__pkdMapTilt = (d) => setTilt(t => Math.max(0, Math.min(45, t + d)));

  // 3D bar values
  function barValue(k) {
    if (!bar3D || !bar3D.enabled) return null;
    const v = bar3D.variable;
    const seed = (k.id.charCodeAt(1) || 5) / 26;
    if (v === "curah-hujan") return 1500 + seed * 1800;
    if (v === "suhu") return 22 + seed * 8;
    if (v === "ph") return 4.8 + seed * 2;
    if (v === "soc") return 8 + seed * 30;
    if (v === "night-light") return seed * 90;
    return seed * 100;
  }
  function barMax() {
    if (!bar3D || !bar3D.enabled) return 1;
    const v = bar3D.variable;
    if (v === "curah-hujan") return 3300;
    if (v === "suhu") return 30;
    if (v === "ph") return 6.8;
    if (v === "soc") return 38;
    return 90;
  }
  function barColor() {
    const v = bar3D && bar3D.variable;
    if (v === "curah-hujan") return "#5BB8FF";
    if (v === "suhu") return "#FF8844";
    if (v === "ph") return "#00C896";
    if (v === "soc") return "#7BE39A";
    if (v === "night-light") return "#FFB800";
    return "#7BE39A";
  }

  // CSS perspective transform for whole map group
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
      {/* Ambient atmosphere */}
      <div className="map-atmosphere" />
      <div className="map-grid" />

      <svg ref={svgRef} width={size.w} height={size.h} style={{ transform: transformStyle, transformOrigin: "center 60%" }}>
        <defs>
          <radialGradient id="oceanGlow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#0e2c4e" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#06101e" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="landGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2d4f74" />
            <stop offset="100%" stopColor="#1f3a59" />
          </linearGradient>
          <filter id="landShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="2" />
            <feOffset dx="0" dy="3" result="off" />
            <feFlood floodColor="#000" floodOpacity="0.6" />
            <feComposite in2="off" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="landGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feFlood floodColor="#5b9bd1" floodOpacity="0.35" />
            <feComposite in2="b" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <pattern id="rasterDots" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.9" fill="#00C896" opacity="0.45" />
          </pattern>
          <pattern id="rasterRain" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect x="1.2" y="0" width="0.9" height="3" fill="#5BB8FF" opacity="0.35" />
          </pattern>
          <pattern id="rasterTemp" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="3" height="6" fill="#FF8844" opacity="0.18" />
          </pattern>
          <pattern id="rasterNight" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="2.5" cy="2.5" r="0.7" fill="#FFB800" opacity="0.5" />
          </pattern>
        </defs>

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Ocean glow underlay */}
          <rect x={-size.w} y={-size.h} width={size.w * 3} height={size.h * 3} fill="url(#oceanGlow)" />

          {/* Region landmasses — base layer */}
          {PKD.REGIONS.map(r => (
            <g key={r.id}>
              <path d={ringToD(r.ring)} fill="url(#landGrad)" stroke="#5b9bd1" strokeWidth={1.2} strokeOpacity={0.55} filter="url(#landShadow)" />
            </g>
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

          {/* Curah hujan raster */}
          {activeLayers.has("curah-hujan") && (
            <g opacity={0.5}>
              {PKD.KABUPATEN.map(k => (
                <circle key={"rn-" + k.id} cx={pt(k.centroid)[0]} cy={pt(k.centroid)[1]} r={28} fill="url(#rasterRain)" style={{ pointerEvents: "none" }} />
              ))}
            </g>
          )}
          {/* Suhu */}
          {activeLayers.has("suhu") && (
            <g opacity={0.45}>
              {PKD.KABUPATEN.map(k => (
                <circle key={"tm-" + k.id} cx={pt(k.centroid)[0]} cy={pt(k.centroid)[1]} r={32} fill="url(#rasterTemp)" style={{ pointerEvents: "none" }} />
              ))}
            </g>
          )}
          {/* Night light */}
          {activeLayers.has("nightlight") && (
            <g opacity={0.6}>
              {PKD.PORTS.map(p => (
                <circle key={"nl-" + p.id} cx={pt(p.coord)[0]} cy={pt(p.coord)[1]} r={22} fill="url(#rasterNight)" style={{ pointerEvents: "none" }} />
              ))}
            </g>
          )}

          {/* Kabupaten polygons — interactive */}
          {activeLayers.has("produksi") && PKD.KABUPATEN.map(k => {
            const isSel = selectedKab && selectedKab.id === k.id;
            const isHover = hoverKab && hoverKab.id === k.id;
            const isHit = intersectionHits && intersectionHits.has(k.id);
            return (
              <path
                key={k.id}
                d={ringToD(k.ring)}
                fill={kabFill(k)}
                fillOpacity={isHit ? 0.85 : (mode === "default" ? 0.55 : 0.7)}
                stroke={isSel ? "#00C896" : (isHit ? "#FFD84D" : "#3a6491")}
                strokeWidth={isSel ? 2.2 : (isHover ? 1.6 : 0.5)}
                style={{ cursor: "pointer", transition: "stroke 120ms, stroke-width 120ms" }}
                onMouseEnter={() => setHoverKab(k)}
                onMouseLeave={() => setHoverKab(null)}
                onClick={(e) => { e.stopPropagation(); onSelectKab(k); }}
              />
            );
          })}

          {/* Region boundary outlines */}
          {activeLayers.has("batas") && PKD.REGIONS.map(r => (
            <path key={"b-" + r.id} d={ringToD(r.ring)} fill="none" stroke="#5b9bd1" strokeWidth={0.6} strokeDasharray="2 2" opacity={0.5} />
          ))}

          {/* 3D bar chart visualization */}
          {bar3D && bar3D.enabled && PKD.KABUPATEN.map(k => {
            const [x, y] = pt(k.centroid);
            const v = barValue(k);
            const h = (v / barMax()) * 90;
            const w = 7;
            return (
              <g key={"bar-" + k.id}>
                <rect x={x - w / 2} y={y - h} width={w} height={h} fill={barColor()} opacity={0.85} />
                <rect x={x - w / 2} y={y - h} width={w} height={3} fill="#fff" opacity={0.4} />
                <line x1={x - w / 2} y1={y} x2={x - w / 2} y2={y - h} stroke="rgba(0,0,0,0.4)" strokeWidth={1} />
              </g>
            );
          })}

          {/* Pelabuhan */}
          {activeLayers.has("pelabuhan") && PKD.PORTS.map(p => {
            const [x, y] = pt(p.coord);
            return (
              <g key={p.id} style={{ pointerEvents: "auto", cursor: "pointer" }}
                 onClick={(e) => { e.stopPropagation(); props.onSelectPort && props.onSelectPort(p); }}>
                <circle cx={x} cy={y} r={8} fill="rgba(91,184,255,0.18)" />
                <circle cx={x} cy={y} r={4.5} fill="#5BB8FF" stroke="#0A1628" strokeWidth={1} />
                <path d={`M ${x} ${y - 2.5} L ${x} ${y + 1} M ${x - 2} ${y - 1} L ${x + 2} ${y - 1}`} stroke="#0A1628" strokeWidth={0.9} fill="none" />
              </g>
            );
          })}

          {/* Pabrik */}
          {activeLayers.has("factories") && PKD.FACTORIES
            .filter(f => derivatifFilter === "semua" || f.derivatif === derivatifFilter)
            .map(f => {
              const [x, y] = pt(f.coord);
              const c = PKD.DERIVATIF_COLOR[f.derivatif] || "#FFB800";
              return (
                <g key={f.id} style={{ cursor: "pointer" }}
                   onClick={(e) => { e.stopPropagation(); props.onSelectFactory && props.onSelectFactory(f); }}>
                  <rect x={x - 3.5} y={y - 3.5} width={7} height={7} fill={c} stroke="#0A1628" strokeWidth={0.7} transform={`rotate(45 ${x} ${y})`} />
                </g>
              );
            })}

          {/* Selected kab pulse */}
          {selectedKab && (() => {
            const [x, y] = pt(selectedKab.centroid);
            const r = 18 + ((tick % 2) === 0 ? 4 : 10);
            return (
              <g key="pulse">
                <circle cx={x} cy={y} r={r} fill="none" stroke="#00C896" strokeWidth={1.5} opacity={0.7 - ((tick % 2) === 0 ? 0.1 : 0.45)} />
                <circle cx={x} cy={y} r={5} fill="#00C896" stroke="#fff" strokeWidth={1.5} />
              </g>
            );
          })()}

          {/* Roads — synthesized connectors port↔kab nearest */}
          {activeLayers.has("roads") && PKD.KABUPATEN.map(k => {
            const a = pt(k.centroid);
            const b = pt(k.nearestPort.coord);
            return (
              <line key={"rd-" + k.id} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#FFB800" strokeWidth={0.6} opacity={0.55} strokeDasharray="3 2" />
            );
          })}
          {activeLayers.has("waterways") && PKD.REGIONS.map(r => (
            <path key={"ww-" + r.id} d={ringToD(r.ring)} fill="none" stroke="#5BB8FF" strokeWidth={0.4} strokeDasharray="1 3" opacity={0.4} />
          ))}
          {activeLayers.has("buildings") && PKD.KABUPATEN.map(k => {
            const [x, y] = pt(k.centroid);
            return <circle key={"bd-" + k.id} cx={x} cy={y} r={1.5} fill="#7A9B8E" opacity={0.6} />;
          })}
        </g>

        {/* Coordinate ticks (top, fixed) */}
        <g transform={`translate(0, ${size.h - 20})`} className="map-coords">
          {[95, 100, 105, 110, 115, 120, 125, 130, 135, 140].map(lon => {
            const x = projection([lon, 0])[0];
            return (
              <g key={lon} transform={`translate(${x}, 0)`}>
                <line y1={0} y2={6} stroke="#3a6491" strokeWidth={0.7} />
                <text y={16} textAnchor="middle" fontSize={9} fill="#7A9B8E" fontFamily="JetBrains Mono, monospace">{lon}°E</text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* HUD overlay — bottom-left coords + selected kab */}
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

      {/* Hover tooltip */}
      {hoverKab && (
        <div className="hover-card" style={{ left: pt(hoverKab.centroid)[0] + 20, top: pt(hoverKab.centroid)[1] - 30 }}>
          <div className="hc-name">{hoverKab.name}</div>
          <div className="hc-prov">{hoverKab.province}</div>
          <div className="hc-row"><span>CIAS</span><b style={{ color: PKD.tier(hoverKab.cias).color }}>{hoverKab.cias.toFixed(2)}</b></div>
          <div className="hc-row"><span>Produksi</span><b>{hoverKab.production.toLocaleString("id-ID")} t/thn</b></div>
          <div className="hc-row"><span>Pabrik</span><b>{hoverKab.factories}</b></div>
        </div>
      )}
    </div>
  );
};
