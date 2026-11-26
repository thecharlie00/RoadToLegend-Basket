'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');
const Gear = require('../src/domain/gear.js');
const Season = require('../src/domain/season.js');
const Player = require('../src/domain/player.js');

const mk = (mode, seed) => Career.createCareer({ mode, seed: seed || 'gear-rpg-' + mode, route: 'world', leagueId: 'es-iberica-men', jm: false });
const game = o => Object.assign({ pts: 8, reb: 3, ast: 2, stl: 1, blk: 0, won: true, score: [80, 75], po: false }, o);

test('cajas: gran partido, doble-doble, constancia; máximo 3 sin abrir y ninguna se pierde', () => {
  const st = mk('player'), g = Gear.ensure(st);
  assert.equal(Gear.afterGame(st, game({ pts: 30 })).reason, 'big');
  assert.equal(Gear.afterGame(st, game({ pts: 12, reb: 11 })).reason, 'double');
  for (let i = 0; i < 5; i++) assert.equal(Gear.afterGame(st, game()), null);
  assert.equal(Gear.afterGame(st, game()).reason, 'steady');
  assert.equal(g.boxes.length, 3);
  assert.equal(Gear.afterGame(st, game({ pts: 40 })), null, 'waits while 3 boxes are unopened');
  for (const b of g.boxes) { assert.equal(b.options.length, 3); assert.equal(new Set(b.options.map(o => o.itemId)).size, 3); }
});

test('cajas: elegir da pieza nueva, sube de tier o material; protección contra la mala suerte', () => {
  const st = mk('player', 'claim'), g = Gear.ensure(st);
  Gear.makeBox(st, 'big');
  const o = g.boxes[0].options[0];
  const r = Gear.op(st, { op: 'claim', boxId: g.boxes[0].id, index: 0 });
  assert.equal(r.result, 'new'); assert.equal(g.owned[o.itemId], o.tier);
  g.owned[o.itemId] = 5; g.boxes.push({ id: 'x', reason: 'steady', options: [{ itemId: o.itemId, tier: 1, affix: null }] });
  assert.equal(Gear.op(st, { op: 'claim', boxId: 'x', index: 0 }).result, 'material');
  assert.equal(g.mat, 4);
  g.dry = 4; const b = Gear.makeBox(st, 'steady');
  assert.ok(b.options.every(x => x.tier >= 2), 'after 4 dry boxes all options are Silver or better');
});

test('rodaje y rasgo suman a los atributos de partido del jugador (con tope)', () => {
  const st = mk('player', 'wear'), g = Gear.ensure(st);
  const it = Gear.ITEMS.find(i => i.id === 'shoes-rookie');
  assert.equal(g.equipped.shoes, 'shoes-rookie', 'starter shoes are worn');
  Gear.refresh(st); const base = Player.toMatchPlayer(st.player, true).attrs.velocidad;
  for (let i = 0; i < 20; i++) Gear.afterGame(st, game());
  assert.equal(g.wear['shoes-rookie'], 20);
  assert.equal(Gear.pieceStats(g, it, 0).velocidad, 1 + 2);
  Gear.refresh(st);
  assert.equal(Player.toMatchPlayer(st.player, true).attrs.velocidad, Math.min(99, base + 2));
  g.owned['shoes-rookie'] = 2; g.affix['shoes-rookie'] = { k: 'robo' };
  assert.equal(Gear.pieceStats(g, it, 2).robo, Gear.AFFIX_VAL[2]);
  g.mat = 13; Gear.op(st, { op: 'reforge', itemId: 'shoes-rookie' });
  const opt = g.reforge.options; assert.equal(opt.length, 3); assert.ok(!opt.includes('robo'));
  Gear.op(st, { op: 'reforgePick', itemId: 'shoes-rookie', affix: opt[1] });
  assert.equal(g.affix['shoes-rookie'].k, opt[1]); assert.equal(g.mat, 9);
  st.life.fame = 50; Gear.op(st, { op: 'upgradeMat', itemId: 'shoes-rookie' }); assert.equal(g.owned['shoes-rookie'], 3); assert.equal(g.mat, 0);
  const eff = Gear.effective(st); assert.ok(Object.values(eff.attrs).every(v => v <= Gear.CAP.att) && eff.total <= Gear.CAP.total);
});

test('equipaciones guardadas y equipamiento del entrenador para toda la plantilla', () => {
  const st = mk('player', 'loadout'), g = Gear.ensure(st);
  g.owned['band-classic'] = 0; Gear.op(st, { op: 'equip', itemId: 'band-classic' });
  Gear.op(st, { op: 'saveLoadout', index: 0 });
  Gear.op(st, { op: 'unequip', itemId: 'band-classic' }); assert.ok(!g.equipped.band);
  Gear.op(st, { op: 'useLoadout', index: 0 }); assert.equal(g.equipped.band, 'band-classic');
  const co = mk('coach'), cg = Gear.ensure(co), club = co.season.clubsById[co.clubId];
  const before = Season.clubToMatchTeam(club).players.map(p => p.attrs.clutch);
  cg.owned['cwatch-clutch'] = 0; Gear.op(co, { op: 'equip', itemId: 'cwatch-clutch' });
  const after = Season.clubToMatchTeam(club).players.map(p => p.attrs.clutch);
  after.forEach((v, i) => assert.equal(v, Math.min(99, before[i] + 2)));
  assert.ok(Object.values(Gear.effective(co).attrs).every(v => v <= Gear.CAP_TEAM.att));
});

test('el avatar recibe el aspecto y los colores de lo equipado', () => {
  const st = mk('player', 'look');
  const look = Career.summary(st).look;
  assert.ok(look && look.skin && look.shoes, 'shoes color reaches the avatar');
});
