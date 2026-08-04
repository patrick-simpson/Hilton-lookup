// Win-path + mobile verification: auto-plays every game to completion in
// Chromium at a phone viewport (390x844), asserting the win overlay appears,
// no page errors fire, the page never scrolls horizontally, and tap targets
// stay finger-sized.
//
// Usage:
//   node test/autoplay.mjs                  # every section, verse 0
//   node test/autoplay.mjs balloon rocket   # only these games
//   node test/autoplay.mjs train:1          # specific verse index
//   TRANSLATION=kjv node test/autoplay.mjs  # play in another translation (niv84|esv|kjv|nkjv)
//
// Games are driven by strategy:
//   order  — tap the next expected verse word (tap-in-order games)
//   multi  — sweep-tap every remaining verse word each pass (relay, feed)
//   monkey — prefer "advance" buttons, otherwise cycle candidates

import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const SHOTS = process.env.AUTOPLAY_SHOTS || '/tmp';
const VIEWPORT = { width: 390, height: 844 };
const STRATEGY = {
  scramble: 'order', train: 'order', stones: 'order', hopscotch: 'order',
  rocket: 'order', falling: 'order', slash: 'order', puzzle: 'order',
  relay: 'multi', feed: 'multi',
  disappear: 'monkey', balloon: 'monkey', firefly: 'monkey', karaoke: 'monkey',
  match: 'monkey', refrace: 'monkey', spinner: 'monkey', hotpotato: 'monkey',
  stickers: 'monkey', garden: 'monkey',
};
// Buttons that move the game forward without being word answers.
const ADVANCE = /said it|take a bow|we did|they said|start|swords up|spin|stop|skip|next|keep going|lift|launch|👍|▶|✅|🎤/iu;
// Never click these — navigation/audio/help.
const AVOID = /🔊|❓|peek|👀|hear|back|home|reset|🔁|play again|done$/iu;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const path = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const file = normalize(join(root, path));
    if (!file.startsWith(root)) throw new Error('forbidden');
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('nope'); }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const prebuilt = process.env.CLAUDE_CHROMIUM
  || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : null);
const browser = await chromium.launch(prebuilt ? { executablePath: prebuilt } : {});
const page = await browser.newPage({ viewport: VIEWPORT, hasTouch: true });

const TRANSLATION = process.env.TRANSLATION || 'niv84';
await page.addInitScript((t) => localStorage.setItem('sparksArcade.translation', t), TRANSLATION);
console.log(`translation: ${TRANSLATION}`);

const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()); });

// ---- in-page helpers ----------------------------------------------------

// A faded tile's textContent is the fadeWord() glyph (e.g. "◻" or a first
// letter) — the tile still carries the full original word in data-word, so
// prefer that for matching whenever it's present. (Redeclared inside each
// page.evaluate below since that callback runs in the browser realm.)

async function stageButtons() {
  return page.evaluate(({ avoid }) => {
    const rx = new RegExp(avoid, 'iu');
    const wordOf = (b) => b.dataset.word ?? b.textContent;
    return [...document.querySelectorAll('.stage button')]
      .filter((b) => !b.disabled && b.offsetParent !== null && !rx.test(b.textContent))
      .map((b, i) => ({ i, text: wordOf(b).trim() }));
  }, { avoid: AVOID.source });
}

async function clickStageButton(matchText, { advance = false } = {}) {
  return page.evaluate(({ matchText, advance, adv, avoid }) => {
    const clean = (s) => s.toLowerCase().replace(/[^a-z0-9’']/g, '');
    const wordOf = (b) => b.dataset.word ?? b.textContent;
    const advRx = new RegExp(adv, 'iu');
    const avoidRx = new RegExp(avoid, 'iu');
    const btns = [...document.querySelectorAll('.stage button')]
      .filter((b) => !b.disabled && b.offsetParent !== null && !avoidRx.test(b.textContent));
    let target = null;
    if (advance) {
      target = btns.find((b) => advRx.test(b.textContent));
    } else if (matchText != null) {
      target = btns.find((b) => clean(wordOf(b)) === clean(matchText));
    }
    if (!target) return false;
    target.click();
    return true;
  }, { matchText, advance, adv: ADVANCE.source, avoid: AVOID.source });
}

async function clickNth(idx) {
  return page.evaluate(({ idx, avoid }) => {
    const avoidRx = new RegExp(avoid, 'iu');
    const btns = [...document.querySelectorAll('.stage button')]
      .filter((b) => !b.disabled && b.offsetParent !== null && !avoidRx.test(b.textContent));
    if (!btns.length) return false;
    btns[idx % btns.length].click();
    return true;
  }, { idx, avoid: AVOID.source });
}

const hasOverlay = () => page.locator('.overlay').count().then((n) => n > 0);
const wait = (ms) => page.waitForTimeout(ms);

async function checkMobile(tag, issues) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = Math.max(doc.scrollWidth, document.body.scrollWidth) - window.innerWidth;
    const small = [...document.querySelectorAll('.stage button')]
      .filter((b) => b.offsetParent !== null)
      .map((b) => b.getBoundingClientRect())
      .filter((r) => r.width > 0 && (r.height < 44 || r.width < 32))
      .length;
    return { overflowX, small };
  });
  if (r.overflowX > 2) issues.push(`${tag}: page overflows horizontally by ${r.overflowX}px`);
  if (r.small > 0) issues.push(`${tag}: ${r.small} tap target(s) under 44px tall`);
}

