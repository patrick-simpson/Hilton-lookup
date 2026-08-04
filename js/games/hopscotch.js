// Verse Hopscotch — a kangaroo hops up a chalk hopscotch court, one square
// per word. The kid taps the word that comes next; correct answers make the
// kangaroo hop onto the next square and fill it in. Long verses play as
// multiple courts. Hard mode: bigger courts and 3 choice tiles instead of 2.

export default {
  id: 'hopscotch',
  title: 'Verse Hopscotch',
  icon: '🦘',
  tagline: 'Hop up the court, one word at a time!',
  howTo: 'Help the kangaroo hop to the top! Tap the word that comes next in the verse and watch it hop onto the next square. Tap 🔊 to hear the verse again.',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx, cleanWord } = ctx;

    ctx.addStyle(`
      .g-hopscotch { text-align: center; }
      .g-hopscotch .hs-head { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
      .g-hopscotch .hs-label { font-weight: bold; opacity: 0.75; }
      .g-hopscotch .hs-listen { min-height: 52px; min-width: 52px; padding: 8px 16px; }
      .g-hopscotch .hs-wrap { position: relative; max-width: 420px; margin: 0 auto 10px; padding: 14px 10px 4px; border-radius: 18px; background: linear-gradient(180deg, #e6f3ff, #f4fbe6); }
      .g-hopscotch .hs-row { display: flex; justify-content: center; gap: 10px; margin: 8px auto; }
      .g-hopscotch .hs-sq { display: flex; align-items: center; justify-content: center; min-height: 54px; width: 58%; padding: 6px 8px; border-radius: 14px; border: 3px dashed #9db8dd; background: rgba(255,255,255,0.9); font-weight: bold; font-size: 1.05rem; color: #93a9cc; overflow-wrap: anywhere; }
      .g-hopscotch .hs-row.double .hs-sq { width: 47%; }
      .g-hopscotch .hs-sq.filled { border-style: solid; border-color: var(--green); background: var(--green-soft); color: var(--ink); animation: pop-in 0.3s ease; }
      .g-hopscotch .hs-start { height: 54px; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; letter-spacing: 8px; opacity: 0.85; }
      .g-hopscotch .hs-roo { position: absolute; left: 0; top: 0; z-index: 5; pointer-events: none; transform: translate(-50%, -70%); transition: left 0.45s cubic-bezier(0.4, 0.9, 0.4, 1), top 0.45s cubic-bezier(0.4, 0.9, 0.4, 1); }
      .g-hopscotch .hs-roo-body { display: inline-block; font-size: 2.5rem; filter: drop-shadow(0 4px 3px rgba(38,50,75,0.3)); }
      .g-hopscotch .hs-roo-body.hop { animation: hs-hop 0.45s ease; }
      .g-hopscotch .hs-roo-body.flip { animation: hs-flip 1s ease; }
      @keyframes hs-hop {
        0%   { transform: translateY(0) scale(1); }
        45%  { transform: translateY(-38px) scale(1.15); }
        80%  { transform: translateY(0) scale(1); }
        90%  { transform: translateY(2px) scaleY(0.8) scaleX(1.15); }
        100% { transform: translateY(0) scale(1); }
      }
      @keyframes hs-flip {
        0%   { transform: translateY(0) rotate(0deg); }
        30%  { transform: translateY(-50px) rotate(-180deg); }
        60%  { transform: translateY(-50px) rotate(-360deg); }
        85%  { transform: translateY(2px) rotate(-360deg) scaleY(0.85); }
        100% { transform: translateY(0) rotate(-360deg); }
      }
      .g-hopscotch .hs-banner { position: absolute; inset: 0; z-index: 6; display: flex; align-items: center; justify-content: center; font-size: 1.7rem; font-weight: bold; background: rgba(255,255,255,0.8); border-radius: 18px; animation: pop-in 0.3s ease; }
      .g-hopscotch .hs-ask { font-weight: bold; font-size: 1.15rem; margin: 6px 0; }
      .g-hopscotch .hs-choices { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; padding-bottom: 6px; }
      .g-hopscotch .hs-choice { min-height: 58px; min-width: 100px; max-width: 100%; padding: 10px 22px; border-radius: 18px; background: var(--blue-soft); border: 3px solid transparent; font-size: 1.25rem; font-weight: bold; box-shadow: 0 5px 0 rgba(38,50,75,0.15); transition: transform 0.08s ease; overflow-wrap: anywhere; }
      .g-hopscotch .hs-choice:active { transform: translateY(3px); box-shadow: none; }
      .g-hopscotch .hs-choice.wrong { animation: wiggle 0.35s ease; background: var(--red-soft); }
    `);

    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
    };
    let rafId = 0;

    const root = el('div', 'g-hopscotch');
    stage.appendChild(root);

    const chunkSize = ctx.hard ? 10 : 8;
    const courts = ctx.chunk(ctx.verse.words, chunkSize);
    const choiceCount = ctx.hard ? 3 : 2;
    let courtIdx = 0;
    let wordIdx = 0;
    let mistakes = 0;
    let finished = false;
    let locked = false;
    let squares = [];
    let spot = null; // element the kangaroo is standing on

    // ---- header (listen button + court progress) ----
    const head = el('div', 'hs-head');
    const listen = el('button', 'btn hs-listen', '🔊');
    listen.onclick = () => { sfx.click(); ctx.speak(); };
    const label = el('div', 'hs-label', '');
    head.append(listen, label);
    root.appendChild(head);

    // ---- court + kangaroo ----
    const wrap = el('div', 'hs-wrap');
    root.appendChild(wrap);
    const roo = el('div', 'hs-roo');
    const rooBody = el('span', 'hs-roo-body', '🦘');
    roo.appendChild(rooBody);

    // ---- question + choices ----
    const ask = el('div', 'hs-ask', '🤔 What comes next?');
    const choices = el('div', 'hs-choices');
    root.append(ask, choices);

    function placeRoo(target) {
      spot = target;
      roo.style.left = (target.offsetLeft + target.offsetWidth / 2) + 'px';
      roo.style.top = (target.offsetTop + 8) + 'px';
    }

    function snapRoo(target) { // move without the glide animation
      roo.style.transition = 'none';
      placeRoo(target);
      void roo.offsetWidth;
      roo.style.transition = '';
    }

    function bounceBody(cls) {
      rooBody.classList.remove('hop', 'flip');
      void rooBody.offsetWidth;
      rooBody.classList.add(cls);
    }

    function buildCourt() {
      clear(wrap);
      squares = [];
      wordIdx = 0;
      const words = courts[courtIdx];
      label.textContent = courts.length > 1 ? `Court ${courtIdx + 1} of ${courts.length}` : '';

      // Classic pattern from the bottom up: single, double, single, double...
      const rowEls = [];
      let i = 0;
      let dbl = false;
      while (i < words.length) {
        const take = dbl ? Math.min(2, words.length - i) : 1;
        const rowEl = el('div', 'hs-row' + (take === 2 ? ' double' : ''));
        for (let k = 0; k < take; k++) {
          const sq = el('div', 'hs-sq', String(i + k + 1));
          squares.push(sq);
          rowEl.appendChild(sq);
        }
        rowEls.push(rowEl);
        i += take;
        dbl = !dbl;
      }
      // Bottom row (word 1) goes last in the DOM so the court climbs upward.
      for (let r = rowEls.length - 1; r >= 0; r--) wrap.appendChild(rowEls[r]);

      const startPad = el('div', 'hs-start', '🌼🌱🌼');
      wrap.appendChild(startPad);
      wrap.appendChild(roo);
      snapRoo(startPad);
      bounceBody('hop');
      askNext();
    }

    function askNext() {
      clear(choices);
      const words = courts[courtIdx];
      const correct = words[wordIdx];
      const opts = [correct];
      const seen = new Set([cleanWord(correct)]);
      // Decoys: remaining words of this court first, then verse-wide distractors.
      for (const w of shuffle(words.slice(wordIdx + 1))) {
        if (opts.length >= choiceCount) break;
        const c = cleanWord(w);
        if (seen.has(c)) continue;
        seen.add(c);
        opts.push(w);
      }
      if (opts.length < choiceCount) {
        for (const w of ctx.distractors(choiceCount * 4)) {
          if (opts.length >= choiceCount) break;
          const c = cleanWord(w);
          if (seen.has(c)) continue;
          seen.add(c);
          opts.push(w);
        }
      }
      for (const w of shuffle(opts)) {
        const btn = el('button', 'hs-choice', w);
        btn.onclick = () => choose(btn, w, correct);
        choices.appendChild(btn);
      }
    }

    function choose(btn, w, correct) {
      if (finished || locked) return;
      if (cleanWord(w) === cleanWord(correct)) {
        locked = true;
        sfx.correct();
        const sq = squares[wordIdx];
        sq.textContent = correct;
        sq.classList.add('filled');
        placeRoo(sq);
        bounceBody('hop');
        wordIdx++;
        clear(choices);
        later(() => {
          locked = false;
          if (wordIdx >= courts[courtIdx].length) courtDone();
          else askNext();
        }, 520);
      } else {
        mistakes++;
        sfx.wrong();
        btn.classList.remove('wrong');
        void btn.offsetWidth;
        btn.classList.add('wrong');
      }
    }

    function courtDone() {
      courtIdx++;
      if (courtIdx < courts.length) {
        sfx.pop();
        ask.textContent = '🎉 Great hopping!';
        wrap.appendChild(el('div', 'hs-banner', '⏭️ Next court!'));
        later(() => {
          ask.textContent = '🤔 What comes next?';
          buildCourt(); // clears the banner too
        }, 1300);
      } else {
        finished = true;
        clear(choices);
        ask.textContent = '🎉 You hopped to the top!';
        sfx.pop();
        bounceBody('flip');
        ctx.confetti();
        ctx.speak();
        const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
        later(() => ctx.win({ stars }), 1600);
      }
    }

    const onResize = () => { if (spot && spot.isConnected) snapRoo(spot); };
    window.addEventListener('resize', onResize);

    buildCourt();
    // Re-snap once the layout has definitely settled (fonts, first paint).
    rafId = requestAnimationFrame(() => { onResize(); rafId = 0; });

    ctx.speak();

    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
    };
  },
};
