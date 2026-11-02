'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Haptic = require('../src/platform/haptics.js');
const Crest = require('../src/render/crest.js');

test('haptics fire only when enabled and supported', () => {
  const calls = [];
  const win = { navigator: { vibrate: pattern => { calls.push(pattern); return true; } } };
  assert.equal(Haptic.pulse(win, 'tap'), true);
  assert.deepEqual(calls[0], [8]);
  assert.equal(Haptic.pulse(win, 'tap', false), false);
  assert.equal(calls.length, 1);
  assert.equal(Haptic.pulse({ navigator: {} }, 'tap'), false);
  assert.equal(Haptic.pulse({}, 'tap'), false);
});

test('haptics never throw and fall back to tap', () => {
  const win = { navigator: { vibrate: () => { throw new Error('denied'); } } };
  assert.equal(Haptic.pulse(win, 'success'), false);
  const calls = [];
  Haptic.pulse({ navigator: { vibrate: p => { calls.push(p); return true; } } }, 'unknown');
  assert.deepEqual(calls[0], Haptic.PATTERNS.tap.slice());
});

test('haptic patterns stay discrete and immutable', () => {
  for (const pattern of Object.values(Haptic.PATTERNS)) {
    assert.ok(pattern.length >= 1 && pattern.length <= 4);
    for (const ms of pattern) assert.ok(ms > 0 && ms <= 80);
  }
  const received = [];
  Haptic.pulse({ navigator: { vibrate: p => { received.push(p); return true; } } }, 'buzzer');
  received[0].push(9999);
  assert.deepEqual(Haptic.PATTERNS.buzzer, [60]);
});

