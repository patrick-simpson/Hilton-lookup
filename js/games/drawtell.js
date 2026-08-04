// Draw & Tell — dual-coding recall: the kid pairs each phrase with a picture
// they pick (or draw) themselves, then uses ONLY the pictures to say the
// verse back. Pairing a phrase with a self-chosen image gives memory a
// second route back in (dual coding); recalling from picture cues alone —
// no words on screen — is real retrieval. This is WingRunner's Stage-3
// (Recall) alternative to Disappearing Verse (see plans.html §6.3).
//
// Three steps:
//   1. Picture it!    — one phrase at a time: kid taps 1 of 4 candidate
//                        emoji "that reminds you of it" (no wrong answers —
//                        their choice IS the encoding), or draws their own
//                        cue on a little finger-canvas. Drawings persist per
//                        verse (js/lib/progress.js getDrawings/setDrawings)
//                        and are offered again ("Use my drawing from last
//                        time!") on a later play.
//   2. Tell it back!  — only the chosen cues remain, in verse order. Kid
//                        recites from the picture, then taps "I said it!" to
//                        reveal + hear the phrase (self-check, no penalty).
//                        A small 👀 button previews the text first — that
//                        one counts as a peek.
//   3. Shuffle & tell! — cues shuffle; kid taps them back into verse order
//                        (mistakes wiggle, never fail), then recites the
//                        whole verse from the ordered pictures + reference.
//
// supportLevel is always 1 for the win call: picture-cued recall (no verse
// text ever shown until self-checked) is inherently faded practice, so a
// clean run earns Stage-2 ("recalled it") credit same as the fading guide.

import { getDrawings, setDrawings } from '../lib/progress.js';

// Keyword → emoji cue map. Scanned against each phrase's cleaned words so
// the 4 candidates offered are relevant when possible, topped up from a
// generic pool so there are always exactly 4 distinct choices.
const KEYWORD_EMOJI = {
  god: '✨', lord: '👑', jesus: '✝️', christ: '✝️',
  love: '❤️', loved: '❤️', loves: '❤️', loving: '❤️',
  world: '🌍', earth: '🌍',
  believe: '🙏', believes: '🙏', believed: '🙏', believing: '🙏', faith: '🙏',
  life: '🌱', living: '🌱', lives: '🌱', eternal: '♾️', everlasting: '♾️',
  word: '📖', words: '📖', bible: '📖', scripture: '📖',
  sin: '🌑', sins: '🌑', sinned: '🌑', darkness: '🌑',
  light: '💡',
  shepherd: '🐑', sheep: '🐑', flock: '🐑',
  king: '👑', kings: '👑', kingdom: '👑',
  heart: '💗', hearts: '💗',
  pray: '🙏', prayer: '🙏', praying: '🙏', prayed: '🙏',
  heaven: '☁️', heavens: '☁️',
  son: '👦', sons: '👦', child: '🧒', children: '🧒',
  gift: '🎁', gave: '🎁', give: '🎁', given: '🎁',
  way: '🛤️', ways: '🛤️', path: '🛤️',
  truth: '⭐', true: '⭐',
  books: '📚', book: '📚',
  water: '🌊', sea: '🌊',
  bread: '🍞',
  fire: '🔥',
  friend: '🤝', friends: '🤝',
  strong: '💪', strength: '💪',
  peace: '🕊️', spirit: '🕊️', holy: '🕊️',
  joy: '😊', glad: '😊', rejoice: '😊',
  good: '👍', obey: '👍', obeyed: '👍',
  save: '🛟', saved: '🛟', savior: '🛟', saves: '🛟',
  follow: '👣', followed: '👣',
  trust: '🤝', trusted: '🤝',
  mother: '👩', father: '👨', parents: '👨',
  house: '🏠', home: '🏠',
  door: '🚪', gate: '🚪',
  mountain: '⛰️', mountains: '⛰️', hill: '⛰️',
  rock: '🪨', stone: '🪨',
  star: '⭐', stars: '⭐',
  sun: '☀️', day: '☀️',
  moon: '🌙', night: '🌙',
  tree: '🌳', trees: '🌳',
  seed: '🌱', grow: '🌱',
  glory: '✨', name: '🏷️',
  new: '🌟', grace: '🎁', mercy: '💗',
};
const GENERIC_POOL = ['🌈', '⛰️', '🌊', '🔥', '🕊️', '🌟', '🍞', '🚪', '🏠', '🌳'];
const CRAYON_COLORS = ['#e63946', '#ffb703', '#2a9d3f', '#2274d0', '#9d4edd', '#5c3a21'];

