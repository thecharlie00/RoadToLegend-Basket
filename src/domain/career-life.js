(function (root) {
  'use strict';
  // Carrera · vida del jugador/a: decisiones, tienda, equipamiento, mascota, práctica, minijuegos y guía.
  // Parte de career.js: lo compartido (otras partes, módulos de dominio, record, clubOf…) llega en `K`.
  const CAA = root.CAA = root.CAA || {};
  CAA.CareerParts = CAA.CareerParts || {};
  CAA.CareerParts["life"] = function (K) {
    const { Arcade, Content, Gear, Minigames, Pet, RNG, record } = K;
    function chooseEvent(state, optionId) {
      const ev = Content.chooseEvent(state, optionId);
      if (state.family) K.familyCounters(state);
      Content.evaluateAchievements(state);
      record(state, { type: 'event', id: ev.id, option: optionId });
      return state;
    }
    function buyItem(state, itemId) {
      const item = Content.buy(state, itemId);
      record(state, { type: 'buy', itemId });
      return item;
    }
    function equipItem(state, itemId) {
      const item = Content.equip(state, itemId);
      record(state, { type: 'equip', itemId });
      return item;
    }
    function beginPractice(state, config = {}) {
      const life = Content.ensureLife(state);
      if (life.pendingPractice) return life.pendingPractice;
      const attempt = life.counters.practice++;
      const type = config.type === 'buzzer' ? 'buzzer' : 'freeThrow';
      life.pendingPractice = { id: state.week + ':' + attempt, type, attempt, week: state.week,
        seed: state.seed + ':practice:' + state.week + ':' + attempt,
        skill: state.player ? state.player.attrs.tiroLibre : 50 };
      record(state, { type: 'practiceCommit', id: life.pendingPractice.id, minigame: type });
      return life.pendingPractice;
    }
    function resolvePractice(state, config = {}) {
      const life = Content.ensureLife(state);
      const pending = life.pendingPractice;
      if (!pending || (config.id && config.id !== pending.id)) throw new Error('no matching committed practice');
      // Only release timing is accepted from the UI; seed, skill and attempt are immutable.
      const cfg = Object.assign({}, pending, { releaseTick: config.releaseTick, auto: !!config.auto });
      const result = cfg.auto ? Minigames.auto(cfg) : (pending.type === 'buzzer' ? Minigames.buzzer(cfg) : Minigames.freeThrow(cfg));
      life.xp += result.made ? 3 : 1;
      if (K.Rpg) K.Rpg.gain(state, result.made ? 4 : 1, 'practice');
      if (state.player) { state.player.form = Math.max(-10, Math.min(10, (state.player.form || 0) + (result.made ? 1 : 0))); state.player.load = Math.min(100, state.player.load + 2); }
      life.pendingPractice = null;
      record(state, { type: 'practice', minigame: pending.type, made: result.made, hash: result.hash });
      return result;
    }
    function cancelPractice(state) {
      const life = Content.ensureLife(state);
      if (life.pendingPractice) { record(state, { type: 'practiceCancel', id: life.pendingPractice.id }); life.pendingPractice = null; }
      return state;
    }
    // Minijuegos arcade: la sesión (semilla) se compromete al empezar; cerrar la app no permite repetir.
    // Mascota: acciones de la semana, concurso, tienda y equipamiento.
    function petCounters(state) {
      const life = Content.ensureLife(state), pet = state.pet, c = life.counters;
      if (!pet) return;
      c.petTricks = Pet.learned(pet).length; c.petContestsWon = pet.contests.won; c.petWalks = pet.walks; c.petBond = pet.bond; c.pet = 1;
      Content.evaluateAchievements(state);
    }
    function gearOp(state, config = {}) {
      Content.ensureLife(state);
      const out = Gear.op(state, config);
      record(state, { type: 'gear', op: config.op, item: config.itemId || null });
      Content.evaluateAchievements(state);
      return out;
    }
    function petOp(state, config = {}) {
      const life = Content.ensureLife(state);
      let out = null;
      if (config.op === 'adopt') out = Pet.adopt(state, config, life);
      else if (config.op === 'act') out = Pet.act(state, life, config);
      else if (config.op === 'contest') out = Pet.contest(state, life, config);
      else if (config.op === 'buy') out = Pet.buy(state, life, config.item);
      else if (config.op === 'supply') out = Pet.buySupply(state, life, config.item);
      else if (config.op === 'equip') out = Pet.equip(state, config.item);
      else if (config.op === 'rename') out = Pet.rename(state, config.name);
      else if (config.op === 'coat') out = Pet.setCoat(state, config.coat);
      else if (config.op === 'bg') out = Pet.setBg(state, config.bg);
      else if (config.op === 'speak') out = Pet.speak(state);
      else throw new Error('unknown pet op');
      petCounters(state);
      record(state, { type: 'pet', op: config.op, action: config.action || null, trick: config.trick || null, item: config.item || null, route: config.route || null, tier: config.tier || null, toy: config.toy || null, food: config.food || null });
      return out;
    }
    function arcadeAttrs(state) { return state.player ? state.player.attrs : {}; }
    // Retos semanales de minijuegos (como los retos de sp-modes del fútbol): tres por semana, deterministas.
    const ARCADE_CH = [['freeThrow', 8], ['freeThrow', 10], ['three', 16], ['three', 20], ['buzzer', 6], ['buzzer', 9], ['dunk', 45], ['dunk', 52], ['defense', 5], ['defense', 7], ['street', 7]];
    function arcadeChallenges(state) {
      const life = Content.ensureLife(state); life.arcade = life.arcade || { best: {}, plays: {} };
      const key = state.year + ':' + state.week;
      if (!life.arcade.ch || life.arcade.ch.key !== key) {
        const rng = RNG.create(state.seed + ':arcade-ch:' + key), pool = ARCADE_CH.slice(), list = [];
        while (list.length < 3 && pool.length) { const [type, target] = pool.splice(rng.int(0, pool.length - 1), 1)[0]; if (!list.some(c => c.type === type)) list.push({ type, target, done: false }); }
        life.arcade.ch = { key, list };
      }
      return life.arcade.ch.list;
    }
    // Concurso del All-Star (equivalente a la tanda del fútbol): triples o mates contra tres jugadores reales de tu liga.
    const CONTEST_TYPES = ['three', 'dunk'];
    function contestRivals(state, type) {
      const others = state.season.clubs.filter(c => c.id !== state.clubId).flatMap(c => c.roster.map(p => ({ p, club: c.name })));
      const key = type === 'three' ? 'tiroTriple' : 'mate';
      return others.sort((a, b) => (b.p.attrs[key] || 0) - (a.p.attrs[key] || 0) || a.p.id.localeCompare(b.p.id)).slice(0, 3);
    }
    function arcadeStart(state, config = {}) {
      const life = Content.ensureLife(state);
      if (life.pendingArcade) return life.pendingArcade;
      if (!Arcade.GAMES[config.type]) throw new Error('unknown minigame');
      const diff = Arcade.DIFF[config.diff] ? config.diff : 'normal';
      const contest = !!config.contest;
      if (contest) {
        if (!CONTEST_TYPES.includes(config.type)) throw new Error('no contest for this minigame');
        life.arcade = life.arcade || { best: {}, plays: {} };
        if ((life.arcade.contests || {})[state.year + ':' + config.type]) throw new Error('contest already played this season');
      }
      life.arcadeSeq = (life.arcadeSeq || 0) + 1;
      life.pendingArcade = { type: config.type, seed: state.seed + ':arcade:' + life.arcadeSeq + (contest ? ':allstar' : '') + (diff !== 'normal' && !contest ? ':' + diff : ''), week: state.week, seq: life.arcadeSeq, contest, diff: contest ? 'normal' : diff };
      record(state, { type: 'arcadeCommit', minigame: config.type, seq: life.arcadeSeq, diff, contest });
      return life.pendingArcade;
    }
    function arcadeFinish(state, config = {}) {
      const life = Content.ensureLife(state);
      const pend = life.pendingArcade;
      if (!pend) throw new Error('no committed minigame');
      const attrs = arcadeAttrs(state);
      const ticks = config.auto ? Arcade.autoTicks(pend.type, pend.seed, attrs) : config.ticks;
      const res = Arcade.play(pend.type, pend.seed, ticks, attrs);
      if (!res.complete) throw new Error('minigame not complete');
      const rw = Arcade.rewards(pend.type, res);
      life.style += rw.style; life.xp += rw.xp;
      if (state.player) { state.player.form = Math.max(-10, Math.min(10, (state.player.form || 0) + rw.form)); state.player.load = Math.min(100, (state.player.load || 0) + 2); }
      life.arcade = life.arcade || { best: {}, plays: {} };
      const prev = life.arcade.best[pend.type];
      const record_ = prev == null || res.score > prev;
      if (record_) life.arcade.best[pend.type] = res.score;
      life.arcade.plays[pend.type] = (life.arcade.plays[pend.type] || 0) + 1;
      // Estadísticas por juego (media y acierto) y retos semanales.
      const st = (life.arcade.stats = life.arcade.stats || {})[pend.type] || (life.arcade.stats[pend.type] = { plays: 0, sum: 0, hits: 0, rounds: 0 });
      st.plays++; st.sum = Math.round((st.sum + res.score) * 10) / 10; st.hits += res.results.filter(r => r.made).length; st.rounds += res.results.length;
      const challenges = [];
      if (!config.auto) for (const ch of arcadeChallenges(state)) if (!ch.done && ch.type === pend.type && (pend.type === 'street' ? res.won && res.score >= ch.target : res.score >= ch.target)) {
        ch.done = true; life.style += 8; life.cash += 500; challenges.push(ch); c.arcadeChallenges = (c.arcadeChallenges || 0) + 1;
      }
      // Concurso del All-Star: rivales reales de la liga con su propio tiro (deterministas).
      let contest = null;
      if (pend.contest) {
        const rivals = contestRivals(state, pend.type).map((x, i) => { const at = x.p.attrs, sd = pend.seed + ':rival:' + i; const r = Arcade.play(pend.type, sd, Arcade.autoTicks(pend.type, sd, at), at); return { name: x.p.name, club: x.club, score: r.score }; });
        const place = 1 + rivals.filter(r => r.score > res.score).length;
        const prize = { 1: [30, 5000], 2: [15, 2000], 3: [8, 800], 4: [2, 0] }[place];
        life.style += prize[0]; life.cash += prize[1];
        if (place === 1) { c.allStarWins = (c.allStarWins || 0) + 1; life.fame = Math.min(100, (life.fame || 0) + 4); }
        contest = { rivals, place, prize: { style: prize[0], cash: prize[1] } };
        (life.arcade.contests = life.arcade.contests || {})[state.year + ':' + pend.type] = { place, score: res.score };
      }
      const c = life.counters;
      c.arcadePlays = (c.arcadePlays || 0) + 1;
      c['best_' + pend.type] = Math.max(c['best_' + pend.type] || 0, res.score);
      if (pend.type === 'street' && res.won) c.streetWins = (c.streetWins || 0) + 1;
      c.perfects = (c.perfects || 0) + res.perfects;
      life.pendingArcade = null;
      Content.evaluateAchievements(state);
      record(state, { type: 'arcade', minigame: pend.type, score: res.score, hash: res.hash });
      return Object.assign({ rewards: rw, record: record_, previous: prev == null ? null : prev, auto: !!config.auto, challenges, contest, diff: pend.diff || 'normal' }, res);
    }
    function arcadeCancel(state) {
      const life = Content.ensureLife(state);
      if (life.pendingArcade) { record(state, { type: 'arcadeCancel', seq: life.pendingArcade.seq }); life.pendingArcade = null; }
      return state;
    }
    function practice(state, config = {}) { beginPractice(state, config); return resolvePractice(state, config); }
    function nextGuide(state) {
      const life = Content.ensureLife(state);
      const total = Content.packs().guide.steps.length;
      life.guideStep = Math.min(total - 1, life.guideStep + 1);
      record(state, { type: 'guide', step: life.guideStep });
      return life.guideStep;
    }
    return { chooseEvent, buyItem, equipItem, beginPractice, resolvePractice, cancelPractice, petCounters, petOp, gearOp, arcadeAttrs, ARCADE_CH, arcadeChallenges, CONTEST_TYPES, contestRivals, arcadeStart, arcadeFinish, arcadeCancel, practice, nextGuide };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
