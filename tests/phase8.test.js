'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Career = require('../src/domain/career.js');
const Content = require('../src/domain/content.js');

function play(state, weeks, pick) {
  for (let i = 0; i < weeks; i++) {
    if (state.life.pendingEvent) Career.chooseEvent(state, pick(state));
    Career.advanceWeek(state, { type: 'play' });
  }
}

test('player careers open with the agent decision; the agent changes real income and offers', () => {
  const incomes = {};
  for (const [opt, agent] of [['a', 'star'], ['c', 'self']]) {
    const s = Career.createCareer({ seed: 'agent-test', mode: 'player' });
    assert.equal(s.life.pendingEvent.id, 'agent');
    const view = Career.summary(s).event;
    assert.equal(view.options.length, 3);
    Career.chooseEvent(s, opt);
    assert.equal(s.life.agent, agent);
    assert.ok(s.life.lastOutcome && s.life.lastOutcome.result.es);
    const before = s.life.cash;
    Career.advanceWeek(s, { type: 'play' });
    incomes[agent] = s.life.cash - before;
    assert.equal(Content.offerFactor(s), Content.AGENTS[agent].offer);
  }
  assert.ok(incomes.self > incomes.star, 'commission must reduce weekly income');
});

test('coach careers open with the first team talk', () => {
  const s = Career.createCareer({ seed: 'coach-talk', mode: 'coach' });
  assert.equal(s.life.pendingEvent.id, 'coach-first-talk');
  Career.chooseEvent(s, 'a');
  assert.ok(s.life.flags.strict != null);
});

test('uncertain outcomes are deterministic, show base probability and never leak the hidden help', () => {
  const run = () => {
    const s = Career.createCareer({ seed: 'gamble', mode: 'player' });
    Career.chooseEvent(s, 'a');
    s.life.pendingEvent = { id: 'investment', week: s.week };
    s.life.misfortune = 3;
    const view = Career.summary(s).event;
    assert.equal(view.options[0].p, 0.4);
    Career.chooseEvent(s, 'a');
    return s.life.lastOutcome;
  };
  const a = run(), b = run();
  assert.deepEqual(a, b);
  assert.equal(a.uncertain, true);
  const fresh = Career.createCareer({ seed: 'gamble', mode: 'player' });
  assert.ok(!JSON.stringify(Career.summary(fresh).event).includes('misfortune'));
});

test('deferred consequences: a flag fires its story event after the delay', () => {
  const s = Career.createCareer({ seed: 'flags', mode: 'player' });
  Career.chooseEvent(s, 'b');
  Content.applyEffects(s, { flag: 'party-photo' });
  const flaggedAt = s.week;
  let seen = null;
  for (let i = 0; i < 6 && !seen; i++) {
    if (s.life.pendingEvent && s.life.pendingEvent.id === 'party-photo') seen = s.week;
    else if (s.life.pendingEvent) Career.chooseEvent(s, 'a');
    else Career.advanceWeek(s, { type: 'play' });
  }
  assert.ok(seen != null && seen - flaggedAt >= 2, 'party-photo should appear after its delay');
  Career.chooseEvent(s, 'a');
  assert.equal(s.life.flags['party-photo'], undefined);
});

test('event texts are fully filled and two full seasons run cleanly in both modes', () => {
  for (const mode of ['player', 'coach']) {
    const s = Career.createCareer({ seed: 'long-' + mode, mode, route: mode === 'coach' ? 'na-draft' : 'eu-academy' });
    let n = 0, guard = 0;
    while (s.year < 2028 && guard++ < 400) {
      if (s.life.pendingEvent) {
        const v = Career.summary(s).event;
        for (const txt of [v.title.es, v.title.en, v.body.es, v.body.en, ...v.options.flatMap(o => [o.label.es, o.label.en])]) assert.ok(!/\{\w+\}/.test(txt), 'unfilled placeholder: ' + txt);
        Career.chooseEvent(s, v.options[n++ % v.options.length].id);
        assert.ok(!/\{\w+\}/.test(s.life.lastOutcome.result.es));
      } else Career.advanceWeek(s, { type: n % 5 === 0 ? 'rest' : 'play' });
    }
    assert.ok(s.year >= 2028, mode + ' did not finish two seasons');
    assert.ok(n >= 15, mode + ' resolved only ' + n + ' decisions');
    assert.ok(Career.validate(Career.resume(Career.serialize(s))).ok);
    assert.ok(s.life.achievements.length >= 8, mode + ' trophies: ' + s.life.achievements.length);
    const packs = Content.packs();
    for (const id of s.life.achievements) { const a = packs.achievements.achievements.find(x => x.id === id); assert.ok(a.mode === 'any' || a.mode === mode); }
  }
});

