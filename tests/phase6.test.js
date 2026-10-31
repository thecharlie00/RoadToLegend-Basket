'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Voxel = require('../src/render/voxel.js');
const Match = require('../src/match/engine.js');
const Rules = require('../src/match/rules.js');
const Career = require('../src/domain/career.js');
const Save = require('../src/core/save.js');
const Handler = require('../src/worker/handler.js');
const ROOT = path.join(__dirname, '..');
const TITLE = 'Baketball: Road to legend';

test('visible rename is exact and save/package identities remain compatible', () => {
  const es = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/es.json')));
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en.json')));
  assert.equal(es['app.title'], TITLE); assert.equal(en['app.title'], TITLE);
  assert.deepEqual(Object.keys(es), Object.keys(en));
  assert.equal(Save.GAME, 'camino-al-aro');
  assert.equal(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/manifest.json'))).game, Save.GAME);
  const gradle = fs.readFileSync(path.join(ROOT, 'android/app/build.gradle'), 'utf8');
  assert.ok(gradle.includes("applicationId 'com.caminoalaro.app'"));
  assert.ok(fs.readFileSync(path.join(ROOT, 'android/app/src/main/res/values/strings.xml'), 'utf8').includes(TITLE));
  const old = Save.createEnvelope('slot-1', { career: Career.serialize(Career.createCareer({ seed: 'rename-compat' })) });
  assert.equal(Save.validateEnvelope(Save.parseEnvelope(JSON.stringify(old)), { careerValidator: Career.validate }).ok, true);
});

test('key plays are deterministic, bounded, chronological and do not mutate the log', () => {
  const m = Match.simulateMatch({ seed: 'key-selection', ruleSetId: 'FIBA-2026' });
  const before = JSON.stringify(m.events), hash = m.hash;
  const a = Voxel.keyPlays(m, 12), b = Voxel.keyPlays(m, 12);
  assert.deepEqual(a, b); assert.ok(a.length <= 12); assert.ok(a.length > 0);
  assert.ok(a.every((k, i) => i === 0 || k.index > a[i - 1].index));
  assert.equal(a[a.length - 1].type, 'final');
  assert.equal(JSON.stringify(m.events), before); assert.equal(m.hash, hash);
  assert.deepEqual(Voxel.keyPlays({ events: [] }), []);
  assert.equal(Voxel.keyPlays(m, 999).length <= 40, true);
});

test('voxel frames are finite, bounded, reduced-motion aware and outcome-neutral', () => {
  const m = Match.replay(Match.simulateMatch({ seed: 'voxel-frame' })).state;
  const keys = Voxel.keyPlays(m);
  for (const index of [0, keys[0].index, m.events.length - 1]) for (const t of [0, 0.5, 1]) {
    const f = Voxel.frameAt(m, index, t);
    assert.equal(f.players.length, 10);
    for (const p of f.players) for (const k of ['x', 'y', 'z', 'yaw']) assert.ok(Number.isFinite(p[k]));
    for (const k of ['x', 'y', 'z']) assert.ok(Number.isFinite(f.ball[k]));
    assert.equal(f.sourceHash, m.hash);
  }
  assert.deepEqual(Voxel.frameAt(m, 4, 0.2, { reducedMotion: true }), Voxel.frameAt(m, 4, 1, { reducedMotion: true }));
  const g = Voxel.geometry(m, keys[0].index, 0.5, { quality: 'balanced' });
  assert.ok(g.cubes.length <= Voxel.MAX_CUBES); assert.equal(Voxel.vertexData(g).length, g.cubes.length * 36 * 9);
  assert.ok(Voxel.vertexData(g).every(Number.isFinite));
});

test('court geometry follows rule dimensions and stays within quality budgets', () => {
  for (const id of Rules.listProfiles()) {
    const p = Rules.getProfile(id), low = Voxel.courtGeometry(id, 'low'), balanced = Voxel.courtGeometry(id, 'balanced');
    assert.equal(low.dimensions.length, p.court.length); assert.equal(low.dimensions.width, p.court.width); assert.equal(low.dimensions.hoopHeight, 3.05);
    assert.ok(low.cubes.length < balanced.cubes.length); assert.ok(balanced.cubes.length < 250);
  }
});

test('career week stores the actual club replay and survives save/resume without rerolling', () => {
  const c = Career.createCareer({ seed: 'career-replay', mode: 'player' });
  Career.advanceWeek(c, { type: 'play' });
  const replay = c.lastMatch;
  assert.ok(replay); assert.equal(replay.validation.ok, true); assert.equal(replay.context.week, 1); assert.equal(replay.context.clubId, c.clubId);
  assert.ok(replay.state.teams.some(t => t.id === c.clubId));
  assert.equal(replay.state.hash, c.season.results.find(r => r.id === replay.state.matchId).hash);
  const env = Save.createEnvelope('slot-1', { career: Career.serialize(c) });
  const resumed = Career.resume(Save.parseEnvelope(JSON.stringify(env), { careerValidator: Career.validate }).payload.career);
  assert.deepEqual(resumed.lastMatch, replay);
  const before = JSON.stringify(resumed.lastMatch);
  Voxel.keyPlays(resumed.lastMatch.state); Voxel.geometry(resumed.lastMatch.state, 1, 0.5);
  assert.equal(JSON.stringify(resumed.lastMatch), before);
  const next = Career.advanceWeek(resumed, { type: 'rest' });
  assert.notEqual(next.lastMatch.state.hash, replay.state.hash);
});

test('career replay RPC returns the same recorded hash as the domain', () => {
  const created = Handler.handle({ type: 'career.create', payload: { seed: 'rpc-replay', mode: 'coach' } });
  const advanced = Handler.handle({ type: 'career.advance', payload: { state: created.result, action: { type: 'play' } } });
  assert.equal(advanced.ok, true);
  const r = advanced.result.state.lastMatch;
  assert.ok(r); assert.equal(r.validation.ok, true); assert.equal(r.state.hash, advanced.result.state.season.results.find(x => x.id === r.state.matchId).hash);
  assert.ok(Voxel.keyPlays(r.state).length > 0);
});

test('score at a frame matches the recorded scoring prefix', () => {
  const m = Match.simulateMatch({ seed: 'score-prefix' });
  for (const i of [0, 20, 100, m.events.length - 1]) {
    const score = [0, 0];
    for (const e of m.events.slice(0, i + 1)) if (e.made && (e.team === 0 || e.team === 1)) score[e.team] += e.type === 'shot' ? e.points : e.type === 'ft' ? 1 : 0;
    assert.deepEqual(Voxel.scoreAt(m, i), score);
  }
  assert.deepEqual(Voxel.scoreAt(m, m.events.length - 1), m.score);
});
