(function (root) {
  'use strict';
  // LIGA y MUNDO: clasificación, playoffs, noticias, copa y selección.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["league"] = function (ui) {
    const { crest, esc, flag, hasCareer, leagueLabel, leagueName, loc, nationName, seasonLabel, state, t, world } = ui;
    function renderWorld() {
      const cov = CAA.World.coverage(world);
      const rows = world.competitions.map(c => `<tr><td>${esc(c.displayName)}</td><td>${esc(c.referenceName)}</td><td>${esc(c.country)}</td><td>${esc(c.category)}</td><td>${esc(c.gender)}</td><td>${esc(c.ageGroup)}</td><td>${esc(c.season)}</td><td class="${c.sourceStatus === 'verified' ? 'ok' : 'muted'}">${esc(c.sourceStatus)}</td></tr>`).join('');
      return `<section class="panel"><h2>${t('world.title')}</h2><p class="muted">${t('world.target')} · ${t('world.status')}: ${esc(world.coverage.status)}</p>
      <div class="grid"><div>${t('world.total')}: <strong>${cov.total}</strong></div><div>${t('world.verified')}: <strong>${cov.byStatus.verified || 0}</strong></div><div>${t('world.pending')}: <strong>${cov.byStatus.pending || 0}</strong></div></div>
      <p class="muted">${t('world.note')}</p><div class="table-scroll" tabindex="0" role="region" aria-label="${t('table.scroll')}"><table><thead><tr><th>${t('world.name')}</th><th>${t('world.reference')}</th><th>${t('world.country')}</th><th>${t('world.category')}</th><th>${t('world.gender')}</th><th>${t('world.age')}</th><th>${t('world.season')}</th><th>${t('world.source')}</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
    }
    function renderBracket() {
      const st = state.career.state, b = st.season.playoffs;
      if (!b) return '';
      const name = id => { const c = st.season.clubsById[id]; return c ? c.name : '—'; };
      return `<section class="card"><h3>${t('po.bracket')}</h3>${b.rounds.map(r => `<h4 class="eyebrow">${t('po.round.' + r.name)}</h4><ul class="bracket">${r.series.map(x => `<li class="${x.a === st.clubId || x.b === st.clubId ? 'me' : ''}"><span class="${x.winner === x.a ? 'won' : ''}">${esc(name(x.a))}</span><b>${x.winsA}–${x.winsB}</b><span class="${x.winner === x.b ? 'won' : ''}">${esc(name(x.b))}</span></li>`).join('')}</ul>`).join('')}
        ${b.champion ? `<p class="ok"><b>🏆 ${esc(name(b.champion))}</b></p>` : ''}</section>`;
    }
    function renderLeague() {
      if (!hasCareer()) return ui.renderHome();
      const s = state.career.summary;
      const N = s.table.length, po = s.leagueId === 'na-boreal-men' ? 0 : Math.min(8, N - 2);
      const rows = s.table.map(r => `<tr class="${r.id === s.club.id ? 'me' : ''} ${po && r.rank <= po ? 'zone-po' : ''} ${po && r.rank > N - 2 && s.league && s.league.level ? 'zone-down' : ''}"><td class="num">${r.rank}</td><td class="team">${crest(r, 18)}<span>${esc(r.name)}</span></td><td class="num">${r.wins + r.losses}</td><td class="num">${r.wins}</td><td class="num">${r.losses}</td><td class="num">${r.diff > 0 ? '+' : ''}${r.diff}</td></tr>`).join('');
      return `<section class="card"><span class="eyebrow">${t('league.kicker', { season: seasonLabel(s.year) })}</span><h2>${esc(s.leagueName)}</h2>
        <div class="table-scroll compact" tabindex="0" role="region" aria-label="${t('league.table')}"><table><caption class="muted">${t('league.table')}</caption><thead><tr><th class="num">#</th><th>${t('league.team')}</th><th class="num">${t('league.gp')}</th><th class="num">${t('league.w')}</th><th class="num">${t('league.l')}</th><th class="num">${t('league.diff')}</th></tr></thead><tbody>${rows}</tbody></table></div></section>
        ${s.recent.length ? `<section class="card"><h3>${t('league.results')}</h3><ul class="news">${s.recent.map(r => `<li><span class="${r.won ? 'ok' : 'bad'}">${t(r.won ? 'home.w' : 'home.l')}</span> ${t('league.roundShort', { n: r.round })} · ${r.us}–${r.them} ${t(r.home ? 'home.vsHome' : 'home.vsAway', { team: r.opponent })}</li>`).join('')}</ul></section>` : ''}
        ${raceCard(s)}
        ${ui.eraCard(s)}
        ${ui.rivalCard(s)}
        ${cupCard(s)}
        ${renderBracket()}
        ${s.awards ? `<section class="card"><h3>${t('sum.awards')}</h3><ul class="news">${s.awards.map(a => `<li><b>${t('award.' + a.award)}</b> · ${esc(a.player)} <span class="muted small">(${esc(a.club)})</span></li>`).join('')}</ul></section>` : ''}
        ${renderWorldNews(s)}
        ${s.player ? `<section class="card"><h3>${t('league.otherWorld')}</h3><p class="muted small">${t('league.otherWorldDesc')}</p>
          ${s.pendingMove ? `<p class="ok small">${t('league.pendingMove', { club: esc(clubLabel(s.pendingMove)), league: esc(leagueName(s.pendingMove.leagueId)) })}</p>` : ''}
          ${ui.leaguePicker('crossing', s.league.gender, state.career.crossingLeague, [s.leagueId], s.era ? s.year : null, state.career.crossingCountry)}
          <button class="small-btn" data-action="career-crossing">${t('career.crossing')}</button></section>` : ''}
        ${tradeCard(s)}`;
    }
    // Carrera por los premios: el ranking en directo con la misma fórmula que decide el premio.
    function raceCard(s) {
      const r = s.awardRace; if (!r || !r.length) return '';
      const li = (x, gap) => `<li class="${x.mine ? 'me' : ''}${gap ? ' gap' : ''}"><b>${x.rank}.</b> ${esc(x.name)} <span class="muted small">${esc(x.club)} · ${t('race.ppg', { n: x.ppg })}</span></li>`;
      return `<section class="card race"><div class="guide-head"><h3>${t('race.title')}</h3><span class="tag">${t('race.round', { n: s.round })}</span></div>
        ${r.map(a => `<details ${a.award === 'mvp' ? 'open' : ''}><summary><b>${t('award.' + a.award)}</b>${a.top.some(x => x.mine) || a.me ? ` <span class="tag led">${t('race.you', { n: (a.top.find(x => x.mine) || a.me).rank })}</span>` : ''}</summary><ol class="race-list">${a.top.map(x => li(x)).join('')}${a.me ? li(a.me, true) : ''}</ol><p class="muted small">${t('race.how.' + a.award)}</p></details>`).join('')}
        <p class="muted small">${t('race.note')}</p></section>`;
    }
    // Pedir el traspaso: eliges club (de tu liga o de la liga elegida abajo) y ves el interés estimado.
    function tradeCard(s) {
      if (!s.player) return '';
      const st = state.career.state, req = s.life && s.life.tradeReq, used = req && req.year === s.year;
      const leagues = [s.leagueId].concat(state.career.crossingLeague && state.career.crossingLeague !== s.leagueId && CAA.Season.LEAGUES[state.career.crossingLeague] ? [state.career.crossingLeague] : []);
      const level = id => { const c = CAA.Career.tradeChance(st, id); return c >= 0.6 ? 'high' : c >= 0.3 ? 'mid' : 'low'; };
      const groups = leagues.map(id => `<optgroup label="${esc(leagueName(id))} · ${t('trade.interest.' + level(id))}">${CAA.Season.clubCatalog(id).filter(c => c.id !== s.club.id).map(c => `<option value="${esc(id + '|' + c.id)}">${esc(c.name)}</option>`).join('')}</optgroup>`).join('');
      return `<section class="card"><h3>${t('trade.title')}</h3><p class="muted small">${t('trade.desc')}</p>
        ${used ? `<p class="${req.accepted ? 'ok' : 'bad'} small">${t(req.accepted ? 'trade.yes' : 'trade.no', { club: esc(req.club) })}</p>` : `<label class="field"><span>${t('trade.pick')}</span><select id="trade-club">${groups}</select></label><button class="small-btn" data-action="trade-request">${t('trade.ask')}</button>`}
        <p class="muted small">${t('trade.rule')}</p></section>`;
    }
    function clubLabel(m) { const c = CAA.Season.clubCatalog(m.leagueId).find(x => x.id === m.clubId); return c ? c.name : m.clubId; }
    function renderWorldNews(s) {
      if (!s.world || !s.world.champions.length) return `<section class="card"><h3>${t('world.leagues')}</h3><p class="muted small">${t('world.leaguesEmpty', { n: Object.keys(CAA.Season.LEAGUES).length })}</p></section>`;
      const by = ui.CONTINENTS.map(c => { const rows = s.world.champions.filter(x => (CAA.Season.LEAGUES[x.leagueId] || {}).continent === c); return rows.length ? `<details><summary class="eyebrow">${t('continent.' + c)} · ${rows.length}</summary><ul class="news">${rows.map(x => `<li>🏆 <b>${esc(x.club)}</b> <small class="muted">${esc(leagueLabel(x.leagueId))}</small></li>`).join('')}</ul></details>` : ''; }).join('');
      return `<section class="card"><h3>${t('world.champions', { season: seasonLabel(s.world.year) })}</h3>${by}</section>`;
    }
    // ===== Selección (nat31) y copa =====
    const MEDAL = { gold: '🥇', silver: '🥈', bronze: '🥉' };
    function renderNational() {
      if (!hasCareer()) return ui.renderHome();
      const n = state.career.summary.national; if (!n) return ui.renderHome();
      const L = n.last;
      const games = L && L.games.length ? `<ul class="news">${L.games.map(g => `<li><span class="muted">${t('nat.stage.' + g.stage)}</span> ${flag(g.a)} ${esc(nationName(g.a))} ${g.score[0]}–${g.score[1]} ${esc(nationName(g.b))} ${flag(g.b)}${g.myPts != null ? ` · <b>${t('nat.myPts', { n: g.myPts })}</b>` : ''}</li>`).join('')}</ul>` : '';
      return `<section class="card"><span class="eyebrow">${t('nat.kicker')}</span><h2>${flag(n.country)} ${esc(nationName(n.country))}</h2>
        <p class="small">${n.eligible ? t('nat.called') : t('nat.notCalled', { n: n.threshold })}</p>
        <div class="statline"><span>${t('nat.caps')}</span><b>${n.caps}</b></div><div class="statline"><span>${t('nat.points')}</span><b>${n.points}</b></div>
        ${n.medals.length ? `<p class="medals">${n.medals.map(m => `<span title="${esc(t('nat.kind.' + m.kind) + ' ' + m.year)}">${MEDAL[m.medal]} ${m.year}</span>`).join(' ')}</p>` : `<p class="muted small">${t('nat.noMedals')}</p>`}
        ${n.next ? `<p class="small">${t('nat.next', { kind: t('nat.kind.' + n.next), year: state.career.summary.year + 1 })}</p>` : ''}</section>
        ${L ? `<section class="card"><h3>${t('nat.kind.' + L.kind)} ${L.year}</h3><p class="${['gold', 'silver', 'bronze'].includes(L.place) ? 'ok' : ''}">${!L.qualified ? t('nat.notQualified') : (MEDAL[L.place] || '') + ' ' + t('nat.place.' + L.place)}${L.mine ? '' : ' · ' + t('nat.watched')}</p>${L.gp ? `<p class="small">${t('nat.summary', { gp: L.gp, pts: L.pts })}</p>` : ''}${games}</section>` : ''}`;
    }
    function cupCard(s) {
      const c = s.cup; if (!c) return '';
      const nm = id => (s.table.find(r => r.id === id) || {}).name || id;
      return `<section class="card"><h3>🏆 ${esc(s.league && s.league.cup && s.league.cup !== '@generic' ? s.league.cup : t('cup.title'))}</h3><p class="${c.champion === s.club.id ? 'ok' : ''}">${t('cup.champion', { club: esc(c.championName) })}${c.mine !== 'out' ? ' · ' + t('cup.mine.' + c.mine) : ''}</p>
        <ul class="news">${c.rounds.map(r => r.games.map(g => `<li><span class="muted">${t('cup.' + r.name)}</span> ${esc(nm(g.a))} ${g.score[0]}–${g.score[1]} ${esc(nm(g.b))}</li>`).join('')).join('')}</ul></section>`;
    }
    // ===== Momentos históricos (eras-moments): finales reales para revivir con las reglas de su año =====
    function teamLabel(tm) { const l = loc(tm); return (/^(SU|YU)$/.test(tm.code) ? '🏀' : flag(tm.code)) + ' ' + esc(l); }
    return { renderBracket, renderLeague, clubLabel, renderWorldNews, renderWorld, MEDAL, renderNational, cupCard, teamLabel };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
