(function (root) {
  'use strict';
  // Minijuegos en 3D vóxel: media pista FIBA con grada, videomarcador, aro de cubos y red deformable.
  // Solo dibuja el estado que recibe (igual que arcade2d): el resultado lo decide CAA.Arcade.
  const CAA = root.CAA = root.CAA || {};
  const L = 28, W = 15, HX = L / 2 - 1.575, RIM = [HX, 3.05, 0];
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;
  const hex = s => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];

  // Posición del lanzador según el juego y la ronda (metros, aro derecho).
  function spot(view) {
    if (view.type === 'freeThrow') return [HX - 4.6, 0];
    if (view.type === 'three') { const a = [-1.2, -0.6, 0, 0.6, 1.2][view.round % 5]; return [HX - Math.cos(a) * 6.9, Math.sin(a) * 6.9]; }
    if (view.type === 'buzzer') return [HX - 7.6, 1.2];
    if (view.type === 'dunk') { const t = view.anim ? Math.min(1, view.anim.t * 1.4) : 0; return [lerp(HX - 6, HX - 0.9, ease(t)), lerp(-2.5, 0, ease(t))]; }
    return [HX - 5.5, 0];
  }
  function figure(add, x, z, yaw, pose, colors) {
    const c = Math.cos(yaw), s = Math.sin(yaw), j = pose.jump * 0.9, k = pose.crouch * 0.18;
    const part = (px, py, pz, sx, sy, sz, color) => add(x + px * c + pz * s, py + j - (py > 0.6 ? k : 0), z - px * s + pz * c, sx, sy, sz, color, yaw);
    add(x, 0.07, z, 0.9 * (1 - pose.jump * 0.3), 0.02, 0.7, 'shadow');
    part(-0.16, 0.13, 0.06, 0.24, 0.2, 0.4, colors.shoes); part(0.16, 0.13, 0.06, 0.24, 0.2, 0.4, colors.shoes);
    part(-0.16, 0.48, 0, 0.22, 0.55 - k, 0.24, 'skinA'); part(0.16, 0.48, 0, 0.22, 0.55 - k, 0.24, 'skinA');
    part(0, 0.84, 0, 0.62, 0.35, 0.36, colors.jersey); part(0, 1.25, 0, 0.64, 0.55, 0.38, colors.jersey);
    part(0, 1.72, 0, 0.42, 0.42, 0.4, 'skinA'); part(0, 1.94, -0.02, 0.44, 0.12, 0.42, 'hair');
    const up = pose.arm; // 0 brazos abajo, 1 brazos arriba (follow-through)
    part(-0.43, 1.22 + up * 0.55, up * 0.25, 0.2, 0.55, 0.22, 'skinA'); part(0.43, 1.22 + up * 0.55, up * 0.25, 0.2, 0.55, 0.22, 'skinA');
    // mano de tiro: algo adelantada y hacia la derecha, para que la cámara (detrás-derecha) vea el balón
    return [x + 0.42 * c + 0.3 * s, 1.55 + j + up * 0.75, z - 0.42 * s + 0.3 * c];
  }
  function geometry(view, options = {}) {
    const colors = Object.assign({}, CAA.Voxel.palette(options), { mine: hex(options.jersey || '#ff7a1f'), rival: hex('#3be3ff') });
    const court = CAA.Voxel.courtGeometry('FIBA-2026', 'low');
    const cubes = court.cubes.filter(c => c.x > -2);
    const add = (x, y, z, sx, sy, sz, color, yaw = 0) => cubes.push({ x, y, z, sx, sy, sz, color, yaw });
    const t = view.now / 1000;
    const a = view.anim;
    const kick = view.netKick || 0;
    CAA.Voxel.rimAndNet(add, HX, kick, t);
    CAA.Voxel.arenaDressing((x, y, z, sx, sy, sz, color, yaw) => { if (x > -2) add(x, y, z, sx, sy, sz, color, yaw); }, L, W, { t, hype: view.hype || 0.2, reducedMotion: options.reducedMotion });
    const [sx, sz] = spot(view);
    const yaw = Math.atan2(RIM[0] - sx, RIM[2] - sz);
    let pose = { crouch: 0, jump: 0, arm: 0 };
    if (view.phase === 'aim') pose = view.type === 'buzzer' ? { crouch: Math.max(0, 1 - view.cursor * 2), jump: view.cursor, arm: 0.2 } : { crouch: 0.45 + Math.sin(t * 6) * 0.25, jump: 0, arm: 0.1 };
    if (a) pose = { crouch: 0, jump: (view.type === 'dunk' ? 1.4 : 1) * Math.sin(Math.min(1, a.t * 1.6) * Math.PI) * 0.75, arm: Math.min(1, a.t * 3) };
    const defending = view.type === 'defense' || (view.type === 'street' && view.round % 2 === 1);
    if (view.type === 'defense' || view.type === 'street') {
      // rival que bota hacia el aro; tú defiendes entre él y la canasta (o atacas en 1×1)
      const rx = HX - 4.2 + Math.sin(t * 1.5) * 0.4, rz = Math.sin(t * 2.1) * 0.8;
      const hand = figure(add, defending ? rx - 1.4 : rx + 1.4, rz, defending ? Math.PI / 2 : -Math.PI / 2, { crouch: 0.35, jump: 0, arm: 0.15 }, { jersey: 'rival', shoes: 'shoes' });
      if (defending) { const by = 0.25 + Math.abs(Math.sin(t * 7)) * 0.7; add(hand[0], by, hand[2] + 0.35, 0.24, 0.24, 0.24, 'ball'); }
    }
    const hands = figure(add, defending ? HX - 3.2 : sx, defending ? 0 : sz, defending ? -Math.PI / 2 : yaw, pose, { jersey: 'mine', shoes: 'shoes' });
    if (!defending) {
      let b;
      if (!a) b = [hands[0], view.type === 'freeThrow' && view.phase === 'aim' ? 0.3 + Math.abs(Math.sin(t * 5)) * 0.9 : hands[1], hands[2]];
      else {
        const k = ease(Math.min(1, a.t)), top = Math.max(hands[1], 3.05) + (view.type === 'dunk' ? 0.4 : 1.3);
        if (a.made || k < 0.75) {
          const u = Math.min(1, k / 0.75);
          b = [lerp(hands[0], RIM[0], u), (1 - u) * (1 - u) * hands[1] + 2 * (1 - u) * u * top + u * u * RIM[1], lerp(hands[2], RIM[2], u)];
          if (a.made && k >= 0.75) b[1] = RIM[1] - (k - 0.75) * 4 * 1.2;
        } else { const u = (k - 0.75) / 0.25; b = [RIM[0] - 0.3 - u * 1.4, RIM[1] + Math.sin(u * Math.PI) * 0.8, RIM[2] + u * 1.2]; }
      }
      const sq = a && a.t < 0.08 ? 0.8 : 1, st = a && a.t > 0.08 && a.t < 0.6 ? 1.15 : 1;
      // Balón algo exagerado (0,3 m) para que se lea en pantallas pequeñas; aplastado al soltar y estirado en vuelo.
      add(b[0], b[1], b[2], 0.3 / st, 0.3 * sq * st, 0.3 / st, 'ball', t * 4); add(b[0], b[1], b[2], 0.25, 0.33 * sq, 0.25, 'ball', t * 4 + 0.78);
      add(b[0], 0.06, b[2], 0.3, 0.01, 0.3, 'shadow');
    }
    // Cámara: detrás del lanzador mirando al aro; lateral en mates; desde la línea de fondo en defensa.
    let camera;
    if (view.type === 'dunk') camera = { eye: [HX - 3, 2.6, 6.5], target: [HX - 1.8, 2.2, 0], fov: 50 };
    else if (defending) camera = { eye: [HX + 0.5, 3.4, 5.5], target: [HX - 4, 1.2, 0], fov: 55 };
    else {
      // Por detrás y a la derecha del tirador, algo elevada: se ven el gesto, el vuelo del balón y el aro.
      const d = Math.hypot(RIM[0] - sx, RIM[2] - sz) || 1, ux = (RIM[0] - sx) / d, uz = (RIM[2] - sz) / d, px = -uz, pz = ux;
      camera = { eye: [sx - ux * 4.2 + px * 1.7, 3.5, sz - uz * 4.2 + pz * 1.7], target: [lerp(sx, RIM[0], 0.62), 2.6, lerp(sz, RIM[2], 0.62)], fov: 58 };
    }
    return { scene: { cubes, colors, quality: 'low', aspect: 640 / 420, maxCubes: 2000 }, camera };
  }
  CAA.Arcade3D = { geometry };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Arcade3D;
})(typeof globalThis !== 'undefined' ? globalThis : this);
