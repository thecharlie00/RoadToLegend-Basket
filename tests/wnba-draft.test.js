'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');
const Draft = require('../src/domain/draft.js');
const Fem = require('../src/core/fem.js');

test('WNBA draft: 3 rounds, one pick per team, lottery only for the first two picks', () => {
  const ids = Array.from({ length: 15 }, (_, i) => 't' + i); // peor → mejor
  const o = Draft.wnbaOrder(ids, 'lot');
  assert.equal(o.rounds.length, 3); assert.equal(o.round1.length, 15);
  assert.ok(o.lottery.every(id => ids.slice(0, 7).includes(id)), 'lottery among non-playoff teams');
  assert.deepEqual(o.round1.slice(2), ids.filter(id => !o.lottery.includes(id)));
  const d = Draft.runDraft({ seed: 'd', order: o });
  assert.equal(d.picks.length, 45);
});

test('women player can enter the WNBA draft (age 22, or 20 if international) or go undrafted', () => {
  const us = Career.createCareer({ seed: 'wd-us', mode: 'player', gender: 'f', route: 'na-draft', nationality: 'US', pos: 'PG' });
  assert.equal(us.season.leagueId, 'na-boreal-women'); assert.equal(us.player.gender, 'women'); assert.ok(us.player.age >= 22);
  assert.equal(Math.max(...us.draft.picks.map(p => p.round)), 3);
  const es = Career.createCareer({ seed: 'wd-es', mode: 'player', gender: 'f', route: 'na-undrafted', nationality: 'ES', pos: 'SF' });
  assert.ok(es.player.age >= 20 && es.player.contract.guaranteed === false);
  const men = Career.createCareer({ seed: 'md', mode: 'player', route: 'na-draft' });
  assert.equal(men.season.leagueId, 'na-boreal-men'); assert.equal(men.draft.picks.length, 60);
});

test('feminine texts: roles, awards and articles in five languages; participles after «haber» stay', () => {
  const o = Fem.opts(true, true, null);
  assert.equal(Fem.apply('Tu compañero el alero', 'es', o), 'Tu compañera la alera');
  assert.equal(Fem.apply('Mejor defensor del año', 'es', o), 'Mejor defensora del año');
  assert.equal(Fem.apply('Te han elegido en el draft.', 'es', o), 'Te han elegido en el draft.');
  assert.equal(Fem.apply('Ton joueur', 'fr', o), 'Ta joueuse');
  assert.equal(Fem.apply('Dein Spieler', 'de', o), 'Deine Spielerin');
  assert.equal(Fem.apply('Il tuo giocatore', 'it', o), 'La tua giocatrice');
});
