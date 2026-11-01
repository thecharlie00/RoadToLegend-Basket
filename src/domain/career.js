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

  const MODES = ['player', 'coach'];
  const ROUTES = ['eu-academy', 'na-draft', 'na-undrafted'];

  function createCareer(config = {}) {
    const mode = config.mode || 'player';
    if (!MODES.includes(mode)) throw new Error('unknown mode');
    if (config.archetype && !Player.ARCHETYPES.includes(config.archetype)) throw new Error('unknown archetype');
    if (config.handedness && !['left', 'right'].includes(config.handedness)) throw new Error('unknown handedness');
    const route = config.route || (mode === 'coach' ? 'eu-academy' : 'eu-academy');
    const seed = config.seed == null ? 'career' : config.seed;
    const rng = RNG.create(seed);
    const leagueId = route === 'eu-academy' ? 'es-ascenso-iberico' : 'na-boreal-men';
    const season = Season.createSeason(leagueId, seed + ':season');
    const topSeason = route === 'eu-academy' ? Season.createSeason('es-iberica-men', seed + ':season-top') : null;
    const club = config.clubId ? season.clubs.find(c => c.id === config.clubId) : season.clubs[season.clubs.length - 1];
    if (!club) throw new Error('club not found');
    const state = {
      schemaVersion: 1, careerId: config.careerId || 'career-' + Hash.hex32(Hash.hashString(String(seed))),
      mode, route, seed, rng: rng.serialize(), week: 0, year: 2026, season, topSeason, clubId: club.id, startingClubId: club.id,
      player: null, coach: null, inbox: [], market: [], draft: null, history: [], hash: '00000000'
    };
    if (mode === 'player') {
      const p = Player.createPlayer({ seed: seed + ':myplayer', nationality: config.nationality || 'ES', pos: config.pos || 'SG', archetype: config.archetype || 'shooter', handedness: config.handedness || 'right', name: config.name || undefined, age: config.age || 19, quality: config.quality || 52 });
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
    if (route === 'na-draft' || route === 'na-undrafted') {
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
    const rng = RNG.create(0); rng.restore(state.rng);
    const club = clubOf(state);
    const act = action || { type: 'play' };
    if (state.player) {
      const p = state.player;
      if (act.type === 'train') { Player.develop(p, { focus: act.focus || 'tiroTriple' }, rng); p.load = Math.min(100, p.load + 12); Content.ensureLife(state).counters.train++; }
      else if (act.type === 'rest') { Player.recover(p); p.load = Math.max(0, p.load - 25); p.fatigue = Math.max(0, p.fatigue - 0.3); p.morale = Math.min(100, p.morale + 2); }
      else { Player.develop(p, { focus: null }, rng); }
      if (p.injury) { Player.recover(p); state.inbox.push({ type: 'injury', week: state.week, weeks: p.injury ? p.injury.weeksRemaining : 0 }); }
      else if (act.type === 'play') Player.maybeInjure(p, rng);
    }
    if (state.season.round < state.season.schedule.length) {
      const live = currentLive(state);
      if (live && !live.finished) Live.advance(live, { toEnd: true });
      const overrides = live ? { [live.gameId]: Match.resumeMatch(live.match) } : null;
      const played = Season.playRound(state.season, state.seed + ':w' + state.week, overrides);
      if (live) { applyLiveOutcome(state, live); state.live = null; }
      const mine = played && played.find(m => m.teams.some(t => t.id === state.clubId));
      if (mine) state.lastMatch = Match.replay(mine, { week: state.week + 1, year: state.year, clubId: state.clubId, source: 'career' });
      state.week++;
      for (const c of state.season.clubs) for (const p of c.roster) { p.load = Math.max(0, (p.load || 0) - 6); p.fatigue = Math.max(0, (p.fatigue || 0) - 0.08); }
      record(state, { type: 'week', round: state.season.round, clubWins: club.wins, clubLosses: club.losses });
      Content.maybeEvent(state, rng);
      Content.evaluateAchievements(state);
      Content.press(state);
      if (state.season.round >= state.season.schedule.length) endSeason(state, rng);
    } else {
      endSeason(state, rng);
    }
    state.rng = rng.serialize();
    return state;
  }
  // Partido en directo de la semana: misma semilla y mismo emparejamiento que la simulación del round.
  function currentLive(state) {
    const l = state.live;
    return l && l.week === state.week && l.round === state.season.round && l.year === state.year ? l : null;
  }
  function liveStart(state) {
    const existing = currentLive(state);
    if (existing) return existing;
    const season = state.season;
    if (season.round >= season.schedule.length) throw new Error('no match this week');
    const round = season.schedule[season.round];
    const index = round.games.findIndex(g => g.home === state.clubId || g.away === state.clubId);
    if (index < 0) throw new Error('no match this week');
    const g = round.games[index];
    const teams = [Season.clubToMatchTeam(season.clubsById[g.home]), Season.clubToMatchTeam(season.clubsById[g.away])];
    const myId = state.player ? state.player.id : null;
    const live = Live.create({ seed: Season.gameSeed(season, state.seed + ':w' + state.week, index), ruleSetId: season.ruleSet, teams, matchId: g.id, userTeam: g.home === state.clubId ? 0 : 1, mode: state.mode, myPlayerId: myId && teams.some(t => t.players.some(p => p.id === myId)) ? myId : null });
    Object.assign(live, { week: state.week, year: state.year, round: season.round, gameId: g.id });
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
    state.inbox.push({ type: 'live', week: state.week, won: o.won, score: o.score, decisions: o.decisions });
    record(state, { type: 'live', hash: o.hash, decisions: live.decisions.filter(d => !d.auto).map(d => d.type + ':' + d.choice) });
  }
  function endSeason(state, rng) {
    const season = state.season;
    const table = Season.standings(season.clubs);
    season.champion = table[0].id;
    state.history.push({ year: state.year, leagueId: season.leagueId, champion: season.champion, table: table.slice(0, 4), clubRank: table.find(r => r.id === state.clubId).rank });
    if (season.leagueId === 'na-boreal-men') {
      const seeds = Season.naPlayoffSeeds(season);
      const lottery = Draft.lotteryOrder(seeds.lottery, state.seed + ':lottery:' + state.year);
      const order = Draft.draftOrder(lottery, table.slice(0, 16).map(r => r.id));
      state.draft = Draft.runDraft({ seed: state.seed + ':draft:' + state.year, order });
      state.inbox.push({ type: 'draft', week: state.week, year: state.year });
    }
    let movement = null;
    if (state.topSeason) {
      Season.playRegularSeason(state.topSeason, state.seed + ':top:' + state.year);
      movement = Season.euPromotionRelegation(state.topSeason, season);
      state.inbox.push({ type: 'promotion-relegation', week: state.week, detail: movement });
    }
    for (const c of season.clubs) for (const p of c.roster) { Contracts.tickContract(p); Player.ageOneYear(p, rng); }
    if (state.topSeason) for (const c of state.topSeason.clubs) for (const p of c.roster) { Contracts.tickContract(p); Player.ageOneYear(p, rng); }
    if (state.player) {
      const p = state.player;
      if (!p.contract) {
        const offer = Contracts.offerForPlayer(p, clubOf(state), rng, Contracts.NA_ECONOMY_2026_27);
        state.market.push({ playerId: p.id, clubId: state.clubId, contract: offer });
        state.inbox.push({ type: 'offer', week: state.week, contract: offer });
      }
      if (p.career.retired) state.inbox.push({ type: 'retired', week: state.week });
    }
    const nextClubs = season.clubs.map(c => Object.assign({}, c, { wins: 0, losses: 0, pf: 0, pa: 0, streak: 0, roster: c.roster.filter(p => !p.career.retired) }));
    state.year++;
    state.season = Season.createSeason(season.leagueId, state.seed + ':season:' + state.year, nextClubs);
    if (state.topSeason) {
      const topClubs = state.topSeason.clubs.map(c => Object.assign({}, c, { wins: 0, losses: 0, pf: 0, pa: 0, streak: 0, roster: c.roster.filter(p => !p.career.retired) }));
      if (movement) {
        const relegated = topClubs.filter(c => movement.relegated.includes(c.id));
        const promoted = nextClubs.filter(c => movement.promoted.includes(c.id));
        for (const c of relegated) { c.league = season.leagueId; }
        for (const c of promoted) { c.league = state.topSeason.leagueId; }
        const stayTop = topClubs.filter(c => !movement.relegated.includes(c.id));
        const staySecond = nextClubs.filter(c => !movement.promoted.includes(c.id));
        state.topSeason = Season.createSeason(state.topSeason.leagueId, state.seed + ':season-top:' + state.year, stayTop.concat(promoted));
        state.season = Season.createSeason(season.leagueId, state.seed + ':season:' + state.year, staySecond.concat(relegated));
        const myClub = state.season.clubsById[state.clubId] || state.topSeason.clubsById[state.clubId];
        if (myClub) state.clubId = myClub.id;
      } else {
        state.topSeason = Season.createSeason(state.topSeason.leagueId, state.seed + ':season-top:' + state.year, topClubs);
      }
    }
    if (state.player) {
      const mine = (state.season.clubsById[state.clubId] || state.topSeason && state.topSeason.clubsById[state.clubId]);
      const updated = mine && mine.roster.find(p => p.id === state.player.id);
      if (updated) state.player = updated;
    }
    state.week = 0;
    record(state, { type: 'seasonEnd', year: state.year - 1, champion: season.champion });
  }
  function chooseEvent(state, optionId) {
    const ev = Content.chooseEvent(state, optionId);
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
    const target = targetLeagueId === 'na-boreal-men' ? 'na-boreal-men' : 'es-iberica-men';
    const p = state.player;
    const buyout = p.contract && p.contract.league === 'EU' ? Contracts.buyoutCost(p) : 0;
    const fakeClub = { league: target, budget: target === 'es-iberica-men' ? 18000000 : 0 };
    const offer = Contracts.offerForPlayer(p, fakeClub, rng, Contracts.NA_ECONOMY_2026_27);
    const crossing = { targetLeague: target, buyout, contract: offer, draftAndStash: target === 'na-boreal-men' && p.age < 22 && rng.float() < 0.35 };
    state.market.push({ playerId: p.id, clubId: state.clubId, contract: offer, crossing });
    state.inbox.push({ type: 'crossing', week: state.week, detail: crossing });
    state.rng = rng.serialize();
    record(state, { type: 'crossing', target, buyout });
    return crossing;
  }
  function signOffer(state, index) {
    const offer = state.market[index || 0];
    if (!offer || !state.player) throw new Error('no offer');
    state.player.contract = offer.contract;
    Content.ensureLife(state).counters.signs++;
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
      leagueId: state.season.leagueId, round: state.season.round, club: { id: club.id, name: club.name, wins: club.wins, losses: club.losses, rank: table.find(r => r.id === club.id).rank },
      player: state.player ? { id: state.player.id, name: state.player.name, pos: state.player.pos, number: state.player.number == null ? 7 : state.player.number, nationality: state.player.nationality, potential: state.player.potential, attrs: state.player.attrs, wingspan: state.player.wingspan, weight: state.player.weight, coachTrust: state.player.coachTrust, confidence: state.player.confidence || 0, morale: state.player.morale, form: state.player.form, archetype: state.player.archetype, handedness: state.player.handedness, height: state.player.height, ovr: state.player.ovr, age: state.player.age, load: state.player.load, injury: state.player.injury, contract: state.player.contract, stats: state.player.stats } : null,
      coach: state.coach, hash: state.hash, inbox: state.inbox.slice(-8), market: state.market, history: state.history.slice(-4), life: state.life || null
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
      if (![18, 30].includes(s.clubs.length) || s.schedule.length > 100 || !Number.isInteger(s.round) || s.round < 0 || s.round > s.schedule.length) { errors.push('invalid season size/round'); return; }
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
  CAA.Career = { MODES, ROUTES, createCareer, advanceWeek, liveStart, liveAdvance, chooseEvent, buyItem, equipItem, beginPractice, resolvePractice, cancelPractice, practice, nextGuide, exploreCrossing, signOffer, summary, validate, serialize, resume };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Career;
})(typeof globalThis !== 'undefined' ? globalThis : this);
