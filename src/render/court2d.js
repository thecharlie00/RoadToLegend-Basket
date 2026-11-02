(function (root) {
  'use strict';
  // Pista 2D de retransmisión: madera con tabla, zonas pintadas, líneas reglamentarias, canastas con red,
  // jugadores con sombra y balón con costuras. Se dibuja con Canvas 2D puro (sin imágenes) y escala a cualquier
  // tamaño de lienzo. Las posiciones del fotograma van en fracción de pista (0..1) para que el dibujo sea libre.
  const CAA = root.CAA = root.CAA || {};
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Medidas FIBA en metros (pista 28 × 15). El aro está a 1,575 m de la línea de fondo.
  const L = 28, W = 15, HOOP = 1.575, RIM = 6.75, CORNER = 6.6, KEY_W = 4.9, KEY_L = 5.8, FT_CIRCLE = 1.8, RESTRICTED = 1.25;
  // Distancia al aro (m) y desvío lateral (m, desde el atacante) de cada zona de tiro.
  const ZONE_SPOT = {
    restricted: [1.25, 0.35], paint: [4.0, 0], midShort: [5.8, -2.2], midLong: [6.6, 2.8], corner3: [6.5, -6.15], above3: [6.9, 0.4]
  };
  const hash01 = (i, j) => { const x = Math.sin((i + 1) * 12.9898 + (j + 1) * 78.233) * 43758.5453; return x - Math.floor(x); };

  // Fotograma: sitúa el balón con medidas reales según la zona y coloca a los diez jugadores con una formación
  // creíble (atacantes abiertos alrededor del aro, defensa entre el balón y su propia canasta). La pequeña
  // oscilación por índice es determinista: el mismo evento dibuja siempre el mismo fotograma.
  function frameForEvent(event, index) {
    const e = event || {}, i = index || 0;
    const attacking = e.team === 1 ? 1 : 0;          // 0 ataca a la derecha, 1 a la izquierda
    const dir = attacking === 0 ? 1 : -1;
    const mirror = attacking === 0 ? 1 : -1;
    const spot = ZONE_SPOT[e.zone] || ZONE_SPOT.above3;
    const jitter = k => (hash01(i, k) - 0.5) * 0.7;
    const hoopX = dir * (L / 2 - HOOP);
    const toNorm = (d, lat) => ({
      x: clamp(0.5 + (hoopX - dir * d) / L, 0.03, 0.97),
      y: clamp(0.5 + (lat * mirror) / W, 0.045, 0.955)
    });
    const ballM = toNorm(spot[0], spot[1]);
    const ball = { x: ballM.x, y: ballM.y };
    const attackSlots = [[2.3, 4.6], [2.3, -4.6], [5.4, 3.1], [5.9, -3.4]];
    const defendSlots = [[1.3, 0.7], [3.2, 2.7], [3.2, -2.7], [6.6, 1.5], [7.0, -1.2]];
    const players = [];
    for (let team = 0; team < 2; team++) {
      const own = team === attacking;
      for (let j = 0; j < 5; j++) {
        let pos;
        if (own && j === 0) pos = ball;
        else if (own) { const s = attackSlots[j - 1]; pos = toNorm(s[0] + jitter(j), s[1] + jitter(j + 3)); }
        else { const s = defendSlots[j]; pos = toNorm(spot[0] + s[0] + jitter(j + 6), spot[1] * 0.4 + s[1] + jitter(j + 9)); }
        players.push({ team, x: pos.x, y: pos.y, number: j + 1 });
      }
    }
    return { index: i, event: e, ball, players, attacking };
  }
  function framesFromEvents(events) { return (events || []).map((e, i) => frameForEvent(e, i)); }

  // Gradiente tolerante: en pruebas headless el contexto puede ser un doble sin createLinearGradient real.
  function grad(ctx, kind, coords, stops) {
    try {
      const g = kind === 'radial' ? ctx.createRadialGradient(...coords) : ctx.createLinearGradient(...coords);
      if (!g || typeof g.addColorStop !== 'function') return stops[0][1];
      for (const [o, c] of stops) g.addColorStop(o, c);
      return g;
    } catch (_) { return stops[0][1]; }
  }
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.arcTo(x + w, y, x + w, y + h, rr); ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr); ctx.arcTo(x, y, x + w, y, rr); ctx.closePath();
  }

  function drawCourt(ctx, w, h, frame, options = {}) {
    const cb = options.colorMode === 'blue-orange';
    const home = cb ? '#5aa9ff' : '#48c98a';
    const away = cb ? '#ffa64d' : '#f0736a';
    const homeDeep = cb ? '#1d5f9e' : '#1c7b52';
    const awayDeep = cb ? '#9c5717' : '#97362f';
    const lineCol = 'rgba(255,246,224,0.92)';
    // --- Fondo del pabellón: degradado, público en dos bandas, focos y cinta LED.
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = grad(ctx, 'linear', [0, 0, 0, h], [[0, '#070b17'], [0.55, '#0b1222'], [1, '#050813']]);
    ctx.fillRect(0, 0, w, h);
    for (let band = 0; band < 2; band++) {
      for (let row = 0; row < 2; row++) {
        const y0 = band ? h * 0.955 - row * h * 0.026 : h * 0.01 + row * h * 0.026;
        for (let i = 0; i < 58; i++) {
          const x = (i + hash01(band + row, i) * 0.7) * (w / 58);
          const t = hash01(i, row + band * 3);
          const tone = t > 0.86 ? '#ffb27a' : t > 0.7 ? '#7fc4ff' : ['#1a2340', '#232f54', '#2f3d68', '#3a2b52'][(i + band + row) % 4];
          ctx.fillStyle = tone;
          ctx.fillRect(x, y0, Math.max(2, w * 0.011), Math.max(2, h * 0.019));
        }
      }
      // Cinta LED publicitaria entre el público y la pista.
      const ly = band ? h * 0.955 + h * 0.012 : h * 0.012 - h * 0.016;
      ctx.fillStyle = '#070d16'; ctx.fillRect(0, ly, w, Math.max(2, h * 0.014));
      for (let i = 0; i < 22; i++) {
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,122,31,0.75)' : 'rgba(59,227,255,0.28)';
        ctx.fillRect(4 + i * (w - 8) / 22, ly + h * 0.003, (w - 8) / 22 - 3, Math.max(1.5, h * 0.007));
      }
    }
    for (let i = 0; i < 2; i++) {
      const gx = w * (0.22 + i * 0.56);
      ctx.fillStyle = grad(ctx, 'radial', [gx, -h * 0.1, 0, gx, -h * 0.1, h * 0.75], [[0, 'rgba(255,226,170,0.16)'], [1, 'rgba(255,226,170,0)']]);
      ctx.beginPath(); ctx.moveTo(gx - w * 0.05, 0); ctx.lineTo(gx - w * 0.16, h * 0.94); ctx.lineTo(gx + w * 0.16, h * 0.94); ctx.lineTo(gx + w * 0.05, 0); ctx.closePath(); ctx.fill();
    }
    // --- Geometría del dibujo: la pista conserva su proporción real 28:15 dentro del lienzo.
    const availW = w * 0.94, availH = h * 0.8;
    const cw = Math.min(availW, availH * (L / W)), ch = cw * (W / L);
    const left = (w - cw) / 2, top = (h - ch) / 2;
    const X = m => left + (m / L) * cw, Y = m => top + (m / W) * ch;
    const u = ch / 360;                                  // unidad de grosor legible en cualquier tamaño
    // --- Tarima: base cálida + tablas + veta.
    ctx.fillStyle = '#7d542f'; ctx.fillRect(left - u * 6, top - u * 6, cw + u * 12, ch + u * 12);
    ctx.fillStyle = grad(ctx, 'linear', [left, top, left + cw, top + ch], [[0, '#c08a52'], [0.45, '#cf9a60'], [1, '#a97544']]);
    ctx.fillRect(left, top, cw, ch);
    const planks = 22;
    for (let i = 0; i < planks; i++) {
      const y = top + (i / planks) * ch, ph = ch / planks;
      const t = hash01(3, i);
      ctx.fillStyle = `rgba(${t > 0.5 ? '255,236,196' : '92,58,30'},${0.03 + t * 0.05})`;
      ctx.fillRect(left, y, cw, ph - (0.6 * u));
      ctx.fillStyle = 'rgba(60,36,16,0.22)';
      ctx.fillRect(left, y + ph - 0.8 * u, cw, Math.max(0.6, 0.7 * u));
      // Veta: dos trazos cortos por tabla, posición determinista.
      for (let k = 0; k < 3; k++) {
        const sx = left + hash01(i, k) * cw * 0.9, sy = y + ph * (0.25 + hash01(i + 7, k) * 0.5);
        ctx.strokeStyle = 'rgba(120,78,40,0.16)'; ctx.lineWidth = Math.max(0.5, 0.7 * u);
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + cw * (0.05 + hash01(i + 3, k) * 0.08), sy + (hash01(i + 5, k) - 0.5) * u); ctx.stroke();
      }
    }
    // Luz central y sombra perimetral: da volumen a la pista sin imágenes.
    ctx.fillStyle = grad(ctx, 'radial', [left + cw / 2, top + ch / 2, 0, left + cw / 2, top + ch / 2, cw * 0.62], [[0, 'rgba(255,240,210,0.16)'], [0.6, 'rgba(255,240,210,0.04)'], [1, 'rgba(0,0,0,0.28)']]);
    ctx.fillRect(left, top, cw, ch);
    // --- Zonas pintadas (las dos), con marco claro.
    for (const side of [-1, 1]) {
      const x0 = side > 0 ? X(L) - (KEY_L / L) * cw : X(0);
      ctx.fillStyle = grad(ctx, 'linear', [0, top + ch / 2 - (KEY_W / W) * ch / 2, 0, top + ch / 2 + (KEY_W / W) * ch / 2], [[0, 'rgba(28,96,124,0.78)'], [1, 'rgba(21,72,96,0.9)']]);
      ctx.fillRect(x0, Y(W / 2 - KEY_W / 2), (KEY_L / L) * cw, (KEY_W / W) * ch);
      ctx.strokeStyle = 'rgba(255,246,224,0.18)'; ctx.lineWidth = u;
      ctx.strokeRect(x0, Y(W / 2 - KEY_W / 2), (KEY_L / L) * cw, (KEY_W / W) * ch);
    }
    // --- Líneas reglamentarias.
    ctx.lineWidth = Math.max(1.1, 1.6 * u); ctx.strokeStyle = lineCol; ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    ctx.strokeRect(left, top, cw, ch);
    ctx.beginPath(); ctx.moveTo(X(L / 2), top); ctx.lineTo(X(L / 2), top + ch); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(L / 2), Y(W / 2), (FT_CIRCLE / L) * cw, 0, TAU); ctx.stroke();
    for (const side of [-1, 1]) {
      const hoopM = side > 0 ? L - HOOP : HOOP;
      const baseM = side > 0 ? L : 0;
      const keyX0 = side > 0 ? L - KEY_L : 0;
      // Zona y semicírculo de tiros libres.
      ctx.strokeRect(Math.min(X(keyX0), X(keyX0 + KEY_L)), Y(W / 2 - KEY_W / 2), (KEY_L / L) * cw, (KEY_W / W) * ch);
      const ftX = side > 0 ? L - KEY_L : KEY_L;
      ctx.beginPath(); ctx.arc(X(ftX), Y(W / 2), (FT_CIRCLE / L) * cw, side > 0 ? Math.PI / 2 : -Math.PI / 2, side > 0 ? Math.PI * 1.5 : Math.PI / 2); ctx.stroke();
      ctx.save(); ctx.setLineDash([u * 2.4, u * 2.4]); ctx.strokeStyle = 'rgba(255,246,224,0.5)';
      ctx.beginPath(); ctx.arc(X(ftX), Y(W / 2), (FT_CIRCLE / L) * cw, side > 0 ? -Math.PI / 2 : Math.PI / 2, side > 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke(); ctx.restore();
      // Triple: esquinas rectas + arco con el radio real.
      const cornerY = CORNER / 2;
      const joinM = Math.sqrt(Math.max(0, RIM * RIM - cornerY * cornerY));
      const cornerX = side > 0 ? L - Math.min(HOOP + joinM, L) : Math.min(HOOP + joinM, L);
      ctx.beginPath();
      ctx.moveTo(X(side > 0 ? L : 0), Y(W / 2 - cornerY)); ctx.lineTo(X(cornerX), Y(W / 2 - cornerY));
      ctx.moveTo(X(side > 0 ? L : 0), Y(W / 2 + cornerY)); ctx.lineTo(X(cornerX), Y(W / 2 + cornerY));
      ctx.stroke();
      const a0 = Math.acos(clamp((cornerY) / RIM, -1, 1));
      ctx.beginPath();
      ctx.arc(X(hoopM), Y(W / 2), (RIM / L) * cw, side > 0 ? Math.PI - a0 : -a0, side > 0 ? Math.PI + a0 : a0);
      ctx.stroke();
      // Semicírculo de no-carga.
      ctx.beginPath(); ctx.arc(X(hoopM), Y(W / 2), (RESTRICTED / L) * cw, side > 0 ? Math.PI / 2 : -Math.PI / 2, side > 0 ? Math.PI * 1.5 : Math.PI / 2); ctx.stroke();
      // Tablero, aro y red.
      const boardX = side > 0 ? L - 1.2 : 1.2;
      ctx.strokeStyle = '#dff1f6'; ctx.lineWidth = Math.max(1.6, 2.6 * u);
      ctx.beginPath(); ctx.moveTo(X(boardX), Y(W / 2 - 0.9)); ctx.lineTo(X(boardX), Y(W / 2 + 0.9)); ctx.stroke();
      ctx.strokeStyle = '#ff713d'; ctx.lineWidth = Math.max(1.6, 2.4 * u);
      ctx.beginPath(); ctx.arc(X(hoopM), Y(W / 2), 0.225 / L * cw + u * 1.6, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(245,247,240,0.75)'; ctx.lineWidth = Math.max(0.8, u);
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU, r1 = 0.225 / L * cw + u * 1.5, r2 = r1 * 1.55;
        ctx.beginPath(); ctx.moveTo(X(hoopM) + Math.cos(a) * r1, Y(W / 2) + Math.sin(a) * r1 * (ch / cw) * (L / W));
        ctx.lineTo(X(hoopM) + Math.cos(a) * r2, Y(W / 2) + Math.sin(a) * r2 * (ch / cw) * (L / W)); ctx.stroke();
      }
      // Sombra de la canasta sobre la pista.
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath(); ctx.ellipse(X(hoopM) + u * 4, Y(W / 2) + u * 5, (1.4 / L) * cw, (1.1 / W) * ch, 0, 0, TAU); ctx.fill();
    }
    if (!frame) return;
    // --- Jugadores: sombra proyectada, cuerpo con degradado, anillo y dorsal.
    const pr = Math.max(6, ch * 0.052);
    const ordered = frame.players.slice().sort((a, b) => a.y - b.y);
    for (const p of ordered) {
      const px = left + p.x * cw, py = top + p.y * ch;
      const base = p.team ? away : home, deep = p.team ? awayDeep : homeDeep;
      const near = Math.hypot(px - (left + frame.ball.x * cw), py - (top + frame.ball.y * ch)) < pr * 2.1;
      if (near) { ctx.strokeStyle = 'rgba(255,214,140,0.8)'; ctx.lineWidth = Math.max(1, pr * 0.16); ctx.beginPath(); ctx.arc(px, py, pr * 1.35, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = 'rgba(0,0,0,0.34)';
      ctx.beginPath(); ctx.ellipse(px + pr * 0.3, py + pr * 0.45, pr * 0.95, pr * 0.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = grad(ctx, 'radial', [px - pr * 0.35, py - pr * 0.4, pr * 0.1, px, py, pr * 1.15], [[0, '#ffffff'], [0.28, base], [1, deep]]);
      ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(4,8,16,0.55)'; ctx.lineWidth = Math.max(1, pr * 0.12); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(0.6, pr * 0.08);
      ctx.beginPath(); ctx.arc(px, py, pr * 0.78, Math.PI * 1.05, Math.PI * 1.85); ctx.stroke();
      ctx.fillStyle = '#0a1018'; ctx.font = `700 ${Math.max(7, pr * 0.95)}px 'Atkinson Hyperlegible Next', system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(p.number), px, py + pr * 0.06);
    }
    // --- Balón: sombra en el suelo, cuerpo con degradado, costuras y brillo.
    const bx = left + frame.ball.x * cw, by = top + frame.ball.y * ch, br = Math.max(5, ch * 0.031);
    ctx.fillStyle = 'rgba(255,181,71,0.18)';
    ctx.beginPath(); ctx.arc(bx, by, br * 2.1, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.beginPath(); ctx.ellipse(bx + br * 0.5, by + br * 0.85, br * 0.95, br * 0.55, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = grad(ctx, 'radial', [bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br * 1.2], [[0, '#ffe0a8'], [0.35, '#ffb547'], [1, '#b9601a']]);
    ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(90,42,8,0.85)'; ctx.lineWidth = Math.max(0.8, br * 0.16);
    ctx.beginPath(); ctx.moveTo(bx - br, by); ctx.lineTo(bx + br, by); ctx.moveTo(bx, by - br); ctx.lineTo(bx, by + br); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx - br * 1.5, by, br * 2.1, -0.62, 0.62); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx + br * 1.5, by, br * 2.1, Math.PI - 0.62, Math.PI + 0.62); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(bx - br * 0.35, by - br * 0.4, br * 0.26, 0, TAU); ctx.fill();
    // --- Viñeta final: cierra el cuadro y centra la mirada.
    ctx.fillStyle = grad(ctx, 'radial', [w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72], [[0, 'rgba(0,0,0,0)'], [1, 'rgba(2,4,10,0.6)']]);
    ctx.fillRect(0, 0, w, h);
  }
  CAA.Court2D = { frameForEvent, framesFromEvents, drawCourt, COURT: { length: L, width: W, rim: RIM } };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Court2D;
})(typeof globalThis !== 'undefined' ? globalThis : this);
