(function (root) {
  'use strict';
  // Modelo vóxel procedural de la mascota: 13 especies en 8 plantillas (cuadrúpedo, pequeño, caparazón, pez, ave,
  // lagarto, serpiente y tarántula), con color de pelaje, fondo de estudio, accesorios por hueco y tamaño por etapa.
  // Devuelve una escena compatible con CAA.Voxel.createRenderer().draw(scene, 'avatar').
  const CAA = root.CAA = root.CAA || {};
  const STAGE_SCALE = { baby: 0.72, young: 0.86, adult: 1, senior: 0.96 };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // --- color: hex → hsl → tinte del pelaje (mismo efecto que los filtros del fútbol, pero por vóxel) ---
  function hexToRgb(s) { return [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255]; }
  function rgbToHsl([r, g, b]) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hslToRgb([h, s, l]) {
    h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    let rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return rgb.map(v => clamp(v + m, 0, 1));
  }
  function tint(hexColor, coat, t, seed) {
    const base = hexToRgb(hexColor), tintDef = coat && coat.tint;
    if (!tintDef) return base;
    let [h, s, l] = rgbToHsl(base);
    if (tintDef.rainbow) { h = (h + t * 70 + seed * 13) % 360; s = Math.min(1, s * 1.35 + 0.12); }
    if (tintDef.hue != null) h = (h + tintDef.hue) % 360;
    if (tintDef.sat != null) s = Math.min(1, s * tintDef.sat);
    if (tintDef.sepia) { h = h + (36 - h) * tintDef.sepia; s = s + (0.55 - s) * tintDef.sepia; l = l + (0.46 - l) * tintDef.sepia * 0.6; }
    if (tintDef.light != null) l = l + tintDef.light;
    if (tintDef.contrast) l = 0.5 + (l - 0.5) * tintDef.contrast;
    return hslToRgb([h, s, l]);
  }

  function geometry(pet = {}, options = {}) {
    const Pet = CAA.Pet || {};
    const SPECIES = Pet.SPECIES || {};
    const ITEMS = Pet.ITEMS || [];
    const COATS = Pet.COATS || [{ id: 'nat', tint: null }];
    const BACKGROUNDS = Pet.BACKGROUNDS || [{ id: 'none', color: null }];
    const sp = SPECIES[pet.species] || SPECIES.dog || { body: '#c58a4a', belly: '#f0d7b0', ear: '#7a4f2a', shape: 'quad' };
    const coat = COATS.find(c => c.id === pet.coat) || COATS[0];
    const bg = BACKGROUNDS.find(b => b.id === pet.bg) || BACKGROUNDS[0];
    const t = options.t || 0;
    const colors = Object.assign({}, CAA.Voxel.palette(options), {
      body: tint(sp.body, coat, t, 1), belly: tint(sp.belly, coat, t, 2), ear: tint(sp.ear, coat, t, 3),
      eye: hexToRgb('#141414'), nose: hexToRgb('#2a1a14'), tongue: hexToRgb('#ff7a8a'), glass: hexToRgb('#9fd8ff'),
      water: hexToRgb('#4aa3df'), beak: hexToRgb('#ffb21e'), grey: hexToRgb('#cfcfcf'), line: hexToRgb('#e9d8b8'),
      bubble: hexToRgb('#b9e6ff')
    });
    const bh = rgbToHsl(tint(sp.ear, coat, t, 3)); colors.quill = hslToRgb([bh[0], bh[1], Math.min(0.86, bh[2] + 0.3)]);
    for (const it of ITEMS) colors['item-' + it.id] = hexToRgb(it.color);
    colors['item-cap-visor'] = hexToRgb('#1d4f7a');
    colors.bgWall = bg.color ? hexToRgb(bg.color) : hexToRgb('#1b2140');
    colors.bgFloor = bg.color ? tint(bg.color, null, 0, 0) : hexToRgb('#141a2e');
    if (bg.club) {
      const cc = (options.clubColors || []).filter(c => /^#[0-9a-f]{6}$/i.test(c || ''));
      colors.bgWall = hexToRgb(cc[0] || '#1b2140'); colors.bgFloor = hexToRgb(cc[1] || '#141a2e');
    }

    const cubes = [];
    const happy = (pet.happiness == null ? 75 : pet.happiness) >= 60;
    const hop = happy && !options.reduced ? Math.abs(Math.sin(t * 3)) * 0.12 : 0;
    const wag = options.reduced ? 0 : Math.sin(t * (happy ? 12 : 4)) * (happy ? 0.25 : 0.08);
    const add = (x, y, z, sx, sy, sz, color, yaw = 0) => cubes.push({ x, y: y + hop, z, sx, sy, sz, color, yaw });
    const addStill = (x, y, z, sx, sy, sz, color) => cubes.push({ x, y, z, sx, sy, sz, color, yaw: 0 });
    const S = pet.species, shape = sp.shape || 'quad', eq = pet.equipped || {};

    // --- fondo de estudio: suelo + dos paredes en esquina (pocos vóxeles, mucho ambiente) ---
    if (bg.id !== 'none') {
      addStill(0, -0.04, 0, 7.4, 0.08, 5.2, 'bgFloor');
      addStill(-2.05, 2.1, -0.6, 0.12, 4.2, 6.4, 'bgWall');
      addStill(0.4, 2.1, -2.1, 5.4, 4.2, 0.12, 'bgWall');
      addStill(0, 0.02, 0.2, 3.2, 0.02, 2.0, 'line'); // plataforma bajo la mascota
    } else {
      addStill(0, 0.03, 0, 2.2, 0.04, 1.2, 'shadow');
    }

    let hx, hy, hs; // cabeza: centro y tamaño (los accesorios se colocan respecto a ella)
    if (shape === 'quad') {
      const short = S === 'capybara' || S === 'bunny';
      const legH = S === 'bunny' ? 0.35 : S === 'capybara' ? 0.38 : S === 'cat' || S === 'fennec' ? 0.55 : 0.6;
      const bodyY = legH + (S === 'bunny' ? 0.4 : 0.32);
      for (const [lx, lz] of [[-0.45, -0.25], [-0.45, 0.25], [0.45, -0.25], [0.45, 0.25]]) {
        add(lx, legH / 2 + 0.02, lz, 0.22, legH, 0.22, 'body');
        if (eq.feet === 'sneakers') add(lx + 0.03, 0.09, lz, 0.3, 0.16, 0.28, 'item-sneakers');
      }
      if (S === 'bunny') { add(-0.05, bodyY, 0, 1.1, 0.8, 0.85, 'body'); add(0.1, bodyY - 0.08, 0, 0.7, 0.55, 0.88, 'belly'); add(-0.68, bodyY + 0.1, 0, 0.28, 0.28, 0.28, 'belly'); }
      else if (S === 'capybara') { add(0, bodyY + 0.05, 0, 1.45, 0.75, 0.8, 'body'); add(0.05, bodyY - 0.18, 0, 1.0, 0.24, 0.82, 'belly'); }
      else { add(0, bodyY, 0, 1.3, 0.6, 0.66, 'body'); add(0.05, bodyY - 0.2, 0, 0.9, 0.24, 0.68, 'belly'); }
      if (S === 'dog') add(-0.78, bodyY + 0.3 + wag * 0.3, wag, 0.14, 0.45, 0.14, 'body');
      if (S === 'cat') { add(-0.8, bodyY + 0.25, wag, 0.12, 0.6, 0.12, 'body'); add(-0.86, bodyY + 0.62, wag * 1.4, 0.12, 0.22, 0.12, 'ear'); }
      if (S === 'fennec') { add(-0.82, bodyY + 0.15, wag, 0.3, 0.3, 0.3, 'body'); add(-1.02, bodyY + 0.2, wag * 1.2, 0.2, 0.2, 0.2, 'belly'); }
      hx = S === 'bunny' ? 0.55 : S === 'capybara' ? 0.85 : 0.72; hy = bodyY + (S === 'bunny' ? 0.55 : S === 'capybara' ? 0.35 : 0.45); hs = S === 'cat' || S === 'fennec' ? 0.56 : S === 'capybara' ? 0.66 : 0.62;
      add(hx, hy, 0, hs, hs, hs, 'body');
      if (S === 'dog') { add(hx + 0.38, hy - 0.1, 0, 0.3, 0.26, 0.34, 'belly'); add(hx + 0.55, hy - 0.02, 0, 0.1, 0.1, 0.14, 'nose'); if (happy) add(hx + 0.48, hy - 0.26, 0.05, 0.12, 0.14, 0.1, 'tongue'); }
      else if (S === 'capybara') { add(hx + 0.42, hy - 0.06, 0, 0.36, 0.42, 0.5, 'body'); add(hx + 0.61, hy, 0, 0.04, 0.12, 0.22, 'nose'); }
      else add(hx + 0.3, hy - 0.08, 0, 0.06, 0.08, 0.12, 'nose');
      for (const ez of [-0.16, 0.16]) add(hx + hs / 2 + 0.01, hy + 0.08, ez, 0.04, 0.1, 0.08, 'eye');
      if (S === 'dog') for (const ez of [-0.33, 0.33]) add(hx - 0.05, hy + 0.12 + wag * 0.1, ez, 0.2, 0.4, 0.08, 'ear');
      if (S === 'cat') for (const ez of [-0.18, 0.18]) { add(hx - 0.02, hy + 0.36, ez, 0.18, 0.18, 0.16, 'body'); add(hx, hy + 0.34, ez, 0.08, 0.12, 0.08, 'ear'); }
      if (S === 'fennec') for (const ez of [-0.22, 0.22]) { add(hx - 0.04, hy + 0.5, ez, 0.26, 0.52, 0.12, 'body'); add(hx, hy + 0.5, ez, 0.12, 0.38, 0.06, 'ear'); }
      if (S === 'capybara') for (const ez of [-0.2, 0.2]) add(hx - 0.12, hy + 0.36, ez, 0.12, 0.1, 0.1, 'ear');
      if (S === 'bunny') for (const ez of [-0.14, 0.14]) { add(hx - 0.08, hy + 0.6 + Math.abs(wag) * 0.2, ez, 0.16, 0.7, 0.12, 'body'); add(hx - 0.02, hy + 0.6, ez, 0.06, 0.5, 0.06, 'ear'); }
      if (short && eq.body === 'jersey') add(0, bodyY + 0.02, 0, 1.0, 0.7, 0.85, 'item-jersey');
      bodyGear(bodyY, 0.66);
    } else if (shape === 'small') {
      const bodyY = 0.42;
      for (const [lx, lz] of [[-0.25, -0.2], [-0.25, 0.2], [0.25, -0.2], [0.25, 0.2]]) add(lx, 0.08, lz, 0.14, 0.14, 0.14, 'ear');
      add(0, bodyY, 0, 0.95, 0.7, 0.8, 'body'); add(0.18, bodyY - 0.12, 0, 0.55, 0.42, 0.82, 'belly');
      if (S === 'hedgehog') for (let i = 0; i < 12; i++) add(-0.36 + (i % 4) * 0.19, bodyY + 0.38 + (i % 2) * 0.06, -0.28 + Math.floor(i / 4) * 0.23, 0.11, i % 2 ? 0.24 : 0.16, 0.11, i % 2 ? 'quill' : 'nose');
      hx = 0.48; hy = bodyY + 0.12; hs = 0.44;
      add(hx, hy, 0, hs, hs, hs, S === 'hedgehog' ? 'belly' : 'body');
      add(hx + hs / 2 + 0.03, hy - 0.04, 0, 0.06, 0.06, 0.08, 'nose');
      for (const ez of [-0.11, 0.11]) add(hx + hs / 2 + 0.01, hy + 0.06, ez, 0.03, 0.07, 0.06, 'eye');
      if (S === 'hamster') { for (const ez of [-0.16, 0.16]) add(hx - 0.05, hy + 0.24, ez, 0.12, 0.1, 0.08, 'ear'); for (const ez of [-0.2, 0.2]) add(hx + 0.1, hy - 0.1, ez, 0.14, 0.14, 0.08, 'belly'); }
      bodyGear(bodyY, 0.8);
    } else if (shape === 'shell') {
      for (const [lx, lz] of [[-0.35, -0.32], [-0.35, 0.32], [0.35, -0.32], [0.35, 0.32]]) add(lx, 0.1, lz, 0.2, 0.18, 0.2, 'ear');
      add(0, 0.32, 0, 1.0, 0.36, 0.8, 'belly'); add(0, 0.52, 0, 0.9, 0.3, 0.7, 'body'); add(0, 0.7, 0, 0.6, 0.12, 0.5, 'body');
      for (const [sx, sz] of [[-0.2, -0.15], [0.2, 0.15], [0.2, -0.15], [-0.2, 0.15]]) add(sx, 0.79, sz, 0.14, 0.04, 0.14, 'ear');
      add(-0.56, 0.24, 0, 0.16, 0.1, 0.1, 'ear');
      hx = 0.66 + Math.abs(wag) * 0.05; hy = 0.36; hs = 0.32;
      add(hx, hy, 0, hs, hs, hs, 'ear');
      for (const ez of [-0.08, 0.08]) add(hx + hs / 2 + 0.01, hy + 0.05, ez, 0.03, 0.06, 0.05, 'eye');
      bodyGear(0.55, 0.8);
    } else if (shape === 'fin') {
      // Pecera de cristal abierta: marco fino en vez de un bloque de agua, para que el pez se vea.
      add(0, 0.06, 0, 1.8, 0.1, 1.1, 'glass');
      for (const [gx, gz] of [[-0.86, -0.52], [-0.86, 0.52], [0.86, -0.52], [0.86, 0.52]]) add(gx, 0.62, gz, 0.07, 1.12, 0.07, 'glass');
      add(0, 1.18, 0, 1.8, 0.06, 1.1, 'glass');
      for (const [bx, by, bz] of [[0.55, 0.5, 0.3], [0.62, 0.72, 0.36], [0.5, 0.92, 0.28]]) add(bx, by + (options.reduced ? 0 : Math.sin(t * 2 + by * 4) * 0.04), bz, 0.07, 0.07, 0.07, 'bubble');
      const sw = options.reduced ? 0 : Math.sin(t * 2) * 0.25, fy = 0.62 + (options.reduced ? 0 : Math.sin(t * 3) * 0.05);
      add(sw, fy, 0, 0.6, 0.38, 0.22, 'body'); add(sw + 0.06, fy - 0.08, 0, 0.4, 0.14, 0.24, 'belly');
      add(sw - 0.4, fy, 0, 0.12, 0.36 + Math.abs(wag) * 0.1, 0.06, 'ear'); add(sw, fy + 0.24, 0, 0.24, 0.1, 0.04, 'ear');
      hx = sw + 0.28; hy = fy; hs = 0.3;
      for (const ez of [-0.11, 0.11]) add(hx + 0.04, hy + 0.04, ez, 0.04, 0.06, 0.03, 'eye');
    } else if (shape === 'lizard') {
      // Lagarto: cuerpo bajo y largo, cola, cuatro patas y cresta.
      const bodyY = 0.3;
      for (const [lx, lz] of [[-0.5, -0.34], [-0.5, 0.34], [0.45, -0.34], [0.45, 0.34]]) add(lx, 0.1, lz, 0.18, 0.16, 0.16, 'body');
      add(0, bodyY, 0, 1.5, 0.3, 0.5, 'body'); add(0.05, bodyY - 0.1, 0, 1.2, 0.12, 0.52, 'belly');
      for (let i = 0; i < 4; i++) add(-0.85 - i * 0.2, bodyY - 0.02, wag * (1 + i * 0.4), 0.22 - i * 0.04, 0.14 - i * 0.02, 0.16 - i * 0.03, 'body');
      for (let i = 0; i < 5; i++) add(-0.35 + i * 0.22, bodyY + 0.19, 0, 0.1, 0.12 + (i === 2 ? 0.05 : 0), 0.08, 'ear');
      hx = 0.82; hy = bodyY + 0.06; hs = 0.4;
      add(hx, hy, 0, hs + 0.12, hs, hs, 'body'); add(hx + 0.24, hy - 0.03, 0, 0.14, 0.12, 0.18, 'ear');
      for (const ez of [-0.12, 0.12]) add(hx + 0.14, hy + 0.1, ez, 0.05, 0.07, 0.05, 'eye');
      bodyGear(bodyY, 0.5);
    } else if (shape === 'snake') {
      // Serpiente: espiral de anillas en el suelo y cuello que se alza.
      const r = 0.62;
      for (let i = 0; i < 12; i++) { const a = i * 0.55 + (options.reduced ? 0 : t * 0.3); add(Math.cos(a) * r * (1 - i * 0.05), 0.1 + i * 0.05, Math.sin(a) * r * (1 - i * 0.05), 0.34, 0.2, 0.34, i % 2 ? 'body' : 'belly'); }
      for (let i = 0; i < 4; i++) add(0.35 + i * 0.05, 0.72 + i * 0.16, 0, 0.26 - i * 0.02, 0.18, 0.26 - i * 0.02, 'body');
      hx = 0.56; hy = 1.34; hs = 0.34;
      add(hx, hy, 0, hs + 0.12, hs * 0.8, hs, 'body');
      add(hx + 0.26, hy - 0.02, 0, 0.14, 0.04, 0.04, 'tongue');
      for (const ez of [-0.1, 0.1]) add(hx + 0.14, hy + 0.06, ez, 0.04, 0.06, 0.05, 'eye');
      bodyGear(0.3, 0.44);
    } else if (shape === 'spider') {
      // Tarántula: cuerpo redondo, ocho patas y ojos.
      const bodyY = 0.34;
      add(0, bodyY, 0, 0.72, 0.46, 0.66, 'body'); add(0.02, bodyY + 0.22, 0, 0.44, 0.14, 0.44, 'ear');
      for (let i = 0; i < 8; i++) {
        const side = i < 4 ? 1 : -1, k = i % 4;
        const ang = -0.75 + k * 0.5;
        for (let seg = 0; seg < 3; seg++) {
          const r = 0.48 + seg * 0.26, drop = 0.16 - seg * 0.02 + k * 0.01;
          add(side * Math.cos(ang) * r, drop, Math.sin(ang) * r * 1.15, seg === 0 ? 0.34 : 0.3, 0.09, 0.09, seg === 1 ? 'quill' : 'ear', side * ang);
        }
      }
      hx = 0.46; hy = bodyY + 0.06; hs = 0.3;
      add(hx, hy, 0, hs, hs, hs, 'body');
      for (const ez of [-0.08, 0.08]) add(hx + hs / 2, hy + 0.05, ez, 0.03, 0.05, 0.04, 'eye');
      bodyGear(bodyY, 0.5);
    } else { // bird
      for (const lz of [-0.12, 0.12]) add(0, 0.18, lz, 0.06, 0.3, 0.06, 'beak');
      add(0, 0.62, 0, 0.56, 0.68, 0.52, 'body'); add(0.12, 0.55, 0, 0.32, 0.46, 0.54, 'belly');
      for (const wz of [-0.3, 0.3]) add(-0.04, 0.66 + (happy && !options.reduced ? Math.abs(Math.sin(t * 8)) * 0.08 : 0), wz, 0.4, 0.5, 0.08, 'ear');
      add(-0.38, 0.4, 0, 0.14, 0.5, 0.18, 'ear');
      hx = 0.08; hy = 1.1; hs = 0.42;
      add(hx, hy, 0, hs, hs, hs, 'body');
      add(hx + 0.27, hy - 0.05, 0, 0.14, 0.16, 0.12, 'beak');
      for (const ez of [-0.13, 0.13]) add(hx + hs / 2 + 0.01, hy + 0.06, ez, 0.03, 0.08, 0.07, 'eye');
      bodyGear(0.62, 0.55);
    }
    function bodyGear(bodyY, w) {
      if (eq.body === 'jersey' && shape !== 'quad') add(0.02, bodyY + 0.02, 0, 0.7, 0.4, w + 0.04, 'item-jersey');
      else if (eq.body === 'jersey' && !(S === 'capybara' || S === 'bunny')) { add(0.02, bodyY + 0.02, 0, 1.0, 0.64, 0.7, 'item-jersey'); add(0.02, bodyY + 0.05, 0.36, 0.2, 0.2, 0.02, 'line'); }
      if (eq.body === 'hoodie') add(0.02, bodyY + 0.04, 0, shape === 'quad' ? 1.05 : 0.72, shape === 'quad' ? 0.66 : 0.44, w + 0.06, 'item-hoodie');
      if (eq.body === 'cape') add(-0.2, bodyY + 0.12, 0, shape === 'quad' ? 1.0 : 0.6, 0.08, w + 0.12, 'item-cape');
    }
    // Accesorios de cabeza, cara y cuello (respecto a la cabeza).
    if (shape !== 'fin') {
      if (eq.neck === 'collar') add(hx - hs * 0.4, hy - hs * 0.45, 0, 0.16, 0.12, hs * 1.08, 'item-collar');
      if (eq.neck === 'bandana') { add(hx - hs * 0.35, hy - hs * 0.48, 0, 0.2, 0.18, hs * 1.12, 'item-bandana'); add(hx - hs * 0.08, hy - hs * 0.72, 0, 0.16, 0.16, hs * 0.5, 'item-bandana'); }
      if (eq.neck === 'bowtie') { add(hx + hs * 0.2, hy - hs * 0.5, -0.07, 0.06, 0.1, 0.12, 'item-bowtie'); add(hx + hs * 0.2, hy - hs * 0.5, 0.07, 0.06, 0.1, 0.12, 'item-bowtie'); }
      if (eq.neck === 'scarf') add(hx - hs * 0.4, hy - hs * 0.5, 0, 0.22, 0.16, hs * 1.15, 'item-scarf');
      if (eq.neck === 'bell') { add(hx - hs * 0.35, hy - hs * 0.46, 0, 0.07, 0.06, hs * 1.02, 'item-bell'); add(hx + hs * 0.3, hy - hs * 0.62, 0, 0.1, 0.1, 0.1, 'item-bell'); }
      if (eq.neck === 'pearls') for (let i = 0; i < 5; i++) add(hx - hs * 0.42, hy - hs * 0.5, (i - 2) * 0.09, 0.05, 0.05, 0.05, 'item-pearls');
      if (eq.neck === 'medal') { add(hx - hs * 0.35, hy - hs * 0.48, 0, 0.06, 0.06, hs * 1.05, 'item-bandana'); add(hx + hs * 0.25, hy - hs * 0.75, 0, 0.04, 0.16, 0.16, 'item-medal'); }
      if (eq.neck === 'gold') { add(hx - hs * 0.3, hy - hs * 0.48, 0, 0.06, 0.06, hs * 1.05, 'item-gold'); for (let i = 0; i < 3; i++) add(hx + hs * 0.18, hy - hs * 0.8 + i * 0.05, 0, 0.1, 0.05, 0.1, 'item-gold'); }
      if (eq.head === 'cap') { add(hx - 0.02, hy + hs / 2 + 0.07, 0, hs * 0.95, 0.16, hs * 0.95, 'item-cap'); add(hx + hs / 2 + 0.12, hy + hs / 2 + 0.02, 0, 0.28, 0.05, hs * 0.8, 'item-cap-visor'); }
      if (eq.head === 'headband') add(hx, hy + hs * 0.3, 0, hs + 0.03, 0.1, hs + 0.03, 'item-headband');
      if (eq.head === 'beanie') { add(hx - 0.02, hy + hs / 2 + 0.08, 0, hs * 0.98, 0.2, hs * 0.98, 'item-beanie'); add(hx - 0.02, hy + hs / 2 + 0.24, 0, 0.12, 0.12, 0.12, 'line'); }
      if (eq.head === 'bow') { for (const bz of [-0.14, 0.14]) add(hx - hs * 0.1, hy + hs / 2 + 0.14, bz, 0.2, 0.14, 0.1, 'item-bow'); add(hx - hs * 0.1, hy + hs / 2 + 0.14, 0, 0.06, 0.06, 0.06, 'item-bow'); }
      if (eq.head === 'straw') { add(hx, hy + hs / 2 + 0.05, 0, hs * 1.5, 0.05, hs * 1.5, 'item-straw'); add(hx, hy + hs / 2 + 0.2, 0, hs * 0.8, 0.24, hs * 0.8, 'item-straw'); }
      if (eq.head === 'grad') { add(hx, hy + hs / 2 + 0.08, 0, hs * 1.4, 0.04, hs * 1.4, 'item-grad'); add(hx + hs * 0.5, hy + hs / 2 + 0.24, 0, 0.04, 0.24, 0.04, 'item-grad'); add(hx + hs * 0.5, hy + hs / 2 - 0.02, 0.08, 0.08, 0.1, 0.1, 'item-grad'); }
      if (eq.head === 'tophat') { add(hx, hy + hs / 2 + 0.06, 0, hs * 1.2, 0.05, hs * 1.2, 'item-tophat'); add(hx, hy + hs / 2 + 0.3, 0, hs * 0.7, 0.42, hs * 0.7, 'item-tophat'); }
      if (eq.head === 'star') { add(hx, hy + hs / 2 + 0.42, 0, 0.12, 0.12, 0.12, 'item-star'); add(hx - 0.14, hy + hs / 2 + 0.32, 0.06, 0.1, 0.1, 0.1, 'item-star'); add(hx + 0.14, hy + hs / 2 + 0.32, -0.06, 0.1, 0.1, 0.1, 'item-star'); }
      if (eq.head === 'crown') { add(hx, hy + hs / 2 + 0.1, 0, hs * 0.7, 0.18, hs * 0.7, 'item-crown'); for (const cz of [-0.15, 0, 0.15]) add(hx, hy + hs / 2 + 0.26, cz * hs / 0.62, 0.08, 0.14, 0.08, 'item-crown'); }
      if (eq.face === 'shades') add(hx + hs / 2 + 0.03, hy + 0.08, 0, 0.05, 0.12, hs * 0.9, 'item-shades');
      if (eq.face === 'glasses') { add(hx + hs / 2 + 0.03, hy + 0.08, 0, 0.05, 0.1, hs * 0.9, 'item-glasses'); add(hx + hs / 2 + 0.05, hy + 0.08, 0, 0.03, 0.02, hs * 0.2, 'item-glasses'); }
      if (eq.face === 'sun') { add(hx + hs / 2 + 0.03, hy + 0.08, 0, 0.05, 0.11, hs * 0.95, 'item-sun'); }
      if (eq.face === 'disguise') { add(hx + hs / 2 + 0.05, hy - 0.06, 0, 0.05, 0.06, hs * 0.7, 'item-disguise'); }
      if (eq.face === 'goggles') { add(hx + hs / 2 + 0.04, hy + 0.08, 0, 0.06, 0.16, hs * 0.95, 'item-goggles'); add(hx, hy + 0.08, 0, hs + 0.02, 0.05, hs + 0.02, 'item-shades'); }
    }
    // Juguete en el suelo (delante de la mascota) y balón si sabe algún truco de pelota.
    if (eq.toy) {
      const tx = 0.95, tz = 0.62, ty = 0.12;
      const col = 'item-' + eq.toy;
      if (eq.toy === 'bone') { add(tx, ty, tz, 0.34, 0.06, 0.08, col); for (const bz of [-0.16, 0.16]) add(tx + bz, ty, tz, 0.08, 0.12, 0.12, col); }
      else if (eq.toy === 'teddy') { add(tx, ty + 0.08, tz, 0.2, 0.2, 0.16, col); add(tx, ty + 0.24, tz, 0.14, 0.12, 0.12, col); for (const bz of [-0.06, 0.06]) add(tx, ty + 0.32, tz + bz, 0.06, 0.06, 0.06, col); }
      else if (eq.toy === 'cup') { add(tx, ty + 0.02, tz, 0.2, 0.06, 0.2, col); add(tx, ty + 0.16, tz, 0.16, 0.2, 0.16, col); add(tx, ty + 0.3, tz, 0.1, 0.06, 0.1, col); }
      else add(tx, ty + 0.1, tz, 0.22, 0.22, 0.22, col);
    }
    if ((pet.tricks && ((pet.tricks.dribble || 0) >= 100 || (pet.tricks.fetch || 0) >= 100))) add(0.95, 0.2 + (options.reduced ? 0 : Math.abs(Math.sin(t * 5)) * 0.25), -0.55, 0.3, 0.3, 0.3, 'ball');

    const stage = pet.stage || (Pet.stageOf ? Pet.stageOf(pet) : 'adult');
    const K = 1.5 * (STAGE_SCALE[stage] || 1);
    for (const c of cubes) { c.x = c.x * K + 0.3; c.y *= K; c.z *= K; c.sx *= K; c.sy *= K; c.sz *= K; }
    return { version: CAA.Voxel.VERSION, kind: 'avatar', cubes, colors, quality: 'low', aspect: 0.8, maxCubes: CAA.Voxel.MAX_CUBES };
  }
  CAA.PetVox = { geometry, STAGE_SCALE, tint };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.PetVox;
})(typeof globalThis !== 'undefined' ? globalThis : this);
