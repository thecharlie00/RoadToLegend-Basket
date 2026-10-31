#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const Calibration = require('../src/match/calibration.js');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const games = Math.max(1, Math.min(5000, parseInt(arg('games', '1000'), 10) || 1000));
const ruleSetId = arg('rules', 'NA-2026-27');
const seed = arg('seed', 'calibration-cli');
const out = arg('out', '');
const result = Calibration.runBatch({ games, ruleSetId, seed });
const keys = Object.keys(result.deltas || {});
const maxAbsDelta = keys.length ? Math.max(...keys.map(k => Math.abs(result.deltas[k]))) : null;
const report = Object.assign({ generatedAt: new Date().toISOString(), maxAbsDelta, withinThreePercent: maxAbsDelta == null ? null : maxAbsDelta <= 3 }, result);
if (out) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report, null, 2));
process.exitCode = maxAbsDelta != null && maxAbsDelta > 3 ? 1 : 0;
