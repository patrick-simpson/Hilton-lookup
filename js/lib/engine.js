// Shared game engine: DOM helpers, sound effects, speech, confetti,
// word utilities, and the ctx object handed to every game's mount().

import { BOOK_LISTS, OT_BOOKS, NT_BOOKS } from '../data/verses.js';
import { verseText, getTranslationId, activeTranslation } from '../data/translations.js';
import { playVerse, stopAudio } from './audio.js';

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

// ---------- ctx factory ----------

// Builds the ctx handed to game.mount(stageEl, ctx). `hooks` is supplied by
// the app shell: { onWin(stars), onExit() }.
export function makeCtx({ verse, verses, entry, book, section, hard, hooks, stage }) {
  const styles = [];
  let won = false;
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
    win: (opts = {}) => {
      if (won) return;
      won = true;
      stopAudio();
      sfx.win();
      hooks.onWin(opts.stars == null ? 3 : opts.stars, opts.message);
    },
    exit: () => hooks.onExit(),
    _cleanupStyles: () => styles.forEach((s) => s.remove()),
  };
}
