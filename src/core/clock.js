(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const STEP_MS = 100;

  function createFixedStep(stepMs = STEP_MS) {
    let acc = 0;
    let ticks = 0;
    function advance(deltaMs, onTick) {
      if (!Number.isFinite(deltaMs) || deltaMs < 0) throw new RangeError('invalid delta');
      acc += deltaMs;
      let n = 0;
      while (acc >= stepMs) {
        acc -= stepMs;
        ticks++;
        n++;
        if (onTick) onTick(ticks, stepMs);
      }
      return n;
    }
    function reset() { acc = 0; ticks = 0; }
    function snapshot() { return { acc, ticks, stepMs }; }
    return { advance, reset, snapshot };
  }

  function createMatchClock(config = {}) {
    const periods = config.periods || 4;
    const periodTenths = (config.periodMinutes || 10) * 60 * 10;
    const shotTenths = (config.shotSeconds || 24) * 10;
    let period = 1;
    let game = periodTenths;
    let shot = shotTenths;
    let running = false;

    function tick() {
      if (!running) return { period, game, shot, ended: false };
      if (game > 0) game--;
      if (shot > 0) shot--;
      const ended = game === 0;
      if (ended) running = false;
      return { period, game, shot, ended };
    }

    function start() { running = true; }
    function stop() { running = false; }
    function resetShot(seconds) { shot = Math.round((seconds == null ? config.shotSeconds || 24 : seconds) * 10); }
    function nextPeriod() {
      if (period >= periods) return false;
      period++;
      game = periodTenths;
      shot = shotTenths;
      running = false;
      return true;
    }
    function snapshot() { return { period, game, shot, running, periods, periodTenths, shotTenths }; }
    function restore(s) {
      period = s.period; game = s.game; shot = s.shot; running = !!s.running;
    }
    return { tick, start, stop, resetShot, nextPeriod, snapshot, restore };
  }

  CAA.Clock = { STEP_MS, createFixedStep, createMatchClock };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Clock;
})(typeof globalThis !== 'undefined' ? globalThis : this);
