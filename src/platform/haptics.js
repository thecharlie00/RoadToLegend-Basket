(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  // Vibración corta y opcional. Solo patrones discretos: nunca sustituye a un aviso visual.
  const PATTERNS = Object.freeze({
    tap: Object.freeze([8]),
    select: Object.freeze([6]),
    confirm: Object.freeze([10, 28, 10]),
    success: Object.freeze([12, 45, 20]),
    fail: Object.freeze([26, 50, 26]),
    score: Object.freeze([10, 22, 10]),
    buzzer: Object.freeze([60])
  });
  function navigatorOf(win) {
    try { return win && win.navigator ? win.navigator : null; } catch (_) { return null; }
  }
  function canVibrate(win) {
    const nav = navigatorOf(win);
    return !!(nav && typeof nav.vibrate === 'function');
  }
  function pulse(win, kind, enabled) {
    if (enabled === false || !canVibrate(win)) return false;
    const pattern = PATTERNS[kind] || PATTERNS.tap;
    try { return navigatorOf(win).vibrate(Array.from(pattern)) !== false; } catch (_) { return false; }
  }
  CAA.Haptic = { PATTERNS, pulse, canVibrate };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Haptic;
})(typeof globalThis !== 'undefined' ? globalThis : this);
