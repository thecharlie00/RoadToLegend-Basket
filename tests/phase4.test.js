'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, '..');
const Names = require('../src/domain/names.js');
const Content = require('../src/domain/content.js');
const Minigames = require('../src/match/minigames.js');
const Court2D = require('../src/render/court2d.js');
const Career = require('../src/domain/career.js');
const Season = require('../src/domain/season.js');
const Handler = require('../src/worker/handler.js');
const Save = require('../src/core/save.js');

function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }

test('inspired player-name pack is fictionalized, pending clearance, and does not alter club names', () => {
  const pack = Names.getPack();
  assert.equal(pack.names.length, 77);
  assert.equal(pack.legalStatus, 'pending-clearance');
  assert.ok(!Object.prototype.hasOwnProperty.call(pack, 'referenceName'));
  const research = JSON.parse(fs.readFileSync(path.join(ROOT, 'research/player-name-inspirations.json'), 'utf8'));
  for (const entry of pack.names) {
    const ref = research.entries.find(e => e.id === entry.id);
    assert.ok(ref, 'missing research audit for ' + entry.id);
    assert.notEqual(norm(entry.name), norm(ref.referenceName), 'exact normalized real name shipped: ' + entry.name);
    assert.ok(!Object.prototype.hasOwnProperty.call(entry, 'referenceName'));
  }
  const clubs = Season.defaultClubs('es-iberica-men');
  const before = clubs.map(c => c.name);
  Names.assignInspiredToClubs(clubs, 'test', 'eu', 0);
  assert.deepEqual(clubs.map(c => c.name), before);
  assert.ok(clubs.some(c => c.roster.some(p => p.nameInspirationId)));
});

test('build does not package research reference names or internal audit pack', () => {
  const html = fs.readFileSync(path.join(ROOT, 'dist/index.html'), 'utf8');
  const research = JSON.parse(fs.readFileSync(path.join(ROOT, 'research/player-name-inspirations.json'), 'utf8'));
  assert.ok(!html.includes('player-name-inspirations'));
  assert.ok(!html.includes('notForDistribution'));
  const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const entry of research.entries) {
    // A fictionalized variant may contain the reference as a substring (e.g. adding a suffix),
    // but the exact real full name must not appear as a standalone token.
    const re = new RegExp('(?<![A-Za-z])' + escapeRe(entry.referenceName) + '(?![A-Za-z])', 'i');
    assert.ok(!re.test(html), 'research reference name leaked into dist: ' + entry.referenceName);
  }
  assert.ok(html.includes('inspired-player-names'));
  assert.ok(html.includes('CAA_DATA'));
});

test('content packs validate and are bilingual', () => {
  const saved = globalThis.CAA_DATA;
  globalThis.CAA_DATA = {
    events: require('../data/content/events.json'),
    achievements: require('../data/content/achievements.json'),
    shop: require('../data/content/shop.json'),
    press: require('../data/content/press.json'),
    guide: require('../data/content/guide.json')
  };
  const v = Content.validate();
  globalThis.CAA_DATA = saved;
  assert.equal(v.ok, true, v.errors.join('; '));
  const p = Content.packs();
  assert.equal(p.events.events.length, 100);
  assert.equal(p.achievements.achievements.length, 50);
  assert.equal(p.shop.items.length, 12);
  assert.equal(p.press.templates.length, 6);
  assert.equal(p.guide.steps.length, 8);
  for (const e of p.events.events) { assert.ok(e.title.es && e.title.en && e.body.es && e.body.en); assert.ok(e.options.length >= 2); }
  for (const a of p.achievements.achievements) assert.ok(a.title.es && a.title.en);
  for (const i of p.shop.items) assert.ok(i.name.es && i.name.en);
  for (const g of p.guide.steps) assert.ok(g.es && g.en);
});

test('life events, achievements, shop and press have deterministic consequences', () => {
  const a = Career.createCareer({ seed: 'life-det', mode: 'player', route: 'eu-academy' });
  const b = Career.createCareer({ seed: 'life-det', mode: 'player', route: 'eu-academy' });
  for (const c of [a, b]) {
    for (let i = 0; i < 3; i++) Career.advanceWeek(c, { type: 'play' });
    assert.ok(c.life.pendingEvent);
    Career.chooseEvent(c, 'a');
    Content.evaluateAchievements(c);
    c.life.style += 100;
    Career.buyItem(c, 'item-1');
    Career.equipItem(c, 'item-1');
    const morale = c.player.morale;
    Career.equipItem(c, 'item-1');
    assert.equal(c.player.morale, morale, 'reequip must not stack bonus');
    Career.nextGuide(c);
  }
  assert.equal(a.hash, b.hash);
  assert.deepEqual(Career.summary(a), Career.summary(b));
  assert.ok(a.life.eventHistory.length >= 1);
  assert.ok(a.life.achievements.length >= 1);
  assert.ok(a.life.press.length >= 1);
  assert.equal(a.life.guideStep, 1);
});

test('life state survives save/resume', () => {
  const c = Career.createCareer({ seed: 'life-save', mode: 'player', route: 'eu-academy' });
  for (let i = 0; i < 3; i++) Career.advanceWeek(c, { type: 'play' });
  const env = Save.createEnvelope('slot-life', { career: Career.serialize(c) }, { seed: 'life-save', rngCounters: c.rng });
  const resumed = Career.resume(Save.parseEnvelope(JSON.stringify(env)).payload.career);
  assert.deepEqual(resumed.life, c.life);
  Career.practice(c, { auto: true, type: 'freeThrow' });
  Career.practice(resumed, { auto: true, type: 'freeThrow' });
  assert.equal(resumed.hash, c.hash);
});

