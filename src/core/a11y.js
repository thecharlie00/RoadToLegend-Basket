(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const DEFAULTS = Object.freeze({ fontSize: 0, colorMode: 'standard', reducedMotion: 'system', vibration: true, audio: false, highContrast: false });
  function normalize(settings) {
    const s = Object.assign({}, DEFAULTS, settings || {});
    s.fontSize = [0, 1, 2].includes(+s.fontSize) ? +s.fontSize : 0;
    s.colorMode = s.colorMode === 'blue-orange' ? 'blue-orange' : 'standard';
    s.reducedMotion = ['system', 'reduced', 'full'].includes(s.reducedMotion) ? s.reducedMotion : 'system';
    s.vibration = !!s.vibration; s.audio = !!s.audio; s.highContrast = !!s.highContrast;
    return s;
  }
  function reduced(settings) {
    const s = normalize(settings);
    return s.reducedMotion === 'reduced' || (s.reducedMotion === 'system' && typeof root.matchMedia === 'function' && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function apply(settings, doc) {
    const s = normalize(settings), el = doc && doc.documentElement;
    if (!el) return s;
    el.classList.toggle('fs-1', s.fontSize === 1); el.classList.toggle('fs-2', s.fontSize === 2);
    el.classList.toggle('cb', s.colorMode === 'blue-orange'); el.classList.toggle('hc', s.highContrast);
    el.classList.toggle('rm', reduced(s));
    el.dataset.vibration = s.vibration ? 'on' : 'off'; el.dataset.audio = s.audio ? 'on' : 'off';
    return s;
  }
  // WAI-ARIA tabs: one tab stop, arrows wrap, Home/End move to the ends.
  function tabKey(key, current, count) {
    if (key === 'ArrowRight') return (current + 1) % count;
    if (key === 'ArrowLeft') return (current + count - 1) % count;
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    return null;
  }
  CAA.A11Y = { DEFAULTS, normalize, reduced, apply, tabKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.A11Y;
})(typeof globalThis !== 'undefined' ? globalThis : this);
