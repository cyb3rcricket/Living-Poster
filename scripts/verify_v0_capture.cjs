#!/usr/bin/env node
/**
 * Living Poster V0 — small capture set + lab regression. Dumps are gitignored.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.V0_BASE_URL || 'http://127.0.0.1:5180';
const OUT_DIR = process.env.V0_OUT_DIR || path.join(__dirname, 'v0-verification');
const ART_DIR = '/opt/cursor/artifacts';

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function shotCanvas(page, dest) {
  const canvas = await page.$('#webgl-canvas');
  await canvas.screenshot({ path: dest });
}

async function hideChrome(page) {
  await page.evaluate(() => {
    const hide = (id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    };
    hide('dev-panel');
    hide('enter-overlay');
    hide('p6-hud');
    hide('status-toast');
    document.querySelectorAll('.lp-v0-explore-hint').forEach((el) => { el.style.display = 'none'; });
  });
}

async function waitLoaded(page, timeout = 90000) {
  await page.waitForFunction(
    () => window.__livingPoster && window.__livingPoster.state && window.__livingPoster.state.isLoaded,
    { timeout },
  );
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(ART_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: [
      '--use-gl=angle',
      '--use-angle=gl',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--window-size=1280,800',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=/tmp/chrome-test-v0-${Date.now()}`,
    ],
    defaultViewport: { width: 1280, height: 800 },
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err.stack || err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  const headers = {};
  for (const p of [1, 2, 3, 4, 5, 6]) {
    await page.goto(`${BASE_URL}/?p=${p}`, { waitUntil: 'networkidle0', timeout: 90000 });
    await sleep(600);
    headers[p] = await page.evaluate(() => ({
      title: document.getElementById('dev-header-title') && document.getElementById('dev-header-title').textContent,
      tab: document.querySelector('.proto-tab-btn.active') && document.querySelector('.proto-tab-btn.active').textContent,
      href: location.href,
    }));
    console.log(`?p=${p}  ${headers[p].title}`);
  }

  await page.goto(`${BASE_URL}/?experience=1`, { waitUntil: 'networkidle0', timeout: 90000 });
  await waitLoaded(page);
  await sleep(800);
  const boot = await page.evaluate(() => {
    const lp = window.__livingPoster;
    const gl = document.getElementById('webgl-canvas').getContext('webgl2')
      || document.getElementById('webgl-canvas').getContext('webgl');
    let glRenderer = null;
    let glVendor = null;
    if (gl) {
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbg) {
        glVendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL);
        glRenderer = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
      }
    }
    const tab = document.getElementById('tab-living-poster');
    return {
      href: location.href,
      title: document.getElementById('dev-header-title').textContent,
      tabLabel: tab && tab.textContent,
      tabActive: tab && tab.classList.contains('active'),
      windowHook: !!window.__livingPoster,
      state: lp.getState(),
      dpr: window.devicePixelRatio,
      canvasW: lp.renderer.domElement.width,
      canvasH: lp.renderer.domElement.height,
      cssW: lp.container.clientWidth,
      cssH: lp.container.clientHeight,
      pixelRatio: lp.renderer.getPixelRatio(),
      glVendor,
      glRenderer,
    };
  });
  console.log('boot', JSON.stringify(boot, null, 2));

  await hideChrome(page);

  // 1. Poster
  await page.evaluate(() => {
    window.__livingPoster.resetToPoster();
  });
  await sleep(250);
  await page.evaluate(() => window.__livingPoster.update(performance.now()));
  await sleep(80);
  const posterPath = path.join(OUT_DIR, '01-poster.png');
  await shotCanvas(page, posterPath);

  // 2. Mid-journey (P06 rail, still prototypes pipeline)
  const mid = await page.evaluate(() => {
    const lp = window.__livingPoster;
    lp.resetToPoster();
    lp.p06.seek(10.10, true);
    lp.update(performance.now());
    return {
      state: lp.getState(),
      p06: lp.p06.getTelemetry(),
      pipeline: lp.getPipeline(),
    };
  });
  await sleep(180);
  const midPath = path.join(OUT_DIR, '02-mid-journey.png');
  await shotCanvas(page, midPath);
  console.log('mid-journey', JSON.stringify(mid));

  // 3. Arrival / world
  const arrival = await page.evaluate(() => {
    const lp = window.__livingPoster;
    lp.skipToArrival();
    lp.setActive(true);
    lp.update(performance.now());
    const names = [];
    lp.worldScene.traverse((o) => { if (o.name) names.push(o.name); });
    const cam = lp.worldCamera;
    return {
      state: lp.getState(),
      pipeline: lp.getPipeline(),
      names,
      cam: { x: cam.position.x, y: cam.position.y, z: cam.position.z, rx: cam.rotation.x, ry: cam.rotation.y },
      bounds: lp.world && lp.world.bounds,
    };
  });
  await sleep(200);
  const arrivalPath = path.join(OUT_DIR, '03-arrival.png');
  await shotCanvas(page, arrivalPath);
  console.log('arrival names', arrival.names);
  console.log('arrival cam', arrival.cam);

  // Sample perf for ~1s in world
  const perfWarm = await page.evaluate(async () => {
    const lp = window.__livingPoster;
    const samples = [];
    for (let i = 0; i < 45; i += 1) {
      await new Promise((r) => requestAnimationFrame(r));
      lp.update(performance.now());
      if (i % 5 === 4) samples.push(lp.getPerfStats());
    }
    const last = lp.getPerfStats();
    const q = lp.quality.getStats ? lp.quality.getStats() : {};
    return { last, q, samples };
  });
  console.log('perf', JSON.stringify(perfWarm.last), JSON.stringify(perfWarm.q.info || {}));

  // 4. Look left / right at explorer yaw limits (disable explorer so pose sticks)
  await page.evaluate(() => {
    const lp = window.__livingPoster;
    lp.explorer.disable();
    lp.worldCamera.rotation.y = -0.052;
    lp.worldCamera.rotation.x = -0.004;
    lp.worldCamera.updateMatrixWorld(true);
    lp._renderWorld();
  });
  await sleep(80);
  const leftPath = path.join(OUT_DIR, '04-explore-look-left.png');
  await shotCanvas(page, leftPath);

  await page.evaluate(() => {
    const lp = window.__livingPoster;
    lp.worldCamera.rotation.y = 0.087;
    lp.worldCamera.rotation.x = -0.004;
    lp.worldCamera.updateMatrixWorld(true);
    lp._renderWorld();
  });
  await sleep(80);
  const rightPath = path.join(OUT_DIR, '05-explore-look-right.png');
  await shotCanvas(page, rightPath);

  // WASD: re-enable, hold W, measure z change
  const walk = await page.evaluate(async () => {
    const lp = window.__livingPoster;
    lp.skipToArrival();
    lp.setActive(true);
    const start = {
      x: lp.worldCamera.position.x,
      y: lp.worldCamera.position.y,
      z: lp.worldCamera.position.z,
    };
    const down = new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true });
    window.dispatchEvent(down);
    const t0 = performance.now();
    for (let i = 0; i < 120; i += 1) {
      await new Promise((r) => requestAnimationFrame(r));
      lp.update(performance.now());
    }
    const t1 = performance.now();
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
    const end = {
      x: lp.worldCamera.position.x,
      y: lp.worldCamera.position.y,
      z: lp.worldCamera.position.z,
    };
    const bounds = lp.world.bounds;
    return {
      start,
      end,
      dtSec: (t1 - t0) / 1000,
      dz: end.z - start.z,
      dx: end.x - start.x,
      bounds,
      hitMinZ: Math.abs(end.z - bounds.minZ) < 0.0015,
    };
  });
  console.log('walk', JSON.stringify(walk));

  // Bounds time estimate from rest walking W (forward, -Z)
  const boundTime = await page.evaluate(async () => {
    const lp = window.__livingPoster;
    lp.skipToArrival();
    lp.setActive(true);
    const startZ = lp.worldCamera.position.z;
    const minZ = lp.world.bounds.minZ;
    const maxZ = lp.world.bounds.maxZ;
    const minX = lp.world.bounds.minX;
    const maxX = lp.world.bounds.maxX;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
    const t0 = performance.now();
    let hit = false;
    let elapsed = 0;
    for (let i = 0; i < 600; i += 1) {
      await new Promise((r) => requestAnimationFrame(r));
      lp.update(performance.now());
      elapsed = (performance.now() - t0) / 1000;
      if (Math.abs(lp.worldCamera.position.z - minZ) < 0.0015) {
        hit = true;
        break;
      }
      if (elapsed > 20) break;
    }
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
    return {
      startZ,
      endZ: lp.worldCamera.position.z,
      minZ,
      maxZ,
      minX,
      maxX,
      hit,
      elapsed,
    };
  });
  console.log('boundTime', JSON.stringify(boundTime));

  // Canvas mean luminance to catch black void
  const luma = {};
  for (const file of ['01-poster.png', '02-mid-journey.png', '03-arrival.png', '04-explore-look-left.png', '05-explore-look-right.png']) {
    const dest = path.join(OUT_DIR, file);
    const { PNG } = require('pngjs');
    const buf = fs.readFileSync(dest);
    const png = PNG.sync.read(buf);
    let sum = 0;
    for (let i = 0; i < png.data.length; i += 4) {
      sum += 0.2126 * png.data[i] + 0.7152 * png.data[i + 1] + 0.0722 * png.data[i + 2];
    }
    luma[file] = sum / (png.width * png.height);
  }

  const report = {
    headers,
    boot,
    mid,
    arrival: { cam: arrival.cam, pipeline: arrival.pipeline, state: arrival.state, names: arrival.names, bounds: arrival.bounds },
    perfWarm,
    walk,
    boundTime,
    luma,
    pageErrors,
    consoleErrors: consoleErrors.slice(0, 40),
    viewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  };
  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify(report, null, 2));

  const copies = [
    ['01-poster.png', 'v0_poster.png'],
    ['02-mid-journey.png', 'v0_mid_journey.png'],
    ['03-arrival.png', 'v0_arrival.png'],
    ['04-explore-look-left.png', 'v0_explore_look_left.png'],
    ['05-explore-look-right.png', 'v0_explore_look_right.png'],
  ];
  for (const [src, dest] of copies) {
    fs.copyFileSync(path.join(OUT_DIR, src), path.join(ART_DIR, dest));
  }

  await browser.close();
  if (pageErrors.length) {
    console.warn('Page errors:', pageErrors);
    process.exit(1);
  }
  console.log('V0 captures written to', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
