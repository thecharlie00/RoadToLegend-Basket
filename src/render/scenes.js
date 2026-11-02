(function (root) {
  'use strict';
  // Escenas vóxel de las decisiones (paridad con eras-scene / ui-scene3d del fútbol): tu personaje dentro de un
  // escenario según la categoría del evento. Mismo renderizador que el avatar; sin texturas ni imágenes.
  // Cada sala comparte un armazón (tarima, pared con zócalo, techo con focos, alfombra) y encima monta decorado
  // propio: así todas las escenas tienen profundidad y ninguna parece un cubo vacío.
  const CAA = root.CAA = root.CAA || {};
  const hex = s => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
  const scale = (c, k) => [Math.min(1, c[0] * k), Math.min(1, c[1] * k), Math.min(1, c[2] * k)];
  const SETTING = {
    contract: 'office', agency: 'office', board: 'office', money: 'office', market: 'office', sponsor: 'office', finance: 'office', staff: 'office', club: 'office',
    locker: 'locker', discipline: 'locker', superstition: 'locker', coach: 'locker', tactics: 'locker',
    training: 'court', development: 'court', milestone: 'court', rivalry: 'court', national: 'court', era: 'court', player: 'court',
    press: 'press', media: 'press', health: 'clinic', mental: 'clinic',
    family: 'home', life: 'home', fun: 'home', legacy: 'home', community: 'street', fans: 'street', travel: 'travel'
  };
  const ROOM = { // suelo, pared, acento
    office: ['#6b4a32', '#c9bfab', '#2f6f8f'], locker: ['#3a4250', '#4f6b8a', '#ff7a1f'], court: ['#c08a52', '#1d2b4a', '#ff713d'],
    press: ['#2a2f3a', '#16305c', '#ffb21e'], clinic: ['#cfd8dc', '#eef3f5', '#e8412c'], home: ['#8a6a4a', '#e7d9c4', '#36b98a'],
    street: ['#5d6066', '#9a6f55', '#3be3ff'], travel: ['#3b3f4a', '#c9ced6', '#5aa9ff']
  };
  function settingOf(category) { return SETTING[category] || 'court'; }

  function geometry(category, profile, options = {}) {
    const set = settingOf(category), [floor, wall, accent] = ROOM[set];
    const base = CAA.Voxel.avatarGeometry(profile, options);
    // El modelo del avatar se dibuja a escala de maniquí (1,70 m); en la sala se ajusta a una persona real
    // para que el mobiliario (mesa de 0,75 m, taquillas de 2,2 m) quede a la escala correcta.
    const K = 0.62;
    const cubes = base.cubes.map(c => Object.assign({}, c, { x: c.x * K - 0.62, y: c.y * K, z: c.z * K, sx: c.sx * K, sy: c.sy * K, sz: c.sz * K }));
    const colors = Object.assign({}, base.colors, {
      s_floor: hex(floor), s_wall: hex(wall), s_acc: hex(accent), s_wood: hex('#7a5232'), s_woodB: hex('#5d3d24'),
      s_dark: hex('#1b1f2a'), s_white: hex('#f3f1ea'), s_glass: hex('#9fd8ff'), s_green: hex('#3a8d4f'), s_red: hex('#c9183c'),
      s_steel: hex('#8d98a5'), s_metal: hex('#5a6673'), s_light: hex('#fff6dc'), s_glow: hex('#ffe9a8'), s_fabric: hex('#46506b'),
      s_paper: hex('#efe9dc'), s_skyTop: hex('#22355c'), s_skyLow: hex('#7fa8cf'), s_gold: hex('#e0b13c')
    });
    colors.s_rug = scale(colors.s_fabric, 1.5);
    colors.s_rugIn = scale(colors.s_fabric, 0.7);
    colors.s_accDeep = scale(colors.s_acc, 0.62);
    colors.s_wallLow = scale(colors.s_wall, 0.72);
    const add = (x, y, z, sx, sy, sz, color, yaw = 0) => cubes.push({ x, y, z, sx, sy, sz, color, yaw });
    const floorC = colors.s_floor;
    // --- Armazón común: tarima (tabla a tabla), pared con zócalo y panel, techo con viga y dos focos.
    add(0, -0.06, 0.2, 7.4, 0.1, 4.4, 's_floor');
    for (let i = 0; i < 7; i++) add(0, -0.005, -1.8 + i * 0.58, 7.4, 0.03, 0.55, i % 2 ? 's_floor' : 's_woodB');
    add(0, 1.62, -2.02, 7.4, 3.4, 0.1, 's_wall');
    add(0, 0.12, -1.96, 7.4, 0.24, 0.08, 's_wood'); add(0, 2.5, -2.0, 7.4, 0.12, 0.06, 's_wood'); add(0, 0.62, -1.99, 7.4, 0.9, 0.05, 's_wallLow');
    add(0, 0.55, -1.97, 7.4, 0.03, 0.06, 's_wood');
    add(-3.66, 1.5, -0.6, 0.1, 3.2, 3.0, 's_wall');
    add(3.66, 1.5, -0.6, 0.1, 3.2, 3.0, 's_wall');
    add(0, 3.24, -0.6, 7.4, 0.12, 3.2, 's_dark');
    add(-1.7, 3.16, -0.4, 1.5, 0.06, 0.5, 's_light');
    add(1.7, 3.16, -0.4, 1.5, 0.06, 0.5, 's_light');
    add(-1.7, 3.11, -0.4, 1.2, 0.04, 0.34, 's_glow');
    add(1.7, 3.11, -0.4, 1.2, 0.04, 0.34, 's_glow');
    // --- Alfombra bajo el personaje: dos piezas para que el borde se lea.
    add(-0.6, 0.012, 0.55, 2.7, 0.02, 1.9, 's_rug');
    add(-0.6, 0.028, 0.55, 2.4, 0.02, 1.62, 's_rugIn');
    if (set === 'office') {
      // Mesa de despacho con cajonera, monitor, silla, estantería con trofeos y ventanal con skyline.
      add(1.35, 0.76, 0.1, 2.1, 0.09, 0.95, 's_wood');
      add(1.35, 0.8, 0.1, 2.14, 0.02, 0.99, 's_woodB');
      add(0.45, 0.37, 0.1, 0.09, 0.74, 0.86, 's_woodB'); add(2.25, 0.37, 0.1, 0.09, 0.74, 0.86, 's_woodB');
      add(1.95, 0.5, 0.1, 0.6, 0.5, 0.8, 's_woodB'); add(1.95, 0.5, 0.52, 0.5, 0.06, 0.03, 's_metal');
      add(1.15, 0.98, 0.25, 0.5, 0.04, 0.34, 's_paper');
      add(1.62, 1.12, 0.02, 0.6, 0.4, 0.05, 's_dark'); add(1.62, 1.2, 0.05, 0.54, 0.28, 0.02, 's_glass');
      add(1.62, 0.88, 0.02, 0.1, 0.14, 0.1, 's_dark');
      add(0.62, 0.99, 0.32, 0.12, 0.1, 0.12, 's_white');
      add(2.25, 0.95, 0.42, 0.34, 0.32, 0.34, 's_dark');
      add(-0.1, 0.42, 0.95, 0.5, 0.1, 0.5, 's_dark'); add(-0.1, 0.75, 1.12, 0.5, 0.5, 0.1, 's_dark');
      add(2.9, 1.9, -1.95, 2.0, 1.5, 0.06, 's_glass');
      for (let i = 0; i < 4; i++) add(2.1 + i * 0.5, 1.35, -1.92, 0.42, 0.55 + (i % 2) * 0.4, 0.02, i % 2 ? 's_skyTop' : 's_skyLow');
      add(2.9, 1.9, -1.91, 0.05, 1.5, 0.02, 's_white'); add(2.9, 1.9, -1.91, 2.0, 0.05, 0.02, 's_white');
      add(-2.6, 1.85, -1.94, 1.1, 0.9, 0.04, 's_wood'); add(-2.6, 1.85, -1.9, 0.9, 0.7, 0.03, 's_paper');
      for (let i = 0; i < 3; i++) { add(-2.98 + i * 0.38, 1.36, -1.88, 0.16, 0.16, 0.16, 's_gold'); add(-2.98 + i * 0.38, 1.24, -1.88, 0.24, 0.08, 0.24, 's_dark'); }
      for (let i = 0; i < 3; i++) add(-3.2, 0.42 + i * 0.44, -1.6, 1.0, 0.05, 0.34, 's_wood');
      add(-2.7, 0.58, -1.6, 0.3, 0.24, 0.3, 's_green');
    } else if (set === 'locker') {
      // Taquillas con puerta, rejilla y tirador; banco corrido, toallas, balón y pizarra táctica.
      for (let i = 0; i < 6; i++) {
        const x = -2.7 + i * 0.9;
        add(x, 1.12, -1.72, 0.82, 2.24, 0.4, i % 2 ? 's_acc' : 's_wall');
        add(x, 1.12, -1.5, 0.7, 2.06, 0.04, i % 2 ? 's_accDeep' : 's_wallLow');
        add(x + 0.24, 1.1, -1.46, 0.07, 0.3, 0.05, 's_steel');
        for (let k = 0; k < 3; k++) add(x, 1.9 - k * 0.16, -1.47, 0.4, 0.03, 0.03, 's_dark');
        add(x, 0.5, -1.46, 0.55, 0.06, 0.04, 's_white');
      }
      add(1.05, 0.32, 0.45, 3.2, 0.14, 0.5, 's_wood'); add(1.05, 0.16, 0.45, 3.0, 0.16, 0.3, 's_woodB');
      for (const x of [-0.45, 2.55]) add(x, 0.1, 0.45, 0.12, 0.2, 0.4, 's_dark');
      for (let i = 0; i < 3; i++) add(0.2 + i * 0.5, 0.42, 0.3, 0.3, 0.08, 0.36, 's_white');
      add(2.9, 0.42, 0.5, 0.3, 0.3, 0.3, 'ball'); add(2.9, 0.44, 0.5, 0.31, 0.02, 0.31, 'ballSeam');
      if (category === 'tactics' || category === 'coach') {
        add(1.6, 1.66, -1.4, 1.9, 1.15, 0.06, 's_white');
        add(1.6, 1.66, -1.36, 1.78, 1.03, 0.02, 's_green');
        for (const [x, y] of [[1.0, 1.9], [1.7, 1.5], [2.2, 1.95], [1.35, 1.28], [2.0, 1.75]]) add(x, y, -1.33, 0.08, 0.08, 0.03, 's_red');
        add(1.6, 2.28, -1.4, 1.94, 0.06, 0.08, 's_metal');
      } else {
        add(1.25, 1.8, -1.94, 1.5, 1.0, 0.04, 's_wood'); add(1.25, 1.8, -1.9, 1.3, 0.8, 0.03, 's_paper');
        add(0.6, 1.5, -1.88, 0.5, 0.5, 0.02, 's_acc');
      }
      add(-2.2, 1.5, -1.88, 0.5, 0.04, 0.06, 's_steel');
    } else if (set === 'court') {
      // Pista: líneas, canasta completa con tablero y red, grada de fondo con público y vallas LED.
      add(0, 0.02, 0.9, 7, 0.02, 0.08, 'line'); add(1.6, 0.02, 0.2, 0.08, 0.02, 1.6, 'line');
      add(2.55, 1.7, -1.62, 0.16, 3.4, 0.16, 'post'); add(2.55, 0.22, -1.62, 0.34, 0.44, 0.34, 'postPad');
      add(2.55, 3.24, -1.34, 0.14, 0.14, 0.6, 'post');
      add(2.55, 3.2, -1.06, 1.24, 0.82, 0.07, 'board'); add(2.55, 3.2, -1.02, 1.34, 0.9, 0.03, 'boardFrame');
      add(2.55, 3.02, -1.0, 0.5, 0.34, 0.03, 'boardInner');
      add(2.55, 2.93, -0.78, 0.46, 0.05, 0.46, 'rim');
      for (let lvl = 1; lvl <= 3; lvl++) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(2.55 + Math.cos(a) * (0.22 - lvl * 0.035), 2.9 - lvl * 0.13, -0.78 + Math.sin(a) * (0.22 - lvl * 0.035), 0.03, 0.12, 0.03, 'net'); }
      add(0, 1.62, -1.9, 7.2, 0.5, 0.14, 'ledBoard');
      for (let i = 0; i < 9; i++) {
        add(-3.3 + i * 0.82, 2.14, -1.86, 0.74, 0.5, 0.2, i % 3 === 0 ? 's_acc' : i % 3 === 1 ? 's_wall' : 's_dark');
        add(-3.3 + i * 0.82, 2.52, -1.8, 0.32, 0.3, 0.22, i % 2 ? 'skinB' : 'skinA');
        add(-3.3 + i * 0.82, 2.2, -1.82, 0.4, 0.36, 0.14, ['crowdA', 'crowdB', 'crowdD', 'crowdE'][i % 4]);
      }
      add(-0.4, 0.16, 0.55, 0.28, 0.28, 0.28, 'ball');
      for (let i = 0; i < 3; i++) add(-2.6 + i * 0.5, 0.12, 1.4, 0.3, 0.3, 0.3, 's_acc');
    } else if (set === 'press') {
      // Rueda de prensa: fondo con franjas de patrocinador, mesa, micros, cámara y focos.
      for (let i = 0; i < 9; i++) for (let j = 0; j < 4; j++) add(-3.2 + i * 0.8, 0.75 + j * 0.62, -1.96, 0.8, 0.6, 0.05, (i + j) % 3 === 0 ? 's_acc' : (i + j) % 3 === 1 ? 's_white' : 's_wall');
      add(-0.2, 0.76, 0.5, 3.0, 0.1, 0.86, 's_dark');
      add(-0.2, 0.38, 0.5, 2.9, 0.76, 0.9, 's_acc');
      add(-0.2, 0.82, 0.5, 3.06, 0.03, 0.92, 's_gold');
      for (const x of [-1.1, -0.2, 0.7]) { add(x, 0.98, 0.22, 0.05, 0.36, 0.05, 's_dark'); add(x, 1.18, 0.15, 0.13, 0.13, 0.13, 's_metal'); }
      add(-1.2, 0.9, 0.72, 0.24, 0.04, 0.16, 's_paper');
      add(1.6, 0.9, 0.55, 0.3, 0.24, 0.16, 's_glass');
      add(2.55, 1.3, -0.6, 0.42, 0.42, 0.7, 's_dark'); add(2.75, 1.3, -1.05, 0.22, 0.22, 0.32, 's_steel');
      for (const x of [-2.7, 2.9]) { add(x, 0.9, 1.0, 0.1, 1.8, 0.1, 's_dark'); add(x, 1.85, 0.9, 0.44, 0.34, 0.34, 's_light'); }
      add(2.2, 2.4, 1.2, 0.5, 0.5, 0.5, 's_light');
    } else if (set === 'clinic') {
      // Enfermería: camilla con almohada, vitrina, botiquín con cruz, negatoscopio y muletas.
      add(1.3, 0.58, 0.05, 2.2, 0.16, 0.9, 's_white'); add(1.3, 0.28, 0.05, 2.0, 0.5, 0.8, 's_steel');
      add(0.5, 0.75, 0.05, 0.4, 0.14, 0.7, 's_white');
      for (const x of [0.4, 2.2]) for (const z of [-0.3, 0.4]) add(x, 0.14, z, 0.08, 0.28, 0.08, 's_metal');
      add(-2.55, 1.1, -1.7, 0.9, 1.9, 0.34, 's_white'); add(-2.55, 1.7, -1.5, 0.8, 0.6, 0.04, 's_glass');
      for (let i = 0; i < 4; i++) add(-2.55, 0.55 + i * 0.3, -1.49, 0.7, 0.03, 0.02, 's_white');
      add(-1.4, 2.2, -1.94, 0.6, 0.16, 0.05, 's_red'); add(-1.4, 2.2, -1.94, 0.16, 0.6, 0.05, 's_red');
      add(-1.4, 1.4, -1.94, 0.9, 0.7, 0.04, 's_dark'); add(-1.4, 1.4, -1.9, 0.76, 0.56, 0.02, 's_glass');
      add(-2.95, 1.2, -0.9, 0.08, 2.2, 0.08, 's_steel'); add(-2.95, 1.2, -1.2, 0.08, 2.2, 0.08, 's_steel');
      add(-2.95, 2.24, -1.05, 0.16, 0.08, 0.44, 's_steel');
      add(2.9, 1.6, -1.9, 0.5, 0.4, 0.05, 's_white'); add(2.9, 1.6, -1.87, 0.4, 0.3, 0.02, 's_glass');
    } else if (set === 'home') {
      // Casa: sofá con cojines, televisión, estantería, lámpara, planta y fotos.
      add(1.5, 0.36, -0.95, 2.6, 0.56, 0.9, 's_acc');
      add(1.5, 0.82, -1.3, 2.6, 0.62, 0.22, 's_acc');
      add(0.15, 0.6, -0.95, 0.22, 0.62, 0.9, 's_accDeep'); add(2.85, 0.6, -0.95, 0.22, 0.62, 0.9, 's_accDeep');
      add(0.95, 0.72, -0.92, 0.42, 0.3, 0.7, 's_fabric'); add(2.05, 0.72, -0.92, 0.42, 0.3, 0.7, 's_fabric');
      add(-1.7, 1.76, -1.94, 1.5, 0.86, 0.06, 's_dark'); add(-1.7, 1.76, -1.9, 1.36, 0.74, 0.02, 's_glass');
      add(-1.7, 1.3, -1.94, 1.2, 0.2, 0.12, 's_wood');
      add(-1.7, 0.55, -1.9, 1.1, 0.5, 0.24, 's_woodB');
      add(0.1, 0.32, 1.0, 1.1, 0.08, 0.62, 's_wood'); add(0.1, 0.16, 1.0, 0.9, 0.16, 0.4, 's_woodB');
      add(2.75, 1.25, -1.85, 0.3, 0.9, 0.04, 's_white'); add(2.1, 1.35, -1.85, 0.24, 0.24, 0.04, 's_wood');
      add(-2.75, 0.42, -1.5, 0.34, 0.84, 0.34, 's_wood'); add(-2.75, 0.98, -1.5, 0.5, 0.3, 0.5, 's_green');
      add(-2.2, 1.7, -1.4, 0.3, 0.5, 0.3, 's_glow');
      add(3.1, 0.1, 0.6, 0.5, 0.06, 0.6, 's_red');
    } else if (set === 'street') {
      // Calle: valla metálica, canasta de barrio, grafitis, farola, dos críos y el balón.
      for (let i = 0; i < 10; i++) add(-3.5 + i * 0.78, 1.05, -1.86, 0.06, 2.1, 0.06, 's_metal');
      for (let j = 0; j < 4; j++) add(0, 0.35 + j * 0.52, -1.86, 7.2, 0.04, 0.04, 's_metal');
      add(-1.6, 1.6, -1.9, 1.5, 0.9, 0.04, 's_acc'); add(-2.1, 1.45, -1.88, 0.6, 0.5, 0.02, 's_red'); add(-0.9, 1.55, -1.88, 0.5, 0.6, 0.02, 's_white');
      add(2.45, 1.6, -1.3, 0.14, 3.2, 0.14, 's_metal'); add(2.45, 3.02, -0.95, 1.1, 0.76, 0.07, 's_white'); add(2.45, 2.78, -0.6, 0.48, 0.05, 0.48, 'rim');
      for (let lvl = 1; lvl <= 3; lvl++) for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(2.45 + Math.cos(a) * (0.22 - lvl * 0.035), 2.75 - lvl * 0.13, -0.6 + Math.sin(a) * (0.22 - lvl * 0.035), 0.03, 0.12, 0.03, 'net'); }
      add(-3.2, 1.9, -1.2, 0.08, 3.8, 0.08, 's_metal'); add(-3.2, 3.75, -1.05, 0.3, 0.1, 0.4, 's_glow');
      for (const [x, c] of [[1.15, 's_acc'], [1.7, 's_red']]) { add(x, 0.35, 0.55, 0.22, 0.5, 0.2, c); add(x, 0.72, 0.55, 0.24, 0.24, 0.24, 'skinA'); add(x, 0.28, 0.78, 0.18, 0.36, 0.14, 's_dark'); }
      add(0.45, 0.13, 0.9, 0.26, 0.26, 0.26, 'ball');
      add(2.9, 0.28, 0.4, 0.5, 0.56, 0.5, 's_green'); add(2.9, 0.52, 0.4, 0.36, 0.2, 0.36, 's_red');
    } else { // travel
      for (let i = 0; i < 4; i++) { add(-2.4 + i * 1.6, 1.72, -1.94, 0.84, 0.62, 0.04, 's_skyLow'); add(-2.4 + i * 1.6, 1.72, -1.93, 0.9, 0.68, 0.02, 's_steel'); add(-2.4 + i * 1.6, 1.72, -1.91, 0.8, 0.58, 0.02, 's_skyTop'); }
      add(0, 2.72, -0.9, 7.2, 0.22, 1.6, 's_steel'); add(0, 2.55, -0.2, 7.2, 0.14, 0.5, 's_dark');
      for (let i = 0; i < 4; i++) add(-2.4 + i * 1.6, 2.72, 0.05, 1.0, 0.08, 0.1, 's_light');
      for (let i = 0; i < 3; i++) { add(-2.2 + i * 2.2, 0.42, 0.5, 0.72, 0.76, 0.72, 's_fabric'); add(-2.2 + i * 2.2, 0.86, 0.22, 0.72, 0.5, 0.16, 's_acc'); }
      add(2.9, 0.3, -0.4, 0.8, 0.5, 0.5, 's_red'); add(2.9, 0.62, -0.4, 0.5, 0.16, 0.4, 's_dark');
      add(-3.0, 0.28, -0.1, 0.44, 0.42, 0.34, 's_wood'); add(-3.0, 0.52, -0.1, 0.06, 0.12, 0.06, 's_metal');
    }
    const camera = { eye: [1.55, 1.9, 4.3], target: [0.08, 0.95, -0.2], fov: 43, near: 0.1, far: 40 };
    const wallC2 = colors.s_wall;
    return {
      version: CAA.Voxel.VERSION, kind: 'avatar', cubes, colors, quality: 'low', aspect: 1.9, maxCubes: CAA.Voxel.MAX_CUBES, camera, setting: set,
      sky: [[wallC2[0] * 0.24 + 0.02, wallC2[1] * 0.26 + 0.02, wallC2[2] * 0.32 + 0.03], [wallC2[0] * 0.1 + 0.02, wallC2[1] * 0.11 + 0.02, wallC2[2] * 0.16 + 0.03], [floorC[0] * 0.22, floorC[1] * 0.18, floorC[2] * 0.16]],
      glow: 0.3, gain: 1.22,
      fog: { near: 6.5, far: 26, color: [wallC2[0] * 0.1, wallC2[1] * 0.11, wallC2[2] * 0.15] }
    };
  }
  CAA.Scenes = { SETTING, settingOf, geometry };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Scenes;
})(typeof globalThis !== 'undefined' ? globalThis : this);
