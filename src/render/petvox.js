(function (root) {
  'use strict';
  // Modelo vóxel procedural de la mascota (10 especies en 5 plantillas: cuadrúpedo, pequeño, caparazón, pez y ave)
  // con accesorios visibles y tamaño según la etapa (cría, joven, adulta, senior).
  // Devuelve una escena compatible con CAA.Voxel.createRenderer().draw(scene, 'avatar').
  const CAA = root.CAA = root.CAA || {};
  const hex = s => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
  const STAGE_SCALE = { baby: 0.72, young: 0.86, adult: 1, senior: 0.96 };

  function geometry(pet, options = {}) {
    const Pet = CAA.Pet;
    const sp = Pet.SPECIES[pet.species] || Pet.SPECIES.dog;
    const colors = Object.assign({}, CAA.Voxel.palette(options), { body: hex(sp.body), belly: hex(sp.belly), ear: hex(sp.ear), eye: hex('#141414'), nose: hex('#2a1a14'), tongue: hex('#ff7a8a'), glass: hex('#9fd8ff'), water: hex('#4aa3df'), beak: hex('#ffb21e'), grey: hex('#cfcfcf') });
    for (const it of Pet.ITEMS) colors['item-' + it.id] = hex(it.color);
    colors['item-cap-visor'] = hex('#1d4f7a');
    const cubes = [];
    const t = options.t || 0;
    const happy = pet.happiness >= 60;
    const hop = happy && !options.reduced ? Math.abs(Math.sin(t * 3)) * 0.12 : 0;
    const wag = options.reduced ? 0 : Math.sin(t * (happy ? 12 : 4)) * (happy ? 0.25 : 0.08);
    const add = (x, y, z, sx, sy, sz, color) => cubes.push({ x, y: y + hop, z, sx, sy, sz, color, yaw: 0 });
    cubes.push({ x: 0, y: 0.03, z: 0, sx: 2.2, sy: 0.04, sz: 1.2, color: 'shadow', yaw: 0 });
    const S = pet.species, shape = sp.shape || 'quad', eq = pet.equipped || {};
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
      if (S === 'hedgehog') for (let i = 0; i < 9; i++) add(-0.3 + (i % 3) * 0.2, bodyY + 0.36 + (i % 2) * 0.05, -0.25 + Math.floor(i / 3) * 0.25, 0.1, 0.18, 0.1, 'ear');
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
      // Pecera con agua y el pez nadando.
      add(0, 0.12, 0, 1.6, 0.06, 1.0, 'glass'); add(0, 0.62, 0, 1.6, 1.0, 1.0, 'water');
      const sw = options.reduced ? 0 : Math.sin(t * 2) * 0.25, fy = 0.65 + (options.reduced ? 0 : Math.sin(t * 3) * 0.05);
      add(sw, fy, 0, 0.6, 0.38, 0.22, 'body'); add(sw + 0.06, fy - 0.08, 0, 0.4, 0.14, 0.24, 'belly');
      add(sw - 0.4, fy, 0, 0.12, 0.36 + Math.abs(wag) * 0.1, 0.06, 'ear'); add(sw, fy + 0.24, 0, 0.24, 0.1, 0.04, 'ear');
      hx = sw + 0.28; hy = fy; hs = 0.3;
      for (const ez of [-0.11, 0.11]) add(hx + 0.04, hy + 0.04, ez, 0.04, 0.06, 0.03, 'eye');
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
      if (eq.neck === 'medal') { add(hx - hs * 0.35, hy - hs * 0.48, 0, 0.06, 0.06, hs * 1.05, 'item-bandana'); add(hx + hs * 0.25, hy - hs * 0.75, 0, 0.04, 0.16, 0.16, 'item-medal'); }
      if (eq.head === 'cap') { add(hx - 0.02, hy + hs / 2 + 0.07, 0, hs * 0.95, 0.16, hs * 0.95, 'item-cap'); add(hx + hs / 2 + 0.12, hy + hs / 2 + 0.02, 0, 0.28, 0.05, hs * 0.8, 'item-cap-visor'); }
      if (eq.head === 'headband') add(hx, hy + hs * 0.3, 0, hs + 0.03, 0.1, hs + 0.03, 'item-headband');
      if (eq.head === 'beanie') { add(hx - 0.02, hy + hs / 2 + 0.08, 0, hs * 0.98, 0.2, hs * 0.98, 'item-beanie'); add(hx - 0.02, hy + hs / 2 + 0.24, 0, 0.12, 0.12, 0.12, 'line'); }
      if (eq.head === 'crown') { add(hx, hy + hs / 2 + 0.1, 0, hs * 0.7, 0.18, hs * 0.7, 'item-crown'); for (const cz of [-0.15, 0, 0.15]) add(hx, hy + hs / 2 + 0.26, cz * hs / 0.62, 0.08, 0.14, 0.08, 'item-crown'); }
      if (eq.face === 'shades') add(hx + hs / 2 + 0.03, hy + 0.08, 0, 0.05, 0.12, hs * 0.9, 'item-shades');
      if (eq.face === 'goggles') { add(hx + hs / 2 + 0.04, hy + 0.08, 0, 0.06, 0.16, hs * 0.95, 'item-goggles'); add(hx, hy + 0.08, 0, hs + 0.02, 0.05, hs + 0.02, 'item-shades'); }
    }
    // Balón si sabe algún truco de pelota.
    if ((pet.tricks.dribble || 0) >= 100 || (pet.tricks.fetch || 0) >= 100) add(0.95, 0.2 + (options.reduced ? 0 : Math.abs(Math.sin(t * 5)) * 0.25), 0.55, 0.3, 0.3, 0.3, 'ball');
    const K = 1.35 * (STAGE_SCALE[Pet.stageOf ? Pet.stageOf(pet) : 'adult'] || 1); // etapa: las crías son pequeñas
    for (const c of cubes) { c.x *= K; c.y *= K; c.z *= K; c.sx *= K; c.sy *= K; c.sz *= K; }
    return { version: CAA.Voxel.VERSION, kind: 'avatar', cubes, colors, quality: 'low', aspect: 0.8, maxCubes: CAA.Voxel.MAX_CUBES };
  }
  CAA.PetVox = { geometry, STAGE_SCALE };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.PetVox;
})(typeof globalThis !== 'undefined' ? globalThis : this);
