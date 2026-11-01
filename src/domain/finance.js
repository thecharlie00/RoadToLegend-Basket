(function (root) {
  'use strict';
  // El club por dentro (adaptación de club30 del fútbol): finanzas de la temporada, pabellón e instalaciones,
  // precio de las entradas, objetivos de la directiva y juego limpio financiero. Activo en las carreras de
  // entrenador y en «Crea tu club», donde además fundas el club (nombre, siglas y colores).
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const Player = CAA.Player || (typeof require === 'function' ? require('./player.js') : null);
  const Contracts = CAA.Contracts || (typeof require === 'function' ? require('./contracts.js') : null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const PRICES = [{ id: 'popular', k: 0.75, fill: 0.15, fans: 0.6 }, { id: 'normal', k: 1, fill: 0, fans: 0 }, { id: 'premium', k: 1.3, fill: -0.15, fans: -0.8 }];
  const FACILITIES = ['arena', 'training', 'youth', 'medical'];
  const CAPACITY = [0, 2500, 4500, 7000, 10500, 15000];

  function S() { return CAA.Season; }
  function budgetOf(state) {
    const L = S().LEAGUES[state.season.leagueId];
    const b = S().leagueBudget(L);
    return b > 0 ? b : 60000000; // franquicias norteamericanas: tope salarial aproximado
  }
  function ensure(state) {
    if (state.mode !== 'coach') return null;
    if (!state.clubFin) {
      const B = budgetOf(state);
      state.clubFin = { cash: Math.round(B * 0.25), ticket: 1, fac: { arena: 2, training: 1, youth: 1, medical: 1 }, fans: 55,
        season: { ticket: 0, tv: 0, sponsor: 0, prize: 0, wages: 0, upkeep: 0, works: 0 }, log: [], objective: null, warnings: 0 };
    }
    const f = state.clubFin;
    if (!f.objective) f.objective = objective(state);
    return f;
  }
  // Objetivo de la directiva según la fuerza de la plantilla en su liga.
  function objective(state) {
    const s = state.season, avg = c => c.roster.slice(0, 8).reduce((a, p) => a + p.ovr, 0) / Math.min(8, c.roster.length);
    const order = s.clubs.slice().sort((a, b) => avg(b) - avg(a)).map(c => c.id);
    const r = order.indexOf(state.clubId) + 1, n = s.clubs.length;
    const target = r <= 2 ? 2 : r <= Math.ceil(n / 3) ? Math.ceil(n / 3) : r <= Math.ceil(n * 0.66) ? Math.ceil(n / 2) : n - 2;
    return { target, strengthRank: r };
  }
  function wageBill(club) { return club.roster.reduce((a, p) => a + (p.contract ? p.contract.salary : 0), 0); }
  function rounds(state) { return Math.max(1, state.season.schedule.length); }
  // Una semana de liga: taquilla si jugaste en casa, televisión, patrocinio, sueldos y mantenimiento.
  function weekTick(state, played, rng) {
    const f = ensure(state); if (!f) return null;
    const club = state.season.clubsById[state.clubId], B = budgetOf(state), W = rounds(state);
    const games = (played || []).filter(m => m && m.teams && m.teams.some(t => t.id === state.clubId));
    const home = games.some(m => m.teams[0].id === state.clubId);
    const gp = club.wins + club.losses, win = gp ? club.wins / gp : 0.5, price = PRICES[f.ticket];
    const fill = clamp(0.42 + f.fans / 220 + win * 0.25 + price.fill, 0.18, 1);
    const cap = CAPACITY[f.fac.arena] * (S().LEAGUES[state.season.leagueId].region === 'NA' ? 1.25 : 1);
    const ticket = home ? Math.round(B * 0.38 / (W / 2) * (cap / CAPACITY[3]) * fill * price.k) : 0;
    const tv = Math.round(B * 0.33 / W), sponsor = Math.round(B * (0.22 + f.fans / 1000) / W);
    const wages = Math.round(wageBill(club) / W), upkeep = Math.round(B * 0.012 * FACILITIES.reduce((a, k) => a + f.fac[k], 0) / W);
    const net = ticket + tv + sponsor - wages - upkeep;
    f.cash += net;
    Object.assign(f.season, { ticket: f.season.ticket + ticket, tv: f.season.tv + tv, sponsor: f.season.sponsor + sponsor, wages: f.season.wages + wages, upkeep: f.season.upkeep + upkeep });
    f.log.push({ week: state.week, ticket, tv, sponsor, wages, upkeep, net, attendance: home ? Math.round(cap * fill) : 0 });
    if (f.log.length > 8) f.log.shift();
    // Afición: resultados y precio.
    const last = games[0];
    if (last && last.score) { const mine = last.teams[0].id === state.clubId ? 0 : 1, won = last.score[mine] > last.score[1 - mine]; f.fans = clamp(f.fans + (won ? 1.2 : -1) + price.fans * 0.5, 0, 100); }
    // Ciudad deportiva: progreso semanal extra de la plantilla; servicios médicos: recuperación.
    if (f.fac.training > 1) for (const p of club.roster) if (p.age <= 26 && rng.float() < 0.25) Player.develop(p, { focus: null, scale: 0.12 * (f.fac.training - 1) }, rng);
    if (f.fac.medical > 1) for (const p of club.roster) if (p.injury && rng.float() < 0.15 * (f.fac.medical - 1)) Player.recover(p);
    // Juego limpio financiero.
    if (f.cash < -B * 0.3) {
      f.warnings++;
      state.inbox.push({ type: 'ffp', week: state.week, detail: { cash: f.cash } });
      if (state.coach) state.coach.trust = Math.max(0, state.coach.trust - 3);
    }
    return { net };
  }
  function upgradeCost(state, key) { const f = ensure(state); return Math.round(budgetOf(state) * 0.12 * f.fac[key]); }
  function op(state, cfg = {}) {
    const f = ensure(state); if (!f) throw new Error('club finances need a coach career');
    if (cfg.op === 'ticket') { const i = Number(cfg.value); if (!PRICES[i]) throw new Error('bad price'); f.ticket = i; return f; }
    if (cfg.op === 'upgrade') {
      if (!FACILITIES.includes(cfg.key)) throw new Error('bad facility');
      if (f.fac[cfg.key] >= 5) throw new Error('max level');
      const cost = upgradeCost(state, cfg.key);
      if (f.cash < cost) throw new Error('not enough cash');
      f.cash -= cost; f.fac[cfg.key]++; f.season.works += cost;
      if (state.life) state.life.counters.facilityUpgrades = (state.life.counters.facilityUpgrades || 0) + 1;
      return f;
    }
    throw new Error('unknown op');
  }
  // Final de temporada: premios, veredicto de la directiva y canteranos.
  function seasonEnd(state, rank, rng) {
    const f = ensure(state); if (!f) return null;
    const club = state.season.clubsById[state.clubId], B = budgetOf(state), n = state.season.clubs.length;
    const prize = Math.round(B * 0.25 * (1 - (rank - 1) / n));
    f.cash += prize; f.season.prize += prize;
    const met = rank <= f.objective.target;
    if (state.coach) { state.coach.trust = clamp(state.coach.trust + (met ? 10 : -14), 0, 100); }
    const report = Object.assign({ rank, target: f.objective.target, met, cash: f.cash }, f.season);
    // Cantera: un juvenil por temporada, mejor cuanto mejor sea la academia.
    const youth = [];
    const yn = f.fac.youth >= 4 ? 2 : 1;
    for (let i = 0; i < yn; i++) {
      const p = Player.createPlayer({ seed: state.seed + ':youth:' + state.year + ':' + i, age: 17 + rng.int(0, 1), quality: 38 + f.fac.youth * 4 + rng.int(0, 6), nationality: (club.roster[0] || {}).nationality || 'ES', gender: S().genderOf(state.season.leagueId) });
      p.potential = Math.min(95, p.ovr + 12 + f.fac.youth * 3 + rng.int(0, 8));
      p.contract = Contracts.offerForPlayer(p, club, rng, Contracts.NA_ECONOMY_2026_27);
      p.youth = true;
      const worst = club.roster.reduce((w, x, j) => (!x.youth && x.age >= 30 && (w < 0 || x.ovr < club.roster[w].ovr)) ? j : w, -1);
      if (worst >= 0) club.roster.splice(worst, 1, p); else if (club.roster.length < 14) club.roster.push(p);
      youth.push({ name: p.name, ovr: p.ovr, potential: p.potential, pos: p.pos });
    }
    report.youth = youth;
    f.lastReport = report;
    f.season = { ticket: 0, tv: 0, sponsor: 0, prize: 0, wages: 0, upkeep: 0, works: 0 };
    f.objective = null;
    return report;
  }
  // «Crea tu club»: el club más modesto de la liga pasa a ser el tuyo, con nombre, siglas y colores propios.
  function found(state, cfg = {}) {
    const club = state.season.clubsById[state.clubId];
    const clean = (v, n) => String(v || '').replace(/[<>]/g, '').trim().slice(0, n);
    club.name = clean(cfg.name, 30) || club.name;
    club.custom = { abbr: (clean(cfg.abbr, 4) || club.name.slice(0, 3)).toUpperCase(), primary: /^#[0-9a-f]{6}$/i.test(cfg.primary || '') ? cfg.primary : '#ff7a1f', secondary: /^#[0-9a-f]{6}$/i.test(cfg.secondary || '') ? cfg.secondary : '#0b0d1c', founded: state.year };
    const f = ensure(state);
    f.fac = { arena: 1, training: 1, youth: 2, medical: 1 };
    f.cash = Math.round(budgetOf(state) * 0.35);
    f.fans = 40;
    state.founder = true;
    return club;
  }
  function view(state) {
    const f = ensure(state); if (!f) return null;
    const club = state.season.clubsById[state.clubId];
    return { cash: f.cash, ticket: f.ticket, prices: PRICES.map(p => p.id), fac: Object.assign({}, f.fac), fans: Math.round(f.fans), season: Object.assign({}, f.season), log: f.log.slice(-6),
      objective: f.objective, wages: wageBill(club), capacity: CAPACITY[f.fac.arena], costs: Object.fromEntries(FACILITIES.map(k => [k, f.fac[k] >= 5 ? null : upgradeCost(state, k)])), lastReport: f.lastReport || null, warnings: f.warnings, founder: !!state.founder, custom: club.custom || null };
  }
  CAA.Finance = { PRICES, FACILITIES, CAPACITY, ensure, weekTick, op, seasonEnd, found, view, objective };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Finance;
})(typeof globalThis !== 'undefined' ? globalThis : this);
