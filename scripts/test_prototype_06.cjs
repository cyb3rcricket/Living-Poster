#!/usr/bin/env node
/**
 * Prototype 06 — small deliberate capture set. Does not dump hundreds of images.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.P06_BASE_URL || 'http://127.0.0.1:5173';
const OUT_DIR = path.join(__dirname, 'p06-verification');

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

const SHOTS = [
  { file: '01-poster.png', seek: 0.20, label: 'poster' },
  { file: '02-mid-awakening.png', seek: 1.55, label: 'mid-awakening' },
  { file: '03-mid-handoff.png', seek: 4.00, label: 'mid-handoff' },
  { file: '04-post-citadel.png', seek: 5.70, label: 'post-citadel' },
  { file: '05-post-water.png', seek: 6.21, label: 'post-water' },
  { file: '06-mid-journey.png', seek: 10.10, label: 'mid-journey' },
  { file: '07-rest.png', seek: 12.90, label: 'rest' },
];

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
      `--user-data-dir=/tmp/chrome-test-p06-${Date.now()}`,
    ],
    defaultViewport: { width: 1024, height: 1024 },
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));

  await page.goto(`${BASE_URL}/?p=6`, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction(() => window.__p06 && window.__p06.state && window.__p06.state.isLoaded, { timeout: 60000 });
  await page.evaluate(() => {
    const hide = (id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    };
    hide('dev-panel');
    hide('enter-overlay');
    hide('p6-hud');
    hide('status-toast');
  });

  const log = [];
  for (const shot of SHOTS) {
    const telem = await page.evaluate((t) => {
      window.__p06.seek(t, true);
      return window.__p06.getTelemetry();
    }, shot.seek);
    await new Promise((r) => setTimeout(r, 180));
    const dest = path.join(OUT_DIR, shot.file);
    const canvas = await page.$('#webgl-canvas');
    await canvas.screenshot({ path: dest });
    log.push({ ...shot, telem });
    console.log(`${shot.file}  stage=${telem.stage}  t=${telem.elapsed.toFixed(2)}  z=${telem.camZ.toFixed(3)}  yaw=${telem.yawDeg.toFixed(2)}`);
  }

  const headers = {};
  for (const p of [1, 2, 3, 4, 5, 6]) {
    await page.goto(`${BASE_URL}/?p=${p}`, { waitUntil: 'networkidle0', timeout: 60000 });
    await new Promise((r) => setTimeout(r, 400));
    headers[p] = await page.evaluate(() => document.getElementById('dev-header-title').textContent);
    console.log(`?p=${p} ${headers[p]}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify({ shots: log, headers, pageErrors }, null, 2));
  await browser.close();
  if (pageErrors.length) {
    console.warn('Page errors:', pageErrors);
    process.exit(1);
  }
  console.log('Prototype 06 captures written to', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
