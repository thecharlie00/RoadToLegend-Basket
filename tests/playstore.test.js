'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
global.localStorage = undefined;
const PS = require('../src/platform/playstore.js');

test('web: no Android app, no ads, no update, no rating prompt', () => {
  assert.equal(PS.showAd({}, 'menu'), false);
  assert.equal(PS.updateAvailable({}), 0);
  assert.equal(PS.rateDue({}), false);
});

test('ads only at safe placements; never during a match', () => {
  const calls = [];
  const win = { CAAAndroid: { showAd: w => calls.push(w), updateAvailable: () => 91, isFullScreenAdShowing: () => false } };
  for (const w of ['menu', 'career_start', 'match_start', 'season_end', 'retire']) assert.equal(PS.showAd(win, w), true, w);
  for (const w of ['live', 'jm', 'decision', '']) assert.equal(PS.showAd(win, w), false, w);
  assert.deepEqual(calls, ['menu', 'career_start', 'match_start', 'season_end', 'retire']);
  assert.equal(PS.updateAvailable(win), 91);
});

test('rating: after 15 minutes of play, at most 3 times, 14 days apart, never again once rated', () => {
  PS._reset();
  const win = { CAAAndroid: { showAd() {}, isFullScreenAdShowing: () => false } };
  const now = Date.now();
  assert.equal(PS.rateDue(win, now), false);
  for (let i = 0; i < 60; i++) PS.countPlay(15000);
  assert.equal(PS.rateDue(win, now), true);
  PS.ratePrompted(now);
  assert.equal(PS.rateDue(win, now + 1000), false);
  assert.equal(PS.rateDue(win, now + 15 * 24 * 3600 * 1000), true);
  PS.rateDone();
  assert.equal(PS.rateDue(win, now + 60 * 24 * 3600 * 1000), false);
});
