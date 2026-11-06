(function (root) {
  'use strict';
  // «Juice» (paridad con anim.js del fútbol): partículas de confeti y chispas en una capa propia, textos flotantes
  // («+3», «+1 MEDIA», «+12.000 €»), temblor, «pop» y números que cuentan. Todo respeta el movimiento reducido: con él
  // activo no hay partículas ni temblores y los números cambian sin animación.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  let cv = null, ctx = null, parts = [], raf = 0, reducedFn = () => false;
  const COLORS = ['#ffb21e', '#ff5b66', '#36b98a', '#5fb8ff', '#ffffff', '#b98cff'];
  function setReduced(fn) { reducedFn = fn || (() => false); }
  const reduced = () => { try { return !!reducedFn(); } catch (_) { return false; } };
  function layer() {
    if (cv && cv.isConnected) return ctx;
    cv = doc.createElement('canvas'); cv.className = 'juice-layer'; cv.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(cv); ctx = cv.getContext('2d'); size();
    root.addEventListener('resize', size);
    return ctx;
  }
  function size() { if (!cv) return; const d = Math.min(2, root.devicePixelRatio || 1); cv.width = root.innerWidth * d; cv.height = root.innerHeight * d; cv.style.width = root.innerWidth + 'px'; cv.style.height = root.innerHeight + 'px'; if (ctx) ctx.setTransform(d, 0, 0, d, 0, 0); }
  let last = 0;
  function frame(t) {
    const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t;
    ctx.clearRect(0, 0, root.innerWidth, root.innerHeight);
    parts = parts.filter(p => (p.life -= dt) > 0);
    for (const p of parts) {
      p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const a = Math.min(1, p.life / 0.35);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      if (p.kind === 'spark') { ctx.beginPath(); ctx.arc(0, 0, p.s * a, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-p.s / 2, -p.s * 0.3, p.s, p.s * 0.6 * Math.abs(Math.cos(p.rot * 2)) + 1);
      ctx.restore();
    }
    if (parts.length) raf = root.requestAnimationFrame(frame); else { raf = 0; last = 0; ctx.clearRect(0, 0, root.innerWidth, root.innerHeight); }
  }
  function burst(x, y, o = {}) {
    if (reduced() || !doc) return;
    layer();
    const n = Math.min(160, o.count || 24), kind = o.kind || 'spark', cols = o.colors || COLORS;
    for (let i = 0; i < n; i++) {
      const a = (o.angle != null ? o.angle : -Math.PI / 2) + (Math.random() - 0.5) * (o.spread != null ? o.spread : Math.PI * 2);
      const v = (o.speed || 260) * (0.45 + Math.random() * 0.75);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: o.gravity != null ? o.gravity : (kind === 'confetti' ? 520 : 380), drag: kind === 'confetti' ? 0.985 : 0.96,
        life: (o.life || (kind === 'confetti' ? 2.2 : 0.8)) * (0.7 + Math.random() * 0.5), s: kind === 'confetti' ? 7 + Math.random() * 5 : 2 + Math.random() * 2.5,
        c: cols[(Math.random() * cols.length) | 0], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, kind });
    }
    if (!raf) raf = root.requestAnimationFrame(frame);
  }
  function center(el) { if (!el || !el.getBoundingClientRect) return [root.innerWidth / 2, root.innerHeight / 3]; const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
  function burstAt(el, o) { const [x, y] = center(el); burst(x, y, o); }
  // Confeti desde los dos lados de la parte alta: títulos, ascensos, campeonatos, logros.
  function confetti(power = 1) {
    if (reduced()) return;
    const w = root.innerWidth, n = Math.round(70 * power);
    burst(w * 0.12, root.innerHeight * 0.32, { kind: 'confetti', count: n, angle: -Math.PI / 3, spread: 0.9, speed: 620 });
    burst(w * 0.88, root.innerHeight * 0.32, { kind: 'confetti', count: n, angle: -Math.PI * 2 / 3, spread: 0.9, speed: 620 });
  }
  function floatText(text, el, cls) {
    if (!doc) return;
    const [x, y] = center(el), d = doc.createElement('div');
    d.className = 'juice-float ' + (cls || ''); d.textContent = text; d.setAttribute('aria-hidden', 'true');
    d.style.left = x + 'px'; d.style.top = y + 'px';
    doc.body.appendChild(d);
    if (reduced()) { d.classList.add('static'); root.setTimeout(() => d.remove(), 1400); return; }
    root.setTimeout(() => d.remove(), 1500);
  }
  function anim(el, kf, o) { if (!el || reduced() || !el.animate) return null; try { return el.animate(kf, o); } catch (_) { return null; } }
  function shake(el, power = 1) { return anim(el, [0, -1, 1, -1, 1, -0.5, 0].map((k, i) => ({ transform: `translate(${k * 7 * power}px, ${(i % 2 ? 1 : -1) * 2 * power}px)` })), { duration: 380, easing: 'ease-out' }); }
  function pop(el, scale = 1.12) { return anim(el, [{ transform: 'scale(1)' }, { transform: `scale(${scale})`, offset: 0.35 }, { transform: 'scale(1)' }], { duration: 360, easing: 'cubic-bezier(.3,1.6,.5,1)' }); }
  function flash(el, color) { return anim(el, [{ boxShadow: `0 0 0 0 ${color || 'rgba(255,178,30,.0)'}` }, { boxShadow: `0 0 0 6px ${color || 'rgba(255,178,30,.55)'}` }, { boxShadow: '0 0 0 0 rgba(0,0,0,0)' }], { duration: 700 }); }
  function countUp(el, from, to, fmt, dur = 900) {
    if (!el) return;
    const f = fmt || (v => String(Math.round(v)));
    if (reduced() || from === to || !Number.isFinite(from)) { el.textContent = f(to); return; }
    const t0 = root.performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = f(from + (to - from) * e); if (k < 1) root.requestAnimationFrame(step); };
    root.requestAnimationFrame(step);
  }
  CAA.Juice = { setReduced, burst, burstAt, confetti, floatText, shake, pop, flash, countUp };
})(typeof globalThis !== 'undefined' ? globalThis : this);
