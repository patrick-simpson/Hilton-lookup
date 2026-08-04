// Falling Words — words rain down from the sky and the kid taps the word
// that comes NEXT in the verse. Long verses play chunk-by-chunk. Hard mode
// makes the rain fall faster and mixes in a distractor word.

export default {
  id: 'falling',
  title: 'Falling Words',
  icon: '🌧️',
  tagline: 'Catch the next word as it falls!',
  howTo: 'Words rain down from the sky! Tap the word that comes NEXT in the verse to catch it. Catch every word to build the whole verse. Tap 🔊 to hear it again.',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx, cleanWord } = ctx;

    ctx.addStyle(`
      .g-falling { display: flex; flex-direction: column; gap: 10px; }
      .g-falling .hud { display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
      .g-falling .hud .round-label { font-weight: bold; opacity: 0.75; }
      .g-falling .speak-btn { min-width: 56px; padding: 6px 14px; font-size: 1.35rem; }
      .g-falling .sky { position: relative; overflow: hidden; height: clamp(240px, 42vh, 400px);
        border-radius: 16px; border: 3px solid #d5e8ff;
        background: linear-gradient(180deg, #dff1ff, #f7fbff); }
      .g-falling .cloud { position: absolute; font-size: 2.1rem; opacity: 0.8; pointer-events: none;
        animation: floaty 4s ease-in-out infinite; }
      .g-falling .faller { position: absolute; left: 0; top: 0; margin: 0; will-change: transform; }
      .g-falling .faller .word-tile { margin: 0; white-space: nowrap; }
      .g-falling .strip { min-height: 74px; background: #f4f8ff; border-radius: 16px; padding: 8px; text-align: center; }
      .g-falling .strip .word-tile { min-height: 44px; padding: 6px 12px; font-size: 1.05rem; margin: 4px; }
      .g-falling .start-overlay { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column;
        gap: 14px; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.6); }
      .g-falling .start-overlay p { margin: 0; font-weight: bold; font-size: 1.1rem; }
    `);

    const root = el('div', 'g-falling');
    stage.appendChild(root);

    // ----- layout -----
    const hud = el('div', 'hud');
    const speakBtn = el('button', 'btn speak-btn', '🔊');
    const partLabel = el('div', 'round-label', '');
    hud.append(speakBtn, partLabel);

    const sky = el('div', 'sky');
    [['8%', '4px', '0s'], ['45%', '10px', '1.3s'], ['78%', '2px', '2.2s']].forEach(([left, top, delay]) => {
      const c = el('span', 'cloud', '☁️');
      c.style.left = left;
      c.style.top = top;
      c.style.animationDelay = delay;
      sky.appendChild(c);
    });

    const strip = el('div', 'strip');
    root.append(hud, sky, strip);

    // ----- game state -----
    const chunkSize = 6;
    const rounds = ctx.chunk(ctx.verse.words, chunkSize);
    const fallerCount = ctx.hard ? 4 : 3;   // hard adds a distractor tile
    const speedMin = ctx.hard ? 85 : 45;    // px per second
    const speedVar = ctx.hard ? 50 : 30;

    let roundIdx = 0;
    let nextIdx = 0;
    let mistakes = 0;
    let chunkWords = rounds[0];
    let slots = [];
    let fallers = [];
    let roundActive = false;
    let running = false;
    let rafId = 0;
    let lastTs = 0;

    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    };

    function speakChunk() {
      ctx.speak(chunkWords.join(ctx.verse.isList ? ', ' : ' '));
    }
    speakBtn.onclick = () => { sfx.click(); speakChunk(); };

    ctx.speak(); // read the whole verse once on mount

    // ----- word picking -----
    // Decoys avoid the needed word AND anything already falling (or queued via
    // `exclude`) so two identical tiles never rain down together.
    function pickDecoy(exclude) {
      const needC = nextIdx < chunkWords.length ? cleanWord(chunkWords[nextIdx]) : '';
      const taken = new Set(exclude || []);
      taken.add(needC);
      for (const f of fallers) taken.add(cleanWord(f.word));
      let pool = chunkWords.filter((w) => !taken.has(cleanWord(w)));
      if (!pool.length) pool = ctx.verse.words.filter((w) => !taken.has(cleanWord(w)));
      if (!pool.length) pool = ctx.distractors(4).filter((w) => !taken.has(cleanWord(w)));
      if (!pool.length) pool = chunkWords.filter((w) => cleanWord(w) !== needC);
      if (!pool.length) pool = ctx.verse.words.filter((w) => cleanWord(w) !== needC);
      if (!pool.length) pool = ctx.distractors(3);
      return ctx.pick(pool);
    }

    // Word for the tile that replaces a caught one. The needed next word must
    // ALWAYS be somewhere in the falling set.
    function replacementWord() {
      const needC = cleanWord(chunkWords[nextIdx]);
      if (!fallers.some((f) => cleanWord(f.word) === needC)) {
        return { word: chunkWords[nextIdx], isDistractor: false };
      }
      if (ctx.hard && !fallers.some((f) => f.isDistractor)) {
        const d = ctx.distractors(1);
        if (d.length) return { word: d[0], isDistractor: true };
      }
      return { word: pickDecoy(), isDistractor: false };
    }

    // ----- falling tiles -----
    function randX(tileW, lane) {
      const W = sky.clientWidth;
      // Hard right-edge cap: a tile must never spawn poking past the sky edge,
      // even when a long word overflows its narrow lane on a small phone.
      const hardMax = Math.max(2, W - tileW - 6);
      let min = 2;
      let max = hardMax;
      if (lane != null) {
        const laneW = W / fallerCount;
        min = Math.min(lane * laneW + 4, hardMax);
        max = Math.min(hardMax, (lane + 1) * laneW - tileW);
      }
      if (max < min) max = min;
      return min + Math.random() * (max - min);
    }

    function spawnFaller(word, isDistractor, stagger, lane) {
      const node = el('div', 'faller');
      const btn = el('button', 'word-tile', word);
      if (word.length > 12) btn.style.fontSize = '0.95rem';
      node.appendChild(btn);
      sky.appendChild(node);
      const f = {
        word,
        node,
        btn,
        isDistractor: !!isDistractor,
        flying: false,
        speed: speedMin + Math.random() * speedVar,
        x: 0,
        y: 0,
      };
      f.x = randX(node.offsetWidth, lane);
      f.y = -node.offsetHeight - stagger - ctx.randInt(60);
      node.style.transform = `translate(${f.x}px, ${f.y}px)`;
      btn.onclick = () => tap(f);
      fallers.push(f);
    }

    function loop(ts) {
      if (!running) return;
      if (lastTs) {
        const dt = Math.min((ts - lastTs) / 1000, 0.05);
        const H = sky.clientHeight;
        for (const f of fallers) {
          if (f.flying) continue;
          f.y += f.speed * dt;
          if (f.y > H) { // fell out — respawn up top at a new spot
            f.y = -f.node.offsetHeight - ctx.randInt(120);
            f.x = randX(f.node.offsetWidth, null);
          }
          f.node.style.transform = `translate(${f.x}px, ${f.y}px)`;
        }
      }
      lastTs = ts;
      rafId = requestAnimationFrame(loop);
    }

    // ----- taps -----
    function tap(f) {
      if (!roundActive || f.flying) return;
      if (cleanWord(f.word) === cleanWord(chunkWords[nextIdx])) {
        sfx.correct();
        collect(f);
      } else {
        mistakes++;
        sfx.wrong();
        f.btn.classList.remove('wrong');
        void f.btn.offsetWidth; // restart the wiggle animation
        f.btn.classList.add('wrong');
        later(() => f.btn.classList.remove('wrong'), 450);
      }
    }

    function collect(f) {
      f.flying = true;
      f.btn.style.pointerEvents = 'none';
      const idx = nextIdx;
      nextIdx++;
      fallers = fallers.filter((x) => x !== f);

      // fly down toward the strip, shrinking as it goes
      const W = sky.clientWidth;
      const H = sky.clientHeight;
      const w = f.node.offsetWidth;
      const h = f.node.offsetHeight;
      f.node.style.transition = 'transform 0.35s ease-in, opacity 0.35s ease-in';
      f.node.style.transform = `translate(${(W - w) / 2}px, ${H - h * 0.4}px) scale(0.4)`;
      f.node.style.opacity = '0';
      later(() => f.node.remove(), 400);

      // land in the built-so-far strip
      later(() => {
        const slot = slots[idx];
        slot.textContent = chunkWords[idx];
        slot.className = 'word-tile correct';
      }, 280);

      if (nextIdx >= chunkWords.length) {
        roundActive = false;
        endRound();
      } else {
        const rep = replacementWord();
        spawnFaller(rep.word, rep.isDistractor, 0, ctx.randInt(fallerCount));
      }
    }

    // ----- rounds -----
    function startRound() {
      nextIdx = 0;
      chunkWords = rounds[roundIdx];
      partLabel.textContent = rounds.length > 1
        ? `Part ${roundIdx + 1} of ${rounds.length}`
        : ctx.verse.label;

      clear(strip);
      slots = chunkWords.map(() => el('span', 'word-tile ghost', '?'));
      slots.forEach((s) => strip.appendChild(s));

      for (const f of fallers) f.node.remove();
      fallers = [];

      const set = [{ word: chunkWords[0], isDistractor: false }];
      if (ctx.hard) {
        const d = ctx.distractors(1);
        if (d.length) set.push({ word: d[0], isDistractor: true });
      }
      while (set.length < fallerCount) {
        const w = pickDecoy(set.map((s) => cleanWord(s.word)));
        set.push({ word: w, isDistractor: false });
      }
      shuffle(set).forEach((wd, i) => spawnFaller(wd.word, wd.isDistractor, i * 110, i % fallerCount));

      roundActive = true;
      if (roundIdx > 0) speakChunk(); // round 0 already heard the whole verse
    }

    function endRound() {
      const gone = fallers;
      fallers = [];
      for (const f of gone) {
        f.node.style.transition = 'opacity 0.4s';
        f.node.style.opacity = '0';
      }
      later(() => gone.forEach((f) => f.node.remove()), 420);

      roundIdx++;
      if (roundIdx < rounds.length) {
        sfx.pop();
        later(startRound, 900);
      } else {
        running = false;
        cancelAnimationFrame(rafId);
        ctx.confetti();
        const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
        later(() => ctx.win({ stars }), 700);
      }
    }

    // ----- tap to start -----
    const overlay = el('div', 'start-overlay');
    const startNote = el('p', null, '☁️ Tap the word that comes next! ☁️');
    const startBtn = el('button', 'btn btn-primary btn-big', '🌧️ Tap to start!');
    overlay.append(startNote, startBtn);
    sky.appendChild(overlay);
    startBtn.onclick = () => {
      sfx.pop();
      overlay.remove();
      running = true;
      lastTs = 0;
      rafId = requestAnimationFrame(loop);
      startRound();
    };

    // ----- cleanup -----
    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
