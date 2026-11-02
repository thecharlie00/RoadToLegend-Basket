(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const Rules = CAA.Rules || (typeof require === 'function' ? require('../match/rules.js') : null);
  const Hash = CAA.Hash || (typeof require === 'function' ? require('../core/hash.js') : null);
  const VERSION = 'voxel-2';
  const MAX_CUBES = 1400;
  const FLOATS_PER_VERTEX = 9;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const ZONES = { restricted: [0, 1.25], paint: [2.8, 3.8], midShort: [-3.2, 4.8], midLong: [3.8, 5.2], corner3: [-6.1, 1.1], above3: [0, 7.4] };
  // Iluminación de estudio: luz clave fría desde arriba-izquierda, relleno cálido desde abajo-derecha.
  // Se calcula por vértice en CPU (una sola pasada, sin shaders de luz) y sube ya cocinada al buffer.
  const KEY_LIGHT = normalize([-0.38, 0.87, 0.33]);
  const FILL_LIGHT = normalize([0.58, 0.18, -0.74]);
  const HAZE = [0.055, 0.068, 0.13];
  const DEFAULT_SKY = [[0.026, 0.034, 0.086], [0.062, 0.082, 0.19], [0.14, 0.09, 0.13]];
  const ARENA_SKY = [[0.024, 0.032, 0.082], [0.07, 0.09, 0.2], [0.2, 0.12, 0.1]];
  const TRI = [0, 1, 2, 0, 2, 3];
  const FACE_LIST = [
    [[1, 0, 0], [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]], [[-1, 0, 0], [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]]],
    [[0, 1, 0], [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]]], [[0, -1, 0], [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]]],
    [[0, 0, 1], [[1, -1, 1], [1, 1, 1], [-1, 1, 1], [-1, -1, 1]]], [[0, 0, -1], [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]]]
  ];

  function keyPlays(match, limit = 12) {
    if (!match || !Array.isArray(match.events)) return [];
    const profile = Rules.getProfile(match.ruleSetId || 'FIBA-2026');
    const score = [0, 0];
    const candidates = [];
    for (let i = 0; i < match.events.length; i++) {
      const e = match.events[i];
      const before = score.slice();
      if ((e.type === 'shot' || e.type === 'ft') && e.made && (e.team === 0 || e.team === 1)) score[e.team] += e.type === 'shot' ? e.points || 0 : 1;
      let priority = 0, reason = '';
      if (e.type === 'block') { priority = 75; reason = 'block'; }
      else if (e.type === 'shot' && e.made) {
        priority = e.points === 3 ? 60 : 35; reason = e.points === 3 ? 'three' : 'score';
        if (e.zone === 'restricted' && e.assist) { priority += 8; reason = 'interiorPass'; }
      } else if (e.type === 'turnover' && e.steal) { priority = 45; reason = 'steal'; }
      else if (e.type === 'ft' && e.made && e.reason === 'andOne') { priority = 65; reason = 'andOne'; }
      else if (e.type === 'final') { priority = 300; reason = 'final'; }
      const late = e.period >= profile.periods && e.clock <= 1200;
      const clutch = late && Math.abs(before[0] - before[1]) <= 5;
      if (clutch && priority) { priority += 100; reason = 'clutch'; }
      if (e.type === 'shot' && e.made && e.clock === 0) { priority += 150; reason = 'buzzer'; }
      if (priority) candidates.push({ index: i, seq: e.seq == null ? i : e.seq, type: e.type, team: e.team == null ? null : e.team, player: e.player || null, period: e.period, clock: e.clock, score: score.slice(), priority, reason, clutch });
    }
    // Never mutate the source log. Keep the most important moments, then restore chronology.
    const cap = clamp(Math.floor(limit) || 12, 1, 40);
    return candidates.sort((a, b) => b.priority - a.priority || a.index - b.index).slice(0, cap).sort((a, b) => a.index - b.index);
  }

  // Pista: tarima con tabla, zonas pintadas, líneas reglamentarias, círculo central con emblema y dos canastas.
  // Todo lo que no se mueve va aquí; el público, los jugadores y el balón se añaden en geometry().
  function courtGeometry(ruleSetId = 'FIBA-2026', quality = 'low', options = {}) {
    const p = Rules.getProfile(ruleSetId), L = p.court.length, W = p.court.width;
    const detailed = quality === 'balanced';
    const cubes = [];
    const add = (x, y, z, sx, sy, sz, color, yaw = 0) => cubes.push({ x, y, z, sx, sy, sz, color, yaw });
    const line = (x, z, sx, sz, color = 'line') => add(x, 0.085, z, sx, 0.025, sz, color);
    // Explanada del pabellón + foso de la pista: dos capas que dan profundidad al borde.
    add(0, -0.26, 0, L + 9, 0.34, W + 9, 'apronDeep');
    add(0, -0.08, 0, L + 2.6, 0.2, W + 2.6, 'apron');
    add(0, 0.0, 0, L + 1.1, 0.11, W + 1.1, 'floorTrim');
    // Tarima de arce: tablas longitudinales con tres tonos y junta visible.
    const planks = detailed ? 24 : 14;
    for (let i = 0; i < planks; i++) {
      const z = -W / 2 + (i + 0.5) * (W / planks);
      const tone = i % 4 === 0 ? 'court' : i % 4 === 2 ? 'courtB' : 'courtA';
      add(0, 0.045, z, L, 0.09, W / planks - 0.035, tone);
    }
    // Zonas pintadas y semicírculo de tiros libres, con marco claro.
    for (const side of [-1, 1]) {
      add(side * (L / 2 - 2.95), 0.1, 0, 5.9, 0.035, 4.9, 'paint');
      add(side * (L / 2 - 2.95), 0.12, 0, 5.9, 0.01, 0.05, 'line');
      line(side * (L / 2 - 5.9), 0, 0.05, 4.9);
      for (const z of [-2.45, 2.45]) line(side * (L / 2 - 2.95), z, 5.9, 0.05);
    }
    // Perímetro, medio campo y círculo central.
    const segments = detailed ? 34 : 22;
    line(0, -W / 2, L, 0.07); line(0, W / 2, L, 0.07); line(-L / 2, 0, 0.07, W); line(L / 2, 0, 0.07, W);
    line(0, 0, 0.06, W);
    const ring = (cx, cz, radius, start, end, n, color = 'line', y = 0.085) => {
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const a = mix(start, end, i / n), point = [cx + Math.cos(a) * radius, cz + Math.sin(a) * radius];
        if (prev) { const dx = point[0] - prev[0], dz = point[1] - prev[1]; add((point[0] + prev[0]) / 2, y, (point[1] + prev[1]) / 2, Math.hypot(dx, dz) + 0.045, 0.025, 0.065, color, -Math.atan2(dz, dx)); }
        prev = point;
      }
    };
    ring(0, 0, 1.8, 0, TAU, segments);
    // Emblema central: aro interior y cuatro radios, legible en la cámara de retransmisión.
    ring(0, 0, 1.05, 0, TAU, Math.min(18, segments), 'logo', 0.09);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; add(Math.cos(a) * 0.55, 0.09, Math.sin(a) * 0.55, 1.05, 0.02, 0.08, 'logo', -a); }
    for (const side of [-1, 1]) {
      const hx = side * (L / 2 - 1.575);
      // Triples: esquina + arco calculado con las medidas del reglamento, no inventadas.
      if (p.three) {
        const cz = p.three.corner;
        const joinX = hx - side * Math.sqrt(Math.max(0, p.three.arc ** 2 - cz ** 2));
        line((side * L / 2 + joinX) / 2, -cz, Math.abs(joinX - side * L / 2), 0.065);
        line((side * L / 2 + joinX) / 2, cz, Math.abs(joinX - side * L / 2), 0.065);
        const a = Math.acos(clamp((joinX - hx) * side / p.three.arc, -1, 1));
        ring(hx, 0, p.three.arc, side < 0 ? -a : Math.PI - a, side < 0 ? a : Math.PI + a, segments);
      }
      // Semicírculo de no-carga bajo el aro.
      ring(hx, 0, 1.25, side < 0 ? Math.PI / 2 : -Math.PI / 2, side < 0 ? Math.PI * 1.5 : Math.PI / 2, 10, 'line', 0.09);
      // Canasta: mástil acolchado, brazo, tablero con marco, aro, reloj de 24" y protección de la base.
      add(side * (L / 2 - 0.35), 1.75, 0, 0.24, 3.5, 0.24, 'post');
      add(side * (L / 2 - 0.35), 0.28, 0, 0.52, 0.56, 0.52, 'postPad');
      add(side * (L / 2 - 0.7), 3.62, 0, 0.9, 0.14, 0.14, 'post');
      add(side * (L / 2 - 1.2), 3.45, 0, 0.1, 1.05, 1.8, 'board');
      add(side * (L / 2 - 1.24), 3.45, 0, 0.03, 1.13, 1.88, 'boardFrame');
      add(side * (L / 2 - 1.14), 3.24, 0, 0.02, 0.45, 0.6, 'boardInner');
      add(hx, 3.05, 0, 0.44, 0.05, 0.44, 'rim');
      add(hx, 3.02, 0, 0.3, 0.03, 0.3, 'rimDark');
      add(side * (L / 2 - 1.5), 3.98, 0, 0.34, 0.26, 0.34, 'clock');
      // Vallas publicitarias de fondo (ambas calidades).
      for (let i = 0; i < 3; i++) add(side * (L / 2 + 2.2), 0.62, (i - 1) * (W * 0.3), 0.22, 0.72, W * 0.22, i % 2 ? 'ledBoard' : 'ledBoardB');
    }
    return { version: VERSION, ruleSetId, dimensions: { length: L, width: W, hoopHeight: 3.05 }, cubes };
  }

  function scoreAt(match, index) {
    const score = [0, 0], events = match && match.events || [];
    for (let i = 0; i <= Math.min(index, events.length - 1); i++) { const e = events[i]; if (e.made && (e.team === 0 || e.team === 1)) score[e.team] += e.type === 'shot' ? e.points || 0 : e.type === 'ft' ? 1 : 0; }
    return score;
  }
  function frameAt(match, index, progress = 1, options = {}) {
    const events = match && match.events || [];
    const i = clamp(Math.floor(index) || 0, 0, Math.max(0, events.length - 1));
    const e = events[i] || { type: 'start', team: 0, period: 1, clock: 6000 };
    const prev = events[Math.max(0, i - 1)] || e;
    const t = options.reducedMotion ? 1 : smooth(clamp(progress, 0, 1));
    const p = Rules.getProfile(match && match.ruleSetId || 'FIBA-2026');
    const L = p.court.length, W = p.court.width;
    const team = e.team === 1 ? 1 : 0, side = team ? -1 : 1;
    const zone = ZONES[e.zone] || ZONES.above3;
    const target = { x: side * (L / 2 - 1.575), y: 3.05, z: 0 };
    const shot = e.type === 'shot' || e.type === 'ft' || e.type === 'block';
    const origin = e.type === 'ft' ? { x: side * (L / 2 - 5.8), y: 1.95, z: 0 } : { x: side * (L / 2 - 1.575 - zone[1]), y: 1.95, z: clamp(zone[0], -W / 2 + 0.7, W / 2 - 0.7) };
    const players = [];
    const rosters = (match && match.teams || []).map(t => (t.players || []).slice(0, 12));
    for (let ti = 0; ti < 2; ti++) {
      const roster = rosters[ti] || Array.from({ length: 5 }, (_, j) => ({ id: 'p' + j, name: 'Player ' + (j + 1) }));
      const snapshot = match && match.lineups && match.lineups[i];
      const ids = snapshot && snapshot.teams && Array.isArray(snapshot.teams[ti]) ? snapshot.teams[ti] : null;
      const onCourt = ids ? ids.map(id => roster.find(p => p.id === id)).filter(Boolean).slice(0, 5) : roster.slice(0, 5);
      if (onCourt.length < 5) for (const p of roster) { if (onCourt.length >= 5) break; if (!onCourt.some(x => x.id === p.id)) onCourt.push(p); }
      const actorIndex = roster.findIndex(p => p.id === e.player);
      if (actorIndex >= 0 && !onCourt.some(p => p.id === e.player)) onCourt[4] = roster[actorIndex];
      for (let j = 0; j < onCourt.length; j++) {
        const actor = onCourt[j].id === e.player;
        const attack = ti === team, s = attack ? side : -side;
        let x = s * (L / 2 - 4.5 - (j % 3) * 2.5), z = (j - 2) * 2.15;
        if (actor && shot) { x = origin.x; z = origin.z; }
        else if (actor) { x = side * (L / 2 - 6.5); z = 0; }
        else if (!attack && shot && j === 0) { x = origin.x - side * 1.1; z = origin.z + 0.35; }
        const oldX = prev.player === onCourt[j].id && shot ? origin.x : x;
        const jump = actor && shot && e.type !== 'ft' ? Math.sin(t * Math.PI) * 0.42 : 0;
        players.push({ id: onCourt[j].id, name: onCourt[j].name, team: ti, number: roster.findIndex(p => p.id === onCourt[j].id) + 1, pos: onCourt[j].pos || null, x: mix(oldX, x, t), y: jump, z, yaw: attack ? side * Math.PI / 2 : -side * Math.PI / 2, shooting: actor && shot, armsUp: actor && shot ? Math.sin(t * Math.PI) : 0, actor });
      }
    }
    let ball = { x: origin.x + side * 0.35, y: 1.15 + Math.abs(Math.sin(t * Math.PI * 2)) * 0.65, z: origin.z };
    if (shot) {
      const u = clamp(t, 0, 1), miss = e.type === 'block' || e.made === false;
      ball = { x: mix(origin.x, target.x + (miss ? side * 0.6 : 0), u), y: mix(origin.y, target.y, u) + Math.sin(u * Math.PI) * (e.type === 'ft' ? 2.1 : 2.8), z: mix(origin.z, miss ? 0.65 : 0, u) };
    }
    return { version: VERSION, index, event: e, progress: options.reducedMotion ? 1 : clamp(progress, 0, 1), players, ball, target, origin, sourceHash: match && match.hash || null };
  }

  // Avatar del jugador: proporciones humanas por bloques (zapatilla, espinilla, muslo, pantalón, camiseta, cuello,
  // mandíbula, pómulos, orejas), con sombra de contacto y detalles de equipación. Nunca más de 64 cubos.
  function avatarGeometry(profile = {}, options = {}) {
    const colors = palette(options), cubes = [];
    const eq = profile.equipment || {};
    const hex = v => /^#[0-9a-f]{6}$/i.test(v || '') ? [parseInt(v.slice(1, 3), 16) / 255, parseInt(v.slice(3, 5), 16) / 255, parseInt(v.slice(5, 7), 16) / 255] : null;
    colors.jersey = hex(eq.jersey) || colors.home; colors.shoes = hex(eq.shoes) || colors.shoes; colors.accessory = hex(eq.accessory) || colors.ball;
    const add = (x, y, z, sx, sy, sz, color, yaw = 0) => cubes.push({ x, y, z, sx, sy, sz, color, yaw });
    // Escala base del modelo (1,70 m de maniquí) por la altura real del jugador: los pívots se ven más altos.
    const h = 1.7 * clamp((profile.height || 196) / 196, 0.88, 1.12);
    const bulk = ['interior', 'finisher'].includes(profile.archetype) ? 1.12 : ['creator', 'shooter'].includes(profile.archetype) ? 0.94 : 1;
    const part = (x, y, z, sx, sy, sz, color, yaw = 0) => add(x * bulk, y * h, z, sx * bulk, sy * h, sz, color, yaw);
    const lk = profile.look || null;
    if (lk) {
      colors.skinA = hex(lk.skin) || colors.skinA; colors.hair = hex(lk.hairColor) || colors.hair;
      colors.skinShade = colors.skinA.map(v => v * 0.82);
      for (const k of ['band', 'sleeve', 'knee', 'socks', 'wrist', 'goggles', 'chain']) if (hex(lk[k])) colors['g_' + k] = hex(lk[k]);
      if (hex(lk.shoes)) colors.shoes = hex(lk.shoes);
      colors.eye = hex('#16191b');
    }
    colors.jerseyShade = (colors.jersey || colors.home).map(v => v * 0.78);
    colors.jerseyTrim = (colors.jersey || colors.home).map(v => Math.min(1, v * 1.18 + 0.05));
    colors.shorts = (colors.jersey || colors.home).map(v => v * 0.62);
    // Base: sombra suave + sombra de contacto (dos elipses) para que el modelo se apoye en el suelo.
    add(0, 0.025, 0, 1.35, 0.03, 0.95, 'shadow');
    add(0, 0.008, 0, 0.95, 0.02, 0.72, 'shadowDeep');
    // Piernas: zapatilla (suela + empeine), calcetín, espinilla, rodilla, muslo.
    for (const s of [-1, 1]) {
      part(s * 0.17, 0.05, 0.07, 0.27, 0.09, 0.48, 'shoeSole');
      part(s * 0.17, 0.14, 0.06, 0.26, 0.13, 0.46, 'shoes');
      part(s * 0.17, 0.27, 0.01, 0.24, 0.16, 0.28, 'sock');
      part(s * 0.17, 0.42, 0, 0.22, 0.17, 0.26, 'skinA');
      part(s * 0.17, 0.58, 0.005, 0.23, 0.16, 0.26, 'skinA');
      part(s * 0.17, 0.75, 0, 0.25, 0.2, 0.28, 'skinA');
    }
    // Pantalón corto: cuerpo, perneras y cinturilla.
    part(0, 0.89, 0, 0.68, 0.26, 0.4, 'shorts');
    part(-0.2, 0.83, 0.01, 0.26, 0.16, 0.38, 'shorts');
    part(0.2, 0.83, 0.01, 0.26, 0.16, 0.38, 'shorts');
    part(0, 1.02, 0, 0.7, 0.05, 0.42, 'shortsTrim');
    // Torso: cintura, pecho, canesú de hombros y dorsal.
    part(0, 1.16, 0, 0.66, 0.24, 0.42, 'jersey');
    part(0, 1.37, 0, 0.74, 0.22, 0.44, 'jersey');
    part(0, 1.5, 0, 0.86, 0.1, 0.46, 'jersey');
    part(0, 1.545, 0, 0.6, 0.04, 0.4, 'jerseyTrim');
    part(-0.38, 1.43, 0, 0.22, 0.2, 0.34, 'jersey'); part(0.38, 1.43, 0, 0.22, 0.2, 0.34, 'jersey');
    part(0, 1.3, 0.225, 0.3, 0.26, 0.02, 'shortsTrim');
    part(0, 1.3, -0.225, 0.26, 0.22, 0.02, 'jerseyShade');
    // Cuello y cabeza: mandíbula, pómulos, nariz, orejas, ojos y cejas.
    part(0, 1.56, 0, 0.21, 0.13, 0.21, 'skinA');
    part(0, 1.79, 0, 0.4, 0.38, 0.4, 'skinA');
    part(0, 1.64, 0.03, 0.34, 0.1, 0.34, 'skinA');
    part(0, 1.74, 0.2, 0.2, 0.1, 0.06, 'skinA');
    part(0, 1.83, 0.215, 0.07, 0.07, 0.07, 'skinA');
    for (const s of [-1, 1]) {
      part(s * 0.235, 1.8, 0, 0.06, 0.14, 0.12, 'skinShade');
      part(s * 0.09, 1.82, 0.215, 0.07, 0.07, 0.03, lk ? 'eye' : 'hair');
      part(s * 0.09, 1.9, 0.21, 0.12, 0.035, 0.03, 'hair');
    }
    const style = lk ? lk.hair : profile.women ? 'ponytail' : 'short';
    if (style !== 'bald') {
      if (style === 'buzz') part(0, 1.965, -0.01, 0.42, 0.05, 0.41, 'hair');
      else if (style === 'afro') { part(0, 2.06, -0.02, 0.62, 0.26, 0.58, 'hair'); part(0, 1.86, -0.2, 0.6, 0.3, 0.2, 'hair'); }
      else part(0, 1.975, -0.02, 0.44, 0.12, 0.42, 'hair');
      if (style === 'ponytail') { part(0, 1.9, -0.26, 0.18, 0.14, 0.12, 'hair'); part(0, 1.66, -0.3, 0.13, 0.3, 0.11, 'hair'); }
      if (style === 'bun') part(0, 2.12, -0.12, 0.2, 0.16, 0.2, 'hair');
      if (style === 'long') { part(0, 1.72, -0.2, 0.46, 0.48, 0.08, 'hair'); part(-0.22, 1.78, -0.05, 0.04, 0.34, 0.3, 'hair'); part(0.22, 1.78, -0.05, 0.04, 0.34, 0.3, 'hair'); }
      if (style === 'braids') for (const x of [-0.15, -0.05, 0.05, 0.15]) part(x, 1.7, -0.22, 0.06, 0.42, 0.06, 'hair');
      if (style === 'mohawk') part(0, 2.12, -0.02, 0.12, 0.2, 0.46, 'hair');
      if (style === 'curly') for (const [x, z] of [[-0.16, 0.1], [0.16, 0.1], [-0.16, -0.14], [0.16, -0.14], [0, -0.02]]) part(x, 2.08, z, 0.18, 0.14, 0.18, 'hair');
      if (style === 'dreads') for (const x of [-0.2, -0.1, 0, 0.1, 0.2]) part(x, 1.72, -0.2, 0.07, 0.5, 0.07, 'hair');
      if (style === 'cornrows') for (const x of [-0.15, -0.05, 0.05, 0.15]) part(x, 2.07, -0.02, 0.05, 0.04, 0.46, 'skinA');
      if (style === 'topknot') { part(0, 2.14, -0.05, 0.18, 0.14, 0.18, 'hair'); part(0, 2.26, -0.05, 0.12, 0.1, 0.12, 'hair'); }
      if (style === 'fade') part(0, 1.9, -0.02, 0.43, 0.06, 0.42, 'skinA');
    }
    if (lk && lk.beard === 'full') part(0, 1.62, 0.18, 0.38, 0.14, 0.1, 'hair'); else if (lk && lk.beard === 'stubble') part(0, 1.62, 0.2, 0.34, 0.08, 0.04, 'hair');
    else if (lk && lk.beard === 'goatee') part(0, 1.58, 0.2, 0.12, 0.12, 0.06, 'hair'); else if (lk && lk.beard === 'mustache') part(0, 1.7, 0.22, 0.2, 0.04, 0.04, 'hair');
    // Brazos: hombro, bíceps, antebrazo y mano. Reposo o la celebración elegida.
    const pose = options.celebrate && lk ? lk.celebration : null, k = options.phase == null ? 1 : options.phase;
    const side = profile.handedness === 'left' ? -1 : 1;
    const arm = (x, y, z, dir) => {
      part(x, y, z, 0.22, 0.26, 0.24, 'skinA');
      part(x, y + 0.26 * dir, z + 0.02, 0.19, 0.26, 0.22, 'skinA');
      part(x, y + 0.52 * dir, z + 0.04, 0.21, 0.14, 0.21, 'skinShade');
      if (colors.g_wrist) part(x, y + 0.46 * dir, z + 0.03, 0.2, 0.07, 0.22, 'g_wrist');
    };
    if (!pose) { arm(-0.5, 1.3, 0, -1); arm(0.5, 1.3, 0, -1); }
    else if (pose === 'point') { arm(-0.5 * side, 1.3, 0, -1); arm(0.48 * side, 1.44, 0, 1); }
    else if (pose === 'shimmy') { const w = Math.sin(k * Math.PI * 6) * 0.07; arm(-0.5, 1.24 + w, 0.04, 1); arm(0.5, 1.24 - w, 0.04, 1); }
    else if (pose === 'flex') { arm(-0.54, 1.34, 0.02, 1); arm(0.54, 1.34, 0.02, 1); }
    else if (pose === 'silence') { arm(-0.5 * side, 1.3, 0, -1); arm(0.34 * side, 1.3, 0.1, 1); }
    else if (pose === 'archer') { arm(-0.46 * side, 1.34, 0.04, 1); arm(0.3 * side, 1.3, 0.12, 1); }
    else if (pose === 'crown') { arm(-0.3, 1.7, 0.02, 1); arm(0.3, 1.7, 0.02, 1); }
    else if (pose === 'goggles') { arm(-0.34, 1.28, 0.12, 1); arm(0.34, 1.28, 0.12, 1); }
    else if (pose === 'heart') { arm(-0.24, 1.28, 0.14, 1); arm(0.24, 1.28, 0.14, 1); part(0, 1.42, 0.26, 0.24, 0.2, 0.06, 'skinA'); }
    else if (pose === 'salute') { arm(-0.5 * side, 1.3, 0, -1); arm(0.4 * side, 1.32, 0.06, 1); }
    else { arm(-0.5, 1.3, 0, -1); arm(0.5, 1.3, 0, -1); }
    if (!lk) part(0, 1.98, 0, 0.48, 0.07, 0.46, 'accessory');
    if (lk) {
      if (colors.g_band) part(0, 1.94, 0, 0.44, 0.07, 0.43, 'g_band');
      if (colors.g_sleeve) part(profile.handedness === 'left' ? -0.5 : 0.5, 1.2, 0, 0.23, 0.3, 0.26, 'g_sleeve');
      if (colors.g_knee) { part(-0.17, 0.58, 0.02, 0.25, 0.13, 0.28, 'g_knee'); part(0.17, 0.58, 0.02, 0.25, 0.13, 0.28, 'g_knee'); }
      if (colors.g_socks) { part(-0.17, 0.31, 0, 0.25, 0.15, 0.29, 'g_socks'); part(0.17, 0.31, 0, 0.25, 0.15, 0.29, 'g_socks'); }
      if (colors.g_goggles) part(0, 1.82, 0.22, 0.36, 0.08, 0.03, 'g_goggles');
      if (colors.g_chain) part(0, 1.5, 0.21, 0.14, 0.14, 0.02, 'g_chain');
    }
    const hand = profile.handedness === 'left' ? -0.58 : 0.58;
    if (!(options.celebrate && lk)) {
      add(hand, 0.74 * h, 0.3, 0.26, 0.26, 0.26, 'ball', 0.4);
      add(hand, 0.74 * h, 0.3, 0.265, 0.05, 0.265, 'ballSeam', 0.4);
      add(hand, 0.74 * h, 0.3, 0.05, 0.265, 0.265, 'ballSeam', 0.4);
    }
    if (profile.mode === 'coach') { colors.jersey = hex('#344d58') || colors.post; part(0, 1.32, 0.22, 0.18, 0.4, 0.04, 'line'); }
    return { version: VERSION, kind: 'avatar', cubes, colors, quality: 'low', aspect: 0.8, maxCubes: 64, frame: { eye: [2.5, 2.0, 3.4], target: [0, 1.72, 0], halfH: 2.2 }, sky: [[0.03, 0.04, 0.095], [0.07, 0.085, 0.2], [0.15, 0.1, 0.14]] };
  }
  function palette(options = {}) {
    const cb = options.colorMode === 'blue-orange', hc = !!options.highContrast;
    const hex = s => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
    const p = {
      crowdA: hex('#ff7a1f'), crowdB: hex('#3be3ff'), crowdC: hex('#f3efe7'), crowdD: hex('#8b5cf6'), crowdE: hex('#f2c14e'), crowdF: hex('#e0475f'),
      jumbo: hex(hc ? '#ffffff' : '#0d1a3a'), jumboRim: hex('#3be3ff'), ledBoard: hex('#ff7a1f'), ledBoardB: hex('#2b7fd4'), net: hex('#f7f7f2'),
      bannerA: hex('#f3efe7'), bannerB: hex('#2b7fd4'), lightPanel: hex('#e9f4ff'), lightGlow: hex('#ffd98a'), standUpper: hex('#1c2340'), standRim: hex('#39456f'),
      floor: hex('#121633'), floorTrim: hex('#1b2450'), apron: hex('#0d1129'), apronDeep: hex('#070a19'),
      court: hex(hc ? '#9b6a34' : '#c08b52'), courtA: hex(hc ? '#8a5f2e' : '#b9824a'), courtB: hex(hc ? '#a8743b' : '#cb9a63'), courtC: hex('#b47c45'),
      paint: hex(hc ? '#1d4667' : '#1f6079'), line: hex('#fff4d8'), logo: hex('#f6e3bd'),
      board: hex('#cfe6ec'), boardFrame: hex('#8fa9b5'), boardInner: hex('#e2494a'), rim: hex('#ff713d'), rimDark: hex('#c4491f'), post: hex('#344d58'), postPad: hex('#20313a'), clock: hex('#ffcf4a'),
      seatA: hex('#232a5c'), seatB: hex('#3a2f6b'), seatEdge: hex('#171c40'), bench: hex('#2a3140'), benchPly: hex('#3f4b63'), table: hex('#2a3140'), tablePly: hex('#5b6780'), tablePly2: hex('#7a8698'),
      home: hex(cb ? '#5aa9ff' : '#36b98a'), away: hex(cb ? '#ff9f43' : '#ef7565'), skinA: hex('#c98c62'), skinB: hex('#805137'), skinC: hex('#e0b48c'), hair: hex('#252323'),
      shorts: hex('#182c38'), shortsTrim: hex('#f3efe7'), shoeSole: hex('#f2eee4'), shoes: hex('#2b3546'), sock: hex('#f2eee4'),
      homeShorts: hex(cb ? '#1c4b80' : '#14684f'), awayShorts: hex(cb ? '#8a4a12' : '#8f3a30'), homeSock: hex('#f2eee4'), awaySock: hex('#2a2a33'),
      ball: hex('#ffb547'), ballSeam: hex('#8a3c0c'), ballTrail: hex('#ff9a3c'), shadow: hex('#5b4124'), shadowDeep: hex('#3a2a17'),
      haze: hex('#0b1020'), boardGlow: hex('#dff8ff')
    };
    if (hc) { p.floor = hex('#000000'); p.apron = hex('#000000'); p.apronDeep = hex('#000000'); p.line = hex('#ffffff'); }
    return p;
  }
  // Grada: escalones, asientos, público que bota con el hype, videomarcador, focos, pancartas y vallas LED.
  function arenaDressing(add, L, W, options = {}) {
    const t = options.t || 0, hype = options.hype || 0, reduced = !!options.reducedMotion;
    const rows = Math.max(1, options.rows || (options.quality === 'balanced' ? 3 : 2));
    const cols = Math.max(4, options.cols || (options.quality === 'balanced' ? 16 : 12));
    const people = ['crowdA', 'crowdB', 'crowdC', 'crowdD', 'crowdE', 'crowdF'];
    const gapX = (L - 2) / (cols - 1);
    for (const side of [-1, 1]) {
      for (let row = 0; row < rows; row++) {
        const z = side * (W / 2 + 1.35 + row * 0.95), y = 0.52 + row * 0.54;
        add(0, y - 0.42, z + side * 0.42, L + 3.6, 0.14, 0.9, 'seatEdge');
        for (let j = 0; j < cols; j++) {
          const x = -L / 2 + 1 + j * gapX;
          add(x, y - 0.14, z, 1.05, 0.24, 0.6, row % 2 ? 'seatA' : 'seatB');
          const bob = reduced ? 0 : Math.max(0, Math.sin(t * 5.4 + j * 1.7 + row * 2.1 + side)) * 0.2 * (0.35 + hype);
          const c = people[(j * 3 + row * 5 + (side > 0 ? 1 : 0)) % people.length];
          add(x, y + 0.26 + bob, z, 0.44, 0.5, 0.34, c);
          add(x, y + 0.65 + bob, z, 0.26, 0.26, 0.26, (j + row) % 4 === 0 ? 'skinC' : (j + row) % 3 === 0 ? 'skinB' : 'skinA');
          if (hype > 0.45 && (j + row) % 4 === 0) add(x + 0.22, y + 0.66 + bob, z, 0.09, 0.4, 0.09, c);
        }
      }
    }
    // Videomarcador central: caja oscura, cuatro pantallas con gráficos y aro luminoso arriba y abajo.
    add(0, 8.75, 0, 0.22, 1.5, 0.22, 'post');
    add(0, 7.5, 0, 3.4, 1.6, 0.24, 'jumbo'); add(0, 7.5, 0, 0.24, 1.6, 3.4, 'jumbo');
    add(0, 8.36, 0, 3.58, 0.1, 3.58, 'standUpper');
    for (const s4 of [-1, 1]) { add(0, 8.43, s4 * 1.76, 3.58, 0.03, 0.06, 'jumboRim'); add(s4 * 1.76, 8.43, 0, 0.06, 0.03, 3.58, 'jumboRim'); }
    add(0, 6.62, 0, 3.3, 0.12, 3.3, 'ledBoard');
    for (const sz of [-1, 1]) for (let i = 0; i < 3; i++) add(-0.95 + i * 0.95, 7.55, sz * 0.14, 0.62, 0.52, 0.03, i % 2 ? 'jumboRim' : 'ledBoard');
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) add(sx * 0.14, 7.55, -0.95 + i * 0.95, 0.03, 0.52, 0.62, i % 2 ? 'ledBoard' : 'jumboRim');
    // Segundo anillo: graderío alto en sombra con público de fondo, para que el techo no quede vacío.
    for (const side of [-1, 1]) {
      add(0, 1.35, side * (W / 2 + 3.1), L + 9, 0.4, 1.7, 'seatEdge');
      add(0, 2.35, side * (W / 2 + 4.3), L + 9, 1.8, 2.6, 'standUpper');
      add(0, 3.35, side * (W / 2 + 4.3), L + 9, 0.22, 2.7, 'standRim');
      add(0, 4.5, side * (W / 2 + 5.5), L + 10, 0.3, 1.4, 'standUpper');
      add(0, 5.3, side * (W / 2 + 5.5), L + 10, 0.2, 1.5, 'standRim');
      for (let i = 0; i < 9; i++) add(-L / 2 + 1.5 + i * (L - 3) / 8, 3.15, side * (W / 2 + 3.4), 1.5, 0.6, 0.4, people[(i + (side > 0 ? 2 : 0)) % people.length]);
      for (let i = 0; i < 8; i++) add(-L / 2 + 2 + i * (L - 4) / 7, 1.85, side * (W / 2 + 3.5), 1.2, 0.42, 0.36, people[(i + 3 + (side > 0 ? 1 : 0)) % people.length]);
      for (let i = 0; i < 7; i++) add(-L / 2 + 2.5 + i * (L - 5) / 6, 4.6 + (i % 2) * 0.5, side * (W / 2 + 5.4), 1.8, 1.1, 0.08, i % 2 ? 'bannerA' : 'bannerB');
    }
    // Focos de techo en las cuatro esquinas.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(sx * (L / 2 + 1.5), 8.2, sz * (W / 2 + 1.6), 1.1, 0.16, 0.4, 'lightPanel'); add(sx * (L / 2 + 1.5), 8.05, sz * (W / 2 + 1.6), 0.9, 0.12, 0.3, 'lightGlow'); }
    // Vallas LED perimetrales (tres tramos por lado, alternando color).
    for (const side of [-1, 1]) for (let i = -1; i <= 1; i++) add(0, 0.34, side * (W / 2 + 0.72), L + 2, 0.5, 0.16, i % 2 ? 'ledBoard' : 'ledBoardB');
    // Banquillo, mesa de anotadores y fotógrafos: el mobiliario de banda de una retransmisión.
    add(0, 0.3, -W / 2 - 1.5, 4.6, 0.16, 0.55, 'bench');
    for (const x of [-2, -0.7, 0.7, 2]) add(x, 0.62, -W / 2 - 1.5, 0.44, 0.5, 0.42, 'benchPly');
    add(0, 0.36, W / 2 + 1.5, 5.4, 0.14, 0.6, 'table');
    for (let i = 0; i < 4; i++) add(-1.8 + i * 1.2, 0.72, W / 2 + 1.5, 0.42, 0.6, 0.4, i % 2 ? 'tablePly' : 'tablePly2');
    for (let i = 0; i < 5; i++) { const x = -6 + i * 3; add(x, 0.24, W / 2 + 0.95, 0.42, 0.4, 0.36, i % 2 ? 'crowdC' : 'crowdA'); add(x + 0.2, 0.5, W / 2 + 0.95, 0.22, 0.22, 0.22, 'post'); }
  }
  // Red deformable: anillos de cubos bajo el aro que se estiran al entrar el balón.
  function rimAndNet(add, hx, kick, t, options = {}) {
    if (options.ring !== false) for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; add(hx + Math.cos(a) * 0.23, 3.055, Math.sin(a) * 0.23, 0.075, 0.045, 0.075, 'rim'); }
    for (let lvl = 1; lvl <= 4; lvl++) {
      const r = 0.225 - lvl * 0.035, drop = lvl * (0.12 + kick * 0.055);
      for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + lvl * 0.2 + Math.sin(t * 14) * kick * 0.3; add(hx + Math.cos(a) * r, 3.05 - drop, Math.sin(a) * r, 0.035, 0.13, 0.035, 'net'); }
    }
  }
  // Figura de jugador en pista: ~26 cubos con zapatilla, calcetín, pierna, pantalón, camiseta con dorsal, cuello,
  // cabeza, pelo y brazos. Se ve desde la cámara de retransmisión, así que el gesto importa más que el detalle fino.
  function figureAt(add, p, quality) {
    const detailed = quality === 'balanced';
    const jersey = p.team ? 'away' : 'home', shorts = p.team ? 'awayShorts' : 'homeShorts', sock = p.team ? 'awaySock' : 'homeSock';
    const skin = p.team ? 'skinB' : 'skinA';
    const c = Math.cos(p.yaw), s = Math.sin(p.yaw), h = 1 + (p.number % 3) * 0.04;
    const part = (x, y, z, sx, sy, sz, color) => add(p.x + x * c + z * s, p.y + y * h, p.z - x * s + z * c, sx, sy * h, sz, color, p.yaw);
    add(p.x, 0.075, p.z, 0.92, 0.02, 0.74, 'shadow');
    add(p.x, 0.055, p.z, 0.56, 0.02, 0.46, 'shadowDeep');
    for (const s2 of [-1, 1]) {
      part(s2 * 0.16, 0.06, 0.06, 0.26, 0.1, 0.44, 'shoeSole');
      part(s2 * 0.16, 0.15, 0.06, 0.25, 0.13, 0.42, 'shoes');
      part(s2 * 0.16, 0.28, 0.01, 0.23, 0.16, 0.26, sock);
      part(s2 * 0.16, 0.44, 0, 0.21, 0.18, 0.25, skin);
      part(s2 * 0.16, 0.62, 0, 0.22, 0.18, 0.25, skin);
      part(s2 * 0.16, 0.78, 0, 0.24, 0.16, 0.26, skin);
    }
    part(0, 0.9, 0, 0.64, 0.24, 0.38, shorts);
    part(-0.19, 0.83, 0.01, 0.24, 0.16, 0.36, shorts); part(0.19, 0.83, 0.01, 0.24, 0.16, 0.36, shorts);
    part(0, 1.16, 0, 0.66, 0.24, 0.4, jersey);
    part(0, 1.38, 0, 0.68, 0.24, 0.42, jersey);
    part(0, 1.5, 0, 0.62, 0.06, 0.4, 'jerseyTrim');
    if (detailed) { part(0, 1.3, 0.215, 0.28, 0.26, 0.02, 'shortsTrim'); part(0, 1.5, 0, 0.72, 0.07, 0.44, jersey); }
    part(0, 1.57, 0, 0.19, 0.1, 0.19, skin);
    part(0, 1.78, 0, 0.42, 0.4, 0.4, skin);
    part(0, 1.65, 0.03, 0.34, 0.08, 0.34, skin);
    part(0, 1.94, -0.02, 0.44, 0.12, 0.42, 'hair');
    if (detailed) { part(-0.09, 1.82, 0.205, 0.06, 0.06, 0.03, 'hair'); part(0.09, 1.82, 0.205, 0.06, 0.06, 0.03, 'hair'); }
    const armY = 1.16 + p.armsUp * 0.5, armZ = p.armsUp * 0.16;
    part(-0.43, armY, armZ, 0.19, 0.4, 0.22, skin); part(0.43, armY, armZ, 0.19, 0.4, 0.22, skin);
    part(-0.43, armY + 0.36, armZ + 0.02, 0.17, 0.16, 0.2, skin); part(0.43, armY + 0.36, armZ + 0.02, 0.17, 0.16, 0.2, skin);
    if (p.women) { part(0, 1.9, -0.24, 0.16, 0.13, 0.11, 'hair'); part(0, 1.68, -0.27, 0.12, 0.26, 0.1, 'hair'); }
  }
  function geometry(match, index, progress, options = {}) {
    const quality = options.quality === 'balanced' ? 'balanced' : 'low';
    const court = courtGeometry(match && match.ruleSetId, quality), f = frameAt(match, index, progress, options), colors = palette(options);
    if (/^#[0-9a-f]{6}$/i.test(options.ball || '')) colors.ball = [parseInt(options.ball.slice(1, 3), 16) / 255, parseInt(options.ball.slice(3, 5), 16) / 255, parseInt(options.ball.slice(5, 7), 16) / 255];
    const cubes = court.cubes.slice();
    const add = (x, y, z, sx, sy, sz, color, yaw = 0) => { if (cubes.length < MAX_CUBES) cubes.push({ x, y, z, sx, sy, sz, color, yaw }); };
    for (const p of f.players) figureAt(add, Object.assign({ women: !!options.women }, p), quality);
    if (options.arena !== false) {
      const L = court.dimensions.length, W = court.dimensions.width;
      const e = f.event || {}, made = (e.type === 'shot' && e.made) || (e.type === 'ft' && e.made);
      for (const side of [-1, 1]) { const hx = side * (L / 2 - 1.575); const near = Math.hypot(f.ball.x - hx, f.ball.y - 3.05, f.ball.z) < 1.2; rimAndNet(add, hx, made && near ? 1 : 0, options.t || 0, { ring: false }); }
      arenaDressing(add, L, W, { t: options.t || 0, hype: options.hype == null ? ((e.period || 1) >= 4 && (e.clock || 9999) <= 1200 ? 1 : 0.3) : options.hype, reducedMotion: options.reducedMotion, quality });
    }
    // Balón: dos cubos cruzados (se lee como esfera) + estela del tiro + sombra en el suelo.
    const bx = f.ball.x, by = f.ball.y, bz = f.ball.z, rot = f.progress * Math.PI;
    add(bx, by, bz, 0.24, 0.24, 0.24, 'ball', rot);
    add(bx, by, bz, 0.2, 0.27, 0.2, 'ball', rot + 0.78);
    add(bx, by + 0.02, bz, 0.255, 0.02, 0.255, 'ballSeam', rot);
    const ballShadow = clamp(0.36 - by * 0.045, 0.1, 0.36);
    add(bx, 0.1, bz, ballShadow, 0.02, ballShadow, 'shadowDeep');
    const shot = f.event && (f.event.type === 'shot' || f.event.type === 'ft');
    if (shot && f.origin && f.progress > 0.06) {
      const o = f.origin, tg = f.target, miss = f.event.type === 'block' || f.event.made === false;
      for (let k = 1; k <= 4; k++) {
        const u = f.progress - k * 0.075;
        if (u <= 0.02) break;
        const px = mix(o.x, tg.x + (miss ? 0.6 : 0), u), pz = mix(o.z, miss ? 0.65 : 0, u);
        const py = mix(o.y, tg.y, u) + Math.sin(u * Math.PI) * (f.event.type === 'ft' ? 2.1 : 2.8);
        add(px, py, pz, 0.17 - k * 0.03, 0.17 - k * 0.03, 0.17 - k * 0.03, 'ballTrail');
      }
    }
    const hype = options.hype == null ? 0.3 : options.hype;
    return {
      frame: f, cubes, colors, dimensions: court.dimensions, quality, maxCubes: MAX_CUBES, staticCount: 0,
      sky: options.highContrast ? [[0.02, 0.02, 0.03], [0.04, 0.04, 0.06], [0.09, 0.05, 0.05]] : ARENA_SKY,
      glow: 0.35 + hype * 0.65,
      fog: { near: 26, far: 78, color: [0.05, 0.06, 0.12] }
    };
  }

  function normalize(v) { const l = Math.hypot(...v) || 1; return v.map(x => x / l); }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function lookAt(eye, target) {
    const z = normalize(eye.map((v, i) => v - target[i])), x = normalize(cross([0, 1, 0], z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
  }
  function perspective(aspect, fovDeg, near, far) {
    const f = 1 / Math.tan((fovDeg || 55) * Math.PI / 360), n = near || 0.1, fa = far || 120;
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]);
  }
  function cameraEye(camera, frame) {
    if (camera && typeof camera === 'object') return camera.eye || [0, 2, 6];
    if (camera === 'avatar') return (frame && frame.eye) || [2.5, 2.0, 3.4];
    const angle = camera === 'sideline' ? 0.05 : 0.55;
    return camera === 'sideline' ? [Math.sin(angle) * 30, 15, Math.cos(angle) * 30] : [Math.sin(angle) * 24, 17.2, Math.cos(angle) * 24];
  }
  function viewMatrix(camera, frame) {
    if (camera && typeof camera === 'object') return lookAt(camera.eye, camera.target);
    if (camera === 'avatar') return lookAt(cameraEye(camera, frame), (frame && frame.target) || [0, 1.3, 0]);
    return lookAt(cameraEye(camera), camera === 'sideline' ? [0, 0, 0] : [0, 0.7, -0.5]);
  }
  function orthoMatrix(aspect, camera = 'court', frame) {
    if (camera && typeof camera === 'object') return perspective(aspect, camera.fov, camera.near, camera.far);
    const halfH = camera === 'avatar' ? ((frame && frame.halfH) || 2.35) : Math.max(10, 16.8 / Math.max(0.4, aspect)), halfW = halfH * aspect, near = camera === 'avatar' ? 0.1 : 1, far = camera === 'avatar' ? 30 : 100;
    return new Float32Array([1 / halfW, 0, 0, 0, 0, 1 / halfH, 0, 0, 0, 0, -2 / (far - near), 0, 0, 0, -(far + near) / (far - near), 1]);
  }
  // Vértices con luz de estudio + oclusión + niebla: la luz se cocina por cara y la niebla por vértice,
  // así un solo draw call (sin shaders de luz) consigue volumen y profundidad atmosférica.
  function studioLight(eye, target) {
    const d = normalize([eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]]);
    const side = normalize(cross([0, 1, 0], d));
    return { key: [d[0] * 0.8 - side[0] * 0.45, d[1] * 0.8 + 0.6, d[2] * 0.8 - side[2] * 0.45], fill: [-d[0] + side[0] * 0.6, 0.25, -d[2] + side[2] * 0.6], ambient: 0.42, aoMin: 0.82 };
  }
  function vertexData(scene, options = {}) {
    const cubes = scene.cubes, total = cubes.length;
    const out = new Float32Array(total * 36 * FLOATS_PER_VERTEX);
    const eye = options.eye || (scene.fog && scene.fog.eye) || null;
    const fog = scene.fog || null;
    const fogColor = (fog && fog.color) || HAZE;
    const fogNear = fog ? fog.near : 0, fogSpan = fog ? Math.max(0.001, fog.far - fog.near) : 1;
    const fallback = scene.colors.line || [1, 1, 1];
    const gain = scene.gain || 1;
    // Luz de estudio opcional (avatar y escenas): la principal sigue a la cámara para que lo que mira al espectador
    // quede iluminado; ambiental más alta y oclusión de contacto más suave.
    const L = scene.light || null;
    const KEY = L && L.key ? normalize(L.key) : KEY_LIGHT, FILL = L && L.fill ? normalize(L.fill) : FILL_LIGHT;
    const amb = L && L.ambient != null ? L.ambient : 0.24, aoMin = L && L.aoMin != null ? L.aoMin : 0.6;
    let offset = 0;
    for (let ci = 0; ci < total; ci++) {
      const cube = cubes[ci], color = scene.colors[cube.color] || fallback;
      const c = Math.cos(cube.yaw || 0), s = Math.sin(cube.yaw || 0);
      // Oclusión de contacto: lo que está cerca del suelo pierde luz; el público alto y el techo la recuperan.
      const ao = clamp(aoMin + Math.max(0, cube.y - cube.sy * 0.5) * 0.14, aoMin, 1.0);
      for (let fi = 0; fi < 6; fi++) {
        const normal = FACE_LIST[fi][0], corners = FACE_LIST[fi][1];
        const nx = normal[0] * c + normal[2] * s, nz = -normal[0] * s + normal[2] * c, ny = normal[1];
        const key = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
        const fill = Math.max(0, nx * FILL[0] + ny * FILL[1] + nz * FILL[2]);
        const hemi = 0.5 + 0.5 * ny;
        const shade = (amb + key * 0.66 + fill * 0.13 + hemi * 0.15) * ao * gain;
        // Tinte de cielo en caras superiores y rebote cálido del parqué en las inferiores.
        const tr = shade * (1 + ny * 0.02 - Math.max(0, -ny) * 0.04);
        const tg = shade * (1 + ny * 0.05);
        const tb = shade * (1 + ny * 0.11);
        const cr = color[0] * tr, cg = color[1] * tg, cb = color[2] * tb;
        for (let k = 0; k < 6; k++) {
          const v = corners[TRI[k]];
          const x = v[0] * cube.sx / 2, z = v[2] * cube.sz / 2;
          const wx = cube.x + x * c + z * s, wy = cube.y + v[1] * cube.sy / 2, wz = cube.z - x * s + z * c;
          out[offset++] = wx; out[offset++] = wy; out[offset++] = wz;
          out[offset++] = nx; out[offset++] = ny; out[offset++] = nz;
          if (fog && eye) {
            const d = Math.hypot(wx - eye[0], wy - eye[1], wz - eye[2]);
            const f = smooth(clamp((d - fogNear) / fogSpan, 0, 1));
            out[offset++] = mix(cr, fogColor[0], f); out[offset++] = mix(cg, fogColor[1], f); out[offset++] = mix(cb, fogColor[2], f);
          } else { out[offset++] = cr; out[offset++] = cg; out[offset++] = cb; }
        }
      }
    }
    return out;
  }

  const SKY_VS = 'attribute vec2 aPos;varying vec2 vUV;void main(){vUV=aPos*0.5+0.5;gl_Position=vec4(aPos,0.999,1.0);}';
  const SKY_FS = 'precision mediump float;varying vec2 vUV;uniform vec3 uTop;uniform vec3 uMid;uniform vec3 uBot;uniform float uGlow;'
    + 'void main(){float y=vUV.y;vec3 c=mix(uBot,uMid,smoothstep(0.0,0.55,y));c=mix(c,uTop,smoothstep(0.42,1.0,y));'
    + 'float g=exp(-pow((y-0.52)*5.5,2.0));c+=uGlow*g*vec3(0.30,0.17,0.09);'
    + 'vec2 d=vUV-vec2(0.5,0.54);float v=clamp(1.0-dot(d,d)*1.15,0.52,1.0);gl_FragColor=vec4(c*v,1.0);}';
  const SCENE_VS = 'attribute vec3 aPosition;attribute vec3 aColor;uniform mat4 uView;uniform mat4 uProjection;varying vec3 vColor;void main(){vColor=aColor;gl_Position=uProjection*uView*vec4(aPosition,1.0);}';
  const SCENE_FS = 'precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.0);}';

  function createRenderer(canvas, options = {}) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL unavailable');
    const shaders = [];
    function shader(type, source) { const sh = gl.createShader(type); gl.shaderSource(sh, source); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { const error = gl.getShaderInfoLog(sh); gl.deleteShader(sh); throw new Error('shader: ' + error); } shaders.push(sh); return sh; }
    function program(vs, fs) {
      const p = gl.createProgram(); gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('shader link failed');
      return p;
    }
    let mainProgram, skyProgram, buffer, skyBuffer;
    try {
      mainProgram = program(SCENE_VS, SCENE_FS);
      skyProgram = program(SKY_VS, SKY_FS);
      buffer = gl.createBuffer(); skyBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, skyBuffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      gl.useProgram(mainProgram); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const pos = gl.getAttribLocation(mainProgram, 'aPosition'), col = gl.getAttribLocation(mainProgram, 'aColor');
      gl.enableVertexAttribArray(pos); gl.enableVertexAttribArray(col);
      gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.depthFunc(gl.LEQUAL); gl.clearColor(0.043, 0.05, 0.11, 1);
    } catch (error) { shaders.forEach(s => gl.deleteShader(s)); [buffer, skyBuffer].forEach(b => { if (b) gl.deleteBuffer(b); }); [mainProgram, skyProgram].forEach(p => { if (p) gl.deleteProgram(p); }); throw error; }
    const uniforms = {
      view: gl.getUniformLocation(mainProgram, 'uView'), projection: gl.getUniformLocation(mainProgram, 'uProjection'),
      pos: gl.getAttribLocation(mainProgram, 'aPosition'), col: gl.getAttribLocation(mainProgram, 'aColor'),
      skyPos: gl.getAttribLocation(skyProgram, 'aPos'),
      skyTop: gl.getUniformLocation(skyProgram, 'uTop'), skyMid: gl.getUniformLocation(skyProgram, 'uMid'),
      skyBot: gl.getUniformLocation(skyProgram, 'uBot'), skyGlow: gl.getUniformLocation(skyProgram, 'uGlow')
    };
    let disposed = false, lost = false, count = 0, draws = 0, lastScene = null;
    const onLost = e => { e.preventDefault(); lost = true; if (options.onContextLost) options.onContextLost(); };
    const onRestored = () => { lost = false; if (options.onContextRestored) options.onContextRestored(); };
    canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRestored);
    function paintSky(sky, glow) {
      const colours = sky && sky.length >= 3 ? sky : DEFAULT_SKY;
      gl.useProgram(skyProgram); gl.bindBuffer(gl.ARRAY_BUFFER, skyBuffer);
      gl.enableVertexAttribArray(uniforms.skyPos); gl.vertexAttribPointer(uniforms.skyPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform3fv(uniforms.skyTop, colours[0]); gl.uniform3fv(uniforms.skyMid, colours[1]); gl.uniform3fv(uniforms.skyBot, colours[2]);
      gl.uniform1f(uniforms.skyGlow, glow == null ? 0.4 : glow);
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.depthMask(true); gl.enable(gl.DEPTH_TEST);
    }
    function draw(scene, camera = 'broadcast') {
      if (disposed || lost) return false;
      lastScene = scene;
      const ratio = Math.min(root.devicePixelRatio || 1, scene.quality === 'balanced' ? 1.75 : 1.4);
      const width = Math.max(1, Math.round((canvas.clientWidth || 640) * ratio)), height = Math.max(1, Math.round(width / (scene.aspect || 16 / 9)));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      const bg = scene.clear || [0.043, 0.05, 0.11]; gl.clearColor(bg[0], bg[1], bg[2], 1);
      gl.viewport(0, 0, width, height); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      try { paintSky(scene.sky, scene.glow); } catch (_) { /* sin cielo: el color de fondo hace de respaldo */ }
      const frame = camera === 'avatar' ? scene.frame : null;
      const data = vertexData(scene, { eye: cameraEye(camera, frame) }); count = data.length / FLOATS_PER_VERTEX;
      gl.useProgram(mainProgram); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(uniforms.pos); gl.enableVertexAttribArray(uniforms.col);
      gl.vertexAttribPointer(uniforms.pos, 3, gl.FLOAT, false, 36, 0); gl.vertexAttribPointer(uniforms.col, 3, gl.FLOAT, false, 36, 24);
      gl.uniformMatrix4fv(uniforms.view, false, viewMatrix(camera, frame)); gl.uniformMatrix4fv(uniforms.projection, false, orthoMatrix(width / height, camera, frame));
      gl.drawArrays(gl.TRIANGLES, 0, count); draws++;
      return true;
    }
    function dispose() { if (disposed) return; disposed = true; canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored); gl.deleteBuffer(buffer); gl.deleteBuffer(skyBuffer); gl.deleteProgram(mainProgram); gl.deleteProgram(skyProgram); shaders.forEach(s => gl.deleteShader(s)); }
    return { draw, dispose, stats: () => ({ version: VERSION, cubes: lastScene ? lastScene.cubes.length : 0, vertices: count, drawCalls: draws ? 1 : 0, quality: lastScene && lastScene.quality, lost, disposed }), isLost: () => lost };
  }
  CAA.Voxel = { studioLight, VERSION, MAX_CUBES, keyPlays, scoreAt, courtGeometry, frameAt, geometry, arenaDressing, rimAndNet, lookAt, perspective, avatarGeometry, palette, vertexData, viewMatrix, orthoMatrix, cameraEye, createRenderer };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Voxel;
})(typeof globalThis !== 'undefined' ? globalThis : this);
