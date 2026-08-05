// Feed Sparky — tap only the words that belong in the verse to feed the
// hungry firefly. Ghost tiles ARE the fading guide strip — they light up as
// each word is fed. Decoy words make Sparky shake his head. Hard mode packs
// in 1:1 decoys. Long verses play phrase-by-phrase.
//
// Fading support: at supportLevel 0 (first pass, not hard/encore) words may
// be fed in any order, same as always. At supportLevel >= 1 (hard/encore, or
// a later pass) words must be fed in verse order — the next guide word
// pulses as a hint.

import { supportLevelFor } from '../lib/engine.js';

export default {
  id: 'feed',
  title: 'Feed Sparky',
  icon: '🍎',
  tagline: 'Feed Sparky the verse words!',
  howTo: 'Sparky is SO hungry — but he only eats words from the verse! Tap the words that belong in the verse to feed him. If a word does not belong, Sparky shakes his head. Try another one!',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx, cleanWord } = ctx;

    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    };

    ctx.addStyle(`
      .g-feed { position: relative; text-align: center; }
      .g-feed .sparky { display: inline-block; margin: 0 auto; }
      .g-feed .face { font-size: 1.9rem; line-height: 1.1; }
      .g-feed .bug { font-size: 3.4rem; display: inline-block; vertical-align: middle; margin: 0 2px; }
      .g-feed .spark { display: inline-block; animation: floaty 2.6s ease-in-out infinite; }
      .g-feed .spark:last-child { animation-delay: 1.3s; }
      .g-feed .mouth { width: 64px; height: 28px; margin: -2px auto 0; background: #5b2333; border: 4px solid var(--slate); border-top-width: 3px; border-radius: 10px 10px 40px 40px; position: relative; overflow: hidden; transition: height 0.15s ease; }
      .g-feed .mouth::after { content: ''; position: absolute; left: 50%; bottom: -8px; transform: translateX(-50%); width: 34px; height: 18px; background: #ff8fa0; border-radius: 40px 40px 0 0; }
      .g-feed .sparky.munch { animation: g-feed-munch 0.35s ease; }
      .g-feed .sparky.munch .mouth { height: 10px; }
      .g-feed .sparky.shake .face { animation: wiggle 0.4s ease; }
      .g-feed .sparky.happy .bug { animation: pop-in 0.4s ease; }
      .g-feed .round-label { font-family: var(--display); font-weight: 700; color: var(--slate); opacity: 0.9; margin: 4px 0 2px; }
      /* the guide strip IS the ghost row now — compact it a touch so the
         food belt (the action area) stays high on the screen */
      .g-feed .guide-slot .guide-strip { margin: 6px 0 10px; }
      .g-feed .guide-slot .guide-word { min-height: 34px; padding: 4px 10px; font-size: 1.05rem; }
      .g-feed .guide-slot .guide-word.next { opacity: 0.9; border-color: var(--yellow); background: #fff7df; animation: g-feed-pulse 1.1s ease-in-out infinite; }
      .g-feed .belt { background: repeating-linear-gradient(45deg, #f4f9fd 0 14px, var(--sky-soft) 14px 28px); border: 2px dashed var(--sky); border-radius: 16px; padding: 10px 6px; min-height: 80px; }
      .g-feed .food.gone { opacity: 0; transform: scale(0.3) rotate(25deg); transition: opacity 0.45s ease, transform 0.45s ease; pointer-events: none; }
      .g-feed .fly { position: absolute; z-index: 30; margin: 0; pointer-events: none; background: var(--green-soft); transition: transform 0.45s cubic-bezier(0.5, -0.1, 0.6, 1), opacity 0.45s ease; }
      .g-feed .yum { font-family: var(--display); font-size: 1.4rem; font-weight: 700; color: var(--green); animation: pop-in 0.4s ease; margin: 4px 0; }
      @keyframes g-feed-munch { 0% { transform: scale(1); } 35% { transform: scale(1.22) rotate(-4deg); } 70% { transform: scale(0.92); } 100% { transform: scale(1); } }
      @keyframes g-feed-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
      /* short phones: slim Sparky + spacing so more of the belt is on screen */
      @media (max-height: 700px) {
        .g-feed .face { font-size: 1.5rem; }
        .g-feed .bug { font-size: 2.7rem; }
        .g-feed .mouth { width: 56px; height: 24px; }
        .g-feed .round-label { margin: 2px 0 0; font-size: 0.95rem; }
        .g-feed .belt { padding: 8px 4px; }
        .g-feed .belt .word-tile { margin: 4px 3px; }
      }
    `);

    const root = el('div', 'g-feed');
    stage.appendChild(root);

    // ----- Sparky mascot -----
    const sparky = el('div', 'sparky');
    const face = el('div', 'face');
    const bug = el('span', 'bug', '🐛');
    face.append(el('span', 'spark', '✨'), bug, el('span', 'spark', '✨'));
    const mouth = el('div', 'mouth');
    sparky.append(face, mouth);
    root.appendChild(sparky);

    const roundLabel = el('div', 'round-label', '');
    const guideSlot = el('div', 'guide-slot');
    const belt = el('div', 'belt');
    root.append(roundLabel, guideSlot, belt);

    // ----- rounds -----
    const chunkSize = ctx.verse.isList ? (ctx.hard ? 8 : 6) : (ctx.hard ? 9 : 7);
    const rounds = ctx.chunk(ctx.verse.words, chunkSize);
    let roundIdx = 0;
    let mistakes = 0;
    let finished = false;
    let guide = null;

    ctx.speak();

    function munch() {
      sparky.classList.remove('munch');
      void sparky.offsetWidth;
      sparky.classList.add('munch');
      // reopen the mouth after the chomp (the class would otherwise keep it shut)
      later(() => sparky.classList.remove('munch'), 400);
    }

    function shakeHead() {
      sparky.classList.remove('shake');
      void sparky.offsetWidth;
      sparky.classList.add('shake');
      later(() => sparky.classList.remove('shake'), 450);
    }

    function wiggleTile(tile) {
      tile.classList.remove('wrong');
      void tile.offsetWidth;
      tile.classList.add('wrong');
    }

    // Clone the tapped tile and fly it into Sparky's mouth.
    function flyToMouth(tile, text) {
      const rootR = root.getBoundingClientRect();
      const tR = tile.getBoundingClientRect();
      const mR = mouth.getBoundingClientRect();
      const clone = el('div', 'word-tile fly', text);
      clone.style.left = (tR.left - rootR.left) + 'px';
      clone.style.top = (tR.top - rootR.top) + 'px';
      root.appendChild(clone);
      void clone.offsetWidth; // flush layout so the transition animates
      const dx = (mR.left + mR.width / 2) - (tR.left + tR.width / 2);
      const dy = (mR.top + mR.height / 2) - (tR.top + tR.height / 2);
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(0.2)`;
      clone.style.opacity = '0.2';
      later(() => clone.remove(), 480);
    }

    function playRound() {
      clear(belt);
      roundLabel.style.display = rounds.length > 1 ? '' : 'none';
      roundLabel.textContent = rounds.length > 1 ? `Part ${roundIdx + 1} of ${rounds.length}` : '';

      const words = rounds[roundIdx];
      let litCount = 0;
      let nextIdx = 0; // level >= 1: next ghost that must be fed
      // Any order on the very first (non-hard) pass; verse order once the
      // fading system has kicked in — matches the guide's own fade level.
      const orderRequired = supportLevelFor(ctx.verse, 'feed', ctx.hard) >= 1;

      if (!guide) guide = ctx.guide(words);
      else guide.reset(words);
      guideSlot.appendChild(guide.el);

      // Queue of unlit ghost indices per cleaned word — handles duplicates:
      // each occurrence in the verse needs its own feed.
      const queues = new Map();
      words.forEach((w, i) => {
        const k = cleanWord(w);
        if (!queues.has(k)) queues.set(k, []);
        queues.get(k).push(i);
      });

      function pulseNext() {
        const tiles = guide.el.querySelector('.guide-words').children;
        for (const t of tiles) t.classList.remove('next');
        if (orderRequired && nextIdx < words.length && tiles[nextIdx]) tiles[nextIdx].classList.add('next');
      }
      pulseNext();

      const decoyCount = ctx.hard ? words.length : Math.max(2, Math.ceil(words.length / 2));
      const foods = shuffle([
        ...words.map((w) => ({ w, verse: true })),
        ...ctx.distractors(decoyCount).map((w) => ({ w, verse: false })),
      ]);

      for (const f of foods) {
        const tile = el('button', 'word-tile food', f.w);
        tile.onclick = () => onTap(f, tile);
        belt.appendChild(tile);
      }

      function onTap(f, tile) {
        if (finished || tile.disabled) return;

        if (!f.verse) {
          // Decoy: Sparky says no thanks, the yucky word fades away.
          mistakes++;
          sfx.wrong();
          shakeHead();
          wiggleTile(tile);
          tile.disabled = true;
          later(() => tile.classList.add('gone'), 320);
          later(() => tile.remove(), 900);
          return;
        }

        const k = cleanWord(f.w);
        if (orderRequired && k !== cleanWord(words[nextIdx])) {
          // Right word, wrong turn — it stays on the belt for later.
          mistakes++;
          sfx.wrong();
          shakeHead();
          wiggleTile(tile);
          return;
        }

        // Correct feed: pick which ghost occurrence lights up.
        let gi;
        const q = queues.get(k);
        if (orderRequired) {
          gi = nextIdx;
          q.splice(q.indexOf(gi), 1);
          nextIdx++;
          pulseNext();
        } else {
          gi = q.shift();
        }

        flyToMouth(tile, f.w);
        tile.remove();
        later(() => {
          munch();
          sfx.pop();
          guide.markDone(gi);
          litCount++;
          if (litCount === words.length) endRound();
        }, 470);
      }
    }

    function endRound() {
      roundIdx++;
      if (roundIdx < rounds.length) {
        sfx.correct();
        later(playRound, 750);
      } else {
        finish();
      }
    }

    function finish() {
      finished = true;
      bug.textContent = '😋';
      sparky.classList.add('happy');
      mouth.style.visibility = 'hidden';
      root.insertBefore(el('div', 'yum', '✨ Burp! Yummy! ✨'), roundLabel);
      sfx.pop();
      ctx.speak();
      ctx.confetti();
      const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
      later(() => ctx.win({ stars, mistakes }), 2600);
    }

    playRound();

    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  },
};