// ---- drive strategies ----------------------------------------------------

async function driveOrder(words, deadline) {
  let i = 0;
  let stuckSince = Date.now();
  while (Date.now() < deadline) {
    if (await hasOverlay()) return { ok: true };
    if (i < words.length && await clickStageButton(words[i])) {
      i++; stuckSince = Date.now(); await wait(90); continue;
    }
    if (await clickStageButton(null, { advance: true })) { stuckSince = Date.now(); await wait(350); continue; }
    if (Date.now() - stuckSince > 15000) return { ok: false, why: `stuck at word ${i}/${words.length} ("${words[i] || ''}")` };
    await wait(250);
  }
  return { ok: false, why: `timeout at word ${i}/${words.length}` };
}

async function driveMulti(words, deadline) {
  let stuckSince = Date.now();
  while (Date.now() < deadline) {
    if (await hasOverlay()) return { ok: true };
    let any = false;
    for (const w of words) {
      if (await hasOverlay()) return { ok: true };
      if (await clickStageButton(w)) { any = true; await wait(60); }
    }
    if (await clickStageButton(null, { advance: true })) { any = true; await wait(300); }
    if (any) stuckSince = Date.now();
    else if (Date.now() - stuckSince > 15000) return { ok: false, why: 'no clickable words or advance buttons' };
    await wait(200);
  }
  return { ok: false, why: 'timeout (multi)' };
}

async function driveMonkey(deadline) {
  let n = 0;
  let stuckSince = Date.now();
  while (Date.now() < deadline) {
    if (await hasOverlay()) return { ok: true };
    if (await clickStageButton(null, { advance: true })) { stuckSince = Date.now(); await wait(400); continue; }
    if (await clickNth(n++)) { stuckSince = Date.now(); await wait(180); continue; }
    if (Date.now() - stuckSince > 15000) return { ok: false, why: 'no clickable buttons for 15s' };
    await wait(300);
  }
  return { ok: false, why: 'timeout (monkey)' };
}

// ---- run -----------------------------------------------------------------

await page.goto(`${base}/#/`);
const sections = await page.evaluate(async () => {
  const { BOOKS } = await import('/js/data/curriculum.js');
  const { sectionInstances } = await import('/js/lib/engine.js');
  return BOOKS.flatMap((b) => b.sections.map((s) => ({
    book: b.id, section: s.id, game: s.game, hard: !!s.hard,
    instances: sectionInstances(b, s).map((v) => ({ label: v.label, words: v.words })),
  })));
});

const filters = process.argv.slice(2).map((a) => {
  const [game, idx] = a.split(':');
  return { game, idx: idx == null ? null : Number(idx) };
});
const wanted = (s) => !filters.length || filters.some((f) => f.game === s.game);
const verseIdx = (s) => {
  const f = filters.find((f) => f.game === s.game && f.idx != null);
  return f ? f.idx : 0;
};

await mkdir(SHOTS, { recursive: true });
const failures = [];
const mobileIssues = [];

for (const s of sections.filter(wanted)) {
  const idx = Math.min(verseIdx(s), s.instances.length - 1);
  const inst = s.instances[idx];
  const tag = `${s.book}/${s.section} ${s.game}${s.hard ? '(hard)' : ''} [${inst.label}]`;
  pageErrors.length = 0;
  // Drive straight to the section's game (skipping the verse ladder menu) —
  // s.game is the strategy map's key, i.e. the direct game route's gameId.
  await page.goto(`${base}/#/b/${s.book}/${s.section}/play/${idx}/${s.game}`);
  await wait(1000);
  await checkMobile(tag, mobileIssues);

  const budget = 60000 + inst.words.length * 2500;
  const deadline = Date.now() + budget;
  const strat = STRATEGY[s.game] || 'monkey';
  const res = strat === 'order' ? await driveOrder(inst.words, deadline)
    : strat === 'multi' ? await driveMulti(inst.words, deadline)
    : await driveMonkey(deadline);

  await checkMobile(tag + ' (end)', mobileIssues);
  const errs = pageErrors.splice(0);
  if (res.ok && errs.length === 0) {
    console.log(`  WIN  ${tag}`);
  } else {
    const why = [res.ok ? null : res.why, ...errs.slice(0, 2)].filter(Boolean).join(' | ');
    console.log(`  FAIL ${tag}: ${why.slice(0, 240)}`);
    failures.push(`${tag}: ${why.slice(0, 240)}`);
    await page.screenshot({ path: join(SHOTS, `fail-${s.book}-${s.section}-${s.game}.png`) }).catch(() => {});
  }
}

await browser.close();
server.close();

if (mobileIssues.length) {
  console.log(`\nMOBILE ISSUES (${mobileIssues.length}):`);
  for (const m of mobileIssues) console.log(`  - ${m}`);
}
if (failures.length) {
  console.log(`\n${failures.length} FAILURE(S)`);
  process.exit(1);
}
console.log('\nALL GAMES WIN-VERIFIED' + (mobileIssues.length ? ' (with mobile issues above)' : ' — MOBILE CLEAN'));
process.exit(mobileIssues.length ? 2 : 0);
