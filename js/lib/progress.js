// Progress persistence: mastery stage per verse, activity check-offs,
// derived stickers, garden growth, practice-day streaks, and drawings.
// Stored in localStorage under a v2 schema (see migration below).
//
// Mastery stages (plans.html §3.2): 0 untouched, 1 "built it" (any game win),
// 2 "recalled it" (a recall-stage game, flagged by callers later), 3
// "recited it" (verified word-perfect recitation, via recordRecited).

const KEY = 'sparksArcade.v2';
const V1_KEY = 'sparksArcade.v1';

function emptyState() {
  return { verses: {}, activities: {}, practiceDays: [], drawings: {} };
}

function defaultVerse() {
  return { stage: 0, passes: {}, recited: null, lastPlayed: null };
}

// One-time migration from the old stars-only schema: any starred verse
// ("stars" meant "played a game well") becomes stage 1 ("built it") under
// the new mastery semantics. The v1 key is left in place as a backup —
// it is harmless dead data and lets us recover if migration had a bug.
function migrateFromV1() {
  let v1;
  try {
    v1 = JSON.parse(localStorage.getItem(V1_KEY));
  } catch {
    v1 = null;
  }
  const next = emptyState();
  if (v1) {
    for (const [key, stars] of Object.entries(v1.stars || {})) {
      if (stars > 0) next.verses[key] = { ...defaultVerse(), stage: 1 };
    }
    next.activities = { ...(v1.activities || {}) };
  }
  return next;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        verses: parsed.verses || {},
        activities: parsed.activities || {},
        practiceDays: parsed.practiceDays || [],
        drawings: parsed.drawings || {},
      };
    }
    return migrateFromV1();
  } catch {
    return emptyState();
  }
}

function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable (private mode) — play on without saving.
  }
}

let state = load();
save(state); // persist the migration result (or a fresh v2 shell) immediately.

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function markPracticeToday() {
  const today = todayISO();
  if (!state.practiceDays.includes(today)) state.practiceDays.push(today);
}

export function getVerse(key) {
  return state.verses[key] || defaultVerse();
}

export function getStars(key) {
  return getVerse(key).stage;
}

// Raise a verse to `stage`, never lowering an existing higher stage.
// Stamps lastPlayed and today's practice day, same as any win.
export function setStage(key, stage) {
  const v = state.verses[key] || defaultVerse();
  v.stage = Math.max(v.stage, Math.min(3, stage));
  v.lastPlayed = new Date().toISOString();
  state.verses[key] = v;
  markPracticeToday();
  save(state);
}

// Called by the existing win path with a game-performance star count
// (0-3, e.g. a scramble round's accuracy score). Under v2 semantics any
// win just means "built it" — the numeric value doesn't raise mastery
// stage beyond 1, so it is intentionally ignored here. Kept as a param
// so callers (app.js) don't need to change.
export function addStars(key, stars) {
  setStage(key, 1);
}

export function isActivityDone(key) {
  return !!state.activities[key];
}

export function toggleActivity(key) {
  state.activities[key] = !state.activities[key];
  save(state);
  return state.activities[key];
}

export function resetAll() {
  state = emptyState();
  save(state);
}

export function recordPass(key, gameId) {
  const v = state.verses[key] || defaultVerse();
  v.passes[gameId] = (v.passes[gameId] || 0) + 1;
  state.verses[key] = v;
  save(state);
  return v.passes[gameId];
}

export function getPasses(key, gameId) {
  return getVerse(key).passes[gameId] || 0;
}

export function recordRecited(key, mode) {
  const v = state.verses[key] || defaultVerse();
  v.stage = 3;
  v.recited = { at: new Date().toISOString(), mode };
  v.lastPlayed = new Date().toISOString();
  state.verses[key] = v;
  markPracticeToday();
  save(state);
}

export function practiceDaysThisWeek() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return state.practiceDays.filter((d) => {
    const dt = new Date(`${d}T00:00:00`);
    return dt >= start && dt < end;
  }).length;
}

export function getDrawings(key) {
  return state.drawings[key] || [];
}

export function setDrawings(key, arr) {
  state.drawings[key] = arr;
  save(state);
}

// An entry is complete when every ref has stars (or, for pure activities,
// when it is checked off).
export function entryComplete(book, section, entry) {
  const akey = `${book.id}.${section.id}.${entry.n}.${entry.title}`;
  if (entry.refs.length === 0) return isActivityDone(akey);
  return entry.refs.every((ref) => getStars(`${book.id}.${section.id}.${entry.n}.${ref}`) > 0);
}

export function activityKey(book, section, entry) {
  return `${book.id}.${section.id}.${entry.n}.${entry.title}`;
}

export function sectionProgress(book, section) {
  const total = section.entries.length;
  const done = section.entries.filter((e) => entryComplete(book, section, e)).length;
  return { done, total };
}

export function bookProgress(book) {
  let done = 0;
  let total = 0;
  for (const section of book.sections) {
    const p = sectionProgress(book, section);
    done += p.done;
    total += p.total;
  }
  return { done, total };
}

// Garden growth stage for a verse instance: 0 seed, 1 sprout, 2 stem, 3 bloom.
export function growthStage(key) {
  return Math.min(3, getStars(key));
}

export const GROWTH_EMOJI = ['🌰', '🌱', '🌿', '🌻'];

// Sticker earned per completed entry; a themed emoji per section.
export const SECTION_STICKERS = {
  rank: '🏅', rj1: '🦁', gj1: '🌈', rj2: '⭐', gj2: '🌍',
  rj3: '📚', gj3: '🕊️', rj4: '👑', gj4: '💎',
};
