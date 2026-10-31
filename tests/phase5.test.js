'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Save = require('../src/core/save.js');
const Storage = require('../src/platform/storage.js');
const Career = require('../src/domain/career.js');
const Content = require('../src/domain/content.js');
const WorkerClient = require('../src/platform/worker-client.js');
const Handler = require('../src/worker/handler.js');
const A11Y = require('../src/core/a11y.js');
const Diagnostics = require('../src/platform/diagnostics.js');
const env = (slot, value = 1) => Save.createEnvelope(slot, { value }, { updatedAt: '2026-10-31T00:00:00.000Z' });

test('save rejects oversized, deeply nested, nonfinite and array payloads', () => {
  assert.throws(() => Save.parseEnvelope(' '.repeat(Save.MAX_IMPORT_CHARS + 1)), /size limit/);
  assert.throws(() => Save.createEnvelope('slot-1', []), /object/);
  assert.throws(() => env('slot-1', Infinity), /unsupported payload/);
  let deep = {}; for (let i = 0; i < 70; i++) deep = { deep };
  assert.throws(() => env('slot-1', deep), /unsupported payload/);
  assert.equal(Save.validSlot('../escape'), false);
  assert.equal(Save.validSlot('slot-10'), true);
});

test('save validates domain state and never re-signs a corrupt legacy checksum', () => {
  const c = Career.createCareer({ seed: 'signed-domain' });
  const signed = Save.createEnvelope('slot-1', { career: Career.serialize(c) });
  assert.equal(Save.validateEnvelope(signed, { careerValidator: Career.validate }).ok, true);
  const bad = JSON.parse(JSON.stringify(signed)); bad.payload.career.week = -1; bad.checksum = Save.checksum(bad);
  assert.equal(Save.validateEnvelope(bad, { careerValidator: Career.validate }).ok, false);
  const old = env('slot-1'); old.schemaVersion = 0; old.checksum = '00000000';
  assert.throws(() => Save.migrateEnvelope(old), /legacy checksum/);
  delete old.checksum; assert.equal(Save.parseEnvelope(JSON.stringify(old)).schemaVersion, 1);
});

test('localStorage serialized writes, interrupted staging, tombstones and fallback selection', async () => {
  const mem = Storage.createMemoryStorage();
  const a = Storage.createLocalStorageAdapter(mem);
  await Promise.all([a.save('slot-1', env('slot-1', 1)), a.save('slot-1', env('slot-1', 2)), a.save('slot-1', env('slot-1', 3))]);
  assert.equal((await a.load('slot-1')).payload.value, 3);
  assert.equal((await a.list())[0].slot, 'slot-1');
  mem.setItem('caa.slot.slot-2.staging', JSON.stringify(env('slot-2', 4)));
  assert.equal((await a.load('slot-2')).payload.value, 4);
  await a.remove('slot-2'); assert.equal(await a.load('slot-2'), null);
  await assert.rejects(() => a.save('../bad', env('slot-1')), /slot identifier/);
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const fallback = await Storage.createAutoAdapter({ indexedDB: null, localStorage: blocked });
  assert.equal(fallback.kind, 'memory'); assert.equal(fallback.persistent, false);
  await fallback.save('slot-1', env('slot-1')); assert.equal((await fallback.load('slot-1')).payload.value, 1);
  const ls = await Storage.createAutoAdapter({ indexedDB: null, localStorage: mem });
  assert.equal(ls.kind, 'localStorage'); assert.equal(ls.persistent, true);
});

test('practice commitment survives JSON and cannot import a replacement seed or skill', () => {
  const c = Career.createCareer({ seed: 'commit-save' });
  const pending = Career.beginPractice(c, { type: 'buzzer', seed: 'attacker', skill: 100 });
  assert.equal(pending.type, 'buzzer'); assert.equal(pending.seed, 'commit-save:practice:0:0');
  const resumed = Career.resume(JSON.parse(JSON.stringify(c)));
  assert.deepEqual(Career.beginPractice(resumed, { type: 'freeThrow' }), pending);
  const result = Career.resolvePractice(resumed, { auto: true, seed: 'attacker', skill: 100 });
  assert.equal(result.made, Career.resolvePractice(c, { auto: true }).made);
  assert.equal(resumed.hash, c.hash); assert.equal(resumed.life.counters.practice, 1);
  assert.throws(() => Career.resolvePractice(c, { auto: true }), /committed practice/);
  const tampered = Career.createCareer({ seed: 'tamper' }); Career.beginPractice(tampered); tampered.life.pendingPractice.seed = 'reroll';
  assert.equal(Career.validate(tampered).ok, false);
  Career.beginPractice(c); Career.cancelPractice(c); Career.beginPractice(c);
  assert.equal(c.life.pendingPractice.attempt, 2); assert.equal(c.life.counters.practice, 3);
});

