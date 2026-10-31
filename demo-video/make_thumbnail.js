// Render thumbnail.svg -> thumbnail.png at 1280x720 (YouTube thumbnail size).
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const svg = 'file://' + path.join(__dirname, 'thumbnail.svg').replace(/\\/g, '/');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(svg, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(__dirname, 'thumbnail.png'), clip: { x: 0, y: 0, width: 1280, height: 720 } });
  await browser.close();
  console.log('Wrote thumbnail.png');
})().catch(e => { console.error(e); process.exit(1); });
