(function (root) {
  'use strict';
  // Carrera · club y banquillo: editor, finanzas, mundo vivo, mercado, táctica, semana del entrenador y ojeo.
  // Parte de career.js: lo compartido (otras partes, módulos de dominio, record, clubOf…) llega en `K`.
  const CAA = root.CAA = root.CAA || {};
  CAA.CareerParts = CAA.CareerParts || {};
  CAA.CareerParts["club"] = function (K) {
    const { Content, Contracts, EraW, Finance, Market, Match, Player, Playoffs, RNG, Season, Viva, World, advanceWeek, clubOf, currentGame, jmState, record } = K;
    // Relevo generacional en todas las plantillas: los retirados dejan hueco a jóvenes de nivel parecido.
    function refillRosters(state) {
      for (const ss of [state.season, state.topSeason]) if (ss) {
        const g = Season.genderOf(ss.leagueId);
        for (const c of ss.clubs) {
          const base = c.roster.length ? c.roster.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 8).reduce((a, p) => a + p.ovr, 0) / Math.min(8, c.roster.length) : 52;
          let k = 0;
          while (c.roster.length < 12) {
            const rr = RNG.create(state.seed + ':refill:' + state.year + ':' + c.id + ':' + k++);
            const p = Player.createPlayer({ seed: state.seed + ':rk:' + state.year + ':' + c.id + ':' + k, quality: Math.round(base - 6 + rr.int(-3, 3)), age: 19 + rr.int(0, 3), nationality: (c.roster[0] || {}).nationality || 'ES', gender: g });
            p.contract = Contracts.offerForPlayer(p, c, rr, Contracts.NA_ECONOMY_2026_27);
            c.roster.push(p);
          }
          for (const p of c.roster) p.ovrStart = p.ovr;
        }
      }
    }
    // Editor (edit35): nombres de clubes y ligas a tu gusto, guardados en la partida.
    function applyEdits(state) {
      const ed = state.ed; if (!ed) return;
      for (const ss of [state.season, state.topSeason]) if (ss) for (const c of ss.clubs) if (ed.clubs[c.id]) c.name = ed.clubs[c.id];
    }
    function editOp(state, cfg = {}) {
      const clean = v => String(v || '').replace(/[<>]/g, '').trim().slice(0, 30);
      state.ed = state.ed || { clubs: {}, leagues: {} };
      if (cfg.op === 'club') { const c = state.season.clubsById[cfg.id] || (state.topSeason && state.topSeason.clubsById[cfg.id]); if (!c) throw new Error('unknown club'); const v = clean(cfg.name); if (!v) throw new Error('empty name'); state.ed.clubs[cfg.id] = v; }
      else if (cfg.op === 'league') { if (!Season.LEAGUES[cfg.id]) throw new Error('unknown league'); const v = clean(cfg.name); if (v) state.ed.leagues[cfg.id] = v; else delete state.ed.leagues[cfg.id]; }
      else if (cfg.op === 'reset') state.ed = { clubs: {}, leagues: {} };
      else throw new Error('unknown op');
      applyEdits(state);
      record(state, { type: 'edit', op: cfg.op });
      return state.ed;
    }
    // Simular el resto de la temporada de una vez (las decisiones pendientes toman la primera opción).
    function simSeason(state) {
      const y = state.year; let g = 0;
      while (state.year === y && !state.careerOver && !(state.retirement && state.retirement.pending) && g++ < 260) {
        const life = Content.ensureLife(state);
        if (life.pendingEvent) { const v = Content.pendingView(state); if (v) K.chooseEvent(state, v.options[0].id); else life.pendingEvent = null; }
        const st = state.season.playoffs ? Playoffs.status(state.season.playoffs, state.clubId) : null;
        advanceWeek(state, { type: state.season.playoffs && !state.season.playoffs.done && !['playing', 'waiting'].includes(st) ? 'skipPlayoffs' : 'play' });
      }
      return state;
    }
    // Simular hasta la próxima decisión: avanza semanas seguidas y se para en cuanto hay algo
    // que decidir o que ver (evento, Jugada Maestra, lesión, oferta, playoffs o fin de temporada).
    // Nunca decide por ti: los eventos se quedan pendientes para que los elijas.
    function simToDecision(state, maxWeeks = 12) {
      const life = Content.ensureLife(state);
      const mark = () => ({ market: (state.market || []).length, inj: !!(state.player && state.player.injury && state.player.injury.weeksRemaining > 0), po: !!state.season.playoffs, year: state.year });
      let weeks = 0, reason = 'limit';
      while (weeks < maxWeeks) {
        if (state.careerOver || (state.retirement && state.retirement.pending)) { reason = 'end'; break; }
        if (life.pendingEvent || state.live) { reason = 'event'; break; }
        if (state.lastSeasonSummary) { reason = 'season'; break; }
        const g = currentGame(state);
        if (g && jmState(state).on && K.jmPlan(state, g)) { reason = 'jm'; break; }
        const before = mark();
        const st = state.season.playoffs ? Playoffs.status(state.season.playoffs, state.clubId) : null;
        advanceWeek(state, { type: state.season.playoffs && !state.season.playoffs.done && !['playing', 'waiting'].includes(st) ? 'skipPlayoffs' : 'play' });
        weeks++;
        const after = mark();
        if (state.lastSeasonSummary || after.year !== before.year) { reason = 'season'; break; }
        if (life.pendingEvent) { reason = 'event'; break; }
        if (after.inj && !before.inj) { reason = 'injury'; break; }
        if (after.market > before.market) { reason = 'offer'; break; }
        if (after.po && !before.po) { reason = 'playoffs'; break; }
      }
      state.lastSim = { weeks, reason };
      return state.lastSim;
    }
    function clubOp(state, config = {}) {
      Finance.op(state, config);
      record(state, { type: 'club', op: config.op, key: config.key || null });
      Content.evaluateAchievements(state);
      return Finance.view(state);
    }
    // Mundo vivo: torneo de verano visto, subir al juvenil de la cantera y fichajes del día de cierre.
    function worldOp(state, config = {}) {
      let out = null;
      if (config.op === 'summer-seen') { if (state.summerCup) state.summerCup.seen = true; }
      else if (config.op === 'draw-seen') { if (state.cupDraw) state.cupDraw.seen = true; }
      else if (config.op === 'youth-seen') { if (state.youthCup) state.youthCup.seen = true; }
      else if (config.op === 'promote') out = World.promoteProspect(state);
      else if (config.op === 'deadline-sign') out = World.deadlineSign(state, config.id);
      else if (config.op === 'era-moment') out = state.eraMomentLast = EraW.playMoment(state, config.id, config.tactic);
      else if (config.op === 'era-moment-seen') state.eraMomentLast = null;
      else if (config.op === 'viva-seen') out = Viva.markSeen(state);
      else if (config.op === 'jm-toggle') { const jm = jmState(state); jm.on = !jm.on; out = { on: jm.on }; }
      else if (config.op === 'era-comps-seen') state.eraCompsSeen = state.year;
      else throw new Error('unknown world op');
      record(state, { type: 'world', op: config.op, id: config.id || null });
      return out;
    }
    function marketOp(state, config = {}) {
      Market.op(state, config);
      record(state, { type: 'market', op: config.op, role: config.role || null });
      Content.evaluateAchievements(state);
      return Market.view(state);
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
    return { refillRosters, applyEdits, editOp, simSeason, simToDecision, clubOp, worldOp, marketOp, TACTICS, coachSet, coachWeek, scouting };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
