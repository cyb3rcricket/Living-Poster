const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function runTest() {
  console.log('Launching headless Chrome to test Prototype 01...');
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
  const errors = [];
  page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', err => errors.push(err.toString()));

  console.log('Navigating to http://127.0.0.1:5173/ ...');
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });

  // 1. Initial State Screenshot
  await page.screenshot({ path: 'scripts/test-01-initial.png' });
  console.log('Captured 01: Initial flat poster state');

  // 2. Click ENTER
  console.log('Clicking ENTER to trigger awakening...');
  await page.click('#enter-btn');

  // 3. Mid-transition at 2.5s
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: 'scripts/test-02-mid-transition.png' });
  console.log('Captured 02: Mid-awakening transition (t = 2.5s)');

  // 4. Awakening Complete at 5.5s
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: 'scripts/test-03-awakened.png' });
  console.log('Captured 03: Awakening complete (t = 5.5s)');

  // 5. Cursor Parallax Test (Move cursor to upper right)
  console.log('Simulating cursor movement for parallax evaluation...');
  await page.mouse.move(850, 200, { steps: 15 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scripts/test-04-parallax-right.png' });
  console.log('Captured 04: Parallax shifted (cursor upper-right)');

  // Move cursor to lower left
  await page.mouse.move(200, 850, { steps: 15 });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: 'scripts/test-05-parallax-left.png' });
  console.log('Captured 05: Parallax shifted (cursor lower-left)');

  // 6. Test Depth Map visualization toggle (Key 'M')
  console.log('Toggling Depth Map inspector (Key M)...');
  await page.keyboard.press('m');
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: 'scripts/test-06-depth-map.png' });
  console.log('Captured 06: Depth map inspector view');

  // Toggle back to depth artwork
  await page.keyboard.press('m');
  await new Promise(r => setTimeout(r, 200));

  // 7. Test Instant Flat/Depth Comparison toggle (Space)
  console.log('Toggling Flat comparison mode (Space)...');
  await page.keyboard.press('Space');
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: 'scripts/test-07-compare-flat.png' });
  console.log('Captured 07: Instant flat comparison toggle');

  // 8. Test Settings panel open
  await page.click('#dev-toggle-btn');
  await new Promise(r => setTimeout(r, 200));
  await page.screenshot({ path: 'scripts/test-08-settings-open.png' });
  console.log('Captured 08: Settings panel expanded');

  console.log('\n--- Console Logs ---');
  consoleLogs.forEach(l => console.log(l));

  if (errors.length > 0) {
    console.error('\n--- Page Errors ---');
    errors.forEach(e => console.error(e));
  } else {
    console.log('\nZero JavaScript or WebGL errors detected!');
  }

  await browser.close();
  console.log('All automated prototype tests finished successfully.');
}

runTest().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
