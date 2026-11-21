(function (root) {
  'use strict';
  // Carrera · mundo: familia y retiro, Modo Épocas, traspasos entre ligas, ofertas y cruces.
  // Parte de career.js: lo compartido (otras partes, módulos de dominio, record, clubOf…) llega en `K`.
  const CAA = root.CAA = root.CAA || {};
  CAA.CareerParts = CAA.CareerParts || {};
  CAA.CareerParts["world"] = function (K) {
    const { Content, Contracts, Eras, Family, Player, RNG, Season, clubOf, record } = K;
    // ===== Familia y Dinastías =====
    function familySetup(state, config = {}) { const f = Family.setup(state, config); record(state, { type: 'familySetup', kind: config.kind || 'none' }); familyCounters(state); return f; }
    function familyCounters(state) {
      const f = Family.ensure(state), c = Content.ensureLife(state).counters;
      c.partner = f.partner ? 1 : Math.max(c.partner || 0, 0); c.married = Math.max(c.married || 0, f.status === 'married' ? 1 : 0);
      c.childrenCount = Math.max(c.childrenCount || 0, f.children.length); c.generation = f.generation; c.legends = f.legends.length;
      Content.evaluateAchievements(state);
    }
    // ===== Épocas: reglas del año, noticias de cambios de reglamento y leyendas de la década =====
    function leaguesNow(state, gender) { return Season.leagueList(gender).filter(l => !state.era || Eras.available(Season.LEAGUES[l.id], state.year)); }
    function eraApply(state, announce) {
      if (!state.era) return;
      const L = Season.LEAGUES[state.season.leagueId];
      for (const ss of [state.season, state.topSeason]) if (ss) ss.ruleSet = Eras.ruleSetFor(state.year, Season.LEAGUES[ss.leagueId]);
      if (announce) {
        const a = Eras.traits(state.year - 1, L), b = Eras.traits(state.year, L);
        if (a.shotClock !== b.shotClock) state.inbox.push({ type: 'eraRule', week: 0, detail: { rule: b.shotClock ? 'shotClock' : 'noClock', value: b.shotClock } });
        if (a.three !== b.three) state.inbox.push({ type: 'eraRule', week: 0, detail: { rule: 'three' } });
        if (a.quarters !== b.quarters) state.inbox.push({ type: 'eraRule', week: 0, detail: { rule: 'quarters' } });
      }
    }
    function eraLegends(state) {
      if (!state.era) return;
      const L = Season.LEAGUES[state.season.leagueId], dec = Eras.decadeOf(state.year);
      const list = Eras.legends(dec, L.gender, state.seed);
      const rng = RNG.create(state.seed + ':legend-clubs:' + dec);
      const others = state.season.clubs.filter(c => c.id !== state.clubId);
      state.era.decade = dec;
      state.era.legends = list.map((lg, i) => {
        const club = others[rng.int(0, others.length - 1)];
        const p = Player.createPlayer({ seed: state.seed + ':legend:' + dec + ':' + i, name: lg.name, nationality: lg.nationality, pos: lg.pos, quality: lg.ovr, age: 26 + rng.int(0, 4), gender: L.gender === 'f' ? 'women' : 'men' });
        p.legend = true; p.contract = Contracts.offerForPlayer(p, club, rng, Contracts.NA_ECONOMY_2026_27);
        const idx = club.roster.findIndex(x => !x.legend && x.id !== (state.player && state.player.id));
        if (idx >= 0) club.roster.splice(club.roster.length - 1, 1);
        club.roster.unshift(p);
        return { name: lg.name, nationality: lg.nationality, pos: lg.pos, ovr: p.ovr, nick: lg.nick, club: club.name };
      });
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
        const eo = state.era ? { noReal: true } : undefined;
        season = Season.createSeason(leagueId, state.seed + ':move:' + state.year + ':' + leagueId, null, eo);
        state.topSeason = L.pair ? Season.createSeason(L.pair, state.seed + ':move-pair:' + state.year, null, eo) : null;
      } else if (season === state.topSeason) state.topSeason = state.season;
      state.season = season;
      const club = season.clubsById[clubId] || season.clubs[season.clubs.length - 1];
      club.roster.push(p);
      state.clubId = club.id; state.live = null;
      p.coachTrust = Math.min(p.coachTrust == null ? 55 : p.coachTrust, 55);
      state.route = leagueId === 'na-boreal-men' || leagueId === 'na-boreal-women' ? (state.route === 'na-draft' ? 'na-draft' : 'na-undrafted') : leagueId === 'es-ascenso-iberico' || leagueId === 'es-iberica-men' ? 'eu-academy' : 'world';
      state.inbox.push({ type: 'moved', week: state.week, detail: { leagueId, club: club.name } });
      eraApply(state, false);
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
      const pool = leaguesNow(state, L.gender).filter(l => l.id !== state.season.leagueId && l.id !== L.pair && p.ovr >= l.strength - 8);
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
        const eo2 = state.era ? { noReal: true } : undefined;
        state.season = Season.createSeason(leagueId, state.seed + ':gen' + gen + ':season', null, eo2);
        state.topSeason = pair ? Season.createSeason(pair, state.seed + ':gen' + gen + ':top', null, eo2) : null;
        state.route = leagueId === 'na-boreal-men' || leagueId === 'na-boreal-women' ? 'na-undrafted' : leagueId === 'es-ascenso-iberico' ? 'eu-academy' : 'world';
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
        if (state.era) { eraApply(state, false); eraLegends(state); }
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
    function exploreCrossing(state, targetLeagueId) {
      if (!state.player) throw new Error('player career required');
      const rng = RNG.create(0); rng.restore(state.rng);
      const L = Season.LEAGUES[state.season.leagueId];
      let target = Season.LEAGUES[targetLeagueId] ? targetLeagueId : (L.gender === 'f' ? (state.season.leagueId === 'na-boreal-women' ? 'es-iberica-women' : 'na-boreal-women') : state.season.leagueId === 'na-boreal-men' ? 'es-iberica-men' : 'na-boreal-men');
      if (Season.LEAGUES[target].gender !== L.gender) throw new Error('league of another category');
      if (state.era && !Eras.available(Season.LEAGUES[target], state.year)) throw new Error('league not founded yet');
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
    return { familySetup, familyCounters, leaguesNow, eraApply, eraLegends, heirLeague, moveTo, foreignOffer, worldOffers, afterRetirement, exploreCrossing, signOffer };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