test('committed practice RPCs reject wrong attempt and cancel consumes it', () => {
  let state = Handler.handle({ type: 'career.create', payload: { seed: 'rpc-commit' } }).result;
  const begin = Handler.handle({ type: 'career.practice.begin', payload: { state, config: { type: 'freeThrow' } } });
  assert.equal(begin.ok, true); state = begin.result.state;
  assert.equal(Handler.handle({ type: 'career.practice.resolve', payload: { state, config: { id: 'wrong', auto: true } } }).ok, false);
  const cancelled = Handler.handle({ type: 'career.practice.cancel', payload: { state } });
  assert.equal(cancelled.ok, true); assert.equal(cancelled.result.state.life.pendingPractice, null);
  assert.equal(cancelled.result.state.life.counters.practice, 1);
  const next = Handler.handle({ type: 'career.practice.begin', payload: { state: cancelled.result.state } });
  assert.equal(next.result.state.life.pendingPractice.attempt, 1);
});

test('resume restores player/roster identity and preserves future stat accumulation', () => {
  const original = Career.createCareer({ seed: 'identity-resume' });
  const resumed = Career.resume(Career.serialize(original));
  const club = resumed.season.clubsById[resumed.clubId];
  assert.equal(club.roster.find(p => p.id === resumed.player.id), resumed.player);
  for (let i = 0; i < 5; i++) { Career.advanceWeek(original, { type: 'play' }); Career.advanceWeek(resumed, { type: 'play' }); }
  assert.deepEqual(Career.summary(resumed), Career.summary(original));
  assert.equal(resumed.player.stats.gp, club.roster.find(p => p.id === resumed.player.id).stats.gp);
});

test('minigame numeric inputs cannot produce NaN or infinite timing', () => {
  const Minigames = require('../src/match/minigames.js');
  for (const value of [NaN, Infinity, -Infinity, '72', null]) {
    const ft = Minigames.freeThrow({ releaseTick: value, targetSeconds: value, windowSeconds: value, skill: value });
    const bz = Minigames.buzzer({ releaseTick: value, clockSeconds: value, skill: value });
    for (const r of [ft, bz]) { assert.ok(Number.isFinite(r.p)); assert.ok(Number.isFinite(r.releaseTick)); assert.equal(typeof r.made, 'boolean'); }
  }
});

test('coach morale effects apply once, without player-only duplicate branch', () => {
  const c = Career.createCareer({ seed: 'coach-effects', mode: 'coach' });
  const before = c.coach.morale;
  Content.applyEffects(c, { morale: 5 }); assert.equal(c.coach.morale, before + 5);
  Content.applyEffects(c, { morale: 100 }); assert.equal(c.coach.morale, 100);
});

test('worker timeout falls back exactly once in request order and propagates errors', async () => {
  const oldWorker = globalThis.Worker, oldBlob = globalThis.Blob, oldURL = globalThis.URL;
  const sent = []; let instance;
  globalThis.Worker = class { constructor() { instance = this; } postMessage(m) { sent.push(m); } terminate() { this.terminated = true; } };
  globalThis.Blob = class { constructor(parts) { this.parts = parts; } };
  globalThis.URL = Object.assign({}, oldURL, { createObjectURL: () => 'blob:test', revokeObjectURL() {} });
  try {
    let fallbacks = 0;
    const client = WorkerClient.createClient({ workerCode: 'test', timeoutMs: 100, onFallback: () => fallbacks++ });
    assert.equal(client.start(), true);
    const one = client.send('rng', { seed: 'same', n: 2 }), two = client.send('rng', { seed: 'same', n: 3 });
    const [a, b] = await Promise.all([one, two]);
    assert.deepEqual(a.values, b.values.slice(0, 2)); assert.equal(fallbacks, 1); assert.equal(instance.terminated, true);
    assert.equal(sent.length, 2); assert.equal(client.getMode(), 'main');
    await assert.rejects(client.send('unknown'), /unknown/);
    const saved = Handler.handle; Handler.handle = () => { throw new Error('sync failure'); };
    try { await assert.rejects(client.send('ping'), /sync failure/); } finally { Handler.handle = saved; }
    client.stop();
  } finally { globalThis.Worker = oldWorker; globalThis.Blob = oldBlob; globalThis.URL = oldURL; }
});

