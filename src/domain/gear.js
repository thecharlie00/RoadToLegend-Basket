(function (root) {
  'use strict';
  // Equipamiento con estadísticas y tiers (adaptación de gx-items del fútbol) y aspecto del personaje (look56).
  // Todo se paga con el dinero ganado en el juego: sin dinero real ni azar de pago. Las piezas suman a los
  // atributos efectivos del partido con un tope global (rendimientos decrecientes); no cambian la media mostrada.
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);

  const TIERS = [
    { k: 0, id: 'common', c: '#9aa7aa', m: 1 }, { k: 1, id: 'bronze', c: '#c88a52', m: 1.3 }, { k: 2, id: 'silver', c: '#cfd8dc', m: 1.65 },
    { k: 3, id: 'gold', c: '#f6c83a', m: 2 }, { k: 4, id: 'elite', c: '#b07cff', m: 2.45 }, { k: 5, id: 'legend', c: '#ff6b3d', m: 3 }
  ];
  const UPGRADE = [0, 1, 1.6, 2.6, 4, 6]; // coste de subir a ese tier, en múltiplos del precio
  const CAP = { att: 5, total: 12 };
  const CAP_TEAM = { att: 3, total: 6 };
  // Rodaje: partidos jugados con la pieza puesta para cada nivel (+1 a su estadística principal por nivel).
  const WEAR = [8, 20, 40];
  // Rasgo (afijo) desde Plata: un atributo extra cuyo valor crece con el tier.
  const AFFIX_FROM = 2, AFFIX_VAL = [0, 0, 1, 2, 2, 3];
  const AFFIX_POOL = { p: ['tiroCerca', 'tiroMedia', 'tiroTriple', 'tiroLibre', 'bandeja', 'mate', 'poste', 'manejo', 'pase', 'vision', 'defExterior', 'defInterior', 'robo', 'tapon', 'rebOf', 'rebDef', 'velocidad', 'aceleracion', 'salto', 'resistencia', 'lectura', 'clutch'],
    c: ['tiroTriple', 'tiroCerca', 'pase', 'vision', 'lectura', 'defExterior', 'defInterior', 'rebDef', 'robo', 'clutch', 'resistencia'] };
  const SLOTS = {
    p: ['shoes', 'sleeve', 'band', 'knee', 'socks', 'wrist', 'goggles', 'hoodie', 'phones', 'chain', 'watch', 'towel'],
    c: ['suit', 'cshoes', 'tie', 'glasses', 'clipboard', 'cwatch', 'coat', 'scarf']
  };
  // [id, ranura, es, en, estadísticas en Común, conjunto, precio, requisito, color]
  const RAW = [
    ['shoes-rookie', 'shoes', 'Zapatillas de barrio', 'Street sneakers', { velocidad: 1 }, null, 0, null, '#f1f1ee'],
    ['shoes-jet', 'shoes', 'Cohete', 'Jet', { velocidad: 2, aceleracion: 1 }, null, 6000, null, '#1f7cff'],
    ['shoes-spring', 'shoes', 'Muelle', 'Spring', { salto: 2, mate: 1 }, 'air', 9000, { ovr: 60 }, '#ff4fb1'],
    ['shoes-splash', 'shoes', 'Lluvia de triples', 'Splash', { tiroTriple: 1, velocidad: 1 }, 'splash', 9000, null, '#3be3ff'],
    ['shoes-gold', 'shoes', 'Doradas', 'Golden', { velocidad: 2, salto: 1, clutch: 1 }, null, 30000, { titles: 1 }, '#f6c83a'],
    ['sleeve-plain', 'sleeve', 'Manga blanca', 'White sleeve', { tiroMedia: 1 }, null, 2500, null, '#f1f1ee'],
    ['sleeve-splash', 'sleeve', 'Manga de tirador', 'Shooter sleeve', { tiroTriple: 2 }, 'splash', 8000, null, '#3be3ff'],
    ['sleeve-wall', 'sleeve', 'Manga de acero', 'Steel sleeve', { defExterior: 2 }, 'wall', 8000, null, '#5d6b73'],
    ['band-classic', 'band', 'Cinta clásica', 'Classic headband', { tiroLibre: 1 }, null, 1500, null, '#e3262f'],
    ['band-splash', 'band', 'Cinta de francotirador', 'Sniper headband', { tiroTriple: 1, tiroLibre: 1 }, 'splash', 7000, null, '#3be3ff'],
    ['band-air', 'band', 'Cinta de vuelo', 'Flight headband', { mate: 2 }, 'air', 7000, { ovr: 60 }, '#ff4fb1'],
    ['band-ice', 'band', 'Cinta de hielo', 'Ice headband', { clutch: 2 }, null, 15000, { fame: 30 }, '#bfe9ff'],
    ['knee-basic', 'knee', 'Rodilleras', 'Knee pads', { durabilidad: 1 }, null, 2000, null, '#16191b'],
    ['knee-wall', 'knee', 'Rodilleras del muro', 'Wall knee pads', { defInterior: 2, rebDef: 1 }, 'wall', 9000, null, '#5d6b73'],
    ['socks-crew', 'socks', 'Calcetines altos', 'Crew socks', { resistencia: 1 }, null, 800, null, '#f1f1ee'],
    ['socks-air', 'socks', 'Calcetines de rebote', 'Bounce socks', { salto: 1, aceleracion: 1 }, 'air', 5000, null, '#ff4fb1'],
    ['socks-wall', 'socks', 'Calcetines de presión', 'Pressure socks', { defExterior: 1, robo: 1 }, 'wall', 5000, null, '#5d6b73'],
    ['wrist-basic', 'wrist', 'Muñequeras', 'Wristbands', { manejo: 1 }, null, 1200, null, '#ff7a1f'],
    ['wrist-maestro', 'wrist', 'Muñequeras de director', 'Maestro wristbands', { pase: 2, vision: 1 }, 'maestro', 9000, null, '#8b5cf6'],
    ['goggles-clear', 'goggles', 'Gafas deportivas', 'Sports goggles', { lectura: 1 }, null, 4000, null, '#cfe8ff'],
    ['goggles-wall', 'goggles', 'Gafas del muro', 'Wall goggles', { tapon: 2 }, 'wall', 11000, { ovr: 62 }, '#5d6b73'],
    ['goggles-maestro', 'goggles', 'Gafas de visión', 'Vision goggles', { vision: 2, lectura: 1 }, 'maestro', 11000, null, '#8b5cf6'],
    ['hoodie-warm', 'hoodie', 'Sudadera de calentamiento', 'Warm-up hoodie', { resistencia: 2 }, null, 3500, null, '#26304a'],
    ['hoodie-maestro', 'hoodie', 'Sudadera del director', 'Maestro hoodie', { manejo: 1, pase: 1 }, 'maestro', 8000, null, '#8b5cf6'],
    ['phones-focus', 'phones', 'Cascos de concentración', 'Focus headphones', { clutch: 1, tiroLibre: 1 }, null, 6000, null, '#16191b'],
    ['phones-show', 'phones', 'Cascos de espectáculo', 'Showtime headphones', { liderazgo: 1 }, 'show', 9000, { fame: 20 }, '#ff7a1f', { fame: 1 }],
    ['chain-silver', 'chain', 'Colgante de plata', 'Silver chain', {}, 'show', 7000, null, '#cfd8dc', { fame: 1 }],
    ['chain-ring', 'chain', 'Colgante con anillo', 'Ring chain', { liderazgo: 2 }, null, 40000, { titles: 1 }, '#f6c83a', { fame: 1 }],
    ['watch-sport', 'watch', 'Reloj deportivo', 'Sports watch', { resistencia: 1 }, null, 3000, null, '#16191b'],
    ['watch-show', 'watch', 'Reloj de lujo', 'Luxury watch', {}, 'show', 25000, { fame: 40 }, '#f6c83a', { fame: 2 }],
    ['towel-lucky', 'towel', 'Toalla de la suerte', 'Lucky towel', { clutch: 1 }, null, 500, null, '#ffffff', { morale: 1 }],
    ['shoes-lock', 'shoes', 'Candado', 'Lockdown', { defExterior: 2, robo: 1 }, 'wall', 9000, null, '#2b2f36'],
    ['shoes-maestro', 'shoes', 'Batuta', 'Baton', { manejo: 2, pase: 1 }, 'maestro', 9000, null, '#8b5cf6'],
    ['shoes-post', 'shoes', 'Bota de pívot', 'Big-man boot', { poste: 2, fuerza: 1 }, null, 8000, null, '#7a3b1f'],
    ['shoes-retro', 'shoes', 'Clásicas de lona', 'Canvas classics', { lectura: 1, clutch: 1 }, 'show', 12000, { fame: 25 }, '#e3262f', { fame: 1 }],
    ['sleeve-maestro', 'sleeve', 'Manga del director', 'Maestro sleeve', { pase: 1, manejo: 1 }, 'maestro', 8000, null, '#8b5cf6'],
    ['knee-air', 'knee', 'Rodilleras de vuelo', 'Flight knee pads', { salto: 1, mate: 1 }, 'air', 9000, null, '#ff4fb1'],
    ['wrist-splash', 'wrist', 'Muñequeras de tirador', 'Shooter wristbands', { tiroMedia: 1, tiroTriple: 1 }, 'splash', 7000, null, '#3be3ff'],
    // Entrenador
    ['suit-grey', 'suit', 'Traje gris', 'Grey suit', {}, null, 0, null, '#5d6b73', { trust: 1 }],
    ['suit-navy', 'suit', 'Traje marino', 'Navy suit', {}, 'sideline', 12000, null, '#1b2a4a', { trust: 1, morale: 1 }],
    ['cshoes-oxford', 'cshoes', 'Zapatos Oxford', 'Oxford shoes', {}, 'sideline', 6000, null, '#3b2416', { trust: 1 }],
    ['tie-red', 'tie', 'Corbata roja', 'Red tie', {}, null, 2000, null, '#e3262f', { morale: 1 }],
    ['tie-lucky', 'tie', 'Corbata de la suerte', 'Lucky tie', {}, 'sideline', 6000, null, '#ff7a1f', { locker: 1 }],
    ['glasses-reader', 'glasses', 'Gafas de lectura', 'Reading glasses', {}, null, 3000, null, '#16191b', { scout: 1 }],
    ['clipboard-pro', 'clipboard', 'Pizarra magnética', 'Magnetic clipboard', {}, null, 4000, null, '#f1f1ee', { scout: 1 }],
    ['cwatch-classic', 'cwatch', 'Reloj clásico', 'Classic watch', {}, null, 8000, null, '#f6c83a', { trust: 1 }],
    ['coat-long', 'coat', 'Abrigo largo', 'Long coat', {}, null, 9000, { seasons: 1 }, '#26304a', { locker: 1 }],
    ['scarf-club', 'scarf', 'Bufanda del club', 'Club scarf', {}, null, 1500, null, '#ff7a1f', { morale: 1 }],
    // Entrenador con efecto en toda la plantilla (atributos de equipo en partido).
    ['clipboard-tactic', 'clipboard', 'Pizarra táctica', 'Tactics board', { lectura: 1, pase: 1 }, 'sideline', 10000, null, '#16191b', { scout: 1 }],
    ['glasses-shooter', 'glasses', 'Gafas de analista', 'Analyst glasses', { tiroTriple: 1 }, null, 9000, null, '#3be3ff'],
    ['suit-black', 'suit', 'Traje negro', 'Black suit', { defExterior: 1, defInterior: 1 }, 'sideline', 18000, { seasons: 1 }, '#111318', { trust: 1 }],
    ['cwatch-clutch', 'cwatch', 'Cronómetro', 'Stopwatch', { clutch: 2 }, null, 12000, null, '#cfd8dc'],
    ['tie-defense', 'tie', 'Corbata de hierro', 'Iron tie', { rebDef: 1 }, null, 5000, null, '#5d6b73', { locker: 1 }]
  ];
  const ITEMS = RAW.map(r => ({ id: r[0], slot: r[1], who: SLOTS.c.includes(r[1]) ? 'c' : 'p', name: { es: r[2], en: r[3] }, stats: r[4], set: r[5], price: r[6], req: r[7], color: r[8], extra: r[9] || null }));
  const BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  const SETS = {
    splash: { need: 3, stats: { tiroTriple: 2 } }, air: { need: 3, stats: { mate: 2, salto: 1 } }, wall: { need: 3, stats: { defInterior: 1, defExterior: 1, tapon: 1 } },
    maestro: { need: 3, stats: { pase: 1, vision: 1, lectura: 1 } }, show: { need: 3, extra: { fame: 2 } }, sideline: { need: 3, extra: { trust: 1, locker: 1 } }
  };

  // Aspecto (look56): piel, peinado, color de pelo, barba y celebración.
  const LOOK = {
    skin: ['#f3d2b8', '#e0ac85', '#c68b5e', '#9b6640', '#6e4426', '#4a2c18'],
    hair: ['short', 'buzz', 'afro', 'braids', 'long', 'bun', 'ponytail', 'bald', 'mohawk', 'curly', 'dreads', 'cornrows', 'topknot', 'fade'],
    hairColor: ['#1d1612', '#4a2f1d', '#8a5a2e', '#d9b36c', '#b8402a', '#e8e4dc', '#3be3ff', '#ff4fb1'],
    beard: ['none', 'stubble', 'full', 'goatee', 'mustache'],
    celebration: ['point', 'shimmy', 'flex', 'silence', 'archer', 'crown', 'goggles', 'heart', 'salute']
  };

  function ensure(state) {
    const life = state.life || (state.life = {});
    if (!life.gear || typeof life.gear !== 'object') life.gear = { owned: {}, equipped: {} };
    const g = life.gear;
    if (!g.owned) g.owned = {}; if (!g.equipped) g.equipped = {};
    for (const k of ['affix', 'wear']) if (!g[k] || typeof g[k] !== 'object') g[k] = {};
    if (!Array.isArray(g.boxes)) g.boxes = [];
    if (!Array.isArray(g.loadouts)) g.loadouts = [null, null, null];
    if (typeof g.mat !== 'number') g.mat = 0;
    if (typeof g.dry !== 'number') g.dry = 0; // cajas seguidas sin Plata o más (protección contra la mala suerte)
    if (typeof g.since !== 'number') g.since = 0; // partidos desde la última caja
    // Piezas de inicio gratuitas.
    for (const i of ITEMS) if (i.price === 0 && g.owned[i.id] == null) { g.owned[i.id] = 0; if (!g.equipped[i.slot] && i.who === who(state)) g.equipped[i.slot] = i.id; }
    if (!life.look) {
      const women = state.player && state.player.gender === 'women';
      life.look = { skin: 1, hair: women ? 'ponytail' : 'short', hairColor: 0, beard: 'none', celebration: 'point' };
    }
    return g;
  }
  function who(state) { return state.mode === 'coach' ? 'c' : 'p'; }
  function reqOk(state, req) {
    if (!req) return true;
    const p = state.player, c = (state.life && state.life.counters) || {};
    if (req.ovr && !(p && p.ovr >= req.ovr)) return false;
    if (req.fame && !((state.life.fame || 0) >= req.fame)) return false;
    if (req.titles && !((c.titles || 0) >= req.titles)) return false;
    if (req.seasons && !((state.history || []).length >= req.seasons)) return false;
    return true;
  }
  // Escaparate semanal: tres destacados y dos ofertas (-30 %), deterministas por semana.
  function stock(state) {
    const w = who(state), pool = ITEMS.filter(i => i.who === w && i.price > 0);
    const rng = RNG.create(state.seed + ':shop:' + state.year + ':' + state.week);
    const sh = rng.shuffle(pool.map(i => i.id));
    return { featured: sh.slice(0, 3), offers: sh.slice(3, 5) };
  }
  function priceOf(state, item) {
    const st = stock(state);
    return st.offers.includes(item.id) ? Math.round(item.price * 0.7) : item.price;
  }
  const REFORGE_MAT = 4;
  const matCost = toTier => toTier * 3;
  function upgradeCost(item, toTier) { return Math.round(Math.max(1500, item.price) * UPGRADE[toTier]); }
  function scaled(stats, tier) { const out = {}; for (const [k, v] of Object.entries(stats || {})) out[k] = Math.round(v * TIERS[tier].m); return out; }
  // Atributos efectivos que aporta lo equipado, con tope por atributo y total.
  function effective(state) {
    const g = ensure(state), sum = {}, extra = {}, sets = {};
    for (const id of Object.values(g.equipped)) {
      const it = BY_ID[id]; if (!it) continue;
      const tier = g.owned[id] || 0;
      for (const [k, v] of Object.entries(pieceStats(g, it, tier))) sum[k] = (sum[k] || 0) + v;
      for (const [k, v] of Object.entries(it.extra || {})) extra[k] = (extra[k] || 0) + v;
      if (it.set) sets[it.set] = (sets[it.set] || 0) + 1;
    }
    const active = [];
    for (const [k, n] of Object.entries(sets)) if (SETS[k] && n >= SETS[k].need) {
      active.push(k);
      for (const [a, v] of Object.entries(SETS[k].stats || {})) sum[a] = (sum[a] || 0) + v;
      for (const [a, v] of Object.entries(SETS[k].extra || {})) extra[a] = (extra[a] || 0) + v;
    }
    const cap = state.player ? CAP : CAP_TEAM;
    let total = 0; const attrs = {};
    for (const k of Object.keys(sum).sort()) { const v = Math.min(cap.att, sum[k]); const take = Math.max(0, Math.min(v, cap.total - total)); if (take) { attrs[k] = take; total += take; } }
    return { attrs, extra, sets: active, total, raw: sum };
  }
  // Estadísticas de una pieza: base por tier + rodaje (estadística principal) + rasgo.
  function wearLevel(g, id) { const n = g.wear[id] || 0; return WEAR.filter(x => n >= x).length; }
  function pieceStats(g, it, tier) {
    const out = scaled(it.stats, tier), main = Object.keys(it.stats)[0], wl = wearLevel(g, it.id);
    if (main && wl) out[main] = (out[main] || 0) + wl;
    const a = g.affix[it.id]; if (a && tier >= AFFIX_FROM) out[a.k] = (out[a.k] || 0) + AFFIX_VAL[tier];
    return out;
  }
  // El jugador lleva sus atributos de equipamiento; el club del entrenador, los de equipo.
  function refresh(state) {
    const eff = effective(state);
    if (state.player) state.player.gearAttrs = eff.attrs;
    if (state.season && Array.isArray(state.season.clubs)) for (const c of state.season.clubs) if (c.gearTeam) delete c.gearTeam;
    if (state.coach && state.season && state.season.clubsById) { const c = state.season.clubsById[state.clubId]; if (c && Object.keys(eff.attrs).length) c.gearTeam = eff.attrs; }
  }
  // ---------- Botín del patrocinador: se gana jugando, se elige 1 de 3, sin pagos ----------
  const TIER_W = [40, 30, 18, 8, 3, 1];
  function rollTier(rng, g) {
    if (g.dry >= 4) return 2 + (rng.float() < 0.25 ? 1 : 0); // tras 4 cajas sin Plata, Plata u Oro seguro
    let r = rng.float() * TIER_W.reduce((a, b) => a + b, 0);
    for (let k = 0; k < TIER_W.length; k++) { r -= TIER_W[k]; if (r < 0) return k; }
    return 0;
  }
  function rollAffix(rng, w, it) { const pool = AFFIX_POOL[w].filter(k => !(k in it.stats)); return pool[rng.int(0, pool.length - 1)]; }
  // Una caja ofrece 3 piezas distintas, con preferencia por ranuras vacías o de tier bajo.
  function makeBox(state, reason) {
    const g = ensure(state), w = who(state);
    const rng = RNG.create(state.seed + ':box:' + state.year + ':' + state.week + ':' + (g.made || 0));
    g.made = (g.made || 0) + 1;
    const slotNeed = sl => { const id = g.equipped[sl]; return id ? (g.owned[id] || 0) + 1 : 0; };
    const pool = ITEMS.filter(i => i.who === w && reqOk(state, i.req)).map(i => ({ i, score: slotNeed(i.slot) + rng.float() * 2.2 })).sort((a, b) => a.score - b.score);
    const picked = [], slots = new Set();
    for (const { i } of pool) { if (picked.length >= 3) break; if (slots.has(i.slot) && pool.length > 6) continue; picked.push(i); slots.add(i.slot); }
    const options = picked.map(it => { const tier = rollTier(rng, g); return { itemId: it.id, tier, affix: tier >= AFFIX_FROM ? rollAffix(rng, w, it) : null }; });
    g.dry = options.some(o => o.tier >= 2) ? 0 : g.dry + 1;
    const box = { id: 'box-' + state.year + '-' + state.week + '-' + g.made, reason, options };
    g.boxes.push(box);
    if (Array.isArray(state.inbox)) state.inbox.push({ type: 'gearBox', week: state.week, detail: { reason } });
    return box;
  }
  // Tras cada partido: rodaje de lo equipado y, si toca, una caja (gran partido, racha o constancia).
  function afterGame(state, entry) {
    if (!entry || !state.life) return null;
    const g = ensure(state);
    const played = state.player ? !entry.dnp : true;
    if (played) for (const id of Object.values(g.equipped)) if (BY_ID[id]) g.wear[id] = Math.min(999, (g.wear[id] || 0) + 1);
    g.since++;
    let reason = null;
    if (state.player && !entry.dnp) {
      const dd = [entry.pts >= 10, entry.reb >= 10, entry.ast >= 10, (entry.stl || 0) >= 10, (entry.blk || 0) >= 10].filter(Boolean).length;
      if (entry.pts >= 28) reason = 'big'; else if (dd >= 2) reason = 'double'; else if ((entry.stl || 0) + (entry.blk || 0) >= 6) reason = 'defense';
    } else if (state.coach && entry.won && entry.score && entry.score[0] - entry.score[1] >= 20) reason = 'rout';
    if (!reason && entry.po && entry.won) reason = 'playoffs';
    if (!reason && g.since >= 6) reason = 'steady';
    // Como mucho 3 cajas sin abrir: no se pierde ninguna, la siguiente espera a que abras una.
    if (!reason || g.boxes.length >= 3) { refresh(state); return null; }
    g.since = 0;
    const box = makeBox(state, reason);
    refresh(state);
    return box;
  }
  // Elegir una opción de la caja: pieza nueva, sube de tier o se convierte en material.
  function claim(state, g, boxId, idx) {
    const bi = g.boxes.findIndex(b => b.id === boxId); if (bi < 0) throw new Error('unknown box');
    const o = g.boxes[bi].options[idx]; if (!o) throw new Error('bad option');
    const it = BY_ID[o.itemId], cur = g.owned[it.id];
    let result;
    if (cur == null) { g.owned[it.id] = o.tier; if (o.affix) g.affix[it.id] = { k: o.affix }; if (!g.equipped[it.slot]) g.equipped[it.slot] = it.id; result = 'new'; }
    else if (o.tier > cur) { g.owned[it.id] = o.tier; if (o.affix && !g.affix[it.id]) g.affix[it.id] = { k: o.affix }; result = 'upgrade'; }
    else { const m = 2 + o.tier * 2; g.mat += m; result = 'material'; }
    g.boxes.splice(bi, 1);
    return { result, item: it.id, tier: g.owned[it.id], mat: g.mat };
  }
  // Reforjar: tres rasgos posibles para elegir (material), deterministas por intento.
  function reforgeOptions(state, g, it) {
    const rng = RNG.create(state.seed + ':reforge:' + it.id + ':' + ((g.reforged || 0)));
    const pool = AFFIX_POOL[who(state)].filter(k => !(k in it.stats) && !(g.affix[it.id] && g.affix[it.id].k === k));
    const out = []; while (out.length < 3 && pool.length) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    return out;
  }
  function op(state, cfg = {}) {
    const g = ensure(state), life = state.life;
    if (cfg.op === 'look') {
      const L = life.look;
      if (cfg.skin != null) { const v = Number(cfg.skin); if (!(v >= 0 && v < LOOK.skin.length)) throw new Error('bad skin'); L.skin = v; }
      if (cfg.hairColor != null) { const v = Number(cfg.hairColor); if (!(v >= 0 && v < LOOK.hairColor.length)) throw new Error('bad hair color'); L.hairColor = v; }
      for (const k of ['hair', 'beard', 'celebration']) if (cfg[k] != null) { if (!LOOK[k].includes(cfg[k])) throw new Error('bad ' + k); L[k] = cfg[k]; }
      return { look: L };
    }
    if (cfg.op === 'claim') { const r = claim(state, g, cfg.boxId, Number(cfg.index)); refresh(state); return r; }
    if (cfg.op === 'saveLoadout' || cfg.op === 'useLoadout') {
      const i = Number(cfg.index); if (!(i >= 0 && i < 3)) throw new Error('bad loadout');
      if (cfg.op === 'saveLoadout') g.loadouts[i] = Object.assign({}, g.equipped);
      else { const L = g.loadouts[i]; if (!L) throw new Error('empty loadout'); g.equipped = {}; for (const [sl, id] of Object.entries(L)) if (g.owned[id] != null && BY_ID[id] && BY_ID[id].slot === sl) g.equipped[sl] = id; }
      refresh(state); return { loadout: i };
    }
    const it = BY_ID[cfg.itemId];
    if (!it) throw new Error('unknown item');
    if (it.who !== who(state)) throw new Error('item for another role');
    if (cfg.op === 'buy') {
      if (g.owned[it.id] != null) throw new Error('already owned');
      if (!reqOk(state, it.req)) throw new Error('locked');
      const price = priceOf(state, it);
      if ((life.cash || 0) < price) throw new Error('not enough cash');
      life.cash -= price; g.owned[it.id] = 0; g.equipped[it.slot] = it.id;
      life.counters.gearBought = (life.counters.gearBought || 0) + 1;
    } else if (cfg.op === 'equip') {
      if (g.owned[it.id] == null) throw new Error('not owned');
      g.equipped[it.slot] = it.id;
    } else if (cfg.op === 'unequip') {
      if (g.equipped[it.slot] === it.id) delete g.equipped[it.slot];
    } else if (cfg.op === 'reforge') {
      if ((g.owned[it.id] || 0) < AFFIX_FROM || g.owned[it.id] == null) throw new Error('needs silver');
      if (g.mat < REFORGE_MAT) throw new Error('not enough material');
      g.mat -= REFORGE_MAT; g.reforge = { item: it.id, options: reforgeOptions(state, g, it) }; g.reforged = (g.reforged || 0) + 1;
      return { reforge: g.reforge };
    } else if (cfg.op === 'reforgePick') {
      if (!g.reforge || g.reforge.item !== it.id || !g.reforge.options.includes(cfg.affix)) throw new Error('bad reforge');
      g.affix[it.id] = { k: cfg.affix }; g.reforge = null;
    } else if (cfg.op === 'upgrade' || cfg.op === 'upgradeMat') {
      const cur = g.owned[it.id];
      if (cur == null) throw new Error('not owned');
      if (cur >= TIERS.length - 1) throw new Error('max tier');
      if (cur + 1 >= 3 && !reqOk(state, { fame: 15 * (cur + 1) })) throw new Error('locked');
      if (cfg.op === 'upgradeMat') { const m = matCost(cur + 1); if (g.mat < m) throw new Error('not enough material'); g.mat -= m; }
      else { const cost = upgradeCost(it, cur + 1); if ((life.cash || 0) < cost) throw new Error('not enough cash'); life.cash -= cost; }
      g.owned[it.id] = cur + 1;
      if (cur + 1 === AFFIX_FROM && !g.affix[it.id]) g.affix[it.id] = { k: reforgeOptions(state, g, it)[0] };
      life.counters.gearUpgrades = (life.counters.gearUpgrades || 0) + 1;
      life.counters.gearTier = Math.max(life.counters.gearTier || 0, cur + 1);
    } else throw new Error('unknown op');
    refresh(state);
    return { item: it.id, tier: g.owned[it.id] };
  }
  // Semana: los extras (fama, moral, confianza, vestuario) suman poco a poco.
  function weekTick(state) {
    const e = effective(state).extra, life = state.life;
    if (e.fame) life.fame = Math.min(100, (life.fame || 0) + e.fame * 0.5);
    if (state.player) {
      const p = state.player;
      if (e.morale) p.morale = Math.min(100, (p.morale == null ? 70 : p.morale) + e.morale * 0.5);
    } else if (state.coach) {
      if (e.trust) state.coach.trust = Math.min(100, state.coach.trust + e.trust * 0.3);
      if (e.morale || e.locker) state.coach.morale = Math.min(100, state.coach.morale + ((e.morale || 0) + (e.locker || 0)) * 0.3);
    }
    refresh(state);
  }
  function view(state) {
    const g = ensure(state), w = who(state), st = stock(state), eff = effective(state);
    return {
      who: w, cash: state.life.cash || 0, slots: SLOTS[w], equipped: Object.assign({}, g.equipped), stock: st, effective: eff, look: Object.assign({}, state.life.look), cap: w === 'p' ? CAP : CAP_TEAM,
      mat: g.mat, boxes: g.boxes.map(b => ({ id: b.id, reason: b.reason, options: b.options.map(o => { const it = BY_ID[o.itemId], cur = g.owned[o.itemId];
        return { itemId: o.itemId, name: it.name, slot: it.slot, color: it.color, set: it.set, tier: o.tier, affix: o.affix, affixVal: o.affix ? AFFIX_VAL[o.tier] : 0, stats: scaled(it.stats, o.tier), owned: cur != null, outcome: cur == null ? 'new' : o.tier > cur ? 'upgrade' : 'material', mat: 2 + o.tier * 2 }; }) })),
      dry: g.dry, since: g.since, wearSteps: WEAR, reforge: g.reforge || null, reforgeMat: REFORGE_MAT, loadouts: g.loadouts.map(L => L ? Object.keys(L).length : null), team: w === 'c',
      items: ITEMS.filter(i => i.who === w).map(i => {
        const tier = g.owned[i.id];
        return { id: i.id, slot: i.slot, name: i.name, color: i.color, set: i.set, price: priceOf(state, i), basePrice: i.price, owned: tier != null, tier: tier == null ? null : tier,
          stats: tier != null ? pieceStats(g, i, tier) : scaled(i.stats, 0), nextStats: tier != null && tier < 5 ? scaled(i.stats, tier + 1) : null, extra: i.extra, locked: !reqOk(state, i.req), req: i.req,
          affix: tier != null && g.affix[i.id] && tier >= AFFIX_FROM ? { k: g.affix[i.id].k, v: AFFIX_VAL[tier] } : null, wear: g.wear[i.id] || 0, wearLevel: wearLevel(g, i.id), main: Object.keys(i.stats)[0] || null,
          matCost: tier != null && tier < 5 ? matCost(tier + 1) : null, canReforge: tier != null && tier >= AFFIX_FROM,
          delta: (() => { const curId = g.equipped[i.slot]; if (curId === i.id) return null; const a = tier != null ? pieceStats(g, i, tier) : scaled(i.stats, 0), b = curId && BY_ID[curId] ? pieceStats(g, BY_ID[curId], g.owned[curId] || 0) : {}; const d = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const v = (a[k] || 0) - (b[k] || 0); if (v) d[k] = v; } return d; })(),
          upgradeCost: tier != null && tier < 5 ? upgradeCost(i, tier + 1) : null, equipped: g.equipped[i.slot] === i.id, offer: st.offers.includes(i.id), featured: st.featured.includes(i.id) };
      })
    };
  }
  // Descripción visual para el avatar vóxel (colores de lo equipado y aspecto).
  function avatarLook(state) {
    const g = ensure(state), L = state.life.look, colorOf = slot => { const id = g.equipped[slot]; return id && BY_ID[id] ? BY_ID[id].color : null; };
    return { skin: LOOK.skin[L.skin] || LOOK.skin[1], hair: L.hair, hairColor: LOOK.hairColor[L.hairColor] || LOOK.hairColor[0], beard: L.beard,
      shoes: colorOf('shoes'), sleeve: colorOf('sleeve'), band: colorOf('band'), knee: colorOf('knee'), socks: colorOf('socks'), wrist: colorOf('wrist'), goggles: colorOf('goggles'), chain: colorOf('chain'),
      suit: colorOf('suit'), tie: colorOf('tie') };
  }
  function validate(life) {
    if (!life || life.gear == null) return true;
    const g = life.gear;
    return !!g && typeof g.owned === 'object' && typeof g.equipped === 'object' && Object.entries(g.owned).every(([id, t]) => BY_ID[id] && Number.isInteger(t) && t >= 0 && t < TIERS.length);
  }
  CAA.Gear = { TIERS, SLOTS, ITEMS, SETS, LOOK, CAP, CAP_TEAM, WEAR, AFFIX_FROM, AFFIX_VAL, ensure, afterGame, makeBox, pieceStats, stock, effective, refresh, op, weekTick, view, avatarLook, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Gear;
})(typeof globalThis !== 'undefined' ? globalThis : this);
