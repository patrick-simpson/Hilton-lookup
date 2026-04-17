// Hotel points scraper — Hilton Toronto + Hampton Franklin Berry Farms.
// Runs daily on a Raspberry Pi via cron. Sends ntfy.sh alerts on price drops.

import { chromium as chromiumExtra } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import { promises as fs } from 'node:fs';
import path from 'node:path';

chromiumExtra.use(stealth());

// --- Configuration (edit these) -----------------------------------------

const NTFY_TOPIC        = 'REPLACE_ME_TOPIC';
const TORONTO_THRESHOLD = 280_000;
const STATE_FILE        = path.resolve('./prices.json');
const ADULTS = 2;
const ROOMS  = 1;

const HOTELS = [
  {
    key: 'toronto',
    name: 'Hilton Toronto',
    ctyhocn: 'YYZTOHH',          // TODO: verify on hilton.com
    checkIn:  '2026-06-24',
    checkOut: '2026-06-29',
    rule: 'absolute',
    threshold: TORONTO_THRESHOLD,
  },
  {
    key: 'nashville',
    name: 'Hampton Inn & Suites Franklin Berry Farms',
    ctyhocn: 'BNAFRHX',          // TODO: verify on hilton.com
    checkIn:  '2026-09-23',
    checkOut: '2026-09-26',
    rule: 'relative',
  },
];

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

// --- Utilities ----------------------------------------------------------

const sleep = (min, max) =>
  new Promise(r => setTimeout(r, min + Math.random() * (max - min)));

const nightsBetween = (a, b) =>
  Math.round((new Date(b) - new Date(a)) / 86_400_000);

const fmt = n => (n == null ? '—' : n.toLocaleString('en-US'));

function buildUrl(hotel) {
  const u = new URL('https://www.hilton.com/en/book/reservation/rooms/');
  u.searchParams.set('ctyhocn', hotel.ctyhocn);
  u.searchParams.set('arrivalDate', hotel.checkIn);
  u.searchParams.set('departureDate', hotel.checkOut);
  u.searchParams.set('numAdults[0]', String(ADULTS));
  u.searchParams.set('numRooms', String(ROOMS));
  u.searchParams.set('redeemPts', 'true');
  u.searchParams.set('useRewardsPoints', 'true');
  return u.toString();
}

// --- State --------------------------------------------------------------

