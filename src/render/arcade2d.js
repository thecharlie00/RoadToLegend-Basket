(function (root) {
  'use strict';
  // Render 2D de los minijuegos: solo dibuja el estado que le pasan; no decide resultados.
  // Cada mecánica tiene su propio medidor: barra de fuerza, bandeja de triples, reloj de bocina,
  // pips de ritmo, anillo de reacción y calle 1×1. El jugador debe reconocer el juego de un vistazo.
  const CAA = root.CAA = root.CAA || {};
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;

  function palette(opts) {
    const cb = opts && opts.colorMode === 'blue-orange';
    return { floor1: '#3a2614', floor2: '#4a3119', line: '#e9d8b8', good: cb ? '#3be3ff' : '#43d17a', bad: cb ? '#ff9f43' : '#ff5470', led: '#ff7a1f', ink: '#edf1e8', ball: '#e2731b', seam: '#5a2a08', jersey: (opts && opts.jersey) || '#ffb21e', skin: '#c98b5b', night: '#0b1417' };
  }
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr); ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
  }
  function scene(ctx, w, h, P, view) {
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, '#0b1417'); sky.addColorStop(1, '#16252a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // grada con público (bloques) y focos; el público bota más cuando hay racha
    for (let i = 0; i < 46; i++) {
      const x = (i * 37) % w, y = h * 0.1 + ((i * 53) % Math.round(h * 0.2));
      const bob = view.hype ? Math.sin(view.now / 120 + i) * 2 * view.hype : 0;
      ctx.fillStyle = ['#24393f', '#2d4a52', '#1d2e33'][i % 3]; ctx.fillRect(x, y + bob, 10, 12);
    }
    for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,214,140,0.08)'; ctx.beginPath(); ctx.moveTo(w * (0.15 + i * 0.23), 0); ctx.lineTo(w * (0.05 + i * 0.25), h * 0.55); ctx.lineTo(w * (0.25 + i * 0.25), h * 0.55); ctx.fill(); }
    const fy = h * 0.46;
    const floor = ctx.createLinearGradient(0, fy, 0, h);
    floor.addColorStop(0, P.floor2); floor.addColorStop(1, P.floor1);
    ctx.fillStyle = floor; ctx.fillRect(0, fy, w, h - fy);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    for (let x = -w; x < w * 2; x += 26) { ctx.beginPath(); ctx.moveTo(x, fy); ctx.lineTo(x + (x - w / 2) * 0.6, h); ctx.stroke(); }
    ctx.strokeStyle = P.line; ctx.lineWidth = 2;
    if (view.type === 'buzzer') { // pista completa: círculo central y línea de medio campo
      ctx.beginPath(); ctx.ellipse(w * 0.32, h * 0.74, w * 0.13, h * 0.05, 0, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 0.35; ctx.beginPath(); ctx.moveTo(w * 0.52, fy); ctx.lineTo(w * 0.52, h); ctx.stroke(); ctx.globalAlpha = 1;
    } else {
      ctx.beginPath(); ctx.ellipse(w * 0.5, fy + 8, w * (view.type === 'three' ? 0.46 : 0.42), h * 0.16, 0, 0, Math.PI); ctx.stroke(); // línea de triple
      if (view.type === 'three') { ctx.setLineDash([6, 6]); ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(w * 0.5, fy + 8, w * 0.3, h * 0.1, 0, 0, Math.PI); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1; }
    }
    ctx.beginPath(); ctx.moveTo(w * 0.36, fy); ctx.lineTo(w * 0.32, h * 0.86); ctx.lineTo(w * 0.68, h * 0.86); ctx.lineTo(w * 0.64, fy); ctx.stroke(); // zona
    // cinta LED publicitaria sobre la grada: cierra la escena sin coste de imagen
    ctx.fillStyle = '#080f13'; ctx.fillRect(0, fy - 12, w, 10);
    for (let i = 0; i < 16; i++) { ctx.fillStyle = i % 3 === 0 ? 'rgba(255,122,31,.55)' : 'rgba(59,227,255,.18)'; ctx.fillRect(6 + i * (w - 12) / 16, fy - 9, (w - 12) / 16 - 4, 4); }
    // banquillo/rack de balones en los triples
    if (view.type === 'three') {
      const rx = w * 0.1, ry = h * 0.9;
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, rx - 12, ry - 14, 76, 30, 6); ctx.fill();
      for (let i = 0; i < 5; i++) ball(ctx, rx + i * 13, ry + 1, 5.5, P, 1, 1);
    }
  }
  function hoop(ctx, w, h, P, view) {
    const cx = w * 0.5, by = h * (view.type === 'three' ? 0.2 : 0.24);
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(cx - 58, by - 40, 116, 74);
    ctx.fillStyle = '#d9e2e0'; ctx.fillRect(cx - 56, by - 38, 112, 70);
    if (view.type === 'buzzer') { // reloj de 24'' en el tablero: la presión se ve
      ctx.fillStyle = '#120a0a'; ctx.fillRect(cx - 22, by - 26, 44, 20);
      ctx.fillStyle = P.bad; ctx.font = '700 15px "Atkinson Hyperlegible Next", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(view.clockText || '24', cx, by - 11);
    }
    ctx.strokeStyle = P.bad; ctx.lineWidth = 4; ctx.strokeRect(cx - 20, by - 9, 40, 28);
    ctx.fillStyle = '#5f7477'; ctx.fillRect(cx - 3, by - 76, 6, 40);
    const rimY = by + 26;
    const swish = view.netKick || 0;
    ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = 1.2;
    for (let i = 0; i <= 6; i++) {
      const x0 = cx - 18 + i * 6, x1 = cx - 11 + i * 3.7 + Math.sin(view.now / 60 + i) * 3 * swish;
      ctx.beginPath(); ctx.moveTo(x0, rimY); ctx.lineTo(x1, rimY + 26 + swish * 8); ctx.stroke();
    }
    ctx.strokeStyle = P.bad; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, rimY, 24, 6, 0, 0, TAU); ctx.stroke();
    return { x: cx, y: rimY };
  }
  function player(ctx, x, y, P, pose, scale) {
    // pose: crouch 0..1 (anticipación), jump 0..1, arm 0..1 (follow-through)
    const s = scale || 1, j = pose.jump * 34 * s, c = pose.crouch * 8 * s;
    const top = y - 92 * s - j + c;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 2, 20 * s * (1 - pose.jump * 0.4), 5 * s, 0, 0, TAU); ctx.fill();
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
    ctx.fillStyle = P.ball; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = P.seam; ctx.lineWidth = Math.max(1, r * 0.14); ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
    ctx.beginPath(); ctx.arc(-r * 1.1, 0, r * 0.8, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 1.1, 0, r * 0.8, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
    ctx.restore();
  }
  function text(ctx, str, x, y, size, color, align) {
    ctx.font = `700 ${Math.round(size)}px "Atkinson Hyperlegible Next", system-ui, sans-serif`; ctx.textAlign = align || 'center'; ctx.fillStyle = color; ctx.fillText(str, x, y);
  }

  // ---------- medidores por mecánica ----------
  function meters(ctx, w, h, P, view) {
    const spec = view.spec; if (!spec) return;
    const motion = spec.motion || ({ bar: 'bounce', jump: 'rise', ring: 'react', beat: 'beat', rack: 'sweep', arc: 'rise', lane: 'read' }[view.meterType] || 'bounce');
    const T = view.text || {};
    const goodCol = P.good;
    if (motion === 'bounce') { // tiro libre / calle: barra vertical de fuerza con cursor que rebota
      const x = w - 64, top = h * 0.16, bh = h * 0.62, bw = 30;
      ctx.fillStyle = 'rgba(8,14,18,0.85)'; roundRect(ctx, x, top, bw, bh, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(237,241,232,0.22)'; ctx.lineWidth = 1.5; roundRect(ctx, x, top, bw, bh, 8); ctx.stroke();
      const gy = top + (1 - spec.center) * bh, gh = Math.max(10, spec.width * bh);
      ctx.fillStyle = goodCol; ctx.globalAlpha = 0.85; roundRect(ctx, x, gy - gh / 2, bw, gh, 5); ctx.fill(); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(x + 2, gy - gh / 2, bw - 4, 2);
      const cy = top + (1 - view.cursor) * bh;
      ctx.fillStyle = P.ink; roundRect(ctx, x - 9, cy - 3, bw + 18, 6, 3); ctx.fill();
      ctx.fillStyle = P.led; ctx.beginPath(); ctx.arc(x + bw / 2, cy, 5, 0, TAU); ctx.fill();
      text(ctx, T.power || '', x + bw / 2, top - 12, Math.round(h * 0.036), 'rgba(237,241,232,0.8)');
    } else if (motion === 'sweep') { // triples: bandeja horizontal, 5 balones por rack
      const x0 = w * 0.07, x1 = w * 0.93, y = h * 0.9, bh = 30;
      ctx.fillStyle = 'rgba(8,14,18,0.85)'; roundRect(ctx, x0, y, x1 - x0, bh, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(237,241,232,0.22)'; ctx.lineWidth = 1.5; roundRect(ctx, x0, y, x1 - x0, bh, 8); ctx.stroke();
      const gw = Math.max(12, spec.width * (x1 - x0)), gx = x0 + spec.center * (x1 - x0);
      ctx.fillStyle = goodCol; ctx.globalAlpha = 0.8; roundRect(ctx, gx - gw / 2, y, gw, bh, 6); ctx.fill(); ctx.globalAlpha = 1;
      const cx = x0 + view.cursor * (x1 - x0);
      ctx.strokeStyle = P.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx, y - 7); ctx.lineTo(cx, y + bh + 7); ctx.stroke();
      // rastro del cursor
      ctx.strokeStyle = 'rgba(237,241,232,0.3)'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx - 26, y + bh / 2); ctx.lineTo(cx, y + bh / 2); ctx.stroke();
      const rack = spec.rack || 5, inRack = view.round % rack;
      for (let i = 0; i < rack; i++) {
        const px = x0 + 14 + i * 22, py = y - 26;
        ctx.globalAlpha = i === rack - 1 ? 1 : 0.85;
        ball(ctx, px, py, 7, P, 1, 1);
        if (i < inRack) { ctx.strokeStyle = goodCol; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, py, 11, 0, TAU); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
      if (T.rack) text(ctx, T.rack, x0 + 132, y - 28, Math.round(h * 0.042), 'rgba(237,241,232,0.8)', 'left');
    } else if (motion === 'rise') { // bocina: reloj que se llena sola hasta la línea roja
      const x = w - 84, bottom = h * 0.8, top = h * 0.14, bh = bottom - top, bw = 40;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; roundRect(ctx, x, top, bw, bh, 10); ctx.fill();
      const gy = bottom - spec.center * bh, gh = Math.max(10, spec.width * bh);
      ctx.fillStyle = goodCol; ctx.globalAlpha = 0.9; roundRect(ctx, x, gy - gh / 2, bw, gh, 6); ctx.fill(); ctx.globalAlpha = 1;
      const cy = bottom - view.cursor * bh;
      const fill = ctx.createLinearGradient(0, bottom, 0, cy);
      fill.addColorStop(0, 'rgba(255,122,31,0.55)'); fill.addColorStop(1, 'rgba(255,84,112,0.85)');
      ctx.fillStyle = fill; roundRect(ctx, x + 4, cy, bw - 8, bottom - cy, 6); ctx.fill();
      ctx.fillStyle = P.bad; ctx.fillRect(x - 10, gy - gh / 2 - 1, bw + 20, 2);
      ctx.fillStyle = P.ink; ctx.beginPath(); ctx.arc(x + bw / 2, cy, 7, 0, TAU); ctx.fill();
      // cuenta atrás (24 → 0) junto al reloj
      const left = Math.max(0, (spec.periodTicks - (view.tick || 0)) / spec.periodTicks);
      text(ctx, String(Math.ceil(left * 24)).padStart(2, '0'), x + bw / 2, top - 14, Math.round(h * 0.05), left < 0.25 ? P.bad : P.ink);
      if (left <= 0 && view.phase === 'aim') text(ctx, T.buzzer || '', x + bw / 2, bottom + 24, Math.round(h * 0.04), P.bad);
    } else if (motion === 'beat') { // mates: tres tiempos por mate
      const y = h * 0.9, x0 = w * 0.12, x1 = w * 0.88;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, x0, y - 9, x1 - x0, 18, 9); ctx.fill();
      const gx = lerp(x0, x1, spec.center), gw = spec.width * (x1 - x0);
      ctx.fillStyle = goodCol; roundRect(ctx, gx - gw / 2, y - 9, gw, 18, 6); ctx.fill();
      const cx = lerp(x0, x1, view.cursor);
      ctx.fillStyle = P.ink; ctx.fillRect(cx - 3, y - 16, 6, 32);
      const cur = view.round % 3;
      for (let i = 0; i < 3; i++) {
        const px = w * 0.5 + (i - 1) * 50, py = y - 48;
        ctx.beginPath(); ctx.arc(px, py, i === cur ? 17 : 12, 0, TAU);
        ctx.fillStyle = i < cur ? P.led : i === cur ? P.ink : 'rgba(237,241,232,0.25)'; ctx.fill();
        if (i === cur) { ctx.strokeStyle = P.good; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(px, py, 23, 0, TAU); ctx.stroke(); }
      }
      if (T.beat) text(ctx, T.beat, w * 0.5, y - 84, Math.round(h * 0.04), 'rgba(237,241,232,0.8)');
    } else if (motion === 'react') { // defensa: no hay cursor; aparece el estímulo y hay que reaccionar
      const cx = w * 0.5, cy = h * 0.48, R = 54;
      const aiming = view.phase === 'aim';
      const t = view.onCue ? (view.tick - spec.cueTick) : 0;
      const window = Math.max(1, spec.reaction);
      if (!aiming || !view.onCue) {
        ctx.strokeStyle = 'rgba(237,241,232,0.28)'; ctx.lineWidth = 3; ctx.setLineDash([7, 7]);
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        text(ctx, aiming ? (T.wait || '') : '', cx, cy + 6, Math.round(h * 0.042), 'rgba(237,241,232,0.7)');
        text(ctx, aiming ? (T.defend || '') : '', cx, cy - R - 16, Math.round(h * 0.042), 'rgba(237,241,232,0.7)');
      } else {
        const left = Math.max(0, 1 - t / window);
        ctx.fillStyle = 'rgba(255,84,112,0.22)'; ctx.beginPath(); ctx.arc(cx, cy, R + 8, 0, TAU); ctx.fill();
        ctx.strokeStyle = P.good; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * left); ctx.stroke();
        text(ctx, left > 0 ? (T.now || '') : (T.late || ''), cx, cy + 8, Math.round(h * 0.052), left > 0 ? P.ink : P.bad);
        // barra vertical que se vacía (lectura rápida en móvil)
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(ctx, w - 34, h * 0.2, 12, h * 0.5, 6); ctx.fill();
        ctx.fillStyle = left > 0.35 ? P.good : P.bad; roundRect(ctx, w - 34, h * 0.2 + h * 0.5 * (1 - left), 12, h * 0.5 * left, 6); ctx.fill();
      }
    } else { // calle: calle de 3 carriles; el defensor se inclina y hay que cruzar
      const y = h * 0.955, x0 = w * 0.1, x1 = w * 0.9, lw = (x1 - x0) / 3;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; roundRect(ctx, x0, y - 11, x1 - x0, 22, 8); ctx.fill();
      ctx.strokeStyle = 'rgba(237,241,232,0.18)'; ctx.lineWidth = 1; roundRect(ctx, x0, y - 11, x1 - x0, 22, 8); ctx.stroke();
      for (let i = 1; i < 3; i++) { ctx.strokeStyle = 'rgba(237,241,232,0.16)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0 + lw * i, y - 12); ctx.lineTo(x0 + lw * i, y + 12); ctx.stroke(); }
      const gx = x0 + spec.center * (x1 - x0), gw = Math.max(14, spec.width * (x1 - x0));
      ctx.fillStyle = goodCol; ctx.globalAlpha = 0.9; roundRect(ctx, gx - gw / 2, y - 11, gw, 22, 6); ctx.fill(); ctx.globalAlpha = 1;
      const cx = x0 + view.cursor * (x1 - x0);
      ball(ctx, cx, y, 8, P, 1, 1);
      // el peso del defensor se marca con una flecha sobre la calle, sin duplicar la figura de la escena
      const leanX = x0 + (spec.lean === 'left' ? (x1 - x0) * 0.22 : (x1 - x0) * 0.78);
      ctx.fillStyle = spec.mode === 'defense' ? P.bad : P.good;
      ctx.beginPath(); ctx.moveTo(leanX, y - 30); ctx.lineTo(leanX - 10, y - 46); ctx.lineTo(leanX + 10, y - 46); ctx.closePath(); ctx.fill();
      text(ctx, spec.mode === 'defense' ? (T.defend || '') : (T.attack || ''), x0 + 2, y - 54, Math.round(h * 0.04), spec.mode === 'defense' ? P.bad : P.good, 'left');
    }
  }

  function draw(ctx, w, h, view, opts) {
    const P = palette(opts);
    ctx.save();
    if (view.flash > 0) ctx.translate((Math.sin(view.now / 18) * 3) * view.flash, 0);
    scene(ctx, w, h, P, view);
    const rim = hoop(ctx, w, h, P, view);
    const px = view.type === 'defense' ? w * 0.5 : w * 0.5 + (view.type === 'three' ? (view.round % 5 - 2) * w * 0.14 : 0);
    const py = h * (view.type === 'street' ? 0.86 : 0.9);
    const a = view.anim;
    let pose = { crouch: 0, jump: 0, arm: 0 };
    if (view.phase === 'aim') pose = { crouch: 0.35 + Math.sin(view.now / 170) * 0.18, jump: view.spec && view.spec.motion === 'rise' ? view.cursor * 0.8 : 0, arm: 0.1 };
    if (a) { const up = Math.min(1, a.t * 3); pose = { crouch: 0, jump: (view.type === 'dunk' ? 1.4 : 1) * Math.sin(Math.min(1, a.t * 1.6) * Math.PI) * 0.8, arm: up }; }
    if (view.type === 'defense' || view.type === 'street') {
      const defending = view.type === 'defense' || (view.spec && view.spec.mode === 'defense');
      const ax = w * 0.5 + Math.sin(view.now / 300) * 30, ay = h * 0.72;
      player(ctx, ax, ay, Object.assign({}, P, { jersey: '#66b9ff' }), { crouch: 0.3, jump: 0, arm: 0.2 }, 0.75);
      ball(ctx, ax + 16, ay - 8 - Math.abs(Math.sin(view.now / 140)) * 22, 7, P);
      if (defending) text(ctx, view.text && view.text.defend || '', w * 0.5, h * 0.34, 13, 'rgba(237,241,232,0.55)');
    }
    const hands = player(ctx, px, py, P, pose, 1).hand;
    if (view.type !== 'defense') {
      if (!a) {
        // En el tiro libre/calle el balón bota a la altura de la cadera (si no, taparía la cabeza del jugador);
        // en la bocina se sube con las manos porque el gesto ya es de tiro.
        const rise = view.spec && view.spec.motion === 'rise';
        const bounce = view.phase === 'aim' && (view.type === 'freeThrow' || view.type === 'three') ? Math.abs(Math.sin(view.now / 220)) * 16 : 0;
        ball(ctx, rise ? hands.x : hands.x + 16, rise ? hands.y : hands.y + 52 + bounce, 10, P, 1, 1);
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
        // estela del balón (sensación de velocidad sin partículas)
        for (let i = 3; i >= 1; i--) { ctx.globalAlpha = 0.1 * i; ball(ctx, lerp(hands.x, bx, 1 - i * 0.03), lerp(hands.y, by, 1 - i * 0.03), 9 - i, P, 1, 1); }
        ctx.globalAlpha = 1;
        const squash = a.t < 0.08 ? 0.8 : 1, stretch = a.t < 0.6 ? 1.12 : 1;
        ball(ctx, bx, by, 10, P, a.t < 0.08 ? 1.15 : 1 / stretch, squash * stretch);
      }
    }
    meters(ctx, w, h, P, view);
    if (view.flash > 0) {
      // destello + chispas radiales: golpe de feedback en el impacto
      ctx.fillStyle = `rgba(255,255,255,${0.22 * view.flash})`; ctx.fillRect(-10, 0, w + 20, h);
      ctx.strokeStyle = `rgba(255,214,140,${0.5 * view.flash})`; ctx.lineWidth = 3;
      for (let i = 0; i < 8; i++) { const ang = i / 8 * TAU + view.now / 900, r0 = 26 * (1 - view.flash) + 10, r1 = r0 + 26 * view.flash; ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(ang) * r0, h * 0.42 + Math.sin(ang) * r0); ctx.lineTo(w / 2 + Math.cos(ang) * r1, h * 0.42 + Math.sin(ang) * r1); ctx.stroke(); }
    }
    if (view.label) {
      const size = Math.round(w / (view.label.length > 9 ? 15 : 12));
      text(ctx, view.label, w / 2 + 3, h * 0.47 + 3, size, 'rgba(0,0,0,0.6)');
      text(ctx, view.label, w / 2, h * 0.47, size, view.labelGood ? P.good : P.bad);
    }
    ctx.restore();
  }
  // HUD sobre el 3D: solo medidor, destello y rótulo, con fondo transparente.
  function hud(ctx, w, h, view, opts) {
    const P = palette(opts);
    ctx.clearRect(0, 0, w, h);
    meters(ctx, w, h, P, view);
    if (view.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${0.2 * view.flash})`; ctx.fillRect(0, 0, w, h); }
    if (view.label) {
      const size = Math.round(w / (view.label.length > 9 ? 15 : 12));
      text(ctx, view.label, w / 2 + 3, h * 0.42 + 3, size, 'rgba(0,0,0,0.6)');
      text(ctx, view.label, w / 2, h * 0.42, size, view.labelGood ? P.good : P.bad);
    }
  }
  CAA.Arcade2D = { draw, hud, palette };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Arcade2D;
})(typeof globalThis !== 'undefined' ? globalThis : this);
