// Verse Spinner — leader-led group game. Spin the big wheel, then everybody
// recites the verse together in the silly style it lands on (LOUD, whisper,
// robot, opera...). Five completed spins = win. In hard (encore) mode the
// verse hides while the group recites, with a small Peek button.

const STYLES = [
  { emoji: '📢', name: 'LOUD',        tip: 'Shout it SUPER loud!',            color: '#ff6b6b' },
  { emoji: '🤫', name: 'Whisper',     tip: 'Say it in a teeny tiny whisper!', color: '#4dabf7' },
  { emoji: '🤖', name: 'Robot',       tip: 'BEEP BOOP! Say it like a robot!', color: '#ffd43b' },
  { emoji: '🎭', name: 'Opera',       tip: 'Siiiing it like fancy opera!',    color: '#c77dff' },
  { emoji: '🐢', name: 'Slow-mo',     tip: 'Saaay iiit sooo slooowly!',       color: '#69db7c' },
  { emoji: '🐇', name: 'Super-fast',  tip: 'Say it as fast as you can!',      color: '#ffa94d' },
  { emoji: '🦘', name: 'Bouncing',    tip: 'Bounce up and down on every word!', color: '#38d9a9' },
  { emoji: '😑', name: 'Serious-face', tip: 'No smiling allowed! So serious!', color: '#f783ac' },
];

const SPINS_NEEDED = 5;
const SPIN_MS = 3400;

