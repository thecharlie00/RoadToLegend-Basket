(function (root) {
  'use strict';
  // Jugada Maestra, al estilo de los juegos de jugadas dibujadas: una historia de 30 jugadas (del instituto
  // a la final) con tres estrellas por jugada, vista 3D con cámara tras el balón, repetición de la jugada,
  // y el momento clave en los partidos de la carrera. Sin WebGL, la pizarra 2D de siempre.
  // Vista de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["jugada"] = function (ui) {
    const { acceptCareer, esc, haptic, render, state, t } = ui;
    const JM_MEDAL = n => '★'.repeat(n) + '☆'.repeat(3 - n);
    const VIEW_KEY = 'caa.jm.view';
    const SECONDS = [24, 18, 14, 10, 8, 5];
    function prefView() { try { return root.localStorage.getItem(VIEW_KEY) === '2d' ? '2d' : '3d'; } catch (_) { return '3d'; } }
    // Situación de cada jugada de la historia (marcador y segundos): sale del número de jugada, sin azar.
    function situation(l) {
      const s = SECONDS[(l.n - 1) % 6];
      if (l.chapter === 4) return t('jm.sit.three', { s });
      if (l.chapter === 5) return t('jm.sit.down1', { s });
      return t(['jm.sit.tie', 'jm.sit.down1', 'jm.sit.up1'][l.n % 3], { s });
    }
    function objectives(l, res) {
      const got = res ? res.stars : [false, false, false];
      const list = [t('jm.obj.score'), t('jm.obj.par', { n: CAA.Jugada.par(l.id) }), t('jm.obj.' + l.bonus)];
      return `<ol class="jm-objs">${list.map((x, i) => `<li class="${got[i] ? 'got' : ''}"><span class="jm-star" aria-hidden="true">${got[i] ? '★' : '☆'}</span>${esc(x)}${got[i] ? `<span class="sr-only"> · ${t('jm.done')}</span>` : ''}</li>`).join('')}</ol>`;
    }
    // ===== Historia (campaña) =====
    function renderJugadaCampaign() {
      const all = CAA.JugadaUI.medals(), levels = CAA.Jugada.levels();
      const stars = levels.reduce((a, l) => a + (all[l.id] || 0), 0);
      const chapters = CAA.Jugada.CHAPTERS.map((key, ci) => {
        const list = levels.filter(l => l.chapter === ci + 1), got = list.reduce((a, l) => a + (all[l.id] || 0), 0);
        return `<section class="card jm-chapter"><div class="guide-head"><h3><span class="eyebrow">${t('jm.chapterN', { n: ci + 1 })} · ${t('jm.stage.' + (ci + 1))}</span> ${t('jm.chapter.' + key)}</h3><span class="tag">${got}/18 ★</span></div>
          <p class="muted small">${t('jm.story.' + (ci + 1))}</p>
          <div class="jm-levels">${list.map(l => { const open = CAA.JugadaUI.unlocked(l.id, all), m = all[l.id] || 0;
            return `<button class="jm-level${m ? ' won' : ''}${m === 3 ? ' full' : ''}" data-action="jm-level" data-id="${l.id}" ${open ? '' : 'disabled'} aria-label="${esc(t('jm.levelLabel', { n: l.n, stars: m }) + (open ? '' : ' · ' + t('jm.locked')))}"><b>${l.n}</b><span aria-hidden="true">${open ? JM_MEDAL(m) : '🔒'}</span></button>`; }).join('')}</div></section>`;
      }).join('');
      return `<section class="card jm-hero"><span class="eyebrow">${t('jm.kicker')}</span><h2>${t('more.jugada')}</h2><p>${t('jm.intro')}</p>
        <p class="jm-total"><b>${stars}</b> / ${levels.length * 3} ★</p><p class="muted small">${t('jm.howTo')}</p></section>${chapters}`;
    }
    function jmPendingCard(live) {
      const m = live.moment;
      if (!m || m.type !== 'jm') return `<section class="card"><p>${t('live.started')}</p><button class="cta" data-action="career-play">${t('home.simulate')} ▶</button></section>`;
      return `<section class="card jm-pending" aria-labelledby="jm-pending-title"><span class="jm-kick">★ ${t('jm.kicker')}</span><h2 id="jm-pending-title">${t('jm.momentTitle')}</h2>
        <p>${t(m.needThree ? 'jm.matchGoalThree' : 'jm.matchGoal')}</p>
        <div class="row"><button class="cta" data-action="jm-open">${t('jm.playIt')}</button><button data-action="jm-auto">${t('jm.letTeam')}</button></div></section>`;
    }
    function jmBoardFromLive() { const lv = state.career.state && state.career.state.live; return lv && lv.moment && lv.moment.type === 'jm' ? lv : null; }
    async function jmQuickStart() {
      const s = state.career.summary;
      if (!s.jm || !s.jm.due || !s.next) return false;
      let res = await ui.worker.send('career.live', { state: state.career.state, start: true, quick: true });
      await acceptCareer(res);
      res = await ui.worker.send('career.live', { state: state.career.state, toJm: true });
      await acceptCareer(res);
      const lv = jmBoardFromLive();
      if (!lv) return false;
      jmOpen('sim', lv);
      return true;
    }
    let stamp = 0;
    function jmOpen(kind, lv) {
      const st = kind === 'level' ? CAA.Jugada.fresh(lv) : JSON.parse(JSON.stringify(lv.moment.board));
      state.jmPanel = { kind, id: kind === 'level' ? lv : 'match', st, start: JSON.parse(JSON.stringify(st)), actions: [], msg: '', anim: false, intro: true, stamp: ++stamp,
        view: CAA.Jugada3D && CAA.Jugada3D.supported() ? prefView() : '2d', needThree: kind === 'level' ? CAA.Jugada.level(lv).needThree : !!lv.moment.needThree };
      if (ui.audio) ui.audio.play('whistle');
    }
    const jmRound = a => Object.assign({}, a, a.path ? { path: a.path.slice(-40).map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]) } : {});
    function jmDo(raw) {
      const P = state.jmPanel; if (!P || P.anim || P.st.done || P.intro) return;
      const prev = JSON.parse(JSON.stringify(P.st));
      const action = jmRound(raw), r = CAA.Jugada.resolve(P.st, action);
      if (!r.ok) { P.msg = t('jm.msg.target'); render(); return; }
      P.actions.push(action);
      const entry = P.st.log.slice(prev.log.length).find(e => e.k !== 'cut') || P.st.log[P.st.log.length - 1];
      const cutNow = P.st.log.slice(prev.log.length).some(e => e.k === 'cut') && !P.st.done;
      P.msg = t(cutNow ? 'jm.msg.cut' : 'jm.msg.' + (entry ? entry.msg : r.msg), { pts: P.st.points });
      if (P.st.done && P.kind === 'level' && P.st.won) CAA.JugadaUI.saveMedal(P.id, CAA.Jugada.result(P.st).medal);
      P.anim = true; P.juice = entry;
      const done = () => { if (state.jmPanel === P) { P.anim = false; render(); } };
      if (P.view === '3d' && J3.view) { J3.view.play(prev, P.st, done); return; }
      CAA.JugadaUI.fly(doc.getElementById('jm-board'), entry, done);
    }
    function kits() {
      const lv = state.career.state && state.career.state.live, P = state.jmPanel;
      if (!P || P.kind === 'level' || !lv || !CAA.Crest) return null;
      const h = x => [parseInt(x.slice(1, 3), 16) / 255, parseInt(x.slice(3, 5), 16) / 255, parseInt(x.slice(5, 7), 16) / 255];
      const kitOf = name => { const c = CAA.Crest.colors({ name }); return { jersey: h(c[0]), shorts: h(c[0]).map(v => v * 0.7), alt: h(c[1]) }; };
      const me = lv.userTeam, names = lv.match.teams.map(x => x.name), a = kitOf(names[me]), b = kitOf(names[1 - me]);
      if (Math.hypot(...a.jersey.map((v, i) => v - b.jersey[i])) < 0.35) { b.jersey = [0.94, 0.93, 0.9]; b.shorts = [0.86, 0.85, 0.82]; }
      return [a, b];
    }
    function renderJm() {
      const P = state.jmPanel; if (!P) return '';
      const st = P.st, lvl = P.kind === 'level' ? CAA.Jugada.level(P.id) : null, res = CAA.Jugada.result(st);
      const title = lvl ? `${t('jm.stage.' + lvl.chapter)} · ${t('jm.playN', { n: lvl.n })}` : t('jm.momentTitle');
      const lvm = P.kind !== 'level' && state.career.state && state.career.state.live ? state.career.state.live.match : null;
      const scoreLine = lvm ? (() => { const me = state.career.state.live.userTeam, prof = CAA.Rules.getProfile(lvm.ruleSetId); return `<p class="jm-score"><b>${lvm.score[me]}–${lvm.score[1 - me]}</b> <span>${esc(lvm.teams[1 - me].name)} · ${esc(CAA.Rules.periodLabel(prof, lvm.period))} ${ui.clockText(lvm.gameClock)}</span></p>`; })() : '';
      const goal = lvl ? situation(lvl) : t(P.needThree ? 'jm.matchGoalThree' : 'jm.matchGoal');
      const meLine = st.players && st.players.some(p => p.me) ? `<p class="muted small">${t('jm.youAre', { name: st.players.find(p => p.me).name })}</p>` : '';
      const head = `<div class="jm-head"><span class="jm-kick">★ ${t('jm.kicker')}</span><h2 id="jm-title" tabindex="-1">${esc(title)}</h2>${scoreLine}<p id="jm-goal" class="jm-goal">${esc(goal)}</p>${meLine}</div>`;
      // Tarjeta previa: historia del capítulo, situación y las tres estrellas.
      if (P.intro) {
        const story = lvl && (lvl.n - 1) % 6 === 0 ? `<p class="jm-story">${t('jm.story.' + lvl.chapter)}</p>` : '';
        return `<div id="jm" class="jm-ov"><section class="jm-box jm-intro" role="dialog" aria-modal="true" aria-labelledby="jm-title" aria-describedby="jm-goal">${head}${story}
          ${lvl ? objectives(lvl, null) : `<p>${t('jm.howTo')}</p>`}
          <button class="cta" id="jm-go" data-action="jm-go">${t('jm.playBtn')} ▶</button>
          ${P.kind === 'level' ? `<button class="link" data-action="jm-close">${t('jm.close')}</button>` : `<button class="link" data-action="jm-auto">${t('jm.letTeam')}</button>`}</section></div>`;
      }
      const nameOf = i => st.players && st.players[i] ? st.players[i].name : t('jm.mate', { n: i + 1 });
      const tools = !st.done ? `<div class="jm-tools"><p class="muted small">${t('jm.howTo')}</p>
        <div class="jm-pass-list" role="group" aria-label="${t('jm.passTo')}">${st.mates.map(m => `<button class="small-btn" data-action="jm-act" data-k="pass" data-to="${m.i}">${t('jm.passBtn', { name: nameOf(m.i) })}</button>`).join('')}</div>
        <div class="row"><button data-action="jm-act" data-k="drive">${t('jm.driveBtn')}</button><button class="primary" data-action="jm-act" data-k="shot">${t('jm.shotBtn')}</button></div>
        ${P.kind !== 'level' && !P.actions.length ? `<button class="link" data-action="jm-auto">${t('jm.letTeam')}</button>` : ''}</div>` : '';
      const stars = lvl ? (st.done ? `<div class="jm-result ${st.won ? 'ok' : 'bad'}"><p class="jm-medal" aria-label="${esc(t('jm.medalLabel', { n: res.medal }))}">${[0, 1, 2].map(i => `<span class="jm-bigstar${res.stars[i] ? ' on' : ''}" style="--i:${i}" aria-hidden="true">★</span>`).join('')}</p>${objectives(lvl, res)}</div>` : `<div class="jm-objchips">${objectives(lvl, null)}</div>`) : '';
      const levels = CAA.Jugada.levels(), idx = lvl ? levels.findIndex(l => l.id === lvl.id) : -1, next = idx >= 0 && idx < levels.length - 1 ? levels[idx + 1] : null;
      const replay = st.done && P.view === '3d' && J3.view ? `<button data-action="jm-replay">⟲ ${t('jm.replay')}</button>` : '';
      const after = st.done ? (P.kind === 'level'
        ? `<div class="row">${st.won && next ? `<button class="cta" data-action="jm-level" data-id="${next.id}">${t('jm.next')} ▶</button>` : ''}<button class="${st.won ? '' : 'primary'}" data-action="jm-level" data-id="${P.id}">${t('jm.retry')}</button>${replay}<button class="link" data-action="jm-close">${t('jm.close')}</button></div>`
        : `<div class="row"><button class="cta" data-action="jm-finish">${t(P.kind === 'live' ? 'jm.backLive' : 'jm.backSim')} ▶</button>${replay}</div>`) : '';
      const can3d = CAA.Jugada3D && CAA.Jugada3D.supported();
      const board = P.view === '3d' ? `<div id="jm-board" class="jm-wrap jm3d-slot${st.done ? ' done' : ''}"><span class="jm-turn">${t('jm.actions', { n: st.turn, max: st.max })}</span></div>`
        : `<div id="jm-board" class="jm-wrap${st.done ? ' done' : ''}">${CAA.JugadaUI.svg(st, { t })}<span class="jm-turn">${t('jm.actions', { n: st.turn, max: st.max })}</span></div>`;
      return `<div id="jm" class="jm-ov"><section class="jm-box" role="dialog" aria-modal="true" aria-labelledby="jm-title" aria-describedby="jm-goal">${head}${!st.done ? stars : ''}
        ${board}${can3d ? `<button class="link jm-viewbtn" data-action="jm-view">${t(P.view === '3d' ? 'jm.view2d' : 'jm.view3d')}</button>` : ''}
        <p class="jm-status ${st.done ? (st.won || st.points ? 'ok' : 'bad') : ''}" id="jm-status" role="status" aria-live="polite">${esc(P.msg || t('jm.start'))}</p>
        ${st.done ? stars : ''}${tools}${after}${P.kind === 'level' && !st.done ? `<button class="link" data-action="jm-close">${t('jm.close')}</button>` : ''}</section></div>`;
    }
    // ===== Capa 3D persistente: vive fuera de #app para que los repintados no la destruyan =====
    const J3 = { view: null, layer: null, stamp: 0, shoutT: null };
    function j3Destroy() { if (J3.view) J3.view.destroy(); if (J3.layer && J3.layer.parentNode) J3.layer.parentNode.removeChild(J3.layer); J3.view = null; J3.layer = null; J3.stamp = 0; }
    function j3Place() {
      const slot = doc.getElementById('jm-board');
      if (!J3.layer || !slot) return;
      const r = slot.getBoundingClientRect();
      Object.assign(J3.layer.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
      J3.layer.hidden = r.bottom < 0 || r.top > root.innerHeight;
    }
    function j3Shout(e) {
      if (!J3.layer) return;
      const key = e.k === 'shot' ? (e.ok ? (e.dunk ? 'dunk' : e.points === 3 ? 'three' : 'made') : e.how) : e.msg;
      let el = J3.layer.querySelector('.jm3d-shout');
      if (!el) { el = doc.createElement('div'); el.className = 'jm3d-shout'; el.setAttribute('aria-hidden', 'true'); J3.layer.appendChild(el); }
      el.textContent = t('jm.shout.' + key); el.className = 'jm3d-shout on ' + (e.ok ? 'good' : 'bad');
      root.clearTimeout(J3.shoutT); J3.shoutT = root.setTimeout(() => { el.className = 'jm3d-shout'; }, 1500);
    }
    function j3Ensure(P) {
      const want = P && P.view === '3d' && !P.intro;
      if (!want) { j3Destroy(); return; }
      if (J3.view && J3.stamp === P.stamp) { j3Place(); return; }
      j3Destroy();
      const layer = doc.createElement('div'); layer.id = 'jm3d-layer'; layer.className = 'jm3d-layer';
      doc.body.appendChild(layer); J3.layer = layer; j3Place();
      const view = CAA.Jugada3D.mount(layer, { st: P.start, kits: kits(), women: ui.careerWomen ? ui.careerWomen() : false, onAction: a => jmDo(a), shout: j3Shout });
      if (!view) { j3Destroy(); P.view = '2d'; render(); return; }
      // Si la jugada ya iba avanzada (p. ej. al volver de la vista 2D), la escena salta a su estado actual.
      if (P.st.log.length) view.play(P.start, P.st, () => {});
      view.attach(); J3.view = view; J3.stamp = P.stamp;
    }
    let scrollBound = null;
    function jmAfterRender() {
      if (ui.jmUnbind) { ui.jmUnbind(); ui.jmUnbind = null; }
      const P = state.jmPanel;
      j3Ensure(P);
      if (!P) return;
      const ov = doc.getElementById('jm');
      if (ov && scrollBound !== ov) { ov.addEventListener('scroll', j3Place, { passive: true }); scrollBound = ov; }
      const host = doc.getElementById('jm-board');
      if (host && !P.anim && P.view !== '3d' && !P.intro) ui.jmUnbind = CAA.JugadaUI.bind(host, P.st, a => jmDo(a));
      const j = P.juice; P.juice = null;
      if (j && host && !P.anim) {
        const at = J3.layer || host.querySelector('.jm-hoop') || host;
        if (j.k === 'shot' && j.ok) {
          haptic('success'); if (ui.audio) ui.audio.play(j.dunk ? 'cheer' : 'swish');
          if (CAA.Juice) { CAA.Juice.burstAt(at, { count: j.points === 3 || j.dunk ? 30 : 18, colors: ['#ffb21e', '#fff3c4', '#ffffff'] }); if (P.kind !== 'level' || CAA.Jugada.result(P.st).medal === 3) CAA.Juice.confetti(0.5); }
          if (P.kind === 'level' && P.st.won && ui.audio) root.setTimeout(() => ui.audio.play('levelup'), 450);
        } else if (!j.ok) { haptic('fail'); if (ui.audio) ui.audio.play(j.k === 'shot' ? 'buzzer' : 'fail'); if (CAA.Juice && P.view !== '3d') CAA.Juice.shake(host, 0.5); }
        else if (ui.audio) ui.audio.play(j.k === 'pass' ? 'pop' : 'bounce');
      }
    }
    if (typeof root.addEventListener === 'function') root.addEventListener('resize', () => j3Place());
    // Los botones del tablero no pasan por action(): así la animación no se corta con un repintado.
    function jmActButton(el) {
      const P = state.jmPanel; if (!P) return;
      const k = el.dataset.k, st = P.st;
      if (k === 'pass') jmDo({ k: 'pass', to: Number(el.dataset.to) });
      else if (k === 'drive') { const H = CAA.Jugada.HOOP, d = CAA.Jugada.dist(st.ball, H) || 1, L = Math.min(16, d - 4); jmDo({ k: 'drive', path: [[st.ball[0] + (H[0] - st.ball[0]) / d * L, st.ball[1] + (H[1] - st.ball[1]) / d * L]] }); }
      else jmDo({ k: 'shot' });
    }
    async function jmAction(name, el) {
      const P = state.jmPanel;
      if (name === 'jm-level') { if (CAA.JugadaUI.unlocked(el.dataset.id)) jmOpen('level', el.dataset.id); return; }
      if (name === 'jm-close') { state.jmPanel = null; return; }
      if (name === 'jm-go') { if (P) P.intro = false; return; }
      if (name === 'jm-view') { if (P) { P.view = P.view === '3d' ? '2d' : '3d'; try { root.localStorage.setItem(VIEW_KEY, P.view); } catch (_) {} } return; }
      if (name === 'jm-replay') { if (P && J3.view && !P.anim) { P.anim = true; J3.view.replay(P.st, () => { if (state.jmPanel === P) { P.anim = false; render(); } }); } return; }
      if (name === 'jm-open') { const lv = jmBoardFromLive(); if (lv) jmOpen(lv.quick ? 'sim' : 'live', lv); return; }
      if (name === 'jm-act') { jmActButton(el); return; }
      const lv = state.career.state && state.career.state.live, kind = P ? P.kind : lv && lv.quick ? 'sim' : 'live';
      if (name === 'jm-finish' || name === 'jm-auto') {
        const play = name === 'jm-finish' && P && P.actions.length;
        const jm = { choice: play ? 'play' : 'auto', actions: play ? P.actions : [] };
        const res = kind === 'sim'
          ? await ui.worker.send('career.advance', { state: state.career.state, action: { type: 'play', jm } })
          : await ui.worker.send('career.live', { state: state.career.state, choice: jm.choice, jm: jm.actions });
        state.jmPanel = null;
        await acceptCareer(res);
        if (kind === 'sim') { state.tab = 'career'; if (ui.audio) ui.audio.play('whistle'); }
      }
    }
    // Para las pruebas de navegador: dónde cae en pantalla un punto de la jugada en la vista 3D.
    function jm3dClient(p) { return J3.view ? (p === 'rim' ? J3.view.rimClient() : J3.view.toClient(p)) : null; }
    return { JM_MEDAL, renderJugadaCampaign, jmPendingCard, jmBoardFromLive, jmQuickStart, jmOpen, jmRound, jmDo, renderJm, jmAfterRender, jmActButton, jmAction, jm3dClient };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
