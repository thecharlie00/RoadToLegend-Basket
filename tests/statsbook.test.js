'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');

function run(mode, weeks) {
  const st = Career.createCareer({ mode, seed: 'book-' + mode, route: 'world', leagueId: 'es-iberica-men', jm: false });
  let guard = 0, w = 0;
  while (!st.lastSeasonSummary && guard++ < 120 && (weeks == null || w < weeks)) {
    Career.advanceWeek(st, { type: 'play' }); w++;
    const ev = st.life && st.life.pendingEvent;
    if (ev && ev.options) Career.chooseEvent(st, ev.options[0].id);
  }
  return st;
}

test('libro de estadísticas: partido a partido, mapa de tiro y carrera por los premios', () => {
  const st = run('player', 8);
  const sum = Career.summary(st);
  assert.ok(sum.book.log.length >= 5, 'hay partidos en el registro');
  const played = sum.book.log.filter(g => !g.dnp);
  assert.ok(played.length >= 1);
  for (const g of played) { assert.ok(g.pts >= 0 && g.fga >= g.fgm && g.opp); }
  const att = sum.book.zones.reduce((a, z) => a + z.att, 0);
  const fga = played.reduce((a, g) => a + g.fga, 0);
  assert.equal(att, fga, 'el mapa de tiro cuadra con los tiros de campo');
  assert.equal(sum.book.zones.length, 6);
  assert.ok(sum.awardRace && sum.awardRace.length >= 4, 'carrera por los premios en temporada regular');
  for (const r of sum.awardRace) assert.ok(r.top.length >= 1 && r.top[0].rank === 1);
});

test('libro de estadísticas: progresión por temporadas y modo entrenador', () => {
  const st = run('player');
  const b = st.life.book;
  assert.equal(b.seasons.length, 1);
  assert.ok(b.seasons[0].gp >= 0 && 'ovr' in b.seasons[0]);
  const co = run('coach', 4);
  const log = Career.summary(co).book.log;
  assert.ok(log.length >= 3 && log.every(g => g.top));
});

test('simular hasta la próxima decisión: se para en algo que decidir y nunca elige por ti', () => {
  const st = Career.createCareer({ mode: 'player', seed: 'simd', route: 'world', leagueId: 'es-iberica-men', jm: false });
  const sim = Career.simToDecision(st);
  assert.ok(sim.weeks >= 0 && sim.weeks <= 12);
  assert.ok(['limit', 'event', 'season', 'jm', 'injury', 'offer', 'playoffs', 'end'].includes(sim.reason));
  if (sim.reason === 'event') {
    assert.ok(st.life.pendingEvent, 'el evento queda pendiente');
    const again = Career.simToDecision(st);
    assert.equal(again.weeks, 0, 'con una decisión pendiente no avanza');
  }
  const jm = Career.createCareer({ mode: 'player', seed: 'simd-jm', route: 'world', leagueId: 'es-iberica-men', jm: true });
  const Content = require('../src/domain/content.js');
  let r = null;
  for (let i = 0; i < 12; i++) { r = Career.simToDecision(jm); if (r.reason === 'jm') break; const v = Content.pendingView(jm); if (v) Career.chooseEvent(jm, v.options[0].id); }
  assert.equal(r.reason, 'jm', 'se para antes de la Jugada Maestra');
});

test('pedir el traspaso: determinista, una vez por temporada, oferta al mercado o confianza a la baja', () => {
  const mk = () => Career.createCareer({ mode: 'player', seed: 'trade', route: 'world', leagueId: 'es-iberica-men', jm: false });
  const a = mk(), b = mk();
  const target = require('../src/domain/season.js').clubCatalog('es-iberica-men').find(c => c.id !== a.clubId);
  const ra = Career.requestTrade(a, { leagueId: 'es-iberica-men', clubId: target.id });
  const rb = Career.requestTrade(b, { leagueId: 'es-iberica-men', clubId: target.id });
  assert.equal(ra.accepted, rb.accepted, 'mismo resultado con la misma semilla');
  assert.throws(() => Career.requestTrade(a, { leagueId: 'es-iberica-men', clubId: target.id }), /already requested/);
  if (ra.accepted) { const o = a.market.find(m => m.requested); assert.ok(o && o.crossing.clubId === target.id); }
  else assert.ok(a.player.coachTrust < 55 || a.player.coachTrust === 0);
  assert.throws(() => Career.requestTrade(mk(), { leagueId: 'es-iberica-men', clubId: a.clubId }), /already in that club/);
  const c = Career.tradeChance(a, 'es-iberica-men'); assert.ok(c >= 0.05 && c <= 0.9);
});
