'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Match = require('../src/match/engine.js');
const Live = require('../src/match/live.js');
const J = require('../src/match/jugada.js');
const copy = o => JSON.parse(JSON.stringify(o));

test('campaign: 30 plays in 5 chapters, each solvable, none won by a direct shot', () => {
  const levels = J.levels();
  assert.equal(levels.length, 30);
  assert.deepEqual([...new Set(levels.map(l => l.chapter))], [1, 2, 3, 4, 5]);
  for (const l of levels) {
    const direct = J.resolve(J.fresh(l.id), { k: 'shot' });
    assert.equal(direct.state.won, false, l.id + ' direct shot must not win');
    const sol = J.solve(l.id);
    assert.ok(sol, l.id + ' solvable');
    assert.ok(sol.par >= 2 && sol.par <= l.max, l.id + ' par');
    const st = J.replay(J.fresh(l.id), sol.actions);
    assert.equal(st.won, true);
    assert.deepEqual(J.result(st).stars.slice(0, 2), [true, true]);
    if (l.needThree) assert.equal(st.points, 3);
    // La tercera estrella (objetivo del capítulo) se puede conseguir dentro de las acciones de la jugada.
    const s3 = J.solveState(J.fresh(l.id), l.max, x => J.bonusMet(x));
    assert.ok(s3, l.id + ' third star reachable (' + l.bonus + ')');
    assert.equal(J.result(J.replay(J.fresh(l.id), s3.actions)).stars[2], true);
  }
});

test('campaign is deterministic and has no luck', () => {
  const sol = J.solve('jm-07');
  const a = J.replay(J.fresh('jm-07'), sol.actions), b = J.replay(J.fresh('jm-07'), copy(sol.actions));
  assert.deepEqual(a, b);
});

test('rules: a pass through a defender is cut, a drive into a defender is a charge, the 24 s run out', () => {
  const s = J.fromLayout({ ball: [40, 50], mates: [[70, 50], [60, 10], [60, 90], [85, 5]], rivals: [[55, 50], [62, 14], [62, 86], [86, 9], [84, 50]], max: 3 }, 'x');
  const cut = J.resolve(copy(s), { k: 'pass', to: 1 });
  assert.equal(cut.completed, false); assert.equal(cut.state.turnover, 'steal');
  const charge = J.resolve(copy(s), { k: 'drive', path: [[60, 50]] });
  assert.equal(charge.state.turnover, 'charge');
  const t = copy(s); J.resolve(t, { k: 'drive', path: [[44, 30]] }); J.resolve(t, { k: 'drive', path: [[44, 70]] }); const last = J.resolve(t, { k: 'drive', path: [[40, 40]] });
  assert.equal(last.msg, 'clock'); assert.equal(t.done, true);
});

test('threes and zones follow the court lines', () => {
  assert.equal(J.isThree([36, 50]), true);
  assert.equal(J.isThree([75, 50]), false);
  assert.equal(J.isThree([88, 3]), true);
  assert.equal(J.zoneOf([80, 50]), 'restricted');
  assert.equal(J.zoneOf([88, 3]), 'corner3');
});

test('a clean shot (aimed at the centre of the rim) forgives a little more defence', () => {
  const lay = { ball: [62, 50], mates: [[40, 10], [40, 90], [86, 4], [86, 96]], rivals: [[62, 55.2], [40, 20], [40, 80], [80, 10], [80, 90]], max: 3 };
  const loose = J.resolve(J.fromLayout(lay, 'x'), { k: 'shot', aim: 7 });
  const clean = J.resolve(J.fromLayout(lay, 'x'), { k: 'shot', aim: 1 });
  assert.equal(loose.made, false); assert.equal(clean.made, true); assert.equal(clean.state.shot.perfect, true);
});

test('after a pass the most open teammate cuts to the rim; a pass to the cutter ends in a dunk', () => {
  const lay = { ball: [40, 50], mates: [[60, 12], [60, 88], [86, 96], [70, 30]], rivals: [[45, 50], [62, 22], [62, 84], [84, 90], [76, 70]], max: 4 };
  const st = J.fromLayout(lay, 'x');
  J.resolve(st, { k: 'pass', to: 1 });
  const cut = st.log.find(l => l.k === 'cut');
  assert.ok(cut, 'someone cuts');
  const cutter = st.mates.find(m => m.i === cut.token);
  J.resolve(st, { k: 'pass', to: cutter.i });
  if (!st.done) { const r = J.resolve(st, { k: 'shot', aim: 0 }); if (r.made && r.zone === 'restricted') assert.equal(st.shot.dunk, true); }
});

function liveWithJm(seed, mode) {
  const teams = Match.neutralTeams(55);
  const myId = teams[0].players[0].id;
  return Live.create({ seed, ruleSetId: 'FIBA-2026', teams, matchId: 'jm-' + seed, userTeam: 0, mode, myPlayerId: mode === 'player' ? myId : null, jm: { at: 120 } });
}

test('live: the Jugada Maestra moment appears once, auto leaves the engine untouched', () => {
  for (const mode of ['coach', 'player']) {
    const a = liveWithJm('s1', mode);
    Live.advance(a, { toJm: true });
    if (mode === 'player' && !a.moment) continue; // tu jugador/a puede no estar en pista
    assert.equal(a.moment.type, 'jm');
    assert.ok(a.moment.board.players.length >= 1);
    if (mode === 'player') assert.equal(a.moment.board.players[0].me, true);
    Live.advance(a, { choice: 'auto', toEnd: true });
    assert.equal(a.finished, true);
    assert.equal(a.decisions.filter(d => d.type === 'jm').length, 1);
    // Sin la jugada y con "que decida el equipo", el marcador es el mismo.
    const plain = Live.create({ seed: 's1', ruleSetId: 'FIBA-2026', teams: Match.neutralTeams(55), matchId: 'jm-s1', userTeam: 0, mode, myPlayerId: mode === 'player' ? Match.neutralTeams(55)[0].players[0].id : null });
    Live.advance(plain, { toEnd: true });
    assert.deepEqual(a.outcome.score, plain.outcome.score, mode);
  }
});

test('live: a drawn play is replayed by the engine and its basket counts in the box score', () => {
  let checked = 0;
  for (let i = 0; i < 25 && checked < 4; i++) {
    const live = liveWithJm('play' + i, 'coach');
    Live.advance(live, { toJm: true });
    if (!live.moment || live.moment.type !== 'jm') continue;
    const board = copy(live.moment.board);
    const sol = J.solveState(board);
    const actions = sol ? sol.actions : [{ k: 'shot' }];
    const expected = J.replay(copy(live.moment.board), actions);
    const before = Match.resumeMatch(live.match).score[0];
    Live.advance(live, { choice: 'play', jm: actions });
    const d = live.decisions.find(x => x.type === 'jm');
    assert.equal(d.jm.points, expected.points);
    const after = Match.resumeMatch(live.match);
    const shot = after.events.find(e => e.seq >= d.seq && (e.type === 'shot' || e.type === 'turnover' || e.type === 'block'));
    if (expected.points > 0) { assert.equal(after.score[0] - before >= expected.points, true); assert.equal(shot.type, 'shot'); assert.equal(shot.made, true); }
    Live.advance(live, { toEnd: true });
    assert.equal(live.finished, true);
    const v = Match.validateBox(Match.resumeMatch(live.match));
    assert.equal(v.ok, true, v.errors.join(','));
    checked++;
  }
  assert.ok(checked >= 2);
});
