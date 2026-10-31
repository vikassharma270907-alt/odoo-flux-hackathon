const path = require('path');
const { chromium } = require('playwright');

async function renderThumbnails() {
  console.log('Launching Chromium for YouTube thumbnail rendering...');
  const browser = await chromium.launch();
  
  const thumbnails = [
    {
      html: 'thumbnail-1.html',
      output720: 'brightloop-thumbnail-1-engineering-720p.png',
      output1080: 'brightloop-thumbnail-1-engineering-1080p.png',
      name: 'Option 1: The Signature Engineering Moment (Idempotent Billing)'
    },
    {
      html: 'thumbnail-2.html',
      output720: 'brightloop-thumbnail-2-fullsaas-720p.png',
      output1080: 'brightloop-thumbnail-2-fullsaas-1080p.png',
      name: 'Option 2: Full Subscription SaaS Platform (Product & Dashboard)'
    },
    {
      html: 'thumbnail-3.html',
      output720: 'brightloop-thumbnail-3-scale-720p.png',
      output1080: 'brightloop-thumbnail-3-scale-1080p.png',
      name: 'Option 3: High Scale & Speed (5,000 Subs / Real Postgres)'
    }
  ];

  for (const item of thumbnails) {
    console.log(`\nRendering: ${item.name}...`);
    const filePath = path.join(__dirname, item.html);
    const fileUrl = 'file://' + filePath.replace(/\\/g, '/');

    // 1. Render 1280x720 (Standard YouTube thumbnail specification)
    const context720 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1
    });
    const page720 = await context720.newPage();
    await page720.goto(fileUrl, { waitUntil: 'networkidle' });
    // Wait slightly for fonts & effects
    await page720.waitForTimeout(600);
    const outPath720 = path.join(__dirname, item.output720);
    await page720.screenshot({ path: outPath720, type: 'png' });
    console.log(`  ✓ Saved 1280x720: ${outPath720}`);
    await context720.close();

    // 2. Render 1920x1080 (Crisp 1080p version)
    const context1080 = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1.5 // 1280*1.5 = 1920, 720*1.5 = 1080
    });
    const page1080 = await context1080.newPage();
    await page1080.goto(fileUrl, { waitUntil: 'networkidle' });
    await page1080.waitForTimeout(600);
    const outPath1080 = path.join(__dirname, item.output1080);
    await page1080.screenshot({ path: outPath1080, type: 'png' });
    console.log(`  ✓ Saved 1920x1080: ${outPath1080}`);
    await context1080.close();
  }

  await browser.close();
  console.log('\nAll YouTube thumbnails successfully generated!');
}

renderThumbnails().catch(err => {
  console.error('Error generating thumbnails:', err);
  process.exit(1);
});

