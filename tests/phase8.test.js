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