test('worker stop rejects outstanding requests and late messages cannot resolve them', async () => {
  const oldWorker = globalThis.Worker, oldBlob = globalThis.Blob, oldURL = globalThis.URL;
  let instance;
  globalThis.Worker = class { constructor() { instance = this; } postMessage() {} terminate() {} };
  globalThis.Blob = class {}; globalThis.URL = Object.assign({}, oldURL, { createObjectURL: () => 'blob:test', revokeObjectURL() {} });
  try {
    const c = WorkerClient.createClient({ workerCode: 'test', timeoutMs: 100 }); c.start();
    const p = c.send('ping'), late = instance.onmessage; c.stop(); await assert.rejects(p, /stopped/);
    late({ data: { id: 1, ok: true, result: {} } }); assert.equal(c.getMode(), 'main');
  } finally { globalThis.Worker = oldWorker; globalThis.Blob = oldBlob; globalThis.URL = oldURL; }
});

test('a11y keyboard wrapping, explicit motion and diagnostic percentiles', () => {
  assert.equal(A11Y.tabKey('ArrowLeft', 0, 7), 6); assert.equal(A11Y.tabKey('ArrowRight', 6, 7), 0);
  assert.equal(A11Y.tabKey('Home', 4, 7), 0); assert.equal(A11Y.tabKey('End', 0, 7), 6); assert.equal(A11Y.tabKey('a', 2, 7), null);
  assert.equal(A11Y.reduced({ reducedMotion: 'reduced' }), true); assert.equal(A11Y.reduced({ reducedMotion: 'full' }), false);
  const d = Diagnostics.summarize([16, 17, 32, 50, NaN, -1]);
  assert.equal(d.frames, 4); assert.equal(d.p95FrameMs, 50); assert.equal(d.framesOver33_34Ms, 1); assert.equal(d.deviceCertified, false);
});

test('Android shell is source-only, offline, local-asset backed and lifecycle wired', () => {
  const root = path.join(__dirname, '..', 'android');
  const manifest = fs.readFileSync(path.join(root, 'app/src/main/AndroidManifest.xml'), 'utf8');
  const java = fs.readFileSync(path.join(root, 'app/src/main/java/com/caminoalaro/app/MainActivity.java'), 'utf8');
  const gradle = fs.readFileSync(path.join(root, 'app/build.gradle'), 'utf8');
  assert.ok(!manifest.includes('android.permission.INTERNET')); assert.ok(manifest.includes('android:allowBackup="false"'));
  for (const token of ['WebViewAssetLoader', 'setAllowFileAccess(false)', 'setAllowContentAccess(false)', 'MIXED_CONTENT_NEVER_ALLOW', 'shouldInterceptRequest', 'caa:native-pause', 'caa:native-resume', 'handleBack', 'ACTION_OPEN_DOCUMENT', 'ACTION_CREATE_DOCUMENT', 'onDestroy']) assert.ok(java.includes(token), token);
  assert.ok(!gradle.includes('signingConfig')); assert.ok(!/广告|adsdk|admob/i.test(java));
  assert.ok(!fs.existsSync(path.join(root, 'app/build/outputs/bundle')));
  const wrapper = fs.readFileSync(path.join(root, 'gradle/wrapper/gradle-wrapper.properties'), 'utf8');
  assert.ok(wrapper.includes('gradle-8.13-bin.zip')); assert.ok(wrapper.includes('distributionSha256Sum=20f1b117'));
  const crypto = require('node:crypto');
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'gradle/wrapper/gradle-wrapper.jar'))).digest('hex'), '81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f');
});
