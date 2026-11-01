(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const Hash = CAA.Hash || (typeof require === 'function' ? require('../core/hash.js') : null);
  const Match = CAA.Match || (typeof require === 'function' ? require('../match/engine.js') : null);
  const Player = CAA.Player || (typeof require === 'function' ? require('./player.js') : null);
  const Contracts = CAA.Contracts || (typeof require === 'function' ? require('./contracts.js') : null);
  const Season = CAA.Season || (typeof require === 'function' ? require('./season.js') : null);
  const Draft = CAA.Draft || (typeof require === 'function' ? require('./draft.js') : null);
  const Content = CAA.Content || (typeof require === 'function' ? require('./content.js') : null);
  const Minigames = CAA.Minigames || (typeof require === 'function' ? require('../match/minigames.js') : null);
  const Live = CAA.Live || (typeof require === 'function' ? require('../match/live.js') : null);
  const Arcade = CAA.Arcade || (typeof require === 'function' ? require('../match/arcade.js') : null);
  const Pet = CAA.Pet || (typeof require === 'function' ? require('./pet.js') : null);
  const Playoffs = CAA.Playoffs || (typeof require === 'function' ? require('./playoffs.js') : null);
  const Family = CAA.Family || (typeof require === 'function' ? require('./family.js') : null);

  const MODES = ['player', 'coach'];
  const ROUTES = ['eu-academy', 'na-draft', 'na-undrafted', 'world'];

  function createCareer(config = {}) {
    const mode = config.mode || 'player';
    if (!MODES.includes(mode)) throw new Error('unknown mode');
    if (config.archetype && !Player.ARCHETYPES.includes(config.archetype)) throw new Error('unknown archetype');
    if (config.handedness && !['left', 'right'].includes(config.handedness)) throw new Error('unknown handedness');
    const route = config.route || (mode === 'coach' ? 'eu-academy' : 'eu-academy');
    const seed = config.seed == null ? 'career' : config.seed;
    const rng = RNG.create(seed);
    if (config.leagueId && !Season.LEAGUES[config.leagueId]) throw new Error('unknown league');
    const leagueId = config.leagueId || (route === 'eu-academy' ? 'es-ascenso-iberico' : 'na-boreal-men');
    const season = Season.createSeason(leagueId, seed + ':season');
    const pair = Season.LEAGUES[leagueId].pair;
    const topSeason = pair ? Season.createSeason(pair, seed + ':season-top') : null;
    const club = config.clubId ? season.clubs.find(c => c.id === config.clubId) : season.clubs[season.clubs.length - 1];
    if (!club) throw new Error('club not found');
    const state = {
      schemaVersion: 1, careerId: config.careerId || 'career-' + Hash.hex32(Hash.hashString(String(seed))),
      mode, route: config.leagueId && route !== 'na-draft' && route !== 'na-undrafted' && leagueId !== 'es-ascenso-iberico' ? 'world' : route, seed, rng: rng.serialize(), week: 0, year: 2026, season, topSeason, clubId: club.id, startingClubId: club.id,
      player: null, coach: null, inbox: [], market: [], draft: null, history: [], hash: '00000000'
    };
    if (mode === 'player') {
      const p = Player.createPlayer({ seed: seed + ':myplayer', gender: Season.genderOf(leagueId), nationality: config.nationality || 'ES', pos: config.pos || 'SG', archetype: config.archetype || 'shooter', handedness: config.handedness || 'right', name: config.name || undefined, age: config.age || 19, quality: config.quality || 52 });
      // Tu jugador siempre tiene margen real: el techo oculto queda 14-28 puntos por encima de su media inicial.
      p.potential = Math.max(p.potential, Math.min(95, p.ovr + 14 + rng.int(0, 14)));
      p.number = Number.isInteger(config.number) && config.number >= 0 && config.number <= 99 ? config.number : 7;
      p.coachTrust = 55; p.confidence = 0;
      p.contract = Contracts.offerForPlayer(p, club, rng, Contracts.NA_ECONOMY_2026_27);
      club.roster.push(p);
      state.player = p;
      state.inbox.push({ type: 'welcome', text: 'welcome', week: 0 });
    } else {
      state.coach = { name: config.name || 'Coach', authority: config.authority || 'coach', morale: 70, trust: 65 };
      state.inbox.push({ type: 'welcome', text: 'welcome-coach', week: 0 });
    }
    if ((route === 'na-draft' || route === 'na-undrafted') && leagueId === 'na-boreal-men') {
      const table = Season.standings(season.clubs);
      const lottery = Draft.lotteryOrder(table.slice(-14).map(r => r.id), seed + ':lottery');
      const order = Draft.draftOrder(lottery, table.slice(0, 16).map(r => r.id));
      if (mode === 'player' && route === 'na-draft') {
        const prospects = Draft.generateProspects(seed + ':class', 79);
        state.player.draftProjection = Math.max(1, Math.min(60, 31 - Math.round((state.player.ovr - 50) / 2)));
        prospects.push(state.player);
        prospects.sort((a, b) => a.draftProjection - b.draftProjection);
        state.draft = Draft.runDraft({ seed: seed + ':draft', order, prospects });
        const pick = state.draft.picks.find(p => p.player === state.player.id);
        if (pick) {
          club.roster = club.roster.filter(p => p.id !== state.player.id);
          const draftClub = season.clubsById[pick.team];
          draftClub.roster.push(state.player);
          state.clubId = draftClub.id;
          state.inbox.push({ type: 'drafted', week: 0, detail: pick });
        } else {
          state.player.contract = Draft.undraftedOffer(state.player, club, rng);
          state.inbox.push({ type: 'undrafted', week: 0 });
        }
      } else {
        state.draft = Draft.runDraft({ seed: seed + ':draft', order });
        if (mode === 'player' && route === 'na-undrafted') {
          state.player.contract = Draft.undraftedOffer(state.player, club, rng);
          state.inbox.push({ type: 'undrafted', week: 0 });
        }
      }
    }
    Content.ensureLife(state);
    Content.press(state);
    { const evRng = RNG.create(seed + ':story0'); Content.maybeEvent(state, evRng); }
    record(state, { type: 'create', mode, route, clubId: state.clubId, startingClubId: club.id, archetype: state.player ? state.player.archetype : null, handedness: state.player ? state.player.handedness : null });
    return state;
  }
  function record(state, event) {
    event.week = state.week;
    state.hash = Hash.hex32(Hash.hashObject({ prev: state.hash, event }));
    return event;
  }
  function clubOf(state) { return state.season.clubsById[state.clubId] || (state.topSeason && state.topSeason.clubsById[state.clubId]); }
  function advanceWeek(state, action) {
    if (state.careerOver) throw new Error('career is over');
    if (state.retirement && state.retirement.pending) throw new Error('retirement decision pending');
    const rng = RNG.create(0); rng.restore(state.rng);
    const club = clubOf(state);
    const act = action || { type: 'play' };
    const lifeNow = Content.ensureLife(state);
    if (lifeNow.lastOutcome && lifeNow.lastOutcome.week < state.week) lifeNow.lastOutcome = null;
    if (act.type === 'rest') lifeNow.counters.rests = (lifeNow.counters.rests || 0) + 1;
    if (act.type === 'family') lifeNow.counters.familyWeeks = (lifeNow.counters.familyWeeks || 0) + 1;
    if (state.player) {
      const p = state.player;
      const devScale = 34 / Math.max(1, state.season.schedule.length);
      if (act.type === 'train') { Player.develop(p, { focus: act.focus || 'tiroTriple', scale: devScale * 1.6 }, rng); p.load = Math.min(100, p.load + 12); Content.ensureLife(state).counters.train++; }
      else if (act.type === 'family') { Player.recover(p); p.load = Math.max(0, p.load - 15); p.morale = Math.min(100, p.morale + 3); }
      else if (act.type === 'rest') { Player.recover(p); p.load = Math.max(0, p.load - 25); p.fatigue = Math.max(0, p.fatigue - 0.3); p.morale = Math.min(100, p.morale + 2); }
      else { Player.develop(p, { focus: null, scale: devScale }, rng); }
      if (p.injury) { Player.recover(p); state.inbox.push({ type: 'injury', week: state.week, weeks: p.injury ? p.injury.weeksRemaining : 0 }); }
      else if (act.type === 'play') Player.maybeInjure(p, rng);
    }
    state._lastAction = act;
    const season = state.season;
    if (season.round < season.schedule.length) {
      const live = currentLive(state);
      if (live && !live.finished) Live.advance(live, { toEnd: true });
      const overrides = live ? { [live.gameId]: Match.resumeMatch(live.match) } : null;
      const played = Season.playRound(season, state.seed + ':w' + state.week, overrides);
      if (live) { applyLiveOutcome(state, live); state.live = null; }
      afterGames(state, rng, played, club);
      if (season.round >= season.schedule.length) startPlayoffs(state);
    } else if (season.playoffs && !season.playoffs.done) {
      if (act.type === 'skipPlayoffs' && !['playing', 'waiting'].includes(Playoffs.status(season.playoffs, state.clubId))) {
        Playoffs.playAll(season, state.seed + ':po-skip:' + state.week);
        state.live = null;
        endSeason(state, rng);
      } else {
        const live = currentLive(state);
        if (live && !live.finished) Live.advance(live, { toEnd: true });
        const overrides = live ? { [live.gameId]: Match.resumeMatch(live.match) } : null;
        const played = Playoffs.playStep(season, state.seed + ':po:' + state.week, overrides);
        if (live) { applyLiveOutcome(state, live); state.live = null; }
        afterGames(state, rng, played, club);
        if (season.playoffs.done) endSeason(state, rng);
      }
    } else {
      endSeason(state, rng);
    }
    delete state._lastAction;
    state.rng = rng.serialize();
    return state;
  }
  function afterGames(state, rng, played, club) {
    const mine = played && played.find(m => m.teams.some(t => t.id === state.clubId));
    if (mine) state.lastMatch = Match.replay(mine, { week: state.week + 1, year: state.year, clubId: state.clubId, source: 'career', playoff: !!state.season.playoffs });
    state.week++;
    for (const c of state.season.clubs) for (const p of c.roster) { p.load = Math.max(0, Math.round((p.load || 0) * 0.62)); p.fatigue = Math.max(0, (p.fatigue || 0) - 0.08); }
    record(state, { type: 'week', round: state.season.round, step: state.season.playoffs ? state.season.playoffs.step : null, clubWins: club.wins, clubLosses: club.losses });
    const lc = Content.ensureLife(state).counters;
    if (mine) { const myIdx = mine.teams.findIndex(t => t.id === state.clubId); if (mine.winner === myIdx) { lc.totalWins = (lc.totalWins || 0) + 1; if (state.season.playoffs) lc.playoffWins = (lc.playoffWins || 0) + 1; } }
    if (state.coach && mine) lc.coachGames = (lc.coachGames || 0) + 1;
    if (state.coach) coachWeek(state, rng);
    Content.weeklyIncome(state);
    const petWeek = Pet.weekTick(state);
    if (petWeek && petWeek.mood) Content.applyEffects(state, { morale: petWeek.mood });
    const famWeek = Family.weekTick(state, state._lastAction);
    if (famWeek && famWeek.mood) Content.applyEffects(state, { morale: famWeek.mood });
    Content.maybeEvent(state, rng);
    Content.evaluateAchievements(state);
    Content.press(state);
  }
  // Fin de la regular: se cierran los premios y arrancan los playoffs (o el ascenso).
  function startPlayoffs(state) {
    const season = state.season;
    season.playoffs = Playoffs.create(season);
    season.awards = Playoffs.awards(season, season.schedule.length);
    const b = season.playoffs, id = state.clubId;
    const qualified = b.format === 'na' ? ['east', 'west'].some(c => b.seeds[c].indexOf(id) >= 0 && b.seeds[c].indexOf(id) < 10) : (b.seeds.all.includes(id) || b.promoted.includes(id));
    state.inbox.push({ type: qualified ? 'playoffs-in' : 'playoffs-out', week: state.week, detail: { direct: b.promoted.includes(id) } });
    record(state, { type: 'playoffsStart', format: b.format, qualified });
  }
  // Partido de esta semana para el club del usuario (temporada regular o serie de playoffs).
  function currentGame(state) {
    const s = state.season, id = state.clubId;
    if (s.round < s.schedule.length) {
      const round = s.schedule[s.round];
      const index = round.games.findIndex(g => g.home === id || g.away === id);
      if (index < 0) return null;
      const g = round.games[index];
      return { id: g.id, home: g.home, away: g.away, seed: Season.gameSeed(s, state.seed + ':w' + state.week, index), key: 'r' + s.round };
    }
    if (s.playoffs && !s.playoffs.done) {
      const g = Playoffs.pending(s.playoffs).find(x => x.home === id || x.away === id);
      if (g) return { id: g.id, home: g.home, away: g.away, seed: state.seed + ':po:' + state.week + ':' + g.id, key: 'po' + s.playoffs.step, playoff: true };
    }
    return null;
  }
  // Partido en directo de la semana: misma semilla y mismo emparejamiento que la simulación.
  function currentLive(state) {
    const l = state.live, g = l && currentGame(state);
    return l && g && l.week === state.week && l.year === state.year && l.key === g.key && l.gameId === g.id ? l : null;
  }
  function liveStart(state) {
    const existing = currentLive(state);
    if (existing) return existing;
    const season = state.season;
    const g = currentGame(state);
    if (!g) throw new Error('no match this week');
    const teams = [Season.clubToMatchTeam(season.clubsById[g.home]), Season.clubToMatchTeam(season.clubsById[g.away])];
    const myId = state.player ? state.player.id : null;
    const live = Live.create({ seed: g.seed, ruleSetId: season.ruleSet, teams, matchId: g.id, userTeam: g.home === state.clubId ? 0 : 1, mode: state.mode, myPlayerId: myId && teams.some(t => t.players.some(p => p.id === myId)) ? myId : null });
    Object.assign(live, { week: state.week, year: state.year, round: season.round, gameId: g.id, key: g.key, playoff: !!g.playoff });
    state.live = live;
    return live;
  }
  function liveAdvance(state, opts = {}) {
    const live = currentLive(state) || liveStart(state);
    Live.advance(live, opts);
    return live;
  }
  function applyLiveOutcome(state, live) {
    const o = live.outcome;
    if (!o) return;
    if (state.player) {
      const p = state.player;
      p.morale = Math.max(0, Math.min(100, (p.morale || 70) + o.morale));
      p.confidence = Math.max(-8, Math.min(8, (p.confidence || 0) + o.confidence));
      p.coachTrust = Math.max(0, Math.min(100, (p.coachTrust == null ? 60 : p.coachTrust) + o.trust));
    } else if (state.coach) {
      state.coach.morale = Math.max(0, Math.min(100, state.coach.morale + o.morale));
      state.coach.trust = Math.max(0, Math.min(100, state.coach.trust + o.trust));
    }
    const life = Content.ensureLife(state);
    life.counters.live = (life.counters.live || 0) + 1;
    const hero = live.decisions.find(d => !d.auto && d.type === 'lastShot' && d.result === 'made');
    if (hero) life.counters.clutchMakes = (life.counters.clutchMakes || 0) + 1;
    const lc = life.counters, mine = live.decisions.filter(d => !d.auto);
    if (o.won) lc.liveWins = (lc.liveWins || 0) + 1;
    lc.heroShots = (lc.heroShots || 0) + mine.filter(d => d.type === 'lastShot' && d.choice === 'hero').length;
    lc.timeouts = (lc.timeouts || 0) + mine.filter(d => d.choice === 'timeout').length;
    lc.tacticalFouls = (lc.tacticalFouls || 0) + mine.filter(d => d.choice === 'foul').length;
    lc.decisionsLive = (lc.decisionsLive || 0) + mine.length;
    state.inbox.push({ type: 'live', week: state.week, won: o.won, score: o.score, decisions: o.decisions });
    record(state, { type: 'live', hash: o.hash, decisions: live.decisions.filter(d => !d.auto).map(d => d.type + ':' + d.choice) });
  }
  function endSeason(state, rng) {
    const season = state.season;
    const table = Season.standings(season.clubs);
    if (!season.awards) season.awards = Playoffs.awards(season, season.schedule.length);
    const b = season.playoffs;
    season.champion = b && b.champion ? b.champion : table[0].id;
    const fm = b && b.champion ? Playoffs.finalsMvp(season) : null;
    const awardsList = season.awards.concat(fm ? [fm] : []).concat([{ award: 'coy', clubId: table[0].id, club: table[0].name }]);
    const myResult = b ? Playoffs.resultOf(b, state.clubId) : null;
    const myRank = table.find(r => r.id === state.clubId).rank;
    state.history.push({ year: state.year, leagueId: season.leagueId, champion: season.champion, championName: season.clubsById[season.champion].name, runnerUp: b ? b.runnerUp : null,
      table: table.slice(0, 4), clubRank: myRank, result: myResult, awards: awardsList.map(a => ({ award: a.award, player: a.player || null, club: a.club })), promoted: b ? b.promoted.slice() : [] });
    const lc = Content.ensureLife(state).counters;
    const myAwards = [];
    if (state.player) for (const a of awardsList) if (a.playerId === state.player.id) { state.player.career.awards.push({ year: state.year, award: a.award }); myAwards.push(a.award); }
    if (state.coach && awardsList.some(a => a.award === 'coy' && a.clubId === state.clubId)) myAwards.push('coy');
    lc.awards = (lc.awards || 0) + myAwards.length;
    lc.mvps = (lc.mvps || 0) + myAwards.filter(a => a === 'mvp').length;
    lc.allLeague = (lc.allLeague || 0) + myAwards.filter(a => a === 'allLeague').length;
    if (myResult && myResult !== 'missed') lc.playoffApps = (lc.playoffApps || 0) + 1;
    if (myResult === 'final' || myResult === 'champion') lc.finals = (lc.finals || 0) + 1;
    if (season.champion === state.clubId) lc.titles = (lc.titles || 0) + 1;
    const pl = state.player;
    state.lastSeasonSummary = { year: state.year, leagueId: season.leagueId, champion: season.clubsById[season.champion].name, myChampion: season.champion === state.clubId, result: myResult, rank: myRank, teams: table.length,
      record: { wins: clubOf(state).wins, losses: clubOf(state).losses }, promoted: !!(b && b.promoted.includes(state.clubId)),
      stats: pl ? { gp: pl.stats.gp, pts: pl.stats.pts, reb: pl.stats.reb, ast: pl.stats.ast, ovrStart: pl.ovrStart == null ? pl.ovr : pl.ovrStart, ovr: pl.ovr } : null,
      awards: awardsList.map(a => ({ award: a.award, player: a.player || null, club: a.club, mine: myAwards.includes(a.award) && (a.playerId ? state.player && a.playerId === state.player.id : a.clubId === state.clubId) })), myAwards, dismissed: false };
    Content.evaluateAchievements(state);
    if (season.leagueId === 'na-boreal-men') {
      const seeds = Season.naPlayoffSeeds(season);
      const lottery = Draft.lotteryOrder(seeds.lottery, state.seed + ':lottery:' + state.year);
      const order = Draft.draftOrder(lottery, table.slice(0, 16).map(r => r.id));
      state.draft = Draft.runDraft({ seed: state.seed + ':draft:' + state.year, order });
      state.inbox.push({ type: 'draft', week: state.week, year: state.year });
    }
    // Europa: dos ligas enlazadas por ascensos y descensos. state.season es SIEMPRE la liga del club del
    // usuario; state.topSeason guarda la otra liga europea, que se simula de fondo (con su playoff si es la 2.ª).
    let movement = null;
    const other = state.topSeason;
    if (other) {
      Season.playRegularSeason(other, state.seed + ':other:' + state.year);
      if (Season.LEAGUES[other.leagueId].level === 2 && !other.playoffs) { other.playoffs = Playoffs.create(other); Playoffs.playAll(other, state.seed + ':other-po:' + state.year); }
      const top = Season.LEAGUES[season.leagueId].level === 1 ? season : other, second = top === season ? other : season;
      movement = Season.euPromotionRelegation(top, second);
      state.inbox.push({ type: 'promotion-relegation', week: state.week, detail: movement });
      if (movement.promoted.includes(state.clubId)) state.inbox.push({ type: 'promoted', week: state.week });
      if (movement.relegated.includes(state.clubId)) state.inbox.push({ type: 'relegated', week: state.week });
    }
    for (const c of season.clubs) for (const p of c.roster) { Contracts.tickContract(p); Player.ageOneYear(p, rng); }
    if (state.player) {
      const pl = state.player, life = Content.ensureLife(state);
      // Retirada: gira de despedida anunciada, o el cuerpo dice basta.
      if (life.flags.farewell != null || pl.age >= 41 || (pl.age >= 36 && pl.ovr < 55)) { pl.career.retired = true; delete life.flags.farewell; }
      if (pl.career.retired) state.retirement = { pending: true, year: state.year, legacy: Family.legacyOf(state) };
    }
    if (other) for (const c of other.clubs) for (const p of c.roster) { Contracts.tickContract(p); Player.ageOneYear(p, rng); }
    if (state.player) {
      const p = state.player;
      if (!p.contract) {
        const offer = Contracts.offerForPlayer(p, clubOf(state), rng, Contracts.NA_ECONOMY_2026_27);
        offer.salary = Math.round(offer.salary * Content.offerFactor(state));
        state.market.push({ playerId: p.id, clubId: state.clubId, contract: offer });
        state.inbox.push({ type: 'offer', week: state.week, contract: offer });
      }
      if (p.career.retired) state.inbox.push({ type: 'retired', week: state.week });
    }
    const reset = list => list.map(c => Object.assign({}, c, { wins: 0, losses: 0, pf: 0, pa: 0, streak: 0, roster: c.roster.filter(p => !p.career.retired || (state.player && p.id === state.player.id)) }));
    // (el jugador del usuario sigue en la plantilla hasta que elija qué hacer tras retirarse: así el guardado sigue siendo válido)
    state.year++;
    if (!other) {
      state.season = Season.createSeason(season.leagueId, state.seed + ':season:' + state.year, reset(season.clubs));
    } else {
      const top = Season.LEAGUES[season.leagueId].level === 1 ? season : other, second = top === season ? other : season;
      const topClubs = reset(top.clubs), secondClubs = reset(second.clubs);
      const relegated = topClubs.filter(c => movement.relegated.includes(c.id)), promoted = secondClubs.filter(c => movement.promoted.includes(c.id));
      for (const c of relegated) c.league = second.leagueId;
      for (const c of promoted) c.league = top.leagueId;
      const newTop = Season.createSeason(top.leagueId, state.seed + ':top:' + state.year, topClubs.filter(c => !movement.relegated.includes(c.id)).concat(promoted));
      const newSecond = Season.createSeason(second.leagueId, state.seed + ':second:' + state.year, secondClubs.filter(c => !movement.promoted.includes(c.id)).concat(relegated));
      if (newTop.clubsById[state.clubId]) { state.season = newTop; state.topSeason = newSecond; } else { state.season = newSecond; state.topSeason = newTop; }
    }
    if (state.player) {
      const mine = (state.season.clubsById[state.clubId] || state.topSeason && state.topSeason.clubsById[state.clubId]);
      const updated = mine && mine.roster.find(p => p.id === state.player.id);
      if (updated) state.player = updated;
      if (state.pendingMove && !state.player.career.retired) { moveTo(state, state.pendingMove.leagueId, state.pendingMove.clubId); }
      state.pendingMove = null;
      worldOffers(state, rng);
    }
    // Noticias del mundo: campeones del resto de ligas (simulación ligera).
    const played = [state.history[state.history.length - 1].leagueId, other && other.leagueId];
    state.world = { year: state.year - 1, champions: Object.keys(Season.LEAGUES).filter(id => !played.includes(id)).map(id => Season.quickChampion(id, state.seed + ':world:' + state.year)) };
    if (other) state.world.champions.unshift({ leagueId: other.leagueId, club: other.clubsById[other.champion || (other.playoffs && other.playoffs.champion) || Season.standings(other.clubs)[0].id].name });
    state.week = 0;
    state.live = null;
    record(state, { type: 'seasonEnd', year: state.year - 1, champion: season.champion });
  }
  function chooseEvent(state, optionId) {
    const ev = Content.chooseEvent(state, optionId);
    if (state.family) familyCounters(state);
    Content.evaluateAchievements(state);
    record(state, { type: 'event', id: ev.id, option: optionId });
    return state;
  }
  function buyItem(state, itemId) {
    const item = Content.buy(state, itemId);
    record(state, { type: 'buy', itemId });
    return item;
  }
  function equipItem(state, itemId) {
    const item = Content.equip(state, itemId);
    record(state, { type: 'equip', itemId });
    return item;
  }
  function beginPractice(state, config = {}) {
    const life = Content.ensureLife(state);
    if (life.pendingPractice) return life.pendingPractice;
    const attempt = life.counters.practice++;
    const type = config.type === 'buzzer' ? 'buzzer' : 'freeThrow';
    life.pendingPractice = { id: state.week + ':' + attempt, type, attempt, week: state.week,
      seed: state.seed + ':practice:' + state.week + ':' + attempt,
      skill: state.player ? state.player.attrs.tiroLibre : 50 };
    record(state, { type: 'practiceCommit', id: life.pendingPractice.id, minigame: type });
    return life.pendingPractice;
  }
  function resolvePractice(state, config = {}) {
    const life = Content.ensureLife(state);
    const pending = life.pendingPractice;
    if (!pending || (config.id && config.id !== pending.id)) throw new Error('no matching committed practice');
    // Only release timing is accepted from the UI; seed, skill and attempt are immutable.
    const cfg = Object.assign({}, pending, { releaseTick: config.releaseTick, auto: !!config.auto });
    const result = cfg.auto ? Minigames.auto(cfg) : (pending.type === 'buzzer' ? Minigames.buzzer(cfg) : Minigames.freeThrow(cfg));
    life.xp += result.made ? 3 : 1;
    if (state.player) { state.player.form = Math.max(-10, Math.min(10, (state.player.form || 0) + (result.made ? 1 : 0))); state.player.load = Math.min(100, state.player.load + 2); }
    life.pendingPractice = null;
    record(state, { type: 'practice', minigame: pending.type, made: result.made, hash: result.hash });
    return result;
  }
  function cancelPractice(state) {
    const life = Content.ensureLife(state);
    if (life.pendingPractice) { record(state, { type: 'practiceCancel', id: life.pendingPractice.id }); life.pendingPractice = null; }
    return state;
  }
  // Minijuegos arcade: la sesión (semilla) se compromete al empezar; cerrar la app no permite repetir.
  // Mascota: acciones de la semana, concurso, tienda y equipamiento.
  function petCounters(state) {
    const life = Content.ensureLife(state), pet = state.pet, c = life.counters;
    if (!pet) return;
    c.petTricks = Pet.learned(pet).length; c.petContestsWon = pet.contests.won; c.petWalks = pet.walks; c.petBond = pet.bond; c.pet = 1;
    Content.evaluateAchievements(state);
  }
  function petOp(state, config = {}) {
    const life = Content.ensureLife(state);
    let out = null;
    if (config.op === 'adopt') out = Pet.adopt(state, config);
    else if (config.op === 'act') out = Pet.act(state, life, config);
    else if (config.op === 'contest') out = Pet.contest(state, life);
    else if (config.op === 'buy') out = Pet.buy(state, life, config.item);
    else if (config.op === 'equip') out = Pet.equip(state, config.item);
    else throw new Error('unknown pet op');
    petCounters(state);
    record(state, { type: 'pet', op: config.op, action: config.action || null, trick: config.trick || null, item: config.item || null });
    return out;
  }
  // Entrenador: quinteto, táctica y carga semanal (paridad con alineación/tácticas/week29 del fútbol).
  const TACTICS = {
    pace: { slow: 0.25, normal: 0.5, fast: 0.8 },
    focus: { inside: { insideRate: 0.55, threeRate: 0.3 }, balanced: { insideRate: 0.42, threeRate: 0.415 }, outside: { insideRate: 0.3, threeRate: 0.55 } },
    defense: { man: { press: 0.2, help: 0.5 }, press: { press: 0.55, help: 0.45 }, help: { press: 0.1, help: 0.8 } }
  };
  function coachSet(state, config = {}) {
    if (state.mode !== 'coach') throw new Error('coach only');
    const club = clubOf(state);
    if (config.starters) {
      const ids = Array.from(new Set(config.starters));
      if (ids.length !== 5 || !ids.every(id => club.roster.some(p => p.id === id))) throw new Error('need five players from the roster');
      club.starters = ids;
    }
    if (config.tactic) {
      const t = club.tacticChoice || { pace: 'normal', focus: 'balanced', defense: 'man' };
      for (const k of ['pace', 'focus', 'defense']) if (config.tactic[k] && TACTICS[k][config.tactic[k]] != null) t[k] = config.tactic[k];
      club.tacticChoice = t;
      club.tactic = Object.assign({}, Match.DEFAULT_TACTIC, { pace: TACTICS.pace[t.pace] }, TACTICS.focus[t.focus], TACTICS.defense[t.defense]);
    }
    if (config.training) { if (!['light', 'normal', 'hard'].includes(config.training)) throw new Error('unknown training'); club.training = config.training; }
    record(state, { type: 'coachSet', starters: club.starters || null, tactic: club.tacticChoice || null, training: club.training || null });
    return club;
  }
  function coachWeek(state, rng) {
    const club = clubOf(state); const level = club.training || 'normal';
    for (const p of club.roster) {
      if (level === 'hard') { p.load = Math.min(100, (p.load || 0) + 8); p.morale = Math.max(0, (p.morale == null ? 70 : p.morale) - 1); if (p.age <= 24 && !p.injury) Player.develop(p, { focus: null, scale: 0.6 * 34 / Math.max(1, state.season.schedule.length) }, rng); }
      else if (level === 'light') { p.load = Math.max(0, (p.load || 0) - 10); p.morale = Math.min(100, (p.morale == null ? 70 : p.morale) + 1); }
    }
  }
  function scouting(state) {
    const g = currentGame(state); if (!g) return null;
    const opp = state.season.clubsById[g.home === state.clubId ? g.away : g.home];
    const t = opp.tactic || Match.DEFAULT_TACTIC;
    return { name: opp.name, wins: opp.wins, losses: opp.losses, top: opp.roster.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 3).map(p => ({ name: p.name, pos: p.pos, ovr: p.ovr, archetype: p.archetype })),
      pace: t.pace >= 0.65 ? 'fast' : t.pace <= 0.35 ? 'slow' : 'normal', shooting: t.threeRate >= 0.5 ? 'outside' : t.insideRate >= 0.5 ? 'inside' : 'balanced', avgOvr: Math.round(opp.roster.slice(0, 8).reduce((a, p) => a + p.ovr, 0) / Math.min(8, opp.roster.length)) };
  }
  // ===== Familia y Dinastías =====
  function familySetup(state, config = {}) { const f = Family.setup(state, config); record(state, { type: 'familySetup', kind: config.kind || 'none' }); familyCounters(state); return f; }
  function familyCounters(state) {
    const f = Family.ensure(state), c = Content.ensureLife(state).counters;
    c.partner = f.partner ? 1 : Math.max(c.partner || 0, 0); c.married = Math.max(c.married || 0, f.status === 'married' ? 1 : 0);
    c.childrenCount = Math.max(c.childrenCount || 0, f.children.length); c.generation = f.generation; c.legends = f.legends.length;
    Content.evaluateAchievements(state);
  }
  // Liga de arranque del heredero: la más modesta de su país y de su género (o la Ibérica como refugio).
  function heirLeague(currentId, female) {
    const cur = Season.LEAGUES[currentId], want = female ? 'f' : 'm';
    if (!female && currentId === 'na-boreal-men') return 'na-boreal-men';
    if (!female && cur.country === 'ES') return 'es-ascenso-iberico';
    const same = Season.leagueList(want).filter(l => l.country === cur.country).sort((a, b) => b.level - a.level || a.strength - b.strength)[0];
    return same ? same.id : female ? 'es-iberica-women' : 'es-ascenso-iberico';
  }
  // Traslada al jugador del usuario a otro club (de su liga o de otra del mundo).
  function moveTo(state, leagueId, clubId) {
    const L = Season.LEAGUES[leagueId];
    if (!L) throw new Error('unknown league');
    const p = state.player, old = clubOf(state);
    if (old) old.roster = old.roster.filter(x => x.id !== p.id);
    let season = state.season.leagueId === leagueId ? state.season : state.topSeason && state.topSeason.leagueId === leagueId ? state.topSeason : null;
    if (!season) {
      season = Season.createSeason(leagueId, state.seed + ':move:' + state.year + ':' + leagueId);
      state.topSeason = L.pair ? Season.createSeason(L.pair, state.seed + ':move-pair:' + state.year) : null;
    } else if (season === state.topSeason) state.topSeason = state.season;
    state.season = season;
    const club = season.clubsById[clubId] || season.clubs[season.clubs.length - 1];
    club.roster.push(p);
    state.clubId = club.id; state.live = null;
    p.coachTrust = Math.min(p.coachTrust == null ? 55 : p.coachTrust, 55);
    state.route = leagueId === 'na-boreal-men' ? (state.route === 'na-draft' ? 'na-draft' : 'na-undrafted') : leagueId === 'es-ascenso-iberico' || leagueId === 'es-iberica-men' ? 'eu-academy' : 'world';
    state.inbox.push({ type: 'moved', week: state.week, detail: { leagueId, club: club.name } });
    return club;
  }
  // Oferta de un club concreto de otra liga para el jugador del usuario.
  function foreignOffer(state, leagueId, rng) {
    const L = Season.LEAGUES[leagueId], p = state.player;
    const names = Season.clubCatalog(leagueId);
    const club = names[rng.int(0, names.length - 1)];
    const offer = Contracts.offerForPlayer(p, { league: leagueId, budget: Season.leagueBudget(L) }, rng, Contracts.NA_ECONOMY_2026_27);
    offer.salary = Math.round(offer.salary * Content.offerFactor(state));
    const buyout = p.contract && p.contract.league === 'EU' && p.contract.years > 0 ? Contracts.buyoutCost(p) : 0;
    return { playerId: p.id, clubId: club.id, contract: offer, crossing: { targetLeague: leagueId, clubId: club.id, clubName: club.name, buyout, draftAndStash: leagueId === 'na-boreal-men' && p.age < 22 && rng.float() < 0.35 } };
  }
  // Al final de temporada llegan ofertas del extranjero acordes al nivel del jugador.
  function worldOffers(state, rng) {
    const p = state.player;
    if (!p || p.career.retired) return;
    const L = Season.LEAGUES[state.season.leagueId];
    const pool = Season.leagueList(L.gender).filter(l => l.id !== state.season.leagueId && l.id !== L.pair && p.ovr >= l.strength - 8);
    const n = Math.min(pool.length, p.ovr >= 70 ? 2 : 1);
    for (let i = 0; i < n; i++) {
      const pick = pool.splice(rng.int(0, pool.length - 1), 1)[0];
      if (rng.float() < 0.25 + Math.max(0, p.ovr - pick.strength) * 0.05) { const o = foreignOffer(state, pick.id, rng); state.market.push(o); state.inbox.push({ type: 'foreignOffer', week: state.week, detail: o.crossing }); }
    }
  }
  // Tras la retirada: seguir como entrenador, relevo con tu hijo/a o fin de la carrera.
  function afterRetirement(state, config = {}) {
    const r = state.retirement;
    if (!r || !r.pending) throw new Error('no retirement pending');
    const f = Family.ensure(state), legend = r.legacy;
    const club = clubOf(state);
    if (config.choice === 'coach') {
      f.legends.push(Object.assign({}, legend, { becameCoach: true }));
      club.roster = club.roster.filter(p => p.id !== state.player.id);
      state.coach = { name: state.player.name, authority: 'coach', morale: 72, trust: Math.min(95, 60 + legend.titles * 4 + legend.awards), formerPlayer: true };
      state.mode = 'coach'; state.player = null;
      state.inbox.push({ type: 'toCoach', week: state.week });
    } else if (config.choice === 'heir') {
      const child = f.children[config.childIndex == null ? f.children.length - 1 : config.childIndex];
      if (!child) throw new Error('no child to take over');
      f.legends.push(legend); f.generation++;
      const age = state.year - child.bornYear;
      if (age < 18) state.year += 18 - age;
      const gen = f.generation;
      const leagueId = heirLeague(state.season.leagueId, child.gender === 'f');
      const pair = Season.LEAGUES[leagueId].pair;
      state.season = Season.createSeason(leagueId, state.seed + ':gen' + gen + ':season', null);
      state.topSeason = pair ? Season.createSeason(pair, state.seed + ':gen' + gen + ':top') : null;
      state.route = leagueId === 'na-boreal-men' ? 'na-undrafted' : leagueId === 'es-ascenso-iberico' ? 'eu-academy' : 'world';
      const homeClub = state.season.clubsById[legend.lastClub] || state.season.clubs[state.season.clubs.length - 1];
      const rng = RNG.create(state.seed + ':heir:' + gen);
      const quality = Math.max(46, Math.min(62, 50 + Family.legacyBonus(legend) + Math.round((child.talent - 55) / 5)));
      const pos = ['PG', 'SG', 'SF', 'PF', 'C'].includes(config.pos) ? config.pos : 'SG';
      const p = Player.createPlayer({ seed: state.seed + ':heir:' + gen, gender: child.gender === 'f' ? 'women' : 'men', nationality: legend.nationality || (state.player && state.player.nationality) || 'ES', pos, archetype: Player.ARCHETYPES.includes(config.archetype) ? config.archetype : 'shooter', handedness: 'right', name: child.name + ' ' + (f.surname || ''), age: 18, quality });
      p.potential = Math.max(p.potential, Math.min(96, p.ovr + 18 + rng.int(0, 12)));
      p.number = config.keepNumber && legend.number != null ? legend.number : 7;
      p.coachTrust = 58; p.confidence = 0;
      p.contract = Contracts.offerForPlayer(p, homeClub, rng, Contracts.NA_ECONOMY_2026_27);
      homeClub.roster.push(p);
      state.player = p; state.clubId = homeClub.id; state.startingClubId = homeClub.id;
      f.partner = null; f.status = 'single'; f.children = []; f.configured = true;
      state.week = 0; state.live = null; state.lastMatch = null; state.lastSeasonSummary = null; state.market = [];
      state.inbox.push({ type: 'heir', week: 0, detail: { legend: legend.name, club: homeClub.name } });
      const life = Content.ensureLife(state); life.pendingEvent = null; life.lastOutcome = null;
    } else {
      f.legends.push(legend);
      state.careerOver = true;
    }
    state.retirement = null;
    record(state, { type: 'retirement', choice: config.choice || 'end', generation: f.generation });
    familyCounters(state);
    Content.press(state);
    return state;
  }
  function dismissSummary(state) { if (state.lastSeasonSummary) state.lastSeasonSummary.dismissed = true; return state; }
  function arcadeAttrs(state) { return state.player ? state.player.attrs : {}; }
  function arcadeStart(state, config = {}) {
    const life = Content.ensureLife(state);
    if (life.pendingArcade) return life.pendingArcade;
    if (!Arcade.GAMES[config.type]) throw new Error('unknown minigame');
    life.arcadeSeq = (life.arcadeSeq || 0) + 1;
    life.pendingArcade = { type: config.type, seed: state.seed + ':arcade:' + life.arcadeSeq, week: state.week, seq: life.arcadeSeq };
    record(state, { type: 'arcadeCommit', minigame: config.type, seq: life.arcadeSeq });
    return life.pendingArcade;
  }
  function arcadeFinish(state, config = {}) {
    const life = Content.ensureLife(state);
    const pend = life.pendingArcade;
    if (!pend) throw new Error('no committed minigame');
    const attrs = arcadeAttrs(state);
    const ticks = config.auto ? Arcade.autoTicks(pend.type, pend.seed, attrs) : config.ticks;
    const res = Arcade.play(pend.type, pend.seed, ticks, attrs);
    if (!res.complete) throw new Error('minigame not complete');
    const rw = Arcade.rewards(pend.type, res);
    life.style += rw.style; life.xp += rw.xp;
    if (state.player) { state.player.form = Math.max(-10, Math.min(10, (state.player.form || 0) + rw.form)); state.player.load = Math.min(100, (state.player.load || 0) + 2); }
    life.arcade = life.arcade || { best: {}, plays: {} };
    const prev = life.arcade.best[pend.type];
    const record_ = prev == null || res.score > prev;
    if (record_) life.arcade.best[pend.type] = res.score;
    life.arcade.plays[pend.type] = (life.arcade.plays[pend.type] || 0) + 1;
    const c = life.counters;
    c.arcadePlays = (c.arcadePlays || 0) + 1;
    c['best_' + pend.type] = Math.max(c['best_' + pend.type] || 0, res.score);
    if (pend.type === 'street' && res.won) c.streetWins = (c.streetWins || 0) + 1;
    c.perfects = (c.perfects || 0) + res.perfects;
    life.pendingArcade = null;
    Content.evaluateAchievements(state);
    record(state, { type: 'arcade', minigame: pend.type, score: res.score, hash: res.hash });
    return Object.assign({ rewards: rw, record: record_, previous: prev == null ? null : prev, auto: !!config.auto }, res);
  }
  function arcadeCancel(state) {
    const life = Content.ensureLife(state);
    if (life.pendingArcade) { record(state, { type: 'arcadeCancel', seq: life.pendingArcade.seq }); life.pendingArcade = null; }
    return state;
  }
  function practice(state, config = {}) { beginPractice(state, config); return resolvePractice(state, config); }
  function nextGuide(state) {
    const life = Content.ensureLife(state);
    const total = Content.packs().guide.steps.length;
    life.guideStep = Math.min(total - 1, life.guideStep + 1);
    record(state, { type: 'guide', step: life.guideStep });
    return life.guideStep;
  }
  function exploreCrossing(state, targetLeagueId) {
    if (!state.player) throw new Error('player career required');
    const rng = RNG.create(0); rng.restore(state.rng);
    const L = Season.LEAGUES[state.season.leagueId];
    let target = Season.LEAGUES[targetLeagueId] ? targetLeagueId : (L.gender === 'f' ? (state.season.leagueId === 'na-boreal-women' ? 'es-iberica-women' : 'na-boreal-women') : state.season.leagueId === 'na-boreal-men' ? 'es-iberica-men' : 'na-boreal-men');
    if (Season.LEAGUES[target].gender !== L.gender) throw new Error('league of another category');
    if (target === state.season.leagueId) throw new Error('already in that league');
    const o = foreignOffer(state, target, rng);
    state.market.push(o);
    state.inbox.push({ type: 'crossing', week: state.week, detail: o.crossing });
    state.rng = rng.serialize();
    record(state, { type: 'crossing', target, buyout: o.crossing.buyout });
    return Object.assign({ contract: o.contract }, o.crossing);
  }
  function signOffer(state, index) {
    const offer = state.market[index || 0];
    if (!offer || !state.player) throw new Error('no offer');
    state.player.contract = offer.contract;
    Content.ensureLife(state).counters.signs++;
    if (offer.crossing) {
      // Antes del primer partido de la temporada el traspaso es inmediato; si no, se hace efectivo en verano.
      const fresh = state.season.round === 0 && !state.season.playoffs;
      if (fresh) { moveTo(state, offer.crossing.targetLeague, offer.crossing.clubId); state.pendingMove = null; }
      else state.pendingMove = { leagueId: offer.crossing.targetLeague, clubId: offer.crossing.clubId };
      state.market = state.market.filter(m => m !== offer && !m.crossing);
      record(state, { type: 'sign', salary: offer.contract.salary, crossing: offer.crossing.targetLeague });
      return state;
    }
    state.market.splice(index || 0, 1);
    record(state, { type: 'sign', salary: offer.contract.salary });
    return state;
  }
  const clamp100 = v => Math.max(0, Math.min(100, Math.round(v)));
  function meters(state, club) {
    const life = state.life || { counters: {} };
    const gp = club.wins + club.losses;
    const fans = clamp100(42 + (gp ? (club.wins / gp - 0.5) * 60 : 0) + Math.min(12, (life.counters.clutchMakes || 0) * 3) + Math.min(8, (life.style || 0) / 10));
    if (state.player) {
      const p = state.player;
      return { form: clamp100(50 + (p.form || 0) * 5), morale: clamp100(p.morale == null ? 70 : p.morale), fitness: clamp100(p.injury ? 15 : 100 - (p.load || 0) * 0.8 - (p.fatigue || 0) * 20), trust: clamp100(p.coachTrust == null ? 60 : p.coachTrust), fans };
    }
    const roster = club.roster;
    const locker = roster.reduce((a, p) => a + (p.morale == null ? 70 : p.morale), 0) / Math.max(1, roster.length);
    return { morale: clamp100(state.coach.morale), trust: clamp100(state.coach.trust), locker: clamp100(locker), fitness: clamp100(100 - roster.reduce((a, p) => a + (p.load || 0), 0) / Math.max(1, roster.length) * 0.8), fans };
  }
  function fixtures(state) {
    const s = state.season, id = state.clubId;
    let next = null;
    if (s.round < s.schedule.length) {
      const g = s.schedule[s.round].games.find(x => x.home === id || x.away === id);
      if (g) { const oppId = g.home === id ? g.away : g.home; const o = s.clubsById[oppId]; next = { round: s.round + 1, home: g.home === id, opponent: { id: o.id, name: o.name, wins: o.wins, losses: o.losses } }; }
    } else if (s.playoffs && !s.playoffs.done) {
      const g = Playoffs.pending(s.playoffs).find(x => x.home === id || x.away === id);
      if (g) { const o = s.clubsById[g.home === id ? g.away : g.home]; const ser = Playoffs.seriesOf(s.playoffs, id); next = { playoff: true, roundName: Playoffs.current(s.playoffs).name, game: ser.wins + ser.losses + 1, series: ser, home: g.home === id, opponent: { id: o.id, name: o.name, wins: o.wins, losses: o.losses } }; }
    }
    const recent = s.results.filter(r => r.home === id || r.away === id).slice(-5).reverse().map(r => {
      const home = r.home === id; const us = home ? r.score[0] : r.score[1], them = home ? r.score[1] : r.score[0];
      const o = s.clubsById[home ? r.away : r.home];
      return { round: r.round, home, opponent: o ? o.name : '', us, them, won: us > them };
    });
    return { next, recent };
  }
  function summary(state) {
    const club = clubOf(state);
    const table = Season.standings(state.season.clubs);
    const league = Season.LEAGUES[state.season.leagueId] || {};
    const fx = fixtures(state);
    return {
      leagueName: league.name || state.season.leagueId, totalRounds: state.season.schedule.length, table, next: fx.next, recent: fx.recent, meters: meters(state, club),
      careerId: state.careerId, mode: state.mode, route: state.route, year: state.year, week: state.week,
      leagueId: state.season.leagueId, league: { country: league.country, continent: league.continent, gender: league.gender || 'm', level: league.level }, world: state.world || null, pendingMove: state.pendingMove || null,
      round: state.season.round, club: { id: club.id, name: club.name, wins: club.wins, losses: club.losses, rank: table.find(r => r.id === club.id).rank },
      player: state.player ? { id: state.player.id, name: state.player.name, pos: state.player.pos, number: state.player.number == null ? 7 : state.player.number, nationality: state.player.nationality, potential: state.player.potential, attrs: state.player.attrs, wingspan: state.player.wingspan, weight: state.player.weight, coachTrust: state.player.coachTrust, confidence: state.player.confidence || 0, morale: state.player.morale, form: state.player.form, archetype: state.player.archetype, handedness: state.player.handedness, height: state.player.height, ovr: state.player.ovr, age: state.player.age, load: state.player.load, injury: state.player.injury, contract: state.player.contract, stats: state.player.stats } : null,
      event: Content.pendingView(state), pet: state.pet || null, family: state.family || null, retirement: state.retirement || null, careerOver: !!state.careerOver, lastSeason: state.lastSeasonSummary && !state.lastSeasonSummary.dismissed ? state.lastSeasonSummary : null,
      playoffs: state.season.playoffs ? { format: state.season.playoffs.format, round: Playoffs.current(state.season.playoffs).name, done: state.season.playoffs.done, series: Playoffs.seriesOf(state.season.playoffs, state.clubId), status: Playoffs.status(state.season.playoffs, state.clubId), result: Playoffs.resultOf(state.season.playoffs, state.clubId) } : null,
      awards: state.season.awards || null, coach: state.coach,
      squad: state.mode === 'coach' ? (() => { const c = clubOf(state); const starters = Season.clubToMatchTeam(c).players.filter(p => p.starter).map(p => p.id); return { starters, tactic: c.tacticChoice || { pace: 'normal', focus: 'balanced', defense: 'man' }, training: c.training || 'normal',
        roster: c.roster.map(p => ({ id: p.id, name: p.name, pos: p.pos, ovr: p.ovr, age: p.age, morale: p.morale == null ? 70 : p.morale, load: Math.round(p.load || 0), injury: p.injury ? p.injury.weeksRemaining : 0, archetype: p.archetype, pts: p.stats ? p.stats.pts : 0, gp: p.stats ? p.stats.gp : 0 })) }; })() : null,
      scouting: scouting(state), hash: state.hash, inbox: state.inbox.slice(-8), market: state.market, history: state.history.slice(-4), life: state.life || null
    };
  }
  function validate(state) {
    const errors = [];
    const object = v => v && typeof v === 'object' && !Array.isArray(v);
    const finite = v => typeof v === 'number' && Number.isFinite(v);
    if (!object(state)) return { ok: false, errors: ['career object required'] };
    if (state.schemaVersion !== 1) errors.push('unsupported career schema');
    if (!MODES.includes(state.mode) || !ROUTES.includes(state.route)) errors.push('invalid career mode/route');
    if (typeof state.careerId !== 'string' || typeof state.seed !== 'string' || !/^[0-9a-f]{8}$/.test(state.hash || '')) errors.push('invalid career identity');
    if (!Number.isInteger(state.week) || state.week < 0 || !Number.isInteger(state.year) || state.year < 2026 || state.year > 3000) errors.push('invalid career clock');
    if (!object(state.rng) || !finite(state.rng.state) || !finite(state.rng.count)) errors.push('invalid RNG snapshot');
    for (const key of ['inbox', 'market', 'history']) if (!Array.isArray(state[key]) || state[key].length > 10000) errors.push('invalid ' + key);
    function season(s, optional) {
      if (optional && s == null) return;
      if (!object(s) || !Array.isArray(s.clubs) || !Array.isArray(s.schedule) || !object(s.clubsById)) { errors.push('invalid season'); return; }
      if (!(Season.LEAGUES[s.leagueId] && s.clubs.length === Season.LEAGUES[s.leagueId].teams) || s.schedule.length > 100 || !Number.isInteger(s.round) || s.round < 0 || s.round > s.schedule.length) { errors.push('invalid season size/round'); return; }
      const ids = new Set();
      for (const c of s.clubs) {
        if (!object(c) || typeof c.id !== 'string' || ids.has(c.id) || typeof c.name !== 'string' || !Array.isArray(c.roster) || c.roster.length < 5 || c.roster.length > 30 || !finite(c.wins) || !finite(c.losses)) { errors.push('invalid club'); continue; }
        ids.add(c.id);
        for (const p of c.roster) if (!object(p) || typeof p.id !== 'string' || typeof p.name !== 'string' || !object(p.attrs) || !Object.values(p.attrs).every(finite) || !object(p.stats) || !object(p.career)) errors.push('invalid roster player');
      }

      for (const c of s.clubs) if (!s.clubsById[c.id] || s.clubsById[c.id].id !== c.id) errors.push('club index mismatch');
      for (const round of s.schedule) if (!object(round) || !Array.isArray(round.games) || round.games.some(g => !object(g) || !ids.has(g.home) || !ids.has(g.away))) errors.push('invalid schedule');
    }
    season(state.season, false); season(state.topSeason, true);
    if (object(state.season) && !Object.prototype.hasOwnProperty.call(state.season.clubsById || {}, state.clubId) && !Object.prototype.hasOwnProperty.call((state.topSeason || {}).clubsById || {}, state.clubId)) errors.push('career club missing');
    if (state.mode === 'player' && (!object(state.player) || !object(state.player.attrs) || !object(state.player.stats))) errors.push('player missing');
    if (state.mode === 'coach' && !object(state.coach)) errors.push('coach missing');
    if (state.lastMatch != null) {
      const r = state.lastMatch, m = r && r.state;
      if (!object(r) || !object(m) || !Array.isArray(m.events) || m.events.length > 2000 || !Array.isArray(m.teams) || m.teams.length !== 2 || !Array.isArray(m.score) || m.score.length !== 2 || !m.score.every(finite) || !/^[0-9a-f]{8}$/.test(m.hash || '') || !object(r.context) || !object(r.validation) || !Array.isArray(r.box) || r.box.length !== 2) errors.push('invalid career replay');
      else if (m.events.some(e => !object(e) || typeof e.type !== 'string' || !finite(e.period) || !finite(e.clock)) || m.teams.some(t => !object(t) || typeof t.id !== 'string' || typeof t.name !== 'string' || !Array.isArray(t.players) || t.players.length < 5 || t.players.some(p => !object(p) || typeof p.id !== 'string' || typeof p.name !== 'string'))) errors.push('invalid career replay events/teams');
      if (m.lineups != null) {
        if (!Array.isArray(m.lineups) || m.lineups.length !== m.events.length) errors.push('invalid career replay lineups');
        else {
          const ids = m.teams.map(t => new Set(t.players.map(p => p.id)));
          if (m.lineups.some((l, i) => !object(l) || l.seq !== m.events[i].seq || !Array.isArray(l.teams) || l.teams.length !== 2 || l.teams.some((five, ti) => !Array.isArray(five) || five.length !== 5 || new Set(five).size !== 5 || five.some(id => typeof id !== 'string' || !ids[ti].has(id))))) errors.push('invalid career replay lineups');
        }
      }
    }
    if (state.live != null) {
      const lv = Live.validate(state.live);
      if (!lv.ok || !Number.isInteger(state.live.week) || !Number.isInteger(state.live.round) || typeof state.live.gameId !== 'string') errors.push('invalid live match');
    }
    if (!Pet.validate(state.pet)) errors.push('invalid pet');
    if (!Family.validate(state.family)) errors.push('invalid family');
    if (state.life != null) {
      if (!object(state.life) || !['achievements', 'owned', 'appliedBonuses', 'eventHistory', 'press'].every(k => Array.isArray(state.life[k])) || !object(state.life.counters) || !object(state.life.equipment) || !['cash', 'style', 'xp'].every(k => finite(state.life[k])) || !Number.isInteger(state.life.counters.practice) || state.life.counters.practice < 0) errors.push('invalid life state');
      else if (state.life.pendingPractice != null) {
        const p = state.life.pendingPractice;
        if (!object(p) || typeof p.id !== 'string' || typeof p.seed !== 'string' || !['freeThrow', 'buzzer'].includes(p.type) || !Number.isInteger(p.attempt) || p.attempt < 0 || p.attempt >= state.life.counters.practice || p.week !== state.week || p.id !== p.week + ':' + p.attempt || p.seed !== state.seed + ':practice:' + p.week + ':' + p.attempt || !finite(p.skill) || p.skill < 0 || p.skill > 100) errors.push('invalid committed practice');
      }
    }
    return { ok: !errors.length, errors: Array.from(new Set(errors)) };
  }
  function serialize(state) { return JSON.parse(JSON.stringify(state)); }
  function resume(snapshot) {
    const s = JSON.parse(JSON.stringify(snapshot));
    const result = validate(s);
    if (!result.ok) throw new Error('invalid career: ' + result.errors.join('; '));
    for (const season of [s.season, s.topSeason]) if (season) { season.clubsById = Object.create(null); for (const club of season.clubs) season.clubsById[club.id] = club; }
    // Restore shared references lost by structured JSON serialization.
    if (s.player) {
      const club = clubOf(s), index = club && club.roster.findIndex(p => p.id === s.player.id);
      if (index == null || index < 0) throw new Error('invalid career: player missing from club roster');
      club.roster[index] = s.player;
    }
    Content.ensureLife(s);
    if (s.life.pendingPractice == null) s.life.pendingPractice = null;
    return s;
  }
  CAA.Career = { MODES, ROUTES, moveTo, heirLeague, createCareer, advanceWeek, liveStart, liveAdvance, currentGame, dismissSummary, coachSet, TACTICS, familySetup, afterRetirement, arcadeStart, arcadeFinish, arcadeCancel, petOp, chooseEvent, buyItem, equipItem, beginPractice, resolvePractice, cancelPractice, practice, nextGuide, exploreCrossing, signOffer, summary, validate, serialize, resume };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Career;
})(typeof globalThis !== 'undefined' ? globalThis : this);
