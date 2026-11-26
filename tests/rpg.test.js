'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');
const Rpg = require('../src/domain/rpg.js');
const Season = require('../src/domain/season.js');
const Player = require('../src/domain/player.js');
const fs = require('node:fs');

const mk = mode => Career.createCareer({ mode, seed: 'rpg-' + mode, route: 'world', leagueId: 'es-iberica-men', jm: false });

test('talentos: la experiencia sube de nivel, da puntos y nunca baja', () => {
  const st = mk('player'), r = Rpg.ensure(st);
  assert.equal(r.level, 1); assert.equal(r.points, 1);
  const ups = Rpg.gain(st, Rpg.xpFor(1) + Rpg.xpFor(2), 'test');
  assert.equal(ups, 2); assert.equal(r.level, 3); assert.equal(r.points, 3);
  Rpg.gain(st, -500); assert.equal(r.level, 3);
  Career.simSeason(st);
  assert.ok(Rpg.ensure(st).level >= 5, 'a season of games levels you up');
});

test('talentos: requisitos de árbol, nivel y firmas; reasignar una vez por temporada', () => {
  const st = mk('player'); Rpg.gain(st, 20000);
  const r = Rpg.ensure(st);
  assert.equal(Rpg.canBuy(st, 'stroke').why, 'tree');
  for (let i = 0; i < 3; i++) Rpg.buy(st, 'deep');
  assert.equal(Rpg.canBuy(st, 'deep').why, 'max');
  Rpg.buy(st, 'stroke'); Rpg.buy(st, 'stroke'); Rpg.buy(st, 'midrange');
  assert.ok(Rpg.canBuy(st, 'sniper').ok); Rpg.buy(st, 'sniper');
  for (const id of ['rim', 'rim', 'rim', 'post', 'post', 'post']) Rpg.buy(st, id);
  Rpg.buy(st, 'poster');
  for (const id of ['handle', 'handle', 'handle', 'passer', 'passer', 'passer']) Rpg.buy(st, id);
  assert.equal(Rpg.canBuy(st, 'general').why, 'sigs', 'at most two signatures');
  const pts = r.points, back = Rpg.respec(st);
  assert.equal(r.points, pts + back); assert.deepEqual(r.ranks, {});
  assert.throws(() => Rpg.respec(st), /already/);
  const low = mk('player'); Rpg.gain(low, 3000);
  for (const id of ['deep', 'deep', 'deep', 'midrange', 'midrange', 'midrange']) Rpg.buy(low, id);
  if (Rpg.ensure(low).level < Rpg.SIG_LEVEL) assert.equal(Rpg.canBuy(low, 'sniper').why, 'level');
});

test('talentos del jugador: suben sus atributos de partido (con tope), no su media base', () => {
  const st = mk('player'); Rpg.gain(st, 20000);
  const before = Player.toMatchPlayer(st.player, true).attrs.tiroTriple, base = st.player.attrs.tiroTriple, ovr = st.player.ovr;
  for (let i = 0; i < 3; i++) Rpg.buy(st, 'deep');
  Rpg.buy(st, 'midrange'); Rpg.buy(st, 'midrange'); Rpg.buy(st, 'midrange'); Rpg.buy(st, 'sniper');
  const after = Player.toMatchPlayer(st.player, true).attrs.tiroTriple;
  assert.equal(after - before, Math.min(99 - before, 6));
  assert.equal(st.player.attrs.tiroTriple, base); assert.equal(st.player.ovr, ovr);
  const v = Career.summary(st).rpg; assert.ok(v.ovrWith >= v.ovrBase);
  assert.ok(Object.values(Rpg.sumAttrs(st, Rpg.ensure(st))).every(x => x <= Rpg.CAP_PLAYER));
});

test('talentos del entrenador: toda la plantilla mejora en partido; desarrollo y moral semanales', () => {
  const st = mk('coach'); Rpg.gain(st, 20000);
  const club = st.season.clubsById[st.clubId];
  const before = Season.clubToMatchTeam(club).players.map(p => p.attrs.defInterior);
  for (let i = 0; i < 3; i++) Rpg.buy(st, 'walls');
  const after = Season.clubToMatchTeam(club).players.map(p => p.attrs.defInterior);
  after.forEach((v, i) => assert.equal(v, Math.min(99, before[i] + 3)));
  const rival = st.season.clubs.find(c => c.id !== st.clubId);
  assert.ok(!rival.coachAttrs, 'only your club');
  for (let i = 0; i < 3; i++) Rpg.buy(st, 'motivator');
  club.roster.forEach(p => { p.morale = 40; });
  const RNG = require('../src/core/rng.js');
  Rpg.coachWeek(st, RNG.create('x'), Player);
  assert.ok(club.roster.every(p => p.morale === 43));
  const fx = Rpg.effects(st); assert.equal(fx.morale, 3);
});

test('talentos: textos en los 5 idiomas para todos los árboles y talentos', () => {
  for (const l of ['es', 'en', 'fr', 'de', 'it']) {
    const d = JSON.parse(fs.readFileSync(__dirname + '/../src/locales/' + l + '.json', 'utf8'));
    for (const role of ['player', 'coach']) for (const tr of Rpg.TREES[role]) {
      assert.ok(d['rpg.tree.' + tr.id], l + ' tree ' + tr.id);
      assert.ok(d['rpg.treeDesc.' + (role === 'player' ? 'p.' : 'c.') + tr.id], l + ' desc ' + tr.id);
      for (const p of tr.perks) assert.ok(d['rpg.perk.' + p.id], l + ' perk ' + p.id);
    }
  }
});
