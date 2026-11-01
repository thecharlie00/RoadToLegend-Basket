(function (root) {
  'use strict';
  // Mascota (paridad con pets/pet-* del fútbol, estilo Nintendogs en vóxel): cuidados con tres acciones
  // por semana, trucos de baloncesto que se aprenden con vínculo y energía, accesorios 3D, paseos con
  // hallazgos y concursos de trucos. El tiempo es la semana de juego (determinista). Una mascota feliz
  // anima a su dueño; una descuidada le pesa.
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const SPECIES = {
    dog: { body: '#c58a4a', belly: '#f0d7b0', ear: '#7a4f2a' },
    cat: { body: '#8d8f96', belly: '#e6e3dc', ear: '#5c5e64' },
    bunny: { body: '#efe6da', belly: '#ffffff', ear: '#e8b7b0' }
  };
  const TRICKS = [
    { id: 'sit', diff: 1 }, { id: 'paw', diff: 1 }, { id: 'roll', diff: 2 }, { id: 'fetch', diff: 2 },
    { id: 'dribble', diff: 3 }, { id: 'pass', diff: 3 }, { id: 'shoot', diff: 4 }, { id: 'dunk', diff: 5 }
  ];
  const ITEMS = [
    { id: 'collar', slot: 'neck', cost: 10, color: '#ff5b66' },
    { id: 'bandana', slot: 'neck', cost: 18, color: '#ffb21e' },
    { id: 'cap', slot: 'head', cost: 25, color: '#66b9ff' },
    { id: 'headband', slot: 'head', cost: 15, color: '#3fcf7c' },
    { id: 'shades', slot: 'face', cost: 30, color: '#1b1f22' },
    { id: 'jersey', slot: 'body', cost: 35, color: '#ffb21e' },
    { id: 'sneakers', slot: 'feet', cost: 40, color: '#f5f5f5' },
    { id: 'crown', slot: 'head', cost: 0, color: '#e8c35a', prize: true }
  ];
  const ACTIONS = ['feed', 'play', 'walk', 'bath', 'train', 'cuddle'];
  const PER_WEEK = 3;

  function adopt(state, config = {}) {
    if (state.pet) throw new Error('already has a pet');
    const species = SPECIES[config.species] ? config.species : 'dog';
    const name = String(config.name || '').trim().slice(0, 20) || ({ dog: 'Rebote', cat: 'Triple', bunny: 'Saltitos' }[species]);
    state.pet = { species, name, hunger: 80, energy: 90, happiness: 75, hygiene: 85, bond: 10, tricks: {}, owned: [], equipped: {},
      actionsLeft: PER_WEEK, cuddled: false, week: state.week, ageWeeks: 0, walks: 0, contests: { played: 0, won: 0, best: null }, lastContestWeek: -99, neglect: 0, last: { key: 'adopted' }, seq: 0 };
    return state.pet;
  }
  function rngFor(state, tag) { const pet = state.pet; pet.seq++; return RNG.create(state.seed + ':pet:' + state.year + ':' + state.week + ':' + tag + ':' + pet.seq); }
  function learned(pet) { return TRICKS.filter(t => (pet.tricks[t.id] || 0) >= 100); }

  function act(state, life, config = {}) {
    const pet = state.pet;
    if (!pet) throw new Error('no pet');
    const action = config.action;
    if (!ACTIONS.includes(action)) throw new Error('unknown pet action');
    if (action === 'cuddle') {
      if (pet.cuddled) { pet.last = { key: 'cuddleAgain' }; return pet.last; }
      pet.cuddled = true; pet.bond = clamp(pet.bond + 2, 0, 100); pet.happiness = clamp(pet.happiness + 4, 0, 100);
      pet.last = { key: 'cuddle' }; return pet.last;
    }
    if (pet.actionsLeft <= 0) throw new Error('no pet actions left this week');
    pet.actionsLeft--;
    if (action === 'feed') {
      const premium = !!config.premium;
      if (premium) { if (life.cash < 300) throw new Error('not enough cash'); life.cash -= 300; }
      pet.hunger = clamp(pet.hunger + (premium ? 60 : 40), 0, 100); pet.happiness = clamp(pet.happiness + (premium ? 8 : 3), 0, 100);
      pet.last = { key: premium ? 'feedPremium' : 'feed' };
    } else if (action === 'play') {
      if (pet.energy < 15) { pet.last = { key: 'tooTired' }; pet.happiness = clamp(pet.happiness - 2, 0, 100); return pet.last; }
      pet.happiness = clamp(pet.happiness + 15, 0, 100); pet.energy = clamp(pet.energy - 20, 0, 100); pet.bond = clamp(pet.bond + 3, 0, 100); pet.hunger = clamp(pet.hunger - 8, 0, 100);
      pet.last = { key: 'play' };
    } else if (action === 'walk') {
      if (pet.energy < 20) { pet.last = { key: 'tooTired' }; return pet.last; }
      pet.happiness = clamp(pet.happiness + 10, 0, 100); pet.energy = clamp(pet.energy - 25, 0, 100); pet.bond = clamp(pet.bond + 5, 0, 100);
      pet.hygiene = clamp(pet.hygiene - 12, 0, 100); pet.hunger = clamp(pet.hunger - 10, 0, 100); pet.walks++;
      // Paseo: a veces encuentra algo (determinista por semana).
      const r = rngFor(state, 'walk').float();
      if (r < 0.25) { life.style += 3; pet.last = { key: 'walkFindStyle' }; }
      else if (r < 0.4) { life.cash += 150; pet.last = { key: 'walkFindCash' }; }
      else if (r < 0.5) { life.fans = clamp((life.fans || 0) + 1, -30, 30); pet.last = { key: 'walkFans' }; }
      else pet.last = { key: 'walk' };
    } else if (action === 'bath') {
      pet.hygiene = 100; pet.happiness = clamp(pet.happiness + (pet.species === 'cat' ? -8 : -3), 0, 100);
      pet.last = { key: pet.species === 'cat' ? 'bathCat' : 'bath' };
    } else if (action === 'train') {
      const trick = TRICKS.find(t => t.id === config.trick);
      if (!trick) throw new Error('unknown trick');
      const prereq = TRICKS.filter(t => t.diff < trick.diff);
      if (trick.diff >= 3 && learned(pet).filter(t => prereq.includes(t)).length < trick.diff - 1) { pet.actionsLeft++; throw new Error('learn easier tricks first'); }
      if (pet.energy < 15) { pet.last = { key: 'tooTired' }; return pet.last; }
      const p = clamp(0.35 + pet.bond / 200 + pet.happiness / 300 - trick.diff * 0.07, 0.08, 0.92);
      const rng = rngFor(state, 'train:' + trick.id);
      pet.energy = clamp(pet.energy - 15, 0, 100);
      const before = pet.tricks[trick.id] || 0;
      if (before >= 100) { pet.last = { key: 'alreadyKnows', trick: trick.id }; pet.happiness = clamp(pet.happiness + 2, 0, 100); return pet.last; }
      if (rng.float() < p) {
        pet.tricks[trick.id] = Math.min(100, before + 20 + Math.round(rng.float() * 20));
        pet.bond = clamp(pet.bond + 2, 0, 100);
        pet.last = { key: pet.tricks[trick.id] >= 100 ? 'trickLearned' : 'trainGood', trick: trick.id };
      } else { pet.happiness = clamp(pet.happiness - 2, 0, 100); pet.last = { key: 'trainBad', trick: trick.id }; }
    }
    return pet.last;
  }

  // Concurso de trucos: cada 4 semanas como mínimo. Cuentan trucos, felicidad, higiene y accesorios.
  function contest(state, life) {
    const pet = state.pet;
    if (!pet) throw new Error('no pet');
    if (state.week - pet.lastContestWeek < 4 && pet.lastContestWeek >= 0) throw new Error('contest not available yet');
    const rng = rngFor(state, 'contest');
    const score = Math.round(learned(pet).reduce((s, t) => s + t.diff * 10, 0) + pet.happiness / 5 + pet.hygiene / 10 + Object.keys(pet.equipped).length * 3 + rng.float() * 12);
    const rivals = [0, 1, 2].map(i => Math.round(25 + i * 12 + rng.float() * 30 + Math.min(40, pet.contests.played * 4)));
    const place = 1 + rivals.filter(r => r > score).length;
    pet.contests.played++; pet.lastContestWeek = state.week;
    pet.contests.best = pet.contests.best == null ? place : Math.min(pet.contests.best, place);
    const prize = { 1: { style: 20, cash: 1500 }, 2: { style: 10, cash: 600 }, 3: { style: 5, cash: 200 }, 4: { style: 1, cash: 0 } }[place];
    life.style += prize.style; life.cash += prize.cash;
    if (place === 1) { pet.contests.won++; if (!pet.owned.includes('crown')) pet.owned.push('crown'); }
    pet.happiness = clamp(pet.happiness + (place === 1 ? 10 : place <= 3 ? 4 : -4), 0, 100);
    pet.energy = clamp(pet.energy - 10, 0, 100);
    pet.last = { key: 'contest' + place };
    return { score, rivals, place, prize };
  }
  function buy(state, life, itemId) {
    const pet = state.pet; const item = ITEMS.find(i => i.id === itemId);
    if (!pet || !item || item.prize) throw new Error('unknown pet item');
    if (pet.owned.includes(itemId)) throw new Error('already owned');
    if (life.style < item.cost) throw new Error('not enough style');
    life.style -= item.cost; pet.owned.push(itemId);
    pet.last = { key: 'newItem' };
    return item;
  }
  function equip(state, itemId) {
    const pet = state.pet; const item = ITEMS.find(i => i.id === itemId);
    if (!pet || !item || !pet.owned.includes(itemId)) throw new Error('not owned');
    if (pet.equipped[item.slot] === itemId) delete pet.equipped[item.slot]; else pet.equipped[item.slot] = itemId;
    pet.happiness = clamp(pet.happiness + 1, 0, 100);
    return item;
  }
  // Paso de semana: necesidades bajan, energía se recupera; el estado de ánimo de la mascota afecta al dueño.
  function weekTick(state) {
    const pet = state.pet;
    if (!pet) return null;
    pet.hunger = clamp(pet.hunger - 22, 0, 100);
    pet.hygiene = clamp(pet.hygiene - 12, 0, 100);
    pet.energy = clamp(pet.energy + 35, 0, 100);
    const needs = (pet.hunger < 30 ? 12 : 0) + (pet.hygiene < 25 ? 6 : 0);
    pet.happiness = clamp(pet.happiness - 8 - needs, 0, 100);
    pet.neglect = pet.actionsLeft === PER_WEEK && !pet.cuddled ? pet.neglect + 1 : 0;
    if (pet.neglect >= 2) pet.bond = clamp(pet.bond - 3, 0, 100);
    pet.actionsLeft = PER_WEEK; pet.cuddled = false; pet.ageWeeks++;
    const mood = pet.happiness >= 70 ? 1 : pet.happiness < 30 ? -2 : 0;
    return { mood };
  }
  function validate(pet) {
    const o = v => v && typeof v === 'object' && !Array.isArray(v);
    if (pet == null) return true;
    return o(pet) && SPECIES[pet.species] && typeof pet.name === 'string' && ['hunger', 'energy', 'happiness', 'hygiene', 'bond', 'actionsLeft'].every(k => Number.isFinite(pet[k])) && o(pet.tricks) && Array.isArray(pet.owned) && o(pet.equipped);
  }
  CAA.Pet = { SPECIES, TRICKS, ITEMS, ACTIONS, PER_WEEK, adopt, act, contest, buy, equip, weekTick, learned, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Pet;
})(typeof globalThis !== 'undefined' ? globalThis : this);
