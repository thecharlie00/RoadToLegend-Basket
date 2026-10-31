(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const Hash = CAA.Hash || (typeof require === 'function' ? require('../core/hash.js') : null);
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const Rules = CAA.Rules || (typeof require === 'function' ? require('./rules.js') : null);
  const Names = CAA.Names || (typeof require === 'function' ? require('../domain/names.js') : null);

  const ATTRS = ['tiroCerca','tiroMedia','tiroTriple','tiroLibre','bandeja','mate','poste','manejo','pase','vision','defExterior','defInterior','robo','tapon','rebOf','rebDef','velocidad','aceleracion','salto','fuerza','resistencia','durabilidad','lectura','clutch','liderazgo'];
  const ZONES = ['restricted','paint','midShort','midLong','corner3','above3'];
  const BASE = { restricted: 0.72, paint: 0.58, midShort: 0.51, midLong: 0.49, corner3: 0.41, above3: 0.405 };
  const ZONE_ATTR = { restricted: 'tiroCerca', paint: 'poste', midShort: 'tiroMedia', midLong: 'tiroMedia', corner3: 'tiroTriple', above3: 'tiroTriple' };
  const DEFAULT_TACTIC = { pace: 0.5, threeRate: 0.415, insideRate: 0.42, press: 0.2, zone: 0.15, switch: 0.3, help: 0.5, crash: 0.28, foulIntentional: 0 };
  const TUNING = {
    setupBase: 36.5, setupPace: 42.5, setupRandom: 25,
    actionBase: 16, actionRandom: 26, flight: 9,
    tovBase: 0.115, tovPress: 0.02, tovFatigue: 0.015, tovManejo: 0.0015, tovLectura: 0.0008,
    foulBase: 0.165, foulInside: 0.02, foulPress: 0.01, shootingFoul: 0.34, stealShare: 0.58,
    blockRestricted: 0.14, blockPaint: 0.091, blockOther: 0.004,
    orbBase: 0.235, orbCrash: 0.08, teamRebChance: 0.10,
    assistThree: 0.75, assistRestricted: 0.55, assistOther: 0.62, andOneChance: 0.025,
    contestBase: 0.008, contestDef: 0.00025, contestHelp: 0.008, contestRandom: 0.018, contestManejo: 0.0004,
    fatigueMake: 0.04, fatigueRate: 60000,
    ftBase: 0.785, ftSkill: 0.004, ftFatigue: 0.03, ftTime: 4,
    inboundMade: 20, inboundTurnover: 15, inboundSteal: 25, reboundOff: 12, reboundDef: 18, teamRebound: 15, foulDead: 15
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function attr(p, k) { return p.attrs && p.attrs[k] != null ? p.attrs[k] : 50; }
  function playerStat() { return { min: 0, pts: 0, fgm: 0, fga: 0, '2pm': 0, '2pa': 0, '3pm': 0, '3pa': 0, ftm: 0, fta: 0, orb: 0, drb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0, plusMinus: 0 }; }
  function teamStat() { return { pts: 0, fgm: 0, fga: 0, '2pm': 0, '2pa': 0, '3pm': 0, '3pa': 0, ftm: 0, fta: 0, orb: 0, drb: 0, teamReb: 0, ast: 0, stl: 0, blk: 0, tov: 0, teamTov: 0, pf: 0, possessions: 0, ftTrips: 0, andOne: 0 }; }

  function makePlayer(id, name, pos, rating, starter) {
    const attrs = {};
    for (const k of ATTRS) attrs[k] = rating;
    if (pos === 'C' || pos === 'PF') { attrs.tiroCerca += 6; attrs.poste += 6; attrs.rebOf += 6; attrs.rebDef += 6; attrs.tapon += 6; attrs.tiroTriple -= 8; attrs.manejo -= 6; }
    if (pos === 'PG' || pos === 'SG') { attrs.tiroTriple += 5; attrs.manejo += 6; attrs.pase += 6; attrs.robo += 4; attrs.rebOf -= 5; attrs.tapon -= 5; }
    return { id, name, pos, starter: !!starter, attrs, fatigue: 0, fouls: 0, stats: playerStat(), onCourtTenths: 0 };
  }
  function demoTeam(id, name, rating) {
    const pos = ['PG','SG','SF','PF','C','PG','SG','SF','PF','C','SF','SG'];
    // Solo se generan nombres de jugadores; el nombre del equipo no se modifica.
    const inspired = Names.inspiredName(id + ':demo-star', { scope: 'na', maxTier: 1 });
    const rosterNames = Names.generateRosterNames(id + ':demo', 'DEFAULT', pos.length);
    const players = pos.map((p, i) => makePlayer(id + '-p' + (i + 1), i === 0 && inspired ? inspired.full : rosterNames[i] ? rosterNames[i].full : name + ' ' + (i + 1), p, rating + (i < 5 ? 2 : -3), i < 5));
    return { id, name, players, tactic: Object.assign({}, DEFAULT_TACTIC), stats: teamStat(), foulsByPeriod: {}, lateFouls: 0, timeouts: 0, onCourt: players.slice(0, 5).map(p => p.id) };
  }
  function neutralTeams(rating) { return [demoTeam('home', 'Home', rating || 50), demoTeam('away', 'Away', rating || 50)]; }

  function createMatch(config = {}) {
    const ruleSetId = config.ruleSetId || 'FIBA-2026';
    const profile = Rules.getProfile(ruleSetId);
    const teams = config.teams || neutralTeams(config.rating);
    if (teams.length !== 2) throw new Error('two teams required');
    for (const t of teams) {
      if (!Array.isArray(t.players) || t.players.length < 5) throw new Error('team needs at least five players: ' + t.id);
      t.stats = teamStat();
      t.foulsByPeriod = {};
      t.lateFouls = 0;
      t.tactic = Object.assign({}, DEFAULT_TACTIC, t.tactic || {});
      const starters = t.players.filter(p => p.starter).slice(0, 5);
      t.onCourt = (starters.length === 5 ? starters : t.players.slice(0, 5)).map(p => p.id);
      for (const p of t.players) { p.stats = playerStat(); p.fatigue = 0; p.fouls = 0; p.onCourtTenths = 0; }
      t.timeouts = profile.timeouts.total || ((profile.timeouts.firstHalf || 0) + (profile.timeouts.secondHalf || 0));
    }
    teams[0].stats.possessions = 1;
    const rng = RNG.create(config.seed == null ? 'camino-al-aro' : config.seed);
    const state = {
      matchId: config.matchId || 'match-' + Hash.hex32(Hash.hashObject({ seed: config.seed, ruleSetId })),
      ruleSetId, period: 1, gameClock: profile.periodMinutes * 600, shotClock: Rules.newPossessionClock(profile),
      score: [0, 0], offense: 0, phase: 'live', teams, events: [], possessions: [1, 0],
      tuning: Object.assign({}, TUNING, config.tuning || {}),
      rng: rng.serialize(), hash: '00000000', final: false, winner: null, overtimeCount: 0,
      arrow: 1, log: [], lineups: []
    };
    record(state, { type: 'start', ruleSetId, period: 1 });
    return state;
  }

  function record(state, event) {
    event.period = state.period;
    event.clock = state.gameClock;
    event.seq = state.events.length;
    state.events.push(event);
    // Parallel presentation metadata: exact on-court five at record time, excluded from the authoritative hash.
    state.lineups.push({ seq: event.seq, teams: state.teams.map(t => t.onCourt.slice()) });
    state.hash = Hash.hex32(Hash.hashObject({ prev: state.hash, event, score: state.score, clock: state.gameClock }));
    return event;
  }
  function consume(state, tenths) {
    const used = Math.min(state.gameClock, Math.max(0, Math.round(tenths)));
    state.gameClock -= used;
    state.shotClock = Math.max(0, state.shotClock - used);
    for (const t of state.teams) for (const id of t.onCourt) {
      const p = t.players.find(x => x.id === id);
      if (p) { p.onCourtTenths += used; p.stats.min = p.onCourtTenths / 600; p.fatigue = clamp(p.fatigue + used / state.tuning.fatigueRate * (1.1 - attr(p, 'resistencia') / 100), 0, 1); }
    }
    return used;
  }
  function chooseWeighted(rng, items, weightFn) {
    let total = 0; const weights = items.map(i => { const w = Math.max(0.0001, weightFn(i)); total += w; return w; });
    let r = rng.float() * total;
    for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }
  function rotate(state, team) {
    const available = team.players.filter(p => !Rules.foulOut(Rules.getProfile(state.ruleSetId), p.fouls));
    const scored = available.map(p => ({ p, w: (p.starter ? 1.55 : 0.85) * (1 - p.fatigue * 0.55) * (1 + attr(p, 'resistencia') / 250) }));
    const five = [];
    const pool = scored.slice();
    for (let i = 0; i < 5 && pool.length; i++) {
      const pick = chooseWeighted(state._rng, pool, x => x.w);
      five.push(pick.p.id);
      pool.splice(pool.indexOf(pick), 1);
    }
    if (five.length === 5) team.onCourt = five;
  }
  function onCourtPlayers(team) { return team.onCourt.map(id => team.players.find(p => p.id === id)).filter(Boolean); }
  function addPlusMinus(state, offense, delta) {
    for (const id of state.teams[offense].onCourt) { const p = state.teams[offense].players.find(x => x.id === id); if (p) p.stats.plusMinus += delta; }
    for (const id of state.teams[1 - offense].onCourt) { const p = state.teams[1 - offense].players.find(x => x.id === id); if (p) p.stats.plusMinus -= delta; }
  }
  function changePossession(state, next, reset) {
    state.offense = next;
    state.shotClock = reset == null ? Rules.newPossessionClock(Rules.getProfile(state.ruleSetId)) : reset;
    state.possessions[next]++;
    state.teams[next].stats.possessions = state.possessions[next];
  }
  function endPeriodIfNeeded(state) {
    if (state.gameClock > 0) return false;
    const profile = Rules.getProfile(state.ruleSetId);
    record(state, { type: 'periodEnd', period: state.period, score: state.score.slice() });
    if (state.period >= profile.periods && state.score[0] !== state.score[1]) {
      state.final = true; state.phase = 'final'; state.winner = state.score[0] > state.score[1] ? 0 : 1;
      record(state, { type: 'final', winner: state.winner, score: state.score.slice() });
      return true;
    }
    state.period++;
    if (state.period > profile.periods) state.overtimeCount++;
    state.gameClock = (state.period > profile.periods ? profile.overtimeMinutes : profile.periodMinutes) * 600;
    state.shotClock = Rules.newPossessionClock(profile);
    if (profile.alternatingPossession) { state.offense = state.arrow; state.arrow = 1 - state.arrow; }
    else state.offense = state.period % 2 === 0 ? 1 : 0;
    for (const t of state.teams) t.lateFouls = 0;
    state.possessions[state.offense]++;
    state.teams[state.offense].stats.possessions = state.possessions[state.offense];
    record(state, { type: 'periodStart', period: state.period, offense: state.offense });
    return true;
  }

  function shootFreeThrows(state, team, player, count, oneAndOne, reason) {
    let made = 0, lastMade = false;
    for (let i = 0; i < count; i++) {
      const p = clamp(state.tuning.ftBase + (attr(player, 'tiroLibre') - 50) * state.tuning.ftSkill - player.fatigue * state.tuning.ftFatigue, 0.35, 0.97);
      const ok = state._rng.float() < p;
      lastMade = ok;
      player.stats.fta++; team.stats.fta++;
      if (ok) { made++; player.stats.ftm++; team.stats.ftm++; player.stats.pts++; team.stats.pts++; state.score[state.offense]++; }
      record(state, { type: 'ft', team: state.offense, player: player.id, made: ok, reason, attempt: i + 1, of: count });
      if (oneAndOne && !ok) break;
      consume(state, state.tuning.ftTime);
      if (state.gameClock === 0) break;
    }
    if (made) addPlusMinus(state, state.offense, made);
    team.stats.ftTrips++;
    if (state.gameClock === 0) { endPeriodIfNeeded(state); return; }
    if (lastMade) {
      changePossession(state, 1 - state.offense);
      consume(state, state.tuning.inboundMade);
    } else {
      rebound(state, true);
    }
  }

  function rebound(state, fromFT) {
    const profile = Rules.getProfile(state.ruleSetId);
    const off = state.offense, def = 1 - off;
    const offenseTeam = state.teams[off], defenseTeam = state.teams[def];
    const offPlayers = onCourtPlayers(offenseTeam), defPlayers = onCourtPlayers(defenseTeam);
    const crash = offenseTeam.tactic.crash;
    const orbChance = clamp(state.tuning.orbBase + crash * state.tuning.orbCrash + (avg(offPlayers, 'rebOf') - avg(defPlayers, 'rebDef')) * 0.002, 0.12, 0.38);
    if (state._rng.float() < state.tuning.teamRebChance) {
      const orb = state._rng.float() < orbChance;
      state.teams[orb ? off : def].stats.teamReb++;
      record(state, { type: 'teamRebound', team: orb ? off : def, orb });
      if (orb) { state.shotClock = Rules.offensiveReboundClock(profile); }
      else changePossession(state, def);
      consume(state, state.tuning.teamRebound);
      return;
    }
    if (state._rng.float() < orbChance) {
      const p = chooseWeighted(state._rng, offPlayers, x => 1 + attr(x, 'rebOf') / 40 + attr(x, 'salto') / 80);
      p.stats.orb++; offenseTeam.stats.orb++;
      record(state, { type: 'rebound', team: off, player: p.id, orb: true, fromFT: !!fromFT });
      state.shotClock = Rules.offensiveReboundClock(profile);
      consume(state, state.tuning.reboundOff);
    } else {
      const p = chooseWeighted(state._rng, defPlayers, x => 1 + attr(x, 'rebDef') / 40 + attr(x, 'salto') / 80);
      p.stats.drb++; defenseTeam.stats.drb++;
      record(state, { type: 'rebound', team: def, player: p.id, orb: false, fromFT: !!fromFT });
      changePossession(state, def);
      consume(state, state.tuning.reboundDef);
    }
  }
  function avg(players, k) { return players.reduce((s, p) => s + attr(p, k), 0) / Math.max(1, players.length); }

  function simulatePossession(state) {
    if (state.final) return state;
    state._rng = RNG.create(0); state._rng.restore(state.rng);
    const T = state.tuning;
    const profile = Rules.getProfile(state.ruleSetId);
    const off = state.offense, def = 1 - off;
    const offense = state.teams[off], defense = state.teams[def];
    rotate(state, offense); rotate(state, defense);
    const offPlayers = onCourtPlayers(offense), defPlayers = onCourtPlayers(defense);
    const pace = offense.tactic.pace;
    const setup = Math.round(T.setupBase + (1 - pace) * T.setupPace + state._rng.float() * T.setupRandom);
    consume(state, setup);
    if (state.gameClock === 0 || state.shotClock === 0) {
      if (state.shotClock === 0 && state.gameClock > 0) {
        record(state, { type: 'shotClockViolation', team: off });
        offense.stats.tov++; offense.stats.teamTov++;
        changePossession(state, def);
      }
      endPeriodIfNeeded(state);
      state.rng = state._rng.serialize();
      return state;
    }
    const handler = chooseWeighted(state._rng, offPlayers, p => 1 + attr(p, 'manejo') / 50 + (p.pos === 'PG' ? 0.8 : 0));
    const defender = chooseWeighted(state._rng, defPlayers, p => 1 + attr(p, 'defExterior') / 60);
    const tovChance = clamp(T.tovBase + defense.tactic.press * T.tovPress + handler.fatigue * T.tovFatigue - (attr(handler, 'manejo') - 50) * T.tovManejo - (attr(handler, 'lectura') - 50) * T.tovLectura, 0.05, 0.20);
    if (state._rng.float() < tovChance) {
      const steal = state._rng.float() < T.stealShare;
      handler.stats.tov++; offense.stats.tov++;
      if (steal) { defender.stats.stl++; defense.stats.stl++; }
      record(state, { type: 'turnover', team: off, player: handler.id, steal, defender: defender.id });
      changePossession(state, def);
      consume(state, steal ? T.inboundSteal : T.inboundTurnover);
      endPeriodIfNeeded(state);
      state.rng = state._rng.serialize();
      return state;
    }
    const foulChance = clamp(T.foulBase + offense.tactic.insideRate * T.foulInside + defense.tactic.press * T.foulPress, 0.08, 0.26);
    if (state._rng.float() < foulChance) {
      const fouler = chooseWeighted(state._rng, defPlayers, p => 1 + (100 - attr(p, 'defInterior')) / 100);
      fouler.fouls++; fouler.stats.pf++; defense.stats.pf++;
      const bucket = Rules.foulBucketKey(profile, state.period);
      defense.foulsByPeriod[bucket] = (defense.foulsByPeriod[bucket] || 0) + 1;
      if (state.period <= profile.periods && state.gameClock <= 1200) defense.lateFouls++;
      const teamFouls = Rules.teamFoulBucket(profile, state.period, defense.foulsByPeriod);
      const shooting = state._rng.float() < T.shootingFoul;
      record(state, { type: 'foul', team: def, player: fouler.id, shooting, teamFouls, foulOut: Rules.foulOut(profile, fouler.fouls) });
      consume(state, 8);
      if (shooting) {
        const zone = pickZone(state, offense);
        const fts = zone === 'corner3' || zone === 'above3' ? 3 : 2;
        shootFreeThrows(state, offense, handler, fts, false, 'shooting');
      } else {
        const bonus = Rules.bonusState(profile, teamFouls, state.period, state.gameClock, defense.lateFouls);
        if (bonus.freeThrows > 0) shootFreeThrows(state, offense, handler, bonus.freeThrows, bonus.oneAndOne, 'bonus');
        else { state.shotClock = Rules.frontcourtResetClock(profile, state.shotClock); consume(state, T.foulDead); }
      }
      endPeriodIfNeeded(state);
      state.rng = state._rng.serialize();
      return state;
    }
    const zone = pickZone(state, offense);
    const shooter = chooseWeighted(state._rng, offPlayers, p => {
      const a = attr(p, ZONE_ATTR[zone]);
      return 0.5 + a / 50 + (p.starter ? 0.25 : 0);
    });
    const primary = chooseWeighted(state._rng, defPlayers, p => 1 + attr(p, zone === 'restricted' || zone === 'paint' ? 'defInterior' : 'defExterior') / 60);
    const contest = clamp(T.contestBase + (attr(primary, 'defExterior') + attr(primary, 'defInterior')) / 2 * T.contestDef + defense.tactic.help * T.contestHelp + state._rng.float() * T.contestRandom - (attr(shooter, 'manejo') - 50) * T.contestManejo, 0, 0.10);
    const blockChance = zone === 'restricted' ? clamp(T.blockRestricted + (attr(primary, 'tapon') - 50) * 0.0015, 0.02, 0.22) : zone === 'paint' ? clamp(T.blockPaint + (attr(primary, 'tapon') - 50) * 0.0012, 0.01, 0.18) : T.blockOther;
    const actionTime = Math.round(T.actionBase + state._rng.float() * T.actionRandom + (zone === 'restricted' ? -6 : 6));
    consume(state, actionTime);
    if (state.shotClock === 0 && state.gameClock > 0) {
      record(state, { type: 'shotClockViolation', team: off });
      offense.stats.tov++; offense.stats.teamTov++;
      changePossession(state, def);
      endPeriodIfNeeded(state);
      state.rng = state._rng.serialize();
      return state;
    }
    if (state.gameClock === 0 && state.shotClock === 0) {
      endPeriodIfNeeded(state);
      state.rng = state._rng.serialize();
      return state;
    }
    if (state._rng.float() < blockChance) {
      primary.stats.blk++; defense.stats.blk++;
      record(state, { type: 'block', team: def, player: primary.id, shooter: shooter.id, zone });
      shooter.stats.fga++; offense.stats.fga++;
      if (zone === 'corner3' || zone === 'above3') { shooter.stats['3pa']++; offense.stats['3pa']++; } else { shooter.stats['2pa']++; offense.stats['2pa']++; }
      rebound(state, false);
      endPeriodIfNeeded(state);
      state.rng = state._rng.serialize();
      return state;
    }
    const isThree = zone === 'corner3' || zone === 'above3';
    const skill = attr(shooter, ZONE_ATTR[zone]);
    const clutch = Math.abs(state.score[0] - state.score[1]) <= 5 && state.gameClock <= 1200 ? (attr(shooter, 'clutch') - 50) * 0.001 : 0;
    const pMake = clamp(BASE[zone] + (skill - 50) * 0.005 - contest - shooter.fatigue * T.fatigueMake + clutch, 0.05, 0.95);
    const made = state._rng.float() < pMake;
    shooter.stats.fga++; offense.stats.fga++;
    if (isThree) { shooter.stats['3pa']++; offense.stats['3pa']++; } else { shooter.stats['2pa']++; offense.stats['2pa']++; }
    consume(state, T.flight);
    if (made) {
      const pts = isThree ? 3 : 2;
      shooter.stats.fgm++; offense.stats.fgm++;
      if (isThree) { shooter.stats['3pm']++; offense.stats['3pm']++; } else { shooter.stats['2pm']++; offense.stats['2pm']++; }
      shooter.stats.pts += pts; offense.stats.pts += pts; state.score[off] += pts;
      const assistChance = isThree ? T.assistThree : zone === 'restricted' ? T.assistRestricted : T.assistOther;
      let assister = null;
      if (state._rng.float() < assistChance) {
        const mates = offPlayers.filter(p => p.id !== shooter.id);
        assister = chooseWeighted(state._rng, mates, p => 1 + attr(p, 'pase') / 40 + attr(p, 'vision') / 50);
        assister.stats.ast++; offense.stats.ast++;
      }
      addPlusMinus(state, off, pts);
      record(state, { type: 'shot', team: off, player: shooter.id, zone, made: true, points: pts, assist: assister ? assister.id : null, p: +pMake.toFixed(3) });
      if (state._rng.float() < T.andOneChance) {
        const fouler = chooseWeighted(state._rng, defPlayers, p => 1);
        fouler.fouls++; fouler.stats.pf++; defense.stats.pf++;
        const bucket = Rules.foulBucketKey(profile, state.period);
        defense.foulsByPeriod[bucket] = (defense.foulsByPeriod[bucket] || 0) + 1;
        if (state.period <= profile.periods && state.gameClock <= 1200) defense.lateFouls++;
        offense.stats.andOne++;
        record(state, { type: 'andOneFoul', team: def, player: fouler.id });
        shootFreeThrows(state, offense, shooter, 1, false, 'andOne');
      } else {
        changePossession(state, def);
        consume(state, T.inboundMade);
      }
    } else {
      record(state, { type: 'shot', team: off, player: shooter.id, zone, made: false, points: 0, p: +pMake.toFixed(3) });
      rebound(state, false);
    }
    endPeriodIfNeeded(state);
    state.rng = state._rng.serialize();
    return state;
  }
  function pickZone(state, offense) {
    const t = offense.tactic;
    const three = clamp(t.threeRate, 0.15, 0.65);
    const inside = clamp(t.insideRate, 0.2, 0.65);
    const weights = {
      restricted: inside * 0.68,
      paint: inside * 0.32,
      midShort: (1 - three - inside) * 0.58,
      midLong: (1 - three - inside) * 0.42,
      corner3: three * 0.30,
      above3: three * 0.70
    };
    return chooseWeighted(state._rng, ZONES, z => weights[z]);
  }

  function simulateMatch(config) {
    const state = createMatch(config);
    const maxPossessions = config.maxPossessions || 600;
    let guard = 0;
    while (!state.final && guard++ < maxPossessions) simulatePossession(state);
    if (!state.final) throw new Error('match did not finish within possession guard');
    state.teams.forEach((t, i) => { t.stats.possessions = state.possessions[i]; });
    delete state._rng;
    return state;
  }
  function serializeMatch(state) {
    const copy = JSON.parse(JSON.stringify(state));
    delete copy._rng;
    return copy;
  }
  function resumeMatch(snapshot) {
    const state = JSON.parse(JSON.stringify(snapshot));
    state.tuning = Object.assign({}, TUNING, state.tuning || {});
    state.lineups = Array.isArray(state.lineups) ? state.lineups : [];
    state._rng = RNG.create(0); state._rng.restore(state.rng);
    return state;
  }
  function replay(state, context = {}) {
    // Presentation-only snapshot: never rerun or alter the authoritative possession log.
    return { schemaVersion: 1, context,
      state: { matchId: state.matchId, ruleSetId: state.ruleSetId, hash: state.hash, score: state.score.slice(), period: state.period, overtimeCount: state.overtimeCount, final: state.final, winner: state.winner,
        events: JSON.parse(JSON.stringify(state.events)), lineups: JSON.parse(JSON.stringify(state.lineups || [])), teams: state.teams.map(t => ({ id: t.id, name: t.name, players: t.players.map(p => ({ id: p.id, name: p.name, pos: p.pos })) })) },
      box: boxScore(state), validation: validateBox(state) };
  }
  function boxScore(state) {
    return state.teams.map(t => ({
      id: t.id, name: t.name, score: state.score[state.teams.indexOf(t)], stats: t.stats,
      players: t.players.map(p => ({ id: p.id, name: p.name, pos: p.pos, min: +p.stats.min.toFixed(1), pts: p.stats.pts, fgm: p.stats.fgm, fga: p.stats.fga, '3pm': p.stats['3pm'], '3pa': p.stats['3pa'], ftm: p.stats.ftm, fta: p.stats.fta, orb: p.stats.orb, drb: p.stats.drb, ast: p.stats.ast, stl: p.stats.stl, blk: p.stats.blk, tov: p.stats.tov, pf: p.stats.pf, plusMinus: p.stats.plusMinus }))
    }));
  }
  function validateBox(state) {
    const errors = [];
    const profile = Rules.getProfile(state.ruleSetId);
    const totalMinutes = profile.periods * profile.periodMinutes + state.overtimeCount * profile.overtimeMinutes;
    const sumKeys = ['fgm','fga','2pm','2pa','3pm','3pa','ftm','fta','orb','drb','ast','stl','blk','tov','pf','pts'];
    state.teams.forEach((t, i) => {
      const s = t.stats;
      if (s.pts !== s['2pm'] * 2 + s['3pm'] * 3 + s.ftm) errors.push(t.id + ' points mismatch');
      if (s.fga !== s['2pa'] + s['3pa']) errors.push(t.id + ' fga mismatch');
      if (s.fgm !== s['2pm'] + s['3pm']) errors.push(t.id + ' fgm mismatch');
      if (state.score[i] !== s.pts) errors.push(t.id + ' score mismatch');
      for (const k of sumKeys) {
        const pSum = t.players.reduce((a, p) => a + (p.stats[k] || 0), 0);
        const expected = k === 'tov' ? pSum + (s.teamTov || 0) : pSum;
        if (expected !== s[k]) errors.push(t.id + ' player ' + k + ' mismatch');
      }
      const minSum = t.players.reduce((a, p) => a + p.stats.min, 0);
      if (Math.abs(minSum - totalMinutes * 5) > 0.2) errors.push(t.id + ' minutes mismatch');
      const pmSum = t.players.reduce((a, p) => a + p.stats.plusMinus, 0);
      if (pmSum !== (state.score[i] - state.score[1 - i]) * 5) errors.push(t.id + ' plusMinus mismatch');
      if (s.stl > state.teams[1 - i].stats.tov) errors.push(t.id + ' steals exceed opponent turnovers');
      if (state.final && s.possessions !== state.possessions[i]) errors.push(t.id + ' possessions mismatch');
    });
    if (state.final && state.score[0] === state.score[1]) errors.push('final tie');
    return { ok: errors.length === 0, errors };
  }

  CAA.Match = { ATTRS, ZONES, BASE, TUNING, createMatch, simulatePossession, simulateMatch, serializeMatch, resumeMatch, replay, boxScore, validateBox, neutralTeams, demoTeam, makePlayer, DEFAULT_TACTIC };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Match;
})(typeof globalThis !== 'undefined' ? globalThis : this);
