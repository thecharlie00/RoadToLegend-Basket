"""Valida y fusiona las traducciones por bloques: tools/i18n/chunks/<lang>-<start>.json = lista alineada con en_strings."""
import json, glob, re, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent
EN = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else None
CHUNKS = sys.argv[2] if len(sys.argv) > 2 else 'chunks'
ph = lambda s: sorted(re.findall(r'\{\w+\}', s))
for lang in ('fr', 'de', 'it'):
    out = {}
    p = ROOT / f'{lang}.json'
    if p.exists(): out = json.load(open(p))
    for f in sorted(glob.glob(str(ROOT / CHUNKS / f'{lang}-*.json'))):
        start = int(re.search(r'-(\d+)\.json$', f).group(1)); arr = json.load(open(f))
        for i, tr in enumerate(arr):
            en = EN[start + i]
            if ph(en) != ph(tr): print('PLACEHOLDER', lang, start + i, repr(en), '→', repr(tr))
            out[en] = tr
    json.dump(out, open(p, 'w'), ensure_ascii=False, indent=0, sort_keys=True)
    print(lang, len(out))