test('minigames are deterministic, 60 Hz, and auto is not penalized', () => {
  assert.equal(Minigames.HZ, 60);
  const cfg = { seed: 'ft', skill: 70, releaseTick: 72 };
  assert.deepEqual(Minigames.freeThrow(cfg), Minigames.freeThrow(cfg));
  const auto = Minigames.auto({ seed: 'ft', skill: 70, type: 'freeThrow' });
  assert.equal(auto.releaseTick, auto.targetTick);
  assert.equal(auto.timing, 1);
  const buzzer = Minigames.buzzer({ seed: 'bz', skill: 70, clockSeconds: 2, releaseTick: 119 });
  assert.equal(buzzer.legal, true);
  const late = Minigames.buzzer({ seed: 'bz', skill: 70, clockSeconds: 2, releaseTick: 120 });
  assert.equal(late.legal, false);
  assert.equal(late.made, false);
  assert.deepEqual(Minigames.buzzer({ seed: 'bz', skill: 70, clockSeconds: 2, releaseTick: 119 }), buzzer);
});

test('career practice supports free throw and buzzer with consequences', () => {
  const c = Career.createCareer({ seed: 'practice', mode: 'player', route: 'eu-academy' });
  const ft = Career.practice(c, { auto: true, type: 'freeThrow' });
  const bz = Career.practice(c, { auto: true, type: 'buzzer' });
  const ft2 = Career.practice(c, { auto: true, type: 'freeThrow' });
  assert.equal(ft.type, 'freeThrow');
  assert.equal(bz.type, 'buzzer');
  assert.notEqual(ft.hash, ft2.hash, 'repeated practice must not reuse the same RNG seed');
  assert.equal(c.life.counters.practice, 3);
  assert.ok(c.life.xp >= 3);
  assert.ok(c.player.load >= 6);
});

test('court2d frames are bounded and drawable without a browser', () => {
  const events = [
    { type: 'shot', team: 0, zone: 'above3', made: true },
    { type: 'shot', team: 1, zone: 'paint', made: false },
    { type: 'turnover', team: 0 }
  ];
  const frames = Court2D.framesFromEvents(events);
  assert.equal(frames.length, 3);
  for (const f of frames) {
    assert.equal(f.players.length, 10);
    assert.ok(f.ball.x >= 0 && f.ball.x <= 1 && f.ball.y >= 0 && f.ball.y <= 1);
    for (const p of f.players) assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
  }
  const calls = [];
  const ctx = new Proxy({}, { get: (_, k) => { if (k === 'canvas') return {}; return (...args) => calls.push([k, ...args]); }, set: () => true });
  Court2D.drawCourt(ctx, 640, 360, frames[0], { colorMode: 'blue-orange' });
  assert.ok(calls.some(c => c[0] === 'arc'));
  assert.ok(calls.some(c => c[0] === 'fillText'));
});

test('worker RPC exposes content, life actions and minigames', () => {
  const created = Handler.handle({ id: 1, type: 'career.create', payload: { seed: 'rpc-life', mode: 'player', route: 'eu-academy' } });
  assert.equal(created.ok, true);
  let state = created.result;
  for (let i = 0; i < 3; i++) {
    const adv = Handler.handle({ id: 2, type: 'career.advance', payload: { state, action: { type: 'play' } } });
    assert.equal(adv.ok, true);
    state = adv.result.state;
  }
  assert.ok(state.life.pendingEvent);
  const ev = Handler.handle({ id: 3, type: 'career.event', payload: { state, optionId: 'a' } });
  assert.equal(ev.ok, true);
  state = ev.result.state;
  state.life.style += 100;
  const buy = Handler.handle({ id: 4, type: 'career.buy', payload: { state, itemId: 'item-1' } });
  assert.equal(buy.ok, true);
  const equip = Handler.handle({ id: 5, type: 'career.equip', payload: { state: buy.result.state, itemId: 'item-1' } });
  assert.equal(equip.ok, true);
  const practice = Handler.handle({ id: 6, type: 'career.practice', payload: { state: equip.result.state, config: { auto: true, type: 'buzzer' } } });
  assert.equal(practice.ok, true);
  assert.equal(practice.result.practice.type, 'buzzer');
  const guide = Handler.handle({ id: 7, type: 'career.guide', payload: { state: practice.result.state } });
  assert.equal(guide.ok, true);
  assert.equal(guide.result.summary.life.guideStep, 1);
  const validate = Handler.handle({ id: 8, type: 'content.validate', payload: {} });
  assert.equal(validate.result.ok, true);
  const mini = Handler.handle({ id: 9, type: 'minigame.resolve', payload: { type: 'buzzer', seed: 'rpc', releaseTick: 60, clockSeconds: 2 } });
  assert.equal(mini.ok, true);
  assert.equal(mini.result.type, 'buzzer');
});

test('es/en locale keys stay in parity for phase 4 UI', () => {
  const es = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/es.json'), 'utf8'));
  const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en.json'), 'utf8'));
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  for (const key of ['nav.life', 'life.title', 'life.buzzerAuto', 'match.play2d', 'match.court']) assert.ok(es[key] && en[key], key);
});
