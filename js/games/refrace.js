// Reference Race — trains the verse↔reference link in BOTH directions.
// Odd races (1st, 3rd, 5th): read the verse, race to tap its Bible
// reference. Even races (2nd, 4th): see the reference, race to tap how the
// verse starts. Either way, tap before the sparkle timer runs out. Every
// correct answer moves the runner one step down the track toward the
// finish flag (5 steps). Reading game: no speak on mount; a 🔊 button reads
// each round's verse text (never the reference — that would give the
// answer away!).

const FALLBACK_REFS = [
  'John 3:16', 'Psalm 23:1', 'Romans 3:23', 'Acts 16:31',
  'Genesis 1:1', '1 John 4:14', 'Joshua 1:9', 'Psalm 147:5',
];

// First-~5-word phrases for the same eight fallback verses, used only when
// a section's verse pool is too small to supply enough phrase decoys.
const FALLBACK_PHRASES = [
  'For God so loved the…', 'The LORD is my shepherd,…', 'For all have sinned and…',
  'Believe in the Lord Jesus,…', 'In the beginning God created…', 'The Father has sent his…',
  'Have I not commanded you?…', 'Great is our Lord and…',
];

const TOTAL_STEPS = 5;

export default {
  id: 'refrace',
  title: 'Reference Race',
  icon: '🏁',
  tagline: 'Race to match verses and references!',
  howTo: 'Read the verse, then tap where it lives in the Bible before the sparkle timer runs out! Some races flip it around — you’ll see the reference first and pick how the verse starts. Every right answer runs you closer to the finish flag. Tap 🔊 to hear the verse read out loud.',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx } = ctx;

    ctx.addStyle(`
      .g-refrace .race-track { position: relative; height: 58px; background: var(--cream); border: 2px dashed var(--yellow); border-radius: 999px; margin-bottom: 12px; overflow: hidden; }
      .g-refrace .race-step { position: absolute; top: 50%; transform: translate(-50%, -50%); font-size: 0.8rem; opacity: 0.55; }
      .g-refrace .race-flag { position: absolute; top: 50%; right: 10px; transform: translateY(-50%); font-size: 2rem; }
      .g-refrace .race-runner { position: absolute; top: 50%; transform: translateY(-50%) scaleX(-1); font-size: 2rem; transition: left 0.5s ease; z-index: 2; }
      .g-refrace .round-top { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 4px; }
      .g-refrace .round-label { font-family: var(--display); font-weight: 700; color: var(--slate); opacity: 0.85; }
      .g-refrace .say-btn { min-height: 52px; min-width: 62px; font-size: 1.5rem; padding: 6px 14px; }
      .g-refrace .verse-display { font-size: 1.3rem; }
      .g-refrace .verse-display.long { font-size: 1.1rem; }
      .g-refrace .verse-display.ref-mode { font-weight: bold; font-size: 1.6rem; background: var(--blue-soft); border-radius: 14px; }
      .g-refrace .prompt-line { text-align: center; font-weight: bold; opacity: 0.65; margin: 2px 0; font-size: 0.9rem; }
      .g-refrace .timer-track { height: 24px; background: var(--sky-soft); border-radius: 999px; margin: 10px 6px 14px; overflow: visible; }
      .g-refrace .timer-fill { position: relative; height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--yellow), var(--orange)); animation: g-refrace-shrink linear forwards; }
      .g-refrace .timer-fill::after { content: '✨'; position: absolute; right: -10px; top: 50%; transform: translateY(-50%); font-size: 1.25rem; }
      @keyframes g-refrace-shrink { from { width: 100%; } to { width: 0%; } }
      /* 2-up answer grid keeps 3-4 big buttons + track + timer on one screen;
         an odd last button stretches across both columns. */
      .g-refrace .ref-row { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-width: 480px; margin: 12px auto 4px; }
      .g-refrace .ref-btn { min-height: 64px; padding: 8px 10px; font-size: clamp(0.95rem, 4.2vw, 1.2rem); background: var(--blue-soft); border: 2px solid transparent; }
      .g-refrace .ref-btn:last-child:nth-child(odd) { grid-column: 1 / -1; }
      .g-refrace .ref-btn.correct { background: var(--green-soft); border-color: var(--green); animation: pop-in 0.25s ease; }
      .g-refrace .ref-btn.wrong { background: var(--red-soft); animation: wiggle 0.35s ease; }
      .g-refrace .msg { text-align: center; font-family: var(--display); font-size: 1.3rem; font-weight: 700; margin: 6px 0; animation: pop-in 0.3s ease; }
      .g-refrace .finish-msg { text-align: center; font-family: var(--display); font-size: 1.7rem; font-weight: 700; margin-top: 40px; animation: pop-in 0.35s ease; }
      @media (max-width: 480px) {
        .g-refrace .race-track { height: 46px; margin-bottom: 8px; }
        .g-refrace .race-flag, .g-refrace .race-runner { font-size: 1.6rem; }
        .g-refrace .verse-display { font-size: 1.15rem; padding: 8px 6px; }
        .g-refrace .verse-display.ref-mode { font-size: 1.35rem; }
        .g-refrace .timer-track { height: 20px; margin: 8px 6px 10px; }
        .g-refrace .ref-row { gap: 8px; margin-top: 8px; }
        .g-refrace .ref-btn { min-height: 58px; }
        .g-refrace .msg { font-size: 1.15rem; margin: 4px 0; }
      }
    `);

    const root = el('div', 'g-refrace');
    stage.appendChild(root);

    const hard = ctx.hard;
    const optionCount = hard ? 4 : 3;
    // Encore (plans.html §9.5): hard mode keeps the same 4 options as before
    // but the timer is back to 8s — memory demand over speed pressure.
    const timerMs = hard ? 8000 : 10000;

    // Round verses: every non-list verse in the section. If the section is
    // all book-lists, fall back to the lists themselves (their labels work
    // as answer buttons too).
    let versePool = ctx.verses.filter((v) => !v.isList);
    if (versePool.length === 0) versePool = ctx.verses.slice();

    const plan = [];
    while (plan.length < TOTAL_STEPS) plan.push(...shuffle(versePool));
    plan.length = TOTAL_STEPS;

    // ---- timers ----
    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    };
    const cancel = (t) => { clearTimeout(t); timers.delete(t); };

    // ---- race track (persists across rounds) ----
    const track = el('div', 'race-track');
    const stepPct = (step) => 5 + step * 15.5; // 0..5 → 5%..82.5%
    for (let i = 1; i < TOTAL_STEPS; i++) {
      const dot = el('span', 'race-step', '🔵');
      dot.style.left = stepPct(i) + '%';
      track.appendChild(dot);
    }
    track.appendChild(el('span', 'race-flag', '🏁'));
    const runner = el('span', 'race-runner', '🏃');
    runner.style.left = stepPct(0) + '%';
    track.appendChild(runner);
    root.appendChild(track);

    const panel = el('div', 'panel');
    root.appendChild(panel);

    let step = 0;
    let mistakes = 0;
    let finished = false;
    let timerTimeout = null;

    function decoysFor(verse) {
      const need = optionCount - 1;
      const fromSection = [...new Set(
        versePool.map((v) => v.label).filter((l) => l !== verse.label)
      )];
      let decoys = shuffle(fromSection).slice(0, need);
      if (decoys.length < need) {
        const extra = FALLBACK_REFS.filter(
          (r) => r !== verse.label && !decoys.includes(r)
        );
        decoys = decoys.concat(shuffle(extra).slice(0, need - decoys.length));
      }
      return decoys;
    }

    // The "first phrase" of a verse, for the reverse (reference→text) round.
    // Book lists have no sentence to quote, so their label stands in.
    function phraseFor(verse) {
      if (verse.isList) return verse.label;
      const w = verse.words;
      if (w.length <= 5) return verse.text;
      return w.slice(0, 5).join(' ') + '…';
    }

    function phraseDecoysFor(verse) {
      const need = optionCount - 1;
      const target = phraseFor(verse);
      const fromSection = [...new Set(
        versePool.map((v) => phraseFor(v)).filter((p) => p !== target)
      )];
      let decoys = shuffle(fromSection).slice(0, need);
      if (decoys.length < need) {
        const extra = FALLBACK_PHRASES.filter(
          (p) => p !== target && !decoys.includes(p)
        );
        decoys = decoys.concat(shuffle(extra).slice(0, need - decoys.length));
      }
      return decoys;
    }

    function playRound(retry) {
      if (finished) return;
      clear(panel);
      const verse = plan[step];
      // Odd races (1st, 3rd, 5th) show the text and ask for the reference;
      // even races (2nd, 4th) flip it — show the reference, ask for the
      // verse's opening words. Both directions train the same link.
      const refMode = step % 2 === 1;
      let answered = false;

      if (retry) panel.appendChild(el('div', 'msg', 'Try again! 🐢'));

      const top = el('div', 'round-top');
      top.appendChild(el('span', 'round-label', `Race ${step + 1} of ${TOTAL_STEPS}`));
      const say = el('button', 'btn say-btn', '🔊');
      say.setAttribute('aria-label', 'Read the verse out loud');
      say.onclick = () => { sfx.click(); ctx.speak(verse.text); };
      top.appendChild(say);
      panel.appendChild(top);

      let answerKey;
      if (refMode) {
        panel.appendChild(el('div', 'prompt-line', 'Which verse starts like this?'));
        panel.appendChild(el('div', 'verse-display ref-mode', verse.label));
        answerKey = phraseFor(verse);
      } else {
        panel.appendChild(el('div', 'prompt-line', 'Where does it live?'));
        panel.appendChild(el('div', 'verse-display' + (verse.text.length > 150 ? ' long' : ''), verse.text));
        answerKey = verse.label;
      }

      const timerTrack = el('div', 'timer-track');
      const fill = el('div', 'timer-fill');
      fill.style.animationDuration = timerMs + 'ms';
      timerTrack.appendChild(fill);
      panel.appendChild(timerTrack);

      timerTimeout = later(() => {
        if (answered || finished) return;
        answered = true;
        mistakes++;
        sfx.pop();
        playRound(true);
      }, timerMs);

      const row = el('div', 'ref-row');
      const decoys = refMode ? phraseDecoysFor(verse) : decoysFor(verse);
      const options = shuffle([answerKey, ...decoys]);
      for (const label of options) {
        const btn = el('button', 'btn ref-btn', label);
        btn.onclick = () => {
          if (answered || finished) return;
          if (label === answerKey) {
            answered = true;
            cancel(timerTimeout);
            fill.style.animationPlayState = 'paused';
            sfx.correct();
            btn.classList.add('correct');
            step++;
            runner.style.left = stepPct(step) + '%';
            if (step === TOTAL_STEPS) finish();
            else later(playRound, 750);
          } else {
            mistakes++;
            sfx.wrong();
            btn.classList.remove('wrong');
            void btn.offsetWidth; // restart the wiggle animation
            btn.classList.add('wrong');
          }
        };
        row.appendChild(btn);
      }
      panel.appendChild(row);
    }

    function finish() {
      finished = true;
      later(() => {
        clear(panel);
        panel.appendChild(el('div', 'finish-msg', '🏁 You made it! 🎉'));
        ctx.confetti();
        const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
        later(() => ctx.win({ stars, mistakes }), 900);
      }, 550);
    }

    playRound(false);

    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
