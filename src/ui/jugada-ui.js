(function (root) {
  'use strict';
  // Tablero de la Jugada Maestra: media pista vertical (el aro arriba), trazos con el dedo, ratón o
  // lápiz, y botones equivalentes para teclado y lector de pantalla. Solo dibuja y recoge gestos:
  // el desenlace lo decide CAA.Jugada (en la campaña aquí mismo; en partido, también en el trabajador).
  const CAA = root.CAA = root.CAA || {};
  const J = () => CAA.Jugada;
  const VW = 100, VH = 94;
  // Motor (x hacia el fondo, y a lo ancho) → pantalla (aro arriba).
  const sc = p => [+(p[1]).toFixed(2), +(VH - p[0]).toFixed(2)];
  const fromScreen = (sx, sy) => [VH - sy, sx];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function initials(name) { const w = String(name || '').trim().split(/\s+/); return (w.length > 1 ? w[w.length - 1] : w[0] || '?').slice(0, 3); }
  function poly(pts) { return pts.map((p, i) => (i ? 'L' : 'M') + sc(p).join(' ')).join(' '); }
  function label(st, i) {
    const pl = st.players && st.players[i];
    return pl ? initials(pl.name) : String(i + 1);
  }
  function court() {
    const hoop = sc(J().HOOP), cornerY = VH - 79.1;
    return `<rect class="jm-floor" x="0" y="0" width="${VW}" height="${VH}" rx="2"/>
      <rect class="jm-paint" x="33.6" y="0" width="32.8" height="38.7"/>
      <circle class="jm-line" cx="50" cy="38.7" r="12" fill="none"/>
      <path class="jm-line" d="M6 0 L6 ${cornerY.toFixed(1)} A45 45 0 0 0 94 ${cornerY.toFixed(1)} L94 0" fill="none"/>
      <path class="jm-line" d="M41.7 ${hoop[1]} A8.3 8.3 0 0 0 58.3 ${hoop[1]}" fill="none"/>
      <line class="jm-line" x1="0" y1="${VH - 0.4}" x2="${VW}" y2="${VH - 0.4}"/>
      <line class="jm-board" x1="44" y1="1.6" x2="56" y2="1.6"/>
      <circle class="jm-hoop" data-hoop="1" cx="${hoop[0]}" cy="${hoop[1]}" r="2.6"/>
      <circle class="jm-hoop-hit" data-hoop="1" cx="${hoop[0]}" cy="${hoop[1]}" r="8" fill="transparent"/>`;
  }
  // st: estado del motor; opts.t: traductor; opts.trail: mostrar el último trazo.
  function svg(st, opts = {}) {
    const t = opts.t || (k => k);
    const last = st.log && st.log.length ? st.log[st.log.length - 1] : null;
    const trail = last && last.path ? `<path class="jm-trail ${last.ok ? 'ok' : 'bad'}" d="${poly(last.path)}"/>` : last && last.k === 'shot' ? `<path class="jm-trail ${last.ok ? 'ok' : 'bad'}" d="${poly([last.from, last.to])}"/>` : '';
    const mates = st.mates.map(m => {
      const [x, y] = sc(m.p), me = st.players && st.players[m.i] && st.players[m.i].me;
      return `<g class="jm-tok mate${me ? ' me' : ''}" data-token="${m.i}" transform="translate(${x} ${y})"><circle r="3.6"/><text y="1.2">${esc(label(st, m.i))}</text></g>`;
    }).join('');
    const [bx, by] = sc(st.ball), meBall = st.players && st.players[st.handler] && st.players[st.handler].me;
    const handler = `<g class="jm-tok handler${meBall ? ' me' : ''}" data-token="${st.handler}" transform="translate(${bx} ${by})"><circle r="3.9"/><text y="1.2">${esc(label(st, st.handler))}</text><circle class="jm-ball" cx="3" cy="-3" r="1.7"/></g>`;
    const rivals = st.rivals.map(r => { const [x, y] = sc(r); return `<g class="jm-def" transform="translate(${x} ${y})"><rect x="-3.1" y="-3.1" width="6.2" height="6.2" rx="1.6"/><path d="M-1.4 -1.4 L1.4 1.4 M1.4 -1.4 L-1.4 1.4"/></g>`; }).join('');
    return `<svg class="jm-court" viewBox="-5 -5 ${VW + 10} ${VH + 10}" role="img" aria-labelledby="jm-court-title" preserveAspectRatio="xMidYMid meet">
      <title id="jm-court-title">${esc(t('jm.courtLabel', { mates: st.mates.length, rivals: st.rivals.length }))}</title>
      ${court()}${trail}<g class="jm-defs">${rivals}</g><g class="jm-team">${mates}${handler}</g>
      <path id="jm-trace" class="jm-trace" d=""/><circle id="jm-fly" class="jm-ball" r="1.7" cx="-20" cy="-20"/></svg>`;
  }
  // Recoge un trazo que empieza en quien lleva el balón; un toque sobre un compañero, el aro o la pista
  // también vale (pase, tiro o penetración en línea recta).
  function bind(host, st, onAction) {
    const el = host && host.querySelector('svg.jm-court');
    if (!el || st.done) return () => {};
    const trace = el.querySelector('#jm-trace');
    let pts = null, start = null, startedOnBall = false;
    const toEngine = e => {
      const m = el.getScreenCTM(); if (!m) return null;
      const p = el.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const q = p.matrixTransform(m.inverse());
      return fromScreen(q.x, q.y);
    };
    const down = e => {
      if (e.button != null && e.button > 0) return;
      const p = toEngine(e); if (!p) return;
      start = p; startedOnBall = J().dist(p, st.ball) <= 9; pts = [p];
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    };
    const move = e => {
      if (!pts) return;
      const p = toEngine(e); if (!p) return;
      if (J().dist(p, pts[pts.length - 1]) > 1.2) pts.push(p);
      if (startedOnBall) trace.setAttribute('d', poly([st.ball].concat(pts.slice(1))));
      e.preventDefault();
    };
    const up = e => {
      if (!pts) return;
      const p = toEngine(e) || pts[pts.length - 1]; pts.push(p);
      const moved = J().dist(start, p) > 4, line = pts; pts = null;
      trace.setAttribute('d', '');
      if (moved && startedOnBall) return onAction({ path: line.slice(1) });
      if (moved) return; // un trazo que no sale del balón no hace nada
      // Toque: aro → tiro; compañero → pase; pista → penetración hacia ese punto.
      if (J().dist(p, J().HOOP) <= J().HOOP_PICK) return onAction({ k: 'shot' });
      const mate = st.mates.find(m => J().dist(m.p, p) <= 6);
      if (mate) return onAction({ k: 'pass', to: mate.i });
      if (J().dist(p, st.ball) > 6) return onAction({ k: 'drive', path: [p] });
    };
    const cancel = () => { pts = null; trace.setAttribute('d', ''); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', cancel);
    return () => { el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', cancel); };
  }
  // Vuelo del balón por el último trazo; respeta movimiento reducido.
  function fly(host, entry, done) {
    const el = host && host.querySelector('#jm-fly');
    const reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || !entry || reduce) { done && done(); return; }
    const pts = entry.path || (entry.from && entry.to ? [entry.from, entry.to] : null);
    if (!pts || pts.length < 2) { done && done(); return; }
    const segs = []; let total = 0;
    for (let i = 1; i < pts.length; i++) { const L = J().dist(pts[i - 1], pts[i]); segs.push(L); total += L; }
    const ms = Math.min(700, 260 + total * 6), t0 = root.performance.now();
    const step = now => {
      const k = Math.min(1, (now - t0) / ms), want = (1 - Math.pow(1 - k, 2)) * total;
      let run = 0, i = 0; while (i < segs.length - 1 && run + segs[i] < want) run += segs[i++];
      const f = segs[i] ? (want - run) / segs[i] : 1, a = pts[i], b = pts[i + 1] || a;
      const [x, y] = sc([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      const lift = entry.k === 'shot' ? Math.sin(k * Math.PI) * 6 : entry.k === 'pass' ? Math.sin(k * Math.PI) * 1.5 : 0;
      el.setAttribute('cx', x); el.setAttribute('cy', y - lift); el.setAttribute('r', 1.7 + lift * 0.12);
      if (k < 1) root.requestAnimationFrame(step); else { el.setAttribute('cx', -20); done && done(); }
    };
    root.requestAnimationFrame(step);
  }
  // Medallas guardadas en el dispositivo (la campaña no toca la carrera).
  const KEY = 'caa.jm.medals';
  let memory = {};
  function medals() { try { const v = JSON.parse(root.localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (_) { return Object.assign({}, memory); } }
  function saveMedal(id, medal) {
    const all = medals(); if ((all[id] || 0) >= medal) return all;
    all[id] = medal; memory = all;
    try { root.localStorage.setItem(KEY, JSON.stringify(all)); } catch (_) {}
    return all;
  }
  // Una jugada se desbloquea al ganar la anterior (la primera de cada capítulo, al ganar la última del anterior).
  function unlocked(id, all) {
    const list = J().levels(), i = list.findIndex(l => l.id === id);
    return i <= 0 || !!(all || medals())[list[i - 1].id];
  }
  CAA.JugadaUI = { svg, bind, fly, medals, saveMedal, unlocked, sc };
})(typeof globalThis !== 'undefined' ? globalThis : this);
