#!/usr/bin/env node
/**
 * Capture Living Poster V0 world channel poses.
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.V0_BASE_URL || 'http://127.0.0.1:5178';
const OUT_DIR = path.join(__dirname, 'v0-world-verification');

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
  { file: '01-canonical.png', pose: 'canonical' },
  { file: '02-rest.png', pose: 'rest' },
  { file: '03-look-left.png', pose: 'lookLeft' },
  { file: '04-look-right.png', pose: 'lookRight' },
  { file: '05-forward.png', pose: 'forward' },
  { file: '06-left-channel.png', pose: 'leftChannel' },
  { file: '07-right-channel.png', pose: 'rightChannel' },
  { file: '08-look-down.png', pose: 'lookDown' },
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
      `--user-data-dir=/tmp/chrome-test-v0-${Date.now()}`,
    ],
    defaultViewport: { width: 1024, height: 1024 },
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1024, height: 1024, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') pageErrors.push(msg.text());
  });

  await page.goto(`${BASE_URL}/scripts/v0-world-preview.html`, {
    waitUntil: 'networkidle0',
    timeout: 60000,
  });
  await page.waitForFunction(() => window.__lpv0 && window.__lpv0.world, { timeout: 60000 });
  await page.waitForFunction(() => {
    const w = window.__lpv0 && window.__lpv0.world;
    return w && w.group && w.group.children && w.group.children.length > 3;
  }, { timeout: 60000 });
  await new Promise((r) => setTimeout(r, 400));

  const meta = await page.evaluate(() => ({
    bounds: window.__lpv0.world.bounds,
    colliders: window.__lpv0.world.colliders,
    children: window.__lpv0.world.group.children.map((c) => c.name),
  }));

  const log = [];
  for (const shot of SHOTS) {
    const pose = await page.evaluate((name) => {
      window.__lpv0.applyPose(name);
      return window.__lpv0.getPose();
    }, shot.pose);
    await new Promise((r) => setTimeout(r, 120));
    const dest = path.join(OUT_DIR, shot.file);
    const canvas = await page.$('#c');
    await canvas.screenshot({ path: dest });
    log.push({ ...shot, pose });
    console.log(`${shot.file}  z=${pose.z.toFixed(3)}  yaw=${pose.ry.toFixed(4)}`);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'metrics.json'), JSON.stringify({
    meta,
    shots: log,
    pageErrors,
  }, null, 2));
  await browser.close();
  if (pageErrors.length) {
    console.warn('Page errors:', pageErrors);
    process.exit(1);
  }
  console.log('V0 world captures written to', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
