// First-Letter Trail — the classic whiteboard bridge from supported to free
// verbatim recall. Verse words are stepping stones climbing a mountain trail
// to a summit flag. The kid says each word out loud and taps its stone (in
// order — a hiker hops along as they go); the same trail is climbed three
// times, fading a little more each pass:
//
//   Pass 1  📖 Read the trail   — stones show the full word.
//   Pass 2  🔤 First letters    — stones collapse to fadeWord(word, 1).
//   Pass 3  ⛰️ Bare stones      — stones show nothing; only the reference
//                                 sign at the trailhead has any text. The
//                                 last stone unlocks the summit flag — a
//                                 final tap there ("I said the reference!")
//                                 finishes the climb.
//
// Passes 2 and 3 support peeking: tap-and-hold a stone (~350ms) or tap its
// small 👀 corner button to flash the full word for 1.5s (counts toward
// `peeks`, which sets the star rating). Book-list verses (isList) have no
// reference, so they skip the trailhead sign and the summit-flag step
// entirely — the climb just ends the moment the last stone is tapped.
//
// Encore (ctx.hard): the climb starts on pass 2 (first letters) and peeking
// is locked on pass 3 (bare stones) — a locked stone's 👀 corner shows 🔒
// and wiggles instead of revealing, same convention as Disappearing Verse's
// no-peek round.

import { fadeWord } from '../lib/engine.js';

