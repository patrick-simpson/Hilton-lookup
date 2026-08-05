// The Recitation module (plans.html §8) — the ⭐⭐⭐ gate. Shell-level view,
// NOT a game module: mounted by app.js's router at
// #/b/<book>/<section>/recite/<verseIdx>. Exports reciteView(book, section,
// verseIdx), which builds the screen directly into #app and returns a
// cleanup function — app.js stores it as its activeCleanup and calls it via
// the existing teardownGame() pattern (this view may be holding a live
// MediaRecorder stream or SpeechRecognition session that needs shutting
// down on navigation away).
//
// Four modes, all on one screen, per the owner's decision (§8): grown-up
// check-off, record & playback, speech-recognition "Magic Ears", and an
// honest "said it at club" self-report. ANY mode's pass calls
// recordRecited(key, mode) — the ONLY place in the app that grants mastery
// stage 3. Never a fail screen: a miss is always "so close — try again!".

import {
  el, clear, sfx, confetti, cleanWord, tokenize, sectionInstances,
} from './engine.js';
import { getStars, recordRecited } from './progress.js';
import { playVerse } from './audio.js';

const WIN_ART = ['img/celebrate.webp', 'img/congrats.webp', 'img/great-job.webp'];
const CHEER_KIDS = ['img/emma.webp', 'img/chloe.webp', 'img/joel.webp', 'img/jacob.webp'];

const MODE_LABEL = {
  checkoff: '🧑\u200d🤝\u200d🧑 Grown-up check',
  recording: '🎙️ Recording',
  sr: '🪄 Magic ears',
  club: '🏠 Said it at club',
};

function app() { return document.getElementById('app'); }
function go(hash) { location.hash = hash; }
function starsText(n) { return n > 0 ? '⭐'.repeat(n) : '·'; }

// Grown-ups setting: Magic Ears may award the star with no confirm tap.
const MAGIC_EARS_AUTO_KEY = 'sparksArcade.magicEarsAuto';
function magicEarsAuto() {
  try { return localStorage.getItem(MAGIC_EARS_AUTO_KEY) === '1'; } catch { return false; }
}
function setMagicEarsAuto(on) {
  try { localStorage.setItem(MAGIC_EARS_AUTO_KEY, on ? '1' : '0'); } catch { /* private mode */ }
}
function autoChipLabel() {
  return magicEarsAuto() ? '🪄 Auto-award: ON' : '🪄 Auto-award: OFF';
}

function artImg(src, cls, alt = '') {
  const img = el('img', cls);
  img.src = src;
  img.alt = alt;
  img.loading = 'lazy';
  return img;
}

function topBar(title, backHash) {
  const bar = el('div', 'top-bar');
  const back = el('button', 'back-btn', '⬅ Back');
  back.onclick = () => go(backHash);
  bar.append(back, el('h1', null, title));
  app().append(bar);
  return bar;
}

// Deterministic (not random) so the same verse always cheers with the same
// friend across visits — a small touch of warmth, not noise.
function hashKid(key) {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return CHEER_KIDS[h % CHEER_KIDS.length];
}

