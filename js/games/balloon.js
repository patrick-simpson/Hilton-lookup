// Pop the Balloon — fill in the blank by popping the balloon carrying the
// missing word. One blank per round, up to 6 blanks (9 in hard mode) spread
// left-to-right across the verse. Wrong balloons wiggle and stay; the kid
// just tries again. Long verses show a phrase window around the blank.
//
// Encore (plans.html §9.5, ctx.hard): the think-first beat stays silent (no
// spoken prompt), but instead of hiding each balloon's label entirely while
// it's airborne, balloons show just the first letter (a recall nudge) —
// full words reveal once the beat resolves, same as every other difficulty.

import { fadeWord } from '../lib/engine.js';

export default {
  id: 'balloon',
  title: 'Pop the Balloon',
  icon: '🎈',
  tagline: 'Pop the balloon with the missing word!',
  howTo: 'A word from the verse floated away on a balloon! Read the verse, find the empty spot, and pop the balloon carrying the missing word. Tap 🔊 to hear the verse again.',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx, cleanWord } = ctx;

    ctx.addStyle(`
      .g-balloon { text-align: center; }
      .g-balloon .top-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 8px; }
      .g-balloon .meter { display: flex; gap: 7px; justify-content: center; align-items: center; }
      .g-balloon .meter .dot { width: 16px; height: 16px; border-radius: 50%; background: #e3e8f2; border: 2px solid #cfd8e8; }
      .g-balloon .meter .dot.done { background: var(--green-soft); border-color: var(--green); }
      .g-balloon .meter .dot.now { background: #fff2c4; border-color: var(--yellow); animation: floaty 1.6s ease-in-out infinite; }
      .g-balloon .speak-btn { min-width: 52px; min-height: 52px; border-radius: 50%; font-size: 1.5rem; background: var(--paper); box-shadow: var(--shadow); }
      .g-balloon .speak-btn:active { transform: translateY(3px); box-shadow: none; }
      .g-balloon .verse-line { background: #f4f8ff; border-radius: 16px; padding: 12px 10px; margin-bottom: 12px; font-size: 1.3rem; font-weight: bold; line-height: 1.9; min-height: 64px; }
      .g-balloon .blank { display: inline-block; min-width: 96px; min-height: 34px; vertical-align: middle; border-bottom: 5px dashed var(--yellow); background: #fff7df; border-radius: 8px 8px 0 0; margin: 0 4px; }
      .g-balloon .blank.filled { min-width: 0; padding: 0 8px; background: var(--green-soft); border-bottom-color: var(--green); color: var(--green); animation: pop-in 0.35s ease; }
      .g-balloon .sky { position: relative; background: linear-gradient(180deg, #dff3ff, #f7fcff); border-radius: 18px; padding: 18px 4px 22px; min-height: 260px; display: flex; flex-wrap: wrap; justify-content: space-evenly; align-items: flex-start; gap: 4px; overflow: hidden; }
      .g-balloon .cloud { position: absolute; font-size: 2rem; opacity: 0.7; pointer-events: none; animation: floaty 5s ease-in-out infinite; }
      .g-balloon .spot { animation: g-balloon-float 3.2s ease-in-out infinite; }
      .g-balloon .balloon { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 76px; min-height: 118px; padding: 6px 4px; }
      .g-balloon .balloon .bal { font-size: 3.6rem; line-height: 1.05; transition: transform 0.08s ease; }
      .g-balloon .balloon:active .bal { transform: scale(0.92); }
      .g-balloon .balloon .lbl { background: var(--paper); border: 3px solid var(--blue-soft); border-radius: 14px; padding: 7px 12px; font-weight: bold; font-size: 1.1rem; max-width: 150px; box-shadow: 0 3px 0 rgba(38, 50, 75, 0.12); transition: opacity 0.25s ease; }
      /* think-first beat: balloons drift wordless (empty label) until the
         beat resolves, then the labels fade in. */
      .g-balloon .balloon.wordless .lbl { opacity: 0; }
      .g-balloon .balloon:disabled { cursor: default; }
      .g-balloon .balloon.wrong { animation: wiggle 0.4s ease; }
      .g-balloon .balloon.wrong .lbl { background: var(--red-soft); border-color: var(--red); }
      .g-balloon .balloon.popped { animation: g-balloon-pop 0.5s ease forwards; }
      .g-balloon .balloon.popped .lbl { background: var(--green-soft); border-color: var(--green); }
      .g-balloon .done-big { font-size: 3.4rem; margin: 8px 0; animation: pop-in 0.4s ease; }
      .g-balloon .verse-display { animation: pop-in 0.4s ease; }
      @keyframes g-balloon-float {
        0%, 100% { transform: translateY(0) rotate(-2deg); }
        50% { transform: translateY(-16px) rotate(2deg); }
      }
      @keyframes g-balloon-pop {
        0% { transform: scale(1); opacity: 1; }
        45% { transform: scale(1.35); opacity: 1; }
        100% { transform: scale(0.1); opacity: 0; }
      }
      /* short phones: tighten the layout so every balloon row stays on screen */
      @media (max-height: 700px) {
        .g-balloon .top-row { margin-bottom: 6px; }
        .g-balloon .verse-line { font-size: 1.15rem; line-height: 1.7; padding: 10px 8px; margin-bottom: 10px; min-height: 52px; }
        .g-balloon .sky { padding: 10px 4px 14px; min-height: 230px; }
        .g-balloon .balloon { min-width: 70px; min-height: 96px; }
        .g-balloon .balloon .bal { font-size: 2.9rem; }
      }
    `);

    const root = el('div', 'g-balloon');
    stage.appendChild(root);

    // ---- timers (all cleared on unmount) ----
    const timers = new Set();
    function later(fn, ms) {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    }

    const words = ctx.verse.words;
    const isList = ctx.verse.isList;
    // Vertical scatter for balloons: keep it modest on short phones so the
    // second row (hard mode, 5 balloons) never dips below the fold.
    const jitterMax = window.innerHeight < 700 ? 16 : 46;
    const maxBlanks = ctx.hard ? 9 : 6;
    const decoyCount = ctx.hard ? 4 : 2; // 5 balloons in hard mode, 3 otherwise

    // ---- choose blank positions, spread left-to-right across the verse ----
    const candidates = words.map((w, i) => i).filter((i) => cleanWord(words[i]).length > 0);
    let blanks;
    if (candidates.length <= maxBlanks) {
      blanks = candidates.slice(); // short verses: every word gets a turn
    } else {
      // one random pick from each of maxBlanks buckets -> spread + random (books)
      blanks = [];
      for (let b = 0; b < maxBlanks; b++) {
        const start = Math.floor((b * candidates.length) / maxBlanks);
        const end = Math.floor(((b + 1) * candidates.length) / maxBlanks);
        blanks.push(candidates[start + ctx.randInt(Math.max(1, end - start))]);
      }
    }
    blanks.sort((a, b) => a - b);

    let roundIdx = 0;
    let mistakes = 0;
    let roundOver = false;

    // strip flanking punctuation for balloon labels ("us." -> "us"); keeps
    // inner spaces so list "words" like "1 Corinthians" stay intact
    const trim = (w) => w.replace(/^[^A-Za-z0-9’']+|[^A-Za-z0-9’']+$/g, '') || w;

    // ---- decoys: prefer other words from the verse, then global distractors ----
    function decoysFor(answerIdx, count) {
      const seen = new Set([cleanWord(words[answerIdx])]);
      const out = [];
      for (const w of shuffle(words)) {
        if (out.length >= count) break;
        const c = cleanWord(w);
        if (!c || seen.has(c)) continue;
        seen.add(c);
        out.push(w);
      }
      if (out.length < count) {
        for (const w of ctx.distractors(count * 2 + 4)) {
          if (out.length >= count) break;
          const c = cleanWord(w);
          if (!c || seen.has(c)) continue;
          seen.add(c);
          out.push(w);
        }
      }
      return out;
    }

    // ---- verse line with the blank (windowed for long verses / long lists) ----
    function buildVerseLine(blankIdx) {
      const line = el('div', 'verse-line');
      const windowSize = isList ? 2 : 5; // words shown on each side when windowing
      const needsWindow = words.length > (isList ? 8 : 16);
      const from = needsWindow ? Math.max(0, blankIdx - windowSize) : 0;
      const to = needsWindow ? Math.min(words.length, blankIdx + windowSize + 1) : words.length;
      const sep = isList ? ', ' : ' ';

      if (from > 0) line.appendChild(document.createTextNode('… '));
      let blankEl = null;
      for (let i = from; i < to; i++) {
        if (i > from) line.appendChild(document.createTextNode(sep));
        if (i === blankIdx) {
          blankEl = el('span', 'blank', '');
          line.appendChild(blankEl);
        } else {
          line.appendChild(document.createTextNode(words[i]));
        }
      }
      if (to < words.length) line.appendChild(document.createTextNode(' …'));
      return { line, blankEl };
    }

    function buildMeter() {
      const meter = el('div', 'meter');
      for (let i = 0; i < blanks.length; i++) {
        const dot = el('span', 'dot' + (i < roundIdx ? ' done' : i === roundIdx ? ' now' : ''));
        meter.appendChild(dot);
      }
      return meter;
    }

    // ---- one round: one blank, one flock of balloons ----
    async function playRound() {
      clear(root);
      roundOver = false;
      const blankIdx = blanks[roundIdx];
      const answer = words[blankIdx];

      const topRow = el('div', 'top-row');
      const speakBtn = el('button', 'speak-btn', '🔊');
      speakBtn.setAttribute('aria-label', 'Hear the verse');
      speakBtn.onclick = () => { sfx.click(); ctx.speak(); };
      topRow.append(buildMeter(), speakBtn);
      root.appendChild(topRow);

      const { line, blankEl } = buildVerseLine(blankIdx);
      root.appendChild(line);

      const sky = el('div', 'sky');
      root.appendChild(sky);

      // decorative clouds
      const cloudSpots = [['6%', '4%'], ['74%', '10%'], ['42%', '72%']];
      cloudSpots.forEach(([left, top], i) => {
        const c = el('span', 'cloud', '☁️');
        c.style.left = left;
        c.style.top = top;
        c.style.animationDelay = (i * 0.9) + 's';
        sky.appendChild(c);
      });

      // ---- think-first beat: balloons drift wordless, then reveal ----
      const options = shuffle([answer, ...decoysFor(blankIdx, decoyCount)]);
      const balloons = [];
      options.forEach((word) => {
        const spot = el('div', 'spot');
        spot.style.animationDuration = (2.6 + Math.random() * 1.6).toFixed(2) + 's';
        spot.style.animationDelay = (-Math.random() * 2.5).toFixed(2) + 's';
        spot.style.marginTop = ctx.randInt(jitterMax) + 'px';

        // Hard mode peeks the first letter instead of hiding the label
        // outright — everyone else gets the classic blank-label "wordless"
        // look until the beat resolves.
        const b = el('button', 'balloon' + (ctx.hard ? '' : ' wordless'));
        b.disabled = true; // inert while airborne — no mistake can register
        const bal = el('span', 'bal', '🎈');
        bal.style.filter = `hue-rotate(${ctx.randInt(300)}deg)`;
        const lbl = el('span', 'lbl', ctx.hard ? fadeWord(trim(word), 1) : '');
        b.dataset.word = trim(word); // full word, for test drivers matching a faded label
        b.append(bal, lbl);

        b.onclick = () => {
          if (roundOver) return;
          if (cleanWord(word) === cleanWord(answer)) {
            roundOver = true;
            sfx.pop();
            bal.textContent = '💥';
            bal.style.filter = '';
            b.classList.add('popped');
            blankEl.textContent = answer;
            blankEl.classList.add('filled');
            later(endRound, 850);
          } else {
            mistakes++;
            sfx.wrong();
            b.classList.remove('wrong');
            void b.offsetWidth; // restart the wiggle
            b.classList.add('wrong');
            later(() => b.classList.remove('wrong'), 450); // let it drift again
          }
        };

        balloons.push({ b, lbl, word });
        spot.appendChild(b);
        sky.appendChild(spot);
      });

      await ctx.thinkBeat({ anchor: sky });
      for (const { b, lbl, word } of balloons) {
        lbl.textContent = trim(word);
        b.disabled = false;
        b.classList.remove('wordless');
      }
    }

    function endRound() {
      roundIdx++;
      if (roundIdx < blanks.length) {
        sfx.correct();
        playRound();
      } else {
        finish();
      }
    }

    // ---- all blanks filled: show + speak the whole verse, celebrate ----
    function finish() {
      clear(root);
      root.appendChild(el('div', 'done-big', '🎈🎉🎈'));
      const vd = el('div', 'verse-display', ctx.verse.text);
      vd.appendChild(el('span', 'verse-ref', ctx.verse.label));
      root.appendChild(vd);
      ctx.confetti();
      ctx.speak();
      const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
      later(() => ctx.win({ stars }), 3000);
    }

    ctx.speak();
    playRound();

    return () => {
      for (const t of timers) clearTimeout(t);
      timers.clear();
    };
  },
};
