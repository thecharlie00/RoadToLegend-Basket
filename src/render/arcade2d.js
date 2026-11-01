(function (root) {
  'use strict';
  // Render 2D de los minijuegos: solo dibuja el estado que le pasan; no decide resultados.
  // Animación con anticipación (agacharse), squash & stretch del balón, follow-through y hit-stop (destello).
  const CAA = root.CAA = root.CAA || {};
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  function palette(opts) {
    const cb = opts && opts.colorMode === 'blue-orange';
    return { floor1: '#3a2614', floor2: '#4a3119', line: '#e9d8b8', good: cb ? '#5aa9ff' : '#3fcf7c', bad: cb ? '#ff9f43' : '#ff5b66', led: '#ffb21e', ink: '#edf1e8', ball: '#e2731b', seam: '#5a2a08', jersey: (opts && opts.jersey) || '#ffb21e', skin: '#c98b5b', night: '#0b1417' };
  }
  function scene(ctx, w, h, P, view) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.5);
    sky.addColorStop(0, '#0b1417'); sky.addColorStop(1, '#16252a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // grada con público (bloques) y focos
    for (let i = 0; i < 46; i++) {
      const x = (i * 37) % w, y = h * 0.1 + ((i * 53) % Math.round(h * 0.22));
      const bob = view.hype ? Math.sin(view.now / 120 + i) * 2 * view.hype : 0;
      ctx.fillStyle = ['#24393f', '#2d4a52', '#1d2e33'][i % 3]; ctx.fillRect(x, y + bob, 10, 12);
    }
    for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,214,140,0.08)'; ctx.beginPath(); ctx.moveTo(w * (0.15 + i * 0.23), 0); ctx.lineTo(w * (0.05 + i * 0.25), h * 0.55); ctx.lineTo(w * (0.25 + i * 0.25), h * 0.55); ctx.fill(); }
    // parqué
    const fy = h * 0.55;
    const floor = ctx.createLinearGradient(0, fy, 0, h);
    floor.addColorStop(0, P.floor2); floor.addColorStop(1, P.floor1);
    ctx.fillStyle = floor; ctx.fillRect(0, fy, w, h - fy);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    for (let x = -w; x < w * 2; x += 26) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x + (x - w / 2) * 0.6, h); ctx.stroke(); }
    ctx.strokeStyle = P.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(w * 0.5, fy + 8, w * 0.42, h * 0.16, 0, 0, Math.PI); ctx.stroke(); // línea de triple
    ctx.beginPath(); ctx.moveTo(w * 0.36, fy); ctx.lineTo(w * 0.32, h * 0.86); ctx.lineTo(w * 0.68, h * 0.86); ctx.lineTo(w * 0.64, fy); ctx.stroke(); // zona
  }
  function hoop(ctx, w, h, P, view) {
    const cx = w * 0.5, by = h * 0.2;
    ctx.fillStyle = '#d9e2e0'; ctx.fillRect(cx - 52, by - 34, 104, 64);
    ctx.strokeStyle = P.bad; ctx.lineWidth = 3; ctx.strokeRect(cx - 18, by - 8, 36, 26);
    ctx.fillStyle = '#5f7477'; ctx.fillRect(cx - 3, by - 70, 6, 36);
    const rimY = by + 26;
    // red: se deforma al entrar el balón
    const swish = view.netKick || 0;
    ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 1.2;
    for (let i = 0; i <= 6; i++) {
      const x0 = cx - 18 + i * 6, x1 = cx - 11 + i * 3.7 + Math.sin(view.now / 60 + i) * 3 * swish;
      ctx.beginPath(); ctx.moveTo(x0, rimY); ctx.lineTo(x1, rimY + 26 + swish * 8); ctx.stroke();
    }
    ctx.strokeStyle = P.bad; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, rimY, 20, 5, 0, 0, Math.PI * 2); ctx.stroke();
    return { x: cx, y: rimY };
  }
  function player(ctx, x, y, P, pose, scale) {
    // pose: crouch 0..1 (anticipación), jump 0..1, arm 0..1 (follow-through)
    const s = scale || 1, j = pose.jump * 34 * s, c = pose.crouch * 8 * s;
    const top = y - 92 * s - j + c;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 20 * s * (1 - pose.jump * 0.4), 5 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1f22'; ctx.fillRect(x - 12 * s, top + 62 * s, 10 * s, 28 * s - c); ctx.fillRect(x + 2 * s, top + 62 * s, 10 * s, 28 * s - c);
    ctx.fillStyle = '#f5f5f5'; ctx.fillRect(x - 13 * s, top + 86 * s - c, 12 * s, 6 * s); ctx.fillRect(x + 1 * s, top + 86 * s - c, 12 * s, 6 * s);
    ctx.fillStyle = P.jersey; ctx.fillRect(x - 14 * s, top + 24 * s, 28 * s, 40 * s);
    ctx.fillStyle = P.skin; ctx.fillRect(x - 9 * s, top, 18 * s, 22 * s);
    const arm = pose.arm;
    ctx.fillStyle = P.skin;
    ctx.save(); ctx.translate(x + 12 * s, top + 28 * s); ctx.rotate(lerp(0.3, -2.6, arm)); ctx.fillRect(-3 * s, 0, 7 * s, 26 * s); ctx.restore();
    ctx.save(); ctx.translate(x - 12 * s, top + 28 * s); ctx.rotate(lerp(-0.3, 2.4, arm * 0.8)); ctx.fillRect(-4 * s, 0, 7 * s, 24 * s); ctx.restore();
    return { hand: { x: x + 4 * s, y: top - 4 * s } };
  }
  function ball(ctx, x, y, r, P, sx, sy) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx || 1, sy || 1);
    ctx.fillStyle = P.ball; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = P.seam; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 1.1, 0, r * 0.8, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 1.1, 0, r * 0.8, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    ctx.restore();
  }
  function meter(ctx, w, h, P, view) {
    const spec = view.spec; if (!spec) return;
    if (view.meterType === 'ring') {
      const cx = w * 0.5, cy = h * 0.62, rMax = 70, r = 14 + (1 - view.cursor) * rMax;
      const good = 14 + (1 - spec.center) * rMax, half = spec.width / 2 * rMax;
      ctx.strokeStyle = P.good; ctx.lineWidth = half * 2; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(cx, cy, good, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      ctx.strokeStyle = P.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      return;
    }
    if (view.meterType === 'beat') {
      const y = h * 0.92, x0 = w * 0.12, x1 = w * 0.88, gx = lerp(x0, x1, spec.center);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x0, y - 10, x1 - x0, 20);
      ctx.fillStyle = P.good; ctx.fillRect(gx - spec.width / 2 * (x1 - x0), y - 10, spec.width * (x1 - x0), 20);
      ctx.fillStyle = P.ink; ctx.fillRect(lerp(x0, x1, view.cursor) - 3, y - 16, 6, 32);
      return;
    }
    const x = w - 46, top = h * 0.18, bh = h * 0.62;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x, top, 22, bh);
    const gy = top + (1 - spec.center) * bh;
    ctx.fillStyle = P.good; ctx.fillRect(x, gy - spec.width / 2 * bh, 22, spec.width * bh);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, gy - 1, 22, 2);
    ctx.fillStyle = P.ink; ctx.fillRect(x - 6, top + (1 - view.cursor) * bh - 3, 34, 6);
    if (view.meterType === 'jump') { ctx.fillStyle = P.led; ctx.font = '700 12px Atkinson Hyperlegible Next, sans-serif'; ctx.fillText('▲', x + 5, gy - spec.width / 2 * bh - 6); }
  }

  function draw(ctx, w, h, view, opts) {
    const P = palette(opts);
    ctx.save();
    // hit-stop: un pequeño temblor y destello al acertar
    if (view.flash > 0) ctx.translate((Math.sin(view.now / 18) * 3) * view.flash, 0);
    scene(ctx, w, h, P, view);
    const rim = hoop(ctx, w, h, P, view);
    const px = view.type === 'defense' ? w * 0.5 : w * 0.5 + (view.type === 'three' ? (view.round % 5 - 2) * w * 0.14 : 0);
    const py = h * 0.9;
    const a = view.anim; // { t 0..1, made, quality, kind }
    let pose = { crouch: 0, jump: 0, arm: 0 };
    if (view.phase === 'aim') pose = { crouch: view.type === 'buzzer' ? Math.max(0, 1 - view.cursor * 2) : 0.4 + Math.sin(view.now / 160) * 0.2, jump: view.type === 'buzzer' ? view.cursor : 0, arm: 0.1 };
    if (a) { const up = Math.min(1, a.t * 3); pose = { crouch: 0, jump: (view.type === 'dunk' ? 1.4 : 1) * Math.sin(Math.min(1, a.t * 1.6) * Math.PI) * 0.8, arm: up }; }
    if (view.type === 'defense' || view.type === 'street') {
      // atacante rival que bota hacia ti
      const ax = w * 0.5 + Math.sin(view.now / 300) * 30, ay = h * 0.72;
      player(ctx, ax, ay, Object.assign({}, P, { jersey: '#66b9ff' }), { crouch: 0.3, jump: 0, arm: 0.2 }, 0.75);
      ball(ctx, ax + 16, ay - 8 - Math.abs(Math.sin(view.now / 140)) * 22, 7, P);
    }
    const hands = player(ctx, px, py, P, pose, 1).hand;
    if (view.type !== 'defense') {
      if (!a) {
        const bounce = view.phase === 'aim' && view.type === 'freeThrow' ? Math.abs(Math.sin(view.now / 220)) * 18 : 0;
        ball(ctx, hands.x, hands.y + bounce, 10, P, 1, 1);
      } else {
        const t = ease(Math.min(1, a.t));
        const ctrlY = Math.min(hands.y, rim.y) - h * (view.type === 'dunk' ? 0.05 : 0.28);
        let bx, by;
        if (t < 0.75 || a.made) {
          const k = Math.min(1, t / 0.75);
          bx = (1 - k) * (1 - k) * hands.x + 2 * (1 - k) * k * lerp(hands.x, rim.x, 0.5) + k * k * rim.x;
          by = (1 - k) * (1 - k) * hands.y + 2 * (1 - k) * k * ctrlY + k * k * rim.y;
          if (a.made && t >= 0.75) by = rim.y + (t - 0.75) * 4 * 40;
        } else {
          const k = (t - 0.75) / 0.25; bx = rim.x + 22 + k * 60; by = rim.y - Math.sin(k * Math.PI) * 30 + k * 40;
        }
        const squash = a.t < 0.08 ? 0.8 : 1, stretch = a.t < 0.6 ? 1.12 : 1;
        ball(ctx, bx, by, 10, P, a.t < 0.08 ? 1.15 : 1 / stretch, squash * stretch);
      }
    }
    meter(ctx, w, h, P, view);
    if (view.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${0.25 * view.flash})`; ctx.fillRect(-10, 0, w + 20, h); }
    if (view.label) {
      ctx.font = `700 ${Math.round(w / 11)}px CamDisp, Pixelify Sans, sans-serif`; ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(view.label, w / 2 + 3, h * 0.47 + 3);
      ctx.fillStyle = view.labelGood ? P.good : P.bad; ctx.fillText(view.label, w / 2, h * 0.47);
    }
    ctx.restore();
  }
  CAA.Arcade2D = { draw };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Arcade2D;
})(typeof globalThis !== 'undefined' ? globalThis : this);