test('lifetime totals accumulate across seasons for trophies', () => {
  const s = Career.createCareer({ seed: 'totals', mode: 'player' });
  play(s, 40, st => Career.summary(st).event.options[0].id);
  const t = s.player.career.totals;
  assert.ok(t.gp > 0 && t.pts >= s.player.stats.pts);
  assert.equal(s.life.counters.points, t.pts);
});

const Arcade = require('../src/match/arcade.js');
const Match = require('../src/match/engine.js');
const Live = require('../src/match/live.js');

test('arcade minigames are deterministic, reward timing and keep auto below a perfect run', () => {
  const attrs = { tiroLibre: 60, tiroTriple: 60, clutch: 60, mate: 60, salto: 60, robo: 60, tapon: 60, defExterior: 60, manejo: 60, tiroMedia: 60 };
  for (const type of Arcade.TYPES) {
    const auto = Arcade.autoTicks(type, 'det-' + type, attrs);
    const a = Arcade.play(type, 'det-' + type, auto, attrs), b = Arcade.play(type, 'det-' + type, auto, attrs);
    assert.deepEqual(a, b);
    assert.ok(a.complete, type + ' auto run must complete');
    const perfect = []; let streak = 0;
    for (let i = 0; i < Arcade.GAMES[type].rounds; i++) { const spec = Arcade.roundSpec(type, 'det-' + type, i, streak); perfect.push(Arcade.centerTick(spec)); const r = Arcade.resolveRound(type, 'det-' + type, i, perfect[i], attrs, streak); streak = r.made ? streak + 1 : 0; }
    const best = Arcade.play(type, 'det-' + type, perfect, attrs);
    assert.ok(best.results.every(r => r.quality >= 0.7), type + ' center ticks are near perfect');
    assert.ok(best.perfects > a.perfects, type + ' good timing beats auto');
    assert.ok(a.results.every(r => r.quality < 0.85), type + ' auto never perfect');
  }
});

test('career minigame sessions are committed (no reroll), pay rewards and track records', () => {
  const s = Career.createCareer({ seed: 'arcade-career', mode: 'player' });
  const pend = Career.arcadeStart(s, { type: 'three' });
  assert.equal(Career.arcadeStart(s, { type: 'freeThrow' }).seq, pend.seq, 'pending session is reused');
  const resumed = Career.resume(Career.serialize(s));
  assert.equal(resumed.life.pendingArcade.seed, pend.seed);
  const style = resumed.life.style;
  assert.throws(() => Career.arcadeFinish(resumed, { ticks: [1, 2, 3] }), /not complete/);
  const res = Career.arcadeFinish(resumed, { auto: true });
  assert.equal(res.type, 'three'); assert.equal(res.record, true);
  assert.ok(resumed.life.style > style);
  assert.equal(resumed.life.arcade.best.three, res.score);
  assert.equal(resumed.life.pendingArcade, null);
  assert.ok(resumed.life.achievements.includes('arcadePlays-1'));
  assert.ok(Career.validate(resumed).ok);
});

