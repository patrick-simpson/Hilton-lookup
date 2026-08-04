# Sparks Verse Arcade ✨

A kid-friendly web app of **20 Bible-memory games** covering the complete Awana® Sparks
scope and sequence — all three handbooks, every section, every verse.

> Unofficial practice app made for Sparks clubbers and their leaders.
> Not affiliated with or endorsed by Awana.

## How it works

- **Three handbooks:** 🪂 HangGlider (K), 🛩️ WingRunner (1st), 🚀 SkyStormer (2nd) —
  27 sections in all (Rank + Red Jewels 1–4 + Green Jewels 1–4 per book), following the
  official Awana Curriculum Scope and Sequence.
- **Every section is a different game.** All 20 games appear at least once; seven
  SkyStormer sections replay earlier games in harder "encore" mode.
- **Made for K–2:** every verse can be read aloud (tap 🔊), buttons are big, wrong answers
  just wiggle — no failing, only retrying.
- **Progress that motivates:** stars per verse, a 📒 Sticker Book, and a 🌻 Verse Garden
  where each practiced verse grows from seed to bloom. Saved in the browser (localStorage).

## The 20 games

| # | Game | Section |
|---|------|---------|
| 1 | 🧩 Verse Scramble | HangGlider Red Jewel 1 (+ SkyStormer Green Jewel 1) |
| 2 | 🌧️ Falling Words | WingRunner Rank |
| 3 | 🚂 Train Builder | HangGlider Red Jewel 3 (+ SkyStormer Red Jewel 3) |
| 4 | 🧵 Puzzle Pieces | WingRunner Red Jewel 3 |
| 5 | 🫥 Disappearing Verse | HangGlider Rank (+ SkyStormer Green Jewel 3) |
| 6 | 🎈 Pop the Balloon | HangGlider Green Jewel 1 (+ SkyStormer Red Jewel 2) |
| 7 | 🏮 Firefly Catch | HangGlider Red Jewel 4 |
| 8 | 🎤 Verse Karaoke | WingRunner Green Jewel 1 |
| 9 | 🃏 Memory Match | HangGlider Red Jewel 2 (+ SkyStormer Green Jewel 4) |
| 10 | 🏁 Reference Race | WingRunner Green Jewel 2 (+ SkyStormer Green Jewel 2) |
| 11 | 🍎 Feed Sparky | WingRunner Red Jewel 1 |
| 12 | 🦘 Verse Hopscotch | WingRunner Green Jewel 3 |
| 13 | ⚔️ Sword Drill Slash | SkyStormer Rank |
| 14 | 🪨 Stepping Stones | HangGlider Green Jewel 3 |
| 15 | 🚀 Rocket Launch | WingRunner Red Jewel 4 (+ SkyStormer Red Jewel 4) |
| 16 | 🎡 Verse Spinner | HangGlider Green Jewel 2 |
| 17 | 🏆 Team Relay | SkyStormer Red Jewel 1 |
| 18 | 🥔 Hot Potato Verse | WingRunner Red Jewel 2 |
| 19 | 📒 Sticker Quest | HangGlider Green Jewel 4 |
| 20 | 🌻 Verse Garden | WingRunner Green Jewel 4 |

## Running it

It's a static site — no build step, no dependencies.

```sh
npx serve .            # or: python3 -m http.server
```

then open the shown URL. (Modern browsers block ES modules over `file://`,
so use any static server. GitHub Pages works out of the box.)

Voice playback uses the browser's built-in speech synthesis; sounds are generated
with WebAudio — no assets, works offline.

## Development

- `js/data/curriculum.js` — the three books' scope & sequence and section→game mapping
- `js/data/verses.js` — verse texts (NIV 1984, as used in the Sparks handbooks)
- `js/lib/engine.js` — shared game engine (audio, speech, confetti, ctx API)
- `js/games/*.js` — the 20 game modules; the contract is documented in `docs/GAME_SPEC.md`
- `test/` — Playwright smoke test that mounts every game in a real browser

Scripture taken from the Holy Bible, NEW INTERNATIONAL VERSION®, NIV®
Copyright © 1973, 1978, 1984 by Biblica, Inc.® Used by permission. All rights reserved worldwide.
