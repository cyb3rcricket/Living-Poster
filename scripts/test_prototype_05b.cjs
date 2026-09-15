const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const BASE_URL = process.env.P05_BASE_URL || 'http://127.0.0.1:5173';
const OUT_DIR = path.join(__dirname, 'p05b-verification');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/local/bin/google-chrome',
  '/opt/google/chrome/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome/Chromium not found. Set CHROME_PATH.');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function computeMetrics(imgA, imgB, opts = {}) {
  const y0 = opts.y0 != null ? opts.y0 : 0;
  const y1 = opts.y1 != null ? opts.y1 : imgA.height;
  const x0 = opts.x0 != null ? opts.x0 : 0;
  const x1 = opts.x1 != null ? opts.x1 : imgA.width;
  let sumSqDiff = 0;
  let maxDiff = 0;
  let countDiff5 = 0;
  let count = 0;

  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = (y * imgA.width + x) * 4;
      const dr = Math.abs(imgA.data[idx] - imgB.data[idx]);
      const dg = Math.abs(imgA.data[idx + 1] - imgB.data[idx + 1]);
      const db = Math.abs(imgA.data[idx + 2] - imgB.data[idx + 2]);
      const diff = (dr + dg + db) / 3.0;
      if (diff > 5) countDiff5++;
      if (diff > maxDiff) maxDiff = diff;
      sumSqDiff += (dr * dr + dg * dg + db * db) / 3.0;
      count++;
    }
  }

  const mse = count ? sumSqDiff / count : 0;
  const psnr = 10 * Math.log10((255 * 255) / (mse || 0.0001));
  return {
    mse,
    psnr,
    pctDiff5: count ? (countDiff5 / count) * 100 : 0,
    maxDiff,
    pixels: count,
  };
}

function cropPng(img, x0, y0, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y0 + y) * img.width + (x0 + x)) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = img.data[si + 3];
    }
  }
  return out;
}

function downscale(img, scale) {
  const w = Math.floor(img.width / scale);
  const h = Math.floor(img.height / scale);
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const si = ((y * scale) * img.width + (x * scale)) * 4;
      const di = (y * w + x) * 4;
      out.data[di] = img.data[si];
      out.data[di + 1] = img.data[si + 1];
      out.data[di + 2] = img.data[si + 2];
      out.data[di + 3] = img.data[si + 3];
    }
  }
  return out;
}

function contactSheet(images, cols, tileScale = 4) {
  const tiles = images.map((img) => downscale(img, tileScale));
  const tw = tiles[0].width;
  const th = tiles[0].height;
  const rows = Math.ceil(tiles.length / cols);
  const out = new PNG({ width: tw * cols, height: th * rows });
  for (let i = 0; i < out.width * out.height; i++) {
    const di = i * 4;
    out.data[di] = 8;
    out.data[di + 1] = 8;
    out.data[di + 2] = 12;
    out.data[di + 3] = 255;
  }
  tiles.forEach((tile, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    for (let y = 0; y < tile.height; y++) {
      for (let x = 0; x < tile.width; x++) {
        const si = (y * tile.width + x) * 4;
        const di = ((row * th + y) * out.width + (col * tw + x)) * 4;
        out.data[di] = tile.data[si];
        out.data[di + 1] = tile.data[si + 1];
        out.data[di + 2] = tile.data[si + 2];
        out.data[di + 3] = 255;
      }
    }
  });
  return out;
}

function waterBand(img) {
  const y0 = Math.floor(img.height * (855 / 1024));
  return { y0, y1: img.height, x0: 0, x1: img.width };
}

function holePct(poster, img, band) {
  let holes = 0;
  let waterish = 0;
  for (let y = band.y0; y < band.y1; y++) {
    for (let x = band.x0; x < band.x1; x++) {
      const i = (y * poster.width + x) * 4;
      const pr = poster.data[i];
      const pg = poster.data[i + 1];
      const pb = poster.data[i + 2];
      const posterLum = (pr + pg + pb) / 3;
      const posterCyan = pg > pr + 8 && pb > pr;
      if (!posterCyan && posterLum < 40) continue;
      waterish++;
      const ir = img.data[i];
      const ig = img.data[i + 1];
      const ib = img.data[i + 2];
      const imgLum = (ir + ig + ib) / 3;
      if (imgLum + 28 < posterLum && ig + 18 < pg) holes++;
    }
  }
  return {
    holes,
    waterish,
    pct: waterish ? (holes / waterish) * 100 : 0,
  };
}

function formatMetrics(m) {
  return `MSE ${m.mse.toFixed(3)} | PSNR ${m.psnr.toFixed(2)} dB | >5/255 ${m.pctDiff5.toFixed(2)}% | max ${m.maxDiff.toFixed(1)}`;
}

