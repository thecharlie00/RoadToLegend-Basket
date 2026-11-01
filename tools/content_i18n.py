"""Añade fr/de/it a todo el contenido narrativo bilingüe (data/content/*.json) a partir de tools/i18n/{fr,de,it}.json
(frase inglesa -> traducción) y genera src/domain/content-i18n.js con los textos que viven en el código
(red social, momentos históricos, tienda). Se ejecuta al final de content_v2.py; también suelto."""
import json, pathlib, glob
ROOT = pathlib.Path(__file__).resolve().parent.parent
LANGS = ('fr', 'de', 'it')
D = {l: json.load(open(ROOT / f'tools/i18n/{l}.json')) for l in LANGS}
missing = set()
def walk(o):
    if isinstance(o, dict):
        if isinstance(o.get('en'), str) and isinstance(o.get('es'), str):
            for l in LANGS:
                tr = D[l].get(o['en'])
                if tr: o[l] = tr
                elif o['en'].strip(): missing.add(o['en'])
        for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
for f in sorted(glob.glob(str(ROOT / 'data/content/*.json'))):
    data = json.load(open(f)); walk(data)
    json.dump(data, open(f, 'w'), ensure_ascii=False, indent=2); open(f, 'a').write('\n')
extra = json.load(open(ROOT / 'tools/i18n/extra_strings.json'))
table = {l: {e: D[l][e] for e in extra if e in D[l]} for l in LANGS}
js = """(function (root) {
  'use strict';
  // Generado por tools/content_i18n.py: fr/de/it de los textos narrativos definidos en código.
  const CAA = root.CAA = root.CAA || {};
  const T = %s;
  function tr(lang, en) { return T[lang] && en != null ? T[lang][en] || null : null; }
  CAA.ContentI18n = { LANGS: %s, tr };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.ContentI18n;
})(typeof globalThis !== 'undefined' ? globalThis : this);
""" % (json.dumps(table, ensure_ascii=False, separators=(',', ':')), json.dumps(list(LANGS)))
(ROOT / 'src/domain/content-i18n.js').write_text(js)
print('content i18n: missing', len(missing))
for m in sorted(missing)[:20]: print('  -', m)
