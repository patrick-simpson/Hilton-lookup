// Sword Drill Slash — Fruit-Ninja style: word tiles fly up from the bottom in
// arcs and the kid slashes (tap or swipe) the word that comes NEXT in the
// verse. The verse is played in waves of ~6 words. Wrong slashes buzz and
// wiggle but never end the game. Hard mode: faster physics + 2 decoys/wave.
//
// Recall-gate (plans.html §5.5 P2.5): before each slash, airborne tiles keep
// flying but go wordless + disabled (the PROMPT) while the HUD's fading
// guide strip pulses the next slot and ctx.thinkBeat runs. Only once the
// beat resolves do the words fade back onto the tiles (REVEAL) — so the kid
// has to recall the word from memory before the swipe frenzy even starts,
// instead of just reading it off an airborne tile. A 3s-first-letter hint
// chip, then the existing 6.5s tile glow, rescue a stuck kid after reveal.

import { fadeWord } from '../lib/engine.js';

export default {
  id: 'slash',
  title: 'Sword Drill Slash',
  icon: '⚔️',
  tagline: 'Slash the next word out of the sky!',
  howTo: 'Swords up! Words fly through the air — slash (tap or swipe) the word that comes NEXT in the verse. Clear every wave to win!',
  group: false,

  mount(stage, ctx) {
    const { el, clear, sfx, cleanWord, randInt } = ctx;

    ctx.addStyle(`
      .g-slash { position: absolute; inset: 0; overflow: hidden; touch-action: none; user-select: none; -webkit-user-select: none; }
      .g-slash .sky { position: absolute; inset: 0; z-index: 1; overflow: hidden; }
      .g-slash .cloud { position: absolute; font-size: 2.4rem; opacity: 0.45; pointer-events: none; animation: floaty 4s ease-in-out infinite; }
      .g-slash .fly { position: absolute; left: 0; top: 0; will-change: transform; }
      .g-slash .fly .word-tile { margin: 0; pointer-events: none; background: #fff1c9; border-color: var(--yellow); transition: opacity 0.25s ease; }
      .g-slash .fly.wordless .word-tile { opacity: 0; }
      .g-slash .fly.hint .word-tile { animation: g-slash-pulse 0.9s ease-in-out infinite; border-color: var(--yellow); }
      @keyframes g-slash-pulse {
        0%, 100% { box-shadow: 0 0 0 3px #ffe9a8, 0 4px 0 rgba(38,50,75,0.12); }
        50% { box-shadow: 0 0 0 10px #ffd75e, 0 4px 0 rgba(38,50,75,0.12); }
      }
      .g-slash .fly.slashed .word-tile { background: var(--green-soft); border-color: var(--green); animation: g-slash-split 0.45s ease forwards; }
      @keyframes g-slash-split {
        30% { transform: scale(1.25) rotate(-8deg); opacity: 1; }
        100% { transform: scale(1.7) rotate(18deg); opacity: 0; }
      }
      .g-slash .spark { position: absolute; z-index: 2; font-size: 1.4rem; pointer-events: none; animation: g-slash-spark 0.6s ease-out forwards; }
      @keyframes g-slash-spark {
        from { transform: translate(0, 0) scale(0.8); opacity: 1; }
        to { transform: translate(var(--dx), var(--dy)) scale(1.7); opacity: 0; }
      }
      .g-slash .hud { position: absolute; top: 0; left: 0; right: 0; padding: 10px 12px 4px; z-index: 3; pointer-events: none; }
      .g-slash .hud-row { display: flex; align-items: center; gap: 8px; }
      .g-slash .wave-chip { background: #fff7df; border: 3px solid var(--yellow); border-radius: 999px; padding: 8px 16px; font-weight: bold; white-space: nowrap; }
      .g-slash .hear-btn { pointer-events: auto; margin-left: auto; width: 54px; height: 54px; font-size: 1.5rem; background: var(--paper); border-radius: 999px; box-shadow: var(--shadow); }
      .g-slash .hear-btn:active { transform: translateY(3px); box-shadow: none; }
      .g-slash .guide-strip { margin-top: 8px; margin-bottom: 0; pointer-events: auto; background: rgba(244, 248, 255, 0.92); max-height: 40vh; overflow: auto; }
      .g-slash .guide-word.g-next { box-shadow: 0 0 0 3px var(--yellow); animation: think-pulse 1.1s ease-in-out infinite; }
      .g-slash .hint-chip { display: none; align-items: center; gap: 6px; width: fit-content; margin: 6px auto 0; padding: 6px 14px; border-radius: 999px; background: #fff7df; border: 2px dashed var(--yellow); font-weight: bold; font-size: 1.1rem; color: #6b5a00; }
      .g-slash .hint-chip.show { display: flex; animation: pop-in 0.25s ease; }
      .g-slash .msg, .g-slash .start-screen { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; padding: 18px; z-index: 4; }
      .g-slash .start-screen { background: rgba(255, 255, 255, 0.75); z-index: 5; }
      .g-slash .big-emoji { font-size: 4.2rem; animation: floaty 2.5s ease-in-out infinite; }
      .g-slash .start-title { font-size: 2.1rem; font-weight: bold; }
      .g-slash .start-sub { font-size: 1.05rem; opacity: 0.85; max-width: 420px; }
      .g-slash .wave-clear { font-size: 1.9rem; font-weight: bold; background: var(--paper); padding: 16px 28px; border-radius: 20px; box-shadow: var(--shadow); animation: pop-in 0.3s ease; }
      .g-slash .msg .verse-display { background: var(--paper); border-radius: 16px; box-shadow: var(--shadow); max-height: 65%; overflow: auto; animation: pop-in 0.3s ease; }
      /* Narrow phones: keep the HUD compact so it doesn't cover the play
         area, but the hint chip stays legible. */
      @media (max-width: 420px) {
        .g-slash .guide-strip { padding: 5px; margin-top: 6px; }
        .g-slash .guide-word { min-height: 32px; min-width: 26px; padding: 4px 8px; font-size: 0.9rem; }
        .g-slash .hint-chip { padding: 4px 10px; font-size: 0.95rem; }
      }
    `);

    // ---------- layout ----------

    const root = el('div', 'g-slash');
    const sky = el('div', 'sky');
    const c1 = el('span', 'cloud', '☁️');
    c1.style.left = '6%'; c1.style.top = '14%';
    const c2 = el('span', 'cloud', '☁️');
    c2.style.right = '8%'; c2.style.top = '30%'; c2.style.animationDelay = '1.6s';
    sky.append(c1, c2);

    const hud = el('div', 'hud');
    const hudRow = el('div', 'hud-row');
    const chip = el('div', 'wave-chip', '⚔️');
    const hearBtn = el('button', 'hear-btn', '🔊');
    hearBtn.onclick = () => { sfx.click(); ctx.speak(); };
    hudRow.append(chip, hearBtn);
    const hintChip = el('div', 'hint-chip');
    hud.append(hudRow, hintChip);

    root.append(sky, hud);
    stage.appendChild(root);

    // ---------- state ----------

    const waves = ctx.chunk(ctx.verse.words, 6);
    const G = ctx.hard ? 1000 : 640;          // gravity px/s^2
    const LAUNCH_GAP = ctx.hard ? 520 : 820;  // ms between launches
    const MAX_AIR = 4;
    const MIN_AIR = 2;

    let waveIdx = 0;
    let idx = 0;            // next word index within current wave
    let mistakes = 0;
    let tiles = [];
    let playing = false;
    let alive = true;
    let raf = 0;
    let lastT = 0;
    let lastLaunch = 0;
    let lastWrongAt = 0;
    let guide = null;

    // Recall-gate: while promptActive, airborne tiles are wordless + inert —
    // the kid must recall the word before the reveal fades it back on.
    let promptActive = true;
    let revealAt = 0;

    const timeouts = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timeouts.delete(t); fn(); }, ms);
      timeouts.add(t);
      return t;
    };

    const neededWord = () =>
      playing && idx < waves[waveIdx].length ? waves[waveIdx][idx] : null;
    const matches = (tile, needed) =>
      !!needed && !tile.decoy && cleanWord(tile.word) === cleanWord(needed);

    // ---------- HUD ----------

    function updateHud() {
      chip.textContent = `⚔️ Wave ${waveIdx + 1}/${waves.length}`;
    }

    function syncGuidePulse() {
      if (!guide) return;
      const words = guide.el.querySelectorAll('.guide-word');
      words.forEach((w, i) => w.classList.toggle('g-next', i === idx));
    }

    // ---------- tiles & physics ----------

    function setWordless(tile, wordless) {
      tile.wordless = wordless;
      tile.el.classList.toggle('wordless', wordless);
      tile.inner.disabled = wordless;
    }

    function makeTile(word, decoy) {
      const outer = el('div', 'fly');
      // A real <button> so switch/keyboard users (and synthetic clicks) can
      // slash too. Finger touches still go through the root's forgiving
      // swipe hit-test — the button keeps pointer-events: none.
      const inner = el('button', 'word-tile', word);
      inner.type = 'button';
      outer.appendChild(inner);
      const tile = {
        word, decoy, el: outer, inner,
        x: 0, y: 0, vx: 0, vy: 0, rot: 0, vr: 0,
        w: 110, h: 52, air: false, dead: false, lastWrong: 0, wordless: false,
      };
      inner.onclick = () => slash(tile);
      return tile;
    }

    function render(tile) {
      tile.el.style.transform =
        `translate3d(${tile.x}px, ${tile.y}px, 0) rotate(${tile.rot}deg)`;
    }

    function launch(tile, W, H) {
      sky.appendChild(tile.el);
      tile.w = tile.el.offsetWidth || 110;
      tile.h = tile.el.offsetHeight || 52;
      tile.x = 10 + Math.random() * Math.max(10, W - tile.w - 20);
      tile.y = H + 20;
      // Arc peak: high, but never up behind the HUD strip (on small phones the
      // strip covers a fair band of the top — tiles should stay visible).
      const hudH = hud.offsetHeight || 0;
      const rise = Math.max(
        H * 0.35,
        Math.min(H * (0.55 + Math.random() * 0.32), H + 12 - hudH)
      );
      tile.vy = -Math.sqrt(2 * G * rise);
      const speed = ctx.hard ? 90 + Math.random() * 130 : 50 + Math.random() * 100;
      tile.vx = (Math.random() < 0.5 ? -1 : 1) * speed;
      tile.rot = 0;
      tile.vr = (Math.random() * 2 - 1) * (ctx.hard ? 55 : 28);
      tile.air = true;
      setWordless(tile, promptActive);
      render(tile);
    }

    function frame(t) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      const dt = lastT ? Math.min(0.04, (t - lastT) / 1000) : 0.016;
      lastT = t;
      if (!playing) return;

      const W = root.clientWidth || 600;
      const H = root.clientHeight || 420;

      for (const tile of tiles) {
        if (!tile.air || tile.dead) continue;
        tile.x += tile.vx * dt;
        tile.y += tile.vy * dt;
        tile.vy += G * dt;
        tile.rot += tile.vr * dt;
        if (tile.x < 4 && tile.vx < 0) tile.vx = -tile.vx;
        if (tile.x + tile.w > W - 4 && tile.vx > 0) tile.vx = -tile.vx;
        if (tile.y > H + 60 && tile.vy > 0) {
          tile.air = false;          // fell off — back to the launch queue
          tile.el.remove();
        } else {
          render(tile);
        }
      }

      const waiting = tiles.filter((x) => !x.air && !x.dead);
      const airborne = tiles.filter((x) => x.air && !x.dead);
      const needed = neededWord();

      // The needed word must ALWAYS be airborne — relaunch it right away.
      if (needed && !airborne.some((x) => matches(x, needed))) {
        const m = waiting.find((x) => matches(x, needed));
        if (m) { launch(m, W, H); lastLaunch = t; }
      } else if (
        waiting.length && airborne.length < MAX_AIR &&
        (airborne.length < MIN_AIR || t - lastLaunch > LAUNCH_GAP)
      ) {
        launch(waiting[randInt(waiting.length)], W, H);
        lastLaunch = t;
      }

      // Hint ladder (normal mode only, and only once the word is actually
      // revealed): 3s → first-letter chip near the HUD; 6.5s → glow the
      // right tile (final rescue).
      const sinceReveal = t - revealAt;
      const chipOn = !ctx.hard && !promptActive && needed && sinceReveal > 3000;
      if (chipOn) hintChip.textContent = `💡 ${fadeWord(needed, 1)}`;
      hintChip.classList.toggle('show', chipOn);
      const hintOn = !ctx.hard && !promptActive && sinceReveal > 6500;
      for (const tile of tiles) {
        if (tile.air && !tile.dead) {
          tile.el.classList.toggle('hint', hintOn && matches(tile, needed));
        }
      }
    }

    // ---------- recall-gate: prompt (hide + inert) -> think -> reveal ----------

    function enterPrompt() {
      promptActive = true;
      hintChip.classList.remove('show');
      for (const tile of tiles) {
        if (tile.air && !tile.dead) setWordless(tile, true);
      }
      syncGuidePulse();
    }

    function revealPhase() {
      promptActive = false;
      revealAt = performance.now();
      for (const tile of tiles) {
        if (!tile.dead) setWordless(tile, false);
      }
    }

    async function beginCycle() {
      if (!alive || !playing) return;
      enterPrompt();
      await ctx.thinkBeat({ anchor: hud, ms: 1600 });
      if (!alive || !playing) return; // wave finished / unmounted while waiting
      revealPhase();
    }

    // ---------- slashing ----------

    function burst(tile) {
      const cx = tile.x + tile.w / 2;
      const cy = tile.y + tile.h / 2;
      for (const g of ['✨', '💥', '⭐', '✨']) {
        const s = el('span', 'spark', g);
        s.style.left = cx + 'px';
        s.style.top = cy + 'px';
        s.style.setProperty('--dx', (Math.random() * 140 - 70) + 'px');
        s.style.setProperty('--dy', (Math.random() * 140 - 70) + 'px');
        sky.appendChild(s);
        later(() => s.remove(), 650);
      }
    }

    function slash(tile) {
      if (tile.dead || !tile.air) return; // already slashed or not flying
      if (tile.wordless) return;          // still in the recall PROMPT — no-op
      const now = performance.now();
      const needed = neededWord();
      if (!needed) return;

      if (matches(tile, needed)) {
        tile.dead = true;
        tile.air = false;
        sfx.correct();
        burst(tile);
        tile.el.classList.remove('hint');
        tile.el.classList.add('slashed');
        const deadEl = tile.el;
        later(() => deadEl.remove(), 500);
        const doneIdx = idx;
        idx++;
        updateHud();
        guide.markDone(doneIdx);
        if (idx >= waves[waveIdx].length) {
          waveClear();
        } else {
          beginCycle(); // next PROMPT: hide + inert, think, then reveal
        }
      } else {
        if (now - tile.lastWrong < 700) return; // don't buzz-spam one tile
        tile.lastWrong = now;
        if (now - lastWrongAt > 450) {          // one mistake per swipe-ish
          lastWrongAt = now;
          mistakes++;
          sfx.wrong();
        }
        tile.inner.classList.remove('wrong');
        void tile.inner.offsetWidth;            // restart the wiggle
        tile.inner.classList.add('wrong');
        later(() => tile.inner.classList.remove('wrong'), 400);
      }
    }

    // Tap OR swipe: manual hit-testing on pointer move so a finger dragged
    // across a tile slashes it (pointerenter doesn't fire mid-touch-drag).
    let pointerOn = false;
    function trySlashAt(e) {
      if (!playing) return;
      const rect = root.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const pad = 10; // forgiving hit box for little fingers
      let best = null;
      let bestD = Infinity;
      for (const tile of tiles) {
        if (!tile.air || tile.dead || tile.wordless) continue;
        if (px >= tile.x - pad && px <= tile.x + tile.w + pad &&
            py >= tile.y - pad && py <= tile.y + tile.h + pad) {
          const d = Math.hypot(px - (tile.x + tile.w / 2), py - (tile.y + tile.h / 2));
          if (d < bestD) { bestD = d; best = tile; }
        }
      }
      if (best) slash(best);
    }
    root.addEventListener('pointerdown', (e) => {
      pointerOn = true;
      try { root.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      trySlashAt(e);
    });
    root.addEventListener('pointermove', (e) => { if (pointerOn) trySlashAt(e); });
    const endPointer = () => { pointerOn = false; };
    root.addEventListener('pointerup', endPointer);
    root.addEventListener('pointercancel', endPointer);
    root.addEventListener('pointerleave', endPointer);

    // ---------- waves ----------

    function buildWave() {
      clear(sky);
      sky.append(c1, c2);
      tiles = waves[waveIdx].map((w) => makeTile(w, false));
      if (ctx.hard) {
        for (const d of ctx.distractors(2)) tiles.push(makeTile(d, true));
      }
      idx = 0;
      lastLaunch = 0;
      if (!guide) {
        guide = ctx.guide(waves[waveIdx]);
        hud.insertBefore(guide.el, hintChip);
      } else {
        guide.reset(waves[waveIdx]);
      }
      updateHud();
      playing = true;
      beginCycle(); // PROMPT for word 0 of this wave
    }

    function waveClear() {
      playing = false;
      hintChip.classList.remove('show');
      for (const tile of tiles) {
        if (!tile.dead) { tile.dead = true; tile.el.remove(); }
      }
      waveIdx++;
      if (waveIdx >= waves.length) {
        later(finish, 450);
        return;
      }
      sfx.pop();
      const flash = el('div', 'msg');
      flash.appendChild(el('div', 'wave-clear', '🌟 Wave clear!'));
      root.appendChild(flash);
      later(() => { flash.remove(); buildWave(); }, 1000);
    }

    function finish() {
      playing = false;
      clear(root);
      const done = el('div', 'msg');
      done.appendChild(el('div', 'big-emoji', '⚔️'));
      const vd = el('div', 'verse-display', ctx.verse.text);
      vd.appendChild(el('span', 'verse-ref', ctx.verse.label));
      done.appendChild(vd);
      root.appendChild(done);
      ctx.speak();
      ctx.confetti();
      const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
      later(() => ctx.win({ stars, mistakes }), 2400);
    }

    // ---------- start ----------

    function showStart() {
      const s = el('div', 'start-screen');
      s.appendChild(el('div', 'big-emoji', '⚔️'));
      s.appendChild(el('div', 'start-title', 'Swords up!'));
      s.appendChild(el('div', 'start-sub',
        `Slash the word that comes next in ${ctx.verse.label}!`));
      const b = el('button', 'btn btn-primary btn-big', '⚔️ Start!');
      b.onclick = () => { sfx.pop(); s.remove(); buildWave(); };
      s.appendChild(b);
      root.appendChild(s);
    }

    ctx.speak();
    updateHud();
    showStart();
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false;
      playing = false;
      cancelAnimationFrame(raf);
      for (const t of timeouts) clearTimeout(t);
      timeouts.clear();
      ctx.stopSpeak();
    };
  },
};
