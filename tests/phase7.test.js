'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Match = require('../src/match/engine.js');
const Live = require('../src/match/live.js');
const Career = require('../src/domain/career.js');
const Season = require('../src/domain/season.js');
const Player = require('../src/domain/player.js');
const Handler = require('../src/worker/handler.js');

function playLive(config, pick) {
  const live = Live.create(config);
  let guard = 0;
  while (!live.finished && guard++ < 200) Live.advance(live, { choice: live.moment ? pick(live.moment) : undefined });
  assert.ok(live.finished);
  return live;
}

test('live match without intervening reproduces the plain simulation exactly (FIBA and NA)', () => {
  for (const ruleSetId of ['FIBA-2026', 'NA-2026-27']) {
    for (const seed of ['p1', 'p2', 'p3']) {
      const sim = Match.simulateMatch({ seed, ruleSetId });
      const fallback = playLive({ seed, ruleSetId, teams: Match.neutralTeams(50), mode: 'coach', userTeam: 0 }, m => Live.MOMENTS[m.type].fallback);
      const toEnd = Live.advance(Live.create({ seed, ruleSetId, teams: Match.neutralTeams(50), mode: 'coach', userTeam: 1 }), { toEnd: true });
      assert.equal(fallback.match.hash, sim.hash);
      assert.equal(toEnd.match.hash, sim.hash);
      assert.deepEqual(fallback.match.score, sim.score);
    }
  }
});

test('same decisions give the same match; decisions change the match and keep the box valid', () => {
  const cfg = () => ({ seed: 'det-7', ruleSetId: 'FIBA-2026', teams: Match.neutralTeams(50), mode: 'coach', userTeam: 0 });
  const first = m => m.options[0];
  const a = playLive(cfg(), first), b = playLive(cfg(), first);
  assert.equal(a.match.hash, b.match.hash);
  assert.deepEqual(a.decisions, b.decisions);
  assert.ok(a.decisions.length > 0);
  assert.notEqual(a.match.hash, Match.simulateMatch({ seed: 'det-7' }).hash);
  for (let s = 0; s < 40; s++) {
    for (const mode of ['coach', 'player']) {
      const teams = Match.neutralTeams(48 + (s % 5));
      const live = playLive({ seed: 'v' + s, ruleSetId: s % 2 ? 'NA-2026-27' : 'FIBA-2026', teams, mode, userTeam: s % 2, myPlayerId: teams[s % 2].players[1].id }, m => m.options[s % m.options.length]);
      const v = Match.validateBox(Match.resumeMatch(live.match));
      assert.ok(v.ok, v.errors.join('; '));
      assert.ok(Live.validate(live).ok);
    }
  }
});

test('engine hooks: intentional foul, bench and forced last shot behave as decided', () => {
  // Intentional foul: recorded as such, targets the worst FT shooter and stops the clock almost at once.
  const st = Match.createMatch({ seed: 'hooks', ruleSetId: 'FIBA-2026' });
  const weak = st.teams[1].players[0]; weak.attrs.tiroLibre = 20;
  st.teams[0].live = { benched: {}, intent: null, foulNow: true };
  st.offense = 1;
  const clock = st.gameClock;
  Match.simulatePossession(st);
  const foul = st.events.find(e => e.type === 'foul' && e.intentional);
  assert.ok(foul);
  assert.ok(clock - foul.clock <= 15);
  assert.equal(st.teams[0].live.foulNow, false);

  // Bench until the last period: almost no minutes in between.
  const s2 = Match.createMatch({ seed: 'bench', ruleSetId: 'FIBA-2026' });
  const star = s2.teams[0].players[0].id;
  s2.teams[0].live = { benched: { [star]: 4 }, intent: null, foulNow: false };
  let tenthsBefore = 0;
  while (!s2.final && s2.period < 4) { Match.simulatePossession(s2); if (s2.period < 4) tenthsBefore = s2.teams[0].players[0].onCourtTenths; }
  assert.ok(tenthsBefore < 600 * 4, 'benched starter played ' + tenthsBefore / 600 + ' min');

  // Forced shooter and zone for one possession only.
  const s3 = Match.createMatch({ seed: 'intent', ruleSetId: 'FIBA-2026' });
  const shooter = s3.teams[0].onCourt[4];
  for (let i = 0; i < 30; i++) {
    const snapshot = Match.serializeMatch(s3);
    const trial = Match.resumeMatch(snapshot);
    trial.offense = 0; trial.teams[0].live = { benched: {}, intent: { zone: 'above3', shooter }, foulNow: false };
    const before = trial.events.length;
    Match.simulatePossession(trial);
    const shot = trial.events.slice(before).find(e => e.type === 'shot' && e.team === 0);
    if (shot) { assert.equal(shot.player, shooter); assert.equal(shot.zone, 'above3'); assert.equal(trial.teams[0].live.intent, null); return; }
    Match.simulatePossession(s3);
  }
  assert.fail('no forced shot observed');
});

