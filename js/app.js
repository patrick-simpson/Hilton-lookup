// App shell: hash router and views (home → book → section → game),
// plus the sticker book and verse garden overview pages.

import { BOOKS } from './data/curriculum.js';
import { MUSIC_LINKS, BIO_PDFS } from './data/music-links.js';
import { TRANSLATIONS, getTranslationId, setTranslationId, activeTranslation } from './data/translations.js';
import { GAMES } from './games/index.js';
import {
  el, clear, sectionInstances, makeCtx, sfx, confetti,
} from './lib/engine.js';
import { playVerse, songEntryFor, stopAudio } from './lib/audio.js';
import {
  getStars, addStars, sectionProgress, bookProgress, entryComplete,
  activityKey, isActivityDone, toggleActivity, growthStage, GROWTH_EMOJI,
  SECTION_STICKERS, resetAll,
} from './lib/progress.js';
import { ladderFor, stageDone, nextRow } from './lib/ladder.js';

const app = document.getElementById('app');
const JEWEL_ICON = { rank: '🏅', red: '❤️', green: '💚' };

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

function teardownGame() {
  stopAudio();
  if (activeCleanup) { try { activeCleanup(); } catch { /* game already gone */ } }
  if (activeCtx) activeCtx._cleanupStyles();
  activeCleanup = null;
  activeCtx = null;
}

function go(hash) { location.hash = hash; }

function starsText(n) { return n > 0 ? '⭐'.repeat(n) : '·'; }

function findBook(id) { return BOOKS.find((b) => b.id === id); }

// ---------- views ----------

function homeView() {
  const hero = el('div', 'hero');
  const mascot = el('div', 'mascot');
  mascot.append(artImg('img/sparky-reading.webp', 'hero-art', 'Sparky reading the Bible'));
  hero.append(mascot, el('h1', null, 'Sparks Verse Arcade'), el('p', null, 'Pick your handbook and play your way to hiding God’s Word in your heart!'));
  app.append(hero);

  for (const book of BOOKS) {
    const p = bookProgress(book);
    const card = el('button', `card book-card book-${book.color}`);
    const info = el('div');
    info.append(el('h2', null, `${book.name}`), el('p', null, `${book.grade} · ${book.blurb}`));
    card.append(artImg(BOOK_ART[book.id].emblem, 'book-art', `${book.name} emblem`), info, el('span', 'progress-pill', `${p.done}/${p.total}`));
    card.onclick = () => { sfx.click(); go(`#/b/${book.id}`); };
    app.append(card);
  }

  const row = el('div', 'btn-row');
  const stickersBtn = el('button', 'btn btn-primary', '📒 Sticker Book');
  stickersBtn.onclick = () => go('#/stickers');
  const gardenBtn = el('button', 'btn btn-green', '🌻 Verse Garden');
  gardenBtn.onclick = () => go('#/garden');
  row.append(stickersBtn, gardenBtn);
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
  back.onclick = () => go(backHash);
  bar.append(back, el('h1', null, title));
  app.append(bar);
  return bar;
}

