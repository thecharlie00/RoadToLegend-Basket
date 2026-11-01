(function (root) {
  'use strict';
  // Mercado y cuerpo técnico del entrenador (adaptación de market26 y mgr-plus del fútbol).
  //  - Cada semana hay una lista de jugadores disponibles (libres o con traspaso) acorde al nivel de tu liga.
  //  - Fichar cuesta caja (traspaso) y sueldo; cortar a un jugador cuesta una indemnización.
  //  - El mercado cierra a mitad de temporada y reabre en verano (semana 0).
  //  - Cuerpo técnico: asistente (táctica y vestuario), fisioterapeuta (lesiones) y ojeador (mejores opciones en el mercado).
  const CAA = root.CAA = root.CAA || {};
  const req = (n, p) => CAA[n] || (typeof require === 'function' ? require(p) : null);
  const RNG = req('RNG', '../core/rng.js'), Player = req('Player', './player.js'), Contracts = req('Contracts', './contracts.js');
  const ROLES = ['assistant', 'physio', 'scout'];
  const STAFF_WAGE = [0, 60000, 140000, 260000]; // por temporada según nivel
  const S = () => CAA.Season;
  function open(state) { const s = state.season; return !s.playoffs && s.round <= Math.floor(s.schedule.length * 0.6); }
  function ensure(state) {
    if (state.mode !== 'coach') return null;
    if (!state.mkt) state.mkt = { staff: { assistant: 1, physio: 0, scout: 0 }, signed: 0, released: 0 };
    return state.mkt;
  }
  function clubAvg(club) { const r = club.roster.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 8); return r.reduce((a, p) => a + p.ovr, 0) / Math.max(1, r.length); }
  // Lista de la semana (determinista): más y mejores opciones con mejor ojeador.
  function list(state) {
    const m = ensure(state); if (!m) return [];
    const club = state.season.clubsById[state.clubId], base = clubAvg(club), L = S().LEAGUES[state.season.leagueId];
    const rng = RNG.create(state.seed + ':market:' + state.year + ':' + state.week);
    const n = 5 + m.staff.scout * 2, out = [];
    for (let i = 0; i < n; i++) {
      const free = rng.float() < 0.45;
      const q = Math.round(base - 8 + rng.int(0, 14) + m.staff.scout * 2 - (free ? 4 : 0));
      const p = Player.createPlayer({ seed: state.seed + ':mk:' + state.year + ':' + state.week + ':' + i, quality: Math.max(35, Math.min(88, q)), age: 19 + rng.int(0, 14), pos: rng.pick(['PG', 'SG', 'SF', 'PF', 'C']), nationality: rng.pick((L.pool || ['ES', 'US']).concat(['US'])), gender: S().genderOf(state.season.leagueId) });
      p.contract = Contracts.offerForPlayer(p, club, rng, Contracts.NA_ECONOMY_2026_27);
      const fee = free ? 0 : Math.round(p.contract.salary * (0.4 + Math.max(0, p.ovr - base) * 0.06) * (p.age < 24 ? 1.4 : 1));
      out.push({ id: p.id, player: p, fee, free });
    }
    return out;
  }
  function staffWeekly(m, weeks) { return ROLES.reduce((a, r) => a + STAFF_WAGE[m.staff[r]], 0) / Math.max(1, weeks); }
  function op(state, cfg = {}) {
    const m = ensure(state); if (!m) throw new Error('market needs a coach career');
    const club = state.season.clubsById[state.clubId], fin = state.clubFin;
    if (cfg.op === 'sign') {
      if (!open(state)) throw new Error('market closed');
      if (club.roster.length >= 15) throw new Error('roster full');
      const it = list(state).find(x => x.id === cfg.id); if (!it) throw new Error('not available');
      if (club.roster.some(p => p.id === it.id)) throw new Error('already signed');
      if (fin.cash < it.fee) throw new Error('not enough cash');
      fin.cash -= it.fee; club.roster.push(it.player); m.signed++;
      state.inbox.push({ type: 'signed', week: state.week, detail: { club: it.player.name, fee: it.fee } });
      if (state.life) state.life.counters.signings = (state.life.counters.signings || 0) + 1;
      return it.player;
    }
    if (cfg.op === 'release') {
      if (club.roster.length <= 10) throw new Error('roster too short');
      const i = club.roster.findIndex(p => p.id === cfg.id); if (i < 0) throw new Error('not in roster');
      const p = club.roster[i], cost = Math.round((p.contract ? p.contract.salary : 0) * 0.3);
      fin.cash -= cost; club.roster.splice(i, 1); m.released++;
      if (Array.isArray(club.starters)) club.starters = club.starters.filter(id => id !== p.id);
      state.inbox.push({ type: 'released', week: state.week, detail: { club: p.name, fee: cost } });
      return { cost };
    }
    if (cfg.op === 'staff') {
      if (!ROLES.includes(cfg.role)) throw new Error('bad role');
      const lvl = Number(cfg.level); if (!(lvl >= 0 && lvl <= 3)) throw new Error('bad level');
      const signOn = lvl > m.staff[cfg.role] ? Math.round(STAFF_WAGE[lvl] * 0.25) : 0;
      if (fin.cash < signOn) throw new Error('not enough cash');
      fin.cash -= signOn; m.staff[cfg.role] = lvl;
      return m.staff;
    }
    throw new Error('unknown op');
  }
  // Semana: sueldos del cuerpo técnico y sus efectos.
  function weekTick(state, rng) {
    const m = ensure(state); if (!m) return;
    const club = state.season.clubsById[state.clubId], fin = state.clubFin, W = state.season.schedule.length;
    if (fin) { const w = Math.round(staffWeekly(m, W)); fin.cash -= w; fin.season.wages += w; }
    if (m.staff.physio) for (const p of club.roster) if (p.injury && rng.float() < 0.12 * m.staff.physio) { p.injury.weeksRemaining = Math.max(0, p.injury.weeksRemaining - 1); if (!p.injury.weeksRemaining) p.injury = null; }
    if (m.staff.assistant >= 2 && state.coach) state.coach.morale = Math.min(100, state.coach.morale + 0.3 * (m.staff.assistant - 1));
    for (const p of club.roster) if (m.staff.assistant >= 2 && p.age <= 24 && rng.float() < 0.1 * m.staff.assistant) Player.develop(p, { focus: null, scale: 0.1 }, rng);
  }
  function view(state) {
    const m = ensure(state); if (!m) return null;
    const club = state.season.clubsById[state.clubId];
    return { open: open(state), staff: Object.assign({}, m.staff), wages: STAFF_WAGE, roster: club.roster.map(p => ({ id: p.id, name: p.name, pos: p.pos, ovr: p.ovr, age: p.age, salary: p.contract ? p.contract.salary : 0 })),
      list: list(state).map(x => ({ id: x.id, name: x.player.name, pos: x.player.pos, ovr: x.player.ovr, age: x.player.age, nat: x.player.nationality, salary: x.player.contract.salary, fee: x.fee, free: x.free })) };
  }
  CAA.Market = { ROLES, STAFF_WAGE, ensure, list, op, weekTick, view, open };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Market;
})(typeof globalThis !== 'undefined' ? globalThis : this);
