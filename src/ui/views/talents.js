(function (root) {
  'use strict';
  // Talentos (RPG) del jugador y del entrenador: nivel, experiencia, puntos y árboles con el efecto
  // exacto de cada rango sobre los atributos de partido. Reasignar es gratis una vez por temporada.
  // Vista de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["talents"] = function (ui) {
    const { esc, hasCareer, state, t } = ui;
    const ICON = { shooting: '🎯', finishing: '💥', playmaking: '🧠', defense: '🛡️', athletic: '⚡', mind: '❄️', tactics: '📋', development: '🌱', leadership: '📣' };
    function fxText(p) {
      const parts = Object.entries(p.per).map(([k, v]) => `+${v} ${t('attr.' + k)}`);
      for (const [k, v] of Object.entries(p.extra || {})) parts.push(t('rpg.fx.' + k, { n: k === 'dev' || k === 'devAll' ? Math.round(v * 100) : v }));
      return parts.join(' · ') + (p.max > 1 ? ' ' + t('rpg.perRank') : '');
    }
    function lockText(c) {
      if (c.why === 'tree') return t('rpg.lock.tree', { n: c.need });
      if (c.why === 'level') return t('rpg.lock.level', { n: c.need });
      if (c.why === 'sigs') return t('rpg.lock.sigs', { n: c.need });
      if (c.why === 'max') return t('rpg.maxed');
      return t('rpg.lock.points');
    }
    // Tarjeta resumen para YO.
    function talentsCard(s) {
      const r = s.rpg; if (!r) return '';
      const pct = Math.round(r.xp / r.next * 100);
      return `<section class="card rpg-card"><div class="guide-head"><h3>⭐ ${t('rpg.title')}</h3><span class="tag ${r.points ? 'led' : ''}">${t('rpg.points', { n: r.points })}</span></div>
        <p><b>${t('rpg.level', { n: r.level })}</b>${r.level < r.levelMax ? ` · <span class="muted small">${t('rpg.xp', { xp: r.xp, next: r.next })}</span>` : ''}</p>
        <div class="rpg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${r.next}" aria-valuenow="${r.xp}" aria-label="${esc(t('rpg.xpLabel'))}"><i style="width:${pct}%"></i></div>
        ${r.ovrWith != null ? `<p class="small">${t('rpg.ovrWith', { base: r.ovrBase, with: r.ovrWith })}</p>` : ''}
        <button class="${r.points ? 'cta' : 'small-btn'}" data-tab="talents">${t('rpg.open')}</button></section>`;
    }
    function renderTalents() {
      if (!hasCareer()) return ui.renderHome();
      const s = state.career.summary, r = s.rpg; if (!r) return '';
      const coach = r.role === 'coach';
      const bonus = Object.entries(r.attrs);
      const trees = r.trees.map(tr => `<section class="card rpg-tree"><div class="guide-head"><h3>${ICON[tr.id] || '★'} ${t('rpg.tree.' + tr.id)}</h3><span class="tag">${t('rpg.spent', { n: tr.spent })}</span></div>
        <p class="muted small">${t('rpg.treeDesc.' + (coach ? 'c.' : 'p.') + tr.id)}</p>
        <ol class="rpg-perks">${tr.perks.map(p => {
          const full = p.rank >= p.max, can = p.can.ok;
          return `<li class="rpg-perk tier-${p.tier}${p.sig ? ' sig' : ''}${p.rank ? ' has' : ''}${full ? ' full' : ''}">
            <div><b>${p.sig ? '✦ ' : ''}${t('rpg.perk.' + p.id)}</b> <span class="rpg-pips" aria-label="${esc(t('rpg.rank', { n: p.rank, max: p.max }))}">${'●'.repeat(p.rank)}${'○'.repeat(p.max - p.rank)}</span>
              <small class="rpg-fx">${esc(fxText(p))}</small>${!can && !full ? `<small class="muted">🔒 ${esc(lockText(p.can))}</small>` : ''}</div>
            <button class="small-btn" data-action="talent-buy" data-id="${p.id}" ${can ? '' : 'disabled'} aria-label="${esc(t('rpg.buyLabel', { name: t('rpg.perk.' + p.id) }))}">${full ? '✓' : '+1'}</button></li>`; }).join('')}</ol></section>`).join('');
      return `<section class="card rpg-head"><span class="eyebrow">${t(coach ? 'rpg.kickerCoach' : 'rpg.kickerPlayer')}</span><h2>${t('rpg.title')}</h2>
          <p>${t(coach ? 'rpg.desc.coach' : 'rpg.desc.player')}</p>
          <div class="kv"><span>${t('rpg.levelK')}</span><b>${r.level}/${r.levelMax}</b><span>${t('rpg.pointsK')}</span><b>${r.points}</b><span>${t('rpg.sigsK')}</span><b>${r.sigs}/${r.sigMax}</b><span>${t('rpg.totalK')}</span><b>${r.total.toLocaleString(CAA.I18N.getLocale())}</b></div>
          <div class="rpg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${r.next}" aria-valuenow="${r.xp}" aria-label="${esc(t('rpg.xpLabel'))}"><i style="width:${Math.round(r.xp / r.next * 100)}%"></i></div>
          <p class="muted small">${t(coach ? 'rpg.howXp.coach' : 'rpg.howXp.player')}</p>
          ${r.ovrWith != null ? `<p>${t('rpg.ovrWith', { base: r.ovrBase, with: r.ovrWith })}</p>` : ''}
          <h4 class="eyebrow">${t(coach ? 'rpg.teamBonus' : 'rpg.bonusTitle')}</h4>
          <p class="small">${bonus.length ? bonus.map(([k, v]) => `<span class="chip">+${v} ${t('attr.' + k)}</span>`).join(' ') : t('rpg.noBonus')}</p>
          ${coach && (r.effects.dev || r.effects.devAll || r.effects.recover || r.effects.morale || r.effects.trust) ? `<p class="small">${[['dev', Math.round(r.effects.dev * 100)], ['devAll', Math.round(r.effects.devAll * 100)], ['recover', r.effects.recover], ['morale', r.effects.morale], ['trust', r.effects.trust], ['moraleFloor', r.effects.moraleFloor]].filter(x => x[1]).map(([k, v]) => `<span class="chip">${t('rpg.fx.' + k, { n: v })}</span>`).join(' ')}</p>` : ''}
          <p class="muted small">${t('rpg.cap', { n: r.cap })} ${t('rpg.rules', { lvl: r.sigLevel, max: r.sigMax })}</p>
          <div class="row"><button class="small-btn" data-action="talent-respec" ${r.respec ? '' : 'disabled'}>↺ ${t('rpg.respec')}</button><span class="muted small">${t(r.respec ? 'rpg.respecNote' : 'rpg.respecUsed')}</span></div></section>${trees}`;
    }
    return { talentsCard, renderTalents };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
