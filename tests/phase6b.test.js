'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Match = require('../src/match/engine.js');
const Hash = require('../src/core/hash.js');
const Voxel = require('../src/render/voxel.js');
const Career = require('../src/domain/career.js');
const Season = require('../src/domain/season.js');
const Save = require('../src/core/save.js');
const Handler = require('../src/worker/handler.js');
const Audio = require('../src/platform/audio.js');
const A11Y = require('../src/core/a11y.js');

test('lineups are deterministic, exact per event and excluded from the authoritative hash', () => {
  const a = Match.simulateMatch({ seed: 'lineups-a' });
  const b = Match.simulateMatch({ seed: 'lineups-a' });
  assert.deepEqual(a.lineups, b.lineups);
  assert.equal(a.lineups.length, a.events.length);
  let prev = '00000000'; const score = [0, 0];
  for (let i = 0; i < a.events.length; i++) {
    const e = a.events[i], l = a.lineups[i];
    assert.equal(l.seq, e.seq);
    assert.equal(l.teams.length, 2);
    for (let ti = 0; ti < 2; ti++) {
      assert.equal(l.teams[ti].length, 5);
      assert.equal(new Set(l.teams[ti]).size, 5);
      const ids = new Set(a.teams[ti].players.map(p => p.id));
      assert.ok(l.teams[ti].every(id => ids.has(id)));
    }
    if (e.player) {
      const ti = e.team === 1 ? 1 : 0;
      assert.ok(l.teams[ti].includes(e.player), 'actor must be on court: ' + e.type + ' ' + e.player);
    }
    if (e.made && (e.team === 0 || e.team === 1)) score[e.team] += e.type === 'shot' ? e.points : e.type === 'ft' ? 1 : 0;
    prev = Hash.hex32(Hash.hashObject({ prev, event: e, score, clock: e.clock }));
  }
  assert.equal(a.hash, prev, 'hash must be recomputable from events/score/clock without lineups');
  const r = Match.replay(a);
  assert.deepEqual(r.state.lineups, a.lineups);
  assert.equal(r.state.hash, a.hash);
});

test('voxel replay uses the recorded five, including bench actors, and old saves fall back safely', () => {
  const m = Match.replay(Match.simulateMatch({ seed: 'lineups-voxel' })).state;
  let benchIndex = -1;
  for (let i = 0; i < m.events.length; i++) {
    const e = m.events[i];
    if (!e.player) continue;
    const ti = e.team === 1 ? 1 : 0;
    const starters = m.teams[ti].players.slice(0, 5).map(p => p.id);
    if (!starters.includes(e.player)) { benchIndex = i; break; }
  }
  assert.ok(benchIndex >= 0, 'fixture should contain a bench actor');
  const f = Voxel.frameAt(m, benchIndex, 1);
  const ti = m.events[benchIndex].team === 1 ? 1 : 0;
  const ids = f.players.filter(p => p.team === ti).map(p => p.id).sort();
  assert.deepEqual(ids, m.lineups[benchIndex].teams[ti].slice().sort());
  assert.ok(f.players.some(p => p.id === m.events[benchIndex].player));
  const legacy = JSON.parse(JSON.stringify(m)); delete legacy.lineups;
  const old = Voxel.frameAt(legacy, benchIndex, 1);
  assert.equal(old.players.length, 10);
  assert.ok(old.players.some(p => p.id === m.events[benchIndex].player));
  assert.equal(Career.validate({ ...Career.createCareer({ seed: 'legacy-lineups' }), lastMatch: { ...Match.replay(Match.simulateMatch({ seed: 'legacy-lineups-match' })), state: legacy } }).ok, true);
});

test('career creation honors club, archetype, handedness and name; draft keeps starting club', () => {
  const c = Career.createCareer({ seed: 'creation-choice', clubId: 'es-ascenso-iberico-7', archetype: 'passing-big', handedness: 'left', name: 'Ada Prueba' });
  assert.equal(c.clubId, 'es-ascenso-iberico-7');
  assert.equal(c.startingClubId, c.clubId);
  assert.equal(c.player.archetype, 'passing-big');
  assert.equal(c.player.handedness, 'left');
  assert.equal(c.player.name, 'Ada Prueba');
  assert.equal(Career.validate(c).ok, true);
  const env = Save.createEnvelope('slot-1', { career: Career.serialize(c) });
  assert.equal(Save.validateEnvelope(Save.parseEnvelope(JSON.stringify(env)), { careerValidator: Career.validate }).ok, true);
  const d = Career.createCareer({ seed: 'creation-draft', route: 'na-draft', clubId: 'na-boreal-men-3', archetype: 'creator', handedness: 'right' });
  assert.equal(d.startingClubId, 'na-boreal-men-3');
  assert.ok(d.season.clubs.some(x => x.id === d.clubId));
  assert.equal(d.player.archetype, 'creator');
  assert.throws(() => Career.createCareer({ clubId: 'missing' }), /club not found/);
  assert.throws(() => Career.createCareer({ archetype: 'unknown' }), /unknown archetype/);
  assert.throws(() => Career.createCareer({ handedness: 'both' }), /unknown handedness/);
  const catalog = Handler.handle({ type: 'career.clubs', payload: { route: 'eu-academy' } }).result;
  assert.equal(catalog.clubs.length, 18);
  const full = Season.defaultClubs('es-ascenso-iberico');
  assert.deepEqual(catalog.clubs.map(x => x.name), full.map(x => x.name), 'club names must not change');
  assert.deepEqual(catalog.clubs.map(x => x.id), full.map(x => x.id));
});

