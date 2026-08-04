// Hot Potato Verse — leader-led circle game. Pick how many Sparks are playing,
// then a 🥔 hops around a ring of animal-face avatars while ticks play. When
// the leader taps STOP (or after a random 3–8s auto-stop) the potato lands on
// a kid, who says the next phrase of the verse out loud. Leader confirms with
// "They said it! ✅", the phrase joins the verse strip, and the potato resumes.
// Group game: the leader reads the verse, so no auto-speak (🔊 button instead).
// Hard mode: smaller chunks (more turns) and a faster potato.

const AVATARS = ['🐵', '🐸', '🦊', '🐼', '🐰', '🦁', '🐨', '🐷', '🐤', '🐙', '🦄', '🐢'];

export default {
  id: 'hotpotato',
  title: 'Hot Potato Verse',
  icon: '🥔',
  tagline: "Don't get caught with the potato — say the verse!",
  howTo: 'Sparks sit in a circle. The potato hops around — when the leader taps STOP, whoever it lands on says the next part of the verse out loud. Leader taps ✅ and the potato flies again!',
  group: true,

  mount(stage, ctx) {
    const { el, clear, sfx, randInt } = ctx;

    ctx.addStyle(`
      .g-hotpotato { text-align: center; }
      .g-hotpotato .hp-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 52px; }
      .g-hotpotato .round-label { font-weight: bold; opacity: 0.75; font-size: 1.05rem; text-align: left; }
      .g-hotpotato .setup-title { font-size: 1.45rem; font-weight: bold; margin: 16px 0 4px; }
      .g-hotpotato .stepper { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 14px 0 8px; }
      .g-hotpotato .step-btn { width: 68px; height: 68px; border-radius: 50%; font-size: 2.2rem; font-weight: bold; background: var(--blue-soft); box-shadow: var(--shadow); }
      .g-hotpotato .step-btn:active { transform: translateY(3px); box-shadow: none; }
      .g-hotpotato .count { font-size: 3rem; font-weight: bold; min-width: 88px; }
      .g-hotpotato .preview { font-size: 1.8rem; letter-spacing: 5px; min-height: 2.3rem; margin-bottom: 6px; }
      .g-hotpotato .ring { position: relative; width: min(76vw, 320px); aspect-ratio: 1 / 1; margin: 8px auto 4px; }
      .g-hotpotato .kid { position: absolute; width: 58px; height: 58px; display: flex; align-items: center; justify-content: center; font-size: 2.3rem; transform: translate(-50%, -50%); user-select: none; }
      .g-hotpotato .kid.landed { animation: hp-bounce 0.85s ease-in-out infinite; z-index: 4; }
      .g-hotpotato .potato { position: absolute; font-size: 2.1rem; transform: translate(-50%, -120%); transition: left 0.2s ease, top 0.2s ease, transform 0.3s ease; z-index: 5; pointer-events: none; filter: drop-shadow(0 3px 2px rgba(38, 50, 75, 0.3)); user-select: none; }
      .g-hotpotato .potato.landed { transform: translate(-50%, -128%) scale(1.45); }
      .g-hotpotato .stop-btn { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 108px; height: 108px; border-radius: 50%; background: var(--red); color: #fff; font-size: 1.45rem; font-weight: bold; line-height: 1.15; box-shadow: 0 6px 0 rgba(38, 50, 75, 0.3); z-index: 3; }
      .g-hotpotato .stop-btn:active { transform: translate(-50%, -50%) translateY(3px); box-shadow: none; }
      .g-hotpotato .stop-btn:disabled { opacity: 0.55; }
      .g-hotpotato .say-card { background: #fff7df; border: 3px solid var(--yellow); border-radius: 18px; padding: 12px 10px; margin: 8px auto; max-width: 480px; animation: pop-in 0.3s ease; }
      .g-hotpotato .say-kid { font-size: 2.9rem; line-height: 1.1; }
      .g-hotpotato .say-label { font-weight: bold; opacity: 0.7; font-size: 0.95rem; }
      .g-hotpotato .say-phrase { font-size: 1.75rem; font-weight: bold; margin: 8px 4px 10px; line-height: 1.3; }
      .g-hotpotato .say-phrase.long { font-size: 1.3rem; }
      .g-hotpotato .strip { margin-top: 10px; min-height: 36px; }
      .g-hotpotato .strip-word { display: inline-block; background: var(--green-soft); border-radius: 10px; padding: 4px 9px; margin: 3px; font-weight: bold; font-size: 0.95rem; animation: pop-in 0.25s ease; }
      .g-hotpotato .final { padding: 8px 0 4px; }
      .g-hotpotato .final .party { font-size: 3rem; animation: floaty 2s ease-in-out infinite; display: inline-block; }
      @keyframes hp-bounce {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        40% { transform: translate(-50%, -74%) scale(1.28); }
      }
      @media (max-width: 400px) {
        .g-hotpotato .kid { width: 48px; height: 48px; font-size: 1.9rem; }
        .g-hotpotato .stop-btn { width: 92px; height: 92px; font-size: 1.25rem; }
        .g-hotpotato .say-phrase { font-size: 1.5rem; }
        .g-hotpotato .say-phrase.long { font-size: 1.15rem; }
      }
      /* Short phones: float the "say it" card over the (paused) ring so the
         phrase and the ✅ button never fall below the fold mid-round. */
      @media (max-height: 780px) {
        .g-hotpotato .hp-content { position: relative; }
        .g-hotpotato .say-card { position: absolute; left: 2px; right: 2px; top: 10px; margin: 0; max-width: none; z-index: 6; box-shadow: 0 10px 26px rgba(38, 50, 75, 0.35); }
        .g-hotpotato .say-kid { font-size: 2.4rem; }
        .g-hotpotato .say-phrase { margin: 6px 4px 8px; }
      }
    `);

    const root = el('div', 'g-hotpotato');
    stage.appendChild(root);

    // Smaller chunks in hard mode = more turns around the circle.
    const chunkSize = ctx.hard ? 3 : 5;
    const rounds = ctx.chunk(ctx.verse.words, chunkSize);
    const hopDelay = ctx.hard ? 185 : 250; // hard = faster potato
    const joinWords = (words) => words.join(ctx.verse.isList ? ', ' : ' ');

    // ---- timers (all async goes through `later` so cleanup can kill it) ----
    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    };
    const cancel = (t) => { clearTimeout(t); timers.delete(t); };

    // ---- persistent top row: progress label + 🔊 (leader reads, no auto-speak) ----
    const topRow = el('div', 'hp-top');
    const roundLabel = el('div', 'round-label', '🥔 Hot Potato!');
    const speakBtn = el('button', 'btn', '🔊');
    speakBtn.onclick = () => { sfx.click(); ctx.speak(); };
    topRow.append(roundLabel, speakBtn);
    const content = el('div', 'hp-content');
    root.append(topRow, content);

    // ---- game state ----
    let kidCount = 6;
    let chunkIdx = 0;
    let potatoIdx = 0;
    let phase = 'setup'; // setup | spin | land | say | done
    let stopping = false;
    let autoTimer = null;
    let kids = [];
    let positions = [];
    let potato = null;
    let stopBtn = null;
    let sayArea = null;
    let strip = null;

    // ---------- setup screen ----------
    function renderSetup() {
      clear(content);
      content.appendChild(el('div', 'setup-title', 'How many Sparks are playing?'));

      const stepper = el('div', 'stepper');
      const minus = el('button', 'step-btn', '−');
      const countEl = el('div', 'count', String(kidCount));
      const plus = el('button', 'step-btn', '+');
      stepper.append(minus, countEl, plus);

      const preview = el('div', 'preview');
      const sync = () => {
        countEl.textContent = String(kidCount);
        preview.textContent = AVATARS.slice(0, kidCount).join(' ');
      };
      minus.onclick = () => { if (kidCount > 2) { kidCount--; sfx.click(); sync(); } };
      plus.onclick = () => { if (kidCount < 12) { kidCount++; sfx.click(); sync(); } };
      sync();

      const startBtn = el('button', 'btn btn-primary btn-big', 'Start! 🥔');
      startBtn.onclick = () => { sfx.pop(); buildGame(); };
      const row = el('div', 'btn-row');
      row.appendChild(startBtn);

      content.append(stepper, preview, row);
    }

    // ---------- game screen ----------
    function buildGame() {
      clear(content);
      kids = [];
      positions = [];

      const ring = el('div', 'ring');
      for (let i = 0; i < kidCount; i++) {
        const angle = (i / kidCount) * 2 * Math.PI - Math.PI / 2; // start at top
        const x = 50 + 41 * Math.cos(angle);
        const y = 50 + 41 * Math.sin(angle);
        positions.push({ x, y });
        const kid = el('div', 'kid', AVATARS[i]);
        kid.style.left = x + '%';
        kid.style.top = y + '%';
        ring.appendChild(kid);
        kids.push(kid);
      }

      stopBtn = el('button', 'stop-btn', 'STOP ✋');
      stopBtn.onclick = requestStop;
      ring.appendChild(stopBtn);

      potato = el('div', 'potato', '🥔');
      ring.appendChild(potato);

      sayArea = el('div', 'say-area');
      strip = el('div', 'strip');
      content.append(ring, sayArea, strip);

      potatoIdx = randInt(kidCount);
      movePotato();
      startSpin();
    }

    function movePotato() {
      const p = positions[potatoIdx];
      potato.style.left = p.x + '%';
      potato.style.top = p.y + '%';
    }

    function startSpin() {
      phase = 'spin';
      stopping = false;
      roundLabel.textContent = rounds.length > 1
        ? `Part ${chunkIdx + 1} of ${rounds.length}`
        : 'Say the whole verse!';
      stopBtn.style.visibility = 'visible';
      stopBtn.disabled = false;
      hop(hopDelay);
      // Auto-stop after a random 3–8 seconds, in case the leader is busy cheering.
      autoTimer = later(requestStop, 3000 + randInt(5001));
    }

    function hop(delay) {
      later(() => {
        if (phase !== 'spin') return;
        potatoIdx = (potatoIdx + 1) % kidCount;
        movePotato();
        sfx.tick();
        if (stopping) {
          const slower = delay * 1.6; // wind down like the music is stopping
          if (slower > 640) { land(); return; }
          hop(slower);
        } else {
          hop(delay);
        }
      }, delay);
    }

    function requestStop() {
      if (phase !== 'spin' || stopping) return;
      stopping = true;
      if (autoTimer) { cancel(autoTimer); autoTimer = null; }
      sfx.click();
      stopBtn.disabled = true;
    }

    function land() {
      phase = 'land';
      sfx.correct();
      kids[potatoIdx].classList.add('landed');
      potato.classList.add('landed');
      stopBtn.style.visibility = 'hidden';
      later(showPhrase, 550);
    }

    function showPhrase() {
      phase = 'say';
      const words = rounds[chunkIdx];
      const text = joinWords(words);

      const card = el('div', 'say-card');
      card.appendChild(el('div', 'say-kid', AVATARS[potatoIdx]));
      card.appendChild(el('div', 'say-label', 'got the potato! Say it:'));
      const phraseEl = el('div', 'say-phrase' + (text.length > 44 ? ' long' : ''), text);
      card.appendChild(phraseEl);

      const row = el('div', 'btn-row');
      const hearBtn = el('button', 'btn', '🔊 Hear it');
      hearBtn.onclick = () => { sfx.click(); ctx.speak(text); };
      const okBtn = el('button', 'btn btn-green btn-big', 'They said it! ✅');
      okBtn.onclick = () => confirmPhrase(words);
      row.append(hearBtn, okBtn);
      card.appendChild(row);

      clear(sayArea);
      sayArea.appendChild(card);
    }

    function confirmPhrase(words) {
      if (phase !== 'say') return;
      sfx.correct();
      for (const w of words) strip.appendChild(el('span', 'strip-word', w));
      clear(sayArea);
      kids[potatoIdx].classList.remove('landed');
      potato.classList.remove('landed');
      chunkIdx++;
      if (chunkIdx >= rounds.length) {
        finish();
      } else {
        phase = 'land'; // brief pause before the potato flies again
        later(startSpin, 500);
      }
    }

    function finish() {
      phase = 'done';
      clear(content);
      roundLabel.textContent = 'You did it! 🌟';

      const final = el('div', 'final');
      final.appendChild(el('div', 'party', '🎉 🥔 🎉'));
      const display = el('div', 'verse-display');
      display.appendChild(el('div', '', ctx.verse.text));
      display.appendChild(el('span', 'verse-ref', ctx.verse.label));
      final.appendChild(display);
      content.appendChild(final);

      ctx.confetti();
      ctx.speak(); // hear the whole verse together
      // Give the verse a moment to be heard before the celebration screen.
      const winDelay = Math.min(8000, 1500 + ctx.verse.words.length * 380);
      later(() => ctx.win({ stars: 3 }), winDelay);
    }

    renderSetup();

    return () => {
      phase = 'done';
      for (const t of timers) clearTimeout(t);
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
