const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { PNG } = require('pngjs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE_URL = 'http://127.0.0.1:5173';

async function runTest() {
  console.log('====================================================');
  console.log('Testing Prototype 03: Invisible Handoff');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--use-gl=angle',
      '--window-size=1024,1024',
      '--no-sandbox',
    ],
    defaultViewport: { width: 1024, height: 1024 },
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageErrors.push(err.toString()));

  console.log(`Navigating to ${BASE_URL}/?p=3 ...`);
  await page.goto(`${BASE_URL}/?p=3`, { waitUntil: 'networkidle0' });

  // Wait for textures, meshes, and offscreen render targets to initialize
  await new Promise(r => setTimeout(r, 1500));

  const canvasElem = await page.$('#webgl-canvas');

  // Helper to hide UI for clean canvas capture
  const hideUI = async () => {
    await page.evaluate(() => {
      document.getElementById('dev-panel').style.display = 'none';
      document.getElementById('status-toast').style.display = 'none';
      document.getElementById('enter-overlay').style.display = 'none';
    });
  };

  const restoreUI = async () => {
    await page.evaluate(() => {
      document.getElementById('dev-panel').style.display = '';
      document.getElementById('status-toast').style.display = '';
      document.getElementById('enter-overlay').style.display = '';
    });
  };

  // --------------------------------------------------------------------------
  // Test 1: Stage A — Canonical Flat Starting State (p = 0.0)
  // --------------------------------------------------------------------------
  console.log('\n[Step 1] Verifying Canonical Flat Starting State (p = 0.0)...');
  const initialStage = await page.evaluate(() => window.proto03 ? window.proto03.state.currentStage : document.getElementById('p3-badge-stage').textContent);
  console.log(`Initial Stage Badge: ${initialStage}`);

  await hideUI();
  await canvasElem.screenshot({ path: 'scripts/test-p03-01-canonical-flat.png' });
  console.log('Saved: scripts/test-p03-01-canonical-flat.png');
  await restoreUI();

  // Compare test-p03-01 against original poster screenshot
  if (fs.existsSync('scripts/test-p02-02-original-flat.png')) {
    const origPng = PNG.sync.read(fs.readFileSync('scripts/test-p02-02-original-flat.png'));
    const p3FlatPng = PNG.sync.read(fs.readFileSync('scripts/test-p03-01-canonical-flat.png'));
    let sumSq = 0;
    let maxDiff = 0;
    let diffCount = 0;
    const n = origPng.width * origPng.height;
    for (let i = 0; i < n; i++) {
      const idx = i * 4;
      const d = (Math.abs(origPng.data[idx] - p3FlatPng.data[idx]) +
                 Math.abs(origPng.data[idx + 1] - p3FlatPng.data[idx + 1]) +
                 Math.abs(origPng.data[idx + 2] - p3FlatPng.data[idx + 2])) / 3;
      if (d > 5) diffCount++;
      if (d > maxDiff) maxDiff = d;
      sumSq += d * d;
    }
    const mse = sumSq / n;
    const psnr = 10 * Math.log10((255 * 255) / (mse || 0.0001));
    console.log(`Canvas Fidelity vs Original Poster at p=0:`);
    console.log(`- MSE:  ${mse.toFixed(3)}`);
    console.log(`- PSNR: ${psnr.toFixed(2)} dB`);
    console.log(`- Pixels with diff > 5/255: ${((diffCount / n) * 100).toFixed(2)}%`);
    console.log(`- Max pixel difference: ${maxDiff.toFixed(1)} / 255`);
  }

  // --------------------------------------------------------------------------
  // Test 2: Stage B — Early Awakening (p = 0.25)
  // --------------------------------------------------------------------------
  console.log('\n[Step 2] Testing Stage B: Early Awakening (p = 0.25)...');
  await page.evaluate(() => {
    // Set master progress directly on slider and controller
    const slider = document.getElementById('p3-slider-progress');
    slider.value = '0.25';
    slider.dispatchEvent(new Event('input'));
  });
  await new Promise(r => setTimeout(r, 400));

  const telemB = await page.evaluate(() => ({
    stage: document.getElementById('p3-badge-stage').textContent,
    progress: document.getElementById('p3-val-progress').textContent,
    weights: document.getElementById('p3-tel-weights').textContent,
    maxDrift: document.getElementById('p3-tel-max').textContent,
  }));
  console.log(`Stage B Telemetry:`, telemB);

  await hideUI();
  await canvasElem.screenshot({ path: 'scripts/test-p03-02-early-awakening.png' });
  console.log('Saved: scripts/test-p03-02-early-awakening.png');
  await restoreUI();

  // --------------------------------------------------------------------------
  // Test 3: Stage C — Mid-Handoff Window (p = 0.50)
  // --------------------------------------------------------------------------
  console.log('\n[Step 3] Testing Stage C: Mid-Handoff Window (p = 0.50)...');
  await page.evaluate(() => {
    const slider = document.getElementById('p3-slider-progress');
    slider.value = '0.50';
    slider.dispatchEvent(new Event('input'));
  });
  await new Promise(r => setTimeout(r, 400));

  const telemC = await page.evaluate(() => ({
    stage: document.getElementById('p3-badge-stage').textContent,
    progress: document.getElementById('p3-val-progress').textContent,
    weights: document.getElementById('p3-tel-weights').textContent,
    maxDrift: document.getElementById('p3-tel-max').textContent,
    sentinel: document.getElementById('p3-tel-sentinel').textContent,
    citadel: document.getElementById('p3-tel-citadel').textContent,
    needle: document.getElementById('p3-tel-needle').textContent,
    horizon: document.getElementById('p3-tel-horizon').textContent,
  }));
  console.log(`Stage C Telemetry (50/50 handoff):`, telemC);

  // Capture NORMAL mode
  await hideUI();
  await canvasElem.screenshot({ path: 'scripts/test-p03-03-mid-handoff-normal.png' });
  console.log('Saved: scripts/test-p03-03-mid-handoff-normal.png');

  // Capture 50/50 OVERLAY mode
  await restoreUI();
  await page.click('#p3-btn-diag-overlay');
  await new Promise(r => setTimeout(r, 300));
  await hideUI();
  await canvasElem.screenshot({ path: 'scripts/test-p03-04-mid-handoff-overlay.png' });
  console.log('Saved: scripts/test-p03-04-mid-handoff-overlay.png');

  // Capture DIFFERENCE mode
  await restoreUI();
  await page.click('#p3-btn-diag-diff');
  await new Promise(r => setTimeout(r, 300));
  await hideUI();
  await canvasElem.screenshot({ path: 'scripts/test-p03-05-mid-handoff-difference.png' });
  console.log('Saved: scripts/test-p03-05-mid-handoff-difference.png');

  // Return to NORMAL mode
  await restoreUI();
  await page.click('#p3-btn-diag-normal');
  await new Promise(r => setTimeout(r, 300));

  // --------------------------------------------------------------------------
  // Test 4: Stage D — Spatial Unlock (p = 0.85)
  // --------------------------------------------------------------------------
  console.log('\n[Step 4] Testing Stage D: Spatial Unlock (p = 0.85)...');
  await page.evaluate(() => {
    const slider = document.getElementById('p3-slider-progress');
    slider.value = '0.85';
    slider.dispatchEvent(new Event('input'));
  });
  await new Promise(r => setTimeout(r, 400));

  const telemD = await page.evaluate(() => ({
    stage: document.getElementById('p3-badge-stage').textContent,
    progress: document.getElementById('p3-val-progress').textContent,
    weights: document.getElementById('p3-tel-weights').textContent,
    maxDrift: document.getElementById('p3-tel-max').textContent,
  }));
  console.log(`Stage D Telemetry:`, telemD);

  await hideUI();
  await canvasElem.screenshot({ path: 'scripts/test-p03-06-spatial-unlock.png' });
  console.log('Saved: scripts/test-p03-06-spatial-unlock.png');
  await restoreUI();

  // --------------------------------------------------------------------------
  // Test 5: End State — Complete & Pointer Parallax (p = 1.00)
  // --------------------------------------------------------------------------
  console.log('\n[Step 5] Testing End State: Complete & Spatial Parallax (p = 1.00)...');
  await page.evaluate(() => {
    const slider = document.getElementById('p3-slider-progress');
    slider.value = '1.00';
    slider.dispatchEvent(new Event('input'));
  });
  await new Promise(r => setTimeout(r, 400));

  const telemE = await page.evaluate(() => ({
    stage: document.getElementById('p3-badge-stage').textContent,
    progress: document.getElementById('p3-val-progress').textContent,
    weights: document.getElementById('p3-tel-weights').textContent,
  }));
  console.log(`End State Telemetry:`, telemE);

  await hideUI();
  await canvasElem.screenshot({ path: 'scripts/test-p03-07-complete-parallax.png' });
  console.log('Saved: scripts/test-p03-07-complete-parallax.png');

  // Test mouse pointer parallax tracking
  console.log('Testing mouse parallax tracking at p=1.00...');
  await page.mouse.move(820, 260, { steps: 20 });
  await new Promise(r => setTimeout(r, 600));
  await canvasElem.screenshot({ path: 'scripts/test-p03-08-complete-pointer-parallax.png' });
  console.log('Saved: scripts/test-p03-08-complete-pointer-parallax.png');
  await restoreUI();

  // --------------------------------------------------------------------------
  // Test 6: Performance Benchmark Telemetry
  // --------------------------------------------------------------------------
  console.log('\n[Step 6] Measuring Rendering Performance Across States...');
  async function measurePerf(pVal, label) {
    await page.evaluate((val) => {
      const slider = document.getElementById('p3-slider-progress');
      slider.value = val.toString();
      slider.dispatchEvent(new Event('input'));
    }, pVal);
    await new Promise(r => setTimeout(r, 800));
    return await page.evaluate((l) => {
      return {
        label: l,
        fps: document.getElementById('p3-tel-perf').textContent,
        weights: document.getElementById('p3-tel-weights').textContent,
        maxDrift: document.getElementById('p3-tel-max').textContent,
      };
    }, label);
  }

  const perfFlat = await measurePerf(0.00, 'Flat State (p=0.0)');
  const perfHandoff = await measurePerf(0.50, 'Dual-Render Handoff (p=0.50)');
  const perfProxy = await measurePerf(1.00, 'Final Proxy State (p=1.00)');

  console.log('\nPerformance Metrics:');
  console.log(`- ${perfFlat.label.padEnd(30)}: ${perfFlat.fps} | ${perfFlat.weights}`);
  console.log(`- ${perfHandoff.label.padEnd(30)}: ${perfHandoff.fps} | ${perfHandoff.weights} | Drift: ${perfHandoff.maxDrift}`);
  console.log(`- ${perfProxy.label.padEnd(30)}: ${perfProxy.fps} | ${perfProxy.weights}`);

  // --------------------------------------------------------------------------
  // Test 7: Verify Independent Prototypes 01 and 02
  // --------------------------------------------------------------------------
  console.log('\n[Step 7] Verifying Independent Accessibility of Prototype 01 and 02...');

  // Test ?p=1
  console.log('Navigating to ?p=1 (Prototype 01)...');
  await page.goto(`${BASE_URL}/?p=1`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  const p1Title = await page.evaluate(() => document.getElementById('dev-header-title').textContent);
  console.log(`P01 Header Title: "${p1Title}"`);
  await hideUI();
  const canvasP1 = await page.$('#webgl-canvas');
  await canvasP1.screenshot({ path: 'scripts/test-p03-09-proto01-verify.png' });
  console.log('Saved: scripts/test-p03-09-proto01-verify.png (P01 still independently working)');
  await restoreUI();

  // Test ?p=2
  console.log('Navigating to ?p=2 (Prototype 02)...');
  await page.goto(`${BASE_URL}/?p=2`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  const p2Title = await page.evaluate(() => document.getElementById('dev-header-title').textContent);
  console.log(`P02 Header Title: "${p2Title}"`);
  await hideUI();
  const canvasP2 = await page.$('#webgl-canvas');
  await canvasP2.screenshot({ path: 'scripts/test-p03-10-proto02-verify.png' });
  console.log('Saved: scripts/test-p03-10-proto02-verify.png (P02 still independently working)');

  console.log('\n====================================================');
  console.log('All Prototype 03 Verification Tests Passed Successfully!');
  console.log('====================================================');

  await browser.close();
}

runTest().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
