(function (root) {
  'use strict';
  // MÁS: menú, guía, historial, editor, momentos, club, mercado, partidas, laboratorio y ajustes.
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["more"] = function (ui) {
    const { crest, draft, esc, flag, hasCareer, leagueName, loc, payload, seasonLabel, state, t } = ui;
    function renderSave() {
      const occupied = state.slots.find(s => s.slot === state.slot);
      const preview = state.importPreview;
      return `<section class="panel"><h2>${t('save.title')}</h2><p class="muted">${t('save.backend')}: ${esc(ui.storage ? ui.storage.kind : '...')} · ${t('save.auto')}</p>
      ${ui.storage && !ui.storage.persistent ? `<p class="bad" role="alert">${t('save.memoryWarning')}</p>` : ''}
      <div class="row"><label for="slot">${t('save.slot')}<select id="slot">${Array.from({ length: 10 }, (_, i) => 'slot-' + (i + 1)).map(id => { const entry = state.slots.find(s => s.slot === id); return '<option value="' + id + '" ' + (id === state.slot ? 'selected' : '') + '>' + id + ' · ' + esc(entry ? entry.careerId : t('save.emptyShort')) + '</option>'; }).join('')}</select></label>
      <button data-action="career-save" ${!state.career.state ? 'disabled' : ''}>${t('career.save')}</button><button data-action="career-load" ${!occupied ? 'disabled' : ''}>${t('career.load')}</button><button data-action="save-delete" ${!occupied ? 'disabled' : ''} class="danger">${t('save.delete')}</button><button data-action="save-export" ${!occupied ? 'disabled' : ''}>${t('save.export')}</button></div>
      <p class="muted">${t('save.selected')}: ${esc(occupied ? occupied.careerId + ' · ' + occupied.updatedAt : t('save.empty'))}</p>
      <label for="save-file">${t('save.file')}<input id="save-file" type="file" accept=".json,application/json"></label>
      <label for="save-import">${t('save.import')}<textarea id="save-import" rows="5" spellcheck="false">${esc(state.importText)}</textarea></label>
      <div class="row"><button data-action="save-preview">${t('save.preview')}</button><button data-action="save-import" ${!preview ? 'disabled' : ''}>${t('save.importButton')}</button></div>
      ${preview ? `<div class="panel"><h3>${t('save.preview')}</h3><p>${esc(preview.careerId)} · ${preview.payload.career ? preview.payload.career.year + ' · ' + esc(preview.payload.career.mode) : t('save.legacy')}</p><p class="muted">${t('save.importTarget')} ${esc(state.slot)}${occupied ? ' · ' + t('save.overwriteWarning') : ''}</p></div>` : ''}
      <p class="${state.saveError ? 'bad' : 'muted'}">${esc(state.saveError || t('save.' + state.saveState))}</p></section>`;
    }
    function renderLab() {
      return `<section class="panel"><h2>${t('lab.title')}</h2><p class="muted">${t('lab.mode')}: ${esc(ui.worker ? ui.worker.getMode() : 'main')}</p>
      <div class="row"><button data-action="lab-ping">${t('lab.ping')}</button><button data-action="lab-rng">${t('lab.rng')}</button><button data-action="lab-clock">${t('lab.clock')}</button><button data-action="lab-hash">${t('lab.hash')}</button></div>
      <div class="row"><button data-action="lab-performance">${t('lab.performance')}</button><button data-action="lab-export">${t('lab.export')}</button></div><p class="muted">${t('lab.performanceNote')}</p><pre id="lab-result">${esc(state.lab || t('lab.result'))}</pre></section>`;
    }
    function matchKeys() { return state.match.result ? CAA.Voxel.keyPlays(state.match.result.state, 12) : []; }
    function currentPlay() {
      const m = state.match;
      if (!m.result) return null;
      const e = m.result.state.events[m.frame];
      if (!e) return null;
      const name = m.result.state.teams.flatMap(t => t.players).find(p => p.id === e.player);
      const profile = CAA.Rules.getProfile(m.result.state.ruleSetId);
      let key = (e.type === 'shot' || e.type === 'ft') ? 'match.event.' + e.type + (e.made ? 'Made' : 'Missed') : 'match.event.' + e.type;
      if (!payload.locales[CAA.I18N.getLocale()][key] && !payload.locales.es[key]) key = 'match.event.unknown';
      const score = CAA.Voxel.scoreAt(m.result.state, m.frame);
      return t(key, { player: name ? name.name : '—', points: e.points || 0, period: CAA.Rules.periodLabel(profile, e.period), clock: (e.clock / 10).toFixed(1) }) + ' · ' + score[0] + '–' + score[1];
    }
    function renderMatch() {
      const m = state.match;
      const profiles = CAA.Rules.listProfiles();
      const opts = profiles.map(id => `<option value="${id}" ${id === m.ruleSetId ? 'selected' : ''}>${id}</option>`).join('');
      let body = `<p class="muted">${t('match.empty')}</p>`;
      if (m.result) {
        const s = m.result.state;
        const box = m.result.box;
        const rows = box.map(team => `<h3>${esc(team.name)} · ${team.score}</h3><div class="table-scroll" tabindex="0" role="region" aria-label="${t('table.scroll')}"><table><thead><tr><th>${t('match.player')}</th><th>MIN</th><th>PTS</th><th>FG</th><th>3P</th><th>FT</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TOV</th><th>PF</th><th>+/-</th></tr></thead><tbody>${team.players.map(p => `<tr><td>${esc(p.name)}</td><td>${p.min}</td><td>${p.pts}</td><td>${p.fgm}-${p.fga}</td><td>${p['3pm']}-${p['3pa']}</td><td>${p.ftm}-${p.fta}</td><td>${p.orb + p.drb}</td><td>${p.ast}</td><td>${p.stl}</td><td>${p.blk}</td><td>${p.tov}</td><td>${p.pf}</td><td>${p.plusMinus}</td></tr>`).join('')}</tbody></table></div>`).join('');
        const plays = s.events.slice(-20).map(e => `<li>${esc(e.type)} · ${esc(e.player || e.team || '')} · Q${e.period} · ${(e.clock / 10).toFixed(1)}</li>`).join('');
        body = `<div class="grid"><div>${t('match.hash')}: <strong>${esc(s.hash)}</strong></div><div>${t('match.periods')}: <strong>${s.period}</strong></div><div>${t('match.ot')}: <strong>${s.overtimeCount}</strong></div><div>${t('match.valid')}: <strong class="${m.result.validation.ok ? 'ok' : 'muted'}">${m.result.validation.ok ? t('status.ok') : esc(m.result.validation.errors.join('; '))}</strong></div></div>
        <div class="row viewer-controls">
          <label for="match-view">${t('match.view')}<select id="match-view"><option value="2d" ${m.view === '2d' ? 'selected' : ''}>${t('match.view2d')}</option><option value="3d" ${m.view === '3d' ? 'selected' : ''}>${t('match.view3d')}</option></select></label>
          <label for="match-quality">${t('match.quality')}<select id="match-quality"><option value="low" ${m.quality === 'low' ? 'selected' : ''}>${t('match.qualityLow')}</option><option value="balanced" ${m.quality === 'balanced' ? 'selected' : ''}>${t('match.qualityBalanced')}</option></select></label>
          <label for="match-camera">${t('match.camera')}<select id="match-camera"><option value="broadcast" ${m.camera === 'broadcast' ? 'selected' : ''}>${t('match.cameraBroadcast')}</option><option value="sideline" ${m.camera === 'sideline' ? 'selected' : ''}>${t('match.cameraSideline')}</option></select></label>
        </div>
        <div class="viewer">${m.view === '3d' ? `<canvas id="court3d" width="640" height="360" role="img" aria-label="${t('match.court3d')}" aria-describedby="play-description"></canvas>` : `<canvas id="court2d" width="640" height="360" role="img" aria-label="${t('match.court')}" aria-describedby="play-description"></canvas>`}</div>
        <p id="play-description" class="play-description">${esc(currentPlay() || '')}</p>
        <div class="row"><button data-action="match-play" ${CAA.A11Y.reduced(state.settings) ? 'disabled' : ''}>${m.playing ? t('match.pause') : t('match.play')}</button><button data-action="match-step">${t('match.step')}</button><button data-action="match-key-prev">${t('match.previousKey')}</button><button data-action="match-key-next">${t('match.nextKey')}</button><span id="play-counter" class="muted">${t('match.frame')} ${m.frame + 1}/${s.events.length}</span></div>
        <label class="check-label"><input id="match-key-only" type="checkbox" ${m.keyOnly ? 'checked' : ''}>${t('match.keyOnly')}</label>
        ${m.view === '3d' ? `<p class="muted">${t('match.voxelNote')} ${t('match.lineupsNote')}</p>` : ''}${CAA.A11Y.reduced(state.settings) ? `<p class="muted">${t('match.reducedNote')}</p>` : ''}
        <details><summary>${t('match.keyPlays')} · ${matchKeys().length}</summary><ol class="key-list">${matchKeys().map(k => `<li><button data-action="match-key-jump" data-frame="${k.index}" ${m.frame === k.index ? 'aria-current="true"' : ''}>${esc(t('match.reason.' + k.reason))} · ${CAA.Rules.periodLabel(CAA.Rules.getProfile(s.ruleSetId), k.period)} · ${(k.clock / 10).toFixed(1)} · ${k.score[0]}–${k.score[1]}</button></li>`).join('')}</ol></details>
        ${rows}<details><summary>${t('match.plays')}</summary><ol>${plays}</ol></details>`;
      }
      let cal = '';
      if (m.calibration) {
        const c = m.calibration;
        cal = `<details open><summary>${t('match.calibration')}</summary><pre>${esc(JSON.stringify({ games: c.games, maxAbsDelta: c.maxAbsDelta, deltas: c.deltas, derived: c.derived }, null, 2))}</pre></details>`;
      }
      return `<section class="panel"><h2>${t('match.title')}</h2><p class="muted">${m.source === 'career' ? t('match.careerSource') : t('match.note')}</p>
      <div class="row"><label>${t('match.rules')}<select id="match-rules">${opts}</select></label><label>${t('match.seed')}<input id="match-seed" value="${esc(draft('match-seed', m.seed))}"></label>
      <button data-action="match-simulate">${t('match.simulate')}</button><button data-action="match-calibrate">${t('match.calibrate')}</button></div>${body}${cal}</section>`;
    }
    const GUIDE = ['career', 'week', 'live', 'decisions', 'minigames', 'pet', 'playoffs', 'coach', 'saves', 'a11y'];
    function renderGuide() {
      return `<section class="card"><h2>${t('guide.title')}</h2><p class="muted">${t('guide.intro')}</p>${hasCareer() ? `<button class="small-btn primary" data-action="coach-replay">${t('tut.replay')}</button>` : ''}${GUIDE.map(k => `<details><summary>${t('guide.s.' + k)}</summary><p>${t('guide.b.' + k)}</p></details>`).join('')}</section>`;
    }
    function recordsCard(s) {
      const R = s.records; if (!R) return '';
      const row = (scope, key) => R[scope] && R[scope][key] ? `<li><span class="muted">${t('rec.' + key)}</span> <b>${R[scope][key].v}</b> · ${esc(R[scope][key].name)}${R[scope][key].club ? ' <small class="muted">(' + esc(R[scope][key].club) + ')</small>' : ''} <small class="muted">${seasonLabel(R[scope][key].year)}</small></li>` : '';
      const lg = ['gamePts', 'gameReb', 'gameAst'].map(k => row('league', k)).join(''), cr = ['gamePts', 'gameReb', 'gameAst', 'seasonPts'].map(k => row('career', k)).join('');
      return `<section class="card"><h3>📈 ${t('rec.title')}</h3>${lg ? `<h4 class="eyebrow">${t('rec.league')}</h4><ul class="news">${lg}</ul>` : ''}${cr ? `<h4 class="eyebrow">${t('rec.career')}</h4><ul class="news">${cr}</ul>` : ''}</section>`;
    }
    function diaryCard(s) {
      if (!s.diary || !s.diary.length) return '';
      return `<section class="card"><h3>📓 ${t('diary.title')}</h3><ul class="news">${s.diary.map(d => `<li><small class="muted">${seasonLabel(d.year)} · ${t('diary.week', { n: d.week })}</small> ${esc(t('diary.' + d.key + (d.key === 'season' && d.champion ? 'Champ' : ''), { v: d.v, opp: d.opp || '', rank: d.rank }))}</li>`).join('')}</ul></section>`;
    }
    function renderHistory() {
      if (!hasCareer()) return ui.renderHome();
      const st = state.career.state, s = state.career.summary, life = s.life || { achievements: [], counters: {} };
      const c = life.counters || {};
      const rows = st.history.map(h => { const tro = ui.seasonTrophies(h, st); return `<tr><td>${seasonLabel(h.year)}</td><td>${esc(leagueName(h.leagueId))}</td><td>${h.clubRank}.º</td><td>${t('sum.result.' + (h.champion === st.clubId ? 'champion' : (h.promoted || []).includes(st.clubId) ? 'promoted' : (h.result || 'none')))}</td><td class="tro" ${tro.length ? `aria-label="${esc(tro.map(x => x.label).join(', '))}"` : ''}>${tro.length ? tro.map(x => `<span class="tro-i ${x.k}" title="${esc(x.label)}" aria-hidden="true">${x.icon}</span>`).join('') : '<span class="muted" aria-hidden="true">—</span>'}</td><td>${esc(h.championName || '')}</td></tr>`; }).join('');
      const mine = s.player ? (st.player.career.awards || []) : [];
      const kpi = [['titles', c.titles || 0], ['playoffApps', c.playoffApps || 0], ['awards', c.awards || 0], ['trophies', life.achievements.length]];
      return `<section class="card"><span class="eyebrow">${t('hof.kicker')}</span><h2>${esc(s.player ? s.player.name : s.coach.name)}</h2>
        <div class="statline">${kpi.map(([k, v]) => `<div><b>${v}</b><small>${t('hof.' + k)}</small></div>`).join('')}</div>
        ${s.player ? `<p class="muted small">${t('hof.totals', { gp: (st.player.career.totals || {}).gp || 0, pts: (st.player.career.totals || {}).pts || 0, reb: (st.player.career.totals || {}).reb || 0, ast: (st.player.career.totals || {}).ast || 0 })}</p>` : ''}</section>
        <section class="card"><h3>${t('hof.seasons')}</h3>${rows ? `<div class="table-scroll compact" tabindex="0" role="region" aria-label="${t('hof.seasons')}"><table><thead><tr><th>${t('hof.season')}</th><th>${t('hof.league')}</th><th>#</th><th>${t('hof.result')}</th><th>${t('hof.trophies')}</th><th>${t('hof.champion')}</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="muted">${t('hof.empty')}</p>`}</section>
        ${mine.length ? `<section class="card"><h3>${t('hof.myAwards')}</h3><ul class="news">${mine.map(a => `<li>🏆 <b>${t('award.' + a.award)}</b> · ${seasonLabel(a.year)}</li>`).join('')}</ul></section>` : ''}${ui.chronicleArchive(s)}${recordsCard(s)}${diaryCard(s)}`;
    }
    // ===== El club por dentro (club30): finanzas, pabellón, instalaciones y directiva =====
    function renderClub() {
      if (!hasCareer()) return ui.renderHome();
      const f = state.career.summary.clubFin; if (!f) return ui.renderHome();
      const money = n => Math.round(n).toLocaleString(CAA.I18N.getLocale()) + ' €';
      const fac = k => `<div class="gear-item"><span class="swatch lvl" aria-hidden="true">${f.fac[k]}</span><div class="gi-body"><b>${t('club.fac.' + k)}</b><small>${t('club.fac.' + k + 'Desc', { cap: f.capacity.toLocaleString(CAA.I18N.getLocale()) })}</small><small class="muted">${t('club.level', { n: f.fac[k] })}</small></div>
        <div class="gi-act">${f.costs[k] == null ? `<span class="tag">${t('club.max')}</span>` : `<button class="small-btn" data-action="club-op" data-op="upgrade" data-key="${k}" ${f.cash < f.costs[k] ? 'disabled' : ''}>⬆ ${money(f.costs[k])}</button>`}</div></div>`;
      const se = f.season, rep = f.lastReport;
      return `<section class="card"><span class="eyebrow">${f.founder && f.custom ? t('club.founded', { year: f.custom.founded }) : t('club.kicker')}</span><h2>${esc(state.career.summary.club.name)}</h2>
        <div class="statline"><span>${t('club.cash')}</span><b class="${f.cash < 0 ? 'bad' : ''}">${money(f.cash)}</b></div>
        <div class="statline"><span>${t('club.fans')}</span><b>${f.fans}/100</b></div>
        ${f.objective ? `<p class="small">${t('club.objective', { n: f.objective.target })}</p>` : ''}${f.warnings ? `<p class="bad small">${t('club.ffp')}</p>` : ''}</section>
        <section class="card"><h3>${t('club.tickets')}</h3><div class="pick-grid three" role="group" aria-label="${t('club.tickets')}">${f.prices.map((p, i) => `<button class="pick" data-action="club-op" data-op="ticket" data-value="${i}" aria-pressed="${f.ticket === i}"><b>${t('club.price.' + p)}</b><small>${t('club.price.' + p + 'Desc')}</small></button>`).join('')}</div></section>
        <section class="card"><h3>${t('club.facilities')}</h3><div class="gear-list">${['arena', 'training', 'youth', 'medical'].map(fac).join('')}</div></section>
        <section class="card"><h3>${t('club.season')}</h3><ul class="news">${['ticket', 'tv', 'sponsor', 'prize'].map(k => `<li>＋ ${t('club.in.' + k)} <b>${money(se[k])}</b></li>`).join('')}${['wages', 'upkeep', 'works'].map(k => `<li>− ${t('club.out.' + k)} <b>${money(se[k])}</b></li>`).join('')}</ul>
        ${f.log.length ? `<p class="muted small">${t('club.lastWeek', { net: money(f.log[f.log.length - 1].net), att: f.log[f.log.length - 1].attendance.toLocaleString(CAA.I18N.getLocale()) })}</p>` : ''}</section>
        ${rep ? `<section class="card"><h3>${t('club.report')}</h3><p class="${rep.met ? 'ok' : 'bad'}">${t(rep.met ? 'club.met' : 'club.missed', { rank: rep.rank, target: rep.target })}</p>${rep.youth.length ? `<p class="small">${t('club.youth', { list: rep.youth.map(y => y.name + ' (' + y.pos + ', ' + y.ovr + ')').join(', ') })}</p>` : ''}</section>` : ''}`;
    }
    // ===== Mercado y cuerpo técnico (market26 / mgr-plus) =====
    function renderMarket() {
      if (!hasCareer()) return ui.renderHome();
      const m = state.career.summary.transfers, f = state.career.summary.clubFin; if (!m || !f) return ui.renderHome();
      const money = n => Math.round(n).toLocaleString(CAA.I18N.getLocale()) + ' €';
      const full = m.roster.length >= 15, short = m.roster.length <= 10;
      const staff = r => `<div class="gear-item"><span class="swatch lvl" aria-hidden="true">${m.staff[r]}</span><div class="gi-body"><b>${t('mkt.role.' + r)}</b><small>${t('mkt.role.' + r + 'Desc')}</small><small class="muted">${t('mkt.wage', { v: money(m.wages[m.staff[r]]) })}</small></div>
        <div class="gi-act">${m.staff[r] < 3 ? `<button class="small-btn" data-action="mkt-op" data-op="staff" data-role="${r}" data-level="${m.staff[r] + 1}" ${f.cash < m.wages[m.staff[r] + 1] * 0.25 ? 'disabled' : ''}>⬆ ${money(m.wages[m.staff[r] + 1] * 0.25)}</button>` : `<span class="tag">${t('club.max')}</span>`}${m.staff[r] > 0 ? `<button class="small-btn ghost" data-action="mkt-op" data-op="staff" data-role="${r}" data-level="${m.staff[r] - 1}" aria-label="${t('mkt.down')}: ${t('mkt.role.' + r)}">⬇</button>` : ''}</div></div>`;
      const cand = x => `<li>${ui.face({ id: x.id, name: x.name, nationality: x.nat, gender: x.gender, age: x.age })} <b>${esc(x.name)}</b> ${flag(x.nat)} · ${x.pos} · ${t('mkt.ovr', { n: x.ovr })} · ${t('mkt.age', { n: x.age })}<br><small class="muted">${t('mkt.salary', { v: money(x.salary) })} · ${x.free ? t('mkt.free') : t('mkt.fee', { v: money(x.fee) })}</small>
        <button class="small-btn" data-action="mkt-op" data-op="sign" data-id="${esc(x.id)}" ${!m.open || full || f.cash < x.fee ? 'disabled' : ''}>${t('mkt.sign')}</button></li>`;
      const mine = p => `<li>${ui.face(p)} <b>${esc(p.name)}</b> · ${p.pos} · ${t('mkt.ovr', { n: p.ovr })} · ${t('mkt.age', { n: p.age })} <small class="muted">${t('mkt.salary', { v: money(p.salary) })}</small>
        <button class="small-btn ghost" data-action="mkt-op" data-op="release" data-id="${esc(p.id)}" ${short ? 'disabled' : ''} aria-label="${t('mkt.release')}: ${esc(p.name)}">${t('mkt.release')}</button></li>`;
      return `<section class="card"><span class="eyebrow">${t('mkt.kicker')}</span><h2>${t('mkt.title')}</h2>
        <div class="statline"><span>${t('club.cash')}</span><b class="${f.cash < 0 ? 'bad' : ''}">${money(f.cash)}</b></div>
        <p class="small ${m.open ? 'ok' : 'muted'}">${t(m.open ? 'mkt.open' : 'mkt.closed')}</p><p class="muted small">${t('mkt.rosterN', { n: m.roster.length })}</p></section>
        <section class="card"><h3>${t('mkt.available')}</h3><ul class="news mkt">${m.list.map(cand).join('')}</ul></section>
        <section class="card"><h3>${t('mkt.staff')}</h3><div class="gear-list">${['assistant', 'physio', 'scout'].map(staff).join('')}</div></section>
        <section class="card"><h3>${t('mkt.roster')}</h3><p class="muted small">${t('mkt.releaseNote')}</p><ul class="news mkt">${m.roster.slice().sort((a, b) => b.ovr - a.ovr).map(mine).join('')}</ul></section>`;
    }
    // ===== Editor (edit35) =====
    function renderEditor() {
      if (!hasCareer()) return ui.renderHome();
      const s = state.career.summary;
      return `<section class="card"><span class="eyebrow">${t('ed.kicker')}</span><h2>${t('more.editor')}</h2><p class="muted small">${t('ed.desc')}</p>
        <label for="ed-league">${t('ed.league')}<input id="ed-league" maxlength="30" value="${esc(draft('ed-league', s.leagueName))}"></label><button class="small-btn" data-action="ed-save" data-op="league" data-id="${esc(s.leagueId)}" data-input="ed-league">${t('ed.save')}</button></section>
        <section class="card"><h3>${t('ed.clubs')}</h3><div class="stack">${s.table.map((r, i) => `<div class="ed-row"><label for="ed-c${i}" class="sr-only">${esc(r.name)}</label><input id="ed-c${i}" maxlength="30" value="${esc(draft('ed-c' + i, r.name))}"><button class="small-btn" data-action="ed-save" data-op="club" data-id="${esc(r.id)}" data-input="ed-c${i}">${t('ed.save')}</button></div>`).join('')}</div>
        <button class="ghost-btn" data-action="ed-save" data-op="reset">${t('ed.reset')}</button></section>`;
    }
    function renderMoments() {
      const M = CAA.Moments.MOMENTS, sel = state.moment;
      const cur = sel && M.find(m => m.id === sel.id);
      const pick = (field, value, label) => `<button class="pick" data-action="moment-set" data-field="${field}" data-value="${value}" aria-pressed="${String(sel && sel[field]) === String(value)}"><b>${label}</b></button>`;
      const detail = cur ? `<section class="card"><span class="eyebrow">${t('nat.kind.' + cur.kind)} · ${cur.year}${cur.gender === 'f' ? ' · ' + t('modes.women') : ''}</span><h2>${ui.teamLabel(cur.teams[0])} – ${ui.teamLabel(cur.teams[1])}</h2>
        <p class="small">${esc(loc(cur.fact))}</p><p class="muted small">${t('mom.realScore', { a: cur.score[0], b: cur.score[1] })}</p>
        <h3 class="eyebrow">${t('mom.side')}</h3><div class="pick-grid two">${pick('side', 0, ui.teamLabel(cur.teams[0]))}${pick('side', 1, ui.teamLabel(cur.teams[1]))}</div>
        <h3 class="eyebrow">${t('mom.tactic')}</h3><div class="pick-grid three">${['slow', 'normal', 'fast'].map(k => pick('tactic', k, t('mom.tactic.' + k))).join('')}</div>
        <button class="cta" data-action="moment-play">${t('mom.play')} ▶</button>
        ${sel.result ? `<div class="moment"><h4 class="${sel.result.won ? 'ok' : 'bad'}">${ui.teamLabel(cur.teams[0])} ${sel.result.score[0]} – ${sel.result.score[1]} ${ui.teamLabel(cur.teams[1])}</h4>
          <p><b>${t(sel.result.changed ? 'mom.changed' : 'mom.same')}</b></p><p class="muted small">${t('mom.top')}: ${sel.result.top.map(x => esc(x.name) + ' ' + x.pts).join(' · ')}</p></div>` : ''}</section>` : '';
      const decades = Array.from(new Set(M.map(m => Math.floor(m.year / 10) * 10)));
      return `${detail}<section class="card"><span class="eyebrow">${t('mom.kicker')}</span><h2>${t('more.moments')}</h2><p class="muted small">${t('mom.desc')}</p>
        ${decades.map(d => `<h4 class="eyebrow">${d}s</h4><div class="stack">${M.filter(m => Math.floor(m.year / 10) * 10 === d).map(m => `<button class="row-link" data-action="moment-open" data-id="${m.id}"><span class="ico" aria-hidden="true">📼</span><span><b>${m.year} · ${t('nat.kind.' + m.kind)}${m.gender === 'f' ? ' · ' + t('modes.women') : ''}</b><small>${ui.teamLabel(m.teams[0])} – ${ui.teamLabel(m.teams[1])}</small></span><span aria-hidden="true">›</span></button>`).join('')}</div>`).join('')}</section>`;
    }
    function renderMore() {
      const s = hasCareer() ? state.career.summary : null;
      const ico = { jugada: 'ball', editor: 'edit', market: 'handshake', club: 'arena', shop: 'bag', look: 'palette', national: 'trophy', moments: 'film', history: 'hall', guide: 'book', world: 'globe', match: 'ball', save: 'save', settings: 'gear', lab: 'flask' };
      const tile = (tab) => `<button class="tile" data-tab="${tab}" id="more-${tab}" aria-label="${esc(t('more.' + tab) + ': ' + t('more.' + tab + 'Sub'))}"><span class="ico" aria-hidden="true">${CAA.Icons.svg(ico[tab] || 'ball')}</span><b>${t('more.' + tab)}</b></button>`;
      const group = (title, tabs) => `<section class="more-group"><h3 class="eyebrow">${title}</h3><div class="tiles">${tabs.filter(Boolean).map(tile).join('')}</div></section>`;
      const club = [s ? 'editor' : '', s && s.transfers ? 'market' : '', s && s.clubFin ? 'club' : '', s ? 'shop' : '', s ? 'look' : '', s && s.national ? 'national' : ''];
      const systemTabs = ['jugada', 'moments', 'history', 'guide', 'world', 'match', 'save', 'settings', 'lab'];
      const quick = s && s.club ? `<section class="card more-hero"><div class="mh-id">${crest(s.club, 34)}<div><b>${esc(s.player ? s.player.name : s.coach.name)}</b><small class="muted">${esc(s.club.name)} · ${esc(s.leagueName)}</small></div></div>
        <div class="more-stats"><div><b>${s.week}</b><small>${t('career.week')}</small></div><div><b>${s.club.wins}-${s.club.losses}</b><small>${t('league.w')}-${t('league.l')}</small></div><div><b>${(s.life && s.life.achievements ? s.life.achievements.length : 0)}</b><small>${t('me.trophies')}</small></div><div><b>${s.table && s.table.length ? s.table.find(r => r.id === s.club.id) ? s.table.find(r => r.id === s.club.id).rank + 'º' : '—' : '—'}</b><small>${t('league.table')}</small></div></div>
        ${s.life && s.life.pendingArcade ? `<p class="small ok">▶ ${t('arcade.pending', { game: t('arcade.' + s.life.pendingArcade.type) })}</p>` : ''}</section>` : '';
      return `${quick}<section class="card more-panel">
        <button class="row-link sim" data-action="sim-season"><span class="ico" aria-hidden="true">${CAA.Icons.svg('fastForward')}</span><span><b>${t('more.simSeason')}</b><small>${t('more.simSeasonSub')}</small></span><span aria-hidden="true">›</span></button>
        ${s ? group(t('more.group.club'), club) : ''}
        ${group(t('more.group.system'), systemTabs)}</section>
        <button class="cta ghost" data-action="boot-menu">${CAA.Icons.svg('home', 20)} ${t('more.menu')}</button>`;
    }
    function renderSettings() {
      const s = state.settings, remOk = CAA.Reminders.available(root);
      const opt = (val, cur, label) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${label}</option>`;
      return `<section class="panel"><h2>${t('settings.title')}</h2><div class="grid">
      <label>${t('settings.language')}<select data-setting="locale">${opt('es', CAA.I18N.getLocale(), 'Español')}${opt('en', CAA.I18N.getLocale(), 'English')}${opt('fr', CAA.I18N.getLocale(), 'Français')}${opt('de', CAA.I18N.getLocale(), 'Deutsch')}${opt('it', CAA.I18N.getLocale(), 'Italiano')}</select></label>
      <label>${t('settings.fontSize')}<select data-setting="fontSize">${opt('0', String(s.fontSize), t('settings.normal'))}${opt('1', String(s.fontSize), t('settings.large'))}${opt('2', String(s.fontSize), t('settings.xlarge'))}</select></label>
      <label>${t('settings.color')}<select data-setting="colorMode">${opt('standard', s.colorMode, t('settings.standard'))}${opt('blue-orange', s.colorMode, t('settings.blueOrange'))}</select></label>
      <label>${t('settings.motion')}<select data-setting="reducedMotion">${opt('system', s.reducedMotion, t('settings.system'))}${opt('reduced', s.reducedMotion, t('settings.reduced'))}${opt('full', s.reducedMotion, t('settings.full'))}</select></label>
      <label>${t('settings.vibration')}<select data-setting="vibration">${opt('true', String(s.vibration), t('settings.on'))}${opt('false', String(s.vibration), t('settings.off'))}</select></label>
      <label>${t('settings.audio')}<select data-setting="audio">${opt('true', String(s.audio), t('settings.on'))}${opt('false', String(s.audio), t('settings.off'))}</select></label>
      <label>${t('settings.contrast')}<select data-setting="highContrast">${opt('true', String(s.highContrast), t('settings.on'))}${opt('false', String(s.highContrast), t('settings.off'))}</select></label>
      <label>${t('settings.reminders')}<select data-setting="reminders" ${remOk ? '' : 'disabled aria-describedby="rem-note"'}>${opt('true', String(remOk && s.reminders), t('settings.on'))}${opt('false', String(remOk && s.reminders), t('settings.off'))}</select></label>
      <p class="muted small" id="rem-note">${t(remOk ? 'settings.remindersNote' : 'settings.remindersAndroid')}</p>
      ${hasCareer() ? `<div class="jm-setting"><b>${t('jm.setting')}</b><p class="muted small">${t('jm.settingNote')}</p><button class="small-btn" data-action="world-op" data-op="jm-toggle" aria-pressed="${state.career.summary.jm && state.career.summary.jm.on ? 'true' : 'false'}">${t(state.career.summary.jm && state.career.summary.jm.on ? 'settings.on' : 'settings.off')}</button></div>` : ''}
      ${CAA.PlayStore.privacyRequired(root) ? `<button class="small-btn" data-action="ads-privacy">${t('ads.privacy')}</button>` : ''}
      <p class="muted">${t('settings.audioNote')}</p><button data-action="audio-test">${t('settings.audioTest')}</button>
      </div></section>`;
    }
    return { renderSave, renderLab, matchKeys, currentPlay, renderMatch, GUIDE, renderGuide, recordsCard, diaryCard, renderHistory, renderClub, renderMarket, renderEditor, renderMoments, renderMore, renderSettings };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
