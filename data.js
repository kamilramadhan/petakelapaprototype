// Mock data for Peta Kelapa Indonesia prototype.
// Simplified GeoJSON-like polygons of major coconut-producing kabupaten/regions.
// Coordinates are intentionally simplified — this is a prototype map, not a survey.

window.PKD = (function () {
  // Helper: build a polygon ring around a centroid with jagged offsets so it doesn't look like a rectangle.
  function blob(cx, cy, rx, ry, seed) {
    const pts = [];
    const N = 14;
    let s = seed || 1;
    function rng() { s = (s * 9301 + 49297) % 233280; return s / 233280; }
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      const j = 0.6 + rng() * 0.8;
      pts.push([cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]);
    }
    pts.push(pts[0]);
    return pts;
  }

  // Major Indonesian regions — rough silhouettes for visual context.
  // [lon, lat] pairs.
  const REGIONS = [
    // Sumatera (big elongated NW→SE)
    { id: "sumatera", name: "Sumatera", ring: [
      [95.3, 5.5], [97.5, 5.0], [99.5, 3.5], [101.0, 1.0], [102.8, -1.5],
      [104.5, -3.0], [105.8, -5.5], [104.2, -5.8], [102.0, -5.0],
      [100.0, -2.5], [98.0, -0.5], [96.5, 1.5], [95.3, 5.5]
    ]},
    // Kalimantan (large round mass)
    { id: "kalimantan", name: "Kalimantan", ring: [
      [109.5, 1.8], [112.0, 3.5], [115.5, 4.0], [117.5, 3.0], [118.8, 1.0],
      [117.5, -1.5], [116.5, -3.5], [114.5, -4.2], [112.0, -3.8],
      [110.0, -3.0], [109.0, -1.0], [108.5, 0.8], [109.5, 1.8]
    ]},
    // Jawa (elongated)
    { id: "jawa", name: "Jawa", ring: [
      [105.5, -6.0], [108.0, -6.3], [110.5, -6.5], [113.0, -7.0],
      [114.5, -7.8], [114.0, -8.5], [112.0, -8.4], [110.0, -8.2],
      [107.5, -7.6], [105.7, -6.8], [105.5, -6.0]
    ]},
    // Sulawesi (K-shape, simplified)
    { id: "sulawesi", name: "Sulawesi", ring: [
      [119.5, 1.5], [120.8, 0.8], [121.5, 1.5], [123.0, 1.0], [125.0, 1.5],
      [125.2, 0.5], [123.5, -0.2], [122.5, -1.5], [122.8, -3.0],
      [121.5, -3.2], [120.8, -2.5], [120.2, -3.5], [119.8, -5.3],
      [119.0, -5.5], [118.8, -3.5], [119.2, -2.0], [119.5, 1.5]
    ]},
    // Maluku (cluster — represented as one blob)
    { id: "maluku", name: "Maluku", ring: blob(128.0, -3.0, 1.6, 2.8, 7) },
    // Maluku Utara
    { id: "maluku-utara", name: "Maluku Utara", ring: blob(127.8, 0.5, 1.0, 1.6, 11) },
    // Papua (big block)
    { id: "papua", name: "Papua", ring: [
      [131.0, -1.0], [133.5, -1.0], [136.0, -1.5], [138.5, -2.0], [141.0, -2.8],
      [141.0, -6.0], [140.0, -8.5], [137.5, -8.2], [134.5, -7.5],
      [132.0, -5.5], [131.0, -3.2], [131.0, -1.0]
    ]},
    // Nusa Tenggara (long chain — single blob row)
    { id: "nusa-tenggara", name: "Nusa Tenggara", ring: [
      [115.5, -8.3], [117.5, -8.5], [119.5, -8.8], [121.5, -8.7],
      [123.5, -9.2], [125.0, -9.5], [124.5, -10.0], [122.5, -9.7],
      [120.0, -9.4], [117.5, -9.2], [115.8, -9.0], [115.5, -8.3]
    ]},
    // Bali
    { id: "bali", name: "Bali", ring: blob(115.2, -8.4, 0.45, 0.32, 3) },
  ];

  // Coconut-producing kabupaten with mock CIAS scores.
  // Each kabupaten: id, name, province, centroid [lon,lat], production (ton/yr),
  // factories count, scores breakdown.
  const RAW_KAB = [
    // SULAWESI UTARA — heart of coconut
    ["minahasa-utara",   "Minahasa Utara",   "Sulawesi Utara",   [124.9, 1.40], 142_300, 6, 0.87, 0.91, 0.82, 0.05],
    ["bolaang-mongondow","Bolaang Mongondow","Sulawesi Utara",   [124.0, 0.85], 198_500, 4, 0.83, 0.88, 0.79, 0.09],
    ["sangihe",          "Kep. Sangihe",     "Sulawesi Utara",   [125.5, 3.50], 76_400,  2, 0.71, 0.84, 0.65, 0.18],
    ["talaud",           "Kep. Talaud",      "Sulawesi Utara",   [126.7, 4.10], 58_900,  1, 0.62, 0.79, 0.58, 0.25],
    // GORONTALO
    ["gorontalo-utara",  "Gorontalo Utara",  "Gorontalo",        [122.4, 0.85], 88_200,  2, 0.74, 0.81, 0.68, 0.15],
    ["pohuwato",         "Pohuwato",         "Gorontalo",        [121.5, 0.65], 65_300,  1, 0.66, 0.76, 0.61, 0.22],
    // SULAWESI TENGAH
    ["banggai",          "Banggai",          "Sulawesi Tengah",  [122.6, -1.30],112_700, 3, 0.76, 0.83, 0.71, 0.17],
    ["donggala",         "Donggala",         "Sulawesi Tengah",  [119.8, -0.65], 94_500, 2, 0.69, 0.78, 0.66, 0.20],
    // SULAWESI TENGGARA
    ["konawe",           "Konawe",           "Sulawesi Tenggara",[122.4, -3.65],128_100, 3, 0.72, 0.82, 0.69, 0.19],
    ["muna",             "Muna",             "Sulawesi Tenggara",[122.6, -4.95],105_400, 2, 0.68, 0.79, 0.64, 0.22],
    // MALUKU
    ["maluku-tengah",    "Maluku Tengah",    "Maluku",           [129.0, -3.20], 86_700, 2, 0.65, 0.81, 0.59, 0.27],
    ["seram-bagian-barat","Seram Bagian Barat","Maluku",         [128.2, -3.10], 71_200, 1, 0.61, 0.77, 0.55, 0.30],
    ["buru",             "Buru",             "Maluku",           [126.7, -3.40], 54_800, 1, 0.58, 0.74, 0.52, 0.32],
    // MALUKU UTARA
    ["halmahera-utara",  "Halmahera Utara",  "Maluku Utara",     [128.0, 1.40],  92_100, 2, 0.70, 0.85, 0.61, 0.24],
    ["halmahera-selatan","Halmahera Selatan","Maluku Utara",     [127.7, -0.30], 81_500, 1, 0.64, 0.80, 0.57, 0.28],
    // RIAU & KEPRI (Sumatera)
    ["indragiri-hilir",  "Indragiri Hilir",  "Riau",             [103.1, -0.30],412_800, 9, 0.89, 0.86, 0.91, 0.04],
    ["bengkalis",        "Bengkalis",        "Riau",             [102.2, 1.05], 156_200, 4, 0.78, 0.82, 0.79, 0.12],
    ["lingga",           "Kep. Lingga",      "Kepulauan Riau",   [104.6, -0.20], 68_400, 1, 0.63, 0.78, 0.59, 0.26],
    // JAMBI / SUMSEL / LAMPUNG
    ["tanjung-jabung-barat","Tanjab Barat",  "Jambi",            [103.5, -1.10],132_500, 3, 0.74, 0.80, 0.73, 0.18],
    ["lampung-selatan",  "Lampung Selatan",  "Lampung",          [105.6, -5.55],118_900, 4, 0.79, 0.77, 0.83, 0.10],
    // ACEH / SUMUT
    ["aceh-besar",       "Aceh Besar",       "Aceh",             [95.6, 5.30],   82_400, 2, 0.67, 0.81, 0.62, 0.23],
    ["nias",             "Nias",             "Sumatera Utara",   [97.7, 1.10],   59_800, 1, 0.60, 0.76, 0.55, 0.29],
    // KALIMANTAN
    ["kotabaru",         "Kotabaru",         "Kalimantan Selatan",[116.2, -3.20], 64_200, 2, 0.66, 0.74, 0.66, 0.22],
    ["kapuas",           "Kapuas",           "Kalimantan Tengah",[114.4, -2.60], 51_300, 1, 0.59, 0.71, 0.57, 0.27],
    ["nunukan",          "Nunukan",          "Kalimantan Utara", [117.7, 3.95],  48_700, 1, 0.57, 0.73, 0.52, 0.30],
    // JAWA (lower coconut share, but present)
    ["banyuwangi",       "Banyuwangi",       "Jawa Timur",       [114.3, -8.20], 72_800, 3, 0.72, 0.71, 0.79, 0.14],
    ["tasikmalaya",      "Tasikmalaya",      "Jawa Barat",       [108.2, -7.35], 64_500, 2, 0.65, 0.69, 0.70, 0.20],
    // NUSA TENGGARA
    ["lombok-timur",     "Lombok Timur",     "Nusa Tenggara Barat",[116.6, -8.55],58_200, 2, 0.63, 0.75, 0.62, 0.24],
    ["sikka",            "Sikka",            "Nusa Tenggara Timur",[122.2, -8.65],49_100, 1, 0.55, 0.72, 0.50, 0.31],
    // PAPUA (low intensity)
    ["biak-numfor",      "Biak Numfor",      "Papua",            [136.0, -1.10], 34_500, 1, 0.52, 0.74, 0.45, 0.36],
    ["jayapura",         "Jayapura",         "Papua",            [140.7, -2.55], 28_900, 1, 0.49, 0.71, 0.43, 0.38],
  ];

  const KABUPATEN = RAW_KAB.map(r => ({
    id: r[0],
    name: r[1],
    province: r[2],
    centroid: r[3],
    production: r[4],
    factories: r[5],
    cias: r[6],
    envSuit: r[7],
    procStrength: r[8],
    logisticsPenalty: r[9],
    // Build a polygon footprint around centroid.
    ring: blob(r[3][0], r[3][1], 0.55, 0.45, r[0].charCodeAt(0) + r[0].length)
  }));

  function tier(c) {
    if (c >= 0.8) return { label: "Tier 1", color: "#00C896" };
    if (c >= 0.6) return { label: "Tier 2", color: "#7BE39A" };
    if (c >= 0.4) return { label: "Tier 3", color: "#FFB800" };
    return { label: "Tier 4", color: "#FF4444" };
  }

  // Factories — derivatif: kopra | serabut | VCO | briket | kelapa-muda | tempurung | nata
  const DERIVATIF = ["kopra", "VCO", "serabut", "briket", "tempurung", "kelapa-muda", "nata"];
  const DERIVATIF_COLOR = {
    "kopra": "#FFB800",
    "VCO": "#00C896",
    "serabut": "#D17B3F",
    "briket": "#7A5C3F",
    "tempurung": "#9B7BD1",
    "kelapa-muda": "#7BE39A",
    "nata": "#5BB8FF"
  };

  // Generate ~70 factories near kabupaten centroids
  const FACTORIES = [];
  let fid = 0;
  KABUPATEN.forEach(k => {
    const count = Math.min(k.factories, 9);
    for (let i = 0; i < count; i++) {
      const dx = (Math.sin(fid * 7.3) * 0.4);
      const dy = (Math.cos(fid * 5.1) * 0.35);
      const der = DERIVATIF[(fid * 3 + i) % DERIVATIF.length];
      FACTORIES.push({
        id: "fac-" + fid,
        name: `PT ${k.name.split(" ")[0]} ${["Lestari","Mandiri","Sejahtera","Niaga","Prima","Utama"][fid % 6]}`,
        kab: k.id,
        coord: [k.centroid[0] + dx, k.centroid[1] + dy],
        derivatif: der,
        capacity: 5000 + ((fid * 137) % 25000),
        status: ((fid * 13) % 10) > 1 ? "Operasi" : "Idle"
      });
      fid++;
    }
  });

  // Ports — distributed strategically
  const PORTS = [
    ["plb-bitung",     "Pelabuhan Bitung",         [125.2, 1.45],  "Kelas I",   "Internasional", 12_800],
    ["plb-manado",     "Pelabuhan Manado",         [124.85, 1.50], "Kelas II",  "Nasional",       4_200],
    ["plb-gorontalo",  "Pelabuhan Gorontalo",      [123.0, 0.55],  "Kelas III", "Lokal",          1_800],
    ["plb-pantoloan",  "Pelabuhan Pantoloan",      [119.85, -0.7], "Kelas II",  "Nasional",       3_900],
    ["plb-makassar",   "Pelabuhan Soekarno-Hatta", [119.4, -5.13], "Kelas I",   "Utama",         18_500],
    ["plb-kendari",    "Pelabuhan Kendari",        [122.55, -3.95],"Kelas II",  "Nasional",       3_100],
    ["plb-ambon",      "Pelabuhan Yos Sudarso",    [128.18, -3.7], "Kelas II",  "Nasional",       4_500],
    ["plb-ternate",    "Pelabuhan A. Yani",        [127.4, 0.78],  "Kelas III", "Nasional",       2_400],
    ["plb-jayapura",   "Pelabuhan Jayapura",       [140.7, -2.53], "Kelas II",  "Nasional",       2_900],
    ["plb-sorong",     "Pelabuhan Sorong",         [131.25, -0.88],"Kelas II",  "Nasional",       3_700],
    ["plb-dumai",      "Pelabuhan Dumai",          [101.45, 1.68], "Kelas I",   "Utama",         15_200],
    ["plb-belawan",    "Pelabuhan Belawan",        [98.7, 3.78],   "Kelas I",   "Utama",         16_800],
    ["plb-pgpinang",   "Pangkal Pinang",           [106.13, -2.10],"Kelas III", "Lokal",          1_500],
    ["plb-tanjung-priok","Tanjung Priok",          [106.88, -6.10],"Kelas I",   "Utama",         22_500],
    ["plb-tanjung-perak","Tanjung Perak",          [112.74, -7.20],"Kelas I",   "Utama",         19_800],
    ["plb-banjarmasin","Pelabuhan Banjarmasin",    [114.6, -3.32], "Kelas II",  "Nasional",       5_200],
    ["plb-balikpapan", "Pelabuhan Semayang",       [116.83, -1.27],"Kelas II",  "Nasional",       6_100],
    ["plb-bali",       "Pelabuhan Benoa",          [115.21, -8.74],"Kelas II",  "Nasional",       2_900],
    ["plb-tarakan",    "Pelabuhan Tarakan",        [117.6, 3.30],  "Kelas III", "Nasional",       1_900],
    ["plb-kupang",     "Pelabuhan Tenau Kupang",   [123.55, -10.18],"Kelas II", "Nasional",       2_100],
  ].map(p => ({
    id: p[0], name: p[1], coord: p[2], kelas: p[3], status: p[4], kapasitas: p[5]
  }));

  // Available data layers (sidebar)
  const LAYERS = [
    { group: "Pertanian", items: [
      { id: "kebun-kelapa", name: "Perkebunan Kelapa (density)", icon: "🌴", default: true,  opacity: 0.7 },
      { id: "produksi",     name: "Produksi per Kabupaten",     icon: "🥥", default: true,  opacity: 0.85 },
    ]},
    { group: "Industri", items: [
      { id: "factories",    name: "Pabrik Pengolahan",          icon: "🏭", default: true,  opacity: 1.0 },
      { id: "pelabuhan",    name: "Pelabuhan",                  icon: "⚓", default: true,  opacity: 1.0 },
    ]},
    { group: "Lingkungan", items: [
      { id: "elevasi",      name: "Elevasi (SRTM DEM)",         icon: "⛰️", default: false, opacity: 0.5 },
      { id: "curah-hujan",  name: "Curah Hujan (WorldClim)",    icon: "🌧️", default: false, opacity: 0.6 },
      { id: "suhu",         name: "Suhu Rata-rata",             icon: "🌡️", default: false, opacity: 0.6 },
    ]},
    { group: "Tanah (SoilGrids/HWSD2)", items: [
      { id: "ph",           name: "pH H₂O 15–30cm",             icon: "🧪", default: false, opacity: 0.6 },
      { id: "clay",         name: "Clay content 15–30cm",       icon: "🪨", default: false, opacity: 0.6 },
      { id: "sand",         name: "Sand content 15–30cm",       icon: "🏖️", default: false, opacity: 0.6 },
      { id: "soc",          name: "Soil Organic Carbon",        icon: "🌱", default: false, opacity: 0.6 },
      { id: "n",            name: "Nitrogen 15–30cm",           icon: "🔬", default: false, opacity: 0.6 },
      { id: "cec",          name: "CEC 15–30cm",                icon: "⚛️", default: false, opacity: 0.6 },
      { id: "coarse",       name: "Coarse fragments",           icon: "🪨", default: false, opacity: 0.6 },
      { id: "bulk",         name: "Bulk density 60–100cm",      icon: "📊", default: false, opacity: 0.6 },
    ]},
    { group: "Infrastruktur (OSM)", items: [
      { id: "roads",        name: "Jalan",                      icon: "🛣️", default: false, opacity: 0.7 },
      { id: "buildings",    name: "Bangunan",                   icon: "🏢", default: false, opacity: 0.5 },
      { id: "waterways",    name: "Sungai & Perairan",          icon: "💧", default: false, opacity: 0.7 },
      { id: "landuse",      name: "Penggunaan Lahan",           icon: "🗺️", default: false, opacity: 0.5 },
    ]},
    { group: "Pendukung", items: [
      { id: "nightlight",   name: "Night Light VIIRS 2025",     icon: "🌃", default: false, opacity: 0.6 },
      { id: "batas",        name: "Batas Wilayah",              icon: "📏", default: true,  opacity: 0.9 },
    ]},
  ];

  // Compute distance to nearest port for every kabupaten (haversine-ish)
  function dist(a, b) {
    const dx = (a[0] - b[0]) * 111;
    const dy = (a[1] - b[1]) * 111;
    return Math.sqrt(dx * dx + dy * dy);
  }
  KABUPATEN.forEach(k => {
    let best = { d: Infinity, port: null };
    PORTS.forEach(p => {
      const d = dist(k.centroid, p.coord);
      if (d < best.d) best = { d, port: p };
    });
    k.nearestPort = best.port;
    k.distToPort = Math.round(best.d);
    // logistic friendliness index 0..1
    k.lfi = Math.max(0, Math.min(1, 1 - (best.d / 600)));
  });

  // Pre-adjusted thresholds for default ("investor-style") view.
  // op: ">" (needs to be greater), "<" (needs to be less),
  //     "between" (val..val2 inclusive). All values use the layer's natural unit.
  // These define "kesesuaian" — a kabupaten is "sesuai" for the layer if it passes.
  const THRESHOLDS = {
    "ph":          { op: "between", val: 5.5,  val2: 7.0, unit: "",      label: "pH H₂O 15–30cm",       good: "Optimal pH" },
    "curah-hujan": { op: ">",       val: 1500,            unit: "mm/thn", label: "Curah hujan tahunan",  good: "Cukup basah" },
    "suhu":        { op: "<",       val: 28,              unit: "°C",    label: "Suhu rata-rata",        good: "Sejuk untuk kelapa" },
    "elevasi":     { op: "<",       val: 600,             unit: "m",     label: "Elevasi",               good: "Rendah, mudah panen" },
    "soc":         { op: ">",       val: 15,              unit: "g/kg",  label: "Soil Organic Carbon",   good: "Tanah subur" },
    "n":           { op: ">",       val: 1.5,             unit: "g/kg",  label: "Nitrogen 15–30cm",      good: "Hara tinggi" },
    "clay":        { op: "between", val: 18,   val2: 35,  unit: "%",     label: "Clay 15–30cm",          good: "Tekstur ideal" },
    "sand":        { op: "<",       val: 60,              unit: "%",     label: "Sand 15–30cm",          good: "Drainase baik" },
    "cec":         { op: ">",       val: 12,              unit: "cmol/kg", label: "CEC 15–30cm",         good: "Kapasitas tukar baik" },
    "produksi":    { op: ">",       val: 80000,           unit: "t/thn", label: "Produksi kelapa",       good: "Suplai bahan baku" },
    "kebun-kelapa":{ op: ">",       val: 0.40,            unit: "idx",   label: "Densitas kebun",        good: "Lahan kelapa luas" },
    "factories":   { op: ">",       val: 1,               unit: "unit",  label: "Pabrik pengolahan",     good: "Hilirisasi aktif" },
    "pelabuhan":   { op: "<",       val: 200,             unit: "km",    label: "Jarak pelabuhan",       good: "Logistik dekat" },
    "roads":       { op: ">",       val: 0.55,            unit: "idx",   label: "Densitas jalan",        good: "Akses baik" },
    "nightlight":  { op: ">",       val: 0.30,            unit: "idx",   label: "Night Light VIIRS",     good: "Aktivitas ekonomi" },
  };

  // For each kabupaten, simulate a layer value using existing scores so the sub-layer
  // score is consistent with the kabupaten's CIAS.
  function layerValue(k, layerId) {
    switch (layerId) {
      case "ph":           return 5 + k.envSuit * 1.4;
      case "curah-hujan":  return 1500 + k.envSuit * 1300;
      case "suhu":         return 32 - k.envSuit * 6;
      case "elevasi":      return 100 + (k.centroid[1] + 5) * 60;
      case "soc":          return 10 + k.envSuit * 22;
      case "n":            return 0.5 + k.envSuit * 2.5;
      case "clay":         return 12 + k.envSuit * 25;
      case "sand":         return 75 - k.envSuit * 30;
      case "cec":          return 6 + k.envSuit * 14;
      case "produksi":     return k.production;
      case "kebun-kelapa": return Math.min(1, k.production / 250000);
      case "factories":    return k.factories;
      case "pelabuhan":    return k.distToPort;
      case "roads":        return k.lfi;
      case "nightlight":   return Math.min(1, k.procStrength);
      default: return 0;
    }
  }

  function passesThreshold(value, t) {
    if (t.op === ">") return value > t.val;
    if (t.op === "<") return value < t.val;
    if (t.op === "=") return Math.abs(value - t.val) < (Math.abs(t.val) * 0.05);
    if (t.op === "between") return value >= t.val && value <= t.val2;
    return false;
  }

  // Scenario simulation history
  const SCENARIOS = [
    { id: "sc-1", name: "Baseline 2026", delta: 0, ts: "2026-05-08 14:22" },
    { id: "sc-2", name: "Konversi +50K ha Sulawesi", delta: 0.07, ts: "2026-05-09 09:48" },
    { id: "sc-3", name: "Upgrade Pel. Bitung", delta: 0.04, ts: "2026-05-12 11:03" },
  ];

  return { REGIONS, KABUPATEN, FACTORIES, PORTS, LAYERS, DERIVATIF, DERIVATIF_COLOR, SCENARIOS, THRESHOLDS, layerValue, passesThreshold, tier };
})();
