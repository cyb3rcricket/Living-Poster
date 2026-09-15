#!/usr/bin/env node
/**
 * Diagnostic WORLD captures for ocean rectangle + citadel water contact.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.V0_BASE_URL || 'http://127.0.0.1:5180';
const OUT_DIR = process.env.V0_OUT_DIR || '/tmp/v0-ocean-diag';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome',
  '/usr/local/bin/google-chrome',
  '/opt/google/chrome/chrome',
  '/usr/bin/chromium',
].filter(Boolean);

function findChrome() {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome not found');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: [
      '--use-gl=angle',
      '--use-angle=gl',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--window-size=1024,1024',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=/tmp/chrome-v0-ocean-diag-${Date.now()}`,
    ],
    defaultViewport: { width: 1024, height: 1024 },
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
  page.on('pageerror', (err) => console.error('PAGEERROR', err.message));

  await page.goto(`${BASE_URL}/?experience=1`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(
    () => window.__livingPoster && window.__livingPoster.state && window.__livingPoster.state.isLoaded,
    { timeout: 90000 },
  );
  await sleep(400);
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
    const lp = window.__livingPoster;
    if (lp.quality && lp.quality.setLevel) lp.quality.setLevel('high');
  });

  const poses = [
    { file: '00-poster.png', mode: 'poster' },
    { file: '01-arrival.png', mode: 'world', x: -0.020, y: 0.003, z: 1.892, yaw: 0.0175, pitch: -0.004 },
    { file: '02-look-left.png', mode: 'world', x: -0.020, y: 0.003, z: 1.892, yaw: -0.052, pitch: -0.004 },
    { file: '03-look-right.png', mode: 'world', x: -0.020, y: 0.003, z: 1.892, yaw: 0.087, pitch: -0.004 },
    { file: '04-look-down.png', mode: 'world', x: -0.020, y: 0.003, z: 1.892, yaw: 0.0175, pitch: 0.040 },
    { file: '05-forward.png', mode: 'world', x: -0.020, y: 0.003, z: 1.858, yaw: 0.0175, pitch: -0.004 },
    { file: '06-forward-left.png', mode: 'world', x: -0.070, y: 0.003, z: 1.858, yaw: -0.052, pitch: -0.004 },
    { file: '07-forward-right.png', mode: 'world', x: 0.028, y: 0.003, z: 1.858, yaw: 0.087, pitch: -0.004 },
    { file: '08-citadel-base.png', mode: 'world', x: 0.028, y: 0.003, z: 1.872, yaw: 0.087, pitch: 0.040 },
    { file: '09-left-bound.png', mode: 'world', x: -0.070, y: 0.003, z: 1.872, yaw: -0.052, pitch: 0.020 },
    { file: '10-water-only.png', mode: 'water-only', x: 0.028, y: 0.003, z: 1.858, yaw: 0.087, pitch: 0.040 },
  ];

  for (const pose of poses) {
    await page.evaluate((p) => {
      const lp = window.__livingPoster;
      if (p.mode === 'poster') {
        lp.resetToPoster();
        lp.update(performance.now());
        return;
      }
      lp.skipToArrival();
      lp.setActive(true);
      if (lp.explorer && lp.explorer.disable) lp.explorer.disable();
      const cam = lp.worldCamera;
      cam.position.set(p.x, p.y, p.z);
      cam.rotation.set(p.pitch, p.yaw, 0);
      cam.updateMatrixWorld(true);
      lp.worldScene.traverse((o) => {
        if (!o.name) return;
        if (p.mode === 'water-only') {
          const hide = /citadel|sentinel|needles|ribbons|flare/i.test(o.name);
          if (hide) o.visible = false;
        } else if (o.visible === false) {
          o.visible = true;
        }
      });
      lp._renderWorld();
    }, pose);
    await sleep(120);
    const dest = path.join(OUT_DIR, pose.file);
    const canvas = await page.$('#webgl-canvas');
    await canvas.screenshot({ path: dest });
    console.log('wrote', dest);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
