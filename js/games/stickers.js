// Sticker Quest — recite-and-collect. Prove you know the verse in 3 steps
// (see it, peek-a-boo, be brave), pass the grown-up leader check, and stamp
// a shiny sticker onto your sticker card. Peeks are counted for stars.
// Hard mode: step 2 hides the words starting with the first one, and step 3
// hides EVERY word with peeking locked.

const STICKERS = ['🌟', '🦁', '🌈', '🚀', '🐸', '🎈', '💎', '🏅'];

export default {
  id: 'stickers',
  title: 'Sticker Quest',
  icon: '📒',
  tagline: 'Say the verse 3 times — win a sticker!',
  howTo: 'Say the verse out loud 3 times: first you see it, then some words hide, then be brave and say it all! A grown-up gives the thumbs-up and you stamp a sticker on your card.',
  group: false,

  mount(stage, ctx) {
    const { el, clear, sfx } = ctx;

    ctx.addStyle(`
      .g-stickers { display: flex; flex-direction: column; min-height: 380px; }
      .g-stickers .trail { display: flex; justify-content: center; align-items: flex-start; gap: 4px; margin-bottom: 2px; }
      .g-stickers .t-step { text-align: center; opacity: 0.35; transition: transform 0.2s ease, opacity 0.2s ease; min-width: 64px; }
      .g-stickers .t-step .t-emoji { font-size: 1.8rem; display: block; line-height: 1.2; }
      .g-stickers .t-step .t-name { font-family: var(--display); font-size: 0.68rem; font-weight: 700; letter-spacing: 1px; color: var(--slate); }
      .g-stickers .t-step.now { opacity: 1; transform: scale(1.14); }
      .g-stickers .t-step.now .t-emoji { animation: floaty 2.2s ease-in-out infinite; }
      .g-stickers .t-step.done { opacity: 0.75; }
      .g-stickers .t-dash { font-weight: bold; opacity: 0.3; padding-top: 12px; }
      .g-stickers .prompt { text-align: center; font-weight: bold; font-size: 1.15rem; margin: 6px 0 10px; }
      .g-stickers .cheer { text-align: center; font-weight: bold; color: var(--sparks-blue); margin: 0 0 6px; animation: pop-in 0.3s ease; }
      .g-stickers .board { background: #f4f8ff; border-radius: 16px; padding: 10px; text-align: center; }
      .g-stickers .board .word-tile.plain { background: var(--paper, #fff); border: 2px solid var(--sky); }
      .g-stickers .hid { background: var(--cream); border: 2px dashed var(--yellow); min-width: 62px; }
      .g-stickers .hid.peek { background: var(--green-soft); border-style: solid; border-color: var(--green); animation: pop-in 0.25s ease; }
      .g-stickers .hid.locked { background: rgba(62, 75, 84, 0.08); border-color: rgba(62, 75, 84, 0.25); }
      .g-stickers .board.many .word-tile { font-size: 1rem; padding: 5px 9px; margin: 3px; min-height: 40px; }
      .g-stickers .board.many .hid { min-height: 48px; min-width: 52px; }
      .g-stickers .ref-line { text-align: center; font-weight: bold; opacity: 0.7; margin: 8px 0 0; }
      .g-stickers .footer { margin-top: auto; text-align: center; padding-top: 12px; }
      .g-stickers .footer .btn-row { align-items: center; margin: 8px 0 0; }
      .g-stickers .peek-chip { display: inline-block; background: var(--paper); border-radius: 999px; padding: 6px 14px; font-family: var(--display); font-weight: 700; box-shadow: var(--shadow); font-size: 0.95rem; }
      .g-stickers.many .t-step .t-emoji { font-size: 1.5rem; }
      .g-stickers.many .t-step { min-width: 56px; }
      .g-stickers.many .t-dash { padding-top: 8px; }
      .g-stickers.many .prompt { font-size: 1.05rem; margin: 4px 0 6px; }
      .g-stickers.many .board { padding: 8px 6px; }
      .g-stickers.many .ref-line { margin: 4px 0 0; font-size: 0.95rem; }
      .g-stickers.many .footer { padding-top: 6px; }
      .g-stickers .leader { background: var(--sky-soft); border: 2px solid var(--sparks-blue); border-radius: 18px; padding: 14px; text-align: center; margin-top: 10px; box-shadow: var(--shadow); animation: pop-in 0.3s ease; }
      .g-stickers .leader h3 { margin: 0 0 4px; font-size: 1.25rem; }
      .g-stickers .leader .verse-check { background: #fff; border-radius: 12px; padding: 10px; margin: 10px 0; font-size: 0.95rem; }
      .g-stickers .thumb-btn { font-size: 2.3rem; min-height: 80px; min-width: 120px; border-radius: 22px; }
      .g-stickers .thumb-btn small { display: block; font-size: 0.85rem; }
      .g-stickers .sticker-card { margin: 14px auto; width: min(300px, 85%); background: #fff; border: 2px dashed var(--yellow); border-radius: 20px; padding: 26px 16px; text-align: center; box-shadow: var(--shadow); }
      .g-stickers .sticker-card .card-label { font-family: var(--display); font-weight: 700; opacity: 0.7; font-size: 0.9rem; letter-spacing: 1px; color: var(--slate); }
      .g-stickers .sticker { font-size: 5.5rem; line-height: 1.15; display: inline-block; animation: gstk-stamp 0.55s cubic-bezier(0.2, 1.4, 0.4, 1) forwards; }
      @keyframes gstk-stamp {
        0% { transform: scale(3) rotate(-25deg); opacity: 0; }
        60% { transform: scale(0.85) rotate(8deg); opacity: 1; }
        100% { transform: scale(1) rotate(-6deg); opacity: 1; }
      }
      .g-stickers .win-title { text-align: center; font-family: var(--display); font-size: 1.5rem; font-weight: 700; margin-top: 14px; }
    `);

    const words = ctx.verse.words;
    const many = words.length > 19;

    const root = el('div', 'g-stickers' + (many ? ' many' : ''));
    stage.appendChild(root);
    let peeks = 0;
    let retried = false;   // came back from a 🔁
    let finished = false;

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

    const STEPS = [
      { emoji: '1️⃣', name: 'SEE IT' },
      { emoji: '2️⃣', name: 'PEEK' },
      { emoji: '3️⃣', name: 'BRAVE' },
    ];

    function trail(current) {
      const row = el('div', 'trail');
      STEPS.forEach((s, i) => {
        if (i > 0) row.appendChild(el('span', 't-dash', '···'));
        const step = el('div', 't-step' + (i < current ? ' done' : i === current ? ' now' : ''));
        step.appendChild(el('span', 't-emoji', i < current ? '✅' : s.emoji));
        step.appendChild(el('span', 't-name', s.name));
        row.appendChild(step);
      });
      return row;
    }

    // Which word indices are hidden on each step.
    function hiddenFor(step) {
      const set = new Set();
      if (step === 1) {
        // Every other word. Easy: first word stays visible. Hard: first word hides too.
        const start = ctx.hard ? 0 : 1;
        for (let i = start; i < words.length; i += 2) set.add(i);
      } else if (step === 2) {
        for (let i = 0; i < words.length; i++) set.add(i);
        if (!ctx.hard) set.delete(0); // easy mode: first word is a freebie
      }
      return set;
    }

    let peekChip = null;
    function updatePeekChip() {
      if (peekChip) peekChip.textContent = `👀 Peeks: ${peeks}`;
    }

    function promptFor(step) {
      if (step === 0) return 'Look and listen… then say it out loud! 🗣️';
      if (step === 1) return 'Peek-a-boo! Some words are hiding! Say it all! ⭐';
      return ctx.hard ? 'Be brave! Say it ALL by yourself! 🙈💪' : 'Be brave! Say the whole verse! 💪';
    }

    function renderStep(step) {
      clear(root);
      root.appendChild(trail(step));
      if (retried && step === 1) {
        root.appendChild(el('div', 'cheer', 'Almost! One more practice! 💪'));
        retried = false;
      }
      root.appendChild(el('div', 'prompt', promptFor(step)));

      const hiddenSet = hiddenFor(step);
      const noPeek = step === 2 && ctx.hard;

      const board = el('div', 'board' + (many ? ' many' : ''));
      words.forEach((w, i) => {
        if (!hiddenSet.has(i)) {
          board.appendChild(el('span', 'word-tile plain', w));
          return;
        }
        const tile = el('button', 'word-tile hid' + (noPeek ? ' locked' : ''), noPeek ? '🔒' : '⭐');
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
            tile.textContent = '⭐';
            tile.classList.remove('peek');
          }, 1500);
        };
        board.appendChild(tile);
      });
      root.appendChild(board);
      root.appendChild(el('div', 'ref-line', ctx.verse.label));

      const footer = el('div', 'footer');
      const row = el('div', 'btn-row');
      if (step > 0) {
        peekChip = el('div', 'peek-chip');
        if (noPeek) peekChip.textContent = '🙈 No peeking this time!';
        else updatePeekChip();
        row.appendChild(peekChip); // chip rides beside the button — keeps the action on-screen
      } else {
        peekChip = null;
      }
      if (step === 0) {
        const hear = el('button', 'btn btn-blue', '🔊 Hear it');
        hear.onclick = () => { sfx.click(); ctx.speak(); };
        row.appendChild(hear);
      }
      const btn = el('button', 'btn btn-green btn-big', step === 2 ? 'I said it! ⭐' : 'I said it! ➡');
      btn.onclick = () => {
        sfx.pop();
        if (step === 2) renderLeaderCheck();
        else renderStep(step + 1);
      };
      row.appendChild(btn);
      footer.appendChild(row);
      root.appendChild(footer);
    }

    function renderLeaderCheck() {
      clear(root);
      root.appendChild(trail(2));

      const panel = el('div', 'leader');
      panel.appendChild(el('div', null, '🧑‍🏫'));
      panel.appendChild(el('h3', null, 'Grown-up check!'));
      panel.appendChild(el('div', null, 'Did they say the verse?'));
      const check = el('div', 'verse-check', ctx.verse.text);
      check.appendChild(el('div', 'ref-line', ctx.verse.label));
      panel.appendChild(check);

      const row = el('div', 'btn-row');
      const yes = el('button', 'btn btn-green thumb-btn');
      yes.append('👍', el('small', null, 'They did it!'));
      yes.onclick = () => { if (!finished) { sfx.correct(); renderSticker(); } };
      const retry = el('button', 'btn btn-primary thumb-btn');
      retry.append('🔁', el('small', null, 'One more try'));
      retry.onclick = () => {
        sfx.click();
        retried = true;
        renderStep(1); // back to peek-a-boo — no shame, just practice
      };
      row.append(yes, retry);
      panel.appendChild(row);
      root.appendChild(panel);
    }

    function renderSticker() {
      if (finished) return;
      finished = true;
      clear(root);
      const sticker = ctx.pick(STICKERS);

      root.appendChild(el('div', 'win-title', 'You did it! 🎉'));
      const card = el('div', 'sticker-card');
      card.appendChild(el('div', 'card-label', 'MY STICKER CARD'));
      card.appendChild(el('div', 'sticker', sticker));
      card.appendChild(el('div', 'card-label', ctx.verse.label));
      root.appendChild(card);
      root.appendChild(el('div', 'prompt', 'A shiny sticker for you! ✨'));

      ctx.confetti();
      const stars = peeks <= 1 ? 3 : peeks <= 4 ? 2 : 1;
      const message = `You earned a ${sticker} sticker!`;
      later(() => ctx.win({ stars, message }), 1600);
    }

    renderStep(0);
    ctx.speak(); // step 1 only — later steps are from memory

    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
