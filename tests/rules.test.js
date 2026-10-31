'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Rules = require('../src/match/rules.js');

test('rule profiles expose verified clock/foul constants', () => {
  const fiba = Rules.getProfile('FIBA-2026');
  const na = Rules.getProfile('NA-2026-27');
  const ncaaM = Rules.getProfile('NCAA-M-2026-27');
  const ncaaW = Rules.getProfile('NCAA-W-2026-27');
  assert.equal(fiba.periods, 4); assert.equal(fiba.periodMinutes, 10);
  assert.equal(na.periods, 4); assert.equal(na.periodMinutes, 12);
  assert.equal(ncaaM.periods, 2); assert.equal(ncaaM.periodMinutes, 20);
  assert.equal(ncaaW.periods, 4); assert.equal(ncaaW.periodMinutes, 10);
  assert.equal(Rules.newPossessionClock(fiba), 240);
  assert.equal(Rules.offensiveReboundClock(fiba), 140);
  assert.equal(Rules.newPossessionClock(ncaaM), 300);
  assert.equal(Rules.offensiveReboundClock(ncaaM), 200);
  assert.equal(Rules.foulOut(fiba, 5), true);
  assert.equal(Rules.foulOut(na, 6), true);
  assert.equal(Rules.foulOut(ncaaM, 5), true);
  assert.equal(Rules.threePointDistance(fiba, false), 6.75);
  assert.equal(Rules.threePointDistance(na, false), 7.24);
});

test('FIBA and NCAA-W quarter bonus starts at fifth team foul', () => {
  for (const id of ['FIBA-2026', 'NCAA-W-2026-27']) {
    const p = Rules.getProfile(id);
    assert.equal(Rules.bonusState(p, 4, 1, 6000).freeThrows, 0);
    assert.equal(Rules.bonusState(p, 5, 1, 6000).freeThrows, 2);
  }
});

test('NBA bonus: fifth foul, last-two-minute allowance, OT fourth', () => {
  const p = Rules.getProfile('NA-2026-27');
  assert.equal(Rules.bonusState(p, 4, 1, 6000, 0).freeThrows, 0);
  assert.equal(Rules.bonusState(p, 5, 1, 6000, 0).freeThrows, 2);
  assert.equal(Rules.bonusState(p, 2, 4, 1100, 2).freeThrows, 2);
  assert.equal(Rules.bonusState(p, 2, 4, 1300, 2).freeThrows, 0);
  assert.equal(Rules.bonusState(p, 3, 5, 3000, 0).freeThrows, 0);
  assert.equal(Rules.bonusState(p, 4, 5, 3000, 0).freeThrows, 2);
});

test('NCAA-M half bonus: 1+1 at seven, two at ten, OT carries second half', () => {
  const p = Rules.getProfile('NCAA-M-2026-27');
  assert.equal(Rules.bonusState(p, 6, 1, 6000).freeThrows, 0);
  const one = Rules.bonusState(p, 7, 1, 6000);
  assert.equal(one.freeThrows, 1); assert.equal(one.oneAndOne, true);
  const two = Rules.bonusState(p, 10, 2, 6000);
  assert.equal(two.freeThrows, 2); assert.equal(two.oneAndOne, false);
  assert.equal(Rules.foulBucketKey(p, 3), 2);
  assert.equal(Rules.teamFoulBucket(p, 3, { 1: 3, 2: 8 }), 8);
});

test('FIBA OT carries fourth-quarter fouls; NBA OT does not', () => {
  const fiba = Rules.getProfile('FIBA-2026');
  const na = Rules.getProfile('NA-2026-27');
  assert.equal(Rules.foulBucketKey(fiba, 5), 4);
  assert.equal(Rules.teamFoulBucket(fiba, 5, { 4: 4, 5: 1 }), 4);
  assert.equal(Rules.foulBucketKey(na, 5), 5);
  assert.equal(Rules.teamFoulBucket(na, 5, { 4: 6, 5: 1 }), 1);
});

test('period labels and alternating possession flags', () => {
  assert.equal(Rules.periodLabel(Rules.getProfile('NCAA-M-2026-27'), 1), 'H1');
  assert.equal(Rules.periodLabel(Rules.getProfile('FIBA-2026'), 5), 'OT1');
  assert.equal(Rules.getProfile('FIBA-2026').alternatingPossession, true);
  assert.equal(Rules.getProfile('NA-2026-27').alternatingPossession, false);
  assert.throws(() => Rules.getProfile('NOPE'), /unknown ruleSet/);
});
