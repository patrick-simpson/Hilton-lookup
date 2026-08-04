// Team Relay — two teams race on one screen to rebuild the same scrambled
// verse. Each leg both teams get an independently shuffled pool of the SAME
// words; first team to finish the leg earns a crown. After all legs the team
// with more crowns wins the relay (or it's a tie — everybody cheers either way).
// Group game: the leader reads the verse, so no auto-speak (🔊 button instead).

export default {
  id: 'relay',
  title: 'Team Relay',
  icon: '🏆',
  tagline: 'Red vs. Blue — race to build the verse!',
  howTo: 'Split into two teams, one on each side of the screen. When the leader says go, each team taps its words in order. First team done wins a crown 👑 — most crowns wins the relay!',
  group: true,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx } = ctx;

    ctx.addStyle(`
      .g-relay { display: flex; flex-direction: column; gap: 8px; }
      .g-relay .relay-top { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
      .g-relay .relay-top .btn { min-height: 44px; min-width: 44px; padding: 6px 14px; }
      .g-relay .leg-label { font-weight: bold; opacity: 0.75; font-size: 1rem; }
      /* Phone-first: lanes stack vertically (full-width tracks, big tiles).
         Side-by-side halves come back on wider screens below. */
      .g-relay .lanes { display: grid; grid-template-columns: 1fr; gap: 8px; align-items: start; }
      .g-relay .lane { border-radius: 16px; padding: 8px 8px 10px; min-width: 0; }
      .g-relay .lane-red { background: #fff1f2; box-shadow: inset 0 0 0 3px var(--red-soft); }
      .g-relay .lane-blue { background: #f0f6ff; box-shadow: inset 0 0 0 3px var(--blue-soft); }
      .g-relay .team-banner { display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; font-weight: bold; font-size: 1.05rem; text-align: center; }
      .g-relay .crowns { min-height: 1.3em; }
      .g-relay .crowns .crown { display: inline-block; animation: pop-in 0.35s ease; }
      .g-relay .team-msg { font-weight: bold; font-size: 0.95rem; opacity: 0.9; }
      .g-relay .team-built { display: flex; align-items: center; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: thin; -webkit-overflow-scrolling: touch; min-width: 0; height: 42px; background: rgba(255, 255, 255, 0.8); border-radius: 12px; padding: 3px 6px; margin: 6px 0; }
      .g-relay .team-pool { text-align: center; }
      .g-relay .word-tile { min-height: 52px; min-width: 56px; padding: 6px 12px; margin: 3px; font-size: 1rem; border-radius: 12px; }
      .g-relay .lane-red .team-pool .word-tile { background: var(--red-soft); }
      .g-relay .lane-blue .team-pool .word-tile { background: var(--blue-soft); }
      .g-relay .team-pool .word-tile.used { opacity: 0.35; box-shadow: none; transform: scale(0.94); }
      .g-relay .team-built .word-tile { min-height: 30px; min-width: 0; flex: 0 0 auto; padding: 2px 8px; margin: 2px; font-size: 0.85rem; box-shadow: none; white-space: nowrap; }
      .g-relay .finale { text-align: center; padding: 24px 8px; }
      .g-relay .finale .big { font-size: 3.2rem; animation: floaty 2.5s ease-in-out infinite; display: inline-block; }
      .g-relay .finale h3 { font-size: 1.5rem; margin: 10px 0 6px; }
      .g-relay .finale .tally { font-size: 1.25rem; margin: 6px 0; }
      .g-relay .finale .cheer { font-size: 2.2rem; animation: pop-in 0.4s ease; }
      .g-relay .finale .cheer-sub { font-weight: bold; margin-top: 4px; }
      @media (min-width: 600px) {
        .g-relay .lanes { grid-template-columns: 1fr 1fr; gap: 10px; }
        .g-relay .lane { min-height: 280px; padding: 8px 6px 10px; }
        .g-relay .word-tile { font-size: 0.95rem; padding: 6px 10px; }
        .g-relay .team-built { height: auto; min-height: 44px; flex-wrap: wrap; justify-content: center; overflow-x: visible; }
      }
    `);

    const root = el('div', 'g-relay');
    stage.appendChild(root);

    // Same chunks for both teams. Hard mode = bigger legs + decoy words.
    const chunkSize = ctx.verse.isList ? (ctx.hard ? 8 : 6) : (ctx.hard ? 12 : 8);
    const legs = ctx.chunk(ctx.verse.words, chunkSize);
    const crownCount = { red: 0, blue: 0 };
    let legIdx = 0;
    let legCrowned = false;

    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
    };

    // ---- header: leg counter + speak button (leader reads — no auto-speak) ----
    const header = el('div', 'relay-top');
    const legLabel = el('div', 'leg-label');
    const speakBtn = el('button', 'btn', '🔊');
    speakBtn.onclick = () => { sfx.click(); ctx.speak(); };
    header.append(legLabel, speakBtn);
    root.appendChild(header);

    // ---- lanes ----
    function makeLane(team, emoji, name) {
      const lane = el('div', `lane lane-${team}`);
      const banner = el('div', 'team-banner');
      banner.append(el('span', '', emoji), el('span', '', name));
      const crowns = el('span', 'crowns');
      banner.appendChild(crowns);
      // msg lives inside the banner row — keeps each lane short on phones.
      const msg = el('span', 'team-msg', 'Ready…');
      banner.appendChild(msg);
      const built = el('div', 'team-built');
      const pool = el('div', 'team-pool');
      lane.append(banner, built, pool);
      return { team, lane, crowns, msg, built, pool, nextIdx: 0, done: false };
    }

    const red = makeLane('red', '🔴', 'Red Team');
    const blue = makeLane('blue', '🔵', 'Blue Team');
    const lanes = el('div', 'lanes');
    lanes.append(red.lane, blue.lane);
    root.appendChild(lanes);

    function tap(side, t, tile, total) {
      if (side.done) return;
      const wanted = legs[legIdx][side.nextIdx];
      // Match by word text, not tile identity — with duplicate words in a leg
      // (e.g. "the" twice) either matching tile counts as correct.
      if (t.i >= 0 && ctx.cleanWord(t.w) === ctx.cleanWord(wanted)) {
        sfx.correct();
        // Tile stays put (dimmed) so neither lane jumps around mid-race.
        tile.disabled = true;
        tile.classList.add('used');
        side.built.appendChild(el('span', 'word-tile correct', t.w));
        side.built.scrollLeft = side.built.scrollWidth; // keep newest word in view
        side.nextIdx++;
        if (side.nextIdx === total) finishSide(side);
      } else {
        // No lockout, no penalty — just a wiggle and another try.
        sfx.wrong();
        tile.classList.remove('wrong');
        void tile.offsetWidth; // restart the wiggle animation
        tile.classList.add('wrong');
      }
    }

    function finishSide(side) {
      side.done = true;
      for (const b of side.pool.querySelectorAll('button')) {
        b.disabled = true;
        b.classList.add('ghost');
      }
      const other = side === red ? blue : red;
      if (!legCrowned) {
        legCrowned = true;
        crownCount[side.team]++;
        sfx.pop();
        side.crowns.appendChild(el('span', 'crown', '👑'));
        side.msg.textContent = '👑 First!';
        if (!other.done) other.msg.textContent = 'Keep going! 💪';
      } else {
        side.msg.textContent = 'Great job! ⭐';
      }
      if (red.done && blue.done) {
        legIdx++;
        if (legIdx < legs.length) later(playLeg, 900);
        else later(finale, 700);
      }
    }

    function playLeg() {
      const words = legs[legIdx];
      legLabel.textContent = legs.length > 1
        ? `🏁 Leg ${legIdx + 1} of ${legs.length}`
        : '🏁 Ready, set, go!';
      legCrowned = false;
      for (const side of [red, blue]) {
        side.nextIdx = 0;
        side.done = false;
        side.msg.textContent = 'Go!';
        clear(side.built);
        clear(side.pool);
        const tiles = words.map((w, i) => ({ w, i }));
        if (ctx.hard) {
          for (const d of ctx.distractors(2)) tiles.push({ w: d, i: -1 });
        }
        for (const t of shuffle(tiles)) {
          const tile = el('button', 'word-tile', t.w);
          tile.onclick = () => tap(side, t, tile, words.length);
          side.pool.appendChild(tile);
        }
      }
    }

    function finale() {
      clear(root);
      const r = crownCount.red;
      const b = crownCount.blue;
      const winLine = r > b ? 'Red Team wins the relay!'
        : b > r ? 'Blue Team wins the relay!'
        : "It's a tie! 🤝";
      const f = el('div', 'finale');
      f.appendChild(el('div', 'big', r > b ? '🏆🔴' : b > r ? '🏆🔵' : '🏆🤝'));
      f.appendChild(el('h3', '', winLine));
      if (legs.length > 1) {
        f.appendChild(el('div', 'tally', `🔴 ${'👑'.repeat(r) || '0'}  🔵 ${'👑'.repeat(b) || '0'}`));
      }
      f.appendChild(el('div', 'cheer', '🎉 🥳 🎉'));
      f.appendChild(el('div', 'cheer-sub', 'Everybody cheer for both teams!'));
      root.appendChild(f);
      sfx.pop();
      ctx.confetti();
      later(() => ctx.win({ stars: 3, message: winLine }), 1600);
    }

    playLeg();

    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
