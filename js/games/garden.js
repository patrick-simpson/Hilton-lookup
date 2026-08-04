// Verse Garden — water your verse-plant by finishing three fill-in-the-blank
// rounds. Each completed round pours water and grows the plant one stage:
// 🌰 -> 🌱 -> 🌿 -> 🌻. Long verses play phrase-by-phrase (one chunk per round);
// short verses repeat with different blanks. Hard mode adds a blank and a decoy.

export default {
  id: 'garden',
  title: 'Verse Garden',
  icon: '🌻',
  tagline: 'Grow a flower with your verse!',
  howTo: 'Some words are missing! Tap the right word for each blank. Every round you finish waters your plant — watch it grow from a seed into a big sunflower!',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx, cleanWord } = ctx;

    ctx.addStyle(`
      .g-garden { position: relative; text-align: center; }
      .g-garden .garden-top { display: flex; align-items: center; justify-content: center; gap: 18px; flex-wrap: wrap; margin-bottom: 4px; }
      .g-garden .pot-zone { position: relative; width: 150px; min-height: 140px; background: linear-gradient(180deg, #dff2ff, #e6f6d8); border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 4px; }
      .g-garden .plant { position: relative; z-index: 1; display: inline-block; font-size: 3.4rem; line-height: 1; margin-bottom: -14px; }
      .g-garden .plant.grow { animation: pop-in 0.5s ease; }
      .g-garden .pot { font-size: 2.8rem; line-height: 1; }
      .g-garden .can { position: absolute; top: 2px; right: 4px; z-index: 2; font-size: 2.2rem; opacity: 0; transform-origin: 60% 80%; pointer-events: none; }
      .g-garden .can.pouring { animation: g-garden-pour 1.4s ease; }
      .g-garden .drop { position: absolute; top: 42px; z-index: 2; font-size: 1rem; opacity: 0; pointer-events: none; animation: g-garden-drip 0.65s ease-in forwards; }
      .g-garden .side { display: flex; flex-direction: column; align-items: center; gap: 8px; }
      .g-garden .side-info { display: contents; }
      .g-garden .round-label { font-weight: bold; opacity: 0.75; }
      .g-garden .drops-meter { font-size: 1.5rem; letter-spacing: 5px; }
      .g-garden .drops-meter .pending { opacity: 0.25; }
      .g-garden .drops-meter .earned { display: inline-block; animation: pop-in 0.3s ease; }
      .g-garden .verse-area { background: #f4f8ff; border-radius: 16px; padding: 12px 10px; margin: 10px 0; font-size: 1.18rem; line-height: 2.1; }
      .g-garden .vw { display: inline-block; margin: 0 3px; }
      .g-garden .blank { display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; min-width: 64px; min-height: 40px; margin: 2px 3px; padding: 2px 10px; background: #fff; border: 3px dashed #b9cdf0; border-radius: 12px; font-weight: bold; }
      .g-garden .blank.next { border-color: var(--yellow); background: #fff7df; animation: g-garden-pulse 1.1s ease-in-out infinite; }
      .g-garden .blank.done { border-style: solid; border-color: var(--green); background: var(--green-soft); animation: pop-in 0.3s ease; }
      .g-garden .choices .word-tile.used { opacity: 0.3; pointer-events: none; box-shadow: none; }
      /* think-first beat: word-bank buttons render wordless+disabled until
         the beat resolves (once per round, before the first blank), then
         fade in. */
      .g-garden .choices .word-tile { transition: opacity 0.25s ease; }
      .g-garden .choices .word-tile.wordless { opacity: 0; }
      .g-garden .choices .word-tile.revealed { animation: pop-in 0.3s ease; }
      .g-garden .bfly { position: absolute; z-index: 5; font-size: 2.1rem; pointer-events: none; animation-name: g-garden-flutter; animation-timing-function: ease-in-out; animation-iteration-count: infinite; animation-duration: 3s; }
      .g-garden .bloom-note { font-size: 1.3rem; margin-top: 6px; font-weight: bold; }
      @keyframes g-garden-pour {
        0% { opacity: 0; transform: rotate(0deg) translateY(-8px); }
        20% { opacity: 1; transform: rotate(-32deg) translateY(0); }
        80% { opacity: 1; transform: rotate(-32deg) translateY(0); }
        100% { opacity: 0; transform: rotate(0deg) translateY(-8px); }
      }
      @keyframes g-garden-drip {
        0% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(58px); }
      }
      @keyframes g-garden-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.07); }
      }
      @keyframes g-garden-flutter {
        0%, 100% { transform: translate(0, 0) rotate(-12deg); }
        25% { transform: translate(20px, -24px) rotate(10deg); }
        50% { transform: translate(-8px, -44px) rotate(-8deg); }
        75% { transform: translate(-22px, -16px) rotate(12deg); }
      }
      /* Short phones: shrink the pot band and tighten the verse + tiles so
         pot, blanks and word choices share one screen with no scrolling. */
      @media (max-height: 780px) {
        .g-garden .garden-top { gap: 8px; flex-wrap: nowrap; }
        .g-garden .pot-zone { width: 100px; min-height: 88px; }
        .g-garden .plant { font-size: 2.2rem; margin-bottom: -8px; }
        .g-garden .pot { font-size: 1.8rem; }
        .g-garden .can { font-size: 1.6rem; top: 0; right: 2px; }
        .g-garden .drop { top: 26px; font-size: 0.85rem; }
        .g-garden .side { flex-direction: row; gap: 8px; }
        .g-garden .side-info { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .g-garden .side .btn { min-height: 48px; padding: 8px 12px; font-size: 1rem; }
        .g-garden .round-label { font-size: 0.9rem; }
        .g-garden .drops-meter { font-size: 1.1rem; letter-spacing: 2px; }
        .g-garden .verse-area { padding: 8px; margin: 8px 0; font-size: 1.1rem; line-height: 1.8; }
        .g-garden .blank { min-width: 54px; min-height: 34px; padding: 1px 8px; border-width: 2px; border-radius: 10px; }
        .g-garden .choices { margin: 6px 0 2px; }
        .g-garden .choices .word-tile { min-height: 48px; padding: 8px 13px; margin: 3px; font-size: 1.08rem; }
      }
    `);

    // ---- timers (all cleared on unmount) ----
    const timers = new Set();
    const wait = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
    };

    // ---- state ----
    const STAGES = ['🌰', '🌱', '🌿', '🌻'];
    const ROUNDS = 3;
    const words = ctx.verse.words;
    const isList = ctx.verse.isList;
    let roundIdx = 0;
    let stageIdx = 0;
    let mistakes = 0;
    const usedBlankIdxs = new Set(); // keeps blanks different between whole-verse rounds

    // Long verses (or long book lists) play phrase-by-phrase: one chunk per round.
    let roundWords;
    if (words.length > 18) {
      roundWords = ctx.chunk(words, Math.ceil(words.length / ROUNDS));
      while (roundWords.length < ROUNDS) roundWords.push(words); // safety net
    } else {
      roundWords = [words, words, words];
    }

    // Tidy display for choice tiles (strip stray punctuation; book names untouched).
    const tidy = (w) => (isList ? w : (w.replace(/^[^A-Za-z0-9'’]+|[^A-Za-z0-9'’]+$/g, '') || w));

    // ---- static layout ----
    const root = el('div', 'g-garden');
    stage.appendChild(root);

    const top = el('div', 'garden-top');
    const potZone = el('div', 'pot-zone');
    const can = el('div', 'can', '🚿');
    const plant = el('div', 'plant', STAGES[0]);
    const pot = el('div', 'pot', '🪴');
    potZone.append(can, plant, pot);

    const side = el('div', 'side');
    const sideInfo = el('div', 'side-info');
    const roundLabel = el('div', 'round-label', `Round 1 of ${ROUNDS}`);
    const meter = el('div', 'drops-meter');
    const meterDrops = [];
    for (let i = 0; i < ROUNDS; i++) {
      const d = el('span', 'pending', '💧');
      meterDrops.push(d);
      meter.appendChild(d);
    }
    sideInfo.append(roundLabel, meter);
    const listenBtn = el('button', 'btn', '🔊 Hear it');
    listenBtn.onclick = () => { sfx.click(); ctx.speak(); };
    side.append(sideInfo, listenBtn);

    top.append(potZone, side);
    root.appendChild(top);

    const quiz = el('div', 'quiz');
    root.appendChild(quiz);

    ctx.speak();

    // ---- blank picking: prefer meaty words not blanked in earlier rounds ----
    function pickBlanks(rw, n) {
      const strong = [];
      const weak = [];
      rw.forEach((w, i) => {
        const c = cleanWord(w);
        if (!c) return;
        (c.length >= 3 ? strong : weak).push(i);
      });
      const pool = [
        ...shuffle(strong.filter((i) => !usedBlankIdxs.has(i))),
        ...shuffle(weak.filter((i) => !usedBlankIdxs.has(i))),
        ...shuffle(strong.filter((i) => usedBlankIdxs.has(i))),
        ...shuffle(weak.filter((i) => usedBlankIdxs.has(i))),
      ];
      if (!pool.length) pool.push(0);
      const chosen = pool.slice(0, Math.min(n, pool.length)).sort((a, b) => a - b);
      // Only track reuse when rounds share the same words (short verses).
      if (roundWords[0] === roundWords[1]) chosen.forEach((i) => usedBlankIdxs.add(i));
      return chosen;
    }

    // ---- one fill-in-the-blank round ----
    async function playRound() {
      clear(quiz);
      roundLabel.textContent = `Round ${roundIdx + 1} of ${ROUNDS}`;

      const rw = roundWords[roundIdx];
      const base = [2, 3, 4][roundIdx] + (ctx.hard ? 1 : 0);
      const n = Math.max(1, Math.min(base, Math.ceil(rw.length / 3)));
      const blankIdxs = pickBlanks(rw, n);
      const blankSet = new Set(blankIdxs);

      const area = el('div', 'verse-area');
      const blankEls = [];
      rw.forEach((w, i) => {
        if (blankSet.has(i)) {
          const b = el('span', 'blank', '');
          blankEls.push(b);
          area.appendChild(b);
        } else {
          area.appendChild(el('span', 'vw', w));
        }
        area.appendChild(document.createTextNode(' '));
      });
      quiz.appendChild(area);

      const answers = blankIdxs.map((i) => rw[i]);
      const options = shuffle([...answers, ...ctx.distractors(ctx.hard ? 3 : 2)]);
      const row = el('div', 'btn-row choices');
      quiz.appendChild(row);

      let ptr = 0;
      blankEls[0].classList.add('next');

      // Word-bank buttons start wordless+disabled; the think-first beat runs
      // once per round (not once per blank — that would feel naggy) before
      // any of them appear.
      const tiles = [];
      for (const wd of options) {
        const tile = el('button', 'word-tile wordless');
        tile.disabled = true;
        tile.onclick = () => {
          if (tile.classList.contains('used') || ptr >= blankIdxs.length) return;
          if (cleanWord(wd) === cleanWord(rw[blankIdxs[ptr]])) {
            sfx.pop();
            tile.classList.add('used');
            const b = blankEls[ptr];
            b.textContent = rw[blankIdxs[ptr]];
            b.classList.remove('next');
            b.classList.add('done');
            ptr++;
            if (ptr < blankIdxs.length) {
              blankEls[ptr].classList.add('next');
            } else {
              row.style.pointerEvents = 'none';
              wait(waterAndGrow, 350);
            }
          } else {
            mistakes++;
            sfx.wrong();
            tile.classList.remove('wrong');
            void tile.offsetWidth; // restart the wiggle animation
            tile.classList.add('wrong');
          }
        };
        tiles.push({ tile, wd });
        row.appendChild(tile);
      }

      await ctx.thinkBeat({ anchor: area });
      for (const { tile, wd } of tiles) {
        tile.textContent = tidy(wd);
        tile.disabled = false;
        tile.classList.remove('wordless');
        tile.classList.add('revealed');
      }
    }

    // ---- watering can tips, drops fall, plant grows one stage ----
    function waterAndGrow() {
      can.classList.remove('pouring');
      void can.offsetWidth;
      can.classList.add('pouring');
      for (let i = 0; i < 6; i++) {
        const d = el('span', 'drop', '💧');
        d.style.left = (34 + ctx.randInt(40)) + '%';
        d.style.animationDelay = (0.15 + i * 0.09) + 's';
        potZone.appendChild(d);
        wait(() => d.remove(), 1500);
      }
      wait(() => {
        stageIdx++;
        plant.textContent = STAGES[stageIdx];
        plant.classList.remove('grow');
        void plant.offsetWidth;
        plant.classList.add('grow');
        sfx.correct();
        meterDrops[stageIdx - 1].className = 'earned';
        wait(() => {
          roundIdx++;
          if (roundIdx < ROUNDS) playRound();
          else bloom();
        }, 800);
      }, 950);
    }

    // ---- finale: butterflies, hear the verse, confetti, win ----
    function bloom() {
      clear(quiz);
      const vd = el('div', 'verse-display');
      vd.appendChild(el('div', null, ctx.verse.text));
      vd.appendChild(el('span', 'verse-ref', ctx.verse.label));
      quiz.append(vd, el('div', 'bloom-note', '🌻 It bloomed! Great growing! 🌻'));

      for (let i = 0; i < 3; i++) {
        const b = el('span', 'bfly', '🦋');
        b.style.left = (8 + ctx.randInt(76)) + '%';
        b.style.top = (10 + ctx.randInt(45)) + '%';
        b.style.animationDuration = (2.6 + Math.random() * 1.4) + 's';
        b.style.animationDelay = (i * 0.35) + 's';
        root.appendChild(b);
      }

      ctx.speak();
      ctx.confetti();
      const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
      const delay = Math.min(6000, 2600 + words.length * 60);
      wait(() => ctx.win({ stars }), delay);
    }

    playRound();

    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  },
};
