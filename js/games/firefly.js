// Firefly Catch — night-time Sparky game. The verse shows up top with one
// word missing; glowing fireflies wander the night sky, each carrying a word.
// Tap the firefly with the missing word to catch it in your jar. Wrong taps
// make the firefly scatter away fast. Hard mode: more fireflies, more blanks,
// faster flying.

export default {
  id: 'firefly',
  title: 'Firefly Catch',
  icon: '🏮',
  tagline: 'Catch the glowing word in your jar!',
  howTo: 'A word from the verse is missing! Fireflies carry words across the night sky — tap the firefly with the missing word to catch it in your jar. Tap 🔊 to hear the verse again.',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx, cleanWord } = ctx;

    ctx.addStyle(`
      .g-firefly { margin: -16px; padding: 14px; min-height: 452px;
        display: flex; flex-direction: column; gap: 10px; color: #fff;
        background: linear-gradient(180deg, #0a1240 0%, #16246b 55%, #253a8f 100%); }
      .g-firefly .hud { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
      .g-firefly .hud .hud-label { font-weight: bold; opacity: 0.9; }
      .g-firefly .speak-btn { min-width: 56px; min-height: 52px; padding: 6px 14px; font-size: 1.3rem;
        background: #2c418f; color: #fff; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.35); }
      .g-firefly .verse-line { background: rgba(6, 10, 36, 0.55); border: 2px solid rgba(140, 170, 255, 0.35);
        border-radius: 16px; padding: 10px 12px; text-align: center; font-size: 1.15rem; line-height: 1.7; }
      .g-firefly .verse-line .vw { margin: 0 3px; display: inline-block; }
      .g-firefly .verse-line .vw.dim { opacity: 0.55; }
      .g-firefly .verse-line .vw.filled { color: #ffe98a; font-weight: bold; animation: pop-in 0.3s ease; }
      .g-firefly .blank-slot { display: inline-block; min-width: 58px; margin: 0 4px; padding: 0 10px;
        border-radius: 10px; border-bottom: 3px dashed #ffe98a; background: rgba(255, 233, 138, 0.14);
        box-shadow: 0 0 12px rgba(255, 233, 138, 0.35); font-weight: bold; color: #ffe98a; }
      .g-firefly .sky { position: relative; flex: 1; min-height: 280px; border-radius: 16px; overflow: hidden;
        background: radial-gradient(ellipse at 50% 130%, rgba(100, 130, 230, 0.28), transparent 62%); }
      .g-firefly .deco { position: absolute; pointer-events: none; }
      .g-firefly .star { font-size: 0.7rem; animation: g-ff-twinkle 2.6s ease-in-out infinite; }
      .g-firefly .moon { font-size: 2rem; left: 8px; top: 6px; opacity: 0.9; }
      .g-firefly .fly { position: absolute; left: 0; top: 0; will-change: transform; z-index: 2; }
      .g-firefly .fly.caught { transition: transform 0.55s cubic-bezier(0.45, -0.15, 0.8, 1), opacity 0.55s ease; }
      .g-firefly .fly-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 52px;
        padding: 10px 16px; border-radius: 999px; white-space: nowrap;
        background: #fff6bd; color: #4a3b00; border: 2px solid #ffe066;
        font-weight: bold; font-size: 1.05rem;
        animation: g-ff-glow 1.5s ease-in-out infinite alternate;
        filter: drop-shadow(0 0 6px rgba(255, 240, 160, 0.8)); }
      .g-firefly .fly-btn:active { filter: brightness(1.12); }
      .g-firefly .fly-btn.wrong { animation: wiggle 0.35s ease; background: #ffd6d9;
        box-shadow: 0 0 10px 3px rgba(255, 120, 120, 0.55); }
      .g-firefly .jar { position: absolute; right: 8px; bottom: 4px; text-align: center; z-index: 1; pointer-events: none; }
      .g-firefly .jar .jar-emoji { display: block; font-size: 3.4rem; line-height: 1;
        filter: drop-shadow(0 0 10px rgba(255, 236, 130, 0.4)); }
      .g-firefly .jar .jar-fill { position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%);
        width: 54px; font-size: 0.72rem; line-height: 1.1; }
      .g-firefly .jar .jar-count { display: inline-block; background: #ffe066; color: #4a3b00; font-weight: bold;
        border-radius: 999px; padding: 2px 10px; font-size: 0.9rem; margin-top: 2px; }
      .g-firefly .jar.pulse .jar-emoji { animation: pop-in 0.35s ease; }
      .g-firefly .jar.full .jar-emoji { animation: floaty 1.4s ease-in-out infinite;
        filter: drop-shadow(0 0 20px rgba(255, 236, 130, 0.95)); }
      @keyframes g-ff-glow {
        from { box-shadow: 0 0 12px 4px rgba(255, 236, 130, 0.5), 0 0 30px 8px rgba(255, 236, 130, 0.18); }
        to   { box-shadow: 0 0 22px 8px rgba(255, 236, 130, 0.85), 0 0 48px 16px rgba(255, 236, 130, 0.3); }
      }
      @keyframes g-ff-twinkle {
        0%, 100% { opacity: 0.25; transform: scale(0.8); }
        50% { opacity: 0.95; transform: scale(1.15); }
      }
      @media (max-width: 480px) { .g-firefly { margin: -12px; min-height: 404px; } }
    `);

    const root = el('div', 'g-firefly');
    stage.appendChild(root);

    // ----- layout -----
    const hud = el('div', 'hud');
    const speakBtn = el('button', 'btn speak-btn', '🔊');
    hud.append(speakBtn, el('span', 'hud-label', '🏮 Catch the missing word!'));

    const line = el('div', 'verse-line');
    const sky = el('div', 'sky');
    root.append(hud, line, sky);

    // decorations: moon + twinkly stars
    const moon = el('span', 'deco moon', '🌙');
    sky.appendChild(moon);
    for (let i = 0; i < 9; i++) {
      const s = el('span', 'deco star', i % 3 === 0 ? '🌟' : '⭐');
      s.style.left = 4 + Math.random() * 92 + '%';
      s.style.top = 3 + Math.random() * 88 + '%';
      s.style.animationDelay = (Math.random() * 2.5).toFixed(2) + 's';
      sky.appendChild(s);
    }

    const jarWrap = el('div', 'jar');
    const jarFill = el('div', 'jar-fill', '');
    const jarEmoji = el('span', 'jar-emoji', '🫙');
    const jarCount = el('span', 'jar-count', '');
    jarWrap.append(jarFill, jarEmoji, jarCount);
    sky.appendChild(jarWrap);

    // ----- game state -----
    const words = ctx.verse.words;
    const isList = ctx.verse.isList;
    const numFlies = ctx.hard ? 6 : 4;
    const totalRounds = Math.min(words.length, ctx.hard ? 8 : 6);
    const baseSpeed = ctx.hard ? 58 : 32;   // px per second
    const speedVar = ctx.hard ? 34 : 20;
    const winSize = 8;                      // words shown around the blank (long verses)

    // pick which word indices get blanked (prefer meatier words), left-to-right
    let cand = words.map((_, i) => i).filter((i) => cleanWord(words[i]).length >= 3);
    if (cand.length < totalRounds) cand = words.map((_, i) => i);
    const blankIdxs = shuffle(cand).slice(0, totalRounds).sort((a, b) => a - b);

    let round = 0;
    let caught = 0;
    let mistakes = 0;
    let active = false;
    let flies = [];
    let blankEl = null;
    let lastWinStart = -1;
    const filled = new Set();

    let rafId = 0;
    let lastTs = 0;
    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    };
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // ----- verse line -----
    function windowFor(idx) {
      if (words.length <= 12) return { start: 0, end: words.length };
      const start = Math.floor(idx / winSize) * winSize;
      return { start, end: Math.min(words.length, start + winSize) };
    }

    function renderLine() {
      clear(line);
      const idx = blankIdxs[round];
      const { start, end } = windowFor(idx);
      if (start > 0) line.appendChild(el('span', 'vw dim', '…'));
      for (let i = start; i < end; i++) {
        const sep = isList && i < end - 1 ? ',' : '';
        if (i === idx) {
          blankEl = el('span', 'blank-slot', '?');
          line.appendChild(blankEl);
          if (sep) line.appendChild(el('span', 'vw', sep));
        } else {
          line.appendChild(el('span', 'vw' + (filled.has(i) ? ' filled' : ''), words[i] + sep));
        }
      }
      if (end < words.length) line.appendChild(el('span', 'vw dim', '…'));
    }

    function speakWindow() {
      const { start, end } = windowFor(blankIdxs[Math.min(round, totalRounds - 1)]);
      ctx.speak(words.slice(start, end).join(isList ? ', ' : ' '));
    }
    speakBtn.onclick = () => { sfx.click(); speakWindow(); };

    // ----- decoys (prefer verse words) -----
    function decoysFor(correctWord, n) {
      const seen = new Set([cleanWord(correctWord)]);
      const out = [];
      for (const w of shuffle(words)) {
        const c = cleanWord(w);
        if (c && !seen.has(c)) { seen.add(c); out.push(w); }
        if (out.length >= n) return out;
      }
      for (const d of ctx.distractors(n * 2)) {
        const c = cleanWord(d);
        if (c && !seen.has(c)) { seen.add(c); out.push(d); }
        if (out.length >= n) break;
      }
      return out;
    }

    // ----- fireflies -----
    function spawnFlies(correctWord) {
      for (const f of flies) f.node.remove();
      flies = [];
      const set = shuffle([
        { w: correctWord, correct: true },
        ...decoysFor(correctWord, numFlies - 1).map((w) => ({ w, correct: false })),
      ]);
      const W = sky.clientWidth;
      const H = sky.clientHeight;
      const cols = 2;
      const rows = Math.ceil(set.length / cols);
      set.forEach((item, i) => {
        const node = el('div', 'fly');
        const btn = el('button', 'fly-btn');
        btn.append(el('span', null, '✨'), el('span', null, item.w));
        if (item.w.length > 12) btn.style.fontSize = '0.9rem';
        node.appendChild(btn);
        sky.appendChild(node);
        const cellW = W / cols;
        const cellH = H / rows;
        const col = i % cols;
        const row = Math.floor(i / cols);
        const f = {
          node,
          btn,
          correct: item.correct,
          x: clamp(col * cellW + Math.random() * Math.max(10, cellW - node.offsetWidth - 8), 4, Math.max(4, W - node.offsetWidth - 4)),
          y: clamp(row * cellH + Math.random() * Math.max(10, cellH - node.offsetHeight - 8), 4, Math.max(4, H - node.offsetHeight - 4)),
          heading: Math.random() * Math.PI * 2,
          speed: baseSpeed + Math.random() * speedVar,
          phase: Math.random() * Math.PI * 2,
          scatterUntil: 0,
          caught: false,
        };
        node.style.transform = `translate(${f.x}px, ${f.y}px)`;
        btn.onclick = () => tap(f);
        flies.push(f);
      });
    }

    function loop(ts) {
      rafId = requestAnimationFrame(loop);
      if (!lastTs) { lastTs = ts; return; }
      const dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      const W = sky.clientWidth;
      const H = sky.clientHeight;
      const now = performance.now();
      for (const f of flies) {
        if (f.caught) continue;
        const scattering = now < f.scatterUntil;
        f.heading += (Math.random() - 0.5) * 3.2 * dt; // gentle wandering
        const w = f.node.offsetWidth;
        const h = f.node.offsetHeight;
        const m = 26;
        if (f.x < m || f.x > W - w - m || f.y < m || f.y > H - h - m) {
          // steer back toward the middle of the sky
          const target = Math.atan2(H / 2 - (f.y + h / 2), W / 2 - (f.x + w / 2));
          let d = target - f.heading;
          while (d > Math.PI) d -= 2 * Math.PI;
          while (d < -Math.PI) d += 2 * Math.PI;
          f.heading += d * (scattering ? 2.2 : 3.5) * dt;
        }
        const sp = f.speed * (scattering ? 6 : 1);
        f.x = clamp(f.x + Math.cos(f.heading) * sp * dt, 0, Math.max(0, W - w));
        f.y = clamp(f.y + Math.sin(f.heading) * sp * dt, 0, Math.max(0, H - h));
        const bob = Math.sin((now / 1000) * 2.2 + f.phase) * 3;
        f.node.style.transform = `translate(${f.x}px, ${f.y + bob}px)`;
      }
    }

    // ----- taps -----
    function tap(f) {
      if (!active || f.caught) return;
      if (f.correct) {
        active = false;
        sfx.correct();
        catchFly(f);
      } else {
        mistakes++;
        sfx.wrong();
        f.scatterUntil = performance.now() + 900; // zip away fast for a second
        f.heading = Math.random() * Math.PI * 2;
        f.btn.classList.remove('wrong');
        void f.btn.offsetWidth; // restart the wiggle animation
        f.btn.classList.add('wrong');
        later(() => f.btn.classList.remove('wrong'), 450);
      }
    }

    function catchFly(f) {
      f.caught = true;
      f.btn.style.pointerEvents = 'none';
      for (const o of flies) {
        if (o === f) continue;
        o.caught = true;
        o.btn.style.pointerEvents = 'none';
        o.node.style.transition = 'opacity 0.5s ease';
        o.node.style.opacity = '0';
      }
      // zoom into the jar
      const jr = jarWrap.getBoundingClientRect();
      const sr = sky.getBoundingClientRect();
      const tx = (jr.left - sr.left) + jr.width / 2 - f.node.offsetWidth / 2;
      const ty = (jr.top - sr.top) + jr.height * 0.3 - f.node.offsetHeight / 2;
      f.node.classList.add('caught');
      f.node.style.transform = `translate(${tx}px, ${ty}px) scale(0.15)`;
      f.node.style.opacity = '0.2';
      later(() => f.node.remove(), 620);

      later(() => {
        caught++;
        updateJar(true);
        fillBlank();
        sfx.pop();
      }, 460);

      later(nextRound, 1050);
    }

    function fillBlank() {
      const idx = blankIdxs[round];
      filled.add(idx);
      if (blankEl) {
        const sep = isList && idx < windowFor(idx).end - 1 ? ',' : '';
        blankEl.className = 'vw filled';
        blankEl.textContent = words[idx] + sep;
      }
    }

    function updateJar(pulse) {
      jarFill.textContent = '✨'.repeat(Math.min(caught, 10));
      jarCount.textContent = `${caught} / ${totalRounds}`;
      if (pulse) {
        jarWrap.classList.remove('pulse');
        void jarWrap.offsetWidth;
        jarWrap.classList.add('pulse');
      }
    }

    // ----- rounds -----
    function startRound() {
      renderLine();
      spawnFlies(words[blankIdxs[round]]);
      active = true;
      const w = windowFor(blankIdxs[round]);
      if (round > 0 && w.start !== lastWinStart) speakWindow(); // new phrase — read it
      lastWinStart = w.start;
    }

    function nextRound() {
      round++;
      if (round >= totalRounds) {
        endGame();
      } else {
        startRound();
      }
    }

    function endGame() {
      active = false;
      jarWrap.classList.add('full');
      jarFill.textContent = '✨✨✨✨✨✨✨✨✨✨';
      ctx.speak();      // read the whole verse one more time
      ctx.confetti();
      const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
      later(() => ctx.win({ stars }), 2600);
    }

    // ----- go! -----
    ctx.speak(); // read the whole verse on mount
    updateJar(false);
    startRound();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
