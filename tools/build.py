#!/usr/bin/env python3
"""Build a single offline HTML for web/Android WebView. No network assets."""
from __future__ import annotations
import base64, hashlib, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "src/manifest.json"


def read_json(path: pathlib.Path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def esc_script(text: str) -> str:
    return text.replace("</script", "<\\/script")


def font_licenses() -> str:
    parts = []
    for path in sorted((ROOT / "src/assets/fonts").glob("OFL-*.txt")):
        parts.append(path.name + "\n" + path.read_text(encoding="utf-8"))
    if not parts:
        raise FileNotFoundError("OFL font licenses missing")
    text = "\n\n".join(parts).replace("-->", "-- >")
    return "<!-- Embedded font licenses (OFL-1.1)\n" + text + "\n-->\n"


def font_faces() -> str:
    """Embed offline OFL fonts as data URIs; no network font requests."""
    specs = [
        ("Atkinson Hyperlegible Next", "atkinson-hyperlegible-next-latin-400-normal.woff2", 400, None),
        ("Atkinson Hyperlegible Next", "atkinson-hyperlegible-next-latin-700-normal.woff2", 700, None),
        # Identidad propia del baloncesto (distinta del pixelado del fútbol): Bebas Neue para títulos, Barlow Condensed para UI y cifras.
        ("Bebas Neue", "bebas-neue-latin-400-normal.woff2", 400, "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"),
        ("Bebas Neue", "bebas-neue-latin-ext-400-normal.woff2", 400, "U+0100-02AF,U+0304,U+0308,U+0329,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"),
        ("Barlow Condensed", "barlow-condensed-latin-600-normal.woff2", 600, None),
        ("Barlow Condensed", "barlow-condensed-latin-700-normal.woff2", 700, None),
    ]
    faces = []
    for family, filename, weight, urange in specs:
        path = ROOT / "src/assets/fonts" / filename
        if not path.exists():
            raise FileNotFoundError(path)
        b64 = base64.b64encode(path.read_bytes()).decode("ascii")
        faces.append(
            f"@font-face{{font-family:'{family}';font-style:normal;font-weight:{weight};"
            + (f"unicode-range:{urange};" if urange else "")
            + f"font-display:swap;src:url(data:font/woff2;base64,{b64}) format('woff2')}}"
        )
    return "\n".join(faces) + "\n"


def main() -> int:
    manifest = read_json(MANIFEST)
    modules = manifest["modules"]
    seen = set()
    main_js = []
    worker_js = []
    for mod in modules:
        mid = mod["id"]
        if mid in seen:
            raise ValueError(f"duplicate module id: {mid}")
        seen.add(mid)
        path = ROOT / mod["path"]
        if not path.exists():
            raise FileNotFoundError(path)
        code = path.read_text(encoding="utf-8")
        block = f"\n/* module: {mid} */\n{code}\n"
        main_js.append(block)
        if mod.get("worker"):
            worker_js.append(block)
    css = font_faces() + (ROOT / manifest["css"]).read_text(encoding="utf-8")
    data = {}
    for rel in manifest.get("data", []):
        data[pathlib.Path(rel).stem] = read_json(ROOT / rel)
    worker_bootstrap = (ROOT / manifest["workerBootstrap"]).read_text(encoding="utf-8")
    worker_data = {k: v for k, v in data.items() if k in {"inspired-names", "events", "achievements", "shop", "press", "guide"}}
    worker_prefix = "globalThis.CAA_DATA = " + json.dumps(worker_data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    worker_code = worker_prefix + "".join(worker_js) + "\n" + worker_bootstrap
    locales = {}
    for loc in manifest.get("locales", []):
        locales[loc] = read_json(ROOT / f"src/locales/{loc}.json")
    payload = {
        "manifest": {k: manifest[k] for k in ("game", "version", "schemaVersion")},
        "data": data,
        "locales": locales,
    }
    payload_json = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    worker_json = json.dumps(worker_code, ensure_ascii=False)
    html = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b1417">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; worker-src blob:; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">
<title>Baketball: Road to legend</title>
{font_licenses()}<style>{css}</style>
</head>
<body>
<div id="app"></div>
<noscript>Baketball: Road to legend necesita JavaScript / requires JavaScript.</noscript>
<script id="caa-payload" type="application/json">{esc_script(payload_json)}</script>
<script id="caa-worker-code" type="application/json">{esc_script(worker_json)}</script>
<script>{esc_script(''.join(main_js))}</script>
</body>
</html>
"""
    out = ROOT / manifest["out"]
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")
    digest = hashlib.sha256(html.encode("utf-8")).hexdigest()[:12]
    print(f"built {out.relative_to(ROOT)} bytes={len(html.encode('utf-8'))} sha256={digest}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