export default {
  id: 'spinner',
  title: 'Verse Spinner',
  icon: '🎡',
  tagline: 'Spin and say it silly!',
  howTo: 'A leader spins the wheel, then everybody says the verse together in the silly style it lands on. Tap "We said it!" after each round — five spins wins the wheel!',
  group: true,

  mount(stage, ctx) {
    const { el, clear, sfx, randInt } = ctx;

    const timers = new Set();
    const later = (fn, ms) => {
      const t = setTimeout(() => { timers.delete(t); fn(); }, ms);
      timers.add(t);
      return t;
    };
    const unlater = (t) => { clearTimeout(t); timers.delete(t); };

    const wedge = 360 / STYLES.length;
    const conic = 'conic-gradient(' +
      STYLES.map((s, i) => `${s.color} ${i * wedge}deg ${(i + 1) * wedge}deg`).join(', ') +
      ')';

    ctx.addStyle(`
      .g-spinner { text-align: center; }
      .g-spinner .v-wrap { position: relative; background: #f4f8ff; border-radius: 16px; margin-bottom: 8px; }
      .g-spinner .verse-display.small { font-size: 1.1rem; }
      .g-spinner .v-cover { position: absolute; inset: 0; background: #fff7df; border: 3px dashed var(--yellow); border-radius: 16px; display: none; align-items: center; justify-content: center; gap: 10px; font-weight: bold; font-size: 1.2rem; }
      .g-spinner .v-cover .big-eyes { font-size: 2rem; }
      .g-spinner .v-wrap.covered .v-cover { display: flex; }
      .g-spinner .dots { font-size: 1.6rem; letter-spacing: 8px; margin: 2px 0 8px; }
      .g-spinner .dot { display: inline-block; opacity: 0.22; filter: grayscale(1); }
      .g-spinner .dot.done { opacity: 1; filter: none; animation: pop-in 0.35s ease; }
      .g-spinner .wheel-box { position: relative; width: min(78vw, 270px); margin: 0 auto 4px; }
      .g-spinner .pointer { position: absolute; top: -7px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 15px solid transparent; border-right: 15px solid transparent; border-top: 26px solid var(--ink); z-index: 5; filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.25)); }
      .g-spinner .wheel { width: 100%; aspect-ratio: 1; border-radius: 50%; border: 8px solid #fff; position: relative; box-shadow: 0 6px 0 rgba(38, 50, 75, 0.15); transition: transform ${SPIN_MS}ms cubic-bezier(0.12, 0.78, 0.15, 1); will-change: transform; }
      .g-spinner .arm { position: absolute; inset: 0; pointer-events: none; }
      .g-spinner .lab { position: absolute; top: 8px; left: 50%; transform: translateX(-50%); font-size: 1.7rem; filter: drop-shadow(0 2px 1px rgba(0, 0, 0, 0.18)); }
      .g-spinner .hub { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 62px; height: 62px; background: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.7rem; box-shadow: 0 3px 0 rgba(38, 50, 75, 0.2); }
      .g-spinner .announce { min-height: 92px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
      .g-spinner .a-style { font-size: 1.8rem; font-weight: bold; border-radius: 999px; padding: 6px 24px; animation: pop-in 0.35s ease; }
      .g-spinner .a-tip { font-size: 1.15rem; font-weight: bold; opacity: 0.85; }
      .g-spinner .s-chip { min-height: 52px; min-width: 62px; font-size: 1.35rem; justify-content: center; }
      .g-spinner .btn-row { margin: 8px 0 4px; }
      /* Short phones: shrink the wheel with the viewport and sit the buttons
         beside the announcement so the whole game fits without scrolling. */
      @media (max-height: 820px) {
        .g-spinner .verse-display { font-size: 1.1rem; line-height: 1.3; padding: 4px 8px; }
        .g-spinner .verse-display .verse-ref { margin-top: 2px; font-size: 0.9rem; }
        .g-spinner .v-wrap { margin-bottom: 6px; }
        .g-spinner .v-cover { font-size: 1.05rem; }
        .g-spinner .dots { font-size: 1.1rem; letter-spacing: 6px; margin: 0 0 2px; }
        .g-spinner .wheel-box { width: min(78vw, 270px, 30vh); }
        .g-spinner .wheel { border-width: 6px; }
        .g-spinner .lab { font-size: 1.45rem; top: 5px; }
        .g-spinner .hub { width: 48px; height: 48px; font-size: 1.3rem; }
        .g-spinner .pointer { border-left-width: 12px; border-right-width: 12px; border-top-width: 20px; top: -5px; }
        .g-spinner .foot { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 4px; }
        .g-spinner .announce { min-height: 52px; flex: 1; min-width: 0; }
        .g-spinner .a-style { font-size: 1.25rem; padding: 4px 12px; }
        .g-spinner .a-tip { font-size: 1rem; }
        .g-spinner .btn-row { margin: 0; flex-direction: column; gap: 6px; flex-shrink: 0; }
        .g-spinner .s-chip { min-height: 44px; min-width: 56px; font-size: 1.15rem; }
      }
    `);

    const root = el('div', 'g-spinner');
    stage.appendChild(root);

    // ----- verse (stays on screen; leader reads with the kids) -----
    const vwrap = el('div', 'v-wrap');
    const vd = el('div', 'verse-display');
    if (ctx.verse.words.length > 26) vd.classList.add('small');
    vd.appendChild(el('div', null, ctx.verse.text));
    vd.appendChild(el('span', 'verse-ref', ctx.verse.label));
    const cover = el('div', 'v-cover');
    cover.append(el('span', 'big-eyes', '🙈'), el('span', null, 'From memory!'));
    vwrap.append(vd, cover);

    // ----- progress dots -----
    const dots = el('div', 'dots');
    const dotEls = [];
    for (let i = 0; i < SPINS_NEEDED; i++) {
      const d = el('span', 'dot', '✨');
      dots.appendChild(d);
      dotEls.push(d);
    }

    // ----- wheel -----
    const wheelBox = el('div', 'wheel-box');
    const wheel = el('div', 'wheel');
    wheel.style.background = conic;
    for (let i = 0; i < STYLES.length; i++) {
      const arm = el('div', 'arm');
      arm.style.transform = `rotate(${i * wedge + wedge / 2}deg)`;
      arm.appendChild(el('span', 'lab', STYLES[i].emoji));
      wheel.appendChild(arm);
    }
    wheel.appendChild(el('div', 'hub', '🎡'));
    wheelBox.append(wheel, el('div', 'pointer'));

    const announce = el('div', 'announce');
    const controls = el('div', 'btn-row');
    const foot = el('div', 'foot');
    foot.append(announce, controls);
    root.append(vwrap, dots, wheelBox, foot);

    // ----- state -----
    let totalRot = 0;
    let lastIdx = -1;
    let done = 0;
    let spinning = false;
    let finished = false;
    let tickTimer = null;
    let peekTimer = null;

    const soundChip = () => {
      const c = el('button', 'chip s-chip', '🔊');
      c.onclick = () => { sfx.click(); ctx.speak(); };
      return c;
    };

    function setIdle() {
      vwrap.classList.remove('covered');
      clear(announce);
      announce.appendChild(el('div', 'a-tip', done === 0 ? 'Spin the wheel! 🎡' : 'Spin again! 🎡'));
      clear(controls);
      const spin = el('button', 'btn btn-primary btn-big', 'SPIN! 🎡');
      spin.onclick = doSpin;
      controls.append(spin, soundChip());
    }

    function doSpin() {
      if (spinning || finished) return;
      spinning = true;
      sfx.click();
      clear(controls);
      clear(announce);
      announce.appendChild(el('div', 'a-tip', 'Round and round… 🌀'));

      // Pick a wedge (never the same style twice in a row).
      let t;
      do { t = randInt(STYLES.length); } while (t === lastIdx);
      lastIdx = t;

      // Rotate so wedge t's center (plus a little jitter) lands under the top pointer.
      const jitter = randInt(29) - 14; // stays well inside the 45° wedge
      const wantMod = ((360 - (t * wedge + wedge / 2 + jitter)) % 360 + 360) % 360;
      const curMod = ((totalRot % 360) + 360) % 360;
      const turns = 4 + randInt(2); // 4–5 full turns
      totalRot += turns * 360 + ((wantMod - curMod + 360) % 360);
      wheel.style.transform = `rotate(${totalRot}deg)`;

      // Decelerating tick-tick-tick while the wheel slows down.
      let gap = 70;
      const tickLoop = () => {
        sfx.tick();
        gap = Math.min(gap * 1.14, 400);
        tickTimer = later(tickLoop, gap);
      };
      tickTimer = later(tickLoop, gap);

      later(() => {
        if (tickTimer) { unlater(tickTimer); tickTimer = null; }
        spinning = false;
        landed(t);
      }, SPIN_MS + 100);
    }

    function landed(t) {
      const s = STYLES[t];
      sfx.pop();
      clear(announce);
      const badge = el('div', 'a-style', `${s.emoji} ${s.name}!`);
      badge.style.background = s.color + '55';
      announce.append(badge, el('div', 'a-tip', s.tip));

      if (ctx.hard) vwrap.classList.add('covered');

      clear(controls);
      const saidIt = el('button', 'btn btn-green btn-big', 'We said it! ✅');
      saidIt.onclick = () => finishRound(saidIt);
      controls.appendChild(saidIt);

      if (ctx.hard) {
        const peek = el('button', 'chip s-chip', '👀 Peek');
        peek.onclick = () => {
          sfx.click();
          vwrap.classList.remove('covered');
          if (peekTimer) unlater(peekTimer);
          peekTimer = later(() => { vwrap.classList.add('covered'); peekTimer = null; }, 2000);
        };
        controls.appendChild(peek);
      } else {
        controls.appendChild(soundChip());
      }
    }

    function finishRound(btn) {
      if (finished) return;
      sfx.correct();
      if (peekTimer) { unlater(peekTimer); peekTimer = null; }
      vwrap.classList.remove('covered');
      dotEls[done].classList.add('done');
      done++;
      if (done >= SPINS_NEEDED) {
        finished = true;
        btn.disabled = true;
        clear(controls);
        clear(announce);
        announce.appendChild(el('div', 'a-style', 'Amazing! 🌟'));
        ctx.confetti();
        later(() => ctx.win({ stars: 3 }), 900);
      } else {
        setIdle();
      }
    }

    // Group game: the leader reads with the kids — no auto-speak on mount.
    setIdle();

    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
      ctx.stopSpeak();
    };
  },
};
