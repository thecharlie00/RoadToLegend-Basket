(function (root) {
  'use strict';
  // Modelo vóxel procedural de la mascota (perro, gato, conejo) con accesorios visibles.
  // Devuelve una escena compatible con CAA.Voxel.createRenderer().draw(scene, 'avatar').
  const CAA = root.CAA = root.CAA || {};
  const hex = s => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];

  function geometry(pet, options = {}) {
    const Pet = CAA.Pet;
    const sp = Pet.SPECIES[pet.species] || Pet.SPECIES.dog;
    const colors = Object.assign({}, CAA.Voxel.palette(options), { body: hex(sp.body), belly: hex(sp.belly), ear: hex(sp.ear), eye: hex('#141414'), nose: hex('#2a1a14'), tongue: hex('#ff7a8a') });
    for (const it of Pet.ITEMS) colors['item-' + it.id] = hex(it.color);
    colors['item-cap-visor'] = hex('#1d4f7a');
    const cubes = [];
    const t = options.t || 0;
    const happy = pet.happiness >= 60;
    const hop = happy && !options.reduced ? Math.abs(Math.sin(t * 3)) * 0.12 : 0;
    const wag = options.reduced ? 0 : Math.sin(t * (happy ? 12 : 4)) * (happy ? 0.25 : 0.08);
    const add = (x, y, z, sx, sy, sz, color) => cubes.push({ x, y: y + hop, z, sx, sy, sz, color, yaw: 0 });
    cubes.push({ x: 0, y: 0.03, z: 0, sx: 2.2, sy: 0.04, sz: 1.2, color: 'shadow', yaw: 0 });
    const S = pet.species;
    const legH = S === 'bunny' ? 0.35 : S === 'cat' ? 0.55 : 0.6;
    const bodyY = legH + (S === 'bunny' ? 0.4 : 0.32);
    // patas
    for (const [lx, lz] of [[-0.45, -0.25], [-0.45, 0.25], [0.45, -0.25], [0.45, 0.25]]) {
      add(lx, legH / 2 + 0.02, lz, 0.22, legH, 0.22, 'body');
      if (pet.equipped.feet === 'sneakers') add(lx + 0.03, 0.09, lz, 0.3, 0.16, 0.28, 'item-sneakers');
    }
    // cuerpo
    if (S === 'bunny') { add(-0.05, bodyY, 0, 1.1, 0.8, 0.85, 'body'); add(0.1, bodyY - 0.08, 0, 0.7, 0.55, 0.88, 'belly'); add(-0.68, bodyY + 0.1, 0, 0.28, 0.28, 0.28, 'belly'); }
    else { add(0, bodyY, 0, 1.3, 0.6, 0.66, 'body'); add(0.05, bodyY - 0.2, 0, 0.9, 0.24, 0.68, 'belly'); }
    if (pet.equipped.body === 'jersey') { add(0.02, bodyY + 0.02, 0, 1.0, 0.64, 0.7, 'item-jersey'); add(0.02, bodyY + 0.05, 0.36, 0.2, 0.2, 0.02, 'line'); }
    // cola
    if (S === 'dog') add(-0.78, bodyY + 0.3 + wag * 0.3, wag, 0.14, 0.45, 0.14, 'body');
    if (S === 'cat') { add(-0.8, bodyY + 0.25, wag, 0.12, 0.6, 0.12, 'body'); add(-0.86, bodyY + 0.62, wag * 1.4, 0.12, 0.22, 0.12, 'ear'); }
    // cabeza
    const hx = S === 'bunny' ? 0.55 : 0.72, hy = bodyY + (S === 'bunny' ? 0.55 : 0.45), hs = S === 'cat' ? 0.56 : 0.62;
    add(hx, hy, 0, hs, hs, hs, 'body');
    if (S === 'dog') { add(hx + 0.38, hy - 0.1, 0, 0.3, 0.26, 0.34, 'belly'); add(hx + 0.55, hy - 0.02, 0, 0.1, 0.1, 0.14, 'nose'); if (happy) add(hx + 0.48, hy - 0.26, 0.05, 0.12, 0.14, 0.1, 'tongue'); }
    else add(hx + 0.3, hy - 0.08, 0, 0.06, 0.08, 0.12, 'nose');
    for (const ez of [-0.16, 0.16]) add(hx + hs / 2 + 0.01, hy + 0.08, ez, 0.04, 0.1, 0.08, 'eye');
    // orejas
    if (S === 'dog') for (const ez of [-0.33, 0.33]) add(hx - 0.05, hy + 0.12 + wag * 0.1, ez, 0.2, 0.4, 0.08, 'ear');
    if (S === 'cat') for (const ez of [-0.18, 0.18]) { add(hx - 0.02, hy + 0.36, ez, 0.18, 0.18, 0.16, 'body'); add(hx, hy + 0.34, ez, 0.08, 0.12, 0.08, 'ear'); }
    if (S === 'bunny') for (const ez of [-0.14, 0.14]) { add(hx - 0.08, hy + 0.6 + Math.abs(wag) * 0.2, ez, 0.16, 0.7, 0.12, 'body'); add(hx - 0.02, hy + 0.6, ez, 0.06, 0.5, 0.06, 'ear'); }
    // accesorios
    const eq = pet.equipped;
    if (eq.neck === 'collar') add(hx - 0.25, hy - 0.28, 0, 0.16, 0.16, 0.66, 'item-collar');
    if (eq.neck === 'bandana') { add(hx - 0.22, hy - 0.3, 0, 0.2, 0.22, 0.7, 'item-bandana'); add(hx - 0.05, hy - 0.45, 0, 0.18, 0.18, 0.3, 'item-bandana'); }
    if (eq.head === 'cap') { add(hx - 0.02, hy + hs / 2 + 0.07, 0, hs * 0.95, 0.16, hs * 0.95, 'item-cap'); add(hx + hs / 2 + 0.12, hy + hs / 2 + 0.02, 0, 0.28, 0.05, hs * 0.8, 'item-cap-visor'); }
    if (eq.head === 'headband') add(hx, hy + 0.18, 0, hs + 0.03, 0.1, hs + 0.03, 'item-headband');
    if (eq.head === 'crown') { add(hx, hy + hs / 2 + 0.1, 0, 0.42, 0.18, 0.42, 'item-crown'); for (const cz of [-0.15, 0, 0.15]) add(hx, hy + hs / 2 + 0.26, cz, 0.08, 0.14, 0.08, 'item-crown'); }
    if (eq.face === 'shades') add(hx + hs / 2 + 0.03, hy + 0.08, 0, 0.05, 0.12, hs * 0.9, 'item-shades');
    // balón de baloncesto si sabe algún truco de pelota
    if ((pet.tricks.dribble || 0) >= 100 || (pet.tricks.fetch || 0) >= 100) add(0.95, 0.2 + (options.reduced ? 0 : Math.abs(Math.sin(t * 5)) * 0.25), 0.55, 0.3, 0.3, 0.3, 'ball');
    const K = 1.35; // escala para llenar el encuadre del avatar
    for (const c of cubes) { c.x *= K; c.y *= K; c.z *= K; c.sx *= K; c.sy *= K; c.sz *= K; }
    return { version: CAA.Voxel.VERSION, kind: 'avatar', cubes, colors, quality: 'low', aspect: 0.8, maxCubes: CAA.Voxel.MAX_CUBES };
  }
  CAA.PetVox = { geometry };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.PetVox;
})(typeof globalThis !== 'undefined' ? globalThis : this);
