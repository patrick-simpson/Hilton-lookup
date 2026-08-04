// Memory Match — classic flip-and-match pairs built from the verse.
// Long verses use consecutive phrase halves as pairs; short verses (<8 words)
// use twin word cards. One special pair is always the verse reference <-> the
// first three words. Every pair shares a little emoji sticker so pre-readers
// can match without reading. Hard mode deals more pairs.

export default {
  id: 'match',
  title: 'Memory Match',
  icon: '🃏',
  tagline: 'Flip the cards and find the pairs!',
  howTo: 'Tap a card to flip it over, then tap another card to find its partner. Matching cards share the same little picture! Find every pair to win.',
  group: false,

  mount(stage, ctx) {
    const { el, shuffle, sfx } = ctx;

    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
    };

    ctx.addStyle(`
      .g-match .head { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; margin-bottom: 6px; }
      .g-match .tries { font-weight: bold; opacity: 0.7; }
      .g-match .badge-strip { text-align: center; font-size: 1.4rem; margin-bottom: 8px; }
      .g-match .badge-strip .b { display: inline-block; margin: 0 4px; filter: grayscale(1); opacity: 0.35; transition: filter 0.3s, opacity 0.3s; }
      .g-match .badge-strip .b.lit { filter: none; opacity: 1; animation: pop-in 0.3s ease; }
      .g-match .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
      .g-match .mcard { position: relative; height: 92px; padding: 0; perspective: 600px; }
      .g-match .grid.tall .mcard { height: 122px; }
      .g-match .mcard-inner { position: absolute; inset: 0; transform-style: preserve-3d; transition: transform 0.35s ease; }
      .g-match .mcard.flipped .mcard-inner { transform: rotateY(180deg); }
      .g-match .mface { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 6px; border-radius: 16px; backface-visibility: hidden; -webkit-backface-visibility: hidden; box-shadow: 0 4px 0 rgba(38, 50, 75, 0.12); }
      .g-match .mface.front { background: var(--blue); color: #fff; font-size: 2rem; }
      .g-match .mface.back { background: var(--blue-soft); transform: rotateY(180deg); font-weight: bold; text-align: center; }
      .g-match .mcard.matched .mface.back { background: var(--green-soft); box-shadow: inset 0 0 0 3px var(--green); animation: pop-in 0.25s ease; }
      .g-match .pair-emoji { font-size: 1.25rem; line-height: 1; }
      .g-match .card-text { font-size: 1.02rem; line-height: 1.15; white-space: pre-line; overflow: hidden; max-height: 100%; }
      .g-match .card-text.small { font-size: 0.85rem; }
      .g-match .card-text.tiny { font-size: 0.72rem; }
      .g-match .found-strip { min-height: 36px; margin-top: 10px; text-align: center; font-weight: bold; color: var(--green); }
      .g-match .found-strip.flash { animation: pop-in 0.3s ease; }
      @media (max-width: 480px) {
        .g-match .grid { gap: 6px; }
        .g-match .grid.tall { grid-template-columns: repeat(3, 1fr); }
        .g-match .grid.tall .mcard { height: 114px; }
      }
    `);

    const root = el('div', 'g-match');
    stage.appendChild(root);

    // ---------- build the pairs ----------

    const words = ctx.verse.words;
    const isList = ctx.verse.isList;
    const targetTotal = ctx.hard ? 8 : 6; // aim for this many pairs (incl. special)
    const minTotal = ctx.hard ? 6 : 4;
    const joinCard = (g) => (isList ? g.join('\n') : g.join(' '));
    const joinToast = (g) => g.join(isList ? ', ' : ' ');

    // unique words (for twin pairs), first occurrence keeps its punctuation
    const uniq = [];
    {
      const seen = new Set();
      for (const w of words) {
        const c = ctx.cleanWord(w) || w.toLowerCase();
        if (!seen.has(c)) { seen.add(c); uniq.push(w); }
      }
    }

    // split arr into exactly g consecutive groups, as evenly as possible
    function evenGroups(arr, g) {
      const base = Math.floor(arr.length / g);
      let extra = arr.length % g;
      const out = [];
      let i = 0;
      for (let k = 0; k < g; k++) {
        const size = base + (extra-- > 0 ? 1 : 0);
        out.push(arr.slice(i, i + size));
        i += size;
      }
      return out;
    }

    const pairs = [];

    // special pair: reference <-> first three words
    const refText = isList ? ctx.verse.label : ctx.verse.ref;
    const firstThree = joinCard(words.slice(0, 3)) + (words.length > 3 ? ' …' : '');
    pairs.push({ a: refText, b: firstThree, emoji: '📖', toast: refText });

    if (words.length < 8) {
      // short verse (or short list): find the twin — word matches the same word
      const want = Math.min(uniq.length, targetTotal - 1);
      for (const w of shuffle(uniq).slice(0, want)) {
        pairs.push({ a: w, b: w, toast: w });
      }
    } else {
      // phrase halves: chunk into 2*N consecutive groups; pair i = group 2i + 2i+1
      const n = Math.min(targetTotal - 1, Math.floor(words.length / 2));
      const groups = evenGroups(words, n * 2);
      for (let i = 0; i + 1 < groups.length; i += 2) {
        pairs.push({
          a: joinCard(groups[i]),
          b: joinCard(groups[i + 1]),
          toast: joinToast(groups[i].concat(groups[i + 1])),
        });
      }
      // top up with twin words if the verse was too short for enough phrase pairs
      const spare = shuffle(uniq.filter((w) => ctx.cleanWord(w).length >= 3));
      while (pairs.length < minTotal && spare.length) {
        const w = spare.pop();
        pairs.push({ a: w, b: w, toast: w });
      }
    }

    // every pair gets its own sticker emoji so kids can match without reading
    const badgePool = shuffle(['⭐', '❤️', '🌈', '🍎', '🚀', '🌻', '🎈', '🦁', '👑', '🐠', '☀️', '🐑']);
    pairs.forEach((p, i) => {
      p.id = i;
      if (!p.emoji) p.emoji = badgePool[i % badgePool.length];
    });

    const cards = [];
    for (const p of pairs) {
      cards.push({ pairId: p.id, text: p.a, emoji: p.emoji, toast: p.toast });
      cards.push({ pairId: p.id, text: p.b, emoji: p.emoji, toast: p.toast });
    }
    const deck = shuffle(cards);

    // ---------- render ----------

    const head = el('div', 'head');
    const listenBtn = el('button', 'btn', '🔊 Listen');
    listenBtn.onclick = () => { sfx.click(); ctx.speak(); };
    const tries = el('div', 'tries', 'Tries: 0');
    head.append(listenBtn, tries);
    root.appendChild(head);

    const strip = el('div', 'badge-strip');
    const badgeEls = {};
    for (const p of pairs) {
      const b = el('span', 'b', p.emoji);
      badgeEls[p.id] = b;
      strip.appendChild(b);
    }
    root.appendChild(strip);

    const tall = deck.some((c) => c.text.length > 14 || c.text.includes('\n'));
    const grid = el('div', 'grid' + (tall ? ' tall' : ''));
    for (const c of deck) {
      const btn = el('button', 'mcard');
      const inner = el('div', 'mcard-inner');
      const front = el('div', 'mface front', '❓');
      const back = el('div', 'mface back');
      const len = c.text.length;
      back.append(
        el('div', 'pair-emoji', c.emoji),
        el('div', 'card-text' + (len > 34 ? ' tiny' : len > 16 ? ' small' : ''), c.text),
      );
      inner.append(front, back);
      btn.appendChild(inner);
      btn.onclick = () => tap(c);
      c.btn = btn;
      grid.appendChild(btn);
    }
    root.appendChild(grid);

    const foundStrip = el('div', 'found-strip', 'Find the matching pairs! 🔍');
    root.appendChild(foundStrip);

    // ---------- game logic ----------

    let first = null;   // first face-up card of the current try
    let lock = false;   // input disabled during the flip-back reveal
    let attempts = 0;
    let matchedPairs = 0;

    function flashFound(text) {
      foundStrip.textContent = text;
      foundStrip.classList.remove('flash');
      void foundStrip.offsetWidth; // restart the pop animation
      foundStrip.classList.add('flash');
    }

    function tap(c) {
      if (lock || c.up || c.matched) return;
      sfx.click();
      c.up = true;
      c.btn.classList.add('flipped');
      if (!first) { first = c; return; }

      const a = first;
      first = null;
      attempts++;
      tries.textContent = 'Tries: ' + attempts;

      if (a.pairId === c.pairId) {
        a.matched = c.matched = true;
        a.btn.classList.add('matched');
        c.btn.classList.add('matched');
        sfx.correct();
        badgeEls[c.pairId].classList.add('lit');
        flashFound(pairs[c.pairId].emoji + ' ' + c.toast);
        matchedPairs++;
        if (matchedPairs === pairs.length) finish();
      } else {
        // no match: gentle reveal, then flip both back — never a failure
        lock = true;
        later(() => {
          sfx.wrong();
          a.up = c.up = false;
          a.btn.classList.remove('flipped');
          c.btn.classList.remove('flipped');
          lock = false;
        }, 800);
      }
    }

    function finish() {
      lock = true;
      later(() => { ctx.confetti(); ctx.speak(); }, 450);
      later(() => {
        const p = pairs.length;
        const stars = attempts <= p + 2 ? 3 : attempts <= p + 6 ? 2 : 1;
        ctx.win({ stars });
      }, 2100);
    }

    ctx.speak();

    return () => {
      timers.forEach((t) => clearTimeout(t));
      ctx.stopSpeak();
    };
  },
};
