#!/usr/bin/env python3
"""Validate/merge world census packs. Dependency-free mirror of src/data/world.js."""
from __future__ import annotations
import argparse, json, pathlib, sys

ENUMS = {
    "confederation": {"fiba-africa", "fiba-americas", "fiba-asia", "fiba-europe", "fiba-oceania", "continental", "national"},
    "kind": {"league", "cup", "playoff", "tournament", "national-team"},
    "level": {"international", "continental", "national", "regional", "local"},
    "gender": {"men", "women", "mixed"},
    "ageGroup": {"senior", "university", "u23", "u21", "u20", "u19", "u18", "u17", "u16", "u15", "youth"},
    "category": {"pro", "semipro", "amateur", "regional", "youth", "academy", "university", "college"},
    "sourceStatus": {"verified", "pending", "fictionalized"},
}
REQUIRED = ["id", "displayName", "referenceName", "country", "confederation", "kind", "level", "gender", "ageGroup", "category", "season", "ruleSet", "sourceStatus", "sourceUrl"]


def validate(pack: dict) -> list[str]:
    errors = []
    if pack.get("schemaVersion") != 1:
        errors.append("schemaVersion must be 1")
    for k in ("packId", "version", "validFrom"):
        if not isinstance(pack.get(k), str) or not pack.get(k):
            errors.append(f"{k} required")
    cov = pack.get("coverage") or {}
    if cov.get("target") != "full_ecosystem":
        errors.append("coverage.target must be full_ecosystem")
    if cov.get("status") not in {"seed", "partial", "complete"}:
        errors.append("coverage.status invalid")
    comps = pack.get("competitions")
    if not isinstance(comps, list):
        errors.append("competitions must be array")
        return errors
    ids = set()
    for i, c in enumerate(comps):
        at = f"competitions[{i}]"
        if not isinstance(c, dict):
            errors.append(f"{at} must be object")
            continue
        for k in REQUIRED:
            if c.get(k) in (None, ""):
                errors.append(f"{at}.{k} required")
        cid = c.get("id")
        if isinstance(cid, str):
            import re
            if not re.fullmatch(r"[a-z0-9-]+", cid):
                errors.append(f"{at}.id invalid")
            if cid in ids:
                errors.append(f"{at}.id duplicate")
            ids.add(cid)
        for k, vals in ENUMS.items():
            if c.get(k) is not None and c.get(k) not in vals:
                errors.append(f"{at}.{k} invalid")
        teams = c.get("teams")
        if teams is not None and (not isinstance(teams, int) or teams < 2):
            errors.append(f"{at}.teams invalid")
        url = c.get("sourceUrl")
        if isinstance(url, str) and not url.startswith(("http://", "https://")):
            errors.append(f"{at}.sourceUrl must be http(s)")
    return errors


def coverage(pack: dict) -> dict:
    out = {"total": 0, "byStatus": {}, "byCategory": {}, "byGender": {}, "byConfederation": {}, "byCountry": {}}
    for c in pack.get("competitions", []):
        out["total"] += 1
        for field, key in (("sourceStatus", "byStatus"), ("category", "byCategory"), ("gender", "byGender"), ("confederation", "byConfederation"), ("country", "byCountry")):
            v = c.get(field)
            out[key][v] = out[key].get(v, 0) + 1
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("packs", nargs="+")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--merge", metavar="OUT")
    args = ap.parse_args()
    packs = []
    failed = False
    for name in args.packs:
        path = pathlib.Path(name)
        pack = json.loads(path.read_text(encoding="utf-8"))
        errors = validate(pack)
        if errors:
            failed = True
            print(f"FAIL {path}: " + "; ".join(errors))
        else:
            print(f"OK {path}: {coverage(pack)['total']} competitions")
            packs.append(pack)
    if args.merge and not failed:
        merged = {}
        for pack in packs:
            for c in pack["competitions"]:
                merged[c["id"]] = dict(c, packId=pack["packId"], packVersion=pack["version"])
        out = {
            "schemaVersion": 1,
            "packId": "merged",
            "version": "0.1.0",
            "validFrom": min(p["validFrom"] for p in packs),
            "validTo": None,
            "coverage": {"target": "full_ecosystem", "status": "partial", "notes": "Merged census packs."},
            "competitions": sorted(merged.values(), key=lambda c: c["id"]),
        }
        pathlib.Path(args.merge).write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"merged {len(merged)} competitions -> {args.merge}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
