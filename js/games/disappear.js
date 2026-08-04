// Disappearing Verse — the classic whiteboard game. The kid says the verse
// out loud each round while more and more words vanish into blank tiles.
// Tapping a blank peeks the word for 1.5s (peeks are counted for stars).
// Hard mode: 3 rounds (50%, 100%, 100% with peeking locked).

export default {
  id: 'disappear',
  title: 'Disappearing Verse',
  icon: '🫥',
  tagline: 'Words vanish — can you still say it?',
  howTo: 'Say the verse out loud, then tap "I said it!" Each round more words disappear. Tap a blank tile to peek at a word — but super memorizers barely peek!',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx } = ctx;

    ctx.addStyle(`
      .g-disappear { display: flex; flex-direction: column; min-height: 380px; }
      .g-disappear .rounds { text-align: center; font-size: 1.7rem; margin-bottom: 2px; }
      .g-disappear .rounds .r-dot { display: inline-block; margin: 0 4px; opacity: 0.22; transition: transform 0.2s ease, opacity 0.2s ease; }
      .g-disappear .rounds .r-dot.done { opacity: 0.6; }
      .g-disappear .rounds .r-dot.now { opacity: 1; transform: scale(1.3); animation: floaty 2.2s ease-in-out infinite; }
      .g-disappear .prompt { text-align: center; font-weight: bold; font-size: 1.15rem; margin: 4px 0 10px; }
      .g-disappear .board { background: #f4f8ff; border-radius: 16px; padding: 10px; text-align: center; }
      .g-disappear .board .word-tile.plain { background: var(--paper, #fff); border: 3px solid #d5e8ff; }
      .g-disappear .blank { background: #f1e8ff; border: 3px dashed var(--purple, #9d4edd); color: var(--purple, #9d4edd); min-width: 66px; letter-spacing: 2px; }
      .g-disappear .blank.peek { background: #fff3c4; border-style: solid; border-color: var(--yellow, #ffb703); color: var(--ink, #26324b); letter-spacing: normal; animation: pop-in 0.25s ease; }
      .g-disappear .blank.locked { background: #ececec; border-color: #b9b9b9; color: #8a8a8a; letter-spacing: normal; }
      .g-disappear .board.many .word-tile { font-size: 1rem; padding: 5px 9px; margin: 3px; min-height: 40px; }
      .g-disappear .board.many .blank { min-height: 48px; min-width: 54px; letter-spacing: 1px; }
      .g-disappear .ref-line { text-align: center; font-weight: bold; opacity: 0.7; margin: 8px 0 0; }
      .g-disappear .footer { margin-top: auto; text-align: center; padding-top: 12px; }
      .g-disappear .footer .btn-row { align-items: center; margin: 8px 0 0; }
      .g-disappear .peek-chip { display: inline-block; background: #fff; border-radius: 999px; padding: 6px 14px; font-weight: bold; box-shadow: 0 3px 0 rgba(38,50,75,0.12); font-size: 0.95rem; }
      .g-disappear.many .rounds { font-size: 1.35rem; }
      .g-disappear.many .prompt { font-size: 1.05rem; margin: 2px 0 6px; }
      .g-disappear.many .board { padding: 8px 6px; }
      .g-disappear.many .ref-line { margin: 4px 0 0; font-size: 0.95rem; }
      .g-disappear.many .footer { padding-top: 6px; }
      @keyframes gdis-poof { to { transform: scale(0.15) rotate(14deg); opacity: 0; } }
      .g-disappear .word-tile.vanish { animation: gdis-poof 0.55s ease forwards; }
    `);

    const words = ctx.verse.words;
    const n = words.length;
    const many = n > 19;

    const root = el('div', 'g-disappear' + (many ? ' many' : ''));
    stage.appendChild(root);

    // One shuffled order of word indices — round r hides the first
    // hiddenCounts[r] of them, so each round's hidden set is a superset
    // of the previous round's (cumulative disappearing).
    const order = shuffle(words.map((_, i) => i));
    const fracs = ctx.hard ? [0.5, 1, 1] : [0, 1 / 3, 2 / 3, 1];
    const noPeekRound = ctx.hard ? fracs.length - 1 : -1;
    const hiddenCounts = fracs.map((f) => (f === 0 ? 0 : Math.min(n, Math.max(1, Math.round(f * n)))));

    let roundIdx = 0;
    let peeks = 0;
    let transitioning = false;

    // Every timeout goes through here so cleanup can kill them all.
    const timers = new Set();
    function later(fn, ms) {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    }

    function rewiggle(node) {
      node.classList.remove('wrong');
      void node.offsetWidth; // restart the animation
      node.classList.add('wrong');
    }

    function promptFor(idx) {
      const last = idx === fracs.length - 1;
      if (idx === noPeekRound) return 'No peeking! Say it all! 🙈';
      if (ctx.hard) return 'Words vanished! Say it out loud! 🗣️';
      if (idx === 0) return 'Read the verse out loud! 🗣️';
      if (last) return 'All gone! Say the whole verse! 💪';
      return 'More words vanished! Say it out loud! 🗣️';
    }

    let tileEls = [];
    let peekChip = null;

    function updatePeekChip() {
      if (peekChip) peekChip.textContent = `👀 Peeks: ${peeks}`;
    }

    function renderRound() {
      clear(root);
      tileEls = [];
      const hiddenSet = new Set(order.slice(0, hiddenCounts[roundIdx]));
      const noPeek = roundIdx === noPeekRound;
      const last = roundIdx === fracs.length - 1;

      const ind = el('div', 'rounds');
      for (let i = 0; i < fracs.length; i++) {
        ind.appendChild(el('span', 'r-dot' + (i < roundIdx ? ' done' : i === roundIdx ? ' now' : ''), '🫥'));
      }
      root.appendChild(ind);
      root.appendChild(el('div', 'prompt', promptFor(roundIdx)));

      const board = el('div', 'board' + (many ? ' many' : ''));
      words.forEach((w, i) => {
        let tile;
        if (!hiddenSet.has(i)) {
          tile = el('span', 'word-tile plain', w);
        } else {
          tile = el('button', 'word-tile blank' + (noPeek ? ' locked' : ''), noPeek ? '🔒' : '___');
          let peeking = false;
          tile.onclick = () => {
            if (noPeek) { sfx.wrong(); rewiggle(tile); return; }
            if (peeking) return;
            peeking = true;
            peeks++;
            updatePeekChip();
            sfx.pop();
            tile.textContent = w;
            tile.classList.add('peek');
            later(() => {
              peeking = false;
              tile.textContent = '___';
              tile.classList.remove('peek');
            }, 1500);
          };
        }
        tileEls.push(tile);
        board.appendChild(tile);
      });
      root.appendChild(board);
      root.appendChild(el('div', 'ref-line', ctx.verse.label));

      const footer = el('div', 'footer');
      peekChip = el('div', 'peek-chip');
      updatePeekChip();
      const row = el('div', 'btn-row');
      const btn = el('button', 'btn btn-green btn-big', last ? 'I said it! 🎉' : 'I said it! ➡');
      btn.onclick = advance;
      row.append(peekChip, btn); // chip rides beside the button — keeps the action on-screen
      footer.appendChild(row);
      root.appendChild(footer);
    }

    function advance() {
      if (transitioning) return;
      const last = roundIdx === fracs.length - 1;
      if (last) { finish(); return; }
      transitioning = true;
      sfx.pop();
      // Poof-animate the words that are about to disappear, then re-render.
      const nowHidden = new Set(order.slice(0, hiddenCounts[roundIdx]));
      const nextHidden = new Set(order.slice(0, hiddenCounts[roundIdx + 1]));
      let anyPoof = false;
      tileEls.forEach((tile, i) => {
        if (nextHidden.has(i) && !nowHidden.has(i)) {
          tile.classList.add('vanish');
          anyPoof = true;
        }
      });
      later(() => {
        roundIdx++;
        transitioning = false;
        renderRound();
      }, anyPoof ? 650 : 250);
    }

    function finish() {
      if (transitioning) return;
      transitioning = true;
      ctx.confetti();
      const stars = peeks <= 1 ? 3 : peeks <= 4 ? 2 : 1;
      const message = peeks === 0 ? 'You said it all from memory!' : 'You made the whole verse disappear!';
      later(() => ctx.win({ stars, message }), 700);
    }

    renderRound();
    ctx.speak(); // round 1 only — advancing rounds never re-speaks

    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
