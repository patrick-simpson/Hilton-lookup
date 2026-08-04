// Disappearing Verse — the classic whiteboard game. The kid says the verse
// out loud each round while more and more words vanish into blank tiles.
// Tapping a blank peeks the word for 1.5s (peeks are counted for stars).
// Hard mode: 3 word rounds (50%, 100%, 100% with peeking locked).
//
// A reference tile rides along in the tile row (unless the verse is a book
// list, which has no reference to memorize) and stays visible through every
// word round. Once the words are done, one final round blanks the reference
// too — "Say it all — and the reference!" — with the same peeking rules
// (hard locks it) as the game's existing last-round lock.

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
      .g-disappear .ref-tile::before { content: '🔖 '; }
      .g-disappear .word-tile.plain.ref-tile { background: #fff3e0; border-color: #ffb703; color: #7a4b00; font-style: italic; }
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
    // of the previous round's (cumulative disappearing). This invariant
    // only governs word tiles; the reference tile (below) is managed
    // separately and isn't part of `order`/`hiddenCounts` at all.
    const order = shuffle(words.map((_, i) => i));
    const fracs = ctx.hard ? [0.5, 1, 1] : [0, 1 / 3, 2 / 3, 1];
    const noPeekRound = ctx.hard ? fracs.length - 1 : -1;
    const hiddenCounts = fracs.map((f) => (f === 0 ? 0 : Math.min(n, Math.max(1, Math.round(f * n)))));

    // Book lists have no reference worth memorizing, so they skip the
    // reference-tile feature (and its final round) entirely.
    const hasRefRound = !ctx.verse.isList;
    const totalRounds = fracs.length + (hasRefRound ? 1 : 0);
    const isLastRound = (idx) => idx === totalRounds - 1;

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

    // Word-hidden set for a given round. Rounds beyond the normal fracs
    // array are the single extra reference round, which keeps every word
    // hidden (same as the round just before it).
    function wordsHiddenFor(idx) {
      const count = idx < fracs.length ? hiddenCounts[idx] : n;
      return new Set(order.slice(0, count));
    }

    function promptFor(idx, extraRound) {
      if (extraRound) return 'Say it all — and the reference! 💪';
      const last = idx === fracs.length - 1;
      if (idx === noPeekRound) return 'No peeking! Say it all! 🙈';
      if (ctx.hard) return 'Words vanished! Say it out loud! 🗣️';
      if (idx === 0) return 'Read the verse out loud! 🗣️';
      if (last) return 'All gone! Say the whole verse! 💪';
      return 'More words vanished! Say it out loud! 🗣️';
    }

    let tileEls = [];
    let refTileEl = null;
    let peekChip = null;

    function updatePeekChip() {
      if (peekChip) peekChip.textContent = `👀 Peeks: ${peeks}`;
    }

    // Shared by word tiles and the reference tile: a blank/locked button
    // that peeks its real content for 1.5s and counts toward `peeks`.
    function makeBlankTile(word, locked, extraClass) {
      const cls = 'word-tile blank' + (locked ? ' locked' : '') + (extraClass ? ` ${extraClass}` : '');
      const tile = el('button', cls, locked ? '🔒' : '___');
      let peeking = false;
      tile.onclick = () => {
        if (locked) { sfx.wrong(); rewiggle(tile); return; }
        if (peeking) return;
        peeking = true;
        peeks++;
        updatePeekChip();
        sfx.pop();
        tile.textContent = word;
        tile.classList.add('peek');
        later(() => {
          peeking = false;
          tile.textContent = '___';
          tile.classList.remove('peek');
        }, 1500);
      };
      return tile;
    }

    function renderRound() {
      clear(root);
      tileEls = [];
      refTileEl = null;
      const extraRound = hasRefRound && roundIdx === fracs.length;
      const hiddenSet = wordsHiddenFor(roundIdx);
      const noPeek = extraRound ? ctx.hard : roundIdx === noPeekRound;
      const last = isLastRound(roundIdx);

      const ind = el('div', 'rounds');
      for (let i = 0; i < totalRounds; i++) {
        ind.appendChild(el('span', 'r-dot' + (i < roundIdx ? ' done' : i === roundIdx ? ' now' : ''), '🫥'));
      }
      root.appendChild(ind);
      root.appendChild(el('div', 'prompt', promptFor(roundIdx, extraRound)));

      const board = el('div', 'board' + (many ? ' many' : ''));
      words.forEach((w, i) => {
        const tile = hiddenSet.has(i) ? makeBlankTile(w, noPeek) : el('span', 'word-tile plain', w);
        tileEls.push(tile);
        board.appendChild(tile);
      });
      if (hasRefRound) {
        refTileEl = extraRound
          ? makeBlankTile(ctx.verse.label, noPeek, 'ref-tile')
          : el('span', 'word-tile plain ref-tile', ctx.verse.label);
        board.appendChild(refTileEl);
      }
      root.appendChild(board);
      if (!hasRefRound) root.appendChild(el('div', 'ref-line', ctx.verse.label));

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
      if (isLastRound(roundIdx)) { finish(); return; }
      transitioning = true;
      sfx.pop();
      // Poof-animate the words that are about to disappear, then re-render.
      const nowHidden = wordsHiddenFor(roundIdx);
      const nextHidden = wordsHiddenFor(roundIdx + 1);
      let anyPoof = false;
      tileEls.forEach((tile, i) => {
        if (nextHidden.has(i) && !nowHidden.has(i)) {
          tile.classList.add('vanish');
          anyPoof = true;
        }
      });
      // Entering the extra reference round poofs the reference tile too.
      if (hasRefRound && refTileEl && roundIdx + 1 === fracs.length) {
        refTileEl.classList.add('vanish');
        anyPoof = true;
      }
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
      later(() => ctx.win({ stars, message, peeks }), 700);
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
