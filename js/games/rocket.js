// Rocket Launch — load fuel cells (verse words) in order to fill the tank,
// then count down 3..2..1 and BLAST OFF! Long verses fuel up stage-by-stage
// (one gauge segment per stage). Hard mode mixes in decoy fuel cells.
//
// Fading support: the stage message doubles as a ctx.guide strip of the
// current stage's words. At supportLevel >= 1 (hard/encore, or a later
// pass) fuel-cell buttons fade to first-letters — the full word is revealed
// on the cell as it flies into the rocket, the reward for the correct tap.
// Cells always carry data-word so test drivers can still match them.

import { supportLevelFor, fadeWord } from '../lib/engine.js';

export default {
  id: 'rocket',
  title: 'Rocket Launch',
  icon: '🚀',
  tagline: 'Load the fuel and blast off!',
  howTo: 'The rocket needs word fuel! Tap the fuel cells in verse order to fill the tank. When it is full, count down 3-2-1 and LIFT OFF!',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, cleanWord, sfx } = ctx;

    // ---- tracked timers so cleanup can stop everything ----
    let alive = true;
    const timers = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => { timers.delete(id); if (alive) fn(); }, ms);
      timers.add(id);
    };

    ctx.addStyle(`
      .g-rocket .hdr { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; }
      .g-rocket .msg { text-align: center; font-family: var(--display); font-weight: 700; font-size: 1.2rem; color: var(--slate); min-height: 1.4em; }
      .g-rocket .hear-btn { min-width: 52px; min-height: 52px; border-radius: 999px; background: var(--sky-soft); font-size: 1.4rem; box-shadow: var(--shadow); }
      .g-rocket .hear-btn:active { transform: translateY(3px); box-shadow: none; }

      .g-rocket .layout { display: flex; gap: 10px; align-items: stretch; }
      .g-rocket .layout.shaking { animation: g-rocket-shake 0.6s ease; }
      .g-rocket .pool { flex: 1; min-width: 0; text-align: center; }
      .g-rocket .pool .word-tile { background: var(--cream); border-color: var(--yellow); min-width: 52px; }

      .g-rocket .rocket-side { flex: none; display: flex; gap: 8px; align-items: flex-end; padding-bottom: 4px; }
      .g-rocket .gauge-col { display: flex; flex-direction: column; align-items: center; gap: 4px; }
      .g-rocket .gauge-emoji { font-size: 1.2rem; }
      .g-rocket .gauge { width: 28px; height: 230px; background: var(--sky-soft); border: 2px solid var(--sky); border-radius: 12px; display: flex; flex-direction: column-reverse; overflow: hidden; }
      .g-rocket .gauge .seg { position: relative; border-top: 2px dashed var(--sky); }
      .g-rocket .gauge .seg .fill { position: absolute; left: 0; right: 0; bottom: 0; height: 0%; background: linear-gradient(180deg, var(--yellow), var(--orange)); transition: height 0.3s ease; }
      .g-rocket .gauge .seg.full .fill { background: linear-gradient(180deg, var(--green-soft), var(--green)); }

      .g-rocket .rocket-wrap { position: relative; width: 96px; text-align: center; }
      .g-rocket .ship { position: relative; display: inline-block; line-height: 1; }
      .g-rocket .ship.gulp { animation: g-rocket-gulp 0.25s ease; }
      .g-rocket .ship.launch { animation: g-rocket-liftoff 1.5s ease-in forwards; }
      .g-rocket .rocket-emoji { display: inline-block; font-size: 3.6rem; transform: rotate(-45deg); }
      .g-rocket .flame { display: block; font-size: 2rem; margin-top: -8px; opacity: 0; }
      .g-rocket .ship.launch .flame { opacity: 1; animation: g-rocket-flicker 0.15s infinite alternate; }
      .g-rocket .pad { width: 84px; height: 12px; margin: 2px auto 0; background: var(--slate); border-radius: 6px; box-shadow: var(--shadow); }
      .g-rocket .smoke { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); font-size: 1.5rem; opacity: 0; white-space: nowrap; }
      .g-rocket .smoke.show { opacity: 1; animation: pop-in 0.35s ease; }

      .g-rocket .fly-cell { position: absolute; margin: 0; z-index: 20; pointer-events: none; background: var(--cream); border-color: var(--yellow); transition: transform 0.55s ease-in, opacity 0.55s ease-in; }

      .g-rocket .count-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 30; background: rgba(255, 255, 255, 0.6); pointer-events: none; }
      .g-rocket .count-overlay.clear-bg { background: transparent; }
      .g-rocket .count-num { font-family: var(--display); font-size: 6rem; font-weight: 800; color: var(--red); text-shadow: 0 3px 10px rgba(51, 63, 72, 0.25); animation: pop-in 0.3s ease; }
      .g-rocket .count-num.liftoff { font-size: 2.4rem; color: var(--blue); }

      @keyframes g-rocket-liftoff {
        0% { transform: translateY(0); }
        12% { transform: translateY(5px); }
        100% { transform: translateY(-120vh); }
      }
      @keyframes g-rocket-flicker { from { transform: scaleY(1); } to { transform: scaleY(1.5); } }
      @keyframes g-rocket-gulp { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.12); } }
      @keyframes g-rocket-shake {
        0%, 100% { transform: translate(0, 0); }
        20% { transform: translate(-4px, 2px); }
        40% { transform: translate(4px, -2px); }
        60% { transform: translate(-3px, -2px); }
        80% { transform: translate(3px, 2px); }
      }

      @media (max-width: 480px) {
        .g-rocket .layout { gap: 6px; }
        .g-rocket .pool .word-tile { padding: 8px 10px; margin: 4px 3px; font-size: 1.05rem; min-width: 44px; }
        .g-rocket .rocket-side { gap: 6px; }
        .g-rocket .gauge { height: 170px; width: 24px; }
        .g-rocket .rocket-emoji { font-size: 2.6rem; }
        .g-rocket .flame { font-size: 1.6rem; }
        .g-rocket .rocket-wrap { width: 60px; }
        .g-rocket .pad { width: 54px; }
      }
    `);

    // ---- state ----
    const chunkSize = ctx.verse.isList ? 7 : 10;
    const rounds = ctx.chunk(ctx.verse.words, chunkSize);
    const offsets = [];
    { let acc = 0; for (const r of rounds) { offsets.push(acc); acc += r.length; } }
    let roundIdx = 0;
    let inRound = 0;   // words loaded in the current stage
    let loaded = 0;    // words loaded overall
    let mistakes = 0;
    let locked = false;

    // ---- build DOM (root is NOT positioned so absolute bits anchor to the stage) ----
    const root = el('div', 'g-rocket');
    stage.appendChild(root);

    const hdr = el('div', 'hdr');
    const msg = el('div', 'msg');
    const hear = el('button', 'hear-btn', '🔊');
    hear.setAttribute('aria-label', 'Hear the verse');
    hear.onclick = () => { sfx.click(); ctx.speak(); };
    hdr.append(msg, hear);

    const layout = el('div', 'layout');
    const pool = el('div', 'pool');
    const side = el('div', 'rocket-side');

    const gaugeCol = el('div', 'gauge-col');
    gaugeCol.appendChild(el('div', 'gauge-emoji', '⛽'));
    const gauge = el('div', 'gauge');
    const segs = rounds.map((r) => {
      const seg = el('div', 'seg');
      seg.style.flexGrow = String(r.length); // segment height matches stage size
      const fill = el('div', 'fill');
      seg.appendChild(fill);
      gauge.appendChild(seg);
      return { seg, fill };
    });
    gaugeCol.appendChild(gauge);

    const wrap = el('div', 'rocket-wrap');
    const ship = el('div', 'ship');
    const rocketEmoji = el('span', 'rocket-emoji', '🚀');
    const flame = el('span', 'flame', '🔥');
    ship.append(rocketEmoji, flame);
    const pad = el('div', 'pad');
    const smoke = el('div', 'smoke', '☁️💨☁️');
    wrap.append(ship, pad, smoke);

    side.append(gaugeCol, wrap);
    layout.append(pool, side);
    const guideSlot = el('div', 'guide-slot');
    root.append(hdr, guideSlot, layout);
    let guide = null;

    ctx.speak();

    // ---- gameplay ----
    function updateGauge() {
      rounds.forEach((r, i) => {
        const done = Math.max(0, Math.min(r.length, loaded - offsets[i]));
        segs[i].fill.style.height = (done / r.length) * 100 + '%';
        segs[i].seg.classList.toggle('full', done === r.length);
      });
    }

    let level = 0;

    function buildPool() {
      clear(pool);
      msg.textContent = rounds.length > 1 ? `Stage ${roundIdx + 1} fuel!` : 'Load the fuel!';
      level = supportLevelFor(ctx.verse, 'rocket', ctx.hard);
      if (!guide) guide = ctx.guide(rounds[roundIdx]);
      else guide.reset(rounds[roundIdx]);
      guideSlot.appendChild(guide.el);
      const items = rounds[roundIdx].map((w) => ({ w, real: true }));
      if (ctx.hard) {
        for (const d of ctx.distractors(3 + ctx.randInt(2))) items.push({ w: d, real: false });
      }
      for (const it of shuffle(items)) {
        // Fuel cells never go blank (fadeWord level capped at 1) — they must
        // stay findable; data-word always holds the full word so a faded
        // cell still matches by its answer, and flyToShip reveals it in full.
        const tile = el('button', 'word-tile', level >= 1 ? fadeWord(it.w, 1) : it.w);
        tile.dataset.word = it.w;
        tile.onclick = () => onTap(tile, it);
        pool.appendChild(tile);
      }
    }

    function onTap(tile, it) {
      if (locked || !tile.isConnected) return;
      const expect = rounds[roundIdx][inRound];
      if (it.real && cleanWord(it.w) === cleanWord(expect)) {
        sfx.correct();
        flyToShip(tile, it.w);
        loaded++;
        guide.markDone(inRound);
        inRound++;
        updateGauge();
        gulp();
        if (inRound === rounds[roundIdx].length) endRound();
      } else {
        mistakes++;
        sfx.wrong();
        tile.classList.remove('wrong');
        void tile.offsetWidth; // restart the wiggle animation
        tile.classList.add('wrong');
      }
    }

    // The tapped cell flies from the pool into the rocket, revealing its
    // full word in flight (even if it was fading) — the reveal is the reward.
    function flyToShip(tile, word) {
      const sRect = stage.getBoundingClientRect();
      const tRect = tile.getBoundingClientRect();
      const rRect = rocketEmoji.getBoundingClientRect();
      tile.remove();
      const ghost = el('span', 'word-tile fly-cell', word);
      ghost.style.left = (tRect.left - sRect.left) + 'px';
      ghost.style.top = (tRect.top - sRect.top) + 'px';
      root.appendChild(ghost);
      const dx = (rRect.left + rRect.width / 2) - (tRect.left + tRect.width / 2);
      const dy = (rRect.top + rRect.height / 2) - (tRect.top + tRect.height / 2);
      void ghost.offsetWidth; // flush layout so the transition runs
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(0.15)`;
      ghost.style.opacity = '0.25';
      later(() => ghost.remove(), 600);
    }

    function gulp() {
      ship.classList.remove('gulp');
      void ship.offsetWidth;
      ship.classList.add('gulp');
    }

    function endRound() {
      roundIdx++;
      locked = true;
      if (roundIdx < rounds.length) {
        sfx.pop();
        msg.textContent = `Stage ${roundIdx + 1} fuel!`;
        later(() => { inRound = 0; locked = false; buildPool(); }, 700);
      } else {
        msg.textContent = 'Fuel tank full!';
        clear(pool);
        later(startCountdown, 500);
      }
    }

    // ---- countdown + liftoff ----
    function startCountdown() {
      const overlay = el('div', 'count-overlay');
      root.appendChild(overlay);
      let n = 3;
      const step = () => {
        clear(overlay);
        if (n > 0) {
          overlay.appendChild(el('div', 'count-num', String(n)));
          sfx.tick();
          n--;
          later(step, 700);
        } else {
          overlay.classList.add('clear-bg');
          overlay.appendChild(el('div', 'count-num liftoff', '🚀 LIFT OFF!'));
          liftOff();
        }
      };
      step();
    }

    function liftOff() {
      msg.textContent = 'LIFT OFF!';
      ship.classList.remove('gulp');
      ship.classList.add('launch');
      smoke.classList.add('show');
      layout.classList.add('shaking');
      sfx.pop();
      ctx.confetti();
      const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
      later(() => {
        ctx.win({ stars, mistakes });
        ctx.speak(); // win() stops speech, so speak after it — the verse plays over the celebration
      }, 1700);
    }

    buildPool();
    updateGauge();

    return () => {
      alive = false;
      for (const id of timers) clearTimeout(id);
      timers.clear();
    };
  },
};
