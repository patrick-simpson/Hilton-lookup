// Verse audio playback: one shared <audio> element that plays the official
// Awana handbook recordings from js/data/audio-manifest.js, falling back to
// device speech (engine.js) for refs with no recording. This is what backs
// the no-arg ctx.speak() contract documented in docs/GAME_SPEC.md.
//
// Deliberate ESM cycle: engine.js imports playVerse/stopAudio from here, and
// this file imports speak/stopSpeak from engine.js. Safe because every
// cross-module call happens at runtime (inside a function body), never at
// module-eval time, and speak/stopSpeak are hoisted function declarations
// so their bindings exist before either module finishes evaluating.

import { AUDIO } from '../data/audio-manifest.js';
import { getTranslationId } from '../data/translations.js';
import { speak, stopSpeak } from './engine.js';

// Book-list refs have no per-translation song — they all point at one of
// the two "common" books-of-the-bible songs.
const BOOK_LIST_SONG = {
  'NT-1': 'nt-books-song', 'NT-2': 'nt-books-song', 'NT-3': 'nt-books-song', 'NT-ALL': 'nt-books-song',
  'OT-1': 'ot-books-song', 'OT-2': 'ot-books-song', 'OT-3': 'ot-books-song',
  'OT-4': 'ot-books-song', 'OT-5': 'ot-books-song', 'OT-6': 'ot-books-song', 'OT-ALL': 'ot-books-song',
};

export function refSlug(ref) {
  return ref.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function readEntryFor(ref) {
  const id = getTranslationId();
  return (AUDIO.read[id] && AUDIO.read[id][ref]) || AUDIO.read.common[ref] || null;
}

export function songEntryFor(ref) {
  const id = getTranslationId();
  const own = AUDIO.songs[id] && AUDIO.songs[id][ref];
  if (own) return own;
  const commonKey = BOOK_LIST_SONG[ref];
  return (commonKey && AUDIO.songs.common[commonKey]) || null;
}

// ---------- shared <audio> element ----------

let audioEl = null;
// Per-word tick schedule for the verse currently playing via playVerse, or
// null when nothing is being tracked (e.g. playFile, or TTS fallback).
let tickTimes = null;
let tickIndex = -1;
const tickListeners = new Set();

function clearTicks() {
  tickTimes = null;
  tickIndex = -1;
}

function onTimeUpdate() {
  if (!tickTimes) return;
  const t = audioEl.currentTime;
  while (tickIndex + 1 < tickTimes.length && t >= tickTimes[tickIndex + 1]) {
    tickIndex++;
    for (const cb of tickListeners) cb(tickIndex);
  }
}

// typeof-guard, not just presence checks, because this module must import
// cleanly under Node (test/smoke.mjs's import-ok check) where `document`
// and `Audio` don't exist at all.
function el() {
  if (typeof document === 'undefined') return null;
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.style.display = 'none';
    audioEl.addEventListener('timeupdate', onTimeUpdate);
    audioEl.addEventListener('ended', clearTicks);
    // Deliberately NOT clearing ticks on the 'pause' event: pauseAudio()
    // below pauses mid-song for a sing-along gap round and expects
    // tickIndex/tickTimes to survive so resumeAudio() picks the word timeline
    // back up where it left off. Full stops (stopAudio) clear ticks
    // explicitly instead.
    // Attach to the DOM so it's inspectable/queryable like a normal element
    // (and some mobile browsers behave better with playback elements that
    // are actually in the tree rather than detached).
    document.body.appendChild(audioEl);
  }
  return audioEl;
}

// Even-split tick timestamps across [2%, 95%] of the entry's known duration.
function scheduleTicks(words, duration) {
  if (!words || !words.length || !duration) return;
  const start = duration * 0.02;
  const end = duration * 0.95;
  const n = words.length;
  tickTimes = n === 1 ? [start] : words.map((_, i) => start + (end - start) * (i / (n - 1)));
  tickIndex = -1;
}

function playPath(file) {
  const a = el();
  if (!a) return;
  a.src = file;
  try { a.currentTime = 0; } catch { /* not seekable yet — fine */ }
  a.play().catch(() => { /* no user gesture yet, or the browser blocked it */ });
}

export function playFile(file) {
  stopAudio();
  playPath(file);
}

export function playVerse(verse, { kind = 'read' } = {}) {
  stopAudio();
  if (kind === 'sing') {
    const song = songEntryFor(verse.ref);
    if (song) {
      scheduleTicks(verse.words, song.duration);
      playPath(song.file);
      return { source: 'file' };
    }
    return playVerse(verse, { kind: 'read' });
  }
  const entry = readEntryFor(verse.ref);
  if (entry) {
    scheduleTicks(verse.words, entry.duration);
    playPath(entry.file);
    return { source: 'file' };
  }
  speak(verse.spokenText);
  return { source: 'tts' };
}

// One call silences file playback AND device speech.
export function stopAudio() {
  stopSpeak();
  clearTicks();
  if (audioEl) {
    audioEl.pause();
    try { audioEl.currentTime = 0; } catch { /* not seekable yet — fine */ }
  }
}

export function onWordTick(cb) {
  tickListeners.add(cb);
  return () => tickListeners.delete(cb);
}

// Pause/resume the shared element in place (word ticks and position survive)
// — for Sing-Along Stage's "your turn" gap rounds, which pause the song mid-
// phrase and pick it back up on the kid's cue. Unlike stopAudio(), these
// never touch tickTimes/currentTime.
export function pauseAudio() {
  if (audioEl) audioEl.pause();
}

export function resumeAudio() {
  if (audioEl) audioEl.play().catch(() => { /* no user gesture yet, or blocked */ });
}

// iOS/Safari only allow the first play() call inside a user gesture to
// unlock the element for later programmatic playback — prime it silently
// on the first tap anywhere in the app.
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => {
    const a = el();
    if (!a) return;
    a.muted = true;
    a.play().catch(() => {});
    a.pause();
    a.muted = false;
  }, { once: true });
}