test('career live match: result becomes the official round result, survives save/resume and has consequences', () => {
  const state = Career.createCareer({ seed: 'live-career', mode: 'player', route: 'eu-academy' });
  const live = Career.liveStart(state);
  assert.equal(live.week, 0);
  // Save mid-match and resume.
  const resumed = Career.resume(Career.serialize(state));
  assert.equal(resumed.live.gameId, live.gameId);
  Career.liveAdvance(resumed, {});
  Career.liveAdvance(resumed, { toEnd: true });
  assert.ok(resumed.live.finished);
  const score = resumed.live.match.score.slice(), gameId = resumed.live.gameId;
  Career.advanceWeek(resumed, { type: 'play' });
  assert.equal(resumed.live, null);
  const official = resumed.season.results.find(r => r.id === gameId);
  assert.deepEqual(official.score, score);
  assert.ok(resumed.inbox.some(m => m.type === 'live'));
  assert.ok(Career.validate(resumed).ok);
  assert.equal(resumed.life.counters.live, 1);

  // Coach career: a live match left alone equals the simulated week (same season hash).
  const a = Career.createCareer({ seed: 'live-coach', mode: 'coach', route: 'na-draft' });
  const b = Career.resume(Career.serialize(a));
  Career.advanceWeek(a, { type: 'play' });
  Career.liveStart(b);
  Career.advanceWeek(b, { type: 'play' });
  assert.equal(Season.hashSeason(a.season), Season.hashSeason(b.season));
});

test('consequences are real: confidence feeds clutch, full coach trust earns a starting spot', () => {
  const p = Player.createPlayer({ seed: 'conf', nationality: 'ES', pos: 'SG', archetype: 'shooter', handedness: 'right', age: 22, quality: 55 });
  const base = Player.toMatchPlayer(p, false).attrs.clutch;
  p.confidence = 5;
  assert.equal(Player.toMatchPlayer(p, false).attrs.clutch, Math.min(99, base + 5));
  const club = Season.createSeason('es-ascenso-iberico', 'trust').clubs[0];
  const bench = club.roster[club.roster.length - 1];
  assert.ok(!Season.clubToMatchTeam(club).players.find(x => x.id === bench.id).starter);
  bench.coachTrust = 80;
  assert.ok(Season.clubToMatchTeam(club).players.find(x => x.id === bench.id).starter);

  // A made hero shot raises morale, confidence and trust.
  const teams = Match.neutralTeams(50);
  for (let s = 0; s < 200; s++) {
    const t = Match.neutralTeams(50);
    const me = t[0].players[0].id;
    const live = playLive({ seed: 'hero' + s, ruleSetId: 'FIBA-2026', teams: t, mode: 'player', userTeam: 0, myPlayerId: me }, m => m.type === 'lastShot' ? 'hero' : m.options[m.options.length - 1]);
    const hero = live.decisions.find(d => d.type === 'lastShot' && d.choice === 'hero');
    if (hero && hero.result === 'made') { assert.ok(live.outcome.confidence > 0 && live.outcome.trust > 0 && live.outcome.morale > 0); return; }
  }
  void teams;
  assert.fail('no made hero shot in 200 seeds');
});

test('worker exposes career.live with a render-ready view', () => {
  const created = Handler.handle({ id: 1, type: 'career.create', payload: { seed: 'rpc-live', mode: 'coach' } }).result;
  let res = Handler.handle({ id: 2, type: 'career.live', payload: { state: created, start: true } });
  assert.ok(res.ok, res.error);
  assert.equal(res.result.live.score.join('-'), '0-0');
  let guard = 0;
  while (!res.result.live.finished && guard++ < 40) {
    const m = res.result.live.moment;
    res = Handler.handle({ id: 3, type: 'career.live', payload: { state: res.result.state, choice: m ? m.options[0] : undefined } });
    assert.ok(res.ok, res.error);
    for (const e of res.result.live.feed) assert.equal(typeof e.type, 'string');
  }
  assert.ok(res.result.live.finished);
  assert.equal(typeof res.result.live.outcome.won, 'boolean');
  const after = Handler.handle({ id: 4, type: 'career.advance', payload: { state: res.result.state, action: { type: 'play' } } });
  assert.ok(after.ok, after.error);
  assert.equal(after.result.state.live, null);
});
