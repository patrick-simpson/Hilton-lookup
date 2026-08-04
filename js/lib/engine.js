// Shared game engine: DOM helpers, sound effects, speech, confetti,
// word utilities, and the ctx object handed to every game's mount().

import { BOOK_LISTS, OT_BOOKS, NT_BOOKS } from '../data/verses.js';
import { verseText, getTranslationId, activeTranslation } from '../data/translations.js';
import { playVerse, stopAudio } from './audio.js';
import { getPasses, recordPass, setStage } from './progress.js';

// ---------- DOM ----------

export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// ---------- randomness ----------

export function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  // Never hand back the original order for short lists — it reads as a bug.
  if (out.length > 1 && out.every((v, i) => v === arr[i])) {
    [out[0], out[1]] = [out[1], out[0]];
  }
  return out;
}

export const randInt = (n) => Math.floor(Math.random() * n);
export const pick = (arr) => arr[randInt(arr.length)];

// ---------- words ----------

export const tokenize = (text) => text.split(/\s+/).filter(Boolean);
export const cleanWord = (w) => w.toLowerCase().replace(/[^a-z0-9’']/g, '');

// Distractor word pools, built lazily per translation.
const wordPools = new Map();
function allWords() {
  const id = getTranslationId();
  if (!wordPools.has(id)) {
    wordPools.set(id, [...new Set(
      Object.values(activeTranslation().texts).flatMap(tokenize).filter((w) => cleanWord(w).length > 2)
    )]);
  }
  return wordPools.get(id);
}

// ---------- sound effects (WebAudio, no assets) ----------

let audioCtx = null;
function ac() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = AC ? new AC() : null;
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freq, dur = 0.15, type = 'sine', when = 0, vol = 0.2) {
  const ctx = ac();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime + when);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime + when);
  osc.stop(ctx.currentTime + when + dur + 0.05);
}

export const sfx = {
  click: () => tone(600, 0.06, 'square', 0, 0.08),
  pop: () => { tone(880, 0.08, 'square', 0, 0.15); tone(1320, 0.06, 'square', 0.05, 0.1); },
  correct: () => { tone(660, 0.1, 'sine'); tone(880, 0.15, 'sine', 0.09); },
  wrong: () => tone(160, 0.25, 'sawtooth', 0, 0.12),
  tick: () => tone(1000, 0.04, 'square', 0, 0.06),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', i * 0.13, 0.22)),
};

// ---------- speech ----------

let voice = null;

// Local-service voices tend to be lower-latency and don't depend on a
// network round-trip, so within a quality tier they win the tiebreak.
function bestOf(list) {
  if (!list.length) return null;
  return list.find((v) => v.localService) || list[0];
}

function pickVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  const isEn = (v) => /en[-_]/.test(v.lang);
  const tierA = voices.filter((v) => isEn(v) && /natural|neural|premium|enhanced/i.test(v.name));
  const tierB = voices.filter((v) => isEn(v) && /samantha|google us english|aria|jenny/i.test(v.name));
  const tierC = voices.filter(isEn);
  return bestOf(tierA) || bestOf(tierB) || bestOf(tierC) || voices[0] || null;
}
// typeof-guard (not just 'in window') because this runs at module load,
// where a non-browser host (e.g. Node, for import smoke tests) has no
// `window` global at all and a bare `in window` would throw ReferenceError.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => { voice = pickVoice(); };
}

// Splits at sentence/clause punctuation (kept on the preceding chunk) so
// each queued utterance gets a natural pause after it — Web Speech has no
// SSML, so this is the only lever for pacing. No lookbehind, for compat.
function splitChunks(text) {
  const parts = text.match(/[^.!?;:]+[.!?;:]*/g) || [text];
  return parts.map((p) => p.trim()).filter(Boolean);
}

export function speak(text) {
  if (!('speechSynthesis' in window) || !text) return;
  speechSynthesis.cancel();
  if (!voice) voice = pickVoice();
  let warned = false;
  const onerror = () => {
    // Fail silently — the 🔊 button should stay usable even if TTS misbehaves.
    if (!warned) { warned = true; console.warn('speech synthesis error'); }
  };
  // Queue every chunk up front (not chained via onend) so a single
  // speechSynthesis.cancel() — from stopSpeak() or the next speak() call —
  // clears the whole queue instead of leaving later chunks to fire.
  for (const chunk of splitChunks(text.replace(/LORD/g, 'Lord'))) {
    const utter = new SpeechSynthesisUtterance(chunk);
    utter.lang = 'en-US';
    if (voice) utter.voice = voice;
    utter.rate = 0.9;
    utter.pitch = 1.0;
    utter.onerror = onerror;
    speechSynthesis.speak(utter);
  }
}

export function stopSpeak() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// ---------- confetti ----------

