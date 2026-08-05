// App shell: hash router and views (home → book → section → game),
// plus the sticker book and verse garden overview pages.

import { BOOKS } from './data/curriculum.js';
import { MUSIC_LINKS, BIO_PDFS } from './data/music-links.js';
import { TRANSLATIONS, getTranslationId, setTranslationId, activeTranslation } from './data/translations.js';
import { AUDIO } from './data/audio-manifest.js';
import { GAMES } from './games/index.js';
import {
  el, clear, sectionInstances, makeCtx, sfx, confetti,
} from './lib/engine.js';
import {
  playVerse, playFile, songEntryFor, stopAudio, onAudioEnded, pauseAudio, resumeAudio,
} from './lib/audio.js';
import {
  getStars, addStars, sectionProgress, bookProgress, entryComplete,
  activityKey, isActivityDone, toggleActivity, growthStage, GROWTH_EMOJI,
  SECTION_STICKERS, resetAll, getVerse, practiceDaysThisWeek,
} from './lib/progress.js';
import { ladderFor, stageDone, nextRow } from './lib/ladder.js';
import { reciteView } from './lib/recite.js';

const app = document.getElementById('app');
// Faceted jewel badges matching the real Sparks crown awards (red/green
// gems) — inline-SVG doodles, not generic heart emoji. Rank keeps a medal.
const JEWEL_GEM = {
  red: { fill: '#ee4b4f', edge: '#c9333c' },
  green: { fill: '#2a9d3f', edge: '#20802f' },
};
function jewelBadge(kind) {
  if (!JEWEL_GEM[kind]) return el('span', 'jewel', '🏅');
  const { fill, edge } = JEWEL_GEM[kind];
  const span = el('span', 'jewel jewel-gem');
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 22" width="34" height="31" fill="none">`
    + `<path d="M6.5 2.5h11l4 5.5L12 19.5 2.5 8z" fill="${fill}" stroke="${edge}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`
    + `<path d="M2.5 8h19M6.5 2.5 12 8l5.5-5.5M12 8v11.5" stroke="rgba(255,255,255,0.7)" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`
    + `</svg>`;
  return span;
}
// Recitation mode icons (plans.html §8), reused on the Trophy Shelf (P4.5b).
const MODE_ICON = { checkoff: '🧑‍🤝‍🧑', recording: '🎙️', sr: '🪄', club: '🏠' };

// Official Awana art (see img/): book emblems/wordmarks + celebration pieces.
const BOOK_ART = {
  hg: { emblem: 'img/hangglider-emblem.webp', banner: 'img/hangglider-emblem.webp' },
  wr: { emblem: 'img/wingrunner-emblem.webp', banner: 'img/wingrunner-title.webp' },
  ss: { emblem: 'img/skystormer-emblem.webp', banner: 'img/skystormer-title.webp' },
};
const WIN_ART = ['img/celebrate.webp', 'img/congrats.webp', 'img/great-job.webp'];

function artImg(src, cls, alt = '') {
  const img = el('img', cls);
  img.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  return img;
}
// Verbs for the win-overlay "next stage" suggestion, keyed by ladder row key.
const LADDER_VERB = {
  listen: 'Listen & Sing it', build: 'Build it', recall: 'Recall it', recite: 'Recite it',
};

let activeCleanup = null;
let activeCtx = null;

// The "🎧 listen" row (Story Time page, or a section's inline listen card)
// currently loaded on the shared <audio> element, or null. Shared across
// every listen row in the app since there's only ever one shared element.
let activeListenRow = null;

function teardownGame() {
  stopAudio();
  activeListenRow = null;
  if (activeCleanup) { try { activeCleanup(); } catch { /* game already gone */ } }
  if (activeCtx) activeCtx._cleanupStyles();
  activeCleanup = null;
  activeCtx = null;
}

// One-time subscription: when a listen row's track finishes on its own
// (never on a manual stop/pause), reset its UI and let it advance itself
// (Story Time rows wire up state.onEnded; plain listen-card rows don't).
onAudioEnded(() => {
  if (!activeListenRow) return;
  const { onEnded } = activeListenRow.state;
  stopActiveListenRow();
  if (onEnded) onEnded();
});

function go(hash) { location.hash = hash; }

// '' at zero — a lone '·' on every unstarted chip reads as a stray mark
// (js/lib/recite.js hides its zero-star row for the same reason).
function starsText(n) { return n > 0 ? '⭐'.repeat(n) : ''; }

function findBook(id) { return BOOKS.find((b) => b.id === id); }

// ---------- review queue (plans.html §9 P4.4): spaced practice, no scheduler ----------
//
// A lightweight module-level queue of routes, persisted to sessionStorage
// (not just a variable) so it survives the hashchange re-render between
// each queued verse. Built once when "🔁 Review my verses" is tapped: the
// book's stage≥1 verses, oldest lastPlayed first (nulls first — never
// played beats "played ages ago"), capped at 5, each pointed at its ladder
// Recall row's first available game.
const REVIEW_KEY = 'sparksArcade.reviewQueue';

