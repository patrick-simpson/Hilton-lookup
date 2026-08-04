// Browser smoke test: serves the app, then mounts every section's game in
// Chromium and fails on any page error or empty stage.
//
// Run:  npm i playwright  (or set NODE_PATH to an install)  then:
//       node test/smoke.mjs

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json',
};

const server = http.createServer(async (req, res) => {
  try {
    const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) throw new Error('forbidden');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

// Use a preinstalled Chromium when the exact Playwright-pinned build is absent
// (e.g. CLAUDE_CHROMIUM=/opt/pw-browsers/chromium in remote sandboxes).
import { existsSync } from 'node:fs';
const prebuilt = process.env.CLAUDE_CHROMIUM
  || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : null);
const browser = await chromium.launch(prebuilt ? { executablePath: prebuilt } : {});
const page = await browser.newPage({ viewport: { width: 820, height: 1000 } });

const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(String(err)));
page.on('console', (msg) => {
  if (msg.type() === 'error') pageErrors.push(msg.text());
});

const failures = [];

async function check(name, fn) {
  pageErrors.length = 0;
  try {
    await fn();
    if (pageErrors.length) throw new Error(pageErrors.join(' | '));
    console.log(`  ok   ${name}`);
  } catch (err) {
    console.log(`  FAIL ${name}: ${String(err).slice(0, 300)}`);
    failures.push(name);
  }
}

await page.goto(`${base}/#/`);
await check('home renders 3 books', async () => {
  await page.waitForSelector('.book-card', { timeout: 5000 });
  const n = await page.locator('.book-card').count();
  if (n !== 3) throw new Error(`expected 3 book cards, got ${n}`);
});

const sections = await page.evaluate(async () => {
  const { BOOKS } = await import('/js/data/curriculum.js');
  return BOOKS.flatMap((b) => b.sections.map((s) => ({
    book: b.id, section: s.id, game: s.game, hard: !!s.hard,
  })));
});
console.log(`${sections.length} sections to test`);

for (const s of sections) {
  await check(`${s.book}/${s.section} → ${s.game}${s.hard ? ' (hard)' : ''}`, async () => {
    // play/0 with no gameId now lands on the verse ladder screen, not the game.
    await page.goto(`${base}/#/b/${s.book}/${s.section}/play/0`);
    await page.waitForTimeout(400);
    const buildRow = page.locator('.ladder-row', { hasText: 'Build' }).first();
    if (await buildRow.count() === 0) throw new Error('verse ladder screen missing a Build row');
    // Click the featured build-row game button — this is the section's signature game.
    await buildRow.locator('button').first().click();
    await page.waitForTimeout(1200);
    const kids = await page.locator('.stage *').count();
    if (kids === 0) throw new Error('stage is empty');
    const clickable = await page.locator('.stage button').count();
    if (clickable === 0 && !['karaoke'].includes(s.game)) {
      // Every game should offer something tappable shortly after mount.
      throw new Error('no buttons in stage');
    }
    // Poke the first button — must not throw.
    const btn = page.locator('.stage button').first();
    if (await btn.count()) await btn.click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(400);
  });
}

await check('hg/rj3 verse 0 (NT-1, has a song) → singalong stage mounts', async () => {
  await page.goto(`${base}/#/b/hg/rj3/play/0/singalong`);
  await page.waitForTimeout(1200);
  const tiles = await page.locator('.stage .sa-tile').count();
  if (tiles === 0) throw new Error('no word tiles in Sing-Along stage');
});

await check('wr/rank verse 0 (John 3:16) → drawtell stage mounts', async () => {
  await page.goto(`${base}/#/b/wr/rank/play/0/drawtell`);
  await page.waitForTimeout(1200);
  const opts = await page.locator('.stage .emoji-opt').count();
  if (opts !== 4) throw new Error(`expected 4 emoji option buttons, got ${opts}`);
});

await check('sticker book view', async () => {
  await page.goto(`${base}/#/stickers`);
  await page.waitForSelector('.card', { timeout: 5000 });
});
await check('verse garden view', async () => {
  await page.goto(`${base}/#/garden`);
  await page.waitForSelector('.card', { timeout: 5000 });
});

await browser.close();
server.close();

if (failures.length) {
  console.log(`\n${failures.length} FAILURE(S):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log('\nALL PASSED');
