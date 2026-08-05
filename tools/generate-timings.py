#!/usr/bin/env python3
"""Generate word-level timing sidecars (<audio>.timings.json) for the verse
read clips and songs, by transcribing each file with word timestamps
(faster-whisper) and force-aligning the result to the KNOWN text.

Dev-only tool. Requires: pip install faster-whisper, plus a JSON dump of the
verse texts (see --texts). The app's words are whitespace tokens of the verse
text; each may span several ASR tokens ("1 Corinthians" ~ "First Corinthians").
Unmatched words get times interpolated between anchored neighbors, so every
word always has a monotonic timestamp.

  python3 tools/generate-timings.py --texts /path/verse-texts.json [--force] [globs...]

Sidecars are merged into js/data/audio-manifest.js by build-audio-manifest.mjs.
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAP = json.loads((ROOT / 'tools' / 'awana-track-map.json').read_text())

ORDINAL = {'1': ['1', 'first', 'one'], '2': ['2', 'second', 'two'], '3': ['3', 'third', 'three']}
MIN_ANCHOR_RATIO = 0.55  # below this, alignment is untrustworthy — skip the file


def clean(w):
    return re.sub(r"[^a-z0-9']", '', w.lower())


def fuzzy_eq(a, b):
    if a == b:
        return True
    if a in ORDINAL and b in ORDINAL[a] or b in ORDINAL and a in ORDINAL[b]:
        return True
    if len(a) >= 4 and len(b) >= 4:
        # cheap Levenshtein<=1 for stems of equal-ish length
        if abs(len(a) - len(b)) <= 1 and sum(1 for x, y in zip(a, b) if x != y) <= 1 and a[:3] == b[:3]:
            return True
    return False


def align(app_words, asr_words):
    """app_words: display tokens. asr_words: [(clean, start)].
    Returns [start_or_None per app word] via LCS-style DP on subtokens."""
    subs = []  # (clean_subtoken, app_word_index)
    for i, w in enumerate(app_words):
        for part in w.split():
            c = clean(part)
            if c:
                subs.append((c, i))
    n, m = len(subs), len(asr_words)
    # DP longest fuzzy-match alignment
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n - 1, -1, -1):
        for j in range(m - 1, -1, -1):
            best = max(dp[i + 1][j], dp[i][j + 1])
            if fuzzy_eq(subs[i][0], asr_words[j][0]):
                best = max(best, 1 + dp[i + 1][j + 1])
            dp[i][j] = best
    starts = [None] * len(app_words)
    i = j = 0
    while i < n and j < m:
        if fuzzy_eq(subs[i][0], asr_words[j][0]) and dp[i][j] == 1 + dp[i + 1][j + 1]:
            wi = subs[i][1]
            if starts[wi] is None:
                starts[wi] = asr_words[j][1]
            i += 1
            j += 1
        elif dp[i + 1][j] >= dp[i][j + 1]:
            i += 1
        else:
            j += 1
    return starts


def interpolate(starts, duration):
    anchored = sum(1 for s in starts if s is not None)
    if anchored / max(1, len(starts)) < MIN_ANCHOR_RATIO:
        return None, anchored
    out = list(starts)
    if out[0] is None:
        nxt = next((k for k, s in enumerate(out) if s is not None), None)
        for k in range(nxt):
            out[k] = out[nxt] * k / max(1, nxt)
    idx = 0
    while idx < len(out):
        if out[idx] is None:
            lo = idx - 1
            hi = next((k for k in range(idx, len(out)) if out[k] is not None), None)
            hi_t = out[hi] if hi is not None else min(duration, out[lo] + 0.4 * (len(out) - lo))
            hi_i = hi if hi is not None else len(out)
            span = hi_t - out[lo]
            gap = hi_i - lo
            for k in range(idx, hi_i):
                out[k] = out[lo] + span * (k - lo) / gap
            idx = hi_i
        else:
            idx += 1
    # enforce monotonic
    for k in range(1, len(out)):
        if out[k] <= out[k - 1]:
            out[k] = out[k - 1] + 0.05
    return [round(t, 2) for t in out], anchored


def targets(texts, lists):
    """Yield (audio_path, app_words) for read clips + songs."""
    for book in MAP['books'].values():
        for e in book['tracks'].values():
            if e['type'] == 'verse':
                for t in MAP['translations']:
                    ref = e['refs'][0]
                    text = texts[t].get(ref)
                    if text:
                        yield ROOT / e['out'].replace('{t}', t), text.split()
            elif e['type'] == 'verse-list':
                key = e['refs'][0]
                raw = lists.get(key)
                words = raw.split(' | ') if ' | ' in (raw or '') else (raw or '').split()
                if words:
                    yield ROOT / e['out'], words
    # songs: the two book-list songs align to their book names
    yield ROOT / 'audio/songs/common/nt-books-song.m4a', lists['NT-ALL'].split(' | ')
    yield ROOT / 'audio/songs/common/ot-books-song.m4a', lists['OT-ALL'].split(' | ')
    yield (ROOT / 'audio/songs/common/books-of-the-bible.m4a',
           lists['OT-ALL'].split(' | ') + lists['NT-ALL'].split(' | '))
    # owner-provided per-verse songs (plans.html §4.8): slug back to the ref
    slug_ref = {}
    for book in MAP['books'].values():
        for e in book['tracks'].values():
            for r in e.get('refs', []):
                slug_ref[re.sub(r'[^a-z0-9]+', '-', r.lower()).strip('-')] = r
    for t in MAP['translations']:
        for f in sorted((ROOT / 'audio/songs' / t).glob('*.m4a')) if (ROOT / 'audio/songs' / t).exists() else []:
            ref = slug_ref.get(f.stem)
            text = texts[t].get(ref) if ref else None
            if text:
                yield f, text.split()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--texts', required=True)
    ap.add_argument('--force', action='store_true')
    ap.add_argument('globs', nargs='*')
    args = ap.parse_args()
    data = json.loads(Path(args.texts).read_text())
    from faster_whisper import WhisperModel
    model = WhisperModel('base.en', device='cpu', compute_type='int8')

    done = skipped = failed = 0
    for path, words in targets(data['texts'], data['lists']):
        if args.globs and not any(g in str(path) for g in args.globs):
            continue
        side = path.with_suffix('.timings.json')
        if side.exists() and not args.force:
            continue
        if not path.exists():
            continue
        try:
            segs, info = model.transcribe(str(path), word_timestamps=True, language='en')
            asr = [(clean(w.word), round(w.start, 2)) for s in segs for w in s.words if clean(w.word)]
            starts = align(words, asr)
            timed, anchored = interpolate(starts, info.duration)
            if timed is None:
                print(f'SKIP (only {anchored}/{len(words)} anchored) {path.relative_to(ROOT)}')
                skipped += 1
                continue
            side.write_text(json.dumps([[w, t] for w, t in zip(words, timed)]) + '\n')
            print(f'ok {anchored}/{len(words)} anchored  {side.relative_to(ROOT)}')
            done += 1
        except Exception as exc:  # keep batch going; report at end
            print(f'FAIL {path.relative_to(ROOT)}: {exc}', file=sys.stderr)
            failed += 1
    print(f'done={done} skipped={skipped} failed={failed}')


if __name__ == '__main__':
    main()