test('crest colours follow custom, known and deterministic fallbacks', () => {
  assert.deepEqual(Crest.colors({ name: 'Real Madrid' }), ['#ffffff', '#5b2a86']);
  assert.deepEqual(Crest.colors({ name: 'Club Inventado', custom: { primary: '#112233', secondary: '#445566' } }), ['#112233', '#445566']);
  assert.deepEqual(Crest.colors({ name: 'Club Inventado' }), Crest.colors({ name: 'Club Inventado' }));
  for (const colour of Crest.colors({ name: 'Otro Club' })) assert.match(colour, /^#[0-9a-f]{6}$/i);
});

test('shot points come from the zone, so missed threes still count as three-point attempts', () => {
  const Live = require('../src/match/live.js');
  assert.equal(Live.shotPoints({ type: 'shot', zone: 'corner3', made: false, points: 0 }), 3);
  assert.equal(Live.shotPoints({ type: 'shot', zone: 'above3', made: true, points: 3 }), 3);
  assert.equal(Live.shotPoints({ type: 'shot', zone: 'paint', made: false, points: 0 }), 2);
  assert.equal(Live.shotPoints({ type: 'shot', zone: 'restricted', made: true, points: 2 }), 2);
  assert.equal(Live.shotPoints({ type: 'ft', points: 1 }), 0);
  assert.equal(Live.shotPoints(null), 0);
  const Engine = require('../src/match/engine.js');
  const match = Engine.simulateMatch({ seed: 'three-point-audit', ruleSetId: 'FIBA-2026', matchId: 'audit' });
  const shots = match.events.filter(e => e.type === 'shot');
  const attempts = shots.filter(e => Live.shotPoints(e) === 3);
  const makes = attempts.filter(e => e.made);
  assert.ok(attempts.length > 10, 'the sample should include three-point attempts');
  assert.ok(makes.length < attempts.length, 'three-point attempts must include misses');
  assert.ok(makes.length / attempts.length < 0.75, 'three-point percentage must be plausible');
});

// ===== Minijuegos: cada uno con su propia mecánica y su propio medidor =====
test('every minigame has a distinct input mechanic, not just a different skin', () => {
  globalThis.CAA = globalThis.CAA || {};
  const Arcade = require('../src/match/arcade.js');
  const motions = new Set(Arcade.TYPES.map(t => Arcade.GAMES[t].motion));
  assert.equal(motions.size, 5, 'bounce, sweep, rise, beat and react are genuinely different inputs');
  assert.equal(Arcade.GAMES.freeThrow.motion, 'bounce');
  assert.equal(Arcade.GAMES.three.motion, 'sweep');
  assert.equal(Arcade.GAMES.buzzer.motion, 'rise');
  assert.equal(Arcade.GAMES.dunk.motion, 'beat');
  assert.equal(Arcade.GAMES.defense.motion, 'react');
  assert.equal(Arcade.GAMES.street.motion, 'bounce', 'street uses lanes, but its cursor still bounces');
  assert.ok(Arcade.GAMES.street.read);
});

test('defense is a reaction test: guessing early scores zero, reacting on cue scores high', () => {
  const Arcade = require('../src/match/arcade.js');
  const spec = Arcade.roundSpec('defense', 'reaction:hard', 0, 0);
  assert.ok(spec.cueTick > 0 && spec.reaction > 0);
  assert.equal(Arcade.quality(spec, 0), 0, 'pressing before the rival moves must fail');
  assert.equal(Arcade.quality(spec, spec.cueTick), 1);
  assert.equal(Arcade.quality(spec, spec.cueTick + spec.reaction), 0);
  const q = t => Arcade.quality(spec, t);
  assert.ok(q(spec.cueTick + Math.round(spec.reaction * 0.3)) > q(spec.cueTick + Math.round(spec.reaction * 0.8)));
});

test('buzzer shot is a single rise: the horn kills the attempt and the top of the meter is the sweet spot', () => {
  const Arcade = require('../src/match/arcade.js');
  const spec = Arcade.roundSpec('buzzer', 'buzzer', 0, 0);
  const best = Arcade.centerTick(spec);
  assert.ok(best > spec.periodTicks * 0.7, 'best release is near the top of the rise');
  assert.ok(Arcade.quality(spec, best) > 0.9);
  assert.equal(Arcade.quality(spec, spec.periodTicks + 1), 0, 'after the horn the shot cannot score');
  const late = Arcade.resolveRound('buzzer', 'buzzer', 0, spec.periodTicks + 10, {}, 0);
  assert.equal(late.made, false);
});

test('three-point contest is played in racks and the money ball is worth two', () => {
  const Arcade = require('../src/match/arcade.js');
  const g = Arcade.GAMES.three;
  assert.equal(g.rounds, 25); assert.equal(g.rack, 5);
  assert.equal(g.points(4), 2); assert.equal(g.points(3), 1); assert.equal(g.points(9), 2);
  const spec = Arcade.roundSpec('three', 'rack', 0, 0);
  assert.equal(spec.rack, 5);
  assert.ok(Arcade.GAMES.three.period < Arcade.GAMES.freeThrow.period, 'racks sweep faster than free throws');
});

test('dunk is scored in three-beat dunks by judges, with a rhythm bonus', () => {
  const Arcade = require('../src/match/arcade.js');
  const g = Arcade.GAMES.dunk;
  assert.equal(g.rounds, 6);
  const r = Arcade.resolveRound('dunk', 'dunk', 0, Arcade.centerTick(Arcade.roundSpec('dunk', 'dunk', 0, 0)), { mate: 60, salto: 60 }, 0);
  assert.equal(r.beat, 0); assert.equal(r.dunk, 0);
  assert.ok(r.judge >= 5 && r.judge <= 10);
  const res = Arcade.play('dunk', 'dunk', Arcade.autoTicks('dunk', 'dunk', { mate: 60, salto: 60 }), { mate: 60, salto: 60 });
  assert.ok(res.score > 30 && res.score <= g.max * 2, 'two dunks summed by judges');
  assert.ok(res.results.every(x => x.dunkScore > 0));
});

test('street ball alternates offense and defense, mirrors the defender lean and ends at seven', () => {
  const Arcade = require('../src/match/arcade.js');
  const o = Arcade.roundSpec('street', 'park', 0, 0), d = Arcade.roundSpec('street', 'park', 1, 0);
  assert.equal(o.mode, 'offense'); assert.equal(d.mode, 'defense');
  assert.equal(o.lean, d.lean, 'the same defender stays leaning the same way for the pair');
  assert.ok(Math.abs(o.center - d.center) > 0.4, 'attack and defense target opposite lanes');
  const attrs = { manejo: 90, tiroMedia: 90, defExterior: 90 };
  const ticks = Array.from({ length: 13 }, (_, i) => Arcade.centerTick(Arcade.roundSpec('street', 'park', i, 0)));
  const res = Arcade.play('street', 'park', ticks, attrs);
  assert.ok(res.complete); assert.equal(res.won, true);
  assert.equal(res.won, res.score > res.opponent);
  assert.ok(res.results.length <= 13);
  if (res.score >= 7 || res.opponent >= 7) assert.ok(res.results.length < 13, 'the game stops as soon as someone reaches seven');
});

test('2D renderer draws every mechanic without throwing and labels the reaction cue', () => {
  const Arcade = require('../src/match/arcade.js');
  const Arcade2D = require('../src/render/arcade2d.js');
  const texts = [];
  const ctx = new Proxy({}, {
    get(target, prop) {
      if (prop === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (prop === 'fillText') return (s) => texts.push(String(s));
      if (prop === 'measureText') return () => ({ width: 10 });
      if (prop === 'canvas') return { width: 640, height: 420 };
      if (typeof prop === 'string' && ['save', 'restore', 'translate', 'scale', 'rotate', 'beginPath', 'moveTo', 'lineTo', 'arc', 'arcTo', 'ellipse', 'closePath', 'fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'setLineDash', 'quadraticCurveTo', 'roundRect'].includes(prop)) return () => {};
      return target[prop];
    },
    set(target, prop, value) { target[prop] = value; return true; }
  });
  const label = { power: 'POWER', rack: 'RACK', buzzer: 'HORN', beat: 'BEAT', wait: 'WAIT', now: 'NOW', late: 'LATE', attack: 'ATK', defend: 'DEF' };
  for (const type of Arcade.TYPES) {
    const spec = Arcade.roundSpec(type, 'draw:' + type, 0, 0);
    const view = { type, round: 0, phase: 'aim', spec, tick: spec.cueTick || 20, cursor: Arcade.cursorAt(spec, spec.cueTick || 20), meterType: Arcade.GAMES[type].meter, onCue: !!spec.cueTick, text: label, anim: null, now: 1000, label: '', flash: 0, netKick: 0, hype: 0.5, clockText: '18' };
    assert.doesNotThrow(() => Arcade2D.draw(ctx, 640, 420, view, {}), type);
    assert.doesNotThrow(() => Arcade2D.hud(ctx, 640, 420, view, {}), type + ' hud');
  }
  const spec = Arcade.roundSpec('defense', 'draw:wait', 0, 0);
  Arcade2D.draw(ctx, 640, 420, { type: 'defense', round: 0, phase: 'aim', spec, tick: 0, cursor: 0, meterType: 'react', onCue: false, text: label, anim: null, now: 0, label: '', flash: 0, netKick: 0, hype: 0.5 }, {});
  assert.ok(texts.includes('NOW') && texts.includes('WAIT'), 'reaction cue is drawn before and after the rival moves');
  assert.ok(texts.includes('RACK') && texts.includes('BEAT'));
});
