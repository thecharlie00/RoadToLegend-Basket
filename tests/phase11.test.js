'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');
const National = require('../src/domain/national.js');

test('club mode: found a club, upgrade facilities, real weekly finances and a board report', () => {
  let s = Career.createCareer({ seed: 'club-t', mode: 'coach', leagueId: 'es-ascenso-iberico', newClub: { name: 'Cerdanyola Aro', abbr: 'CDA', primary: '#ff7a1f', secondary: '#0b0d1c' } });
  const club = s.season.clubsById[s.clubId];
  assert.equal(club.name, 'Cerdanyola Aro'); assert.equal(club.custom.abbr, 'CDA');
  const cash0 = s.clubFin.cash;
  Career.clubOp(s, { op: 'upgrade', key: 'arena' });
  assert.equal(s.clubFin.fac.arena, 2); assert.ok(s.clubFin.cash < cash0);
  assert.throws(() => Career.clubOp(s, { op: 'upgrade', key: 'casino' }), /bad facility/);
  Career.simSeason(s); s = Career.resume(Career.serialize(s));
  const rep = s.clubFin.lastReport;
  assert.ok(rep && rep.tv > 0 && rep.wages > 0 && typeof rep.met === 'boolean');
  assert.equal(s.season.clubsById[s.clubId].name, 'Cerdanyola Aro');
});

test('cup at mid-season and national team windows plus a summer tournament', () => {
  let s = Career.createCareer({ seed: 'cup-nat', mode: 'player', leagueId: 'es-iberica-men', pos: 'SG', nationality: 'ID' }); // corte bajo: convocado
  Career.simSeason(s); s = Career.resume(Career.serialize(s));
  assert.ok(s.history[0].cup, 'cup winner recorded');
  assert.ok(s.national.caps >= 2);
  assert.equal(National.tournamentOf(2027, 'men'), 'world');
  assert.equal(National.tournamentOf(2028, 'women'), 'games');
  assert.equal(National.tournamentOf(1936, 'women'), null);
  assert.ok(s.national.last && s.national.last.year === 2027);
});

test('challenges award a medal; editor renames persist; quick career ends after ten seasons', () => {
  let s = Career.createCareer({ seed: 'chal-t', challenge: 'save' });
  assert.equal(s.mode, 'coach'); assert.equal(s.challenge.id, 'save');
  Career.editOp(s, { op: 'club', id: s.clubId, name: 'Mi Equipo' });
  Career.simSeason(s); s = Career.resume(Career.serialize(s));
  assert.ok(['gold', 'silver', 'bronze', 'none'].includes(s.challenge.medal));
  assert.equal(s.season.clubsById[s.clubId].name, 'Mi Equipo');
  let q = Career.createCareer({ seed: 'quick-t', mode: 'coach', route: 'eu-academy', quick: true });
  for (let i = 0; i < 10 && !q.careerOver; i++) Career.simSeason(q);
  assert.ok(q.careerOver && q.quickEnd);
  assert.ok(q.season.clubs.every(c => c.roster.length >= 12), 'rosters refilled every summer');
});

const Season = require('../src/domain/season.js');
const Names = require('../src/domain/names.js');
test('all the basketball world: 200+ fictional leagues in 140+ countries, every one playable', () => {
  const all = Season.leagueList();
  assert.ok(all.length >= 200, 'leagues ' + all.length);
  assert.ok(new Set(all.map(l => l.country)).size >= 140);
  assert.ok(all.filter(l => l.gender === 'f').length >= 60);
  for (const l of all) {
    const s = Season.createSeason(l.id, 'world-all');
    assert.equal(s.clubs.length, l.teams, l.id);
    assert.ok(s.clubs.every(c => c.roster.length >= 10), l.id);
  }
  assert.ok(!/^(Indigo|Alex|Blair|Casey)\b/.test(Names.generateName('x', 'UA').first), 'regional name pools');
});

test('a new national league and a college league play a full season', () => {
  for (const id of ['ru-nacional-men', 'us-universitaria-women']) {
    let s = Career.createCareer({ seed: 'w-' + id, mode: 'player', leagueId: id, pos: 'PG' });
    Career.simSeason(s); s = Career.resume(Career.serialize(s));
    assert.equal(s.year, 2027, id);
    assert.ok(s.history[0].champion, id);
  }
});
