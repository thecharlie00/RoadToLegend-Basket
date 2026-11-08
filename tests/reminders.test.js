'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../src/platform/reminders.js');
const fs = require('node:fs');

const t = (k, v) => k + (v ? JSON.stringify(v) : '');
const at = (h, m = 0) => new Date(2026, 10, 9, h, m, 0, 0).getTime();

test('quiet hours move reminders to 10:00', () => {
  assert.equal(R.awake(at(15)), at(15));
  assert.equal(new Date(R.awake(at(23))).getHours(), 10);
  assert.equal(new Date(R.awake(at(23))).getDate(), 10);
  assert.equal(R.awake(at(7)), at(10));
});

test('plan: decision, pet and next game, at most 3, spaced and never at night', () => {
  const s = { event: { id: 'x' }, pet: { name: 'Pichichi' }, next: { opponent: { name: 'Baskonia' } } };
  const list = R.plan(s, at(12), t);
  assert.ok(list.length <= 3 && list.length >= 2);
  assert.deepEqual(list.map(r => r.id).slice(0, 2), ['decision', 'pet']);
  assert.ok(list.some(r => r.title.includes('Baskonia')) || list.length === 3);
  for (let i = 1; i < list.length; i++) assert.ok(list[i].at - list[i - 1].at >= 2 * 3600000);
  for (const r of list) { const h = new Date(r.at).getHours(); assert.ok(h >= R.QUIET_END && h < R.QUIET_START); }
});

test('plan: nothing for a finished career; playoffs wording when in playoffs', () => {
  assert.deepEqual(R.plan({ careerOver: true }, at(12), t), []);
  assert.deepEqual(R.plan(null, at(12), t), []);
  const list = R.plan({ playoffs: { done: false } }, at(12), t);
  assert.ok(list.some(r => r.id === 'playoffs'));
});

test('bridge is optional: no Android app means no scheduling', () => {
  assert.equal(R.available({}), false);
  assert.equal(R.status({}), 'none');
  assert.equal(R.schedule({}, []), false);
  const calls = [];
  const win = { CAAAndroid: { scheduleReminders: j => calls.push(['s', j]), cancelReminders: () => calls.push(['c']), notifyStatus: () => 'granted', askNotify: () => calls.push(['a']) } };
  assert.equal(R.available(win), true);
  assert.equal(R.status(win), 'granted');
  R.schedule(win, [{ at: 1, title: 'a', body: 'b' }]); R.cancel(win);
  assert.equal(calls[0][0], 's'); assert.equal(JSON.parse(calls[0][1]).length, 1); assert.equal(calls[1][0], 'c');
});

test('tutorial and reminder texts exist in every locale', () => {
  const es = JSON.parse(fs.readFileSync('src/locales/es.json', 'utf8'));
  const keys = Object.keys(es).filter(k => /^(tut|rem)\./.test(k) || k.startsWith('settings.reminders'));
  assert.ok(keys.length >= 40);
  for (const loc of ['en', 'fr', 'de', 'it']) {
    const d = JSON.parse(fs.readFileSync(`src/locales/${loc}.json`, 'utf8'));
    for (const k of keys) assert.ok(d[k], loc + ' ' + k);
  }
});
