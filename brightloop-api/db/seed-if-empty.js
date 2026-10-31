'use strict';
// Deploy-safe seeding: seeds the database ONCE on a fresh deploy, and does nothing on
// subsequent restarts/redeploys so live data is never wiped.
//
// Local demo keeps using `node db/seed.js --reset` (always rebuilds). This wrapper is for
// hosted environments (Render/Railway/Fly) where the container restarts but the database
// must persist.
//
// Usage (in the container start command):
//   node db/seed-if-empty.js && node src/server.js
const { execFileSync } = require('child_process');
const path = require('path');
const { pool } = require('../src/db');

async function main() {
  let needsSeed = false;
  try {
    // If the users table is missing or empty, this is a fresh database.
    const { rows } = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_schema = 'public' AND table_name = 'users') AS has_table`);
    if (!rows[0].has_table) {
      needsSeed = true;
    } else {
      const { rows: [c] } = await pool.query('SELECT count(*)::int AS n FROM users');
      needsSeed = c.n === 0;
    }
  } catch (err) {
    // Any error inspecting the schema means we should attempt a seed on a clean DB.
    console.log('[seed-if-empty] could not inspect schema, will seed:', err.message);
    needsSeed = true;
  } finally {
    await pool.end().catch(() => {});
  }

  if (!needsSeed) {
    console.log('[seed-if-empty] database already seeded, skipping.');
    return;
  }

  console.log('[seed-if-empty] fresh database detected, seeding…');
  // Run the real seed in its own process so its own pool lifecycle is clean.
  execFileSync('node', [path.join(__dirname, 'seed.js'), '--reset'], { stdio: 'inherit' });
}

main().catch((err) => { console.error('[seed-if-empty] failed:', err.message); process.exit(1); });
