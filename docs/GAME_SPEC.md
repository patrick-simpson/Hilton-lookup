# Game Module Spec — Sparks Verse Arcade

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
| `ctx.speak(text?)` | Reads text aloud (defaults to the whole verse + reference). `ctx.stopSpeak()`. |
| `ctx.confetti()` | Confetti burst inside the stage. |
| `ctx.addStyle(css)` | Injects a `<style>` tag, auto-removed on unmount. Prefix every selector with `.g-<id>` and add that class to your root element so styles never leak. |
| `ctx.win({ stars, message })` | Call EXACTLY ONCE when the round is complete. `stars`: 1–3 (3 = flawless). The shell records progress and shows the celebration screen. |
| `ctx.exit()` | Leave to the section page (rarely needed — the shell has a Back button). |

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