test('hero last shot in the live match is decided by the buzzer minigame timing', () => {
  let checked = 0;
  for (let s = 0; s < 300 && checked < 2; s++) {
    const teams = Match.neutralTeams(50); const me = teams[0].players[0].id;
    const live = Live.create({ seed: 'heroMini' + s, ruleSetId: 'FIBA-2026', teams, mode: 'player', userTeam: 0, myPlayerId: me });
    let guard = 0;
    while (!live.finished && guard++ < 100) {
      if (live.moment && live.moment.type === 'lastShot') {
        const copy = JSON.parse(JSON.stringify(live));
        Live.advance(live, { choice: 'hero', release: 18 });  // cima del salto: calidad máxima
        Live.advance(copy, { choice: 'hero', release: 2000 }); // fuera de tiempo
        const good = live.decisions.find(d => d.type === 'lastShot'), bad = copy.decisions.find(d => d.type === 'lastShot');
        assert.ok(good.minigame && bad.minigame);
        assert.ok(good.minigame.quality > bad.minigame.quality);
        if (good.result === 'made' || good.result === 'missed') assert.equal(good.result === 'made', good.minigame.made);
        checked++; break;
      }
      Live.advance(live, { choice: live.moment ? live.moment.options[live.moment.options.length - 1] : undefined });
    }
  }
  assert.ok(checked >= 1, 'no last-shot moment found');
});

const Pet = require('../src/domain/pet.js');

test('pet: adopt, weekly care limit, deterministic tricks, contests, items and real effect on the owner', () => {
  const run = () => {
    const s = Career.createCareer({ seed: 'pet-test', mode: 'player' });
    Career.chooseEvent(s, 'b');
    Career.petOp(s, { op: 'adopt', species: 'dog', name: 'Rebote' });
    assert.throws(() => Career.petOp(s, { op: 'adopt', species: 'cat' }), /already/);
    for (let w = 0; w < 30; w++) {
      Career.petOp(s, { op: 'act', action: 'feed' });
      Career.petOp(s, { op: 'act', action: 'cuddle' });
      const next = Pet.TRICKS.find(t => (s.pet.tricks[t.id] || 0) < 100);
      try { Career.petOp(s, { op: 'act', action: 'train', trick: next.id }); } catch (_) { Career.petOp(s, { op: 'act', action: 'play' }); }
      Career.petOp(s, { op: 'act', action: w % 2 ? 'walk' : 'play' });
      assert.throws(() => Career.petOp(s, { op: 'act', action: 'bath' }), /no pet actions/);
      if (w % 5 === 4) Career.petOp(s, { op: 'contest' });
      if (s.life.pendingEvent) Career.chooseEvent(s, 'a');
      Career.advanceWeek(s, { type: 'play' });
    }
    return s;
  };
  const a = run(), b = run();
  assert.deepEqual(a.pet, b.pet);
  assert.ok(Pet.learned(a.pet).length >= 3, 'learned ' + Pet.learned(a.pet).length);
  assert.ok(a.pet.contests.played >= 5);
  assert.ok(a.life.achievements.includes('pet-1'));
  a.life.style += 100;
  Career.petOp(a, { op: 'buy', item: 'cap' }); Career.petOp(a, { op: 'equip', item: 'cap' });
  assert.equal(a.pet.equipped.head, 'cap');
  assert.ok(Career.validate(Career.resume(Career.serialize(a))).ok);
  // descuido: la mascota triste baja la moral del dueño
  const owners = [95, 10].map(h => { const s = Career.createCareer({ seed: 'pet-mood', mode: 'player' }); Career.petOp(s, { op: 'adopt', species: 'cat' }); s.pet.happiness = h; s.pet.hunger = 100; s.pet.hygiene = 100; Career.advanceWeek(s, { type: 'rest' }); return s.player.morale; });
  assert.equal(owners[0] - owners[1], 3, 'happy pet +1 morale, sad pet -2');
});

const Playoffs = require('../src/domain/playoffs.js');
const Season = require('../src/domain/season.js');

