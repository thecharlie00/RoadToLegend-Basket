'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const World = require('../src/data/world.js');
const Handler = require('../src/worker/handler.js');

const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/world/seed.json'), 'utf8'));

test('seed world pack validates', () => {
  const result = World.validatePack(seed);
  assert.equal(result.ok, true, result.errors.join('; '));
});

test('coverage counts full-ecosystem categories', () => {
  const cov = World.coverage(seed);
  assert.equal(cov.total, seed.competitions.length);
  assert.ok(cov.byCategory.pro > 0);
  assert.ok(cov.byCategory.university > 0);
  assert.ok(cov.byGender.women > 0);
});

test('duplicate ids are rejected', () => {
  const bad = JSON.parse(JSON.stringify(seed));
  bad.competitions.push(bad.competitions[0]);
  const result = World.validatePack(bad);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(e => e.includes('duplicate')));
});

test('merge packs is stable and sorted', () => {
  const merged = World.mergePacks([seed, seed]);
  assert.equal(merged.length, seed.competitions.length);
  assert.deepEqual(merged.map(c => c.id), merged.map(c => c.id).sort());
});

test('worker handler validates world and rng', async () => {
  assert.equal(Handler.handle({ id: 1, type: 'world.validate', payload: seed }).ok, true);
  const rng = Handler.handle({ id: 2, type: 'rng', payload: { seed: 'x', n: 3 } });
  assert.equal(rng.result.values.length, 3);
  const unknown = Handler.handle({ id: 3, type: 'nope' });
  assert.equal(unknown.ok, false);
});