function bookView(book) {
  topBar(`${book.emoji} ${book.name}`, '#/');
  app.append(artImg(BOOK_ART[book.id].banner, `book-banner banner-${book.id}`, book.name));
  for (const section of book.sections) {
    const game = GAMES[section.game];
    const p = sectionProgress(book, section);
    const card = el('button', 'card section-row');
    const info = el('div');
    info.append(
      el('h3', null, section.name),
      el('div', 'game-name', `${game ? game.icon + ' ' + game.title : section.game}${section.hard ? ' (super-hard!)' : ''}`),
    );
    card.append(el('span', 'jewel', JEWEL_ICON[section.jewel]), info, el('span', 'progress-pill', `${p.done}/${p.total}`));
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
  topBar(`${JEWEL_ICON[section.jewel]} ${section.name}`, `#/b/${book.id}`);
  const game = GAMES[section.game];
  const instances = sectionInstances(book, section);

  const banner = el('div', 'card game-banner');
  const info = el('div');
  info.append(
    el('h2', null, `${game.icon} ${game.title}`),
    el('p', null, game.tagline + (section.hard ? ' Extra tricky this time!' : '')),
  );
  banner.append(el('span', 'game-icon', game.icon), info);
  const play = el('button', 'btn btn-big btn-primary', '▶ Play!');
  play.onclick = () => { sfx.click(); go(`#/b/${book.id}/${section.id}/play/0`); };
  banner.append(play);
  app.append(banner);

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
        chip.append(el('span', null, inst.label), el('span', 'chip-stars', starsText(getStars(inst.key))));
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
    chip.append(el('span', null, inst.label), el('span', 'chip-stars', starsText(getStars(inst.key))));
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
  card.append(el('div', 'stars-big', starsText(stage)));
  card.append(hearSingControls(verse));
  app.append(card);

  const suggested = nextRow(stage);
  for (const row of ladderRowsFor(book, section, verse)) {
    const rowCard = el('div', 'card ladder-row');
    const head = el('div', 'ladder-row-head');
    head.append(el('span', 'ladder-row-title', `${row.n} ${row.icon} ${row.title}`));
    if (stageDone(row.n, stage)) {
      head.append(el('span', 'ladder-done', 'done ✓'));
    } else if (row.n === suggested && row.games.length) {
      head.append(el('span', 'ladder-hint', '← play me'));
    }
    rowCard.append(head);
    if (row.games.length) {
      const btnRow = el('div', 'btn-row ladder-games');
      for (const gameId of row.games) {
        const game = GAMES[gameId];
        const featured = gameId === section.game;
        const btn = el('button', 'btn' + (featured ? ' btn-primary' : ''), `${game.icon} ${game.title}${featured ? ' ★' : ''}`);
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
  const row = el('div', 'btn-row');
  const again = el('button', 'btn btn-primary', '🔁 Play again');
  again.onclick = () => { overlay.remove(); render(); };
  row.append(again);

  // Suggest the next not-yet-done ladder stage for this verse, if it has a
  // game to offer today (future rows like Recite may still be empty).
  const postWinStage = getStars(instances[idx].key);
  const nextRowInfo = ladderRowsFor(book, section, instances[idx]).find((r) => r.n === nextRow(postWinStage));
  if (nextRowInfo && nextRowInfo.games.length && !stageDone(nextRowInfo.n, postWinStage)) {
    const nextBtn = el('button', 'btn btn-blue', `${nextRowInfo.icon} Next: ${LADDER_VERB[nextRowInfo.key]}!`);
    nextBtn.onclick = () => { overlay.remove(); go(`${sectionHash}/play/${idx}/${nextRowInfo.games[0]}`); };
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
  topBar('📒 Sticker Book', '#/');
  for (const book of BOOKS) {
    const card = el('div', 'card');
    card.append(el('h2', null, `${book.emoji} ${book.name}`));
    for (const section of book.sections) {
      const row = el('div', 'entry-row sticker-row');
      row.append(el('span', 'entry-num', section.name));
      const body = el('div');
      for (const entry of section.entries) {
        const earned = entryComplete(book, section, entry);
        const sticker = el('span');
        sticker.textContent = earned ? (SECTION_STICKERS[section.id] || '⭐') : '⚪';
        sticker.style.cssText = 'font-size:1.7rem;margin-right:6px;' + (earned ? '' : 'opacity:0.4;');
        sticker.title = `${entry.n} ${entry.title}`;
        body.append(sticker);
      }
      row.append(body);
      card.append(row);
    }
    app.append(card);
  }
}

function gardenView() {
  topBar('🌻 Verse Garden', '#/');
  app.append(el('p', null, 'Every verse you practice grows a plant. Three stars makes it bloom!'));
  for (const book of BOOKS) {
    const card = el('div', 'card');
    card.append(el('h2', null, `${book.emoji} ${book.name}`));
    const bed = el('div');
    bed.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
    for (const section of book.sections) {
      for (const inst of sectionInstances(book, section)) {
        const plant = el('span', null, GROWTH_EMOJI[growthStage(inst.key)]);
        plant.style.fontSize = '1.8rem';
        plant.title = `${inst.label} — ${getStars(inst.key)} star(s)`;
        bed.append(plant);
      }
    }
    card.append(bed);
    app.append(card);
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
      return sectionView(book, section);
    }
    homeView();
  } catch (err) {
    console.error(err);
    clear(app);
    const card = el('div', 'card');
    card.append(el('h2', null, '😅 Oops!'), el('p', null, 'Something went wrong. Tap below to go home.'));
    const home = el('button', 'btn btn-primary', '🏠 Home');
    home.onclick = () => { go('#/'); render(); };
    card.append(home);
    app.append(card);
  }
}

window.addEventListener('hashchange', render);
render();
