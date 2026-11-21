(function (root) {
  'use strict';
  // Google Play desde la página (paridad con el fútbol): anuncios en transiciones seguras, versión nueva,
  // opciones de privacidad y petición de valoración. Todo pasa por la app de Android; en la web no hace nada.
  const CAA = root.CAA = root.CAA || {};
  const RATE_KEY = 'caa.rate.v1';
  const RATE_AFTER_MS = 15 * 60 * 1000, RATE_SNOOZE_MS = 14 * 24 * 3600 * 1000, RATE_MAX = 3;
  const PLACEMENTS = ['menu', 'career_start', 'match_start', 'season_end', 'retire'];
  function bridge(win) { try { const b = win && win.CAAAndroid; return b && typeof b.showAd === 'function' ? b : null; } catch (_) { return null; } }
  const call = (win, fn, fallback, ...args) => { const b = bridge(win); try { return b && typeof b[fn] === 'function' ? b[fn](...args) : fallback; } catch (_) { return fallback; } };
  function showAd(win, where) { if (!PLACEMENTS.includes(where)) return false; return call(win, 'showAd', false, where) !== false && !!bridge(win); }
  const adShowing = win => !!call(win, 'isFullScreenAdShowing', false);
  const updateAvailable = win => Number(call(win, 'updateAvailable', 0)) || 0;
  const openStore = win => call(win, 'openStore', null);
  const privacyRequired = win => !!call(win, 'privacyOptionsRequired', false);
  const showPrivacy = win => call(win, 'showPrivacyOptions', null);

  // Valoración: tras 15 minutos de juego activo, como mucho 3 veces y con 14 días entre una y otra.
  let memory = null;
  function rateState() {
    if (memory) return memory;
    try { const v = JSON.parse(root.localStorage.getItem(RATE_KEY) || 'null'); if (v && typeof v === 'object') return (memory = { played: +v.played || 0, snooze: +v.snooze || 0, prompts: +v.prompts || 0, done: v.done === true }); } catch (_) {}
    return (memory = { played: 0, snooze: 0, prompts: 0, done: false });
  }
  function saveRate() { try { root.localStorage.setItem(RATE_KEY, JSON.stringify(memory)); } catch (_) {} }
  function countPlay(ms) { const s = rateState(); s.played = Math.min(s.played + ms, 365 * 24 * 3600 * 1000); saveRate(); }
  function rateDue(win, now) { const s = rateState(); return !!bridge(win) && !s.done && s.prompts < RATE_MAX && s.played >= RATE_AFTER_MS && (now || Date.now()) >= s.snooze && !adShowing(win); }
  function ratePrompted(now) { const s = rateState(); s.prompts++; s.snooze = (now || Date.now()) + RATE_SNOOZE_MS; saveRate(); }
  function rateDone() { rateState().done = true; saveRate(); }
  function _reset() { memory = null; }

  CAA.PlayStore = { PLACEMENTS, RATE_AFTER_MS, showAd, adShowing, updateAvailable, openStore, privacyRequired, showPrivacy, countPlay, rateDue, ratePrompted, rateDone, rateState, _reset };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.PlayStore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
