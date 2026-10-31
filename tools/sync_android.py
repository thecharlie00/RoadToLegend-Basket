#!/usr/bin/env python3
"""Copy the verified single-file game into Android assets. Does not invoke Gradle."""
from pathlib import Path
import hashlib
import shutil
ROOT = Path(__file__).resolve().parent.parent
source = ROOT / 'dist/index.html'
target = ROOT / 'android/app/src/main/assets/game/index.html'
if not source.exists():
    raise SystemExit('Run npm run build first.')
target.parent.mkdir(parents=True, exist_ok=True)
shutil.copyfile(source, target)
assert hashlib.sha256(source.read_bytes()).digest() == hashlib.sha256(target.read_bytes()).digest()
print(f'Synced {target.relative_to(ROOT)} ({target.stat().st_size} bytes); no Gradle/AAB task executed.')
