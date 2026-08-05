// Train Builder — every word is a train car. Tap the next word to couple it
// onto the train behind the 🚂 engine. Long verses / book lists become several
// trains (~8 cars each); each finished train chugs off screen before the next
// one loads. Hard mode: 12-car trains plus 2 decoy cars mixed into the pool.
//
// Fading support: the "hint" line is now a ctx.guide strip of the current
// train's words. At supportLevel >= 1 (hard/encore, or a later pass) the
// POOL cars themselves fade to first-letters too — coupling a car reveals
// its full word as the reward. Pool cars never go blank (level 2 still shows
// first letters) so they stay findable; the guide strip covers the blank
// level. Every faded pool car carries data-word (the full word) so test
// drivers can still match it.

import { supportLevelFor, fadeWord } from '../lib/engine.js';

export default {
  id: 'train',
  title: 'Train Builder',
  icon: '🚂',
  tagline: 'Couple the word cars and make the train chug!',
  howTo: 'Every word is a train car! Tap the car that comes next to hook it onto the train. Fill the whole train and watch it chug away. Tap 🔊 to hear the verse again.',
  group: false,

  mount(stage, ctx) {
    const { el, clear, shuffle, sfx, cleanWord } = ctx;

    ctx.addStyle(`
      .g-train { text-align: center; }
      .g-train .round-label { font-size: 1rem; font-family: var(--display); font-weight: 700; color: var(--slate); opacity: 0.9; margin: 0 0 8px; }
      .g-train .track-wrap {
        background: linear-gradient(180deg, var(--sky-soft) 0%, #f4fbe9 100%);
        border: 2px solid var(--sky);
        border-bottom: 6px solid #a5825a;
        border-radius: 16px;
        overflow-x: auto;
        overflow-y: hidden;
        margin-bottom: 10px;
      }
      .g-train .track {
        display: flex;
        align-items: flex-end;
        gap: 4px;
        width: max-content;
        min-width: 100%;
        padding: 12px 14px;
      }
      .g-train .track.depart { animation: g-train-go 1.25s ease-in forwards; }
      @keyframes g-train-go {
        0% { transform: translateX(0); }
        12% { transform: translateX(12px); }
        100% { transform: translateX(-140%); }
      }
      .g-train .engine {
        position: relative;
        font-size: 2.8rem;
        line-height: 1;
        padding: 0 4px;
        margin-bottom: -4px;
      }
      .g-train .puff {
        position: absolute;
        top: -6px;
        left: 2px;
        font-size: 1.25rem;
        pointer-events: none;
        animation: g-train-puff 0.8s ease-out forwards;
      }
      @keyframes g-train-puff {
        0% { opacity: 1; transform: translate(0, 0) scale(0.6); }
        100% { opacity: 0; transform: translate(-18px, -12px) scale(1.4); }
      }
      .g-train .car {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 52px;
        min-width: 60px;
        padding: 10px 16px;
        border-radius: 14px 14px 8px 8px;
        background: var(--sky-soft);
        border: 2px solid #c8e2f4;
        font-family: var(--display);
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--slate);
        white-space: nowrap;
        user-select: none;
      }
      .g-train .car::before, .g-train .car::after {
        content: "";
        position: absolute;
        bottom: -12px;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: var(--slate);
        box-shadow: inset 0 0 0 3px #9fb0ba;
      }
      .g-train .car::before { left: 7px; }
      .g-train .car::after { right: 7px; }
      .g-train .track .car.coupled {
        background: var(--green-soft);
        border-color: var(--green);
        animation: pop-in 0.25s ease;
      }
      .g-train .pool {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        align-items: flex-start;
        gap: 14px 8px;
        min-height: 90px;
        padding: 4px 2px 12px;
      }
      .g-train .pool .car {
        cursor: pointer;
        box-shadow: var(--shadow);
        transition: transform 0.08s ease;
      }
      .g-train .pool .car:active { transform: translateY(3px); box-shadow: none; }
      .g-train .car.wrong {
        animation: wiggle 0.35s ease;
        background: var(--red-soft);
        border-color: var(--red);
      }
      .g-train .btn-row { margin: 6px 0 0; }
      @media (max-width: 420px) {
        .g-train .engine { font-size: 2.4rem; }
        .g-train .car { padding: 8px 12px; font-size: 1rem; min-width: 56px; }
        .g-train .track { padding: 10px 12px; }
      }
    `);

    const root = el('div', 'g-train');
    stage.appendChild(root);

    // ~8 cars per train; hard mode pulls longer trains (12 cars) + decoys.
    const carsPerTrain = ctx.hard ? 12 : 8;
    const trains = ctx.chunk(ctx.verse.words, carsPerTrain);
    let trainIdx = 0;
    let mistakes = 0;

    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
    };

    ctx.speak();

    function puff(engine) {
      const p = el('span', 'puff', '💨');
      engine.appendChild(p);
      later(() => p.remove(), 850);
    }

    let guide = null;

    function playTrain() {
      clear(root);
      const words = trains[trainIdx];
      let nextIdx = 0;
      let locked = false;
      const level = supportLevelFor(ctx.verse, 'train', ctx.hard);

      if (trains.length > 1) {
        root.appendChild(el('div', 'round-label', `🚂 Train ${trainIdx + 1} of ${trains.length}`));
      }
      if (!guide) guide = ctx.guide(words);
      else guide.reset(words);
      root.appendChild(guide.el);

      const wrap = el('div', 'track-wrap');
      const track = el('div', 'track');
      const engine = el('div', 'engine', '🚂');
      track.appendChild(engine);
      wrap.appendChild(track);

      const pool = el('div', 'pool');
      root.append(wrap, pool);

      const btnRow = el('div', 'btn-row');
      const listen = el('button', 'btn', '🔊 Hear it');
      listen.onclick = () => { sfx.click(); ctx.speak(); };
      btnRow.appendChild(listen);
      root.appendChild(btnRow);

      // Pool cars: this train's words, plus 2 decoy cars in hard mode.
      const carDefs = words.map((w) => ({ w, decoy: false }));
      if (ctx.hard) {
        for (const d of ctx.distractors(2)) carDefs.push({ w: d, decoy: true });
      }

      for (const def of shuffle(carDefs)) {
        // Cars never go fully blank (level is capped at 1 for display) so
        // they stay findable — the guide strip above is what carries the
        // blank level. data-word always holds the full word so a faded car
        // still matches by its answer, not its (faded) label.
        const carBtn = el('button', 'car', level >= 1 ? fadeWord(def.w, 1) : def.w);
        carBtn.dataset.word = def.w;
        carBtn.type = 'button';
        carBtn.onclick = () => {
          if (locked || nextIdx >= words.length) return;
          if (!def.decoy && cleanWord(def.w) === cleanWord(words[nextIdx])) {
            sfx.correct();
            carBtn.remove();
            const coupled = el('div', 'car coupled', words[nextIdx]); // reveal the full word — the reward
            track.appendChild(coupled);
            puff(engine);
            wrap.scrollTo({ left: wrap.scrollWidth, behavior: 'smooth' });
            guide.markDone(nextIdx);
            nextIdx++;
            if (nextIdx === words.length) {
              locked = true;
              endTrain(track, engine);
            }
          } else {
            mistakes++;
            sfx.wrong();
            carBtn.classList.remove('wrong');
            void carBtn.offsetWidth; // restart the wiggle animation
            carBtn.classList.add('wrong');
            later(() => carBtn.classList.remove('wrong'), 450);
          }
        };
        pool.appendChild(carBtn);
      }
    }

    function endTrain(track, engine) {
      later(() => {
        // Two-tone whistle, extra steam, and the train chugs off to the left.
        sfx.pop();
        later(() => sfx.pop(), 170);
        puff(engine);
        later(() => puff(engine), 250);
        later(() => puff(engine), 500);
        track.classList.add('depart');
        later(nextTrainOrWin, 1350);
      }, 400);
    }

    function nextTrainOrWin() {
      trainIdx++;
      if (trainIdx < trains.length) {
        playTrain();
      } else {
        ctx.confetti();
        const stars = mistakes <= 1 ? 3 : mistakes <= 4 ? 2 : 1;
        later(() => ctx.win({ stars, mistakes, message: 'All aboard! Your train is ready!' }), 700);
      }
    }

    playTrain();

    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  },
};
