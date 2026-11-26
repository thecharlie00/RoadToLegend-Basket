(function (root) {
  'use strict';
  // Jugada Maestra (paridad con jugada-maestra.js del fútbol): jugadas dibujadas en media pista.
  // Motor puro, sin red y reproducible: mismo estado + mismos trazos = mismo desenlace.
  //  · Campaña: 30 jugadas en 5 capítulos. Sin azar: el trazo decide (línea de pase, penetración, tiro).
  //  · Partido: la misma mecánica en un momento clave; la conversión se ancla en la probabilidad
  //    que el motor de partido daba a ese tiro, así que jugar bien mejora y forzar empeora.
  // Coordenadas: x = 0 (medio campo) … 94 (línea de fondo), y = 0 … 100 (ancho). 1 unidad ≈ 0,15 m.
  const CAA = root.CAA = root.CAA || {};
  // Aro a 1,575 m del fondo (10,5 unidades), triple a 6,75 m (45) y 6,6 m en las esquinas (44).
  const HOOP = [83.5, 50], ARC = 45, CORNER = 44, LEN = 94, WIDTH = 100, PERFECT = 3;
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
  // Tres estrellas por jugada, al estilo de los juegos de jugadas dibujadas: anotar, hacerlo en las
  // acciones justas (par) y el objetivo extra del capítulo.
  const BONUS = ['allTouch', 'perfect', 'dunk', 'noDrive', 'dunk'];
  const DATA = /*levels*/[[[37.5,51.5],[[85.6,4.4],[62.1,10.6],[85.6,95.5],[63,88.4]],[[42.7,52],[86.3,8.8],[66.3,19.1],[81.2,85.8],[66.3,80.1]],4],[[39.1,41.5],[[62,82],[77.5,61.3],[84.5,96.8],[85.1,5.7]],[[44.4,41.6],[66.3,74.9],[78.7,53],[88.3,87.7],[84.1,9.8]],4],[[34.4,41.2],[[59.4,13.7],[75.3,34.6],[84.6,96.7],[63.9,59.9]],[[39.9,42.6],[60.7,16.3],[76.2,45.3],[85.4,93],[67.8,58.2]],4],[[34.3,33],[[72.7,39.2],[63.3,87.2],[57.1,12.5],[73.5,61]],[[37.6,35.7],[80.8,46.7],[71.6,81.1],[58.4,15.1],[81.1,55.4]],4],[[34.7,64.2],[[58,16.9],[85.6,4.3],[57.3,88.5],[73.2,34.2]],[[38.1,61.8],[62.6,20],[85,9.4],[58.8,82.1],[74.6,40.3]],4],[[35.3,34.4],[[61.7,17.5],[86.2,96.8],[76.6,36.8],[63,38.4]],[[38.6,36.9],[62.5,20.9],[87,90.1],[76.9,39.6],[65.6,39.9]],5],[[43.8,69.4],[[86.5,4.8],[63.3,37.9],[74.7,67.7],[85.6,96.5]],[[46.7,66.6],[87,12.4],[78.2,47.3],[77.4,65.5],[83.2,89.9]],4],[[41.7,67.3],[[59.2,91.4],[87.9,95.6],[75.7,38.4],[85.9,5.4]],[[46.9,66],[60.3,83.3],[86,88.3],[78.6,44.4],[86.1,8.5]],4],[[40.9,46.8],[[57.2,88.3],[77.6,37.9],[73.9,61.8],[87.4,96.8]],[[45.1,46.8],[60.3,85.5],[79.9,39.9],[78.6,46.9],[85.3,87.4]],4],[[39.2,68.7],[[89.3,3.8],[65.2,46.2],[60.3,85.4],[76.3,39.3]],[[42.2,65.8],[78.1,51.8],[75.3,46.4],[61.2,80],[80,41.7]],4],[[37.2,32.6],[[73.3,60.8],[63.5,10.6],[62.9,86.7],[64.3,63.7]],[[40.1,35.6],[78.2,57.2],[64.8,18.7],[76.5,48],[67.1,61]],4],[[35.9,66.9],[[58.3,85.5],[60.1,9.9],[72.5,33.6],[88,95.4]],[[38.9,64.3],[63.3,81.4],[77.8,52.5],[75.9,37.3],[85.4,88.5]],5],[[34.7,41],[[72.9,65.3],[89.9,4.5],[85.7,94.7],[59.3,8.8]],[[40.1,41.5],[74.9,54.2],[90.6,13],[78.2,46.5],[65.1,16]],4],[[39.6,45.5],[[86.8,4.8],[59.6,90],[63.2,59.2],[76.5,65.6]],[[44.6,45],[85.5,12],[61.1,87.3],[65.3,57.6],[78.5,55]],4],[[35.7,39.6],[[74.3,65.1],[59.3,87.5],[85,94.6],[73.5,37.2]],[[41.2,39.3],[83.3,58.5],[63,76.5],[88,86.2],[77.1,48.9]],4],[[43.8,66.6],[[73.7,65.8],[62.2,11.1],[84.8,5.4],[62.3,47.7]],[[48.8,65.3],[78.5,60.3],[63.4,13.9],[83.8,10.1],[79.3,48.6]],4],[[37,47.8],[[89.6,4.4],[74.6,36.7],[64.9,42.1],[63.5,17.5]],[[41.8,50],[89.3,7.3],[77.1,39.2],[77.1,50.4],[64.1,21.2]],4],[[35.3,64.4],[[64.2,57],[62.4,8.4],[73.9,37.5],[87.1,3.3]],[[40.3,62.3],[79.2,48.4],[64.2,17.1],[78.3,46.4],[86.3,9.8]],5],[[37.3,36.6],[[87.1,95.4],[84.4,4.7],[61.6,89.1],[60.3,10.8]],[[42,39.9],[88.5,87.4],[85.9,10.5],[66.7,82.4],[64.6,14.6]],4],[[37.4,64.3],[[60.9,83],[64.5,36.6],[87.8,96.6],[73.9,33.8]],[[42.9,64],[64,76.6],[73.1,39.3],[88.5,92.8],[79.7,39.2]],4],[[34.3,30.8],[[61.3,88.6],[74.6,62.7],[86.7,3.2],[75.8,39.4]],[[38.2,35],[64.3,81.6],[76.7,56.4],[85.3,8.3],[80.3,43.6]],4],[[36.9,53.7],[[62.7,14],[86.5,4.2],[73.7,60.2],[65.2,52.1]],[[41.7,54.5],[64.3,17],[88.1,12.7],[76.2,57],[72.2,52.2]],4],[[39.8,41.1],[[73.8,62.2],[62,49.2],[62,83.7],[60,10.3]],[[43.8,43.7],[77,59.3],[65.5,49],[66,80.5],[65.1,17.1]],4],[[38.1,60.8],[[86.4,96.8],[89.1,5.2],[61.4,11.2],[61.5,83.2]],[[42.2,59.3],[85.6,92.9],[85.6,12.8],[67.6,18.4],[62.5,77.2]],5],[[37.1,34.2],[[63.9,90.3],[87.5,5.8],[62,55.5],[58.2,12.9]],[[40.8,36.6],[69.6,85.5],[89.2,11.2],[65.4,55.1],[64.2,18.8]],3],[[35.9,41.6],[[57.8,17.3],[65.7,44.8],[60.9,86.1],[73.1,34.4]],[[40.7,44.2],[63.8,21.8],[75.4,45.2],[65.8,81.8],[73.9,39.1]],3],[[37.2,39.7],[[87.9,94.7],[73.8,32.1],[76.4,67.6],[63.9,85.1]],[[42.8,39],[88.9,87.5],[75.3,43.4],[76.2,58.9],[64.8,74.4]],3],[[42.9,45.7],[[57.5,15.8],[86.6,95.1],[72.4,32.6],[60.2,82.4]],[[47.7,44.2],[59.8,18.5],[86.7,91.6],[73.6,37.7],[67.4,74.9]],3],[[36.2,54.5],[[73.4,65.2],[72.1,34],[59.3,83.7],[62.2,45.7]],[[41.3,54.8],[75.7,62.7],[81.6,39.2],[67.3,76.5],[67,48.7]],3],[[38.5,55.9],[[58.4,86.4],[77.5,32.7],[88,4.3],[73.4,67.9]],[[43.5,54.2],[60.3,75.1],[76.8,41],[89.6,12.8],[75.1,61.6]],3]]/*end*/;
  const LEVELS = DATA.map((d, i) => ({ id: 'jm-' + String(i + 1).padStart(2, '0'), n: i + 1, chapter: Math.floor(i / 6) + 1, chapterKey: CHAPTERS[Math.floor(i / 6)],
    ball: d[0], mates: d[1], rivals: d[2], max: d[3], needThree: Math.floor(i / 6) === 3, bonus: BONUS[Math.floor(i / 6)], seedOffset: (i + 1) * 7919 }));
  function level(id) { return LEVELS.find(l => l.id === id) || null; }
  function fromLayout(l, id) {
    return { id: id || 'free', match: false, seed: (l.seedOffset || 1) >>> 0, ball: l.ball.slice(), handler: 0, mates: l.mates.map((p, i) => ({ p: p.slice(), i: i + 1 })),
      rivals: l.rivals.map(p => p.slice()), turn: 0, max: l.max, needThree: !!l.needThree, bonus: l.bonus || null, done: false, won: false, points: 0, chain: 0, log: [],
      touched: [0], drives: 0, lastK: null };
  }
  function fresh(id) { const l = level(id); return l ? fromLayout(l, id) : null; }

  // ---------- Momento de partido ----------
  // Disposición sellada con semilla: base en lo alto de la zona, aleros, esquina y poste; cada
  // defensor cerca de su par. players = 5 en pista ({id, name, p: {restricted…above3}}); el primero lleva el balón.
  function moment(seed, o = {}) {
    const s = (seed >>> 0) || 7, r = k => noise(s, 500 + k, k * 3 + 1);
    const spots = [[36 + r(1) * 7, 42 + r(2) * 16], [58 + r(3) * 6, 10 + r(4) * 8], [58 + r(5) * 6, 82 + r(6) * 8], [84 + r(7) * 6, r(8) < 0.5 ? 5 : 95], [73 + r(9) * 5, r(10) < 0.5 ? 36 + r(11) * 6 : 58 + r(11) * 6]];
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
      needThree: !!o.needThree, done: false, won: false, points: 0, chain: 0, log: [], touched: [0], drives: 0, lastK: null,
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
  // aim: a cuánto del centro del aro terminó el gesto de tiro (en unidades). Un tiro limpio (≤ 3)
  // perdona algo más de defensa, como apuntar a la escuadra.
  function shoot(s, start, aim) {
    const zone = zoneOf(start), three = isThree(start), c = contestOf(s, start), d = dist(start, HOOP), rim = zone === 'restricted' && rimProtected(s, start);
    const perfect = Number.isFinite(aim) && aim <= PERFECT;
    let how;
    if (c < 3.5 || rim) how = 'block';
    else if (!s.match) {
      if (three) how = d > 55 ? 'short' : c >= 9 || (perfect && c >= 7) ? 'made' : 'rim';
      else if (zone === 'restricted') how = 'made';
      else if (zone === 'paint') how = c >= 6 || (perfect && c >= 4.5) ? 'made' : 'rim';
      else how = c >= 8 || (perfect && c >= 6) ? 'made' : 'rim';
    } else {
      const f = c < 6 ? 0.72 : c < 9 ? 0.97 : 1.15, deep = three && d > 55 ? 0.6 : 1;
      const q = clamp(anchor(s, s.handler, zone) * f * deep + 0.04 * Math.min(2, s.chain) + (perfect ? 0.06 : 0), 0.03, 0.95);
      s.quality = q;
      how = noise(s.seed, s.turn, 911) < q ? 'made' : noise(s.seed, s.turn, 912) < 0.3 ? 'rim' : 'miss';
    }
    const made = how === 'made', points = made ? (three ? 3 : 2) : 0;
    s.done = true; s.points = points; s.won = made && (!s.needThree || three);
    const dunk = made && zone === 'restricted' && s.lastK === 'pass';
    s.shot = { zone, three, contest: Math.round(c * 10) / 10, how, perfect, dunk };
    const msg = !made ? how : s.needThree && !three ? 'two' : dunk ? 'dunk' : three ? 'three' : 'made';
    s.log.push({ k: 'shot', ok: made, how, msg, from: start.slice(), to: HOOP.slice(), token: s.handler, zone, points, perfect, dunk });
    return { ok: true, shot: true, made, points, how, msg, zone, state: s };
  }
  function resolve(s, action) {
    if (!s || s.done) return { ok: false, reason: 'done' };
    const a = action || {}, start = s.ball.slice(), path = Array.isArray(a.path) ? a.path : [];
    let k = a.k;
    const tip = path.length ? clampPt(path[path.length - 1]) : null;
    if (!k) k = tip && dist(tip, HOOP) <= HOOP_PICK ? 'shot' : tip && s.mates.some(m => dist(m.p, tip) <= MATE_PICK) ? 'pass' : 'drive';
    if (k === 'shot') { s.turn++; return shoot(s, start, tip ? dist(tip, HOOP) : (Number.isFinite(a.aim) ? a.aim : null)); }
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
        if (!s.touched.includes(s.handler)) s.touched.push(s.handler);
        s.lastK = 'pass';
        shiftDefense(s, s.ball, 0.35);
        s.log.push({ k: 'pass', ok: true, msg: 'pass', from: start, to: target, path: pts, token: s.handler });
        const run = cut(s);
        if (run) s.log.push(run);
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
    s.ball = end.slice(); s.drives++; s.lastK = 'drive';
    shiftDefense(s, s.ball, 0.5); // la ayuda sale al balón y deja a alguien libre
    s.log.push({ k: 'drive', ok: true, msg: 'drive', from: start, to: end, path: pts, token: s.handler });
    if (s.turn >= s.max) return endPossession(s, { ok: true, completed: true, msg: 'drive' });
    return { ok: true, completed: true, msg: 'drive', state: s };
  }
  // Corte: tras un pase, el compañero más libre ataca el aro si tiene el camino despejado
  // (como los desmarques de los juegos de jugadas dibujadas). Así nacen los pases a la canasta.
  function cut(s) {
    let best = null, bo = -1;
    for (const m of s.mates) {
      const open = contestOf(s, m.p), d = dist(m.p, HOOP);
      if (d < 14 || open <= bo) continue;
      const k = Math.min(0.62, (d - 6) / d), to = clampPt([m.p[0] + (HOOP[0] - m.p[0]) * k, m.p[1] + (HOOP[1] - m.p[1]) * k]);
      if (s.rivals.some(r => segDist(r, m.p, to) < REACH) || dist(to, s.ball) < 6) continue;
      best = { m, to }; bo = open;
    }
    if (!best) return null;
    const from = best.m.p.slice(); best.m.p = best.to;
    return { k: 'cut', ok: true, msg: 'cut', from, to: best.to.slice(), token: best.m.i };
  }
  function bonusMet(s) {
    if (!s.won || !s.bonus) return false;
    if (s.bonus === 'allTouch') return s.touched.length >= 3;
    if (s.bonus === 'perfect') return !!(s.shot && s.shot.perfect);
    if (s.bonus === 'dunk') return !!(s.shot && s.shot.dunk);
    if (s.bonus === 'noDrive') return s.drives === 0;
    return false;
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
    const out = [{ k: 'shot', aim: 0 }];
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
  // accept: condición extra del final (p. ej. el objetivo de la tercera estrella).
  function solveState(start, depthMax, accept) {
    let layer = [{ st: copy(start), seq: [] }];
    const limit = Math.min(start.max, depthMax || start.max);
    for (let d = 1; d <= limit; d++) {
      const next = [];
      for (const node of layer) for (const a of candidates(node.st)) {
        const c = copy(node.st); const r = resolve(c, a);
        if (!r.ok) continue;
        if (c.done) { if (c.won && (!accept || accept(c))) return { par: d, actions: node.seq.concat([a]) }; continue; }
        next.push({ st: c, seq: node.seq.concat([a]) });
      }
      layer = next.slice(0, 600);
    }
    return null;
  }
  function par(id) { if (PAR[id] == null) { const r = solve(id); PAR[id] = r ? r.par : (level(id) || {}).max || 3; } return PAR[id]; }
  function result(s) {
    if (!s) return null;
    const p = s.par != null ? s.par : s.match ? 2 : par(s.id);
    const stars = [!!s.won, !!s.won && s.turn <= p, bonusMet(s)];
    return { done: !!s.done, won: !!s.won, actions: s.turn, par: p, points: s.points, stars, medal: stars.filter(Boolean).length, bonus: s.bonus };
  }
  // ---------- Lo que piden los jugadores de estos juegos ----------
  // Pista: la primera acción de una solución desde el punto en que estás (la misma búsqueda del par).
  function hint(st) {
    if (!st || st.done) return null;
    const accept = st.bonus ? (c => bonusMet(c)) : null;
    const r = (accept && solveState(st, st.max - st.turn, accept)) || solveState(st, st.max - st.turn);
    if (!r) return null;
    const a = r.actions[0];
    return { k: a.k, to: a.to != null ? a.to : null, left: r.actions.length, action: a };
  }
  // Dificultad 1-3: acciones mínimas para ganar (par) y margen que deja el máximo de acciones.
  function difficulty(id) {
    const l = level(id); if (!l) return 1;
    const p = par(id), slack = l.max - p;
    return Math.max(1, Math.min(3, (p >= 3 ? 2 : 1) + (slack <= 1 ? 1 : 0) - (slack >= 3 ? 1 : 0)));
  }
  // Desafío diario: una posesión nueva cada día, sellada con la fecha (sin conexión y igual para todos).
  // Se busca una disposición con solución y con la tercera estrella posible; el par queda dentro.
  const DAILY = {};
  function daily(dateKey) {
    if (DAILY[dateKey]) return copy(DAILY[dateKey]);
    const h = hashSeed('daily:' + dateKey);
    const bonus = BONUS[h % BONUS.length], needThree = h % 5 === 4;
    let out = null;
    for (let k = 0; k < 40 && !out; k++) {
      const seed = hashSeed('daily:' + dateKey + ':' + k);
      const m = moment(seed, { max: 4, needThree });
      const st = fromLayout({ ball: m.ball, mates: m.mates.map(x => x.p), rivals: m.rivals, max: 4, needThree, bonus: needThree && bonus === 'dunk' ? 'allTouch' : bonus, seedOffset: seed }, 'daily-' + dateKey);
      const r = solveState(st);
      if (!r || r.par < 2) continue;
      if (!solveState(st, st.max, c => bonusMet(c))) continue;
      st.par = r.par; st.daily = dateKey; out = st;
    }
    if (!out) { out = fresh(LEVELS[h % LEVELS.length].id); out.id = 'daily-' + dateKey; out.daily = dateKey; out.par = par(LEVELS[h % LEVELS.length].id); }
    DAILY[dateKey] = copy(out);
    return out;
  }
  function levels() { return LEVELS.map(l => ({ id: l.id, n: l.n, chapter: l.chapter, chapterKey: l.chapterKey, max: l.max, needThree: l.needThree, bonus: l.bonus })); }

  CAA.Jugada = { HOOP, ARC, CORNER, LEN, WIDTH, DRIVE_MAX, HOOP_PICK, MATE_PICK, CHAPTERS: CHAPTERS.slice(), levels, level, fresh, fromLayout, solveState, hint, difficulty, daily, moment, resolve, replay, result, par, solve,
    isThree, zoneOf, tokenAt, hashSeed, dist, cleanPath, clipPath, bonusMet, BONUS: BONUS.slice(), PERFECT };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Jugada;
})(typeof globalThis !== 'undefined' ? globalThis : this);