async function loadState() {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

async function saveState(state) {
  const tmp = `${STATE_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(state, null, 2));
  await fs.rename(tmp, STATE_FILE);
}

function mergeState(prev, results) {
  const now = new Date().toISOString();
  const next = { ...prev };
  for (const r of results) {
    next[r.hotel] = { points: r.points, nights: r.nights, updatedAt: now };
  }
  return next;
}

// --- ntfy.sh ------------------------------------------------------------

async function ntfy({ title, message, priority = 'default', tags = [], clickUrl }) {
  const headers = {
    'Title': title,
    'Priority': priority,
    'Tags': tags.join(','),
  };
  if (clickUrl) headers['Click'] = clickUrl;
  const res = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
    method: 'POST',
    headers,
    body: message,
  });
  if (!res.ok) {
    console.error(`ntfy post failed: ${res.status} ${res.statusText}`);
  }
}

// --- Scrape -------------------------------------------------------------

async function scrapeHotel(hotel, context) {
  const url = buildUrl(hotel);
  const nights = nightsBetween(hotel.checkIn, hotel.checkOut);
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await sleep(2_500, 5_500);

    // Best-effort wait for rate UI; fall through to regex scrape if absent.
    await Promise.race([
      page.waitForSelector('[data-testid="rate-plan-points"]', { timeout: 20_000 }).catch(() => null),
      page.waitForSelector('[class*="PointsRate"], .room-rate-points, .points-rate', { timeout: 20_000 }).catch(() => null),
      page.waitForFunction(
        () => /\d{2,3},\d{3}\s*Points/i.test(document.body.innerText),
        { timeout: 20_000 },
      ).catch(() => null),
    ]);

    await sleep(1_000, 2_500);

    const { totals, bodyText } = await page.evaluate(() => {
      const text = document.body.innerText;
      const matches = [...text.matchAll(/([\d,]{5,})\s*Points/gi)]
        .map(m => parseInt(m[1].replace(/,/g, ''), 10))
        .filter(n => Number.isFinite(n) && n >= 10_000 && n <= 2_000_000);
      return { totals: matches, bodyText: text.slice(0, 4_000) };
    });

    if (totals.length === 0) {
      if (/cloudflare|captcha|unusual traffic|access denied|are you a robot/i.test(bodyText)) {
        throw new Error(`Blocked (captcha/WAF) on ${hotel.key}`);
      }
      throw new Error(`No point totals found on ${hotel.key}`);
    }

    const min = Math.min(...totals);
    // Heuristic: if the minimum looks like a per-night rate (no stay-total
    // ≥ 50k in the page), promote it to total by multiplying by nights.
    const looksPerNight = min < 50_000 && nights > 1 && !totals.some(t => t >= 50_000);
    const total = looksPerNight ? min * nights : min;

    return {
      hotel: hotel.key,
      name: hotel.name,
      url,
      points: total,
      rawMin: min,
      nights,
      looksPerNight,
    };
  } finally {
    await page.close();
  }
}

// --- Evaluation --------------------------------------------------------

function evaluate(result, state) {
  const hotel = HOTELS.find(h => h.key === result.hotel);
  const prev = state[result.hotel];

  if (hotel.rule === 'absolute' && result.points < hotel.threshold) {
    return [{
      title: `🎉 ${hotel.name} below ${fmt(hotel.threshold)} pts`,
      message: `Now ${fmt(result.points)} pts total for ${result.nights} nights.\nBook: ${result.url}`,
      priority: 'high',
      tags: ['tada'],
      clickUrl: result.url,
    }];
  }
  if (hotel.rule === 'relative' && prev && result.points < prev.points) {
    return [{
      title: `🎉 ${hotel.name} dropped`,
      message: `${fmt(prev.points)} → ${fmt(result.points)} pts for ${result.nights} nights.\nBook: ${result.url}`,
      priority: 'high',
      tags: ['tada'],
      clickUrl: result.url,
    }];
  }
  return [];
}

// --- Main --------------------------------------------------------------

async function main() {
  if (NTFY_TOPIC === 'REPLACE_ME_TOPIC') {
    throw new Error('NTFY_TOPIC is not configured. Edit index.js first.');
  }

  const browser = await chromiumExtra.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent: USER_AGENT,
      locale: 'en-US',
      timezoneId: 'America/Toronto',
    });

    const state = await loadState();
    const results = [];
    for (const hotel of HOTELS) {
      console.log(`[scrape] ${hotel.key} ${hotel.checkIn} → ${hotel.checkOut}`);
      results.push(await scrapeHotel(hotel, context));
      await sleep(2_000, 6_000);
    }

    for (const r of results) {
      console.log(`[result] ${r.hotel}: ${fmt(r.points)} pts (raw min ${fmt(r.rawMin)}, ${r.nights}n${r.looksPerNight ? ', per-night inferred' : ''})`);
    }

    const alerts = results.flatMap(r => evaluate(r, state));
    for (const a of alerts) await ntfy(a);

    const summary = results
      .map(r => `${r.hotel === 'toronto' ? 'Toronto' : 'Nashville'}: ${fmt(r.points)} pts`)
      .join(' | ');
    await ntfy({
      title: '✅ Scan complete',
      message: summary,
      priority: 'low',
      tags: ['white_check_mark'],
    });

    await saveState(mergeState(state, results));
  } finally {
    await browser.close();
  }
}

main().catch(async err => {
  console.error('[fatal]', err);
  try {
    await ntfy({
      title: '🚨 Scraper Broken',
      message: `${err.message}\n${(err.stack || '').slice(0, 400)}`,
      priority: 'urgent',
      tags: ['rotating_light'],
    });
  } catch (e) {
    console.error('[ntfy-fail]', e);
  }
  process.exitCode = 1;
});
