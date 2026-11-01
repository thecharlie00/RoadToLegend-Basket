'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');
const Gear = require('../src/domain/gear.js');
const Fem = require('../src/core/fem.js');
const Player = require('../src/domain/player.js');
const Season = require('../src/domain/season.js');

test('gear: buy, equip, upgrade with real cash, capped effective attributes reach the match engine', () => {
  const s = Career.createCareer({ seed: 'gear', mode: 'player', route: 'eu-academy', pos: 'SG' });
  s.life.cash = 500000;
  for (const id of ['shoes-splash', 'sleeve-splash', 'band-splash']) Career.gearOp(s, { op: 'buy', itemId: id });
  const eff = Gear.effective(s);
  assert.ok(eff.sets.includes('splash'));
  assert.ok(eff.attrs.tiroTriple <= Gear.CAP.att && eff.total <= Gear.CAP.total);
  const before = s.life.cash;
  Career.gearOp(s, { op: 'upgrade', itemId: 'sleeve-splash' });
  assert.ok(s.life.cash < before);
  const mp = Player.toMatchPlayer(s.player, true);
  assert.equal(mp.attrs.tiroTriple, Math.min(99, s.player.attrs.tiroTriple + s.player.gearAttrs.tiroTriple));
  assert.throws(() => Career.gearOp(s, { op: 'buy', itemId: 'suit-navy' }), /another role/);
  assert.throws(() => Career.gearOp(s, { op: 'buy', itemId: 'chain-ring' }), /locked/);
  assert.ok(Career.validate(Career.resume(Career.serialize(s))).ok);
});

test('gear: no money, no purchase; weekly stock is deterministic and offers are cheaper', () => {
  const s = Career.createCareer({ seed: 'gear-poor', mode: 'player', route: 'eu-academy', pos: 'PG' });
  s.life.cash = 0;
  assert.throws(() => Career.gearOp(s, { op: 'buy', itemId: 'shoes-jet' }), /not enough cash/);
  const a = Gear.stock(s), b = Gear.stock(s);
  assert.deepEqual(a, b);
  const v = Gear.view(s);
  for (const id of a.offers) { const it = v.items.find(i => i.id === id); assert.ok(it.price < it.basePrice); }
});

test('look: valid choices only and shown on the avatar description', () => {
  const s = Career.createCareer({ seed: 'look', mode: 'player', leagueId: 'es-iberica-women', pos: 'PG' });
  Gear.ensure(s);
  assert.equal(s.life.look.hair, 'ponytail');
  Career.gearOp(s, { op: 'look', hair: 'afro', skin: 3, hairColor: 2, celebration: 'crown' });
  assert.equal(Gear.avatarLook(s).hair, 'afro');
  assert.throws(() => Career.gearOp(s, { op: 'look', hair: 'mohawk-xl' }), /bad hair/);
});

test('fem: women leagues read in feminine, men leagues untouched', () => {
  const o = Fem.opts(true, true, 'young-prospect');
  assert.equal(Fem.apply('Un chico de 17 años quita minutos a un veterano.', 'es', o), 'Una chica de 17 años quita minutos a una veterana.');
  assert.equal(Fem.apply('Todos los jugadores', 'es', o), 'Todas las jugadoras');
  assert.equal(Fem.apply('He wants plays for him. Sixth Man', 'en', o), 'She wants plays for her. Sixth Woman');
  assert.equal(Fem.apply('Todos los jugadores', 'es', Fem.opts(false, false, 'x')), 'Todos los jugadores');
});

test('more leagues: second divisions with promotion and every league playable size', () => {
  const all = Season.leagueList();
  assert.ok(all.length >= 50);
  assert.ok(all.every(l => l.teams >= 8));
  for (const id of ['fr-hexagone2-men', 'it-penisola2-men', 'de-rhein2-men', 'tr-bosforo2-men', 'ar-pampa2-men', 'es-ascenso-women']) {
    const L = Season.LEAGUES[id];
    assert.equal(L.level, 2); assert.equal(Season.LEAGUES[L.pair].pair, id);
  }
});

const Rules = require('../src/match/rules.js');
const Match = require('../src/match/engine.js');
const Eras = require('../src/domain/eras.js');
const runSeason = s => {
  let g = 0; const y = s.year;
  while (s.year === y && g++ < 200) {
    if (s.life && s.life.pendingEvent) Career.chooseEvent(s, Career.summary(s).event.options[0].id);
    const st = Career.summary(s).playoffs;
    Career.advanceWeek(s, { type: st && !st.done && !['playing', 'waiting'].includes(st.status) ? 'skipPlayoffs' : 'play' });
    s = Career.resume(Career.serialize(s));
  }
  return s;
};

test('eras: historical rules by year (no three, no clock, halves) rebuilt from the id and used by the engine', () => {
  const L = Season.LEAGUES['it-penisola-men'];
  const id = Eras.ruleSetFor(1925, L), p = Rules.getProfile(id);
  assert.equal(p.three, null); assert.equal(p.shotClock, null); assert.equal(p.periods, 2);
  assert.equal(Rules.getProfile(Eras.ruleSetFor(1957, L)).shotClock, 30);
  assert.equal(Rules.getProfile(Eras.ruleSetFor(1985, L)).three.arc, 6.25);
  assert.equal(Eras.ruleSetFor(2015, L), 'FIBA-2026');
  assert.equal(Rules.getProfile(Eras.ruleSetFor(1975, Season.LEAGUES['na-boreal-men'])).shotClock, 24);
  const s = Season.createSeason('it-penisola-men', 'era-engine');
  const st = Match.simulateMatch({ seed: 'e1', ruleSetId: id, teams: [Season.clubToMatchTeam(s.clubs[0]), Season.clubToMatchTeam(s.clubs[1])] });
  assert.equal(st.teams[0].stats['3pa'] + st.teams[1].stats['3pa'], 0);
  assert.ok(st.score[0] + st.score[1] < 150, 'low-scoring early era');
});

test('eras: career in 1955 lives the 1956 shot clock arrival, with legends and only founded leagues', () => {
  let s = Career.createCareer({ seed: 'era-1955', mode: 'player', leagueId: 'fr-hexagone-men', pos: 'PG', eraYear: 1955 });
  assert.equal(s.year, 1955);
  assert.equal(s.era.legends.length, 4);
  assert.throws(() => Career.createCareer({ seed: 'x', mode: 'player', leagueId: 'cn-dragon-men', eraYear: 1955 }), /not founded/);
  assert.throws(() => Career.exploreCrossing(s, 'au-austral-men'), /not founded/);
  s = runSeason(s);
  assert.equal(s.year, 1956);
  assert.ok(s.inbox.some(i => i.type === 'eraRule' && i.detail.rule === 'shotClock'));
  assert.equal(Rules.getProfile(s.season.ruleSet).shotClock, 30);
  assert.ok(Career.validate(Career.resume(Career.serialize(s))).ok);
});
