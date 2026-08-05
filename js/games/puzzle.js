// Puzzle Pieces — a cheerful emoji picture hides under a grid of word covers.
// Tap the covers in verse order: each correct tap fades a piece away and
// reveals more of the picture. Long verses play in several rounds with a new
// picture each round. Hard mode uses bigger rounds (16 pieces).
//
// This is the gentlest builder — the picture reveal is the reward, so ONLY
// the built-so-far hint line becomes ctx.guide (fading per pass count). The
// cover buttons themselves always keep their full words: finding the next
// word among the covers is the actual game.

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
      .g-puzzle .round-label { text-align: center; font-family: var(--display); font-weight: 700; color: var(--slate); opacity: 0.85; margin-bottom: 6px; }
      .g-puzzle .frame { position: relative; border-radius: 18px; overflow: hidden; box-shadow: var(--shadow); }
      .g-puzzle .pic { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, var(--sky-soft), var(--cream-soft)); user-select: none; overflow: hidden; }
      .g-puzzle .pic-emoji { line-height: 1; }
      .g-puzzle .pic.done .pic-emoji { animation: pop-in 0.5s ease, floaty 2.6s ease-in-out 0.5s infinite; }
      .g-puzzle .covers { position: absolute; inset: 0; display: flex; flex-direction: column; }
      .g-puzzle .cover-row { flex: 1; display: flex; }
      /* The button keeps its full grid-cell size forever (honest tap target);
         only the inner face shrinks/fades away when solved. */
      .g-puzzle .cover { flex: 1; min-width: 0; min-height: 52px; display: flex; padding: 0; background: none; border: 0; }
      .g-puzzle .cface {
        flex: 1; min-width: 0;
        display: flex; align-items: center; justify-content: center;
        text-align: center; padding: 4px 6px;
        font-family: var(--display); font-weight: 600; font-size: 1.05rem; color: var(--slate);
        background: var(--sky-soft); border: 2px solid rgba(255, 255, 255, 0.85); border-radius: 10px;
        transition: opacity 0.45s ease, transform 0.45s ease;
        overflow-wrap: anywhere; user-select: none;
      }
      .g-puzzle .cover.alt .cface { background: var(--sky); }
      .g-puzzle .cover.long .cface { font-size: 0.95rem; }
      .g-puzzle .cover.xlong .cface { font-size: 0.82rem; }
      .g-puzzle .cover.solved { pointer-events: none; }
      .g-puzzle .cover.solved .cface { opacity: 0; transform: scale(0.5) rotate(8deg); }
      .g-puzzle .cover.wrong .cface { animation: wiggle 0.35s ease; background: var(--red-soft); }
      .g-puzzle .guide-strip { margin-top: 12px; margin-bottom: 0; }
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

    let roundIdx = 0;
    let mistakes = 0;
    let guide = null;

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
          const cover = el('button', cls);
          cover.appendChild(el('span', 'cface', w));
          cover.onclick = () => {
            if (cover.classList.contains('solved')) return;
            if (cleanWord(w) === cleanWord(words[nextIdx])) {
              sfx.correct();
              cover.classList.add('solved');
              cover.disabled = true; // out of play — taps fall through to the picture
              guide.markDone(nextIdx);
              nextIdx++;
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

      // --- built-so-far hint line, now a fading guide strip ---
      if (!guide) guide = ctx.guide(words);
      else guide.reset(words);
      root.appendChild(guide.el);

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
        later(() => ctx.win({ stars, mistakes }), wait);
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
