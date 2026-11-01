(function (root) {
  'use strict';
  // Mascota (paridad con pets.js + pet-sim.js del fútbol, estilo Nintendogs en vóxel). El tiempo es la semana de juego
  // (determinista): seis necesidades que bajan cada semana, ánimo, vínculo, personalidad, etapas de crecimiento (cría →
  // joven → adulta → senior), trucos de baloncesto, inventario de comida y juguetes, accesorios con rareza, paseos por
  // rutas con hallazgos, concursos por categorías (local → comarcal → nacional) y un álbum de recuerdos.
  // No muere nunca. Su efecto en la moral del dueño es suave; las ayudas internas no se muestran.
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // shape: plantilla vóxel (quad = cuadrúpedo, small = pequeño redondo, shell = tortuga, fin = pez, bird = ave).
  const SPECIES = {
    dog: { body: '#c58a4a', belly: '#f0d7b0', ear: '#7a4f2a', shape: 'quad', exotic: false, maxTrick: 5, walks: true },
    cat: { body: '#8d8f96', belly: '#e6e3dc', ear: '#5c5e64', shape: 'quad', exotic: false, maxTrick: 5, walks: true },
    bunny: { body: '#efe6da', belly: '#ffffff', ear: '#e8b7b0', shape: 'quad', exotic: false, maxTrick: 4, walks: true },
    hamster: { body: '#d9a066', belly: '#fbe9d0', ear: '#b97a45', shape: 'small', exotic: false, maxTrick: 3, walks: true },
    turtle: { body: '#6c8f3e', belly: '#c9b37a', ear: '#3f5f2a', shape: 'shell', exotic: false, maxTrick: 3, walks: false },
    fish: { body: '#ff8a2b', belly: '#ffe0b8', ear: '#ffffff', shape: 'fin', exotic: false, maxTrick: 2, walks: false },
    parrot: { body: '#2fbf5a', belly: '#ffd23f', ear: '#e8412c', shape: 'bird', exotic: true, maxTrick: 5, walks: true },
    hedgehog: { body: '#7b5a42', belly: '#e9d2b5', ear: '#4a3426', shape: 'small', exotic: true, maxTrick: 3, walks: true },
    fennec: { body: '#e9c38c', belly: '#fff3dc', ear: '#f4a989', shape: 'quad', exotic: true, maxTrick: 5, walks: true },
    capybara: { body: '#9b7048', belly: '#c49a6c', ear: '#6e4c2e', shape: 'quad', exotic: true, maxTrick: 4, walks: true }
  };
  const EXOTIC_COST = 5000;
  const TRICKS = [
    { id: 'sit', diff: 1 }, { id: 'paw', diff: 1 }, { id: 'roll', diff: 2 }, { id: 'fetch', diff: 2 },
    { id: 'dribble', diff: 3 }, { id: 'pass', diff: 3 }, { id: 'shoot', diff: 4 }, { id: 'dunk', diff: 5 }
  ];
  // Accesorios (se pagan con estilo). rarity: c común · r rara · e épica · prize = solo por concursos.
  const ITEMS = [
    { id: 'collar', slot: 'neck', cost: 10, color: '#ff5b66', rarity: 'c' },
    { id: 'bandana', slot: 'neck', cost: 18, color: '#ffb21e', rarity: 'c' },
    { id: 'bowtie', slot: 'neck', cost: 28, color: '#8b5cf6', rarity: 'r' },
    { id: 'scarf', slot: 'neck', cost: 34, color: '#36b98a', rarity: 'r' },
    { id: 'cap', slot: 'head', cost: 25, color: '#66b9ff', rarity: 'c' },
    { id: 'headband', slot: 'head', cost: 15, color: '#3fcf7c', rarity: 'c' },
    { id: 'beanie', slot: 'head', cost: 30, color: '#e8412c', rarity: 'r' },
    { id: 'shades', slot: 'face', cost: 30, color: '#1b1f22', rarity: 'r' },
    { id: 'goggles', slot: 'face', cost: 45, color: '#3be3ff', rarity: 'e' },
    { id: 'jersey', slot: 'body', cost: 35, color: '#ffb21e', rarity: 'c' },
    { id: 'hoodie', slot: 'body', cost: 48, color: '#26304a', rarity: 'r' },
    { id: 'cape', slot: 'body', cost: 70, color: '#c9183c', rarity: 'e' },
    { id: 'sneakers', slot: 'feet', cost: 40, color: '#f5f5f5', rarity: 'r' },
    { id: 'crown', slot: 'head', cost: 0, color: '#e8c35a', rarity: 'e', prize: true },
    { id: 'medal', slot: 'neck', cost: 0, color: '#f6c83a', rarity: 'e', prize: true }
  ];
  // Comida y juguetes (se pagan con dinero del juego).
  const SUPPLIES = [
    { id: 'food_prem', kind: 'food', price: 600, qty: 3 },
    { id: 'treats', kind: 'food', price: 250, qty: 5 },
    { id: 'toy_ball', kind: 'toy', price: 400 },
    { id: 'toy_frisbee', kind: 'toy', price: 600 },
    { id: 'toy_rope', kind: 'toy', price: 300 },
    { id: 'toy_plush', kind: 'toy', price: 500 }
  ];
  // Rutas de paseo: requisito de vínculo, gasto de energía y probabilidades de hallazgo [estilo, dinero, fans].
  const ROUTES = {
    park: { bond: 0, energy: 25, find: [0.22, 0.12, 0.08] },
    barrio: { bond: 15, energy: 20, find: [0.12, 0.2, 0.14] },
    training: { bond: 35, energy: 30, find: [0.18, 0.1, 0.25] },
    arena: { bond: 60, energy: 35, find: [0.25, 0.15, 0.35] }
  };
  // Concursos: rival base, premio [estilo, dinero] para el 1.º y requisito (victorias en la categoría anterior).
  const CONTESTS = {
    local: { rival: 25, prize: [20, 1500], need: null },
    regional: { rival: 45, prize: [35, 3500], need: 'local' },
    national: { rival: 70, prize: [60, 9000], need: 'regional' }
  };
  const TRAITS = ['active', 'affectionate', 'curious', 'independent', 'glutton'];
  const NEEDS = ['hunger', 'thirst', 'hygiene', 'energy', 'fun', 'affection'];
  const DECAY = { hunger: 22, thirst: 26, hygiene: 12, energy: -35, fun: 20, affection: 14 }; // energía se recupera
  const ACTIONS = ['feed', 'play', 'walk', 'bath', 'train', 'cuddle', 'water', 'brush'];
  const QUICK = ['cuddle', 'water', 'brush']; // una vez por semana cada uno, no gastan cuidados
  const PER_WEEK = 3;
  const WEEKS_PER_SEASON = 34;

  function stageOf(pet) { const s = (pet.ageWeeks || 0) / WEEKS_PER_SEASON; return s < 1 ? 'baby' : s < 3 ? 'young' : s < 10 ? 'adult' : 'senior'; }
  function rngFor(state, tag) { const pet = state.pet; pet.seq++; return RNG.create(state.seed + ':pet:' + state.year + ':' + state.week + ':' + tag + ':' + pet.seq); }
  function learned(pet) { return TRICKS.filter(t => (pet.tricks[t.id] || 0) >= 100); }
  function remember(state, key, extra) {
    const pet = state.pet; pet.album = pet.album || [];
    if (pet.album.some(m => m.key === key && (!extra || m.x === extra))) return;
    pet.album.push({ key, x: extra || null, year: state.year, week: state.week });
    if (pet.album.length > 24) pet.album.shift();
  }
  // Partidas antiguas: completa los campos nuevos sin perder nada.
  function migrate(state) {
    const pet = state.pet; if (!pet) return null;
    if (pet.thirst == null) pet.thirst = 80;
    if (pet.fun == null) pet.fun = pet.happiness != null ? pet.happiness : 70;
    if (pet.affection == null) pet.affection = 70;
    if (!pet.trait) pet.trait = TRAITS[RNG.create(state.seed + ':pet-trait:' + pet.name).int(0, TRAITS.length - 1)];
    pet.quick = pet.quick || {};
    pet.inv = pet.inv || { food_prem: 0, treats: 2 };
    pet.toys = pet.toys || [];
    pet.album = pet.album || [];
    pet.contests = Object.assign({ played: 0, won: 0, best: null, wins: {} }, pet.contests || {});
    pet.contests.wins = pet.contests.wins || {};
    return pet;
  }
  function mood(pet) {
    // Felicidad derivada de las necesidades (energía y vínculo pesan menos).
    const n = pet.hunger * 0.2 + pet.thirst * 0.15 + pet.hygiene * 0.1 + pet.energy * 0.1 + pet.fun * 0.25 + pet.affection * 0.2;
    return clamp(Math.round(n), 0, 100);
  }
  function adopt(state, config = {}, life) {
    if (state.pet) throw new Error('already has a pet');
    const species = SPECIES[config.species] ? config.species : 'dog';
    if (SPECIES[species].exotic) { if (!life || life.cash < EXOTIC_COST) throw new Error('not enough cash'); life.cash -= EXOTIC_COST; }
    const DEF = { dog: 'Rebote', cat: 'Triple', bunny: 'Saltitos', hamster: 'Pívot', turtle: 'Reloj', fish: 'Swish', parrot: 'Speaker', hedgehog: 'Tapón', fennec: 'Alley', capybara: 'Zen' };
    const name = String(config.name || '').trim().slice(0, 20) || DEF[species];
    state.pet = { species, name, hunger: 80, thirst: 80, energy: 90, happiness: 75, hygiene: 85, fun: 75, affection: 70, bond: 10, tricks: {}, owned: [], equipped: {},
      actionsLeft: PER_WEEK, cuddled: false, quick: {}, week: state.week, ageWeeks: 0, walks: 0, contests: { played: 0, won: 0, best: null, wins: {} }, lastContestWeek: -99,
      neglect: 0, last: { key: 'adopted' }, seq: 0, inv: { food_prem: 1, treats: 3 }, toys: ['toy_ball'], album: [] };
    state.pet.trait = TRAITS[RNG.create(state.seed + ':pet-trait:' + name).int(0, TRAITS.length - 1)];
    remember(state, 'adopted');
    return state.pet;
  }
  const traitBonus = (pet, t, v) => pet.trait === t ? v : 0;

  function act(state, life, config = {}) {
    const pet = migrate(state);
    if (!pet) throw new Error('no pet');
    const action = config.action;
    if (!ACTIONS.includes(action)) throw new Error('unknown pet action');
    const sp = SPECIES[pet.species];
    if (QUICK.includes(action)) {
      if (action === 'cuddle' ? pet.cuddled : pet.quick[action]) { pet.last = { key: action + 'Again' }; return pet.last; }
      if (action === 'cuddle') { pet.cuddled = true; pet.affection = clamp(pet.affection + 25 + traitBonus(pet, 'affectionate', 10), 0, 100); pet.bond = clamp(pet.bond + 2, 0, 100); }
      else if (action === 'water') { pet.quick.water = true; pet.thirst = 100; }
      else { pet.quick.brush = true; pet.hygiene = clamp(pet.hygiene + 20, 0, 100); pet.affection = clamp(pet.affection + 6, 0, 100); }
      pet.last = { key: action }; pet.happiness = mood(pet); return pet.last;
    }
    if (pet.actionsLeft <= 0) throw new Error('no pet actions left this week');
    pet.actionsLeft--;
    if (action === 'feed') {
      const kind = config.premium ? 'food_prem' : config.food || 'basic';
      if (kind !== 'basic') {
        if ((pet.inv[kind] || 0) > 0) pet.inv[kind]--;
        else if (kind === 'food_prem' && life.cash >= 300) life.cash -= 300; // compra suelta, como antes
        else { pet.actionsLeft++; throw new Error('not enough cash'); }
      }
      const gain = kind === 'food_prem' ? 60 : kind === 'treats' ? 25 : 40;
      pet.hunger = clamp(pet.hunger + gain + traitBonus(pet, 'glutton', 5), 0, 100);
      pet.fun = clamp(pet.fun + (kind === 'basic' ? 2 : 8), 0, 100);
      if (kind === 'treats') pet.affection = clamp(pet.affection + 10, 0, 100);
      pet.last = { key: kind === 'food_prem' ? 'feedPremium' : kind === 'treats' ? 'feedTreat' : 'feed' };
    } else if (action === 'play') {
      if (pet.energy < 15) { pet.last = { key: 'tooTired' }; pet.fun = clamp(pet.fun - 2, 0, 100); pet.happiness = mood(pet); return pet.last; }
      const toy = config.toy && pet.toys.includes(config.toy) ? config.toy : null;
      pet.fun = clamp(pet.fun + 20 + (toy ? 10 : 0) + traitBonus(pet, 'active', 6), 0, 100);
      pet.energy = clamp(pet.energy - 20, 0, 100); pet.bond = clamp(pet.bond + 3, 0, 100); pet.hunger = clamp(pet.hunger - 8, 0, 100); pet.thirst = clamp(pet.thirst - 10, 0, 100);
      pet.last = { key: toy ? 'playToy' : 'play', toy };
      if (toy) remember(state, 'toy', toy);
    } else if (action === 'walk') {
      if (!sp.walks) { pet.actionsLeft++; throw new Error('this pet does not walk'); }
      const route = ROUTES[config.route] ? config.route : 'park', R = ROUTES[route];
      if (pet.bond < R.bond) { pet.actionsLeft++; throw new Error('route locked'); }
      if (pet.energy < 20) { pet.last = { key: 'tooTired' }; return pet.last; }
      pet.fun = clamp(pet.fun + 14 + traitBonus(pet, 'curious', 6), 0, 100); pet.energy = clamp(pet.energy - R.energy, 0, 100); pet.bond = clamp(pet.bond + 5, 0, 100);
      pet.hygiene = clamp(pet.hygiene - 12, 0, 100); pet.hunger = clamp(pet.hunger - 10, 0, 100); pet.thirst = clamp(pet.thirst - 12, 0, 100); pet.walks++;
      // Hallazgos (deterministas). La curiosidad ayuda un poco.
      const r = rngFor(state, 'walk:' + route).float() - traitBonus(pet, 'curious', 0.05);
      const [fs, fc, ff] = R.find;
      if (r < fs) { life.style += 3; pet.last = { key: 'walkFindStyle', route }; }
      else if (r < fs + fc) { life.cash += 150; pet.last = { key: 'walkFindCash', route }; }
      else if (r < fs + fc + ff) { life.fans = clamp((life.fans || 0) + 1, -30, 30); pet.last = { key: 'walkFans', route }; }
      else pet.last = { key: 'walk', route };
      remember(state, 'route', route);
    } else if (action === 'bath') {
      const hates = pet.species === 'cat' || pet.species === 'hamster';
      pet.hygiene = 100; pet.fun = clamp(pet.fun + (hates ? -10 : -3), 0, 100); if (pet.species === 'fish') pet.fun = clamp(pet.fun + 10, 0, 100);
      pet.last = { key: hates ? 'bathCat' : pet.species === 'fish' ? 'bathFish' : 'bath' };
    } else if (action === 'train') {
      const trick = TRICKS.find(t => t.id === config.trick);
      if (!trick) { pet.actionsLeft++; throw new Error('unknown trick'); }
      if (trick.diff > sp.maxTrick) { pet.actionsLeft++; throw new Error('this pet cannot learn that trick'); }
      const prereq = TRICKS.filter(t => t.diff < trick.diff);
      if (trick.diff >= 3 && learned(pet).filter(t => prereq.includes(t)).length < trick.diff - 1) { pet.actionsLeft++; throw new Error('learn easier tricks first'); }
      if (pet.energy < 15) { pet.last = { key: 'tooTired' }; return pet.last; }
      const stageMod = { baby: 0.06, young: 0.08, adult: 0, senior: -0.06 }[stageOf(pet)];
      const p = clamp(0.35 + pet.bond / 200 + pet.happiness / 300 - trick.diff * 0.07 + stageMod - traitBonus(pet, 'independent', 0.05) + (pet.trainMiss || 0) * 0.06, 0.08, 0.92);
      const rng = rngFor(state, 'train:' + trick.id);
      pet.energy = clamp(pet.energy - 15, 0, 100);
      const before = pet.tricks[trick.id] || 0;
      if (before >= 100) { pet.last = { key: 'alreadyKnows', trick: trick.id }; pet.fun = clamp(pet.fun + 4, 0, 100); pet.happiness = mood(pet); return pet.last; }
      if (rng.float() < p) {
        pet.trainMiss = 0;
        pet.tricks[trick.id] = Math.min(100, before + 20 + Math.round(rng.float() * 20));
        pet.bond = clamp(pet.bond + 2, 0, 100);
        pet.last = { key: pet.tricks[trick.id] >= 100 ? 'trickLearned' : 'trainGood', trick: trick.id };
        if (pet.tricks[trick.id] >= 100) remember(state, 'trick', trick.id);
      } else { pet.trainMiss = (pet.trainMiss || 0) + 1; pet.fun = clamp(pet.fun - 3, 0, 100); pet.last = { key: 'trainBad', trick: trick.id }; } // racha de fallos: ayuda oculta
    }
    pet.happiness = mood(pet);
    return pet.last;
  }

  // Concurso de trucos: cada 4 semanas como mínimo. Categorías que se desbloquean ganando la anterior.
  function contestOpen(pet, tier) { const c = CONTESTS[tier]; return !!c && (!c.need || (pet.contests.wins[c.need] || 0) > 0); }
  function contest(state, life, config = {}) {
    const pet = migrate(state);
    if (!pet) throw new Error('no pet');
    const tier = CONTESTS[config.tier] ? config.tier : 'local', C = CONTESTS[tier];
    if (!contestOpen(pet, tier)) throw new Error('contest locked');
    if (state.week - pet.lastContestWeek < 4 && pet.lastContestWeek >= 0) throw new Error('contest not available yet');
    const rng = rngFor(state, 'contest:' + tier);
    const score = Math.round(learned(pet).reduce((s, t) => s + t.diff * 10, 0) + pet.happiness / 5 + pet.hygiene / 10 + Object.keys(pet.equipped).length * 3 + pet.bond / 10 + rng.float() * 12);
    const losses = Math.max(0, pet.contests.played - pet.contests.won);
    const rivals = [0, 1, 2].map(i => Math.round(C.rival + i * 12 + rng.float() * 30 + Math.min(30, pet.contests.played * 3) - Math.min(15, losses * 2))); // rivales algo más flojos tras derrotas (oculto)
    const place = 1 + rivals.filter(r => r > score).length;
    pet.contests.played++; pet.lastContestWeek = state.week;
    pet.contests.best = pet.contests.best == null ? place : Math.min(pet.contests.best, place);
    const k = { 1: 1, 2: 0.4, 3: 0.15, 4: 0 }[place];
    const prize = { style: Math.max(place === 4 ? 1 : 0, Math.round(C.prize[0] * k)), cash: Math.round(C.prize[1] * k) };
    life.style += prize.style; life.cash += prize.cash;
    if (place === 1) {
      pet.contests.won++; pet.contests.wins[tier] = (pet.contests.wins[tier] || 0) + 1;
      if (!pet.owned.includes('crown')) pet.owned.push('crown');
      if (tier === 'national' && !pet.owned.includes('medal')) pet.owned.push('medal');
      remember(state, 'contestWin', tier);
    }
    pet.fun = clamp(pet.fun + (place === 1 ? 15 : place <= 3 ? 6 : -4), 0, 100);
    pet.energy = clamp(pet.energy - 10, 0, 100);
    pet.happiness = mood(pet);
    pet.last = { key: 'contest' + place, tier };
    return { score, rivals, place, prize, tier };
  }
  function buy(state, life, itemId) {
    const pet = migrate(state); const item = ITEMS.find(i => i.id === itemId);
    if (!pet || !item || item.prize) throw new Error('unknown pet item');
    if (pet.owned.includes(itemId)) throw new Error('already owned');
    if (life.style < item.cost) throw new Error('not enough style');
    life.style -= item.cost; pet.owned.push(itemId);
    pet.last = { key: 'newItem' };
    return item;
  }
  function buySupply(state, life, id) {
    const pet = migrate(state); const s = SUPPLIES.find(x => x.id === id);
    if (!pet || !s) throw new Error('unknown supply');
    if (s.kind === 'toy' && pet.toys.includes(id)) throw new Error('already owned');
    if (life.cash < s.price) throw new Error('not enough cash');
    life.cash -= s.price;
    if (s.kind === 'toy') pet.toys.push(id); else pet.inv[id] = (pet.inv[id] || 0) + s.qty;
    pet.last = { key: s.kind === 'toy' ? 'newToy' : 'newFood' };
    return s;
  }
  function equip(state, itemId) {
    const pet = migrate(state); const item = ITEMS.find(i => i.id === itemId);
    if (!pet || !item || !pet.owned.includes(itemId)) throw new Error('not owned');
    if (pet.equipped[item.slot] === itemId) delete pet.equipped[item.slot]; else pet.equipped[item.slot] = itemId;
    pet.fun = clamp(pet.fun + 1, 0, 100); pet.happiness = mood(pet);
    return item;
  }
  // Paso de semana: las necesidades bajan (según la personalidad), la energía se recupera y la mascota crece.
  function weekTick(state) {
    const pet = migrate(state);
    if (!pet) return null;
    const stageBefore = stageOf(pet);
    for (const k of NEEDS) {
      let d = DECAY[k];
      if (k === 'hunger') d += traitBonus(pet, 'glutton', 6);
      if (k === 'fun') d += traitBonus(pet, 'active', 5);
      if (k === 'affection') d += traitBonus(pet, 'affectionate', 5) - traitBonus(pet, 'independent', 6);
      if (pet.species === 'fish' && k === 'thirst') d = 0;
      pet[k] = clamp(pet[k] - d, 0, 100);
    }
    // Ausencia larga: suelo para que nunca se hunda del todo (ayuda oculta).
    for (const k of NEEDS) pet[k] = Math.max(pet[k], 12);
    pet.happiness = mood(pet);
    pet.neglect = pet.actionsLeft === PER_WEEK && !pet.cuddled ? pet.neglect + 1 : 0;
    if (pet.neglect >= 2) pet.bond = clamp(pet.bond - 3, 0, 100);
    pet.actionsLeft = PER_WEEK; pet.cuddled = false; pet.quick = {}; pet.ageWeeks++;
    const stage = stageOf(pet);
    if (stage !== stageBefore) { remember(state, 'grew', stage); pet.last = { key: 'grew', stage }; }
    if (pet.ageWeeks % WEEKS_PER_SEASON === 0) remember(state, 'birthday', String(pet.ageWeeks / WEEKS_PER_SEASON));
    const m = pet.happiness >= 70 ? 1 : pet.happiness < 30 ? -2 : 0;
    return { mood: m };
  }
  function validate(pet) {
    const o = v => v && typeof v === 'object' && !Array.isArray(v);
    if (pet == null) return true;
    return o(pet) && SPECIES[pet.species] && typeof pet.name === 'string' && ['hunger', 'energy', 'happiness', 'hygiene', 'bond', 'actionsLeft'].every(k => Number.isFinite(pet[k])) && o(pet.tricks) && Array.isArray(pet.owned) && o(pet.equipped);
  }
  CAA.Pet = { SPECIES, EXOTIC_COST, TRICKS, ITEMS, SUPPLIES, ROUTES, CONTESTS, TRAITS, NEEDS, ACTIONS, QUICK, PER_WEEK, WEEKS_PER_SEASON,
    adopt, act, contest, contestOpen, buy, buySupply, equip, weekTick, learned, validate, migrate, stageOf, mood };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Pet;
})(typeof globalThis !== 'undefined' ? globalThis : this);