// Split the verse into 2-5 phrase chunks (~5-6 words each), growing the
// chunk size until long verses fit within the cap. Book-list "verses" are
// grouped 3 book names at a time.
function computePhrases(ctx) {
  const words = ctx.verse.words;
  if (ctx.verse.isList) return ctx.chunk(words, 3);
  let size = ctx.hard ? 7 : 6;
  let phrases = ctx.chunk(words, size);
  while (phrases.length > 5 && size < words.length) {
    size += 1;
    phrases = ctx.chunk(words, size);
  }
  return phrases;
}

// Downscale a canvas to a small JPEG data URL — kept tiny so drawings for a
// whole handbook fit comfortably in localStorage.
function downscaleDataURL(canvas, maxSize = 128, maxBytes = 20000) {
  const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
  const w = Math.max(1, Math.round(canvas.width * scale));
  const h = Math.max(1, Math.round(canvas.height * scale));
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const octx = off.getContext('2d');
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, w, h);
  octx.drawImage(canvas, 0, 0, w, h);
  let quality = 0.85;
  let url = off.toDataURL('image/jpeg', quality);
  while (url.length > maxBytes * 1.37 && quality > 0.35) {
    quality -= 0.15;
    url = off.toDataURL('image/jpeg', quality);
  }
  return url;
}

