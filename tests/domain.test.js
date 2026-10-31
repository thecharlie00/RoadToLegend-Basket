'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Names = require('../src/domain/names.js');
const Player = require('../src/domain/player.js');
const Contracts = require('../src/domain/contracts.js');
const Season = require('../src/domain/season.js');
const Draft = require('../src/domain/draft.js');
const Match = require('../src/match/engine.js');

test('names module generates player names only and is deterministic', () => {
  const a = Names.generateName('abc', 'ES');
  const b = Names.generateName('abc', 'ES');
  assert.deepEqual(a, b);
  assert.ok(a.full.includes(' '));
  const roster = Names.generateRosterNames('team', 'US', 12);
  assert.equal(roster.length, 12);
  assert.equal(new Set(roster.map(n => n.full)).size, 12);
});

test('demo team keeps team name but changes player names', () => {
  const team = Match.demoTeam('home', 'Home', 50);
  assert.equal(team.name, 'Home');
  assert.ok(team.players.every(p => p.name !== 'Home 1' && !p.name.startsWith('Home ')));
});

test('player creation is deterministic and has hidden potential', () => {
  const a = Player.createPlayer({ seed: 'p1', pos: 'PG', quality: 60 });
  const b = Player.createPlayer({ seed: 'p1', pos: 'PG', quality: 60 });
  assert.deepEqual(a, b);
  assert.ok(a.potential >= a.ovr);
  assert.equal(Player.POSITIONS.includes(a.pos), true);
});

test('NA contracts respect cap/apron and max/min guards', () => {
  const p = Player.createPlayer({ seed: 'c1', age: 28, quality: 80 });
  const club = { league: 'na-boreal-men', roster: [] };
  const offer = Contracts.offerForPlayer(p, club, require('../src/core/rng.js').create('offer'), Contracts.NA_ECONOMY_2026_27);
  assert.ok(offer.salary >= Contracts.naMinSalary(p));
  assert.ok(offer.salary <= Contracts.naMaxSalary(p));
  const ok = Contracts.canSign(club, p, offer);
  assert.equal(ok.ok, true);
  const huge = Contracts.makeContract({ years: 1, salary: Contracts.NA_ECONOMY_2026_27.secondApron });
  assert.equal(Contracts.canSign(club, p, huge).ok, false);
});

test('Spanish season completes and produces standings', () => {
  const season = Season.createSeason('es-iberica-men', 'season-test');
  assert.equal(season.schedule.length, 34);
  Season.playRegularSeason(season, 'season-test');
  assert.equal(season.round, 34);
  const table = Season.standings(season.clubs);
  assert.equal(table.length, 18);
  assert.ok(table.every(r => r.wins + r.losses === 34));
  assert.ok(Season.hashSeason(season).length === 8);
});

test('promotion/relegation moves two clubs each way', () => {
  const top = Season.createSeason('es-iberica-men', 'pr-top');
  const second = Season.createSeason('es-ascenso-iberico', 'pr-second');
  Season.playRegularSeason(top, 'pr-top');
  Season.playRegularSeason(second, 'pr-second');
  const move = Season.euPromotionRelegation(top, second);
  assert.equal(move.relegated.length, 2);
  assert.equal(move.promoted.length, 2);
  assert.ok(move.relegated.every(id => id.startsWith('es-iberica-men')));
  assert.ok(move.promoted.every(id => id.startsWith('es-ascenso-iberico')));
});

test('draft lottery has 14 teams and two rounds produce 60 picks', () => {
  const worst = Array.from({ length: 14 }, (_, i) => 'L' + i);
  const order = Draft.draftOrder(Draft.lotteryOrder(worst, 'lottery'), Array.from({ length: 16 }, (_, i) => 'P' + i));
  assert.equal(order.round1.length, 30);
  const draft = Draft.runDraft({ seed: 'draft-test', order });
  assert.equal(draft.picks.length, 60);
  assert.ok(draft.undrafted.length > 0);
  assert.equal(draft.picks[0].overall, 1);
  assert.equal(draft.picks[59].overall, 60);
});