const CONFETTI_COLORS = ['#ff5d5d', '#ffb703', '#8ecae6', '#90dd90', '#c77dff', '#ff9e6d'];

export function confetti(container = document.body, count = 60) {
  const host = el('div', 'confetti-host');
  container.appendChild(host);
  for (let i = 0; i < count; i++) {
    const bit = el('div', 'confetti-bit');
    bit.style.left = Math.random() * 100 + '%';
    bit.style.background = pick(CONFETTI_COLORS);
    bit.style.animationDelay = Math.random() * 0.4 + 's';
    bit.style.animationDuration = 1.2 + Math.random() * 1.2 + 's';
    bit.style.transform = `rotate(${randInt(360)}deg)`;
    if (Math.random() < 0.5) bit.style.borderRadius = '50%';
    host.appendChild(bit);
  }
  setTimeout(() => host.remove(), 2800);
}

// ---------- verse instances ----------

// Turn a ref (verse reference or book-list code) into a playable instance.
export function makeInstance(ref, entry, book, section) {
  const list = BOOK_LISTS[ref];
  if (list) {
    const words = list.books ? list.books.slice() : tokenize(list.text);
    return {
      ref,
      label: list.label,
      text: list.books ? list.books.join(', ') : list.text,
      spokenText: list.books ? list.books.join(', ') : list.text,
      words,
      isList: !!list.books,
      entryN: entry.n,
      entryTitle: entry.title,
      key: `${book.id}.${section.id}.${entry.n}.${ref}`,
    };
  }
  const text = verseText(ref);
  return {
    ref,
    label: ref,
    text,
    spokenText: `${text} ${ref.replace(/(\d+):(\d+)/, '$1 verse $2')}`,
    words: tokenize(text),
    isList: false,
    entryN: entry.n,
    entryTitle: entry.title,
    key: `${book.id}.${section.id}.${entry.n}.${ref}`,
  };
}

export function sectionInstances(book, section) {
  const out = [];
  for (const entry of section.entries) {
    for (const ref of entry.refs) out.push(makeInstance(ref, entry, book, section));
  }
  return out;
}

// Words that are NOT in the given verse — decoys for quiz games.
export function distractors(verse, count) {
  const used = new Set(verse.words.map(cleanWord));
  let pool;
  if (verse.isList) {
    pool = [...OT_BOOKS, ...NT_BOOKS].filter((b) => !used.has(cleanWord(b)));
  } else {
    pool = allWords().filter((w) => !used.has(cleanWord(w)));
  }
  return shuffle(pool).slice(0, count);
}

// ---------- fading support (plans.html §7.1) ----------

// How much of the guide to show THIS play, before any chip taps: pass 1 full
// text, pass 2 first letters, pass 3+ blanks. Hard/encore sections start
// pre-faded; kindergarten never auto-reaches blank (a Sparks kid can still
// raise it manually via the chip — this only caps the automatic default).
export function supportLevelFor(verse, gameId, hard) {
  let level = Math.min(getPasses(verse.key, gameId), 2);
  if (hard) level = Math.max(level, 1);
  if (verse.key.startsWith('hg.')) level = Math.min(level, 1);
  return level;
}

// level 0: unchanged. level 1: leading digit token (e.g. the "1" in
// "1 Corinthians") plus the first letter of what follows, original case
// kept, everything else — trailing punctuation, "'s", etc. — dropped.
// level 2: a single blank glyph, no matter the word.
export function fadeWord(word, level) {
  if (level <= 0) return word;
  if (level >= 2) return '◻';
  const m = word.match(/^(\d+\s+)?(.)/);
  return m ? (m[1] || '') + m[2] : word;
}

const GUIDE_ICON = ['🌕', '🌗', '🌑'];