export default {
  id: 'firstletter',
  title: 'First-Letter Trail',
  icon: '🔤',
  tagline: 'Climb the mountain, one letter-clue at a time!',
  howTo: 'Say each word out loud, then tap its stone to hop the hiker onto it — in order, from the trailhead all the way to the summit! Stones fade to first letters, then go bare. Hold a stone (or tap its 👀) to peek. At the top, say the reference and tap the flag!',
  group: false,

  mount(stage, ctx) {
    const { el, clear, sfx } = ctx;

    let dead = false;
    const timers = new Set();
    function later(fn, ms) {
      const t = setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms);
      timers.add(t);
      return t;
    }
    function cancelLater(t) {
      if (t == null) return;
      clearTimeout(t);
      timers.delete(t);
    }
    function rewiggle(node) {
      node.classList.remove('wrong');
      void node.offsetWidth; // restart the animation
      node.classList.add('wrong');
    }

    ctx.addStyle(`
      .g-firstletter { display: flex; flex-direction: column; min-height: 420px; }
      .g-firstletter .dots { text-align: center; font-size: 1.3rem; margin-bottom: 2px; }
      .g-firstletter .dots span { display: inline-block; margin: 0 4px; opacity: 0.25; transition: transform 0.2s ease, opacity 0.2s ease; }
      .g-firstletter .dots span.done { opacity: 0.65; }
      .g-firstletter .dots span.now { opacity: 1; transform: scale(1.3); animation: floaty 2.2s ease-in-out infinite; }
      .g-firstletter .prompt { text-align: center; font-weight: bold; font-size: 1.12rem; margin: 4px 0 10px; min-height: 2.6em; }
      .g-firstletter .trailhead { text-align: center; font-family: var(--display); font-weight: 700; background: var(--cream); color: var(--slate); border-radius: 12px; padding: 6px 10px; margin: 0 0 10px; }
      .g-firstletter .trail-wrap {
        background: linear-gradient(180deg, #cdeaff 0%, #eafbe0 60%, #f4ecd8 100%);
        border: 2px solid var(--sky);
        border-radius: 18px;
        overflow-x: auto;
        overflow-y: hidden;
        padding: 28px 14px 30px;
        margin-bottom: 10px;
        /* absorb the card's spare height so the scene fills the stage
           instead of leaving a dead gap above the footer */
        flex: 1;
        display: flex;
        align-items: center;
      }
      .g-firstletter .trail { display: flex; align-items: center; gap: 6px; width: max-content; min-width: 100%; }
      .g-firstletter .stone-wrap { position: relative; flex: 0 0 auto; }
      .g-firstletter .stone {
        display: inline-flex; align-items: center; justify-content: center;
        min-height: 52px; min-width: 56px; padding: 8px 14px;
        border-radius: 50% 50% 46% 46% / 60% 60% 40% 40%;
        background: linear-gradient(180deg, #f3e6cf 0%, #d9c49f 100%);
        border: 2px solid #b89a6a;
        font-family: var(--display); font-size: 1.1rem; font-weight: 600; color: var(--slate);
        box-shadow: 0 2px 6px rgba(51, 63, 72, 0.18);
        white-space: nowrap; transition: transform 0.08s ease;
      }
      .g-firstletter .stone:active:not(:disabled) { transform: translateY(3px); box-shadow: none; }
      .g-firstletter .stone.done { background: var(--green-soft, #d3f2d9); border-color: var(--green, #2a9d3f); animation: pop-in 0.25s ease; cursor: default; }
      .g-firstletter .stone.wrong { animation: wiggle 0.35s ease; background: var(--red-soft, #ffd6d9); border-color: var(--red, #e63946); }
      .g-firstletter .stone.peek { background: var(--cream); border-color: var(--yellow); animation: pop-in 0.2s ease; }
      .g-firstletter .stone.bare { font-size: 1.4rem; }
      .g-firstletter .peek-btn {
        position: absolute; top: -10px; right: -8px;
        min-height: 30px; min-width: 30px; border-radius: 50%;
        background: #fff; box-shadow: var(--shadow);
        font-size: 0.95rem; display: flex; align-items: center; justify-content: center;
      }
      .g-firstletter .camp { flex: 0 0 auto; text-align: center; font-size: 1.5rem; opacity: 0.8; padding: 0 4px; }
      .g-firstletter .hiker { flex: 0 0 auto; font-size: 1.8rem; padding: 0 2px; animation: floaty 1.6s ease-in-out infinite; }
      .g-firstletter .flag {
        flex: 0 0 auto; min-height: 60px; min-width: 60px; margin-left: 6px;
        border-radius: 16px; font-size: 1.6rem; background: rgba(62, 75, 84, 0.08); opacity: 0.5;
        border: 2px dashed rgba(62, 75, 84, 0.3); white-space: nowrap; padding: 8px 10px;
      }
      .g-firstletter .flag.active {
        opacity: 1; background: var(--cream); border: 2px solid var(--yellow);
        font-family: var(--display); font-size: 1rem; font-weight: 700; animation: fl-flag-pulse 1.1s ease-in-out infinite;
        cursor: pointer;
      }
      @keyframes fl-flag-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
      .g-firstletter .footer { margin-top: auto; text-align: center; padding-top: 6px; }
      .g-firstletter .peek-chip { display: inline-block; background: var(--paper); border-radius: 999px; padding: 6px 14px; font-family: var(--display); font-weight: 700; box-shadow: var(--shadow); font-size: 0.95rem; }
      @media (max-width: 420px) {
        .g-firstletter .stone { min-width: 48px; padding: 7px 11px; font-size: 1rem; }
        .g-firstletter .hiker { font-size: 1.5rem; }
      }
    `);

    const words = ctx.verse.words;
    const n = words.length;
    const isList = ctx.verse.isList;
    const hasRef = !isList;
    const legs = ctx.chunk(words, 10); // purely visual "camp" breaks — a leg is ~10 stones

    const root = el('div', 'g-firstletter');
    stage.appendChild(root);

    const PHASE_META = [
      { icon: '📖', label: 'Read the trail' },
      { icon: '🔤', label: 'First letters' },
      { icon: '⛰️', label: 'Bare stones' },
    ];
    const phaseList = ctx.hard ? [1, 2] : [0, 1, 2];
    let phasePos = 0;

    let peeks = 0;
    let finished = false;
    let peekChipEl = null;
    function updatePeekChip() {
      if (peekChipEl) peekChipEl.textContent = `👀 Peeks: ${peeks}`;
    }

    function promptFor(phase, allDone) {
      if (phase === 0) return '📖 Read the trail — say each word, then tap its stone!';
      if (phase === 1) return '🔤 First letters — say the whole word, then tap its stone!';
      // phase 2
      if (allDone && hasRef) return '🚩 Now say the reference — then tap the flag!';
      if (isList) return '⛰️ Bare stones — say each book from memory, stone by stone!';
      return '⛰️ Bare stones — say the whole verse from memory, stone by stone!';
    }

    function renderPhase(phase) {
      clear(root);
      const locked = ctx.hard && phase === 2;
      let nextIdx = 0;

      const dots = el('div', 'dots');
      phaseList.forEach((p, i) => {
        const dot = el('span', i < phasePos ? 'done' : i === phasePos ? 'now' : '', PHASE_META[p].icon);
        dot.title = PHASE_META[p].label;
        dots.appendChild(dot);
      });
      root.appendChild(dots);

      const promptEl = el('div', 'prompt', promptFor(phase, false));
      root.appendChild(promptEl);

      if (hasRef) {
        root.appendChild(el('div', 'trailhead', `🚩 Trailhead: ${ctx.verse.label}`));
      }

      const wrap = el('div', 'trail-wrap');
      const trail = el('div', 'trail');
      wrap.appendChild(trail);
      root.appendChild(wrap);

      const footer = el('div', 'footer');
      peekChipEl = el('div', 'peek-chip');
      updatePeekChip();
      footer.appendChild(peekChipEl);
      root.appendChild(footer);

      // ---- build the stones (and camp markers between legs) ----
      const stones = [];
      legs.forEach((leg, li) => {
        if (li > 0) trail.appendChild(el('div', 'camp', '🏕️'));
        leg.forEach((word) => {
          const idx = stones.length;
          const stoneWrap = el('div', 'stone-wrap');
          stoneWrap.style.transform = `translateY(${Math.round(Math.sin(idx * 0.8) * 12)}px)`;
          const blankGlyph = phase === 2 ? '🪨' : fadeWord(word, phase);
          const tapEl = el('button', 'stone' + (phase === 2 ? ' bare' : ''), phase === 0 ? word : blankGlyph);
          tapEl.type = 'button';
          tapEl.dataset.word = word;
          stoneWrap.appendChild(tapEl);

          let peekBtn = null;
          if (phase >= 1) {
            peekBtn = el('button', 'peek-btn', locked ? '🔒' : '👀');
            peekBtn.type = 'button';
            peekBtn.setAttribute('aria-label', 'Peek at this word');
            stoneWrap.appendChild(peekBtn);
          }

          const s = { wrap: stoneWrap, tapEl, peekBtn, word, blankGlyph, done: false, peeking: false };
          stones.push(s);
          trail.appendChild(stoneWrap);

          let pressTimer = null;
          let longPressed = false;
          function doPeek() {
            if (dead || s.done || s.peeking) return;
            if (locked) { sfx.wrong(); rewiggle(tapEl); if (peekBtn) rewiggle(peekBtn); return; }
            s.peeking = true;
            peeks++;
            updatePeekChip();
            sfx.click();
            tapEl.textContent = word;
            tapEl.classList.add('peek');
            later(() => {
              if (s.done) return;
              s.peeking = false;
              tapEl.textContent = s.blankGlyph;
              tapEl.classList.remove('peek');
            }, 1500);
          }
          if (phase >= 1) {
            tapEl.addEventListener('pointerdown', () => {
              longPressed = false;
              pressTimer = later(() => { longPressed = true; doPeek(); }, 350);
            });
            const cancelPress = () => cancelLater(pressTimer);
            tapEl.addEventListener('pointerup', cancelPress);
            tapEl.addEventListener('pointerleave', cancelPress);
            tapEl.addEventListener('pointercancel', cancelPress);
            peekBtn.onclick = (e) => { e.stopPropagation(); doPeek(); };
          }
          tapEl.onclick = () => {
            if (dead) return;
            if (longPressed) { longPressed = false; return; }
            attemptAdvance(idx);
          };
        });
      });

      let flagEl = null;
      if (hasRef) {
        flagEl = el('button', 'flag', '🏔️🚩');
        flagEl.type = 'button';
        flagEl.disabled = true;
        trail.appendChild(flagEl);
      }

      let hikerEl = null;
      function placeHiker(i) {
        if (hikerEl) hikerEl.remove();
        hikerEl = el('span', 'hiker', '🧗');
        if (i >= stones.length) trail.insertBefore(hikerEl, flagEl || null);
        else trail.insertBefore(hikerEl, stones[i].wrap);
        const scrollTarget = stones[Math.min(i, stones.length - 1)]?.wrap || hikerEl;
        scrollTarget.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
      placeHiker(0);

      function attemptAdvance(idx) {
        const s = stones[idx];
        if (idx !== nextIdx) {
          sfx.wrong();
          rewiggle(s.tapEl);
          return;
        }
        sfx.pop();
        s.done = true;
        s.tapEl.disabled = true;
        s.tapEl.textContent = s.word;
        s.tapEl.classList.remove('bare', 'peek');
        s.tapEl.classList.add('done');
        if (s.peekBtn) { s.peekBtn.remove(); s.peekBtn = null; }
        nextIdx++;
        placeHiker(nextIdx);
        if (nextIdx === n) onTrailDone();
      }

      function onTrailDone() {
        const isFinal = phasePos === phaseList.length - 1;
        if (!isFinal) {
          later(() => { phasePos++; renderPhase(phaseList[phasePos]); }, 700);
          return;
        }
        if (!hasRef) { finish(); return; }
        promptEl.textContent = promptFor(phase, true);
        flagEl.disabled = false;
        flagEl.classList.add('active');
        flagEl.textContent = '🚩 I said the reference!';
        flagEl.onclick = () => { if (dead) return; finish(); };
        flagEl.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    }

    function finish() {
      if (finished || dead) return;
      finished = true;
      ctx.confetti();
      const stars = peeks <= 1 ? 3 : peeks <= 4 ? 2 : 1;
      later(() => ctx.win({
        stars, peeks, supportLevel: 2, message: 'You climbed the whole mountain!',
      }), 700);
    }

    ctx.speak();
    renderPhase(phaseList[phasePos]);

    return () => {
      dead = true;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
