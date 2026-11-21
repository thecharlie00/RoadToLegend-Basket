(function (root) {
  'use strict';
  // Temporada Viva: foco de jornada, crónicas y trofeos con icono del historial.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["viva"] = function (ui) {
    const { esc, seasonLabel, t } = ui;
    // Trofeos de cada temporada con su icono (como el historial del fútbol): liga, final, copa, ascenso y premios.
    function seasonTrophies(h, st) {
      const out = [], my = st.clubId;
      if (h.champion === my) out.push({ k: 'gold', icon: '🏆', label: t('tro.league') });
      else if (h.result === 'final' || h.runnerUp === my) out.push({ k: 'silver', icon: '🥈', label: t('tro.final') });
      if (h.cupChampion ? h.cupChampion === my : h.cup && clubNameOf(st, my) === h.cup) out.push({ k: 'gold', icon: '🏅', label: t('tro.cup') });
      if ((h.promoted || []).includes(my)) out.push({ k: 'up', icon: '⬆', label: t('tro.promoted') });
      for (const a of h.myAwards || []) out.push({ k: 'award', icon: '⭐', label: t('award.' + a) });
      return out;
    }
    function clubNameOf(st, id) { const c = st.season && st.season.clubsById[id]; return c ? c.name : ''; }
    // ===== Temporada Viva: foco de jornada y crónicas de la propia partida =====
    function vivaFocusCard(s) {
      const f = s.viva && s.viva.focus; if (!f) return '';
      const vars = Object.assign({}, f, { names: (f.names || []).join(', '), where: t(f.home ? 'viva.home' : 'viva.away'), streak: f.streak > 1 ? t('viva.streakW', { n: f.streak }) : f.streak < -1 ? t('viva.streakL', { n: -f.streak }) : '' });
      return `<section class="card viva-focus" aria-labelledby="viva-focus-title"><div class="guide-head"><span class="tag">${t('viva.focus')}</span></div>
        <h3 id="viva-focus-title">${esc(t('viva.f.' + f.key + 'T', vars))}</h3><p class="muted">${esc(t('viva.f.' + f.key + 'B', vars))}</p>
        <button class="small-btn" data-tab-go="${esc(f.tab)}">${t('viva.f.' + f.key + 'Go')}</button></section>`;
    }
    function chronicleBody(ch) {
      if (ch.kind === 'block') return `<p>${esc(t('viva.block.' + ch.tone, { w: ch.w, l: ch.l, rank: ch.rank, teams: ch.teams }))}</p>${ch.gp != null ? `<p class="muted small">${esc(t('viva.blockMe', ch))}</p>` : ''}`;
      return `<ol class="viva-moments">${ch.moments.map(m => `<li><b>${t('viva.m.' + m.k)}</b> ${esc(t('viva.m.' + m.k + '.' + m.key, Object.assign({}, m, { result: t('sum.result.' + (m.result || 'none')), award: m.award ? t('award.' + m.award) : '' })))}</li>`).join('')}</ol>`;
    }
    function chronicleTitle(ch) { return ch.kind === 'block' ? t('viva.blockT' + ch.n, { season: seasonLabel(ch.year) }) : t('viva.seasonT', { season: seasonLabel(ch.year) }); }
    function vivaChronicleCard(s) {
      const ch = s.viva && s.viva.chronicle; if (!ch) return '';
      return `<section class="card viva-chronicle" aria-labelledby="viva-ch-title"><span class="eyebrow">${t('viva.chronicle')}</span><h3 id="viva-ch-title">${esc(chronicleTitle(ch))}</h3>${chronicleBody(ch)}
        <button class="small-btn" data-action="world-op" data-op="viva-seen">${t('viva.seen')}</button></section>`;
    }
    function chronicleArchive(s) {
      const list = s.viva && s.viva.archive; if (!list || !list.length) return '';
      return `<section class="card"><h3>${t('viva.archive')}</h3>${list.map(ch => `<details class="viva-arch"><summary>${esc(chronicleTitle(ch))}</summary>${chronicleBody(ch)}</details>`).join('')}</section>`;
    }
    return { seasonTrophies, clubNameOf, vivaFocusCard, chronicleBody, chronicleTitle, vivaChronicleCard, chronicleArchive };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
