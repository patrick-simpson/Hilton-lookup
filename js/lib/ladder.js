// The per-verse Mastery Ladder (plans.html §3.3): which games are offered on
// each of the four suggested stages, and how those UI rows map onto the
// storage stage (js/lib/progress.js: 0 untouched, 1 built, 2 recalled,
// 3 recited). Pure module — no DOM, no games/index.js import — so it stays
// importable from plain Node (see the sanity check in the P1.5 task). The
// game registry is passed in by the caller instead.

// Row 3 (Recall) defaults differ per book so each grade gets its natural
// memory-cue game first; 'disappear' is always kept as the universal fallback.
const RECALL_BY_BOOK = {
  hg: ['echo', 'disappear'],
  ss: ['firstletter', 'disappear'],
};
const RECALL_DEFAULT = ['drawtell', 'disappear']; // wr, and any future book

const ROW_MAX = 2;

// registry-filter + dedupe + cap, in the order candidates were listed.
function resolveGames(ids, registry) {
  return [...new Set(ids)].filter((id) => registry[id]).slice(0, ROW_MAX);
}

// ladderFor(book, section, registry) → the four ladder rows for this section.
// `registry` is GAMES from js/games/index.js (kept as a parameter, not an
// import, so this module has no DOM/browser dependency).
export function ladderFor(book, section, registry) {
  const signature = section.game;
  const recallIds = RECALL_BY_BOOK[book.id] || RECALL_DEFAULT;

  const rows = [
    { n: 1, key: 'listen', title: 'Listen & Sing', icon: '🎵', ids: ['singalong', 'karaoke'] },
    // Group-game sections (Spinner, Relay, Hot Potato) still feature their
    // signature game here for leader-led club use — no special-casing needed.
    { n: 2, key: 'build', title: 'Build', icon: '🧱', ids: [signature] },
    { n: 3, key: 'recall', title: 'Recall', icon: '🧠', ids: recallIds },
    { n: 4, key: 'recite', title: 'Recite', icon: '🏆', ids: ['recite', 'stickers'] },
  ];

  return rows.map((row) => {
    // The signature game only gets top billing in Build — drop it elsewhere
    // so it never appears twice on the same ladder.
    const ids = row.n === 2 ? row.ids : row.ids.filter((id) => id !== signature);
    return {
      n: row.n, key: row.key, title: row.title, icon: row.icon, games: resolveGames(ids, registry),
    };
  });
}

// UI row → "is this row done" for a verse's storage stage. Row 1 (Listen &
// Sing) has no stage of its own in progress.js, so it piggybacks on "built
// it" (stage ≥ 1) just like row 2, per the task's row↔stage mapping.
export function stageDone(uiRowN, storageStage) {
  if (uiRowN <= 2) return storageStage >= 1;
  if (uiRowN === 3) return storageStage >= 2;
  return storageStage >= 3;
}

// The UI row to suggest next ("← play me"): the first row not yet done, or
// 4 (Recite) once everything is done — recitation is the ceiling, so it
// stays the standing invitation.
export function nextRow(storageStage) {
  for (let n = 1; n <= 4; n++) {
    if (!stageDone(n, storageStage)) return n;
  }
  return 4;
}
