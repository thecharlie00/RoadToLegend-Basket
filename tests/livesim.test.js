'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
require('../src/match/rules.js');
const LiveSim = require('../src/render/livesim.js');
const Career = require('../src/domain/career.js');

test('live 3D sim stages every event type continuously, with TV delay and no invalid positions', () => {
  const s = Career.createCareer({ seed: 'ls-t', mode: 'player', leagueId: 'es-iberica-men', pos: 'PG' });
  while (s.pendingEvent) Career.chooseEvent(s, s.pendingEvent.options[0].id);
  Career.liveStart(s, {}); for (let i = 0; i < 3; i++) { try { Career.liveAdvance(s, {}); } catch (_) { break; } }
  const m = s.live.match, sim = LiveSim.create(m, {}), seen = new Set();
  for (let i = 0; i < Math.min(m.events.length, 60); i++) for (let k = 0; k < 110; k++) { LiveSim.step(sim, m, i, 1 / 30); seen.add(sim.script.type); }
  for (const k of ['shot', 'rebound', 'flow']) assert.ok(seen.has(k), 'staged ' + k);
  assert.ok(sim.queue.length <= 4, 'TV delay bounded');
  const f = LiveSim.frame(sim);
  assert.equal(f.players.length, 10); assert.equal(f.refs.length, 3);
  for (const p of f.players.concat(f.refs)) { assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z)); assert.ok(Math.abs(p.x) < sim.L / 2 + 3 && Math.abs(p.z) < sim.W / 2 + 3); }
  const cam = LiveSim.camera(sim, 16 / 9); assert.ok(cam.eye[1] > 5 && cam.fov > 20);
});
