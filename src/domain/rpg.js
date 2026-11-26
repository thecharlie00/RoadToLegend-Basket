(function (root) {
  'use strict';
  // Talentos (RPG) del jugador y del entrenador: experiencia por lo que haces en la pista, niveles,
  // puntos y árboles de talentos que suben atributos de verdad en los partidos.
  //  · Jugador: 6 árboles; cada rango suma a tus atributos efectivos de partido (como el equipamiento).
  //  · Entrenador: 4 árboles; suben atributos de toda tu plantilla en partido, el desarrollo semanal,
  //    la moral o la confianza de la directiva.
  // Lo que piden los jugadores de estos juegos: efectos exactos a la vista, nada de regresión, nada que
  // comprar, reasignar gratis una vez por temporada y una construcción con decisiones (no se puede todo).
  const CAA = root.CAA = root.CAA || {};
  const LEVEL_MAX = 40, SIG_LEVEL = 15, SIG_MAX = 2, CAP_PLAYER = 10, CAP_TEAM = 6;
  const P = (id, tier, max, per, extra) => Object.assign({ id, tier, max, per }, extra || {});
  const TREES = {
    player: [
      { id: 'shooting', perks: [P('deep', 1, 3, { tiroTriple: 1 }), P('midrange', 1, 3, { tiroMedia: 1 }), P('stroke', 2, 2, { tiroLibre: 2 }), P('sniper', 3, 1, { tiroTriple: 3, clutch: 2 }, { sig: true })] },
      { id: 'finishing', perks: [P('rim', 1, 3, { tiroCerca: 1, bandeja: 1 }), P('post', 1, 3, { poste: 1 }), P('power', 2, 2, { mate: 2, fuerza: 1 }), P('poster', 3, 1, { mate: 3, tiroCerca: 2, salto: 1 }, { sig: true })] },
      { id: 'playmaking', perks: [P('handle', 1, 3, { manejo: 1 }), P('passer', 1, 3, { pase: 1 }), P('vision', 2, 2, { vision: 2, lectura: 1 }), P('general', 3, 1, { pase: 2, vision: 2, liderazgo: 2 }, { sig: true })] },
      { id: 'defense', perks: [P('perimeter', 1, 3, { defExterior: 1 }), P('anchor', 1, 3, { defInterior: 1 }), P('hands', 2, 2, { robo: 2 }), P('lockdown', 3, 1, { defExterior: 2, defInterior: 2, tapon: 2 }, { sig: true })] },
      { id: 'athletic', perks: [P('burst', 1, 3, { velocidad: 1, aceleracion: 1 }), P('hops', 1, 3, { salto: 1 }), P('motor', 2, 2, { resistencia: 2, durabilidad: 1 }), P('freak', 3, 1, { velocidad: 2, salto: 2, fuerza: 2 }, { sig: true })] },
      { id: 'mind', perks: [P('ice', 1, 3, { clutch: 1 }), P('iq', 1, 3, { lectura: 1 }), P('boards', 2, 2, { rebOf: 1, rebDef: 2 }), P('captain', 3, 1, { liderazgo: 3, clutch: 2 }, { sig: true })] }
    ],
    coach: [
      { id: 'tactics', perks: [P('spacing', 1, 3, { tiroTriple: 1 }), P('paint', 1, 3, { tiroCerca: 1, poste: 1 }), P('press', 2, 2, { robo: 1, defExterior: 1 }), P('system', 3, 1, { lectura: 2, pase: 1, vision: 1 }, { sig: true })] },
      { id: 'defense', perks: [P('walls', 1, 3, { defInterior: 1 }), P('switch', 1, 3, { defExterior: 1 }), P('glass', 2, 2, { rebDef: 1, rebOf: 1 }), P('fortress', 3, 1, { defInterior: 2, tapon: 2, defExterior: 1 }, { sig: true })] },
      { id: 'development', perks: [P('youth', 1, 3, {}, { dev: 0.15 }), P('skills', 1, 3, {}, { devAll: 0.08 }), P('recovery', 2, 2, {}, { recover: 3 }), P('academy', 3, 1, {}, { dev: 0.3, devAll: 0.1, sig: true })] },
      { id: 'leadership', perks: [P('motivator', 1, 3, {}, { morale: 1 }), P('board', 1, 3, {}, { trust: 0.5 }), P('clutch', 2, 2, { clutch: 2 }), P('culture', 3, 1, { liderazgo: 2, resistencia: 2 }, { moraleFloor: 55, sig: true })] }
    ]
  };
  const role = state => state.player ? 'player' : 'coach';
  const xpFor = lvl => 50 + 12 * lvl; // XP para pasar del nivel lvl al siguiente
  function ensure(state) {
    let r = state.rpg;
    const want = role(state);
    if (!r || r.v !== 1 || r.role !== want) r = state.rpg = { v: 1, role: want, level: 1, xp: 0, total: 0, points: want === 'player' ? 1 : 1, ranks: {}, respecYear: null, log: [] };
    return r;
  }
  const treesOf = state => TREES[role(state)];
  const perkOf = (state, id) => { for (const tr of treesOf(state)) for (const p of tr.perks) if (p.id === id) return Object.assign({ tree: tr.id }, p); return null; };
  const spentIn = (r, tree) => tree.perks.reduce((a, p) => a + (r.ranks[p.id] || 0), 0);
  const sigCount = (state, r) => treesOf(state).reduce((a, tr) => a + tr.perks.filter(p => p.sig && r.ranks[p.id]).length, 0);
  // Requisitos de cada rango: nivel 2 del árbol con 3 puntos dentro; firma con 6 puntos, nivel 15 y máximo 2 firmas.
  function canBuy(state, id) {
    const r = ensure(state), p = perkOf(state, id); if (!p) return { ok: false, why: 'unknown' };
    const tree = treesOf(state).find(t => t.id === p.tree), cur = r.ranks[id] || 0;
    if (cur >= p.max) return { ok: false, why: 'max' };
    const need = p.tier === 2 ? 3 : p.tier === 3 ? 6 : 0;
    if (spentIn(r, tree) < need) return { ok: false, why: 'tree', need };
    if (p.sig && r.level < SIG_LEVEL) return { ok: false, why: 'level', need: SIG_LEVEL };
    if (p.sig && sigCount(state, r) >= SIG_MAX) return { ok: false, why: 'sigs', need: SIG_MAX };
    if (r.points < 1) return { ok: false, why: 'points' };
    return { ok: true };
  }
  function buy(state, id) {
    const c = canBuy(state, id); if (!c.ok) throw new Error('cannot buy talent: ' + c.why);
    const r = ensure(state); r.ranks[id] = (r.ranks[id] || 0) + 1; r.points--;
    refresh(state);
    return r.ranks[id];
  }
  // Reasignar: gratis una vez por temporada; recuperas todos los puntos.
  function respec(state) {
    const r = ensure(state);
    if (r.respecYear === state.year) throw new Error('respec already used this season');
    const back = Object.values(r.ranks).reduce((a, v) => a + v, 0);
    r.ranks = {}; r.points += back; r.respecYear = state.year;
    refresh(state);
    return back;
  }
  // Experiencia: sube de nivel con lo que pasa en la pista. Nunca baja.
  function gain(state, amount, why) {
    const r = ensure(state); amount = Math.max(0, Math.round(amount)); if (!amount) return 0;
    r.xp += amount; r.total += amount; let ups = 0;
    while (r.level < LEVEL_MAX && r.xp >= xpFor(r.level)) { r.xp -= xpFor(r.level); r.level++; r.points++; ups++; }
    if (r.level >= LEVEL_MAX) r.xp = Math.min(r.xp, xpFor(LEVEL_MAX));
    if (ups) { r.log.push({ y: state.year, w: state.week, level: r.level, why: why || 'games' }); if (r.log.length > 30) r.log.shift(); if (Array.isArray(state.inbox)) state.inbox.push({ type: 'levelUp', week: state.week, detail: { value: r.level } }); }
    return ups;
  }
  // XP de un partido (a partir de la línea del libro de estadísticas).
  function gameXp(state, entry) {
    if (!entry) return 0;
    if (state.player) {
      if (entry.dnp) return gain(state, 4, 'game');
      return gain(state, 10 + (entry.pts || 0) * 0.5 + (entry.reb || 0) * 0.5 + (entry.ast || 0) * 0.7 + ((entry.stl || 0) + (entry.blk || 0)) * 1 + (entry.won ? 8 : 0) + (entry.po ? 6 : 0), 'game');
    }
    const margin = entry.score ? entry.score[0] - entry.score[1] : 0;
    return gain(state, 12 + (entry.won ? 15 + Math.min(10, Math.max(0, margin) / 2) : 0) + (entry.po ? 8 : 0), 'game');
  }
  function sumAttrs(state, r) {
    const out = {};
    for (const tr of treesOf(state)) for (const p of tr.perks) { const n = r.ranks[p.id] || 0; if (n) for (const [k, v] of Object.entries(p.per)) out[k] = (out[k] || 0) + v * n; }
    const cap = role(state) === 'player' ? CAP_PLAYER : CAP_TEAM;
    for (const k of Object.keys(out)) out[k] = Math.min(cap, out[k]);
    return out;
  }
  function effects(state) {
    const r = ensure(state), fx = { dev: 0, devAll: 0, recover: 0, morale: 0, trust: 0, moraleFloor: 0 };
    for (const tr of treesOf(state)) for (const p of tr.perks) { const n = r.ranks[p.id] || 0; if (!n) continue;
      for (const k of ['dev', 'devAll', 'recover', 'morale', 'trust']) if (p[k]) fx[k] += p[k] * n;
      if (p.moraleFloor) fx.moraleFloor = Math.max(fx.moraleFloor, p.moraleFloor); }
    return fx;
  }
  // Aplica los talentos: el jugador lleva sus atributos extra; el club del entrenador, los suyos.
  function refresh(state) {
    const r = ensure(state), attrs = sumAttrs(state, r);
    if (state.player) state.player.rpgAttrs = attrs;
    for (const ss of [state.season, state.topSeason]) if (ss) for (const c of ss.clubs) if (c.coachAttrs) delete c.coachAttrs;
    if (state.coach && state.season && state.season.clubsById) { const c = state.season.clubsById[state.clubId]; if (c && Object.keys(attrs).length) c.coachAttrs = attrs; }
    return attrs;
  }
  // Semana del entrenador: desarrollo extra, recuperación, moral y confianza.
  function coachWeek(state, rng, Player) {
    if (!state.coach || !state.season || !state.season.clubsById) return;
    const fx = effects(state), club = state.season.clubsById[state.clubId]; if (!club) return;
    for (const p of club.roster) {
      if (fx.recover) p.load = Math.max(0, (p.load || 0) - fx.recover);
      if (fx.morale) p.morale = Math.min(100, (p.morale == null ? 70 : p.morale) + fx.morale);
      if (fx.moraleFloor) p.morale = Math.max(fx.moraleFloor, p.morale == null ? 70 : p.morale);
      const scale = (p.age <= 24 ? fx.dev : 0) + fx.devAll;
      if (scale > 0 && !p.injury && Player) Player.develop(p, { focus: null, scale: scale * 2 }, rng);
    }
    if (fx.trust) state.coach.trust = Math.min(100, state.coach.trust + fx.trust);
  }
  function view(state) {
    const r = ensure(state), attrs = sumAttrs(state, r);
    const trees = treesOf(state).map(tr => ({ id: tr.id, spent: spentIn(r, tr), perks: tr.perks.map(p => ({ id: p.id, tier: p.tier, max: p.max, rank: r.ranks[p.id] || 0, sig: !!p.sig, per: p.per,
      extra: ['dev', 'devAll', 'recover', 'morale', 'trust', 'moraleFloor'].filter(k => p[k]).reduce((o, k) => (o[k] = p[k], o), {}), can: canBuy(state, p.id) })) }));
    return { role: r.role, level: r.level, levelMax: LEVEL_MAX, xp: r.xp, next: xpFor(r.level), total: r.total, points: r.points, trees, attrs, effects: effects(state),
      respec: r.respecYear !== state.year, sigs: sigCount(state, r), sigMax: SIG_MAX, sigLevel: SIG_LEVEL, cap: r.role === 'player' ? CAP_PLAYER : CAP_TEAM, log: r.log.slice(-5).reverse() };
  }
  function op(state, config = {}) {
    if (config.op === 'buy') return buy(state, config.id);
    if (config.op === 'respec') return respec(state);
    throw new Error('unknown talent op');
  }
  CAA.Rpg = { TREES, LEVEL_MAX, SIG_LEVEL, SIG_MAX, CAP_PLAYER, CAP_TEAM, xpFor, ensure, canBuy, buy, respec, gain, gameXp, refresh, effects, coachWeek, view, op, sumAttrs };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Rpg;
})(typeof globalThis !== 'undefined' ? globalThis : this);
