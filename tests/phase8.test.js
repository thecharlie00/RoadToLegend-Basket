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
