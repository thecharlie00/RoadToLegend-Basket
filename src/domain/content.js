(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  function load(key, file) {
    if (root.CAA_DATA && root.CAA_DATA[key]) return root.CAA_DATA[key];
    if (typeof require === 'function') { try { return require('../../data/content/' + file + '.json'); } catch (_) {} }
    return null;
  }
  function packs() { return { events: load('events', 'events'), achievements: load('achievements', 'achievements'), shop: load('shop', 'shop'), press: load('press', 'press'), guide: load('guide', 'guide') }; }
  function validate() {
    const p = packs(); const errors = [];
    if (!p.events || p.events.events.length !== 100) errors.push('events must be 100');
    if (!p.achievements || p.achievements.achievements.length !== 50) errors.push('achievements must be 50');
    if (!p.shop || !p.shop.items.length) errors.push('shop missing');
    if (!p.press || !p.press.templates.length) errors.push('press missing');
    if (!p.guide || !p.guide.steps.length) errors.push('guide missing');
    return { ok: !errors.length, errors };
  }
  function ensureLife(state) {
    if (!state.life) state.life = { cash: 0, style: 0, xp: 0, achievements: [], equipment: {}, owned: [], appliedBonuses: [], eventHistory: [], pendingEvent: null, press: [], guideStep: 0, counters: { games: 0, points: 0, wins: 0, seasons: 0, ovr: 0, cash: 0, style: 0, events: 0, train: 0, signs: 0, practice: 0 } };
    if (state.life.pendingPractice == null) state.life.pendingPractice = null;
    if (!Array.isArray(state.life.appliedBonuses)) state.life.appliedBonuses = [];
    if (state.life.counters.practice == null) state.life.counters.practice = 0;
    return state.life;
  }
  function applyEffects(state, effects) {
    const life = ensureLife(state); const p = state.player;
    for (const [k, v] of Object.entries(effects || {})) {
      if (k === 'cash') life.cash = Math.max(0, life.cash + v);
      else if (k === 'style') life.style = Math.max(0, life.style + v);
      else if (k === 'xp') life.xp = Math.max(0, life.xp + v);
      else if (p && k === 'morale') p.morale = Math.max(0, Math.min(100, (p.morale || 70) + v));
      else if (p && k === 'chemistry') p.chemistry = Math.max(0, Math.min(100, (p.chemistry || 60) + v));
      else if (p && k === 'load') p.load = Math.max(0, Math.min(100, (p.load || 0) + v));
      else if (p && k === 'fatigue') p.fatigue = Math.max(0, Math.min(1, (p.fatigue || 0) + v));
      else if (state.coach && k === 'morale') state.coach.morale = Math.max(0, Math.min(100, state.coach.morale + v));
      else if (state.coach && k === 'trust') state.coach.trust = Math.max(0, Math.min(100, state.coach.trust + v));
    }
  }
  function maybeEvent(state, rng) {
    const life = ensureLife(state); const p = packs();
    if (life.pendingEvent || !p.events) return null;
    if (state.week % 3 !== 0) return null;
    const recent = new Set(life.eventHistory.slice(-20).map(e => e.id));
    const pool = p.events.events.filter(e => !recent.has(e.id) && (e.conditions.mode === 'any' || e.conditions.mode === state.mode));
    if (!pool.length) return null;
    const total = pool.reduce((s, e) => s + e.weight, 0);
    let r = rng.float() * total; let chosen = pool[pool.length - 1];
    for (const e of pool) { r -= e.weight; if (r <= 0) { chosen = e; break; } }
    life.pendingEvent = { id: chosen.id, week: state.week };
    return chosen;
  }
  function chooseEvent(state, optionId) {
    const life = ensureLife(state); const p = packs();
    if (!life.pendingEvent) throw new Error('no pending event');
    const ev = p.events.events.find(e => e.id === life.pendingEvent.id);
    const opt = ev && ev.options.find(o => o.id === optionId);
    if (!opt) throw new Error('invalid option');
    applyEffects(state, opt.effects);
    life.eventHistory.push({ id: ev.id, option: opt.id, week: state.week });
    life.counters.events++;
    life.pendingEvent = null;
    return ev;
  }
  function evaluateAchievements(state) {
    const life = ensureLife(state); const p = packs(); const club = state.season && state.season.clubsById[state.clubId];
    life.counters.games = state.player ? state.player.stats.gp : state.week;
    life.counters.points = state.player ? state.player.stats.pts : 0;
    life.counters.wins = club ? club.wins : 0;
    life.counters.seasons = state.history.length;
    life.counters.ovr = state.player ? state.player.ovr : 0;
    life.counters.cash = life.cash; life.counters.style = life.style;
    const unlocked = [];
    for (const a of p.achievements.achievements) {
      if (life.achievements.includes(a.id)) continue;
      if ((life.counters[a.metric] || 0) >= a.threshold) { life.achievements.push(a.id); life.style += a.rewardStyle; unlocked.push(a.id); }
    }
    return unlocked;
  }
  function buy(state, itemId) {
    const life = ensureLife(state); const p = packs();
    const item = p.shop.items.find(i => i.id === itemId);
    if (!item) throw new Error('unknown item');
    if (life.owned.includes(itemId)) throw new Error('already owned');
    if (life.style < item.cost) throw new Error('not enough style');
    life.style -= item.cost; life.owned.push(itemId);
    return item;
  }
  function equip(state, itemId) {
    const life = ensureLife(state); const p = packs();
    const item = p.shop.items.find(i => i.id === itemId);
    if (!item || !life.owned.includes(itemId)) throw new Error('not owned');
    life.equipment[item.slot] = itemId;
    // El bonus de un objeto se aplica una sola vez por carrera; reequipar no apila efectos.
    if (item.bonus && !life.appliedBonuses.includes(itemId)) { applyEffects(state, item.bonus); life.appliedBonuses.push(itemId); }
    return item;
  }
  function press(state) {
    const life = ensureLife(state); const p = packs(); const club = state.season && state.season.clubsById[state.clubId];
    const ctx = { club: club ? club.name : '', player: state.player ? state.player.name : '', wins: club ? club.wins : 0, losses: club ? club.losses : 0, points: state.player ? state.player.stats.pts : 0, injury: state.player && state.player.injury, drafted: state.player && state.player.drafted };
    const t = p.press.templates.find(t => {
      if (t.condition === 'always') return true;
      if (t.condition === 'injury') return ctx.injury;
      if (t.condition === 'drafted') return ctx.drafted;
      const m = t.condition.match(/(wins|losses|points)>=(\d+)/);
      return m && ctx[m[1]] >= +m[2];
    }) || p.press.templates[p.press.templates.length - 1];
    const line = { id: t.id, week: state.week, es: t.es.replace(/\{(\w+)\}/g, (_, k) => ctx[k] == null ? '' : ctx[k]), en: t.en.replace(/\{(\w+)\}/g, (_, k) => ctx[k] == null ? '' : ctx[k]) };
    life.press.unshift(line); life.press = life.press.slice(0, 12);
    return line;
  }
  CAA.Content = { packs, validate, ensureLife, applyEffects, maybeEvent, chooseEvent, evaluateAchievements, buy, equip, press };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Content;
})(typeof globalThis !== 'undefined' ? globalThis : this);
