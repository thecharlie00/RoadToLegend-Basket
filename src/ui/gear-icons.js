(function (root) {
  'use strict';
  // Iconos de vóxeles de cada pieza de equipamiento (como en el juego de fútbol): un pequeño modelo por
  // ranura con el color de la pieza y el ribete del color de su tier, dibujado en isométrica como SVG
  // (sin WebGL, nítido a cualquier tamaño y en caché por pieza y tier).
  const CAA = root.CAA = root.CAA || {};
  const cache = new Map();
  const rgb = h => /^#[0-9a-f]{6}$/i.test(h || '') ? [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)) : [138, 151, 154];
  const hex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const shade = (h, k) => hex(rgb(h).map(v => k > 1 ? v + (255 - v) * (k - 1) : v * k));

  function model(slot, c, tc) {
    const V = new Map();
    const put = (x, y, z, col) => V.set(x + ',' + y + ',' + z, col);
    const box = (x0, x1, y0, y1, z0, z1, col) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) put(x, y, z, col); };
    const ring = (y0, y1, r, col, r0) => { for (let x = -r - 1; x <= r + 1; x++) for (let z = -r - 1; z <= r + 1; z++) { const d = Math.hypot(x, z); if (d <= r + 0.4 && d > (r0 != null ? r0 : r - 1.1)) for (let y = y0; y <= y1; y++) put(x, y, z, col); } };
    const d = shade(c, 0.7), l = shade(c, 1.18);
    switch (slot) {
      case 'shoes': case 'cshoes':
        box(-4, 4, 0, 0, -2, 2, slot === 'shoes' ? '#f4f4f0' : '#1b1d1f'); box(-4, 4, 1, 2, -2, 2, c); box(-4, -1, 3, 5, -2, 2, c);
        box(-4, -2, 6, 6, -1, 1, l); box(0, 4, 3, 3, -1, 1, l); box(-3, 3, 2, 2, 2, 2, tc); box(-3, 3, 2, 2, -2, -2, tc); break;
      case 'sleeve': ring(0, 9, 2, c, 1); ring(8, 9, 2, tc, 1); break;
      case 'band': ring(0, 2, 4, c, 3.1); ring(1, 1, 4.4, tc, 3.9); break;
      case 'knee': ring(0, 6, 3, c, 2); box(-1, 1, 2, 4, 3, 4, tc); break;
      case 'socks': ring(0, 8, 2, c); ring(6, 7, 2, tc); box(-2, 2, 0, 1, 2, 4, c); box(-1, 1, 0, 0, 3, 5, d); break;
      case 'wrist': ring(0, 3, 3, c, 1.8); ring(1, 2, 3.4, tc, 2.9); break;
      case 'goggles': case 'glasses':
        box(-5, -1, 2, 4, 0, 0, c); box(1, 5, 2, 4, 0, 0, c); box(-4, -2, 3, 3, 1, 1, '#2a3a40'); box(2, 4, 3, 3, 1, 1, '#2a3a40');
        box(0, 0, 4, 4, 0, 0, tc); box(-6, -6, 3, 4, -4, 0, c); box(6, 6, 3, 4, -4, 0, c); break;
      case 'hoodie':
        box(-3, 3, 0, 6, -1, 1, c); box(-6, -4, 2, 6, -1, 1, c); box(4, 6, 2, 6, -1, 1, c); box(-2, 2, 7, 10, -1, 2, c);
        box(-1, 1, 8, 9, 2, 2, '#141a1c'); box(-2, 2, 1, 2, 2, 2, d); box(-3, 3, 0, 0, -1, 1, tc); break;
      case 'phones':
        for (let a = 0; a <= 8; a++) { const ang = Math.PI * a / 8, x = Math.round(Math.cos(ang) * 5), y = Math.round(Math.sin(ang) * 5) + 3; put(x, y, 0, c); put(x, y, 1, c); }
        box(-6, -4, 0, 3, -1, 2, d); box(4, 6, 0, 3, -1, 2, d); put(-5, 2, 3, tc); put(5, 2, 3, tc); break;
      case 'chain':
        for (let b = 0; b < 12; b++) { const t = Math.PI * 2 * b / 12; put(Math.round(Math.cos(t) * 4), 6 + Math.round(Math.sin(t) * 1.2), Math.round(Math.sin(t) * 2), c); }
        box(-1, 1, 1, 4, 0, 0, c); box(0, 0, 2, 3, 1, 1, tc); break;
      case 'watch': case 'cwatch':
        box(-1, 1, 0, 9, 0, 0, '#1b1d1f'); box(-2, 2, 3, 6, -1, 1, c); box(-1, 1, 4, 5, 2, 2, '#e8eef0'); put(0, 5, 2, tc); put(0, 4, 2, '#1d1404'); box(3, 3, 4, 5, 0, 0, tc); break;
      case 'towel': box(-4, 4, 0, 1, -3, 3, c); box(-4, 4, 2, 2, -3, 3, l); box(-4, 4, 1, 1, 3, 3, tc); box(-4, 4, 1, 1, -3, -3, tc); break;
      case 'suit':
        box(-3, 3, 0, 8, -1, 1, c); box(-6, -4, 2, 8, -1, 1, c); box(4, 6, 2, 8, -1, 1, c); box(-1, 1, 3, 8, 2, 2, '#f4f4f0');
        box(0, 0, 3, 7, 2, 2, '#7a1d1d'); box(-2, -2, 4, 8, 2, 2, tc); box(2, 2, 4, 8, 2, 2, tc); break;
      case 'coat':
        box(-4, 4, 0, 9, -1, 1, c); box(-7, -5, 2, 9, -1, 1, c); box(5, 7, 2, 9, -1, 1, c); box(-3, 3, 9, 10, -1, 1, d); box(0, 0, 0, 8, 2, 2, tc);
        for (const y of [2, 4, 6]) put(-1, y, 2, '#1d1404'); break;
      case 'tie': box(-1, 1, 9, 10, 0, 0, c); box(-1, 1, 2, 8, 0, 0, c); box(0, 0, 0, 1, 0, 0, c); for (const y of [3, 5, 7]) put(0, y, 1, tc); break;
      case 'scarf': box(-4, 4, 6, 8, -1, 1, c); box(2, 4, 0, 6, 1, 2, c); for (const y of [1, 3, 5]) box(2, 4, y, y, 1, 2, tc); box(-4, 4, 7, 7, 2, 2, tc); break;
      case 'clipboard':
        box(-3, 3, 0, 8, 0, 1, c); box(-3, -3, 0, 8, 2, 2, tc); box(-2, 2, 6, 6, 2, 2, '#e8eef0'); box(-2, 1, 4, 4, 2, 2, '#e8eef0'); box(-2, 2, 2, 2, 2, 2, '#e8eef0'); box(-1, 1, 9, 9, 0, 1, '#1b1d1f'); break;
      default: box(-3, 3, 0, 6, -1, 1, c); box(-2, 2, 6, 6, 2, 2, tc);
    }
    return V;
  }
  // Isométrica: se ven la cara de arriba (+y) y las dos frontales (+x, +z); solo se dibujan las caras sin vecino.
  function svg(slot, color, tierColor, px) {
    const key = slot + '|' + color + '|' + tierColor + '|' + (px || 48);
    if (cache.has(key)) return cache.get(key);
    const V = model(slot, color || '#8a979a', tierColor || '#9aa7aa'), cos = Math.cos(Math.PI / 6), sin = 0.5;
    const pts = [...V.entries()].map(([k, col]) => { const [x, y, z] = k.split(',').map(Number); return { x, y, z, col }; }).sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z) || a.y - b.y);
    const P = (x, y, z) => [(x - z) * cos, (x + z) * sin - y];
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    const faces = [];
    for (const v of pts) {
      const has = (dx, dy, dz) => V.has((v.x + dx) + ',' + (v.y + dy) + ',' + (v.z + dz));
      const { x, y, z } = v;
      const quad = (a, b, c2, d2, col) => { const q = [a, b, c2, d2].map(p => P(...p)); for (const [sx, sy] of q) { minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy); } faces.push([q, col]); };
      if (!has(0, 1, 0)) quad([x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1], shade(v.col, 1.12));
      if (!has(1, 0, 0)) quad([x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1], shade(v.col, 0.78));
      if (!has(0, 0, 1)) quad([x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1], shade(v.col, 0.92));
    }
    const pad = 0.6, w = maxX - minX + pad * 2, h = maxY - minY + pad * 2;
    const body = faces.map(([q, col]) => `<polygon points="${q.map(([sx, sy]) => (sx - minX + pad).toFixed(2) + ',' + (sy - minY + pad).toFixed(2)).join(' ')}" fill="${col}" stroke="${col}" stroke-width="0.06"/>`).join('');
    const out = `<svg class="gicon" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="${px || 48}" height="${px || 48}" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">${body}</svg>`;
    cache.set(key, out);
    return out;
  }
  CAA.GearIcons = { svg, model, shade };
})(typeof globalThis !== 'undefined' ? globalThis : this);