// ---------- fuzzy word matching (Magic Ears generosity rules, §8 Mode 3) ----------

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Rule (a): cleanWord + Levenshtein ≤1 (≤2 for words ≥6 chars).
function wordsMatch(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const maxDist = (a.length >= 6 || b.length >= 6) ? 2 : 1;
  return levenshtein(a, b) <= maxDist;
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function numToWords(n) {
  if (n < 20) return ONES[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const o = n % 10;
    return o ? `${TENS[t]} ${ONES[o]}` : TENS[t];
  }
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return `${ONES[h]} hundred${rest ? ' ' + numToWords(rest) : ''}`;
}

// Splits a ref like "1 John 4:14" or "1 Corinthians 15:3-4" into the book
// name's words and the chapter/verse numbers, for the "reference heard" check.
function parseRef(ref) {
  const m = ref.match(/^(.*?)\s+([\d:\-–,]+)$/);
  if (!m) return { bookWords: tokenize(ref).map(cleanWord), numbers: [] };
  return {
    bookWords: tokenize(m[1]).map(cleanWord),
    numbers: (m[2].match(/\d+/g) || []).map(Number),
  };
}

function numberHeard(n, words) {
  if (words.includes(String(n))) return true;
  return numToWords(n).split(' ').every((w) => words.includes(w));
}

// Rule (d): reference numbers match digits or words; book name matched with
// the same generosity as verse words.
function referenceHeardIn(text, bookWords, numbers) {
  const words = tokenize(text).map(cleanWord).filter(Boolean);
  const bookOk = bookWords.every((bw) => words.some((w) => wordsMatch(w, bw)));
  const numsOk = numbers.every((n) => numberHeard(n, words));
  return bookOk && numsOk;
}

// ---------- the view ----------

export function reciteView(book, section, verseIdx) {
  const instances = sectionInstances(book, section);
  const idx = Math.max(0, Math.min(instances.length - 1, verseIdx));
  const verse = instances[idx];
  const sectionHash = `#/b/${book.id}/${section.id}`;
  const verseHash = `${sectionHash}/play/${idx}`;

  const root = app();
  const cleanupFns = [];
  const addCleanup = (fn) => cleanupFns.push(fn);

  topBar('🏅 Say it word-perfect!', verseHash);

  const alreadyStage3 = getStars(verse.key) >= 3;
  const headerCard = el('div', 'card recite-card');
  headerCard.append(artImg(hashKid(verse.key), 'recite-kid', 'A cheering Sparks friend'));
  headerCard.append(el('h2', null, verse.label));
  headerCard.append(el('div', 'stars-big', starsText(getStars(verse.key))));
  if (alreadyStage3) {
    headerCard.append(el('p', 'recite-again-note', 'Already recited — say it again for practice!'));
  }
  root.append(headerCard);

  const content = el('div', 'recite-content');
  root.append(content);

  function onSuccess(mode) {
    recordRecited(verse.key, mode);
    sfx.win();
    confetti(document.body, 80);
    showCelebration(mode);
  }

  function showCelebration(mode) {
    const overlay = el('div', 'overlay');
    const card = el('div', 'card');
    card.append(
      artImg(WIN_ART[Math.floor(Math.random() * WIN_ART.length)], 'win-art', 'Sparky celebrating'),
      el('div', 'stars-big', '⭐⭐⭐'),
      el('h2', null, 'RECITED!'),
      el('p', null, verse.label),
      el('p', 'recite-mode-date', `${MODE_LABEL[mode] || mode} · ${new Date().toLocaleDateString()}`),
    );
    const row = el('div', 'btn-row');
    const again = el('button', 'btn btn-primary', '🔁 Play again');
    again.onclick = () => { overlay.remove(); showModes(); };
    const done = el('button', 'btn btn-green', '✅ Done');
    done.onclick = () => { overlay.remove(); go(verseHash); };
    row.append(again, done);
    card.append(row);
    overlay.append(card);
    document.body.append(overlay);
  }

  function backBtnRow() {
    const backBtn = el('button', 'btn recite-back', '‹ Back to modes');
    backBtn.onclick = () => { sfx.click(); showModes(); };
    return backBtn;
  }

  function modeCard(icon, title, sub, onTap) {
    const c = el('button', 'card recite-mode-card');
    c.append(el('span', 'recite-mode-icon', icon));
    const body = el('div', 'recite-mode-body');
    body.append(el('h3', null, title), el('p', null, sub));
    c.append(body);
    c.onclick = () => { sfx.click(); onTap(); };
    return c;
  }

  // ---------- Mode 1 — 🧑‍🤝‍🧑 Grown-Up Check (always available) ----------

  function showGrownUpIntro() {
    clear(content);
    const wrap = el('div', 'card recite-handoff');
    wrap.append(el('div', 'recite-handoff-emoji', '📱➡️🧑\u200d🏫'));
    wrap.append(el('h3', null, 'Hand the screen to a grown-up!'));
    wrap.append(el('p', null, 'The Sparks kid recites from memory — no peeking at the screen!'));
    const ready = el('button', 'btn btn-primary btn-big', "I'm ready — show the verse ➡");
    ready.onclick = () => { sfx.click(); showGrownUpCheck(); };
    wrap.append(ready, backBtnRow());
    content.append(wrap);
  }

  function showGrownUpCheck() {
    clear(content);
    const wrap = el('div', 'card recite-grownup');
    wrap.append(el('p', 'recite-instructions', 'Tap any word your Sparks kid missed:'));

    const wordsWrap = el('div', 'recite-word-grid');
    const missed = new Set();
    verse.words.forEach((w, i) => {
      const tile = el('button', 'word-tile recite-word-tile', w);
      tile.onclick = () => {
        sfx.click();
        if (missed.has(i)) { missed.delete(i); tile.classList.remove('missed'); } else { missed.add(i); tile.classList.add('missed'); }
        updatePerfectBtn();
      };
      wordsWrap.append(tile);
    });
    wrap.append(wordsWrap);
    wrap.append(el('div', 'recite-ref-line', verse.label));

    let refSaid = false;
    const refChip = el('button', 'chip recite-ref-chip', '🔖 said the reference');
    refChip.onclick = () => {
      sfx.click();
      refSaid = !refSaid;
      refChip.classList.toggle('active', refSaid);
      updatePerfectBtn();
    };
    wrap.append(refChip);

    const encourage = el('div', 'recite-encourage', 'You can do it — try again! 💪');
    encourage.hidden = true;

    const actionRow = el('div', 'btn-row');
    const perfectBtn = el('button', 'btn btn-green btn-big', '✅ Word perfect!');
    perfectBtn.disabled = true;
    perfectBtn.onclick = () => { if (!perfectBtn.disabled) { sfx.click(); onSuccess('checkoff'); } };
    const retryBtn = el('button', 'btn btn-primary', '💛 So close — one more try!');
    retryBtn.onclick = () => {
      sfx.click();
      missed.clear();
      wordsWrap.querySelectorAll('.missed').forEach((t) => t.classList.remove('missed'));
      refSaid = false;
      refChip.classList.remove('active');
      updatePerfectBtn();
      encourage.hidden = false;
    };
    actionRow.append(perfectBtn, retryBtn);
    wrap.append(actionRow, encourage, backBtnRow());
    content.append(wrap);

    function updatePerfectBtn() {
      perfectBtn.disabled = !(missed.size === 0 && refSaid);
    }
  }

  // ---------- Mode 2 — 🎙️ Record & Hear Yourself ----------

  function formatElapsed(s) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  function showRecordStart() {
    clear(content);
    const wrap = el('div', 'card recite-record');
    wrap.append(el('p', 'recite-privacy-note', '🔒 Recordings are never saved.'));
    const timerEl = el('div', 'recite-timer', '0:00');
    const recBtn = el('button', 'btn btn-red btn-big recite-record-btn', '⏺ Start recording');
    wrap.append(timerEl, recBtn, backBtnRow());
    content.append(wrap);

    let stream = null;
    let mediaRecorder = null;
    let chunks = [];
    let timerInt = null;
    let stopTimer = null;
    let seconds = 0;

    function teardownMedia() {
      clearInterval(timerInt); timerInt = null;
      clearTimeout(stopTimer); stopTimer = null;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') { try { mediaRecorder.stop(); } catch { /* already stopped */ } }
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
    }
    addCleanup(teardownMedia);

    function stopRecording() {
      clearInterval(timerInt); timerInt = null;
      clearTimeout(stopTimer); stopTimer = null;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    }

    async function startRecording() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        showRecordUnavailable();
        return;
      }
      try {
        mediaRecorder = new MediaRecorder(stream);
      } catch {
        stream.getTracks().forEach((t) => t.stop());
        showRecordUnavailable();
        return;
      }
      chunks = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      mediaRecorder.onstop = () => {
        if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        showPlayback(URL.createObjectURL(blob));
      };
      mediaRecorder.start();
      seconds = 0;
      timerEl.textContent = '0:00';
      recBtn.textContent = '⏹ Stop';
      recBtn.classList.add('recording');
      timerInt = setInterval(() => {
        seconds++;
        timerEl.textContent = formatElapsed(seconds);
        if (seconds >= 90) stopRecording();
      }, 1000);
      stopTimer = setTimeout(stopRecording, 90000);
    }

    recBtn.onclick = () => {
      sfx.click();
      if (recBtn.classList.contains('recording')) stopRecording();
      else startRecording();
    };
  }

  function showRecordUnavailable() {
    clear(content);
    const wrap = el('div', 'card recite-record-unavailable');
    wrap.append(el('p', null, '🎙️ Mic not allowed on this device — try Grown-Up Check instead!'));
    wrap.append(backBtnRow());
    content.append(wrap);
  }

  function showPlayback(url) {
    clear(content);
    const wrap = el('div', 'card recite-playback');
    wrap.append(el('p', 'recite-privacy-note', '🔒 Recordings are never saved.'));

    const myAudio = new Audio(url);
    const playRow = el('div', 'btn-row');
    const playMine = el('button', 'btn btn-blue', '▶ my recording');
    playMine.onclick = () => { sfx.click(); myAudio.currentTime = 0; myAudio.play().catch(() => {}); };
    const playReal = el('button', 'btn', '🔊 the real one');
    playReal.onclick = () => { sfx.click(); playVerse(verse, { kind: 'read' }); };
    playRow.append(playMine, playReal);
    wrap.append(playRow);
    wrap.append(el('div', 'verse-display', verse.text), el('div', 'recite-ref', verse.label));

    function discard() { myAudio.pause(); URL.revokeObjectURL(url); }

    const actionRow = el('div', 'btn-row');
    const perfect = el('button', 'btn btn-green btn-big', '✅ It was word perfect!');
    perfect.onclick = () => { sfx.click(); discard(); onSuccess('recording'); };
    const retry = el('button', 'btn btn-primary', '🔁 Try again');
    retry.onclick = () => { sfx.click(); discard(); showRecordStart(); };
    actionRow.append(perfect, retry);
    wrap.append(actionRow);

    const back = backBtnRow();
    const originalBack = back.onclick;
    back.onclick = () => { discard(); originalBack(); };
    wrap.append(back);
    content.append(wrap);

    addCleanup(discard);
  }

  // ---------- Mode 3 — 🪄 Magic Ears (speech recognition) ----------

  function showMagicEars(SR) {
    clear(content);
    const wrap = el('div', 'card recite-sr');
    wrap.append(el('p', 'recite-sr-note', '🌐 Needs internet on most devices — the magic ears are listening for you, never judging you!'));

    // Grown-ups option: let the magic ears award the star with no confirm tap.
    // The auto path demands MORE than the manual one (every word + reference,
    // not 90%) because there's no human double-check behind it.
    const autoChip = el('button', 'chip' + (magicEarsAuto() ? ' active' : ''), autoChipLabel());
    autoChip.onclick = () => {
      sfx.click();
      setMagicEarsAuto(!magicEarsAuto());
      autoChip.textContent = autoChipLabel();
      autoChip.classList.toggle('active', magicEarsAuto());
    };
    const autoRow = el('div', 'recite-sr-autorow');
    autoRow.append(autoChip, el('span', 'recite-sr-autonote',
      'Grown-ups: when ON, hearing every single word and the reference awards the star all by itself.'));
    wrap.append(autoRow);

    const tilesWrap = el('div', 'recite-sr-tiles');
    verse.words.forEach(() => tilesWrap.append(el('span', 'recite-sr-tile', '●')));
    wrap.append(tilesWrap);

    const statusEl = el('div', 'recite-sr-status', 'Tap the mic and say the verse!');
    wrap.append(statusEl);
    const micBtn = el('button', 'btn btn-primary btn-big recite-mic-btn', '🎤 Start listening');
    wrap.append(micBtn);
    const resultArea = el('div', 'recite-sr-result');
    wrap.append(resultArea);
    wrap.append(backBtnRow());
    content.append(wrap);

    const { bookWords, numbers } = parseRef(verse.ref);
    const tileEls = [...tilesWrap.children];
    let wordIdx = 0;
    const litSet = new Set();
    let referenceHeard = false;
    let celebrated = false;
    let listening = false;
    let silenceTimer = null;
    let finalTranscript = '';
    let lastError = null;

    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    function renderTiles() {
      tileEls.forEach((t, i) => {
        const lit = litSet.has(i);
        t.classList.toggle('lit', lit);
        t.textContent = lit ? verse.words[i] : '●';
      });
    }

    // Rule (b): skip-ahead window of 2 — a missed function word never stalls
    // the lighting. Rule (e): an unlit word is never marked wrong.
    function tryMatch(words) {
      for (const w of words) {
        if (wordIdx >= verse.words.length) break;
        for (let offset = 0; offset <= 2 && wordIdx + offset < verse.words.length; offset++) {
          const i = wordIdx + offset;
          if (litSet.has(i)) continue;
          if (wordsMatch(w, cleanWord(verse.words[i]))) {
            litSet.add(i);
            wordIdx = i + 1;
            break;
          }
        }
      }
    }

    function resetSilenceTimer() {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => { try { recognition.stop(); } catch { /* already stopped */ } }, 10000);
    }

    function maybeCelebrate(combinedText) {
      if (celebrated) return;
      if (!referenceHeard && referenceHeardIn(combinedText, bookWords, numbers)) referenceHeard = true;
      const litRatio = litSet.size / verse.words.length;
      // Auto-award (grown-ups opt-in): stricter than the manual path — every
      // word must light, not 90%, since no human confirm stands behind it.
      if (magicEarsAuto() && litSet.size === verse.words.length && referenceHeard) {
        celebrated = true;
        try { recognition.stop(); } catch { /* already stopped */ }
        statusEl.textContent = '✨ Every single word — the magic ears award the star!';
        micBtn.disabled = true;
        clear(resultArea);
        setTimeout(() => onSuccess('sr'), 900);
        return;
      }
      if (litRatio >= 0.9 && referenceHeard) {
        celebrated = true;
        try { recognition.stop(); } catch { /* already stopped */ }
        showSrConfirm();
      }
    }

    recognition.onresult = (event) => {
      resetSilenceTimer();
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const { transcript } = result[0];
        if (result.isFinal) {
          finalTranscript += ` ${transcript}`;
          tryMatch(tokenize(transcript).map(cleanWord).filter(Boolean));
        } else {
          interimChunk += ` ${transcript}`;
        }
      }
      // Rule (c): interim results count toward lighting too.
      if (interimChunk) tryMatch(tokenize(interimChunk).map(cleanWord).filter(Boolean));
      renderTiles();
      maybeCelebrate(`${finalTranscript} ${interimChunk}`);
    };
    recognition.onerror = (e) => { lastError = e && e.error; };
    recognition.onend = () => {
      listening = false;
      clearTimeout(silenceTimer);
      if (celebrated) return;
      if (lastError) showSrErrorPrompt(); else showSrRetryPrompt();
    };

    function startListening() {
      lastError = null;
      try { recognition.start(); } catch { showSrErrorPrompt(); return; }
      listening = true;
      micBtn.disabled = false;
      micBtn.textContent = '⏹ Stop';
      statusEl.textContent = 'Listening… say the verse! 🗣️';
      clear(resultArea);
      resetSilenceTimer();
    }

    function retryPromptRow(message) {
      statusEl.textContent = message;
      clear(resultArea);
      const replay = el('button', 'btn btn-primary', '🔁 Say it again?');
      replay.onclick = () => { sfx.click(); startListening(); };
      resultArea.append(replay);
      micBtn.disabled = false;
      micBtn.textContent = '🎤 Start listening';
    }
    function showSrRetryPrompt() { retryPromptRow('Say it again for the magic ears? 🎤'); }
    function showSrErrorPrompt() { retryPromptRow("Hmm, the magic ears had trouble — let's try again!"); }

    function showSrConfirm() {
      statusEl.textContent = '✨ The magic ears heard it all!';
      clear(resultArea);
      const confirmBtn = el('button', 'btn btn-green btn-big', '✅ A grown-up says: word perfect!');
      confirmBtn.onclick = () => { sfx.click(); onSuccess('sr'); };
      const again = el('button', 'btn', '🔁 Say it again');
      again.onclick = () => { sfx.click(); celebrated = false; startListening(); };
      resultArea.append(confirmBtn, again);
      micBtn.disabled = true;
    }

    micBtn.onclick = () => {
      sfx.click();
      if (listening) { micBtn.disabled = true; try { recognition.stop(); } catch { /* already stopped */ } } else startListening();
    };

    addCleanup(() => {
      clearTimeout(silenceTimer);
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try { recognition.stop(); } catch { /* already stopped */ }
    });
  }

  // ---------- Mode 4 — 🏠 Said It at Club! (always available) ----------

  function showClub() {
    clear(content);
    const wrap = el('div', 'card recite-club');
    wrap.append(el('p', null, 'Did you say this verse to your leader at club?'));
    const yes = el('button', 'btn btn-green btn-big', '👍 Yes! I said it!');
    yes.onclick = () => { sfx.click(); onSuccess('club'); };
    wrap.append(yes, backBtnRow());
    content.append(wrap);
  }

  // ---------- mode picker ----------

  function showModes() {
    clear(content);
    content.append(modeCard('🧑\u200d🤝\u200d🧑', 'Grown-Up Check', 'Always works — no mic, no internet.', showGrownUpIntro));

    const recordSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    if (recordSupported) {
      content.append(modeCard('🎙️', 'Record & Hear Yourself', 'Say it, then listen back.', showRecordStart));
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      content.append(modeCard('🪄', 'Magic Ears', 'Needs internet on most devices.', () => showMagicEars(SR)));
    }

    content.append(modeCard('🏠', 'Said It at Club!', 'Did you say it to your leader?', showClub));
  }

  showModes();

  return () => {
    for (const fn of cleanupFns) { try { fn(); } catch { /* already torn down */ } }
  };
}
