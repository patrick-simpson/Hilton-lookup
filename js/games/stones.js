// Stepping Stones — a frog crosses the river by hopping onto the stone that
// carries the next word of the verse. Wrong stones go 💦 splash (no fail —
// just try again). Long verses become several river crossings (~10 hops each);
// book lists put Bible book names on the stones. Hard mode: 3 stones per hop
// and longer crossings.

export default {
  id: 'stones',
  title: 'Stepping Stones',
  icon: '🪨',
  tagline: 'Hop the frog across the river!',
  howTo: 'Help the frog cross the river! Tap the stone with the word that comes next and the frog hops onto it. Wrong stones go splash — just try again. Tap 🔊 to hear the verse.',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx, cleanWord } = ctx;

    ctx.addStyle(`
      .g-stones { text-align: center; }
      .g-stones .st-head { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; }
      .g-stones .st-listen { min-height: 52px; min-width: 52px; padding: 8px 16px; }
      .g-stones .st-label { font-weight: bold; opacity: 0.75; }
      .g-stones .st-scene { position: relative; height: 300px; max-width: 520px; margin: 0 auto; border-radius: 18px; overflow: hidden; box-shadow: inset 0 0 0 3px rgba(38,50,75,0.08); }
      .g-stones .st-bank { position: absolute; left: 0; right: 0; height: 18%; z-index: 1; }
      .g-stones .st-bank-top { top: 0; background: linear-gradient(180deg, #9fdb7a, #6cbf5a); border-bottom: 4px solid #57a84e; }
      .g-stones .st-bank-bottom { bottom: 0; background: linear-gradient(0deg, #9fdb7a, #6cbf5a); border-top: 4px solid #57a84e; }
      .g-stones .st-river { position: absolute; left: 0; right: 0; top: 18%; bottom: 18%; background: linear-gradient(180deg, #8fd0f7 0%, #57a8e8 55%, #3c8fd8 100%); }
      .g-stones .st-deco { position: absolute; z-index: 2; pointer-events: none; font-size: 1.3rem; line-height: 1; transform: translate(-50%, -50%); }
      .g-stones .st-wave { position: absolute; z-index: 1; pointer-events: none; opacity: 0.55; font-size: 1.1rem; line-height: 1; animation: g-stones-drift 3.5s ease-in-out infinite alternate; }
      @keyframes g-stones-drift {
        from { transform: translate(-50%, -50%) translateX(-8px); }
        to   { transform: translate(-50%, -50%) translateX(8px); }
      }
      .g-stones .st-stone-pos { position: absolute; z-index: 3; max-width: 40%; transform: translate(-50%, -50%); transition: top 0.5s cubic-bezier(0.4, 0.9, 0.4, 1), transform 0.55s ease, opacity 0.55s ease; }
      .g-stones .st-scene.three .st-stone-pos { max-width: 31%; }
      .g-stones .st-stone-pos.sink { transform: translate(-50%, -10%); opacity: 0; }
      .g-stones .st-bob { animation: g-stones-bob 2.8s ease-in-out infinite; }
      .g-stones .st-stone-pos.held .st-bob { animation: none; }
      @keyframes g-stones-bob {
        0%, 100% { transform: translateY(0) rotate(-1deg); }
        50%      { transform: translateY(-7px) rotate(1deg); }
      }
      .g-stones .st-stone { display: flex; align-items: center; justify-content: center; width: 100%; min-width: 76px; min-height: 56px; padding: 8px 14px; border-radius: 24px; background: linear-gradient(180deg, #eef1f5, #bcc6d0); border: 3px solid #93a1b1; color: var(--ink, #26324b); font-size: 1.1rem; font-weight: bold; line-height: 1.15; text-align: center; overflow-wrap: normal; word-break: normal; user-select: none; box-shadow: 0 5px 0 rgba(20, 60, 110, 0.25), 0 12px 10px -6px rgba(10, 40, 80, 0.35); transition: transform 0.08s ease; }
      .g-stones .st-scene.three .st-stone { font-size: 0.98rem; padding: 8px 10px; min-width: 60px; }
      .g-stones .st-stone:disabled { color: var(--ink, #26324b); opacity: 1; cursor: default; }
      .g-stones .st-stone:active { transform: translateY(3px); }
      .g-stones .st-stone.spawn { animation: pop-in 0.3s ease; }
      .g-stones .st-stone.wrong { animation: wiggle 0.35s ease; background: linear-gradient(180deg, #ffd6d9, #f3aab0); border-color: var(--red, #e63946); }
      .g-stones .st-frog { position: absolute; z-index: 5; pointer-events: none; transform: translate(-50%, -80%); transition: left 0.5s cubic-bezier(0.4, 0.9, 0.4, 1), top 0.5s cubic-bezier(0.4, 0.9, 0.4, 1); }
      .g-stones .st-frog-body { display: inline-block; font-size: 2.5rem; line-height: 1; filter: drop-shadow(0 4px 3px rgba(20, 40, 80, 0.35)); }
      .g-stones .st-frog-body.hop { animation: g-stones-hop 0.5s ease; }
      @keyframes g-stones-hop {
        0%   { transform: translateY(0) scale(1); }
        45%  { transform: translateY(-36px) scale(1.18); }
        100% { transform: translateY(0) scale(1); }
      }
      .g-stones .st-frog-body.party { animation: g-stones-party 0.9s ease infinite; }
      @keyframes g-stones-party {
        0%, 100% { transform: translateY(0) rotate(0deg); }
        30%      { transform: translateY(-22px) rotate(-12deg); }
        60%      { transform: translateY(-22px) rotate(12deg); }
      }
      .g-stones .st-splash { position: absolute; z-index: 6; pointer-events: none; font-size: 2.2rem; line-height: 1; animation: g-stones-splash 0.7s ease-out forwards; }
      @keyframes g-stones-splash {
        0%   { opacity: 1; transform: translate(-50%, -50%) scale(0.5); }
        100% { opacity: 0; transform: translate(-50%, -130%) scale(1.5); }
      }
      .g-stones .st-banner { position: absolute; inset: 0; z-index: 7; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; background: rgba(255, 255, 255, 0.75); animation: pop-in 0.3s ease; }
      .g-stones .st-ask { font-weight: bold; font-size: 1.15rem; margin: 8px 0 2px; }
      .g-stones .st-strip { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; min-height: 40px; padding: 4px; }
      .g-stones .st-chip { display: inline-flex; align-items: center; justify-content: center; min-width: 34px; min-height: 34px; padding: 4px 10px; border-radius: 12px; background: #e6ebf3; color: #9aa7bd; font-weight: bold; font-size: 0.95rem; border: 2px solid transparent; }
      .g-stones .st-chip.filled { background: var(--green-soft, #d3f2d9); color: var(--ink, #26324b); border-color: var(--green, #2a9d3f); animation: pop-in 0.25s ease; }
      /* Short phones: trim the river so the prompt + progress stay on screen. */
      @media (max-height: 700px) {
        .g-stones .st-scene { height: 256px; }
        .g-stones .st-ask { margin: 6px 0 0; }
        .g-stones .st-strip { gap: 4px; padding: 2px; min-height: 32px; }
        .g-stones .st-chip { min-height: 28px; min-width: 28px; font-size: 0.85rem; padding: 2px 8px; }
      }
      /* Narrow phones: keep the prompt to one line-ish. */
      @media (max-width: 380px) {
        .g-stones .st-ask { font-size: 1rem; }
      }
    `);

    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
    };

    const root = el('div', 'g-stones');
    stage.appendChild(root);

    // ---- difficulty & crossings (balanced chunks, ~10 hops per river) ----
    const target = ctx.hard ? 12 : 9;
    const choiceCount = ctx.hard ? 3 : 2;
    const LEFTS = choiceCount === 3 ? [17, 50, 83] : [28, 72];
    const AHEAD = 36, SEAT = 64, BANK_TOP = 9, BANK_BOT = 90; // % of scene height

    const allWords = ctx.verse.words;
    const nCross = Math.max(1, Math.ceil(allWords.length / target));
    const size = Math.ceil(allWords.length / nCross);
    const crossings = ctx.chunk(allWords, size);

    let crossingIdx = 0;
    let stepIdx = 0;
    let mistakes = 0;
    let locked = false;
    let finished = false;
    let seat = null;      // stone wrapper the frog is resting on
    let choiceEls = [];   // current floating choice stones
    let chips = [];       // progress chips for the current crossing

    // ---- header: listen button + river counter ----
    const head = el('div', 'st-head');
    const listen = el('button', 'btn st-listen', '🔊');
    listen.onclick = () => { sfx.click(); ctx.speak(); };
    const label = el('div', 'st-label', '');
    head.append(listen, label);
    root.appendChild(head);

    // ---- river scene ----
    const scene = el('div', 'st-scene' + (choiceCount === 3 ? ' three' : ''));
    root.appendChild(scene);
    scene.appendChild(el('div', 'st-river'));
    scene.appendChild(el('div', 'st-bank st-bank-top'));
    scene.appendChild(el('div', 'st-bank st-bank-bottom'));

    function deco(txt, left, top, fontSize, cls) {
      const d = el('span', cls || 'st-deco', txt);
      d.style.left = left + '%';
      d.style.top = top + '%';
      if (fontSize) d.style.fontSize = fontSize;
      scene.appendChild(d);
      return d;
    }
    deco('🌳', 8, 9, '1.7rem'); deco('🚩', 50, 8, '1.6rem'); deco('🌳', 91, 9, '1.7rem');
    deco('🌼', 27, 12); deco('🌷', 71, 12);
    deco('🌱', 13, 91); deco('🌼', 36, 92); deco('🌷', 64, 91); deco('🌳', 90, 90, '1.6rem');
    deco('🪷', 6, 58); deco('🪷', 94, 44);
    for (const [x, y, delay] of [[14, 26, '0s'], [84, 52, '1.1s'], [24, 76, '0.6s'], [68, 27, '1.7s']]) {
      deco('〰️', x, y, null, 'st-wave').style.animationDelay = delay;
    }

    const frog = el('div', 'st-frog');
    const frogBody = el('span', 'st-frog-body', '🐸');
    frog.appendChild(frogBody);
    scene.appendChild(frog);

    // ---- prompt + progress strip ----
    const ask = el('div', 'st-ask', '🤔 Tap the stone with the next word!');
    const strip = el('div', 'st-strip');
    root.append(ask, strip);

    // ---- frog movement helpers ----
    function moveFrog(leftPct, topPct) {
      frog.style.left = leftPct + '%';
      frog.style.top = topPct + '%';
    }
    function snapFrog(leftPct, topPct) {
      frog.style.transition = 'none';
      moveFrog(leftPct, topPct);
      void frog.offsetWidth;
      frog.style.transition = '';
    }
    function hop() {
      frogBody.classList.remove('hop', 'party');
      void frogBody.offsetWidth;
      frogBody.classList.add('hop');
    }

    function splashAt(wrap) {
      const s = el('span', 'st-splash', '💦');
      s.style.left = wrap.style.left;
      s.style.top = wrap.style.top;
      scene.appendChild(s);
      later(() => s.remove(), 750);
    }

    function sinkStone(wrap) {
      wrap.classList.add('sink');
      // A sinking stone must stop being a button right away — a stale tap on
      // it (or on the stone the frog sits on) must never count as an answer.
      for (const b of wrap.querySelectorAll('button')) b.disabled = true;
      later(() => wrap.remove(), 650);
    }

    // ---- progress strip: one chip per hop of this crossing ----
    function buildStrip() {
      clear(strip);
      chips = crossings[crossingIdx].map(() => {
        const c = el('span', 'st-chip', '•');
        strip.appendChild(c);
        return c;
      });
    }

    // ---- choice stones ----
    function buildOptions(correct, globalIdx) {
      const opts = [{ w: correct, ok: true }];
      const seen = new Set([cleanWord(correct)]);
      const addFrom = (pool) => {
        for (const w of pool) {
          if (opts.length >= choiceCount) return;
          const c = cleanWord(w);
          if (!c || seen.has(c)) continue;
          seen.add(c);
          opts.push({ w, ok: false });
        }
      };
      addFrom(shuffle(allWords.slice(globalIdx + 1))); // upcoming verse words first
      if (opts.length < choiceCount) addFrom(ctx.distractors(choiceCount * 4));
      if (opts.length < choiceCount) addFrom(shuffle(allWords.slice(0, globalIdx)));
      return shuffle(opts);
    }

    // Shrink a stone's label until it fits without breaking inside a word —
    // long book names ("1 Thessalonians") must wrap at spaces or scale down,
    // never split mid-word for early readers.
    function fitStone(btn) {
      let s = choiceCount === 3 ? 0.98 : 1.1;
      while (s > 0.72 && btn.scrollWidth > btn.clientWidth + 1) {
        s -= 0.06;
        btn.style.fontSize = s.toFixed(2) + 'rem';
      }
      if (btn.scrollWidth > btn.clientWidth + 1) btn.style.overflowWrap = 'anywhere';
    }

    function spawnChoices() {
      const words = crossings[crossingIdx];
      const correct = words[stepIdx];
      const globalIdx = crossingIdx * size + stepIdx;
      const opts = buildOptions(correct, globalIdx);
      choiceEls = [];
      opts.forEach((opt, i) => {
        const wrap = el('div', 'st-stone-pos');
        wrap.style.left = LEFTS[i % LEFTS.length] + '%';
        wrap.style.top = AHEAD + '%';
        const bob = el('div', 'st-bob');
        bob.style.animationDelay = (Math.random() * 1.6).toFixed(2) + 's';
        bob.style.animationDuration = (2.4 + Math.random() * 0.9).toFixed(2) + 's';
        const btn = el('button', 'st-stone spawn', opt.w);
        btn.type = 'button';
        btn.onclick = () => tapStone(opt, wrap, btn);
        later(() => btn.classList.remove('spawn'), 400);
        bob.appendChild(btn);
        wrap.appendChild(bob);
        scene.appendChild(wrap);
        fitStone(btn);
        choiceEls.push(wrap);
      });
    }

    function tapStone(opt, wrap, btn) {
      if (locked || finished) return;
      if (!opt.ok) {
        mistakes++;
        sfx.wrong();
        splashAt(wrap);
        btn.classList.remove('wrong');
        void btn.offsetWidth; // restart the wiggle animation
        btn.classList.add('wrong');
        later(() => btn.classList.remove('wrong'), 450);
        return;
      }
      locked = true;
      sfx.correct();
      btn.disabled = true; // used up — the frog's stone must not answer again
      wrap.classList.add('held'); // stop bobbing while the frog stands on it
      const chip = chips[stepIdx];
      chip.textContent = opt.w;
      chip.classList.add('filled');
      moveFrog(parseFloat(wrap.style.left), AHEAD);
      hop();
      for (const c of choiceEls) if (c !== wrap) sinkStone(c);
      choiceEls = [wrap];
      later(advance, 560);
    }

    function advance() {
      const wrap = choiceEls[0];
      stepIdx++;
      if (stepIdx >= crossings[crossingIdx].length) {
        reachBank(wrap);
        return;
      }
      // The river flows on: the old resting stone drifts away, the frog's
      // stone settles into the resting spot, and new stones float up ahead.
      if (seat) sinkStone(seat);
      seat = wrap;
      wrap.style.top = SEAT + '%';
      moveFrog(parseFloat(wrap.style.left), SEAT);
      later(() => { locked = false; spawnChoices(); }, 560);
    }

    function reachBank(wrap) {
      sfx.pop();
      moveFrog(50, BANK_TOP);
      hop();
      if (seat) sinkStone(seat);
      seat = null;
      later(() => sinkStone(wrap), 420);
      crossingIdx++;
      if (crossingIdx < crossings.length) {
        ask.textContent = '🎉 You made it across!';
        const banner = el('div', 'st-banner', '⏭️ Next river!');
        scene.appendChild(banner);
        later(() => {
          banner.remove();
          ask.textContent = '🤔 Tap the stone with the next word!';
          startCrossing();
        }, 1400);
      } else {
        celebrate();
      }
    }

    function celebrate() {
      finished = true;
      ask.textContent = '🎉 You crossed the river!';
      frogBody.classList.remove('hop');
      later(() => {
        frogBody.classList.add('party');
        deco('🎉', 32, 9, '1.6rem');
        deco('✨', 50, 4, '1.4rem');
        deco('🎉', 68, 9, '1.6rem');
      }, 550);
      ctx.confetti();
      ctx.speak();
      const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
      later(() => ctx.win({ stars, message: 'You hopped all the way across!' }), 1800);
    }

    function startCrossing() {
      stepIdx = 0;
      locked = false;
      for (const n of scene.querySelectorAll('.st-stone-pos')) n.remove();
      seat = null;
      label.textContent = crossings.length > 1
        ? `🏞️ River ${crossingIdx + 1} of ${crossings.length}`
        : '';
      buildStrip();
      snapFrog(50, BANK_BOT);
      hop();
      spawnChoices();
    }

    startCrossing();
    ctx.speak();

    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  },
};
