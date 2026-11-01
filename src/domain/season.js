(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const Hash = CAA.Hash || (typeof require === 'function' ? require('../core/hash.js') : null);
  const Match = CAA.Match || (typeof require === 'function' ? require('../match/engine.js') : null);
  const Player = CAA.Player || (typeof require === 'function' ? require('./player.js') : null);
  const Contracts = CAA.Contracts || (typeof require === 'function' ? require('./contracts.js') : null);
  const Names = CAA.Names || (typeof require === 'function' ? require('./names.js') : null);

  const LEAGUES = {
    'es-iberica-men': { id: 'es-iberica-men', name: 'Liga Ibérica', ruleSet: 'FIBA-2026', teams: 18, games: 34, region: 'EU', level: 1 },
    'es-ascenso-iberico': { id: 'es-ascenso-iberico', name: 'Ascenso Ibérico', ruleSet: 'FIBA-2026', teams: 18, games: 34, region: 'EU', level: 2 },
    'na-boreal-men': { id: 'na-boreal-men', name: 'Liga Boreal', ruleSet: 'NA-2026-27', teams: 30, games: 82, region: 'NA', level: 1 }
  };

  function clubSeed(leagueId, index) { return leagueId + ':club:' + index; }
  function createClub(leagueId, index, name, rating) {
    const league = LEAGUES[leagueId];
    const rng = RNG.create(clubSeed(leagueId, index));
    const players = [];
    const pos = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C', 'SF', 'SG'];
    for (let i = 0; i < 12; i++) {
      const quality = Math.max(30, Math.min(85, rating + (i < 5 ? 3 : -5) + rng.int(-4, 4)));
      const p = Player.createPlayer({ seed: clubSeed(leagueId, index) + ':p' + i, pos: pos[i], quality, age: rng.int(19, 34), nationality: league.region === 'EU' ? (rng.float() < 0.6 ? 'ES' : rng.pick(['FR', 'DE', 'IT', 'TR', 'GR', 'LT', 'RS', 'AR', 'BR'])) : rng.pick(['US', 'US', 'US', 'CA', 'FR', 'AU', 'CN', 'JP', 'KR', 'PH', 'ZA']) });
      p.contract = Contracts.offerForPlayer(p, { league: leagueId, budget: league.region === 'EU' ? (league.level === 1 ? 18000000 : 3500000) : 0 }, rng, Contracts.NA_ECONOMY_2026_27);
      players.push(p);
    }
    return { id: leagueId + '-' + (index + 1), name, league: leagueId, region: league.region, budget: league.region === 'EU' ? (league.level === 1 ? 18000000 : 3500000) : 0, roster: players, tactic: Object.assign({}, Match.DEFAULT_TACTIC), wins: 0, losses: 0, pf: 0, pa: 0, streak: 0 };
  }
  function clubNames(leagueId) {
    const league = LEAGUES[leagueId];
    if (!league) throw new Error('unknown league ' + leagueId);
    return league.region === 'EU'
      ? (league.level === 1 ? ['Madrid Alcores','Barcelona Dracs','Valencia Horts','Sevilla Torres','Bilbao Forja','Málaga Faro','Zaragoza Viento','A Coruña Marea','Granada Alhambra','Murcia Huerta','Córdoba Mezquita','Valladolid Pinar','Santiago Bruma','Alicante Palmeral','Girona Onyar','Las Palmas Dunas','Pamplona Muralla','Santander Bahía'] : ['Madrid Cantera','Barcelona Litoral','Valencia Delta','Sevilla Compás','Bilbao Acero','Málaga Costa','Zaragoza Cierzo','A Coruña Faro','Granada Vega','Murcia Segura','Córdoba Patio','Valladolid Duero','Santiago Niebla','Alicante Sal','Girona Ter','Las Palmas Volcán','Pamplona Arga','Santander Ola'])
      : ['New York Bridges','Boston Beacons','Chicago Forge','Los Angeles Reels','Seattle Pines','Austin Comets','Miami Tides','Denver Peaks','Phoenix Sunsands','Portland Timberside','Sacramento Rivers','Salt Lake Summits','Oklahoma City Prairies','Dallas Lone Stars','Houston Bayous','San Antonio Alamos','Minneapolis Lakes','Milwaukee Brews','Detroit Motors','Cleveland Rocks','Indiana Pacerset','Atlanta Peaches','Charlotte Hornetside','Orlando Orbits','Washington Monuments','Philadelphia Keys','Brooklyn Docks','Toronto Towers','Memphis Blues','New Orleans Crescents'];
  }
  function clubCatalog(leagueId) {
    const league = LEAGUES[leagueId];
    if (!league) throw new Error('unknown league ' + leagueId);
    const names = clubNames(leagueId);
    return Array.from({ length: league.teams }, (_, i) => ({ id: leagueId + '-' + (i + 1), name: names[i] || league.name + ' ' + (i + 1) }));
  }
  function defaultClubs(leagueId) {
    const league = LEAGUES[leagueId];
    if (!league) throw new Error('unknown league ' + leagueId);
    const names = clubNames(leagueId);
    const out = [];
    for (let i = 0; i < league.teams; i++) out.push(createClub(leagueId, i, names[i] || league.name + ' ' + (i + 1), league.region === 'EU' ? (league.level === 1 ? 62 : 52) : 55));
    Names.assignInspiredToClubs(out, leagueId + ':inspired', league.region === 'EU' ? 'eu' : 'na', league.region === 'EU' && league.level === 2 ? 18 : 0);
    return out;
  }

  function roundRobin(ids) {
    const arr = ids.slice();
    if (arr.length % 2) arr.push(null);
    const rounds = [];
    const n = arr.length;
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        const a = arr[i], b = arr[n - 1 - i];
        if (a && b) pairs.push(r % 2 ? [b, a] : [a, b]);
      }
      rounds.push(pairs);
      arr.splice(1, 0, arr.pop());
    }
    return rounds;
  }
  function createSchedule(leagueId, clubIds, seed) {
    const league = LEAGUES[leagueId];
    const rng = RNG.create(seed || leagueId + ':schedule');
    const base = roundRobin(rng.shuffle(clubIds));
    const first = base.slice();
    const second = base.map(r => r.map(p => [p[1], p[0]]));
    let rounds = first.concat(second);
    while (rounds.length < league.games) rounds = rounds.concat(rounds.slice(0, league.games - rounds.length));
    rounds = rounds.slice(0, league.games);
    return rounds.map((pairs, i) => ({ round: i + 1, games: pairs.map((p, j) => ({ id: leagueId + '-r' + (i + 1) + '-g' + (j + 1), home: p[0], away: p[1], played: false, score: null })) }));
  }

  function clubToMatchTeam(club, starterIds) {
    let roster = club.roster.filter(p => !p.injury);
    if (roster.length < 5) {
      const extra = club.roster.filter(p => p.injury).sort((a, b) => (a.injury.weeksRemaining || 0) - (b.injury.weeksRemaining || 0));
      roster = roster.concat(extra).slice(0, Math.max(5, roster.length));
    }
    const chosen = !starterIds && Array.isArray(club.starters) ? club.starters.filter(id => roster.some(p => p.id === id && !p.injury)) : null;
    const starters = starterIds || (chosen && chosen.length === 5 ? chosen.slice() : roster.slice(0, 5).map(p => p.id));
    // Con la confianza plena del entrenador, el jugador entra en el quinteto inicial.
    if (!starterIds) { const trusted = roster.find(p => (p.coachTrust || 0) >= 75 && !starters.includes(p.id)); if (trusted) starters[4] = trusted.id; }
    return {
      id: club.id, name: club.name,
      players: roster.map(p => Player.toMatchPlayer(p, starters.includes(p.id))),
      tactic: Object.assign({}, club.tactic || Match.DEFAULT_TACTIC)
    };
  }
  function simulateGame(game, clubsById, seed, ruleSet) {
    const home = clubsById[game.home], away = clubsById[game.away];
    if (!home || !away) throw new Error('missing club');
    const teams = [clubToMatchTeam(home), clubToMatchTeam(away)];
    const state = Match.simulateMatch({ seed, ruleSetId: ruleSet, teams, matchId: game.id });
    return applyGameResult(game, clubsById, state);
  }
  function gameSeed(season, seed, gameIndex) { return (seed || season.leagueId) + ':r' + season.schedule[season.round].round + ':g' + gameIndex; }
  // Applies an already finished match (simulated or played live) to the table and player stats.
  function applyGameResult(game, clubsById, state) {
    const home = clubsById[game.home], away = clubsById[game.away];
    if (!home || !away) throw new Error('missing club');
    if (!state.final || state.teams[0].id !== home.id || state.teams[1].id !== away.id) throw new Error('match result does not fit game ' + game.id);
    const valid = Match.validateBox(state);
    if (!valid.ok) throw new Error('invalid box ' + valid.errors.join('; '));
    game.played = true;
    game.score = state.score.slice();
    game.hash = state.hash;
    game.homeWins = state.score[0] > state.score[1];
    home.pf += state.score[0]; home.pa += state.score[1];
    away.pf += state.score[1]; away.pa += state.score[0];
    if (game.homeWins) { home.wins++; away.losses++; home.streak = Math.max(1, home.streak + 1); away.streak = Math.min(-1, away.streak - 1); }
    else { away.wins++; home.losses++; away.streak = Math.max(1, away.streak + 1); home.streak = Math.min(-1, home.streak - 1); }
    for (let ti = 0; ti < 2; ti++) {
      const club = ti === 0 ? home : away;
      const box = state.teams[ti];
      for (const mp of box.players) {
        const p = club.roster.find(x => x.id === mp.id);
        if (!p) continue;
        p.stats.gp++; p.stats.min += mp.stats.min; p.stats.pts += mp.stats.pts;
        p.stats.reb += mp.stats.orb + mp.stats.drb; p.stats.ast += mp.stats.ast;
        p.stats.stl += mp.stats.stl; p.stats.blk += mp.stats.blk; p.stats.tov += mp.stats.tov;
        if (p.career) { const tt = p.career.totals || (p.career.totals = { gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 }); tt.gp++; tt.pts += mp.stats.pts; tt.reb += mp.stats.orb + mp.stats.drb; tt.ast += mp.stats.ast; tt.stl += mp.stats.stl; tt.blk += mp.stats.blk; }
        p.load = Math.min(100, (p.load || 0) + mp.stats.min * 0.8);
        p.fatigue = Math.min(1, (p.fatigue || 0) + mp.stats.min / 200);
      }
    }
    return state;
  }
  function standings(clubs) {
    return clubs.slice().sort((a, b) => b.wins - a.wins || (b.pf - b.pa) - (a.pf - a.pa) || a.id.localeCompare(b.id)).map((c, i) => ({ rank: i + 1, id: c.id, name: c.name, wins: c.wins, losses: c.losses, diff: c.pf - c.pa }));
  }
  function createSeason(leagueId, seed, clubs) {
    const league = LEAGUES[leagueId];
    if (!league) throw new Error('unknown league ' + leagueId);
    const list = clubs || defaultClubs(leagueId);
    const byId = {};
    for (const c of list) { byId[c.id] = c; for (const p of c.roster) p.ovrStart = p.ovr; }
    return { leagueId, season: '2026-27', ruleSet: league.ruleSet, round: 0, clubs: list, clubsById: byId, schedule: createSchedule(leagueId, list.map(c => c.id), seed), results: [], champion: null, playoffs: null };
  }
  function playRound(season, seed, overrides) {
    if (season.round >= season.schedule.length) return null;
    const round = season.schedule[season.round];
    const states = [];
    for (let i = 0; i < round.games.length; i++) {
      const g = round.games[i];
      const pre = overrides && overrides[g.id];
      states.push(pre ? applyGameResult(g, season.clubsById, pre) : simulateGame(g, season.clubsById, (seed || season.leagueId) + ':r' + round.round + ':g' + i, season.ruleSet));
      season.results.push({ round: round.round, id: g.id, home: g.home, away: g.away, score: g.score, hash: g.hash });
    }
    season.round++;
    return states;
  }
  function playRegularSeason(season, seed) {
    while (season.round < season.schedule.length) playRound(season, seed);
    return standings(season.clubs);
  }
  function euPromotionRelegation(top, second) {
    const topTable = standings(top.clubs);
    const secondTable = standings(second.clubs);
    const relegated = topTable.slice(-2).map(r => r.id);
    // Con playoff de ascenso: el 1.º sube directo y el ganador del playoff, también.
    const promoted = second.playoffs && second.playoffs.done && second.playoffs.promoted.length === 2 ? second.playoffs.promoted.slice() : secondTable.slice(0, 2).map(r => r.id);
    return { relegated, promoted };
  }
  function naPlayoffSeeds(season) {
    const table = standings(season.clubs);
    return { playIn: table.slice(6, 10).map(r => r.id), direct: table.slice(0, 6).map(r => r.id), lottery: table.slice(-14).map(r => r.id) };
  }
  function hashSeason(season) {
    return Hash.hex32(Hash.hashObject({ leagueId: season.leagueId, round: season.round, results: season.results, clubs: season.clubs.map(c => ({ id: c.id, wins: c.wins, losses: c.losses, pf: c.pf, pa: c.pa })) }));
  }

  CAA.Season = { LEAGUES, createClub, clubCatalog, defaultClubs, createSchedule, createSeason, playRound, playRegularSeason, standings, euPromotionRelegation, naPlayoffSeeds, clubToMatchTeam, simulateGame, hashSeason, applyGameResult, gameSeed };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Season;
})(typeof globalThis !== 'undefined' ? globalThis : this);
