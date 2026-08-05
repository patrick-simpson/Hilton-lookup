// Echo Chamber — pure auditory retrieval with cumulative chaining. A phrase
// is spoken while its word tiles glow one-by-one, then the tiles vanish
// face-down and the kid says it back out loud before tapping the parrot to
// confirm (tiles flip back while the phrase speaks again — the same
// self-check trust model as Disappearing Verse). After each new phrase the
// kid echoes the whole chain from the top (1, 1+2, 1+2+3…), and the finale
// chains the entire verse plus the reference. Zero reading required, which
// is exactly why it fills the Kindergarten recall slot Memory Match used to.
//
// Hard/encore mode: chunks are bigger, the first listen has no glow-along
// (ears only), the reference gets rehearsed mid-chain (after phrase 2) as
// well as at the finale, and peeking is locked during the finale chain.

export default {
  id: 'echo',
  title: 'Echo Chamber',
  icon: '🔊',
  tagline: 'Hear it, then echo it back!',
  howTo: 'Listen to the words glow by, then they hide! Say them out loud and tap the parrot when you are ready. Each new part joins a growing chain — say the whole chain from the start every time!',
  group: false,

  mount(stage, ctx) {
    const { el, clear, sfx } = ctx;

    let dead = false;
    const timers = new Set();
    function later(fn, ms) {
      const t = setTimeout(() => { timers.delete(t); if (!dead) fn(); }, ms);
      timers.add(t);
      return t;
    }
    const sleep = (ms) => new Promise((resolve) => later(resolve, ms));

    ctx.addStyle(`
      .g-echo { display: flex; flex-direction: column; min-height: 400px; }
      .g-echo .cave { position: relative; text-align: center; height: 64px; margin-bottom: 4px; overflow: hidden; border-radius: 999px 999px 0 0; }
      .g-echo .cave::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 130%, var(--ink) 0%, var(--slate) 55%, transparent 78%); border-radius: 50% 50% 0 0 / 100% 100% 0 0; }
      .g-echo .cave .parrot { position: relative; display: inline-block; font-size: 2.6rem; animation: floaty 2.4s ease-in-out infinite; }
      .g-echo .cave .spark { position: absolute; font-size: 1.1rem; animation: floaty 2s ease-in-out infinite; }
      .g-echo .cave .spark.a { left: 18%; top: 10px; animation-delay: 0.3s; }
      .g-echo .cave .spark.b { right: 16%; top: 18px; animation-delay: 0.7s; }
      .g-echo .prompt { text-align: center; font-weight: bold; font-size: 1.12rem; margin: 6px 0 10px; min-height: 1.4em; }
      .g-echo .rows { background: #f4f8ff; border-radius: 16px; padding: 10px; text-align: center; flex: 1; }
      .g-echo .echo-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; margin: 4px 0; }
      .g-echo .word-tile.plain { background: var(--paper); border: 2px solid var(--sky); }
      .g-echo .word-tile.plain.cue { background: var(--cream); border-color: var(--yellow); font-style: italic; }
      .g-echo .echo-tile { background: var(--blue-soft); border: 2px solid var(--sparks-blue); min-width: 60px; font-size: 1.3rem; transition: transform 0.15s ease; }
      .g-echo .echo-tile.locked { background: rgba(62, 75, 84, 0.08); border-color: rgba(62, 75, 84, 0.25); color: rgba(62, 75, 84, 0.55); cursor: not-allowed; }
      .g-echo .echo-tile.glow { background: var(--cream); border-color: var(--yellow); font-size: 1.02rem; transform: scale(1.1); box-shadow: 0 0 0 4px rgba(249, 161, 28, 0.3); }
      .g-echo .echo-tile.peek { background: var(--cream); border-color: var(--yellow); font-size: 1.02rem; animation: pop-in 0.25s ease; }
      .g-echo .echo-tile.revealed { background: var(--green-soft); border-color: var(--green); font-size: 1.02rem; animation: pop-in 0.25s ease; }
      .g-echo .ref-row { background: var(--cream); border-radius: 12px; padding: 4px 8px; }
      .g-echo .ref-row .ref-icon { font-size: 1.3rem; align-self: center; }
      .g-echo .footer { margin-top: 10px; text-align: center; }
      .g-echo .footer .btn-row { align-items: center; margin: 6px 0 0; }
      .g-echo .peek-chip { display: inline-block; background: var(--paper); border-radius: 999px; padding: 6px 14px; font-family: var(--display); font-weight: 700; box-shadow: var(--shadow); font-size: 0.95rem; }
      .g-echo.many .rows { padding: 8px 6px; }
      .g-echo.many .word-tile, .g-echo.many .echo-tile { font-size: 0.95rem; min-height: 44px; padding: 7px 12px; }
    `);

    const words = ctx.verse.words;
    const isList = ctx.verse.isList;
    const isHg = ctx.verse.key.startsWith('hg.');
    const chunkSize = isList ? 3 : ctx.hard ? 7 : isHg ? 4 : 6;
    const phrases = ctx.chunk(words, chunkSize);
    const capped = phrases.length > 5; // long lists/verses: chain steps show only the last 3 phrases
    const many = words.length > 19;

    const root = el('div', 'g-echo' + (many ? ' many' : ''));
    stage.appendChild(root);

    const cave = el('div', 'cave');
    cave.append(
      el('span', 'spark a', '✨'),
      el('span', 'parrot', '🦜'),
      el('span', 'spark b', '⭐'),
    );
    root.appendChild(cave);

    const promptEl = el('div', 'prompt', '👂 Get ready to listen…');
    const rowsHost = el('div', 'rows');
    const footer = el('div', 'footer');
    root.append(promptEl, rowsHost, footer);

    let peeks = 0;
    const peekChip = el('div', 'peek-chip');
    function updatePeekChip() { peekChip.textContent = `👀 Peeks: ${peeks}`; }
    updatePeekChip();

    function rewiggle(node) {
      node.classList.remove('wrong');
      void node.offsetWidth; // restart the animation
      node.classList.add('wrong');
    }

    // A face-down "echo bubble" tile: tap to peek its word for 1.5s (counts
    // toward `peeks`) unless locked, in which case it wiggles + refuses.
    // `flash()` is the automatic HEAR glow — it briefly shows the word too,
    // but doesn't count as a peek since the kid didn't ask for it.
    function makeFaceDownTile(word, locked) {
      const tile = el('button', 'word-tile echo-tile' + (locked ? ' locked' : ''), locked ? '🔒' : '🔵');
      let revealed = false;
      let peeking = false;
      tile.onclick = () => {
        if (dead || revealed) return;
        if (locked) { sfx.wrong(); rewiggle(tile); return; }
        if (peeking) return;
        peeking = true;
        peeks++;
        updatePeekChip();
        sfx.click();
        tile.textContent = word;
        tile.classList.add('peek');
        later(() => {
          if (revealed) return;
          peeking = false;
          tile.textContent = '🔵';
          tile.classList.remove('peek');
        }, 1500);
      };
      return {
        el: tile,
        reveal(delay) {
          later(() => {
            if (dead) return;
            revealed = true;
            tile.disabled = true;
            tile.textContent = word;
            tile.classList.remove('peek', 'locked');
            tile.classList.add('revealed');
          }, delay);
        },
        flash(ms) {
          return new Promise((resolve) => {
            if (dead || revealed || locked || peeking) { resolve(); return; }
            tile.textContent = word;
            tile.classList.add('glow');
            later(() => {
              if (!revealed) {
                tile.textContent = locked ? '🔒' : '🔵';
                tile.classList.remove('glow');
              }
              resolve();
            }, ms);
          });
        },
      };
    }

    function waitForClick(btn) {
      return new Promise((resolve) => {
        btn.onclick = () => {
          if (dead) return;
          btn.onclick = null;
          btn.disabled = true;
          sfx.pop();
          resolve();
        };
      });
    }

    function showFooterButton(label) {
      clear(footer);
      const row = el('div', 'btn-row');
      const btn = el('button', 'btn btn-green btn-big', label);
      row.append(peekChip, btn);
      footer.appendChild(row);
      return btn;
    }

    // ---------- HEAR → VANISH → ECHO for one new phrase ----------
    //
    // The tiles start face-down (VANISH is their resting state) and the
    // "I said it!" button is live from the moment the round mounts — so a
    // kid (or an impatient tester) can tap through immediately. Left alone,
    // each tile flashes its word once in sequence (HEAR) before settling
    // back to blank, while the phrase plays aloud.

    async function phraseRound(phraseWords, roundLabel) {
      clear(rowsHost);
      const row = el('div', 'echo-row');
      const downs = phraseWords.map((w) => makeFaceDownTile(w, false));
      downs.forEach((d) => row.appendChild(d.el));
      rowsHost.appendChild(row);

      promptEl.textContent = (roundLabel ? roundLabel + ' — ' : '') + '👂 Listen… then say it out loud!';
      const goBtn = showFooterButton('🦜 I said it!');
      let skipped = false;
      const clicked = waitForClick(goBtn).then(() => { skipped = true; });

      ctx.speak(phraseWords.join(' '));

      if (!ctx.hard) {
        for (const d of downs) {
          if (dead || skipped) break;
          await Promise.race([d.flash(340), clicked]);
        }
      } else {
        // Encore: no glow-along — just give speech time to finish (or skip).
        await Promise.race([sleep(phraseWords.length * 340), clicked]);
      }
      await clicked;
      if (dead) return;

      promptEl.textContent = '✅ Great echo!';
      clear(footer);
      ctx.speak(phraseWords.join(' '));
      downs.forEach((d, i) => d.reveal(i * 150));
      await sleep(downs.length * 150 + 500);
    }

    // ---------- cumulative chain review (also used for the finale) ----------

    function rowsUpTo(i) {
      const start = capped ? Math.max(0, i - 2) : 0;
      return phrases.slice(start, i + 1).map((w) => ({ type: 'phrase', words: w }));
    }
    function finaleRows() {
      const rows = phrases.map((w) => ({ type: 'phrase', words: w }));
      if (!isList) rows.push({ type: 'ref', label: ctx.verse.label });
      return rows;
    }

    async function chainRound({ rows, promptText, doneText, locked }) {
      clear(rowsHost);
      const built = [];
      for (const r of rows) {
        const rowEl = el('div', 'echo-row');
        if (r.type === 'phrase') {
          rowEl.appendChild(el('span', 'word-tile plain cue', r.words[0]));
          const downs = r.words.slice(1).map((w) => makeFaceDownTile(w, locked));
          downs.forEach((d) => rowEl.appendChild(d.el));
          built.push(...downs);
        } else {
          rowEl.classList.add('ref-row');
          const d = makeFaceDownTile(r.label, locked);
          rowEl.append(el('span', 'ref-icon', '🔖'), d.el);
          built.push(d);
        }
        rowsHost.appendChild(rowEl);
      }
      promptEl.textContent = promptText;
      const goBtn = showFooterButton('🦜 I said it all!');
      await waitForClick(goBtn);
      if (dead) return;

      promptEl.textContent = doneText;
      clear(footer);
      const chainText = rows.map((r) => (r.type === 'phrase' ? r.words.join(' ') : r.label)).join('. ');
      ctx.speak(chainText);
      built.forEach((d, i) => d.reveal(i * 130));
      await sleep(built.length * 130 + 600);
    }

    // ---------- run the whole play ----------

    function finish() {
      if (dead) return;
      ctx.confetti();
      const stars = peeks <= 1 ? 3 : peeks <= 4 ? 2 : 1;
      later(() => ctx.win({
        stars, peeks, supportLevel: 1, message: 'The cave heard every word!',
      }), 700);
    }

    async function run() {
      for (let i = 0; i < phrases.length; i++) {
        if (dead) return;
        const label = phrases.length > 1 ? `Part ${i + 1} of ${phrases.length}` : '';
        await phraseRound(phrases[i], label);
        if (dead) return;
        await chainRound({
          rows: rowsUpTo(i),
          promptText: i === 0 ? '🔁 Chain it! Say it again from the top!' : '🔁 Chain it! Say everything so far!',
          doneText: '✅ Nice chain!',
          locked: false,
        });
        if (dead) return;
        // Encore: rehearse the reference mid-chain too, right after phrase 2.
        if (ctx.hard && !isList && i === 1) {
          await chainRound({
            rows: [...rowsUpTo(1), { type: 'ref', label: ctx.verse.label }],
            promptText: '📖 Say it so far — and the reference!',
            doneText: '✅ Great memory!',
            locked: false,
          });
          if (dead) return;
        }
      }
      await chainRound({
        rows: finaleRows(),
        promptText: isList ? '🎉 Say the whole list!' : '🎉 Say it all — and the reference!',
        doneText: '🎉 You echoed it all!',
        locked: ctx.hard,
      });
      if (dead) return;
      finish();
    }

    run();

    return () => {
      dead = true;
      for (const t of timers) clearTimeout(t);
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
