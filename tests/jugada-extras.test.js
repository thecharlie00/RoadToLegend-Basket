'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const J = require('../src/match/jugada.js');

test('desafío diario: determinista por fecha, con solución y tercera estrella posible', () => {
  for (const d of ['2026-11-26', '2026-11-27', '2027-01-01', '2027-02-14']) {
    const a = J.daily(d), b = J.daily(d);
    assert.deepEqual(a, b);
    assert.ok(a.par >= 2 && a.par <= a.max);
    const r = J.solveState(a, a.max, c => J.bonusMet(c));
    assert.ok(r, 'third star reachable on ' + d);
    const s = JSON.parse(JSON.stringify(a)); J.replay(s, r.actions);
    assert.equal(J.result(s).medal, r.actions.length <= a.par ? 3 : 2);
  }
  assert.notDeepEqual(J.daily('2026-11-26').ball, J.daily('2026-11-27').ball);
});

test('pista: seguir las pistas desde el principio gana todas las jugadas de la historia', () => {
  for (const l of J.levels()) {
    const s = J.fresh(l.id);
    let guard = 0;
    while (!s.done && guard++ < 8) { const h = J.hint(s); assert.ok(h, 'hint for ' + l.id); J.resolve(s, h.action); }
    assert.ok(s.won, l.id + ' won by hints');
  }
});

test('deshacer: rehacer sin la última acción deja el mismo estado que antes de hacerla', () => {
  const s = J.fresh('jm-07'), start = JSON.parse(JSON.stringify(s));
  const h1 = J.hint(s); J.resolve(s, h1.action);
  const mid = JSON.parse(JSON.stringify(s));
  J.resolve(s, { k: 'shot' });
  const back = J.replay(JSON.parse(JSON.stringify(start)), [h1.action]);
  assert.deepEqual(back, mid);
});

test('dificultad entre 1 y 3 y variada', () => {
  const d = J.levels().map(l => J.difficulty(l.id));
  assert.ok(d.every(x => x >= 1 && x <= 3));
  assert.ok(new Set(d).size === 3);
});
