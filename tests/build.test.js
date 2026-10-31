'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.join(__dirname, '..');

test('census importer validates seed', () => {
  const out = execFileSync('python3', ['tools/census_import.py', '--check', 'data/world/seed.json'], { cwd: ROOT, encoding: 'utf8' });
  assert.match(out, /OK data\/world\/seed.json/);
});

test('builder produces single offline HTML', () => {
  execFileSync('python3', ['tools/build.py'], { cwd: ROOT, encoding: 'utf8' });
  const html = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  assert.match(html, /<title>Baketball: Road to legend<\/title>/);
  assert.match(html, /module: voxel/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /caa-payload/);
  assert.match(html, /caa-worker-code/);
  assert.match(html, /module: app/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.doesNotMatch(html, /<link[^>]+href="http/);
  assert.match(html, /data:font\/woff2;base64,/);
  assert.match(html, /Atkinson Hyperlegible Next/);
  assert.match(html, /Pixelify Sans/);
  assert.match(html, /Embedded font licenses \(OFL-1\.1\)/);
  assert.match(html, /SIL OPEN FONT LICENSE/);
});
