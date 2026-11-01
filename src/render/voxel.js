(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const Rules = CAA.Rules || (typeof require === 'function' ? require('../match/rules.js') : null);
  const Hash = CAA.Hash || (typeof require === 'function' ? require('../core/hash.js') : null);
  const VERSION = 'voxel-1';
  const MAX_CUBES = 800;
  const FLOATS_PER_VERTEX = 9;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const ZONES = { restricted: [0, 1.25], paint: [2.8, 3.8], midShort: [-3.2, 4.8], midLong: [3.8, 5.2], corner3: [-6.1, 1.1], above3: [0, 7.4] };

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

  function courtGeometry(ruleSetId = 'FIBA-2026', quality = 'low') {
    const p = Rules.getProfile(ruleSetId), L = p.court.length, W = p.court.width;
    const cubes = [];
    const add = (x, y, z, sx, sy, sz, color, yaw = 0) => cubes.push({ x, y, z, sx, sy, sz, color, yaw });
    add(0, -0.18, 0, L + 3, 0.3, W + 3, 'floor');
    add(0, 0, 0, L, 0.08, W, 'court');
    const line = (x, z, sx, sz) => add(x, 0.055, z, sx, 0.025, sz, 'line');
    line(0, -W / 2, L, 0.07); line(0, W / 2, L, 0.07); line(-L / 2, 0, 0.07, W); line(L / 2, 0, 0.07, W); line(0, 0, 0.06, W);
    const segments = quality === 'balanced' ? 32 : 20;
    const ring = (cx, cz, radius, start, end, n) => {
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const a = mix(start, end, i / n), point = [cx + Math.cos(a) * radius, cz + Math.sin(a) * radius];
        if (prev) { const dx = point[0] - prev[0], dz = point[1] - prev[1]; add((point[0] + prev[0]) / 2, 0.06, (point[1] + prev[1]) / 2, Math.hypot(dx, dz) + 0.045, 0.025, 0.065, 'line', -Math.atan2(dz, dx)); }
        prev = point;
      }
    };
    ring(0, 0, 1.8, 0, Math.PI * 2, segments);
    for (const side of [-1, 1]) {
      const hx = side * (L / 2 - 1.575);
      line(side * (L / 2 - 2.95), 0, 5.9, 0.065);
      line(side * (L / 2 - 2.95), -2.45, 5.9, 0.065); line(side * (L / 2 - 2.95), 2.45, 5.9, 0.065);
      line(side * (L / 2 - 5.9), 0, 0.065, 4.9);
      // Corner lines meet the arc at the published corner distance, not at an invented fixed x.
      const cz = p.three.corner;
      const joinX = hx - side * Math.sqrt(Math.max(0, p.three.arc ** 2 - cz ** 2));
      line((side * L / 2 + joinX) / 2, -cz, Math.abs(joinX - side * L / 2), 0.065);
      line((side * L / 2 + joinX) / 2, cz, Math.abs(joinX - side * L / 2), 0.065);
      const a = Math.acos(clamp((joinX - hx) * side / p.three.arc, -1, 1));
      ring(hx, 0, p.three.arc, side < 0 ? -a : Math.PI - a, side < 0 ? a : Math.PI + a, segments);
      add(side * (L / 2 - 1.2), 3.45, 0, 0.12, 1.05, 1.8, 'board');
      add(side * (L / 2 - 1.12), 3.25, 0, 0.06, 0.45, 0.6, 'line');
      add(hx, 3.05, 0, 0.46, 0.07, 0.46, 'rim');
      add(side * (L / 2 - 0.35), 1.8, 0, 0.22, 3.6, 0.22, 'post');
      add(side * (L / 2 - 0.7), 3.55, 0, 0.9, 0.16, 0.16, 'post');
      if (quality === 'balanced') {
        for (let row = 0; row < 3; row++) for (let j = 0; j < 12; j++) add(-L / 2 + 1.5 + j * 2.25, 0.3 + row * 0.4, side * (W / 2 + 1.1 + row * 0.5), 1.8, 0.35, 0.45, row % 2 ? 'seatA' : 'seatB');
      }
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
    return { version: VERSION, index, event: e, progress: options.reducedMotion ? 1 : clamp(progress, 0, 1), players, ball, target, sourceHash: match && match.hash || null };
  }

  function avatarGeometry(profile = {}, options = {}) {
    const colors = palette(options), cubes = [];
    const eq = profile.equipment || {};
    const hex = v => /^#[0-9a-f]{6}$/i.test(v || '') ? [parseInt(v.slice(1,3),16)/255,parseInt(v.slice(3,5),16)/255,parseInt(v.slice(5,7),16)/255] : null;
    colors.jersey = hex(eq.jersey) || colors.home; colors.shoes = hex(eq.shoes) || colors.shoes; colors.accessory = hex(eq.accessory) || colors.ball;
    const add = (x,y,z,sx,sy,sz,color,yaw=0) => cubes.push({x,y,z,sx,sy,sz,color,yaw});
    const h = Math.max(1.7, Math.min(2.25, (profile.height || 196) / 196));
    const bulk = ['interior','finisher'].includes(profile.archetype) ? 1.12 : ['creator','shooter'].includes(profile.archetype) ? 0.94 : 1;
    const part = (x,y,z,sx,sy,sz,color) => add(x*bulk,y*h,z,sx*bulk,sy*h,sz,color);
    add(0,0.03,0,1.1,0.04,0.8,'shadow');
    part(-0.17,0.12,0.08,0.25,0.2,0.42,'shoes'); part(0.17,0.12,0.08,0.25,0.2,0.42,'shoes');
    part(-0.17,0.5,0,0.23,0.58,0.25,'skinA'); part(0.17,0.5,0,0.23,0.58,0.25,'skinA');
    part(0,0.88,0,0.66,0.36,0.38,'jersey'); part(0,1.3,0,0.68,0.58,0.4,'jersey');
    part(0,1.77,0,0.44,0.44,0.42,'skinA'); part(0,2,-0.02,0.46,0.12,0.44,'hair');
    part(-0.46,1.28,0,0.21,0.58,0.23,'skinA'); part(0.46,1.28,0,0.21,0.58,0.23,'skinA');
    part(-0.09,1.81,0.215,0.06,0.06,0.03,'hair'); part(0.09,1.81,0.215,0.06,0.06,0.03,'hair');
    part(0,1.98,0,0.48,0.07,0.46,'accessory');
    if (profile.women) { part(0,1.9,-0.26,0.18,0.14,0.12,'hair'); part(0,1.66,-0.3,0.13,0.3,0.11,'hair'); }
    const hand = profile.handedness === 'left' ? -0.58 : 0.58;
    add(hand,1.02,0.28,0.24,0.24,0.24,'ball');
    if (profile.mode === 'coach') { colors.jersey = hex('#344d58') || colors.post; part(0,1.32,0.22,0.18,0.4,0.04,'line'); }
    return { version: VERSION, kind: 'avatar', cubes, colors, quality: 'low', aspect: 0.8, maxCubes: MAX_CUBES };
  }
  function palette(options = {}) {
    const cb = options.colorMode === 'blue-orange', hc = !!options.highContrast;
    const hex = s => [parseInt(s.slice(1, 3), 16) / 255, parseInt(s.slice(3, 5), 16) / 255, parseInt(s.slice(5, 7), 16) / 255];
    return { crowdA: hex('#ff7a1f'), crowdB: hex('#3be3ff'), crowdC: hex('#f3efe7'), crowdD: hex('#8b5cf6'), jumbo: hex(hc ? '#ffffff' : '#0d1a3a'), ledBoard: hex('#ff7a1f'), net: hex('#f5f5f5'), floor: hex('#121633'), court: hex(hc ? '#805522' : '#ad7945'), line: hex('#fff4d8'), board: hex('#b9d9df'), rim: hex('#ff713d'), post: hex('#344d58'), seatA: hex('#232a5c'), seatB: hex('#3a2f6b'), home: hex(cb ? '#5aa9ff' : '#36b98a'), away: hex(cb ? '#ff9f43' : '#ef7565'), skinA: hex('#c98c62'), skinB: hex('#805137'), hair: hex('#252323'), shorts: hex('#182c38'), shoes: hex('#f2eee4'), ball: hex('#ffb547'), shadow: hex('#624725') };
  }
  // Ambientación de pabellón: grada con público (se anima con hype), videomarcador y focos.
  function arenaDressing(add, L, W, options = {}) {
    const t = options.t || 0, hype = options.hype || 0, reduced = !!options.reducedMotion;
    const people = ['crowdA', 'crowdB', 'crowdC', 'crowdD'];
    for (const side of [-1, 1]) for (let row = 0; row < 2; row++) for (let j = 0; j < 14; j++) {
      const x = -L / 2 + 1 + j * (L - 2) / 13, z = side * (W / 2 + 1.4 + row * 0.9), y = 0.45 + row * 0.55;
      add(x, y - 0.2, z, 1.6, 0.4, 0.7, row ? 'seatA' : 'seatB');
      const bob = reduced ? 0 : Math.max(0, Math.sin(t * 6 + j * 1.7 + row)) * 0.25 * hype;
      add(x, y + 0.35 + bob, z, 0.4, 0.5, 0.35, people[(j + row * 3) % 4]);
    }
    add(0, 7.6, 0, 3.2, 1.6, 3.2, 'post'); add(0, 7.6, 0, 3.0, 1.2, 3.25, 'jumbo'); add(0, 7.6, 0, 3.25, 1.2, 3.0, 'jumbo');
    for (const side of [-1, 1]) add(side * (L / 2 + 2.4), 0.5, 0, 0.3, 0.7, W * 0.55, 'ledBoard');
  }
  // Red deformable: anillos de cubos bajo el aro que se estiran al entrar el balón.
  function rimAndNet(add, hx, kick, t) {
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; add(hx + Math.cos(a) * 0.23, 3.05, Math.sin(a) * 0.23, 0.07, 0.04, 0.07, 'rim'); }
    for (let lvl = 1; lvl <= 3; lvl++) {
      const r = 0.22 - lvl * 0.035, drop = lvl * (0.13 + kick * 0.06);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + lvl * 0.2 + Math.sin(t * 14) * kick * 0.3; add(hx + Math.cos(a) * r, 3.05 - drop, Math.sin(a) * r, 0.035, 0.12, 0.035, 'net'); }
    }
  }
  function geometry(match, index, progress, options = {}) {
    const quality = options.quality === 'balanced' ? 'balanced' : 'low';
    const court = courtGeometry(match && match.ruleSetId, quality), f = frameAt(match, index, progress, options), colors = palette(options);
    const cubes = court.cubes.slice();
    const add = (x, y, z, sx, sy, sz, color, yaw = 0) => { if (cubes.length < MAX_CUBES) cubes.push({ x, y, z, sx, sy, sz, color, yaw }); };
    for (const p of f.players) {
      const c = Math.cos(p.yaw), s = Math.sin(p.yaw), h = 1 + (p.number % 3) * 0.035;
      const part = (x, y, z, sx, sy, sz, color) => add(p.x + x * c + z * s, p.y + y * h, p.z - x * s + z * c, sx, sy * h, sz, color, p.yaw);
      add(p.x, 0.08, p.z, 0.8, 0.018, 0.65, 'shadow');
      part(-0.16, 0.13, 0.07, 0.24, 0.2, 0.4, 'shoes'); part(0.16, 0.13, 0.07, 0.24, 0.2, 0.4, 'shoes');
      part(-0.16, 0.48, 0, 0.22, 0.55, 0.24, 'skinA'); part(0.16, 0.48, 0, 0.22, 0.55, 0.24, 'skinA');
      part(0, 0.84, 0, 0.62, 0.35, 0.36, p.team ? 'away' : 'home');
      part(0, 1.25, 0, 0.64, 0.55, 0.38, p.team ? 'away' : 'home');
      part(0, 1.72, 0, 0.42, 0.42, 0.4, p.team ? 'skinB' : 'skinA'); part(0, 1.94, -0.02, 0.44, 0.12, 0.42, 'hair');
      const armY = 1.22 + p.armsUp * 0.48;
      part(-0.43, armY, p.armsUp * 0.18, 0.2, 0.55, 0.22, 'skinA'); part(0.43, armY, p.armsUp * 0.18, 0.2, 0.55, 0.22, 'skinA');
      if (options.women) { part(0, 1.86, -0.25, 0.16, 0.13, 0.11, 'hair'); part(0, 1.64, -0.28, 0.12, 0.26, 0.1, 'hair'); }
      if (quality === 'balanced') { part(-0.09, 1.76, 0.205, 0.055, 0.055, 0.025, 'hair'); part(0.09, 1.76, 0.205, 0.055, 0.055, 0.025, 'hair'); }
    }
    if (options.arena !== false) {
      const L = court.dimensions.length, W = court.dimensions.width;
      const e = f.event || {}, made = (e.type === 'shot' && e.made) || (e.type === 'ft' && e.made);
      for (const side of [-1, 1]) { const hx = side * (L / 2 - 1.575); const near = Math.hypot(f.ball.x - hx, f.ball.y - 3.05, f.ball.z) < 1.2; rimAndNet(add, hx, made && near ? 1 : 0, options.t || 0); }
      arenaDressing(add, L, W, { t: options.t || 0, hype: options.hype == null ? ((e.period || 1) >= 4 && (e.clock || 9999) <= 1200 ? 1 : 0.3) : options.hype, reducedMotion: options.reducedMotion });
    }
    add(f.ball.x, f.ball.y, f.ball.z, 0.24, 0.24, 0.24, 'ball', f.progress * Math.PI);
    add(f.ball.x, f.ball.y, f.ball.z, 0.2, 0.27, 0.2, 'ball', f.progress * Math.PI + 0.78);
    return { frame: f, cubes, colors, dimensions: court.dimensions, quality, maxCubes: MAX_CUBES };
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
  function viewMatrix(camera) {
    if (camera && typeof camera === 'object') return lookAt(camera.eye, camera.target);
    if (camera === 'avatar') {
      const eye = [2.5, 2.0, 3.4], target = [0, 1.3, 0];
      const z = normalize(eye.map((v, i) => v - target[i])), x = normalize(cross([0, 1, 0], z)), y = cross(z, x);
      return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
    }
    const angle = camera === 'sideline' ? 0.05 : 0.55;
    const eye = [Math.sin(angle) * 30, camera === 'sideline' ? 15 : 23, Math.cos(angle) * 30], target = [0, 0, 0];
    const z = normalize(eye.map((v, i) => v - target[i])), x = normalize(cross([0, 1, 0], z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
  }
  function orthoMatrix(aspect, camera = 'court') {
    if (camera && typeof camera === 'object') return perspective(aspect, camera.fov, camera.near, camera.far);
    const halfH = camera === 'avatar' ? 2.25 : Math.max(11.5, 18 / Math.max(0.4, aspect)), halfW = halfH * aspect, near = camera === 'avatar' ? 0.1 : 1, far = camera === 'avatar' ? 30 : 100;
    return new Float32Array([1 / halfW, 0, 0, 0, 0, 1 / halfH, 0, 0, 0, 0, -2 / (far - near), 0, 0, 0, -(far + near) / (far - near), 1]);
  }
  function vertexData(scene) {
    const out = new Float32Array(scene.cubes.length * 36 * FLOATS_PER_VERTEX);
    const faces = [
      [[1, 0, 0], [[1,-1,-1],[1,1,-1],[1,1,1],[1,-1,1]]], [[-1, 0, 0], [[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,-1,-1]]],
      [[0, 1, 0], [[-1,1,-1],[-1,1,1],[1,1,1],[1,1,-1]]], [[0,-1,0], [[-1,-1,1],[-1,-1,-1],[1,-1,-1],[1,-1,1]]],
      [[0, 0, 1], [[1,-1,1],[1,1,1],[-1,1,1],[-1,-1,1]]], [[0,0,-1], [[-1,-1,-1],[-1,1,-1],[1,1,-1],[1,-1,-1]]]
    ];
    let offset = 0;
    for (const cube of scene.cubes) {
      const color = scene.colors[cube.color] || scene.colors.line, c = Math.cos(cube.yaw || 0), s = Math.sin(cube.yaw || 0);
      for (const [normal, corners] of faces) {
        const nx = normal[0] * c + normal[2] * s, nz = -normal[0] * s + normal[2] * c;
        const light = 0.62 + Math.max(0, dot([nx, normal[1], nz], normalize([-0.4, 0.85, 0.3]))) * 0.38;
        for (const k of [0, 1, 2, 0, 2, 3]) {
          const v = corners[k], x = v[0] * cube.sx / 2, z = v[2] * cube.sz / 2;
          out[offset++] = cube.x + x * c + z * s; out[offset++] = cube.y + v[1] * cube.sy / 2; out[offset++] = cube.z - x * s + z * c;
          out[offset++] = nx; out[offset++] = normal[1]; out[offset++] = nz;
          out[offset++] = color[0] * light; out[offset++] = color[1] * light; out[offset++] = color[2] * light;
        }
      }
    }
    return out;
  }

  function createRenderer(canvas, options = {}) {
    const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: true, powerPreference: 'low-power', preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL unavailable');
    const vs = 'attribute vec3 aPosition;attribute vec3 aColor;uniform mat4 uView;uniform mat4 uProjection;varying vec3 vColor;void main(){vColor=aColor;gl_Position=uProjection*uView*vec4(aPosition,1.0);}';
    const fs = 'precision mediump float;varying vec3 vColor;void main(){gl_FragColor=vec4(vColor,1.0);}';
    const shaders = [];
    function shader(type, source) { const sh = gl.createShader(type); gl.shaderSource(sh, source); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { const error = gl.getShaderInfoLog(sh); gl.deleteShader(sh); throw new Error('shader: ' + error); } shaders.push(sh); return sh; }
    let program, buffer;
    try {
      program = gl.createProgram(); gl.attachShader(program, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('shader link failed');
      buffer = gl.createBuffer(); gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const pos = gl.getAttribLocation(program, 'aPosition'), col = gl.getAttribLocation(program, 'aColor');
      gl.enableVertexAttribArray(pos); gl.enableVertexAttribArray(col);
      gl.enable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.clearColor(0.043, 0.05, 0.11, 1);
    } catch (error) { shaders.forEach(s => gl.deleteShader(s)); if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); throw error; }
    const viewLoc = gl.getUniformLocation(program, 'uView'), projectionLoc = gl.getUniformLocation(program, 'uProjection');
    const posLoc = gl.getAttribLocation(program, 'aPosition'), colLoc = gl.getAttribLocation(program, 'aColor');
    let disposed = false, lost = false, count = 0, draws = 0, lastScene = null;
    const onLost = e => { e.preventDefault(); lost = true; if (options.onContextLost) options.onContextLost(); };
    const onRestored = () => { lost = false; if (options.onContextRestored) options.onContextRestored(); };
    canvas.addEventListener('webglcontextlost', onLost); canvas.addEventListener('webglcontextrestored', onRestored);
    function draw(scene, camera = 'broadcast') {
      if (disposed || lost) return false;
      lastScene = scene;
      const ratio = Math.min(root.devicePixelRatio || 1, scene.quality === 'balanced' ? 1.5 : 1);
      const width = Math.max(1, Math.round((canvas.clientWidth || 640) * ratio)), height = Math.max(1, Math.round(width / (scene.aspect || 16 / 9)));
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
      const data = vertexData(scene); count = data.length / FLOATS_PER_VERTEX;
      gl.viewport(0, 0, width, height); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 36, 0); gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, 36, 24);
      gl.uniformMatrix4fv(viewLoc, false, viewMatrix(camera)); gl.uniformMatrix4fv(projectionLoc, false, orthoMatrix(width / height, camera)); gl.drawArrays(gl.TRIANGLES, 0, count); draws++;
      return true;
    }
    function dispose() { if (disposed) return; disposed = true; canvas.removeEventListener('webglcontextlost', onLost); canvas.removeEventListener('webglcontextrestored', onRestored); gl.deleteBuffer(buffer); gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s)); }
    return { draw, dispose, stats: () => ({ version: VERSION, cubes: lastScene ? lastScene.cubes.length : 0, vertices: count, drawCalls: draws ? 1 : 0, quality: lastScene && lastScene.quality, lost, disposed }), isLost: () => lost };
  }
  CAA.Voxel = { VERSION, MAX_CUBES, keyPlays, scoreAt, courtGeometry, frameAt, geometry, arenaDressing, rimAndNet, lookAt, perspective, avatarGeometry, palette, vertexData, viewMatrix, orthoMatrix, createRenderer };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Voxel;
})(typeof globalThis !== 'undefined' ? globalThis : this);
