(function (root) {
  'use strict';
  // Ayudas: tutorial de primera partida, recordatorios, versión nueva y valoración.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["assist"] = function (ui) {
    const { esc, hasCareer, render, state, t } = ui;
    // ===== Google Play: versión nueva y valoración (solo en la app de Android) =====
    function updateBar() {
      const code = CAA.PlayStore.updateAvailable(root);
      return code > 0 ? `<section class="card update-bar" role="status"><span class="ico" aria-hidden="true">${CAA.Icons.svg('fastForward')}</span><span><b>${t('upd.title')}</b><small class="muted">${t('upd.body')}</small></span><button class="small-btn primary" data-action="store-update">${t('upd.go')}</button></section>` : '';
    }
    function renderRate() {
      if (!state.rate) return '';
      return `<section id="rate" class="panel confirm" role="alertdialog" aria-modal="true" aria-labelledby="rate-title" aria-describedby="rate-body"><h2 id="rate-title">${t('rate.title')}</h2><p id="rate-body">${t('rate.body')}</p>
        <div class="row"><button id="rate-yes" class="cta" data-action="rate-yes">${t('rate.yes')}</button><button data-action="rate-later">${t('rate.later')}</button></div></section>`;
    }
    // Cuenta el juego activo cada 15 s; en Inicio, sin paneles abiertos, propone valorar cuando toca.
    function rateTick() {
      if (doc.hidden || state.screen !== 'game' || !hasCareer()) return;
      CAA.PlayStore.countPlay(15000);
      if (!state.rate && !state.busy && !state.confirm && !state.jmPanel && !coachStep() && state.tab === 'career' && CAA.PlayStore.rateDue(root)) { CAA.PlayStore.ratePrompted(); state.rate = true; render(); }
    }
    // ===== Recordatorios locales (solo app Android, desactivados por defecto) =====
    function armReminders() {
      if (!state.settings.reminders || !hasCareer() || !CAA.Reminders.available(root)) return;
      CAA.Reminders.schedule(root, CAA.Reminders.plan(state.career.summary, Date.now(), t));
    }
    // ===== Tutorial de primera partida: señala la pantalla real paso a paso =====
    function coachSteps() {
      const s = state.career.summary || {}, coach = !!s.squad;
      const steps = [{ id: 'welcome' }, { id: 'meters', sel: '.season', coach }];
      if (s.event) steps.push({ id: 'decision', sel: '.card.decision .stack' });
      steps.push({ id: 'play', sel: '.actionbar' }, { id: 'life', sel: '#tab-life', coach }, { id: 'league', sel: '#tab-league' }, { id: 'more', sel: '#tab-more' });
      return steps;
    }
    function coachStep() {
      if (!state.coach || state.screen !== 'game' || state.tab !== 'career' || !hasCareer()) return null;
      const steps = coachSteps(); return steps[Math.min(state.coach.step, steps.length - 1)];
    }
    function maybeStartCoach() {
      if (state.coach || state.coachPrompted || state.screen !== 'game' || state.tab !== 'career' || !hasCareer()) return;
      const s = state.career.summary; if (s.retirement || s.careerOver || (s.week || 0) > 0) return;
      state.coachPrompted = true;
      let done = false; try { done = root.localStorage.getItem('caa.tutorialDone') === '1'; } catch (_) {}
      if (!done) state.coach = { step: 0 };
    }
    function coachFinish() {
      state.coach = null;
      try { root.localStorage.setItem('caa.tutorialDone', '1'); if (hasCareer()) root.localStorage.setItem('caa.guideSkip.' + state.career.summary.careerId, '1'); } catch (_) {}
    }
    function coachAdvance(d) {
      const n = coachSteps().length; state.coach.step += d;
      if (state.coach.step >= n) coachFinish();
    }
    function renderCoach() {
      const st = coachStep(); if (!st) return '';
      const steps = coachSteps(), i = Math.min(state.coach.step, steps.length - 1), last = i === steps.length - 1;
      const k = 'tut.' + st.id + (st.coach ? 'Coach' : '');
      return `<div id="coach" class="coach${st.sel ? '' : ' center'}" data-sel="${esc(st.sel || '')}"><div class="coach-ring" aria-hidden="true"></div>
        <section class="coach-tip" role="dialog" aria-modal="true" aria-labelledby="coach-title" aria-describedby="coach-body">
        <div class="guide-head"><span class="eyebrow">${t('tut.kicker', { n: i + 1, total: steps.length })}</span>${last ? '' : `<button class="link" data-action="coach-skip">${t('tut.skip')}</button>`}</div>
        <div class="steps" aria-hidden="true">${steps.map((_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div>
        <h3 id="coach-title">${t(k + 'T')}</h3><p id="coach-body">${t(k + 'B')}</p>
        <div class="row"><button id="coach-next" class="cta" data-action="coach-next">${t(last ? 'tut.start' : 'tut.next')}</button></div></section></div>`;
    }
    function placeCoach() {
      const box = doc.getElementById('coach'); if (!box) return;
      const ring = box.querySelector('.coach-ring'), tip = box.querySelector('.coach-tip');
      const target = box.dataset.sel ? doc.querySelector(box.dataset.sel) : null;
      // Si el elemento vive dentro de un desplegable cerrado, se abre para poder señalarlo.
      for (let d = target && target.parentElement; d; d = d.parentElement) if (d.tagName === 'DETAILS' && !d.open) d.open = true;
      if (!target || !target.getClientRects().length) { box.classList.add('center'); ring.style.display = 'none'; return; }
      box.classList.remove('center'); ring.style.display = '';
      const fixed = !!target.closest('.dock');
      if (!fixed && target.scrollIntoView) target.scrollIntoView({ block: 'center', behavior: 'instant' });
      const r = target.getBoundingClientRect(), pad = 6, vh = root.innerHeight, vw = root.innerWidth;
      Object.assign(ring.style, { left: (r.left - pad) + 'px', top: (r.top - pad) + 'px', width: (r.width + pad * 2) + 'px', height: (r.height + pad * 2) + 'px' });
      const tw = Math.min(360, vw - 32), th = tip.offsetHeight || 180;
      const below = r.bottom + pad + 12 + th <= vh - 8;
      const top = below ? r.bottom + pad + 12 : Math.max(8, r.top - pad - 12 - th);
      const left = Math.max(16, Math.min(vw - tw - 16, r.left + r.width / 2 - tw / 2));
      Object.assign(tip.style, { top: top + 'px', left: left + 'px', width: tw + 'px' });
      tip.dataset.side = below ? 'below' : 'above';
    }
    return { updateBar, renderRate, rateTick, armReminders, coachSteps, coachStep, maybeStartCoach, coachFinish, coachAdvance, renderCoach, placeCoach };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
