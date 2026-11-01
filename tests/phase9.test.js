'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');
const Content = require('../src/domain/content.js');
const Season = require('../src/domain/season.js');
const Names = require('../src/domain/names.js');

const run = s => {
  let g = 0; const y = s.year;
  while (s.year === y && !(s.retirement && s.retirement.pending) && g++ < 200) {
    if (s.life && s.life.pendingEvent) Career.chooseEvent(s, Career.summary(s).event.options[0].id);
    const st = Career.summary(s).playoffs;
    Career.advanceWeek(s, { type: st && !st.done && !['playing', 'waiting'].includes(st.status) ? 'skipPlayoffs' : 'play' });
    s = Career.resume(Career.serialize(s));
  }
  return s;
};

test('world catalog: every continent, men and women, complete and unique fictional clubs', () => {
  const all = Season.leagueList();
  assert.ok(all.length >= 25);
  for (const c of ['europe', 'americas', 'asia', 'oceania', 'africa']) assert.ok(all.some(l => l.continent === c && l.gender === 'm'), 'men in ' + c);
  for (const c of ['europe', 'americas', 'asia', 'oceania']) assert.ok(all.some(l => l.continent === c && l.gender === 'f'), 'women in ' + c);
  const banned = /\b(NBA|WNBA|ACB|Euro ?League|EuroCup|FIBA Europe|Telekom|Brose|Liberty|Aces|Lynx|Sparks|Mystics|Fever|Evessa|Albirex|Brex|Wildcats|Zvezda|Partizan|Olympiacos|Panathinaikos|Fenerbah|Efes|Real Madrid|Barça)\b/i;
  for (const l of all) {
    const names = Season.clubCatalog(l.id).map(c => c.name);
    assert.equal(names.length, l.teams, l.id);
    assert.equal(new Set(names).size, names.length, 'unique names in ' + l.id);
    assert.ok(!banned.test(l.name) && names.every(n => !banned.test(n)), 'no real brands in ' + l.id);
  }
});

test('women leagues have women players with female names and validate after resume', () => {
  for (const id of Season.leagueList('f').map(l => l.id)) {
    const s = Career.createCareer({ seed: 'w-' + id, mode: 'player', leagueId: id, pos: 'PG' });
    assert.equal(s.player.gender, 'women');
    assert.ok(s.season.clubs.every(c => c.roster.every(p => p.gender === 'women')), id);
    assert.ok(Career.validate(Career.resume(Career.serialize(s))).ok, id);
  }
  const first = Names.generateName('x', 'ES', 'f').first;
  assert.ok(Names.FEMALE.ES.includes(first));
});

test('any world league plays a full season with playoffs, world champions and resume', () => {
  let s = Career.createCareer({ seed: 'world-season', mode: 'player', leagueId: 'au-austral-women', pos: 'SG' });
  s = run(s);
  assert.equal(s.year, 2027);
  const sm = Career.summary(s);
  assert.ok(sm.world.champions.length >= 25);
  assert.ok(s.history[0].champion);
});

test('transfers: immediate before the first game, deferred to the summer otherwise; categories never mix', () => {
  let s = Career.createCareer({ seed: 'move', mode: 'player', leagueId: 'es-iberica-women', pos: 'PG' });
  Career.exploreCrossing(s, 'na-boreal-women');
  Career.signOffer(s, s.market.findIndex(m => m.crossing));
  assert.equal(s.season.leagueId, 'na-boreal-women');
  assert.ok(s.season.clubsById[s.clubId].roster.some(p => p.id === s.player.id));
  Career.advanceWeek(s, { type: 'play' });
  Career.exploreCrossing(s, 'fr-hexagone-women');
  Career.signOffer(s, s.market.findIndex(m => m.crossing));
  assert.equal(s.season.leagueId, 'na-boreal-women');
  s = run(s);
  assert.equal(s.season.leagueId, 'fr-hexagone-women');
  assert.throws(() => Career.exploreCrossing(s, 'fr-hexagone-men'), /another category/);
});

test('moving into the Spanish pyramid keeps the two linked leagues', () => {
  const s = Career.createCareer({ seed: 'move-es', mode: 'player', leagueId: 'jp-sakura-men', pos: 'C' });
  Career.exploreCrossing(s, 'es-iberica-men');
  Career.signOffer(s, s.market.findIndex(m => m.crossing));
  assert.equal(s.season.leagueId, 'es-iberica-men');
  assert.equal(s.topSeason.leagueId, 'es-ascenso-iberico');
  assert.ok(Career.validate(Career.resume(Career.serialize(s))).ok);
});

test('dynasty: a daughter takes over in a women league of the same country', () => {
  let s = Career.createCareer({ seed: 'daughter', mode: 'player', route: 'eu-academy', pos: 'SG' });
  Career.familySetup(s, { kind: 'parent' });
  s.family.children[0].gender = 'f';
  Content.applyEffects(s, { flag: 'farewell' });
  s = run(s);
  Career.afterRetirement(s, { choice: 'heir', pos: 'SF' });
  assert.equal(s.player.gender, 'women');
  assert.equal(s.season.leagueId, 'es-ascenso-women');
  assert.equal(s.topSeason.leagueId, 'es-iberica-women');
  assert.ok(Career.validate(Career.resume(Career.serialize(s))).ok);
});
