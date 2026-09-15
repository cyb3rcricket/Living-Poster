#!/usr/bin/env node
/**
 * Prototype 05B sea-only integration verification.
 * Same poses as test_prototype_05b.cjs. H1 FAR z=-3 only.
 * Does not overwrite scripts/p05b-verification/.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const BASE_URL = process.env.P05_BASE_URL || 'http://127.0.0.1:5173';
const OUT_DIR = path.join(__dirname, 'p05b-sea-only-verification');
const STORE_DIR = '/cursor/stores/bc-566591f5-5d85-4885-85ba-b58149f7d089/media/p05b-sea-only';

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
  return { mse, psnr, pctDiff5: count ? (countDiff5 / count) * 100 : 0, maxDiff, pixels: count };
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

function writePng(img, dest) {
  fs.writeFileSync(dest, PNG.sync.write(img));
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
  return { holes, waterish, pct: waterish ? (holes / waterish) * 100 : 0 };
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

const SOURCES = [
  { id: 'original', seaSource: 'original', footprintOn: true },
  { id: 'sea-only', seaSource: 'sea-only', footprintOn: true },
];

function saveBoth(relName, bufOrPath) {
  const a = path.join(OUT_DIR, relName);
  const b = path.join(STORE_DIR, relName);
  ensureDir(path.dirname(a));
  ensureDir(path.dirname(b));
  if (Buffer.isBuffer(bufOrPath)) {
    fs.writeFileSync(a, bufOrPath);
    fs.writeFileSync(b, bufOrPath);
  } else {
    fs.copyFileSync(bufOrPath, a);
    fs.copyFileSync(bufOrPath, b);
  }
  return a;
}

async function runTest() {
  ensureDir(OUT_DIR);
  ensureDir(STORE_DIR);
  const chrome = findChrome();
  console.log('====================================================');
  console.log('Prototype 05B — Sea-only asset integration');
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
      `--user-data-dir=/tmp/chrome-test-p05b-sea-${Date.now()}`,
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
    const tmp = path.join(OUT_DIR, `_tmp_${name}`);
    await waitFrames(page, 3);
    await canvasElem.screenshot({ path: tmp });
    saveBoth(name, tmp);
    fs.unlinkSync(tmp);
    console.log('Saved:', name);
    return path.join(OUT_DIR, name);
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

  const h1Base = {
    profile: 'linear',
    zHorizon: 0.70,
    zNear: 1.38,
    topology: 'h1',
    comparisonMode: 'h1',
    h1FarZ: -3.0,
    alive: false,
    depthWrite: true,
    footprintMode: 0,
    contactCorrection: false,
  };

  await configure({
    ...h1Base,
    seaSource: 'original',
    footprintOn: true,
    comparisonMode: 'poster',
    canonical: true,
  });
  const posterPath = await shot('00-canonical-poster.png');
  const posterPng = PNG.sync.read(fs.readFileSync(posterPath));
  const band = waterBand(posterPng);

  const results = { sources: {}, pageErrors: [], psnr: {} };

  for (const src of SOURCES) {
    console.log(`\n[H1 -3 ${src.id}]`);
    results.sources[src.id] = { poses: {} };
    for (const slot of POSES) {
      await configure({
        ...h1Base,
        seaSource: src.seaSource,
        footprintOn: src.footprintOn,
        pose: slot.pose,
      });
      const file = await shot(`h1-zm3-${src.id}-${slot.id}.png`);
      const img = PNG.sync.read(fs.readFileSync(file));
      const stats = await page.evaluate(() => window.__p05.getWaterStats());
      const horizon = await page.evaluate(() => window.__p05.getHorizonScreenSamples());
      const rec = {
        file,
        cam: stats.cam,
        verts: stats.verts,
        tris: stats.tris,
        drawCalls: stats.drawCalls,
        fps: stats.fps,
        frameTimeMs: stats.frameTimeMs,
        seaSource: stats.seaSource,
        footprintOn: stats.footprintOn,
        footprintEffective: stats.footprintEffective,
        topology: stats.topology,
        h1FarZ: stats.h1FarZ,
        horizonPy: horizon[2] && horizon[2].py,
        psnrPosterFull: computeMetrics(posterPng, img),
        psnrPosterWater: computeMetrics(posterPng, img, band),
        holes: holePct(posterPng, img, band),
      };
      results.sources[src.id].poses[slot.id] = rec;
      console.log(
        `  ${slot.id}  sea=${stats.seaSource} fpEff=${stats.footprintEffective}`
        + ` verts=${stats.verts} calls=${stats.drawCalls}`
        + ` waterPSNR ${rec.psnrPosterWater.psnr.toFixed(2)}`
        + ` holes ${rec.holes.pct.toFixed(2)}%`
      );

      if (slot.id === 'canonical' || slot.id === 'push185' || slot.id === 'push170') {
        writePng(cropPng(img, 0, 855, 360, 169), path.join(OUT_DIR, `crop-${src.id}-${slot.id}-sentinel.png`));
        writePng(cropPng(img, 500, 855, 524, 169), path.join(OUT_DIR, `crop-${src.id}-${slot.id}-citadel.png`));
        writePng(cropPng(img, 320, 855, 220, 169), path.join(OUT_DIR, `crop-${src.id}-${slot.id}-center.png`));
        writePng(cropPng(img, 430, 848, 140, 24), path.join(OUT_DIR, `crop-${src.id}-${slot.id}-needles.png`));
        fs.copyFileSync(path.join(OUT_DIR, `crop-${src.id}-${slot.id}-sentinel.png`), path.join(STORE_DIR, `crop-${src.id}-${slot.id}-sentinel.png`));
        fs.copyFileSync(path.join(OUT_DIR, `crop-${src.id}-${slot.id}-citadel.png`), path.join(STORE_DIR, `crop-${src.id}-${slot.id}-citadel.png`));
        fs.copyFileSync(path.join(OUT_DIR, `crop-${src.id}-${slot.id}-center.png`), path.join(STORE_DIR, `crop-${src.id}-${slot.id}-center.png`));
        fs.copyFileSync(path.join(OUT_DIR, `crop-${src.id}-${slot.id}-needles.png`), path.join(STORE_DIR, `crop-${src.id}-${slot.id}-needles.png`));
      }
    }
  }

  for (const slot of POSES) {
    const a = PNG.sync.read(fs.readFileSync(results.sources.original.poses[slot.id].file));
    const b = PNG.sync.read(fs.readFileSync(results.sources['sea-only'].poses[slot.id].file));
    results.psnr[`orig-vs-sea-${slot.id}`] = {
      full: computeMetrics(a, b),
      water: computeMetrics(a, b, band),
    };
  }

  results.pageErrors = pageErrors;
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(results, null, 2));
  fs.copyFileSync(path.join(OUT_DIR, 'metrics.json'), path.join(STORE_DIR, 'metrics.json'));

  await browser.close();
  console.log('\nWrote', path.join(OUT_DIR, 'metrics.json'));
  if (pageErrors.length) {
    console.log('Page errors:', pageErrors);
  }
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
