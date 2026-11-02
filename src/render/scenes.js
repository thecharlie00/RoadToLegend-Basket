(function (root) {
  'use strict';
  // Escenas vóxel de las decisiones (paridad con eras-scene / ui-scene3d del fútbol): tu personaje dentro de un
  // escenario según la categoría del evento. Mismo renderizador que el avatar; sin texturas ni imágenes.
  const CAA = root.CAA = root.CAA || {};
  const hex = s => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
  const SETTING = {
    contract: 'office', agency: 'office', board: 'office', money: 'office', market: 'office', sponsor: 'office', finance: 'office', staff: 'office', club: 'office',
    locker: 'locker', discipline: 'locker', superstition: 'locker', coach: 'locker', tactics: 'locker',
    training: 'court', development: 'court', milestone: 'court', rivalry: 'court', national: 'court', era: 'court', player: 'court',
    press: 'press', media: 'press', health: 'clinic', mental: 'clinic',
    family: 'home', life: 'home', fun: 'home', legacy: 'home', community: 'street', fans: 'street', travel: 'travel'
  };
  const ROOM = { // suelo, pared, acento
    office: ['#6b4a32', '#d9d2c3', '#2f6f8f'], locker: ['#3a4250', '#4f6b8a', '#ff7a1f'], court: ['#c08a52', '#1d2b4a', '#ff713d'],
    press: ['#2a2f3a', '#16305c', '#ffb21e'], clinic: ['#cfd8dc', '#eef3f5', '#e8412c'], home: ['#8a6a4a', '#e7d9c4', '#36b98a'],
    street: ['#5d6066', '#9a6f55', '#3be3ff'], travel: ['#3b3f4a', '#c9ced6', '#5aa9ff']
  };
  function settingOf(category) { return SETTING[category] || 'court'; }
  function geometry(category, profile, options = {}) {
    const set = settingOf(category), [floor, wall, accent] = ROOM[set];
    const base = CAA.Voxel.avatarGeometry(profile, options);
    const cubes = base.cubes.filter(c => c.color !== 'shadow').map(c => Object.assign({}, c, { x: c.x - 0.6 }));
    const colors = Object.assign({}, base.colors, { s_floor: hex(floor), s_wall: hex(wall), s_acc: hex(accent), s_wood: hex('#7a5232'), s_dark: hex('#1b1f2a'), s_white: hex('#f3f1ea'), s_glass: hex('#9fd8ff'), s_green: hex('#3a8d4f'), s_red: hex('#c9183c') });
    const add = (x, y, z, sx, sy, sz, color) => cubes.push({ x, y, z, sx, sy, sz, color, yaw: 0 });
    add(0, -0.03, 0, 7, 0.06, 4, 's_floor'); add(0, 1.6, -2, 7, 3.3, 0.1, 's_wall'); add(0, 0.04, -1.94, 7, 0.08, 0.04, 's_acc');
    if (set === 'office') {
      add(1.3, 0.75, 0.2, 1.8, 0.08, 0.9, 's_wood'); add(0.55, 0.37, 0.2, 0.08, 0.74, 0.8, 's_wood'); add(2.05, 0.37, 0.2, 0.08, 0.74, 0.8, 's_wood');
      add(1.1, 0.82, 0.25, 0.5, 0.04, 0.35, 's_white'); add(1.75, 0.95, 0.1, 0.36, 0.3, 0.04, 's_dark'); add(1.75, 0.82, 0.12, 0.1, 0.06, 0.1, 's_dark');
      add(1.4, 1.95, -1.93, 1.4, 0.9, 0.04, 's_glass'); add(1.4, 1.95, -1.92, 0.04, 0.9, 0.04, 's_white'); add(-1.9, 2.0, -1.93, 0.7, 0.5, 0.04, 's_acc');
      add(-2.6, 0.45, -1.4, 0.4, 0.9, 0.4, 's_green'); add(-2.6, 0.12, -1.4, 0.34, 0.24, 0.34, 's_wood');
    } else if (set === 'locker') {
      for (let i = 0; i < 6; i++) { add(-2.6 + i * 0.9, 1.1, -1.75, 0.8, 2.2, 0.4, i % 2 ? 's_acc' : 's_wall'); add(-2.6 + i * 0.9, 1.6, -1.54, 0.5, 0.06, 0.02, 's_dark'); }
      add(1.2, 0.3, 0.4, 2.4, 0.12, 0.45, 's_wood'); add(0.3, 0.14, 0.4, 0.1, 0.28, 0.4, 's_dark'); add(2.1, 0.14, 0.4, 0.1, 0.28, 0.4, 's_dark');
      if (category === 'tactics' || category === 'coach') { add(1.6, 1.5, -1.3, 1.6, 1.0, 0.06, 's_white'); for (const [x, y] of [[1.2, 1.7], [1.6, 1.4], [2.0, 1.75], [1.4, 1.25]]) add(x, y, -1.26, 0.08, 0.08, 0.02, 's_red'); }
      add(1.6, 0.42, 0.42, 0.26, 0.26, 0.26, 'ball');
    } else if (set === 'court') {
      add(0, 0.005, 0.6, 7, 0.02, 0.06, 'line'); add(1.9, 0.005, -0.2, 0.06, 0.02, 2.2, 'line');
      add(2.6, 1.7, -1.6, 0.14, 3.4, 0.14, 'post'); add(2.6, 3.2, -1.25, 1.2, 0.8, 0.06, 'board'); add(2.6, 2.95, -0.95, 0.5, 0.05, 0.5, 'rim'); add(2.6, 2.75, -0.95, 0.4, 0.35, 0.4, 'net');
      for (let i = 0; i < 7; i++) add(-3 + i, 1.9 + (i % 2) * 0.12, -1.85, 0.9, 0.5, 0.2, i % 3 === 0 ? 's_acc' : 'crowdC');
      add(0.6, 0.15, 0.6, 0.28, 0.28, 0.28, 'ball');
    } else if (set === 'press') {
      for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) add(-2.5 + i, 1.1 + j * 0.8, -1.93, 0.6, 0.35, 0.04, (i + j) % 2 ? 's_acc' : 's_white');
      add(0.4, 0.75, 0.5, 2.6, 0.08, 0.7, 's_dark'); add(0.4, 0.37, 0.82, 2.6, 0.74, 0.04, 's_acc');
      for (const x of [-0.1, 0.25, 0.6]) { add(x, 0.95, 0.4, 0.04, 0.32, 0.04, 's_dark'); add(x, 1.12, 0.36, 0.1, 0.1, 0.1, 's_dark'); }
      add(1.4, 0.85, 0.45, 0.12, 0.22, 0.12, 's_glass');
      for (const x of [-2.4, 2.6]) { add(x, 0.8, 1.2, 0.08, 1.6, 0.08, 's_dark'); add(x, 1.7, 1.1, 0.4, 0.3, 0.3, 's_dark'); }
    } else if (set === 'clinic') {
      add(1.4, 0.55, 0.1, 2.0, 0.14, 0.9, 's_white'); add(1.4, 0.25, 0.1, 1.9, 0.5, 0.8, 's_wall'); add(2.25, 0.75, 0.1, 0.3, 0.2, 0.8, 's_white');
      add(-2.0, 2.2, -1.93, 0.5, 0.15, 0.04, 's_red'); add(-2.0, 2.2, -1.93, 0.15, 0.5, 0.04, 's_red');
      add(-2.6, 0.9, -1.2, 0.08, 1.8, 0.08, 's_dark'); add(-2.6, 1.8, -1.2, 0.3, 0.3, 0.05, 's_glass');
    } else if (set === 'home') {
      add(1.3, 0.35, -0.9, 2.4, 0.5, 0.8, 's_acc'); add(1.3, 0.8, -1.25, 2.4, 0.5, 0.2, 's_acc'); add(0.05, 0.6, -0.9, 0.2, 0.6, 0.8, 's_acc'); add(2.55, 0.6, -0.9, 0.2, 0.6, 0.8, 's_acc');
      add(-1.9, 1.7, -1.93, 1.4, 0.8, 0.04, 's_dark'); add(-1.9, 1.7, -1.9, 1.3, 0.7, 0.02, 's_glass');
      add(-2.8, 0.4, -1.4, 0.3, 0.8, 0.3, 's_green'); add(1.3, 0.25, 0.5, 1.0, 0.06, 0.6, 's_wood');
    } else if (set === 'street') {
      for (let i = 0; i < 8; i++) add(-3.2 + i * 0.9, 1.0, -1.85, 0.06, 2.0, 0.06, 's_dark');
      add(0, 1.95, -1.85, 7, 0.05, 0.05, 's_dark'); add(0, 0.6, -1.86, 7, 0.04, 0.04, 's_dark');
      add(2.4, 1.6, -1.2, 0.12, 3.2, 0.12, 's_dark'); add(2.4, 3.05, -0.9, 1.0, 0.7, 0.06, 's_white'); add(2.4, 2.8, -0.6, 0.45, 0.05, 0.45, 'rim');
      for (const [x, c] of [[1.2, 's_acc'], [1.7, 's_red']]) { add(x, 0.35, 0.6, 0.22, 0.5, 0.2, c); add(x, 0.75, 0.6, 0.24, 0.24, 0.24, 'skinA'); }
      add(0.4, 0.13, 0.9, 0.26, 0.26, 0.26, 'ball');
    } else { // travel
      for (let i = 0; i < 4; i++) { add(-2.4 + i * 1.6, 1.7, -1.93, 0.8, 0.6, 0.04, 's_glass'); add(-2.4 + i * 1.6, 0.6, -1.3, 0.9, 1.2, 0.5, 's_acc'); }
      add(1.5, 0.35, 0.6, 0.7, 0.7, 0.35, 's_red'); add(1.5, 0.8, 0.6, 0.3, 0.12, 0.06, 's_dark');
    }
    const camera = { eye: [2.2, 2.7, 6.2], target: [0.2, 1.2, -0.2], fov: 44, near: 0.1, far: 40 };
    return { version: CAA.Voxel.VERSION, kind: 'avatar', cubes, colors, quality: 'low', aspect: 1.9, maxCubes: CAA.Voxel.MAX_CUBES, camera, setting: set };
  }
  CAA.Scenes = { SETTING, settingOf, geometry };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Scenes;
})(typeof globalThis !== 'undefined' ? globalThis : this);
