(function (root) {
  'use strict';
  // Jugada Maestra en 3D, al estilo de los juegos de jugadas dibujadas: cámara detrás del balón mirando
  // al aro, jugadores vóxel y trazos con el dedo directamente sobre la pista. El balón sigue tu trazo,
  // los compañeros cortan, la defensa se mueve y el tiro vuela al aro (limpio, al hierro o taponado).
  // El desenlace lo decide CAA.Jugada; aquí solo se dibuja, se recoge el gesto y se anima.
  // Sin WebGL no se monta y la interfaz usa la pizarra 2D de siempre.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  const J = () => CAA.Jugada;
  const U = 0.15, HX = 14 - 1.575, RIM_Y = 3.05;
  const toW = p => [(p[0] - 83.5) * U + HX, (p[1] - 50) * U];          // motor → mundo (x, z)
  const toJ = (x, z) => [(x - HX) / U + 83.5, z / U + 50];               // mundo → motor
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  const reducedMotion = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------- matrices (columna mayor, como el renderizador) ----------
  function mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
  function invert(m) {
    const inv = new Float32Array(16), a = m;
    inv[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
    inv[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
    inv[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
    inv[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
    inv[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
    inv[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
    inv[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
    inv[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
    inv[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
    inv[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
    inv[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
    inv[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
    inv[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
    inv[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
    inv[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
    inv[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
    let det = a[0] * inv[0] + a[1] * inv[4] + a[2] * inv[8] + a[3] * inv[12]; det = det ? 1 / det : 0;
    for (let i = 0; i < 16; i++) inv[i] *= det;
    return inv;
  }
  const tx = (m, v) => [0, 1, 2, 3].map(r => m[r] * v[0] + m[4 + r] * v[1] + m[8 + r] * v[2] + m[12 + r] * v[3]);

  // Se comprueba una sola vez: cada comprobación crea un contexto WebGL y el navegador limita cuántos hay.
  let canGl = null;
  function supported() {
    if (canGl !== null) return canGl;
    try { const c = doc.createElement('canvas'), g = c.getContext('webgl') || c.getContext('experimental-webgl'); canGl = !!(root.WebGLRenderingContext && g); const lose = g && g.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } catch (_) { canGl = false; }
    return canGl;
  }

  // host: contenedor; o: { st, kits, women, labels(i), onAction(a), shout(text, kind) }
  function mount(host, o) {
    if (!host || !supported()) return null;
    const gl = doc.createElement('canvas'), ov = doc.createElement('canvas');
    gl.className = 'jm3d-gl'; ov.className = 'jm3d-ov'; gl.setAttribute('aria-hidden', 'true'); ov.setAttribute('aria-hidden', 'true');
    host.appendChild(gl); host.appendChild(ov);
    let renderer;
    try { renderer = CAA.Voxel.createRenderer(gl, { onContextLost: () => { V.dead = true; } }); } catch (_) { host.removeChild(gl); host.removeChild(ov); return null; }
    const V = { st: JSON.parse(JSON.stringify(o.st)), start: JSON.parse(JSON.stringify(o.st)), actors: [], ball: { x: 0, y: 1, z: 0, spin: 0 }, net: 0, tweens: [], floats: [], t: 0, busy: false,
      cam: null, camGoal: null, slow: 1, trace: null, dead: false, raf: null, last: 0, flash: 0, shake: 0, hold: null };
    // ---------- actores ----------
    function actor(p, team, number) { const w = toW(p); return { x: w[0], z: w[1], y: 0, yaw: team ? -Math.PI / 2 : Math.PI / 2, speed: 0, stride: 0, stance: team ? 1 : 0, armsUp: 0, team, number, dribble: false }; }
    function build(st) {
      V.actors = [];
      V.byToken = {};
      const h = actor(st.ball, 0, 1); h.dribble = true; V.actors.push(h); V.byToken[st.handler] = h;
      st.mates.forEach(m => { const a = actor(m.p, 0, m.i + 1); V.actors.push(a); V.byToken[m.i] = a; });
      V.rivals = st.rivals.map((r, i) => { const a = actor(r, 1, i + 4); V.actors.push(a); return a; });
      V.hold = V.byToken[st.handler];
    }
    build(V.st);
    function tween(obj, to, dur, opts = {}) { V.tweens.push({ obj, from: { x: obj.x, z: obj.z }, to, t: 0, dur: Math.max(0.05, dur), run: opts.run !== false, face: opts.face }); }
    // ---------- cámara detrás del balón ----------
    function camFor(bx, bz, shot) {
      const dx = HX - bx, dz = -bz, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
      // Alta y algo atrasada para ver a los cinco y el aro; en el tiro, más cerca y baja (más cine).
      const back = shot ? 6 : 9.5, up = shot ? 4.2 : 8.2;
      return { eye: [bx - ux * back, up, bz - uz * back * 0.7], target: [lerp(bx, HX, shot ? 0.6 : 0.5), shot ? 2 : 0.4, lerp(bz, 0, 0.6)], fov: shot ? 54 : 64, near: 0.3, far: 90 };
    }
    function mixCam(a, b, k) { return { eye: a.eye.map((v, i) => lerp(v, b.eye[i], k)), target: a.target.map((v, i) => lerp(v, b.target[i], k)), fov: lerp(a.fov, b.fov, k), near: 0.3, far: 90 }; }
    V.cam = camFor(V.hold.x, V.hold.z); V.camGoal = V.cam;
    // ---------- proyección ----------
    let M = null, MI = null, cw = 1, ch = 1;
    function matrices() {
      cw = ov.clientWidth || 1; ch = ov.clientHeight || 1;
      const view = CAA.Voxel.lookAt(V.cam.eye, V.cam.target), proj = CAA.Voxel.perspective(cw / ch, V.cam.fov, V.cam.near, V.cam.far);
      M = mul(proj, view); MI = invert(M);
    }
    function project(x, y, z) { const c = tx(M, [x, y, z, 1]); if (c[3] <= 0.01) return null; return [(c[0] / c[3] * 0.5 + 0.5) * cw, (1 - (c[1] / c[3] * 0.5 + 0.5)) * ch]; }
    // Punto de la pantalla → plano horizontal a la altura del pecho (0,9 m): los trazos se dibujan de cuerpo
    // a cuerpo, así que un trazo recto en pantalla sigue siendo recto entre los jugadores.
    function floorAt(px, py, h = 0.9) {
      const nx = px / cw * 2 - 1, ny = 1 - py / ch * 2;
      const a = tx(MI, [nx, ny, -1, 1]), b = tx(MI, [nx, ny, 1, 1]);
      const p0 = [a[0] / a[3], a[1] / a[3], a[2] / a[3]], p1 = [b[0] / b[3], b[1] / b[3], b[2] / b[3]];
      const t = (p0[1] - h) / (p0[1] - p1[1]); if (!Number.isFinite(t) || t < 0) return null;
      return [lerp(p0[0], p1[0], t), lerp(p0[2], p1[2], t)];
    }
    const rimPx = () => project(HX, RIM_Y, 0);
    function pxPerUnitAtRim() { const a = project(HX, RIM_Y, 0), b = project(HX, RIM_Y, U); return a && b ? Math.max(1, Math.hypot(a[0] - b[0], a[1] - b[1])) : 10; }
    // ---------- dibujo ----------
    function frame() {
      const players = V.actors.map(a => ({ x: a.x, y: a.y, z: a.z, yaw: a.yaw, stride: a.stride, speed: a.speed, stance: a.stance, armsUp: a.armsUp, team: a.team, number: a.number, dribble: a.dribble }));
      return { players, refs: [], ball: { x: V.ball.x, y: V.ball.y, z: V.ball.z }, spin: V.ball.spin, net: [V.net, 0] };
    }
    function paint() {
      const g = CAA.Voxel.geometry({ ruleSetId: 'FIBA-2026' }, 0, 1, { frame: frame(), kits: o.kits, women: !!o.women, quality: 'low', t: V.t, hype: 0.7 });
      g.aspect = (gl.clientWidth || 1) / (gl.clientHeight || 1);
      g.light = Object.assign(CAA.Voxel.studioLight(V.cam.eye, V.cam.target), { ambient: 0.52, aoMin: 0.8 }); g.gain = 1.12;
      g.fog = { near: 24, far: 80, color: [0.07, 0.08, 0.15], eye: V.cam.eye };
      const cam = V.shake ? Object.assign({}, V.cam, { eye: V.cam.eye.map((v, i) => v + (i === 1 ? 0 : Math.sin(V.t * 70 + i) * V.shake * 0.2)) }) : V.cam;
      renderer.draw(g, cam);
      overlay();
    }
    function ringPx(x, z, r, steps = 28) { const pts = []; for (let i = 0; i <= steps; i++) { const a = i / steps * Math.PI * 2, p = project(x + Math.cos(a) * r, 0.04, z + Math.sin(a) * r); if (p) pts.push(p); } return pts; }
    function overlay() {
      const dpr = Math.min(2, root.devicePixelRatio || 1);
      if (ov.width !== Math.round(cw * dpr) || ov.height !== Math.round(ch * dpr)) { ov.width = Math.round(cw * dpr); ov.height = Math.round(ch * dpr); }
      const c = ov.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cw, ch);
      const line = (pts, color, w, dash) => { if (pts.length < 2) return; c.save(); c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; if (dash) c.setLineDash(dash); c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke(); c.restore(); };
      if (!V.st.done && !V.busy) {
        // anillos: quien lleva el balón, receptores y el aro (el centro dorado es el tiro limpio)
        const pulse = 0.5 + Math.sin(V.t * 5) * 0.5;
        line(ringPx(V.hold.x, V.hold.z, 0.6), 'rgba(255,178,30,' + (0.6 + pulse * 0.4) + ')', 3);
        V.st.mates.forEach(m => { const a = V.byToken[m.i]; if (a) line(ringPx(a.x, a.z, 0.55), 'rgba(120,200,255,0.75)', 2.2, [5, 4]); });
        const rp = rimPx(), k = pxPerUnitAtRim();
        if (rp) { c.save(); c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 2; c.beginPath(); c.arc(rp[0], rp[1], Math.max(14, J().HOOP_PICK * k * 0.5), 0, Math.PI * 2); c.stroke(); c.fillStyle = 'rgba(255,200,60,' + (0.35 + pulse * 0.3) + ')'; c.beginPath(); c.arc(rp[0], rp[1], Math.max(6, J().PERFECT * k), 0, Math.PI * 2); c.fill(); c.restore(); }
      }
      if (V.trace && V.trace.length > 1) {
        line(V.trace, 'rgba(0,0,0,0.35)', 9);
        line(V.trace, V.traceKind === 'shot' ? '#ffd166' : V.traceKind === 'pass' ? '#7fd3ff' : '#ffffff', 5);
        const e = V.trace[V.trace.length - 1]; c.fillStyle = '#fff'; c.beginPath(); c.arc(e[0], e[1], 5, 0, Math.PI * 2); c.fill();
      }
      // textos flotantes y destello
      V.floats = V.floats.filter(f => (f.t += 1 / 60) < f.d);
      for (const f of V.floats) { const p = project(f.x, f.y + f.t * 0.9, f.z); if (!p) continue; c.save(); c.globalAlpha = 1 - f.t / f.d; c.font = '800 ' + (f.big ? 30 : 20) + 'px CamDisp, Pixelify Sans, sans-serif'; c.textAlign = 'center'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.strokeText(f.txt, p[0], p[1]); c.fillStyle = f.color; c.fillText(f.txt, p[0], p[1]); c.restore(); }
      if (V.flash > 0) { c.fillStyle = 'rgba(255,240,200,' + V.flash * 0.45 + ')'; c.fillRect(0, 0, cw, ch); V.flash = Math.max(0, V.flash - 0.05); }
    }
    // ---------- bucle ----------
    function step(dt) {
      V.t += dt;
      for (const tw of V.tweens) {
        tw.t = Math.min(tw.dur, tw.t + dt);
        const k = ease(tw.t / tw.dur), a = tw.obj, px = a.x, pz = a.z;
        a.x = lerp(tw.from.x, tw.to.x, k); a.z = lerp(tw.from.z, tw.to.z, k);
        const sp = Math.hypot(a.x - px, a.z - pz) / Math.max(dt, 1e-3);
        a.speed = tw.run ? Math.min(7, sp) : 0; a.stride += sp * dt * 1.6;
        if (sp > 0.3) a.yaw = Math.atan2(a.x - px, a.z - pz);
      }
      V.tweens = V.tweens.filter(tw => tw.t < tw.dur);
      for (const a of V.actors) {
        if (!V.tweens.some(tw => tw.obj === a)) { a.speed *= 0.8; if (a.team) a.yaw = Math.atan2(V.ball.x - a.x, V.ball.z - a.z); else if (a !== V.hold) a.yaw = Math.atan2(V.ball.x - a.x, V.ball.z - a.z); }
        a.armsUp = Math.max(0, a.armsUp - dt * 1.2); a.y = Math.max(0, a.y - dt * 2.4);
      }
      if (V.hold && !V.anim) {
        const h = V.hold; h.yaw = Math.atan2(HX - h.x, -h.z); h.dribble = true;
        V.ball.x = h.x + Math.sin(h.yaw + 0.6) * 0.42; V.ball.z = h.z + Math.cos(h.yaw + 0.6) * 0.42; V.ball.y = 0.2 + Math.abs(Math.sin(V.t * 6)) * 0.8;
      }
      if (V.anim) V.anim(dt);
      V.net = Math.max(0, V.net - dt * 1.6); V.shake = Math.max(0, V.shake - dt * 1.5);
      V.cam = mixCam(V.cam, V.camGoal, Math.min(1, dt * 2.6));
    }
    function loop(ts) {
      if (V.dead) return;
      const dt = Math.min(0.05, V.last ? (ts - V.last) / 1000 : 0.016); V.last = ts;
      try { step(dt * V.slow); matrices(); paint(); } catch (_) { V.dead = true; return; }
      V.raf = root.requestAnimationFrame(loop);
    }
    V.raf = root.requestAnimationFrame(loop);
    // ---------- animación de cada acción ----------
    function along(pts, k) {
      let total = 0; const seg = [];
      for (let i = 1; i < pts.length; i++) { const L = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(L); total += L; }
      let want = k * total, i = 0; while (i < seg.length - 1 && want > seg[i]) want -= seg[i++];
      const f = seg[i] ? want / seg[i] : 1, a = pts[i], b = pts[i + 1] || a;
      return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
    }
    function nearestActor(w, exclude) {
      let best = null, bd = 1e9;
      for (const a of V.actors) { if (a.team || a === exclude) continue; const d = Math.hypot(a.x - w[0], a.z - w[1]); if (d < bd) { bd = d; best = a; } }
      return best;
    }
    // Reproduce las entradas del registro una tras otra; al acabar, la escena queda como finalSt.
    function run(entries, finalSt, done) {
      V.busy = true;
      const reduced = reducedMotion(), queue = entries.filter(e => e.k !== 'clock');
      const finish = () => {
        if (finalSt) {
          finalSt.rivals.forEach((r, i) => { const w = toW(r); if (V.rivals[i]) tween(V.rivals[i], { x: w[0], z: w[1] }, reduced ? 0.05 : 0.45); });
          V.st = JSON.parse(JSON.stringify(finalSt)); remap(finalSt);
          if (!finalSt.done && V.hold) V.camGoal = camFor(V.hold.x, V.hold.z);
        }
        root.setTimeout(() => { V.busy = false; V.slow = 1; if (done) done(); }, reduced ? 20 : 480);
      };
      const next = () => {
        const e = queue.shift();
        if (!e) { finish(); return; }
        animate(e, reduced, () => { if (e.k === 'pass' && e.ok) V.hold = nearestActor(toW(e.to)); next(); });
      };
      next();
    }
    function animate(e, reduced, next) {
      const dur = reduced ? 0.08 : e.k === 'shot' ? 1.15 : e.k === 'cut' ? 0.55 : 0.7;
      const path = (e.path || [e.from, e.to]).map(p => toW(p));
      let t = 0;
      if (e.k === 'cut') { const a = nearestActor(toW(e.from), V.hold); if (a) { const w = toW(e.to); tween(a, { x: w[0], z: w[1] }, dur); } root.setTimeout(next, dur * 1000 + 30); return; }
      if (e.k === 'clock') { next(); return; }
      const holder = V.hold;
      V.anim = dt => {
        t += dt; const k = Math.min(1, t / dur);
        if (e.k === 'pass') {
          const p = along(path, e.ok ? k : Math.min(1, k * 1.15));
          V.ball.x = p[0]; V.ball.z = p[1]; V.ball.y = 1.25 + Math.sin(k * Math.PI) * 0.5; V.ball.spin += dt * 9;
          if (k > 0.4 && V.camGoal) V.camGoal = camFor(p[0], p[1]);
        } else if (e.k === 'drive') {
          const p = along(path, k); holder.x = p[0]; holder.z = p[1]; holder.speed = 6.5; holder.stride += dt * 10;
          if (path.length > 1) holder.yaw = Math.atan2(path[path.length - 1][0] - path[0][0], path[path.length - 1][1] - path[0][1]);
          V.ball.x = p[0] + 0.35; V.ball.z = p[1]; V.ball.y = 0.18 + Math.abs(Math.sin(k * Math.PI * 5)) * 0.85;
          V.camGoal = camFor(p[0], p[1]);
        } else if (e.k === 'shot') {
          V.camGoal = camFor(holder.x, holder.z, true);
          const sx = holder.x, sz = holder.z, d = Math.hypot(HX - sx, sz);
          holder.armsUp = 1; holder.y = Math.min(0.55, 0.3 + (e.dunk ? 0.5 : 0)) * Math.sin(Math.min(1, k * 2.4) * Math.PI);
          const apex = e.dunk ? 0.5 : 1.4 + d * 0.12;
          const end = e.how === 'short' ? 0.82 : 1;
          if (e.how === 'block' && k > 0.22) {
            const r = V.rivals.reduce((b, a) => Math.hypot(a.x - sx, a.z - sz) < Math.hypot(b.x - sx, b.z - sz) ? a : b, V.rivals[0]);
            r.armsUp = 1; r.y = 0.5; const u = (k - 0.22) / 0.78;
            V.ball.x = lerp(sx, sx - 1.5, u); V.ball.z = lerp(sz, sz + 2, u); V.ball.y = lerp(2.6, 0.2, u) + Math.sin(u * Math.PI) * 0.8;
            if (!V.blocked) { V.blocked = true; V.shake = 0.6; }
          } else {
            const u = Math.min(1, k / end * (k < 0.88 ? 1 : 1)), bx = lerp(sx, HX, Math.min(1, u)), bz = lerp(sz, 0, Math.min(1, u));
            let by = lerp(2.3, RIM_Y, Math.min(1, u)) + Math.sin(Math.min(1, u) * Math.PI) * apex;
            if (k > 0.82 && e.how === 'made') { const v = (k - 0.82) / 0.18; by = RIM_Y - v * 2.2; V.net = 1; V.slow = 0.45; }
            if (k > 0.82 && (e.how === 'rim' || e.how === 'miss')) { const v = (k - 0.82) / 0.18; V.ball.x = HX - v * 1.6; V.ball.z = (e.how === 'rim' ? 1.2 : -1.6) * v; V.ball.y = RIM_Y + Math.sin(v * Math.PI) * 0.9 - v * 1.4; }
            else { V.ball.x = bx; V.ball.z = bz; V.ball.y = by; }
            if (e.how === 'short' && k > 0.82) V.ball.y = Math.max(0.2, by - (k - 0.82) * 12);
          }
          V.ball.spin += dt * 12;
        }
        if (k >= 1) {
          V.anim = null; V.blocked = false;
          if (e.k === 'shot') {
            const top = [HX, RIM_Y + 0.4, 0];
            if (e.ok) { V.flash = 1; V.floats.push({ x: top[0], y: top[1], z: top[2], txt: '+' + e.points, color: e.points === 3 ? '#ffd166' : '#7dffa8', t: 0, d: 1.4, big: true }); }
            if (o.shout) o.shout(e);
          } else if (!e.ok && o.shout) o.shout(e);
          next();
        }
      };
    }
    function remap(st) {
      // token → actor por posición más cercana (tras pases y cortes el motor intercambia índices)
      const free = V.actors.filter(a => !a.team);
      const map = {}; const want = [[st.handler, st.ball]].concat(st.mates.map(m => [m.i, m.p]));
      for (const [tok, p] of want) {
        const w = toW(p); let best = null, bd = 1e9;
        for (const a of free) { if (Object.values(map).includes(a)) continue; const d = Math.hypot(a.x - w[0], a.z - w[1]); if (d < bd) { bd = d; best = a; } }
        if (best) map[tok] = best;
      }
      V.byToken = map; V.hold = map[st.handler];
    }
    return {
      // Anima lo que acaba de pasar (entradas nuevas del registro) y deja la escena como el estado final.
      play(prev, next, done) { run(next.log.slice(prev.log.length), next, done); },
      // Repetición de la jugada entera desde el principio (sin tocar el estado de la partida).
      replay(full, done) {
        if (V.busy) return;
        V.st = JSON.parse(JSON.stringify(V.start)); build(V.st); V.cam = V.camGoal = camFor(V.hold.x, V.hold.z);
        run(full.log.slice(), null, () => { V.st = JSON.parse(JSON.stringify(full)); if (done) done(); });
      },
      // Gesto sobre la pista: devuelve true si lo ha recogido.
      attach() {
        let pts = null, startPx = null, onBall = false;
        const local = ev => { const r = ov.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
        const kindOf = endPx => { const rp = rimPx(); if (rp && Math.hypot(endPx[0] - rp[0], endPx[1] - rp[1]) <= Math.max(26, J().HOOP_PICK * pxPerUnitAtRim() * 0.55)) return 'shot'; const mate = mateNear(endPx); return mate != null ? 'pass' : 'drive'; };
        const mateNear = px => { let best = null, bd = 46; for (const m of V.st.mates) { const a = V.byToken[m.i]; if (!a) continue; const p = project(a.x, 0.9, a.z); if (!p) continue; const d = Math.hypot(px[0] - p[0], px[1] - p[1]); if (d < bd) { bd = d; best = m.i; } } return best; };
        const down = ev => {
          if (V.busy || V.st.done || !M) return;
          const p = local(ev), hp = project(V.hold.x, 0.9, V.hold.z);
          startPx = p; onBall = !!hp && Math.hypot(p[0] - hp[0], p[1] - hp[1]) < 56; pts = [p]; V.trace = onBall ? [hp] : null;
          try { ov.setPointerCapture(ev.pointerId); } catch (_) {}
          ev.preventDefault();
        };
        const move = ev => { if (!pts) return; const p = local(ev); pts.push(p); if (onBall) { V.trace.push(p); V.traceKind = kindOf(p); } ev.preventDefault(); };
        const up = ev => {
          if (!pts) return;
          const p = local(ev), moved = Math.hypot(p[0] - startPx[0], p[1] - startPx[1]) > 14, line = pts.concat([p]); pts = null;
          const trace = V.trace; V.trace = null;
          if (moved && !onBall) return;
          const kind = kindOf(p);
          if (kind === 'shot') { const rp = rimPx(); const aim = rp ? Math.hypot(p[0] - rp[0], p[1] - rp[1]) / pxPerUnitAtRim() : 9; return o.onAction({ k: 'shot', aim: Math.round(aim * 10) / 10 }); }
          // El dedo empieza sobre el cuerpo de quien lleva el balón: su proyección al suelo cae por detrás,
          // así que los puntos pegados al balón se descartan (el motor ya empieza el trazo en el balón).
          const ball = V.st.ball;
          // En un pase, el trazo acaba donde el dedo entra en el receptor (apuntamos a su cuerpo, no al suelo de detrás).
          let drawn = moved ? line : [p];
          if (kind === 'pass' && moved) { const to = mateNear(p), a = V.byToken[to], rp = a && project(a.x, 0.9, a.z); if (rp) { const cutAt = drawn.findIndex(q => Math.hypot(q[0] - rp[0], q[1] - rp[1]) < 46); if (cutAt > 0) drawn = drawn.slice(0, cutAt); } }
          const floor = drawn.map(q => floorAt(q[0], q[1])).filter(Boolean).map(w => toJ(w[0], w[1])).filter(q => !moved || Math.hypot(q[0] - ball[0], q[1] - ball[1]) > 6);
          if (kind === 'pass') { const to = mateNear(p); return o.onAction(moved ? { k: 'pass', to, path: floor } : { k: 'pass', to }); }
          if (floor.length) o.onAction({ k: 'drive', path: floor });
          void trace;
        };
        ov.addEventListener('pointerdown', down); ov.addEventListener('pointermove', move); ov.addEventListener('pointerup', up); ov.addEventListener('pointercancel', () => { pts = null; V.trace = null; });
      },
      busy: () => V.busy,
      // Para pruebas y accesibilidad: dónde cae en pantalla un punto del motor (o el aro).
      toClient(p, y = 0.9) { if (!M) matrices(); const w = toW(p), q = project(w[0], y, w[1]), r = ov.getBoundingClientRect(); return q ? [r.left + q[0], r.top + q[1]] : null; },
      rimClient() { if (!M) matrices(); const q = rimPx(), r = ov.getBoundingClientRect(); return q ? [r.left + q[0], r.top + q[1]] : null; },
      handlerToken: () => V.st.handler,
      destroy() { V.dead = true; if (V.raf) root.cancelAnimationFrame(V.raf); try { renderer.dispose(); } catch (_) {} if (gl.parentNode) gl.parentNode.removeChild(gl); if (ov.parentNode) ov.parentNode.removeChild(ov); }
    };
  }
  CAA.Jugada3D = { supported, mount, toW, toJ };
})(typeof globalThis !== 'undefined' ? globalThis : this);