export default {
  id: 'drawtell',
  title: 'Draw & Tell',
  icon: '🎨',
  tagline: 'Pick a picture for each part, then tell the verse!',
  howTo: 'Pick (or draw!) a little picture for each part of the verse. Then say each part out loud from its picture, put the pictures back in order, and tell the whole verse!',
  group: false,

  mount(stage, ctx) {
    const {
      el, clear, sfx, shuffle, cleanWord,
    } = ctx;

    const timers = new Set();
    function later(fn, ms) {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    }

    ctx.addStyle(`
      .g-drawtell { display: flex; flex-direction: column; min-height: 420px; }
      .g-drawtell .step-title { text-align: center; font-weight: bold; font-size: 1.2rem; margin: 2px 0 8px; }
      .g-drawtell .progress-dots { text-align: center; font-size: 1.1rem; margin-bottom: 6px; letter-spacing: 4px; }
      .g-drawtell .phrase-box { background: #fff7df; border-radius: 16px; padding: 14px; text-align: center; font-size: 1.25rem; font-weight: bold; margin-bottom: 10px; }
      .g-drawtell .mode-toggle { text-align: center; margin-bottom: 10px; }
      .g-drawtell .emoji-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 10px; }
      .g-drawtell .emoji-opt { min-width: 70px; min-height: 70px; font-size: 2.2rem; background: var(--paper); border-radius: 18px; box-shadow: var(--shadow); border: 3px solid transparent; }
      .g-drawtell .emoji-opt:active { transform: translateY(3px); box-shadow: none; }
      .g-drawtell .emoji-opt.wrong { animation: wiggle 0.35s ease; background: var(--red-soft); }
      .g-drawtell .reuse-banner { display: flex; align-items: center; gap: 10px; justify-content: center; flex-wrap: wrap; background: #eaf7ff; border-radius: 16px; padding: 8px; margin-bottom: 10px; }
      .g-drawtell .reuse-banner img { width: 56px; height: 56px; object-fit: cover; border-radius: 12px; border: 3px solid var(--blue-soft); background: #fff; }
      .g-drawtell .canvas-wrap { text-align: center; margin-bottom: 8px; }
      .g-drawtell canvas { width: 100%; max-width: 320px; height: 220px; touch-action: none; border-radius: 16px; background: #fff; border: 3px dashed var(--purple); }
      .g-drawtell .palette { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 8px; margin-bottom: 10px; }
      .g-drawtell .swatch { width: 52px; height: 52px; border-radius: 50%; border: 3px solid transparent; padding: 0; }
      .g-drawtell .swatch.active { border-color: var(--ink); transform: scale(1.1); }
      .g-drawtell .confirm-btn { width: 100%; }
      .g-drawtell .cue-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; margin-bottom: 10px; }
      .g-drawtell .cue-card { background: #f4f8ff; border-radius: 16px; padding: 10px; text-align: center; width: 128px; }
      .g-drawtell .cue-visual { font-size: 2.4rem; margin-bottom: 6px; min-height: 56px; display: flex; align-items: center; justify-content: center; }
      .g-drawtell .cue-visual img { width: 64px; height: 64px; object-fit: cover; border-radius: 12px; }
      .g-drawtell .cue-text { font-weight: bold; min-height: 1.4em; margin: 6px 0; font-size: 0.95rem; }
      .g-drawtell .cue-text.hidden-text { visibility: hidden; }
      .g-drawtell .peek-btn { font-size: 1.1rem; min-height: 44px; min-width: 44px; padding: 4px 8px; margin-bottom: 4px; }
      .g-drawtell .confirm-btn.done { background: var(--green-soft); color: var(--ink); }
      .g-drawtell .slots { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 10px; }
      .g-drawtell .slot { width: 70px; height: 70px; border-radius: 16px; border: 3px dashed var(--blue-soft); display: flex; align-items: center; justify-content: center; font-size: 2rem; background: #fff; }
      .g-drawtell .slot img { width: 56px; height: 56px; object-fit: cover; border-radius: 12px; }
      .g-drawtell .slot.filled { border-style: solid; border-color: var(--green); background: var(--green-soft); animation: pop-in 0.25s ease; }
      .g-drawtell .pool { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-bottom: 10px; }
      .g-drawtell .hint-line { text-align: center; font-weight: bold; opacity: 0.8; margin-bottom: 8px; }
      .g-drawtell .ref-row { text-align: center; margin: 8px 0; }
      .g-drawtell .finish-row { text-align: center; margin-top: auto; padding-top: 10px; }
    `);

    const verse = ctx.verse;
    const isList = verse.isList;
    const phrases = computePhrases(ctx);

    let peeks = 0;
    let mistakes = 0;
    const cues = new Array(phrases.length).fill(null);

    const root = el('div', 'g-drawtell');
    stage.appendChild(root);

    ctx.speak(); // read the whole verse once on mount, per house rules

    function rewiggle(node) {
      node.classList.remove('wrong');
      void node.offsetWidth; // restart the animation
      node.classList.add('wrong');
    }

    function makeImg(src) {
      const img = el('img');
      img.src = src;
      img.alt = 'drawing';
      return img;
    }

    function fillCueVisual(node, cue) {
      clear(node);
      if (!cue) return;
      if (cue.type === 'emoji') node.textContent = cue.value;
      else node.appendChild(makeImg(cue.value));
    }

    // Persist any drawings from this play (nulls for phrases that used an
    // emoji) so a later play can offer "use my drawing from last time".
    // Storage may be unavailable/full — fail silently, the play itself
    // never depends on the write succeeding.
    function persistDrawings() {
      try {
        setDrawings(verse.key, cues.map((c) => (c && c.type === 'drawing' ? c.value : null)));
      } catch {
        // quota / private-mode — drawings still work for this play.
      }
    }

    // Pick 4 distinct candidate emoji for a phrase: keyword hits first (in
    // word order), topped up from the generic pool. No "correct" answer —
    // any pick is accepted.
    function candidatesFor(phraseWords) {
      const hits = [];
      for (const w of phraseWords) {
        const emoji = KEYWORD_EMOJI[cleanWord(w)];
        if (emoji && !hits.includes(emoji)) hits.push(emoji);
        if (hits.length === 4) break;
      }
      const pool = shuffle(GENERIC_POOL.filter((e) => !hits.includes(e)));
      let i = 0;
      while (hits.length < 4 && i < pool.length) hits.push(pool[i++]);
      return shuffle(hits);
    }

    // ---------- Step 1: Picture it! ----------

    function stepPicture() {
      let i = 0;
      const existingDrawings = getDrawings(verse.key);
      let drawMode = false;

      // Canvas state for the current phrase's draw panel (rebuilt each render).
      let canvasEl = null;
      let canvasCtx = null;
      let hasStrokes = false;
      let currentColor = CRAYON_COLORS[0];
      let drawing = false;
      let confirmBtn = null;
      let onPointerDown = null;
      let onPointerMove = null;
      let onPointerUp = null;

      function detachCanvas() {
        if (canvasEl && onPointerDown) {
          canvasEl.removeEventListener('pointerdown', onPointerDown);
          canvasEl.removeEventListener('pointermove', onPointerMove);
          canvasEl.removeEventListener('pointerup', onPointerUp);
          canvasEl.removeEventListener('pointerleave', onPointerUp);
        }
        canvasEl = null;
        canvasCtx = null;
        onPointerDown = onPointerMove = onPointerUp = null;
      }

      function speakPhrase(idx) {
        ctx.speak(phrases[idx].join(' '));
      }

      function render() {
        detachCanvas();
        clear(root);
        hasStrokes = false;

        const dots = phrases.map((_, idx) => (idx < i ? '🟢' : idx === i ? '🔵' : '⚪')).join(' ');
        root.appendChild(el('div', 'progress-dots', dots));
        root.appendChild(el('div', 'step-title', `🎨 Picture it! (${i + 1}/${phrases.length})`));
        root.appendChild(el('div', 'phrase-box', phrases[i].join(' ')));

        const toggleRow = el('div', 'mode-toggle');
        const toggleBtn = el('button', 'btn', drawMode ? '😀 Pick a picture instead!' : '✏️ Draw it instead!');
        toggleBtn.onclick = () => { sfx.click(); drawMode = !drawMode; render(); };
        toggleRow.appendChild(toggleBtn);
        root.appendChild(toggleRow);

        if (!drawMode) {
          if (existingDrawings[i]) {
            const banner = el('div', 'reuse-banner');
            banner.append(makeImg(existingDrawings[i]));
            const useBtn = el('button', 'btn btn-blue', '🖼️ Use my drawing from last time!');
            useBtn.onclick = () => { sfx.pop(); chooseCue({ type: 'drawing', value: existingDrawings[i] }); };
            banner.append(useBtn);
            root.appendChild(banner);
          }
          const grid = el('div', 'emoji-grid');
          for (const emoji of candidatesFor(phrases[i])) {
            const btn = el('button', 'emoji-opt', emoji);
            btn.onclick = () => { sfx.pop(); chooseCue({ type: 'emoji', value: emoji }); };
            grid.appendChild(btn);
          }
          root.appendChild(grid);
        } else {
          const wrap = el('div', 'canvas-wrap');
          canvasEl = el('canvas');
          canvasEl.width = 256;
          canvasEl.height = 192;
          canvasCtx = canvasEl.getContext('2d');
          canvasCtx.fillStyle = '#ffffff';
          canvasCtx.fillRect(0, 0, canvasEl.width, canvasEl.height);
          canvasCtx.lineWidth = 12;
          canvasCtx.lineCap = 'round';
          canvasCtx.lineJoin = 'round';
          canvasCtx.strokeStyle = currentColor;
          wrap.appendChild(canvasEl);
          root.appendChild(wrap);

          const palette = el('div', 'palette');
          const swatches = [];
          for (const c of CRAYON_COLORS) {
            const sw = el('button', 'swatch' + (c === currentColor ? ' active' : ''));
            sw.style.background = c;
            sw.onclick = () => {
              currentColor = c;
              canvasCtx.strokeStyle = c;
              swatches.forEach((s) => s.classList.remove('active'));
              sw.classList.add('active');
            };
            swatches.push(sw);
            palette.appendChild(sw);
          }
          const clearBtn = el('button', 'btn', '🧹 Clear');
          clearBtn.onclick = () => {
            sfx.click();
            canvasCtx.fillStyle = '#ffffff';
            canvasCtx.fillRect(0, 0, canvasEl.width, canvasEl.height);
            hasStrokes = false;
            confirmBtn.disabled = true;
          };
          palette.appendChild(clearBtn);
          root.appendChild(palette);

          confirmBtn = el('button', 'btn btn-green confirm-btn', '✅ Use my drawing!');
          confirmBtn.disabled = true;
          confirmBtn.onclick = () => {
            sfx.pop();
            chooseCue({ type: 'drawing', value: downscaleDataURL(canvasEl) });
          };
          root.appendChild(confirmBtn);

          function posFromEvent(e) {
            const r = canvasEl.getBoundingClientRect();
            return {
              x: (e.clientX - r.left) * (canvasEl.width / r.width),
              y: (e.clientY - r.top) * (canvasEl.height / r.height),
            };
          }
          onPointerDown = (e) => {
            e.preventDefault();
            drawing = true;
            hasStrokes = true;
            confirmBtn.disabled = false;
            const p = posFromEvent(e);
            canvasCtx.beginPath();
            canvasCtx.moveTo(p.x, p.y);
          };
          onPointerMove = (e) => {
            if (!drawing) return;
            e.preventDefault();
            const p = posFromEvent(e);
            canvasCtx.lineTo(p.x, p.y);
            canvasCtx.stroke();
          };
          onPointerUp = () => { drawing = false; };
          canvasEl.addEventListener('pointerdown', onPointerDown);
          canvasEl.addEventListener('pointermove', onPointerMove);
          canvasEl.addEventListener('pointerup', onPointerUp);
          canvasEl.addEventListener('pointerleave', onPointerUp);
        }
      }

      function chooseCue(cue) {
        cues[i] = cue;
        i++;
        if (i >= phrases.length) {
          detachCanvas();
          persistDrawings();
          stepTellBack();
        } else {
          drawMode = false;
          render();
          speakPhrase(i);
        }
      }

      render();
      speakPhrase(0);
    }

    // ---------- Step 2: Tell it back! ----------

    function stepTellBack() {
      clear(root);
      root.appendChild(el('div', 'step-title', '🗣️ Tell it back!'));
      root.appendChild(el('div', 'hint-line', 'Say each part out loud, then tap ✓!'));

      const row = el('div', 'cue-row');
      let doneCount = 0;
      const nextBtn = el('button', 'btn btn-big btn-blue', '🔀 Next: Shuffle & tell!');
      nextBtn.style.display = 'none';
      nextBtn.onclick = () => { sfx.click(); stepShuffle(); };

      phrases.forEach((p, idx) => {
        const card = el('div', 'cue-card');
        const peekBtn = el('button', 'btn peek-btn', '👀');
        const visual = el('div', 'cue-visual');
        fillCueVisual(visual, cues[idx]);
        const textEl = el('div', 'cue-text hidden-text', p.join(' '));
        const confirmBtn = el('button', 'btn btn-green confirm-btn', '✓ I said it!');
        let done = false;
        let hideTimer = null;

        peekBtn.onclick = () => {
          if (done) return;
          peeks++;
          sfx.click();
          textEl.classList.remove('hidden-text');
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = later(() => { if (!done) textEl.classList.add('hidden-text'); }, 1500);
        };
        confirmBtn.onclick = () => {
          if (done) return;
          done = true;
          if (hideTimer) clearTimeout(hideTimer);
          textEl.classList.remove('hidden-text');
          ctx.speak(p.join(' '));
          confirmBtn.disabled = true;
          confirmBtn.classList.add('done');
          confirmBtn.textContent = '✅ Said it!';
          peekBtn.disabled = true;
          sfx.correct();
          doneCount++;
          if (doneCount === phrases.length) nextBtn.style.display = '';
        };

        card.append(peekBtn, visual, textEl, confirmBtn);
        row.appendChild(card);
      });

      root.appendChild(row);
      const footer = el('div', 'finish-row');
      footer.appendChild(nextBtn);
      root.appendChild(footer);
    }

    // ---------- Step 3: Shuffle & tell! ----------

    function stepShuffle() {
      clear(root);
      root.appendChild(el('div', 'step-title', '🔀 Shuffle & tell!'));

      if (phrases.length <= 1) { renderRecite(); return; }

      root.appendChild(el('div', 'hint-line', 'Tap the pictures back in order!'));
      const slotsEl = el('div', 'slots');
      const slotNodes = phrases.map(() => {
        const s = el('div', 'slot', '❔');
        slotsEl.appendChild(s);
        return s;
      });
      root.appendChild(slotsEl);

      const poolEl = el('div', 'pool');
      let nextExpected = 0;
      const order = shuffle(phrases.map((_, idx) => idx));
      order.forEach((phraseIdx) => {
        const cue = cues[phraseIdx];
        const btn = el('button', 'emoji-opt');
        fillCueVisual(btn, cue);
        // Not shown to the kid — just lets a test driver find the correct
        // next tile without guessing, same convention as data-word on the
        // fading builder games (scramble/train/rocket/stones/hopscotch).
        btn.dataset.phraseIdx = phraseIdx;
        btn.onclick = () => {
          if (phraseIdx === nextExpected) {
            sfx.correct();
            fillCueVisual(slotNodes[nextExpected], cue);
            slotNodes[nextExpected].classList.add('filled');
            btn.remove();
            nextExpected++;
            if (nextExpected === phrases.length) later(renderRecite, 300);
          } else {
            sfx.wrong();
            mistakes++;
            rewiggle(btn);
          }
        };
        poolEl.appendChild(btn);
      });
      root.appendChild(poolEl);
    }

    function renderRecite() {
      clear(root);
      root.appendChild(el('div', 'step-title', '🌟 Tell the whole verse!'));
      root.appendChild(el('div', 'hint-line', 'Say it all, from your pictures!'));

      const row = el('div', 'cue-row');
      phrases.forEach((p, idx) => {
        const card = el('div', 'cue-card');
        const visual = el('div', 'cue-visual');
        fillCueVisual(visual, cues[idx]);
        card.appendChild(visual);
        row.appendChild(card);
      });
      root.appendChild(row);

      if (!isList) {
        const refRow = el('div', 'ref-row');
        const refChip = el('button', 'chip', '🔖 ' + verse.label);
        refChip.onclick = () => { sfx.click(); ctx.speak(verse.label); };
        refRow.appendChild(refChip);
        root.appendChild(refRow);
      }

      const footer = el('div', 'finish-row');
      const finishBtn = el('button', 'btn btn-big btn-green', '🌟 I told the whole thing!');
      finishBtn.onclick = () => { sfx.click(); finish(); };
      footer.appendChild(finishBtn);
      root.appendChild(footer);
    }

    function finish() {
      ctx.confetti();
      const total = peeks + mistakes;
      const stars = total <= 1 ? 3 : total <= 4 ? 2 : 1;
      later(() => ctx.win({
        stars, peeks, mistakes, supportLevel: 1, message: 'Your pictures told the story!',
      }), 700);
    }

    stepPicture();

    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
