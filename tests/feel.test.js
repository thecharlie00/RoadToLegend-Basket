'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Haptic = require('../src/platform/haptics.js');
const Crest = require('../src/render/crest.js');

test('haptics fire only when enabled and supported', () => {
  const calls = [];
  const win = { navigator: { vibrate: pattern => { calls.push(pattern); return true; } } };
  assert.equal(Haptic.pulse(win, 'tap'), true);
  assert.deepEqual(calls[0], [8]);
  assert.equal(Haptic.pulse(win, 'tap', false), false);
  assert.equal(calls.length, 1);
  assert.equal(Haptic.pulse({ navigator: {} }, 'tap'), false);
  assert.equal(Haptic.pulse({}, 'tap'), false);
});

test('haptics never throw and fall back to tap', () => {
  const win = { navigator: { vibrate: () => { throw new Error('denied'); } } };
  assert.equal(Haptic.pulse(win, 'success'), false);
  const calls = [];
  Haptic.pulse({ navigator: { vibrate: p => { calls.push(p); return true; } } }, 'unknown');
  assert.deepEqual(calls[0], Haptic.PATTERNS.tap.slice());
});

test('haptic patterns stay discrete and immutable', () => {
  for (const pattern of Object.values(Haptic.PATTERNS)) {
    assert.ok(pattern.length >= 1 && pattern.length <= 4);
    for (const ms of pattern) assert.ok(ms > 0 && ms <= 80);
  }
  const received = [];
  Haptic.pulse({ navigator: { vibrate: p => { received.push(p); return true; } } }, 'buzzer');
  received[0].push(9999);
  assert.deepEqual(Haptic.PATTERNS.buzzer, [60]);
});

test('crest colours follow custom, known and deterministic fallbacks', () => {
  assert.deepEqual(Crest.colors({ name: 'Real Madrid' }), ['#ffffff', '#5b2a86']);
  assert.deepEqual(Crest.colors({ name: 'Club Inventado', custom: { primary: '#112233', secondary: '#445566' } }), ['#112233', '#445566']);
  assert.deepEqual(Crest.colors({ name: 'Club Inventado' }), Crest.colors({ name: 'Club Inventado' }));
  for (const colour of Crest.colors({ name: 'Otro Club' })) assert.match(colour, /^#[0-9a-f]{6}$/i);
});

test('shot points come from the zone, so missed threes still count as three-point attempts', () => {
  const Live = require('../src/match/live.js');
  assert.equal(Live.shotPoints({ type: 'shot', zone: 'corner3', made: false, points: 0 }), 3);
  assert.equal(Live.shotPoints({ type: 'shot', zone: 'above3', made: true, points: 3 }), 3);
  assert.equal(Live.shotPoints({ type: 'shot', zone: 'paint', made: false, points: 0 }), 2);
  assert.equal(Live.shotPoints({ type: 'shot', zone: 'restricted', made: true, points: 2 }), 2);
  assert.equal(Live.shotPoints({ type: 'ft', points: 1 }), 0);
  assert.equal(Live.shotPoints(null), 0);
  const Engine = require('../src/match/engine.js');
  const match = Engine.simulateMatch({ seed: 'three-point-audit', ruleSetId: 'FIBA-2026', matchId: 'audit' });
  const shots = match.events.filter(e => e.type === 'shot');
  const attempts = shots.filter(e => Live.shotPoints(e) === 3);
  const makes = attempts.filter(e => e.made);
  assert.ok(attempts.length > 10, 'the sample should include three-point attempts');
  assert.ok(makes.length < attempts.length, 'three-point attempts must include misses');
  assert.ok(makes.length / attempts.length < 0.75, 'three-point percentage must be plausible');
});
