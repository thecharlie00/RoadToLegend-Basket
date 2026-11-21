(function (root) {
  'use strict';
  // Logros de Google Play Juegos (paridad con pgs.js del fútbol). Solo hace algo en la app de Android
  // con Play Juegos configurado: cada logro se envía una vez con su misma clave y la app la traduce al
  // ID de Play (android/app/src/main/res/raw/pgs_achievements.json). Sin Play Juegos, no hace nada.
  const CAA = root.CAA = root.CAA || {};
  const KEY = 'caa.pgs.sent';
  let memory = {};
  function bridge(win) { try { const b = win && win.CAAAndroid; return b && typeof b.pgsUnlock === 'function' ? b : null; } catch (_) { return null; } }
  function status(win) { const b = bridge(win); try { return b && b.pgsState ? String(b.pgsState()) : 'off'; } catch (_) { return 'off'; } }
  function sent() { try { return JSON.parse(root.localStorage.getItem(KEY) || '{}') || {}; } catch (_) { return memory; } }
  function save(map) { memory = map; try { root.localStorage.setItem(KEY, JSON.stringify(map)); } catch (_) {} }
  // ids: claves de logro del juego. Devuelve cuántos se enviaron ahora.
  function unlock(win, ids) {
    const b = bridge(win); if (!b || status(win) !== 'in') return 0;
    const map = sent(); let n = 0;
    for (const id of ids || []) { if (!id || map[id]) continue; try { if (b.pgsUnlock(String(id))) { map[id] = 1; n++; } } catch (_) {} }
    if (n) save(map);
    return n;
  }
  function show(win) { const b = bridge(win); try { if (b && b.pgsShow) b.pgsShow(); } catch (_) {} }
  CAA.PlayGames = { unlock, show, status, available: win => status(win) !== 'off' };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.PlayGames;
})(typeof globalThis !== 'undefined' ? globalThis : this);
