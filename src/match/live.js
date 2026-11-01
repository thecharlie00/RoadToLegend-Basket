(function (root) {
  'use strict';
  // Partido en directo (paridad con match41 del fútbol): el motor de posesiones avanza hasta un
  // momento clave y el usuario decide. Todo es determinista: misma semilla + mismas decisiones =
  // mismo partido. La opción por defecto de cada momento no toca el motor, así que un directo
  // "sin intervenir" produce exactamente el mismo resultado que la simulación normal.
  const CAA = root.CAA = root.CAA || {};
  const Match = CAA.Match || (typeof require === 'function' ? require('./engine.js') : null);
  const Rules = CAA.Rules || (typeof require === 'function' ? require('./rules.js') : null);
  const Arcade = CAA.Arcade || (typeof require === 'function' ? require('./arcade.js') : null);

  const MOMENTS = {
    run:         { modes: ['coach'],           options: ['timeout', 'press', 'keep'],             fallback: 'keep' },
    foulTrouble: { modes: ['coach', 'player'], options: ['bench', 'keep'],                        fallback: 'keep' },
    clutch:      { modes: ['coach'],           options: ['attackRim', 'bombs', 'slow', 'keep'],   fallback: 'keep' },
    demand:      { modes: ['player'],          options: ['demand', 'share'],                      fallback: 'share' },
    lastShot:    { modes: ['coach', 'player'], options: ['hero', 'pass', 'auto'],                 fallback: 'auto' },
    foulGame:    { modes: ['coach'],           options: ['foul', 'defend'],                       fallback: 'defend' }
  };
  const MAX_FOUL_GAME = 4;

  function create(config) {
    const state = Match.createMatch({ seed: config.seed, ruleSetId: config.ruleSetId, teams: config.teams, matchId: config.matchId });
    const userTeam = config.userTeam === 1 ? 1 : 0;
    state.teams[userTeam].live = { benched: {}, intent: null, foulNow: false };
    return {
      schemaVersion: 1, mode: config.mode === 'player' ? 'player' : 'coach', userTeam, myPlayerId: config.myPlayerId || null,
      match: Match.serializeMatch(state), moment: null, decisions: [], seen: {}, demand: 0, finished: false, outcome: null
    };
  }

  function profileOf(state) { return Rules.getProfile(state.ruleSetId); }
  function team(state, i) { return state.teams[i]; }
  function player(state, i, id) { return team(state, i).players.find(p => p.id === id); }
  function attr(p, k) { return p && p.attrs && p.attrs[k] != null ? p.attrs[k] : 50; }

  // Points scored by the opponent since the user's last basket (an "unanswered run").
  function opponentRun(state, me) {
    let pts = 0, anchor = -1;
    for (let i = state.events.length - 1; i >= 0; i--) {
      const e = state.events[i];
      const scored = (e.type === 'shot' && e.made) ? e.points : (e.type === 'ft' && e.made) ? 1 : 0;
      if (!scored) continue;
      if (e.team === me) { anchor = e.seq; break; }
      pts += scored;
    }
    return { pts, anchor };
  }

  function detect(live, state) {
    if (state.final) return null;
    const me = live.userTeam, opp = 1 - me;
    const prof = profileOf(state);
    const last = state.period >= prof.periods;
    const diff = state.score[me] - state.score[opp];
    const clock = state.gameClock;
    const allowed = type => MOMENTS[type].modes.includes(live.mode);
    const once = key => !live.seen[key];
    const mine = team(state, me);
    const myOnCourt = mine.onCourt.includes(live.myPlayerId);

    if (allowed('lastShot') && state.offense === me && last && clock <= 240 && diff <= 0 && diff >= -3 && once('lastShot:' + state.period)
      && (live.mode === 'coach' || myOnCourt)) {
      return { type: 'lastShot', key: 'lastShot:' + state.period, diff, needThree: diff === -3 };
    }
    if (allowed('foulGame') && state.offense === opp && last && clock > 0 && clock <= 400 && diff < 0 && diff >= -6 && (live.seen.foulGameCount || 0) < MAX_FOUL_GAME) {
      return { type: 'foulGame', key: 'foulGame:' + state.events.length, diff };
    }
    if (last && clock <= 1800 && clock > 240 && Math.abs(diff) <= 8) {
      if (allowed('clutch') && once('clutch:' + state.period)) return { type: 'clutch', key: 'clutch:' + state.period, diff };
      if (allowed('demand') && myOnCourt && once('demand:' + state.period)) return { type: 'demand', key: 'demand:' + state.period, diff };
    }
    if (state.period < prof.periods) {
      const limit = prof.personalFoulLimit;
      const watched = live.mode === 'player' ? [live.myPlayerId] : mine.onCourt;
      for (const id of watched) {
        const p = player(state, me, id);
        if (!p || !mine.onCourt.includes(id) || p.fouls < limit - 2 || mine.live.benched[id]) continue;
        const key = 'foulTrouble:' + id + ':' + p.fouls;
        if (once(key)) return { type: 'foulTrouble', key, player: id, fouls: p.fouls };
      }
    }
    if (allowed('run') && !(last && clock <= 1800)) {
      const run = opponentRun(state, me);
      if (run.pts >= 8 && once('run:' + run.anchor)) return { type: 'run', key: 'run:' + run.anchor, pts: run.pts };
    }
    return null;
  }

  function options(live, state, moment) {
    const list = MOMENTS[moment.type].options.slice();
    if (moment.type === 'run' && team(state, live.userTeam).timeouts <= 0) return list.filter(o => o !== 'timeout');
    return list;
  }

  function bestShooter(players, zone) {
    const k = zone === 'above3' || zone === 'corner3' ? 'tiroTriple' : 'tiroCerca';
    return players.slice().sort((a, b) => (attr(b, k) + attr(b, 'clutch')) - (attr(a, k) + attr(a, 'clutch')) || a.id.localeCompare(b.id))[0];
  }

  function apply(live, state, moment, choice, release) {
    const me = live.userTeam;
    const mine = team(state, me);
    const hooks = mine.live;
    const prof = profileOf(state);
    const entry = { type: moment.type, choice, period: state.period, clock: state.gameClock, score: state.score.slice(), seq: state.events.length };
    if (moment.player) entry.player = moment.player;
    live.seen[moment.key] = true;
    if (moment.type === 'foulGame') live.seen.foulGameCount = (live.seen.foulGameCount || 0) + 1;
    switch (moment.type + ':' + choice) {
      case 'run:timeout': {
        mine.timeouts--;
        for (const p of mine.players) p.fatigue = Math.max(0, p.fatigue - 0.12);
        Match.recordEvent(state, { type: 'timeout', team: me, live: true });
        break;
      }
      case 'run:press': mine.tactic.press = 0.55; mine.tactic.help = Math.min(0.9, mine.tactic.help + 0.15); break;
      case 'foulTrouble:bench': hooks.benched[moment.player] = prof.periods; break;
      case 'clutch:attackRim': mine.tactic.insideRate = 0.58; mine.tactic.threeRate = 0.28; mine.tactic.pace = 0.6; break;
      case 'clutch:bombs': mine.tactic.threeRate = 0.58; mine.tactic.insideRate = 0.28; break;
      case 'clutch:slow': mine.tactic.pace = 0.12; break;
      case 'demand:demand': live.demand = 3; break;
      case 'lastShot:hero':
      case 'lastShot:pass': {
        const zone = moment.needThree ? 'above3' : 'restricted';
        const five = mine.onCourt.map(id => player(state, me, id)).filter(Boolean);
        let shooter;
        if (choice === 'hero') shooter = live.mode === 'player' ? player(state, me, live.myPlayerId) : bestShooter(five, zone);
        else shooter = bestShooter(five.filter(p => p.id !== live.myPlayerId && (live.mode === 'player' || p !== bestShooter(five, zone))), zone) || bestShooter(five, zone);
        hooks.intent = { zone, shooter: shooter ? shooter.id : null };
        entry.shooter = shooter ? shooter.id : null;
        // Jugador: "jugártela" se decide con el minijuego de tiro final (timing a 60 Hz, determinista).
        if (choice === 'hero' && live.mode === 'player' && Number.isFinite(release) && shooter) {
          const shot = Arcade.resolveRound('buzzer', state.matchId + ':hero:' + state.events.length, 0, release, Object.assign({}, shooter.attrs, { tiroTriple: shooter.attrs[zone === 'above3' ? 'tiroTriple' : 'tiroCerca'] }), 0);
          hooks.intent.outcome = shot.made;
          entry.minigame = { tick: shot.tick, quality: shot.quality, made: shot.made };
        }
        break;
      }
      case 'foulGame:foul': hooks.foulNow = true; break;
      default: break; // fallback options leave the engine untouched
    }
    live.decisions.push(entry);
    return entry;
  }

  // Resolves what happened after a decision (used for consequences and the summary).
  function settle(live, state) {
    for (const d of live.decisions) {
      if (d.result || d.type !== 'lastShot' || !d.shooter) continue;
      const shot = state.events.find(e => e.seq >= d.seq && (e.type === 'shot' || e.type === 'block') && (e.player === d.shooter || e.shooter === d.shooter));
      const ended = state.events.find(e => e.seq >= d.seq && (e.type === 'turnover' || e.type === 'shotClockViolation' || e.type === 'periodEnd'));
      if (shot && (!ended || shot.seq < ended.seq)) d.result = shot.type === 'shot' && shot.made ? 'made' : 'missed';
      else if (ended) d.result = 'none';
    }
  }

  function advance(live, opts = {}) {
    if (live.finished) return live;
    const state = Match.resumeMatch(live.match);
    const mine = team(state, live.userTeam);
    mine.live = mine.live || { benched: {}, intent: null, foulNow: false };
    if (live.moment) {
      const allowedChoices = options(live, state, live.moment);
      const choice = allowedChoices.includes(opts.choice) ? opts.choice : MOMENTS[live.moment.type].fallback;
      apply(live, state, live.moment, choice, opts.release);
      live.moment = null;
    }
    let guard = 0;
    while (!state.final && guard++ < 800) {
      if (live.demand > 0 && state.offense === live.userTeam && !mine.live.intent && mine.onCourt.includes(live.myPlayerId)) {
        mine.live.intent = { zone: null, shooter: live.myPlayerId };
        live.demand--;
      }
      Match.simulatePossession(state);
      settle(live, state);
      if (opts.toEnd) {
        const m = detect(live, state);
        if (m) apply(live, state, m, MOMENTS[m.type].fallback).auto = true;
        continue;
      }
      const m = detect(live, state);
      if (m) { m.options = options(live, state, m); live.moment = m; break; }
    }
    if (!state.final && !live.moment) throw new Error('live match did not finish');
    if (state.final) { live.finished = true; live.outcome = outcome(live, state); }
    live.match = Match.serializeMatch(state);
    return live;
  }

  // Career consequences: confidence (feeds the clutch attribute), coach trust and morale.
  function outcome(live, state) {
    const me = live.userTeam;
    const won = state.winner === me;
    const o = { won, score: state.score.slice(), hash: state.hash, decisions: live.decisions.filter(d => !d.auto).length, morale: 0, confidence: 0, trust: 0 };
    for (const d of live.decisions) {
      if (d.auto) continue;
      if (d.type === 'lastShot' && d.choice === 'hero' && live.mode === 'player') {
        if (d.result === 'made') { o.confidence += 4; o.morale += 4; o.trust += won ? 6 : 3; }
        else if (d.result === 'missed') { o.confidence -= 2; o.morale -= 3; o.trust -= 1; }
      }
      if (d.type === 'lastShot' && d.choice === 'pass' && live.mode === 'player') o.trust += d.result === 'made' ? 3 : 1;
      if (d.type === 'demand' && d.choice === 'demand') o.trust += won ? 1 : -2;
      if (d.type === 'foulTrouble' && d.choice === 'keep' && state.events.some(e => e.seq >= d.seq && e.type === 'foul' && e.player === d.player && e.foulOut)) {
        o.trust -= 2; o.morale -= 2; // se arriesgó y acabó eliminado por faltas
      }
    }
    if (live.mode === 'coach') { o.trust += won ? 2 : -1; o.morale += won ? 2 : -1; }
    for (const k of ['morale', 'confidence', 'trust']) o[k] = Math.max(-10, Math.min(10, o[k]));
    return o;
  }

  function nameOf(state, ti, id) { const p = player(state, ti, id); return p ? p.name : ''; }
  function describe(state, e) {
    const tn = i => state.teams[i] ? state.teams[i].name : '';
    const base = { seq: e.seq, period: e.period, clock: e.clock, type: e.type, team: e.team, teamName: e.team != null ? tn(e.team) : '' };
    if (e.player) base.player = nameOf(state, e.team, e.player);
    if (e.type === 'shot') Object.assign(base, { made: e.made, points: e.points, zone: e.zone, assist: e.assist ? nameOf(state, e.team, e.assist) : null });
    if (e.type === 'ft') Object.assign(base, { made: e.made });
    if (e.type === 'block') base.shooter = nameOf(state, 1 - e.team, e.shooter);
    if (e.type === 'turnover') Object.assign(base, { steal: e.steal, defender: e.steal ? nameOf(state, 1 - e.team, e.defender) : null });
    if (e.type === 'foul') Object.assign(base, { intentional: !!e.intentional, shooting: e.shooting, foulOut: e.foulOut });
    if (e.type === 'rebound') base.orb = e.orb;
    return base;
  }

  // Compact, render-ready snapshot for the UI (names as data, rendered as text).
  function view(live, feedSize = 12) {
    const state = live.match;
    const prof = Rules.getProfile(state.ruleSetId);
    const me = live.userTeam;
    const feed = state.events.filter(e => ['shot', 'ft', 'block', 'turnover', 'foul', 'timeout', 'periodEnd', 'shotClockViolation', 'final'].includes(e.type)).slice(-feedSize).reverse().map(e => describe(state, e));
    const mine = state.teams[me];
    const moment = live.moment ? Object.assign({}, live.moment, { playerName: live.moment.player ? nameOf(state, me, live.moment.player) : null }) : null;
    const top = mine.players.slice().sort((a, b) => b.stats.pts - a.stats.pts || a.id.localeCompare(b.id)).slice(0, 5)
      .map(p => ({ id: p.id, name: p.name, pts: p.stats.pts, reb: p.stats.orb + p.stats.drb, ast: p.stats.ast, pf: p.stats.pf, onCourt: mine.onCourt.includes(p.id), me: p.id === live.myPlayerId }));
    const mePlayer = live.myPlayerId ? mine.players.find(p => p.id === live.myPlayerId) : null;
    return {
      teams: state.teams.map(t => t.name), userTeam: me, mode: live.mode, score: state.score.slice(), period: state.period,
      periodLabel: Rules.periodLabel(prof, state.period), clock: state.gameClock, periods: prof.periods,
      timeouts: mine.timeouts, possession: state.offense, feed, moment, finished: live.finished, outcome: live.outcome,
      top, me: mePlayer ? { name: mePlayer.name, pts: mePlayer.stats.pts, pf: mePlayer.stats.pf, onCourt: mine.onCourt.includes(mePlayer.id) } : null,
      decisions: live.decisions.filter(d => !d.auto).map(d => ({ type: d.type, choice: d.choice, result: d.result || null }))
    };
  }

  function validate(live) {
    const object = v => v && typeof v === 'object' && !Array.isArray(v);
    const errors = [];
    if (!object(live) || live.schemaVersion !== 1) return { ok: false, errors: ['invalid live match'] };
    if (!['coach', 'player'].includes(live.mode) || ![0, 1].includes(live.userTeam)) errors.push('invalid live mode/team');
    const m = live.match;
    if (!object(m) || !Array.isArray(m.teams) || m.teams.length !== 2 || !Array.isArray(m.events) || m.events.length > 2000 || !Array.isArray(m.score) || !object(m.rng)) errors.push('invalid live engine state');
    if (!Array.isArray(live.decisions) || live.decisions.length > 200 || !object(live.seen)) errors.push('invalid live decisions');
    if (live.moment != null && (!object(live.moment) || !MOMENTS[live.moment.type])) errors.push('invalid live moment');
    return { ok: !errors.length, errors };
  }

  CAA.Live = { MOMENTS, create, advance, detect, view, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Live;
})(typeof globalThis !== 'undefined' ? globalThis : this);
