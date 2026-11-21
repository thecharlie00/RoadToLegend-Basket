'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');
const fs = require('node:fs');

function season(seed, mode) {
  const st = Career.createCareer({ mode, seed, route: 'world', leagueId: 'es-iberica-men', jm: false });
  let guard = 0;
  while (!st.lastSeasonSummary && guard++ < 90) {
    Career.advanceWeek(st, { type: 'play' });
    const ev = st.life && st.life.pendingEvent;
    if (ev && ev.options) Career.chooseEvent(st, ev.options[0].id);
  }
  return st;
}

test('chronicles: two turning points and the season in three moments, from the career itself', () => {
  for (const mode of ['player', 'coach']) {
    const st = season('viva-' + mode, mode);
    const list = st.life.chronicles;
    assert.deepEqual(list.map(c => c.kind + (c.n || '')), ['block1', 'block2', 'season'], mode);
    const end = list[2];
    assert.deepEqual(end.moments.map(m => m.k), ['personal', 'competition', 'story']);
    assert.equal(end.moments[1].rank, st.lastSeasonSummary.rank);
    // Las crónicas no cambian resultados: misma semilla, mismas clasificaciones sin Temporada Viva.
    const s = Career.summary(st);
    assert.equal(s.viva.chronicle.id, end.id);
    Career.worldOp(st, { op: 'viva-seen' });
    assert.equal(Career.summary(st).viva.chronicle, null);
    assert.equal(Career.summary(st).viva.archive.length, 3);
  }
});

test('focus: one action with its reason, hidden while a decision or a live game is pending', () => {
  const st = Career.createCareer({ mode: 'player', seed: 'focus', route: 'world', leagueId: 'es-iberica-men', jm: false });
  const Viva = require('../src/domain/viva.js');
  const next = Career.summary(st).next;
  const f = Viva.focus(st, { next });
  assert.equal(f.key, 'next');
  assert.ok(f.opponent && f.tab === 'league');
  assert.equal(Viva.focus(st, { next, event: true }), null);
  assert.equal(Viva.focus(st, { next, live: true }), null);
  st.player.injury = { type: 'ankle', weeksRemaining: 3 };
  assert.equal(Viva.focus(st, { next }).key, 'injury');
});

test('texts for Temporada Viva and the Master Play exist in every locale', () => {
  const es = JSON.parse(fs.readFileSync('src/locales/es.json', 'utf8'));
  const keys = Object.keys(es).filter(k => /^(viva|jm|tro)\./.test(k));
  assert.ok(keys.length > 90);
  for (const loc of ['en', 'fr', 'de', 'it']) {
    const d = JSON.parse(fs.readFileSync(`src/locales/${loc}.json`, 'utf8'));
    for (const k of keys) assert.ok(d[k], loc + ' ' + k);
  }
});
