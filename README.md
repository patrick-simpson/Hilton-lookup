# Sparks Verse Arcade ✨

A kid-friendly web app of **23 Bible-memory games** covering the complete Awana® Sparks
scope and sequence — all three handbooks, every section, every verse — built around a
research-backed **Mastery Ladder**: Listen & Sing → Build → Recall → Recite.

> Unofficial practice app made for Sparks clubbers and their leaders.
> Not affiliated with or endorsed by Awana.

## How it works

- **Three handbooks:** 🪂 HangGlider (K, green), 🛩️ WingRunner (1st, blue),
  🚀 SkyStormer (2nd, red) — 27 sections in all (Rank + Red Jewels 1–4 + Green
  Jewels 1–4 per book), following the official Awana Curriculum Scope and Sequence.
- **The Mastery Ladder.** Every verse offers four suggested stages — 🎵 Listen & Sing,
  🧱 Build (the section's signature game), 🧠 Recall, 🏆 Recite — all always tappable,
  never locked. Stars mean mastery, not game score: ⭐ built it · ⭐⭐ recalled it from
  memory · ⭐⭐⭐ recited word-perfect **with the reference** (only the Recitation screen
  grants it: grown-up check-off, record-and-listen, Magic Ears, or said-it-at-club).
- **Games that force recall, not recognition.** Builder games fade their guides across
  plays (full text → first letters → blanks); arcade games make kids recall the next
  word *before* targets appear; Echo Chamber, Draw & Tell, and First-Letter Trail are
  pure retrieval. Seven SkyStormer "encore" sections demand deeper memory, not speed.
- **Official Awana audio.** Every verse is read by the real handbook narrators (all four
  translations), 📻 Story Time plays the handbook's 69 narrated stories and lessons
  (great in the car), and the Books-of-the-Bible songs power 🎶 Sing-Along Stage —
  which lights up for any verse the moment you add its song file.
- **Four translations:** NIV (1984), ESV, KJV, and NKJV — pick on the home screen (📖).
  Stars and stickers carry across translations.
- **Made for K–2:** audio-first for pre-readers, big buttons, wrong answers just wiggle —
  no failing, only retrying.
- **Progress that motivates, honestly:** the 🌻 Verse Garden grows with mastery
  (sprout = built, stem = recalled, bloom = recited), the 🏆 Trophy Shelf holds one medal
  per word-perfect recitation, 🔁 per-book review replays your oldest verses, and streaks
  only ever celebrate — nothing nags. Saved in the browser (localStorage).

## The games

Each section's **signature game** (the Build stage of its ladder):

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

Plus three ladder-only games available on every fitting verse: 🎶 Sing-Along Stage
(any verse with a song file), 🎨 Draw & Tell (Recall stage, 1st grade+), and
🔤 First-Letter Trail (Recall stage, 2nd grade). 📻 Story Time and the 🏆 Recitation
screen round out the ladder's Listen and Recite stages.

## Running it

It's a static site — no build step, no dependencies.

```sh
npx serve .            # or: python3 -m http.server
```

then open the shown URL. (Modern browsers block ES modules over `file://`,
so use any static server. GitHub Pages works out of the box.)

Game sounds are generated with WebAudio. Verse read-alouds play the **official
Awana handbook recordings** (see below); the tuned browser speech synthesis is
the fallback for dynamic text and the two refs Awana never recorded.

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
- `python3 tools/generate-timings.py` — word-level timing sidecars
  (`*.timings.json`) by force-aligning each recording to its known text
  (needs `pip install faster-whisper`); powers word-accurate highlighting.
  Run it after adding song files, then rebuild the manifest.

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
