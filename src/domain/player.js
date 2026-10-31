(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const Names = CAA.Names || (typeof require === 'function' ? require('./names.js') : null);
  const Match = CAA.Match || (typeof require === 'function' ? require('../match/engine.js') : null);

  const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
  const HYBRIDS = ['PG/SG', 'SG/SF', 'SF/PF', 'PF/C'];
  const ARCHETYPES = ['creator', 'shooter', 'finisher', 'two-way', 'interior', 'point-forward', 'passing-big'];
  const POS_WEIGHTS = {
    PG: { manejo: 3, pase: 3, vision: 3, velocidad: 2, tiroTriple: 2, defExterior: 2, lectura: 2, tiroLibre: 1 },
    SG: { tiroTriple: 3, tiroMedia: 2, manejo: 2, velocidad: 2, defExterior: 2, tiroLibre: 1, bandeja: 1 },
    SF: { tiroTriple: 2, defExterior: 2, defInterior: 1, salto: 2, bandeja: 2, rebDef: 1, manejo: 1, fuerza: 1 },
    PF: { defInterior: 3, rebDef: 2, rebOf: 2, fuerza: 2, poste: 2, tapon: 2, tiroCerca: 1 },
    C: { poste: 3, tiroCerca: 3, rebDef: 3, rebOf: 2, tapon: 3, fuerza: 3, defInterior: 2 }
  };
  const ARCHETYPE_BIAS = {
    creator: { manejo: 5, pase: 4, vision: 4, tiroMedia: 2 },
    shooter: { tiroTriple: 6, tiroMedia: 4, tiroLibre: 3 },
    finisher: { bandeja: 5, mate: 5, tiroCerca: 4, salto: 3 },
    'two-way': { defExterior: 4, defInterior: 3, robo: 3, tapon: 2 },
    interior: { poste: 5, fuerza: 4, rebDef: 4, tapon: 3 },
    'point-forward': { manejo: 4, pase: 4, vision: 3, tiroTriple: 2 },
    'passing-big': { pase: 5, vision: 4, poste: 3, rebDef: 2 }
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ovr(attrs, pos) {
    const base = pos && pos.includes('/') ? pos.split('/')[0] : pos;
    const w = POS_WEIGHTS[base] || {};
    let sum = 0, total = 0;
    for (const k of Match.ATTRS) { const weight = 1 + (w[k] || 0); sum += attrs[k] * weight; total += weight; }
    return Math.round(sum / total);
  }
  function createPlayer(config = {}) {
    const seed = config.seed == null ? 'player' : config.seed;
    const rng = RNG.create(seed);
    const pos = config.pos || rng.pick(POSITIONS);
    const archetype = config.archetype || rng.pick(ARCHETYPES);
    const nationality = config.nationality || 'ES';
    const age = config.age || rng.int(18, 34);
    const quality = config.quality == null ? rng.int(38, 68) : config.quality;
    const name = config.name || Names.generateName(seed + ':name', nationality).full;
    const attrs = {};
    const posBias = POS_WEIGHTS[pos.includes('/') ? pos.split('/')[0] : pos] || {};
    const archBias = ARCHETYPE_BIAS[archetype] || {};
    for (const k of Match.ATTRS) {
      const bias = (posBias[k] || 0) + (archBias[k] || 0);
      attrs[k] = clamp(Math.round(quality + bias + rng.int(-6, 6)), 20, 99);
    }
    const heightBase = { PG: 188, SG: 196, SF: 203, PF: 208, C: 213 }[pos.includes('/') ? pos.split('/')[0] : pos] || 200;
    const height = config.height || clamp(heightBase + rng.int(-7, 7), 170, 225);
    const wingspan = config.wingspan || height + rng.int(2, 16);
    const weight = config.weight || Math.round(height - 100 + rng.int(-5, 15));
    const potential = clamp(ovr(attrs, pos) + rng.int(2, 24) - Math.max(0, age - 24), 40, 99);
    return {
      id: config.id || 'p-' + seed,
      name, nationality, secondNationality: config.secondNationality || null,
      gender: config.gender || 'men', age, pos, archetype,
      handedness: config.handedness || (rng.float() < 0.1 ? 'left' : 'right'),
      height, wingspan, weight,
      attrs, ovr: ovr(attrs, pos), potential,
      form: 0, morale: 70, chemistry: 60, load: 0, fatigue: 0,
      injury: null, contract: null, stats: { gp: 0, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0 },
      career: { seasons: 0, awards: [], retired: false }
    };
  }
  function toMatchPlayer(p, starter) {
    const attrs = Object.assign({}, p.attrs);
    // Confianza ganada (o perdida) en momentos clave del partido en directo: afecta al clutch real.
    if (p.confidence) attrs.clutch = clamp(attrs.clutch + p.confidence, 20, 99);
    return { id: p.id, name: p.name, pos: p.pos.includes('/') ? p.pos.split('/')[0] : p.pos, starter: !!starter, attrs, fatigue: p.fatigue || 0, fouls: 0, stats: null, onCourtTenths: 0 };
  }
  function develop(p, training, rng) {
    if (p.career.retired) return p;
    const growth = p.age <= 23 ? 1.25 : p.age <= 27 ? 0.7 : p.age <= 31 ? 0.15 : -0.6;
    const focus = training && training.focus ? training.focus : null;
    for (const k of Match.ATTRS) {
      let delta = growth * (0.2 + rng.float() * 0.5);
      if (focus === k) delta *= 1.8;
      if (p.ovr >= p.potential && delta > 0) delta *= 0.15;
      p.attrs[k] = clamp(Math.round((p.attrs[k] + delta) * 10) / 10, 20, 99);
    }
    p.ovr = ovr(p.attrs, p.pos);
    p.form = clamp(p.form + rng.int(-2, 3), -10, 10);
    p.morale = clamp(p.morale + (training && training.rest ? 2 : -1), 0, 100);
    return p;
  }
  function injuryRisk(p) {
    const load = p.load || 0;
    const dur = p.attrs.durabilidad || 50;
    return clamp(0.005 + load * 0.0008 + Math.max(0, p.age - 30) * 0.001 - dur * 0.00005, 0.001, 0.08);
  }
  function maybeInjure(p, rng) {
    if (p.injury) return p;
    if (rng.float() < injuryRisk(p)) {
      const weeks = rng.int(1, 6);
      p.injury = { type: rng.pick(['ankle', 'knee', 'back', 'shoulder', 'hamstring']), weeksRemaining: weeks, gamesMissed: 0 };
      p.morale = clamp(p.morale - 8, 0, 100);
    }
    return p;
  }
  function recover(p) {
    if (!p.injury) return p;
    p.injury.weeksRemaining--;
    if (p.injury.weeksRemaining <= 0) p.injury = null;
    return p;
  }
  function ageOneYear(p, rng) {
    p.age++;
    p.career.seasons++;
    const decline = p.age > 31 ? (p.age - 31) * 0.8 : 0;
    for (const k of Match.ATTRS) p.attrs[k] = clamp(Math.round((p.attrs[k] - decline + rng.float() * 0.6) * 10) / 10, 20, 99);
    p.ovr = ovr(p.attrs, p.pos);
    p.load = 0; p.fatigue = 0;
    if (p.age >= 38 && p.ovr < 55) p.career.retired = true;
    return p;
  }

  CAA.Player = { POSITIONS, HYBRIDS, ARCHETYPES, createPlayer, toMatchPlayer, ovr, develop, injuryRisk, maybeInjure, recover, ageOneYear };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Player;
})(typeof globalThis !== 'undefined' ? globalThis : this);
