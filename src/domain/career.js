(function (root) {
  'use strict';
  // Carrera: creación, jornada, partido en directo, Jugada Maestra y cierre de temporada.
  // El resto vive en src/domain/career-{life,world,club,view}.js y comparte el contexto `K`.
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
  const Jugada = CAA.Jugada || (typeof require === 'function' ? require('../match/jugada.js') : null);
  const Arcade = CAA.Arcade || (typeof require === 'function' ? require('../match/arcade.js') : null);
  const Pet = CAA.Pet || (typeof require === 'function' ? require('./pet.js') : null);
  const Playoffs = CAA.Playoffs || (typeof require === 'function' ? require('./playoffs.js') : null);
  const Family = CAA.Family || (typeof require === 'function' ? require('./family.js') : null);
  const Gear = CAA.Gear || (typeof require === 'function' ? require('./gear.js') : null);
  const Eras = CAA.Eras || (typeof require === 'function' ? require('./eras.js') : null);
  const World = CAA.LiveWorld || (typeof require === 'function' ? require('./world.js') : null);
  const EraW = CAA.EraWorld || (typeof require === 'function' ? require('./era-world.js') : null);
  const Market = CAA.Market || (typeof require === 'function' ? require('./market.js') : null);
  const Finance = CAA.Finance || (typeof require === 'function' ? require('./finance.js') : null);
  const National = CAA.National || (typeof require === 'function' ? require('./national.js') : null);
  const Cup = CAA.Cup || (typeof require === 'function' ? require('./cup.js') : null);
  const Social = CAA.Social || (typeof require === 'function' ? require('./social.js') : null);
  const Viva = CAA.Viva || (typeof require === 'function' ? require('./viva.js') : null);

  const MODES = ['player', 'coach'];
  const ROUTES = ['eu-academy', 'na-draft', 'na-undrafted', 'world'];

  // Desafíos de entrenador (chal32): club y situación de partida predefinidos, medalla según el resultado.
  const CHALLENGES = {
    save: { league: 'es-iberica-men', pick: 'weakest' },
    crisis: { league: 'fr-hexagone-men', pick: 'strongest', trust: 30, morale: 40 },
    promoted: { league: 'it-penisola-men', pick: 'second-weakest' },
    nostar: { league: 'tr-bosforo-men', pick: 'middle', removeStars: 2 }
  };
  function challengeMedal(id, rank, n, result) {
    const go = (b, si, g) => g ? 'gold' : si ? 'silver' : b ? 'bronze' : null;
    if (id === 'save') return go(rank <= n - 2, rank <= Math.ceil(n / 2), rank <= 6);
    if (id === 'crisis') return go(rank <= 8 || result != null && result !== 'missed', result === 'final' || result === 'champion', result === 'champion');
    if (id === 'promoted') return go(rank <= Math.ceil(n / 2), rank <= 8, rank <= 4);
    return go(rank <= 8, rank <= 4, result === 'champion');
  }
  function createCareer(config = {}) {
    if (config.challenge) {
      const ch = CHALLENGES[config.challenge];
      if (!ch) throw new Error('unknown challenge');
      const tmp = Season.createSeason(ch.league, (config.seed == null ? 'career' : config.seed) + ':season');
      const avg = c => c.roster.slice(0, 8).reduce((a, p) => a + p.ovr, 0);
      const order = tmp.clubs.slice().sort((a, b) => avg(a) - avg(b));
      const pick = ch.pick === 'weakest' ? order[0] : ch.pick === 'second-weakest' ? order[1] : ch.pick === 'strongest' ? order[order.length - 1] : order[Math.floor(order.length / 2)];
      config = Object.assign({}, config, { mode: 'coach', route: 'world', leagueId: ch.league, clubId: pick.id });
    }
    const mode = config.mode || 'player';
    if (!MODES.includes(mode)) throw new Error('unknown mode');
    if (config.archetype && !Player.ARCHETYPES.includes(config.archetype)) throw new Error('unknown archetype');
    if (config.handedness && !['left', 'right'].includes(config.handedness)) throw new Error('unknown handedness');
    const route = config.route || (mode === 'coach' ? 'eu-academy' : 'eu-academy');
    const seed = config.seed == null ? 'career' : config.seed;
    const rng = RNG.create(seed);
    if (config.leagueId && !Season.LEAGUES[config.leagueId]) throw new Error('unknown league');
    const eraYear = Number.isInteger(config.eraYear) && config.eraYear >= 1920 && config.eraYear <= 2025 ? config.eraYear : null;
    const leagueId = config.leagueId || (route === 'eu-academy' ? 'es-ascenso-iberico' : config.gender === 'f' ? 'na-boreal-women' : 'na-boreal-men');
    const eraOpts = Number.isInteger(config.eraYear) ? { noReal: true } : undefined;
    const season = Season.createSeason(leagueId, seed + ':season', null, eraOpts);
    const pair = Season.LEAGUES[leagueId].pair;
    const topSeason = pair ? Season.createSeason(pair, seed + ':season-top', null, eraOpts) : null;
    const club = config.clubId ? season.clubs.find(c => c.id === config.clubId) : season.clubs[season.clubs.length - 1];
    if (!club) throw new Error('club not found');
    const state = {
      schemaVersion: 1, careerId: config.careerId || 'career-' + Hash.hex32(Hash.hashString(String(seed))),
      era: eraYear ? { start: eraYear, decade: Eras.decadeOf(eraYear), legends: [] } : null, mode, route: config.leagueId && route !== 'na-draft' && route !== 'na-undrafted' && leagueId !== 'es-ascenso-iberico' ? 'world' : route, seed, rng: rng.serialize(), week: 0, year: eraYear || 2026, season, topSeason, clubId: club.id, startingClubId: club.id,
      player: null, coach: null, inbox: [], market: [], draft: null, history: [], hash: '00000000',
      jm: { on: config.jm !== false, gap: 0, plays: 0, made: 0 }
    };
    if (mode === 'player') {
      const p = Player.createPlayer({ seed: seed + ':myplayer', gender: Season.genderOf(leagueId), nationality: config.nationality || 'ES', pos: config.pos || 'SG', archetype: config.archetype || (Player.profilesFor(config.pos || 'SG')[0] || { archetype: 'shooter' }).archetype, handedness: config.handedness || 'right', name: config.name || undefined, age: config.age || 19, quality: config.quality || 52 });
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
    const wnba = leagueId === 'na-boreal-women';
    if ((route === 'na-draft' || route === 'na-undrafted') && (leagueId === 'na-boreal-men' || wnba)) {
      const table = Season.standings(season.clubs);
      const order = wnba ? Draft.wnbaOrder(table.slice().reverse().map(r => r.id), seed + ':lottery')
        : Draft.draftOrder(Draft.lotteryOrder(table.slice(-14).map(r => r.id), seed + ':lottery'), table.slice(0, 16).map(r => r.id));
      // WNBA: se entra al draft al cumplir 22 años (o tras la universidad); las internacionales, con 20.
      if (wnba && state.player) { const intl = !['US', 'CA'].includes(state.player.nationality); state.player.age = Math.max(state.player.age, intl ? 20 : 22); }
      if (mode === 'player' && route === 'na-draft') {
        const per = order.round1.length, total = per * (order.rounds ? order.rounds.length : 2);
        const prospects = wnba ? Draft.generateProspects(seed + ':class', per * 4 - 1, { women: true }) : Draft.generateProspects(seed + ':class', 79);
        state.player.draftProjection = Math.max(1, Math.min(total, Math.round(total / 2) + 1 - Math.round((state.player.ovr - 50) / 2)));
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
    if (mode === 'coach') { Finance.ensure(state); if (config.newClub) Finance.found(state, config.newClub); }
    if (config.challenge) {
      const ch = CHALLENGES[config.challenge];
      state.challenge = { id: config.challenge, medal: null, year: state.year };
      if (ch.trust) state.coach.trust = ch.trust;
      if (ch.morale) { state.coach.morale = ch.morale; for (const p of club.roster) p.morale = ch.morale; }
      if (ch.removeStars) { club.roster.sort((a, b) => b.ovr - a.ovr); club.roster.splice(0, ch.removeStars); while (club.roster.length < 10) { const p = Player.createPlayer({ seed: state.seed + ':filler:' + club.roster.length, quality: 45, age: 20 }); p.contract = Contracts.offerForPlayer(p, club, rng, Contracts.NA_ECONOMY_2026_27); club.roster.push(p); } }
      Finance.ensure(state).objective = null;
    }
    if (config.quick) state.quick = 10;
    if (state.era) { if (!Eras.available(Season.LEAGUES[leagueId], eraYear)) throw new Error('league not founded yet'); eraApply(state, false); eraLegends(state); }
    if (!config.quick && !config.eraYear) try { World.summer(state); } catch (_) { /* el torneo de verano nunca bloquea una carrera nueva */ }
    return state;
  }
  function record(state, event) {
    event.week = state.week;
    state.hash = Hash.hex32(Hash.hashObject({ prev: state.hash, event }));
    return event;
  }
  function clubOf(state) { return state.season.clubsById[state.clubId] || (state.topSeason && state.topSeason.clubsById[state.clubId]); }
  // Al cerrar la jornada con la Jugada Maestra pendiente, se aplica lo que eligió el jugador.
  function jmFinish(live, act) {
    const o = { toEnd: true };
    if (live.moment && live.moment.type === 'jm' && act && act.jm) { o.choice = act.jm.choice === 'play' ? 'play' : 'auto'; o.jm = Array.isArray(act.jm.actions) ? act.jm.actions.slice(0, 8) : []; }
    return o;
  }
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
      if (live && !live.finished) Live.advance(live, jmFinish(live, act));
      const overrides = live ? { [live.gameId]: Match.resumeMatch(live.match) } : null;
      const played = Season.playRound(season, state.seed + ':w' + state.week, overrides);
      if (live) { applyLiveOutcome(state, live); state.live = null; } else if (played.some(m => m.teams.some(t => t.id === state.clubId))) jmAfter(state, null);
      afterGames(state, rng, played, club);
      if (state.mode === 'coach') { Finance.weekTick(state, played, rng); Market.weekTick(state, rng); }
      if (Cup.due(season)) {
        const cup = Cup.play(season, state.seed + ':' + state.year, state.clubId, state.player && state.player.id);
        state.inbox.push({ type: 'cup', week: state.week, detail: { club: cup.championName, mine: cup.mine } });
        if (cup.mine !== 'out') state.cupDraw = { year: state.year, week: state.week, seen: false }; // ceremonia del sorteo (draw.js)
        if (cup.champion === state.clubId) { const lc = Content.ensureLife(state).counters; lc.cups = (lc.cups || 0) + 1; }
      }
      const len = season.schedule.length;
      if (state.player && (season.round === Math.floor(len / 3) || season.round === Math.floor(2 * len / 3))) National.window(state, rng);
      if (season.round >= season.schedule.length) startPlayoffs(state);
    } else if (season.playoffs && !season.playoffs.done) {
      if (act.type === 'skipPlayoffs' && !['playing', 'waiting'].includes(Playoffs.status(season.playoffs, state.clubId))) {
        Playoffs.playAll(season, state.seed + ':po-skip:' + state.week);
        state.live = null;
        endSeason(state, rng);
      } else {
        const live = currentLive(state);
        if (live && !live.finished) Live.advance(live, jmFinish(live, act));
        const overrides = live ? { [live.gameId]: Match.resumeMatch(live.match) } : null;
        const played = Playoffs.playStep(season, state.seed + ':po:' + state.week, overrides);
        if (live) { applyLiveOutcome(state, live); state.live = null; } else if (played.some(m => m.teams.some(t => t.id === state.clubId))) jmAfter(state, null);
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
  // Rivalidades, récords, diario y red social (chal32 + social-data del fútbol).
  function chronicle(state, played, mine) {
    const life = Content.ensureLife(state);
    life.records = life.records || { league: {}, career: {} };
    life.rivals = life.rivals || {};
    life.diary = life.diary || [];
    const rec = (scope, key, v, name, extra) => { const r = life.records[scope]; if (!r[key] || v > r[key].v) { r[key] = Object.assign({ v, name, year: state.year, week: state.week }, extra || {}); return true; } return false; };
    for (const m of played || []) for (const t of m.teams) for (const p of t.players) if (p.stats) {
      rec('league', 'gamePts', p.stats.pts, p.name, { club: t.name });
      rec('league', 'gameReb', p.stats.orb + p.stats.drb, p.name, { club: t.name });
      rec('league', 'gameAst', p.stats.ast, p.name, { club: t.name });
    }
    const info = {};
    if (mine) {
      const side = mine.teams.findIndex(t => t.id === state.clubId), opp = mine.teams[1 - side];
      info.us = mine.score[side]; info.them = mine.score[1 - side]; info.opponent = opp.name;
      const r = life.rivals[opp.id] = life.rivals[opp.id] || { name: opp.name, g: 0, w: 0, l: 0, close: 0 };
      r.g++; if (info.us > info.them) r.w++; else r.l++; if (Math.abs(info.us - info.them) <= 6) r.close++;
      if (state.player) {
        const me = mine.teams[side].players.find(p => p.id === state.player.id);
        if (me && me.stats) {
          info.pts = me.stats.pts;
          const reb = me.stats.orb + me.stats.drb;
          if (rec('career', 'gamePts', me.stats.pts, me.name) && me.stats.pts >= 20) life.diary.push({ year: state.year, week: state.week, key: 'careerHigh', v: me.stats.pts, opp: opp.name });
          rec('career', 'gameReb', reb, me.name); rec('career', 'gameAst', me.stats.ast, me.name);
          if (lcFirst(life)) life.diary.push({ year: state.year, week: state.week, key: 'debut', opp: opp.name });
        }
        if (state.player.injury && state.player.injury.weeksRemaining > 0 && !state.player.injury.logged) { state.player.injury.logged = true; info.injuryWeeks = state.player.injury.weeksRemaining; life.diary.push({ year: state.year, week: state.week, key: 'injury', v: info.injuryWeeks }); }
      }
    }
    Social.push(state, Social.weekly(state, info));
    if (life.diary.length > 60) life.diary.splice(0, life.diary.length - 60);
  }
  function lcFirst(life) { if (life.debutLogged) return false; life.debutLogged = true; return true; }
  function rivalOf(state) {
    const rv = state.life && state.life.rivals; if (!rv) return null;
    let best = null; for (const [id, r] of Object.entries(rv)) if (r.g >= 2 && (!best || r.close * 2 + r.g > best.close * 2 + best.g)) best = Object.assign({ id }, r);
    return best;
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
    chronicle(state, played, mine);
    Viva.afterWeek(state);
    if (state.coach) coachWeek(state, rng);
    Content.weeklyIncome(state);
    const petWeek = Pet.weekTick(state, Content.ensureLife(state));
    if (petWeek && petWeek.mood) Content.applyEffects(state, { morale: petWeek.mood });
    if (petWeek && petWeek.extra) Content.applyEffects(state, { morale: petWeek.extra });
    Gear.ensure(state); Gear.weekTick(state);
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
    if (qualified) Social.special(state, 'playoffs');
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
  // ===== Jugada Maestra en la carrera (optativa, como en el fútbol) =====
  // La primera llega en los tres primeros partidos y después nunca pasan más de 3 seguidos sin una.
  function jmState(state) { if (!state.jm) state.jm = { on: true, gap: 0, plays: 0, made: 0 }; return state.jm; }
  function jmPlan(state, g) {
    const jm = jmState(state);
    if (!jm.on || !g || (state.player && state.player.injury && state.player.injury.weeksRemaining > 0)) return null;
    const h = Jugada.hashSeed(state.seed + ':jm:' + g.id), u = h / 4294967296, v = Jugada.hashSeed(g.id + ':jm-at') / 4294967296;
    return jm.gap >= 2 || u < 0.35 ? { at: 90 + Math.floor(v * 240) } : null;
  }
  function jmAfter(state, live) {
    const jm = jmState(state);
    if (live && live.jm && live.jm.done) {
      jm.gap = 0;
      const r = live.jm.result;
      if (r && !r.auto) { jm.plays++; if (r.points > 0) jm.made++; const lc = Content.ensureLife(state).counters; lc.jmPlays = jm.plays; lc.jmMade = jm.made; if (r.points === 3) lc.jmThrees = (lc.jmThrees || 0) + 1; }
    } else jm.gap++;
  }
  function liveStart(state, opts = {}) {
    const existing = currentLive(state);
    if (existing) return existing;
    const season = state.season;
    const g = currentGame(state);
    if (!g) throw new Error('no match this week');
    const teams = [Season.clubToMatchTeam(season.clubsById[g.home]), Season.clubToMatchTeam(season.clubsById[g.away])];
    const myId = state.player ? state.player.id : null;
    const live = Live.create({ seed: g.seed, ruleSetId: season.ruleSet, teams, matchId: g.id, userTeam: g.home === state.clubId ? 0 : 1, mode: state.mode, myPlayerId: myId && teams.some(t => t.players.some(p => p.id === myId)) ? myId : null, jm: jmPlan(state, g) });
    // quick: la jornada se simula y solo se detiene en la Jugada Maestra (sin pantalla de directo).
    Object.assign(live, { week: state.week, year: state.year, round: season.round, gameId: g.id, key: g.key, playoff: !!g.playoff, quick: !!opts.quick });
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
    jmAfter(state, live);
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
    World.youth(state, RNG.create(state.seed + ':youth-cup:' + state.year));
    const season = state.season;
    const table = Season.standings(season.clubs);
    if (!season.awards) season.awards = Playoffs.awards(season, season.schedule.length);
    const b = season.playoffs;
    season.champion = b && b.champion ? b.champion : table[0].id;
    const fm = b && b.champion ? Playoffs.finalsMvp(season) : null;
    const awardsList = season.awards.concat(fm ? [fm] : []).concat([{ award: 'coy', clubId: table[0].id, club: table[0].name }]);
    const myResult = b ? Playoffs.resultOf(b, state.clubId) : null;
    const myRank = table.find(r => r.id === state.clubId).rank;
    state.history.push({ year: state.year, leagueId: season.leagueId, champion: season.champion, championName: season.clubsById[season.champion].name, runnerUp: b ? b.runnerUp : null, cup: season.cup ? season.cup.championName : null, cupChampion: season.cup ? season.cup.champion : null, myAwards: awardsList.filter(a => a.playerId ? state.player && a.playerId === state.player.id : false).map(a => a.award),
      table: table.slice(0, 4), clubRank: myRank, result: myResult, awards: awardsList.map(a => ({ award: a.award, player: a.player || null, club: a.club })), promoted: b ? b.promoted.slice() : [] });
    // Modo Épocas: duelos con las leyendas, competiciones de época y página del Anuario.
    if (state.era && EraW) { EraW.duels(state); EraW.continental(state, table); EraW.annual(state, season.clubsById[season.champion].name); }
    const lc = Content.ensureLife(state).counters;
    const myAwards = [];
    if (state.player) for (const a of awardsList) if (a.playerId === state.player.id) { state.player.career.awards.push({ year: state.year, award: a.award }); myAwards.push(a.award); }
    if (state.coach && awardsList.some(a => a.award === 'coy' && a.clubId === state.clubId)) myAwards.push('coy');
    lc.awards = (lc.awards || 0) + myAwards.length;
    lc.mvps = (lc.mvps || 0) + myAwards.filter(a => a === 'mvp').length;
    lc.allLeague = (lc.allLeague || 0) + myAwards.filter(a => a === 'allLeague').length;
    if (myResult && myResult !== 'missed') lc.playoffApps = (lc.playoffApps || 0) + 1;
    if (myResult === 'final' || myResult === 'champion') lc.finals = (lc.finals || 0) + 1;
    if (season.champion === state.clubId) { lc.titles = (lc.titles || 0) + 1; Social.special(state, 'title'); }
    { const life = Content.ensureLife(state); life.diary = life.diary || []; life.diary.push({ year: state.year, week: state.week, key: 'season', rank: myRank, result: myResult || null, champion: season.champion === state.clubId });
      if (state.player && state.player.stats) { const sp = state.player.stats.pts; life.records = life.records || { league: {}, career: {} }; const r = life.records.career; if (!r.seasonPts || sp > r.seasonPts.v) r.seasonPts = { v: sp, name: state.player.name, year: state.year }; } }
    const pl = state.player;
    state.lastSeasonSummary = { year: state.year, leagueId: season.leagueId, champion: season.clubsById[season.champion].name, myChampion: season.champion === state.clubId, result: myResult, rank: myRank, teams: table.length,
      record: { wins: clubOf(state).wins, losses: clubOf(state).losses }, promoted: !!(b && b.promoted.includes(state.clubId)),
      stats: pl ? { gp: pl.stats.gp, pts: pl.stats.pts, reb: pl.stats.reb, ast: pl.stats.ast, ovrStart: pl.ovrStart == null ? pl.ovr : pl.ovrStart, ovr: pl.ovr } : null,
      awards: awardsList.map(a => ({ award: a.award, player: a.player || null, club: a.club, mine: myAwards.includes(a.award) && (a.playerId ? state.player && a.playerId === state.player.id : a.clubId === state.clubId) })), myAwards, dismissed: false };
    if (state.mode === 'coach') state.lastSeasonSummary.club = Finance.seasonEnd(state, myRank, rng);
    { const lr = Content.ensureLife(state).records, hi = lr && lr.career && lr.career.gamePts; Viva.seasonEnd(state, state.lastSeasonSummary, { rival: rivalOf(state), jm: state.jm, high: hi && hi.year === state.year ? hi.v : 0 }); }
    if (state.challenge && !state.challenge.medal && state.challenge.year === state.year) {
      state.challenge.medal = challengeMedal(state.challenge.id, myRank, table.length, myResult) || 'none';
      state.lastSeasonSummary.challenge = { id: state.challenge.id, medal: state.challenge.medal };
      if (state.challenge.medal !== 'none') lc.challengeMedals = (lc.challengeMedals || 0) + 1;
      if (state.challenge.medal === 'gold') lc.challengeGolds = (lc.challengeGolds || 0) + 1;
    }
    Content.evaluateAchievements(state);
    if (season.leagueId === 'na-boreal-women') {
      const order = Draft.wnbaOrder(table.slice().reverse().map(r => r.id), state.seed + ':lottery:' + state.year);
      state.draft = Draft.runDraft({ seed: state.seed + ':draft:' + state.year, order });
      state.inbox.push({ type: 'draft', week: state.week, year: state.year });
    }
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
    if (state.era) { eraApply(state, true); if (Eras.decadeOf(state.year) !== state.era.decade) eraLegends(state); }
    if (state.player) National.summer(state, state.year);
    refillRosters(state);
    World.summer(state);
    applyEdits(state);
    if (state.quick && state.history.length >= state.quick && !(state.retirement && state.retirement.pending)) { state.careerOver = true; state.quickEnd = true; }
    // Noticias del mundo: campeones del resto de ligas (simulación ligera).
    const played = [state.history[state.history.length - 1].leagueId, other && other.leagueId];
    state.world = { year: state.year - 1, champions: Object.keys(Season.LEAGUES).filter(id => !played.includes(id) && (!state.era || Eras.available(Season.LEAGUES[id], state.year - 1))).map(id => Season.quickChampion(id, state.seed + ':world:' + state.year)) };
    if (other) state.world.champions.unshift({ leagueId: other.leagueId, club: other.clubsById[other.champion || (other.playoffs && other.playoffs.champion) || Season.standings(other.clubs)[0].id].name });
    state.week = 0;
    state.live = null;
    record(state, { type: 'seasonEnd', year: state.year - 1, champion: season.champion });
  }
  function dismissSummary(state) { if (state.lastSeasonSummary) state.lastSeasonSummary.dismissed = true; return state; }
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
  // ===== Partes de la carrera (src/domain/career-*.js) =====
  // Cada parte recibe este contexto; lo que exporta se añade aquí y se usa por su nombre.
  if (typeof require === 'function' && typeof module !== 'undefined') ['./career-life.js', './career-world.js', './career-club.js', './career-view.js'].forEach(p => require(p));
  const K = {
    get Arcade() { return Arcade; },
    get Content() { return Content; },
    get Contracts() { return Contracts; },
    get EraW() { return EraW; },
    get Eras() { return Eras; },
    get Family() { return Family; },
    get Finance() { return Finance; },
    get Gear() { return Gear; },
    get Live() { return Live; },
    get MODES() { return MODES; },
    get Market() { return Market; },
    get Match() { return Match; },
    get Minigames() { return Minigames; },
    get National() { return National; },
    get Pet() { return Pet; },
    get Player() { return Player; },
    get Playoffs() { return Playoffs; },
    get RNG() { return RNG; },
    get ROUTES() { return ROUTES; },
    get Season() { return Season; },
    get Viva() { return Viva; },
    get World() { return World; },
    get advanceWeek() { return advanceWeek; },
    get clubOf() { return clubOf; },
    get currentGame() { return currentGame; },
    get currentLive() { return currentLive; },
    get jmPlan() { return jmPlan; },
    get jmState() { return jmState; },
    get record() { return record; },
    get rivalOf() { return rivalOf; }
  };
  for (const name of ["life","world","club","view"]) Object.assign(K, CAA.CareerParts[name](K));
  const { chooseEvent, buyItem, equipItem, beginPractice, resolvePractice, cancelPractice, petOp, gearOp, arcadeChallenges, CONTEST_TYPES, arcadeStart, arcadeFinish, arcadeCancel, practice, nextGuide, familySetup, eraApply, eraLegends, heirLeague, moveTo, worldOffers, afterRetirement, exploreCrossing, signOffer, refillRosters, applyEdits, editOp, simSeason, clubOp, worldOp, marketOp, TACTICS, coachSet, coachWeek, summary, validate } = K;
  CAA.Career = { worldOp, MODES, ROUTES, CHALLENGES, arcadeChallenges, CONTEST_TYPES, gearOp, clubOp, marketOp, editOp, simSeason, moveTo, heirLeague, createCareer, advanceWeek, liveStart, liveAdvance, currentGame, dismissSummary, coachSet, TACTICS, familySetup, afterRetirement, arcadeStart, arcadeFinish, arcadeCancel, petOp, chooseEvent, buyItem, equipItem, beginPractice, resolvePractice, cancelPractice, practice, nextGuide, exploreCrossing, signOffer, summary, validate, serialize, resume };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Career;
})(typeof globalThis !== 'undefined' ? globalThis : this);
