(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  let locale = 'es';
  let dicts = {};
  const missing = new Set();

  function init(options = {}) {
    dicts = options.dicts || {};
    locale = options.locale || 'es';
    missing.clear();
  }
  function setLocale(next) {
    if (!dicts[next]) throw new Error('unknown locale: ' + next);
    locale = next;
  }
  function getLocale() { return locale; }
  function t(key, vars) {
    const table = dicts[locale] || {};
    let text = table[key];
    if (text == null) {
      for (const fallbackLocale of ['es', 'en']) {
        if (fallbackLocale === locale) continue;
        const fallback = dicts[fallbackLocale] || {};
        if (fallback[key] != null) { text = fallback[key]; break; }
      }
    }
    if (text == null) { missing.add(key); text = key; }
    if (vars) text = String(text).replace(/\{(\w+)\}/g, (_, k) => vars[k] == null ? '{' + k + '}' : String(vars[k]));
    return text;
  }
  function missingKeys() { return Array.from(missing).sort(); }

  CAA.I18N = { init, setLocale, getLocale, t, missingKeys };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.I18N;
})(typeof globalThis !== 'undefined' ? globalThis : this);