test('playoff formats: NA play-in + two conferences best-of-7; EU top 8; EU promotion playoff', () => {
  const na = Season.createSeason('na-boreal-men', 'po-na'); Season.playRegularSeason(na, 'po-na');
  na.playoffs = Playoffs.create(na); Playoffs.playAll(na, 'po-na-x');
  const names = na.playoffs.rounds.map(r => r.name);
  assert.deepEqual(names, ['playin1', 'playin2', 'r1', 'r2', 'cf', 'final']);
  assert.equal(na.playoffs.rounds[2].series.length, 8);
  for (const s of na.playoffs.rounds[2].series) assert.equal(Math.max(s.winsA, s.winsB), 4);
  assert.ok(na.playoffs.champion && na.playoffs.done);
  const east = new Set(na.clubs.filter(c => Playoffs.conferenceOf(c) === 'east').map(c => c.id));
  const cf = na.playoffs.rounds[4].series;
  assert.ok(cf.some(s => east.has(s.a) && east.has(s.b)) && cf.some(s => !east.has(s.a) && !east.has(s.b)), 'conference finals stay within conferences');
  const top = Season.createSeason('es-iberica-men', 'po-top'); Season.playRegularSeason(top, 'po-top');
  top.playoffs = Playoffs.create(top); Playoffs.playAll(top, 'x');
  assert.deepEqual(top.playoffs.rounds.map(r => r.series[0].bestOf), [3, 5, 5]);
  const sec = Season.createSeason('es-ascenso-iberico', 'po-sec'); Season.playRegularSeason(sec, 'po-sec');
  sec.playoffs = Playoffs.create(sec); Playoffs.playAll(sec, 'x');
  assert.equal(sec.playoffs.promoted.length, 2);
  assert.equal(sec.playoffs.promoted[0], Season.standings(sec.clubs)[0].id);
  assert.deepEqual(Season.euPromotionRelegation(top, sec).promoted, sec.playoffs.promoted);
  const aw = Playoffs.awards(na, 82);
  for (const k of ['mvp', 'dpoy', 'roy', 'sixth', 'mip']) assert.ok(aw.some(a => a.award === k), 'missing award ' + k);
  assert.equal(aw.filter(a => a.award === 'allLeague').length, 5);
});

test('career plays playoffs week by week (live-capable), records awards, summary and history', () => {
  const s = Career.createCareer({ seed: 'po-career', mode: 'coach', route: 'na-draft' });
  let guard = 0, playoffLive = 0;
  while (s.year < 2027 && guard++ < 200) {
    if (s.life.pendingEvent) Career.chooseEvent(s, 'a');
    const sm = Career.summary(s);
    if (sm.playoffs && !sm.playoffs.done && sm.playoffs.series && playoffLive < 1) {
      const live = Career.liveStart(s); assert.equal(live.playoff, true); Career.liveAdvance(s, { toEnd: true }); playoffLive++;
      const gid = live.gameId, score = live.match.score.slice();
      Career.advanceWeek(s, { type: 'play' });
      const g = s.season.playoffs ? s.season.playoffs.rounds.flatMap(r => r.series).flatMap(x => x.games).find(x => x.id === gid) : s.history[0] && null;
      if (g) assert.deepEqual(g.score, score);
      continue;
    }
    Career.advanceWeek(s, { type: sm.playoffs && !sm.playoffs.done && !['playing', 'waiting'].includes(sm.playoffs.status) ? 'skipPlayoffs' : 'play' });
  }
  assert.equal(s.year, 2027);
  assert.equal(playoffLive, 1, 'a playoff game must have been played live');
  const h = s.history[0];
  assert.ok(h.championName && h.awards.length >= 8 && h.result);
  assert.ok(s.lastSeasonSummary && !s.lastSeasonSummary.dismissed);
  Career.dismissSummary(s); assert.equal(Career.summary(s).lastSeason, null);
  assert.ok(Career.validate(Career.resume(Career.serialize(s))).ok);
});

