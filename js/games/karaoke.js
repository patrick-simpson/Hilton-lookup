// Verse Karaoke — a bouncing star hops word-to-word while the kid sings along.
// Phase 1 LISTEN: the star hops on a timer (turtle/rabbit speed) while the verse
// is spoken. Phase 2 YOUR TURN: every 3rd word becomes 🎵 and the star only hops
// when the kid taps. Phase 3 STAR PERFORMANCE: (almost) all words hidden — recite
// it all, then take a bow! Performance game: always 3 stars for finishing.

export default {
  id: 'karaoke',
  title: 'Verse Karaoke',
  icon: '🎤',
  tagline: 'Sing along with the bouncing star!',
  howTo: 'Watch the star hop from word to word and sing along. Then it is your turn — tap to make the star hop while you say each word out loud. Finish with a big star performance and take a bow!',
  group: false,

  mount(stage, ctx) {
    const { el, clear, sfx } = ctx;
    const words = ctx.verse.words;
    const hard = ctx.hard;
    const compact = words.length > 24 || ctx.verse.isList;

    const NORMAL = hard ? 420 : 520;
    const TURTLE = 860;
    const RABBIT = 300;
    let speed = NORMAL;

    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    };
    const unlater = (t) => { clearTimeout(t); timers.delete(t); };

    ctx.addStyle(`
      .g-karaoke { text-align: center; }
      .g-karaoke .k-phase { display: inline-block; font-weight: bold; font-size: 1.2rem; background: #fff7df; border: 3px solid var(--yellow); border-radius: 999px; padding: 8px 20px; margin-bottom: 2px; }
      .g-karaoke .k-phase.pop { animation: pop-in 0.3s ease; }
      .g-karaoke .k-tiles { position: relative; padding: 50px 2px 8px; }
      .g-karaoke .k-tile { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; padding: 8px 14px; margin: 5px; border-radius: 14px; background: var(--blue-soft); border: 3px solid transparent; font-size: 1.1rem; font-weight: bold; box-shadow: 0 4px 0 rgba(38, 50, 75, 0.12); user-select: none; }
      .g-karaoke .k-tile.compact { font-size: 0.95rem; padding: 6px 10px; margin: 4px; }
      .g-karaoke .k-tile.note { background: #efe2ff; border-color: #dcc6f7; }
      .g-karaoke .k-tile.sung { background: var(--green-soft); border-color: var(--green); }
      .g-karaoke .k-tile.now { background: var(--yellow); border-color: #d99b00; transform: scale(1.08); }
      .g-karaoke .k-tile.revealed { animation: pop-in 0.3s ease; }
      .g-karaoke .k-star { position: absolute; left: 0; top: 0; transform: translateX(-50%); font-size: 2rem; line-height: 1; pointer-events: none; z-index: 5; transition: left 0.3s cubic-bezier(0.5, 1.8, 0.4, 1), top 0.3s cubic-bezier(0.5, 1.8, 0.4, 1); filter: drop-shadow(0 3px 2px rgba(38, 50, 75, 0.25)); }
      .g-karaoke .k-star span { display: inline-block; animation: k-bob 0.55s ease-in-out infinite; }
      @keyframes k-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
      .g-karaoke .k-hint { font-size: 1.05rem; font-weight: bold; opacity: 0.8; min-height: 1.5em; margin: 6px 0; }
      .g-karaoke .k-chip { min-height: 52px; min-width: 56px; font-size: 1.5rem; justify-content: center; }
      .g-karaoke .k-ref { font-size: 0.95rem; opacity: 0.7; font-weight: bold; margin-top: 6px; }
      .g-karaoke .k-bow { animation: pop-in 0.35s ease; }
    `);

    const root = el('div', 'g-karaoke');
    const badge = el('div', 'k-phase');
    const tilesWrap = el('div', 'k-tiles');
    const hint = el('div', 'k-hint');
    const controls = el('div', 'btn-row');
    const refLine = el('div', 'k-ref', ctx.verse.label);
    root.append(badge, tilesWrap, hint, controls, refLine);
    stage.appendChild(root);

    const star = el('div', 'k-star');
    star.appendChild(el('span', null, '⭐'));

    let phase = 1;
    let idx = -1;         // index of the word the star is on (-1 = not started)
    let tiles = [];
    let hopTimer = null;
    let finished = false;

    const BADGES = { 1: '👂 Listen!', 2: '🎵 Your turn!', 3: '🌟 Star show!' };
    const HINTS = {
      1: 'Watch the star and sing along!',
      2: 'Tap a tile and say each word out loud!',
      3: hard ? 'All from memory! Tap and say the whole verse!' : 'All you! Tap and say the whole verse!',
    };

    function hiddenAt(i) {
      if (phase === 1) return false;
      if (phase === 2) return hard ? i % 2 === 1 : i % 3 === 2;
      return hard || i !== 0; // phase 3: everything hidden (easy mode keeps word 1)
    }

    function buildTiles() {
      clear(tilesWrap);
      tilesWrap.appendChild(star);
      tiles = words.map((w, i) => {
        const hiddenTile = hiddenAt(i);
        const t = el('button', 'k-tile' + (compact ? ' compact' : ''), hiddenTile ? '🎵' : w);
        if (hiddenTile) t.classList.add('note');
        tilesWrap.appendChild(t);
        return t;
      });
    }

    function moveStar(tile, instant, raised) {
      const x = tile.offsetLeft + tile.offsetWidth / 2;
      const y = tile.offsetTop - (raised ? 68 : 40);
      if (instant) star.style.transition = 'none';
      star.style.left = x + 'px';
      star.style.top = y + 'px';
      if (instant) { void star.offsetWidth; star.style.transition = ''; }
    }

    function land(i) {
      const t = tiles[i];
      if (!t) return;
      if (i > 0) {
        tiles[i - 1].classList.remove('now');
        tiles[i - 1].classList.add('sung');
      }
      t.classList.add('now');
      // Easy mode phase 2: reveal the hidden word when the star lands, so the
      // kid gets a friendly confirmation. Hard mode keeps it a mystery.
      if (phase === 2 && !hard && t.classList.contains('note')) {
        t.textContent = words[i];
        t.classList.remove('note');
        t.classList.add('revealed');
      }
      moveStar(t);
      sfx.tick();
    }

    function chip(text) { return el('button', 'chip k-chip', text); }

    function buildControls() {
      clear(controls);
      if (phase === 1) {
        const slow = chip('🐢');
        const fast = chip('🐇');
        const setSpeed = (ms) => {
          sfx.click();
          speed = (speed === ms) ? NORMAL : ms; // tap again to go back to normal
          slow.classList.toggle('active', speed === TURTLE);
          fast.classList.toggle('active', speed === RABBIT);
        };
        slow.onclick = () => setSpeed(TURTLE);
        fast.onclick = () => setSpeed(RABBIT);
        const hear = chip('🔊');
        hear.onclick = () => { sfx.click(); ctx.speak(); };
        const skip = el('button', 'btn', 'Skip ⏭️');
        skip.onclick = () => {
          sfx.click();
          if (hopTimer) { unlater(hopTimer); hopTimer = null; }
          ctx.stopSpeak();
          startPhase(2);
        };
        controls.append(slow, fast, hear, skip);
      } else if (phase === 2 || (phase === 3 && !hard)) {
        const hear = chip('🔊');
        hear.onclick = () => { sfx.click(); ctx.speak(); };
        controls.appendChild(hear);
      }
    }

    function startPhase(p) {
      phase = p;
      idx = -1;
      badge.textContent = BADGES[p];
      hint.textContent = HINTS[p];
      badge.classList.remove('pop');
      void badge.offsetWidth;
      badge.classList.add('pop');
      buildTiles();
      buildControls();
      moveStar(tiles[0], true, true); // hover above the first word, ready to drop
      if (p === 1) hopTimer = later(hop, 900);
    }

    function hop() {
      hopTimer = null;
      if (phase !== 1) return;
      idx++;
      if (idx >= words.length) {
        sfx.pop();
        hint.textContent = 'Get ready… 🎵';
        later(() => startPhase(2), 1100);
        return;
      }
      land(idx);
      hopTimer = later(hop, speed);
    }

    // Phases 2 & 3: any tap in the tile area hops the star to the NEXT word.
    tilesWrap.onclick = () => {
      if (phase === 1 || finished) return;
      if (idx >= words.length - 1) return;
      idx++;
      land(idx);
      if (idx === words.length - 1) {
        if (phase === 2) {
          sfx.pop();
          hint.textContent = 'Wow! One more time…';
          later(() => startPhase(3), 1000);
        } else {
          finished = true;
          sfx.pop();
          later(showBow, 500);
        }
      }
    };

    function showBow() {
      hint.textContent = 'You did it! 🌟';
      clear(controls);
      const bow = el('button', 'btn btn-primary btn-big k-bow', 'Take a bow! 🎤');
      bow.onclick = () => {
        bow.disabled = true;
        ctx.confetti();
        later(() => ctx.win({ stars: 3 }), 800);
      };
      controls.appendChild(bow);
    }

    // Window resizes reflow the tiles — snap the star back onto the current word.
    const onResize = () => {
      const t = tiles[Math.max(0, Math.min(idx, words.length - 1))];
      if (t) moveStar(t, true, idx < 0);
    };
    window.addEventListener('resize', onResize);

    ctx.speak();
    startPhase(1);

    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
      window.removeEventListener('resize', onResize);
      ctx.stopSpeak();
    };
  },
};
