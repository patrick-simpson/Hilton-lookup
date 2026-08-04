# Game Module Spec — Sparks Verse Arcade

## Routing

Games mount at `#/b/<book>/<section>/play/<verseIdx>/<gameId>`. The bare
`#/b/<book>/<section>/play/<verseIdx>` route (no `gameId`) is the **verse
ladder screen** — a per-verse menu of the four suggested Mastery Ladder
stages (Listen & Sing, Build, Recall, Recite; see `js/lib/ladder.js`), each
offering one or two game buttons that link into the route above.

Every game lives in `js/games/<id>.js` and default-exports:

```js
export default {
  id: 'scramble',          // must match filename and the id in js/games/index.js
  title: 'Verse Scramble', // shown to kids
  icon: '🧩',              // single emoji
  tagline: 'Put the words back in order!',        // one short kid-friendly line
  howTo: 'Tap the words in the right order to rebuild the verse.', // 1–3 sentences
  group: false,            // true only for leader-led group games
  mount(stage, ctx) {
    // build the game inside `stage` (a .stage div, position:relative, overflow:hidden)
    // OPTIONAL: return a cleanup function — it runs when the player leaves.
    return () => { /* clear timers/intervals here */ };
  },
};
```

## The ctx API

| Member | Description |
|---|---|
| `ctx.verse` | Current verse instance: `{ ref, label, text, spokenText, words, isList, entryN, entryTitle, key }`. `words` is the display token array. For book-list "verses" (`isList: true`) `words` are Bible book names in order and `text` is the comma-joined list. |
| `ctx.verses` | All verse instances in this section (array, same shape). Useful for review/group games. |
| `ctx.hard` | `true` for encore sections — make the game noticeably harder (fewer hints, more decoys, faster). |
| `ctx.el(tag, cls, text)` | DOM helper. `ctx.clear(node)` empties a node. |
| `ctx.shuffle(arr)` | Returns a new shuffled array (never returns the original order). |
| `ctx.pick(arr)`, `ctx.randInt(n)` | Random helpers. |
| `ctx.tokenize(text)`, `ctx.cleanWord(w)` | Word helpers. Compare words with `cleanWord` (lowercases, strips punctuation). |
| `ctx.chunk(words, size)` | Split a word array into phrase chunks. |
| `ctx.distractors(count)` | Decoy words NOT in the current verse (book names for list verses). |
| `ctx.sfx` | `.click() .pop() .correct() .wrong() .tick() .win()` — WebAudio, no assets. |
| `ctx.speak(text?)` | No-arg: plays the official Awana recording for the current verse when one exists, falling back to device speech otherwise. Called with text: always uses device speech (for dynamic strings, e.g. reading back a single word). `ctx.stopSpeak()` stops either — file audio and device speech both go silent. |
| `ctx.confetti()` | Confetti burst inside the stage. |
| `ctx.thinkBeat({ anchor, ms = 1800 })` | Returns a Promise. Shows a small pulsing "🤔 What comes next?" badge appended inside `anchor` (never a full-stage overlay — must not cover any answer target) inviting silent recall before a cloze game's word candidates appear. Resolves after `ms`, or instantly the moment the kid taps anywhere on the stage — always removes itself either way. Never blocks and never penalizes; it only invites. Used by balloon/firefly/garden — see plans.html §7.2. |
| `ctx.addStyle(css)` | Injects a `<style>` tag, auto-removed on unmount. Prefix every selector with `.g-<id>` and add that class to your root element so styles never leak. |
| `ctx.win({ stars, message, mistakes, peeks, supportLevel })` | Call EXACTLY ONCE when the round is complete. `stars`: 1–3 (3 = flawless). `mistakes`/`peeks` feed the mastery-stage credit check below (in addition to whatever a mounted `ctx.guide` tracked itself — pass your own count, don't double it up). `supportLevel` overrides the guide-derived level for games that don't use `ctx.guide` at all but still want to grant stage-2 credit. The shell records progress and shows the celebration screen. |
| `ctx.exit()` | Leave to the section page (rarely needed — the shell has a Back button). |

## Fading support (plans.html §7.1)

The seven "tap the next word in order" builder games (Scramble, Train, Rocket,
Hopscotch, Stones, Falling Words, Sword Slash) always showed the verse or a
guide strip, so kids pattern-matched instead of recalling. The fix: the guide
fades as a verse is replayed, so tapping becomes retrieval instead of
recognition.

- **`ctx.win` always records the play**: every call to `ctx.win()` calls
  `recordPass(verse.key, game.id)` internally — no game needs to do this
  itself.
- **`supportLevelFor(verse, gameId, hard)`** (exported from
  `js/lib/engine.js`) computes the default guide level for THIS play: 0 (full
  text) on the first pass, 1 (first letters) on the second, 2 (blanks) from
  the third pass on. Hard/encore sections start at level 1 or higher. HG
  (kindergarten) verses cap the *automatic* default at level 1 — a Sparks kid
  can still push it to blank via the chip, but the engine never forces a K
  verse to start blank.
- **`fadeWord(word, level)`** (exported) renders one word at a level: 0
  unchanged; 1 keeps a leading digit token (e.g. the "1" in "1 Corinthians")
  plus the first letter, original case, everything else dropped; 2 is a
  single blank glyph `◻`.
- **`ctx.guide(words)`** builds the guide-strip controller a builder mounts
  wherever its own always-visible preview used to live:
  ```js
  const guide = ctx.guide(chunkWords);   // once per play
  root.appendChild(guide.el);            // insert wherever the old preview was
  guide.markDone(i);                     // word i just got tapped correctly — shows it full + lit
  guide.reset(nextChunkWords);           // new round/chunk — same controller, level/peeks carry over
  guide.level;                           // current level (live; the kid can change it)
  guide.peeks;                           // peeks so far this play (live)
  ```
  It renders a small tile per word — done words always show full text (lit);
  undone words show `fadeWord(word, level)`. A level chip (🌕/🌗/🌑) sits at
  the strip's end; tapping it cycles the level for *this play only* — kid
  autonomy, never locked by pass count. At level ≥ 1, tapping an undone word
  flashes its full text for 1.5s (a "peek") and counts against the pass's
  stage-2 credit. At level 0, tapping an undone word does nothing.
- **Stage-2 credit**: after a win, if the level that was in effect (the
  *lowest* level active at any point in the play — dropping to 0 mid-play via
  the chip forfeits credit even if raised back up before the end) is ≥ 1, and
  total mistakes + peeks ≤ 1, the verse is raised to mastery stage 2
  ("recalled it") via `setStage`.
- **Builders must route their guide/preview through `ctx.guide`** — that's
  the only thing that makes recall practice (and the ⭐⭐/stage-2 path) work.
  See `js/games/scramble.js` for the reference implementation: it replaced
  its old "built so far" strip — which showed every word of the current
  chunk and was left fully visible even in hard mode — with `ctx.guide`.

## Rules

1. **Audience is K–2nd grade.** Minimal reading in the UI. Big tap targets (≥52px). Emoji for art. Bright and friendly. No "game over" / failure states — wrong answers get a wiggle + `sfx.wrong()` and another try. Track mistakes and award `stars: 3` (0–1 mistakes), `2` (2–4), `1` (5+) unless the game has a more natural scale.
2. **Self-contained.** No network requests, no external libraries, no images/audio files. ES module, plain JavaScript (no TypeScript syntax). Reuse CSS classes from `css/style.css` (`.word-tile`, `.btn`, `.chip`, `.btn-row`, `.verse-display`, animations `pop-in`, `wiggle`, `floaty`) and add game-specific CSS via `ctx.addStyle`.
3. **Handle every verse shape.** Verses range from 5 words ("We love because he first loved us.") to 60+ (1 Thessalonians 4:16). For long verses work phrase-by-phrase using `ctx.chunk`. Handle `isList` verses (Bible book names) sensibly — they are ordered lists, great for sequencing, and their "words" contain spaces (e.g. "1 Corinthians").
4. **Clean up.** Clear every `setInterval`/`setTimeout`/`requestAnimationFrame` in your returned cleanup function. Don't touch DOM outside `stage`.
5. **Start instantly.** The game should be playable the moment it mounts (a single "tap to start" screen is OK for timed/moving games). Speak the verse once on mount with `ctx.speak()` so pre-readers hear it (skip for group games where the leader reads).
6. **Call `ctx.win` exactly once.** After it, stop timers/animation. Never call it in a loop.
7. **Group games** (`group: true`) are leader-driven: the leader taps ✓/✗ while kids recite out loud. Still call `ctx.win` when the activity completes.

## Reference implementation

See `js/games/scramble.js` for the canonical example of structure, styling, difficulty handling (`ctx.hard`), long-verse chunking, and cleanup.
