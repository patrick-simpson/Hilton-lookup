// Puzzle Pieces — a cheerful emoji picture hides under a grid of word covers.
// Tap the covers in verse order: each correct tap fades a piece away and
// reveals more of the picture. Long verses play in several rounds with a new
// picture each round. Hard mode uses bigger rounds (16 pieces) and hides the
// assembled-verse hint line.

export default {
  id: 'puzzle',
  title: 'Puzzle Pieces',
  icon: '🧩',
  tagline: 'Tap the words to reveal the hidden picture!',
  howTo: 'A surprise picture is hiding under the puzzle pieces! Tap the words in verse order to make the pieces disappear. Tap 🔊 any time to hear the verse again.',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx, cleanWord } = ctx;

    const PICS = ['🌈', '🦁', '🐑', '⛵', '🌟', '🕊️', '🏰', '🌻'];

    ctx.addStyle(`
      .g-puzzle .round-label { text-align: center; font-weight: bold; opacity: 0.75; margin-bottom: 6px; }
      .g-puzzle .frame { position: relative; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 0 rgba(38, 50, 75, 0.12); }
      .g-puzzle .pic { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #c9ecff, #fff3c9); user-select: none; overflow: hidden; }
      .g-puzzle .pic-emoji { line-height: 1; }
      .g-puzzle .pic.done .pic-emoji { animation: pop-in 0.5s ease, floaty 2.6s ease-in-out 0.5s infinite; }
      .g-puzzle .covers { position: absolute; inset: 0; display: flex; flex-direction: column; }
      .g-puzzle .cover-row { flex: 1; display: flex; }
      .g-puzzle .cover {
        flex: 1; min-height: 52px; min-width: 0;
        display: flex; align-items: center; justify-content: center;
        text-align: center; padding: 4px 6px;
        font-weight: bold; font-size: 1.05rem; color: var(--ink);
        background: #cfe3ff; border: 2px solid #f5f9ff; border-radius: 10px;
        transition: opacity 0.45s ease, transform 0.45s ease;
        user-select: none;
      }
      .g-puzzle .cover.alt { background: #e6dcff; }
      .g-puzzle .cover.long { font-size: 0.9rem; }
      .g-puzzle .cover.xlong { font-size: 0.78rem; }
      .g-puzzle .cover.solved { opacity: 0; transform: scale(0.5) rotate(8deg); pointer-events: none; }
      .g-puzzle .cover.wrong { animation: wiggle 0.35s ease; background: var(--red-soft); }
      .g-puzzle .hint {
        min-height: 46px; background: #f4f8ff; border-radius: 14px;
        padding: 8px 12px; margin-top: 12px; text-align: center;
        font-size: 1.05rem; font-weight: bold; color: var(--green);
      }
      .g-puzzle .btn-row { margin: 12px 0 0; }
    `);

    const root = el('div', 'g-puzzle');
    stage.appendChild(root);

    // Split long verses into balanced rounds of at most maxPieces words each
    // (e.g. 13 words -> 7 + 6, never 12 + 1).
    const maxPieces = ctx.hard ? 16 : 12;
    const allWords = ctx.verse.words;
    const nRounds = Math.max(1, Math.ceil(allWords.length / maxPieces));
    const perRound = Math.ceil(allWords.length / nRounds);
    const rounds = ctx.chunk(allWords, perRound);

    // Deterministic picture per verse; a new one each round.
    const picBase = ctx.verse.ref.length % PICS.length;
    const sep = ctx.verse.isList ? ', ' : ' ';

    let roundIdx = 0;
    let mistakes = 0;
    const revealed = []; // words uncovered so far, across all rounds

    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
    };

    ctx.speak();

    function colsFor(n) {
      return n <= 4 ? 2 : n <= 9 ? 3 : 4;
    }

    function playRound() {
      clear(root);
      const words = rounds[roundIdx];

      if (rounds.length > 1) {
        root.appendChild(el('div', 'round-label', `Part ${roundIdx + 1} of ${rounds.length}`));
      }

      // --- picture frame ---
      const cols = colsFor(words.length);
      const nrows = Math.ceil(words.length / cols);
      const frame = el('div', 'frame');
      frame.style.height = `${nrows * 68}px`;

      const pic = el('div', 'pic');
      const emoji = el('span', 'pic-emoji', PICS[(picBase + roundIdx) % PICS.length]);
      emoji.style.fontSize = `${Math.round(nrows * 68 * 0.72)}px`;
      pic.appendChild(emoji);
      frame.appendChild(pic);

      // --- word covers, shuffled onto the grid cells ---
      const coversEl = el('div', 'covers');
      frame.appendChild(coversEl);
      root.appendChild(frame);

      // Rows get an even share of the covers so the picture is fully hidden
      // (no empty grid holes on the last row).
      const base = Math.floor(words.length / nrows);
      const extra = words.length % nrows;
      const cells = shuffle(words.map((w) => w));

      let nextIdx = 0;
      let cellI = 0;
      for (let r = 0; r < nrows; r++) {
        const rowEl = el('div', 'cover-row');
        const count = base + (r < extra ? 1 : 0);
        for (let c = 0; c < count; c++) {
          const w = cells[cellI++];
          let cls = 'cover';
          if ((r + c) % 2 === 1) cls += ' alt';
          if (w.length >= 14) cls += ' xlong';
          else if (w.length >= 9) cls += ' long';
          const cover = el('button', cls, w);
          cover.onclick = () => {
            if (cover.classList.contains('solved')) return;
            if (cleanWord(w) === cleanWord(words[nextIdx])) {
              sfx.correct();
              cover.classList.add('solved');
              revealed.push(words[nextIdx]);
              nextIdx++;
              updateHint();
              if (nextIdx === words.length) endRound(pic);
            } else {
              mistakes++;
              sfx.wrong();
              cover.classList.remove('wrong');
              void cover.offsetWidth; // restart the wiggle animation
              cover.classList.add('wrong');
            }
          };
          rowEl.appendChild(cover);
        }
        coversEl.appendChild(rowEl);
      }

      // --- built-so-far hint line (hidden in hard mode) ---
      let hintEl = null;
      if (!ctx.hard) {
        hintEl = el('div', 'hint', revealed.join(sep));
        root.appendChild(hintEl);
      }
      function updateHint() {
        if (hintEl) hintEl.textContent = revealed.join(sep);
      }

      // --- hear it again ---
      const btnRow = el('div', 'btn-row');
      const sBtn = el('button', 'btn', '🔊');
      sBtn.onclick = () => { sfx.click(); ctx.speak(); };
      btnRow.appendChild(sBtn);
      root.appendChild(btnRow);
    }

    function endRound(pic) {
      pic.classList.add('done');
      roundIdx++;
      if (roundIdx < rounds.length) {
        sfx.pop();
        later(playRound, 1400); // a moment to admire the picture
      } else {
        ctx.confetti();
        ctx.speak(); // read the whole verse over the finished picture
        const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
        const wait = Math.min(2000 + allWords.length * 300, 8000);
        later(() => ctx.win({ stars }), wait);
      }
    }

    playRound();

    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
