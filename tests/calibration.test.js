'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Calibration = require('../src/match/calibration.js');

test('calibration batch is deterministic and reports NBA deltas', () => {
  const a = Calibration.runBatch({ games: 40, seed: 'cal-test', ruleSetId: 'NA-2026-27' });
  const b = Calibration.runBatch({ games: 40, seed: 'cal-test', ruleSetId: 'NA-2026-27' });
  assert.deepEqual(a, b);
  assert.equal(a.teamGames, 80);
  assert.ok(a.summary.pts.mean > 0);
  assert.ok(a.deltas.pts != null);
  assert.ok(a.derived.fgPct > 0 && a.derived.fgPct < 1);
});

test('calibration supports FIBA without NBA target deltas', () => {
  const r = Calibration.runBatch({ games: 10, seed: 'cal-fiba', ruleSetId: 'FIBA-2026' });
  assert.equal(r.target, null);
  assert.deepEqual(r.deltas, {});
  assert.ok(r.summary.pts.mean > 0);
});
