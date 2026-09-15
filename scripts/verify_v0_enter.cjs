#!/usr/bin/env node
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BASE_URL = process.env.V0_BASE_URL || 'http://127.0.0.1:5182';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/local/bin/google-chrome',
    headless: 'new',
    args: [
      '--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-webgl',
      '--window-size=1280,800', '--no-sandbox', '--disable-dev-shm-usage',
      `--user-data-dir=/tmp/chrome-test-v0-enter-${Date.now()}`,
    ],
    defaultViewport: { width: 1280, height: 800 },
  });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  await page.goto(`${BASE_URL}/?experience=1`, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction(() => window.__livingPoster && window.__livingPoster.state.isLoaded, { timeout: 90000 });

  const overlay = await page.evaluate(() => {
    const el = document.getElementById('enter-overlay');
    return {
      visible: el && el.classList.contains('overlay-state-visible'),
      hidden: el && el.classList.contains('overlay-state-hidden'),
    };
  });

  const enter = await page.evaluate(async () => {
    const lp = window.__livingPoster;
    lp.resetToPoster();
    lp.setActive(true);
    lp.startExperience();
    const t0 = performance.now();
    while (performance.now() - t0 < 1800) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    return {
      state: lp.getState(),
      pipeline: lp.getPipeline(),
      p06Playing: lp.p06.state.playing,
      hostP06Elapsed: window.__p06 && window.__p06.state.elapsed,
    };
  });

  const skipWalkSkip = await page.evaluate(async () => {
    const lp = window.__livingPoster;
    lp.skipToArrival();
    lp.setActive(true);
    const rest = { x: lp.worldCamera.position.x, z: lp.worldCamera.position.z };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w', bubbles: true }));
    const t0 = performance.now();
    while (performance.now() - t0 < 2500) {
      await new Promise((r) => requestAnimationFrame(r));
    }
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w', bubbles: true }));
    const walked = { x: lp.worldCamera.position.x, z: lp.worldCamera.position.z };
    lp.skipToArrival();
    await new Promise((r) => requestAnimationFrame(r));
    lp.update(performance.now());
    const afterSkip = { x: lp.worldCamera.position.x, z: lp.worldCamera.position.z };
    return { rest, walked, afterSkip, dz: walked.z - rest.z };
  });

  console.log(JSON.stringify({ overlay, enter, skipWalkSkip, pageErrors }, null, 2));
  await browser.close();
  if (pageErrors.length) process.exit(1);
  if (enter.state.phase === 'POSTER' || enter.state.elapsed < 0.2) {
    console.error('ENTER did not start the journey');
    process.exit(1);
  }
  if (Math.abs(skipWalkSkip.dz) < 0.01) {
    console.error('WASD did not move');
    process.exit(1);
  }
  if (Math.abs(skipWalkSkip.afterSkip.z - skipWalkSkip.rest.z) > 0.01) {
    console.error('skipToArrival did not restore rest pose', skipWalkSkip);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
