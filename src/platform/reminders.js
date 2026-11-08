(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  // Recordatorios locales y opcionales (solo app Android). Se programan en el propio móvil al salir del juego
  // y se cancelan al volver: sin red, sin servidor, sin datos que salgan del dispositivo.
  const HOUR = 3600000;
  const QUIET_START = 21, QUIET_END = 10; // nunca de 21:00 a 10:00
  function awake(at) {
    const d = new Date(at), h = d.getHours();
    if (h >= QUIET_END && h < QUIET_START) return at;
    if (h >= QUIET_START) d.setDate(d.getDate() + 1);
    d.setHours(QUIET_END, 0, 0, 0);
    return d.getTime();
  }
  // summary: el resumen de carrera; t: traductor (clave, vars) → texto. Devuelve como mucho 3 avisos ordenados.
  function plan(summary, now, t) {
    const s = summary;
    if (!s || s.retirement || s.careerOver) return [];
    const out = [];
    const add = (id, delay, title, body) => out.push({ id, at: awake(now + delay), title, body });
    if (s.event) add('decision', 3 * HOUR, t('rem.decisionTitle'), t('rem.decisionBody'));
    if (s.pet) add('pet', 6 * HOUR, t('rem.petTitle', { name: s.pet.name }), t('rem.petBody', { name: s.pet.name }));
    const next = s.playoffs && !s.playoffs.done ? ['playoffs', {}] : s.next && s.next.opponent ? ['match', { team: s.next.opponent.name }] : ['season', {}];
    add(next[0], 24 * HOUR, t('rem.' + next[0] + 'Title', next[1]), t('rem.' + next[0] + 'Body', next[1]));
    add('back', 72 * HOUR, t('rem.backTitle'), t('rem.backBody'));
    out.sort((a, b) => a.at - b.at);
    // Dos avisos casi a la vez molestan: se queda el primero.
    const kept = [];
    for (const r of out) if (!kept.length || r.at - kept[kept.length - 1].at >= 2 * HOUR) kept.push(r);
    return kept.slice(0, 3);
  }
  function bridge(win) {
    try { const b = win && win.CAAAndroid; return b && typeof b.scheduleReminders === 'function' ? b : null; } catch (_) { return null; }
  }
  function available(win) { return !!bridge(win); }
  function schedule(win, list) {
    const b = bridge(win); if (!b) return false;
    try { b.scheduleReminders(JSON.stringify(list || [])); return true; } catch (_) { return false; }
  }
  function cancel(win) {
    const b = bridge(win); if (!b) return false;
    try { b.cancelReminders(); return true; } catch (_) { return false; }
  }
  // 'granted' | 'denied' | 'ask' | 'none' (sin app Android)
  function status(win) {
    const b = bridge(win); if (!b) return 'none';
    try { return String(b.notifyStatus() || 'ask'); } catch (_) { return 'ask'; }
  }
  // Pide el permiso del sistema; la respuesta llega como evento 'caa:notify-permission' con detail 'granted'/'denied'.
  function ask(win) {
    const b = bridge(win); if (!b) return false;
    try { b.askNotify(); return true; } catch (_) { return false; }
  }
  CAA.Reminders = { plan, awake, available, schedule, cancel, status, ask, QUIET_START, QUIET_END };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Reminders;
})(typeof globalThis !== 'undefined' ? globalThis : this);