function getReviewQueue() {
  try {
    const raw = sessionStorage.getItem(REVIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.routes) || !parsed.routes.length) return null;
    return parsed;
  } catch {
    return null;
  }
}
function saveReviewQueue(rq) {
  try { sessionStorage.setItem(REVIEW_KEY, JSON.stringify(rq)); } catch { /* private mode */ }
}
function clearReviewQueue() {
  try { sessionStorage.removeItem(REVIEW_KEY); } catch { /* private mode */ }
}

// How many of this book's verses are eligible for review (stage ≥ 1) — the
// book screen only offers the review card once there are ≥2 of them.
function reviewEligibleCount(book) {
  let n = 0;
  for (const section of book.sections) {
    for (const inst of sectionInstances(book, section)) {
      if (getStars(inst.key) >= 1) n++;
    }
  }
  return n;
}

function startReviewQueue(book) {
  const items = [];
  for (const section of book.sections) {
    sectionInstances(book, section).forEach((inst, idx) => {
      if (getStars(inst.key) < 1) return;
      items.push({ section, idx, verse: inst, lastPlayed: getVerse(inst.key).lastPlayed });
    });
  }
  // Oldest first; never-played (lastPlayed null) sorts before anything dated.
  items.sort((a, b) => {
    if (!a.lastPlayed && !b.lastPlayed) return 0;
    if (!a.lastPlayed) return -1;
    if (!b.lastPlayed) return 1;
    return new Date(a.lastPlayed) - new Date(b.lastPlayed);
  });
  const routes = items.slice(0, 5).map((item) => {
    const recallRow = ladderRowsFor(book, item.section, item.verse).find((r) => r.n === 3);
    const gameId = recallRow && recallRow.games[0];
    if (!gameId) return null;
    return `#/b/${book.id}/${item.section.id}/play/${item.idx}/${gameId}`;
  }).filter(Boolean);
  if (!routes.length) return;
  saveReviewQueue({ routes, index: 0 });
  go(routes[0]);
}

// Advances to the next queued verse, or clears the queue when it was the
// last one (the win overlay handles the "sparkling" celebration itself).
function advanceReviewQueue() {
  const rq = getReviewQueue();
  if (!rq) return;
  const nextIndex = rq.index + 1;
  if (nextIndex >= rq.routes.length) { clearReviewQueue(); return; }
  saveReviewQueue({ routes: rq.routes, index: nextIndex });
  go(rq.routes[nextIndex]);
}

function reviewCard(book) {
  const card = el('button', 'card review-card');
  card.append(el('span', 'review-card-icon', '🔁'));
  const body = el('div', 'review-card-body');
  body.append(el('h3', null, 'Review my verses'), el('p', null, 'Practice a few you haven’t played in a while.'));
  card.append(body);
  card.onclick = () => { sfx.click(); startReviewQueue(book); };
  return card;
}

function reviewChip(rq) {
  return el('span', 'chip review-chip', `reviewing ${rq.index + 1}/${rq.routes.length}`);
}

// ---------- 🎧 listen rows (Story Time page + section "tonight's story" cards) ----------

function stopActiveListenRow() {
  if (activeListenRow) {
    activeListenRow.row.classList.remove('playing');
    activeListenRow.btn.textContent = '▶';
  }
  activeListenRow = null;
}

function activateListenRow(shell) {
  stopActiveListenRow();
  playFile(shell.file);
  shell.row.classList.add('playing');
  shell.btn.textContent = '⏸';
  activeListenRow = shell;
  if (shell.state.onPlay) shell.state.onPlay();
}

// A play/pause row wired to the shared <audio> element via playFile (new
// track) or pauseAudio/resumeAudio (same track, in place). Callers append
// whatever body markup they like into shell.row alongside the button, and
// may set shell.state.onEnded / .onPlay afterwards (read lazily, so forward
// references — e.g. "play the next row when this one ends" — just work).
function listenRowShell(file) {
  const row = el('div', 'storytime-row');
  const btn = el('button', 'storytime-play', '▶');
  btn.setAttribute('aria-label', 'Play');
  row.append(btn);
  const shell = { row, btn, file, state: {} };
  btn.onclick = () => {
    sfx.click();
    if (activeListenRow === shell) {
      if (row.classList.contains('playing')) {
        pauseAudio();
        row.classList.remove('playing');
        btn.textContent = '▶';
      } else {
        resumeAudio();
        row.classList.add('playing');
        btn.textContent = '⏸';
      }
      return;
    }
    activateListenRow(shell);
  };
  return shell;
}