// Builds the fading guide strip a builder game mounts wherever its old
// always-visible preview lived. One controller per play; call `.reset()`
// per new round/chunk rather than creating a fresh guide each time, so
// level/peeks/minLevel state carries across the whole play.
function createGuide(verse, gameId, hard, words) {
  let level = supportLevelFor(verse, gameId, hard);
  // Lowest level active at any moment — dropping to 0 mid-play (via the
  // chip) forfeits stage-2 credit for this play even if raised back up.
  let minLevel = level;
  let peeks = 0;
  let done = new Set();
  let current = words;

  const wrap = el('div', 'guide-strip');
  const wordsEl = el('div', 'guide-words');
  const chip = el('button', 'guide-chip', GUIDE_ICON[level]);
  chip.type = 'button';
  chip.setAttribute('aria-label', 'Change hint level');
  wrap.append(wordsEl, chip);

  // Undone words are plain (non-button) tiles — they must never be
  // selectable by a generic ".stage button" query, so autoplay/test
  // scripts driving the pool tiles can't mistake a faded guide tile for
  // the real answer tile.
  function render() {
    clear(wordsEl);
    current.forEach((w, i) => {
      const isDone = done.has(i);
      const tile = el('span', 'guide-word' + (isDone ? ' lit' : ''), isDone ? w : fadeWord(w, level));
      if (!isDone && level >= 1) {
        tile.setAttribute('role', 'button');
        tile.tabIndex = 0;
        tile.onclick = () => peek(i, tile, w);
      }
      wordsEl.appendChild(tile);
    });
  }

  function peek(i, tile, word) {
    if (done.has(i)) return;
    sfx.click();
    peeks++;
    tile.textContent = word;
    tile.classList.add('peeking');
    setTimeout(() => {
      // Guard against a round change / level change having already
      // torn this tile out of the DOM (re-rendered) since the tap.
      if (!tile.isConnected || done.has(i)) return;
      tile.textContent = fadeWord(word, level);
      tile.classList.remove('peeking');
    }, 1500);
  }

  chip.onclick = () => {
    level = (level + 1) % 3;
    minLevel = Math.min(minLevel, level);
    chip.textContent = GUIDE_ICON[level];
    render();
  };

  render();

  return {
    el: wrap,
    markDone(i) {
      done.add(i);
      render();
    },
    reset(nextWords) {
      current = nextWords;
      done = new Set();
      render();
    },
    get level() { return level; },
    get peeks() { return peeks; },
    get minLevel() { return minLevel; },
  };
}

// ---------- "think first" beat (plans.html §7.2 / §5.2) ----------

// A ~2s invitation to recall silently before a cloze game reveals its word
// candidates. Renders a small badge inside `anchor` (never a full-stage
// overlay — it must never cover an answer target) and resolves either when
// `ms` elapses or the instant the kid taps anywhere on the stage, whichever
// comes first. It only ever touches its own badge element, so if the game
// unmounts mid-beat the eventual resolve (or the fallback timer) is harmless
// — there is nothing to cancel from the outside.
function thinkBeat(stage, { anchor, ms = 1800 } = {}) {
  const host = anchor || stage;
  return new Promise((resolve) => {
    const badge = el('div', 'think-beat');
    badge.append(
      el('span', 'think-beat-face', '🤔'),
      el('span', 'think-beat-text', 'What comes next?'),
      el('span', 'think-beat-spark', '✨'),
    );
    host.appendChild(badge);

    let settled = false;
    const onTap = () => finish();
    const timer = setTimeout(finish, ms);
    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      stage.removeEventListener('pointerdown', onTap, true);
      badge.remove();
      resolve();
    }
    // Capture phase, one-shot: any tap anywhere on the stage skips the beat
    // instantly, whether or not it lands on a (still-inert) answer target.
    stage.addEventListener('pointerdown', onTap, true);
  });
}

// ---------- ctx factory ----------

// Builds the ctx handed to game.mount(stageEl, ctx). `hooks` is supplied by
// the app shell: { onWin(stars), onExit() }. `game` is the game module
// ({id, title, ...}) — used for pass-tracking and the fading-support level;
// optional so tests can still construct a bare ctx.
export function makeCtx({ verse, verses, entry, book, section, hard, hooks, stage, game }) {
  const styles = [];
  let won = false;
  let latestGuide = null;
  return {
    verse,
    verses,
    entry,
    book,
    section,
    hard: !!hard,
    el,
    clear,
    shuffle,
    pick,
    randInt,
    tokenize,
    cleanWord,
    sfx,
    speak: (text) => (text == null ? playVerse(verse, { kind: 'read' }) : speak(text)),
    stopSpeak: stopAudio,
    confetti: (host) => confetti(host || stage),
    distractors: (count, v) => distractors(v || verse, count),
    chunk: (words, size = 4) => {
      const out = [];
      for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size));
      return out;
    },
    addStyle: (css) => {
      const node = el('style');
      node.textContent = css;
      document.head.appendChild(node);
      styles.push(node);
      return node;
    },
    guide: (words) => {
      latestGuide = createGuide(verse, game?.id, hard, words);
      return latestGuide;
    },
    thinkBeat: (opts = {}) => thinkBeat(stage, opts),
    win: (opts = {}) => {
      if (won) return;
      won = true;
      stopAudio();
      sfx.win();
      if (game?.id) recordPass(verse.key, game.id);
      const effective = opts.supportLevel != null ? opts.supportLevel : (latestGuide ? latestGuide.minLevel : null);
      const mist = (opts.mistakes ?? 0) + (latestGuide ? latestGuide.peeks : 0) + (opts.peeks ?? 0);
      if (effective >= 1 && mist <= 1) setStage(verse.key, 2);
      hooks.onWin(opts.stars == null ? 3 : opts.stars, opts.message);
    },
    exit: () => hooks.onExit(),
    _cleanupStyles: () => styles.forEach((s) => s.remove()),
  };
}
