'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');
const Season = require('../src/domain/season.js');
const EraW = require('../src/domain/era-world.js');

test('era careers use generated players, never present-day real rosters', () => {
  const s = Career.createCareer({ seed: 'ew-1', mode: 'coach', eraYear: 1972, leagueId: 'es-iberica-men' });
  const names = s.season.clubs.flatMap(c => c.roster.map(p => p.name)).join('|');
  assert.ok(!/Campazzo|Cammpazzo|Hezonja|Llull/i.test(names));
});

test('era competitions exist only in their years, with era names and qualification by league rank', () => {
  const es = Season.LEAGUES['es-iberica-men'];
  const ids = y => EraW.compsFor(es, y).map(c => c.id + ':' + c.nameKey);
  assert.deepEqual(ids(1960), ['euro-champions:comp.euroCup']);
  assert.ok(ids(1975).includes('korac:comp.korac') && ids(1975).includes('cup-winners:comp.cupWinners'));
  assert.ok(ids(2010).includes('eurocup:comp.eurocup') && !ids(2010).some(x => x.startsWith('korac')));
  assert.ok(ids(2010).includes('euro-champions:comp.euroLeague'));
  const s = Career.createCareer({ seed: 'ew-2', mode: 'coach', eraYear: 1975, leagueId: 'es-iberica-men' });
  const table = Season.standings(s.season.clubs).map(x => Object.assign({}, x));
  table.find(x => x.id === s.clubId).id = 'x'; table.find(x => x.rank === 1).id = s.clubId;
  const out = EraW.continental(s, table);
  assert.equal(out[0].nameKey, 'comp.euroCup'); assert.equal(out[0].real, 'Ignis Varese');
  assert.ok(['champion', 'final', 'r4', 'r2'].includes(out[0].stage) || /^r\d+$/.test(out[0].stage));
});

test('yearbook compares with the real champion (franchise lineage) and Israeli titles are not shown', () => {
  assert.equal(EraW.REAL['na-boreal-men'][1950], 'Minneapolis Lakers');
  assert.equal(EraW.lineage('Minneapolis Lakers'), 'Los Angeles Lakers');
  assert.equal(EraW.REAL['eu-cup-m'][1977], undefined);
  assert.equal(EraW.REAL['eu-cup-m'][2026], 'Olympiacos');
  const s = Career.createCareer({ seed: 'ew-3', mode: 'coach', eraYear: 1985, leagueId: 'es-iberica-men' });
  const e = EraW.annual(s, 'Real Madrid');
  assert.equal(e.real, 'Real Madrid'); assert.equal(e.diverged, false);
});

test('legend moments score 0-4 stars, keep the best, and feed the decade album', () => {
  const s = Career.createCareer({ seed: 'ew-4', mode: 'player', eraYear: 1992, leagueId: 'es-iberica-men', pos: 'PG' });
  const ms = EraW.momentsFor(s); assert.equal(ms.length, 3);
  let best = 0;
  for (let i = 0; i < 4; i++) { const r = Career.worldOp(s, { op: 'era-moment', id: ms[0].id, tactic: 'run' }); assert.ok(r.stars >= 0 && r.stars <= 4); best = Math.max(best, r.stars); assert.equal(r.best, best); }
  const al = EraW.album(s); assert.ok(al.total >= 20); assert.equal(al.cards.find(c => c.id === 'moment:' + ms[0].id).ok, best >= 1);
});

test('foreign player limit before Bosman (Europe), none after 1996 or in North America', () => {
  const s = Career.createCareer({ seed: 'ew-5', mode: 'coach', eraYear: 1985, leagueId: 'es-iberica-men' });
  assert.equal(EraW.foreignLimit(s), 2);
  const n = Career.createCareer({ seed: 'ew-6', mode: 'coach', eraYear: 1999, leagueId: 'es-iberica-men' });
  assert.equal(EraW.foreignLimit(n), null);
});
