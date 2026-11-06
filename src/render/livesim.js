(function (root) {
  'use strict';
  // Simulación visual continua del directo (paridad con pitch3d.js del fútbol): los diez jugadores se mueven sin parar,
  // el base sube el balón botando, hay pases, defensa individual, tiros con parábola, rebotes, contraataques, tiros
  // libres con la línea formada, salto inicial y árbitros que siguen la jugada. El motor (match/engine.js) sigue siendo la
  // autoridad del resultado: esta capa solo escenifica cada evento a medida que la reproducción lo emite.
  const CAA = root.CAA = root.CAA || {};
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, k) => a + (b - a) * k;
  const wrap = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
  function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // Rejilla de ataque (distancia a la línea de fondo, z) y dos rotaciones de un ataque en movimiento.
  const SETS = [
    [[7.4, 0], [5.4, -4.7], [5.4, 4.7], [1.4, -2.1], [4.6, 1.7]],
    [[6.8, 1.8], [1.0, -6.4], [6.6, -3.6], [4.8, -1.5], [1.6, 2.2]],
    [[7.2, -1.2], [5.8, 4.4], [1.0, 6.4], [1.8, -2.2], [4.4, 1.6]]
  ];
  const MAXDUR = { jump: 2.6, shot: 4.4, rebound: 1.6, turnover: 2.2, foul: 1.0, ft: 2.2, flow: 0.3, final: 1e9 };
  const FILLER = { foul: 1, rebound: 1, ft: 1, turnover: 1 };
  const ZONE = { restricted: [0.9, 0.5], paint: [2.6, -1.4], midShort: [4.3, 2.4], midLong: [5.6, -3.4], corner3: [0.9, 6.55], above3: [7.4, 0.8] };

  function create(match, opts = {}) {
    const prof = CAA.Rules ? CAA.Rules.getProfile(match.ruleSetId || 'FIBA-2026') : { court: { length: 28, width: 15 } };
    const L = prof.court.length, W = prof.court.width;
    const sim = { id: match.matchId, L, W, t: 0, idx: -1, fed: -1, queue: [], fx: [], poss: 0, script: { type: 'jump', t: 0 }, actors: [], refs: [], ball: { x: 0, y: 1.2, z: 0, holder: -1, flight: null, vy: 0, spin: 0 }, net: [0, 0], cam: { x: 0, fov: 34, shake: 0 }, women: !!opts.women };
    for (let team = 0; team < 2; team++) for (let slot = 0; slot < 5; slot++) {
      const side = team ? -1 : 1;
      sim.actors.push({ team, slot, id: null, name: '', number: slot + 1, x: -side * (2 + slot * 0.9), z: (slot - 2) * 2.4, y: 0, vx: 0, vz: 0, yaw: side > 0 ? Math.PI / 2 : -Math.PI / 2, stride: slot, speed: 0, jump: 0, jumpT: -1, arms: 0, stance: 0, tx: 0, tz: 0, face: null, run: 1 });
    }
    for (let i = 0; i < 3; i++) sim.refs.push({ ref: true, x: (i - 1) * 6, z: i === 1 ? -W / 2 - 0.4 : W / 2 + 0.4, y: 0, vx: 0, vz: 0, yaw: 0, stride: i, speed: 0, jump: 0, arms: 0, stance: 0, tx: 0, tz: 0, run: 1 });
    roster(sim, match, 0);
    return sim;
  }
  const side = team => team ? -1 : 1;
  const hoopX = (sim, team) => side(team) * (sim.L / 2 - 1.575);
  // Coordenadas de ataque → mundo: u = distancia desde la línea de fondo del aro atacado.
  function spot(sim, team, u, z) { const s = side(team); return [s * (sim.L / 2 - u), clamp(z, -sim.W / 2 + 0.4, sim.W / 2 - 0.4)]; }
  function roster(sim, match, idx) {
    const snap = match.lineups && match.lineups[Math.min(idx, match.lineups.length - 1)];
    for (let team = 0; team < 2; team++) {
      const players = (match.teams[team] && match.teams[team].players) || [];
      let ids = snap && snap.teams && snap.teams[team] ? snap.teams[team].slice(0, 5) : (match.teams[team].onCourt || players.slice(0, 5).map(p => p.id));
      const ev = match.events[idx];
      if (ev && ev.team === team && ev.player && !ids.includes(ev.player)) ids = ids.slice(0, 4).concat(ev.player);
      for (let slot = 0; slot < 5; slot++) {
        const a = sim.actors[team * 5 + slot], p = players.find(q => q.id === ids[slot]) || players[slot] || {};
        a.id = p.id || null; a.name = p.name || ''; a.number = Math.max(1, players.indexOf(p) + 1); a.pos = p.pos || ['PG', 'SG', 'SF', 'PF', 'C'][slot];
        a.big = /C|PF/.test(a.pos);
      }
    }
  }
  const actorOf = (sim, id) => sim.actors.findIndex(a => a.id && a.id === id);
  function pickReceiver(sim, team, not) { const k = hash(sim.idx + ':' + Math.floor(sim.t * 2)) % 4; const list = [0, 1, 2, 3, 4].filter(s => team * 5 + s !== not); return team * 5 + list[k % list.length]; }

  // Vuelo del balón: parábola entre dos puntos con altura extra; al terminar ejecuta la continuación.
  function fly(sim, from, to, dur, arc, then) { sim.ball.holder = -1; sim.ball.flight = { from, to, dur, arc, u: 0, then }; }
  function handOf(a) { const c = Math.cos(a.yaw), s = Math.sin(a.yaw); return [a.x + s * 0.32 + c * 0.38, a.z + c * 0.32 - s * 0.38]; }
  function passTo(sim, to) {
    const from = sim.actors[sim.ball.holder] || null, b = sim.ball, r = sim.actors[to];
    const d = Math.hypot(r.x - b.x, r.z - b.z);
    fly(sim, [b.x, from ? 1.25 : b.y, b.z], [r.x, 1.25, r.z], clamp(d / 13, 0.28, 0.75), clamp(d * 0.06, 0.1, 0.9), () => { sim.ball.holder = to; });
  }

  // Un evento nuevo arranca un guion; las posiciones de partida son las actuales, así la transición es continua.
  function onEvent(sim, match, e, idx) {
    roster(sim, match, idx);
    const s = { type: 'flow', t: 0, e };
    if (e.type === 'start' || (e.type === 'period' && !e.end)) { s.type = 'jump'; }
    else if (e.type === 'shot') { s.type = 'shot'; s.off = e.team; s.shooter = actorOf(sim, e.player); s.made = !!e.made; s.zone = e.zone; s.assist = actorOf(sim, e.assist); }
    else if (e.type === 'block') { s.type = 'shot'; s.off = 1 - e.team; s.shooter = actorOf(sim, e.shooter); s.blocker = actorOf(sim, e.player); s.made = false; s.zone = e.zone || 'paint'; s.blocked = true; }
    else if (e.type === 'rebound') { s.type = 'rebound'; s.off = e.team; s.who = actorOf(sim, e.player); }
    else if (e.type === 'turnover') { s.type = 'turnover'; s.off = e.team; s.who = actorOf(sim, e.player); s.thief = e.steal ? actorOf(sim, e.defender) : -1; }
    else if (e.type === 'foul') { s.type = 'foul'; s.who = actorOf(sim, e.player); s.off = 1 - e.team; }
    else if (e.type === 'ft') { s.type = 'ft'; s.off = e.team; s.shooter = actorOf(sim, e.player); s.made = !!e.made; }
    else if (e.type === 'final') s.type = 'final';
    if (s.shooter < 0) s.shooter = (s.off || 0) * 5;
    if (s.off != null) sim.poss = s.off;
    sim.script = s;
  }

  // ---------- objetivos por guion ----------
  function flowTargets(sim, off) {
    const set = SETS[Math.floor(sim.t / 2.3) % SETS.length], def = 1 - off;
    for (let k = 0; k < 5; k++) {
      const a = sim.actors[off * 5 + k], [u, z] = set[k];
      const [x, zz] = spot(sim, off, u + Math.sin(sim.t * 0.9 + k) * 0.35, z + Math.cos(sim.t * 0.7 + k * 2) * 0.4);
      a.tx = x; a.tz = zz; a.stance = 0; a.face = null;
    }
    manDefense(sim, def, off);
  }
  function manDefense(sim, def, off) {
    const hx = hoopX(sim, off);
    for (let k = 0; k < 5; k++) {
      const d = sim.actors[def * 5 + k], m = sim.actors[off * 5 + k];
      const dx = hx - m.x, dz = 0 - m.z, l = Math.hypot(dx, dz) || 1, gap = sim.ball.holder === off * 5 + k ? 1.1 : 1.8;
      d.tx = m.x + dx / l * gap; d.tz = m.z + dz / l * gap; d.stance = 1; d.face = [m.x, m.z];
    }
  }
  function ensureBall(sim, team) {
    const b = sim.ball;
    if (b.flight) return;
    if (b.holder < 0 || sim.actors[b.holder].team !== team) {
      const pg = sim.actors[team * 5];
      if (Math.hypot(pg.x - b.x, pg.z - b.z) < 1.2) b.holder = team * 5; else { pg.tx = b.x; pg.tz = b.z; }
    }
  }
  function step(sim, match, idx, dt) {
    dt = Math.min(dt, 0.05); sim.t += dt;
    // Cola con retardo de televisión: cada jugada dura lo que dura en una pista real; si se acumulan (×4, «saltar»),
    // se descartan primero las de relleno y nunca se va más de unas pocas jugadas por detrás del marcador.
    if (idx > sim.fed) { for (let i = sim.fed + 1; i <= idx; i++) sim.queue.push(i); sim.fed = idx; }
    else if (idx < sim.fed) { sim.queue = [idx]; sim.fed = idx; }
    const cur = sim.script;
    if (sim.queue.length && (cur.done || cur.t > (MAXDUR[cur.type] || 3) || cur.type === 'flow' && cur.t > 0.3)) {
      while (sim.queue.length > 4) { const k = sim.queue.findIndex(i => FILLER[match.events[i] && match.events[i].type]); sim.queue.splice(k >= 0 ? k : 0, 1); }
      const next = sim.queue.shift(); sim.idx = next; const e = match.events[next];
      if (e) onEvent(sim, match, e, next);
    }
    const s = sim.script; s.t += dt;
    const b = sim.ball;
    if (s.type === 'jump') {
      // Salto inicial: los dos pívots en el círculo central, el resto alrededor; el árbitro lanza el balón.
      for (let team = 0; team < 2; team++) for (let k = 0; k < 5; k++) {
        const a = sim.actors[team * 5 + k], sd = side(team);
        if (k === 4) { a.tx = -sd * 0.45; a.tz = 0; } else { a.tx = -sd * (2.2 + (k % 2) * 1.6); a.tz = (k < 2 ? -1 : 1) * (2.2 + (k % 2) * 1.3); }
        a.face = [0, 0]; a.stance = 0;
      }
      if (s.t < 0.9) { b.holder = -1; b.flight = null; b.x = 0; b.z = 0; b.y = 1.5 + s.t * 1.2; }
      else if (!s.tossed) { s.tossed = true; fly(sim, [0, 2.6, 0], [0, 3.4, 0], 0.4, 0.3, () => { const w = sim.actors[(sim.poss || 0) * 5 + 4]; w.jumpT = 0; passTo(sim, (sim.poss || 0) * 5); }); }
      if (s.t > 2.4) { sim.script = { type: 'flow', t: 0 }; }
    } else if (s.type === 'flow') {
      s.done = true;
      const off = sim.poss; flowTargets(sim, off); ensureBall(sim, off);
      if (b.holder >= 0 && !b.flight && sim.actors[b.holder].team === off) {
        const a = sim.actors[b.holder];
        if (b.holder === off * 5) { const [x, z] = spot(sim, off, 7.4, Math.sin(sim.t * 0.8) * 1.5); a.tx = x; a.tz = z; }
        s.pass = (s.pass || 0) + dt;
        const inHalf = side(off) * a.x > 0;
        if (inHalf && s.pass > 1.5) { s.pass = 0; passTo(sim, pickReceiver(sim, off, b.holder)); }
      }
    } else if (s.type === 'shot') {
      const off = s.off, sh = sim.actors[s.shooter], z = ZONE[s.zone] || ZONE.above3;
      flowTargets(sim, off);
      const [x, zz] = spot(sim, off, z[0], z[1] * (sh.slot % 2 ? -1 : 1));
      sh.tx = x; sh.tz = zz; sh.face = [hoopX(sim, off), 0];
      // El defensor del tirador sale a puntear (o el que tapona).
      const dfi = s.blocker >= 0 && s.blocker != null ? s.blocker : (1 - off) * 5 + sh.slot, df = sim.actors[dfi];
      df.tx = lerp(sh.x, hoopX(sim, off), 0.12); df.tz = sh.z + 0.3; df.face = [sh.x, sh.z];
      if (!s.gotBall && !b.flight) {
        if (b.holder === s.shooter) s.gotBall = true;
        else if (b.holder >= 0 && sim.actors[b.holder].team === off) { const from = s.assist >= 0 && s.assist != null && sim.actors[s.assist].team === off ? s.assist : b.holder; b.holder = from; passTo(sim, s.shooter); s.gotBall = true; }
        else { passTo(sim, s.shooter); s.gotBall = true; }
      }
      const near = Math.hypot(sh.x - x, sh.z - zz) < 0.7;
      if (s.gotBall && b.holder === s.shooter && !b.flight && (near || s.t > 2.7) && !s.released) {
        s.released = true; s.relT = s.t; sh.jumpT = 0; sh.arms = 1; df.jumpT = 0.05; df.arms = 1;
        const hx = hoopX(sim, off), dist = Math.hypot(hx - sh.x, sh.z);
        if (s.blocked) { sim.fx.push({ k: 'block', team: 1 - off, player: df.name }); sim.cam.shake = 0.25; } if (s.blocked) fly(sim, [sh.x, 2.4, sh.z], [sh.x + side(off) * 0.6, 3.0, sh.z + 0.4], 0.22, 0.2, () => { fly(sim, [b.x, b.y, b.z], [sh.x - side(off) * 2.5, 0.12, sh.z + 1.5], 0.7, 0.8, () => { b.loose = true; }); });
        else fly(sim, [sh.x, 2.35, sh.z], [hx, 3.15, 0], clamp(0.75 + dist * 0.06, 0.8, 1.35), clamp(1.4 + dist * 0.17, 1.6, 2.9), () => {
          if (s.made) { sim.net[off] = 1; const pts = s.zone === 'corner3' || s.zone === 'above3' ? 3 : 2; sim.fx.push({ k: 'made', team: off, pts, dunk: s.zone === 'restricted' && sh.big, player: sh.name }); sim.cam.shake = pts === 3 ? 0.35 : 0.22; fly(sim, [hx, 3.0, 0], [hx - side(off) * 0.3, 0.12, 0.2], 0.45, 0, () => { b.loose = true; s.inbound = true; }); }
          else { sim.fx.push({ k: 'rim', team: off }); const k = hash(sim.idx) % 3 - 1; fly(sim, [hx, 3.1, 0], [hx - side(off) * (1.4 + Math.abs(k)), 0.12, k * 1.8], 0.8, 1.3, () => { b.loose = true; }); }
        });
      }
      if (s.released && !b.flight) {
        // Tras el tiro: bajan a por el rebote (fallo) o vuelven a defender (canasta).
        for (const a of sim.actors) {
          if (s.made) continue;
          else if (a.slot >= 3) { a.tx = lerp(a.x, b.x, 0.55); a.tz = lerp(a.z, b.z, 0.55); }
        }
        if (!s.made && s.t > (s.relT || 0) + 1.3) s.done = true;
        if (s.made && s.t > (s.relT || 0) + 1.1 && !s.handed) { s.handed = true; sim.poss = 1 - off; sim.script = { type: 'flow', t: 0, inbound: true }; }
      }
    } else if (s.type === 'rebound') {
      const r = sim.actors[s.who >= 0 ? s.who : s.off * 5 + 4];
      for (const a of sim.actors) { a.face = null; }
      flowTargets(sim, 1 - s.off);
      r.tx = b.flight ? b.flight.to[0] : b.x; r.tz = b.flight ? b.flight.to[2] : b.z;
      if (!s.got && !b.flight && Math.hypot(r.x - b.x, r.z - b.z) < 1.4) { s.got = true; r.jumpT = 0; r.arms = 1; fly(sim, [b.x, b.y, b.z], [r.x, 2.6, r.z], 0.3, 0.3, () => { b.holder = sim.actors.indexOf(r); b.loose = false; }); }
      if (!s.got && s.t > 1.6) { s.got = true; b.flight = null; b.holder = sim.actors.indexOf(r); b.loose = false; }
      if (s.got && s.t > 1.2) { s.done = true; if (s.t > 1.9) sim.script = { type: 'flow', t: 0 }; }
    } else if (s.type === 'turnover') {
      const off = s.off, newOff = 1 - off; flowTargets(sim, off);
      if (s.thief >= 0) {
        const th = sim.actors[s.thief];
        if (!s.stolen) { th.tx = b.x; th.tz = b.z; if (Math.hypot(th.x - b.x, th.z - b.z) < 1 || s.t > 0.9) { s.stolen = true; b.flight = null; b.holder = s.thief; sim.fx.push({ k: 'steal', team: th.team, player: th.name }); } }
        else { const [x, z] = spot(sim, newOff, 1.2, 0); th.tx = x; th.tz = z; th.run = 1.35; for (const a of sim.actors) if (a !== th) { const [ax, az] = spot(sim, newOff, 5 + a.slot, (a.slot - 2) * 2.6); a.tx = ax; a.tz = az; a.stance = 0; a.face = null; } }
      } else if (!s.out) { s.out = true; fly(sim, [b.x, b.y, b.z], [b.x + 1.5, 0.12, sim.W / 2 + 0.8], 0.6, 0.6, () => { b.loose = true; }); }
      if (s.t > 1.8) s.done = true;
      if (s.t > 2.4) { sim.poss = newOff; sim.script = { type: 'flow', t: 0 }; }
    } else if (s.type === 'foul') {
      // Silbato: el juego se para, el infractor levanta la mano y el árbitro señala.
      for (const a of sim.actors) { a.tx = a.x; a.tz = a.z; a.stance = 0; }
      if (!s.blew) { s.blew = true; sim.fx.push({ k: 'whistle' }); }
      const f = sim.actors[s.who]; if (f) f.arms = Math.min(1, s.t * 3) * 0.8;
      sim.refs[1].arms = Math.min(1, s.t * 3); if (s.t > 1) s.done = true;
    } else if (s.type === 'ft') {
      // Tiros libres: lanzador en la línea, cuatro en los cajones y el resto tras la línea de triple.
      const off = s.off, sd = side(off), hx = hoopX(sim, off), sh = sim.actors[s.shooter];
      const lane = [[1.75, -2.6], [1.75, 2.6], [2.85, -2.6], [2.85, 2.6], [3.95, -2.6], [3.95, 2.6]];
      let li = 0;
      for (const a of sim.actors) {
        a.stance = 0; a.face = [hx, 0];
        if (a === sh) { a.tx = hx - sd * 4.6; a.tz = 0; continue; }
        if ((a.team !== off && li < 4) || (a.team === off && li >= 2 && li < 6 && a.big)) { const [u, z] = lane[li % 6]; a.tx = hx - sd * u; a.tz = z; li++; }
        else { const [x, z] = spot(sim, off, 7.6, (a.slot - 2) * 2.2); a.tx = x; a.tz = z; }
      }
      if (!s.ready) { s.ready = true; b.flight = null; b.holder = s.shooter; b.loose = false; }
      const set = Math.hypot(sh.x - (hx - sd * 4.6), sh.z) < 0.5;
      if ((set || s.t > 1.6) && s.t > 0.9 && !s.released) {
        s.released = true; sh.arms = 1; sh.jumpT = 0.25;
        fly(sim, [sh.x, 2.3, sh.z], [hx, 3.15, 0], 0.95, 1.45, () => {
          if (s.made) { sim.net[off] = 1; sim.fx.push({ k: 'ft', team: off }); fly(sim, [hx, 3.0, 0], [hx - sd * 0.3, 0.12, 0.1], 0.45, 0, () => { b.loose = true; }); }
          else fly(sim, [hx, 3.1, 0], [hx - sd * 1.6, 0.12, 1.2], 0.75, 1.2, () => { b.loose = true; });
        });
      }
      if (s.released && !b.flight) s.done = true;
    } else if (s.type === 'final') {
      for (const a of sim.actors) { a.tx = a.x * 0.4; a.tz = a.z * 0.5; a.stance = 0; a.face = null; a.arms = a.team === (match.winner == null ? 0 : match.winner) ? 1 : 0; }
    }
    // Árbitros: siguen el balón por la banda y el fondo.
    const rx = clamp(b.x, -sim.L / 2 + 2, sim.L / 2 - 2);
    sim.refs[0].tx = rx - 4; sim.refs[0].tz = -sim.W / 2 - 0.5; sim.refs[1].tx = rx + side(sim.poss) * 4.5; sim.refs[1].tz = -sim.W / 2 - 0.6; sim.refs[2].tx = rx + side(sim.poss) * 1.5; sim.refs[2].tz = sim.W / 2 + 0.25;
    for (const r of sim.refs) { r.face = [b.x, b.z]; if (s.type !== 'foul') r.arms = Math.max(0, r.arms - dt * 2); }
    move(sim, dt);
    ball(sim, dt);
    sim.net = sim.net.map(n => Math.max(0, n - dt * 1.4));
    // Cámara de televisión: sigue el balón por la banda con suavidad y se cierra un poco en los tiros.
    const shooting = s.type === 'shot' || s.type === 'ft';
    sim.cam.x = lerp(sim.cam.x, clamp(b.x * 0.82, -sim.L / 2 + 6, sim.L / 2 - 6), 1 - Math.exp(-dt * 2.2));
    sim.cam.fov = lerp(sim.cam.fov, shooting ? 29 : 34, 1 - Math.exp(-dt * 1.5));
    sim.cam.shake = Math.max(0, (sim.cam.shake || 0) - dt * 0.9);
    return sim;
  }
  function move(sim, dt) {
    const list = sim.actors.concat(sim.refs);
    for (const a of list) {
      const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
      const top = (a.ref ? 5 : 7.6) * (a.run || 1) * (a.stance ? 0.72 : 1);
      const want = d < 0.08 ? 0 : Math.min(top, d * 3.2);
      const vx = d > 0 ? dx / d * want : 0, vz = d > 0 ? dz / d * want : 0;
      const k = 1 - Math.exp(-dt * 7);
      a.vx = lerp(a.vx, vx, k); a.vz = lerp(a.vz, vz, k);
      a.x += a.vx * dt; a.z += a.vz * dt;
      a.speed = Math.hypot(a.vx, a.vz);
      a.stride += dt * (2.2 + a.speed * 1.55);
      const yawTo = a.face && (a.speed < 2.5 || a.stance) ? Math.atan2(a.face[0] - a.x, a.face[1] - a.z) : a.speed > 0.3 ? Math.atan2(a.vx, a.vz) : a.yaw;
      a.yaw += wrap(yawTo - a.yaw) * (1 - Math.exp(-dt * 9));
      if (a.jumpT >= 0) { a.jumpT += dt; a.jump = Math.max(0, Math.sin(Math.min(1, a.jumpT / 0.62) * Math.PI)) * 0.55; if (a.jumpT > 0.62) { a.jumpT = -1; a.jump = 0; } }
      if (a.jumpT < 0 && !a.ref) a.arms = Math.max(0, a.arms - dt * 1.6);
      a.run = lerp(a.run || 1, 1, dt);
    }
    // Separación: nadie se atraviesa.
    for (let i = 0; i < sim.actors.length; i++) for (let j = i + 1; j < sim.actors.length; j++) {
      const a = sim.actors[i], b = sim.actors[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
      if (d > 0 && d < 0.62) { const p = (0.62 - d) / 2; a.x -= dx / d * p; a.z -= dz / d * p; b.x += dx / d * p; b.z += dz / d * p; }
    }
  }
  function ball(sim, dt) {
    const b = sim.ball;
    b.spin += dt * 9;
    if (b.flight) {
      const f = b.flight; f.u = Math.min(1, f.u + dt / f.dur);
      b.x = lerp(f.from[0], f.to[0], f.u); b.z = lerp(f.from[2], f.to[2], f.u); b.y = lerp(f.from[1], f.to[1], f.u) + Math.sin(f.u * Math.PI) * f.arc;
      if (f.u >= 1) { b.flight = null; if (f.then) f.then(); }
      return;
    }
    if (b.holder >= 0) {
      const a = sim.actors[b.holder], [hx, hz] = handOf(a);
      b.loose = false;
      if (a.arms > 0.5) { b.x = a.x; b.z = a.z; b.y = 2.2 + a.jump; }
      else { b.x = hx; b.z = hz; b.y = 0.18 + Math.abs(Math.sin(sim.t * (5.5 + a.speed * 0.5))) * 0.82; }
      return;
    }
    // Balón suelto: rebotes que se apagan.
    b.vy = (b.vy || 0) - 9.8 * dt; b.y += b.vy * dt;
    if (b.y < 0.13) { b.y = 0.13; b.vy = Math.abs(b.vy) * 0.55; if (b.vy < 0.6) b.vy = 0; }
  }
  // Fotograma listo para Voxel.geometry.
  function frame(sim) {
    const players = sim.actors.map(a => ({ id: a.id, name: a.name, team: a.team, number: a.number, x: a.x, y: a.jump, z: a.z, yaw: a.yaw, stride: a.stride, speed: a.speed, stance: a.stance, armsUp: a.arms, dribble: sim.ball.holder === sim.actors.indexOf(a) && a.arms < 0.5, big: a.big }));
    const refs = sim.refs.map(r => ({ ref: true, x: r.x, y: 0, z: r.z, yaw: r.yaw, stride: r.stride, speed: r.speed, stance: 0, armsUp: r.arms, number: 0 }));
    return { players, refs, ball: { x: sim.ball.x, y: sim.ball.y, z: sim.ball.z }, spin: sim.ball.spin, net: sim.net.slice(), cam: Object.assign({}, sim.cam), script: sim.script.type, poss: sim.poss };
  }
  function camera(sim, aspect) {
    const c = sim.cam, W = sim.W, far = aspect < 1.2 ? 1.18 : 1;
    const sh = c.shake || 0, jx = sh ? Math.sin(sim.t * 61) * sh : 0, jy = sh ? Math.cos(sim.t * 47) * sh * 0.6 : 0;
    return { eye: [c.x * 0.9 + jx, 9.8 * far + jy, W / 2 + 13.2 * far], target: [c.x + jx * 0.5, 0.6 + jy * 0.5, -0.6], fov: c.fov * 0.9 * (aspect < 1.2 ? 1.15 : 1), near: 0.5, far: 95 };
  }
  function drain(sim) { const f = sim.fx; sim.fx = []; return f; }
  CAA.LiveSim = { create, step, frame, camera, drain, SETS };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.LiveSim;
})(typeof globalThis !== 'undefined' ? globalThis : this);
