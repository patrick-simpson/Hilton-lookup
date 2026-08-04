// Sing-Along Stage — the universal Stage-1 "Listen & Sing" performance game
// for verses that have a real song recording (see songEntryFor in
// js/lib/audio.js; js/app.js's verseView keeps this game off the ladder for
// any verse without one, and this module also self-guards for direct URLs).
// A little concert stage: three rounds, each driven by the song's own word
// timeline (onWordTick) rather than a timer, so the pacing always matches
// the actual recording.
//   1. Sing along!    — song plays start to finish, a bouncing note leads
//                        the lit-up word, kid just sings.
//   2. Fill the gaps!  — song plays, but pauses at 2-3 phrase-boundary gap
//                        points (hg: 2, wr/ss: 3) for the kid to sing that
//                        phrase alone before tapping "Keep going!".
//   3. Star performance! — all tiles face-down (hg keeps one word per
//                        phrase lit as a landmark), song plays straight
//                        through, kid sings the whole thing, then bows.
// Performance game: always 3 stars on the final win.

import { songEntryFor, playVerse, onWordTick, pauseAudio, resumeAudio } from '../lib/audio.js';

// Split `words` into `parts` (>=2, capped by word count) roughly-equal,
// ordered chunks. For SkyStormer (bookId 'ss') a boundary snaps to just
// after nearby clause punctuation when one is close by, so gaps land on
// natural phrase breaks instead of mid-clause.
function computeSegments(words, parts, preferClause) {
  const n = words.length;
  const wanted = Math.max(2, Math.min(parts, n));
  let bounds = [];
  for (let i = 1; i < wanted; i++) bounds.push(Math.round((n * i) / wanted));
  if (preferClause) {
    bounds = bounds.map((b) => {
      for (let d = 0; d <= 3; d++) {
        for (const cand of [b - d, b + d]) {
          if (cand > 0 && cand < n && /[.,;:!?]["')]?$/.test(words[cand - 1])) return cand;
        }
      }
      return b;
    });
  }
  bounds = [...new Set(bounds)].filter((b) => b > 0 && b < n).sort((a, b) => a - b);
  const segs = [];
  let start = 0;
  for (const b of bounds) { segs.push({ start, end: b }); start = b; }
  segs.push({ start, end: n });
  return segs;
}

export default {
  id: 'singalong',
  title: 'Sing-Along Stage',
  icon: '🎶',
  tagline: 'Step up and sing the verse song!',
  howTo: 'Sing along while the song plays and the words light up. Next, the music will pause here and there for you to sing that part by yourself — tap "Keep going!" when you are done. Finish with a star performance: sing the whole thing, then take a bow!',
  group: false,

  mount(stage, ctx) {
    const { el, clear, sfx } = ctx;
    const verse = ctx.verse;
    const words = verse.words;
    const compact = words.length > 24 || verse.isList;

    ctx.addStyle(`
      .g-singalong { text-align: center; }
      .g-singalong .sa-marquee { position: relative; height: 62px; margin-bottom: 2px; border-radius: 18px 18px 0 0; overflow: hidden; background: linear-gradient(180deg, #2b1055 0%, #4b2e83 75%, transparent 100%); }
      .g-singalong .sa-marquee::before, .g-singalong .sa-marquee::after { content: ''; position: absolute; top: 0; bottom: 0; width: 24%; background: repeating-linear-gradient(100deg, #8e1f3f 0 10px, #ad2b52 10px 20px); }
      .g-singalong .sa-marquee::before { left: 0; border-radius: 0 0 34px 0; }
      .g-singalong .sa-marquee::after { right: 0; border-radius: 0 0 0 34px; }
      .g-singalong .sa-marquee .sa-deco { position: relative; z-index: 2; display: inline-block; font-size: 1.7rem; margin: 0 4px; animation: floaty 2.3s ease-in-out infinite; }
      .g-singalong .sa-marquee .sa-deco.b { animation-delay: 0.4s; }
      .g-singalong .sa-marquee .sa-deco.c { animation-delay: 0.8s; }
      .g-singalong .sa-badge { display: inline-block; font-weight: bold; font-size: 1.15rem; background: #fff7df; border: 3px solid var(--yellow); border-radius: 999px; padding: 6px 18px; margin: 4px 0 2px; }
      .g-singalong .sa-badge.pop { animation: pop-in 0.3s ease; }
      .g-singalong .sa-tiles { position: relative; padding: 46px 2px 10px; background: radial-gradient(ellipse at 50% -12%, rgba(255, 255, 255, 0.4), transparent 62%); }
      .g-singalong .sa-tile { display: inline-flex; align-items: center; justify-content: center; min-height: 52px; min-width: 48px; padding: 8px 14px; margin: 5px; border-radius: 14px; background: var(--blue-soft); border: 3px solid transparent; font-size: 1.1rem; font-weight: bold; box-shadow: 0 4px 0 rgba(38, 50, 75, 0.12); user-select: none; }
      .g-singalong .sa-tile.compact { font-size: 1rem; padding: 6px 9px; margin: 3px; }
      .g-singalong.compact .sa-tiles { padding: 40px 0 6px; }
      .g-singalong .sa-tile.note { background: #efe2ff; border-color: #dcc6f7; }
      .g-singalong .sa-tile.now { background: var(--yellow); border-color: #d99b00; transform: scale(1.08); }
      .g-singalong .sa-tile.sung { background: var(--green-soft); border-color: var(--green); }
      .g-singalong .sa-tile.revealed { animation: pop-in 0.3s ease; }
      .g-singalong .sa-note { position: absolute; left: 0; top: 0; transform: translateX(-50%); font-size: 1.7rem; line-height: 1; pointer-events: none; z-index: 5; transition: left 0.3s cubic-bezier(0.5, 1.8, 0.4, 1), top 0.3s cubic-bezier(0.5, 1.8, 0.4, 1); filter: drop-shadow(0 3px 2px rgba(38, 50, 75, 0.25)); }
      .g-singalong .sa-note span { display: inline-block; animation: sa-bob 0.55s ease-in-out infinite; }
      @keyframes sa-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
      .g-singalong .sa-hint { font-size: 1.05rem; font-weight: bold; opacity: 0.85; min-height: 1.5em; margin: 6px 0; }
      .g-singalong .sa-ref { font-size: 0.95rem; opacity: 0.7; font-weight: bold; margin-top: 6px; }
      .g-singalong .sa-bow { animation: pop-in 0.35s ease; }
      .g-singalong .sa-skip.sa-hot { animation: wiggle 0.6s ease-in-out infinite; background: var(--red-soft); border-color: var(--red); }
      .g-singalong-empty { text-align: center; padding: 10px; }
      .g-singalong-empty .sa-empty-emoji { font-size: 3rem; }
      .g-singalong-empty p { font-size: 1.1rem; font-weight: bold; margin: 10px 0 16px; }
    `);

    // ---------- no song for this verse yet: friendly dead end, never a crash ----------
    if (!songEntryFor(verse.ref)) {
      const empty = el('div', 'g-singalong-empty');
      empty.append(
        el('div', 'sa-empty-emoji', '🎶'),
        el('p', null, 'This verse doesn’t have a song yet!'),
      );
      const row = el('div', 'btn-row');
      const hear = el('button', 'btn btn-primary btn-big', '🔊 Hear it instead');
      hear.onclick = () => { sfx.click(); ctx.speak(); };
      const done = el('button', 'btn', 'Done ✅');
      done.onclick = () => { sfx.click(); ctx.exit(); };
      row.append(hear, done);
      empty.append(row);
      stage.appendChild(empty);
      return () => { ctx.stopSpeak(); };
    }

    const bookId = ctx.book?.id;
    const isHg = bookId === 'hg';
    const gapCount = isHg ? 2 : 3;
    const segments = computeSegments(words, gapCount + 1, bookId === 'ss');
    const gapChunks = segments.slice(1); // segments[0] plays on its own before the first gap

    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    };
    const unlater = (t) => { clearTimeout(t); timers.delete(t); };

    const root = el('div', 'g-singalong' + (compact ? ' compact' : ''));
    const marquee = el('div', 'sa-marquee');
    marquee.append(
      el('span', 'sa-deco a', '🎤'),
      el('span', 'sa-deco b', '🎶'),
      el('span', 'sa-deco c', '⭐'),
    );
    const badge = el('div', 'sa-badge');
    const tilesWrap = el('div', 'sa-tiles');
    const hint = el('div', 'sa-hint');
    const controls = el('div', 'btn-row');
    const refLine = el('div', 'sa-ref', verse.label);
    root.append(marquee, badge, tilesWrap, hint, controls, refLine);
    stage.appendChild(root);

    const note = el('div', 'sa-note');
    note.appendChild(el('span', null, '♪'));

    let tiles = [];
    let paused = false;
    let finished = false;
    let unsub = null;
    let skipBtn = null;

    function unsubTick() { if (unsub) { unsub(); unsub = null; } }

    function moveNote(tile, instant) {
      if (!tile) return;
      const x = tile.offsetLeft + tile.offsetWidth / 2;
      const y = tile.offsetTop - (compact ? 44 : 54);
      if (instant) note.style.transition = 'none';
      note.style.left = x + 'px';
      note.style.top = y + 'px';
      if (instant) { void note.offsetWidth; note.style.transition = ''; }
    }

    function buildTiles(hiddenSet) {
      clear(tilesWrap);
      tilesWrap.appendChild(note);
      tiles = words.map((w, i) => {
        const hidden = hiddenSet && hiddenSet.has(i);
        const t = el('span', 'sa-tile' + (compact ? ' compact' : ''), hidden ? '🎵' : w);
        if (hidden) t.classList.add('note');
        tilesWrap.appendChild(t);
        return t;
      });
    }

    function land(i) {
      const t = tiles[i];
      if (!t) return;
      if (i > 0 && tiles[i - 1]) {
        tiles[i - 1].classList.remove('now');
        tiles[i - 1].classList.add('sung');
      }
      t.classList.add('now');
      moveNote(t);
      sfx.tick();
    }

    function hideRange(a, b) {
      for (let k = a; k < b; k++) {
        const t = tiles[k];
        if (!t) continue;
        t.textContent = '🎤';
        t.classList.remove('now', 'sung');
        t.classList.add('note');
      }
    }
    function revealRange(a, b) {
      for (let k = a; k < b; k++) {
        const t = tiles[k];
        if (!t) continue;
        t.textContent = words[k];
        t.classList.remove('note');
        t.classList.add('revealed');
      }
    }

    // Fallback for the headless/decoder-failure case: if no tick shows up
    // for a while, audio isn't actually progressing — make Skip impossible
    // to miss, then (if it still never arrives) move on automatically so a
    // silent file can never strand the kid on a dead screen.
    function armStall(onHardStall) {
      const soft = later(() => { if (skipBtn) skipBtn.classList.add('sa-hot'); }, 4000);
      const hard = later(() => { onHardStall(); }, 9000);
      return () => { unlater(soft); unlater(hard); };
    }

    function buildControls(skipHandler) {
      clear(controls);
      skipBtn = el('button', 'btn sa-skip', 'Skip ⏭️');
      skipBtn.onclick = () => { sfx.click(); skipHandler(); };
      controls.append(skipBtn);
    }

    function setBadge(text) {
      badge.textContent = text;
      badge.classList.remove('pop');
      void badge.offsetWidth;
      badge.classList.add('pop');
    }

    // ---------- round 1: Sing along! ----------
    function startRound1() {
      paused = false;
      setBadge('🎵 Sing along!');
      hint.textContent = 'Watch the words light up and sing along!';
      buildTiles(null);
      buildControls(() => { disarm(); unsubTick(); ctx.stopSpeak(); startRound2(); });
      let disarm = armStall(() => { disarm(); unsubTick(); startRound2(); });
      unsub = onWordTick(onTick1);
      playVerse(verse, { kind: 'sing' });

      function onTick1(i) {
        disarm();
        if (i >= words.length) return;
        land(i);
        if (i >= words.length - 1) {
          unsubTick();
          sfx.pop();
          hint.textContent = 'Get ready for your turn… 🎤';
          later(startRound2, 1000);
        }
      }
    }

    // ---------- round 2: Fill the gaps! ----------
    function startRound2() {
      paused = false;
      let gapIdx = 0;
      setBadge('🎤 Fill the gaps!');
      hint.textContent = 'Sing along — the music will stop for your turn!';
      buildTiles(null);
      buildControls(() => { disarm(); unsubTick(); ctx.stopSpeak(); startRound3(); });
      let disarm = armStall(() => { disarm(); unsubTick(); startRound3(); });
      unsub = onWordTick(onTick2);
      playVerse(verse, { kind: 'sing' });

      function onTick2(i) {
        if (paused || i >= words.length) return;
        disarm();
        land(i);
        const gap = gapChunks[gapIdx];
        if (gap && i === gap.start) {
          enterGap(gap);
          return;
        }
        if (i >= words.length - 1) {
          unsubTick();
          sfx.pop();
          hint.textContent = 'Wow! One more time…';
          later(startRound3, 1000);
        }
      }

      function enterGap(gap) {
        paused = true;
        pauseAudio();
        hideRange(gap.start, gap.end);
        hint.textContent = '🎤 Your turn — sing it!';
        // Skip button (built above, still live) stays put — only ADD the
        // "keep going" button alongside it, so a restless kid can still
        // bail out of a gap they don't want to sing.
        const go = el('button', 'btn btn-primary btn-big', '▶ Keep going!');
        go.onclick = () => {
          sfx.pop();
          revealRange(gap.start, gap.end);
          gapIdx++;
          paused = false;
          hint.textContent = 'Nice singing! Keep going…';
          go.remove();
          resumeAudio();
        };
        controls.appendChild(go);
      }
    }

    // ---------- round 3: Star performance! ----------
    function startRound3() {
      paused = false;
      setBadge('⭐ Star performance!');
      hint.textContent = 'All you! Sing the whole verse with the music!';
      const hiddenSet = new Set(words.map((_, i) => i));
      if (isHg) for (const seg of segments) hiddenSet.delete(seg.start);
      buildTiles(hiddenSet);
      buildControls(() => { disarm(); unsubTick(); finishGame(); });
      let disarm = armStall(() => { disarm(); unsubTick(); showBow(); });
      unsub = onWordTick(onTick3);
      playVerse(verse, { kind: 'sing' });

      function onTick3(i) {
        disarm();
        if (i >= words.length) return;
        moveNote(tiles[i]);
        if (tiles[i] && !hiddenSet.has(i)) tiles[i].classList.add('now');
        if (i >= words.length - 1) {
          unsubTick();
          sfx.pop();
          later(showBow, 500);
        }
      }
    }

    function showBow() {
      hint.textContent = 'You did it! 🌟';
      clear(controls);
      const bow = el('button', 'btn btn-primary btn-big sa-bow', 'Take a bow! 🎉');
      bow.onclick = () => { bow.disabled = true; finishGame(); };
      controls.appendChild(bow);
    }

    function finishGame() {
      if (finished) return;
      finished = true;
      unsubTick();
      ctx.stopSpeak();
      ctx.confetti();
      later(() => ctx.win({ stars: 3, message: 'What a performance!' }), 700);
    }

    // Window resizes reflow the tiles — snap the note back onto place.
    const onResize = () => {
      const i = tiles.findIndex((t) => t.classList.contains('now'));
      if (i >= 0) moveNote(tiles[i], true);
    };
    window.addEventListener('resize', onResize);

    startRound1();

    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
      window.removeEventListener('resize', onResize);
      unsubTick();
      ctx.stopSpeak();
    };
  },
};
