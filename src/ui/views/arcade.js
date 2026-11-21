(function (root) {
  'use strict';
  // Minijuegos de tiro y tiro final del directo.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["arcade"] = function (ui) {
    const { acceptCareer, action, esc, haptic, notify, render, state, t } = ui;
    // Minijuegos: dificultad, retos semanales, concurso del All-Star y estadísticas (paridad con sp-modes del fútbol).
    function arcadeStat(life, g) { const st = life.arcade && life.arcade.stats && life.arcade.stats[g]; return st && st.plays ? ' · ' + t('arcade.stat', { avg: Math.round(st.sum / st.plays * 10) / 10, pct: st.rounds ? Math.round(st.hits / st.rounds * 100) : 0 }) : ''; }
    function arcadeExtras(life) {
      const d = state.arcadeDiff || 'normal', c = state.career.state, ch = (life.arcade && life.arcade.ch && life.arcade.ch.key === c.year + ':' + c.week ? life.arcade.ch.list : null) || CAA.Career.arcadeChallenges(JSON.parse(JSON.stringify(c)));
      const played = (life.arcade && life.arcade.contests) || {};
      const diff = `<div class="pick-grid three" role="group" aria-label="${t('arcade.diff')}">${['easy', 'normal', 'hard'].map(k => `<button class="pick" data-action="arcade-diff" data-diff="${k}" aria-pressed="${d === k}"><b>${t('arcade.diff.' + k)}</b></button>`).join('')}</div>`;
      const chHtml = `<ul class="news">${ch.map(x => `<li class="${x.done ? 'ok' : ''}">${x.done ? '✅' : '🎯'} ${esc(t('arcade.ch.' + x.type, { n: x.target }))}</li>`).join('')}</ul>`;
      const contest = CAA.Career.CONTEST_TYPES.map(g => { const r = played[c.year + ':' + g]; return `<button class="option center" data-action="arcade-start" data-game="${g}" data-contest="1" ${r ? 'disabled' : ''}><b>⭐ ${t('arcade.contest.' + g)}</b><small>${r ? t('arcade.contestDone', { place: r.place }) : t('arcade.contestDesc')}</small></button>`; }).join('');
      return `<p class="eyebrow">${t('arcade.diff')}</p>${diff}<p class="eyebrow">${t('arcade.chTitle')}</p>${chHtml}<p class="eyebrow">${t('arcade.allStar')}</p><div class="pick-grid">${contest}</div>`;
    }
    function renderArcade() {
      const a = state.arcade;
      if (!a) return `<section class="card"><p class="muted">${t('arcade.none')}</p></section>`;
      const g = CAA.Arcade.GAMES[a.type];
      const done = a.final;
      const scoreTxt = a.type === 'street' ? `${a.live.score} – ${a.live.opponent}` : a.type === 'dunk' ? (a.live.score ? a.live.score.toFixed(1) : '—') : a.live.score;
      const summary = done ? `<section class="card outcome ${done.record ? 'good' : ''}"><span class="eyebrow">${t('arcade.final')}</span><h2>${a.type === 'street' ? t(done.won ? 'arcade.streetWon' : 'arcade.streetLost', { a: done.score, b: done.opponent }) : t('arcade.score', { n: done.score })}</h2>
        ${done.record ? `<p class="ok"><b>${t('arcade.newRecord')}</b></p>` : done.previous != null ? `<p class="muted">${t('arcade.best', { n: done.previous })}</p>` : ''}
        <p class="muted small">${done.auto ? t('arcade.autoNote') : t('arcade.perfects', { n: done.perfects, streak: done.bestStreak })}</p>
        <span class="chips"><span class="chip up">+${done.rewards.style} ${t('effect.style')}</span><span class="chip up">+${done.rewards.xp} XP</span>${done.rewards.form ? `<span class="chip up">+1 ${t('effect.form')}</span>` : ''}</span>
        ${done.contest ? `<h3>${t('arcade.contestTable', { place: done.contest.place })}</h3><ol class="news">${[{ name: t('arcade.you'), score: done.score, me: true }].concat(done.contest.rivals).sort((x, y) => y.score - x.score).map(r => `<li class="${r.me ? 'ok' : ''}"><b>${esc(r.name)}</b>${r.club ? ` <small class="muted">${esc(r.club)}</small>` : ''} · ${r.score}</li>`).join('')}</ol><p class="small">${t('arcade.contestPrize', { style: done.contest.prize.style, cash: done.contest.prize.cash.toLocaleString(CAA.I18N.getLocale()) })}</p>` : ''}
        ${(done.challenges || []).map(x => `<p class="ok small">✅ ${esc(t('arcade.chDone', { ch: t('arcade.ch.' + x.type, { n: x.target }) }))}</p>`).join('')}
        <div class="row">${done.contest ? '' : `<button class="cta" data-action="arcade-start" data-game="${a.type}">${t('arcade.again')}</button>`}<button class="small-btn" data-tab="life">${t('arcade.back')}</button></div></section>` : '';
      return `<section class="card arcade"><div class="guide-head"><div><span class="eyebrow">${t('arcade.round', { n: Math.min(a.round + 1, g.rounds), total: g.rounds })}</span><h2>${t('arcade.' + a.type)}</h2></div><div class="arcade-score"><b>${scoreTxt}</b><small>${t('arcade.streak', { n: a.streak })}</small></div></div>
        <div class="arcade-stage${a.flash ? ' is-hot' : ''}">${state.arcade3dOff ? '' : '<canvas id="arcade3d" aria-hidden="true"></canvas>'}<canvas id="arcade-canvas" class="${state.arcade3dOff ? '' : 'hud'}" width="640" height="420" role="img" aria-label="${t('arcade.canvas', { game: t('arcade.' + a.type) })}" aria-describedby="arcade-help"></canvas></div>
        <p id="arcade-help" class="muted small"><b class="chip">${t('arcade.mech.' + g.mech)}</b> ${t('arcade.help.' + g.meter)}</p>
        <p class="sr-only" role="status" aria-live="polite">${esc(a.lastText || '')}</p>
        ${done ? '' : `<button class="cta shoot" data-action="arcade-release" ${a.phase !== 'aim' ? 'disabled' : ''}>${t(a.type === 'dunk' ? 'arcade.beat' : (a.type === 'defense' || (a.type === 'street' && a.round % 2 === 1)) ? 'arcade.defend' : 'arcade.shoot')}</button>`}
        </section>${summary}`;
    }
    function arcadeAttrs() { return state.career.state && state.career.state.player ? state.career.state.player.attrs : {}; }
    function arcadeBegin(pending) {
      state.arcade = { type: pending.type, seed: pending.seed, round: 0, ticks: [], results: [], streak: 0, phase: 'aim', aimStart: root.performance.now(), cueFired: false, anim: null, final: null, label: '', flash: 0,
        live: { score: 0, opponent: 0 } };
      state.tab = 'arcade';
    }
    function arcadeSpec() { const a = state.arcade; return CAA.Arcade.roundSpec(a.type, a.seed, a.round, a.streak); }
    function arcadeRelease(atTick) {
      const a = state.arcade; if (!a || a.phase !== 'aim') return;
      const tick = atTick != null ? Math.max(0, Math.round(atTick)) : Math.round((root.performance.now() - a.aimStart) / 1000 * CAA.Arcade.HZ);
      const r = CAA.Arcade.resolveRound(a.type, a.seed, a.round, tick, arcadeAttrs(), a.streak);
      a.ticks.push(tick); a.results.push(r);
      const tally = CAA.Arcade.play(a.type, a.seed, a.ticks, arcadeAttrs());
      a.live = { score: tally.score, opponent: tally.opponent || 0 };
      a.streak = r.made ? a.streak + 1 : 0;
      const def = a.type === 'defense' || (a.type === 'street' && !r.offense);
      a.label = a.type === 'dunk' ? r.judge.toFixed(1) : r.made ? t(def ? (a.type === 'defense' ? 'arcade.stop' : 'arcade.stopStreet') : r.perfect ? 'arcade.perfect' : 'arcade.made') : t(def ? 'arcade.beaten' : 'arcade.miss');
      a.labelGood = a.type === 'dunk' ? r.judge >= 8 : r.made;
      a.lastText = a.label;
      a.anim = { start: root.performance.now(), made: r.made, perfect: r.perfect };
      a.phase = 'flight'; a.flash = r.perfect || (a.type === 'dunk' && r.judge >= 9) ? 1 : 0;
      if (ui.audio) ui.audio.play(r.made ? (r.perfect ? 'success' : 'swish') : 'rim');
      if (CAA.Juice && r.made) { const cv = doc.getElementById('arcade3d') || doc.querySelector('.arcade canvas'); CAA.Juice.burstAt(cv, { count: r.perfect ? 34 : 12, colors: r.perfect ? ['#ffb21e', '#ffffff', '#ff5b66'] : ['#ffffff', '#5fb8ff'] }); if (r.perfect) CAA.Juice.floatText(t('juice.perfect'), cv, 'gold'); } haptic(r.made ? (r.perfect ? 'success' : 'tap') : 'fail');
      a.done = tally.complete;
      render(); arcadeSync();
      const wait = CAA.A11Y.reduced(state.settings) ? 350 : 900;
      root.setTimeout(() => arcadeNext(), wait);
    }
    async function arcadeNext() {
      const a = state.arcade; if (!a || a.phase !== 'flight') return;
      a.anim = null; a.label = ''; a.flash = 0;
      if (a.done) {
        a.phase = 'finishing'; render();
        try { const res = await ui.worker.send('career.arcade', { state: state.career.state, ticks: a.ticks }); await acceptCareer(res); a.final = res.arcade; a.phase = 'done'; if (ui.audio) ui.audio.play(res.arcade.record ? 'success' : 'buzzer'); }
        catch (err) { notify(t('status.error') + ': ' + err.message, true); a.phase = 'done'; }
      } else { a.round++; a.phase = 'aim'; a.cueFired = false; a.aimStart = root.performance.now(); }
      render(); arcadeSync();
    }
    function arcadeDraw(ts) {
      const a = state.arcade, canvas = doc.getElementById('arcade-canvas');
      if (!a || !canvas || state.tab !== 'arcade' || state.screen !== 'game') { ui.arcadeRaf = null; return; }
      const ctx = canvas.getContext('2d');
      const spec = arcadeSpec();
      const tick = a.phase === 'aim' ? Math.round((ts - a.aimStart) / 1000 * CAA.Arcade.HZ) : (a.ticks.length ? a.ticks[a.ticks.length - 1] : 0);
      // La bocina y el rival no esperan: si no sueltas a tiempo, el intento se pierde solo.
      if (a.phase === 'aim' && (spec.motion === 'rise' || spec.motion === 'react') && spec.deadlineTicks && tick > spec.deadlineTicks) { arcadeRelease(tick); return; }
      if (a.phase === 'aim' && spec.cueTick != null && tick >= spec.cueTick && !a.cueFired) { a.cueFired = true; haptic('tap'); if (ui.audio) ui.audio.play('click'); }
      const anim = a.anim ? { t: Math.min(1, (ts - a.anim.start) / (CAA.A11Y.reduced(state.settings) ? 1 : 700)), made: a.anim.made } : null;
      const s = state.career.summary, eq = s && s.life && s.life.equipment;
      const jerseyItem = eq && eq.jersey && CAA.Content.packs().shop.items.find(i => i.id === eq.jersey);
      const view = { type: a.type, round: a.round, phase: a.phase, spec, tick, cursor: CAA.Arcade.cursorAt(spec, tick), meterType: CAA.Arcade.GAMES[a.type].meter,
        onCue: spec.cueTick != null && tick >= spec.cueTick, clockText: String(Math.max(0, Math.ceil(24 * (1 - (tick % Math.max(1, spec.periodTicks)) / spec.periodTicks)))),
        text: { power: t('arcade.cue.power'), rack: t('arcade.cue.rack'), buzzer: t('arcade.cue.buzzer'), beat: t('arcade.cue.beat'), wait: t('arcade.cue.wait'), now: t('arcade.cue.now'), late: t('arcade.cue.late'), attack: t('arcade.cue.attack'), defend: t('arcade.cue.defend') },
        anim, now: ts, label: a.label, labelGood: a.labelGood, flash: a.flash ? Math.max(0, 1 - (ts - (a.anim ? a.anim.start : ts)) / 250) : 0, netKick: anim && anim.made && anim.t > 0.7 ? 1 - (anim.t - 0.7) / 0.3 : 0, hype: Math.min(1, 0.2 + a.streak / 4) };
      const opts = { colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, reducedMotion: CAA.A11Y.reduced(state.settings), jersey: jerseyItem ? jerseyItem.color : null };
      const gl = doc.getElementById('arcade3d');
      let drawn3d = false;
      if (gl && !state.arcade3dOff) {
        try {
          if (!ui.arcadeRenderer || ui.arcadeGlCanvas !== gl) { ui.arcadeGlCanvas = gl; ui.arcadeRenderer = CAA.Voxel.createRenderer(gl, { onContextLost: () => { state.arcade3dOff = true; ui.arcadeRenderer = null; render(); arcadeSync(); } }); }
          const g = CAA.Arcade3D.geometry(view, opts);
          drawn3d = ui.arcadeRenderer.draw(g.scene, g.camera);
        } catch (_) { state.arcade3dOff = true; ui.arcadeRenderer = null; root.setTimeout(() => { render(); arcadeSync(); }, 0); }
      }
      if (drawn3d) CAA.Arcade2D.hud(ctx, canvas.width, canvas.height, view, opts);
      else CAA.Arcade2D.draw(ctx, canvas.width, canvas.height, view, opts);
      if (a.phase === 'aim' || a.phase === 'flight') ui.arcadeRaf = root.requestAnimationFrame(arcadeDraw); else ui.arcadeRaf = null;
    }
    function arcadeSync() { if (ui.arcadeRaf != null) root.cancelAnimationFrame(ui.arcadeRaf); ui.arcadeRaf = null; if (state.arcade && state.tab === 'arcade' && !doc.hidden) ui.arcadeRaf = root.requestAnimationFrame(arcadeDraw); }
    function heroSpec() { return CAA.Arcade.roundSpec('buzzer', 'hero-view', 0, 0); }
    async function heroRelease() {
      const h = state.heroShot; if (!h || h.sent) return;
      h.sent = true;
      const tick = Math.round((root.performance.now() - h.aimStart) / 1000 * CAA.Arcade.HZ);
      if (ui.heroRaf != null) root.cancelAnimationFrame(ui.heroRaf); ui.heroRaf = null;
      state.heroShot = null;
      await action('live-choice', { dataset: { choice: 'hero', release: String(tick) } });
    }
    function heroDraw(ts) {
      const h = state.heroShot, canvas = doc.getElementById('hero-canvas');
      if (!h || !canvas) { ui.heroRaf = null; return; }
      const spec = heroSpec(), tick = Math.round((ts - h.aimStart) / 1000 * CAA.Arcade.HZ);
      if (tick > spec.periodTicks) { heroRelease(); return; } // la bocina no perdona: tiro automático
      CAA.Arcade2D.draw(canvas.getContext('2d'), canvas.width, canvas.height, { type: 'buzzer', round: 0, phase: 'aim', spec, tick, cursor: CAA.Arcade.cursorAt(spec, tick), meterType: 'jump', anim: null, now: ts, label: '', flash: 0, netKick: 0, hype: 1,
        text: { power: t('arcade.cue.power'), buzzer: t('arcade.cue.buzzer'), clock: t('arcade.cue.clock') } }, { colorMode: state.settings.colorMode });
      ui.heroRaf = root.requestAnimationFrame(heroDraw);
    }
    return { arcadeStat, arcadeExtras, renderArcade, arcadeAttrs, arcadeBegin, arcadeSpec, arcadeRelease, arcadeNext, arcadeDraw, arcadeSync, heroSpec, heroRelease, heroDraw };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