test('coach: chosen starters start, tactics really change the engine, training load and scouting', () => {
  const s = Career.createCareer({ seed: 'coach-tools', mode: 'coach', route: 'eu-academy' });
  const club = s.season.clubsById[s.clubId];
  const bench = club.roster.slice(-5).map(p => p.id);
  Career.coachSet(s, { starters: bench });
  assert.deepEqual(Season.clubToMatchTeam(club).players.filter(p => p.starter).map(p => p.id).sort(), bench.slice().sort());
  assert.throws(() => Career.coachSet(s, { starters: bench.slice(0, 4) }), /five/);
  const sample = (tactic) => { let poss = 0, threes = 0, fga = 0; const t = Object.assign({}, Match.DEFAULT_TACTIC, tactic);
    for (let i = 0; i < 40; i++) { const teams = Match.neutralTeams(52); teams[0].tactic = t; const m = Match.simulateMatch({ seed: 'tac' + i, teams }); poss += m.possessions[0]; threes += m.teams[0].stats['3pa']; fga += m.teams[0].stats.fga; }
    return { poss: poss / 40, threeShare: threes / fga }; };
  const fast = sample({ pace: Career.TACTICS.pace.fast }), slow = sample({ pace: Career.TACTICS.pace.slow });
  assert.ok(fast.poss > slow.poss + 4, `pace must matter (${fast.poss} vs ${slow.poss})`);
  const out = sample(Career.TACTICS.focus.outside), ins = sample(Career.TACTICS.focus.inside);
  assert.ok(out.threeShare > ins.threeShare + 0.12, 'shot mix must follow focus');
  Career.coachSet(s, { tactic: { pace: 'fast', focus: 'outside', defense: 'press' }, training: 'hard' });
  assert.equal(club.tactic.press, 0.55);
  const load0 = club.roster.reduce((a, p) => a + (p.load || 0), 0);
  if (s.life.pendingEvent) Career.chooseEvent(s, 'a');
  Career.advanceWeek(s, { type: 'play' });
  const sm = Career.summary(s);
  assert.equal(sm.squad.training, 'hard');
  assert.ok(sm.scouting && sm.scouting.top.length === 3);
  assert.ok(club.roster.reduce((a, p) => a + (p.load || 0), 0) > load0);
  assert.ok(Career.validate(Career.resume(Career.serialize(s))).ok);
});

test('3D: perspective cameras, arena dressing within budget and a 3D scene for every minigame', () => {
  globalThis.CAA = globalThis.CAA || {};
  const Voxel = require('../src/render/voxel.js'); globalThis.CAA.Voxel = Voxel;
  const Arcade3D = require('../src/render/arcade3d.js');
  const p = Voxel.perspective(16 / 9, 55, 0.1, 100);
  assert.equal(p.length, 16); assert.ok(Number.isFinite(p[0]) && p[11] === -1);
  const v = Voxel.viewMatrix({ eye: [0, 3, 8], target: [0, 1, 0] });
  assert.equal(v.length, 16);
  const m = Match.simulateMatch({ seed: '3d-arena' });
  const g = Voxel.geometry(m, Math.floor(m.events.length / 2), 0.5, { t: 1, hype: 1 });
  assert.ok(g.cubes.length <= Voxel.MAX_CUBES);
  assert.ok(g.cubes.some(c => c.color === 'jumbo') && g.cubes.some(c => c.color === 'net'));
  for (const type of Arcade.TYPES) for (const phase of ['aim', 'flight']) {
    const out = Arcade3D.geometry({ type, round: 2, phase, cursor: 0.4, now: 1200, anim: phase === 'flight' ? { t: 0.5, made: true } : null, netKick: 0.5, hype: 0.6 }, {});
    assert.ok(out.scene.cubes.length > 100 && out.scene.cubes.length < 600, type + ' cubes ' + out.scene.cubes.length);
    assert.ok(out.camera.eye.every(Number.isFinite) && out.camera.target.every(Number.isFinite));
    assert.ok(out.scene.cubes.every(c => out.scene.colors[c.color] || Voxel.palette({})[c.color]), type + ' unknown color');
    assert.ok(Voxel.vertexData(out.scene).length > 0);
  }
});
