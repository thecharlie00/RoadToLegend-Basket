'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const Pet = require('../src/domain/pet.js');
const Career = require('../src/domain/career.js');
const Parrot = require('../src/platform/parrot.js');

function fresh() {
  const s = Career.createCareer({ seed: 'parrot-test', mode: 'player' });
  s.life.cash = 20000;
  return s;
}

test('only the parrot has the talking class; other species reject it', () => {
  assert.equal(Pet.careAllowed({ species: 'parrot' }, 'speak'), true);
  for (const sp of Object.keys(Pet.SPECIES).filter(x => x !== 'parrot')) assert.equal(Pet.careAllowed({ species: sp }, 'speak'), false, sp);
  const s = fresh();
  Career.petOp(s, { op: 'adopt', species: 'dog' });
  assert.throws(() => Career.petOp(s, { op: 'speak' }), /cannot talk/);
  const p = fresh();
  Career.petOp(p, { op: 'adopt', species: 'parrot' });
  assert.equal(Career.petOp(p, { op: 'speak' }).first, true);
});

test('the talking class rewards once per week and leaves a memory in the album', () => {
  const s = fresh();
  Career.petOp(s, { op: 'adopt', species: 'parrot', name: 'Speaker' });
  const before = { bond: s.pet.bond, fun: s.pet.fun, affection: s.pet.affection };
  const first = Career.petOp(s, { op: 'speak' });
  assert.equal(first.first, true);
  assert.ok(s.pet.bond > before.bond);
  assert.ok(s.pet.fun > before.fun);
  assert.ok(s.pet.affection > before.affection);
  assert.equal(s.pet.last.key, 'speak');
  assert.ok(s.pet.album.some(m => m.key === 'speak'));
  const again = Career.petOp(s, { op: 'speak' });
  assert.equal(again.first, false);
  assert.equal(s.pet.last.key, 'speakAgain');
  assert.equal(s.pet.album.filter(m => m.key === 'speak').length, 1, 'album does not repeat the memory');
  assert.equal(Career.validate(Career.resume(Career.serialize(s))).ok, true);
  // La semana siguiente vuelve a estar disponible, como los cuidados rápidos.
  for (let i = 0; i < 2; i++) { if (s.life.pendingEvent) Career.chooseEvent(s, 'a'); Career.advanceWeek(s, { type: 'rest' }); }
  assert.equal(Career.petOp(s, { op: 'speak' }).first, true);
});

test('audio trimming removes silence, normalises and keeps the voice', () => {
  const rate = 8000, data = new Float32Array(rate * 2);
  for (let i = Math.floor(rate * 0.5); i < rate; i++) data[i] = Math.sin(i / 8) * 0.5;
  const trimmed = Parrot.trimChannel(data, rate);
  assert.ok(trimmed.ms > 480 && trimmed.ms < 700, 'ms ' + trimmed.ms);
  assert.ok(Math.abs(Parrot.peak(trimmed.data) - 0.92) < 0.02, 'normalised');
  assert.ok(trimmed.data.every(v => Math.abs(v) <= 1));
  assert.equal(Parrot.trimChannel(new Float32Array(rate), rate).ms, 0, 'silence means nothing to repeat');
  assert.ok(Parrot.MIN_MS >= 300 && Parrot.MAX_MS <= 6000);
});

test('the distortion curve is bounded, symmetric and saturates', () => {
  const c = Parrot.curve(4);
  assert.equal(c.length, 1024);
  assert.ok(Math.abs(c[0] + 1) < 1e-6 && Math.abs(c[1023] - 1) < 1e-6);
  assert.ok(c.every(v => Math.abs(v) <= 1));
  assert.ok(Math.abs(c[512]) < 0.01, 'crosses zero in the middle');
  for (let i = 1; i < c.length; i++) assert.ok(c[i] >= c[i - 1], 'monotonic at ' + i);
  assert.ok(c[600] > 0.2 && c[600] < 1, 'soft saturation keeps dynamics');
});

test('without a microphone the module degrades instead of throwing or hanging', async () => {
  assert.equal(Parrot.supported(), false);
  assert.equal(Parrot.info().ready, false);
  assert.equal(Parrot.info().status, 'idle');
  await assert.rejects(Parrot.say(), e => e.code === 'empty');
  await assert.rejects(Parrot.start(), e => e.code === 'unsupported');
  assert.equal(Parrot.info().error, 'unsupported');
  Parrot.stop(); Parrot.forget();
  assert.equal(Parrot.info().status, 'idle');
  assert.equal(await Parrot.sayText('hola', 'es'), 0);
});

test('every parrot label the interface asks for exists in all five languages', () => {
  const ui = fs.readFileSync(path.join(ROOT, 'src/ui/app.js'), 'utf8');
  const keys = new Set();
  for (const m of ui.matchAll(/pet\.parrot\.[a-zA-Z]+/g)) keys.add(m[0]);
  for (const k of ['pet.act.speak', 'pet.msg.speak', 'pet.msg.speakAgain', 'pet.album.speak']) keys.add(k);
  for (const code of ['unsupported', 'blocked', 'nodevice', 'short', 'failed', 'decode']) keys.add('pet.parrot.' + code);
  assert.ok(keys.size >= 25, 'found ' + keys.size);
  for (const k of keys) assert.ok(k !== 'pet.parrot.' , 'bad key ' + k);
  const locales = ['es', 'en', 'fr', 'de', 'it'].map(l => [l, JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/' + l + '.json'), 'utf8'))]);
  for (const [lang, dict] of locales) for (const k of keys) assert.ok(typeof dict[k] === 'string' && dict[k].length > 1, 'missing ' + lang + ' ' + k);
  // Los errores que puede devolver el módulo también tienen texto propio.
  for (const code of ['unsupported', 'blocked', 'nodevice', 'short', 'failed', 'decode']) assert.ok(locales[1][1]['pet.parrot.' + code], code);
});
