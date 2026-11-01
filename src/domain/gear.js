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
  const CAP = { att: 4, total: 9 };
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
    ['scarf-club', 'scarf', 'Bufanda del club', 'Club scarf', {}, null, 1500, null, '#ff7a1f', { morale: 1 }]
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
    // Piezas de inicio gratuitas.
    for (const i of ITEMS) if (i.price === 0 && g.owned[i.id] == null) g.owned[i.id] = 0;
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
  function upgradeCost(item, toTier) { return Math.round(Math.max(1500, item.price) * UPGRADE[toTier]); }
  function scaled(stats, tier) { const out = {}; for (const [k, v] of Object.entries(stats || {})) out[k] = Math.round(v * TIERS[tier].m); return out; }
  // Atributos efectivos que aporta lo equipado, con tope por atributo y total.
  function effective(state) {
    const g = ensure(state), sum = {}, extra = {}, sets = {};
    for (const id of Object.values(g.equipped)) {
      const it = BY_ID[id]; if (!it) continue;
      const tier = g.owned[id] || 0;
      for (const [k, v] of Object.entries(scaled(it.stats, tier))) sum[k] = (sum[k] || 0) + v;
      for (const [k, v] of Object.entries(it.extra || {})) extra[k] = (extra[k] || 0) + v;
      if (it.set) sets[it.set] = (sets[it.set] || 0) + 1;
    }
    const active = [];
    for (const [k, n] of Object.entries(sets)) if (SETS[k] && n >= SETS[k].need) {
      active.push(k);
      for (const [a, v] of Object.entries(SETS[k].stats || {})) sum[a] = (sum[a] || 0) + v;
      for (const [a, v] of Object.entries(SETS[k].extra || {})) extra[a] = (extra[a] || 0) + v;
    }
    let total = 0; const attrs = {};
    for (const k of Object.keys(sum).sort()) { const v = Math.min(CAP.att, sum[k]); const take = Math.max(0, Math.min(v, CAP.total - total)); if (take) { attrs[k] = take; total += take; } }
    return { attrs, extra, sets: active, total };
  }
  function refresh(state) { if (state.player) state.player.gearAttrs = effective(state).attrs; }
  function op(state, cfg = {}) {
    const g = ensure(state), life = state.life;
    if (cfg.op === 'look') {
      const L = life.look;
      if (cfg.skin != null) { const v = Number(cfg.skin); if (!(v >= 0 && v < LOOK.skin.length)) throw new Error('bad skin'); L.skin = v; }
      if (cfg.hairColor != null) { const v = Number(cfg.hairColor); if (!(v >= 0 && v < LOOK.hairColor.length)) throw new Error('bad hair color'); L.hairColor = v; }
      for (const k of ['hair', 'beard', 'celebration']) if (cfg[k] != null) { if (!LOOK[k].includes(cfg[k])) throw new Error('bad ' + k); L[k] = cfg[k]; }
      return { look: L };
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
    } else if (cfg.op === 'upgrade') {
      const cur = g.owned[it.id];
      if (cur == null) throw new Error('not owned');
      if (cur >= TIERS.length - 1) throw new Error('max tier');
      const cost = upgradeCost(it, cur + 1);
      if (cur + 1 >= 3 && !reqOk(state, { fame: 15 * (cur + 1) })) throw new Error('locked');
      if ((life.cash || 0) < cost) throw new Error('not enough cash');
      life.cash -= cost; g.owned[it.id] = cur + 1;
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
      who: w, cash: state.life.cash || 0, slots: SLOTS[w], equipped: Object.assign({}, g.equipped), stock: st, effective: eff, look: Object.assign({}, state.life.look), cap: CAP,
      items: ITEMS.filter(i => i.who === w).map(i => {
        const tier = g.owned[i.id];
        return { id: i.id, slot: i.slot, name: i.name, color: i.color, set: i.set, price: priceOf(state, i), basePrice: i.price, owned: tier != null, tier: tier == null ? null : tier,
          stats: scaled(i.stats, tier || 0), nextStats: tier != null && tier < 5 ? scaled(i.stats, tier + 1) : null, extra: i.extra, locked: !reqOk(state, i.req), req: i.req,
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
  CAA.Gear = { TIERS, SLOTS, ITEMS, SETS, LOOK, CAP, ensure, stock, effective, refresh, op, weekTick, view, avatarLook, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Gear;
})(typeof globalThis !== 'undefined' ? globalThis : this);
