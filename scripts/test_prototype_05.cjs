const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const BASE_URL = process.env.P05_BASE_URL || 'http://127.0.0.1:5173';
const OUT_DIR = path.join(__dirname, 'p05-verification');

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/local/bin/google-chrome',
  '/opt/google/chrome/chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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

function waterBand(img) {
  const y0 = Math.floor(img.height * (855 / 1024));
  return { y0, y1: img.height, x0: 0, x1: img.width };
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

async function runTest() {
  ensureDir(OUT_DIR);
  const chrome = findChrome();
  console.log('====================================================');
  console.log('Testing Prototype 05: Painted Ocean Spatial Reconstruction');
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
      `--user-data-dir=/tmp/chrome-test-p05-${Date.now()}`,
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
  await new Promise((r) => setTimeout(r, 400));

  const headerTitle = await page.evaluate(() => document.getElementById('dev-header-title').textContent);
  console.log('Header Title:', headerTitle);
  if (!headerTitle.includes('05')) throw new Error(`Expected P05 header, got "${headerTitle}"`);

  await hideUI();

  const results = {
    profiles: {},
    depthWrite: {},
    swimming: {},
    horizon: {},
    regression: {},
    pageErrors: [],
  };

  // --------------------------------------------------------------------------
  // Canonical captures: poster / card / slab / stack
  // --------------------------------------------------------------------------
  console.log('\n[Canonical modes]');
  await configure({ profile: 'linear', zHorizon: 0.70, zNear: 1.38, comparisonMode: 'poster', canonical: true, alive: false, depthWrite: true, footprintOn: true });
  const posterPath = await shot('01-canonical-poster.png');

  await configure({ comparisonMode: 'card', canonical: true, rebuild: false });
  const cardPath = await shot('02-canonical-card.png');

  await configure({ comparisonMode: 'slab', canonical: true, rebuild: false });
  const slabPath = await shot('03-canonical-slab-linear.png');

  await configure({ comparisonMode: 'stack', canonical: true, rebuild: false });
  const stackPath = await shot('04-canonical-stack.png');

  await configure({ comparisonMode: 'overlay', canonical: true, rebuild: false });
  await shot('05-canonical-overlay-5050.png');

  await configure({ comparisonMode: 'wireframe', canonical: true, rebuild: false });
  await shot('06-canonical-wireframe.png');

  await configure({ comparisonMode: 'footprint', canonical: true, rebuild: false });
  await shot('07-canonical-footprint-debug.png');

  await configure({ comparisonMode: 'projection', canonical: true, rebuild: false });
  await shot('08-canonical-projection-debug.png');

  await configure({ comparisonMode: 'profile', canonical: true, rebuild: false });
  await shot('09-canonical-profile-debug.png');

  const posterPng = PNG.sync.read(fs.readFileSync(posterPath));
  const cardPng = PNG.sync.read(fs.readFileSync(cardPath));
  const slabPng = PNG.sync.read(fs.readFileSync(slabPath));
  const stackPng = PNG.sync.read(fs.readFileSync(stackPath));
  const band = waterBand(posterPng);

  results.canonical = {
    full: {
      posterCard: computeMetrics(posterPng, cardPng),
      posterSlab: computeMetrics(posterPng, slabPng),
      posterStack: computeMetrics(posterPng, stackPng),
      cardSlab: computeMetrics(cardPng, slabPng),
      cardStack: computeMetrics(cardPng, stackPng),
    },
    water: {
      posterCard: computeMetrics(posterPng, cardPng, band),
      posterSlab: computeMetrics(posterPng, slabPng, band),
      posterStack: computeMetrics(posterPng, stackPng, band),
      cardSlab: computeMetrics(cardPng, slabPng, band),
      cardStack: computeMetrics(cardPng, stackPng, band),
    },
  };

  console.log('Water-band CARD vs POSTER:', formatMetrics(results.canonical.water.posterCard));
  console.log('Water-band SLAB vs POSTER:', formatMetrics(results.canonical.water.posterSlab));
  console.log('Water-band STACK vs POSTER:', formatMetrics(results.canonical.water.posterStack));
  console.log('Water-band SLAB vs CARD:', formatMetrics(results.canonical.water.cardSlab));

  // Crops
  const W = posterPng.width;
  const H = posterPng.height;
  const horizonCrop = cropPng(posterPng, 0, Math.floor(H * 0.80), W, Math.floor(H * 0.08));
  fs.writeFileSync(path.join(OUT_DIR, 'crop-horizon-poster.png'), PNG.sync.write(horizonCrop));
  fs.writeFileSync(path.join(OUT_DIR, 'crop-horizon-slab.png'), PNG.sync.write(
    cropPng(slabPng, 0, Math.floor(H * 0.80), W, Math.floor(H * 0.08))
  ));
  fs.writeFileSync(path.join(OUT_DIR, 'crop-citadel-contact-slab.png'), PNG.sync.write(
    cropPng(slabPng, Math.floor(W * 0.62), Math.floor(H * 0.82), Math.floor(W * 0.36), Math.floor(H * 0.16))
  ));
  fs.writeFileSync(path.join(OUT_DIR, 'crop-sentinel-contact-slab.png'), PNG.sync.write(
    cropPng(slabPng, Math.floor(W * 0.00), Math.floor(H * 0.78), Math.floor(W * 0.28), Math.floor(H * 0.20))
  ));
  fs.writeFileSync(path.join(OUT_DIR, 'crop-corridor-slab.png'), PNG.sync.write(
    cropPng(slabPng, Math.floor(W * 0.28), Math.floor(H * 0.82), Math.floor(W * 0.30), Math.floor(H * 0.16))
  ));

  // --------------------------------------------------------------------------
  // Profile comparison at identical poses
  // --------------------------------------------------------------------------
  console.log('\n[Depth profiles]');
  const profiles = ['linear', 'smooth', 'power', 'hermite'];
  for (const profile of profiles) {
    await configure({
      profile,
      zHorizon: 0.70,
      zNear: 1.38,
      comparisonMode: 'slab',
      canonical: true,
      alive: false,
      depthWrite: true,
      footprintOn: true,
    });
    const canonFile = await shot(`10-profile-${profile}-canonical.png`);
    const canonImg = PNG.sync.read(fs.readFileSync(canonFile));
    const waterVsPoster = computeMetrics(posterPng, canonImg, band);
    const waterVsCard = computeMetrics(cardPng, canonImg, band);
    const horizonCanon = await page.evaluate(() => window.__p05.getHorizonScreenSamples());

    await configure({
      comparisonMode: 'slab',
      rebuild: false,
      pose: { x: 0, y: 0, z: 1.70, rx: 0, ry: 0 },
    });
    await shot(`11-profile-${profile}-forward.png`);
    const horizonFwd = await page.evaluate(() => window.__p05.getHorizonScreenSamples());

    await configure({
      comparisonMode: 'slab',
      rebuild: false,
      pose: { x: -0.12, y: 0, z: 1.78, rx: 0, ry: 0.04 },
    });
    await shot(`12-profile-${profile}-left.png`);

    await configure({
      comparisonMode: 'slab',
      rebuild: false,
      pose: { x: 0.12, y: 0, z: 1.78, rx: 0, ry: -0.04 },
    });
    await shot(`13-profile-${profile}-right.png`);

    results.profiles[profile] = {
      waterVsPoster,
      waterVsCard,
      horizonCanon,
      horizonFwd,
      horizonDriftPx: horizonCanon.map((h, i) => ({
        u: h.u,
        dPx: Math.abs(h.px - horizonFwd[i].px) * W,
        dPy: Math.abs(h.py - horizonFwd[i].py) * H,
      })),
    };
    console.log(`Profile ${profile} water vs poster:`, formatMetrics(waterVsPoster));
  }

  // Small zHorizon / zNear sweep on LINEAR only
  console.log('\n[LINEAR zHorizon/zNear sweep]');
  const knobs = [
    { zHorizon: 0.68, zNear: 1.25 },
    { zHorizon: 0.70, zNear: 1.32 },
    { zHorizon: 0.70, zNear: 1.38 },
    { zHorizon: 0.74, zNear: 1.38 },
    { zHorizon: 0.72, zNear: 1.20 },
  ];
  results.knobSweep = [];
  for (const knob of knobs) {
    await configure({
      profile: 'linear',
      ...knob,
      comparisonMode: 'slab',
      canonical: true,
      alive: false,
    });
    const f = await shot(`14-linear-zh${knob.zHorizon.toFixed(2)}-zn${knob.zNear.toFixed(2)}-canonical.png`);
    const img = PNG.sync.read(fs.readFileSync(f));
    const m = computeMetrics(posterPng, img, band);
    results.knobSweep.push({ ...knob, waterVsPoster: m });
    console.log(`linear zh=${knob.zHorizon} zn=${knob.zNear}:`, formatMetrics(m));
  }

  // --------------------------------------------------------------------------
  // Depth write ON vs OFF
  // --------------------------------------------------------------------------
  console.log('\n[Depth write]');
  await configure({
    profile: 'linear', zHorizon: 0.70, zNear: 1.38,
    comparisonMode: 'slab', depthWrite: true, canonical: true,
  });
  await shot('15-depthwrite-on-canonical.png');
  await configure({ comparisonMode: 'slab', depthWrite: true, rebuild: false, pose: { x: -0.10, y: 0, z: 1.72, rx: 0, ry: 0.03 } });
  const dwOn = await shot('16-depthwrite-on-forward-left.png');

  await configure({ comparisonMode: 'slab', depthWrite: false, rebuild: false, pose: { x: -0.10, y: 0, z: 1.72, rx: 0, ry: 0.03 } });
  const dwOff = await shot('17-depthwrite-off-forward-left.png');
  results.depthWrite = computeMetrics(
    PNG.sync.read(fs.readFileSync(dwOn)),
    PNG.sync.read(fs.readFileSync(dwOff))
  );
  console.log('DepthWrite ON vs OFF (angled):', formatMetrics(results.depthWrite));

  // --------------------------------------------------------------------------
  // Motion envelope + swimming
  // --------------------------------------------------------------------------
  console.log('\n[Envelope / swimming]');
  await configure({
    profile: 'linear', zHorizon: 0.70, zNear: 1.38, comparisonMode: 'slab',
    alive: false, depthWrite: true, canonical: true,
  });
  await configure({ rebuild: false, pose: { x: 0, y: 0, z: 1.70, rx: 0, ry: 0 } });
  await shot('18-slab-max-push.png');

  await configure({ rebuild: false, pose: { x: 0, y: 0.04, z: 1.80, rx: -0.02, ry: 0 } });
  await shot('19-slab-up.png');

  await configure({
    comparisonMode: 'slab', alive: true, rebuild: false,
    pose: { x: -0.10, y: 0, z: 1.75, rx: 0, ry: 0.03 },
  });
  const swimA = await shot('20-swimming-a.png');
  await new Promise((r) => setTimeout(r, 700));
  const swimB = await shot('21-swimming-b.png');
  results.swimming.aliveOn = computeMetrics(
    PNG.sync.read(fs.readFileSync(swimA)),
    PNG.sync.read(fs.readFileSync(swimB)),
    band
  );

  await configure({
    comparisonMode: 'slab', alive: false, rebuild: false,
    pose: { x: -0.10, y: 0, z: 1.75, rx: 0, ry: 0.03 },
  });
  const stillA = await shot('22-swimming-control-a.png');
  await new Promise((r) => setTimeout(r, 700));
  const stillB = await shot('23-swimming-control-b.png');
  results.swimming.aliveOff = computeMetrics(
    PNG.sync.read(fs.readFileSync(stillA)),
    PNG.sync.read(fs.readFileSync(stillB)),
    band
  );
  console.log('Swimming ALIVE ON  A vs B:', formatMetrics(results.swimming.aliveOn));
  console.log('Swimming ALIVE OFF A vs B:', formatMetrics(results.swimming.aliveOff));

  await configure({ comparisonMode: 'stack', alive: false, canonical: true });
  await configure({ comparisonMode: 'stack', rebuild: false, pose: { x: 0, y: 0, z: 1.70, rx: 0, ry: 0 } });
  await shot('24-stack-forward.png');

  const stats = await page.evaluate(() => window.__p05.getWaterStats());
  results.stats = stats;
  console.log('Water stats:', JSON.stringify(stats, null, 2));

  // --------------------------------------------------------------------------
  // Regression P01–P04
  // --------------------------------------------------------------------------
  console.log('\n[Regression P01–P04]');
  const checkProto = async (p, needle) => {
    await page.goto(`${BASE_URL}/?p=${p}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 700));
    const title = await page.evaluate(() => document.getElementById('dev-header-title').textContent);
    const overlayHidden = await page.evaluate(() => {
      const el = document.getElementById('enter-overlay');
      return el.classList.contains('overlay-state-hidden') || getComputedStyle(el).opacity === '0';
    });
    console.log(`?p=${p} header="${title}"`);
    if (!title.includes(needle)) throw new Error(`Regression: ?p=${p} header "${title}" missing ${needle}`);
    return { title, overlayHidden };
  };

  results.regression.p1 = await checkProto('1', '01');
  results.regression.p2 = await checkProto('2', '02');
  results.regression.p3 = await checkProto('3', '03');
  const p3Overlay = await page.evaluate(() => {
    const el = document.getElementById('enter-overlay');
    return {
      visibleClass: el.classList.contains('overlay-state-visible'),
      hiddenClass: el.classList.contains('overlay-state-hidden'),
    };
  });
  results.regression.p3.enterOverlay = p3Overlay;
  if (!p3Overlay.visibleClass) {
    console.warn('P03 ENTER overlay was not visible at p=0 — check if progress was leftover. Reloaded page should be idle.');
  }
  results.regression.p4 = await checkProto('4', '04');
  const p4Volume = await page.evaluate(() => document.getElementById('p4-btn-volume').classList.contains('active'));
  results.regression.p4.volumeActive = p4Volume;

  results.pageErrors = pageErrors;
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(results, null, 2));
  console.log('\nWrote', path.join(OUT_DIR, 'metrics.json'));

  if (pageErrors.length) {
    console.warn('Page errors encountered:', pageErrors);
  }

  console.log('\n====================================================');
  console.log('Prototype 05 verification captures complete.');
  console.log('====================================================');
  await browser.close();
}

runTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
