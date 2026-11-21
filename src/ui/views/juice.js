(function (root) {
  'use strict';
  // Juice: lo que se celebra o tiembla al cambiar el resumen de la carrera.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["juice"] = function (ui) {
    const { haptic, state, t } = ui;
    // ===== Juice: qué ha cambiado y cómo celebrarlo (resultado, media, dinero, logros, títulos). =====
    const achId = x => typeof x === 'string' ? x : x && (x.id || x.key);
    function achFirstTime(ids) {
      let seen = [];
      try { seen = JSON.parse(root.localStorage.getItem('caa.ach.seen') || '[]'); if (!Array.isArray(seen)) seen = []; } catch (_) { seen = state.achSeen || []; }
      const out = ids.filter(id => id && !seen.includes(id));
      if (out.length) { seen = seen.concat(out).slice(-600); state.achSeen = seen; try { root.localStorage.setItem('caa.ach.seen', JSON.stringify(seen)); } catch (_) {} }
      return out;
    }
    function juiceDiff(a, b) {
      const q = [];
      if (!a || !b || a.careerId !== b.careerId) return q;
      const r0 = a.recent && a.recent[0], r1 = b.recent && b.recent[0];
      if (r1 && (!r0 || r0.round !== r1.round || r0.opponent !== r1.opponent || r0.us !== r1.us)) q.push({ k: 'result', won: r1.won, margin: Math.abs(r1.us - r1.them) });
      if (a.player && b.player && b.player.ovr > a.player.ovr) q.push({ k: 'ovr', d: b.player.ovr - a.player.ovr });
      const cash = x => x.mode === 'coach' ? (x.clubFin && x.clubFin.cash) : (x.life && x.life.cash);
      const c0 = cash(a), c1 = cash(b); if (Number.isFinite(c0) && Number.isFinite(c1) && Math.abs(c1 - c0) >= 1) q.push({ k: 'cash', d: c1 - c0 });
      // Logros: solo se celebran la primera vez en este dispositivo; en otras partidas se desbloquean en silencio.
      const had = new Set(a.life && a.life.achievements ? a.life.achievements.map(achId) : []);
      const fresh = (b.life && b.life.achievements ? b.life.achievements.map(achId) : []).filter(id => !had.has(id));
      if (fresh.length) { const firstTime = achFirstTime(fresh); if (firstTime.length) q.push({ k: 'ach', n: firstTime.length }); if (CAA.PlayGames) CAA.PlayGames.unlock(root, fresh); }
      if (b.lastSeason && b.lastSeason.myChampion && !(a.lastSeason && a.lastSeason.myChampion)) q.push({ k: 'title' });
      if (b.summerCup && b.summerCup.place === 1 && !(a.summerCup && a.summerCup.year === b.summerCup.year)) q.push({ k: 'cup' });
      return q;
    }
    function tabEnter() { const p = doc.getElementById('panel'); if (!p) return; p.classList.remove('tab-enter'); void p.offsetWidth; p.classList.add('tab-enter'); root.setTimeout(() => p.classList.remove('tab-enter'), 700); }
    function runJuice(q) {
      const J = CAA.Juice; if (!J) return;
      const $ = sel => doc.querySelector(sel);
      const money = n => (n > 0 ? '+' : '−') + Math.abs(Math.round(n)).toLocaleString(CAA.I18N.getLocale()) + ' €';
      let delay = 0;
      const later = fn => { root.setTimeout(fn, delay); delay += 260; };
      for (const e of q) {
        if (e.k === 'result') later(() => { const el = $('.now-strip') || $('#panel'); if (e.won) { J.burstAt(el, { count: e.margin >= 15 ? 46 : 26, colors: ['#36b98a', '#ffffff', '#ffb21e'] }); J.pop(el, 1.03); if (ui.audio) ui.audio.play('cheer'); } else { J.shake(el, 0.7); if (ui.audio) ui.audio.play('fail'); } });
        if (e.k === 'ovr') later(() => { const el = $('.pc-ovr') || $('.cromo .ovr'); J.floatText('+' + e.d + ' ' + t('juice.ovr'), el, 'gold'); J.pop(el, 1.3); J.burstAt(el, { count: 22, colors: ['#ffb21e', '#fff3c4', '#ffffff'] }); if (ui.audio) ui.audio.play('levelup'); haptic('success'); });
        if (e.k === 'cash') later(() => { J.floatText(money(e.d), $('.cromo') || $('#panel'), e.d > 0 ? 'good' : 'bad'); if (ui.audio && e.d > 0) ui.audio.play('coin'); });
        if (e.k === 'ach') later(() => { J.confetti(0.5); J.floatText(t('juice.ach', { n: e.n }), $('.cromo') || $('#panel'), 'gold'); if (ui.audio) ui.audio.play('levelup'); });
        if (e.k === 'title' || e.k === 'cup') later(() => { J.confetti(e.k === 'title' ? 1.6 : 0.8); if (ui.audio) ui.audio.play('cheer'); haptic('success'); });
      }
    }
    return { achId, achFirstTime, juiceDiff, tabEnter, runJuice };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
