#!/usr/bin/env python3
"""Download the official Awana Sparks handbook-audio ZIPs and extract/convert
the tracks mapped in tools/awana-track-map.json into the repo audio/ tree.

Dev-only tool (like test/): the app never runs this. Requires ffmpeg.

  python3 tools/fetch-awana-audio.py            # everything missing
  python3 tools/fetch-awana-audio.py --force    # re-convert existing outputs
  python3 tools/fetch-awana-audio.py hg.niv84   # just one book.translation

Source: https://clubs.awana.org/club-resources/?search=sparks&ldcategory=parents
Verse clips are extracted from every translation ZIP; lessons/stories/songs and
book-list clips are translation-independent and extracted from the NIV ZIPs only.
Encoding: mono AAC (m4a), loudness-normalized; 64 kbps verse clips, 56 kbps
lessons/stories, 96 kbps songs.
"""
import json
import re
import subprocess
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAP = json.loads((ROOT / 'tools' / 'awana-track-map.json').read_text())
BITRATE = {'verse': '64k', 'verse-list': '64k', 'lesson': '56k', 'story': '56k', 'song': '96k'}
FORCE = '--force' in sys.argv
ONLY = [a for a in sys.argv[1:] if not a.startswith('--')]


def wanted_outputs(book_id, translation):
    """(track_number, out_path) pairs this book.translation ZIP must provide."""
    out = []
    for n, e in MAP['books'][book_id]['tracks'].items():
        kind = e['type']
        if kind == 'verse':
            out.append((int(n), e['out'].replace('{t}', translation), kind))
        elif kind in ('verse-list', 'lesson', 'story', 'song') and translation == 'niv84':
            out.append((int(n), e['out'], kind))
    return out


def convert(src, dest, kind):
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-i', str(src), '-ac', '1',
           '-b:a', BITRATE[kind], '-af', 'loudnorm=I=-16:TP=-1.5',
           '-movflags', '+faststart', str(dest)]
    subprocess.run(cmd, check=True)


def process(book_id, translation):
    jobs = [(n, ROOT / rel, kind) for n, rel, kind in wanted_outputs(book_id, translation)
            if FORCE or not (ROOT / rel).exists()]
    if not jobs:
        print(f'{book_id}.{translation}: up to date')
        return
    url = MAP['zipUrl'].replace('{Book}', MAP['zipNames'][book_id]).replace(
        '{T}', MAP['translations'][translation])
    print(f'{book_id}.{translation}: {len(jobs)} tracks — downloading {url}')
    with tempfile.TemporaryDirectory() as tmp:
        zpath = Path(tmp) / 'a.zip'
        urllib.request.urlretrieve(url, zpath)
        with zipfile.ZipFile(zpath) as z:
            members = {}
            for name in z.namelist():
                m = re.match(r'MP3 Version/(\d+) .*\.mp3$', name)
                if m:
                    members[int(m.group(1))] = name
            for n, dest, kind in jobs:
                if n not in members:
                    print(f'  !! track {n} missing from ZIP', file=sys.stderr)
                    continue
                src = Path(tmp) / f'{n}.mp3'
                src.write_bytes(z.read(members[n]))
                convert(src, dest, kind)
                src.unlink()
                print(f'  ok {dest.relative_to(ROOT)}')


def main():
    combos = [(b, t) for b in MAP['books'] for t in MAP['translations']]
    if ONLY:
        combos = [tuple(x.split('.')) for x in ONLY]
    for book_id, translation in combos:
        process(book_id, translation)


if __name__ == '__main__':
    main()
