'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');
const Save = require('../src/core/save.js');
const Handler = require('../src/worker/handler.js');

test('career creation and weekly advance are deterministic', () => {
  const a = Career.createCareer({ seed: 'career-det', mode: 'player', route: 'eu-academy' });
  const b = Career.createCareer({ seed: 'career-det', mode: 'player', route: 'eu-academy' });
  for (let i = 0; i < 6; i++) {
    Career.advanceWeek(a, { type: i % 2 ? 'train' : 'play', focus: 'tiroTriple' });
    Career.advanceWeek(b, { type: i % 2 ? 'train' : 'play', focus: 'tiroTriple' });
  }
  assert.equal(a.hash, b.hash);
  assert.deepEqual(Career.summary(a), Career.summary(b));
});

test('career serialize/resume through save envelope does not diverge', () => {
  const a = Career.createCareer({ seed: 'career-save', mode: 'player', route: 'eu-academy' });
  for (let i = 0; i < 5; i++) Career.advanceWeek(a, { type: 'play' });
  const env = Save.createEnvelope('slot-1', { career: Career.serialize(a) }, { seed: 'career-save', rngCounters: a.rng });
  const parsed = Save.parseEnvelope(JSON.stringify(env));
  const resumed = Career.resume(parsed.payload.career);
  const full = Career.resume(Career.serialize(a));
  for (let i = 0; i < 5; i++) {
    Career.advanceWeek(resumed, { type: 'play' });
    Career.advanceWeek(full, { type: 'play' });
  }
  assert.equal(resumed.hash, full.hash);
});

test('NA draft and undrafted routes create consequences', () => {
  const drafted = Career.createCareer({ seed: 'na-draft-test', mode: 'player', route: 'na-draft', quality: 75 });
  assert.ok(drafted.draft);
  assert.ok(drafted.inbox.some(i => i.type === 'drafted' || i.type === 'undrafted'));
  const undrafted = Career.createCareer({ seed: 'na-undrafted-test', mode: 'player', route: 'na-undrafted' });
  assert.equal(undrafted.player.contract.guaranteed, false);
  assert.ok(undrafted.inbox.some(i => i.type === 'undrafted'));
});

test('coach career can advance and save', () => {
  const c = Career.createCareer({ seed: 'coach-test', mode: 'coach', route: 'eu-academy', name: 'Míster' });
  Career.advanceWeek(c, { type: 'play' });
  const s = Career.summary(c);
  assert.equal(s.mode, 'coach');
  assert.equal(s.coach.name, 'Míster');
  assert.ok(s.week >= 1);
});

test('crossing offer includes buyout and draft-and-stash possibility', () => {
  const c = Career.createCareer({ seed: 'crossing', mode: 'player', route: 'eu-academy' });
  const crossing = Career.exploreCrossing(c, 'na-boreal-men');
  assert.equal(crossing.targetLeague, 'na-boreal-men');
  assert.ok(crossing.buyout >= 0);
  assert.ok(crossing.contract.salary > 0);
  assert.ok(c.market.length >= 1);
});

test('long career save survives two seasons and resume', () => {
  const c = Career.createCareer({ seed: 'long-career', mode: 'player', route: 'eu-academy' });
  for (let i = 0; i < 70; i++) Career.advanceWeek(c, { type: i % 5 === 0 ? 'rest' : 'play' });
  assert.ok(c.year >= 2028);
  const env = Save.createEnvelope('slot-2', { career: Career.serialize(c) }, { seed: 'long-career', rngCounters: c.rng });
  const resumed = Career.resume(Save.parseEnvelope(JSON.stringify(env)).payload.career);
  const before = c.hash;
  Career.advanceWeek(c, { type: 'play' });
  Career.advanceWeek(resumed, { type: 'play' });
  assert.equal(resumed.hash, c.hash);
  assert.notEqual(before, c.hash);
});

test('worker RPC creates and advances career', () => {
  const created = Handler.handle({ id: 1, type: 'career.create', payload: { seed: 'rpc-career', mode: 'player', route: 'eu-academy' } });
  assert.equal(created.ok, true);
  const advanced = Handler.handle({ id: 2, type: 'career.advance', payload: { state: created.result, action: { type: 'play' } } });
  assert.equal(advanced.ok, true);
  assert.equal(advanced.result.summary.week, 1);
  assert.ok(advanced.result.summary.hash);
});
