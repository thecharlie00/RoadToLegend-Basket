(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  if (!doc) return;

  const payload = JSON.parse(doc.getElementById('caa-payload').textContent);
  const workerCode = JSON.parse(doc.getElementById('caa-worker-code').textContent);
  const world = payload.data.seed || payload.data.world || { competitions: [] };
  const state = { screen: 'lang', wizard: { step: 1 }, tab: 'career', slot: 'slot-1', message: '', lab: '', match: { ruleSetId: 'FIBA-2026', seed: 'camino-demo', result: null, calibration: null, frame: 0, playing: false, view: '2d', quality: 'low', camera: 'broadcast', keyOnly: false, progress: 1, source: 'lab' }, career: { mode: 'player', gender: 'm', leagueId: 'fr-hexagone-men', route: 'eu-academy', seed: 'carrera-demo', nationality: 'ES', pos: 'SG', clubId: '', archetype: 'shooter', handedness: 'right', name: '', number: 7, talent: 'gem', clubs: [], clubsRoute: null, clubsLoading: false, state: null, summary: null }, practice: null, busy: false, saveState: 'idle', saveError: '', slots: [], importText: '', importPreview: null, confirm: null, diagnostics: null, drafts: {}, settings: CAA.A11Y.DEFAULTS };
  let storage, worker, voxelRenderer = null, voxelCanvas = null, avatarRenderer = null, avatarCanvas = null, audio = null, clubRequest = 0;
  const saveOptions = () => ({ careerValidator: CAA.Career.validate });
  function notify(text, error = false) { state.message = text; state.messageError = error; }
  function draft(id, value) { return Object.prototype.hasOwnProperty.call(state.drafts, id) ? state.drafts[id] : value; }

  function syncEraLook() { const s = hasCareer() && state.screen === 'game' ? state.career.summary : null; const v = s && s.era ? s.era.look : ''; if (doc.body.dataset.era !== v) doc.body.dataset.era = v; }
  function femOpts() {
    const c = state.career && state.career.state;
    if (!c || state.screen !== 'game') return null;
    const team = CAA.Season.genderOf(c.season.leagueId) === 'women', self = !!(c.player && c.player.gender === 'women');
    return team || self ? CAA.Fem.opts(team, self, null) : null;
  }
  function t(key, vars) { const s = CAA.I18N.t(key, vars), l = CAA.I18N.getLocale(), o = (l === 'es' || l === 'en') ? femOpts() : null; return o ? CAA.Fem.apply(s, l, o) : s; }
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

  // Texto ya rellenado (eventos, prensa): idioma propio si existe; si no, español o inglés.
  function pick(o) { if (!o) return ''; const l = CAA.I18N.getLocale(); return o[l] || (l === 'es' ? o.es : o.en) || o.es || ''; }
  function loc(obj) {
    if (!obj) return '';
    const l = CAA.I18N.getLocale(), own = obj[l] || (l !== 'es' && l !== 'en' && CAA.ContentI18n ? CAA.ContentI18n.tr(l, obj.en) : null);
    const v = own || (l === 'es' ? obj.es : obj.en) || obj.es || '', lang = own ? l : (l === 'es' ? 'es' : 'en');
    const o = (lang === 'es' || lang === 'en') ? femOpts() : null; // el femenino automático solo existe en es/en
    return o && v ? CAA.Fem.apply(v, lang, o) : v;
  }
  async function ensureClubs(route) {
    const c = state.career;
    const key = route === 'world' ? 'world:' + c.leagueId : route;
    if (c.clubsRoute === key && c.clubs.length) return;
    const token = ++clubRequest;
    c.clubsLoading = true; c.clubs = []; c.clubsRoute = null; render();
    try {
      const res = await worker.send('career.clubs', { route, leagueId: c.leagueId });
      if (token !== clubRequest) return;
      c.clubs = res.clubs; c.clubsRoute = key;
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
    return { mode: s.mode, name: p ? p.name : s.coach.name, height: p ? p.height : 190, archetype: p ? p.archetype : null, handedness: p ? p.handedness : 'right', women: !!(s.league && s.league.gender === 'f'), look: s.look || null, equipment: { jersey: color('jersey'), shoes: color('shoes'), accessory: color('accessory') } };
  }
  function face(p) { return CAA.Faces ? CAA.Faces.svg(p, 26) : ''; }
  function avatarHtml() {
    const profile = avatarProfile();
    if (!profile) return '';
    const eq = profile.equipment || {};
    const style = c => c ? ` style="background:${esc(c)}"` : '';
    return `<div class="avatar-wrap"><canvas id="me3d" role="img" aria-label="${t('life.me3d', { name: esc(profile.name) })}"></canvas><button class="small-btn celebrate" data-action="celebrate">🎉 ${t('look.celebrate')}</button><div id="me2d" class="me2d" role="img" aria-label="${t('life.me')}" hidden><div class="me-head"${style(eq.accessory)}></div><div class="me-body"${style(eq.jersey)}></div><div class="me-legs"></div><div class="me-shoes"${style(eq.shoes)}></div></div><p class="muted">${t('life.meNote')}</p></div>`;
  }
  let petRenderer = null, petCanvas = null, petTimer = null;
  function drawPet() {
    const canvas = doc.getElementById('pet3d');
    const pet = state.career.summary && state.career.summary.pet;
    if (!canvas || !pet) { if (petTimer) { root.clearTimeout(petTimer); petTimer = null; } return; }
    try {
      if (!petRenderer || petCanvas !== canvas) { petCanvas = canvas; petRenderer = CAA.Voxel.createRenderer(canvas, { onContextLost: () => { petRenderer = null; petCanvas = null; } }); }
      const reduced = CAA.A11Y.reduced(state.settings);
      petRenderer.draw(CAA.PetVox.geometry(pet, { colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, t: root.performance.now() / 1000, reduced }), 'avatar');
      if (!reduced && !doc.hidden) { if (petTimer) root.clearTimeout(petTimer); petTimer = root.setTimeout(drawPet, 90); }
    } catch (_) { canvas.hidden = true; }
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
      // Celebración: al tocar el modelo hace la celebración elegida en «Aspecto» durante 1,6 s.
      const cel = state.celebrate, ph = cel ? (root.performance.now() - cel) / 1600 : 1;
      if (cel && ph >= 1) state.celebrate = null;
      avatarRenderer.draw(CAA.Voxel.avatarGeometry(avatarProfile(), { colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, celebrate: !!state.celebrate, phase: Math.min(1, ph) }), 'avatar');
      if (state.celebrate) root.setTimeout(drawAvatar, 60);
    } catch (_) { fallback(); }
  }
  function clockText(tenths) { const sec = Math.ceil(Math.max(0, tenths) / 10); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function feedText(e) {
    const v = { player: e.player || '', team: e.teamName, pts: e.points, shooter: e.shooter || '', defender: e.defender || '' };
    if (e.type === 'shot') return t(e.made ? 'live.feed.made' : 'live.feed.miss', v);
    if (e.type === 'ft') return t(e.made ? 'live.feed.ftMade' : 'live.feed.ftMiss', v);
    if (e.type === 'foul') return t(e.intentional ? 'live.feed.foulIntentional' : e.foulOut ? 'live.feed.foulOut' : 'live.feed.foul', v);
    if (e.type === 'turnover') return t(e.steal ? 'live.feed.steal' : 'live.feed.turnover', v);
    return t('live.feed.' + e.type, v);
  }
  // Última jugada destacada del directo para la vista 3D (canasta, triple, tapón, robo o adicional).
  function liveKeyIndex(m, limit) {
    for (let i = Math.min(m.events.length, limit == null ? m.events.length : limit) - 1; i >= 0; i--) { const e = m.events[i]; if ((e.type === 'shot' && e.made) || e.type === 'block' || (e.type === 'turnover' && e.steal) || (e.type === 'ft' && e.made && e.reason === 'andOne')) return i; }
    return 0;
  }
  function live3dCaption(raw) {
    const m = raw.match, i = liveKeyIndex(m, pbSeq(raw)), e = m.events[i];
    if (!e || e.type === 'start') return t('live.view3dWaiting');
    const team = m.teams[e.team] ? m.teams[e.team].name : '';
    const who = (m.teams[e.team] && m.teams[e.team].players.find(p => p.id === e.player)) || {};
    const other = m.teams[1 - e.team] ? m.teams[1 - e.team].players : [];
    const nm = id => (other.find(p => p.id === id) || {}).name || '';
    return t('live.view3dCap', { period: e.period, clock: clockText(e.clock), text: feedText({ type: e.type, made: e.made, points: e.points, player: who.name || '', teamName: team, steal: e.steal, defender: nm(e.defender), shooter: nm(e.shooter) }) });
  }
  let liveRenderer = null, liveCanvas = null, liveRaf = null, liveAnim = { key: null, start: 0 };
  function drawLive3d(ts) {
    const canvas = doc.getElementById('live3d'), raw = state.career.state && state.career.state.live;
    if (!canvas || !raw || state.screen !== 'game' || state.tab !== 'career' || state.liveViewOff) { liveRaf = null; return; }
    try {
      if (!liveRenderer || liveCanvas !== canvas) { liveCanvas = canvas; liveRenderer = CAA.Voxel.createRenderer(canvas, { onContextLost: () => { state.liveViewOff = true; liveRenderer = null; } }); }
      const m = raw.match, idx = liveKeyIndex(m, pbSeq(raw)), key = m.matchId + ':' + idx;
      if (liveAnim.key !== key) liveAnim = { key, start: ts };
      const reduced = CAA.A11Y.reduced(state.settings);
      const cycle = 2600, progress = reduced ? 1 : Math.min(1, ((ts - liveAnim.start) % cycle) / 1300);
      const diff = Math.abs(m.score[0] - m.score[1]), clutch = m.period >= 4 && m.gameClock <= 1800 && diff <= 8;
      liveRenderer.draw(CAA.Voxel.geometry(m, idx, progress, { ball: state.career.summary && state.career.summary.era ? state.career.summary.era.ball : null, women: careerWomen(), quality: 'low', colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, reducedMotion: reduced, t: ts / 1000, hype: clutch ? 1 : 0.25 }), 'broadcast');
      liveRaf = reduced ? null : root.requestAnimationFrame(drawLive3d);
    } catch (_) { state.liveViewOff = true; canvas.hidden = true; liveRaf = null; }
  }
  // ===== Directo en tiempo real (como el fútbol): el motor ya ha calculado hasta el próximo momento clave;
  // la interfaz lo reproduce con el reloj corriendo (⏸ ▶ ▶▶ ▶▶▶) y solo enseña la decisión al llegar a ella. =====
  const PB_RATE = { 1: 200, 2: 420, 4: 900 }; // décimas de partido por segundo real (×1 ≈ un minuto cada 3 s)
  let pb = { key: null, seq: 0, cursor: 0, speed: 1, hold: 0 }, pbTimer = null, pbLast = 0, pbFetching = false;
  function pbProfile(m) { return CAA.Rules.getProfile(m.ruleSetId); }
  function evAbs(prof, period, clock) {
    const P = prof.periods, pl = prof.periodMinutes * 600, ol = prof.overtimeMinutes * 600, p = period || 1;
    const before = p <= P ? (p - 1) * pl : P * pl + (p - P - 1) * ol, len = p <= P ? pl : ol;
    return before + (len - (clock == null ? len : Math.min(len, clock)));
  }
  function absToClock(prof, abs) {
    const P = prof.periods, pl = prof.periodMinutes * 600, ol = prof.overtimeMinutes * 600;
    if (abs < P * pl) { const p = Math.floor(abs / pl) + 1; return { period: Math.min(P, p), clock: Math.max(0, pl * Math.min(P, p) - abs) }; }
    const r = abs - P * pl, p = P + Math.floor(r / ol) + 1; return { period: p, clock: Math.max(0, ol - (r % ol || 0)) };
  }
  function pbSync(raw) {
    const m = raw.match;
    if (pb.key !== m.matchId) pb = { key: m.matchId, seq: 0, cursor: 0, speed: pb.speed || 1, hold: 0 };
    if (pb.seq > m.events.length) pb.seq = m.events.length;
    return pb;
  }
  function pbSeq(raw) { if (!raw || !raw.match) return null; const p = pbSync(raw); return p.seq; }
  function pbCaught(raw) { return pbSync(raw).seq >= raw.match.events.length; }
  function pbCatchUp(raw) { const p = pbSync(raw), m = raw.match, prof = pbProfile(m); p.seq = m.events.length; const e = m.events[m.events.length - 1]; if (e) p.cursor = Math.max(p.cursor, evAbs(prof, e.period, e.clock)); p.hold = 0; }
  // Marcador, reloj, crónica y estadísticas con solo lo ya "emitido".
  function pbView(raw) {
    const v = CAA.Live.view(raw, 400), m = raw.match, prof = pbProfile(m), p = pbSync(raw), me = raw.userTeam;
    const shown = m.events.slice(0, p.seq), score = [0, 0], box = {};
    const b = id => box[id] || (box[id] = { pts: 0, reb: 0, ast: 0, pf: 0 });
    for (const e of shown) {
      if (e.type === 'shot' && e.made) { score[e.team] += e.points || 2; if (e.team === me) { b(e.player).pts += e.points || 2; if (e.assist) b(e.assist).ast++; } }
      else if (e.type === 'ft' && e.made) { score[e.team] += 1; if (e.team === me) b(e.player).pts += 1; }
      else if (e.type === 'rebound' && e.team === me) b(e.player).reb++;
      else if (e.type === 'foul' && e.team === me && e.player) b(e.player).pf++;
    }
    // Estadísticas de equipo, parciales por cuarto y momentum (últimas 12 canastas) con lo ya emitido.
    const ts = [0, 1].map(() => ({ fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, reb: 0, tov: 0 })), qs = {}, swing = [];
    for (const e of shown) {
      const T = ts[e.team];
      if (e.type === 'shot' && T) { T.fga++; if ((e.points || 2) === 3) T.tpa++; if (e.made) { T.fgm++; if ((e.points || 2) === 3) T.tpm++; } }
      else if (e.type === 'ft' && T) { T.fta++; if (e.made) T.ftm++; }
      else if ((e.type === 'rebound' || e.type === 'teamRebound') && T) T.reb++;
      else if ((e.type === 'turnover' || e.type === 'shotClockViolation') && T) T.tov++;
      const pts = e.type === 'shot' && e.made ? (e.points || 2) : e.type === 'ft' && e.made ? 1 : 0;
      if (pts && e.team != null) { const q = qs[e.period] || (qs[e.period] = [0, 0]); q[e.team] += pts; swing.push(e.team === me ? pts : -pts); }
    }
    const momentum = Math.max(-1, Math.min(1, swing.slice(-12).reduce((a, b) => a + b, 0) / 12));
    const caught = p.seq >= m.events.length && !!(raw.moment || raw.finished);
    const clk = caught ? { period: m.period, clock: m.gameClock } : absToClock(prof, Math.min(p.cursor, m.events.length ? evAbs(prof, m.events[m.events.length - 1].period, m.events[m.events.length - 1].clock) : 0));
    const seqs = new Set(shown.map(e => e.seq));
    const feed = v.feed.filter(e => seqs.has(e.seq)).slice(0, 12);
    const mine = m.teams[me];
    const top = mine.players.map(pl => Object.assign({ id: pl.id, name: pl.name, me: pl.id === raw.myPlayerId, onCourt: mine.onCourt.includes(pl.id) }, b(pl.id)))
      .sort((a, c) => c.pts - a.pts || a.id.localeCompare(c.id)).slice(0, 5);
    return Object.assign({}, v, { score: caught ? m.score.slice() : score, period: clk.period, clock: clk.clock, periodLabel: CAA.Rules.periodLabel(prof, clk.period), feed, top, caught, teamStats: ts, quarters: qs, momentum,
      moment: caught ? v.moment : null, finished: caught && v.finished, myName: raw.myPlayerId ? (mine.players.find(x => x.id === raw.myPlayerId) || {}).name : null });
  }
  function pbTick() {
    const raw = state.career.state && state.career.state.live;
    const panel = doc.getElementById('live-panel');
    if (!raw || !panel || state.screen !== 'game' || state.tab !== 'career' || doc.hidden) { pbStop(); return; }
    const p = pbSync(raw), now = root.performance.now(), dt = Math.min(250, now - (pbLast || now)); pbLast = now;
    if (pbCaught(raw)) {
      if (raw.moment || raw.finished) { if (!panel.dataset.caught) { pbStop(); render(); } return; }
      // Sin decisión pendiente: se pide al motor el siguiente tramo sin parar el reloj.
      if (p.speed && !state.busy && !pbFetching) { pbFetching = true; action('live-next', { dataset: {} }).finally(() => { pbFetching = false; }); }
      return;
    }
    if (!p.speed) return;
    if (p.hold > 0) { p.hold -= dt; return; }
    const m = raw.match, prof = pbProfile(m);
    p.cursor += dt / 1000 * PB_RATE[p.speed];
    let changed = false;
    while (p.seq < m.events.length) {
      const e = m.events[p.seq];
      if (evAbs(prof, e.period, e.clock) > p.cursor) break;
      p.seq++; changed = true;
      if (e.type === 'periodEnd') { p.hold = 1400 / p.speed; if (audio) audio.play('buzzer'); break; }
      if (e.type === 'shot' && e.made && audio && e.team === raw.userTeam) audio.play('click');
    }
    if (p.seq >= m.events.length && (raw.moment || raw.finished)) { pbStop(); render(); return; }
    pbPaint(raw, changed);
  }
  function pbPaint(raw, full) {
    const v = pbView(raw), me = v.userTeam, opp = 1 - me;
    const set = (id, html) => { const el = doc.getElementById(id); if (el && el.innerHTML !== html) el.innerHTML = html; };
    set('pb-score', `${v.score[me]} – ${v.score[opp]}`);
    set('pb-clock', `${esc(v.periodLabel)} · ${clockText(v.clock)}`);
    if (full) { set('pb-feed', liveFeedHtml(v)); set('pb-top', liveTopHtml(v)); set('pb-stats', liveStatsHtml(v)); const mm = doc.getElementById('pb-mom'); if (mm) { mm.style.setProperty('--mom', String(v.momentum)); mm.setAttribute('aria-valuenow', String(Math.round(v.momentum * 100))); } const cap = doc.getElementById('live3d-cap'); if (cap) cap.textContent = live3dCaption(raw); }
  }
  function pbStart() { if (pbTimer == null) { pbLast = root.performance.now(); pbTimer = root.setInterval(pbTick, 100); } }
  function pbStop() { if (pbTimer != null) { root.clearInterval(pbTimer); pbTimer = null; } }
  function liveFeedHtml(v) { return v.feed.map(e => `<li${v.myName && e.player === v.myName ? ' class="mine"' : ''}><span class="muted">${esc(e.period)}º · ${clockText(e.clock)}</span> ${esc(feedText(e))}</li>`).join(''); }
  function liveStatsHtml(v) {
    const me = v.userTeam, op = 1 - me, A = v.teamStats[me], B = v.teamStats[op], pct = (m, a) => a ? Math.round(m / a * 100) + '%' : '—';
    const row = (k, a, b) => `<tr><td>${a}</td><th scope="row">${t('live.stat.' + k)}</th><td>${b}</td></tr>`;
    const qk = Object.keys(v.quarters).sort((x, y) => x - y);
    return `<table class="vs"><thead><tr><th>${esc(v.teams[me])}</th><th></th><th>${esc(v.teams[op])}</th></tr></thead><tbody>${row('fg', `${A.fgm}/${A.fga} (${pct(A.fgm, A.fga)})`, `${B.fgm}/${B.fga} (${pct(B.fgm, B.fga)})`)}${row('tp', `${A.tpm}/${A.tpa}`, `${B.tpm}/${B.tpa}`)}${row('ft', `${A.ftm}/${A.fta}`, `${B.ftm}/${B.fta}`)}${row('reb', A.reb, B.reb)}${row('tov', A.tov, B.tov)}</tbody></table>
      ${qk.length ? `<p class="muted small">${t('live.quarters')}: ${qk.map(q => `${q}º ${v.quarters[q][me]}–${v.quarters[q][op]}`).join(' · ')}</p>` : ''}`;
  }
  function liveTopHtml(v) { return v.top.map(p => `<tr${p.me ? ' class="me"' : ''}><td>${esc(p.name)}${p.onCourt ? ' •' : ''}</td><td>${p.pts}</td><td>${p.reb}</td><td>${p.ast}</td><td>${p.pf}</td></tr>`).join(''); }
  function renderLive(c) {
    const raw = c.state && c.state.live;
    if (!raw || raw.week !== c.state.week) return '';
    const v = pbView(raw);
    const me = v.userTeam, opp = 1 - me;
    const m = v.moment;
    const vars = m ? { player: m.playerName || '', pts: m.pts || 0, fouls: m.fouls || 0, diff: Math.abs(m.diff || 0) } : {};
    const momentHtml = m ? `<div class="moment" role="group" aria-labelledby="moment-title"><h4 id="moment-title">${t('live.moment.' + m.type)}</h4><p>${esc(t('live.momentText.' + m.type + (m.type === 'lastShot' && !m.diff ? 'Tie' : ''), vars))}</p>
      ${state.heroShot ? `<canvas id="hero-canvas" width="640" height="420" role="img" aria-label="${t('live.heroCanvas')}" aria-describedby="hero-help"></canvas><p id="hero-help" class="muted small">${t('arcade.help.jump')}</p><button class="cta shoot" data-action="live-hero-release">${t('arcade.shoot')}</button>` : ''}
      <div class="row" ${state.heroShot ? 'hidden' : ''}>${m.options.map(o => `<button data-action="${m.type === 'lastShot' && o === 'hero' && v.mode === 'player' ? 'live-hero' : 'live-choice'}" data-choice="${esc(o)}" class="${o === CAA.Live.MOMENTS[m.type].fallback ? '' : 'primary'}">${t('live.opt.' + m.type + '.' + o + (m.type === 'lastShot' && v.mode === 'coach' && o !== 'auto' ? 'Coach' : ''))}</button>`).join('')}</div></div>` : '';
    const o = v.outcome;
    const outcomeHtml = v.finished && o ? `<div class="moment"><h4 class="${o.won ? 'ok' : 'bad'}">${t(o.won ? 'live.won' : 'live.lost')}</h4>
      <p>${t('live.consequences', { morale: (o.morale > 0 ? '+' : '') + o.morale, trust: (o.trust > 0 ? '+' : '') + o.trust, confidence: (o.confidence > 0 ? '+' : '') + o.confidence })}</p>
      <div class="row"><button data-action="career-play" class="primary">${t('live.closeWeek')}</button></div></div>` : '';
    const sp = pb.speed;
    const speedBtn = (n, label, aria) => `<button class="speed${sp === n ? ' on' : ''}" data-action="live-speed" data-speed="${n}" aria-pressed="${sp === n}" aria-label="${aria}">${label}</button>`;
    const controls = v.finished ? '' : v.caught
      ? `<div class="row"><button data-action="live-end">${t('live.toEnd')}</button></div>`
      : `<div class="row speeds" role="group" aria-label="${t('live.speed')}">${speedBtn(0, '⏸', t('live.pause'))}${speedBtn(1, '▶', t('live.speedN', { n: 1 }))}${speedBtn(2, '▶▶', t('live.speedN', { n: 2 }))}${speedBtn(4, '▶▶▶', t('live.speedN', { n: 4 }))}<button data-action="live-skip">${t('live.skip')}</button><button data-action="live-end">${t('live.toEnd')}</button></div>`;
    return `<section class="panel live" id="live-panel" ${v.caught ? 'data-caught="1"' : ''} aria-labelledby="live-title"><h3 id="live-title">${t('live.title')}</h3>
      <div class="scoreboard"><span>${esc(v.teams[me])}</span><strong id="pb-score" role="status" aria-live="off">${v.score[me]} – ${v.score[opp]}</strong><span>${esc(v.teams[opp])}</span>
      <span class="muted"><span id="pb-clock">${esc(v.periodLabel)} · ${clockText(v.clock)}</span> · ${t('live.timeouts')}: ${v.timeouts}</span></div>
      <div class="live3d"><canvas id="live3d" role="img" aria-label="${t('live.view3d')}" aria-describedby="live3d-cap"></canvas><p id="live3d-cap" class="muted small">${esc(live3dCaption(raw))}</p></div>
      <div class="momentum" id="pb-mom" role="meter" aria-label="${t('live.momentum')}" aria-valuemin="-100" aria-valuemax="100" aria-valuenow="${Math.round(v.momentum * 100)}" style="--mom:${v.momentum}"><span>${esc(v.teams[opp])}</span><i aria-hidden="true"></i><span>${esc(v.teams[me])}</span></div>
      ${controls}${momentHtml}${outcomeHtml}
      <details class="live-stats" open><summary>${t('live.statsTitle')}</summary><div id="pb-stats">${liveStatsHtml(v)}</div></details>
      <div class="grid"><div><h4 id="live-feed-title">${t('live.feed.title')}</h4><ol class="feed" id="pb-feed" reversed tabindex="0" aria-labelledby="live-feed-title">${liveFeedHtml(v)}</ol></div>
      <div class="table-scroll" tabindex="0"><table><caption class="muted">${t('live.top')}</caption><thead><tr><th>${t('live.col.player')}</th><th>PTS</th><th>REB</th><th>AST</th><th>PF</th></tr></thead><tbody id="pb-top">${liveTopHtml(v)}</tbody></table></div></div></section>`;
  }
  // ===== Armazón tipo "Camino a la Leyenda": arranque, menú, modos, creación por pasos, cromo y barra inferior =====
  const PRIMARY_TABS = ['career', 'life', 'league', 'more'];
  const SECONDARY_TABS = ['match', 'world', 'save', 'lab', 'settings', 'arcade', 'guide', 'history', 'shop', 'look', 'club', 'national', 'editor', 'moments', 'market'];
  const NATIONS = Array.from(new Set(['ES', 'US', 'FR', 'DE', 'IT', 'TR', 'GR', 'AR', 'BR', 'AU', 'CA', 'LT', 'RS', 'CN', 'JP', 'KR', 'PH', 'ZA', 'NG', 'SN', 'MX', 'PL', 'HR', 'CZ', 'BE', 'NL', 'PT', 'HU', 'UY', 'VE', 'PR', 'NZ', 'EG', 'MA', 'ID', 'TW', 'LB'].concat(Object.keys(CAA.LeagueCatalog.COUNTRIES).filter(c => c !== 'AF' && c !== 'FJ'), ['FJ'])));
  const NUMBERS = [0, 3, 7, 8, 11, 13, 23, 24, 30, 33, 34, 77];
  const TALENT = { promise: 50, gem: 55, chosen: 60 };
  const ATTR_GROUPS = [
    ['shooting', ['tiroCerca', 'tiroMedia', 'tiroTriple', 'tiroLibre']],
    ['offense', ['bandeja', 'mate', 'poste', 'manejo', 'pase', 'vision']],
    ['defense', ['defExterior', 'defInterior', 'robo', 'tapon', 'rebOf', 'rebDef']],
    ['physical', ['velocidad', 'aceleracion', 'salto', 'fuerza', 'resistencia', 'durabilidad']],
    ['mental', ['lectura', 'clutch', 'liderazgo']]
  ];
  function flag(code) { return /^[A-Z]{2}$/.test(code || '') ? String.fromCodePoint(...code.split('').map(c => 127397 + c.charCodeAt(0))) : '🏀'; }
  function nationName(code) { try { return new Intl.DisplayNames([CAA.I18N.getLocale()], { type: 'region' }).of(code); } catch (_) { return code; } }
  function hue(id) { return Math.round((CAA.Hash.hashString(String(id)) >>> 0) % 360); }
  function crest(club) {
    const cu = club.custom;
    const initials = cu && cu.abbr ? cu.abbr : String(club.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();
    return `<span class="crest" aria-hidden="true" style="--c1:${cu ? esc(cu.primary) : `hsl(${hue(club.id)} 62% 42%)`};--c2:${cu ? esc(cu.secondary) : `hsl(${(hue(club.id) + 40) % 360} 70% 62%)`}">${esc(initials)}</span>`;
  }
  function tier(ovr) { return ovr >= 80 ? 'gold' : ovr >= 68 ? 'silver' : 'bronze'; }
  function meter(label, value) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    const cls = v >= 65 ? 'hi' : v >= 40 ? 'mid' : 'lo';
    return `<div class="meter ${cls}"><span>${label}</span><span class="pips" aria-hidden="true">${Array.from({ length: 6 }, (_, i) => `<i class="${i < Math.round(v / 100 * 6) ? 'on' : ''}"></i>`).join('')}</span><b>${v}</b></div>`;
  }
  function bar(label, value) { const v = Math.round(value); return `<div class="attr"><span>${label}</span><span class="track" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></span><b>${v}</b></div>`; }
  function hasCareer() { return !!(state.career.state && state.career.summary); }
  function seasonLabel(year) { return year + '/' + String((year + 1) % 100).padStart(2, '0'); }

  function renderBoot() {
    if (state.screen === 'lang') {
      return `<main id="panel" class="boot" tabindex="-1"><p class="eyebrow">Idioma · Language</p><h1 class="boot-title">${t('boot.title1')}<br><span>${t('boot.title2')}</span></h1>
        <div class="stack">${[['es', '🇪🇸', 'Español'], ['en', '🇬🇧', 'English'], ['fr', '🇫🇷', 'Français'], ['de', '🇩🇪', 'Deutsch'], ['it', '🇮🇹', 'Italiano']].map(([code, f, name]) => `<button class="choice" data-action="boot-lang" data-locale="${code}" lang="${code}"><span class="big-flag" aria-hidden="true">${f}</span><b>${name}</b></button>`).join('')}</div></main>`;
    }
    if (state.screen === 'menu') {
      const leagues = Object.keys(CAA.Season.LEAGUES).length;
      const clubs = Object.values(CAA.Season.LEAGUES).reduce((a, l) => a + l.teams, 0);
      return `<main id="panel" class="boot" tabindex="-1"><p class="eyebrow">${t('boot.kicker')}</p><h1 class="boot-title">${t('boot.title1')}<br><span>${t('boot.title2')}</span></h1>
        <p class="boot-lead">${t('boot.lead')}</p><p class="boot-stats"><b>${leagues} ${t('boot.leagues')}</b> <b>${clubs} ${t('boot.clubs')}</b> <b>2 ${t('boot.worlds')}</b></p>
        <p class="eyebrow">${t('boot.play')}</p>
        ${hasCareer() ? `<button class="cta" data-action="boot-continue">${t('boot.continue')} <span aria-hidden="true">▶</span></button><p class="muted small">${esc(state.career.summary.player ? state.career.summary.player.name : state.career.summary.coach.name)} · ${esc(state.career.summary.club.name)} · ${t('career.week')} ${state.career.summary.week}</p>` : ''}
        <button class="${hasCareer() ? 'cta ghost' : 'cta'}" data-action="boot-new">${t('boot.new')} <span aria-hidden="true">▶</span></button>
        <button class="cta ghost" data-action="boot-goat" disabled aria-describedby="goat-soon">🏆 GOAT LADDER</button><p id="goat-soon" class="muted small">${t('boot.goatSoon')}</p>
        <button class="row-link" data-action="boot-open" data-target="settings"><span class="ico" aria-hidden="true">⚙</span><span><b>${t('boot.settings')}</b><small>${t('boot.settingsSub')}</small></span><span aria-hidden="true">›</span></button>
        <button class="row-link" data-action="boot-open" data-target="more"><span class="ico" aria-hidden="true">▦</span><span><b>${t('boot.more')}</b><small>${t('boot.moreSub')}</small></span><span aria-hidden="true">›</span></button>
        <p class="version">v${esc(payload.manifest.version)} · ${root.CAAAndroid ? 'ANDROID' : 'WEB'}</p></main>`;
    }
    if (state.screen === 'modes') {
      const card = (mode, ok) => `<button class="mode-card" data-action="boot-mode" data-mode="${mode}" ${ok ? '' : 'disabled'}><b>${t('modes.' + mode)}</b><span>${t('modes.' + mode + 'Desc')}</span>${ok ? '' : `<em>${t('modes.soon')}</em>`}</button>`;
      return `<main id="panel" class="boot" tabindex="-1"><p class="eyebrow">${t('boot.new')}</p><h1 class="boot-title small">${t('modes.title')}</h1>
        <div class="seg" role="group" aria-label="${t('modes.league')}"><button data-action="mode-gender" data-gender="m" aria-pressed="${state.career.gender !== 'f'}">${t('modes.men')}</button><button data-action="mode-gender" data-gender="f" aria-pressed="${state.career.gender === 'f'}">${t('modes.women')}</button></div>
        ${card('player', true)}${card('coach', true)}${card('club', true)}${card('eras', true)}${card('challenge', true)}
        <button class="ghost-btn" data-action="boot-back">${t('wiz.back')}</button></main>`;
    }
    return renderCreate();
  }

  function renderCreate() {
    const c = state.career, w = state.wizard;
    const player = c.mode === 'player';
    const era = !!c.eraYear;
    const chal = !!c.challenge && !player;
    const total = chal ? 2 : (player ? 4 : 2) + (era ? 1 : 0);
    const step = Math.min(w.step, total);
    const pick = (field, value, label, sub) => `<button class="pick" data-action="wiz-set" data-field="${field}" data-value="${esc(value)}" aria-pressed="${String(c[field]) === String(value)}"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
    let body = '';
    const stepKey = chal ? ['challenge', 'who'][step - 1] : (era ? ['era'] : []).concat(player ? ['who', 'position', 'talent', 'club'] : ['who', 'club'])[step - 1];
    if (stepKey === 'challenge') {
      body = `<p class="muted">${t('chal.intro')}</p><div class="pick-list">${Object.keys(CAA.Career.CHALLENGES).map(k => pick('challenge', k, t('chal.' + k), t('chal.' + k + 'Desc') + ' ' + t('chal.' + k + 'Goal'))).join('')}</div>`;
    } else if (stepKey === 'era') {
      body = `<p class="muted">${t('era.intro')}</p><div class="pick-list">${CAA.Eras.DECADES.map(d => pick('eraYear', d.start, t('era.d.' + d.id), t('era.d.' + d.id + 'Desc'))).join('')}</div>`;
    } else if (stepKey === 'who') {
      body = `<label for="career-name">${t(player ? 'wiz.name' : 'wiz.coachName')}<input id="career-name" value="${esc(draft('career-name', c.name))}" maxlength="40" autocomplete="off" placeholder="${t('career.namePlaceholder')}"></label>
        <h3 class="eyebrow">${t(player ? 'wiz.gender' : 'wiz.genderCoach')}</h3><div class="pick-grid two">${pick('gender', 'm', t(player ? 'wiz.genderM' : 'wiz.teamM'))}${pick('gender', 'f', t(player ? 'wiz.genderF' : 'wiz.teamF'))}</div>
        ${c.newClub ? `<h3 class="eyebrow">${t('club.found')}</h3><label for="club-name">${t('club.name')}<input id="club-name" value="${esc(draft('club-name', c.newClub.name))}" maxlength="30" autocomplete="off" placeholder="${t('club.namePh')}"></label>
          <label for="club-abbr">${t('club.abbr')}<input id="club-abbr" value="${esc(draft('club-abbr', c.newClub.abbr))}" maxlength="4" autocomplete="off"></label>
          <div class="pick-grid two"><label for="club-primary">${t('club.primary')}<input id="club-primary" type="color" value="${esc(c.newClub.primary)}"></label><label for="club-secondary">${t('club.secondary')}<input id="club-secondary" type="color" value="${esc(c.newClub.secondary)}"></label></div>` : ''}
        ${chal ? `<details><summary>${t('wiz.advanced')}</summary><label for="career-seed">${t('career.seed')}<input id="career-seed" value="${esc(draft('career-seed', c.seed))}"></label></details>` : ''}
        ${player ? `<label for="career-nationality">${t('career.nationality')}<select id="career-nationality">${NATIONS.slice().sort((a, b) => nationName(a).localeCompare(nationName(b))).map(n => `<option value="${n}" ${n === c.nationality ? 'selected' : ''}>${flag(n)} ${esc(nationName(n))}</option>`).join('')}</select></label>` : ''}`;
    } else if (stepKey === 'position') {
      body = `<h3 class="eyebrow">${t('career.pos')}</h3><div class="pick-grid">${['PG', 'SG', 'SF', 'PF', 'C'].map(p => pick('pos', p, p, t('pos.' + p))).join('')}</div>
        <h3 class="eyebrow">${t('career.archetype')}</h3><div class="pick-list">${CAA.Player.ARCHETYPES.map(a => pick('archetype', a, t('career.archetype.' + a), t('arch.' + a))).join('')}</div>
        <h3 class="eyebrow">${t('career.handedness')}</h3><div class="pick-grid two">${pick('handedness', 'right', t('career.right'))}${pick('handedness', 'left', t('career.left'))}</div>
        <h3 class="eyebrow">${t('wiz.number')}</h3><div class="pick-grid nums">${NUMBERS.map(n => pick('number', n, String(n))).join('')}</div>`;
    } else if (stepKey === 'talent') {
      body = `<div class="pick-list">${['promise', 'gem', 'chosen', 'mystery'].map(k => pick('talent', k, t('talent.' + k), t('talent.' + k + 'Desc'))).join('')}</div>`;
    } else {
      const routes = c.gender === 'f' || era ? ['world'] : player ? ['eu-academy', 'na-draft', 'na-undrafted', 'world'] : ['eu-academy', 'na-draft', 'world'];
      const clubLeague = c.route === 'world' ? c.leagueId : c.route === 'eu-academy' ? 'es-ascenso-iberico' : 'na-boreal-men';
      body = `<h3 class="eyebrow">${t('wiz.path')}</h3><div class="pick-list">${routes.map(r => pick('route', r, t('route.' + r), t('route.' + r + 'Desc'))).join('')}</div>
        ${c.route === 'world' ? `${leaguePicker('career', c.gender, c.leagueId, null, c.eraYear, c.leagueCountry)}${era ? `<p class="muted small">${t('era.leaguesNote', { year: c.eraYear })}</p>` : ''}` : ''}
        ${c.newClub ? `<p class="muted small">${t('club.foundNote')}</p>` : `<h3 class="eyebrow">${t(c.route === 'na-draft' ? 'wiz.preferredClub' : 'wiz.firstClub')}</h3>`}
        ${c.newClub ? '' : c.clubsLoading ? `<p class="muted">${t('status.working')}</p>` : `<div class="pick-list clubs">${c.clubs.map(x => `<button class="pick club" data-action="wiz-set" data-field="clubId" data-value="${esc(x.id)}" aria-pressed="${x.id === c.clubId}">${crest(x)}<b>${esc(x.name)}</b><small>${esc(c.route === 'world' ? leagueLabel(clubLeague) : t('league.' + clubLeague))}</small></button>`).join('')}</div>`}
        <p class="muted small">${t(c.route === 'na-draft' ? 'career.draftClubNote' : 'career.clubNote')}</p>
        <details><summary>${t('wiz.advanced')}</summary><label for="career-seed">${t('career.seed')}<input id="career-seed" value="${esc(draft('career-seed', c.seed))}"></label><label class="check-label"><input id="career-quick" type="checkbox" ${c.quick ? 'checked' : ''}>${t('wiz.quick')}</label></details>`;
    }
    const last = step === total;
    return `<main id="panel" class="boot create" tabindex="-1"><p class="eyebrow">${t('wiz.step', { n: step, total })}</p>
      <div class="steps" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>
      <h1 class="boot-title small">${t('wiz.' + stepKey + (player || stepKey === 'era' || stepKey === 'challenge' ? '' : 'Coach'))}</h1>${body}
      <div class="wiz-nav"><button class="ghost-btn" data-action="${step === 1 ? 'wiz-cancel' : 'wiz-back'}">${t(step === 1 ? 'confirm.cancel' : 'wiz.back')}</button>
      ${last ? `<button class="cta" data-action="career-create" ${!chal && (c.clubsLoading || !c.clubId) ? 'disabled' : ''}>${t('wiz.start')} <span aria-hidden="true">▶</span></button>` : `<button class="cta" data-action="wiz-next">${t('wiz.next')}</button>`}</div></main>`;
  }

  function renderCromo() {
    if (!hasCareer()) return `<header class="cromo"><div class="cromo-id"><b class="title-sm">${t('boot.title1')} ${t('boot.title2')}</b></div><button class="iconbtn" data-action="boot-menu" aria-label="${t('nav.menu')}">⋯</button></header>`;
    const s = state.career.summary, p = s.player;
    const ovr = p ? p.ovr : Math.round(s.table.length ? 50 + (s.club.wins - s.club.losses) : 50);
    return `<header class="cromo"><div class="ovr tier-${tier(ovr)}" aria-label="${t('cromo.ovr', { ovr })}"><b>${p ? p.ovr : '★'}</b><small>${p ? esc(p.pos) : t('cromo.coach')}</small></div>
      <div class="cromo-id">${p ? `<span class="dorsal" aria-label="${t('cromo.number', { n: p.number })}">${p.number}</span>` : ''}<b class="name">${esc(p ? p.name : s.coach.name)}</b>
      <span class="cromo-sub">${crest(s.club)} ${esc(s.club.name)} · ${p ? t('cromo.age', { age: p.age }) + ' ' + flag(p.nationality) : t('cromo.coachRole')}</span></div>
      <button class="iconbtn" data-action="toggle-audio" aria-pressed="${!!state.settings.audio}" aria-label="${t('settings.audio')}">♪</button><button class="iconbtn" data-action="boot-menu" aria-label="${t('nav.menu')}">⋯</button></header>`;
  }

  function eraDefaultLeague() {
    const c = state.career; if (!c.eraYear) return;
    const L = CAA.Season.LEAGUES[c.leagueId];
    if (!L || L.gender !== c.gender || !CAA.Eras.available(L, c.eraYear)) { const first = CAA.Season.leagueList(c.gender).find(l => CAA.Eras.available(CAA.Season.LEAGUES[l.id], c.eraYear)); c.leagueId = first ? first.id : c.leagueId; }
    c.clubId = ''; c.clubsRoute = null;
  }
  function careerWomen() { const s = state.career.summary; return !!(s && s.league && s.league.gender === 'f'); }
  function leagueName(id) { const L = CAA.Season.LEAGUES[id]; return L ? L.name : id; }
  function leagueLabel(id) { const L = CAA.Season.LEAGUES[id]; return L ? (L.country === 'AF' ? '🌍' : flag(L.country)) + ' ' + L.name : id; }
  const CONTINENTS = ['europe', 'americas', 'asia', 'oceania', 'africa'];
  // Selector en dos pasos (país → liga) para las más de 200 ligas del mundo.
  function leaguePicker(prefix, gender, selected, exclude, year, countryState) {
    const list = CAA.Season.leagueList(gender).filter(l => (!exclude || !exclude.includes(l.id)) && (!year || CAA.Eras.available(CAA.Season.LEAGUES[l.id], year)));
    const selL = CAA.Season.LEAGUES[selected];
    const country = countryState && list.some(l => l.country === countryState) ? countryState : selL && list.some(l => l.country === selL.country) ? selL.country : (list[0] || {}).country;
    const countries = Array.from(new Set(list.map(l => l.country)));
    const cname = c => c === 'AF' ? t('continent.africa') : nationName(c);
    const groups = CONTINENTS.map(ct => { const cs = countries.filter(c => (list.find(l => l.country === c) || {}).continent === ct).sort((a, b) => cname(a).localeCompare(cname(b))); return cs.length ? `<optgroup label="${t('continent.' + ct)}">${cs.map(c => `<option value="${c}" ${c === country ? 'selected' : ''}>${c === 'AF' ? '🌍' : flag(c)} ${esc(cname(c))}</option>`).join('')}</optgroup>` : ''; }).join('');
    const leagues = list.filter(l => l.country === country).sort((a, b) => a.level - b.level || a.gender.localeCompare(b.gender));
    return `<label for="${prefix}-country">${t('wiz.country')}<select id="${prefix}-country" data-picker="${prefix}">${groups}</select></label>
      <label for="${prefix}-league">${t('wiz.league')}<select id="${prefix}-league">${leagues.map(l => `<option value="${l.id}" ${l.id === selected ? 'selected' : ''}>${esc(CAA.Season.LEAGUES[l.id].name)}${l.level === 2 ? ' · 2' : ''}</option>`).join('')}</select></label>
      <p class="muted small">${t('wiz.leagueCount', { n: list.length, c: countries.length })}</p>`;
  }
  function leagueOptions(gender, selected, exclude, year) {
    const list = CAA.Season.leagueList(gender).filter(l => (!exclude || !exclude.includes(l.id)) && (!year || CAA.Eras.available(CAA.Season.LEAGUES[l.id], year)));
    return CONTINENTS.map(c => { const ls = list.filter(l => l.continent === c); return ls.length ? `<optgroup label="${t('continent.' + c)}">${ls.map(l => `<option value="${l.id}" ${l.id === selected ? 'selected' : ''}>${esc(leagueLabel(l.id))}${l.level === 2 ? ' · 2' : ''}</option>`).join('')}</optgroup>` : ''; }).join('');
  }
  function newsText(i) {
    const d = i.detail || {};
    const vars = { weeks: i.weeks || 0, pick: d.overall, us: i.score ? i.score.join('–') : '', team: d.team || '', club: d.clubName || d.club || '', league: leagueName(d.targetLeague || d.leagueId || ''), n: d.value || '' };
    if (i.type === 'eraRule') return t('inbox.eraRule.' + d.rule, vars);
    if (i.type === 'cup') return t('inbox.cup', { club: d.club || '' }) + (d.mine && d.mine !== 'out' ? ' ' + t('cup.mine.' + d.mine) : '');
    if (i.type === 'nationalWindow') return t(d.win ? 'inbox.natWin' : 'inbox.natLoss', { n: d.pts });
    if (i.type === 'nationalSummer') return !d.qualified ? t('inbox.natNoQual', { kind: t('nat.kind.' + d.kind) }) : t('inbox.natSummer', { kind: t('nat.kind.' + d.kind), place: t('nat.place.' + d.place) });
    const key = 'inbox.' + i.type + (i.type === 'live' ? (i.won ? 'Won' : 'Lost') : '');
    return t(key, vars);
  }

  function chips(fx) {
    const out = [];
    for (const [k, v] of Object.entries(fx || {})) {
      if (['agent', 'sponsor', 'flag', 'unflag', 'xp', 'baby', 'familyStatus'].includes(k)) continue;
      if (k === 'attr') { for (const [a, d] of Object.entries(v)) out.push(`<span class="chip ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d} ${t('attr.' + a)}</span>`); continue; }
      if (k === 'salary') { out.push(`<span class="chip ${v >= 1 ? 'up' : 'down'}">${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)} % ${t('effect.salary')}</span>`); continue; }
      if (k === 'injuryWeeks') { out.push(`<span class="chip ${v < 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${v} ${t('effect.injuryWeeks')}</span>`); continue; }
      if (k === 'fatigue') { out.push(`<span class="chip ${v < 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${Math.round(v * 100)} ${t('effect.fatigue')}</span>`); continue; }
      const bad = k === 'load' ? v > 0 : v < 0;
      out.push(`<span class="chip ${bad ? 'down' : 'up'}">${v > 0 ? '+' : ''}${k === 'cash' ? v.toLocaleString(CAA.I18N.getLocale()) : v} ${t('effect.' + k)}</span>`);
    }
    return out.join('');
  }
  const seasonsTxt = n => n === 1 ? t('ret.seasonOne') : t('ret.seasonMany', { n });
  function renderRetirement(s) {
    const r = s.retirement, L = r.legacy, f = s.family || { children: [] };
    const sons = f.children.map((c, i) => ({ c, i })).filter(x => state.career.state.year - x.c.bornYear >= 0);
    return `<section class="card retire"><span class="eyebrow">${t('ret.kicker', { year: seasonLabel(r.year) })}</span><h2>${t('ret.title')}</h2>
      <p>${t('ret.body', { name: esc(L.name), seasons: seasonsTxt(L.seasons), pts: L.totals.pts, titles: L.titles, awards: L.awards })}</p>
      <div class="stack">
        <button class="option" data-action="retire-coach"><b>🧑‍🏫 ${t('ret.coach')}</b><span class="muted small">${t('ret.coachDesc', { club: esc(L.lastClubName) })}</span></button>
        ${sons.length ? `<div class="option heir"><b>👪 ${t('ret.heir')}</b><span class="muted small">${t('ret.heirDesc')}</span>
          ${sons.map(({ c, i }) => `<div class="heir-row"><span><b>${esc(c.name)}</b> <small class="muted">${t('ret.childAge', { n: state.career.state.year - c.bornYear })}</small></span><button class="small-btn primary" data-action="retire-heir" data-child="${i}">${t('ret.takeOver')}</button></div>`).join('')}
          <label for="heir-pos">${t('career.pos')}<select id="heir-pos">${['PG', 'SG', 'SF', 'PF', 'C'].map(p => `<option value="${p}">${p} · ${t('pos.' + p)}</option>`).join('')}</select></label>
          <label class="check-label"><input id="heir-number" type="checkbox" checked>${t('ret.keepNumber', { n: L.number })}</label></div>` : `<p class="muted small">${t('ret.noHeir')}</p>`}
        <button class="option" data-action="retire-end"><b>🏁 ${t('ret.end')}</b><span class="muted small">${t('ret.endDesc')}</span></button>
      </div></section>`;
  }
  function renderHome() {
    if (hasCareer() && state.career.summary.retirement) return renderRetirement(state.career.summary);
    if (hasCareer() && state.career.summary.careerOver && state.career.summary.quickEnd) return `<section class="card retire"><h2>${t('ret.overTitle')}</h2><p>${t('sum.quickEnd')}</p>${(state.career.summary.history || []).map(h => `<p class="small">${seasonLabel(h.year)} · ${esc(leagueName(h.leagueId))} · ${h.clubRank}.º</p>`).join('')}<button class="cta" data-action="boot-new">${t('boot.new')} ▶</button></section>`;
    if (hasCareer() && state.career.summary.careerOver) { const f = state.career.summary.family || { legends: [] }; return `<section class="card retire"><h2>${t('ret.overTitle')}</h2><p>${t('ret.overBody')}</p><ul class="news">${f.legends.map(l => `<li>🏛 <b>${esc(l.name)}</b> · ${t('ret.legendLine', { seasons: seasonsTxt(l.seasons), pts: l.totals ? l.totals.pts : 0, titles: l.titles })}</li>`).join('')}</ul><button class="cta" data-action="boot-new">${t('boot.new')} ▶</button></section>`; }
    if (!hasCareer()) return `<section class="card"><h2>${t('home.noCareer')}</h2><p class="muted">${t('home.noCareerDesc')}</p><button class="cta" data-action="boot-new">${t('boot.new')} ▶</button></section>`;
    const c = state.career, s = c.summary, life = s.life || { counters: {}, press: [] };
    const m = s.meters;
    const guideStep = life.guideStep || 0;
    let skipGuide = false; try { skipGuide = root.localStorage.getItem('caa.guideSkip.' + s.careerId) === '1'; } catch (_) {}
    const guides = [['life', 'life'], ['live', 'career'], ['league', 'league'], ['train', 'career'], ['trophies', 'life']];
    const guide = !skipGuide && guideStep < guides.length ? `<section class="card guide"><div class="guide-head"><span class="eyebrow">${t('guide.kicker', { n: guideStep + 1, total: guides.length })}</span><button class="link" data-action="guide-skip">${t('guide.skip')}</button></div>
      <div class="steps" aria-hidden="true">${guides.map((_, i) => `<i class="${i <= guideStep ? 'on' : ''}"></i>`).join('')}</div>
      <h3>${t('guide.' + guides[guideStep][0])}</h3><p>${t('guide.' + guides[guideStep][0] + 'Desc')}</p>
      <div class="row">${guides[guideStep][1] !== 'career' ? `<button class="small-btn" data-tab-go="${guides[guideStep][1]}">${t('guide.go.' + guides[guideStep][1])}</button>` : ''}<button class="small-btn" data-action="life-guide-next">${t('guide.done')}</button></div></section>` : '';
    const segs = 5, seg = s.playoffs ? 4 : Math.min(segs - 2, Math.floor(s.round / Math.max(1, s.totalRounds) * (segs - 1)));
    const season = `<section class="season"><div class="season-head"><h2>${t('home.season', { season: seasonLabel(s.year) })}</h2><span class="muted">${s.playoffs ? t('po.kicker') : t('home.round', { n: s.round + 1, total: s.totalRounds })}</span></div>
      <ol class="timeline" aria-label="${t('home.timeline')}">${Array.from({ length: segs }, (_, i) => `<li class="${i < seg ? 'done' : i === seg ? 'now' : ''}" ${i === seg ? 'aria-current="step"' : ''}>${t('home.seg' + i)}</li>`).join('')}</ol>
      <div class="meters">${s.player ? meter(t('meter.form'), m.form) + meter(t('meter.morale'), m.morale) + meter(t('meter.fitness'), m.fitness) + meter(t('meter.trust'), m.trust) + meter(t('meter.fans'), m.fans)
        : meter(t('meter.morale'), m.morale) + meter(t('meter.board'), m.trust) + meter(t('meter.locker'), m.locker) + meter(t('meter.fitness'), m.fitness) + meter(t('meter.fans'), m.fans)}</div></section>`;
    const fam = s.family;
    const famSetup = s.player && (!fam || !fam.configured) && s.week <= 4 ? `<section class="card family"><div class="guide-head"><h3>${t('fam.title')}</h3><span aria-hidden="true">👪</span></div><p class="muted small">${t('fam.setupDesc')}</p>
      <label for="partner-name">${t('fam.partnerName')}<input id="partner-name" maxlength="24" value="${esc(draft('partner-name', ''))}" placeholder="${t('fam.partnerPlaceholder')}"></label>
      <div class="pick-grid">${['none', 'partner', 'parent'].map(k => `<button class="option center" data-action="family-setup" data-kind="${k}"><b>${t('fam.setup.' + k)}</b></button>`).join('')}</div></section>` : '';
    const ev = s.event;
    const L = pair => pick(pair);
    const decision = ev ? `<section class="card decision"><div class="guide-head"><span class="tag led">● ${t(ev.story ? 'home.story' : 'home.decision')}</span><span class="muted small">${esc(t('eventcat.' + ev.category))}</span></div>
      <h3>${esc(L(ev.title))}</h3><p>${esc(L(ev.body))}</p>
      <div class="stack">${ev.options.map(o => `<button class="option" data-action="life-event" data-option="${o.id}"><span class="opt-head"><b>${esc(L(o.label))}</b><span class="odds ${o.p == null ? 'sure' : o.p >= 0.6 ? 'hi' : o.p >= 0.45 ? 'mid' : 'lo'}">${o.p == null ? t('odds.sure') : t('odds.pct', { p: Math.round(o.p * 100) })}</span></span>${o.desc ? `<span class="muted small">${esc(L(o.desc))}</span>` : ''}
        <span class="chips">${o.p == null ? chips(o.effects) : `<span class="chip-label">${t('odds.ifGood')}</span>${chips(o.ok)}<span class="chip-label">${t('odds.ifBad')}</span>${chips(o.ko)}`}</span></button>`).join('')}</div></section>` : '';
    const lo = life.lastOutcome;
    const outcome = lo && !ev ? `<section class="card outcome ${lo.uncertain ? (lo.good ? 'good' : 'bad') : ''}"><span class="eyebrow">${esc(L(lo.title))} · ${esc(L(lo.label))}</span><p><b>${esc(L(lo.result))}</b></p><span class="chips">${chips(lo.effects)}</span></section>` : '';
    const po = s.playoffs;
    const seasonCard = s.lastSeason ? renderSeasonSummary(s.lastSeason) : '';
    const poCard = po && !po.done ? `<section class="card playoffs"><span class="eyebrow">${t('po.kicker')} · ${t('po.round.' + po.round)}</span>
      ${po.series ? `<h3>${t('po.series', { w: po.series.wins, l: po.series.losses })}</h3><p class="muted small">${t('po.bestOf', { n: po.series.bestOf })}</p>` : po.status === 'waiting' ? `<h3>${t('po.waiting')}</h3><p class="muted small">${t('po.waitingDesc')}</p>` : `<h3>${t(po.status === 'missed' ? 'po.missed' : po.status === 'promoted' ? 'po.promoted' : 'po.out')}</h3><p class="muted small">${t('po.skipDesc')}</p><button class="small-btn" data-action="career-skip">${t('po.skip')}</button>`}</section>` : '';
    const next = s.next ? `<section class="card next"><span class="eyebrow">${s.next.playoff ? t('po.game', { round: t('po.round.' + s.next.roundName), n: s.next.game }) : t('home.next', { n: s.next.round })} · ${t(s.next.home ? 'home.home' : 'home.away')}</span>
      <div class="versus">${crest(s.club)}<b>${esc(s.club.name)}</b><span class="muted">${s.club.wins}-${s.club.losses}</span><em>vs</em>${crest(s.next.opponent)}<b>${esc(s.next.opponent.name)}</b><span class="muted">${s.next.opponent.wins}-${s.next.opponent.losses}</span></div></section>` : '';
    const recent = s.recent.length ? `<section class="card"><div class="guide-head"><h3>${t('home.lastGame')}</h3>${c.state.lastMatch ? `<button class="small-btn" data-action="career-watch">${t('career.watch')}</button>` : ''}</div>
      <p class="result ${s.recent[0].won ? 'ok' : 'bad'}"><b>${t(s.recent[0].won ? 'home.win' : 'home.loss')}</b> ${s.recent[0].us}–${s.recent[0].them} ${t(s.recent[0].home ? 'home.vsHome' : 'home.vsAway', { team: s.recent[0].opponent })}</p>
      <p class="form-strip" aria-label="${t('home.formStrip')}">${s.recent.map(r => `<span class="${r.won ? 'w' : 'l'}">${t(r.won ? 'home.w' : 'home.l')}</span>`).join('')}</p></section>` : '';
    const week = s.player && !(c.state.live && c.state.live.week === c.state.week) && s.next ? `<section class="card"><h3>${t('home.week')}</h3><p class="muted small">${t('home.weekDesc')}</p>
      <div class="stack"><button class="option" data-action="career-train"><b>${t('home.train')}</b><span class="muted small">${t('home.trainDesc')}</span></button><button class="option" data-action="career-rest"><b>${t('home.rest')}</b><span class="muted small">${t('home.restDesc')}</span></button>${fam && (fam.partner || fam.children.length) ? `<button class="option" data-action="career-family"><b>${t('home.family')}</b><span class="muted small">${t('home.familyDesc')}</span></button>` : ''}</div></section>` : '';
    const sq = s.squad;
    const coachWeek = sq && s.next ? `<section class="card"><h3>${t('coach.week')}</h3><p class="muted small">${t('coach.weekDesc')}</p><div class="seg" role="group" aria-label="${t('coach.week')}">${['light', 'normal', 'hard'].map(v => `<button data-action="coach-training" data-v="${v}" aria-pressed="${sq.training === v}">${t('coach.training.' + v)}</button>`).join('')}</div><p class="muted small">${t('coach.trainingDesc.' + sq.training)}</p></section>` : '';
    const sc = s.scouting;
    const scout = sc ? `<section class="card"><span class="eyebrow">${t('coach.scout')}</span><h3>${esc(sc.name)} <span class="muted small">${sc.wins}-${sc.losses} · ${t('coach.avg', { n: sc.avgOvr })}</span></h3>
      <p class="muted small">${t('coach.style', { pace: t('coach.pace.' + sc.pace), shooting: t('coach.focus.' + sc.shooting) })}</p><ul class="news">${sc.top.map(p => `<li><b>${esc(p.name)}</b> · ${esc(p.pos)} · ${p.ovr} <span class="muted small">${t('career.archetype.' + p.archetype)}</span></li>`).join('')}</ul></section>` : '';
    const market = s.market.length ? `<section class="card"><h3>${t('career.market')}</h3><div class="stack">${s.market.map((mk, i) => `<div class="offer"><span>${mk.crossing ? `<b>${esc(mk.crossing.clubName || '')}</b> <small class="muted">${esc(leagueLabel(mk.crossing.targetLeague))}</small><br>` : ''}${esc(mk.contract.salary.toLocaleString(CAA.I18N.getLocale()))} €/$ · ${mk.contract.years} ${t('career.years')}</span><button class="small-btn" data-action="career-sign" data-index="${i}">${t('career.sign')}</button></div>`).join('')}</div></section>` : '';
    const news = s.inbox.slice().reverse().map(i => `<li>${esc(newsText(i))}</li>`).concat((life.press || []).slice(-4).reverse().map(p => `<li class="press">📰 ${esc(pick(p))}</li>`)).slice(0, 8).join('');
    return `${eraBanner(s)}${seasonCard}${famSetup}${guide}${renderLive(c)}${decision}${outcome}${poCard}${season}${next}${week}${coachWeek}${scout}${recent}${market}${socialCard(s)}<section class="card"><h3>${t('home.news')}</h3><ul class="news">${news}</ul></section>`;
  }

  function renderMe() {
    if (!hasCareer()) return renderHome();
    const s = state.career.summary, life = s.life || { achievements: [], owned: [], equipment: {}, counters: {}, press: [] };
    const packs = CAA.Content.packs();
    const p = s.player;
    const potLow = p ? Math.max(p.ovr, p.potential - 4) : 0, potHigh = p ? Math.min(99, p.potential + 4) : 0;
    const hero = `<section class="card me-hero">${avatarHtml()}<div><h2>${esc(p ? p.name : s.coach.name)}</h2>
      ${p ? `<p class="muted">${t('pos.' + p.pos)} · ${t('career.archetype.' + p.archetype)} · ${t(p.handedness === 'left' ? 'career.left' : 'career.right')}</p>
      <div class="kv"><span>${t('me.ovr')}</span><b>${p.ovr}</b><span>${t('me.pot')}</span><b>${potLow}–${potHigh}</b><span>${t('me.height')}</span><b>${p.height} cm</b><span>${t('me.wingspan')}</span><b>${p.wingspan} cm</b><span>${t('me.weight')}</span><b>${p.weight} kg</b><span>${t('career.nationality')}</span><b>${flag(p.nationality)} ${esc(nationName(p.nationality))}</b></div>`
      : `<p class="muted">${t('cromo.coachRole')} · ${esc(s.club.name)}</p><div class="kv"><span>${t('meter.morale')}</span><b>${s.coach.morale}</b><span>${t('meter.board')}</span><b>${s.coach.trust}</b></div>`}</div></section>`;
    const brand = life.sponsor ? t('sponsor.' + life.sponsor) : t('me.noSponsor');
    const offcourt = `<section class="card"><h3>${t('me.offcourt')}</h3><div class="kv"><span>${t('me.agent')}</span><b>${t(life.agent ? 'agent.' + life.agent : 'me.noAgent')}</b><span>${t('me.sponsor')}</span><b>${esc(brand)}</b><span>${t('meter.fame')}</span><b>${life.fame || 0}</b><span>${t('life.cash')}</span><b>${(life.cash || 0).toLocaleString(CAA.I18N.getLocale())}</b><span>${t('life.style')}</span><b>${life.style}</b></div></section>`;
    const attrs = p ? `<section class="card"><h3>${t('me.attributes')}</h3><div class="attr-groups">${ATTR_GROUPS.map(([g, keys]) => `<div><h4 class="eyebrow">${t('attrg.' + g)}</h4>${keys.map(k => bar(t('attr.' + k), p.attrs[k])).join('')}</div>`).join('')}</div></section>` : '';
    const st = p ? p.stats : null;
    const stats = p ? `<section class="card"><h3>${t('me.season')}</h3><div class="statline">${[['gp', st.gp], ['min', (st.min / Math.max(1, st.gp)).toFixed(1)], ['pts', (st.pts / Math.max(1, st.gp)).toFixed(1)], ['reb', (st.reb / Math.max(1, st.gp)).toFixed(1)], ['ast', (st.ast / Math.max(1, st.gp)).toFixed(1)], ['stl', (st.stl / Math.max(1, st.gp)).toFixed(1)], ['blk', (st.blk / Math.max(1, st.gp)).toFixed(1)]].map(([k, v]) => `<div><b>${v}</b><small>${t('stat.' + k)}</small></div>`).join('')}</div>
      <p class="muted small">${p.contract ? t('me.contract', { salary: p.contract.salary.toLocaleString(CAA.I18N.getLocale()), years: p.contract.years }) : t('me.noContract')}</p></section>` : '';
    const petCard = renderPet(s);
    const fm = s.family;
    const famCard = fm && (fm.partner || fm.children.length || fm.legends.length) ? `<section class="card family"><h3>${t('fam.title')}</h3>
      ${fm.partner ? `<p><b>${esc(fm.partner.name)}</b> · ${t('fam.status.' + fm.status)}</p>${meter(t('fam.happiness'), fm.partner.happiness)}` : `<p class="muted small">${t('fam.status.single')}</p>`}
      ${fm.children.length ? `<h4 class="eyebrow">${t('fam.children')}</h4>${fm.children.map(c => `<div class="kv"><span>${esc(c.name)} · ${t('ret.childAge', { n: state.career.state.year - c.bornYear })}</span><b>${t('fam.bond', { n: Math.round(c.bond) })}</b></div>`).join('')}` : ''}
      ${fm.legends.length ? `<h4 class="eyebrow">${t('fam.dynasty', { n: fm.generation })}</h4><ul class="news">${fm.legends.map((l, i) => `<li>🏛 <b>${esc(l.name)}</b> · ${t('fam.gen', { n: i + 1 })} · ${t('ret.legendLine', { seasons: seasonsTxt(l.seasons), pts: l.totals ? l.totals.pts : 0, titles: l.titles })}</li>`).join('')}</ul>` : ''}</section>` : '';
    const coachCards = s.squad ? renderSquad(s) : '';
    const best = (life.arcade && life.arcade.best) || {};
    const minis = `<section class="card"><div class="guide-head"><h3>${t('arcade.title')}</h3><span class="tag led">${t('arcade.plays', { n: life.counters.arcadePlays || 0 })}</span></div>${arcadeExtras(life)}<div class="minis">${CAA.Arcade.TYPES.map(g => `<div class="mini"><span class="mini-ico" aria-hidden="true">${{ freeThrow: '🎯', three: '🏀', buzzer: '⏱', dunk: '🚀', defense: '🛡', street: '🏙' }[g]}</span><span><b>${t('arcade.' + g)}</b><small>${t('arcade.' + g + 'Desc')}</small><small class="best">${best[g] != null ? t('arcade.best', { n: best[g] }) : t('arcade.noBest')}${arcadeStat(life, g)}</small></span><span class="mini-btns"><button class="small-btn primary" data-action="arcade-start" data-game="${g}">${t('arcade.play')}</button><button class="small-btn" data-action="arcade-auto" data-game="${g}">${t('arcade.auto')}</button></span></div>`).join('')}</div>
      ${life.pendingArcade ? `<p class="muted small">${t('arcade.pending', { game: t('arcade.' + life.pendingArcade.type) })}</p><div class="row"><button class="small-btn" data-action="arcade-resume">${t('arcade.resume')}</button><button class="small-btn" data-action="arcade-cancel">${t('arcade.abandon')}</button></div>` : ''}</section>`;
    const practice = `<section class="card"><h3>${t('me.practice')}</h3><p class="muted small">${t('me.practiceDesc')}</p>
      <div class="pick-grid two"><button class="option" data-action="life-practice-start"><b>${t('life.practiceManual')}</b></button><button class="option" data-action="life-practice-auto"><b>${t('life.practiceAuto')}</b></button><button class="option" data-action="life-buzzer-start"><b>${t('life.buzzerManual')}</b></button><button class="option" data-action="life-buzzer-auto"><b>${t('life.buzzerAuto')}</b></button></div>
      ${state.practice && state.practice.start != null ? `<button class="cta" data-action="life-practice-release">${t('life.release')}</button>` : ''}
      ${life.pendingPractice ? `<p class="muted small">${t('life.pendingAttempt', { type: t(life.pendingPractice.type === 'buzzer' ? 'life.buzzerAuto' : 'life.practiceAuto'), id: life.pendingPractice.id })}</p><div class="row"><button class="small-btn" data-action="life-practice-resume">${t('life.resumeAttempt')}</button><button class="small-btn" data-action="life-practice-cancel">${t('life.cancelAttempt')}</button></div>` : ''}
      ${state.practice && state.practice.result ? `<p class="${state.practice.result.made ? 'ok' : 'bad'}"><b>${state.practice.result.made ? t('life.made') : t('life.missed')}</b></p>` : ''}</section>`;
    const g = s.gear;
    const shop = g ? `<section class="card"><div class="guide-head"><h3>${t('me.gear')}</h3><span class="tag">${(g.cash || 0).toLocaleString(CAA.I18N.getLocale())} €</span></div>
      <p class="small">${g.effective.total ? t('shop.effective', { stats: statText(g.effective.attrs) }) : t('shop.none')}</p>
      <div class="row"><button class="small-btn primary" data-tab="shop">🛍 ${t('more.shop')}</button><button class="small-btn" data-tab="look">🎨 ${t('more.look')}</button></div></section>` : '';
    const all = packs.achievements.achievements.filter(a => !a.mode || a.mode === 'any' || a.mode === s.mode), unlocked = all.filter(a => life.achievements.includes(a.id)).length;
    const trophies = `<section class="card"><div class="guide-head"><h3>${t('me.trophies')}</h3><span class="tag led">${unlocked}/${all.length}</span></div><ul class="trophies" tabindex="0" aria-label="${t('me.trophies')}">${all.map(a => { const ok = life.achievements.includes(a.id); return `<li class="${ok ? 'ok' : 'locked'}"><span aria-hidden="true">${ok ? '🏆' : '🔒'}</span><span><b>${esc(loc(a.title))}</b><small>${esc(t('ach.' + a.metric, { n: a.threshold.toLocaleString(CAA.I18N.getLocale()) }))}</small></span></li>`; }).join('')}</ul></section>`;
    const press = (life.press || []).length ? `<section class="card"><h3>${t('life.press')}</h3><ul class="news">${life.press.slice().reverse().map(x => `<li>📰 ${esc(pick(x))}</li>`).join('')}</ul></section>` : '';
    if (s.squad) return hero + coachCards + famCard + petCard + offcourt + minis + shop + trophies + press;
    return hero + famCard + petCard + offcourt + minis + attrs + stats + practice + shop + trophies + press;
  }

  function renderSquad(s) {
    const sq = s.squad;
    const pick = state.coachPick && state.coachPick.career === s.careerId ? state.coachPick.ids : sq.starters;
    const rows = sq.roster.map(p => { const on = pick.includes(p.id); return `<tr class="${on ? 'me' : ''}"><td><button class="starter ${on ? 'on' : ''}" data-action="coach-starter" data-id="${esc(p.id)}" aria-pressed="${on}" aria-label="${t(on ? 'coach.removeStarter' : 'coach.addStarter', { name: esc(p.name) })}">${on ? '★' : '☆'}</button></td><td>${face(p)} ${esc(p.name)}${p.injury ? ` <span class="bad small">+${p.injury}</span>` : ''}</td><td>${esc(p.pos)}</td><td>${p.ovr}</td><td>${p.age}</td><td class="${p.morale < 40 ? 'bad' : ''}">${p.morale}</td><td class="${p.load > 60 ? 'bad' : ''}">${p.load}</td></tr>`; }).join('');
    const changed = JSON.stringify(pick.slice().sort()) !== JSON.stringify(sq.starters.slice().sort());
    const tac = (k, vals) => `<div class="seg" role="group" aria-label="${t('coach.' + k)}">${vals.map(v => `<button data-action="coach-tactic" data-k="${k}" data-v="${v}" aria-pressed="${sq.tactic[k] === v}">${t('coach.' + k + '.' + v)}</button>`).join('')}</div>`;
    return `<section class="card"><div class="guide-head"><h3>${t('coach.squad')}</h3><span class="tag ${pick.length === 5 ? 'led' : ''}">${t('coach.starters', { n: pick.length })}</span></div>
      <div class="table-scroll compact" tabindex="0" role="region" aria-label="${t('coach.squad')}"><table><thead><tr><th><span class="sr-only">${t('coach.starter')}</span></th><th>${t('live.col.player')}</th><th>POS</th><th>${t('me.ovr')}</th><th>${t('coach.age')}</th><th>${t('meter.morale')}</th><th>${t('effect.load')}</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${changed ? `<div class="row"><button class="cta" data-action="coach-save-starters" ${pick.length !== 5 ? 'disabled' : ''}>${t('coach.saveStarters')}</button></div>` : ''}</section>
      <section class="card"><h3>${t('coach.tactics')}</h3><h4 class="eyebrow">${t('coach.pace')}</h4>${tac('pace', ['slow', 'normal', 'fast'])}<h4 class="eyebrow">${t('coach.focus')}</h4>${tac('focus', ['inside', 'balanced', 'outside'])}<h4 class="eyebrow">${t('coach.defense')}</h4>${tac('defense', ['man', 'press', 'help'])}<p class="muted small">${t('coach.tacticsDesc')}</p></section>`;
  }
  function renderSeasonSummary(ls) {
    const resKey = ls.myChampion ? 'champion' : ls.promoted ? 'promoted' : (ls.result || 'none');
    const st = ls.stats;
    return `<section class="card season-summary ${ls.myChampion || ls.promoted ? 'gold' : ''}"><span class="eyebrow">${t('sum.kicker', { season: seasonLabel(ls.year) })}</span>
      <h2>${t('sum.result.' + resKey)}</h2><p class="muted">${t('sum.line', { rank: ls.rank, teams: ls.teams, w: ls.record.wins, l: ls.record.losses, champ: ls.champion })}</p>
      ${ls.challenge ? `<p class="${ls.challenge.medal === 'none' ? 'muted' : 'ok'}"><b>${({ gold: '🥇', silver: '🥈', bronze: '🥉' })[ls.challenge.medal] || ''} ${t('sum.challenge', { medal: t('chal.medal.' + ls.challenge.medal) })}</b></p>` : ''}
      ${st ? `<div class="statline"><div><b>${(st.pts / Math.max(1, st.gp)).toFixed(1)}</b><small>${t('stat.pts')}</small></div><div><b>${(st.reb / Math.max(1, st.gp)).toFixed(1)}</b><small>${t('stat.reb')}</small></div><div><b>${(st.ast / Math.max(1, st.gp)).toFixed(1)}</b><small>${t('stat.ast')}</small></div><div><b>${st.ovrStart}→${st.ovr}</b><small>${t('me.ovr')}</small></div></div>` : ''}
      <h3>${t('sum.awards')}</h3><ul class="news">${ls.awards.map(a => `<li class="${a.mine ? 'mine' : ''}">${a.mine ? '🏆 ' : ''}<b>${t('award.' + a.award)}</b> · ${esc(a.player || a.club)}${a.player ? ` <span class="muted small">(${esc(a.club)})</span>` : ''}</li>`).join('')}</ul>
      <button class="cta" data-action="summary-dismiss">${t('sum.continue')}</button></section>`;
  }
  function renderBracket() {
    const st = state.career.state, b = st.season.playoffs;
    if (!b) return '';
    const name = id => { const c = st.season.clubsById[id]; return c ? c.name : '—'; };
    return `<section class="card"><h3>${t('po.bracket')}</h3>${b.rounds.map(r => `<h4 class="eyebrow">${t('po.round.' + r.name)}</h4><ul class="bracket">${r.series.map(x => `<li class="${x.a === st.clubId || x.b === st.clubId ? 'me' : ''}"><span class="${x.winner === x.a ? 'won' : ''}">${esc(name(x.a))}</span><b>${x.winsA}–${x.winsB}</b><span class="${x.winner === x.b ? 'won' : ''}">${esc(name(x.b))}</span></li>`).join('')}</ul>`).join('')}
      ${b.champion ? `<p class="ok"><b>🏆 ${esc(name(b.champion))}</b></p>` : ''}</section>`;
  }
  function renderLeague() {
    if (!hasCareer()) return renderHome();
    const s = state.career.summary;
    const rows = s.table.map(r => `<tr class="${r.id === s.club.id ? 'me' : ''}"><td>${r.rank}</td><td>${esc(r.name)}</td><td>${r.wins}</td><td>${r.losses}</td><td>${r.diff > 0 ? '+' : ''}${r.diff}</td></tr>`).join('');
    return `<section class="card"><span class="eyebrow">${t('league.kicker', { season: seasonLabel(s.year) })}</span><h2>${esc(s.leagueName)}</h2>
      <div class="table-scroll compact" tabindex="0" role="region" aria-label="${t('league.table')}"><table><caption class="muted">${t('league.table')}</caption><thead><tr><th>#</th><th>${t('league.team')}</th><th>${t('league.w')}</th><th>${t('league.l')}</th><th>${t('league.diff')}</th></tr></thead><tbody>${rows}</tbody></table></div></section>
      ${s.recent.length ? `<section class="card"><h3>${t('league.results')}</h3><ul class="news">${s.recent.map(r => `<li><span class="${r.won ? 'ok' : 'bad'}">${t(r.won ? 'home.w' : 'home.l')}</span> ${t('league.roundShort', { n: r.round })} · ${r.us}–${r.them} ${t(r.home ? 'home.vsHome' : 'home.vsAway', { team: r.opponent })}</li>`).join('')}</ul></section>` : ''}
      ${eraCard(s)}
      ${rivalCard(s)}
      ${cupCard(s)}
      ${renderBracket()}
      ${s.awards ? `<section class="card"><h3>${t('sum.awards')}</h3><ul class="news">${s.awards.map(a => `<li><b>${t('award.' + a.award)}</b> · ${esc(a.player)} <span class="muted small">(${esc(a.club)})</span></li>`).join('')}</ul></section>` : ''}
      ${renderWorldNews(s)}
      ${s.player ? `<section class="card"><h3>${t('league.otherWorld')}</h3><p class="muted small">${t('league.otherWorldDesc')}</p>
        ${s.pendingMove ? `<p class="ok small">${t('league.pendingMove', { club: esc(clubLabel(s.pendingMove)), league: esc(leagueName(s.pendingMove.leagueId)) })}</p>` : ''}
        ${leaguePicker('crossing', s.league.gender, state.career.crossingLeague, [s.leagueId], s.era ? s.year : null, state.career.crossingCountry)}
        <button class="small-btn" data-action="career-crossing">${t('career.crossing')}</button></section>` : ''}`;
  }

  function clubLabel(m) { const c = CAA.Season.clubCatalog(m.leagueId).find(x => x.id === m.clubId); return c ? c.name : m.clubId; }
  function eraTraits(e) { const tr = e.traits; return [tr.shotClock ? t('era.clock', { n: tr.shotClock }) : t('era.noClock'), tr.three ? t('era.three') : t('era.noThree'), tr.quarters ? t('era.quarters') : t('era.halves')].join(' · '); }
  function eraBanner(s) { return s.era ? `<section class="card era-banner"><span class="eyebrow">${t('era.kicker', { decade: s.era.decade })}</span><p class="small">${esc(eraTraits(s.era))}</p></section>` : ''; }
  function eraCard(s) {
    if (!s.era) return '';
    return `<section class="card"><span class="eyebrow">${t('era.kicker', { decade: s.era.decade })}</span><h3>${t('era.d.' + s.era.decade)}</h3><p class="muted small">${t('era.d.' + s.era.decade + 'Desc')}</p><p class="small"><b>${esc(eraTraits(s.era))}</b></p>
      ${s.era.legends && s.era.legends.length ? `<h4 class="eyebrow">${t('era.legends')}</h4><ul class="news">${s.era.legends.map(l => `<li>⭐ <b>${esc(l.name)}</b> ${flag(l.nationality)} · ${l.pos} · ${l.ovr} <small class="muted">${t('era.nick.' + l.nick)} · ${esc(l.club)}</small></li>`).join('')}</ul>` : ''}</section>`;
  }
  function renderWorldNews(s) {
    if (!s.world || !s.world.champions.length) return `<section class="card"><h3>${t('world.leagues')}</h3><p class="muted small">${t('world.leaguesEmpty', { n: Object.keys(CAA.Season.LEAGUES).length })}</p></section>`;
    const by = CONTINENTS.map(c => { const rows = s.world.champions.filter(x => (CAA.Season.LEAGUES[x.leagueId] || {}).continent === c); return rows.length ? `<details><summary class="eyebrow">${t('continent.' + c)} · ${rows.length}</summary><ul class="news">${rows.map(x => `<li>🏆 <b>${esc(x.club)}</b> <small class="muted">${esc(leagueLabel(x.leagueId))}</small></li>`).join('')}</ul></details>` : ''; }).join('');
    return `<section class="card"><h3>${t('world.champions', { season: seasonLabel(s.world.year) })}</h3>${by}</section>`;
  }
  function renderPet(s) {
    const pet = s.pet, P = CAA.Pet;
    if (!pet) {
      const sp = state.petSpecies || 'dog';
      const cash = s.life ? s.life.cash : 0;
      return `<section class="card pet"><h3>${t('pet.title')}</h3><p class="muted small">${t('pet.adoptDesc')}</p>
        <div class="pick-grid">${Object.keys(P.SPECIES).map(k => `<button class="pick" data-action="pet-species" data-species="${k}" aria-pressed="${k === sp}"><b>${t('pet.species.' + k)}</b>${P.SPECIES[k].exotic ? `<small>${t('pet.exotic', { n: P.EXOTIC_COST.toLocaleString(CAA.I18N.getLocale()) })}</small>` : ''}</button>`).join('')}</div>
        <label for="pet-name">${t('pet.name')}<input id="pet-name" maxlength="20" value="${esc(draft('pet-name', ''))}" placeholder="${t('pet.namePlaceholder.' + sp)}"></label>
        <button class="cta" data-action="pet-adopt" ${P.SPECIES[sp].exotic && cash < P.EXOTIC_COST ? 'disabled' : ''}>${t('pet.adopt')}</button></section>`;
    }
    const SP = P.SPECIES[pet.species], stage = P.stageOf(pet), wk = state.career.state.week;
    const learnedN = P.learned(pet).length;
    const msg = pet.last ? t('pet.msg.' + pet.last.key, { name: pet.name, trick: pet.last.trick ? t('pet.trick.' + pet.last.trick) : '', route: pet.last.route ? t('pet.route.' + pet.last.route) : '', stage: pet.last.stage ? t('pet.stage.' + pet.last.stage) : '', tier: pet.last.tier ? t('pet.tier.' + pet.last.tier) : '', toy: pet.last.toy ? t('pet.supply.' + pet.last.toy) : '' }) : '';
    const canContest = pet.lastContestWeek < 0 || wk - pet.lastContestWeek >= 4;
    const none = pet.actionsLeft <= 0, quick = pet.quick || {};
    const qBtn = (a, ico, used) => `<button class="option center" data-action="pet-act" data-act="${a}" ${used ? 'disabled' : ''}><b>${ico} ${t('pet.act.' + a)}</b></button>`;
    const care = qBtn('cuddle', '🤗', pet.cuddled) + qBtn('water', '💧', quick.water) + qBtn('brush', '🪮', quick.brush);
    const inv = pet.inv || {}, toys = pet.toys || [];
    const main = [`<button class="option center" data-action="pet-act" data-act="feed" ${none ? 'disabled' : ''}><b>🍖 ${t('pet.act.feed')}</b></button>`,
      `<button class="option center" data-action="pet-act" data-act="feed" data-food="food_prem" ${none || (!(inv.food_prem > 0) && s.life.cash < 300) ? 'disabled' : ''}><b>🥩 ${t('pet.act.premium')}</b><small>${t('pet.left', { n: inv.food_prem || 0 })}</small></button>`,
      `<button class="option center" data-action="pet-act" data-act="feed" data-food="treats" ${none || !(inv.treats > 0) ? 'disabled' : ''}><b>🦴 ${t('pet.act.treat')}</b><small>${t('pet.left', { n: inv.treats || 0 })}</small></button>`,
      `<button class="option center" data-action="pet-act" data-act="bath" ${none ? 'disabled' : ''}><b>🛁 ${t('pet.act.bath')}</b></button>`,
      `<button class="option center" data-action="pet-act" data-act="play" ${none ? 'disabled' : ''}><b>🏀 ${t('pet.act.play')}</b></button>`]
      .concat(toys.map(k => `<button class="option center" data-action="pet-act" data-act="play" data-toy="${k}" ${none ? 'disabled' : ''}><b>🎾 ${t('pet.supply.' + k)}</b></button>`)).join('');
    const routes = SP.walks ? Object.entries(P.ROUTES).map(([k, r]) => `<button class="option center" data-action="pet-act" data-act="walk" data-route="${k}" ${none || pet.bond < r.bond ? 'disabled' : ''}><b>🌳 ${t('pet.route.' + k)}</b><small>${pet.bond < r.bond ? t('pet.needBond', { n: r.bond }) : t('pet.walk')}</small></button>`).join('') : `<p class="muted small">${t('pet.noWalk')}</p>`;
    const tricks = P.TRICKS.map(tr => { const pr = pet.tricks[tr.id] || 0, cant = tr.diff > SP.maxTrick; return `<button class="trick ${pr >= 100 ? 'done' : ''}" data-action="pet-act" data-act="train" data-trick="${tr.id}" ${none || pr >= 100 || cant ? 'disabled' : ''}><span><b>${t('pet.trick.' + tr.id)}</b><small>${cant ? t('pet.cannot') : '★'.repeat(tr.diff)}</small></span><span class="track" aria-hidden="true"><i style="width:${pr}%"></i></span><span class="muted small">${pr >= 100 ? t('pet.learned') : pr + '%'}</span></button>`; }).join('');
    const items = P.ITEMS.filter(i => !i.prize || pet.owned.includes(i.id)).map(i => { const owned = pet.owned.includes(i.id), on = pet.equipped[i.slot] === i.id; return `<div class="item"><span class="swatch" style="background:${i.color}" aria-hidden="true"></span><span><b>${t('pet.item.' + i.id)}</b><small>${t('pet.slot.' + i.slot)} · ${t('pet.rarity.' + i.rarity)}${owned ? '' : ' · ' + i.cost + ' ' + t('life.style')}</small></span>${owned ? `<button class="small-btn" data-action="pet-equip" data-item="${i.id}">${on ? t('pet.unequip') : t('life.equip')}</button>` : `<button class="small-btn" data-action="pet-buy" data-item="${i.id}" ${s.life.style < i.cost ? 'disabled' : ''}>${t('life.buy')}</button>`}</div>`; }).join('');
    const supplies = P.SUPPLIES.map(x => { const own = x.kind === 'toy' && toys.includes(x.id); return `<div class="item"><span aria-hidden="true">${x.kind === 'toy' ? '🎾' : '🍖'}</span><span><b>${t('pet.supply.' + x.id)}</b><small>${x.qty ? '×' + x.qty + ' · ' : ''}${x.price.toLocaleString(CAA.I18N.getLocale())} €</small></span>${own ? `<span class="tag">${t('pet.owned')}</span>` : `<button class="small-btn" data-action="pet-supply" data-item="${x.id}" ${s.life.cash < x.price ? 'disabled' : ''}>${t('life.buy')}</button>`}</div>`; }).join('');
    const tiers = Object.keys(P.CONTESTS).map(k => { const open = P.contestOpen(pet, k); return `<button class="option center" data-action="pet-contest" data-tier="${k}" ${!open || !canContest ? 'disabled' : ''}><b>🏆 ${t('pet.tier.' + k)}</b><small>${open ? t('pet.tierWins', { n: (pet.contests.wins || {})[k] || 0 }) : t('pet.tierLocked')}</small></button>`; }).join('');
    const album = (pet.album || []).slice().reverse().slice(0, 8).map(m => `<li><span class="muted">${seasonLabel(m.year)} · ${t('pet.week', { n: m.week })}</span> ${esc(t('pet.album.' + m.key, { name: pet.name, x: m.x ? (m.key === 'trick' ? t('pet.trick.' + m.x) : m.key === 'route' ? t('pet.route.' + m.x) : m.key === 'grew' ? t('pet.stage.' + m.x) : m.key === 'contestWin' ? t('pet.tier.' + m.x) : m.key === 'toy' ? t('pet.supply.' + m.x) : m.x) : '' }))}</li>`).join('');
    return `<section class="card pet"><div class="guide-head"><h3>${esc(pet.name)}</h3><span class="tag">${t('pet.species.' + pet.species)} · ${t('pet.stage.' + stage)} · ${t('pet.trait.' + pet.trait)}</span></div>
      <div class="pet-stage"><canvas id="pet3d" role="img" aria-label="${t('pet.canvas', { name: esc(pet.name) })}"></canvas><div class="pet-bars">${P.NEEDS.map(k => meter(t('pet.' + k), pet[k])).join('')}${meter(t('pet.bond'), pet.bond)}</div></div>
      ${msg ? `<p class="pet-msg" role="status">${esc(msg)}</p>` : ''}
      <p class="eyebrow">${t('pet.quick')}</p><div class="pick-grid three">${care}</div>
      <p class="eyebrow">${t('pet.actionsLeft', { n: pet.actionsLeft })}</p><div class="pick-grid">${main}</div>
      <details><summary>${t('pet.walks')}</summary><div class="pick-grid">${routes}</div></details>
      <details><summary>${t('pet.tricks', { n: learnedN, total: P.TRICKS.length })}</summary><div class="tricks">${tricks}</div></details>
      <details><summary>${t('pet.contests', { won: pet.contests.won, played: pet.contests.played })}</summary>${canContest ? '' : `<p class="muted small">${t('pet.contestWait')}</p>`}<div class="pick-grid three">${tiers}</div></details>
      <details><summary>${t('pet.shopSupplies')}</summary><div class="shop">${supplies}</div></details>
      <details><summary>${t('pet.shop')}</summary><div class="shop">${items}</div></details>
      ${album ? `<details><summary>${t('pet.albumTitle')}</summary><ul class="news">${album}</ul></details>` : ''}</section>`;
  }
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
    const scoreTxt = a.type === 'street' ? `${a.live.score} – ${a.live.opponent}` : a.type === 'dunk' ? a.live.score.toFixed(1) : a.live.score;
    const summary = done ? `<section class="card outcome ${done.record ? 'good' : ''}"><span class="eyebrow">${t('arcade.final')}</span><h2>${a.type === 'street' ? t(done.won ? 'arcade.streetWon' : 'arcade.streetLost', { a: done.score, b: done.opponent }) : t('arcade.score', { n: done.score })}</h2>
      ${done.record ? `<p class="ok"><b>${t('arcade.newRecord')}</b></p>` : done.previous != null ? `<p class="muted">${t('arcade.best', { n: done.previous })}</p>` : ''}
      <p class="muted small">${done.auto ? t('arcade.autoNote') : t('arcade.perfects', { n: done.perfects, streak: done.bestStreak })}</p>
      <span class="chips"><span class="chip up">+${done.rewards.style} ${t('effect.style')}</span><span class="chip up">+${done.rewards.xp} XP</span>${done.rewards.form ? `<span class="chip up">+1 ${t('effect.form')}</span>` : ''}</span>
      ${done.contest ? `<h3>${t('arcade.contestTable', { place: done.contest.place })}</h3><ol class="news">${[{ name: t('arcade.you'), score: done.score, me: true }].concat(done.contest.rivals).sort((x, y) => y.score - x.score).map(r => `<li class="${r.me ? 'ok' : ''}"><b>${esc(r.name)}</b>${r.club ? ` <small class="muted">${esc(r.club)}</small>` : ''} · ${r.score}</li>`).join('')}</ol><p class="small">${t('arcade.contestPrize', { style: done.contest.prize.style, cash: done.contest.prize.cash.toLocaleString(CAA.I18N.getLocale()) })}</p>` : ''}
      ${(done.challenges || []).map(x => `<p class="ok small">✅ ${esc(t('arcade.chDone', { ch: t('arcade.ch.' + x.type, { n: x.target }) }))}</p>`).join('')}
      <div class="row">${done.contest ? '' : `<button class="cta" data-action="arcade-start" data-game="${a.type}">${t('arcade.again')}</button>`}<button class="small-btn" data-tab="life">${t('arcade.back')}</button></div></section>` : '';
    return `<section class="card arcade"><div class="guide-head"><div><span class="eyebrow">${t('arcade.round', { n: Math.min(a.round + 1, g.rounds), total: g.rounds })}</span><h2>${t('arcade.' + a.type)}</h2></div><div class="arcade-score"><b>${scoreTxt}</b><small>${t('arcade.streak', { n: a.streak })}</small></div></div>
      <div class="arcade-stage">${state.arcade3dOff ? '' : '<canvas id="arcade3d" aria-hidden="true"></canvas>'}<canvas id="arcade-canvas" class="${state.arcade3dOff ? '' : 'hud'}" width="640" height="420" role="img" aria-label="${t('arcade.canvas', { game: t('arcade.' + a.type) })}" aria-describedby="arcade-help"></canvas></div>
      <p id="arcade-help" class="muted small">${t('arcade.help.' + g.meter)}</p>
      <p class="sr-only" role="status" aria-live="polite">${esc(a.lastText || '')}</p>
      ${done ? '' : `<button class="cta shoot" data-action="arcade-release" ${a.phase !== 'aim' ? 'disabled' : ''}>${t(a.type === 'defense' || (a.type === 'street' && a.round % 2 === 1) ? 'arcade.defend' : a.type === 'dunk' ? 'arcade.beat' : 'arcade.shoot')}</button>`}
      </section>${summary}`;
  }
  const GUIDE = ['career', 'week', 'live', 'decisions', 'minigames', 'pet', 'playoffs', 'coach', 'saves', 'a11y'];
  function renderGuide() {
    return `<section class="card"><h2>${t('guide.title')}</h2><p class="muted">${t('guide.intro')}</p>${GUIDE.map(k => `<details><summary>${t('guide.s.' + k)}</summary><p>${t('guide.b.' + k)}</p></details>`).join('')}</section>`;
  }
  // ===== Red social, rival, récords y diario =====
  function socialCard(s) {
    if (!s.social || !s.social.length) return '';
    return `<section class="card social"><h3>${t('soc.title')}</h3><ul class="posts">${s.social.slice(0, 4).map(p => `<li><span class="av" aria-hidden="true">${p.av}</span><div><b>${esc(p.name)}</b>${p.verified ? ' <span class="ver" aria-label="' + t('soc.verified') + '">✔</span>' : ''} <small class="muted">@${esc(p.handle)}</small><p>${esc(loc(p.text))}</p><small class="muted">♥ ${p.likes.toLocaleString(CAA.I18N.getLocale())}</small></div></li>`).join('')}</ul></section>`;
  }
  function rivalCard(s) {
    const r = s.rival; if (!r) return '';
    return `<section class="card"><h3>🔥 ${t('rival.title')}</h3><p><b>${esc(r.name)}</b></p><p class="small">${t('rival.line', { g: r.g, w: r.w, l: r.l, c: r.close })}</p></section>`;
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
    if (!hasCareer()) return renderHome();
    const st = state.career.state, s = state.career.summary, life = s.life || { achievements: [], counters: {} };
    const c = life.counters || {};
    const rows = st.history.map(h => `<tr><td>${seasonLabel(h.year)}</td><td>${esc(leagueName(h.leagueId))}</td><td>${h.clubRank}.º</td><td>${t('sum.result.' + (h.champion === st.clubId ? 'champion' : (h.promoted || []).includes(st.clubId) ? 'promoted' : (h.result || 'none')))}</td><td>${esc(h.championName || '')}</td></tr>`).join('');
    const mine = s.player ? (st.player.career.awards || []) : [];
    const kpi = [['titles', c.titles || 0], ['playoffApps', c.playoffApps || 0], ['awards', c.awards || 0], ['trophies', life.achievements.length]];
    return `<section class="card"><span class="eyebrow">${t('hof.kicker')}</span><h2>${esc(s.player ? s.player.name : s.coach.name)}</h2>
      <div class="statline">${kpi.map(([k, v]) => `<div><b>${v}</b><small>${t('hof.' + k)}</small></div>`).join('')}</div>
      ${s.player ? `<p class="muted small">${t('hof.totals', { gp: (st.player.career.totals || {}).gp || 0, pts: (st.player.career.totals || {}).pts || 0, reb: (st.player.career.totals || {}).reb || 0, ast: (st.player.career.totals || {}).ast || 0 })}</p>` : ''}</section>
      <section class="card"><h3>${t('hof.seasons')}</h3>${rows ? `<div class="table-scroll compact" tabindex="0" role="region" aria-label="${t('hof.seasons')}"><table><thead><tr><th>${t('hof.season')}</th><th>${t('hof.league')}</th><th>#</th><th>${t('hof.result')}</th><th>${t('hof.champion')}</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="muted">${t('hof.empty')}</p>`}</section>
      ${mine.length ? `<section class="card"><h3>${t('hof.myAwards')}</h3><ul class="news">${mine.map(a => `<li>🏆 <b>${t('award.' + a.award)}</b> · ${seasonLabel(a.year)}</li>`).join('')}</ul></section>` : ''}${recordsCard(s)}${diaryCard(s)}`;
  }
  // ===== Tienda (adaptación de ui-shop del fútbol): escaparate semanal, ofertas, tiers, conjuntos y requisitos =====
  function statText(stats) { return Object.entries(stats || {}).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${t('attr.' + k)}`).join(' · '); }
  function reqText(req) { if (!req) return ''; const k = Object.keys(req)[0]; return t('shop.req.' + k, { n: req[k] }); }
  function styleShopHtml() {
    const s = state.career.summary, life = s.life || { owned: [], equipment: {}, style: 0, cash: 0 }, packs = CAA.Content.packs();
    return `<section class="card"><div class="guide-head"><h3>${t('life.shop')}</h3><span class="tag">${t('life.style')}: ${life.style} · ${t('life.cash')}: ${life.cash}</span></div><div class="shop">${packs.shop.items.map(i => {
      const owned = life.owned.includes(i.id), equipped = (life.equipment || {})[i.slot] === i.id;
      return `<div class="item"><span class="swatch" style="background:${esc(i.color)}" aria-hidden="true"></span><span><b>${esc(loc(i.name))}</b><small>${t('slot.' + i.slot)} · ${i.cost} ${t('life.style')}</small></span>${owned ? `<button class="small-btn" data-action="life-equip" data-item="${i.id}" ${equipped ? 'disabled' : ''}>${equipped ? t('me.equipped') : t('life.equip')}</button>` : `<button class="small-btn" data-action="life-buy" data-item="${i.id}">${t('life.buy')}</button>`}</div>`; }).join('')}</div></section>`;
  }
  function renderShop() {
    if (!hasCareer()) return renderHome();
    const g = state.career.summary.gear; if (!g) return '';
    const money = n => n.toLocaleString(CAA.I18N.getLocale()) + ' €';
    const tier = k => CAA.Gear.TIERS[k];
    const card = i => `<div class="gear-item${i.equipped ? ' on' : ''}${i.locked ? ' locked' : ''}"><span class="swatch" style="background:${esc(i.color)}" aria-hidden="true"></span>
      <div class="gi-body"><b>${esc(loc(i.name))}</b>${i.owned ? ` <span class="tier" style="--tier:${tier(i.tier).c}">${t('tier.' + tier(i.tier).id)}</span>` : ''}${i.offer ? ` <span class="tag offer">-30 %</span>` : ''}
      <small>${t('slot.' + i.slot)}${i.set ? ' · ' + t('set.' + i.set) : ''}</small><small class="ok">${esc(statText(i.stats))}${i.extra ? (Object.keys(i.stats).length ? ' · ' : '') + esc(statText(Object.fromEntries(Object.entries(i.extra).map(([k, v]) => ['x' + k, v])))) : ''}</small>
      ${i.locked ? `<small class="muted">🔒 ${esc(reqText(i.req))}</small>` : ''}</div>
      <div class="gi-act">${!i.owned ? `<button class="small-btn primary" data-action="gear-op" data-op="buy" data-item="${i.id}" ${i.locked || g.cash < i.price ? 'disabled' : ''}>${money(i.price)}</button>`
        : `${i.equipped ? `<button class="small-btn" data-action="gear-op" data-op="unequip" data-item="${i.id}">${t('shop.unequip')}</button>` : `<button class="small-btn" data-action="gear-op" data-op="equip" data-item="${i.id}">${t('life.equip')}</button>`}
           ${i.upgradeCost ? `<button class="small-btn" data-action="gear-op" data-op="upgrade" data-item="${i.id}" ${g.cash < i.upgradeCost ? 'disabled' : ''} aria-label="${t('shop.upgradeTo', { tier: t('tier.' + tier(i.tier + 1).id) })}">⬆ ${money(i.upgradeCost)}</button>` : ''}`}</div></div>`;
    const featured = g.items.filter(i => i.featured || i.offer);
    const bySlot = g.slots.map(sl => { const its = g.items.filter(i => i.slot === sl); return its.length ? `<h4 class="eyebrow">${t('slot.' + sl)}</h4><div class="gear-list">${its.map(card).join('')}</div>` : ''; }).join('');
    const eff = g.effective;
    return `<section class="card shop-head"><span class="eyebrow">${t('shop.kicker')}</span><h2>${t('more.shop')}</h2><p class="muted small">${t('shop.desc', { att: g.cap.att, total: g.cap.total })}</p>
      <div class="statline"><span>${t('life.cash')}</span><b>${money(g.cash)}</b></div>
      <p class="small">${eff.total ? t('shop.effective', { stats: statText(eff.attrs) }) : t('shop.none')}${eff.sets.length ? ' · ' + t('shop.sets', { sets: eff.sets.map(x => t('set.' + x)).join(', ') }) : ''}</p></section>
      <section class="card"><h3>${t('shop.week')}</h3><div class="gear-list">${featured.map(card).join('')}</div></section>
      <section class="card"><h3>${t('shop.catalog')}</h3>${bySlot}</section>${styleShopHtml()}`;
  }
  // ===== Aspecto (look56) =====
  function renderLook() {
    if (!hasCareer()) return renderHome();
    const g = state.career.summary.gear; if (!g) return '';
    const L = g.look, LK = CAA.Gear.LOOK;
    const sw = (field, list, cur, isColor) => `<div class="pick-grid swatches" role="group" aria-label="${t('look.' + field)}">${list.map((v, i) => { const val = isColor ? i : v; const on = String(cur) === String(val); return `<button class="pick${isColor ? ' color' : ''}" data-action="look-set" data-field="${field}" data-value="${esc(String(val))}" aria-pressed="${on}" ${isColor ? `style="--sw:${v}" aria-label="${t('look.' + field)} ${i + 1}"` : ''}>${isColor ? '' : `<b>${t('look.' + field + '.' + v)}</b>`}</button>`; }).join('')}</div>`;
    return `<section class="card"><span class="eyebrow">${t('look.kicker')}</span><h2>${t('more.look')}</h2>${avatarHtml()}
      <h3 class="eyebrow">${t('look.skin')}</h3>${sw('skin', LK.skin, L.skin, true)}
      <h3 class="eyebrow">${t('look.hair')}</h3>${sw('hair', LK.hair, L.hair)}
      <h3 class="eyebrow">${t('look.hairColor')}</h3>${sw('hairColor', LK.hairColor, L.hairColor, true)}
      <h3 class="eyebrow">${t('look.beard')}</h3>${sw('beard', LK.beard, L.beard)}
      <h3 class="eyebrow">${t('look.celebration')}</h3>${sw('celebration', LK.celebration, L.celebration)}
      <p class="muted small">${t('look.note')}</p><button class="small-btn" data-tab="shop">🛍 ${t('more.shop')}</button></section>`;
  }
  // ===== El club por dentro (club30): finanzas, pabellón, instalaciones y directiva =====
  function renderClub() {
    if (!hasCareer()) return renderHome();
    const f = state.career.summary.clubFin; if (!f) return renderHome();
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
    if (!hasCareer()) return renderHome();
    const m = state.career.summary.transfers, f = state.career.summary.clubFin; if (!m || !f) return renderHome();
    const money = n => Math.round(n).toLocaleString(CAA.I18N.getLocale()) + ' €';
    const full = m.roster.length >= 15, short = m.roster.length <= 10;
    const staff = r => `<div class="gear-item"><span class="swatch lvl" aria-hidden="true">${m.staff[r]}</span><div class="gi-body"><b>${t('mkt.role.' + r)}</b><small>${t('mkt.role.' + r + 'Desc')}</small><small class="muted">${t('mkt.wage', { v: money(m.wages[m.staff[r]]) })}</small></div>
      <div class="gi-act">${m.staff[r] < 3 ? `<button class="small-btn" data-action="mkt-op" data-op="staff" data-role="${r}" data-level="${m.staff[r] + 1}" ${f.cash < m.wages[m.staff[r] + 1] * 0.25 ? 'disabled' : ''}>⬆ ${money(m.wages[m.staff[r] + 1] * 0.25)}</button>` : `<span class="tag">${t('club.max')}</span>`}${m.staff[r] > 0 ? `<button class="small-btn ghost" data-action="mkt-op" data-op="staff" data-role="${r}" data-level="${m.staff[r] - 1}" aria-label="${t('mkt.down')}: ${t('mkt.role.' + r)}">⬇</button>` : ''}</div></div>`;
    const cand = x => `<li>${face({ id: x.id, name: x.name, nationality: x.nat, gender: x.gender, age: x.age })} <b>${esc(x.name)}</b> ${flag(x.nat)} · ${x.pos} · ${t('mkt.ovr', { n: x.ovr })} · ${t('mkt.age', { n: x.age })}<br><small class="muted">${t('mkt.salary', { v: money(x.salary) })} · ${x.free ? t('mkt.free') : t('mkt.fee', { v: money(x.fee) })}</small>
      <button class="small-btn" data-action="mkt-op" data-op="sign" data-id="${esc(x.id)}" ${!m.open || full || f.cash < x.fee ? 'disabled' : ''}>${t('mkt.sign')}</button></li>`;
    const mine = p => `<li>${face(p)} <b>${esc(p.name)}</b> · ${p.pos} · ${t('mkt.ovr', { n: p.ovr })} · ${t('mkt.age', { n: p.age })} <small class="muted">${t('mkt.salary', { v: money(p.salary) })}</small>
      <button class="small-btn ghost" data-action="mkt-op" data-op="release" data-id="${esc(p.id)}" ${short ? 'disabled' : ''} aria-label="${t('mkt.release')}: ${esc(p.name)}">${t('mkt.release')}</button></li>`;
    return `<section class="card"><span class="eyebrow">${t('mkt.kicker')}</span><h2>${t('mkt.title')}</h2>
      <div class="statline"><span>${t('club.cash')}</span><b class="${f.cash < 0 ? 'bad' : ''}">${money(f.cash)}</b></div>
      <p class="small ${m.open ? 'ok' : 'muted'}">${t(m.open ? 'mkt.open' : 'mkt.closed')}</p><p class="muted small">${t('mkt.rosterN', { n: m.roster.length })}</p></section>
      <section class="card"><h3>${t('mkt.available')}</h3><ul class="news mkt">${m.list.map(cand).join('')}</ul></section>
      <section class="card"><h3>${t('mkt.staff')}</h3><div class="gear-list">${['assistant', 'physio', 'scout'].map(staff).join('')}</div></section>
      <section class="card"><h3>${t('mkt.roster')}</h3><p class="muted small">${t('mkt.releaseNote')}</p><ul class="news mkt">${m.roster.slice().sort((a, b) => b.ovr - a.ovr).map(mine).join('')}</ul></section>`;
  }
  // ===== Selección (nat31) y copa =====
  const MEDAL = { gold: '🥇', silver: '🥈', bronze: '🥉' };
  function renderNational() {
    if (!hasCareer()) return renderHome();
    const n = state.career.summary.national; if (!n) return renderHome();
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
    return `<section class="card"><h3>🏆 ${esc(s.league && s.league.cup ? s.league.cup : t('cup.title'))}</h3><p class="${c.champion === s.club.id ? 'ok' : ''}">${t('cup.champion', { club: esc(c.championName) })}${c.mine !== 'out' ? ' · ' + t('cup.mine.' + c.mine) : ''}</p>
      <ul class="news">${c.rounds.map(r => r.games.map(g => `<li><span class="muted">${t('cup.' + r.name)}</span> ${esc(nm(g.a))} ${g.score[0]}–${g.score[1]} ${esc(nm(g.b))}</li>`).join('')).join('')}</ul></section>`;
  }
  // ===== Editor (edit35) =====
  function renderEditor() {
    if (!hasCareer()) return renderHome();
    const s = state.career.summary;
    return `<section class="card"><span class="eyebrow">${t('ed.kicker')}</span><h2>${t('more.editor')}</h2><p class="muted small">${t('ed.desc')}</p>
      <label for="ed-league">${t('ed.league')}<input id="ed-league" maxlength="30" value="${esc(draft('ed-league', s.leagueName))}"></label><button class="small-btn" data-action="ed-save" data-op="league" data-id="${esc(s.leagueId)}" data-input="ed-league">${t('ed.save')}</button></section>
      <section class="card"><h3>${t('ed.clubs')}</h3><div class="stack">${s.table.map((r, i) => `<div class="ed-row"><label for="ed-c${i}" class="sr-only">${esc(r.name)}</label><input id="ed-c${i}" maxlength="30" value="${esc(draft('ed-c' + i, r.name))}"><button class="small-btn" data-action="ed-save" data-op="club" data-id="${esc(r.id)}" data-input="ed-c${i}">${t('ed.save')}</button></div>`).join('')}</div>
      <button class="ghost-btn" data-action="ed-save" data-op="reset">${t('ed.reset')}</button></section>`;
  }
  // ===== Momentos históricos (eras-moments): finales reales para revivir con las reglas de su año =====
  function teamLabel(tm) { const l = loc(tm); return (/^(SU|YU)$/.test(tm.code) ? '🏀' : flag(tm.code)) + ' ' + esc(l); }
  function renderMoments() {
    const M = CAA.Moments.MOMENTS, sel = state.moment, L = CAA.I18N.getLocale() === 'es' ? 'es' : 'en';
    const cur = sel && M.find(m => m.id === sel.id);
    const pick = (field, value, label) => `<button class="pick" data-action="moment-set" data-field="${field}" data-value="${value}" aria-pressed="${String(sel && sel[field]) === String(value)}"><b>${label}</b></button>`;
    const detail = cur ? `<section class="card"><span class="eyebrow">${t('nat.kind.' + cur.kind)} · ${cur.year}${cur.gender === 'f' ? ' · ' + t('modes.women') : ''}</span><h2>${teamLabel(cur.teams[0])} – ${teamLabel(cur.teams[1])}</h2>
      <p class="small">${esc(loc(cur.fact))}</p><p class="muted small">${t('mom.realScore', { a: cur.score[0], b: cur.score[1] })}</p>
      <h3 class="eyebrow">${t('mom.side')}</h3><div class="pick-grid two">${pick('side', 0, teamLabel(cur.teams[0]))}${pick('side', 1, teamLabel(cur.teams[1]))}</div>
      <h3 class="eyebrow">${t('mom.tactic')}</h3><div class="pick-grid three">${['slow', 'normal', 'fast'].map(k => pick('tactic', k, t('mom.tactic.' + k))).join('')}</div>
      <button class="cta" data-action="moment-play">${t('mom.play')} ▶</button>
      ${sel.result ? `<div class="moment"><h4 class="${sel.result.won ? 'ok' : 'bad'}">${teamLabel(cur.teams[0])} ${sel.result.score[0]} – ${sel.result.score[1]} ${teamLabel(cur.teams[1])}</h4>
        <p><b>${t(sel.result.changed ? 'mom.changed' : 'mom.same')}</b></p><p class="muted small">${t('mom.top')}: ${sel.result.top.map(x => esc(x.name) + ' ' + x.pts).join(' · ')}</p></div>` : ''}</section>` : '';
    const decades = Array.from(new Set(M.map(m => Math.floor(m.year / 10) * 10)));
    return `${detail}<section class="card"><span class="eyebrow">${t('mom.kicker')}</span><h2>${t('more.moments')}</h2><p class="muted small">${t('mom.desc')}</p>
      ${decades.map(d => `<h4 class="eyebrow">${d}s</h4><div class="stack">${M.filter(m => Math.floor(m.year / 10) * 10 === d).map(m => `<button class="row-link" data-action="moment-open" data-id="${m.id}"><span class="ico" aria-hidden="true">📼</span><span><b>${m.year} · ${t('nat.kind.' + m.kind)}${m.gender === 'f' ? ' · ' + t('modes.women') : ''}</b><small>${teamLabel(m.teams[0])} – ${teamLabel(m.teams[1])}</small></span><span aria-hidden="true">›</span></button>`).join('')}</div>`).join('')}</section>`;
  }
  function renderMore() {
    const row = (tab, ico) => `<button class="row-link" data-tab="${tab}" id="more-${tab}"><span class="ico" aria-hidden="true">${ico}</span><span><b>${t('more.' + tab)}</b><small>${t('more.' + tab + 'Sub')}</small></span><span aria-hidden="true">›</span></button>`;
    return `<section class="card"><h2>${t('nav.more')}</h2><div class="stack">${hasCareer() ? row('editor', '✏') + `<button class="row-link" data-action="sim-season"><span class="ico" aria-hidden="true">⏩</span><span><b>${t('more.simSeason')}</b><small>${t('more.simSeasonSub')}</small></span><span aria-hidden="true">›</span></button>` : ''}${hasCareer() ? (state.career.summary.clubFin ? row('club', '🏟') + (state.career.summary.transfers ? row('market', '🤝') : '') : '') + (state.career.summary.national ? row('national', '🏅') : '') + row('shop', '🛍') + row('look', '🎨') : ''}${row('moments', '📼')}${row('history', '🏛')}${row('guide', '📖')}${row('match', '🏀')}${row('save', '💾')}${row('settings', '⚙')}${row('world', '🌍')}${row('lab', '🧪')}
      <button class="row-link" data-action="boot-menu"><span class="ico" aria-hidden="true">⌂</span><span><b>${t('more.menu')}</b><small>${t('more.menuSub')}</small></span><span aria-hidden="true">›</span></button></div></section>`;
  }

  function renderActionBar() {
    if (!hasCareer() || state.tab !== 'career' || state.career.summary.retirement || state.career.summary.careerOver) return '';
    const c = state.career;
    const liveNow = c.state.live && c.state.live.week === c.state.week;
    if (liveNow) return '';
    const s = c.summary;
    if (!s.next && s.playoffs && !s.playoffs.done && !['playing', 'waiting'].includes(s.playoffs.status)) return `<div class="actionbar"><button class="cta" data-action="career-skip">${t('po.skip')} ▶</button></div>`;
    if (!s.next) return `<div class="actionbar"><button class="cta" data-action="career-play">${t('home.advance')} ▶</button></div>`;
    return `<div class="actionbar"><button class="cta" data-action="live-start">${t('home.playLive', { team: s.next.opponent.name })} <span aria-hidden="true">▶</span></button><button class="sim-btn" data-action="career-play" aria-label="${t('home.simulateLabel')}">${t('home.simulate')}</button></div>`;
  }

  function renderSettings() {
    const s = state.settings;
    const opt = (val, cur, label) => `<option value="${val}" ${val === cur ? 'selected' : ''}>${label}</option>`;
    return `<section class="panel"><h2>${t('settings.title')}</h2><div class="grid">
    <label>${t('settings.language')}<select data-setting="locale">${opt('es', CAA.I18N.getLocale(), 'Español')}${opt('en', CAA.I18N.getLocale(), 'English')}${opt('fr', CAA.I18N.getLocale(), 'Français')}${opt('de', CAA.I18N.getLocale(), 'Deutsch')}${opt('it', CAA.I18N.getLocale(), 'Italiano')}</select></label>
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
    if (petRenderer) { petRenderer.dispose(); petRenderer = null; petCanvas = null; }
    if (arcadeRenderer) { arcadeRenderer.dispose(); arcadeRenderer = null; arcadeGlCanvas = null; }
    if (liveRenderer) { liveRenderer.dispose(); liveRenderer = null; liveCanvas = null; } if (petTimer) { root.clearTimeout(petTimer); petTimer = null; }
    const active = doc.activeElement;
    const focusId = active && active.id;
    const focusAction = active && active.dataset.action;
    const focusData = active ? Object.assign({}, active.dataset) : {};
    const openDetails = Array.from(doc.querySelectorAll('details')).map(d => d.open);
    doc.documentElement.lang = CAA.I18N.getLocale();
    const status = `<div id="global-status" role="status" aria-live="polite" aria-atomic="true" class="${state.messageError ? 'bad' : 'muted'}">${esc(state.message || (state.busy ? t('status.working') : ''))}</div>`;
    const confirm = state.confirm ? `<section class="panel confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"><h2 id="confirm-title">${t('confirm.title')}</h2><p id="confirm-description">${esc(state.confirm.text)}</p><div class="row"><button id="confirm-cancel" data-action="confirm-cancel">${t('confirm.cancel')}</button><button data-action="confirm-yes" class="danger">${t('confirm.yes')}</button></div></section>` : '';
    doc.body.dataset.screen = state.screen;
    if (state.screen !== 'game') {
      doc.getElementById('app').innerHTML = `<a class="skip-link" href="#panel">${t('a11y.skip')}</a>${confirm}${renderBoot()}${status}`;
    } else {
      const tab = state.tab;
      const body = tab === 'career' ? renderHome() : tab === 'life' ? renderMe() : tab === 'league' ? renderLeague() : tab === 'more' ? renderMore() : tab === 'world' ? renderWorld() : tab === 'match' ? renderMatch() : tab === 'save' ? renderSave() : tab === 'lab' ? renderLab() : tab === 'arcade' ? renderArcade() : tab === 'guide' ? renderGuide() : tab === 'history' ? renderHistory() : tab === 'moments' ? renderMoments() : tab === 'editor' ? renderEditor() : tab === 'club' ? renderClub() : tab === 'market' ? renderMarket() : tab === 'national' ? renderNational() : tab === 'shop' ? renderShop() : tab === 'look' ? renderLook() : renderSettings();
      const sel = PRIMARY_TABS.includes(tab) ? tab : tab === 'arcade' ? 'life' : 'more';
      const icons = { career: '⌂', life: '👕', league: '▤', more: '▦' };
      doc.getElementById('app').innerHTML = `<a class="skip-link" href="#panel">${t('a11y.skip')}</a>${renderCromo()}
      ${storage && !storage.persistent ? `<p class="bad">${t('save.memoryWarning')}</p>` : ''}${status}
      ${state.saveError && state.career.state ? `<div class="row"><button data-action="save-export-current">${t('save.exportCurrent')}</button></div>` : ''}${confirm}
      <main id="panel" role="tabpanel" aria-labelledby="tab-${sel}" tabindex="-1">${SECONDARY_TABS.includes(tab) ? `<button class="back" data-tab="${tab === 'arcade' ? 'life' : 'more'}">‹ ${t(tab === 'arcade' ? 'nav.life' : 'nav.more')}</button>` : ''}${body}</main>
      <footer class="dock">${renderActionBar()}<nav role="tablist" aria-label="${t('a11y.sections')}">${PRIMARY_TABS.map(x => `<button id="tab-${x}" role="tab" aria-controls="panel" aria-selected="${sel === x}" tabindex="${sel === x ? 0 : -1}" data-tab="${x}"><span aria-hidden="true">${icons[x]}</span>${t('nav.' + x)}</button>`).join('')}</nav></footer>`;
    }
    for (const child of doc.getElementById('app').children) child.inert = !!state.confirm && !child.classList.contains('confirm') && child.id !== 'global-status';
    doc.querySelectorAll('[data-action]').forEach(b => { b.disabled = state.busy || b.disabled || !!state.confirm; });
    if (state.confirm) doc.querySelectorAll('.confirm button').forEach(b => { b.disabled = false; });
    doc.querySelectorAll('details').forEach((d, i) => { if (openDetails[i] !== undefined) d.open = openDetails[i]; });
    let restore = focusId && doc.getElementById(focusId);
    if (!restore && focusAction) restore = Array.from(doc.querySelectorAll('[data-action]')).find(b => b.dataset.action === focusAction && Object.keys(focusData).every(k => b.dataset[k] === focusData[k]));
    if (state.confirm) restore = doc.getElementById('confirm-cancel');
    else if (focusAction === 'confirm-cancel' || focusAction === 'confirm-yes') restore = doc.getElementById('tab-' + state.tab) || doc.getElementById('panel');
    if (restore && !restore.disabled) restore.focus({ preventScroll: true });
    drawMatchFrame();
    drawAvatar();
    drawPet();
    if (state.arcade && state.tab === 'arcade' && arcadeRaf == null) arcadeSync();
    if (state.heroShot && heroRaf == null) heroRaf = root.requestAnimationFrame(heroDraw);
    if (liveRaf != null) { root.cancelAnimationFrame(liveRaf); liveRaf = null; }
    if (doc.getElementById('live3d')) liveRaf = root.requestAnimationFrame(drawLive3d);
    syncEraLook();
    { const lp = doc.getElementById('live-panel'); if (lp && !lp.dataset.caught && pb.speed) pbStart(); else pbStop(); }
  }
  function drawMatchFrame() {
    const m = state.match;
    if (!m.result || state.tab !== 'match' || state.screen !== 'game') return;
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
        const scene = CAA.Voxel.geometry(m.result.state, m.frame, m.progress, { women: m.source === 'career' && careerWomen(), quality: m.quality, colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, reducedMotion: CAA.A11Y.reduced(state.settings) });
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

  // ===== Minijuegos: bucle de juego (el resultado lo decide CAA.Arcade con el tick de suelta) =====
  let arcadeRaf = null, arcadeRenderer = null, arcadeGlCanvas = null;
  function arcadeAttrs() { return state.career.state && state.career.state.player ? state.career.state.player.attrs : {}; }
  function arcadeBegin(pending) {
    state.arcade = { type: pending.type, seed: pending.seed, round: 0, ticks: [], results: [], streak: 0, phase: 'aim', aimStart: root.performance.now(), anim: null, final: null, label: '', flash: 0,
      live: { score: 0, opponent: 0 } };
    state.tab = 'arcade';
  }
  function arcadeSpec() { const a = state.arcade; return CAA.Arcade.roundSpec(a.type, a.seed, a.round, a.streak); }
  function arcadeRelease() {
    const a = state.arcade; if (!a || a.phase !== 'aim') return;
    const tick = Math.round((root.performance.now() - a.aimStart) / 1000 * CAA.Arcade.HZ);
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
    if (audio) audio.play(r.made ? (r.perfect ? 'success' : 'swish') : 'rim');
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
      try { const res = await worker.send('career.arcade', { state: state.career.state, ticks: a.ticks }); await acceptCareer(res); a.final = res.arcade; a.phase = 'done'; if (audio) audio.play(res.arcade.record ? 'success' : 'buzzer'); }
      catch (err) { notify(t('status.error') + ': ' + err.message, true); a.phase = 'done'; }
    } else { a.round++; a.phase = 'aim'; a.aimStart = root.performance.now(); }
    render(); arcadeSync();
  }
  function arcadeDraw(ts) {
    const a = state.arcade, canvas = doc.getElementById('arcade-canvas');
    if (!a || !canvas || state.tab !== 'arcade' || state.screen !== 'game') { arcadeRaf = null; return; }
    const ctx = canvas.getContext('2d');
    const spec = arcadeSpec();
    const tick = a.phase === 'aim' ? Math.round((ts - a.aimStart) / 1000 * CAA.Arcade.HZ) : 0;
    const anim = a.anim ? { t: Math.min(1, (ts - a.anim.start) / (CAA.A11Y.reduced(state.settings) ? 1 : 700)), made: a.anim.made } : null;
    const s = state.career.summary, eq = s && s.life && s.life.equipment;
    const jerseyItem = eq && eq.jersey && CAA.Content.packs().shop.items.find(i => i.id === eq.jersey);
    const view = { type: a.type, round: a.round, phase: a.phase, spec, cursor: a.phase === 'aim' ? CAA.Arcade.cursorAt(spec, tick) : spec.center, meterType: CAA.Arcade.GAMES[a.type].meter,
      anim, now: ts, label: a.label, labelGood: a.labelGood, flash: a.flash ? Math.max(0, 1 - (ts - (a.anim ? a.anim.start : ts)) / 250) : 0, netKick: anim && anim.made && anim.t > 0.7 ? 1 - (anim.t - 0.7) / 0.3 : 0, hype: Math.min(1, 0.2 + a.streak / 4) };
    const opts = { colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, reducedMotion: CAA.A11Y.reduced(state.settings), jersey: jerseyItem ? jerseyItem.color : null };
    const gl = doc.getElementById('arcade3d');
    let drawn3d = false;
    if (gl && !state.arcade3dOff) {
      try {
        if (!arcadeRenderer || arcadeGlCanvas !== gl) { arcadeGlCanvas = gl; arcadeRenderer = CAA.Voxel.createRenderer(gl, { onContextLost: () => { state.arcade3dOff = true; arcadeRenderer = null; render(); arcadeSync(); } }); }
        const g = CAA.Arcade3D.geometry(view, opts);
        drawn3d = arcadeRenderer.draw(g.scene, g.camera);
      } catch (_) { state.arcade3dOff = true; arcadeRenderer = null; root.setTimeout(() => { render(); arcadeSync(); }, 0); }
    }
    if (drawn3d) CAA.Arcade2D.hud(ctx, canvas.width, canvas.height, view, opts);
    else CAA.Arcade2D.draw(ctx, canvas.width, canvas.height, view, opts);
    if (a.phase === 'aim' || a.phase === 'flight') arcadeRaf = root.requestAnimationFrame(arcadeDraw); else arcadeRaf = null;
  }
  function arcadeSync() { if (arcadeRaf != null) root.cancelAnimationFrame(arcadeRaf); arcadeRaf = null; if (state.arcade && state.tab === 'arcade' && !doc.hidden) arcadeRaf = root.requestAnimationFrame(arcadeDraw); }
  let heroRaf = null;
  function heroSpec() { return CAA.Arcade.roundSpec('buzzer', 'hero-view', 0, 0); }
  async function heroRelease() {
    const h = state.heroShot; if (!h || h.sent) return;
    h.sent = true;
    const tick = Math.round((root.performance.now() - h.aimStart) / 1000 * CAA.Arcade.HZ);
    if (heroRaf != null) root.cancelAnimationFrame(heroRaf); heroRaf = null;
    state.heroShot = null;
    await action('live-choice', { dataset: { choice: 'hero', release: String(tick) } });
  }
  function heroDraw(ts) {
    const h = state.heroShot, canvas = doc.getElementById('hero-canvas');
    if (!h || !canvas) { heroRaf = null; return; }
    const spec = heroSpec(), tick = Math.round((ts - h.aimStart) / 1000 * CAA.Arcade.HZ);
    CAA.Arcade2D.draw(canvas.getContext('2d'), canvas.width, canvas.height, { type: 'buzzer', round: 0, phase: 'aim', spec, cursor: CAA.Arcade.cursorAt(spec, tick), meterType: 'jump', anim: null, now: ts, label: '', flash: 0, netKick: 0, hype: 1 }, { colorMode: state.settings.colorMode });
    heroRaf = root.requestAnimationFrame(heroDraw);
  }
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
      else if (name === 'boot-lang') { CAA.I18N.setLocale(['en', 'fr', 'de', 'it'].includes(el.dataset.locale) ? el.dataset.locale : 'es'); saveSettings(); state.screen = 'menu'; }
      else if (name === 'boot-new') { state.screen = 'modes'; }
      else if (name === 'boot-continue') { state.screen = 'game'; state.tab = 'career'; }
      else if (name === 'boot-open') { state.screen = 'game'; state.tab = el.dataset.target || 'more'; }
      else if (name === 'boot-menu' || name === 'boot-back') { state.screen = 'menu'; state.match.playing = false; }
      else if (name === 'mode-gender') {
        const c = state.career; c.gender = el.dataset.gender === 'f' ? 'f' : 'm';
        if (CAA.Season.LEAGUES[c.leagueId].gender !== c.gender) c.leagueId = c.gender === 'f' ? 'es-iberica-women' : 'fr-hexagone-men';
        if (c.gender === 'f') c.route = 'world'; c.clubId = ''; c.clubsRoute = null;
      } else if (name === 'boot-mode') {
        state.career.eraYear = el.dataset.mode === 'eras' ? (state.career.eraYear || 1952) : null;
        state.career.challenge = el.dataset.mode === 'challenge' ? (state.career.challenge || 'save') : null;
        state.career.newClub = el.dataset.mode === 'club' ? (state.career.newClub || { name: '', abbr: '', primary: '#ff7a1f', secondary: '#0b0d1c' }) : null;
        state.career.mode = el.dataset.mode === 'coach' || el.dataset.mode === 'club' || el.dataset.mode === 'challenge' ? 'coach' : 'player'; state.wizard = { step: 1 };
        if (state.career.newClub) { state.career.route = 'world'; if (CAA.Season.LEAGUES[state.career.leagueId].level !== 2 && state.career.gender !== 'f') state.career.leagueId = 'es-ascenso-iberico'; state.career.clubId = ''; state.career.clubsRoute = null; }
        if (state.career.eraYear) { state.career.route = 'world'; eraDefaultLeague(); }
        if (state.career.mode === 'coach' && state.career.route === 'na-undrafted') state.career.route = 'eu-academy';
        state.screen = 'create'; ensureClubs(state.career.route);
      } else if (name === 'wiz-next' || name === 'wiz-back' || name === 'wiz-cancel') {
        const nameEl = doc.getElementById('career-name'); if (nameEl) state.career.name = nameEl.value;
        if (state.career.newClub) for (const [id, k] of [['club-name', 'name'], ['club-abbr', 'abbr'], ['club-primary', 'primary'], ['club-secondary', 'secondary']]) { const e = doc.getElementById(id); if (e) state.career.newClub[k] = e.value; }
        const natEl = doc.getElementById('career-nationality'); if (natEl) state.career.nationality = natEl.value;
        const seedEl = doc.getElementById('career-seed'); if (seedEl) state.career.seed = seedEl.value;
        if (name === 'wiz-cancel') state.screen = 'modes'; else state.wizard.step = Math.max(1, state.wizard.step + (name === 'wiz-next' ? 1 : -1));
      } else if (name === 'wiz-set') {
        const field = el.dataset.field, value = el.dataset.value;
        if (field === 'number') state.career.number = Number(value);
        else if (field === 'route') { state.career.route = value; state.career.clubId = ''; state.busy = false; await ensureClubs(value); }
        else if (field === 'eraYear') { state.career.eraYear = Number(value); eraDefaultLeague(); state.busy = false; await ensureClubs('world'); }
        else if (field === 'gender') {
          const c = state.career; c.gender = value === 'f' ? 'f' : 'm';
          if (CAA.Season.LEAGUES[c.leagueId].gender !== c.gender) c.leagueId = c.gender === 'f' ? 'es-iberica-women' : 'fr-hexagone-men';
          if (c.gender === 'f') c.route = 'world';
          c.clubId = ''; c.clubsRoute = null; eraDefaultLeague(); state.busy = false; await ensureClubs(c.route);
        }
        else if (['pos', 'archetype', 'handedness', 'talent', 'clubId', 'challenge'].includes(field)) state.career[field] = value;
        if (audio) audio.play('click');
      } else if (name === 'guide-skip') { try { root.localStorage.setItem('caa.guideSkip.' + state.career.summary.careerId, '1'); } catch (_) {} }
      else if (name === 'toggle-audio') { state.settings.audio = !state.settings.audio; CAA.A11Y.apply(state.settings, doc); if (audio) { audio.setEnabled(state.settings.audio); if (state.settings.audio) { audio.unlock(); audio.play('click'); } } saveSettings(); }
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
        const get = id => { const el = doc.getElementById(id); return el ? el.value : null; };
        state.career.mode = get('career-mode') || state.career.mode;
        state.career.route = get('career-route') || state.career.route;
        state.career.nationality = (get('career-nationality') || state.career.nationality || 'ES').toUpperCase();
        state.career.pos = get('career-pos') || state.career.pos || 'SG';
        state.career.clubId = get('career-club') || state.career.clubId;
        state.career.archetype = get('career-archetype') || state.career.archetype;
        state.career.handedness = get('career-handedness') || state.career.handedness;
        state.career.name = (get('career-name') != null ? get('career-name') : state.career.name || '').trim();
        state.career.seed = get('career-seed') || state.career.seed || 'carrera-demo';
        const quality = state.career.talent === 'mystery' ? 47 + (CAA.Hash.hashString(state.career.seed) % 16) : TALENT[state.career.talent] || 55;
        const cn = state.career.newClub;
        if (cn) { const v = id => { const e = doc.getElementById(id); return e ? e.value : null; }; if (v('club-name') != null) Object.assign(cn, { name: v('club-name'), abbr: v('club-abbr'), primary: v('club-primary'), secondary: v('club-secondary') }); if (state.career.clubs.length) state.career.clubId = state.career.clubs[state.career.clubs.length - 1].id; }
        { const q = doc.getElementById('career-quick'); if (q) state.career.quick = q.checked; }
        if (state.career.challenge && state.career.mode === 'coach') state.career.clubId = state.career.clubId || 'auto';
        if (!state.career.clubId && state.career.clubs.length && String(state.career.clubsRoute || '').endsWith(state.career.route === 'world' ? state.career.leagueId : state.career.route)) state.career.clubId = state.career.clubs[0].id;
        if (!state.career.clubId) throw new Error(t('career.clubRequired'));
        const created = await worker.send('career.create', { mode: state.career.mode, route: state.career.route, leagueId: state.career.route === 'world' ? state.career.leagueId : undefined, eraYear: state.career.eraYear || undefined, newClub: state.career.newClub || undefined, challenge: state.career.challenge && state.career.mode === 'coach' ? state.career.challenge : undefined, quick: !!state.career.quick, seed: state.career.seed, nationality: state.career.nationality, pos: state.career.pos, clubId: state.career.clubId, archetype: state.career.archetype, handedness: state.career.handedness, name: state.career.name || undefined, number: state.career.number, quality });
        if (audio) audio.play('success');
        state.career.state = CAA.Career.resume(created); state.career.summary = CAA.Career.summary(state.career.state); state.practice = null; await persistCareer();
        state.screen = 'game'; state.tab = 'career'; state.wizard = { step: 1 }; notify(t('wiz.welcome'));
      } else if (name === 'career-play' || name === 'career-train' || name === 'career-rest') {
        if (!state.career.state) throw new Error(t('career.empty'));
        const action = name === 'career-train' ? { type: 'train', focus: 'tiroTriple' } : name === 'career-rest' ? { type: 'rest' } : { type: 'play' };
        const res = await worker.send('career.advance', { state: state.career.state, action });
        await acceptCareer(res);
      } else if (name === 'moment-open') { state.moment = { id: el.dataset.id, side: 1, tactic: 'normal', result: null }; root.scrollTo && root.scrollTo(0, 0);
      } else if (name === 'moment-set') { if (state.moment) { state.moment[el.dataset.field] = el.dataset.field === 'side' ? Number(el.dataset.value) : el.dataset.value; state.moment.result = null; }
      } else if (name === 'moment-play') { const m = state.moment; m.result = CAA.Moments.play(m.id, m.side, m.tactic, 'moment-' + Date.now() % 100000); if (audio) audio.play(m.result.won ? 'success' : 'buzzer');
      } else if (name === 'ed-save') {
        const key = el.dataset.input, inp = key ? doc.getElementById(key) : null;
        const value = key ? (Object.prototype.hasOwnProperty.call(state.drafts, key) ? state.drafts[key] : inp ? inp.value : '') : '';
        const res = await worker.send('career.edit', { state: state.career.state, config: { op: el.dataset.op, id: el.dataset.id, name: value } });
        await acceptCareer(res); for (const k of Object.keys(state.drafts)) if (/^ed-/.test(k)) delete state.drafts[k]; notify(t('ed.saved'));
      } else if (name === 'sim-season') {
        const res = await worker.send('career.simSeason', { state: state.career.state });
        await acceptCareer(res); state.tab = 'career'; notify(t('more.simDone'));
      } else if (name === 'mkt-op') {
        const res = await worker.send('career.market', { state: state.career.state, config: { op: el.dataset.op, id: el.dataset.id, role: el.dataset.role, level: el.dataset.level } });
        await acceptCareer(res); if (audio) audio.play('success'); notify(t('mkt.done.' + el.dataset.op));
      } else if (name === 'club-op') {
        const res = await worker.send('career.club', { state: state.career.state, config: { op: el.dataset.op, key: el.dataset.key, value: el.dataset.value } });
        await acceptCareer(res); if (audio) audio.play('success');
      } else if (name === 'gear-op' || name === 'look-set') {
        const config = name === 'gear-op' ? { op: el.dataset.op, itemId: el.dataset.item } : { op: 'look', [el.dataset.field]: el.dataset.value };
        const res = await worker.send('career.gear', { state: state.career.state, config });
        await acceptCareer(res);
        if (audio) audio.play(name === 'gear-op' && el.dataset.op !== 'unequip' ? 'success' : 'click');
        if (name === 'gear-op') notify(t('shop.done.' + el.dataset.op));
      } else if (name === 'live-speed') { pb.speed = Number(el.dataset.speed) || 0;
      } else if (name === 'live-skip') { if (state.career.state && state.career.state.live) pbCatchUp(state.career.state.live);
      } else if (name === 'live-start' || name === 'live-next' || name === 'live-end' || name === 'live-choice') {
        if (!state.career.state) throw new Error(t('career.empty'));
        const payloadLive = { state: state.career.state, start: name === 'live-start', toEnd: name === 'live-end', choice: name === 'live-choice' ? el.dataset.choice : undefined, release: el && el.dataset && el.dataset.release != null ? Number(el.dataset.release) : undefined };
        state.heroShot = null;
        const res = await worker.send('career.live', payloadLive);
        await acceptCareer(res);
        if (name === 'live-end') pbCatchUp(state.career.state.live);
        if (name === 'live-start' && !pb.speed) pb.speed = 1;
        const caught = pbCaught(state.career.state.live);
        if (audio && name !== 'live-next') audio.play(caught && res.live.finished ? (res.live.outcome && res.live.outcome.won ? 'success' : 'fail') : 'whistle');
        if (name === 'live-start') notify(t('live.started')); else if (caught && res.live.finished) notify(t(res.live.outcome.won ? 'live.won' : 'live.lost'));
      } else if (name === 'pet-species') { state.petSpecies = el.dataset.species;
      } else if (name.startsWith('pet-')) {
        if (!state.career.state) throw new Error(t('career.empty'));
        const nameEl = doc.getElementById('pet-name');
        const config = name === 'pet-adopt' ? { op: 'adopt', species: state.petSpecies || 'dog', name: nameEl ? nameEl.value : '' }
          : name === 'pet-act' ? { op: 'act', action: el.dataset.act, trick: el.dataset.trick, premium: el.dataset.premium === '1', food: el.dataset.food, toy: el.dataset.toy, route: el.dataset.route }
          : name === 'pet-contest' ? { op: 'contest', tier: el.dataset.tier } : { op: name === 'pet-buy' ? 'buy' : name === 'pet-supply' ? 'supply' : 'equip', item: el.dataset.item };
        const res = await worker.send('career.pet', { state: state.career.state, config });
        await acceptCareer(res);
        if (audio) audio.play(name === 'pet-contest' ? (res.pet.place === 1 ? 'success' : 'click') : 'bounce');
        if (name === 'pet-contest') notify(t('pet.contestResult', { place: res.pet.place, score: res.pet.score, tier: t('pet.tier.' + res.pet.tier) }));
      } else if (name === 'live-hero') {
        state.heroShot = { aimStart: root.performance.now() }; if (audio) audio.play('whistle');
      } else if (name === 'arcade-start' || name === 'arcade-resume') {
        if (!state.career.state) throw new Error(t('career.empty'));
        const res = await worker.send('career.arcade', { state: state.career.state, start: true, type: el.dataset.game || (state.career.state.life.pendingArcade || {}).type, diff: state.arcadeDiff || 'normal', contest: el.dataset.contest === '1' });
        await acceptCareer(res); arcadeBegin(res.arcade.pending);
      } else if (name === 'arcade-auto') {
        if (!state.career.state) throw new Error(t('career.empty'));
        if (!state.career.state.life.pendingArcade) { const st = await worker.send('career.arcade', { state: state.career.state, start: true, type: el.dataset.game, diff: state.arcadeDiff || 'normal' }); await acceptCareer(st); }
        const pend = state.career.state.life.pendingArcade;
        const res = await worker.send('career.arcade', { state: state.career.state, auto: true });
        await acceptCareer(res); arcadeBegin(pend); state.arcade.final = res.arcade; state.arcade.phase = 'done'; state.arcade.round = CAA.Arcade.GAMES[pend.type].rounds - 1; state.arcade.live = { score: res.arcade.score, opponent: res.arcade.opponent || 0 };
      } else if (name === 'celebrate') { state.celebrate = root.performance.now(); state.busy = false; drawAvatar(); if (audio) audio.play('success'); return;
      } else if (name === 'arcade-diff') { state.arcadeDiff = el.dataset.diff;
      } else if (name === 'arcade-release') { state.busy = false; arcadeRelease(); return;
      } else if (name === 'arcade-cancel') {
        const res = await worker.send('career.arcade', { state: state.career.state, cancel: true }); await acceptCareer(res); state.arcade = null; if (state.tab === 'arcade') state.tab = 'life';
      } else if (name === 'coach-starter') {
        const sm = state.career.summary; const cur = state.coachPick && state.coachPick.career === sm.careerId ? state.coachPick.ids.slice() : sm.squad.starters.slice();
        const id = el.dataset.id; const i = cur.indexOf(id);
        if (i >= 0) cur.splice(i, 1); else if (cur.length < 5) cur.push(id); else notify(t('coach.fiveMax'), true);
        state.coachPick = { career: sm.careerId, ids: cur };
      } else if (name === 'coach-save-starters' || name === 'coach-tactic' || name === 'coach-training') {
        const config = name === 'coach-save-starters' ? { starters: state.coachPick.ids } : name === 'coach-tactic' ? { tactic: { [el.dataset.k]: el.dataset.v } } : { training: el.dataset.v };
        const res = await worker.send('career.coach', { state: state.career.state, config }); await acceptCareer(res);
        if (name === 'coach-save-starters') { state.coachPick = null; notify(t('coach.saved')); }
      } else if (name === 'family-setup') {
        const nm = doc.getElementById('partner-name');
        const res = await worker.send('career.family', { state: state.career.state, config: { op: 'setup', kind: el.dataset.kind, partnerName: nm ? nm.value : '' } }); await acceptCareer(res);
      } else if (name === 'career-family') {
        const res = await worker.send('career.advance', { state: state.career.state, action: { type: 'family' } }); await acceptCareer(res);
      } else if (name === 'retire-coach' || name === 'retire-heir' || name === 'retire-end') {
        const pos = doc.getElementById('heir-pos'), num = doc.getElementById('heir-number');
        const config = { op: 'retire', choice: name === 'retire-coach' ? 'coach' : name === 'retire-heir' ? 'heir' : 'end', childIndex: el.dataset.child != null ? Number(el.dataset.child) : undefined, pos: pos ? pos.value : 'SG', keepNumber: num ? num.checked : true };
        const res = await worker.send('career.family', { state: state.career.state, config }); await acceptCareer(res);
        if (audio) audio.play('buzzer');
      } else if (name === 'career-skip') {
        const res = await worker.send('career.advance', { state: state.career.state, action: { type: 'skipPlayoffs' } }); await acceptCareer(res);
      } else if (name === 'summary-dismiss') {
        const res = await worker.send('career.dismissSummary', { state: state.career.state }); await acceptCareer(res);
      } else if (name === 'career-sign') {
        const index = Number(el.dataset.index) || 0;
        const res = await worker.send('career.sign', { state: state.career.state, index });
        await acceptCareer(res);
      } else if (name === 'career-crossing') {
        if (!state.career.state) throw new Error(t('career.empty'));
        const sel = doc.getElementById('crossing-league');
        const target = sel ? sel.value : state.career.crossingLeague;
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
      if (state.heroShot && (e.target.id === 'hero-canvas' || (e.target.closest('[data-action]') && e.target.closest('[data-action]').dataset.action === 'live-hero-release'))) { heroRelease(); return; }
      if (e.target.id === 'arcade-canvas' || (e.target.closest('[data-action]') && e.target.closest('[data-action]').dataset.action === 'arcade-release')) { arcadeRelease(); return; }
      const go = e.target.closest('[data-tab-go]'); if (go) { state.tab = go.dataset.tabGo; render(); const f = doc.getElementById('tab-' + state.tab); if (f) f.focus(); return; }
      const tab = e.target.closest('[data-tab]'); if (tab) { state.tab = tab.dataset.tab; state.match.playing = false; render(); syncAnimation(); const f = doc.getElementById('tab-' + state.tab) || doc.getElementById('panel'); if (f) f.focus(); root.scrollTo && root.scrollTo(0, 0); return; }
      const btn = e.target.closest('[data-action]'); if (btn) { if (btn.dataset.index != null) state.career.signIndex = +btn.dataset.index; action(btn.dataset.action, btn); }
    });
    doc.getElementById('app').addEventListener('keydown', e => {
      if (state.confirm) {
        if (e.key === 'Escape') { e.preventDefault(); state.confirm = null; render(); }
        if (e.key === 'Tab') { const buttons = Array.from(doc.querySelectorAll('.confirm button')); const i = buttons.indexOf(doc.activeElement); e.preventDefault(); buttons[(i + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length].focus(); }
        return;
      }
      const tab = e.target.closest('[role=tab][data-tab]'); if (!tab) return;
      const next = CAA.A11Y.tabKey(e.key, PRIMARY_TABS.indexOf(tab.dataset.tab), PRIMARY_TABS.length); if (next == null) return;
      e.preventDefault(); state.tab = PRIMARY_TABS[next]; state.match.playing = false; render(); syncAnimation(); doc.getElementById('tab-' + state.tab).focus();
    });
    doc.getElementById('app').addEventListener('input', e => { if (e.target.id) state.drafts[e.target.id] = e.target.value; if (e.target.id === 'save-import') { state.importText = e.target.value; state.importPreview = null; const b = doc.querySelector('[data-action="save-import"]'); if (b) b.disabled = true; } });
    doc.getElementById('app').addEventListener('change', async e => {
      if (e.target.id === 'save-file') { const file = e.target.files[0]; if (!file) return; if (file.size > CAA.Save.MAX_IMPORT_CHARS * 2) { notify(t('save.tooLarge'), true); render(); return; } try { state.importText = await file.text(); state.importPreview = CAA.Save.parseEnvelope(state.importText, saveOptions()); if (state.importPreview.payload.career) CAA.Career.resume(state.importPreview.payload.career); notify(t('save.validated')); } catch (err) { state.importPreview = null; notify(err.message, true); } render(); return; }
      const el = e.target;
      if (el.id === 'slot') { state.slot = el.value; return; }
      if (el.id === 'career-mode') { state.career.mode = el.value; render(); return; }
      if (el.id === 'career-country') {
        const c = state.career; c.leagueCountry = el.value;
        const first = CAA.Season.leagueList(c.gender).find(l => l.country === el.value && (!c.eraYear || CAA.Eras.available(CAA.Season.LEAGUES[l.id], c.eraYear)));
        if (first) { c.leagueId = first.id; c.clubId = ''; await ensureClubs('world'); } else render();
        return;
      }
      if (el.id === 'crossing-country') {
        const s = state.career.summary; state.career.crossingCountry = el.value;
        const first = CAA.Season.leagueList(s.league.gender).find(l => l.country === el.value && l.id !== s.leagueId);
        state.career.crossingLeague = first ? first.id : null; render(); return;
      }
      if (el.id === 'career-league') { state.career.leagueId = el.value; state.career.clubId = ''; await ensureClubs('world'); return; }
      if (el.id === 'crossing-league') { state.career.crossingLeague = el.value; return; }
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
    if (lastEnv && lastEnv.payload.career) { try { state.career.state = CAA.Career.resume(lastEnv.payload.career); state.career.summary = CAA.Career.summary(state.career.state); state.tab = 'career'; } catch (err) { notify(t('save.failed') + ': ' + err.message, true); } }
    let storedLocale = null; try { storedLocale = root.localStorage.getItem('caa.locale'); } catch (_) {}
    state.screen = storedLocale ? 'menu' : 'lang';
    bind(); render();
    const suspend = () => { if (state.arcade && state.arcade.phase === 'aim') state.arcade.aimStart = root.performance.now(); state.match.playing = false; if (audio) audio.suspend(); if (state.practice && state.practice.start != null) state.practice.start = null; syncAnimation(); if (state.career.state) persistCareer(); };
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) suspend(); else { CAA.A11Y.apply(state.settings, doc); if (audio) audio.resume(); render(); } });
    root.addEventListener('pagehide', suspend);
    root.addEventListener('caa:native-pause', suspend);
    root.addEventListener('caa:native-resume', () => { CAA.A11Y.apply(state.settings, doc); if (audio) audio.resume(); render(); });
    const motion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)'); if (motion && motion.addEventListener) motion.addEventListener('change', () => { CAA.A11Y.apply(state.settings, doc); if (CAA.A11Y.reduced(state.settings)) state.match.playing = false; syncAnimation(); });
    root.CAA_APP = { state, storage, worker, world, persistCareer, rendererStats: () => voxelRenderer ? voxelRenderer.stats() : null, avatarStats: () => avatarRenderer ? avatarRenderer.stats() : null, audioStats: () => audio ? audio.stats() : null, handleBack: () => { if (state.busy) return true; if (state.confirm) { state.confirm = null; render(); return true; }
      if (state.screen === 'create') { if (state.wizard.step > 1) state.wizard.step--; else state.screen = 'modes'; render(); return true; }
      if (state.screen === 'modes') { state.screen = 'menu'; render(); return true; }
      if (state.screen === 'game') { if (SECONDARY_TABS.includes(state.tab)) state.tab = 'more'; else if (state.tab !== 'career') state.tab = 'career'; else state.screen = 'menu'; state.match.playing = false; render(); syncAnimation(); return true; }
      return false; } };
  }
  function start() { init().catch(err => { const el = doc.getElementById('app'); if (el) { el.textContent = 'No se pudo iniciar / Could not start: ' + err.message; el.setAttribute('role', 'alert'); } }); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(typeof globalThis !== 'undefined' ? globalThis : this);
