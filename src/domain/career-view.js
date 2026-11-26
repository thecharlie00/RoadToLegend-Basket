(function (root) {
  'use strict';
  // Carrera · lectura: medidores, calendario, resumen para la interfaz y validación del guardado.
  // Parte de career.js: lo compartido (otras partes, módulos de dominio, record, clubOf…) llega en `K`.
  const CAA = root.CAA = root.CAA || {};
  CAA.CareerParts = CAA.CareerParts || {};
  CAA.CareerParts["view"] = function (K) {
    const { Content, EraW, Eras, Family, Finance, Gear, Live, MODES, Market, National, Pet, Playoffs, ROUTES, Season, StatsBook, Viva, World, clubOf, currentGame, currentLive, jmPlan, jmState, rivalOf } = K;
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
        leagueName: (state.ed && state.ed.leagues[state.season.leagueId]) || (state.era && EraW && EraW.leagueNameAt(state.season.leagueId, state.year)) || league.name || state.season.leagueId, edits: state.ed || null, challenge: state.challenge || null, quick: state.quick || null, quickEnd: !!state.quickEnd, totalRounds: state.season.schedule.length, table, next: fx.next, recent: fx.recent, meters: meters(state, club),
        careerId: state.careerId, mode: state.mode, route: state.route, year: state.year, week: state.week,
        viva: (() => {
          const c = clubOf(state), starters = state.mode === 'coach' ? Season.clubToMatchTeam(c).players.filter(p => p.starter).map(p => p.id) : [];
          return { focus: Viva.focus(state, { event: !!Content.pendingView(state), live: !!currentLive(state), next: fx.next, playoffs: !!(fx.next && fx.next.playoff), starters }), chronicle: Viva.latest(state), archive: state.life && state.life.chronicles ? state.life.chronicles.slice(-12).reverse() : [] };
        })(),
        book: StatsBook.view(state),
        awardRace: (() => {
          const s = state.season; if (s.playoffs || s.round < 3) return null;
          const pid = state.player ? state.player.id : null;
          return Playoffs.awardRace(s, s.round, x => pid ? x.p.id === pid : x.club.id === state.clubId);
        })(),
        jm: (() => { const jm = jmState(state), g = currentGame(state); return { on: jm.on, plays: jm.plays, made: jm.made, due: !!(g && !currentLive(state) && jmPlan(state, g)) }; })(),
        era: state.era ? { start: state.era.start, decade: Eras.decadeOf(state.year), legends: state.era.legends, look: Eras.look(state.year), ball: Eras.ballColor(state.year), traits: Eras.traits(state.year, league) } : null,
        eraWorld: state.era && EraW ? (() => {
          EraW.duels(state);
          const last = (state.eraComps || []).filter(c => c.year === state.year - 1);
          return { comps: state.eraCompsSeen === state.year ? [] : last, palmares: (state.eraComps || []).filter(c => c.stage === 'champion').map(c => ({ year: c.year, nameKey: c.nameKey })),
            upcoming: EraW.compsFor(league, state.year).map(c => ({ id: c.id, nameKey: c.nameKey })), annual: (state.annual || []).slice(-12).reverse(),
            diverged: (state.annual || []).filter(a => a.diverged).length, rewritten: (state.annual || []).filter(a => a.rewritten).length,
            nemesis: EraW.nemesis(state), moments: EraW.momentsFor(state), lastMoment: state.eraMomentLast || null, album: EraW.album(state), foreignLimit: EraW.foreignLimit(state), sources: EraW.SOURCES };
        })() : null,
        rival: rivalOf(state), social: state.life && state.life.social ? state.life.social.slice(-6).reverse() : [], records: state.life ? state.life.records || null : null, diary: state.life && state.life.diary ? state.life.diary.slice(-30).reverse() : [],
        leagueId: state.season.leagueId, league: { cup: (state.era && EraW && EraW.cupNameAt(state.season.leagueId, state.year)) || league.cup || null, country: league.country, continent: league.continent, gender: league.gender || 'm', level: league.level }, world: state.world || null, pendingMove: state.pendingMove || null,
        round: state.season.round, club: { id: club.id, name: club.name, custom: club.custom || null, wins: club.wins, losses: club.losses, rank: table.find(r => r.id === club.id).rank },
        player: state.player ? { id: state.player.id, name: state.player.name, pos: state.player.pos, number: state.player.number == null ? 7 : state.player.number, nationality: state.player.nationality, potential: state.player.potential, attrs: state.player.attrs, wingspan: state.player.wingspan, weight: state.player.weight, coachTrust: state.player.coachTrust, confidence: state.player.confidence || 0, morale: state.player.morale, form: state.player.form, archetype: state.player.archetype, handedness: state.player.handedness, height: state.player.height, ovr: state.player.ovr, age: state.player.age, load: state.player.load, injury: state.player.injury, contract: state.player.contract, stats: state.player.stats } : null,
        gear: state.life ? Gear.view(state) : null, clubFin: state.mode === 'coach' ? Finance.view(state) : null, transfers: state.mode === 'coach' && state.clubFin ? Market.view(state) : null, summerCup: state.summerCup && state.summerCup.year === state.year && !state.summerCup.seen ? state.summerCup : null, cupDraw: state.cupDraw && !state.cupDraw.seen && state.cupDraw.year === state.year && state.season.cup ? { balls: state.season.cup.draw.map(id => ({ id, name: state.season.clubsById[id].name, mine: id === state.clubId })), rounds: state.season.cup.rounds.map(r => ({ name: r.name, games: r.games.map(g => ({ a: state.season.clubsById[g.a].name, b: state.season.clubsById[g.b].name, score: g.score, mine: g.a === state.clubId || g.b === state.clubId })) })), champion: state.season.clubsById[state.season.cup.champion] && state.season.clubsById[state.season.cup.champion].name } : null, youthCup: state.youthCup && state.youthCup.played && !state.youthCup.seen ? state.youthCup : null, academy: state.academy ? state.academy.prospect && { name: state.academy.prospect.name, pos: state.academy.prospect.pos, ovr: state.academy.prospect.ovr, potential: state.academy.prospect.potential } : null, deadline: state.clubFin ? World.deadline(state) : null, national: state.player ? National.view(state) : null, cup: state.season.cup || null, look: state.life ? Gear.avatarLook(state) : null,
        event: Content.pendingView(state), pet: state.pet || null, family: state.family || null, retirement: state.retirement || null, careerOver: !!state.careerOver, lastSeason: state.lastSeasonSummary && !state.lastSeasonSummary.dismissed ? state.lastSeasonSummary : null,
        playoffs: state.season.playoffs ? { format: state.season.playoffs.format, round: Playoffs.current(state.season.playoffs).name, done: state.season.playoffs.done, series: Playoffs.seriesOf(state.season.playoffs, state.clubId), status: Playoffs.status(state.season.playoffs, state.clubId), result: Playoffs.resultOf(state.season.playoffs, state.clubId) } : null,
        awards: state.season.awards || null, coach: state.coach,
        squad: state.mode === 'coach' ? (() => { const c = clubOf(state); const starters = Season.clubToMatchTeam(c).players.filter(p => p.starter).map(p => p.id); return { starters, tactic: c.tacticChoice || { pace: 'normal', focus: 'balanced', defense: 'man' }, training: c.training || 'normal',
          roster: c.roster.map(p => ({ id: p.id, name: p.name, nationality: p.nationality, gender: p.gender, pos: p.pos, ovr: p.ovr, age: p.age, morale: p.morale == null ? 70 : p.morale, load: Math.round(p.load || 0), injury: p.injury ? p.injury.weeksRemaining : 0, archetype: p.archetype, pts: p.stats ? p.stats.pts : 0, gp: p.stats ? p.stats.gp : 0 })) }; })() : null,
        scouting: K.scouting(state), hash: state.hash, inbox: state.inbox.slice(-8), market: state.market, history: state.history.slice(-4), life: state.life || null
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
      if (!Number.isInteger(state.week) || state.week < 0 || !Number.isInteger(state.year) || state.year < (state.era ? 1920 : 2026) || state.year > 3000) errors.push('invalid career clock');
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
    return { clamp100, meters, fixtures, summary, validate };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
