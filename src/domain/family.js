(function (root) {
  'use strict';
  // Familia y Dinastías (paridad con fam48/dyn46 del fútbol): pareja, hijos, conciliación con la carrera,
  // retirada y relevo generacional jugando como tu hijo o hija, con la leyenda anterior presente en el mundo.
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const Names = CAA.Names || (typeof require === 'function' ? require('./names.js') : null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function ensure(state) {
    if (!state.family) state.family = { configured: false, status: 'single', partner: null, children: [], generation: 1, legends: [], surname: null };
    const f = state.family;
    if (!Array.isArray(f.children)) f.children = [];
    if (!Array.isArray(f.legends)) f.legends = [];
    if (!f.surname && state.player) f.surname = String(state.player.name).split(' ').slice(1).join(' ') || state.player.name;
    return f;
  }
  function firstName(seed, nationality, gender) {
    const n = Names.generateName(seed + ':' + gender, nationality || 'ES', gender);
    return n.first;
  }
  function addChild(state, config = {}) {
    const f = ensure(state);
    const rng = RNG.create(state.seed + ':child:' + state.year + ':' + f.children.length);
    const gender = config.gender || (rng.float() < 0.5 ? 'm' : 'f');
    const child = { name: config.name || firstName(state.seed + ':child' + f.children.length, state.player ? state.player.nationality : 'ES', gender), gender, bornYear: config.bornYear || state.year, talent: Math.round(40 + rng.float() * 30), bond: 60 };
    f.children.push(child);
    return child;
  }
  // Configuración inicial: sin familia, con pareja o pareja con hijo pequeño.
  function setup(state, config = {}) {
    const f = ensure(state);
    if (f.configured) throw new Error('family already configured');
    f.configured = true;
    if (config.kind === 'partner' || config.kind === 'parent') {
      f.status = 'partner';
      f.partner = { name: String(config.partnerName || '').trim().slice(0, 24) || firstName(state.seed + ':partner', state.player ? state.player.nationality : 'ES', partnerGender(state)), happiness: 70, since: state.year };
      if (config.kind === 'parent') addChild(state, { bornYear: state.year - 2 });
    }
    return f;
  }
  function partnerGender(state) { return state.player && state.player.gender === 'women' ? 'm' : 'f'; }
  function ageOf(child, year) { return year - child.bornYear; }
  // Efectos de contenido propios de la familia (los llama Content.applyEffects).
  function applyEffect(state, key, value) {
    const f = ensure(state);
    if (key === 'partnerHappiness' && f.partner) f.partner.happiness = clamp(f.partner.happiness + value, 0, 100);
    else if (key === 'childBond') for (const c of f.children) c.bond = clamp(c.bond + value, 0, 100);
    else if (key === 'familyStatus') {
      f.configured = true;
      if (value === 'single') { f.status = 'single'; f.partner = null; }
      else { if (!f.partner) f.partner = { name: firstName(state.seed + ':partner:' + state.year + ':' + state.week, state.player ? state.player.nationality : 'ES', partnerGender(state)), happiness: 70, since: state.year }; f.status = value; }
    } else if (key === 'baby') addChild(state, {});
    else return false;
    return true;
  }
  // Semana: la conciliación pesa. Semana en familia = pareja e hijos felices; entrenar extra los resiente.
  function weekTick(state, action) {
    const f = ensure(state);
    if (!f.partner && !f.children.length) return { mood: 0 };
    const type = action && action.type;
    if (f.partner) {
      const delta = type === 'family' ? 12 : type === 'train' ? -5 : type === 'rest' ? 2 : -1;
      f.partner.happiness = clamp(f.partner.happiness + delta, 0, 100);
    }
    for (const c of f.children) c.bond = clamp(c.bond + (type === 'family' ? 6 : type === 'train' ? -2 : -0.5), 0, 100);
    const h = f.partner ? f.partner.happiness : 60;
    return { mood: h >= 75 ? 1 : h < 30 ? -2 : 0 };
  }
  // Relevo generacional: legado de la leyenda anterior para el nuevo jugador.
  function legacyOf(state) {
    const p = state.player, life = state.life || { counters: {} }, c = life.counters || {};
    const t = p && p.career && p.career.totals || { gp: 0, pts: 0, reb: 0, ast: 0 };
    return { name: p ? p.name : '', nationality: p ? p.nationality : 'ES', number: p ? p.number : null, seasons: p ? p.career.seasons : 0, totals: Object.assign({}, t), titles: c.titles || 0, awards: p ? (p.career.awards || []).length : 0,
      peak: c.ovr || (p ? p.ovr : 0), lastClub: state.clubId, lastClubName: (state.season.clubsById[state.clubId] || {}).name || '', retiredYear: state.year, generation: ensure(state).generation };
  }
  function legacyBonus(legend) { return Math.min(6, Math.round(legend.titles * 1.5 + legend.awards * 0.5 + Math.max(0, legend.peak - 70) * 0.15)); }
  function validate(f) {
    const o = v => v && typeof v === 'object' && !Array.isArray(v);
    if (f == null) return true;
    return o(f) && Array.isArray(f.children) && Array.isArray(f.legends) && ['single', 'dating', 'partner', 'married'].includes(f.status) && Number.isInteger(f.generation);
  }
  CAA.Family = { ensure, setup, addChild, ageOf, applyEffect, weekTick, legacyOf, legacyBonus, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Family;
})(typeof globalThis !== 'undefined' ? globalThis : this);
