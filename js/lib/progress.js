// Progress persistence: stars per verse instance, activity check-offs,
// derived stickers and garden growth. Stored in localStorage.

const KEY = 'sparksArcade.v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { stars: {}, activities: {} };
  } catch {
    return { stars: {}, activities: {} };
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

export function getStars(key) {
  return state.stars[key] || 0;
}

export function addStars(key, stars) {
  state.stars[key] = Math.max(getStars(key), Math.min(3, stars));
  save(state);
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
  state = { stars: {}, activities: {} };
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
