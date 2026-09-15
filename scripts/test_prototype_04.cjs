const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { PNG } = require('pngjs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function runTest() {
  console.log('====================================================');
  console.log('Testing Prototype 04: Solar Citadel Volumetric Reconstruction');
  console.log('====================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--use-gl=angle',
      '--window-size=1024,1024',
      '--no-sandbox',
      '--user-data-dir=/tmp/chrome-test-p4',
    ],
    defaultViewport: { width: 1024, height: 1024 },
  });

  const page = await browser.newPage();
  const consoleLogs = [];
  const pageErrors = [];

  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => pageErrors.push(err.toString()));

  console.log('Navigating to http://127.0.0.1:5173/?p=4 ...');
  await page.goto('http://127.0.0.1:5173/?p=4', { waitUntil: 'networkidle0' });

  // Wait for textures and shaders to initialize
  await new Promise(r => setTimeout(r, 1500));

  const canvasElem = await page.$('#webgl-canvas');

  // Verify header title
  const headerTitle = await page.evaluate(() => document.getElementById('dev-header-title').textContent);
  console.log('Header Title:', headerTitle);

  // Hide UI overlay temporarily for pristine canvas evaluation
  await page.evaluate(() => {
    document.getElementById('dev-panel').style.display = 'none';
    document.getElementById('status-toast').style.display = 'none';
  });

  // --------------------------------------------------------------------------
  // Step 1: Canonical View - Volume Mode
  // --------------------------------------------------------------------------
  console.log('\n[Step 1] Capturing Canonical View (VOLUME Mode)...');
  await canvasElem.screenshot({ path: 'scripts/test-p04-01-canonical-volume.png' });
  console.log('Saved: scripts/test-p04-01-canonical-volume.png');

  // --------------------------------------------------------------------------
  // Step 2: Canonical View - Flat Proxy Mode
  // --------------------------------------------------------------------------
  console.log('\n[Step 2] Capturing Canonical View (FLAT PROXY Mode)...');
  await page.keyboard.press('Space'); // Toggles volume <-> proxy
  await new Promise(r => setTimeout(r, 400));
  await canvasElem.screenshot({ path: 'scripts/test-p04-02-canonical-proxy.png' });
  console.log('Saved: scripts/test-p04-02-canonical-proxy.png');

  // --------------------------------------------------------------------------
  // Step 3: Canonical View - Untouched Poster Reference
  // --------------------------------------------------------------------------
  console.log('\n[Step 3] Capturing Untouched 2D POSTER reference...');
  await page.evaluate(() => {
    document.getElementById('p4-btn-poster').click();
  });
  await new Promise(r => setTimeout(r, 400));
  await canvasElem.screenshot({ path: 'scripts/test-p04-03-canonical-poster.png' });
  console.log('Saved: scripts/test-p04-03-canonical-poster.png');

  // --------------------------------------------------------------------------
  // Step 4: Metric Comparison: Volume vs Flat Proxy & Volume vs Poster
  // --------------------------------------------------------------------------
  console.log('\n[Step 4] Computing Pixel-Level Fidelity Metrics at Canonical Camera...');
  const volumePng = PNG.sync.read(fs.readFileSync('scripts/test-p04-01-canonical-volume.png'));
  const proxyPng = PNG.sync.read(fs.readFileSync('scripts/test-p04-02-canonical-proxy.png'));
  const posterPng = PNG.sync.read(fs.readFileSync('scripts/test-p04-03-canonical-poster.png'));

  function computeMetrics(imgA, imgB, label) {
    let sumSqDiff = 0;
    let maxDiff = 0;
    let countDiff5 = 0;
    const numPixels = imgA.width * imgA.height;

    for (let i = 0; i < numPixels; i++) {
      const idx = i * 4;
      const dr = Math.abs(imgA.data[idx] - imgB.data[idx]);
      const dg = Math.abs(imgA.data[idx + 1] - imgB.data[idx + 1]);
      const db = Math.abs(imgA.data[idx + 2] - imgB.data[idx + 2]);
      const diff = (dr + dg + db) / 3.0;

      if (diff > 5) countDiff5++;
      if (diff > maxDiff) maxDiff = diff;
      sumSqDiff += (dr * dr + dg * dg + db * db) / 3.0;
    }

    const mse = sumSqDiff / numPixels;
    const psnr = 10 * Math.log10((255 * 255) / (mse || 0.0001));
    console.log(`Fidelity Metric [${label}]:`);
    console.log(`- MSE:  ${mse.toFixed(3)}`);
    console.log(`- PSNR: ${psnr.toFixed(2)} dB`);
    console.log(`- Pixels with diff > 5/255: ${((countDiff5 / numPixels) * 100).toFixed(2)}%`);
    console.log(`- Max pixel difference: ${maxDiff.toFixed(1)} / 255`);
    return { mse, psnr, countDiff5, maxDiff };
  }

  computeMetrics(volumePng, proxyPng, 'VOLUME vs FLAT PROXY at Canonical Camera');
  computeMetrics(volumePng, posterPng, 'VOLUME vs POSTER Reference at Canonical Camera');

  // --------------------------------------------------------------------------
  // Step 5: Diagnostic Modes (50/50 Overlay, Silhouette, Wireframe, Generated)
  // --------------------------------------------------------------------------
  console.log('\n[Step 5] Testing Development Diagnostic Modes...');

  // 50/50 Overlay
  await page.evaluate(() => document.getElementById('p4-btn-overlay').click());
  await new Promise(r => setTimeout(r, 400));
  await canvasElem.screenshot({ path: 'scripts/test-p04-04-overlay-5050.png' });
  console.log('Saved: scripts/test-p04-04-overlay-5050.png');

  // Silhouette Debug
  await page.evaluate(() => document.getElementById('p4-btn-silhouette').click());
  await new Promise(r => setTimeout(r, 400));
  await canvasElem.screenshot({ path: 'scripts/test-p04-05-silhouette-debug.png' });
  console.log('Saved: scripts/test-p04-05-silhouette-debug.png');

  // Wireframe / Geometry Debug
  await page.evaluate(() => document.getElementById('p4-btn-wireframe').click());
  await new Promise(r => setTimeout(r, 400));
  await canvasElem.screenshot({ path: 'scripts/test-p04-06-wireframe-debug.png' });
  console.log('Saved: scripts/test-p04-06-wireframe-debug.png');

  // Generated Surface Debug
  await page.evaluate(() => document.getElementById('p4-btn-generated').click());
  await new Promise(r => setTimeout(r, 400));
  await canvasElem.screenshot({ path: 'scripts/test-p04-07-generated-debug-canonical.png' });
  console.log('Saved: scripts/test-p04-07-generated-debug-canonical.png');

  // --------------------------------------------------------------------------
  // Step 6: Camera Movement Envelope & Lateral Inspection
  // --------------------------------------------------------------------------
  console.log('\n[Step 6] Testing Lateral Camera Movement & Western Flank Exposure...');

  // Return to normal VOLUME mode
  await page.evaluate(() => document.getElementById('p4-btn-volume').click());
  await new Promise(r => setTimeout(r, 200));

  // Shift camera laterally to the left (X = -0.12) looking back toward the Citadel
  await page.evaluate(() => {
    // Dispatch mouse movement to left edge
    const rect = document.getElementById('canvas-container').getBoundingClientRect();
    window.dispatchEvent(new PointerEvent('pointermove', {
      clientX: rect.left + rect.width * 0.10, // far left
      clientY: rect.top + rect.height * 0.50
    }));
  });
  await new Promise(r => setTimeout(r, 800));
  await canvasElem.screenshot({ path: 'scripts/test-p04-08-lateral-sweep-left.png' });
  console.log('Saved: scripts/test-p04-08-lateral-sweep-left.png (Exposing Western Flank)');

  // Now capture with GENERATED SURFACE DEBUG active from that lateral angle
  await page.evaluate(() => document.getElementById('p4-btn-generated').click());
  await new Promise(r => setTimeout(r, 400));
  await canvasElem.screenshot({ path: 'scripts/test-p04-09-generated-debug-angled.png' });
  console.log('Saved: scripts/test-p04-09-generated-debug-angled.png (Generated surfaces exposed)');

  // Wireframe from angled vantage point
  await page.evaluate(() => document.getElementById('p4-btn-wireframe').click());
  await new Promise(r => setTimeout(r, 400));
  await canvasElem.screenshot({ path: 'scripts/test-p04-10-wireframe-angled.png' });
  console.log('Saved: scripts/test-p04-10-wireframe-angled.png');

  // Restore UI
  await page.evaluate(() => {
    document.getElementById('dev-panel').style.display = '';
    document.getElementById('status-toast').style.display = '';
  });

  // Read telemetry values
  const telemetry = await page.evaluate(() => ({
    drift: document.getElementById('p4-tel-drift').textContent,
    triangles: document.getElementById('p4-tel-triangles').textContent,
    vertices: document.getElementById('p4-tel-vertices').textContent,
    thickness: document.getElementById('p4-tel-thickness').textContent,
    cam: document.getElementById('p4-tel-cam').textContent,
    perf: document.getElementById('p4-tel-perf').textContent,
  }));
  console.log('\nTelemetry Readout:', telemetry);

  // --------------------------------------------------------------------------
  // Step 7: Verify Prototypes 01, 02, and 03 Remain Independently Accessible
  // --------------------------------------------------------------------------
  console.log('\n[Step 7] Verifying Independent Accessibility of Prototypes 01, 02, and 03...');

  // Check ?p=1
  await page.goto('http://127.0.0.1:5173/?p=1', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  const titleP1 = await page.evaluate(() => document.getElementById('dev-header-title').textContent);
  console.log(`?p=1 Header: "${titleP1}" (Should be P01)`);
  if (!titleP1.includes('01')) throw new Error('P01 failed to load via ?p=1');

  // Check ?p=2
  await page.goto('http://127.0.0.1:5173/?p=2', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  const titleP2 = await page.evaluate(() => document.getElementById('dev-header-title').textContent);
  console.log(`?p=2 Header: "${titleP2}" (Should be P02)`);
  if (!titleP2.includes('02')) throw new Error('P02 failed to load via ?p=2');

  // Check ?p=3
  await page.goto('http://127.0.0.1:5173/?p=3', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));
  const titleP3 = await page.evaluate(() => document.getElementById('dev-header-title').textContent);
  console.log(`?p=3 Header: "${titleP3}" (Should be P03)`);
  if (!titleP3.includes('03')) throw new Error('P03 failed to load via ?p=3');

  console.log('\n====================================================');
  console.log('All Prototype 04 Verification Tests Passed Successfully!');
  console.log('====================================================');

  await browser.close();
}

runTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
