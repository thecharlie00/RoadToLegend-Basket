(function (root) {
  'use strict';
  // Partido en directo: retransmisión con retardo de TV, pizarra táctica 2D, vista 3D y estadísticas.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["live"] = function (ui) {
    const { abbrOf, action, crest, esc, haptic, render, state, t } = ui;
    function clockText(tenths) { const sec = Math.ceil(Math.max(0, tenths) / 10); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
    function feedText(e) {
      const v = { player: e.player || '', team: e.teamName, pts: e.points, shooter: e.shooter || '', defender: e.defender || '' };
      if (e.type === 'shot') return t(e.made ? 'live.feed.made' : 'live.feed.miss', v);
      if (e.type === 'ft') return t(e.made ? 'live.feed.ftMade' : 'live.feed.ftMiss', v);
      if (e.type === 'foul') return t(e.intentional ? 'live.feed.foulIntentional' : e.foulOut ? 'live.feed.foulOut' : 'live.feed.foul', v);
      if (e.type === 'turnover') return t(e.steal ? 'live.feed.steal' : 'live.feed.turnover', v);
      return t('live.feed.' + e.type, v);
    }
    // Última jugada destacada del directo para la vista 3D (canasta, triple, tapón, robo o adicional).
    function liveKeyIndex(m, limit) {
      for (let i = Math.min(m.events.length, limit == null ? m.events.length : limit) - 1; i >= 0; i--) { const e = m.events[i]; if ((e.type === 'shot' && e.made) || e.type === 'block' || (e.type === 'turnover' && e.steal) || (e.type === 'ft' && e.made && e.reason === 'andOne')) return i; }
      return 0;
    }
    function live3dCaption(raw) {
      const m = raw.match, i = liveKeyIndex(m, pbSeq(raw)), e = m.events[i];
      if (!e || e.type === 'start') return t('live.view3dWaiting');
      const team = m.teams[e.team] ? m.teams[e.team].name : '';
      const who = (m.teams[e.team] && m.teams[e.team].players.find(p => p.id === e.player)) || {};
      const other = m.teams[1 - e.team] ? m.teams[1 - e.team].players : [];
      const nm = id => (other.find(p => p.id === id) || {}).name || '';
      return t('live.view3dCap', { period: e.period, clock: clockText(e.clock), text: feedText({ type: e.type, made: e.made, points: e.points, player: who.name || '', teamName: team, steal: e.steal, defender: nm(e.defender), shooter: nm(e.shooter) }) });
    }
    // ===== Vista táctica 2D (como la pizarra del directo del fútbol): pista entera en SVG, los 10 jugadores en
    // formación y el balón siguiendo cada jugada; las posiciones se animan con transiciones CSS. =====
    const TAC_OFF = [[70, 27], [76, 9], [76, 45], [88, 17], [88, 37]], TAC_DEF = [[75, 27], [80, 12], [80, 42], [89, 21], [89, 33]];
    const ZONE_PT = { restricted: [92, 27], paint: [86, 24], midrange: [80, 15], corner3: [92, 3], above3: [70, 20] };
    function tacticalSvg(raw) {
      const m = raw.match, i = liveKeyIndex(m, pbSeq(raw)), e = m.events[i] || { team: 0 }, me = raw.userTeam;
      const off = e.team === 1 ? 1 : 0, flip = (team, xy) => team === 0 ? xy : [100 - xy[0], xy[1]];
      const five = team => { const tm = m.teams[team]; let ids = (tm.onCourt || tm.players.slice(0, 5).map(p => p.id)).slice(0, 5); if (team === e.team && e.player && !ids.includes(e.player)) ids[0] = e.player; return ids.map(id => tm.players.find(p => p.id === id) || { id, name: '?' }); };
      const dots = [], cols = [ui.careerWomen() ? '#ff6fae' : '#ffb21e', '#5fb8ff'];
      let ball = flip(off, [70, 27]);
      for (const team of [0, 1]) {
        const att = team === off;
        five(team).forEach((p, k) => {
          let xy = (att ? TAC_OFF : TAC_DEF)[k].slice();
          if (att && p.id === e.player) { if (e.type === 'shot' && ZONE_PT[e.zone]) xy = ZONE_PT[e.zone].slice(); else if (e.type === 'ft') xy = [81, 27]; ball = flip(off, [xy[0] + 1.5, xy[1] - 1.5]); }
          if (!att && e.type === 'shot' && e.zone && k === 0) { const z = ZONE_PT[e.zone] || [80, 27]; xy = [z[0] + (z[0] > 88 ? -2 : 2.5), z[1] + 1.5]; }
          const [x, y] = flip(off, xy), num = (p.name || '?').split(' ').pop().slice(0, 1);
          dots.push(`<g class="tac-p${p.id === e.player ? ' hot' : ''}" style="transform:translate(${x}px,${y}px)"><circle r="2.4" fill="${cols[team === me ? 0 : 1]}"/><text y=".9" text-anchor="middle">${esc(num)}</text></g>`);
        });
      }
      if (e.type === 'shot' && e.made) ball = flip(off, [94.5, 27]);
      const rim = x => `<circle cx="${x}" cy="27" r="1" class="rim"/>`;
      const half = x => x > 50 ? `<path d="M100 3H90A24 24 0 0 0 90 51H100"/><rect x="81" y="19.5" width="19" height="15"/><circle cx="81" cy="27" r="6"/>${rim(94.5)}` : `<path d="M0 3H10A24 24 0 0 1 10 51H0"/><rect x="0" y="19.5" width="19" height="15"/><circle cx="19" cy="27" r="6"/>${rim(5.5)}`;
      return `<svg viewBox="0 0 100 54" class="tac-svg" role="img" aria-label="${esc(t('live.view2d'))}"><rect x="0" y="0" width="100" height="54" class="floor"/><g class="lines"><rect x="0.5" y="0.5" width="99" height="53"/><path d="M50 0.5v53"/><circle cx="50" cy="27" r="6"/>${half(100)}${half(0)}</g>${dots.join('')}<circle class="tac-ball" r="1.1" style="transform:translate(${ball[0]}px,${ball[1]}px)"/></svg>`;
    }
    // Jugadas del 3D con «juice»: rótulo de televisión (¡TRIPLE!, ¡MATE!, TAPÓN, ROBO), sonido, vibración y destello.
    function liveFx(list, raw) {
      if (!list.length) return;
      const box = doc.querySelector('.live3d'), me = raw.userTeam, J = CAA.Juice;
      for (const f of list) {
        const mine = f.team === me;
        let label = '', cls = mine ? 'good' : 'bad';
        if (f.k === 'made') { label = f.dunk ? t('fx.dunk') : f.pts === 3 ? t('fx.three') : ''; if (ui.audio) ui.audio.play(f.pts === 3 || f.dunk ? 'cheer' : 'swish'); if (mine) haptic('score'); }
        else if (f.k === 'block') { label = t('fx.block'); if (ui.audio) ui.audio.play('pop'); }
        else if (f.k === 'steal') { label = t('fx.steal'); }
        else if (f.k === 'rim') { if (ui.audio) ui.audio.play('bounce'); }
        else if (f.k === 'whistle') { if (ui.audio) ui.audio.play('whistle'); }
        else if (f.k === 'ft') { if (ui.audio) ui.audio.play('swish'); }
        if (label && box) {
          const el = doc.createElement('div'); el.className = 'tv-callout ' + cls; el.setAttribute('aria-hidden', 'true');
          el.innerHTML = `<b>${esc(label)}</b>${f.player ? `<span>${esc(f.player)}</span>` : ''}`;
          box.appendChild(el); root.setTimeout(() => el.remove(), 1700);
          if (J && f.k === 'made' && mine) J.flash(box, 'rgba(255,178,30,.55)');
        }
      }
    }
    function drawLive3d(ts) {
      const canvas = doc.getElementById('live3d'), raw = state.career.state && state.career.state.live;
      if (!canvas || !raw || state.screen !== 'game' || state.tab !== 'career' || state.liveViewOff) { ui.liveRaf = null; return; }
      try {
        if (!ui.liveRenderer || ui.liveCanvas !== canvas) { ui.liveCanvas = canvas; ui.liveRenderer = CAA.Voxel.createRenderer(canvas, { onContextLost: () => { state.liveViewOff = true; ui.liveRenderer = null; } }); }
        // Simulación continua (como el directo 3D del fútbol): escenifica cada jugada emitida por la reproducción.
        const m = raw.match, seq = Math.max(0, (pbSeq(raw) || 1) - 1);
        const reduced = CAA.A11Y.reduced(state.settings);
        if (!ui.liveSim || ui.liveSim.id !== m.matchId) { ui.liveSim = CAA.LiveSim.create(m, { women: ui.careerWomen() }); ui.liveSimT = ts; }
        const dt = Math.max(0, (ts - (ui.liveSimT || ts)) / 1000) * (ui.pb.speed > 1 ? Math.min(3, ui.pb.speed * 0.75) : 1); ui.liveSimT = ts;
        CAA.LiveSim.step(ui.liveSim, m, seq, reduced ? 0.05 : dt);
        const fr = CAA.LiveSim.frame(ui.liveSim);
        const diff = Math.abs(m.score[0] - m.score[1]), clutch = m.period >= 4 && m.gameClock <= 1800 && diff <= 8;
        // Equipaciones con los colores de cada club; si chocan, el visitante viste de blanco.
        const kitOf = name => { const c = CAA.Crest ? CAA.Crest.colors({ name }) : ['#36b98a', '#ffffff']; const h = x => [parseInt(x.slice(1, 3), 16) / 255, parseInt(x.slice(3, 5), 16) / 255, parseInt(x.slice(5, 7), 16) / 255]; return { jersey: h(c[0]), shorts: h(c[0]).map(v => v * 0.7), alt: h(c[1]) }; };
        const k0 = kitOf(m.teams[0].name), k1 = kitOf(m.teams[1].name), dist = Math.hypot(...k0.jersey.map((v, q) => v - k1.jersey[q]));
        if (dist < 0.35) { k1.jersey = [0.94, 0.93, 0.9]; k1.shorts = [0.86, 0.85, 0.82]; }
        const g = CAA.Voxel.geometry(m, 0, 1, { frame: fr, kits: [k0, k1], ball: state.career.summary && state.career.summary.era ? state.career.summary.era.ball : null, women: ui.careerWomen(), me: ui.meOnCourt ? ui.meOnCourt() : null, quality: 'balanced', colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, reducedMotion: reduced, t: ts / 1000, hype: clutch ? 1 : ui.liveSim.cam.shake > 0.05 ? 0.95 : 0.35 });
        const cam = CAA.LiveSim.camera(ui.liveSim, canvas.clientWidth / Math.max(1, canvas.clientHeight || canvas.clientWidth * 9 / 16));
        g.light = Object.assign(CAA.Voxel.studioLight(cam.eye, cam.target), { ambient: 0.5, aoMin: 0.8 }); g.gain = 1.1; g.fog = { near: 30, far: 95, color: [0.08, 0.09, 0.16], eye: cam.eye };
        ui.liveRenderer.draw(g, cam);
        liveFx(CAA.LiveSim.drain(ui.liveSim), raw);
        ui.liveRaf = reduced ? null : root.requestAnimationFrame(drawLive3d);
      } catch (_) { state.liveViewOff = true; canvas.hidden = true; ui.liveRaf = null; }
    }
    // ===== Directo en tiempo real (como el fútbol): el motor ya ha calculado hasta el próximo momento clave;
    // la interfaz lo reproduce con el reloj corriendo (⏸ ▶ ▶▶ ▶▶▶) y solo enseña la decisión al llegar a ella. =====
    const STAGED = { shot: 1, block: 1, ft: 1, turnover: 1, rebound: 1, foul: 1 };
    const PB_RATE = { 1: 200, 2: 420, 4: 900 };
    function pbProfile(m) { return CAA.Rules.getProfile(m.ruleSetId); }
    function evAbs(prof, period, clock) {
      const P = prof.periods, pl = prof.periodMinutes * 600, ol = prof.overtimeMinutes * 600, p = period || 1;
      const before = p <= P ? (p - 1) * pl : P * pl + (p - P - 1) * ol, len = p <= P ? pl : ol;
      return before + (len - (clock == null ? len : Math.min(len, clock)));
    }
    function absToClock(prof, abs) {
      const P = prof.periods, pl = prof.periodMinutes * 600, ol = prof.overtimeMinutes * 600;
      if (abs < P * pl) { const p = Math.floor(abs / pl) + 1; return { period: Math.min(P, p), clock: Math.max(0, pl * Math.min(P, p) - abs) }; }
      const r = abs - P * pl, p = P + Math.floor(r / ol) + 1; return { period: p, clock: Math.max(0, ol - (r % ol || 0)) };
    }
    function pbSync(raw) {
      const m = raw.match;
      if (ui.pb.key !== m.matchId) ui.pb = { key: m.matchId, seq: 0, cursor: 0, speed: ui.pb.speed || 1, hold: 0 };
      if (ui.pb.seq > m.events.length) ui.pb.seq = m.events.length;
      return ui.pb;
    }
    function pbSeq(raw) { if (!raw || !raw.match) return null; const p = pbSync(raw); return p.seq; }
    function pbCaught(raw) { return pbSync(raw).seq >= raw.match.events.length; }
    function pbCatchUp(raw) { const p = pbSync(raw), m = raw.match, prof = pbProfile(m); p.seq = m.events.length; const e = m.events[m.events.length - 1]; if (e) p.cursor = Math.max(p.cursor, evAbs(prof, e.period, e.clock)); p.hold = 0; }
    // Valor de una canasta: la zona manda porque los fallos guardan points:0.
    const shotPoints = e => CAA.Live.shotPoints(e);
    // Marcador, reloj, crónica y estadísticas con solo lo ya "emitido".
    function pbView(raw) {
      const v = CAA.Live.view(raw, 400), m = raw.match, prof = pbProfile(m), p = pbSync(raw), me = raw.userTeam;
      const shown = m.events.slice(0, p.seq), score = [0, 0], box = {};
      const b = id => box[id] || (box[id] = { pts: 0, reb: 0, ast: 0, pf: 0 });
      for (const e of shown) {
        if (e.type === 'shot' && e.made) { score[e.team] += shotPoints(e); if (e.team === me) { b(e.player).pts += shotPoints(e); if (e.assist) b(e.assist).ast++; } }
        else if (e.type === 'ft' && e.made) { score[e.team] += 1; if (e.team === me) b(e.player).pts += 1; }
        else if (e.type === 'rebound' && e.team === me) b(e.player).reb++;
        else if (e.type === 'foul' && e.team === me && e.player) b(e.player).pf++;
      }
      // Estadísticas de equipo, parciales por cuarto y momentum (últimas 12 canastas) con lo ya emitido.
      const ts = [0, 1].map(() => ({ fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, reb: 0, tov: 0 })), qs = {}, swing = [];
      for (const e of shown) {
        const T = ts[e.team];
        if (e.type === 'shot' && T) { const three = shotPoints(e) === 3; T.fga++; if (three) T.tpa++; if (e.made) { T.fgm++; if (three) T.tpm++; } }
        else if (e.type === 'ft' && T) { T.fta++; if (e.made) T.ftm++; }
        else if ((e.type === 'rebound' || e.type === 'teamRebound') && T) T.reb++;
        else if ((e.type === 'turnover' || e.type === 'shotClockViolation') && T) T.tov++;
        const pts = e.type === 'shot' && e.made ? shotPoints(e) : e.type === 'ft' && e.made ? 1 : 0;
        if (pts && e.team != null) { const q = qs[e.period] || (qs[e.period] = [0, 0]); q[e.team] += pts; swing.push(e.team === me ? pts : -pts); }
      }
      const momentum = Math.max(-1, Math.min(1, swing.slice(-12).reduce((a, b) => a + b, 0) / 12));
      const caught = p.seq >= m.events.length && !!(raw.moment || raw.finished);
      const clk = caught ? { period: m.period, clock: m.gameClock } : absToClock(prof, Math.min(p.cursor, m.events.length ? evAbs(prof, m.events[m.events.length - 1].period, m.events[m.events.length - 1].clock) : 0));
      const seqs = new Set(shown.map(e => e.seq));
      const feed = v.feed.filter(e => seqs.has(e.seq)).slice(0, 12);
      const mine = m.teams[me];
      const top = mine.players.map(pl => Object.assign({ id: pl.id, name: pl.name, me: pl.id === raw.myPlayerId, onCourt: mine.onCourt.includes(pl.id) }, b(pl.id)))
        .sort((a, c) => c.pts - a.pts || a.id.localeCompare(c.id)).slice(0, 5);
      return Object.assign({}, v, { score: caught ? m.score.slice() : score, period: clk.period, clock: clk.clock, periodLabel: CAA.Rules.periodLabel(prof, clk.period), feed, top, caught, teamStats: ts, quarters: qs, momentum,
        moment: caught ? v.moment : null, finished: caught && v.finished, myName: raw.myPlayerId ? (mine.players.find(x => x.id === raw.myPlayerId) || {}).name : null });
    }
    function pbTick() {
      const raw = state.career.state && state.career.state.live;
      const panel = doc.getElementById('live-panel');
      if (!raw || !panel || state.screen !== 'game' || state.tab !== 'career' || doc.hidden) { pbStop(); return; }
      const p = pbSync(raw), now = root.performance.now(), dt = Math.min(250, now - (ui.pbLast || now)); ui.pbLast = now;
      if (pbCaught(raw)) {
        if (raw.moment || raw.finished) { if (!panel.dataset.caught) { pbStop(); state.liveFocus = true; render(); } return; }
        // Sin decisión pendiente: se pide al motor el siguiente tramo sin parar el reloj.
        if (p.speed && !state.busy && !ui.pbFetching) { ui.pbFetching = true; action('live-next', { dataset: {} }).finally(() => { ui.pbFetching = false; }); }
        return;
      }
      if (!p.speed) return;
      if (p.hold > 0) { p.hold -= dt; return; }
      const m = raw.match, prof = pbProfile(m);
      // Con el 3D a la vista, el directo espera a que la retransmisión escenifique la jugada anterior: así cada punto del
      // marcador llega con su canasta (como en la tele) y no se ven puntos sin jugada.
      const tv = state.liveView !== '2d' && ui.liveSim && ui.liveSim.id === m.matchId && doc.getElementById('live3d') && !CAA.A11Y.reduced(state.settings);
      if (tv && (ui.liveSim.queue.length || !ui.liveSim.script.done && ui.liveSim.script.type !== 'flow' && ui.liveSim.script.type !== 'final' && ui.liveSim.script.t < 5.2)) return;
      p.cursor += dt / 1000 * PB_RATE[p.speed];
      let changed = false;
      while (p.seq < m.events.length) {
        const e = m.events[p.seq];
        if (evAbs(prof, e.period, e.clock) > p.cursor) break;
        p.seq++; changed = true;
        if (e.type === 'periodEnd') { p.hold = 1400 / p.speed; if (ui.audio) ui.audio.play('buzzer'); break; }
        if (tv && STAGED[e.type]) { p.cursor = Math.max(p.cursor, evAbs(prof, e.period, e.clock)); break; }
        if (e.type === 'shot' && e.made && ui.audio && e.team === raw.userTeam) ui.audio.play('click');
      }
      if (p.seq >= m.events.length && (raw.moment || raw.finished)) { pbStop(); render(); return; }
      pbPaint(raw, changed);
    }
    function pbPaint(raw, full) {
      const v = pbView(raw), me = v.userTeam, opp = 1 - me;
      const set = (id, html) => { const el = doc.getElementById(id); if (el && el.innerHTML !== html) el.innerHTML = html; };
      const scoreEl = doc.getElementById('pb-score');
      if (scoreEl) {
        const next = `${v.score[me]} – ${v.score[opp]}`, before = parseInt(scoreEl.textContent, 10);
        if (scoreEl.textContent !== next) {
          scoreEl.textContent = next;
          scoreEl.classList.remove('bump'); void scoreEl.offsetWidth; scoreEl.classList.add('bump');
          // Parciales (8-0 o más) y cambios de líder con su golpe visual.
          const run = state.liveRun && state.liveRun.id === raw.match.matchId ? state.liveRun : (state.liveRun = { id: raw.match.matchId, me: 0, opp: 0, lead: 0 }), lead = Math.sign(v.score[me] - v.score[opp]);
          const before2 = scoreEl.dataset.opp != null ? +scoreEl.dataset.opp : v.score[opp]; scoreEl.dataset.opp = v.score[opp];
          if (Number.isFinite(before) && v.score[me] > before) { run.me += v.score[me] - before; run.opp = 0; }
          if (v.score[opp] > before2) { run.opp += v.score[opp] - before2; run.me = 0; }
          if (CAA.Juice) {
            const sb = doc.querySelector('.scoreboard') || scoreEl;
            if (run.me >= 8 && !run.shownMe) { run.shownMe = true; CAA.Juice.floatText(t('fx.run', { a: run.me }), scoreEl, 'gold'); CAA.Juice.pop(sb, 1.05); if (ui.audio) ui.audio.play('cheer'); }
            if (run.me < 8) run.shownMe = false;
            if (run.opp >= 8 && !run.shownOpp) { run.shownOpp = true; CAA.Juice.shake(sb, 0.6); CAA.Juice.floatText(t('fx.runOpp', { a: run.opp }), scoreEl, 'bad'); }
            if (run.opp < 8) run.shownOpp = false;
            if (lead !== run.lead && lead !== 0 && Number.isFinite(before)) { CAA.Juice.flash(sb, lead > 0 ? 'rgba(54,185,138,.6)' : 'rgba(255,91,102,.55)'); if (lead > 0) CAA.Juice.floatText(t('fx.lead'), scoreEl, 'good'); }
            run.lead = lead || run.lead;
          }
          if (Number.isFinite(before) && v.score[me] > before) {
            haptic('score'); const d = v.score[me] - before;
            if (CAA.Juice && d <= 4) { CAA.Juice.floatText('+' + d, scoreEl, d >= 3 ? 'gold' : 'good'); if (d >= 3) CAA.Juice.burstAt(scoreEl, { count: 16, speed: 200, colors: ['#ffb21e', '#ffffff'] }); }
          }
        }
      }
      set('pb-clock', `${esc(v.periodLabel)} · ${clockText(v.clock)}`);
      if (full) { set('pb-feed', liveFeedHtml(v)); set('pb-top', liveTopHtml(v)); set('pb-stats', liveStatsHtml(v)); const mm = doc.getElementById('pb-mom'); if (mm) { mm.style.setProperty('--mom', String(v.momentum)); mm.setAttribute('aria-valuenow', String(Math.round(v.momentum * 100))); } const cap = doc.getElementById('live3d-cap'); if (cap) cap.textContent = live3dCaption(raw); }
      { const tac = doc.getElementById('pb-tac'), tk = raw.match.matchId + ':' + liveKeyIndex(raw.match, pbSeq(raw)); if (tac && tac.dataset.k !== tk) { tac.dataset.k = tk; const sv = tac.querySelector('svg'), tmp = doc.createElement('div'); tmp.innerHTML = tacticalSvg(raw); const nv = tmp.querySelector('svg'); if (sv && nv) { const a = sv.querySelectorAll('g.tac-p'), b = nv.querySelectorAll('g.tac-p'); if (a.length === b.length) { a.forEach((g, k) => { g.setAttribute('style', b[k].getAttribute('style')); g.setAttribute('class', b[k].getAttribute('class')); g.innerHTML = b[k].innerHTML; }); const ob = sv.querySelector('.tac-ball'), nb = nv.querySelector('.tac-ball'); if (ob && nb) ob.setAttribute('style', nb.getAttribute('style')); } else tac.innerHTML = tmp.innerHTML; } } }
    }
    function pbStart() { if (ui.pbTimer == null) { ui.pbLast = root.performance.now(); ui.pbTimer = root.setInterval(pbTick, 100); } }
    function pbStop() { if (ui.pbTimer != null) { root.clearInterval(ui.pbTimer); ui.pbTimer = null; } }
    function liveFeedHtml(v) { return v.feed.map((e, i) => { const cls = [v.myName && e.player === v.myName ? 'mine' : '', i === 0 ? 'fresh' : ''].filter(Boolean).join(' '); return `<li${cls ? ` class="${cls}"` : ''}><span class="muted">${esc(e.period)}º · ${clockText(e.clock)}</span> ${esc(feedText(e))}</li>`; }).join(''); }
    function liveStatsHtml(v) {
      const me = v.userTeam, op = 1 - me, A = v.teamStats[me], B = v.teamStats[op], pct = (m, a) => a ? Math.round(m / a * 100) + '%' : '—';
      const row = (k, a, b) => `<tr><td>${a}</td><th scope="row">${t('live.stat.' + k)}</th><td>${b}</td></tr>`;
      const qk = Object.keys(v.quarters).sort((x, y) => x - y);
      return `<table class="vs"><thead><tr><th>${esc(abbrOf(v.teams[me]))}</th><th></th><th>${esc(abbrOf(v.teams[op]))}</th></tr></thead><tbody>${row('fg', `${A.fgm}/${A.fga} (${pct(A.fgm, A.fga)})`, `${B.fgm}/${B.fga} (${pct(B.fgm, B.fga)})`)}${row('tp', `${A.tpm}/${A.tpa}`, `${B.tpm}/${B.tpa}`)}${row('ft', `${A.ftm}/${A.fta}`, `${B.ftm}/${B.fta}`)}${row('reb', A.reb, B.reb)}${row('tov', A.tov, B.tov)}</tbody></table>
        ${qk.length ? `<p class="muted small">${t('live.quarters')}: ${qk.map(q => `${q}º ${v.quarters[q][me]}–${v.quarters[q][op]}`).join(' · ')}</p>` : ''}`;
    }
    function liveTopHtml(v) { return v.top.map(p => `<tr${p.me ? ' class="me"' : ''}><td>${esc(p.name)}${p.onCourt ? ' •' : ''}</td><td>${p.pts}</td><td>${p.reb}</td><td>${p.ast}</td><td>${p.pf}</td></tr>`).join(''); }
    function renderLive(c) {
      const raw = c.state && c.state.live;
      if (!raw || raw.week !== c.state.week) return '';
      const v = pbView(raw);
      const me = v.userTeam, opp = 1 - me;
      const m = v.moment;
      const vars = m ? { player: m.playerName || '', pts: m.pts || 0, fouls: m.fouls || 0, diff: Math.abs(m.diff || 0) } : {};
      const momentHtml = m ? `<div class="moment" role="group" aria-labelledby="moment-title"><h4 id="moment-title">${t('live.moment.' + m.type)}</h4><p>${esc(t('live.momentText.' + m.type + (m.type === 'lastShot' && !m.diff ? 'Tie' : ''), vars))}</p>
        ${state.heroShot ? `<canvas id="hero-canvas" width="640" height="420" role="img" aria-label="${t('live.heroCanvas')}" aria-describedby="hero-help"></canvas><p id="hero-help" class="muted small">${t('arcade.help.jump')}</p><button class="cta shoot" data-action="live-hero-release">${t('arcade.shoot')}</button>` : ''}
        <div class="row" ${state.heroShot ? 'hidden' : ''}>${m.options.map(o => `<button data-action="${m.type === 'lastShot' && o === 'hero' && v.mode === 'player' ? 'live-hero' : m.type === 'jm' && o === 'play' ? 'jm-open' : 'live-choice'}" data-choice="${esc(o)}" class="${o === CAA.Live.MOMENTS[m.type].fallback ? '' : 'primary'}">${t('live.opt.' + m.type + '.' + o + (m.type === 'lastShot' && v.mode === 'coach' && o !== 'auto' ? 'Coach' : ''))}</button>`).join('')}</div></div>` : '';
      const o = v.outcome;
      const outcomeHtml = v.finished && o ? `<div class="moment"><h4 class="${o.won ? 'ok' : 'bad'}">${t(o.won ? 'live.won' : 'live.lost')}</h4>
        <p>${t('live.consequences', { morale: (o.morale > 0 ? '+' : '') + o.morale, trust: (o.trust > 0 ? '+' : '') + o.trust, confidence: (o.confidence > 0 ? '+' : '') + o.confidence })}</p>
        <div class="row"><button data-action="career-play" class="primary">${t('live.closeWeek')}</button></div></div>` : '';
      const sp = ui.pb.speed;
      const speedBtn = (n, label, aria) => `<button class="speed${sp === n ? ' on' : ''}" data-action="live-speed" data-speed="${n}" aria-pressed="${sp === n}" aria-label="${aria}">${label}</button>`;
      const controls = v.finished ? '' : v.caught
        ? `<div class="row"><button data-action="live-end">${t('live.toEnd')}</button></div>`
        : `<div class="row speeds" role="group" aria-label="${t('live.speed')}">${speedBtn(0, '⏸', t('live.pause'))}${speedBtn(1, '▶', t('live.speedN', { n: 1 }))}${speedBtn(2, '▶▶', t('live.speedN', { n: 2 }))}${speedBtn(4, '▶▶▶', t('live.speedN', { n: 4 }))}<button data-action="live-skip">${t('live.skip')}</button><button data-action="live-end">${t('live.toEnd')}</button></div>`;
      return `<section class="panel live" id="live-panel" ${v.caught ? 'data-caught="1"' : ''} aria-labelledby="live-title"><h3 id="live-title"><i class="live-dot${v.finished ? ' off' : ''}" aria-hidden="true"></i>${t('live.title')}</h3>
        <div class="scoreboard tv"><div class="sb-team">${crest({ name: v.teams[me] }, 30)}<b>${esc(abbrOf(v.teams[me]))}</b><small>${esc(v.teams[me])}</small></div>
        <strong id="pb-score" role="status" aria-live="off">${v.score[me]} – ${v.score[opp]}</strong>
        <div class="sb-team">${crest({ name: v.teams[opp] }, 30)}<b>${esc(abbrOf(v.teams[opp]))}</b><small>${esc(v.teams[opp])}</small></div>
        <span class="sb-clock"><span id="pb-clock">${esc(v.periodLabel)} · ${clockText(v.clock)}</span> · ${t('live.timeouts')}: ${v.timeouts}</span></div>
        <div class="row view-tog" role="group" aria-label="${t('live.viewMode')}"><button class="speed${state.liveView !== '2d' ? ' on' : ''}" data-action="live-view" data-view="3d" aria-pressed="${state.liveView !== '2d'}">3D</button><button class="speed${state.liveView === '2d' ? ' on' : ''}" data-action="live-view" data-view="2d" aria-pressed="${state.liveView === '2d'}">${t('live.view2dShort')}</button></div>
        ${state.liveView === '2d' ? `<div class="tac" id="pb-tac">${tacticalSvg(raw)}</div><p id="live3d-cap" class="muted small">${esc(live3dCaption(raw))}</p>` : `<div class="live3d"><canvas id="live3d" role="img" aria-label="${t('live.view3d')}" aria-describedby="live3d-cap"></canvas><p id="live3d-cap" class="muted small">${esc(live3dCaption(raw))}</p></div>`}
        <div class="momentum" id="pb-mom" role="meter" aria-label="${t('live.momentum')}" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="${Math.round(v.momentum * 100)}" style="--mom:${v.momentum}"><span>${esc(v.teams[opp])}</span><i aria-hidden="true"></i><span>${esc(v.teams[me])}</span></div>
        ${controls}${momentHtml}${outcomeHtml}
        <details class="live-stats" open><summary>${t('live.statsTitle')}</summary><div id="pb-stats">${liveStatsHtml(v)}</div></details>
        <div class="grid"><div><h4 id="live-feed-title">${t('live.feed.title')}</h4><ol class="feed" id="pb-feed" reversed tabindex="0" aria-labelledby="live-feed-title">${liveFeedHtml(v)}</ol></div>
        <div class="table-scroll" tabindex="0"><table><caption class="muted">${t('live.top')}</caption><thead><tr><th>${t('live.col.player')}</th><th>PTS</th><th>REB</th><th>AST</th><th>PF</th></tr></thead><tbody id="pb-top">${liveTopHtml(v)}</tbody></table></div></div></section>`;
    }
    return { clockText, feedText, liveKeyIndex, live3dCaption, TAC_OFF, TAC_DEF, ZONE_PT, tacticalSvg, liveFx, drawLive3d, STAGED, PB_RATE, pbProfile, evAbs, absToClock, pbSync, pbSeq, pbCaught, pbCatchUp, shotPoints, pbView, pbTick, pbPaint, pbStart, pbStop, liveFeedHtml, liveStatsHtml, liveTopHtml, renderLive };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
