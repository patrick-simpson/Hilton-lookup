// Verse Scramble — tap the jumbled word tiles in order to rebuild the verse.
// Long verses are played phrase-by-phrase. Hard mode removes the built-so-far
// preview and jumbles bigger chunks.

export default {
  id: 'scramble',
  title: 'Verse Scramble',
  icon: '🧩',
  tagline: 'Put the words back in order!',
  howTo: 'The verse got all mixed up! Tap the words in the right order to fix it. Listen with the 🔊 button if you need help.',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx } = ctx;
    ctx.addStyle(`
      .g-scramble .built { min-height: 70px; background: #f4f8ff; border-radius: 16px; padding: 8px; margin-bottom: 12px; text-align: center; }
      .g-scramble .pool { text-align: center; }
      .g-scramble .built .word-tile { background: #d3f2d9; }
      .g-scramble .round-label { text-align: center; font-weight: bold; opacity: 0.75; margin-bottom: 6px; }
    `);

    const root = el('div', 'g-scramble');
    stage.appendChild(root);

    const chunkSize = ctx.verse.isList
      ? (ctx.hard ? 10 : 6)
      : (ctx.hard ? 12 : 7);
    const rounds = ctx.chunk(ctx.verse.words, chunkSize);
    let roundIdx = 0;
    let mistakes = 0;

    ctx.speak();

    function playRound() {
      clear(root);
      const words = rounds[roundIdx];
      if (rounds.length > 1) {
        root.appendChild(el('div', 'round-label', `Part ${roundIdx + 1} of ${rounds.length}`));
      }

      const built = el('div', 'built');
      const pool = el('div', 'pool');
      root.append(built, pool);

      let nextIdx = 0;
      const tiles = shuffle(words.map((w, i) => ({ w, i })));
      for (const t of tiles) {
        const tile = el('button', 'word-tile', t.w);
        tile.onclick = () => {
          // Match by word text (not tile identity) so duplicate words like
          // "the … the" accept whichever twin the kid taps.
          if (ctx.cleanWord(t.w) === ctx.cleanWord(words[nextIdx])) {
            sfx.correct();
            tile.remove();
            const done = el('span', 'word-tile correct', words[nextIdx]);
            built.appendChild(done);
            nextIdx++;
            if (nextIdx === words.length) endRound();
          } else {
            mistakes++;
            sfx.wrong();
            tile.classList.remove('wrong');
            void tile.offsetWidth; // restart the wiggle animation
            tile.classList.add('wrong');
          }
        };
        pool.appendChild(tile);
      }

      if (ctx.hard) built.style.filter = 'blur(0px)'; // keep visible; hard mode = bigger chunks
    }

    function endRound() {
      roundIdx++;
      if (roundIdx < rounds.length) {
        sfx.pop();
        setTimeout(playRound, 700);
      } else {
        ctx.confetti();
        const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
        setTimeout(() => ctx.win({ stars }), 600);
      }
    }

    playRound();
    return () => {};
  },
};
