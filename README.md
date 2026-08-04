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
- **Four translations:** NIV (1984), ESV, KJV, and NKJV — pick on the home screen (📖).
  Non-NIV texts follow the same verse portioning as the NIV84 handbook entries; stars and
  stickers carry across translations.
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
| 9 | 🔊 Echo Chamber | HangGlider Red Jewel 2 (+ SkyStormer Green Jewel 4) |
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

Game sounds are generated with WebAudio. Verse read-alouds currently use the
browser's built-in speech synthesis; the repo also carries the **official Awana
handbook recordings** (see below), which the app will switch to as the audio
engine from `plans.html` lands.

## Audio assets (official Awana recordings)

`audio/` holds the Awana Sparks handbook audio, downloaded from the
[Awana parent resources page](https://clubs.awana.org/club-resources/?search=sparks&ldcategory=parents)
and converted to small mono `.m4a` files:

- `audio/read/<translation>/<ref>.m4a` — every handbook verse read aloud, in all
  four translations (human recordings, not TTS)
- `audio/read/common/` — Bible book-list recitations (translation-independent)
- `audio/handbook/<book>/` — the lesson segments and Bible-story narrations
- `audio/songs/common/` — the Books of the Bible songs
- `docs/resources/` — the Bible Biography PDFs (linked from each book screen)

The **verse-music albums** are not downloadable — Awana sells/streams them via
Catapult (links on each book screen under "For grown-ups"). If you own the
albums you can drop the files in `audio/songs/<translation>/<ref-slug>.m4a`
and rerun the manifest tool below.

Dev tools (never loaded by the app):

- `tools/awana-track-map.json` — maps every ZIP track to a verse ref / lesson /
  story / song, with known gaps listed
- `python3 tools/fetch-awana-audio.py` — downloads the 12 ZIPs and re-extracts/
  converts anything missing (needs `ffmpeg`; idempotent)
- `node tools/build-audio-manifest.mjs` — regenerates `js/data/audio-manifest.js`
  from the map + files on disk (needs `ffprobe`)

## Development

- `js/data/curriculum.js` — the three books' scope & sequence and section→game mapping
- `js/data/verses.js` — verse texts (NIV 1984, as used in the Sparks handbooks)
- `js/data/translations-data.js` + `translations.js` — ESV/KJV/NKJV texts (same keys as NIV84) and the translation registry
- `js/data/audio-manifest.js` — GENERATED index of the audio files (see Audio assets above)
- `js/data/music-links.js` — external album/streaming links + biography PDF list
- `js/lib/engine.js` — shared game engine (audio, speech, confetti, ctx API)
- `js/games/*.js` — the 20 game modules; the contract is documented in `docs/GAME_SPEC.md`
- `test/` — Playwright smoke test that mounts every game in a real browser
- `plans.html` — the pedagogical redesign plan (mastery ladder, audio engine, game fixes)

Handbook audio recordings, verse-song albums, and Bible Biography PDFs are
© Awana Clubs International, obtained from Awana's public parent-resources
downloads at clubs.awana.org and included here for Sparks families' practice
use. This app is unofficial and not affiliated with or endorsed by Awana.

Scripture taken from the Holy Bible, NEW INTERNATIONAL VERSION®, NIV®
Copyright © 1973, 1978, 1984 by Biblica, Inc.® Used by permission. All rights reserved worldwide.
Scripture quotations marked ESV are from the ESV® Bible (The Holy Bible, English Standard Version®),
© 2001 by Crossway. Used by permission. Scripture taken from the New King James Version®.
© 1982 by Thomas Nelson. Used by permission. KJV quotations are public domain.
