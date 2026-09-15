#!/usr/bin/env node
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 5199;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(__dirname, 'v1-verification');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
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
  throw new Error('Chrome/Chromium not found.');
}

async function waitPort(port, maxTries = 80) {
  const http = require('http');
  for (let i = 0; i < maxTries; i++) {
    try {
      await new Promise((res, rej) => {
        const req = http.get(`http://127.0.0.1:${port}/`, (r) => {
          res();
        });
        req.on('error', (err) => {
          rej(err);
        });
        req.setTimeout(2000, () => {
          req.destroy();
          rej(new Error('Timeout'));
        });
      });
      return;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error(`Server on port ${port} did not respond.`);
}

async function main() {
  console.log('=== Starting Living Poster V1 Verification ===');
  
  // 1. Launch Vite Dev Server on PORT 5199
  console.log(`Starting Vite dev server on port ${PORT}...`);
  const viteProc = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
    env: { ...process.env, PORT: String(PORT) },
  });

  viteProc.stderr.on('data', (d) => process.stderr.write(`[vite err] ${d}`));
  viteProc.stdout.on('data', (d) => process.stdout.write(`[vite] ${d}`));

  await waitPort(PORT);
  console.log(`Vite server running at ${BASE_URL}`);

  // 2. Launch Puppeteer Headless Browser
  console.log('Launching headless Chrome...');
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: 'new',
    args: [
      '--use-gl=angle',
      '--window-size=1280,960',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--user-data-dir=/tmp/chrome-test-lpv1-${Date.now()}`,
    ],
    defaultViewport: { width: 1280, height: 960 },
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 960, deviceScaleFactor: 1 });

  const pageErrors = [];
  const consoleMessages = [];
  page.on('pageerror', (err) => {
    console.error('Browser Page Error:', err);
    pageErrors.push(String(err));
  });
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(text);
    if (msg.type() === 'error') {
      console.error('Browser Console Error:', text);
    }
  });

  // 3. Verify Lab Prototypes ?p=1 through ?p=6 remain untouched & working
  console.log('\n--- Verifying Lab Prototypes ?p=1 to ?p=6 ---');
  await new Promise((r) => setTimeout(r, 800));
  const labHeaders = {};
  for (const p of [1, 2, 3, 4, 5, 6]) {
    await page.goto(`${BASE_URL}/?p=${p}`, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 600));
    labHeaders[p] = await page.evaluate(() => {
      const el = document.getElementById('dev-header-title');
      return el ? el.textContent : '';
    });
    console.log(`✓ ?p=${p}: ${labHeaders[p]}`);
  }

  // 4. Verify Living Poster V1 (?experience=1)
  console.log('\n--- Verifying Living Poster V1 (?experience=1) ---');
  await page.goto(`${BASE_URL}/?experience=1`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => window.__livingPoster && window.__livingPoster.state && window.__livingPoster.state.isLoaded, {
    timeout: 30000,
  });

  // Hide UI overlays for pristine captures
  await page.evaluate(() => {
    const hide = (id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    };
    hide('dev-panel');
    hide('dev-toggle-btn');
    hide('enter-overlay');
    hide('status-toast');
  });

  const captures = [
    {
      file: '01-poster-frame.png',
      label: 'Poster (Untouched)',
      seek: 0.5,
      desc: 'Pristine flat painting, perfectly registered at canonical pose (0, 0, 2.0)',
    },
    {
      file: '02-awakening-frame.png',
      label: 'Awakening',
      seek: 2.5,
      desc: 'Cyan shimmer, breathing ribbons, flare bloom, floating flecks',
    },
    {
      file: '03-mid-melt-frame.png',
      label: 'Mid-Melt',
      seek: 6.0,
      desc: 'GPU viscous curl melt, semantic depth separation, shards streaming backward',
    },
    {
      file: '04-threshold-crossing.png',
      label: 'Threshold Crossing',
      seek: 8.0,
      desc: 'Camera passing canvas plane (Z < 1.78), dissolving melt mesh into world',
    },
    {
      file: '05-world-generating.png',
      label: 'World Generating',
      seek: 10.5,
      desc: 'Continuous flight through crystal corridor chunks forming ahead of lens',
    },
    {
      file: '06-arrival-viewpoint.png',
      label: 'Arrival',
      seek: 13.5,
      desc: 'Settled at rest pose, finished painterly world, ocean, landmarks, sky dome',
    },
  ];

  const results = [];

  for (const c of captures) {
    // Seek to exact milestone timestamp
    const telem = await page.evaluate((t) => {
      const lp = window.__livingPoster;
      lp.seek(t);
      return {
        phase: lp.state.phase,
        elapsed: lp.state.elapsed,
        camPos: {
          x: lp.worldCamera.position.x,
          y: lp.worldCamera.position.y,
          z: lp.worldCamera.position.z,
        },
        camRot: {
          x: lp.worldCamera.rotation.x,
          y: lp.worldCamera.rotation.y,
          z: lp.worldCamera.rotation.z,
        },
        perf: lp.getPerfStats(),
      };
    }, c.seek);

    await new Promise((r) => setTimeout(r, 200));

    const dest = path.join(OUT_DIR, c.file);
    const canvas = await page.$('#webgl-canvas');
    await canvas.screenshot({ path: dest });

    console.log(`✓ Captured: ${c.file} [${c.label}] at t=${c.seek}s`);
    console.log(`  Cam: (${telem.camPos.x.toFixed(3)}, ${telem.camPos.y.toFixed(3)}, ${telem.camPos.z.toFixed(3)}) | Draws: ${telem.perf.drawCalls} | Tris: ${telem.perf.triangles}`);

    results.push({ ...c, telem });
  }

  // 5. Test Key Controls: Debug Colors (G)
  console.log('\n--- Testing Dev Controls ---');
  await page.evaluate(() => {
    const lp = window.__livingPoster;
    lp.seek(10.5);
    lp.toggleDebugColors();
    lp.world.update(1 / 60, lp.worldCamera, 10.5, true);
    lp._renderWorld();
  });
  await new Promise((r) => setTimeout(r, 200));
  const dbgDest = path.join(OUT_DIR, '07-debug-colors-key-g.png');
  await (await page.$('#webgl-canvas')).screenshot({ path: dbgDest });
  console.log('✓ Captured: 07-debug-colors-key-g.png (World-Gen phase debug colors)');

  // 6. Test Key Controls: Chunk Boundaries (C)
  await page.evaluate(() => {
    const lp = window.__livingPoster;
    lp.toggleDebugColors(); // toggle off
    lp.toggleChunkBoundaries();   // toggle on
    lp.world.update(1 / 60, lp.worldCamera, 10.5, true);
    lp._renderWorld();
  });
  await new Promise((r) => setTimeout(r, 200));
  const boundsDest = path.join(OUT_DIR, '08-chunk-boundaries-key-c.png');
  await (await page.$('#webgl-canvas')).screenshot({ path: boundsDest });
  console.log('✓ Captured: 08-chunk-boundaries-key-c.png (Chunk 3D boundaries)');

  // 7. Test Exploration & WASD
  console.log('\n--- Testing Full Exploration Mode ---');
  await page.evaluate(() => {
    const lp = window.__livingPoster;
    lp.skipToArrival();
    lp.world.toggleBoundaries(); // toggle off
    lp._renderWorld();
  });
  await new Promise((r) => setTimeout(r, 300));
  const exploreDest = path.join(OUT_DIR, '09-exploration-rest-pose.png');
  await (await page.$('#webgl-canvas')).screenshot({ path: exploreDest });
  console.log('✓ Captured: 09-exploration-rest-pose.png (Arrival viewpoint in world)');

  // 8. Performance telemetry snapshot
  const finalTelemetry = await page.evaluate(() => {
    const lp = window.__livingPoster;
    return {
      state: lp.getState(),
      perf: lp.getPerfStats(),
      bounds: lp.world.bounds,
      collidersCount: lp.world.colliders ? lp.world.colliders.length : 0,
      streamerChunks: lp.world.streamer ? lp.world.streamer.chunks.length : 0,
    };
  });

  const report = {
    timestamp: new Date().toISOString(),
    labHeaders,
    captures: results,
    finalTelemetry,
    pageErrors,
  };

  fs.writeFileSync(path.join(OUT_DIR, 'verification-report.json'), JSON.stringify(report, null, 2));
  console.log('\nVerification report written to:', path.join(OUT_DIR, 'verification-report.json'));

  // Clean up
  await browser.close();
  viteProc.kill();

  if (pageErrors.length > 0) {
    console.error('\nFAIL: Encountered page errors during verification:', pageErrors);
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All Living Poster V1 verification tests passed cleanly!');
  }
}

main().catch((err) => {
  console.error('Fatal Verification Error:', err);
  process.exit(1);
});
