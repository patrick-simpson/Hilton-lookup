# Sparks Verse Arcade — brand guide

Derived from the Awana Clubs 2026–27 catalog (Sparks section, pp. 41–48) so the
app reads like official Sparks material, not a generic web template. Reference
this file for any new screen or game chrome.

## Palette

| Token | Hex | Catalog role |
|---|---|---|
| `--sparks-red` | `#EE4B4F` | THE Sparks color: header blobs, primary buttons |
| `--sparks-red-deep` | `#E23A44` | blob gradient end, active states |
| `--sparks-pink` | `#F9848B` | blob gradient start (coral top-left highlight) |
| `--awana-orange` | `#F58220` | accents, NEW!-style badges, celebration |
| `--awana-gold` | `#F9A11C` | secondary accent, star/award tones |
| `--sky` | `#BBDDF2` | photo-field blue: page tint blocks, image backdrops |
| `--sky-soft` | `#DDEEf9` | lighter tint for wells/backgrounds |
| `--cream` | `#FCEFD8` | organic blob shapes anchoring page corners |
| `--cream-soft` | `#FDF6E9` | large soft background washes |
| `--sparks-blue` | `#2E9BD6` | subheads, links, secondary buttons |
| `--slate` | `#3E4B54` | the "GRADES K–2" chip, dark text on light |
| `--ink` | `#333F48` | body text |
| paper | `#FFFFFF` | primary page background (NOT a gradient) |

Handbook accents stay: HangGlider green `#2A9D3F`, WingRunner blue `#2274D0`,
SkyStormer red `#E23A44` (SkyStormer art is red/orange).

## Typography (self-hosted, fonts/, SIL OFL)

- **Display — "Baloo 2"** (`fonts/baloo2-var.woff2`, weights 600–800): chunky
  rounded face standing in for Awana's catalog display type. Headlines are
  **UPPERCASE, weight 800, slight tight tracking (−0.01em)**, in white on red
  blobs or `--awana-orange`/`--sparks-red` on white/cream.
- **Body — "Nunito Sans"** (`fonts/nunitosans-var.woff2`, 400/700): clean
  geometric sans ≈ the catalog's Avenir-style body. Dark `--ink`, 1.45 line
  height. Bold for labels.
- NO Comic Sans. Verse text may use Baloo 2 600 for warmth at kid sizes.

## Shapes & texture

- **Organic blobs**, not uniform pills: the signature move is a red blob
  bleeding off the top-left holding a white all-caps headline (border-radius
  like `0 0 55% 35% / 0 0 45% 60%`), and cream blobs anchoring a corner.
- **Wavy dividers** between color blocks (SVG scallop, not straight edges).
- Cards: white, radius 14–18px, **soft** shadow (`0 2px 10px rgba(51,63,72,.10)`)
  — never hard offset "comic" shadows.
- **Doodles**: thin white (or gold-on-light) hand-drawn sparkles — four-point
  stars ✦, tiny x, small circles, squiggles — sprinkled sparsely on color
  blocks (inline SVG data-URIs, 2px round stroke).
- The slate "grade chip": dark rounded tag, white bold text ("GRADES K–2").

## Voice

- Headlines: short, energetic, ALL CAPS ("SPARKS", "NEW FOR 2026!").
- Body: warm, plain, parent-friendly; single exclamation points, sparingly.
- Emoji: functional, not decorative wallpaper — one per control at most; never
  in ALL-CAPS display headlines.

## Anti-patterns (the "AI-generated" tells to avoid)

- Comic Sans / rounded-everything font stacks
- Full-page pastel gradient backgrounds
- Identical rounded-pill cards in a vertical stack with hard drop shadows
- An emoji on every heading and both ends of a button label
- Rainbow accents with no system; yellow-by-default highlights
