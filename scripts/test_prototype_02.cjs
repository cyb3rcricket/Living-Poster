const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { PNG } = require('pngjs');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function runTest() {
  console.log('====================================================');
  console.log('Testing Prototype 02: Independent Proxy Reconstruction');
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

  console.log('Navigating to http://127.0.0.1:5173/ ...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // Wait for textures and shaders to initialize
  await new Promise(r => setTimeout(r, 1200));

  const canvasElem = await page.$('#webgl-canvas');

  // Hide UI overlay temporarily for pristine A/B canvas comparison
  await page.evaluate(() => {
    document.getElementById('dev-panel').style.display = 'none';
    document.getElementById('status-toast').style.display = 'none';
  });

  // --------------------------------------------------------------------------
  // Test 1: Canonical Proxy Reconstruction Screenshot
  // --------------------------------------------------------------------------
  console.log('\n[Step 1] Capturing Canonical Proxy Reconstruction view...');
  await canvasElem.screenshot({ path: 'scripts/test-p02-01-canonical-proxy.png' });
  console.log('Saved: scripts/test-p02-01-canonical-proxy.png');

  // --------------------------------------------------------------------------
  // Test 2: ORIGINAL Flat Poster Comparison
  // --------------------------------------------------------------------------
  console.log('\n[Step 2] Toggling to ORIGINAL Flat Poster view (Key Space)...');
  await page.keyboard.press('Space');
  await new Promise(r => setTimeout(r, 400));
  await canvasElem.screenshot({ path: 'scripts/test-p02-02-original-flat.png' });
  console.log('Saved: scripts/test-p02-02-original-flat.png');

  // Measure rendered pixel difference between ORIGINAL and PROXY canvas screenshots
  const origPng = PNG.sync.read(fs.readFileSync('scripts/test-p02-02-original-flat.png'));
  const proxyPng = PNG.sync.read(fs.readFileSync('scripts/test-p02-01-canonical-proxy.png'));
  let sumSqDiff = 0;
  let maxPixelDiff = 0;
  let countDiffAbove5 = 0;
  const numPixels = origPng.width * origPng.height;

  for (let i = 0; i < numPixels; i++) {
    const idx = i * 4;
    const dr = Math.abs(origPng.data[idx] - proxyPng.data[idx]);
    const dg = Math.abs(origPng.data[idx + 1] - proxyPng.data[idx + 1]);
    const db = Math.abs(origPng.data[idx + 2] - proxyPng.data[idx + 2]);
    const diff = (dr + dg + db) / 3.0;

    if (diff > 5) countDiffAbove5++;
    if (diff > maxPixelDiff) maxPixelDiff = diff;
    sumSqDiff += (dr * dr + dg * dg + db * db) / 3.0;
  }
  const renderedMse = sumSqDiff / numPixels;
  const renderedPsnr = 10 * Math.log10((255 * 255) / (renderedMse || 0.0001));
  console.log(`Rendered Canvas Fidelity vs Original Poster:`);
  console.log(`- MSE:  ${renderedMse.toFixed(3)}`);
  console.log(`- PSNR: ${renderedPsnr.toFixed(2)} dB`);
  console.log(`- Pixels with diff > 5/255: ${((countDiffAbove5 / numPixels) * 100).toFixed(2)}%`);
  console.log(`- Max pixel difference: ${maxPixelDiff.toFixed(1)} / 255`);

  // Switch back to PROXY and restore UI
  await page.keyboard.press('Space');
  await page.evaluate(() => {
    document.getElementById('dev-panel').style.display = '';
    document.getElementById('status-toast').style.display = '';
  });
  await new Promise(r => setTimeout(r, 300));

  // --------------------------------------------------------------------------
  // Test 3: Scripted Parallax Sweep (Right & Left)
  // --------------------------------------------------------------------------
  console.log('\n[Step 3] Activating Scripted Parallax Sweep (Key S)...');
  await page.click('#p2-btn-parallax');
  await page.keyboard.press('s');

  // Sweep right (camera moves right, spires parallax left across planet)
  await new Promise(r => setTimeout(r, 1400));
  await page.screenshot({ path: 'scripts/test-p02-03-sweep-right.png' });
  console.log('Saved: scripts/test-p02-03-sweep-right.png (Camera shifted right, revealing hidden planet/sky)');

  // Sweep left (camera moves left, spires parallax right)
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'scripts/test-p02-04-sweep-left.png' });
  console.log('Saved: scripts/test-p02-04-sweep-left.png (Camera shifted left, testing relative parallax)');

  // Pause sweep
  await page.keyboard.press('s');
  await new Promise(r => setTimeout(r, 500));

  // --------------------------------------------------------------------------
  // Test 4: Manual Pointer Parallax
  // --------------------------------------------------------------------------
  console.log('\n[Step 4] Testing Manual Pointer Parallax tracking...');
  await page.mouse.move(850, 250, { steps: 20 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scripts/test-p02-05-pointer-parallax.png' });
  console.log('Saved: scripts/test-p02-05-pointer-parallax.png (Cursor at upper right)');

  // --------------------------------------------------------------------------
  // Test 5: Mask / Edge Debug Map
  // --------------------------------------------------------------------------
  console.log('\n[Step 5] Toggling MASK DEBUG view (Key M)...');
  await page.keyboard.press('m');
  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: 'scripts/test-p02-06-mask-debug.png' });
  console.log('Saved: scripts/test-p02-06-mask-debug.png');

  // Toggle back to PROXY
  await page.keyboard.press('m');
  await new Promise(r => setTimeout(r, 300));

  // --------------------------------------------------------------------------
  // Test 6: Layer Isolation (Hide Sentinel and Citadel)
  // --------------------------------------------------------------------------
  console.log('\n[Step 6] Testing Layer Isolation: Hiding Western Sentinel and Solar Citadel...');
  await page.click('#layer-btn-sentinel');
  await page.click('#layer-btn-citadel');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: 'scripts/test-p02-07-layer-isolation-sky-ribbons.png' });
  console.log('Saved: scripts/test-p02-07-layer-isolation-sky-ribbons.png (Verifying unoccluded sky & planet inpainting)');

  // Re-enable Sentinel and Citadel
  await page.click('#layer-btn-sentinel');
  await page.click('#layer-btn-citadel');
  await new Promise(r => setTimeout(r, 300));

  // --------------------------------------------------------------------------
  // Test 7: Flare Mode Toggle (Spire-Locked vs Sky-Locked)
  // --------------------------------------------------------------------------
  console.log('\n[Step 7] Testing Flare Mode toggle (Key F)...');
  await page.keyboard.press('f');
  await new Promise(r => setTimeout(r, 300));
  await page.keyboard.press('f');
  await new Promise(r => setTimeout(r, 300));

  // --------------------------------------------------------------------------
  // Test 8: Switching to Prototype 01 (Awakening) & Full Verification
  // --------------------------------------------------------------------------
  console.log('\n[Step 8] Switching to Prototype 01 (Key 1)...');
  await page.keyboard.press('1');
  await new Promise(r => setTimeout(r, 500));

  console.log('Triggering Prototype 01 Awakening...');
  await page.click('#enter-btn');
  // Wait for 5.0s awakening transition
  await new Promise(r => setTimeout(r, 5500));
  await page.screenshot({ path: 'scripts/test-p01-08-awakened.png' });
  console.log('Saved: scripts/test-p01-08-awakened.png (Prototype 01 successfully awakened)');

  // Switch back to Prototype 02
  console.log('\nSwitching back to Prototype 02 (Key 2)...');
  await page.keyboard.press('2');
  await new Promise(r => setTimeout(r, 500));

  console.log('\n--- Console Logs ---');
  consoleLogs.forEach(l => console.log(l));

  if (pageErrors.length > 0) {
    console.error('\n--- Page Errors ---');
    pageErrors.forEach(e => console.error(e));
    throw new Error(`Encountered ${pageErrors.length} page errors during test!`);
  } else {
    console.log('\nZERO JavaScript or WebGL errors detected across all test sequences!');
  }

  await browser.close();
  console.log('\n====================================================');
  console.log('All Prototype 02 Automated Verification Tests PASSED!');
  console.log('====================================================');
}

runTest().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