function formatDuration(seconds) {
  const s = Math.round(seconds || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

// showSection: false when the row already renders inside that section's own
// card (the chip would be pure redundancy); true on the global Story Time
// page where it disambiguates.
function listenRowBody(track, book, showSection = true) {
  const body = el('div', 'storytime-body');
  body.append(el('div', 'storytime-title', track.title));
  const meta = el('div', 'storytime-meta');
  meta.append(el('span', 'storytime-duration', formatDuration(track.duration)));
  meta.append(el('span', 'storytime-tag', track.type === 'story' ? '📖 story' : '⭐ lesson'));
  const section = showSection && track.section && book.sections.find((s) => s.id === track.section);
  if (section) meta.append(el('span', 'chip storytime-section', section.name));
  body.append(meta);
  return body;
}

// ---------- Story Time (plans.html §4.9): the handbook listening corner ----------

const STORYTIME_AUTOPLAY_KEY = 'sparksArcade.storytime.autoplay';
const STORYTIME_LAST_KEY = 'sparksArcade.storytime.last';

function getStorytimeAutoplay() {
  try { return localStorage.getItem(STORYTIME_AUTOPLAY_KEY) === '1'; } catch { return false; }
}
function setStorytimeAutoplay(on) {
  try { localStorage.setItem(STORYTIME_AUTOPLAY_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}
function getStorytimeLastMap() {
  try { return JSON.parse(localStorage.getItem(STORYTIME_LAST_KEY)) || {}; } catch { return {}; }
}
function setStorytimeLast(bookId, file) {
  try {
    const map = getStorytimeLastMap();
    map[bookId] = file;
    localStorage.setItem(STORYTIME_LAST_KEY, JSON.stringify(map));
  } catch { /* private mode — the hint just won't persist */ }
}

// One card per book: its handbook tracks in manifest order, each a play/
// pause row with a "🚗 Keep playing" auto-advance chain wired end-to-end.
function storytimeGroup(book) {
  const tracks = AUDIO.handbook[book.id] || [];
  if (!tracks.length) return null;

  const card = el('div', 'card storytime-group');
  const head = el('div', 'storytime-group-head');
  head.append(artImg(BOOK_ART[book.id].emblem, 'storytime-emblem', `${book.name} emblem`), el('h2', null, book.name));
  card.append(head);

  const lastFile = getStorytimeLastMap()[book.id];
  const shells = tracks.map((track) => {
    const shell = listenRowShell(track.file);
    shell.row.append(listenRowBody(track, book));
    if (track.file === lastFile) shell.row.append(el('span', 'storytime-resume', '▶ resume'));
    shell.state.onPlay = () => setStorytimeLast(book.id, track.file);
    card.append(shell.row);
    return shell;
  });
  // Wired after every row exists so each row's onEnded can reach forward to
  // the next one; stops (rather than wraps) at the end of the group.
  shells.forEach((shell, i) => {
    shell.state.onEnded = () => {
      if (getStorytimeAutoplay() && i + 1 < shells.length) activateListenRow(shells[i + 1]);
    };
  });
  return card;
}

// ---------- views ----------

function homeView() {
  // Catalog-style red blob header holding the wordmark and grade chip.
  const head = el('div', 'blob-head');
  head.append(
    el('h1', null, 'Sparks Verse Arcade'),
    el('span', 'grade-chip', 'Grades K–2'),
    el('p', null, 'Play your way to hiding God’s Word in your heart — one handbook verse at a time.'),
  );
  app.append(head);

  const hero = el('div', 'hero');
  const mascot = el('div', 'mascot');
  mascot.append(artImg('img/sparky-reading.webp', 'hero-art', 'Sparky reading the Bible'));
  hero.append(mascot);
  app.append(hero);

  // Gentle streaks (P4.5c): celebration-only — nothing shows at 0 days, and
  // there is never a broken-streak or reminder framing.
  const practiceDays = practiceDaysThisWeek();
  if (practiceDays >= 1) {
    app.append(el('p', 'streak-line', `🎉 You practiced ${practiceDays} day${practiceDays === 1 ? '' : 's'} this week!`));
  }

  for (const book of BOOKS) {
    const p = bookProgress(book);
    const card = el('button', `card book-card book-${book.color}`);
    const info = el('div');
    info.append(
      el('h2', null, `${book.name}`),
      el('span', 'grade-chip', book.grade),
      el('p', null, book.blurb),
    );
    card.append(artImg(BOOK_ART[book.id].emblem, 'book-art', `${book.name} emblem`), info, el('span', 'progress-pill', `${p.done}/${p.total}`));
    card.onclick = () => { sfx.click(); go(`#/b/${book.id}`); };
    app.append(card);
  }

  const row = el('div', 'btn-row');
  const stickersBtn = el('button', 'btn btn-primary', '📒 Sticker Book');
  stickersBtn.onclick = () => go('#/stickers');
  const gardenBtn = el('button', 'btn btn-green', '🌻 Verse Garden');
  gardenBtn.onclick = () => go('#/garden');
  const storytimeBtn = el('button', 'btn btn-blue', '📻 Story Time');
  storytimeBtn.onclick = () => go('#/storytime');
  const trophiesBtn = el('button', 'btn btn-red', '🏆 Trophies');
  trophiesBtn.onclick = () => go('#/trophies');
  row.append(stickersBtn, gardenBtn, storytimeBtn, trophiesBtn);
  app.append(row);

  // Bible translation picker
  const trCard = el('div', 'card translation-row');
  trCard.append(el('span', null, '📖 Bible:'));
  for (const t of TRANSLATIONS) {
    const chip = el('button', 'chip' + (t.id === getTranslationId() ? ' active' : ''), t.label);
    chip.onclick = () => { sfx.click(); setTranslationId(t.id); render(); };
    trCard.append(chip);
  }
  app.append(trCard);

  const foot = el('div', 'footer-note');
  foot.append(
    el('div', null, 'An unofficial practice app for Awana® Sparks clubbers — not affiliated with or endorsed by Awana.'),
    el('div', null, activeTranslation().notice),
  );
  const reset = el('button', null, 'Grown-ups: reset all progress');
  reset.style.cssText = 'text-decoration:underline;font-size:0.75rem;opacity:0.7;margin-top:6px;';
  reset.onclick = () => {
    if (confirm('Erase all stars, stickers, and garden progress?')) { resetAll(); render(); }
  };
  foot.append(reset);
  app.append(foot);
}

function topBar(title, backHash) {
  const bar = el('div', 'top-bar');
  const back = el('button', 'back-btn', '⬅ Back');
  // Leaving via Back always clears any in-progress review queue (P4.4) — a
  // no-op when there isn't one.
  back.onclick = () => { clearReviewQueue(); go(backHash); };
  bar.append(back, el('h1', null, title));
  app.append(bar);
  return bar;
}

// Catalog-style compact red blob header for the shell's destination screens
// (Story Time, Trophy Shelf): back pill + uppercase headline + slate tag.
// No emoji in the headline — it renders ALL CAPS in the display face.
function blobBar(title, backHash, tag) {
  const head = el('div', 'blob-head compact');
  const back = el('button', 'back-btn', '⬅ Back');
  back.onclick = () => { clearReviewQueue(); go(backHash); };
  head.append(back, el('h1', null, title));
  if (tag) head.append(el('span', 'grade-chip', tag));
  app.append(head);
  return head;
}

function bookView(book) {
  topBar(book.name, '#/');
  // Club-color band behind the wordmark — the catalog's color-block moment.
  const band = el('div', `banner-band band-${book.id}`);
  band.append(artImg(BOOK_ART[book.id].banner, `book-banner banner-${book.id}`, book.name));
  app.append(band);
  // Per-book review chip (plans.html §9 P4.4): only worth offering once
  // there's a real pool of stage≥1 verses to draw from.
  if (reviewEligibleCount(book) >= 2) app.append(reviewCard(book));
  for (const section of book.sections) {
    const game = GAMES[section.game];
    const p = sectionProgress(book, section);
    const rank = section.jewel === 'rank';
    const card = el('button', 'card section-row' + (rank ? ` rank-row rank-${book.id}` : ''));
    const info = el('div');
    const gameName = el('div', 'game-name', game ? `${game.icon} ${game.title}` : section.game);
    // Encore sections get one catalog-style badge, not a "(super-hard!)"
    // exclamation on every row.
    if (section.hard) gameName.append(el('span', 'hard-chip', 'Super-hard'));
    info.append(el('h3', null, section.name), gameName);
    card.append(jewelBadge(section.jewel), info, el('span', 'progress-pill', `${p.done}/${p.total}`));
    card.onclick = () => { sfx.click(); go(`#/b/${book.id}/${section.id}`); };
    app.append(card);
  }
  app.append(grownUpsRow(book));
}

// Small footer for parents/leaders: the official verse-song album (streaming/
// purchase only — Awana doesn't offer the music as files) and the Bible
// Biography PDFs downloaded from clubs.awana.org.
function grownUpsRow(book) {
  const wrap = el('div', 'grownups');
  const row = el('div', 'grownups-row');
  row.append(el('span', 'grownups-label', 'For grown-ups:'));
  const songUrl = MUSIC_LINKS[book.id]?.[getTranslationId()];
  if (songUrl) {
    const a = el('a', 'chip', '🎧 Verse songs');
    a.href = songUrl;
    a.target = '_blank';
    a.rel = 'noopener';
    row.append(a);
  }
  const pdfs = BIO_PDFS[book.id] || [];
  if (pdfs.length) {
    const toggle = el('button', 'chip', '📖 Bible biographies');
    const list = el('div', 'grownups-list');
    list.hidden = true;
    for (const { title, file } of pdfs) {
      const a = el('a', 'chip', title);
      a.href = file;
      a.target = '_blank';
      a.rel = 'noopener';
      list.append(a);
    }
    toggle.onclick = () => { sfx.click(); list.hidden = !list.hidden; };
    row.append(toggle);
    wrap.append(row, list);
    return wrap;
  }
  wrap.append(row);
  return wrap;
}

function sectionView(book, section) {
  topBar(section.name, `#/b/${book.id}`);
  const game = GAMES[section.game];
  const instances = sectionInstances(book, section);

  const banner = el('div', 'card game-banner');
  const info = el('div');
  info.append(
    el('h2', null, game.title),
    el('p', null, game.tagline + (section.hard ? ' Extra tricky this time!' : '')),
  );
  banner.append(el('span', 'game-icon', game.icon), info);
  const play = el('button', 'btn btn-big btn-primary', '▶ Play!');
  play.onclick = () => { sfx.click(); go(`#/b/${book.id}/${section.id}/play/0`); };
  banner.append(play);
  app.append(banner);

  // "Tonight's story" (plans.html §4.9): this section's handbook narration,
  // if any, playable right here without a trip to the full Story Time page.
  const handbookTracks = (AUDIO.handbook[book.id] || []).filter((t) => t.section === section.id);
  if (handbookTracks.length) {
    const listenCard = el('div', 'card storytime-section-card');
    listenCard.append(el('h3', null, '🎧 Listen'));
    for (const track of handbookTracks) {
      const shell = listenRowShell(track.file);
      shell.row.append(listenRowBody(track, book, false)); // already inside this section's card
      listenCard.append(shell.row);
    }
    app.append(listenCard);
  }

  const list = el('div', 'card');
  for (const entry of section.entries) {
    const row = el('div', 'entry-row');
    row.append(el('span', 'entry-num', entry.n));
    const body = el('div');
    body.append(el('div', null, `${entry.title}${entry.review ? ' 🔁' : ''}`));
    if (entry.refs.length === 0) {
      const akey = activityKey(book, section, entry);
      const btn = el('button', 'chip', isActivityDone(akey) ? '✅ Done with my leader!' : '⬜ Do with your leader');
      btn.onclick = () => { sfx.click(); toggleActivity(akey); render(); };
      body.append(btn);
    } else {
      for (const ref of entry.refs) {
        const idx = instances.findIndex((v) => v.entryN === entry.n && v.ref === ref);
        const inst = instances[idx];
        const chip = el('button', 'chip');
        chip.append(el('span', null, inst.label));
        const stars = starsText(getStars(inst.key));
        if (stars) chip.append(el('span', 'chip-stars', stars));
        chip.onclick = () => { sfx.click(); go(`#/b/${book.id}/${section.id}/play/${idx}`); };
        body.append(chip);
      }
    }
    row.append(body);
    if (entryComplete(book, section, entry)) row.append(el('span', null, SECTION_STICKERS[section.id] || '⭐'));
    list.append(row);
  }
  app.append(list);
}

// Verse picker chips — a single scrollable rail so the screen below stays
// above the fold. Chips always link to the verse (ladder) screen, never
// straight to a game, on both the verse screen and the game screen.
function verseChipRail(book, section, instances, idx, sectionHash) {
  const chips = el('div', 'chip-scroller');
  let activeChip = null;
  instances.forEach((inst, i) => {
    const chip = el('button', 'chip' + (i === idx ? ' active' : ''));
    chip.append(el('span', null, inst.label));
    const stars = starsText(getStars(inst.key));
    if (stars) chip.append(el('span', 'chip-stars', stars));
    chip.onclick = () => { sfx.click(); go(`${sectionHash}/play/${i}`); };
    if (i === idx) activeChip = chip;
    chips.append(chip);
  });
  app.append(chips);
  if (activeChip) activeChip.scrollIntoView({ inline: 'center', block: 'nearest' });
}

// 🔊 Hear + conditional 🎵 Sing controls, shared by the verse and game screens.
function hearSingControls(verse) {
  const controls = el('div', 'btn-row');
  const hear = el('button', 'btn', '🔊 Hear the verse');
  hear.onclick = () => playVerse(verse, { kind: 'read' });
  controls.append(hear);
  const songEntry = songEntryFor(verse.ref);
  if (songEntry) {
    const sing = el('button', 'btn', '🎵 Sing it');
    sing.onclick = () => playVerse(verse, { kind: 'sing' });
    controls.append(sing);
  }
  return controls;
}

// ladderFor() lists 'singalong' on every Listen & Sing row (registry
// presence isn't per-verse), but the game only makes sense once the owner
// has actually added a song file for THIS verse — drop it otherwise so kids
// don't land on Karaoke's song-less sibling by accident.
function ladderRowsFor(book, section, verse) {
  const hasSong = !!songEntryFor(verse.ref);
  const rows = ladderFor(book, section, GAMES);
  if (hasSong) return rows;
  return rows.map((row) => (
    row.games.includes('singalong')
      ? { ...row, games: row.games.filter((id) => id !== 'singalong') }
      : row
  ));
}

// The per-verse Mastery Ladder menu (plans.html §3.3): a verse card, then
// four always-tappable stage rows suggesting which game to play next.
function verseView(book, section, verseIdx) {
  const instances = sectionInstances(book, section);
  const idx = Math.max(0, Math.min(instances.length - 1, verseIdx));
  const verse = instances[idx];
  const sectionHash = `#/b/${book.id}/${section.id}`;

  topBar(section.name, sectionHash);
  verseChipRail(book, section, instances, idx, sectionHash);

  const stage = getStars(verse.key);
  const card = el('div', 'card verse-card');
  card.append(el('h2', null, verse.label));
  card.append(el('div', 'verse-display', verse.text));
  if (stage > 0) card.append(el('div', 'stars-big', starsText(stage)));
  card.append(hearSingControls(verse));
  app.append(card);

  const suggested = nextRow(stage);
  for (const row of ladderRowsFor(book, section, verse)) {
    const rowCard = el('div', 'card ladder-row');
    const head = el('div', 'ladder-row-head');
    // No emoji prefix on the step headings (BRAND.md: emoji live on
    // controls, not on every heading) — the game buttons below carry them.
    head.append(el('span', 'ladder-row-title', `${row.n} ${row.title}`));
    if (stageDone(row.n, stage)) {
      head.append(el('span', 'ladder-done', 'done ✓'));
    } else if (row.n === suggested && row.games.length) {
      head.append(el('span', 'ladder-hint', '← play me'));
    }
    rowCard.append(head);
    // Row 4 (Recite) always offers the recitation module first — it's the
    // only path to stage 3, so it never depends on a game registry entry.
    if (row.n === 4 || row.games.length) {
      const btnRow = el('div', 'btn-row ladder-games');
      if (row.n === 4) {
        const reciteBtn = el('button', 'btn btn-primary', '🏅 Say it to a grown-up!');
        reciteBtn.onclick = () => { sfx.click(); go(`${sectionHash}/recite/${idx}`); };
        btnRow.append(reciteBtn);
      }
      for (const gameId of row.games) {
        const game = GAMES[gameId];
        const featured = gameId === section.game;
        const btn = el('button', 'btn' + (featured ? ' btn-primary' : ''), `${game.icon} ${game.title}`);
        btn.onclick = () => { sfx.click(); go(`${sectionHash}/play/${idx}/${gameId}`); };
        btnRow.append(btn);
      }
      rowCard.append(btnRow);
    } else {
      rowCard.append(el('p', 'ladder-empty', 'Coming soon!'));
    }
    app.append(rowCard);
  }
}

// Mounts a single chosen game for a verse. Falls back to the section's
// signature game when gameId is missing or unknown.
function gameView(book, section, verseIdx, gameId) {
  const game = GAMES[gameId] || GAMES[section.game];
  const resolvedId = GAMES[gameId] ? gameId : section.game;
  const instances = sectionInstances(book, section);
  const idx = Math.max(0, Math.min(instances.length - 1, verseIdx));
  const verse = instances[idx];
  const sectionHash = `#/b/${book.id}/${section.id}`;
  const verseHash = `${sectionHash}/play/${idx}`;

  topBar(`${game.icon} ${game.title}`, verseHash);
  const rq = getReviewQueue();
  if (rq) app.append(reviewChip(rq));
  verseChipRail(book, section, instances, idx, sectionHash);

  const controls = hearSingControls(verse);
  const help = el('button', 'btn', '❓ How to play');
  controls.append(help);
  app.append(controls);

  const helpCard = el('div', 'card');
  helpCard.style.display = 'none';
  helpCard.textContent = game.howTo;
  help.onclick = () => {
    helpCard.style.display = helpCard.style.display === 'none' ? 'block' : 'none';
  };
  app.append(helpCard);

  const stage = el('div', 'stage');
  app.append(stage);

  const hooks = {
    onWin: (stars, message) => {
      addStars(verse.key, stars);
      confetti(document.body, 80);
      showWinOverlay({ stars, message, book, section, instances, idx, sectionHash });
    },
    onExit: () => go(verseHash),
  };

  activeCtx = makeCtx({ verse, verses: instances, entry: null, book, section, hard: !!section.hard, hooks, stage, game });
  const maybeCleanup = game.mount(stage, activeCtx);
  if (typeof maybeCleanup === 'function') activeCleanup = maybeCleanup;
}

function showWinOverlay({ stars, message, book, section, instances, idx, sectionHash }) {
  const overlay = el('div', 'overlay');
  const card = el('div', 'card');
  card.append(
    artImg(WIN_ART[Math.floor(Math.random() * WIN_ART.length)], 'win-art', 'Sparky celebrating'),
    el('div', 'stars-big', '⭐'.repeat(Math.max(1, stars))),
    el('h2', null, message || 'Way to go, Sparky!'),
    el('p', null, instances[idx].label),
  );

  // Review queue (P4.4): while active, the primary button drives the queue
  // forward instead of just replaying; the last verse gets a small
  // celebration and the queue clears right here.
  const rq = getReviewQueue();
  const reviewQueueDone = !!(rq && rq.index + 1 >= rq.routes.length);
  if (reviewQueueDone) {
    card.append(el('p', 'review-celebrate', '✨ Your verses are sparkling!'));
    clearReviewQueue();
  }

  const row = el('div', 'btn-row');
  if (rq && !reviewQueueDone) {
    const nextReview = el('button', 'btn btn-primary', '➡️ Next review verse');
    nextReview.onclick = () => { overlay.remove(); advanceReviewQueue(); };
    row.append(nextReview);
  } else {
    const again = el('button', 'btn btn-primary', '🔁 Play again');
    again.onclick = () => { overlay.remove(); render(); };
    row.append(again);
  }

  // Suggest the next not-yet-done ladder stage for this verse. Row 4
  // (Recite) always has somewhere to send the kid — the recitation module —
  // even though it has no game of its own in the registry.
  const postWinStage = getStars(instances[idx].key);
  const nextRowInfo = ladderRowsFor(book, section, instances[idx]).find((r) => r.n === nextRow(postWinStage));
  if (nextRowInfo && !stageDone(nextRowInfo.n, postWinStage) && (nextRowInfo.n === 4 || nextRowInfo.games.length)) {
    const nextBtn = el('button', 'btn btn-blue', `${nextRowInfo.icon} Next: ${LADDER_VERB[nextRowInfo.key]}!`);
    nextBtn.onclick = () => {
      overlay.remove();
      go(nextRowInfo.n === 4 ? `${sectionHash}/recite/${idx}` : `${sectionHash}/play/${idx}/${nextRowInfo.games[0]}`);
    };
    row.append(nextBtn);
  }

  if (idx + 1 < instances.length) {
    const next = el('button', 'btn btn-green', '➡ Next verse');
    next.onclick = () => { overlay.remove(); go(`${sectionHash}/play/${idx + 1}`); };
    row.append(next);
  }
  const done = el('button', 'btn', '🏠 Done');
  done.onclick = () => { overlay.remove(); go(sectionHash); };
  row.append(done);
  card.append(row);
  overlay.append(card);
  document.body.append(overlay);
}

function stickersView() {
  blobBar('Sticker Book', '#/', 'Win games, earn stickers');
  app.append(el('p', 'sticker-note', 'Finish a page’s games to earn its sticker!'));
  for (const book of BOOKS) {
    const card = el('div', 'card');
    const head = el('div', 'book-group-head');
    head.append(artImg(BOOK_ART[book.id].emblem, 'book-group-emblem', `${book.name} emblem`), el('h2', null, book.name));
    card.append(head);
    for (const section of book.sections) {
      const row = el('div', 'entry-row sticker-row');
      row.append(el('span', `jewel-chip jewel-${section.jewel}`, section.name));
      const body = el('div');
      for (const entry of section.entries) {
        const earned = entryComplete(book, section, entry);
        const sticker = el('span', 'sticker-slot' + (earned ? '' : ' empty'));
        sticker.textContent = earned ? (SECTION_STICKERS[section.id] || '⭐') : '⚪';
        sticker.title = `${entry.n} ${entry.title}`;
        body.append(sticker);
      }
      row.append(body);
      card.append(row);
    }
    app.append(card);
  }
}

function storyTimeView() {
  blobBar('Story Time', '#/', 'Handbook audio');

  const hero = el('div', 'storytime-hero');
  hero.append(artImg('img/sparky-bookstack.webp', 'storytime-hero-art', 'Sparky with a stack of books'));
  hero.append(el('p', null, 'Listen to the stories from your handbook!'));
  app.append(hero);

  const autoplayChip = el('button', 'chip storytime-autoplay' + (getStorytimeAutoplay() ? ' active' : ''), '🚗 Keep playing');
  autoplayChip.onclick = () => {
    sfx.click();
    const on = !getStorytimeAutoplay();
    setStorytimeAutoplay(on);
    autoplayChip.classList.toggle('active', on);
  };
  app.append(autoplayChip);

  for (const book of BOOKS) {
    const group = storytimeGroup(book);
    if (group) app.append(group);
  }
}

function gardenView() {
  blobBar('Verse Garden', '#/', 'Grow every verse');
  app.append(el('p', null, 'Every verse you practice grows a plant. Three stars makes it bloom!'));
  // Mastery map legend (P4.5a) — growthStage() already derives straight from
  // the storage stage (see js/lib/progress.js), so the garden's tiles are
  // honest mastery, not a separate "played a game" counter.
  app.append(el('p', 'garden-legend', '🌰 not started · 🌱 built it · 🌿 recalled it · 🌻 recited word-perfect'));
  for (const book of BOOKS) {
    const card = el('div', 'card');
    const head = el('div', 'book-group-head');
    head.append(artImg(BOOK_ART[book.id].emblem, 'book-group-emblem', `${book.name} emblem`), el('h2', null, book.name));
    card.append(head);
    for (const section of book.sections) {
      const insts = sectionInstances(book, section);
      if (!insts.length) continue;
      const group = el('div', 'garden-section');
      group.append(el('span', `jewel-chip jewel-${section.jewel}`, section.name));
      const bed = el('div', 'garden-bed');
      insts.forEach((inst, idx) => {
        // Each plant is a real button: tappable on touch devices, labelled,
        // and it takes the kid straight to that verse's ladder screen.
        const stars = getStars(inst.key);
        const plant = el('button', 'garden-plant', GROWTH_EMOJI[growthStage(inst.key)]);
        plant.title = `${inst.label} — ${stars} star${stars === 1 ? '' : 's'}`;
        plant.setAttribute('aria-label', `${inst.label} — ${stars} star${stars === 1 ? '' : 's'}`);
        plant.onclick = () => { sfx.click(); go(`#/b/${book.id}/${section.id}/play/${idx}`); };
        bed.append(plant);
      });
      group.append(bed);
      card.append(group);
    }
    app.append(card);
  }
}

// Trophy Shelf (P4.5b): the mastery-honest reward — one medal per verse that
// has actually reached stage 3 (word-perfect recitation, via recordRecited),
// never for a game win alone. Walks every verse instance in the curriculum
// (BOOKS × sectionInstances), not just what's been touched this session.
function trophiesView() {
  blobBar('Trophy Shelf', '#/', 'Word-perfect verses');
  let any = false;
  for (const book of BOOKS) {
    const trophies = [];
    for (const section of book.sections) {
      for (const inst of sectionInstances(book, section)) {
        const v = getVerse(inst.key);
        if (v.stage === 3) trophies.push({ inst, v });
      }
    }
    if (!trophies.length) continue;
    any = true;
    const card = el('div', 'card');
    const head = el('div', 'trophy-book-head');
    head.append(artImg(BOOK_ART[book.id].emblem, 'trophy-emblem', `${book.name} emblem`), el('h2', null, book.name));
    card.append(head);
    const grid = el('div', 'trophy-grid');
    for (const { inst, v } of trophies) {
      const medal = el('div', 'trophy-card');
      medal.append(el('span', 'trophy-medal', '🏅'));
      medal.append(el('div', 'trophy-ref', inst.label));
      const dateStr = v.recited?.at ? new Date(v.recited.at).toLocaleDateString() : '';
      const modeIcon = MODE_ICON[v.recited?.mode] || '';
      medal.append(el('div', 'trophy-meta', [dateStr, modeIcon].filter(Boolean).join(' ')));
      grid.append(medal);
    }
    card.append(grid);
    app.append(card);
  }
  if (!any) {
    const empty = el('div', 'card trophy-empty');
    empty.append(artImg('img/sparky-bookstack.webp', 'trophy-empty-art', 'Sparky with a stack of books'));
    empty.append(el('p', null, 'Say a verse word-perfect to a grown-up to win your first trophy!'));
    app.append(empty);
  }
}

// ---------- router ----------

function render() {
  teardownGame();
  clear(app);
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  try {
    if (parts.length === 0) return homeView();
    if (parts[0] === 'stickers') return stickersView();
    if (parts[0] === 'garden') return gardenView();
    if (parts[0] === 'storytime') return storyTimeView();
    if (parts[0] === 'trophies') return trophiesView();
    if (parts[0] === 'b') {
      const book = findBook(parts[1]);
      if (!book) return homeView();
      if (parts.length === 2) return bookView(book);
      const section = book.sections.find((s) => s.id === parts[2]);
      if (!section) return bookView(book);
      if (parts.length === 3) return sectionView(book, section);
      if (parts[3] === 'play') {
        const idx = parseInt(parts[4] || '0', 10) || 0;
        if (parts[5]) return gameView(book, section, idx, parts[5]);
        return verseView(book, section, idx);
      }
      if (parts[3] === 'recite') {
        const idx = parseInt(parts[4] || '0', 10) || 0;
        activeCleanup = reciteView(book, section, idx);
        return;
      }
      return sectionView(book, section);
    }
    homeView();
  } catch (err) {
    console.error(err);
    clear(app);
    const card = el('div', 'card');
    card.append(el('h2', null, 'Oops!'), el('p', null, 'Something went wrong. Tap below to go home.'));
    const home = el('button', 'btn btn-primary', '🏠 Home');
    home.onclick = () => { go('#/'); render(); };
    card.append(home);
    app.append(card);
  }
}

window.addEventListener('hashchange', render);
render();
