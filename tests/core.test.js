'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Hash = require('../src/core/hash.js');
const RNG = require('../src/core/rng.js');
const Clock = require('../src/core/clock.js');
const Save = require('../src/core/save.js');
const I18N = require('../src/core/i18n.js');
const A11Y = require('../src/core/a11y.js');

test('hash is stable across key order', () => {
  assert.equal(Hash.hashObject({ b: 2, a: 1 }), Hash.hashObject({ a: 1, b: 2 }));
  assert.notEqual(Hash.hashObject({ a: 1 }), Hash.hashObject({ a: 2 }));
});

test('RNG is deterministic and restorable', () => {
  const a = RNG.create('camino');
  const b = RNG.create('camino');
  const values = Array.from({ length: 20 }, () => a.nextUint32());
  assert.deepEqual(values, Array.from({ length: 20 }, () => b.nextUint32()));
  assert.deepEqual(a.fork('match').serialize().seed, b.fork('match').serialize().seed);
  const snap = a.serialize();
  const next = a.nextUint32();
  const c = RNG.create(0); c.restore(snap);
  assert.equal(c.nextUint32(), next);
});

test('fixed step advances only whole ticks', () => {
  const step = Clock.createFixedStep(100);
  let n = 0;
  assert.equal(step.advance(250, () => n++), 2);
  assert.equal(n, 2);
  assert.equal(step.advance(50, () => n++), 1);
  assert.equal(step.snapshot().ticks, 3);
});

test('match clock stops at zero and advances period', () => {
  const clock = Clock.createMatchClock({ periodMinutes: 1, periods: 4, shotSeconds: 24 });
  clock.start();
  for (let i = 0; i < 600; i++) clock.tick();
  assert.equal(clock.snapshot().game, 0);
  assert.equal(clock.snapshot().running, false);
  assert.equal(clock.nextPeriod(), true);
  assert.equal(clock.snapshot().period, 2);
});

test('save envelope validates checksum and rejects corruption', () => {
  const env = Save.createEnvelope('career-1', { x: 1 }, { updatedAt: '2026-10-31T00:00:00.000Z', seed: 7 });
  assert.equal(Save.validateEnvelope(env).ok, true);
  const bad = JSON.parse(JSON.stringify(env)); bad.payload.x = 2;
  assert.equal(Save.validateEnvelope(bad).ok, false);
  assert.throws(() => Save.parseEnvelope('{bad'), /corrupt JSON/);
});

test('save migrates schema 0 to 1', () => {
  const old = { game: Save.GAME, schemaVersion: 0, careerId: 'c', updatedAt: 'now', payload: {} };
  const migrated = Save.migrateEnvelope(old);
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(Save.validateEnvelope(migrated).ok, true);
});

test('i18n falls back and interpolates', () => {
  I18N.init({ locale: 'en', dicts: { es: { hello: 'Hola {name}' }, en: { hello: 'Hello {name}', only: 'Only' } } });
  assert.equal(I18N.t('hello', { name: 'Aro' }), 'Hello Aro');
  I18N.setLocale('es');
  assert.equal(I18N.t('only'), 'Only');
  assert.equal(I18N.t('missing'), 'missing');
  assert.deepEqual(I18N.missingKeys(), ['missing']);
});

test('a11y normalizes settings', () => {
  const s = A11Y.normalize({ fontSize: 9, colorMode: 'x', reducedMotion: 'reduced', vibration: false });
  assert.equal(s.fontSize, 0);
  assert.equal(s.colorMode, 'standard');
  assert.equal(s.reducedMotion, 'reduced');
  assert.equal(s.vibration, false);
});