test('avatar geometry is bounded, finite and reflects identity/equipment', () => {
  const right = Voxel.avatarGeometry({ height: 196, archetype: 'shooter', handedness: 'right', equipment: { jersey: '#ff0000', shoes: '#00ff00', accessory: '#0000ff' } });
  const left = Voxel.avatarGeometry({ height: 210, archetype: 'interior', handedness: 'left' });
  const coach = Voxel.avatarGeometry({ mode: 'coach' });
  for (const g of [right, left, coach]) {
    assert.ok(g.cubes.length <= 64);
    assert.ok(g.cubes.length <= Voxel.MAX_CUBES);
    assert.ok(Voxel.vertexData(g).every(Number.isFinite));
    assert.equal(g.kind, 'avatar');
  }
  const ballR = right.cubes.find(c => c.color === 'ball'), ballL = left.cubes.find(c => c.color === 'ball');
  assert.ok(ballR.x > 0); assert.ok(ballL.x < 0);
  assert.deepEqual(right.colors.jersey, [1, 0, 0]);
  assert.deepEqual(right.colors.shoes, [0, 1, 0]);
  assert.deepEqual(right.colors.accessory, [0, 0, 1]);
  assert.ok(left.cubes.some(c => c.sy > right.cubes.find(x => x.color === 'jersey').sy));
});

function fakeAudioWindow() {
  const nodes = [];
  class Param { constructor() { this.events = []; } setValueAtTime(v, t) { this.events.push(['set', v, t]); } exponentialRampToValueAtTime(v, t) { this.events.push(['ramp', v, t]); } }
  class Node { constructor(kind) { this.kind = kind; nodes.push(this); this.gain = new Param(); this.frequency = new Param(); this.Q = new Param(); } connect() {} disconnect() {} start(t) { this.started = t; } stop(t) { this.stopped = t; if (this.onended) this.onended(); } }
  class Context {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    createGain() { return new Node('gain'); }
    createOscillator() { return new Node('osc'); }
    createBufferSource() { return new Node('buffer'); }
    createBiquadFilter() { return new Node('filter'); }
    createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
  }
  return { window: { AudioContext: Context }, nodes };
}

test('procedural audio is gesture-unlocked, optional, rate-limited and lifecycle-safe', () => {
  assert.equal(A11Y.DEFAULTS.audio, false);
  const { window, nodes } = fakeAudioWindow();
  const off = Audio.createAudio({ enabled: false, window });
  assert.equal(off.unlock(), false); assert.equal(off.play('swish'), false); assert.equal(off.stats().state, 'none');
  const a = Audio.createAudio({ enabled: true, window });
  assert.equal(a.stats().state, 'none', 'no AudioContext before a gesture');
  assert.equal(a.play('swish'), false);
  assert.equal(a.unlock(), true);
  assert.equal(a.stats().state, 'running');
  assert.equal(a.play('swish'), true);
  assert.equal(a.play('swish'), false, 'same cue is rate-limited');
  assert.equal(a.play('rim'), true);
  assert.equal(a.play('unknown'), false);
  assert.ok(nodes.some(n => n.kind === 'osc')); assert.ok(nodes.some(n => n.kind === 'buffer'));
  a.suspend(); assert.equal(a.stats().state, 'suspended'); assert.equal(a.play('buzzer'), false);
  a.resume(); assert.equal(a.stats().state, 'running');
  a.setEnabled(false); assert.equal(a.play('click'), false);
  a.setEnabled(true); a.resume(); assert.equal(a.play('click'), true);
  const played = a.stats().played;
  a.dispose(); assert.equal(a.play('click'), false); assert.equal(a.stats().played, played); assert.equal(a.stats().disposed, true);
});
