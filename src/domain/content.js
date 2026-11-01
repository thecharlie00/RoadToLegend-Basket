(function (root) {
  'use strict';
  // Contenido v2 (paridad con events*/life/achieve del fútbol): decisiones narrativas con contexto,
  // desenlaces inciertos con probabilidad visible, consecuencias diferidas (flags), agente, patrocinio,
  // fama, ingresos y trofeos con guiños. La ayuda contra malas rachas existe pero nunca se anuncia.
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  function load(key, file) {
    if (root.CAA_DATA && root.CAA_DATA[key]) return root.CAA_DATA[key];
    if (typeof require === 'function') { try { return require('../../data/content/' + file + '.json'); } catch (_) {} }
    return null;
  }
  function packs() { return { events: load('events', 'events'), achievements: load('achievements', 'achievements'), shop: load('shop', 'shop'), press: load('press', 'press'), guide: load('guide', 'guide') }; }
  const EFFECT_KEYS = ['morale', 'load', 'fatigue', 'chemistry', 'form', 'trust', 'confidence', 'cash', 'style', 'xp', 'fame', 'fans', 'salary', 'agent', 'sponsor', 'flag', 'unflag', 'attr', 'injuryWeeks', 'board', 'locker', 'partnerHappiness', 'childBond', 'familyStatus', 'baby', 'injure'];
  const AGENTS = { star: { commission: 0.10, offer: 1.12 }, family: { commission: 0.05, offer: 1.0 }, self: { commission: 0, offer: 0.92 } };

  function validate() {
    const p = packs(); const errors = [];
    const bi = o => o && typeof o.es === 'string' && o.es && typeof o.en === 'string' && o.en;
    if (!p.events || p.events.events.length < 100) errors.push('events must be at least 100');
    else {
      const ids = new Set();
      for (const e of p.events.events) {
        if (ids.has(e.id)) errors.push('duplicate event ' + e.id); ids.add(e.id);
        if (!bi(e.title) || !bi(e.body) || !Array.isArray(e.options) || e.options.length < 2) errors.push('bad event ' + e.id);
        for (const o of e.options || []) {
          if (!bi(o.label)) errors.push('bad option label ' + e.id);
          const outs = o.p != null ? [o.ok, o.ko] : [o];
          if (o.p != null && !(o.p > 0 && o.p < 1)) errors.push('bad probability ' + e.id);
          for (const out of outs) {
            if (!out || !bi(out.result)) errors.push('missing result ' + e.id + '/' + o.id);
            for (const k of Object.keys((out && out.effects) || {})) if (!EFFECT_KEYS.includes(k)) errors.push('unknown effect ' + k + ' in ' + e.id);
          }
        }
      }
    }
    if (!p.achievements || p.achievements.achievements.length < 150) errors.push('achievements must be at least 150');
    else if (!p.achievements.achievements.some(a => a.metric === 'achievements')) errors.push('platinum trophy missing');
    if (!p.shop || !p.shop.items.length) errors.push('shop missing');
    if (!p.press || !p.press.templates.length) errors.push('press missing');
    if (!p.guide || !p.guide.steps.length) errors.push('guide missing');
    return { ok: !errors.length, errors };
  }

  // Región narrativa: la Liga Boreal masculina (draft, franquicias), Europa, o el resto del mundo.
  function regionOf(s) {
    if (!s) return 'EU';
    if (s.leagueId === 'na-boreal-men') return 'NA';
    const L = CAA.Season && CAA.Season.LEAGUES ? CAA.Season.LEAGUES[s.leagueId] : null;
    return !L || L.continent === 'europe' ? 'EU' : 'WORLD';
  }
  function ensureLife(state) {
    if (!state.life) state.life = { cash: 0, style: 0, xp: 0, achievements: [], equipment: {}, owned: [], appliedBonuses: [], eventHistory: [], pendingEvent: null, press: [], guideStep: 0, counters: { games: 0, points: 0, wins: 0, seasons: 0, ovr: 0, cash: 0, style: 0, events: 0, train: 0, signs: 0, practice: 0 } };
    const life = state.life;
    if (life.pendingPractice == null) life.pendingPractice = null;
    if (!Array.isArray(life.appliedBonuses)) life.appliedBonuses = [];
    if (life.counters.practice == null) life.counters.practice = 0;
    if (!life.flags || typeof life.flags !== 'object' || Array.isArray(life.flags)) life.flags = {};
    if (life.fame == null) life.fame = 0;
    if (life.fans == null) life.fans = 0;
    if (life.agent === undefined) life.agent = null;
    if (life.sponsor === undefined) life.sponsor = null;
    if (life.misfortune == null) life.misfortune = 0;
    if (life.lastOutcome === undefined) life.lastOutcome = null;
    return life;
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function applyEffects(state, effects) {
    const life = ensureLife(state); const p = state.player;
    for (const [k, v] of Object.entries(effects || {})) {
      if (k === 'cash') life.cash = Math.max(0, life.cash + v);
      else if (k === 'style') life.style = Math.max(0, life.style + v);
      else if (k === 'xp') life.xp = Math.max(0, life.xp + v);
      else if (k === 'fame') life.fame = clamp(life.fame + v, 0, 100);
      else if (k === 'fans') life.fans = clamp(life.fans + v, -30, 30);
      else if (k === 'agent') life.agent = AGENTS[v] ? v : null;
      else if (k === 'sponsor') life.sponsor = v || null;
      else if (k === 'flag') life.flags[v] = state.week;
      else if (k === 'unflag') delete life.flags[v];
      else if (p && k === 'morale') p.morale = clamp((p.morale == null ? 70 : p.morale) + v, 0, 100);
      else if (p && k === 'chemistry') p.chemistry = clamp((p.chemistry || 60) + v, 0, 100);
      else if (p && k === 'load') p.load = clamp((p.load || 0) + v, 0, 100);
      else if (p && k === 'fatigue') p.fatigue = clamp((p.fatigue || 0) + v, 0, 1);
      else if (p && k === 'form') p.form = clamp((p.form || 0) + v, -10, 10);
      else if (p && k === 'trust') p.coachTrust = clamp((p.coachTrust == null ? 60 : p.coachTrust) + v, 0, 100);
      else if (p && k === 'confidence') p.confidence = clamp((p.confidence || 0) + v, -8, 8);
      else if (p && k === 'salary' && p.contract) p.contract.salary = Math.round(p.contract.salary * v);
      else if (p && k === 'attr') for (const [a, d] of Object.entries(v)) { if (p.attrs[a] != null) p.attrs[a] = clamp(Math.round((p.attrs[a] + d) * 10) / 10, 20, 99); }
      else if (p && k === 'injure' && !p.injury) p.injury = { type: 'ankle', weeksRemaining: v, gamesMissed: 0 };
      else if (p && k === 'injuryWeeks' && p.injury) p.injury.weeksRemaining = Math.max(0, p.injury.weeksRemaining + v);
      else if (state.coach && (k === 'morale')) state.coach.morale = clamp(state.coach.morale + v, 0, 100);
      else if (state.coach && (k === 'trust' || k === 'board')) state.coach.trust = clamp(state.coach.trust + v, 0, 100);
      else if (['partnerHappiness', 'childBond', 'familyStatus', 'baby'].includes(k)) (CAA.Family || require('./family.js')).applyEffect(state, k, v);
      else if (k === 'locker') { const club = clubOf(state); if (club) for (const r of club.roster) r.morale = clamp((r.morale == null ? 70 : r.morale) + v, 0, 100); }
    }
  }
  function clubOf(state) { return state.season && (state.season.clubsById[state.clubId] || (state.topSeason && state.topSeason.clubsById[state.clubId])); }

  // Contexto de la carrera para condiciones y textos.
  function context(state) {
    const club = clubOf(state); const life = ensureLife(state); const p = state.player;
    const s = state.season;
    let opponent = null;
    if (s && s.round < s.schedule.length) { const g = s.schedule[s.round].games.find(x => x.home === state.clubId || x.away === state.clubId); if (g) opponent = s.clubsById[g.home === state.clubId ? g.away : g.home]; }
    if (!opponent && s && s.results.length) { const r = s.results.filter(x => x.home === state.clubId || x.away === state.clubId).slice(-1)[0]; if (r) opponent = s.clubsById[r.home === state.clubId ? r.away : r.home]; }
    const mates = club ? club.roster.filter(x => !p || x.id !== p.id).slice().sort((a, b) => b.ovr - a.ovr) : [];
    const pickMate = mates.length ? mates[(state.week + (life.counters.events || 0)) % Math.min(5, mates.length)] : null;
    const rival = opponent ? opponent.roster.slice().sort((a, b) => b.ovr - a.ovr)[0] : null;
    const results = s ? s.results.filter(x => x.home === state.clubId || x.away === state.clubId) : [];
    const last = results.slice(-1)[0];
    const lastWon = last ? ((last.home === state.clubId) === (last.score[0] > last.score[1])) : null;
    return {
      club: club ? club.name : '', opponent: opponent ? opponent.name : '', name: p ? p.name : (state.coach ? state.coach.name : ''),
      teammate: pickMate ? pickMate.name : '', star: mates[0] ? mates[0].name : '', rival: rival ? rival.name : '',
      wins: club ? club.wins : 0, losses: club ? club.losses : 0, streak: club ? club.streak : 0, lastWon,
      ovr: p ? p.ovr : 0, age: p ? p.age : 0, number: p && p.number != null ? p.number : 7, salary: p && p.contract ? p.contract.salary : 0,
      contractYears: p && p.contract ? p.contract.years : 0, injured: !!(p && p.injury), injuryWeeks: p && p.injury ? p.injury.weeksRemaining : 0,
      trust: p ? (p.coachTrust == null ? 60 : p.coachTrust) : (state.coach ? state.coach.trust : 60), morale: p ? p.morale : (state.coach ? state.coach.morale : 70),
      load: p ? p.load || 0 : 0, fame: life.fame, route: state.route, mode: state.mode, week: state.week, rounds: s ? s.schedule.length : 0,
      region: regionOf(s), gender: p ? p.gender || 'men' : (s && CAA.Season && CAA.Season.genderOf ? CAA.Season.genderOf(s.leagueId) : 'men'), year: state.year, era: !!state.era, femTeam: !!(s && CAA.Season && CAA.Season.genderOf && CAA.Season.genderOf(s.leagueId) === 'women'), femSelf: !!(p && p.gender === 'women'),
      partner: state.family && state.family.partner ? state.family.partner.name : '', child: state.family && state.family.children.length ? state.family.children[state.family.children.length - 1].name : '',
      legend: state.family && state.family.legends.length ? state.family.legends[state.family.legends.length - 1].name : '', familyStatus: state.family ? state.family.status : 'single',
      children: state.family ? state.family.children.length : 0, oldestChild: state.family && state.family.children.length ? Math.max(...state.family.children.map(c => state.year - c.bornYear)) : 0,
      partnerHappiness: state.family && state.family.partner ? state.family.partner.happiness : 100, generation: state.family ? state.family.generation : 1, agent: life.agent, sponsor: life.sponsor, live: life.counters.live || 0
    };
  }
  function fill(text, ctx) { return String(text).replace(/\{(\w+)\}/g, (_, k) => ctx[k] == null || ctx[k] === '' ? '—' : String(ctx[k])); }
  function fillPair(pair, ctx) {
    if (!pair) return null;
    const out = { es: fill(pair.es, ctx), en: fill(pair.en, ctx) };
    const F = CAA.Fem || (typeof require === 'function' ? require('../core/fem.js') : null);
    return F ? F.pair(out, F.opts(ctx.femTeam, ctx.femSelf, ctx.eventId)) : out;
  }

  function eligible(e, state, ctx, life) {
    const c = e.conditions || {};
    if (c.mode && c.mode !== 'any' && c.mode !== state.mode) return false;
    if (e.once && life.eventHistory.some(h => h.id === e.id)) return false;
    if (c.route && !c.route.includes(state.route)) return false;
    if (c.region && (Array.isArray(c.region) ? !c.region.includes(ctx.region) : c.region !== ctx.region)) return false;
    if (c.minYear != null && state.year < c.minYear) return false;
    if (c.maxYear != null && state.year > c.maxYear) return false;
    if (c.era != null && c.era !== !!state.era) return false;
    if (c.gender && c.gender !== ctx.gender) return false;
    if (c.minWeek != null && state.week < c.minWeek) return false;
    if (c.maxWeek != null && state.week > c.maxWeek) return false;
    if (c.injured != null && c.injured !== ctx.injured) return false;
    if (c.minInjuryWeeks != null && ctx.injuryWeeks < c.minInjuryWeeks) return false;
    if (c.minOvr != null && ctx.ovr < c.minOvr) return false;
    if (c.maxOvr != null && ctx.ovr > c.maxOvr) return false;
    if (c.minAge != null && ctx.age < c.minAge) return false;
    if (c.winStreak != null && ctx.streak < c.winStreak) return false;
    if (c.loseStreak != null && ctx.streak > -c.loseStreak) return false;
    if (c.lastWon != null && ctx.lastWon !== c.lastWon) return false;
    if (c.minLoad != null && ctx.load < c.minLoad) return false;
    if (c.trustBelow != null && ctx.trust >= c.trustBelow) return false;
    if (c.trustAbove != null && ctx.trust <= c.trustAbove) return false;
    if (c.moraleBelow != null && ctx.morale >= c.moraleBelow) return false;
    if (c.minFame != null && ctx.fame < c.minFame) return false;
    if (c.contractYears != null && ctx.contractYears !== c.contractYears) return false;
    if (c.lateSeason && state.week < ctx.rounds * 0.6) return false;
    if (c.agent != null && (c.agent === 'none' ? life.agent : life.agent !== c.agent)) return false;
    if (c.noSponsor && life.sponsor) return false;
    if (c.hasSponsor && !life.sponsor) return false;
    if (c.minLive != null && ctx.live < c.minLive) return false;
    if (c.familyStatus && !c.familyStatus.includes(ctx.familyStatus)) return false;
    if (c.hasChildren && !ctx.children) return false;
    if (c.minChildAge != null && ctx.oldestChild < c.minChildAge) return false;
    if (c.partnerHappyBelow != null && ctx.partnerHappiness >= c.partnerHappyBelow) return false;
    if (c.minGeneration != null && ctx.generation < c.minGeneration) return false;
    if (c.flags && !c.flags.every(f => life.flags[f] != null && state.week - life.flags[f] >= (c.flagDelay || 0))) return false;
    if (c.notFlags && c.notFlags.some(f => life.flags[f] != null)) return false;
    const last = life.eventHistory.slice().reverse().find(h => h.id === e.id);
    if (last && e.cooldownWeeks && state.week - last.week < e.cooldownWeeks && last.year === state.year) return false;
    return true;
  }
  function maybeEvent(state, rng) {
    const life = ensureLife(state); const p = packs();
    if (life.pendingEvent || !p.events) return null;
    const ctx = context(state);
    const all = p.events.events.filter(e => eligible(e, state, ctx, life));
    // Las escenas de historia (agente, renovación, lesión grave…) llegan en cuanto se cumplen; el resto, cada dos semanas.
    const story = all.filter(e => e.story);
    let pool = story;
    if (!pool.length) {
      if (state.week % 2 !== 1) return null;
      const recent = new Set(life.eventHistory.slice(-24).map(e => e.id));
      pool = all.filter(e => !e.story && !recent.has(e.id));
    }
    if (!pool.length) return null;
    const total = pool.reduce((s, e) => s + (e.weight || 1), 0);
    let r = rng.float() * total; let chosen = pool[pool.length - 1];
    for (const e of pool) { r -= (e.weight || 1); if (r <= 0) { chosen = e; break; } }
    life.pendingEvent = { id: chosen.id, week: state.week };
    return chosen;
  }
  function pendingView(state) {
    const life = ensureLife(state); const p = packs();
    if (!life.pendingEvent || !p.events) return null;
    const e = p.events.events.find(x => x.id === life.pendingEvent.id);
    if (!e) return null;
    const ctx = context(state); ctx.eventId = e.id;
    return { id: e.id, category: e.category, story: !!e.story, title: fillPair(e.title, ctx), body: fillPair(e.body, ctx),
      options: e.options.map(o => ({ id: o.id, label: fillPair(o.label, ctx), desc: fillPair(o.desc, ctx), p: o.p == null ? null : o.p,
        effects: o.p == null ? Object.assign({}, o.effects || {}) : null, ok: o.p == null ? null : Object.assign({}, o.ok.effects || {}), ko: o.p == null ? null : Object.assign({}, o.ko.effects || {}) })) };
  }
  function chooseEvent(state, optionId, rngIn) {
    const life = ensureLife(state); const p = packs();
    if (!life.pendingEvent) throw new Error('no pending event');
    const ev = p.events.events.find(e => e.id === life.pendingEvent.id);
    const opt = ev && ev.options.find(o => o.id === optionId);
    if (!opt) throw new Error('invalid option');
    const ctx = context(state); ctx.eventId = ev.id;
    let good = true, out = opt;
    if (opt.p != null) {
      const rng = rngIn || RNG.create(state.seed + ':event:' + state.year + ':' + state.week + ':' + ev.id);
      // Ayuda interna sin anunciar (blp47): tras varios golpes seguidos, la suerte se inclina un poco.
      const pEff = Math.min(0.95, opt.p + (life.misfortune >= 2 ? 0.12 : 0));
      good = rng.float() < pEff;
      out = good ? opt.ok : opt.ko;
    }
    applyEffects(state, out.effects);
    life.misfortune = opt.p == null ? life.misfortune : good ? 0 : life.misfortune + 1;
    life.eventHistory.push({ id: ev.id, option: opt.id, week: state.week, year: state.year, good });
    life.counters.events++;
    if (opt.p != null) life.counters[good ? 'gambleWins' : 'gambleLosses'] = (life.counters[good ? 'gambleWins' : 'gambleLosses'] || 0) + 1;
    life.lastOutcome = { eventId: ev.id, title: fillPair(ev.title, ctx), label: fillPair(opt.label, ctx), result: fillPair(out.result, ctx), good, uncertain: opt.p != null, effects: Object.assign({}, out.effects || {}), week: state.week };
    life.pendingEvent = null;
    return ev;
  }

  // Ingresos semanales: sueldo neto menos comisión del agente; el patrocinio suma dinero y estilo.
  function weeklyIncome(state) {
    const life = ensureLife(state); const p = state.player;
    if (!p || !p.contract) return 0;
    const rounds = state.season ? state.season.schedule.length : 34;
    const agent = AGENTS[life.agent] || { commission: 0 };
    let income = Math.round(p.contract.salary / rounds * 0.35 * (1 - agent.commission));
    if (life.sponsor) { income += 400 + life.fame * 40; life.style += 1; }
    life.cash += income;
    life.counters.earned = (life.counters.earned || 0) + income;
    return income;
  }
  function offerFactor(state) { const life = ensureLife(state); return (AGENTS[life.agent] || { offer: 1 }).offer; }

  function evaluateAchievements(state) {
    const life = ensureLife(state); const p = packs(); const club = clubOf(state);
    const c = life.counters, pl = state.player;
    const tot = pl && pl.career && pl.career.totals ? pl.career.totals : { gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 };
    c.games = pl ? tot.gp : (c.coachGames || state.week);
    c.points = tot.pts; c.rebounds = tot.reb; c.assists = tot.ast; c.steals = tot.stl; c.blocks = tot.blk;
    c.seasonWins = club ? club.wins : 0;
    c.wins = Math.max(c.wins || 0, c.totalWins || 0);
    c.seasons = state.history.length;
    c.ovr = pl ? Math.max(c.ovr || 0, pl.ovr) : 0;
    c.cash = life.cash; c.style = life.style; c.fame = life.fame;
    c.agent = life.agent ? 1 : 0; c.sponsor = life.sponsor ? 1 : 0;
    c.trust = pl ? (pl.coachTrust || 0) : (state.coach ? state.coach.trust : 0);
    const unlocked = [];
    let changed = true;
    while (changed) {
      changed = false;
      c.achievements = life.achievements.length;
      for (const a of p.achievements.achievements) {
        if (life.achievements.includes(a.id)) continue;
        if (a.mode && a.mode !== 'any' && a.mode !== state.mode) continue;
        if ((c[a.metric] || 0) >= a.threshold) { life.achievements.push(a.id); life.style += a.rewardStyle || 0; unlocked.push(a.id); changed = true; }
      }
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
  // Prensa con datos del último partido real (resultado, margen, puntos propios, racha, puesto).
  function press(state) {
    const life = ensureLife(state); const p = packs(); const club = clubOf(state);
    const s = state.season; const id = state.clubId;
    const last = s ? s.results.filter(r => r.home === id || r.away === id).slice(-1)[0] : null;
    const home = last && last.home === id;
    const us = last ? (home ? last.score[0] : last.score[1]) : 0, them = last ? (home ? last.score[1] : last.score[0]) : 0;
    const oppClub = last && s.clubsById[home ? last.away : last.home];
    const table = s ? s.clubs.slice().sort((a, b) => b.wins - a.wins || (b.pf - b.pa) - (a.pf - a.pa) || a.id.localeCompare(b.id)) : [];
    const rank = table.findIndex(c => c.id === id) + 1;
    let myPts = null;
    if (state.player && state.lastMatch && state.lastMatch.box) for (const t of state.lastMatch.box) { const me = t.players.find(x => x.id === state.player.id); if (me) myPts = me.pts; }
    const nxt = s && s.round < s.schedule.length ? s.schedule[s.round].games.find(g => g.home === id || g.away === id) : null;
    const ctx = { club: club ? club.name : '', player: state.player ? state.player.name : '', opponent: oppClub ? oppClub.name : '', us, them, myPts: myPts == null ? 0 : myPts,
      streak: club ? club.streak : 0, streakAbs: club ? Math.abs(club.streak) : 0, rank, next: nxt ? s.clubsById[nxt.home === id ? nxt.away : nxt.home].name : '' };
    const won = last ? us > them : null, margin = Math.abs(us - them);
    const test = c => ({ injury: !!(state.player && state.player.injury), 'my-big': myPts != null && myPts >= 20, 'my-quiet': myPts != null && myPts <= 2 && last != null,
      'win-close': won === true && margin <= 3, 'win-big': won === true && margin >= 15, 'loss-close': won === false && margin <= 3, 'loss-big': won === false && margin >= 15,
      'streak-win': ctx.streak >= 3, 'streak-loss': ctx.streak <= -3, top: last != null && rank > 0 && rank <= 2 && state.week >= 6, bottom: last != null && rank >= table.length - 1 && state.week >= 6,
      win: won === true, loss: won === false, always: true })[c] || false;
    const recent = new Set(life.press.slice(0, 4).map(x => x.id));
    const matching = p.press.templates.filter(t => test(t.condition));
    const t = matching.find(x => !recent.has(x.id)) || matching[0] || p.press.templates[p.press.templates.length - 1];
    const fillT = txt => txt.replace(/\{(\w+)\}/g, (_, k) => ctx[k] == null ? '' : ctx[k]);
    const line = { id: t.id, week: state.week, es: fillT(t.es), en: fillT(t.en) };
    if (life.press[0] && life.press[0].es === line.es) return life.press[0];
    life.press.unshift(line); life.press = life.press.slice(0, 12);
    return line;
  }
  CAA.Content = { packs, validate, ensureLife, applyEffects, context, maybeEvent, pendingView, chooseEvent, weeklyIncome, offerFactor, evaluateAchievements, buy, equip, press, AGENTS, EFFECT_KEYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Content;
})(typeof globalThis !== 'undefined' ? globalThis : this);
