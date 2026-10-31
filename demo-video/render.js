// Render brightloop-demo.html to a clean 1280x720 video using Playwright (Chromium).
// The deck auto-plays and auto-advances by its own per-scene timers; we just let it
// run for the full duration, capture the page as video, then mux narration with ffmpeg.
//
//   node render.js
//
// Output: build/brightloop-deck.webm  (raw silent capture, finalized on context close)

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const HERE = __dirname;
const DECK = 'file://' + path.join(HERE, 'brightloop-demo.html').replace(/\\/g, '/');
const OUT_DIR = path.join(HERE, 'build');

// Use the aligned timing from plan_timing.py so the capture matches the voiceover.
// Falls back to the deck's own data-dur values if timing.json is absent.
function deckTiming() {
  const tj = path.join(HERE, 'timing.json');
  if (fs.existsSync(tj)) {
    const t = JSON.parse(fs.readFileSync(tj, 'utf8'));
    return { durs: t.durations, total: t.total };
  }
  const html = fs.readFileSync(path.join(HERE, 'brightloop-demo.html'), 'utf8');
  const durs = [...html.matchAll(/data-dur="(\d+)"/g)].map(m => parseInt(m[1], 10));
  return { durs, total: durs.reduce((a, b) => a + b, 0) };
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const { durs, total } = deckTiming();
  const durParam = durs.join(',');
  const W = 1280, H = 720;
  // record a touch longer so the final scene isn't clipped
  const recordMs = (total + 2) * 1000;

  console.log(`Deck length: ${total}s. Recording ${(recordMs / 1000).toFixed(0)}s at ${W}x${H}.`);

  const browser = await chromium.launch({
    args: ['--autoplay-policy=no-user-gesture-required', '--force-device-scale-factor=1'],
  });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT_DIR, size: { width: W, height: H } },
  });
  const page = await context.newPage();

  await page.goto(DECK + '?dur=' + durParam, { waitUntil: 'networkidle' });

  // Clean capture: hide HUD + progress bar, make #frame fill the viewport exactly,
  // and drop the rounded corners / shadow so the frame edges aren't visible.
  await page.addStyleTag({
    content: `
      #hud, #progress { display: none !important; }
      body { background: #f6f4f7 !important; overflow: hidden !important; }
      #stage { inset: 0 !important; }
      #frame {
        width: ${W}px !important; height: ${H}px !important;
        border-radius: 0 !important; box-shadow: none !important;
        transform: none !important;
      }
    `,
  });

  // Restart the deck from scene 1 and ensure it is playing.
  await page.keyboard.press('r');
  await page.waitForTimeout(300);

  // Let the deck play through on its own timers.
  await page.waitForTimeout(recordMs);

  // Finalize: closing the context flushes the video file to disk.
  await context.close();
  await browser.close();

  // Playwright names the file with a random id; rename to a stable path.
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.webm'));
  files.sort((a, b) => fs.statSync(path.join(OUT_DIR, b)).mtimeMs - fs.statSync(path.join(OUT_DIR, a)).mtimeMs);
  const latest = path.join(OUT_DIR, files[0]);
  const stable = path.join(OUT_DIR, 'brightloop-deck.webm');
  if (latest !== stable) {
    if (fs.existsSync(stable)) fs.rmSync(stable);
    fs.renameSync(latest, stable);
  }
  console.log('Captured:', stable);
})().catch(err => { console.error(err); process.exit(1); });
