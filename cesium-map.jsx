// Real CesiumJS map — uses Cesium Ion token from localStorage.
// Feature-parity with PetaMap (SVG fallback): kabupaten polygons with choropleth,
// factory & port markers, 3D bars, hover/click, intersection highlights, raster layers.

const { useRef: cmUseRef, useEffect: cmUseEffect, useState: cmUseState } = React;

window.CesiumPetaMap = function CesiumPetaMap(props) {
  const {
    mode, activeLayers, derivatifFilter,
    onSelectKab, onSelectPort, onSelectFactory,
    selectedKab, selectedDerivatif, intersectionHits, bar3D, scenarioDelta,
  } = props;

  const containerRef = cmUseRef(null);
  const viewerRef = cmUseRef(null);
  const entityRefs = cmUseRef({
    kabupaten: new Map(),
    factories: new Map(),
    ports: new Map(),
    regions: [],
    bars: [],
    pulse: null,
    rasterKebun: [],
    rasterHujan: [],
    rasterSuhu: [],
    rasterNight: [],
    roads: [],
  });
  const [hoverInfo, setHoverInfo] = cmUseState(null);
  const [cameraStatus, setCameraStatus] = cmUseState({ lat: -2.5, lon: 118, height: 2500 });
  const [ready, setReady] = cmUseState(false);
  const [initError, setInitError] = cmUseState(false);

  // Color helpers (light theme)
  function ciasFillCss(c) {
    if (c >= 0.8) return "#2D6A4F";
    if (c >= 0.6) return "#52A77D";
    if (c >= 0.4) return "#F4A261";
    if (c >= 0.25) return "#E76F51";
    return "#C53030";
  }
  function ciasPolyFillCss(c) {
    if (c >= 0.8) return "#A8D5BF";
    if (c >= 0.6) return "#C2E1CE";
    if (c >= 0.4) return "#FBD9B8";
    if (c >= 0.25) return "#F5BFA9";
    return "#E89B9B";
  }

  function kabFillCss(k) {
    if (intersectionHits && intersectionHits.has(k.id)) return "#FBD38D";
    if (mode === "cias") return ciasPolyFillCss(Math.min(1, k.cias + (scenarioDelta || 0)));
    if (mode === "gap") {
      const gap = (k.production / 420000) - (k.factories / 10);
      if (gap > 0.5) return "#E89B9B";
      if (gap > 0.25) return "#F5BFA9";
      if (gap > 0.05) return "#FBD9B8";
      return "#A8D5BF";
    }
    if (mode === "investasi" && selectedDerivatif) {
      const seed = (k.id.charCodeAt(0) + selectedDerivatif.length) % 100 / 100;
      const score = Math.min(1, (k.cias * 0.7) + 0.3 * seed);
      return ciasPolyFillCss(score);
    }
    return "#C8D2BD";
  }
  function kabOutlineCss(k) {
    if (intersectionHits && intersectionHits.has(k.id)) return "#B45309";
    if (mode === "cias") return ciasFillCss(Math.min(1, k.cias + (scenarioDelta || 0)));
    if (mode === "gap") {
      const gap = (k.production / 420000) - (k.factories / 10);
      if (gap > 0.5) return "#C53030";
      if (gap > 0.25) return "#E76F51";
      if (gap > 0.05) return "#F4A261";
      return "#2D6A4F";
    }
    return "#7CA083";
  }

  function barValue(k) {
    const v = bar3D && bar3D.variable;
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
  function barColorCss() {
    const v = bar3D && bar3D.variable;
    if (v === "curah-hujan") return "#3B82F6";
    if (v === "suhu") return "#F4A261";
    if (v === "ph") return "#2D6A4F";
    if (v === "soc") return "#52A77D";
    if (v === "nitrogen") return "#9B7BD1";
    if (v === "night-light") return "#FBBF24";
    return "#2D6A4F";
  }

  // ===== Initialize Cesium viewer once =====
  cmUseEffect(() => {
    if (!window.Cesium || !containerRef.current) return;

    let viewer;
    try {
      // Read token — for viewer terrain/imagery
      const token = localStorage.getItem("pkd_cesium_token");
      if (token) {
        try { Cesium.Ion.defaultAccessToken = token; } catch (e) {}
      }

      // Try Ion world terrain; fall back to flat ellipsoid on failure
      let terrainProvider = new Cesium.EllipsoidTerrainProvider();
      let useIonTerrain = false;
      if (token && Cesium.createWorldTerrainAsync) {
        useIonTerrain = true; // we'll attempt and replace below
      }

      viewer = new Cesium.Viewer(containerRef.current, {
        baseLayerPicker: false,
        timeline: false,
        animation: false,
        homeButton: false,
        fullscreenButton: false,
        geocoder: false,
        navigationHelpButton: false,
        sceneModePicker: false,
        infoBox: false,
        selectionIndicator: false,
        navigationInstructionsInitiallyVisible: false,
        terrainProvider,
      });

      // Try upgrading to Ion world terrain asynchronously — silently fall back if it fails
      if (useIonTerrain) {
        Cesium.createWorldTerrainAsync()
          .then(t => { if (viewer && !viewer.isDestroyed()) viewer.terrainProvider = t; })
          .catch(e => console.warn("Ion world terrain unavailable, using flat ellipsoid:", e));
      }
    } catch (e) {
      console.error("Cesium init failed:", e);
      setInitError(true);
      return;
    }

    // Replace base imagery — try Cesium Ion (with token) first, fall back to Esri Light Gray.
    // OSM is intentionally avoided here: their tile usage policy blocks embedded apps.
    try {
      viewer.imageryLayers.removeAll();

      // Add Esri Light Gray immediately so the user sees something while Ion loads
      const esriBase = viewer.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          maximumLevel: 16,
          credit: new Cesium.Credit("Esri, HERE, Garmin"),
        })
      );
      esriBase.brightness = 1.02;

      // Try to upgrade to Ion World Imagery if token allows it
      const token = localStorage.getItem("pkd_cesium_token");
      if (token && Cesium.createWorldImageryAsync) {
        Cesium.createWorldImageryAsync({ style: Cesium.IonWorldImageryStyle.AERIAL_WITH_LABELS })
          .then(ionProvider => {
            if (!viewer || viewer.isDestroyed()) return;
            const ionLayer = viewer.imageryLayers.addImageryProvider(ionProvider);
            ionLayer.alpha = 0.7; // blend with Esri base for a soft hybrid look
          })
          .catch(e => console.warn("Ion imagery unavailable, using Esri only:", e));
      }
    } catch (e) {
      console.warn("Imagery init failed:", e);
    }

    // Scene config
    viewer.scene.globe.enableLighting = false;
    viewer.scene.fog.enabled = true;
    viewer.scene.fog.density = 0.0001;
    viewer.scene.skyAtmosphere.show = true;
    viewer.scene.globe.atmosphereLightIntensity = 5;
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#EEF4F8");
    viewer.cesiumWidget.creditContainer.style.display = "none";
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = false;

    // Initial camera over Indonesia
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(118, -8, 4_200_000),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-55),
        roll: 0,
      },
    });

    viewerRef.current = viewer;

    // ===== Build entities =====
    const refs = entityRefs.current;

    // Region outlines (province group silhouettes)
    PKD.REGIONS.forEach(r => {
      const positions = Cesium.Cartesian3.fromDegreesArray(r.ring.flat());
      const ent = viewer.entities.add({
        name: r.name,
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: Cesium.Color.fromCssColorString("#E8EDE3").withAlpha(0.25),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString("#7CA083"),
          outlineWidth: 2,
          height: 0,
        },
      });
      refs.regions.push(ent);
    });

    // Kabupaten polygons
    PKD.KABUPATEN.forEach(k => {
      const positions = Cesium.Cartesian3.fromDegreesArray(k.ring.flat());
      const ent = viewer.entities.add({
        id: "kab-" + k.id,
        name: k.name,
        polygon: {
          hierarchy: new Cesium.PolygonHierarchy(positions),
          material: Cesium.Color.fromCssColorString(kabFillCss(k)).withAlpha(0.55),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(kabOutlineCss(k)),
          outlineWidth: 1,
          height: 0,
        },
        properties: { type: "kabupaten", kabId: k.id },
      });
      refs.kabupaten.set(k.id, ent);
    });

    // Factories
    PKD.FACTORIES.forEach(f => {
      const c = PKD.DERIVATIF_COLOR[f.derivatif] || "#F4A261";
      const ent = viewer.entities.add({
        id: "fac-" + f.id,
        position: Cesium.Cartesian3.fromDegrees(f.coord[0], f.coord[1]),
        point: {
          pixelSize: 10,
          color: Cesium.Color.fromCssColorString(c),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        properties: { type: "factory", facId: f.id },
      });
      refs.factories.set(f.id, ent);
    });

    // Ports
    PKD.PORTS.forEach(p => {
      const ent = viewer.entities.add({
        id: "port-" + p.id,
        position: Cesium.Cartesian3.fromDegrees(p.coord[0], p.coord[1]),
        point: {
          pixelSize: 12,
          color: Cesium.Color.fromCssColorString("#3B82F6"),
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2.5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: {
          text: "⚓",
          font: "14px sans-serif",
          fillColor: Cesium.Color.WHITE,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          pixelOffset: new Cesium.Cartesian2(0, 0),
        },
        properties: { type: "port", portId: p.id },
      });
      refs.ports.set(p.id, ent);
    });

    // Raster layers — simulated with colored circles (ellipses on globe)
    // Coconut density
    PKD.KABUPATEN.forEach(k => {
      const intensity = Math.min(1, k.production / 250_000);
      const radius = (60_000 + intensity * 130_000);
      const ent = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(k.centroid[0], k.centroid[1]),
        ellipse: {
          semiMajorAxis: radius,
          semiMinorAxis: radius * 0.9,
          material: Cesium.Color.fromCssColorString("#2D6A4F").withAlpha(0.15 + intensity * 0.25),
          height: 0,
        },
        show: false,
      });
      refs.rasterKebun.push(ent);
    });

    // Rain
    PKD.KABUPATEN.forEach(k => {
      const ent = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(k.centroid[0], k.centroid[1]),
        ellipse: {
          semiMajorAxis: 110_000,
          semiMinorAxis: 110_000,
          material: Cesium.Color.fromCssColorString("#3B82F6").withAlpha(0.15),
          height: 0,
        },
        show: false,
      });
      refs.rasterHujan.push(ent);
    });
    // Temperature
    PKD.KABUPATEN.forEach(k => {
      const ent = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(k.centroid[0], k.centroid[1]),
        ellipse: {
          semiMajorAxis: 130_000,
          semiMinorAxis: 130_000,
          material: Cesium.Color.fromCssColorString("#F4A261").withAlpha(0.13),
          height: 0,
        },
        show: false,
      });
      refs.rasterSuhu.push(ent);
    });
    // Night light
    PKD.PORTS.forEach(p => {
      const ent = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(p.coord[0], p.coord[1]),
        ellipse: {
          semiMajorAxis: 90_000,
          semiMinorAxis: 90_000,
          material: Cesium.Color.fromCssColorString("#FBBF24").withAlpha(0.22),
          height: 0,
        },
        show: false,
      });
      refs.rasterNight.push(ent);
    });

    // Roads — synthetic polylines kab → nearest port
    PKD.KABUPATEN.forEach(k => {
      const ent = viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArray([
            k.centroid[0], k.centroid[1],
            k.nearestPort.coord[0], k.nearestPort.coord[1],
          ]),
          width: 1.5,
          material: new Cesium.PolylineDashMaterialProperty({
            color: Cesium.Color.fromCssColorString("#F4A261").withAlpha(0.7),
            dashLength: 16,
          }),
        },
        show: false,
      });
      refs.roads.push(ent);
    });

    // ===== Interaction handlers =====
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

    handler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position);
      if (picked && picked.id && picked.id.properties) {
        const type = picked.id.properties.type?.getValue();
        if (type === "kabupaten") {
          const kabId = picked.id.properties.kabId.getValue();
          const k = PKD.KABUPATEN.find(x => x.id === kabId);
          if (k) props.onSelectKab(k);
        } else if (type === "factory") {
          const fid = picked.id.properties.facId.getValue();
          const f = PKD.FACTORIES.find(x => x.id === fid);
          if (f) props.onSelectFactory && props.onSelectFactory(f);
        } else if (type === "port") {
          const pid = picked.id.properties.portId.getValue();
          const p = PKD.PORTS.find(x => x.id === pid);
          if (p) props.onSelectPort && props.onSelectPort(p);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction((move) => {
      const picked = viewer.scene.pick(move.endPosition);
      const canvas = viewer.scene.canvas;
      if (picked && picked.id && picked.id.properties) {
        const type = picked.id.properties.type?.getValue();
        // Cursor: show pointer over any interactive entity
        canvas.classList.add("pkd-pickable");
        if (type === "kabupaten") {
          const kabId = picked.id.properties.kabId.getValue();
          const k = PKD.KABUPATEN.find(x => x.id === kabId);
          if (k) {
            setHoverInfo({
              type: "kab", data: k,
              x: move.endPosition.x, y: move.endPosition.y,
            });
            return;
          }
        }
        setHoverInfo(null);
        return;
      }
      canvas.classList.remove("pkd-pickable");
      setHoverInfo(null);
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Camera position display
    const cameraPostRender = () => {
      const carto = viewer.camera.positionCartographic;
      setCameraStatus({
        lon: Cesium.Math.toDegrees(carto.longitude),
        lat: Cesium.Math.toDegrees(carto.latitude),
        height: carto.height,
      });
    };
    viewer.scene.postRender.addEventListener(cameraPostRender);

    // Expose to toolbar
    window.__pkdMapReset = () => {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(118, -8, 4_200_000),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 },
        duration: 1.4,
      });
    };
    window.__pkdMapZoom = (delta) => {
      const carto = viewer.camera.positionCartographic;
      const h = carto.height * (delta > 1 ? (1 / delta) : (1 / delta));
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, h),
        duration: 0.5,
        orientation: {
          heading: viewer.camera.heading,
          pitch: viewer.camera.pitch,
        },
      });
    };
    window.__pkdMapTilt = (deg) => {
      const dPitch = Cesium.Math.toRadians(deg);
      const carto = viewer.camera.positionCartographic;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromRadians(carto.longitude, carto.latitude, carto.height),
        duration: 0.4,
        orientation: {
          heading: viewer.camera.heading,
          pitch: Math.max(Cesium.Math.toRadians(-89), Math.min(Cesium.Math.toRadians(-5), viewer.camera.pitch + dPitch)),
          roll: 0,
        },
      });
    };

    setReady(true);
    return () => {
      try { viewer.scene.postRender.removeEventListener(cameraPostRender); } catch (e) {}
      try { handler.destroy(); } catch (e) {}
      try { viewer.destroy(); } catch (e) {}
      viewerRef.current = null;
    };
  }, []);

  // ===== Update kabupaten fills when mode / scenarioDelta / intersection changes =====
  cmUseEffect(() => {
    if (!ready || !viewerRef.current) return;
    const refs = entityRefs.current;
    PKD.KABUPATEN.forEach(k => {
      const ent = refs.kabupaten.get(k.id);
      if (!ent) return;
      const fillCss = kabFillCss(k);
      const outlineCss = kabOutlineCss(k);
      ent.polygon.material = Cesium.Color.fromCssColorString(fillCss).withAlpha(
        intersectionHits && intersectionHits.has(k.id) ? 0.78 : (mode === "default" ? 0.45 : 0.62)
      );
      ent.polygon.outlineColor = Cesium.Color.fromCssColorString(outlineCss);
      ent.polygon.outlineWidth = (selectedKab && selectedKab.id === k.id) ? 3 : 1;
      ent.show = activeLayers.has("produksi");
    });
  }, [mode, scenarioDelta, intersectionHits, selectedKab, selectedDerivatif, ready, activeLayers]);

  // Toggle visibility of factories per derivative filter
  cmUseEffect(() => {
    if (!ready) return;
    const refs = entityRefs.current;
    refs.factories.forEach((ent, fid) => {
      const f = PKD.FACTORIES.find(x => x.id === fid);
      if (!f) return;
      const visible = activeLayers.has("factories") &&
        (derivatifFilter === "semua" || f.derivatif === derivatifFilter);
      ent.show = visible;
    });
  }, [activeLayers, derivatifFilter, ready]);

  // Toggle other layers
  cmUseEffect(() => {
    if (!ready) return;
    const refs = entityRefs.current;
    refs.ports.forEach(ent => { ent.show = activeLayers.has("pelabuhan"); });
    refs.regions.forEach(ent => { ent.show = activeLayers.has("batas"); });
    refs.rasterKebun.forEach(ent => { ent.show = activeLayers.has("kebun-kelapa"); });
    refs.rasterHujan.forEach(ent => { ent.show = activeLayers.has("curah-hujan"); });
    refs.rasterSuhu.forEach(ent => { ent.show = activeLayers.has("suhu"); });
    refs.rasterNight.forEach(ent => { ent.show = activeLayers.has("nightlight"); });
    refs.roads.forEach(ent => { ent.show = activeLayers.has("roads"); });
  }, [activeLayers, ready]);

  // 3D bars
  cmUseEffect(() => {
    if (!ready || !viewerRef.current) return;
    const viewer = viewerRef.current;
    const refs = entityRefs.current;
    // Clear existing bars
    refs.bars.forEach(b => viewer.entities.remove(b));
    refs.bars = [];
    if (!bar3D || !bar3D.enabled) return;
    const colorHex = barColorCss();
    PKD.KABUPATEN.forEach(k => {
      const v = barValue(k);
      const heightM = (v / barMax()) * 200_000; // meters
      const ent = viewer.entities.add({
        position: Cesium.Cartesian3.fromDegrees(k.centroid[0], k.centroid[1], heightM / 2),
        cylinder: {
          length: heightM,
          topRadius: 8000,
          bottomRadius: 8000,
          material: Cesium.Color.fromCssColorString(colorHex).withAlpha(0.85),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(colorHex).withAlpha(1),
        },
      });
      refs.bars.push(ent);
    });
  }, [bar3D, ready]);

  // Selected pulse — fly camera to selection
  cmUseEffect(() => {
    if (!ready || !viewerRef.current || !selectedKab) return;
    const viewer = viewerRef.current;
    // gentle fly to selection
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        selectedKab.centroid[0],
        selectedKab.centroid[1] - 2.5,
        900_000,
      ),
      orientation: {
        heading: 0,
        pitch: Cesium.Math.toRadians(-50),
        roll: 0,
      },
      duration: 1.0,
    });
  }, [selectedKab && selectedKab.id, ready]);

  return (
    <div className="map-wrap" style={{ cursor: "default" }}>
      {initError && (
        <div style={{ position: "absolute", inset: 0, zIndex: 5 }}>
          <PetaMap {...props} />
        </div>
      )}
      <div ref={containerRef} className="cesium-container" style={{ display: initError ? "none" : "block" }} />

      {/* HUD */}
      <div className="map-hud">
        <span className="hud-label">LAT</span>
        <span className="hud-val">{cameraStatus.lat.toFixed(2)}</span>
        <span className="hud-label">LON</span>
        <span className="hud-val">{cameraStatus.lon.toFixed(2)}</span>
        <span className="hud-label">ALT</span>
        <span className="hud-val">{(cameraStatus.height / 1000).toFixed(0)}km</span>
        <span className="hud-label">CESIUM</span>
        <span className="hud-val" style={{ color: "#2D6A4F" }}>● LIVE</span>
      </div>

      {hoverInfo && hoverInfo.type === "kab" && (
        <div className="hover-card" style={{ left: hoverInfo.x + 18, top: hoverInfo.y - 30 }}>
          <div className="hc-name">{hoverInfo.data.name}</div>
          <div className="hc-prov">{hoverInfo.data.province}</div>
          <div className="hc-row"><span>CIAS</span><b style={{ color: ciasFillCss(hoverInfo.data.cias) }}>{hoverInfo.data.cias.toFixed(2)}</b></div>
          <div className="hc-row"><span>Produksi</span><b>{hoverInfo.data.production.toLocaleString("id-ID")} t/thn</b></div>
          <div className="hc-row"><span>Pabrik</span><b>{hoverInfo.data.factories}</b></div>
        </div>
      )}
    </div>
  );
};
