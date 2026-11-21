(function (root) {
  'use strict';
  // Modo Épocas: menú, banner, competiciones, momentos y álbum.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["era"] = function (ui) {
    const { esc, flag, hasCareer, state, t } = ui;
    function eraDefaultLeague() {
      const c = state.career; if (!c.eraYear) return;
      const L = CAA.Season.LEAGUES[c.leagueId];
      if (!L || L.gender !== c.gender || !CAA.Eras.available(L, c.eraYear)) { const first = CAA.Season.leagueList(c.gender).find(l => CAA.Eras.available(CAA.Season.LEAGUES[l.id], c.eraYear)); c.leagueId = first ? first.id : c.leagueId; }
      c.clubId = ''; c.clubsRoute = null;
    }
    function careerWomen() { const s = state.career.summary; return !!(s && s.league && s.league.gender === 'f'); }
    function eraYearNow() { const s = hasCareer() && state.career.summary; return s && s.era ? s.year : null; }
    function eraTraits(e) { const tr = e.traits; return [tr.shotClock ? t('era.clock', { n: tr.shotClock }) : t('era.noClock'), tr.three ? t('era.three') : t('era.noThree'), tr.quarters ? t('era.quarters') : t('era.halves')].join(' · '); }
    function eraBanner(s) { return s.era ? `<section class="card era-banner"><span class="eyebrow">${t('era.kicker', { decade: s.era.decade })}</span><p class="small">${esc(eraTraits(s.era))}</p></section>` : ''; }
    // ===== Modo Épocas: competiciones de época, Anuario, Momentos de leyenda, némesis y álbum =====
    const STAGE = st => st === 'champion' ? t('era.stage.champion') : st === 'final' ? t('era.stage.final') : t('era.stage.r', { n: String(st).slice(1) });
    function eraCompsCard(s) {
      const w = s.eraWorld; if (!w || !w.comps.length) return '';
      return `<section class="card era-comps"><span class="eyebrow">${t('era.compsKicker', { year: w.comps[0].year })}</span>${w.comps.map(c => `<h3>${c.stage === 'champion' ? '🏆 ' : ''}${t(c.nameKey)} · ${STAGE(c.stage)}</h3>
        ${c.rounds.map((r, k) => `<p class="eyebrow">${t('era.round', { n: k + 1 })}</p><ul class="news">${r.filter(g => g.mine || r.length <= 2).map(g => `<li class="${g.mine ? 'me' : ''}">${esc(g.a)} <b>${g.score[0]}–${g.score[1]}</b> ${esc(g.b)}</li>`).join('')}</ul>`).join('')}
        <p class="small">${t('era.compChampion', { club: esc(c.champion) })}${c.real ? ` · <span class="muted">${t('era.realChampion', { club: esc(c.real) })}</span>` : ''}${c.pts != null ? ` · ${t('era.compPts', { n: c.pts })}` : ''}</p>`).join('')}
        <button class="small-btn" data-action="world-op" data-op="era-comps-seen">${t('common.continue')}</button></section>`;
    }
    function eraMomentCard(s) {
      const m = s.eraWorld && s.eraWorld.lastMoment; if (!m) return '';
      return `<section class="card era-moment-res"><span class="eyebrow">${t('era.momentKicker')}</span><h3>${t('era.moment.' + m.kind)} · ${'★'.repeat(m.stars)}${'☆'.repeat(4 - m.stars)}</h3>
        <p><b>${m.score[0]}–${m.score[1]}</b> ${t('era.vs', { club: esc(m.opp) })}</p><ul class="news">${m.goals.map(g => `<li class="${g.ok ? 'ok' : 'bad'}">${g.ok ? '✔' : '✘'} ${t('era.goal.' + g.k, { n: g.k === 'oppUnder' ? Math.round(g.n * 100) : g.n })}</li>`).join('')}</ul>
        <button class="small-btn" data-action="world-op" data-op="era-moment-seen">${t('common.continue')}</button></section>`;
    }
    function eraCard(s) {
      if (!s.era) return '';
      const w = s.eraWorld || {}, nem = w.nemesis, al = w.album;
      const moments = (w.moments || []).map(m => `<li class="era-mo"><b>${t('era.moment.' + m.kind)}</b> <span class="stars" aria-label="${t('era.stars', { n: m.stars })}">${'★'.repeat(m.stars)}${'☆'.repeat(4 - m.stars)}</span><br><small class="muted">${t('era.moment.' + m.kind + 'Desc')}</small>
        <div class="row">${['run', 'defense', 'three'].filter(k => k !== 'three' || s.era.traits.three).map(k => `<button class="small-btn" data-action="world-op" data-op="era-moment" data-id="${esc(m.id)}" data-tactic="${k}">${t('era.tactic.' + k)}</button>`).join('')}</div></li>`).join('');
      const annual = (w.annual || []).map(a => `<tr><td>${a.year}</td><td>${esc(a.club || '')} <small class="muted">${a.rank ? a.rank + 'º' : ''}</small></td><td>${a.won ? '🏆 ' : ''}${esc(a.champion)}</td><td class="${a.diverged ? 'bad' : 'ok'}">${a.real ? esc(a.real) : '—'}</td></tr>`).join('');
      const cards = al ? al.cards.map(c => `<li class="sticker ${c.ok ? 'got' : ''}" title="${esc(t(c.hint, { name: c.name || '', kind: c.kind ? t('era.moment.' + c.kind) : '' }))}"><span>${c.ok ? (c.id.startsWith('legend') ? '⭐' : c.id.startsWith('moment') ? '🎬' : c.id.startsWith('comp') ? '🏆' : '📅') : '?'}</span><small>${esc(c.ok ? (c.name || t('album.c.' + c.id.split(':')[0] + (c.id.split(':')[1] && !c.name ? '.' + c.id.split(':')[1].replace(/^\d+s-/, '') : ''))) : t(c.hint, { name: c.name || '', kind: c.kind ? t('era.moment.' + c.kind) : '' }))}</small></li>`).join('') : '';
      return `<section class="card era-hub"><span class="eyebrow">${t('era.kicker', { decade: s.era.decade })}</span><h3>${t('era.d.' + s.era.decade)}</h3><p class="muted small">${t('era.d.' + s.era.decade + 'Desc')}</p><p class="small"><b>${esc(eraTraits(s.era))}</b></p>
        ${w.foreignLimit != null ? `<p class="small era-sign">🛂 ${t('era.foreignLimit', { n: w.foreignLimit })}</p>` : s.year >= 1996 && s.era.start < 1996 ? `<p class="small era-sign">⚖️ ${t('era.bosman')}</p>` : ''}
        ${w.upcoming && w.upcoming.length ? `<h4 class="eyebrow">${t('era.compsNow')}</h4><p class="small">${w.upcoming.map(c => esc(t(c.nameKey))).join(' · ')}</p>` : ''}
        ${w.palmares && w.palmares.length ? `<h4 class="eyebrow">${t('era.palmares')}</h4><p class="small">${w.palmares.map(p => `🏆 ${esc(t(p.nameKey))} ${p.year}`).join(' · ')}</p>` : ''}
        ${nem ? `<h4 class="eyebrow">${t('era.nemesis')}</h4><p class="small">⚔️ <b>${esc(nem.name)}</b> · ${esc(nem.club)} · ${t('era.nick.' + nem.nick)}<br>${t('era.duels', { w: nem.w, l: nem.l })}${nem.last ? ` · ${t('era.lastDuel', { year: nem.last.year, a: nem.last.score[0], b: nem.last.score[1] })}` : ''}</p>` : ''}
        ${s.era.legends && s.era.legends.length ? `<details><summary class="eyebrow">${t('era.legends')}</summary><ul class="news">${s.era.legends.map(l => `<li>⭐ <b>${esc(l.name)}</b> ${flag(l.nationality)} · ${l.pos} · ${l.ovr} <small class="muted">${t('era.nick.' + l.nick)} · ${esc(l.club)}</small></li>`).join('')}</ul></details>` : ''}
        <h4 class="eyebrow">${t('era.moments')}</h4><p class="muted small">${t('era.momentsHint')}</p><ul class="news era-moments">${moments}</ul>
        ${al ? `<details><summary class="eyebrow">${t('era.album', { decade: al.decade, got: al.got, total: al.total })}</summary><ul class="album">${cards}</ul></details>` : ''}
        <details><summary class="eyebrow">${t('era.annual', { d: w.diverged || 0, r: w.rewritten || 0 })}</summary>${annual ? `<div class="table-scroll compact" tabindex="0" role="region" aria-label="${t('era.annualTitle')}"><table><caption class="muted">${t('era.annualTitle')}</caption><thead><tr><th>${t('era.col.year')}</th><th>${t('era.col.you')}</th><th>${t('era.col.game')}</th><th>${t('era.col.real')}</th></tr></thead><tbody>${annual}</tbody></table></div>` : `<p class="muted small">${t('era.annualEmpty')}</p>`}<p class="muted small">${t('era.sourcesNote')}</p></details></section>`;
    }
    // ===== Menú del Modo Épocas (como el del fútbol): portada de la década, década, año exacto y tipo de carrera,
    // reglas de ese año, lo que pasó ese año en la historia real y tus carreras históricas guardadas. =====
    function renderEraMenu() {
      const em = state.eraMenu, E = CAA.Eras, W = CAA.EraWorld, y = em.year, dec = E.decadeOf(y), d0 = Number(dec.slice(0, 4));
      const years = []; for (let k = Math.max(1920, d0); k <= Math.min(2025, d0 + 9); k++) years.push(k);
      const fiba = E.traits(y, { ruleSet: 'FIBA-2026' }), na = E.traits(y, { ruleSet: 'NA-2026' }), women = state.career.gender === 'f';
      const tr = x => [x.shotClock ? t('era.clock', { n: x.shotClock }) : t('era.noClock'), x.three ? t('era.three') : t('era.noThree'), x.quarters ? t('era.quarters') : t('era.halves')];
      const es = CAA.Season.LEAGUES[women ? 'es-iberica-women' : 'es-iberica-men'] || CAA.Season.LEAGUES['es-iberica-men'];
      const comps = W ? W.compsFor(es, y).map(c => t(c.nameKey)) : [];
      const leagues = CAA.Season.leagueList(state.career.gender).filter(l => E.available(CAA.Season.LEAGUES[l.id], y)).length;
      const R = W ? W.REAL : {}, hist = women ? [['WNBA', R['na-boreal-women'] && R['na-boreal-women'][y]], [t('comp.euroLeagueW'), R['eu-cup-f'] && R['eu-cup-f'][y]]] : [['NBA', R['na-boreal-men'] && R['na-boreal-men'][y]], [t('eraMenu.spain'), R['es-iberica-men'] && R['es-iberica-men'][y]], [t('comp.euroCup'), R['eu-cup-m'] && R['eu-cup-m'][y]]];
      const mech = y < 1996 ? (y < 1980 ? t('eraMenu.foreign1') : t('eraMenu.foreign2')) : y < 2000 ? t('era.bosman') : '';
      const saves = Object.entries(eraIndexRead()).filter(([slot]) => state.slots.some(x => x.slot === slot));
      const tags = list => list.map(x => `<span class="era-tag">${esc(x)}</span>`).join('');
      return `<main id="panel" class="boot era-menu" data-era-decade="${dec}" tabindex="-1"><section class="era-dialog">
        <div class="era-cover" aria-hidden="true"><span class="era-cover-years">${d0} — ${Math.min(d0 + 9, 2025)}</span><span class="era-cover-decade">${t('era.d.' + dec)}</span><span class="era-cover-stamp">${y}</span></div>
        <p class="eyebrow era-kicker">${t('eraMenu.kicker')}</p><h1 class="boot-title small">${t('modes.eras')}</h1><p class="muted">${t('eraMenu.lead')}</p>
        <div class="era-grid">
          <label class="era-field">${t('eraMenu.decade')}<select id="era-decade">${E.DECADES.map(x => `<option value="${x.id}" ${x.id === dec ? 'selected' : ''}>${x.id}</option>`).join('')}</select></label>
          <label class="era-field">${t('eraMenu.year')}<select id="era-year">${years.map(k => `<option value="${k}" ${k === y ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
          <label class="era-field">${t('eraMenu.mode')}<select id="era-mode"><option value="player" ${em.mode !== 'coach' ? 'selected' : ''}>${t(state.career.gender === 'f' ? 'eraMenu.playerF' : 'eraMenu.player')}</option><option value="coach" ${em.mode === 'coach' ? 'selected' : ''}>${t('eraMenu.coach')}</option></select></label>
        </div>
        <div class="era-summary"><b>${t('eraMenu.rules', { year: y })}</b>
          <p class="small era-sub">${t('eraMenu.fiba')}</p><div class="era-tags">${tags(tr(fiba))}</div>
          <p class="small era-sub">${t('eraMenu.na')}</p><div class="era-tags">${tags(tr(na))}</div>
          ${mech ? `<p class="small"><b>${t('eraMenu.mech')}:</b> ${esc(mech)}</p>` : ''}
          <p class="small"><b>${t('eraMenu.comps')}:</b> ${comps.length ? esc(comps.join(' · ')) : t('eraMenu.noComps')}</p>
          <p class="small"><b>${t('eraMenu.leagues')}:</b> ${t('eraMenu.leaguesN', { n: leagues })} · <b>${t('eraMenu.tv')}:</b> ${t('eraMenu.look.' + E.look(y))}</p>
          <p class="muted small">${t('era.d.' + dec + 'Desc')}</p>
        </div>
        <div class="era-summary era-history"><b>${t('eraMenu.history', { year: y })}</b><ul class="news">${hist.map(([k, v]) => `<li>🏆 <b>${esc(k)}</b> · ${v ? esc(v) : `<span class="muted">${t('eraMenu.notPlayed')}</span>`}</li>`).join('')}</ul></div>
        <div class="era-actions"><button class="cta" data-action="era-start">${t('eraMenu.start', { year: y })}</button><button class="ghost-btn" data-action="era-back">${t('wiz.back')}</button><button class="ghost-btn" data-action="era-moments">${t('eraMenu.moments')}</button></div>
        <h3 class="era-h3">${t('eraMenu.saves')}</h3>${saves.length ? `<div class="era-saves">${saves.map(([slot, e]) => `<div class="era-save"><div><b>${esc(e.name || t('eraMenu.career'))}</b><small class="muted">${esc(e.decade || '')} · ${t('eraMenu.since', { y: e.start })} · ${esc(e.club || '')} · ${e.year}</small></div><button class="small-btn" data-action="era-load" data-slot="${esc(slot)}">${t('eraMenu.load')}</button></div>`).join('')}</div>` : `<p class="muted small">${t('eraMenu.noSaves')}</p>`}
      </section></main>`;
    }
    function eraIndexRead() { try { return JSON.parse(root.localStorage.getItem('caa.eraIndex') || '{}') || {}; } catch (_) { return {}; } }
    function eraIndexUpdate() {
      try {
        const st = state.career.state, sm = state.career.summary, idx = eraIndexRead();
        if (st && st.era && sm) idx[state.slot] = { name: sm.player ? sm.player.name : sm.coach ? sm.coach.name : '', decade: st.era.decade, start: st.era.start, year: st.year, club: sm.club ? sm.club.name : '', mode: st.mode };
        else delete idx[state.slot];
        root.localStorage.setItem('caa.eraIndex', JSON.stringify(idx));
      } catch (_) { /* conveniencia local: nunca bloquea el guardado */ }
    }
    return { eraDefaultLeague, careerWomen, eraYearNow, eraTraits, eraBanner, STAGE, eraCompsCard, eraMomentCard, eraCard, renderEraMenu, eraIndexRead, eraIndexUpdate };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
