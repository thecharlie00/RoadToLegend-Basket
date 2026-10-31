(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  if (!doc) return;

  const payload = JSON.parse(doc.getElementById('caa-payload').textContent);
  const workerCode = JSON.parse(doc.getElementById('caa-worker-code').textContent);
  const world = payload.data.seed || payload.data.world || { competitions: [] };
  const state = { tab: 'world', slot: 'slot-1', message: '', lab: '', match: { ruleSetId: 'FIBA-2026', seed: 'camino-demo', result: null, calibration: null, frame: 0, playing: false, view: '2d', quality: 'low', camera: 'broadcast', keyOnly: false, progress: 1, source: 'lab' }, career: { mode: 'player', route: 'eu-academy', seed: 'carrera-demo', nationality: 'ES', pos: 'SG', clubId: '', archetype: 'shooter', handedness: 'right', name: '', clubs: [], clubsRoute: null, clubsLoading: false, state: null, summary: null }, practice: null, busy: false, saveState: 'idle', saveError: '', slots: [], importText: '', importPreview: null, confirm: null, diagnostics: null, drafts: {}, settings: CAA.A11Y.DEFAULTS };
  let storage, worker, voxelRenderer = null, voxelCanvas = null, avatarRenderer = null, avatarCanvas = null, audio = null, clubRequest = 0;
  const tabs = ['world', 'match', 'career', 'life', 'save', 'lab', 'settings'];
  const saveOptions = () => ({ careerValidator: CAA.Career.validate });
  function notify(text, error = false) { state.message = text; state.messageError = error; }
  function draft(id, value) { return Object.prototype.hasOwnProperty.call(state.drafts, id) ? state.drafts[id] : value; }

  function t(key, vars) { return CAA.I18N.t(key, vars); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function loadSettings() {
    try { state.settings = CAA.A11Y.normalize(JSON.parse(root.localStorage.getItem('caa.settings') || '{}')); } catch (_) { state.settings = CAA.A11Y.normalize({}); }
    try { const loc = root.localStorage.getItem('caa.locale'); if (loc && payload.locales[loc]) CAA.I18N.setLocale(loc); } catch (_) {}
    CAA.A11Y.apply(state.settings, doc);
    if (!audio) audio = CAA.Audio.createAudio({ enabled: state.settings.audio, window: root });
    else audio.setEnabled(state.settings.audio);
  }
  function saveSettings() {
    try { root.localStorage.setItem('caa.settings', JSON.stringify(state.settings)); root.localStorage.setItem('caa.locale', CAA.I18N.getLocale()); } catch (_) {}
  }

  function renderWorld() {
    const cov = CAA.World.coverage(world);
    const rows = world.competitions.map(c => `<tr><td>${esc(c.displayName)}</td><td>${esc(c.referenceName)}</td><td>${esc(c.country)}</td><td>${esc(c.category)}</td><td>${esc(c.gender)}</td><td>${esc(c.ageGroup)}</td><td>${esc(c.season)}</td><td class="${c.sourceStatus === 'verified' ? 'ok' : 'muted'}">${esc(c.sourceStatus)}</td></tr>`).join('');
    return `<section class="panel"><h2>${t('world.title')}</h2><p class="muted">${t('world.target')} · ${t('world.status')}: ${esc(world.coverage.status)}</p>
    <div class="grid"><div>${t('world.total')}: <strong>${cov.total}</strong></div><div>${t('world.verified')}: <strong>${cov.byStatus.verified || 0}</strong></div><div>${t('world.pending')}: <strong>${cov.byStatus.pending || 0}</strong></div></div>
    <p class="muted">${t('world.note')}</p><div class="table-scroll" tabindex="0" role="region" aria-label="${t('table.scroll')}"><table><thead><tr><th>${t('world.name')}</th><th>${t('world.reference')}</th><th>${t('world.country')}</th><th>${t('world.category')}</th><th>${t('world.gender')}</th><th>${t('world.age')}</th><th>${t('world.season')}</th><th>${t('world.source')}</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
  }

  function renderSave() {
    const occupied = state.slots.find(s => s.slot === state.slot);
    const preview = state.importPreview;
    return `<section class="panel"><h2>${t('save.title')}</h2><p class="muted">${t('save.backend')}: ${esc(storage ? storage.kind : '...')} · ${t('save.auto')}</p>
    ${storage && !storage.persistent ? `<p class="bad" role="alert">${t('save.memoryWarning')}</p>` : ''}
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
    return `<section class="panel"><h2>${t('lab.title')}</h2><p class="muted">${t('lab.mode')}: ${esc(worker ? worker.getMode() : 'main')}</p>
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

  function loc(obj) { return obj ? (obj[CAA.I18N.getLocale()] || obj.es || obj.en || '') : ''; }
  function renderLife() {
    const s = state.career.summary;
    if (!s) return `<section class="panel"><h2>${t('life.title')}</h2><p class="muted">${t('career.empty')}</p></section>`;
    const life = s.life || { cash: 0, style: 0, xp: 0, achievements: [], owned: [], equipment: {}, eventHistory: [], pendingEvent: null, press: [], guideStep: 0, counters: {} };
    const packs = CAA.Content.packs();
    const pending = life.pendingEvent && packs.events.events.find(e => e.id === life.pendingEvent.id);
    const eventHtml = pending ? `<div class="panel"><h3>${esc(loc(pending.title))}</h3><p>${esc(loc(pending.body))}</p><div class="row">${pending.options.map(o => `<button data-action="life-event" data-option="${o.id}">${esc(loc(o))}</button>`).join('')}</div></div>` : `<p class="muted">${t('life.noEvent')}</p>`;
    const ach = packs.achievements.achievements.map(a => `<li class="${life.achievements.includes(a.id) ? 'ok' : 'muted'}">${esc(loc(a.title))} · ${a.metric} ≥ ${a.threshold}</li>`).join('');
    const shop = packs.shop.items.map(i => `<li>${esc(loc(i.name))} · ${i.cost} ${t('life.style')} ${life.owned.includes(i.id) ? `<button data-action="life-equip" data-item="${i.id}">${t('life.equip')}</button>` : `<button data-action="life-buy" data-item="${i.id}">${t('life.buy')}</button>`}</li>`).join('');
    const press = life.press.map(p => `<li>${esc(CAA.I18N.getLocale() === 'en' ? p.en : p.es)}</li>`).join('');
    const guide = packs.guide.steps.map((g, i) => `<li class="${i <= life.guideStep ? 'ok' : 'muted'}">${esc(loc(g))}</li>`).join('');
    const eq = life.equipment || {};
    const color = slot => { const item = packs.shop.items.find(i => i.id === eq[slot]); return item ? item.color : '#9fb7b2'; };
    return `<section class="panel"><h2>${t('life.title')}</h2>
    <div class="grid"><div>${t('life.cash')}: <strong>${life.cash}</strong></div><div>${t('life.style')}: <strong>${life.style}</strong></div><div>XP: <strong>${life.xp}</strong></div><div>${t('life.achievements')}: <strong>${life.achievements.length}/${packs.achievements.achievements.length}</strong></div></div>
    ${avatarHtml()}
    ${eventHtml}
    <div class="row"><button data-action="life-practice-auto">${t('life.practiceAuto')}</button><button data-action="life-practice-start">${t('life.practiceManual')}</button><button data-action="life-buzzer-auto">${t('life.buzzerAuto')}</button><button data-action="life-buzzer-start">${t('life.buzzerManual')}</button>${state.practice && state.practice.start != null ? `<button data-action="life-practice-release" class="primary">${t('life.release')}</button>` : ''}${life.pendingPractice ? `<button data-action="life-practice-resume">${t('life.resumeAttempt')}</button><button data-action="life-practice-cancel">${t('life.cancelAttempt')}</button>` : ''}</div>
    ${life.pendingPractice ? `<p class="muted">${t('life.pendingAttempt', { type: t(life.pendingPractice.type === 'buzzer' ? 'life.buzzerAuto' : 'life.practiceAuto'), id: life.pendingPractice.id })}</p>` : ''}
    ${state.practice && state.practice.result ? `<p class="${state.practice.result.made ? 'ok' : 'bad'}">${state.practice.result.made ? t('life.made') : t('life.missed')} · p=${state.practice.result.p}</p>` : ''}
    <details open><summary>${t('life.press')}</summary><ul>${press}</ul></details>
    <details><summary>${t('life.shop')}</summary><ul>${shop}</ul></details>
    <details><summary>${t('life.achievements')}</summary><ul>${ach}</ul></details>
    <details><summary>${t('life.guide')}</summary><ol>${guide}</ol><button data-action="life-guide-next">${t('life.nextStep')}</button></details>
    </section>`;
  }

  async function ensureClubs(route) {
    const c = state.career;
    if (c.clubsRoute === route && c.clubs.length) return;
    const token = ++clubRequest;
    c.clubsLoading = true; c.clubs = []; c.clubsRoute = null; render();
    try {
      const res = await worker.send('career.clubs', { route });
      if (token !== clubRequest) return;
      c.clubs = res.clubs; c.clubsRoute = route;
      if (!c.clubs.some(x => x.id === c.clubId)) c.clubId = c.clubs.length ? c.clubs[0].id : '';
    } catch (err) { if (token === clubRequest) notify(t('status.error') + ': ' + err.message, true); }
    finally { if (token === clubRequest) { c.clubsLoading = false; render(); } }
  }
  function avatarProfile() {
    const s = state.career.summary;
    if (!s) return null;
    const life = s.life || { equipment: {} };
    const items = CAA.Content.packs().shop.items;
    const color = slot => { const item = items.find(i => i.id === (life.equipment || {})[slot]); return item ? item.color : null; };
    const p = s.player;
    return { mode: s.mode, name: p ? p.name : s.coach.name, height: p ? p.height : 190, archetype: p ? p.archetype : null, handedness: p ? p.handedness : 'right', equipment: { jersey: color('jersey'), shoes: color('shoes'), accessory: color('accessory') } };
  }
  function avatarHtml() {
    const profile = avatarProfile();
    if (!profile) return '';
    const eq = profile.equipment || {};
    const style = c => c ? ` style="background:${esc(c)}"` : '';
    return `<div class="avatar-wrap"><canvas id="me3d" role="img" aria-label="${t('life.me3d', { name: esc(profile.name) })}"></canvas><div id="me2d" class="me2d" role="img" aria-label="${t('life.me')}" hidden><div class="me-head"${style(eq.accessory)}></div><div class="me-body"${style(eq.jersey)}></div><div class="me-legs"></div><div class="me-shoes"${style(eq.shoes)}></div></div><p class="muted">${t('life.meNote')}</p></div>`;
  }
  function drawAvatar() {
    const canvas = doc.getElementById('me3d');
    if (!canvas || !avatarProfile()) return;
    const fallback = () => { canvas.hidden = true; const el = doc.getElementById('me2d'); if (el) el.hidden = false; };
    try {
      if (!avatarRenderer || avatarCanvas !== canvas) {
        avatarCanvas = canvas;
        avatarRenderer = CAA.Voxel.createRenderer(canvas, { onContextLost: () => { fallback(); avatarRenderer = null; avatarCanvas = null; } });
      }
      avatarRenderer.draw(CAA.Voxel.avatarGeometry(avatarProfile(), { colorMode: state.settings.colorMode, highContrast: state.settings.highContrast }), 'avatar');
    } catch (_) { fallback(); }
  }
  function renderCareer() {
    const c = state.career;
    const s = c.summary;
    const opt = (val, cur, label) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${label}</option>`;
    let body = `<p class="muted">${t('career.empty')}</p>`;
    if (s) {
      const p = s.player;
      const inbox = s.inbox.map(i => `<li>${esc(i.type)}${i.detail && i.detail.overall ? ' · pick ' + i.detail.overall : ''}</li>`).join('');
      const market = s.market.map((m, i) => `<li>${esc(m.contract.salary)} €/$ · ${m.contract.years} ${t('career.years')} <button data-action="career-sign" data-index="${i}">${t('career.sign')}</button></li>`).join('');
      body = `${avatarHtml()}<div class="grid">
        <div>${t('career.club')}: <strong>${esc(s.club.name)}</strong> (${s.club.wins}-${s.club.losses}, #${s.club.rank})</div>
        <div>${t('career.year')}: <strong>${s.year}</strong> · ${t('career.week')}: <strong>${s.week}</strong></div>
        <div>${t('career.hash')}: <strong>${esc(s.hash)}</strong></div>
        ${p ? `<div>${t('career.player')}: <strong>${esc(p.name)}</strong> · ${esc(p.pos)} · OVR ${p.ovr} · ${p.age} ${t('career.years')}</div>
        <div>${t('career.loadStat')}: <strong>${Math.round(p.load)}</strong> · ${p.injury ? t('career.injured') + ' ' + p.injury.weeksRemaining : t('career.healthy')}</div>
        <div>${t('career.stats')}: ${p.stats.gp} PJ · ${p.stats.min.toFixed(1)} MIN · ${(p.stats.pts / Math.max(1, p.stats.gp)).toFixed(1)} PTS · ${(p.stats.reb / Math.max(1, p.stats.gp)).toFixed(1)} REB · ${(p.stats.ast / Math.max(1, p.stats.gp)).toFixed(1)} AST</div>` : `<div>${t('career.coach')}: <strong>${esc(s.coach.name)}</strong> · ${esc(s.coach.authority)}</div>`}
      </div>
      <div class="row"><button data-action="career-play">${t('career.play')}</button><button data-action="career-train">${t('career.train')}</button><button data-action="career-rest">${t('career.rest')}</button><button data-action="career-save">${t('career.save')}</button><button data-action="career-load">${t('career.load')}</button><button data-action="career-crossing">${t('career.crossing')}</button><button data-action="career-watch" ${!c.state.lastMatch ? 'disabled' : ''}>${t('career.watch')}</button></div>
      <details><summary>${t('career.inbox')}</summary><ul>${inbox}</ul></details>
      ${market ? `<details open><summary>${t('career.market')}</summary><ul>${market}</ul></details>` : ''}
      <details><summary>${t('career.history')}</summary><pre>${esc(JSON.stringify(s.history, null, 2))}</pre></details>`;
    }
    return `<section class="panel"><h2>${t('career.title')}</h2><p class="muted">${t('career.note')}</p>
    <div class="row">
      <label>${t('career.mode')}<select id="career-mode">${opt('player', c.mode, t('career.modePlayer'))}${opt('coach', c.mode, t('career.modeCoach'))}</select></label>
      <label>${t('career.route')}<select id="career-route">${opt('eu-academy', c.route, t('career.routeEu'))}${opt('na-draft', c.route, t('career.routeDraft'))}${opt('na-undrafted', c.route, t('career.routeUndrafted'))}</select></label>
      <label>${t('career.initialClub')}<select id="career-club" ${c.clubsLoading || !c.clubs.length ? 'disabled' : ''}>${c.clubsLoading ? `<option>${t('status.working')}</option>` : c.clubs.map(x => opt(x.id, c.clubId, esc(x.name))).join('')}</select></label>
      <label>${t('career.name')}<input id="career-name" value="${esc(draft('career-name', c.name))}" maxlength="40" placeholder="${t('career.namePlaceholder')}"></label>
      ${c.mode === 'player' ? `<label>${t('career.nationality')}<input id="career-nationality" value="${esc(draft('career-nationality', c.nationality))}" maxlength="2"></label>
      <label>${t('career.pos')}<select id="career-pos">${['PG','SG','SF','PF','C'].map(p => opt(p, c.pos, p)).join('')}</select></label>
      <label>${t('career.archetype')}<select id="career-archetype">${CAA.Player.ARCHETYPES.map(a => opt(a, c.archetype, t('career.archetype.' + a))).join('')}</select></label>
      <label>${t('career.handedness')}<select id="career-handedness">${opt('right', c.handedness, t('career.right'))}${opt('left', c.handedness, t('career.left'))}</select></label>` : ''}
      <label>${t('career.seed')}<input id="career-seed" value="${esc(draft('career-seed', c.seed))}"></label>
      <button data-action="career-create" class="primary" ${c.clubsLoading || !c.clubs.length ? 'disabled' : ''}>${t('career.create')}</button>
    </div><p class="muted">${t(c.route === 'na-draft' ? 'career.draftClubNote' : 'career.clubNote')}</p>${body}</section>`;
  }

  function renderSettings() {
    const s = state.settings;
    const opt = (val, cur, label) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${label}</option>`;
    return `<section class="panel"><h2>${t('settings.title')}</h2><div class="grid">
    <label>${t('settings.language')}<select data-setting="locale">${opt('es', CAA.I18N.getLocale(), 'Español')}${opt('en', CAA.I18N.getLocale(), 'English')}</select></label>
    <label>${t('settings.fontSize')}<select data-setting="fontSize">${opt('0', String(s.fontSize), t('settings.normal'))}${opt('1', String(s.fontSize), t('settings.large'))}${opt('2', String(s.fontSize), t('settings.xlarge'))}</select></label>
    <label>${t('settings.color')}<select data-setting="colorMode">${opt('standard', s.colorMode, t('settings.standard'))}${opt('blue-orange', s.colorMode, t('settings.blueOrange'))}</select></label>
    <label>${t('settings.motion')}<select data-setting="reducedMotion">${opt('system', s.reducedMotion, t('settings.system'))}${opt('reduced', s.reducedMotion, t('settings.reduced'))}${opt('full', s.reducedMotion, t('settings.full'))}</select></label>
    <label>${t('settings.vibration')}<select data-setting="vibration">${opt('true', String(s.vibration), t('settings.on'))}${opt('false', String(s.vibration), t('settings.off'))}</select></label>
    <label>${t('settings.audio')}<select data-setting="audio">${opt('true', String(s.audio), t('settings.on'))}${opt('false', String(s.audio), t('settings.off'))}</select></label>
    <label>${t('settings.contrast')}<select data-setting="highContrast">${opt('true', String(s.highContrast), t('settings.on'))}${opt('false', String(s.highContrast), t('settings.off'))}</select></label>
    <p class="muted">${t('settings.audioNote')}</p><button data-action="audio-test">${t('settings.audioTest')}</button>
    </div></section>`;
  }

  function render() {
    if (voxelRenderer) { voxelRenderer.dispose(); voxelRenderer = null; voxelCanvas = null; }
    if (avatarRenderer) { avatarRenderer.dispose(); avatarRenderer = null; avatarCanvas = null; }
    const active = doc.activeElement;
    const focusId = active && active.id;
    const focusAction = active && active.dataset.action;
    const focusData = active ? Object.assign({}, active.dataset) : {};
    const openDetails = Array.from(doc.querySelectorAll('details')).map(d => d.open);
    const body = state.tab === 'world' ? renderWorld() : state.tab === 'match' ? renderMatch() : state.tab === 'career' ? renderCareer() : state.tab === 'life' ? renderLife() : state.tab === 'save' ? renderSave() : state.tab === 'lab' ? renderLab() : renderSettings();
    doc.documentElement.lang = CAA.I18N.getLocale();
    doc.getElementById('app').innerHTML = `<a class="skip-link" href="#panel">${t('a11y.skip')}</a><header><div><h1>${t('app.title')}</h1><div class="muted">${t('app.subtitle')}</div></div><span class="badge">${t('offline.badge')}</span></header>
    <nav role="tablist" aria-label="${t('a11y.sections')}">${tabs.map(tab => `<button id="tab-${tab}" role="tab" aria-controls="panel" aria-selected="${state.tab === tab}" tabindex="${state.tab === tab ? 0 : -1}" data-tab="${tab}">${t('nav.' + tab)}</button>`).join('')}</nav>
    ${storage && !storage.persistent ? `<p class="bad">${t('save.memoryWarning')}</p>` : ''}
    <div id="global-status" role="status" aria-live="polite" aria-atomic="true" class="${state.messageError ? 'bad' : 'muted'}">${esc(state.message || (state.busy ? t('status.working') : ''))}</div>
    ${state.saveError && state.career.state ? `<div class="row"><button data-action="save-export-current">${t('save.exportCurrent')}</button></div>` : ''}
    ${state.confirm ? `<section class="panel confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"><h2 id="confirm-title">${t('confirm.title')}</h2><p id="confirm-description">${esc(state.confirm.text)}</p><div class="row"><button id="confirm-cancel" data-action="confirm-cancel">${t('confirm.cancel')}</button><button data-action="confirm-yes" class="danger">${t('confirm.yes')}</button></div></section>` : ''}
    <main id="panel" role="tabpanel" aria-labelledby="tab-${state.tab}" tabindex="-1">${body}</main>`;
    for (const child of doc.getElementById('app').children) child.inert = !!state.confirm && !child.classList.contains('confirm') && child.id !== 'global-status';
    doc.querySelectorAll('[data-action]').forEach(b => { b.disabled = state.busy || b.disabled || !!state.confirm; });
    if (state.confirm) doc.querySelectorAll('.confirm button').forEach(b => { b.disabled = false; });
    doc.querySelectorAll('details').forEach((d, i) => { if (openDetails[i] !== undefined) d.open = openDetails[i]; });
    let restore = focusId && doc.getElementById(focusId);
    if (!restore && focusAction) restore = Array.from(doc.querySelectorAll('[data-action]')).find(b => b.dataset.action === focusAction && Object.keys(focusData).every(k => b.dataset[k] === focusData[k]));
    if (state.confirm) restore = doc.getElementById('confirm-cancel');
    else if (focusAction === 'confirm-cancel' || focusAction === 'confirm-yes') restore = doc.getElementById('tab-' + state.tab);
    if (restore && !restore.disabled) restore.focus({ preventScroll: true });
    drawMatchFrame();
    drawAvatar();
  }
  function drawMatchFrame() {
    const m = state.match;
    if (!m.result || state.tab !== 'match') return;
    const events = m.result.state.events;
    m.frame = Math.max(0, Math.min(m.frame, events.length - 1));
    if (m.view === '3d') {
      const canvas = doc.getElementById('court3d');
      if (!canvas) return;
      try {
        if (!voxelRenderer || voxelCanvas !== canvas) {
          voxelCanvas = canvas;
          voxelRenderer = CAA.Voxel.createRenderer(canvas, { onContextLost: () => { m.view = '2d'; m.playing = false; notify(t('match.contextLost'), true); setTimeout(() => { render(); syncAnimation(); }, 0); } });
        }
        const scene = CAA.Voxel.geometry(m.result.state, m.frame, m.progress, { quality: m.quality, colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, reducedMotion: CAA.A11Y.reduced(state.settings) });
        voxelRenderer.draw(scene, m.camera);
      } catch (_) { m.view = '2d'; m.playing = false; notify(t('match.noWebgl'), true); setTimeout(() => { render(); syncAnimation(); }, 0); }
      return;
    }
    const canvas = doc.getElementById('court2d');
    if (!canvas) return;
    const frame = CAA.Court2D.frameForEvent(events[m.frame], m.frame);
    CAA.Court2D.drawCourt(canvas.getContext('2d'), canvas.width, canvas.height, frame, { colorMode: state.settings.colorMode });
  }
  let lastAnim = 0, playStarted = 0, animationId = null;
  function audioCueForEvent(e) {
    if (!e) return null;
    if (e.type === 'final') return 'buzzer';
    if (e.type === 'foul' || e.type === 'andOneFoul') return 'whistle';
    if (e.type === 'block') return 'rim';
    if (e.type === 'shot' || e.type === 'ft') return e.made ? 'swish' : 'rim';
    if (e.type === 'turnover') return 'bounce';
    return null;
  }
  function stepMatch(direction = 1) {
    const m = state.match;
    if (!m.result) return;
    const keys = matchKeys();
    if (m.keyOnly && keys.length) {
      const at = keys.findIndex(k => k.index === m.frame);
      const next = at < 0 ? (direction > 0 ? keys.find(k => k.index > m.frame) || keys[0] : keys.slice().reverse().find(k => k.index < m.frame) || keys[keys.length - 1]) : keys[(at + direction + keys.length) % keys.length];
      m.frame = next.index;
    } else m.frame = (m.frame + direction + m.result.state.events.length) % m.result.state.events.length;
    m.progress = 1;
    if (audio) audio.play(audioCueForEvent(m.result.state.events[m.frame]));
    updatePlayUi();
  }
  function updatePlayUi() {
    const description = doc.getElementById('play-description'); if (description) description.textContent = currentPlay() || '';
    const counter = doc.getElementById('play-counter'); if (counter && state.match.result) counter.textContent = t('match.frame') + ' ' + (state.match.frame + 1) + '/' + state.match.result.state.events.length;
    doc.querySelectorAll('[data-action="match-key-jump"]').forEach(b => { if (+b.dataset.frame === state.match.frame) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
  }
  function animate(ts) {
    const m = state.match;
    if (state.tab === 'match' && m.playing && m.result) {
      if (!playStarted) { playStarted = ts; lastAnim = ts; }
      if (m.view === '3d') {
        const duration = m.quality === 'balanced' ? 1100 : 950;
        m.progress = Math.min(1, (ts - playStarted) / duration);
        drawMatchFrame();
        if (m.progress >= 1 && ts - playStarted > duration + 350) { stepMatch(1); playStarted = ts; }
      } else if (ts - lastAnim > 120) { lastAnim = ts; stepMatch(1); drawMatchFrame(); }
    }
    animationId = root.requestAnimationFrame(animate);
  }
  function syncAnimation() { playStarted = 0; if (animationId != null) root.cancelAnimationFrame(animationId); animationId = null; if (state.match.playing && state.tab === 'match' && !doc.hidden && !CAA.A11Y.reduced(state.settings)) animationId = root.requestAnimationFrame(animate); }

  async function persistCareer() {
    if (!state.career.state) return;
    state.saveState = 'saving';
    try {
      const snapshot = CAA.Career.serialize(state.career.state);
      const env = CAA.Save.createEnvelope(state.slot, { career: snapshot }, { seed: snapshot.seed, packVersions: { world: world.version, game: payload.manifest.version }, rngCounters: snapshot.rng });
      await storage.save(state.slot, env); state.slots = await storage.list();
      state.saveState = storage.persistent ? 'saved' : 'memory'; state.saveError = '';
      try { root.localStorage.setItem('caa.lastSlot', state.slot); } catch (_) {}
    } catch (err) { state.saveState = 'error'; state.saveError = t('save.failed') + ': ' + err.message; notify(state.saveError, true); }
  }
  async function acceptCareer(result) { state.career.state = result.state; state.career.summary = result.summary; await persistCareer(); }
  function requestConfirm(name, el, text) { state.confirm = { name, el: el ? { dataset: Object.assign({}, el.dataset) } : null, text }; }
  async function action(name, el) {
    if (state.busy) return;
    state.busy = true; state.message = ''; state.messageError = false; render();
    try {
      if (!state.confirmed && ['career-create', 'save-delete', 'save-import', 'career-load'].includes(name)) {
        const occupied = state.slots.some(s => s.slot === state.slot);
        if ((name === 'career-create' && state.career.state) || (name === 'save-import' && occupied) || name === 'save-delete' || (name === 'career-load' && state.career.state)) {
          requestConfirm(name, el, t(name === 'save-delete' ? 'confirm.delete' : name === 'career-load' ? 'confirm.load' : 'confirm.overwrite')); state.busy = false; render(); return;
        }
      }
      state.confirmed = false;
      if (name === 'confirm-cancel') { state.confirm = null; }
      else if (name === 'confirm-yes') { const pending = state.confirm; state.confirm = null; state.confirmed = true; state.busy = false; await action(pending.name, pending.el); return; }
      else if (name === 'save-delete') {
        await storage.remove(state.slot); state.slots = await storage.list(); notify(t('save.deleted'));
      } else if (name === 'save-export' || name === 'save-export-current') {
        const env = name === 'save-export-current' ? CAA.Save.createEnvelope(state.slot, { career: CAA.Career.serialize(state.career.state) }, { seed: state.career.state.seed, rngCounters: state.career.state.rng }) : await storage.load(state.slot);
        if (!env) throw new Error(t('save.empty'));
        const text = JSON.stringify(env, null, 2); state.importText = text;
        if (root.CAAAndroid && typeof root.CAAAndroid.exportSave === 'function') root.CAAAndroid.exportSave(text);
        else {
          const url = root.URL.createObjectURL(new Blob([text], { type: 'application/json' }));
          const a = doc.createElement('a'); a.href = url; a.download = 'baketball-road-to-legend-' + state.slot + '.json'; doc.body.appendChild(a); a.click(); a.remove(); setTimeout(() => root.URL.revokeObjectURL(url), 1000);
        }
        notify(t(root.CAAAndroid ? 'save.exportNative' : 'save.exported'));
      } else if (name === 'save-preview') {
        const env = CAA.Save.parseEnvelope(state.importText, saveOptions());
        if (env.payload.career) CAA.Career.resume(env.payload.career);
        state.importPreview = env; notify(t('save.validated'));
      } else if (name === 'save-import') {
        if (!state.importPreview) throw new Error(t('save.previewRequired'));
        await storage.save(state.slot, state.importPreview); state.slots = await storage.list(); state.importPreview = null;
        notify(t('save.imported', { slot: state.slot }));
      } else if (name === 'match-simulate') {
        const seedEl = doc.getElementById('match-seed'); if (seedEl) state.match.seed = seedEl.value || 'camino-demo';
        state.match.result = await worker.send('match.simulate', { seed: state.match.seed, ruleSetId: state.match.ruleSetId });
        state.match.source = 'lab'; state.match.frame = 0; state.match.progress = 1; state.match.playing = false;
        if (state.match.keyOnly) { const keys = matchKeys(); if (keys.length) state.match.frame = keys[0].index; }
      } else if (name === 'match-play') {
        state.match.playing = !state.match.playing;
      } else if (name === 'match-step') { state.match.playing = false; stepMatch(1);
      } else if (name === 'match-key-prev' || name === 'match-key-next') {
        state.match.playing = false; const keys = matchKeys(); const direction = name === 'match-key-next' ? 1 : -1;
        if (keys.length) { const at = keys.findIndex(k => k.index === state.match.frame); const next = at < 0 ? (direction > 0 ? keys.find(k => k.index > state.match.frame) || keys[0] : keys.slice().reverse().find(k => k.index < state.match.frame) || keys[keys.length - 1]) : keys[(at + direction + keys.length) % keys.length]; state.match.frame = next.index; state.match.progress = 1; }
      } else if (name === 'match-key-jump') { state.match.playing = false; state.match.frame = Number(el.dataset.frame); state.match.progress = 1;
      } else if (name === 'life-event') {
        const optionId = el && el.dataset.option;
        const res = await worker.send('career.event', { state: state.career.state, optionId });
        await acceptCareer(res);
      } else if (name === 'life-buy' || name === 'life-equip') {
        const itemId = el && el.dataset.item;
        const res = await worker.send(name === 'life-buy' ? 'career.buy' : 'career.equip', { state: state.career.state, itemId });
        await acceptCareer(res);
      } else if (name === 'life-practice-auto' || name === 'life-buzzer-auto') {
        const type = name === 'life-buzzer-auto' ? 'buzzer' : 'freeThrow';
        const res = await worker.send('career.practice', { state: state.career.state, config: { auto: true, type } });
        await acceptCareer(res); state.practice = { result: res.practice };
      } else if (name === 'life-practice-start' || name === 'life-buzzer-start' || name === 'life-practice-resume') {
        const type = name === 'life-buzzer-start' ? 'buzzer' : 'freeThrow';
        const res = await worker.send('career.practice.begin', { state: state.career.state, config: { type } });
        await acceptCareer(res); state.practice = { start: root.performance.now(), type: res.practice.type, id: res.practice.id, result: null };
      } else if (name === 'life-practice-cancel') {
        const res = await worker.send('career.practice.cancel', { state: state.career.state }); await acceptCareer(res); state.practice = null;
      } else if (name === 'life-practice-release') {
        if (state.practice && state.practice.start != null) {
          const releaseTick = Math.round((root.performance.now() - state.practice.start) / 1000 * CAA.Minigames.HZ);
          const res = await worker.send('career.practice.resolve', { state: state.career.state, config: { type: state.practice.type || 'freeThrow', id: state.practice.id, releaseTick } });
          await acceptCareer(res); state.practice = { result: res.practice }; if (audio) audio.play(res.practice.made ? 'swish' : 'rim');
        }
      } else if (name === 'life-guide-next') {
        const res = await worker.send('career.guide', { state: state.career.state });
        await acceptCareer(res);
      } else if (name === 'match-calibrate') {
        state.match.calibration = await worker.send('calibration.batch', { games: 200, seed: state.match.seed, ruleSetId: state.match.ruleSetId });
      } else if (name === 'career-create') {
        const get = id => { const el = doc.getElementById(id); return el ? el.value : ''; };
        state.career.mode = get('career-mode') || state.career.mode;
        state.career.route = get('career-route') || state.career.route;
        state.career.nationality = (get('career-nationality') || 'ES').toUpperCase();
        state.career.pos = get('career-pos') || 'SG';
        state.career.clubId = get('career-club') || state.career.clubId;
        state.career.archetype = get('career-archetype') || state.career.archetype;
        state.career.handedness = get('career-handedness') || state.career.handedness;
        state.career.name = (get('career-name') || '').trim();
        state.career.seed = get('career-seed') || 'carrera-demo';
        if (!state.career.clubId) throw new Error(t('career.clubRequired'));
        const created = await worker.send('career.create', { mode: state.career.mode, route: state.career.route, seed: state.career.seed, nationality: state.career.nationality, pos: state.career.pos, clubId: state.career.clubId, archetype: state.career.archetype, handedness: state.career.handedness, name: state.career.name || undefined });
        if (audio) audio.play('success');
        state.career.state = CAA.Career.resume(created); state.career.summary = CAA.Career.summary(state.career.state); state.practice = null; await persistCareer();
      } else if (name === 'career-play' || name === 'career-train' || name === 'career-rest') {
        if (!state.career.state) throw new Error(t('career.empty'));
        const action = name === 'career-train' ? { type: 'train', focus: 'tiroTriple' } : name === 'career-rest' ? { type: 'rest' } : { type: 'play' };
        const res = await worker.send('career.advance', { state: state.career.state, action });
        await acceptCareer(res);
      } else if (name === 'career-sign') {
        const index = state.career.signIndex || 0;
        const res = await worker.send('career.sign', { state: state.career.state, index });
        await acceptCareer(res);
      } else if (name === 'career-crossing') {
        if (!state.career.state) throw new Error(t('career.empty'));
        const target = state.career.state.season.leagueId === 'na-boreal-men' ? 'es-iberica-men' : 'na-boreal-men';
        const res = await worker.send('career.crossing', { state: state.career.state, targetLeagueId: target });
        await acceptCareer(res);
      } else if (name === 'career-watch') {
        if (!state.career.state.lastMatch) throw new Error(t('match.noReplay'));
        state.match.result = state.career.state.lastMatch; state.match.source = 'career'; state.match.playing = false; state.match.progress = 1;
        const keys = matchKeys(); state.match.frame = keys.length ? keys[0].index : 0; state.tab = 'match'; notify(t('match.replayLoaded'));
      } else if (name === 'career-save') { await persistCareer();
      } else if (name === 'career-load') {
        const env = await storage.load(state.slot);
        if (env && env.payload && env.payload.career) { state.career.state = CAA.Career.resume(env.payload.career); state.career.summary = CAA.Career.summary(state.career.state); state.practice = null; notify(t('career.loaded')); }
        else notify(t('save.empty'));
      } else if (name === 'audio-test') {
        if (!state.settings.audio) throw new Error(t('settings.audioOff'));
        if (audio) { audio.unlock(); audio.play('swish'); }
      } else if (name === 'lab-performance') {
        const courtVisible = !!state.match.result;
        if (courtVisible) { state.tab = 'match'; render(); }
        state.diagnostics = await CAA.Diagnostics.sampleFrames({ frames: 180, context: { worker: worker.getMode(), storage: storage.kind, workload: courtVisible ? (state.match.view === '3d' ? 'voxel-' + state.match.quality : 'court2d') : 'static-ui' }, onFrame: () => { if (state.match.result) { state.match.progress = 1; stepMatch(1); drawMatchFrame(); } } });
        state.lab = JSON.stringify(state.diagnostics, null, 2); state.tab = 'lab';
      } else if (name === 'lab-export') {
        const report = { game: payload.manifest.game, title: t('app.title'), build: payload.manifest, worker: worker.getMode(), storage: { kind: storage.kind, persistent: storage.persistent, diagnostics: storage.diagnostics }, performance: state.diagnostics, missingTranslations: CAA.I18N.missingKeys() };
        state.lab = JSON.stringify(report, null, 2);
      } else if (name.startsWith('lab-')) {
        const kind = name.slice(4);
        const type = kind === 'ping' ? 'ping' : kind === 'rng' ? 'rng' : kind === 'clock' ? 'clock' : 'hash';
        const payload = kind === 'rng' ? { seed: 'camino', n: 5 } : kind === 'clock' ? { periodMinutes: 10, ticks: 25 } : kind === 'hash' ? world : {};
        const result = await worker.send(type, payload);
        state.lab = JSON.stringify(result, null, 2);
      }
    } catch (err) { notify(t('status.error') + ': ' + err.message, true); state.lab = state.message; }
    finally { state.busy = false; }
    render(); syncAnimation();
  }

  function bind() {
    const unlockAudio = () => { if (audio && state.settings.audio) audio.unlock(); };
    doc.addEventListener('pointerdown', unlockAudio, { capture: true, passive: true });
    doc.addEventListener('keydown', unlockAudio, { capture: true });
    doc.getElementById('app').addEventListener('click', e => {
      const tab = e.target.closest('[data-tab]'); if (tab) { state.tab = tab.dataset.tab; state.match.playing = false; render(); syncAnimation(); doc.getElementById('tab-' + state.tab).focus(); return; }
      const btn = e.target.closest('[data-action]'); if (btn) { if (btn.dataset.index != null) state.career.signIndex = +btn.dataset.index; action(btn.dataset.action, btn); }
    });
    doc.getElementById('app').addEventListener('keydown', e => {
      if (state.confirm) {
        if (e.key === 'Escape') { e.preventDefault(); state.confirm = null; render(); }
        if (e.key === 'Tab') { const buttons = Array.from(doc.querySelectorAll('.confirm button')); const i = buttons.indexOf(doc.activeElement); e.preventDefault(); buttons[(i + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length].focus(); }
        return;
      }
      const tab = e.target.closest('[data-tab]'); if (!tab) return;
      const next = CAA.A11Y.tabKey(e.key, tabs.indexOf(tab.dataset.tab), tabs.length); if (next == null) return;
      e.preventDefault(); state.tab = tabs[next]; state.match.playing = false; render(); syncAnimation(); doc.getElementById('tab-' + state.tab).focus();
    });
    doc.getElementById('app').addEventListener('input', e => { if (e.target.id) state.drafts[e.target.id] = e.target.value; if (e.target.id === 'save-import') { state.importText = e.target.value; state.importPreview = null; const b = doc.querySelector('[data-action="save-import"]'); if (b) b.disabled = true; } });
    doc.getElementById('app').addEventListener('change', async e => {
      if (e.target.id === 'save-file') { const file = e.target.files[0]; if (!file) return; if (file.size > CAA.Save.MAX_IMPORT_CHARS * 2) { notify(t('save.tooLarge'), true); render(); return; } try { state.importText = await file.text(); state.importPreview = CAA.Save.parseEnvelope(state.importText, saveOptions()); if (state.importPreview.payload.career) CAA.Career.resume(state.importPreview.payload.career); notify(t('save.validated')); } catch (err) { state.importPreview = null; notify(err.message, true); } render(); return; }
      const el = e.target;
      if (el.id === 'slot') { state.slot = el.value; return; }
      if (el.id === 'career-mode') { state.career.mode = el.value; render(); return; }
      if (el.id === 'career-route') { state.career.route = el.value; state.career.clubId = ''; await ensureClubs(el.value); return; }
      if (el.id === 'career-club') { state.career.clubId = el.value; return; }
      if (el.id === 'career-archetype') { state.career.archetype = el.value; return; }
      if (el.id === 'career-handedness') { state.career.handedness = el.value; return; }
      if (el.id === 'career-name') { state.career.name = el.value; return; }
      if (el.id === 'career-pos') { state.career.pos = el.value; return; }
      if (el.id === 'career-nationality') { state.career.nationality = el.value.toUpperCase(); return; }
      if (el.id === 'career-seed') { state.career.seed = el.value; return; }
      if (el.id === 'match-view') { state.match.view = el.value === '3d' ? '3d' : '2d'; state.match.playing = false; state.match.progress = 1; render(); syncAnimation(); return; }
      if (el.id === 'match-quality') { state.match.quality = el.value === 'balanced' ? 'balanced' : 'low'; render(); return; }
      if (el.id === 'match-camera') { state.match.camera = el.value === 'sideline' ? 'sideline' : 'broadcast'; drawMatchFrame(); return; }
      if (el.id === 'match-key-only') { state.match.keyOnly = el.checked; state.match.playing = false; if (el.checked) { const keys = matchKeys(); if (keys.length) state.match.frame = keys[0].index; } render(); syncAnimation(); return; }
      if (el.id === 'match-rules') { state.match.ruleSetId = el.value; return; }
      if (el.id === 'match-seed') { state.match.seed = el.value; return; }
      const key = el.dataset.setting; if (!key) return;
      if (key === 'locale') CAA.I18N.setLocale(el.value);
      else if (key === 'fontSize') state.settings.fontSize = +el.value;
      else if (key === 'vibration' || key === 'audio' || key === 'highContrast') state.settings[key] = el.value === 'true';
      else state.settings[key] = el.value;
      CAA.A11Y.apply(state.settings, doc); if (audio) { audio.setEnabled(state.settings.audio); if (state.settings.audio) { audio.unlock(); audio.play('click'); } } if (CAA.A11Y.reduced(state.settings)) state.match.playing = false; saveSettings(); render(); syncAnimation();
    });
  }

  async function init() {
    CAA.I18N.init({ dicts: payload.locales, locale: 'es' });
    // Main-thread data packs: the worker receives its own CAA_DATA prefix at build time.
    root.CAA_DATA = Object.assign(root.CAA_DATA || {}, payload.data);
    if (payload.data['inspired-names']) CAA.Names.configure(payload.data['inspired-names']);
    loadSettings();
    storage = await CAA.Storage.createAutoAdapter(saveOptions());
    state.slots = await storage.list();
    try { const last = root.localStorage.getItem('caa.lastSlot'); if (last && CAA.Save.validSlot(last) && state.slots.some(s => s.slot === last)) state.slot = last; } catch (_) {}
    worker = CAA.WorkerClient.createClient({ workerCode, onFallback: () => notify(t('worker.fallback')) });
    worker.start(); await worker.ready();
    await ensureClubs(state.career.route);
    const lastEnv = await storage.load(state.slot);
    if (lastEnv && lastEnv.payload.career) { try { state.career.state = CAA.Career.resume(lastEnv.payload.career); state.career.summary = CAA.Career.summary(state.career.state); state.tab = 'career'; notify(t('career.loaded')); } catch (err) { notify(t('save.failed') + ': ' + err.message, true); } }
    bind(); render();
    const suspend = () => { state.match.playing = false; if (audio) audio.suspend(); if (state.practice && state.practice.start != null) state.practice.start = null; syncAnimation(); if (state.career.state) persistCareer(); };
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) suspend(); else { CAA.A11Y.apply(state.settings, doc); if (audio) audio.resume(); render(); } });
    root.addEventListener('pagehide', suspend);
    root.addEventListener('caa:native-pause', suspend);
    root.addEventListener('caa:native-resume', () => { CAA.A11Y.apply(state.settings, doc); if (audio) audio.resume(); render(); });
    const motion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)'); if (motion && motion.addEventListener) motion.addEventListener('change', () => { CAA.A11Y.apply(state.settings, doc); if (CAA.A11Y.reduced(state.settings)) state.match.playing = false; syncAnimation(); });
    root.CAA_APP = { state, storage, worker, world, persistCareer, rendererStats: () => voxelRenderer ? voxelRenderer.stats() : null, avatarStats: () => avatarRenderer ? avatarRenderer.stats() : null, audioStats: () => audio ? audio.stats() : null, handleBack: () => { if (state.busy) return true; if (state.confirm) { state.confirm = null; render(); return true; } if (state.tab !== 'career') { state.tab = 'career'; state.match.playing = false; render(); syncAnimation(); return true; } return false; } };
  }
  function start() { init().catch(err => { const el = doc.getElementById('app'); if (el) { el.textContent = 'No se pudo iniciar / Could not start: ' + err.message; el.setAttribute('role', 'alert'); } }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(typeof globalThis !== 'undefined' ? globalThis : this);
