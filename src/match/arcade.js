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

  // meter: forma del medidor. bar = barra que sube y baja; jump = salto (vale en la cima); ring = aro que se cierra; beat = ritmo.
  const GAMES = {
    freeThrow: { rounds: 10, meter: 'bar', period: 1.6, width: 0.2, shrink: 0.012, attrs: ['tiroLibre'], base: 0.5, gain: 0.42, points: () => 1 },
    three: { rounds: 25, meter: 'bar', period: 1.1, width: 0.16, shrink: 0, attrs: ['tiroTriple'], base: 0.3, gain: 0.5, points: r => (r % 5 === 4 ? 2 : 1) },
    buzzer: { rounds: 5, meter: 'jump', period: 1.2, width: 0.14, shrink: 0.01, attrs: ['tiroTriple', 'clutch'], base: 0.22, gain: 0.55, points: () => 3 },
    dunk: { rounds: 6, meter: 'beat', period: 0.9, width: 0.18, shrink: 0, attrs: ['mate', 'salto'], base: 0.6, gain: 0.35, points: () => 0 },
    defense: { rounds: 8, meter: 'ring', period: 1.2, width: 0.16, shrink: 0.008, attrs: ['robo', 'tapon', 'defExterior'], base: 0.25, gain: 0.55, points: () => 1 },
    street: { rounds: 13, meter: 'bar', period: 1.0, width: 0.16, shrink: 0, attrs: ['manejo', 'tiroMedia', 'defExterior'], base: 0.4, gain: 0.45, points: () => 1 }
  };
  const TYPES = Object.keys(GAMES);

  function skillOf(type, attrs) {
    const keys = GAMES[type].attrs;
    return keys.reduce((s, k) => s + (attrs && attrs[k] != null ? attrs[k] : 50), 0) / keys.length;
  }
  // Centro de la zona buena por ronda: varía con la semilla para que no sea siempre igual.
  function roundSpec(type, seed, round, streak) {
    const g = GAMES[type];
    const r = RNG.create(seed + ':spec:' + round);
    const center = g.meter === 'jump' || g.meter === 'ring' ? 0.5 : 0.5 + (r.float() - 0.5) * 0.36;
    const width = Math.max(0.06, g.width - (streak || 0) * g.shrink);
    const period = g.period * (type === 'three' ? 1 - Math.floor(round / 5) * 0.04 : type === 'street' ? 0.9 + r.float() * 0.25 : 1);
    return { center, width, period, periodTicks: Math.round(period * HZ) };
  }
  // Posición del cursor (0..1) en el tick dado: onda triangular (sube y baja).
  function cursorAt(spec, tick) {
    const ph = (tick % spec.periodTicks) / spec.periodTicks;
    return ph < 0.5 ? ph * 2 : 2 - ph * 2;
  }
  function centerTick(spec) {
    const raw = spec.center / 2 * spec.periodTicks;
    const a = Math.floor(raw), b = Math.ceil(raw);
    return Math.abs(cursorAt(spec, a) - spec.center) <= Math.abs(cursorAt(spec, b) - spec.center) ? a : b;
  }
  function quality(spec, tick) { return clamp(1 - Math.abs(cursorAt(spec, tick) - spec.center) / (spec.width / 2), 0, 1); }

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
    if (type === 'buzzer' && q === 0) p = 0.04; // tiro fuera del salto: casi imposible
    const roll = rng.float();
    const made = roll < p;
    const out = { round, tick, quality: +q.toFixed(3), perfect, p: +p.toFixed(3), made, points: made ? g.points(round) : 0 };
    if (type === 'dunk') {
      // Tres jueces puntúan cada mate (rondas de 3 tiempos). Aquí cada tiempo aporta a la nota.
      out.judge = Math.round(clamp(6 + q * 3.4 + (skill - 50) * 0.03 + (rng.float() - 0.5), 5, 10) * 10) / 10;
      out.points = 0;
    }
    if (type === 'street') out.offense = round % 2 === 0; // pares atacas, impares defiendes
    return out;
  }

  function play(type, seed, ticks, attrs) {
    if (!GAMES[type]) throw new Error('unknown minigame');
    const g = GAMES[type];
    const results = [];
    let streak = 0, score = 0, opp = 0, best = 0;
    const list = Array.isArray(ticks) ? ticks.slice(0, g.rounds) : [];
    for (let i = 0; i < list.length; i++) {
      const r = resolveRound(type, seed, i, list[i], attrs, streak);
      if (type === 'street') {
        // Atacas: anotas si sale. Defiendes: el rival anota si fallas el tiempo de tu defensa.
        if (r.offense) { if (r.made) score += 1; } else if (!r.made) opp += 1;
        r.score = [score, opp];
      } else score += r.points;
      streak = r.made ? streak + 1 : 0; best = Math.max(best, streak);
      results.push(r);
      if (type === 'street' && (score >= 7 || opp >= 7)) break;
    }
    if (type === 'dunk') {
      const dunks = [0, 1].map(d => results.slice(d * 3, d * 3 + 3));
      const totals = dunks.map(b => b.length ? Math.round(b.reduce((s, r) => s + r.judge, 0) / b.length * 3 * 10) / 10 : 0);
      score = Math.round(totals.reduce((a, b) => a + b, 0) * 10) / 10;
    }
    const complete = type === 'street' ? (score >= 7 || opp >= 7 || results.length >= g.rounds) : results.length === g.rounds;
    const won = type === 'street' ? score > opp : null;
    return { type, seed, results, score, opponent: type === 'street' ? opp : null, won, bestStreak: best, perfects: results.filter(r => r.perfect).length, complete,
      hash: Hash.hex32(Hash.hashObject({ type, seed, ticks: list.slice(0, results.length) })) };
  }
  // Modo automático accesible: suelta en el centro de la zona buena de cada ronda (sin penalizar).
  function autoTicks(type, seed, attrs) {
    const g = GAMES[type]; const ticks = []; let streak = 0;
    for (let i = 0; i < g.rounds; i++) {
      const spec = roundSpec(type, seed, i, streak);
      // Equivale a un buen timing humano (calidad 0,6), no al perfecto: jugar a mano sigue mereciendo la pena.
      const pos = clamp(spec.center + spec.width / 2 * 0.4, 0, 1);
      ticks.push(Math.round(pos / 2 * spec.periodTicks));
      const r = resolveRound(type, seed, i, ticks[i], attrs, streak);
      streak = r.made ? streak + 1 : 0;
    }
    return ticks;
  }
  // Recompensas (estilo, experiencia, forma) según la puntuación: escalas por juego.
  function rewards(type, res) {
    const max = { freeThrow: 10, three: 30, buzzer: 15, dunk: 60, defense: 8, street: 7 }[type];
    const ratio = clamp((type === 'dunk' ? (res.score - 30) / 30 : res.score / max), 0, 1);
    return { style: Math.round(2 + ratio * 10), xp: Math.round(2 + ratio * 6), form: ratio >= 0.7 ? 1 : 0, ratio: +ratio.toFixed(3) };
  }

  CAA.Arcade = { HZ, GAMES, TYPES, roundSpec, cursorAt, centerTick, quality, resolveRound, play, autoTicks, rewards, skillOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Arcade;
})(typeof globalThis !== 'undefined' ? globalThis : this);
