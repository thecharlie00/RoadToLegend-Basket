(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const HZ = 60;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function finite(v, fallback, min, max) { return typeof v === 'number' && Number.isFinite(v) ? clamp(v, min, max) : fallback; }
  // Entrada precomprometida a 60 Hz. El render no añade aleatoriedad.
  function freeThrow(config = {}) {
    const seed = config.seed == null ? 'ft' : config.seed;
    const skill = finite(config.skill, 50, 0, 100);
    const releaseTick = Math.round(finite(config.releaseTick, 0, 0, 216000));
    const targetTick = Math.round(finite(config.targetSeconds, 1.2, 0.2, 10) * HZ);
    const windowTicks = Math.round(finite(config.windowSeconds, 0.12, 0.05, 1) * HZ);
    const error = Math.abs(releaseTick - targetTick);
    const timing = clamp(1 - error / Math.max(1, windowTicks * 3), 0, 1);
    const p = clamp(0.5 + (skill - 50) * 0.006 + timing * 0.25 - (1 - timing) * 0.2, 0.05, 0.97);
    const rng = RNG.create(seed + ':ft:' + releaseTick);
    const made = rng.float() < p;
    return { type: 'freeThrow', releaseTick, targetTick, timing: +timing.toFixed(3), p: +p.toFixed(3), made, hash: CAA.Hash ? CAA.Hash.hex32(CAA.Hash.hashObject({ seed, releaseTick, made })) : null };
  }
  function buzzer(config = {}) {
    const seed = config.seed == null ? 'buzzer' : config.seed;
    const clockTicks = Math.round(finite(config.clockSeconds, 2, 0.1, 60) * HZ);
    const releaseTick = Math.round(finite(config.releaseTick, 0, 0, 216000));
    const skill = finite(config.skill, 50, 0, 100);
    const legal = releaseTick < clockTicks;
    const early = clamp((clockTicks - releaseTick) / clockTicks, 0, 1);
    const p = legal ? clamp(0.2 + (skill - 50) * 0.005 + early * 0.15, 0.03, 0.75) : 0;
    const rng = RNG.create(seed + ':buzzer:' + releaseTick);
    const made = legal && rng.float() < p;
    return { type: 'buzzer', releaseTick, clockTicks, legal, p: +p.toFixed(3), made, hash: CAA.Hash ? CAA.Hash.hex32(CAA.Hash.hashObject({ seed, releaseTick, made })) : null };
  }
  function auto(config = {}) {
    // Alternativa automática: usa el centro de la ventana legal, no penaliza accesibilidad.
    if (config.type === 'buzzer') return buzzer(Object.assign({}, config, { releaseTick: Math.round(finite(config.clockSeconds, 2, 0.1, 60) * HZ * 0.5) }));
    return freeThrow(Object.assign({}, config, { releaseTick: Math.round(finite(config.targetSeconds, 1.2, 0.2, 10) * HZ) }));
  }
  CAA.Minigames = { HZ, freeThrow, buzzer, auto };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Minigames;
})(typeof globalThis !== 'undefined' ? globalThis : this);
