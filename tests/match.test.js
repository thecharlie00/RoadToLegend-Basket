'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Match = require('../src/match/engine.js');
const Rules = require('../src/match/rules.js');
const Handler = require('../src/worker/handler.js');

function play(seed, ruleSetId) {
  return Match.simulateMatch({ seed, ruleSetId: ruleSetId || 'FIBA-2026', matchId: 'test' });
}

test('same seed and rules produce identical hash and box', () => {
  const a = play('determinism');
  const b = play('determinism');
  assert.equal(a.hash, b.hash);
  assert.deepEqual(Match.boxScore(a), Match.boxScore(b));
  const c = play('determinism-other');
  assert.notEqual(a.hash, c.hash);
});

test('serialize/resume mid-match does not duplicate or diverge', () => {
  const full = play('resume');
  const state = Match.createMatch({ seed: 'resume', ruleSetId: 'FIBA-2026', matchId: 'test' });
  for (let i = 0; i < 40; i++) Match.simulatePossession(state);
  const snapshot = Match.serializeMatch(state);
  assert.equal(snapshot._rng, undefined);
  const resumed = Match.resumeMatch(snapshot);
  while (!resumed.final) Match.simulatePossession(resumed);
  assert.equal(resumed.hash, full.hash);
  assert.deepEqual(Match.boxScore(resumed), Match.boxScore(full));
});

test('box-score invariants hold across rule profiles', () => {
  for (const id of Rules.listProfiles()) {
    const state = play('box-' + id, id);
    const validation = Match.validateBox(state);
    assert.equal(validation.ok, true, id + ': ' + validation.errors.join('; '));
    assert.equal(state.final, true);
    assert.notEqual(state.score[0], state.score[1]);
    for (const t of state.teams) {
      assert.ok(t.stats.fga > 0);
      assert.ok(t.stats.possessions > 0);
      assert.equal(t.stats.fga, t.stats['2pa'] + t.stats['3pa']);
      assert.equal(t.stats.pts, t.stats['2pm'] * 2 + t.stats['3pm'] * 3 + t.stats.ftm);
    }
  }
});

test('overtime resolves ties and increments overtimeCount', () => {
  const state = Match.createMatch({ seed: 'ot', ruleSetId: 'FIBA-2026' });
  state.period = 4;
  state.gameClock = 1;
  state.shotClock = 100;
  state.score = [80, 80];
  Match.simulatePossession(state);
  assert.equal(state.period, 5);
  assert.equal(state.overtimeCount, 1);
  assert.equal(state.final, false);
  while (!state.final) Match.simulatePossession(state);
  assert.notEqual(state.score[0], state.score[1]);
  assert.ok(state.overtimeCount >= 1);
});

test('possession guard terminates instead of looping forever', () => {
  assert.throws(() => Match.simulateMatch({ seed: 'guard', maxPossessions: 1 }), /possession guard/);
});

test('worker RPC simulates match and lists rules', () => {
  const list = Handler.handle({ id: 1, type: 'rules.list' });
  assert.equal(list.ok, true);
  assert.ok(list.result.profiles.includes('FIBA-2026'));
  const sim = Handler.handle({ id: 2, type: 'match.simulate', payload: { seed: 'worker', ruleSetId: 'NA-2026-27' } });
  assert.equal(sim.ok, true);
  assert.equal(sim.result.validation.ok, true);
  assert.equal(sim.result.state.final, true);
  const box = Handler.handle({ id: 3, type: 'match.box', payload: { state: sim.result.state } });
  assert.equal(box.ok, true);
  assert.equal(box.result.length, 2);
});
