(function (root) {
  'use strict';
  // Jugada Maestra: campaña de jugadas dibujadas y momento clave en los partidos.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["jugada"] = function (ui) {
    const { acceptCareer, esc, haptic, render, state, t } = ui;
    // ===== Jugada Maestra: campaña de jugadas dibujadas y momento clave en los partidos =====
    const JM_MEDAL = n => '★'.repeat(n) + '☆'.repeat(3 - n);
    function renderJugadaCampaign() {
      const all = CAA.JugadaUI.medals(), levels = CAA.Jugada.levels();
      const stars = levels.reduce((a, l) => a + (all[l.id] || 0), 0);
      const chapters = CAA.Jugada.CHAPTERS.map((key, ci) => {
        const list = levels.filter(l => l.chapter === ci + 1);
        return `<section class="card jm-chapter"><h3><span class="eyebrow">${t('jm.chapterN', { n: ci + 1 })}</span> ${t('jm.chapter.' + key)}</h3><p class="muted small">${t('jm.goal.' + key)}</p>
          <div class="jm-levels">${list.map(l => { const open = CAA.JugadaUI.unlocked(l.id, all), m = all[l.id] || 0;
            return `<button class="jm-level${m ? ' won' : ''}" data-action="jm-level" data-id="${l.id}" ${open ? '' : 'disabled'} aria-label="${esc(t('jm.levelLabel', { n: l.n, stars: m }) + (open ? '' : ' · ' + t('jm.locked')))}"><b>${l.n}</b><span aria-hidden="true">${open ? JM_MEDAL(m) : '🔒'}</span></button>`; }).join('')}</div></section>`;
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
    function jmOpen(kind, lv) {
      state.jmPanel = { kind, id: kind === 'level' ? lv : 'match', st: kind === 'level' ? CAA.Jugada.fresh(lv) : JSON.parse(JSON.stringify(lv.moment.board)), actions: [], msg: '', anim: false, needThree: kind === 'level' ? CAA.Jugada.level(lv).needThree : !!lv.moment.needThree };
      if (ui.audio) ui.audio.play('whistle');
    }
    const jmRound = a => Object.assign({}, a, a.path ? { path: a.path.slice(-40).map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10]) } : {});
    function jmDo(raw) {
      const P = state.jmPanel; if (!P || P.anim || P.st.done) return;
      const action = jmRound(raw), r = CAA.Jugada.resolve(P.st, action);
      if (!r.ok) { P.msg = t('jm.msg.target'); render(); return; }
      P.actions.push(action);
      const entry = P.st.log[P.st.log.length - 1];
      P.msg = t('jm.msg.' + (entry ? entry.msg : r.msg), { pts: P.st.points });
      if (P.st.done && P.kind === 'level' && P.st.won) CAA.JugadaUI.saveMedal(P.id, CAA.Jugada.result(P.st).medal);
      P.anim = true; P.juice = entry;
      const host = doc.getElementById('jm-board');
      CAA.JugadaUI.fly(host, entry, () => { if (state.jmPanel === P) { P.anim = false; render(); } });
    }
    function renderJm() {
      const P = state.jmPanel; if (!P) return '';
      const st = P.st, res = CAA.Jugada.result(st), lvl = P.kind === 'level' ? CAA.Jugada.level(P.id) : null;
      const title = lvl ? `${t('jm.chapter.' + lvl.chapterKey)} · ${t('jm.playN', { n: lvl.n })}` : t('jm.momentTitle');
      const goal = lvl ? t(lvl.needThree ? 'jm.goal.three' : 'jm.goal.' + lvl.chapterKey) + (lvl.needThree ? '' : '') : t(P.needThree ? 'jm.matchGoalThree' : 'jm.matchGoal');
      const nameOf = i => st.players && st.players[i] ? st.players[i].name : t('jm.mate', { n: i + 1 });
      const tools = !st.done ? `<div class="jm-tools"><p class="muted small">${t('jm.howTo')}</p>
        <div class="jm-pass-list" role="group" aria-label="${t('jm.passTo')}">${st.mates.map(m => `<button class="small-btn" data-action="jm-act" data-k="pass" data-to="${m.i}">${t('jm.passBtn', { name: nameOf(m.i) })}</button>`).join('')}</div>
        <div class="row"><button data-action="jm-act" data-k="drive">${t('jm.driveBtn')}</button><button class="primary" data-action="jm-act" data-k="shot">${t('jm.shotBtn')}</button></div>
        ${P.kind !== 'level' && !P.actions.length ? `<button class="link" data-action="jm-auto">${t('jm.letTeam')}</button>` : ''}</div>` : '';
      const medal = P.kind === 'level' && st.done ? `<p class="jm-medal ${st.won ? 'ok' : 'bad'}" aria-label="${esc(t('jm.medalLabel', { n: res.medal }))}">${JM_MEDAL(res.medal)}</p>` : '';
      const levels = CAA.Jugada.levels(), idx = lvl ? levels.findIndex(l => l.id === lvl.id) : -1, next = idx >= 0 && idx < levels.length - 1 ? levels[idx + 1] : null;
      const after = st.done ? (P.kind === 'level'
        ? `<div class="row">${st.won && next ? `<button class="cta" data-action="jm-level" data-id="${next.id}">${t('jm.next')} ▶</button>` : ''}<button class="${st.won ? '' : 'primary'}" data-action="jm-level" data-id="${P.id}">${t('jm.retry')}</button><button class="link" data-action="jm-close">${t('jm.close')}</button></div>`
        : `<button class="cta" data-action="jm-finish">${t(P.kind === 'live' ? 'jm.backLive' : 'jm.backSim')} ▶</button>`) : '';
      const meLine = st.players && st.players.some(p => p.me) ? `<p class="muted small">${t('jm.youAre', { name: st.players.find(p => p.me).name })}</p>` : '';
      const lvm = P.kind !== 'level' && state.career.state && state.career.state.live ? state.career.state.live.match : null;
      const scoreLine = lvm ? (() => { const me = state.career.state.live.userTeam, prof = CAA.Rules.getProfile(lvm.ruleSetId); return `<p class="jm-score"><b>${lvm.score[me]}–${lvm.score[1 - me]}</b> <span>${esc(lvm.teams[1 - me].name)} · ${esc(CAA.Rules.periodLabel(prof, lvm.period))} ${ui.clockText(lvm.gameClock)}</span></p>`; })() : '';
      return `<div id="jm" class="jm-ov"><section class="jm-box" role="dialog" aria-modal="true" aria-labelledby="jm-title" aria-describedby="jm-goal">
        <div class="jm-head"><span class="jm-kick">★ ${t('jm.kicker')}</span><h2 id="jm-title" tabindex="-1">${esc(title)}</h2>${scoreLine}<p id="jm-goal" class="jm-goal">${esc(goal)}</p>${meLine}</div>
        <div id="jm-board" class="jm-wrap${st.done ? ' done' : ''}">${CAA.JugadaUI.svg(st, { t })}<span class="jm-turn">${t('jm.actions', { n: st.turn, max: st.max })}</span></div>
        <p class="jm-status ${st.done ? (st.won || st.points ? 'ok' : 'bad') : ''}" id="jm-status" role="status" aria-live="polite">${esc(P.msg || t('jm.start'))}</p>
        ${medal}${tools}${after}${P.kind === 'level' && !st.done ? `<button class="link" data-action="jm-close">${t('jm.close')}</button>` : ''}</section></div>`;
    }
    function jmAfterRender() {
      if (ui.jmUnbind) { ui.jmUnbind(); ui.jmUnbind = null; }
      const P = state.jmPanel; if (!P) return;
      const host = doc.getElementById('jm-board');
      if (host && !P.anim) ui.jmUnbind = CAA.JugadaUI.bind(host, P.st, a => jmDo(a));
      const j = P.juice; P.juice = null;
      if (j && host && !P.anim) {
        const hoop = host.querySelector('.jm-hoop');
        if (j.k === 'shot' && j.ok) { haptic('success'); if (ui.audio) ui.audio.play('swish'); if (CAA.Juice && hoop) { CAA.Juice.burstAt(hoop, { count: j.points === 3 ? 30 : 18, colors: ['#ffb21e', '#fff3c4', '#ffffff'] }); CAA.Juice.floatText('+' + j.points, hoop, j.points === 3 ? 'gold' : 'good'); if (P.st.won && P.kind === 'level' && CAA.Jugada.result(P.st).medal === 3) CAA.Juice.confetti(0.5); } }
        else if (!j.ok) { haptic('fail'); if (ui.audio) ui.audio.play(j.k === 'shot' ? 'buzzer' : 'fail'); if (CAA.Juice) CAA.Juice.shake(host, 0.5); }
        else if (ui.audio) ui.audio.play(j.k === 'pass' ? 'pop' : 'bounce');
      }
    }
    // Los botones del tablero no pasan por action(): así el vuelo del balón no se corta con un repintado.
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
    return { JM_MEDAL, renderJugadaCampaign, jmPendingCard, jmBoardFromLive, jmQuickStart, jmOpen, jmRound, jmDo, renderJm, jmAfterRender, jmActButton, jmAction };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