async function waitFrames(page, n = 2) {
  await page.evaluate((count) => new Promise((resolve) => {
    const step = () => {
      if (count-- <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), n);
}

const POSES = [
  { id: 'canonical', pose: { x: 0, y: 0, z: 2.00, rx: 0, ry: 0 } },
  { id: 'push190', pose: { x: 0, y: 0, z: 1.90, rx: 0, ry: 0 } },
  { id: 'push185', pose: { x: 0, y: 0, z: 1.85, rx: 0, ry: 0 } },
  { id: 'push170', pose: { x: 0, y: 0, z: 1.70, rx: 0, ry: 0 } },
  { id: 'left', pose: { x: -0.12, y: 0, z: 1.78, rx: 0, ry: 0.04 } },
  { id: 'right', pose: { x: 0.12, y: 0, z: 1.78, rx: 0, ry: -0.04 } },
];

const CANDIDATES = [
  { id: 'baseline', topology: 'baseline', comparisonMode: 'slab' },
  { id: 'h1-z050', topology: 'h1', comparisonMode: 'h1', h1FarZ: 0.5 },
  { id: 'h1-z000', topology: 'h1', comparisonMode: 'h1', h1FarZ: 0.0 },
  { id: 'h1-zm1', topology: 'h1', comparisonMode: 'h1', h1FarZ: -1.0 },
  { id: 'h1-zm3', topology: 'h1', comparisonMode: 'h1', h1FarZ: -3.0 },
  { id: 'h1-zm6', topology: 'h1', comparisonMode: 'h1', h1FarZ: -6.0 },
  {
    id: 'h2-c024-zm3',
    topology: 'h2',
    comparisonMode: 'h2',
    coveStart: 0.24,
    coveFarZ: -3.0,
    coveVerticality: 0.85,
  },
  {
    id: 'h2-c018-zm6',
    topology: 'h2',
    comparisonMode: 'h2',
    coveStart: 0.18,
    coveFarZ: -6.0,
    coveVerticality: 0.95,
  },
  {
    id: 'h2-c035-zm1',
    topology: 'h2',
    comparisonMode: 'h2',
    coveStart: 0.35,
    coveFarZ: -1.0,
    coveVerticality: 0.70,
  },
  {
    id: 'h3-s030-zm3',
    topology: 'h3',
    comparisonMode: 'h3',
    h3Split: 0.30,
    h3FarZ: -3.0,
    h3Overlap: 0.12,
  },
  {
    id: 'h3-s022-zm6',
    topology: 'h3',
    comparisonMode: 'h3',
    h3Split: 0.22,
    h3FarZ: -6.0,
    h3Overlap: 0.12,
  },
  {
    id: 'h3-s040-z000',
    topology: 'h3',
    comparisonMode: 'h3',
    h3Split: 0.40,
    h3FarZ: 0.0,
    h3Overlap: 0.12,
  },
  { id: 'h4-pin', topology: 'h4', comparisonMode: 'h4' },
];

async function runTest() {
  ensureDir(OUT_DIR);
  const chrome = findChrome();
  console.log('====================================================');
  console.log('Prototype 05B — Horizon-Anchored Painted Ocean');
  console.log('Chrome:', chrome);
  console.log('Out:', OUT_DIR);
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: [
      '--use-gl=angle',
      '--use-angle=gl',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--window-size=1024,1024',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=/tmp/chrome-test-p05b-${Date.now()}`,
    ],
    defaultViewport: { width: 1024, height: 1024 },
  });

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(err.toString()));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });

  const shot = async (name) => {
    const canvasElem = await page.$('#webgl-canvas');
    const dest = path.join(OUT_DIR, name);
    await waitFrames(page, 3);
    await canvasElem.screenshot({ path: dest });
    console.log('Saved:', dest);
    return dest;
  };

  const hideUI = async () => {
    await page.evaluate(() => {
      const hide = (id) => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      };
      hide('dev-panel');
      hide('status-toast');
      hide('enter-overlay');
    });
  };

  const configure = async (opts) => {
    await page.evaluate((experiment) => {
      window.__p05.setExperiment(experiment);
    }, opts);
    await waitFrames(page, 4);
  };

  console.log(`Navigating to ${BASE_URL}/?p=5 ...`);
  await page.goto(`${BASE_URL}/?p=5`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__p05 && window.__p05.state && window.__p05.state.isLoaded, { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 500));
  await hideUI();

  const results = {
    candidates: {},
    footprint: {},
    pageErrors: [],
  };

  await configure({
    profile: 'linear',
    zHorizon: 0.70,
    zNear: 1.38,
    comparisonMode: 'poster',
    canonical: true,
    alive: false,
    depthWrite: true,
    footprintOn: true,
    footprintMode: 0,
    contactCorrection: false,
  });
  const posterPath = await shot('00-canonical-poster.png');
  const posterPng = PNG.sync.read(fs.readFileSync(posterPath));
  const band = waterBand(posterPng);
  const W = posterPng.width;
  const H = posterPng.height;

  await configure({ comparisonMode: 'card', canonical: true, rebuild: false });
  const cardCanonPath = await shot('00-canonical-card.png');
  await configure({ comparisonMode: 'card', rebuild: false, pose: { x: 0, y: 0, z: 1.70, rx: 0, ry: 0 } });
  await shot('00-card-push170.png');

  const sheetPush170 = [];
  const sheetCanon = [];
  const sheetHorizonCrops = [];

  for (const cand of CANDIDATES) {
    console.log(`\n[${cand.id}]`);
    const record = {
      id: cand.id,
      poses: {},
      psnrCanon: null,
      holesCanon: null,
      stats: null,
    };

    const baseOpts = {
      profile: 'linear',
      zHorizon: 0.70,
      zNear: 1.38,
      topology: cand.topology,
      comparisonMode: cand.comparisonMode,
      alive: false,
      depthWrite: true,
      footprintOn: true,
      footprintMode: 0,
      contactCorrection: false,
      h1FarZ: cand.h1FarZ,
      coveStart: cand.coveStart,
      coveFarZ: cand.coveFarZ,
      coveVerticality: cand.coveVerticality,
      h3Split: cand.h3Split,
      h3FarZ: cand.h3FarZ,
      h3Overlap: cand.h3Overlap,
    };

    for (const slot of POSES) {
      await configure({
        ...baseOpts,
        pose: slot.pose,
      });
      const file = await shot(`${cand.id}-${slot.id}.png`);
      const img = PNG.sync.read(fs.readFileSync(file));
      const horizon = await page.evaluate(() => window.__p05.getHorizonScreenSamples());
      const stats = await page.evaluate(() => window.__p05.getWaterStats());
      const mid = horizon[2];
      record.poses[slot.id] = {
        file,
        cam: stats.cam,
        verts: stats.verts,
        tris: stats.tris,
        drawCalls: stats.drawCalls,
        horizonPy: mid.py,
        horizonPx: mid.px,
        worldZ: mid.worldZ,
        horizon: horizon.map((h) => ({
          u: h.u,
          py: h.py,
          px: h.px,
          worldZ: h.worldZ,
          pyGeom: h.pyGeom,
        })),
      };

      if (slot.id === 'canonical') {
        record.psnrCanon = {
          full: computeMetrics(posterPng, img),
          water: computeMetrics(posterPng, img, band),
        };
        record.holesCanon = holePct(posterPng, img, band);
        record.stats = {
          topology: stats.topology,
          verts: stats.verts,
          tris: stats.tris,
          drawCalls: stats.drawCalls,
          fps: stats.fps,
          h1FarZ: stats.h1FarZ,
          coveStart: stats.coveStart,
          coveFarZ: stats.coveFarZ,
          h3Split: stats.h3Split,
          h3FarZ: stats.h3FarZ,
        };
        sheetCanon.push(img);
        console.log(`  canonical water PSNR ${record.psnrCanon.water.psnr.toFixed(2)} dB  holes ${record.holesCanon.pct.toFixed(2)}%  verts ${stats.verts}`);
      }

      if (slot.id === 'push185') {
        fs.writeFileSync(
          path.join(OUT_DIR, `crop-contact-${cand.id}-push185.png`),
          PNG.sync.write(cropPng(img, Math.floor(W * 0.58), Math.floor(H * 0.80), Math.floor(W * 0.40), Math.floor(H * 0.18)))
        );
      }

      if (slot.id === 'push170') {
        sheetPush170.push(img);
        fs.writeFileSync(
          path.join(OUT_DIR, `crop-horizon-${cand.id}-push170.png`),
          PNG.sync.write(cropPng(img, 0, Math.floor(H * 0.78), W, Math.floor(H * 0.12)))
        );
        sheetHorizonCrops.push(cropPng(img, 0, Math.floor(H * 0.78), W, Math.floor(H * 0.12)));
      }
    }

    const pyCanon = record.poses.canonical.horizonPy;
    record.drift = {};
    for (const slot of POSES) {
      if (slot.id === 'canonical') continue;
      const py = record.poses[slot.id].horizonPy;
      record.drift[slot.id] = {
        py,
        dPy: py - pyCanon,
        dPx: (py - pyCanon) * H,
      };
    }
    console.log(`  drift push170: ${record.drift.push170.dPx.toFixed(1)} px  (canon py=${pyCanon.toFixed(4)} → ${record.poses.push170.horizonPy.toFixed(4)})`);

    await configure({
      ...baseOpts,
      comparisonMode: 'wireframe',
      pose: { x: 0, y: 0, z: 1.70, rx: 0, ry: 0 },
    });
    await shot(`${cand.id}-wire-push170.png`);

    results.candidates[cand.id] = record;
  }

  fs.writeFileSync(path.join(OUT_DIR, 'contact-canonical.png'), PNG.sync.write(contactSheet(sheetCanon, 7, 4)));
  fs.writeFileSync(path.join(OUT_DIR, 'contact-push170.png'), PNG.sync.write(contactSheet(sheetPush170, 7, 4)));
  fs.writeFileSync(path.join(OUT_DIR, 'contact-horizon-push170.png'), PNG.sync.write(contactSheet(sheetHorizonCrops, 7, 2)));

  console.log('\n[Footprint F0/F1/F2]');
  for (const mode of [0, 1, 2]) {
    await configure({
      profile: 'linear',
      zHorizon: 0.70,
      zNear: 1.38,
      topology: 'baseline',
      comparisonMode: 'slab',
      footprintOn: true,
      footprintMode: mode,
      alive: false,
      contactCorrection: false,
      canonical: true,
    });
    const canonFile = await shot(`fp${mode}-canonical.png`);
    const canonImg = PNG.sync.read(fs.readFileSync(canonFile));
    await configure({
      topology: 'baseline',
      comparisonMode: 'slab',
      footprintMode: mode,
      rebuild: false,
      pose: { x: 0, y: 0, z: 1.85, rx: 0, ry: 0 },
    });
    const pushFile = await shot(`fp${mode}-push185.png`);
    const pushImg = PNG.sync.read(fs.readFileSync(pushFile));
    fs.writeFileSync(
      path.join(OUT_DIR, `crop-fp${mode}-contact-canonical.png`),
      PNG.sync.write(cropPng(canonImg, Math.floor(W * 0.00), Math.floor(H * 0.78), Math.floor(W * 0.30), Math.floor(H * 0.20)))
    );
    fs.writeFileSync(
      path.join(OUT_DIR, `crop-fp${mode}-citadel-canonical.png`),
      PNG.sync.write(cropPng(canonImg, Math.floor(W * 0.58), Math.floor(H * 0.80), Math.floor(W * 0.40), Math.floor(H * 0.18)))
    );
    fs.writeFileSync(
      path.join(OUT_DIR, `crop-fp${mode}-citadel-push185.png`),
      PNG.sync.write(cropPng(pushImg, Math.floor(W * 0.58), Math.floor(H * 0.80), Math.floor(W * 0.40), Math.floor(H * 0.18)))
    );

    await configure({
      topology: 'baseline',
      comparisonMode: 'footprint',
      footprintMode: mode,
      rebuild: false,
      canonical: true,
    });
    await shot(`fp${mode}-debug-canonical.png`);

    results.footprint[`f${mode}`] = {
      psnrWater: computeMetrics(posterPng, canonImg, band),
      holes: holePct(posterPng, canonImg, band),
    };
    console.log(`  F${mode} water PSNR ${results.footprint[`f${mode}`].psnrWater.psnr.toFixed(2)} dB  holes ${results.footprint[`f${mode}`].holes.pct.toFixed(2)}%`);
  }

  const driftTable = Object.values(results.candidates).map((c) => ({
    id: c.id,
    canonPSNR: c.psnrCanon.water.psnr,
    holesPct: c.holesCanon.pct,
    drift170: c.drift.push170.dPx,
    drift185: c.drift.push185.dPx,
    drift190: c.drift.push190.dPx,
    verts: c.stats.verts,
    tris: c.stats.tris,
    drawCalls: c.stats.drawCalls,
  }));
  results.driftTable = driftTable;
  console.log('\n=== Drift table (px, far-edge vs canonical) ===');
  for (const row of driftTable) {
    console.log(
      `${row.id.padEnd(16)} PSNR ${row.canonPSNR.toFixed(2)}  Δ170 ${row.drift170.toFixed(1).padStart(7)}  Δ185 ${row.drift185.toFixed(1).padStart(7)}  holes ${row.holesPct.toFixed(2)}%  v/t ${row.verts}/${row.tris}`
    );
  }

  results.pageErrors = pageErrors;
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(results, null, 2));
  console.log('\nWrote', path.join(OUT_DIR, 'metrics.json'));
  if (pageErrors.length) console.warn('Page errors:', pageErrors);

  console.log('\n====================================================');
  console.log('Prototype 05B verification complete.');
  console.log('====================================================');
  await browser.close();
}

runTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
