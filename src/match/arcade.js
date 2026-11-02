(function (root) {
  'use strict';
  // Minijuegos arcade (paridad con minigame/shootout/sp-* del fútbol). Lógica pura y determinista:
  // el resultado de cada ronda depende del instante en que el jugador suelta (tick a 60 Hz),
  // de sus atributos y de una semilla comprometida al empezar la sesión. El render no decide nada.
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const Hash = CAA.Hash || (typeof require === 'function' ? require('../core/hash.js') : null);
  const HZ = 60;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  // Cada juego tiene una MECÁNICA de entrada distinta, no solo un texto distinto:
  //   pulse  (tiro libre)  → marcador que rebota en una barra de potencia; 10 tiros.
  //   sweep  (triples)     → el cursor barre en un solo sentido, 5 racks de 5 con bola de dinero.
  //   rise   (bocina)      → la potencia sube una sola vez; hay que soltar en el aire, antes de la bocina.
  //   beat   (mates)       → tres tiempos por mate (ritmo), dos mates; puntúan los jueces.
  //   react  (defensa)     → no hay cursor: el rival arranca y tú tienes una ventana para reaccionar.
  //   read   (1×1 calle)   → el defensor se inclina a un lado; hay que cruzar al lado libre.
  // El motor sigue siendo puro y determinista: el render solo dibuja el estado.
  const GAMES = {
    freeThrow: { rounds: 10, meter: 'bar', motion: 'bounce', mech: 'bounce', period: 1.5, width: 0.2, shrink: 0.012, attrs: ['tiroLibre'], base: 0.55, gain: 0.4, max: 10, points: () => 1 },
    three: { rounds: 25, meter: 'rack', motion: 'sweep', mech: 'sweep', period: 1.05, width: 0.15, shrink: 0, attrs: ['tiroTriple'], base: 0.3, gain: 0.5, max: 30, rack: 5, points: r => (r % 5 === 4 ? 2 : 1) },
    buzzer: { rounds: 5, meter: 'arc', motion: 'rise', mech: 'rise', period: 1.6, width: 0.15, shrink: 0.008, attrs: ['tiroTriple', 'clutch'], base: 0.26, gain: 0.62, max: 15, center: 0.88, points: () => 3 },
    dunk: { rounds: 6, meter: 'beat', motion: 'beat', mech: 'beat', period: 0.85, width: 0.19, shrink: 0, attrs: ['mate', 'salto'], base: 0.62, gain: 0.34, max: 65, judges: true, points: () => 0 },
    defense: { rounds: 8, meter: 'react', motion: 'react', mech: 'react', period: 1.3, width: 0.2, shrink: 0.006, attrs: ['robo', 'tapon', 'defExterior'], base: 0.22, gain: 0.6, max: 8, points: () => 1, reaction: 0.3 },
    street: { rounds: 13, meter: 'lane', motion: 'bounce', mech: 'read', period: 1, width: 0.17, shrink: 0, attrs: ['manejo', 'tiroMedia', 'defExterior'], base: 0.38, gain: 0.5, max: 7, read: true, points: () => 1 }
  };
  const TYPES = Object.keys(GAMES);

  function skillOf(type, attrs) {
    const keys = GAMES[type].attrs;
    return keys.reduce((s, k) => s + (attrs && attrs[k] != null ? attrs[k] : 50), 0) / keys.length;
  }
  // Dificultad: va codificada al final de la semilla de la sesión (…:easy / …:hard), así el render y el motor la ven igual.
  const DIFF = { easy: { width: 1.4, reward: 0.7 }, normal: { width: 1, reward: 1 }, hard: { width: 0.72, reward: 1.5 } };
  function diffOf(seed) { const m = /:(easy|hard)$/.exec(String(seed)); return m ? m[1] : 'normal'; }
  function reactionTicks() { return Math.round(GAMES.defense.reaction * HZ); }

  // Especificación de una ronda: zona buena, velocidad y, cuando toca, el instante del estímulo.
  function roundSpec(type, seed, round, streak) {
    const g = GAMES[type];
    const dw = DIFF[diffOf(seed)].width;
    // En el 1×1 el rival es el mismo durante la posesión de ataque y la de defensa: comparten inclinación.
    const r = RNG.create(seed + ':spec:' + (g.read ? Math.floor(round / 2) : round));
    const width = Math.max(0.06, (g.width - (streak || 0) * g.shrink) * dw);
    let center = 0.5, lean = null;
    if (g.motion === 'bounce' || g.motion === 'sweep') center = 0.5 + (r.float() - 0.5) * 0.36;
    if (g.motion === 'rise') center = g.center;
    if (g.read) {
      lean = r.float() < 0.5 ? 'left' : 'right';
      // Atacas: cruzas al lado contrario al peso del defensor. Defiendes: te pones de ese mismo lado.
      const offend = round % 2 === 0;
      center = (lean === 'left') === offend ? 0.74 : 0.26;
    }
    const period = g.period * (type === 'three' ? 1 - Math.floor(round / 5) * 0.04 : type === 'street' ? 0.9 + r.float() * 0.25 : 1);
    const periodTicks = Math.round(period * HZ);
    const cueTick = g.motion === 'react' ? Math.round((0.32 + r.float() * 0.55) * periodTicks) : null;
    const deadlineTicks = g.motion === 'react' ? cueTick + reactionTicks() * 2 : g.motion === 'rise' ? periodTicks : Math.round(periodTicks * 1.25);
    return { center, width, period, periodTicks, motion: g.read ? 'read' : g.motion, mech: g.mech || g.motion, lean, cueTick, deadlineTicks, reaction: g.motion === 'react' ? reactionTicks() : null, rack: g.rack || null, judge: !!g.judges, mode: g.read ? (round % 2 === 0 ? 'offense' : 'defense') : null };
  }
  // Posición normalizada 0..1 del cursor (o progreso hacia el estímulo en «react»).
  function cursorAt(spec, tick) {
    const p = (tick % spec.periodTicks) / spec.periodTicks;
    if (spec.motion === 'sweep') return p;
    if (spec.motion === 'rise') return p; // la fuerza sube una vez y llega arriba justo con la bocina
    if (spec.motion === 'react') return Math.min(1, tick / Math.max(1, spec.cueTick));
    return p < 0.5 ? p * 2 : 2 - p * 2;
  }
  // Calidad del gesto (0..1) según la mecánica de cada juego.
  function quality(spec, tick) {
    const t = Math.max(0, Math.round(Number.isFinite(tick) ? tick : 0));
    if (spec.motion === 'react') {
      if (t < spec.cueTick) return 0; // te adelantaste: el rival aún no se había movido
      return clamp(1 - (t - spec.cueTick) / Math.max(1, spec.reaction), 0, 1);
    }
    if (spec.motion === 'rise' && t > spec.periodTicks) return 0; // sonó la bocina
    return clamp(1 - Math.abs(cursorAt(spec, t) - spec.center) / (spec.width / 2), 0, 1);
  }
  // Instante que maximiza la calidad (lo usan la auto-partida y los rivales del All-Star).
  function centerTick(spec) {
    let best = 0, bestQ = -1;
    const end = spec.motion === 'react' ? spec.cueTick + spec.reaction : spec.periodTicks;
    for (let t = 0; t <= end; t++) { const q = quality(spec, t); if (q > bestQ) { bestQ = q; best = t; } }
    return best;
  }

  // Una ronda. ctx: { score:[a,b] } para el 1×1 (posesiones alternas).
  function resolveRound(type, seed, round, releaseTick, attrs, streak) {
    const g = GAMES[type];
    const spec = roundSpec(type, seed, round, streak);
    const tick = Math.max(0, Math.round(Number.isFinite(releaseTick) ? releaseTick : 0));
    const q = quality(spec, tick);
    const skill = skillOf(type, attrs);
    const rng = RNG.create(seed + ':r:' + round + ':' + tick);
    const perfect = q >= 0.85;
    let p = clamp(g.base + (skill - 50) * 0.006 + q * g.gain - (q < 0.15 ? 0.15 : 0) + (perfect ? 0.08 : 0), 0.02, 0.98);
    if (type === 'buzzer' && tick >= spec.periodTicks) p = 0.02; // después de la bocina no vale
    const roll = rng.float();
    const made = roll < p;
    const grade = perfect ? 'perfect' : q >= 0.55 ? 'great' : q > 0 ? 'good' : 'miss';
    const out = { round, tick, quality: +q.toFixed(3), perfect, grade, p: +p.toFixed(3), made, points: made ? g.points(round) : 0, lane: spec.lean, cue: spec.cueTick };
    if (type === 'dunk') {
      // Tres jueces puntúan cada tiempo; cada mate son tres tiempos.
      out.judge = Math.round(clamp(6 + q * 3.4 + (skill - 50) * 0.03 + (rng.float() - 0.5), 5, 10) * 10) / 10;
      out.points = 0;
      out.beat = round % 3;
      out.dunk = Math.floor(round / 3);
    }
    if (type === 'street') out.offense = round % 2 === 0; // pares atacas, impares defiendes
    return out;
  }

  function play(type, seed, ticks, attrs) {
    if (!GAMES[type]) throw new Error('unknown minigame');
    const g = GAMES[type];
    const results = [];
    let streak = 0, score = 0, opp = 0, best = 0, combo = 0, bestCombo = 0;
    const list = Array.isArray(ticks) ? ticks.slice(0, g.rounds) : [];
    for (let i = 0; i < list.length; i++) {
      const r = resolveRound(type, seed, i, list[i], attrs, streak);
      if (type === 'street') {
        // Atacas: anotas si sale. Defiendes: el rival anota si fallas el tiempo de tu defensa.
        if (r.offense) { if (r.made) score += 1; } else if (!r.made) opp += 1;
        r.score = [score, opp];
      } else score += r.points;
      combo = r.made ? combo + 1 : 0; bestCombo = Math.max(bestCombo, combo);
      streak = r.made ? streak + 1 : 0; best = Math.max(best, streak);
      results.push(r);
      if (type === 'street' && (score >= 7 || opp >= 7)) break;
    }
    if (type === 'dunk') {
      const dunks = [0, 1].map(d => results.slice(d * 3, d * 3 + 3));
      const totals = dunks.map(b => b.length ? Math.round(b.reduce((s, r) => s + r.judge, 0) / b.length * 3 * 10) / 10 : 0);
      // Bonus de ritmo: los tres tiempos bien encajados suben la nota del mate.
      const rhythm = dunks.map(b => b.length === 3 && b.every(r => r.quality >= 0.7) ? 3 : 0);
      score = Math.round((totals.reduce((a, b) => a + b, 0) + rhythm.reduce((a, b) => a + b, 0)) * 10) / 10;
      results.forEach((r, i) => { r.dunkScore = totals[Math.floor(i / 3)]; });
    }
    const complete = type === 'street' ? (score >= 7 || opp >= 7 || results.length >= g.rounds) : results.length === g.rounds;
    const won = type === 'street' ? score > opp : null;
    return { type, seed, results, score, opponent: type === 'street' ? opp : null, won, bestStreak: best, bestCombo, perfects: results.filter(r => r.perfect).length,
      makes: results.filter(r => r.made).length, shots: results.length, complete,
      hash: Hash.hex32(Hash.hashObject({ type, seed, ticks: list.slice(0, results.length) })) };
  }
  // Modo automático accesible: elige un gesto bueno (calidad ≈ 0,6), nunca perfecto.
  // Busca el tick cuya calidad quede más cerca de 0,6 para que valga igual en todas las mecánicas.
  function autoTicks(type, seed, attrs) {
    const g = GAMES[type]; const ticks = []; let streak = 0;
    for (let i = 0; i < g.rounds; i++) {
      const spec = roundSpec(type, seed, i, streak);
      let pick = centerTick(spec), score = Infinity;
      const end = spec.motion === 'react' ? spec.cueTick + spec.reaction : spec.periodTicks;
      for (let t = 0; t <= end; t++) { const d = Math.abs(quality(spec, t) - 0.6); if (d < score) { score = d; pick = t; } }
      ticks.push(pick);
      const r = resolveRound(type, seed, i, ticks[i], attrs, streak);
      streak = r.made ? streak + 1 : 0;
    }
    return ticks;
  }
  // Recompensas (estilo, experiencia, forma) según la puntuación: escalas por juego.
  function rewards(type, res) {
    const max = GAMES[type].max;
    const ratio = clamp((type === 'dunk' ? (res.score - 30) / 30 : res.score / max), 0, 1);
    const k = DIFF[diffOf(res.seed)].reward;
    return { style: Math.round((2 + ratio * 10) * k), xp: Math.round((2 + ratio * 6) * k), form: ratio >= 0.7 ? 1 : 0, ratio: +ratio.toFixed(3) };
  }

  CAA.Arcade = { HZ, GAMES, TYPES, DIFF, diffOf, roundSpec, cursorAt, centerTick, quality, resolveRound, play, autoTicks, rewards, skillOf, reactionTicks };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Arcade;
})(typeof globalThis !== 'undefined' ? globalThis : this);
