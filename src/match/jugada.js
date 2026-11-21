(function (root) {
  'use strict';
  // Jugada Maestra (paridad con jugada-maestra.js del fútbol): jugadas dibujadas en media pista.
  // Motor puro, sin red y reproducible: mismo estado + mismos trazos = mismo desenlace.
  //  · Campaña: 30 jugadas en 5 capítulos. Sin azar: el trazo decide (línea de pase, penetración, tiro).
  //  · Partido: la misma mecánica en un momento clave; la conversión se ancla en la probabilidad
  //    que el motor de partido daba a ese tiro, así que jugar bien mejora y forzar empeora.
  // Coordenadas: x = 0 (medio campo) … 94 (línea de fondo), y = 0 … 100 (ancho). 1 unidad ≈ 0,15 m.
  const CAA = root.CAA = root.CAA || {};
  const HOOP = [88.5, 50], ARC = 45, CORNER = 44, LEN = 94, WIDTH = 100;
  const DRIVE_MAX = 24, REACH = 3.2, LANE_OK = 4, RECEIVER_OK = 3, HOOP_PICK = 9, MATE_PICK = 11;

  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const clampPt = p => [clamp(+p[0], 2, LEN - 1), clamp(+p[1], 2, WIDTH - 2)];
  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = dx * dx + dy * dy || 1;
    const t = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d, 0, 1);
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
  }
  function pathDist(p, pts) { let d = 1e9; for (let i = 1; i < pts.length; i++) d = Math.min(d, segDist(p, pts[i - 1], pts[i])); return d; }
  function pathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]); return L; }
  // Trazo limpio: empieza en el balón, sin puntos repetidos y, si se pide, termina en `end`.
  function cleanPath(path, start, end) {
    const out = [start.slice()];
    for (const q of path || []) {
      if (!q || !Number.isFinite(+q[0]) || !Number.isFinite(+q[1])) continue;
      const c = clampPt(q);
      if (dist(c, out[out.length - 1]) > 1.2) out.push(c);
      if (out.length > 64) break;
    }
    if (end) { if (dist(end, out[out.length - 1]) > 0.5) out.push(end.slice()); else out[out.length - 1] = end.slice(); }
    return out;
  }
  function clipPath(pts, max) {
    const out = [pts[0]]; let run = 0;
    for (let i = 1; i < pts.length; i++) {
      const a = out[out.length - 1], b = pts[i], d = dist(a, b);
      if (run + d >= max) { const k = (max - run) / (d || 1); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); return out; }
      run += d; out.push(b);
    }
    return out;
  }
  // Punto del trazo más cercano a p (para saber dónde se corta un pase).
  function nearestOnPath(p, pts) {
    let best = pts[0], bd = 1e9;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], d2 = dx * dx + dy * dy || 1;
      const k = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / d2, 0, 1), q = [a[0] + k * dx, a[1] + k * dy], d = dist(p, q);
      if (d < bd) { bd = d; best = q; }
    }
    return { p: best, d: bd };
  }
  function noise(seed, turn, salt) {
    let s = (seed ^ Math.imul(turn + 1, 0x45d9f3b) ^ Math.imul(salt + 7, 0x27d4eb2d)) >>> 0;
    s ^= s >>> 16; s = Math.imul(s, 0x7feb352d); s ^= s >>> 15; s = Math.imul(s, 0x846ca68b); s ^= s >>> 16;
    return (s >>> 0) / 4294967296;
  }
  function hashSeed(str) { let h = 2166136261; for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; }

  function isThree(p) { return Math.abs(p[1] - 50) > CORNER || dist(p, HOOP) > ARC; }
  // Zona del motor de partido para un punto de tiro.
  function zoneOf(p) {
    const d = dist(p, HOOP);
    if (isThree(p)) return Math.abs(p[1] - 50) > 38 && p[0] > 74 ? 'corner3' : 'above3';
    return d <= 9 ? 'restricted' : d <= 22 ? 'paint' : d <= 33 ? 'midShort' : 'midLong';
  }
  const contestOf = (s, p) => s.rivals.reduce((v, r) => Math.min(v, dist(r, p)), 99);
  // Un defensor entre el tirador y el aro tapa la bandeja.
  const rimProtected = (s, p) => s.rivals.some(r => segDist(r, p, HOOP) < 3 && dist(r, HOOP) < dist(p, HOOP));

  // ---------- Campaña ----------
  // 30 jugadas fijas (generadas una vez con tools/jugada_levels.mjs y comprobadas por el solucionador):
  // balón, 4 compañeros/as, 5 defensores, acciones máximas. Capítulos: espacios, penetración,
  // juego interior, triple obligado y última posesión (menos acciones).
  const CHAPTERS = ['spacing', 'drive', 'inside', 'three', 'clutch'];
  const DATA = /*levels*/[[[41,58.4],[[63.6,84],[88.5,95.2],[88.6,3.4],[79.5,35.4]],[[46.2,58.3],[68.1,77.4],[89.5,91.7],[89.8,7.5],[82.3,44.8]],4],[[46.8,47.1],[[85.8,4],[63,91.2],[63.4,14.7],[66.9,46.4]],[[52.3,47.4],[87.3,14.3],[70.9,85.1],[65.9,16.2],[76,50.8]],4],[[38.4,41.2],[[62.1,13.7],[81.3,33.3],[84.6,96.7],[67.5,59.9]],[[43.9,42.6],[63.5,16.2],[81.3,44],[85.8,93.1],[71.5,58.3]],4],[[38.3,33],[[78.7,39.1],[65.4,87.2],[60.1,12.5],[79.5,61.3]],[[41.6,35.7],[86.4,46.9],[74,81.6],[61.5,15],[86.7,55.2]],4],[[43.7,33.8],[[64,90.9],[79.7,63.8],[86.4,3.2],[64.9,14.6]],[[46.8,36.8],[64.8,81.3],[84.6,60.7],[83.3,12.2],[66.2,21.7]],4],[[45.1,57.1],[[78.2,67],[88.9,5],[69.6,54.3],[61.3,88]],[[48.5,54.9],[79.3,58.3],[90.9,14.9],[80.5,51.2],[64.7,81.8]],5],[[47.8,69.4],[[86.5,4.8],[67,37.9],[80.7,69.6],[85.6,96.5]],[[50.7,66.6],[87.8,12.3],[82.2,47.3],[83.3,67.2],[83.9,89.7]],4],[[45.7,67.3],[[61.9,91.4],[87.9,95.6],[81.7,38],[85.9,5.4]],[[50.9,66.1],[63.3,83.3],[86.8,88.1],[82.6,44.4],[86.5,8.5]],4],[[44.9,46.8],[[60.2,88.3],[83.6,37.4],[79.9,62.3],[87.4,96.8]],[[49.1,46.8],[63.3,85.6],[85.8,39.6],[82.6,46.9],[86.3,87.3]],4],[[43.2,68.7],[[89.3,3.8],[68.6,46.2],[62.9,85.4],[82.3,39.1]],[[46.3,65.9],[82.1,51.8],[78.7,46.2],[63.9,80],[85.8,41.8]],4],[[47,69.4],[[88.6,4.9],[61.8,89.8],[83.4,60.6],[83.3,38.2]],[[49.9,66.4],[88.4,10.7],[63.3,86.8],[90.5,52.4],[82.2,51.8]],4],[[45,41.6],[[63.2,86.1],[69.9,60.7],[84.1,3.3],[63.3,17]],[[48.6,44.2],[83,55.2],[74.4,55.8],[83.9,11.1],[65.6,23.2]],5],[[38.7,41],[[78.9,66.6],[89.9,4.5],[85.7,94.7],[61.9,8.8]],[[44.1,41.4],[80,55.4],[91.5,12.9],[82.2,46.5],[68.1,15.8]],4],[[43.6,45.5],[[86.8,4.8],[62.2,90],[67,59.2],[82.5,67]],[[48.6,45],[86.3,12.1],[63.8,87.3],[69.1,57.6],[82.5,55]],4],[[39.7,39.6],[[80.3,66.4],[62,87.5],[85,94.6],[79.5,36.5]],[[45.2,39.3],[88.7,59.1],[66.1,76.7],[88.9,86.6],[81.1,48.9]],4],[[42.5,62.9],[[80.4,39.4],[61.7,82.7],[69.7,56.6],[79.4,67.4]],[[46.5,60.6],[82,43.4],[67.9,76.7],[80.3,54.7],[81.8,57]],4],[[41,47.8],[[89.6,4.4],[80.6,35.9],[68.3,42.1],[65.6,17.5]],[[45.8,50],[89.6,7.3],[82.9,38.6],[81.1,50.4],[66.4,21.1]],4],[[39.3,64.4],[[67.8,57],[64.6,8.4],[79.9,36.9],[87.1,3.3]],[[44.3,62.3],[83.2,48.4],[66.8,17],[83.7,46.1],[87,9.9]],5],[[41.3,36.6],[[87.1,95.4],[84.4,4.7],[64,89.1],[62.8,10.8]],[[46,39.9],[89.4,87.6],[86.6,10.3],[69.4,82.6],[67.3,14.4]],4],[[41,32.2],[[84.9,94],[81.1,68],[70,51.9],[89.5,4.5]],[[45.6,34],[87.4,85.8],[82,62.5],[78.4,54.1],[90.8,11.4]],4],[[43.5,53.1],[[84.6,95.9],[65.2,16.2],[66.8,39.7],[82.5,63.5]],[[47.7,52.3],[87.9,87],[66.9,18.6],[74.6,44.1],[88.1,58.6]],4],[[40.9,53.7],[[64.9,14],[86.5,4.2],[79.7,60.2],[68.6,52.1]],[[45.7,54.5],[66.6,16.9],[89.1,12.4],[82,56.9],[75.6,52.3]],4],[[43.8,41.1],[[79.8,62.7],[66,49.2],[64.3,83.7],[62.5,10.3]],[[47.8,43.7],[82.8,59.6],[69.5,49],[68.5,80.7],[68,16.9]],4],[[42.1,60.8],[[86.4,96.8],[89.1,5.2],[63.8,11.2],[63.9,83.2]],[[46.2,59.3],[86,92.8],[86.5,13.1],[70.3,18.1],[65.2,77.3]],5],[[39.8,35.5],[[86.4,95.6],[87.7,6],[65.3,12.7],[80.4,37.4]],[[44.2,36.2],[85.8,90.5],[90.2,12.2],[71.8,17.3],[81.8,45]],3],[[44.5,51.8],[[61,90],[64.9,8.6],[84.9,5.1],[78.7,35.8]],[[49,51.7],[63,81.8],[69.7,12.7],[87.2,13.3],[87.5,41.3]],3],[[43.2,68.8],[[84.5,5.5],[82,65.4],[60.8,84.4],[81.4,33.1]],[[47.6,65.9],[88.8,13.4],[84,58.3],[67.6,79.6],[87.2,39.6]],3],[[44.6,33.7],[[67.8,59.4],[85.2,94.9],[79.7,38.8],[63.2,83.6]],[[48.8,36.6],[71.2,57.3],[87.8,83.7],[81.6,42.9],[65.7,74.4]],3],[[47.8,31.1],[[64.2,91.9],[65.6,10.9],[67.9,53.1],[83.1,64]],[[52.4,34],[66.8,89.3],[67.3,13.6],[74.1,49.1],[84,54.5]],3],[[41.1,48.1],[[65.1,10.1],[86.4,94.9],[67.5,41.7],[78.6,61.1]],[[45.7,48.2],[68.7,13.3],[89.3,84.3],[72.9,43.3],[83.6,56.1]],3]]/*end*/;
  const LEVELS = DATA.map((d, i) => ({ id: 'jm-' + String(i + 1).padStart(2, '0'), n: i + 1, chapter: Math.floor(i / 6) + 1, chapterKey: CHAPTERS[Math.floor(i / 6)],
    ball: d[0], mates: d[1], rivals: d[2], max: d[3], needThree: Math.floor(i / 6) === 3, seedOffset: (i + 1) * 7919 }));
  function level(id) { return LEVELS.find(l => l.id === id) || null; }
  function fromLayout(l, id) {
    return { id: id || 'free', match: false, seed: (l.seedOffset || 1) >>> 0, ball: l.ball.slice(), handler: 0, mates: l.mates.map((p, i) => ({ p: p.slice(), i: i + 1 })),
      rivals: l.rivals.map(p => p.slice()), turn: 0, max: l.max, needThree: !!l.needThree, done: false, won: false, points: 0, chain: 0, log: [] };
  }
  function fresh(id) { const l = level(id); return l ? fromLayout(l, id) : null; }

  // ---------- Momento de partido ----------
  // Disposición sellada con semilla: base en lo alto de la zona, aleros, esquina y poste; cada
  // defensor cerca de su par. players = 5 en pista ({id, name, p: {restricted…above3}}); el primero lleva el balón.
  function moment(seed, o = {}) {
    const s = (seed >>> 0) || 7, r = k => noise(s, 500 + k, k * 3 + 1);
    const spots = [[40 + r(1) * 6, 44 + r(2) * 12], [60 + r(3) * 6, 12 + r(4) * 8], [62 + r(5) * 6, 82 + r(6) * 8], [84 + r(7) * 6, r(8) < 0.5 ? 5 : 95], [80 + r(9) * 4, 36 + r(10) * 28]];
    const players = (o.players || []).slice(0, 5);
    const rivals = spots.map((p, i) => {
      const gap = i === 0 ? 4 + r(20) * 3 : 3.5 + r(21 + i) * 7, ang = r(30 + i) * Math.PI * 2;
      const toHoop = [HOOP[0] - p[0], HOOP[1] - p[1]], L = Math.hypot(toHoop[0], toHoop[1]) || 1;
      // El defensor se coloca entre su par y el aro, con algo de desajuste.
      return clampPt([p[0] + toHoop[0] / L * gap + Math.cos(ang) * 1.5, p[1] + toHoop[1] / L * gap + Math.sin(ang) * 1.5]);
    });
    return {
      id: o.id || 'match', match: true, seed: s, ball: clampPt(spots[0]), handler: 0,
      mates: spots.slice(1).map((p, i) => ({ p: clampPt(p), i: i + 1 })), rivals, turn: 0, max: o.max || 3,
      needThree: !!o.needThree, done: false, won: false, points: 0, chain: 0, log: [],
      players: players.map(p => ({ id: p.id, name: p.name, me: !!p.me, p: p.p || {} }))
    };
  }
  // Probabilidad que el motor daba al tirador en esa zona (ancla de la conversión en partido).
  function anchor(s, token, zone) {
    const pl = s.players && s.players[token];
    const v = pl && pl.p && Number.isFinite(pl.p[zone]) ? pl.p[zone] : { restricted: 0.62, paint: 0.48, midShort: 0.42, midLong: 0.4, corner3: 0.36, above3: 0.34 }[zone];
    return clamp(v, 0.05, 0.92);
  }

  // ---------- Acciones ----------
  // action: { k: 'pass'|'drive'|'shot', path: [[x,y]…] } o { k: 'pass', to: tokenIndex }. Devuelve el desenlace.
  function tokenAt(s, i) { return i === s.handler ? s.ball : (s.mates.find(m => m.i === i) || {}).p; }
  function shiftDefense(s, focus, strong) {
    let nearest = -1, nd = 1e9;
    s.rivals.forEach((r, i) => { const d = dist(r, focus); if (d < nd) { nd = d; nearest = i; } });
    s.rivals = s.rivals.map((r, i) => { const k = i === nearest ? strong : 0.1; return clampPt([r[0] + (focus[0] - r[0]) * k, r[1] + (focus[1] - r[1]) * k]); });
  }
  function shoot(s, start) {
    const zone = zoneOf(start), three = isThree(start), c = contestOf(s, start), d = dist(start, HOOP), rim = zone === 'restricted' && rimProtected(s, start);
    let how;
    if (c < 3.5 || rim) how = 'block';
    else if (!s.match) {
      if (three) how = d > 55 ? 'short' : c >= 9 ? 'made' : 'rim';
      else if (zone === 'restricted') how = 'made';
      else if (zone === 'paint') how = c >= 6 ? 'made' : 'rim';
      else how = c >= 8 ? 'made' : 'rim';
    } else {
      const f = c < 6 ? 0.72 : c < 9 ? 0.97 : 1.15, deep = three && d > 55 ? 0.6 : 1;
      const q = clamp(anchor(s, s.handler, zone) * f * deep + 0.04 * Math.min(2, s.chain), 0.03, 0.95);
      s.quality = q;
      how = noise(s.seed, s.turn, 911) < q ? 'made' : noise(s.seed, s.turn, 912) < 0.3 ? 'rim' : 'miss';
    }
    const made = how === 'made', points = made ? (three ? 3 : 2) : 0;
    s.done = true; s.points = points; s.won = made && (!s.needThree || three);
    s.shot = { zone, three, contest: Math.round(c * 10) / 10, how };
    const msg = !made ? how : s.needThree && !three ? 'two' : three ? 'three' : 'made';
    s.log.push({ k: 'shot', ok: made, how, msg, from: start.slice(), to: HOOP.slice(), token: s.handler, zone, points });
    return { ok: true, shot: true, made, points, how, msg, zone, state: s };
  }
  function resolve(s, action) {
    if (!s || s.done) return { ok: false, reason: 'done' };
    const a = action || {}, start = s.ball.slice(), path = Array.isArray(a.path) ? a.path : [];
    let k = a.k;
    const tip = path.length ? clampPt(path[path.length - 1]) : null;
    if (!k) k = tip && dist(tip, HOOP) <= HOOP_PICK ? 'shot' : tip && s.mates.some(m => dist(m.p, tip) <= MATE_PICK) ? 'pass' : 'drive';
    if (k === 'shot') { s.turn++; return shoot(s, start); }
    if (k === 'pass') {
      let mate = Number.isInteger(a.to) ? s.mates.find(m => m.i === a.to) : null;
      if (!mate && tip) { let bd = 1e9; for (const m of s.mates) { const d = dist(m.p, tip); if (d < bd) { bd = d; mate = m; } } if (bd > MATE_PICK + 6) mate = null; }
      if (!mate) return { ok: false, reason: 'target', msg: 'target' };
      s.turn++;
      const pts = cleanPath(path.length ? path : [], start, mate.p);
      const lane = s.rivals.reduce((v, r) => Math.min(v, pathDist(r, pts)), 99);
      const close = contestOf(s, mate.p);
      if (lane >= LANE_OK && close >= RECEIVER_OK) {
        const from = s.handler; s.handler = mate.i; mate.i = from; const target = mate.p.slice(); mate.p = start; s.ball = target; s.chain++;
        shiftDefense(s, s.ball, 0.35);
        s.log.push({ k: 'pass', ok: true, msg: 'pass', from: start, to: target, path: pts, token: s.handler });
        if (s.turn >= s.max) return endPossession(s, { ok: true, completed: true, msg: 'pass' });
        return { ok: true, completed: true, msg: 'pass', state: s };
      }
      let hit = null, hd = 1e9;
      for (const r of s.rivals) { const n = nearestOnPath(r, pts); if (n.d < hd) { hd = n.d; hit = n; } }
      s.done = true; s.won = false; s.ball = hit ? hit.p : start; s.turnover = 'steal';
      s.log.push({ k: 'pass', ok: false, msg: 'steal', from: start, to: mate.p.slice(), path: pts, cut: s.ball.slice() });
      return { ok: true, completed: false, msg: 'steal', state: s };
    }
    // Penetración: el trazo se recorta a ~3,5 m; si pasa por encima de un defensor, carga o robo.
    s.turn++;
    let pts = cleanPath(path.length ? path : [a.to || HOOP], start, null);
    if (pts.length < 2) pts.push(clampPt([start[0] + 8, start[1]]));
    pts = clipPath(pts, DRIVE_MAX);
    const end = pts[pts.length - 1];
    const blocker = s.rivals.find(r => pathDist(r, pts.slice(1).length ? pts : [start, end]) < REACH && dist(r, start) > 2.5) ||
      s.rivals.find(r => dist(r, end) < 2.5);
    if (blocker) {
      s.done = true; s.won = false; s.turnover = 'charge'; s.ball = nearestOnPath(blocker, pts).p;
      s.log.push({ k: 'drive', ok: false, msg: 'charge', from: start, to: end, path: pts });
      return { ok: true, completed: false, msg: 'charge', state: s };
    }
    s.ball = end.slice();
    shiftDefense(s, s.ball, 0.5); // la ayuda sale al balón y deja a alguien libre
    s.log.push({ k: 'drive', ok: true, msg: 'drive', from: start, to: end, path: pts, token: s.handler });
    if (s.turn >= s.max) return endPossession(s, { ok: true, completed: true, msg: 'drive' });
    return { ok: true, completed: true, msg: 'drive', state: s };
  }
  function endPossession(s, res) {
    s.done = true; s.won = false; s.turnover = 'clock';
    s.log.push({ k: 'clock', ok: false, msg: 'clock' });
    return Object.assign(res, { msg: 'clock', state: s });
  }
  // Repite una lista de acciones sobre un estado nuevo (el trabajador lo usa para validar lo que envía la interfaz).
  function replay(s, actions) {
    for (const a of (actions || []).slice(0, 8)) { if (s.done) break; resolve(s, a); }
    return s;
  }

  // ---------- Par y medallas ----------
  const PAR = {};
  function bend(a, b, off) {
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, c = [mx - dy / L * off, my + dx / L * off], pts = [];
    for (let i = 1; i <= 8; i++) { const t = i / 8; pts.push([(1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]]); }
    return pts;
  }
  function candidates(s) {
    const out = [{ k: 'shot' }];
    for (const m of s.mates) for (const o of [0, -8, 8, -15, 15]) out.push({ k: 'pass', to: m.i, path: o ? bend(s.ball, m.p, o) : [m.p] });
    for (const ang of [-1.2, -0.7, -0.3, 0, 0.3, 0.7, 1.2]) {
      const dir = Math.atan2(HOOP[1] - s.ball[1], HOOP[0] - s.ball[0]) + ang;
      for (const len of [12, 22]) out.push({ k: 'drive', path: [clampPt([s.ball[0] + Math.cos(dir) * len, s.ball[1] + Math.sin(dir) * len])] });
    }
    return out;
  }
  const copy = o => JSON.parse(JSON.stringify(o));
  // Acciones mínimas con las que se gana la jugada (búsqueda pequeña y memorizada); null si no hay solución.
  function solve(id, depthMax) { const l = level(id); return l ? solveState(fresh(id), depthMax) : null; }
  function solveState(start, depthMax) {
    let layer = [{ st: copy(start), seq: [] }];
    const limit = Math.min(start.max, depthMax || start.max);
    for (let d = 1; d <= limit; d++) {
      const next = [];
      for (const node of layer) for (const a of candidates(node.st)) {
        const c = copy(node.st); const r = resolve(c, a);
        if (!r.ok) continue;
        if (c.done) { if (c.won) return { par: d, actions: node.seq.concat([a]) }; continue; }
        next.push({ st: c, seq: node.seq.concat([a]) });
      }
      layer = next.slice(0, 600);
    }
    return null;
  }
  function par(id) { if (PAR[id] == null) { const r = solve(id); PAR[id] = r ? r.par : (level(id) || {}).max || 3; } return PAR[id]; }
  function result(s) {
    if (!s) return null;
    const p = s.match ? 2 : par(s.id);
    return { done: !!s.done, won: !!s.won, actions: s.turn, par: p, points: s.points, medal: s.won ? (s.turn <= p ? 3 : s.turn <= p + 1 ? 2 : 1) : 0 };
  }
  function levels() { return LEVELS.map(l => ({ id: l.id, n: l.n, chapter: l.chapter, chapterKey: l.chapterKey, key: l.key, max: l.max, needThree: l.needThree })); }

  CAA.Jugada = { HOOP, ARC, CORNER, LEN, WIDTH, DRIVE_MAX, HOOP_PICK, MATE_PICK, CHAPTERS: CHAPTERS.slice(), levels, level, fresh, fromLayout, solveState, moment, resolve, replay, result, par, solve,
    isThree, zoneOf, tokenAt, hashSeed, dist, cleanPath, clipPath };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Jugada;
})(typeof globalThis !== 'undefined' ? globalThis : this);
