// App shell: hash router and views (home → book → section → game),
// plus the sticker book and verse garden overview pages.

import { BOOKS } from './data/curriculum.js';
import { TRANSLATIONS, getTranslationId, setTranslationId, activeTranslation } from './data/translations.js';
import { GAMES } from './games/index.js';
import {
  el, clear, sectionInstances, makeCtx, speak, stopSpeak, sfx, confetti,
} from './lib/engine.js';
import {
  getStars, addStars, sectionProgress, bookProgress, entryComplete,
  activityKey, isActivityDone, toggleActivity, growthStage, GROWTH_EMOJI,
  SECTION_STICKERS, resetAll,
} from './lib/progress.js';

const app = document.getElementById('app');
const JEWEL_ICON = { rank: '🏅', red: '❤️', green: '💚' };

let activeCleanup = null;
let activeCtx = null;

function teardownGame() {
  stopSpeak();
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
  const mascot = el('div', 'mascot', '✨');
  hero.append(mascot, el('h1', null, 'Sparks Verse Arcade'), el('p', null, 'Pick your handbook and play your way to hiding God’s Word in your heart!'));
  app.append(hero);

  for (const book of BOOKS) {
    const p = bookProgress(book);
    const card = el('button', `card book-card book-${book.color}`);
    const info = el('div');
    info.append(el('h2', null, `${book.name}`), el('p', null, `${book.grade} · ${book.blurb}`));
    card.append(el('span', 'book-emoji', book.emoji), info, el('span', 'progress-pill', `${p.done}/${p.total}`));
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

function gameView(book, section, verseIdx) {
  const game = GAMES[section.game];
  const instances = sectionInstances(book, section);
  const idx = Math.max(0, Math.min(instances.length - 1, verseIdx));
  const verse = instances[idx];
  const sectionHash = `#/b/${book.id}/${section.id}`;

  topBar(`${game.icon} ${game.title}`, sectionHash);

  // Verse picker chips — a single scrollable rail so the game stays above the fold
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

  const controls = el('div', 'btn-row');
  const hear = el('button', 'btn', '🔊 Hear the verse');
  hear.onclick = () => speak(verse.spokenText);
  const help = el('button', 'btn', '❓ How to play');
  controls.append(hear, help);
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
    onExit: () => go(sectionHash),
  };

  activeCtx = makeCtx({ verse, verses: instances, entry: null, book, section, hard: !!section.hard, hooks, stage });
  const maybeCleanup = game.mount(stage, activeCtx);
  if (typeof maybeCleanup === 'function') activeCleanup = maybeCleanup;
}

function showWinOverlay({ stars, message, instances, idx, sectionHash }) {
  const overlay = el('div', 'overlay');
  const card = el('div', 'card');
  card.append(
    el('div', 'stars-big', '⭐'.repeat(Math.max(1, stars))),
    el('h2', null, message || 'Way to go, Sparky!'),
    el('p', null, instances[idx].label),
  );
  const row = el('div', 'btn-row');
  const again = el('button', 'btn btn-primary', '🔁 Play again');
  again.onclick = () => { overlay.remove(); render(); };
  row.append(again);
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
      if (parts[3] === 'play') return gameView(book, section, parseInt(parts[4] || '0', 10) || 0);
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
