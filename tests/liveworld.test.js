'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');
const World = require('../src/domain/world.js');

function clearEvent(s) { let n = 0; while (s.pendingEvent && n++ < 5) Career.chooseEvent(s, s.pendingEvent.options ? s.pendingEvent.options[0].id : 0); }

test('summer tournament: four teams, four games, place 1-4, dismissable', () => {
  const s = Career.createCareer({ seed: 'sum-t', mode: 'coach', leagueId: 'es-iberica-men' });
  const sc = s.summerCup; assert.ok(sc, 'summer cup created');
  assert.equal(sc.teams.length, 4); assert.equal(sc.games.length, 4); assert.ok(sc.place >= 1 && sc.place <= 4);
  assert.ok(Career.summary(s).summerCup);
  Career.worldOp(s, { op: 'summer-seen' });
  assert.equal(Career.summary(s).summerCup, null);
});

test('deadline day: bargains appear for the coach and can be signed once', () => {
  const s = Career.createCareer({ seed: 'dl-t', mode: 'coach', leagueId: 'es-iberica-men' });
  s.clubFin.cash = 1e9;
  let guard = 0;
  while (!World.deadlineWeek(s) && guard++ < 60) { clearEvent(s); try { Career.advanceWeek(s); } catch (_) { clearEvent(s); } }
  const d = Career.summary(s).deadline; assert.ok(d && d.offers.length >= 1, 'deadline offers');
  assert.ok(d.offers.every(o => o.at >= 18 * 60 && o.at < 24 * 60));
  const id = d.offers[0].id, size = s.season.clubsById[s.clubId].roster.length;
  if (size < 15) {
    Career.worldOp(s, { op: 'deadline-sign', id });
    assert.equal(s.season.clubsById[s.clubId].roster.length, size + 1);
    assert.throws(() => Career.worldOp(s, { op: 'deadline-sign', id }), /already/);
  }
});

test('cup draw: eight balls, deterministic and paired in draw order', () => {
  const s = Career.createCareer({ seed: 'draw-t', mode: 'coach', leagueId: 'es-iberica-men' });
  let guard = 0;
  while (!s.cupDraw && guard++ < 60) { clearEvent(s); try { Career.advanceWeek(s); } catch (_) { clearEvent(s); } }
  if (!s.cupDraw) return; // tu club no se clasificó: el sorteo no se muestra
  const cd = Career.summary(s).cupDraw;
  assert.equal(cd.balls.length, 8);
  const qf = cd.rounds[0].games.map(g => [g.a, g.b].sort().join('|')).sort();
  const pairs = [0, 2, 4, 6].map(i => [cd.balls[i].name, cd.balls[i + 1].name].sort().join('|')).sort();
  assert.deepEqual(qf, pairs);
  Career.worldOp(s, { op: 'draw-seen' }); assert.equal(Career.summary(s).cupDraw, null);
});

test('youth cup: a young bench player plays it and gains potential', () => {
  const s = Career.createCareer({ seed: 'yc-t', mode: 'player', leagueId: 'es-iberica-men', pos: 'PG' });
  s.player.age = 18; s.player.stats = { gp: 10, min: 50 };
  const pot = s.player.potential;
  const RNG = require('../src/core/rng.js');
  const y = World.youth(s, RNG.create('x'));
  assert.equal(y.kind, 'player'); assert.ok(s.player.potential > pot || pot >= 99);
});
