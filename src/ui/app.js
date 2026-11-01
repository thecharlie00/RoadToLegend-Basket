(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  if (!doc) return;

  const payload = JSON.parse(doc.getElementById('caa-payload').textContent);
  const workerCode = JSON.parse(doc.getElementById('caa-worker-code').textContent);
  const world = payload.data.seed || payload.data.world || { competitions: [] };
  const state = { screen: 'lang', wizard: { step: 1 }, tab: 'career', slot: 'slot-1', message: '', lab: '', match: { ruleSetId: 'FIBA-2026', seed: 'camino-demo', result: null, calibration: null, frame: 0, playing: false, view: '2d', quality: 'low', camera: 'broadcast', keyOnly: false, progress: 1, source: 'lab' }, career: { mode: 'player', route: 'eu-academy', seed: 'carrera-demo', nationality: 'ES', pos: 'SG', clubId: '', archetype: 'shooter', handedness: 'right', name: '', number: 7, talent: 'gem', clubs: [], clubsRoute: null, clubsLoading: false, state: null, summary: null }, practice: null, busy: false, saveState: 'idle', saveError: '', slots: [], importText: '', importPreview: null, confirm: null, diagnostics: null, drafts: {}, settings: CAA.A11Y.DEFAULTS };
  let storage, worker, voxelRenderer = null, voxelCanvas = null, avatarRenderer = null, avatarCanvas = null, audio = null, clubRequest = 0;
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
  function clockText(tenths) { const sec = Math.ceil(Math.max(0, tenths) / 10); return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }
  function feedText(e) {
    const v = { player: e.player || '', team: e.teamName, pts: e.points, shooter: e.shooter || '', defender: e.defender || '' };
    if (e.type === 'shot') return t(e.made ? 'live.feed.made' : 'live.feed.miss', v);
    if (e.type === 'ft') return t(e.made ? 'live.feed.ftMade' : 'live.feed.ftMiss', v);
    if (e.type === 'foul') return t(e.intentional ? 'live.feed.foulIntentional' : e.foulOut ? 'live.feed.foulOut' : 'live.feed.foul', v);
    if (e.type === 'turnover') return t(e.steal ? 'live.feed.steal' : 'live.feed.turnover', v);
    return t('live.feed.' + e.type, v);
  }
  function renderLive(c) {
    const raw = c.state && c.state.live;
    if (!raw || raw.week !== c.state.week) return '';
    const v = CAA.Live.view(raw);
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
    const controls = v.finished ? '' : `<div class="row">${m ? '' : `<button data-action="live-next" class="primary">${t('live.next')}</button>`}<button data-action="live-end">${t('live.toEnd')}</button></div>`;
    const feed = v.feed.map(e => `<li><span class="muted">${esc(e.period)}º · ${clockText(e.clock)}</span> ${esc(feedText(e))}</li>`).join('');
    const top = v.top.map(p => `<tr${p.me ? ' class="me"' : ''}><td>${esc(p.name)}${p.onCourt ? ' •' : ''}</td><td>${p.pts}</td><td>${p.reb}</td><td>${p.ast}</td><td>${p.pf}</td></tr>`).join('');
    return `<section class="panel live" aria-labelledby="live-title"><h3 id="live-title">${t('live.title')}</h3>
      <div class="scoreboard" role="status" aria-live="polite" aria-atomic="true"><span>${esc(v.teams[me])}</span><strong>${v.score[me]} – ${v.score[opp]}</strong><span>${esc(v.teams[opp])}</span>
      <span class="muted">${esc(v.periodLabel)} · ${clockText(v.clock)} · ${t('live.timeouts')}: ${v.timeouts}</span></div>
      ${momentHtml}${outcomeHtml}${controls}
      <div class="grid"><div><h4 id="live-feed-title">${t('live.feed.title')}</h4><ol class="feed" reversed tabindex="0" aria-labelledby="live-feed-title">${feed}</ol></div>
      <div class="table-scroll" tabindex="0"><table><caption class="muted">${t('live.top')}</caption><thead><tr><th>${t('live.col.player')}</th><th>PTS</th><th>REB</th><th>AST</th><th>PF</th></tr></thead><tbody>${top}</tbody></table></div></div></section>`;
  }
  // ===== Armazón tipo "Camino a la Leyenda": arranque, menú, modos, creación por pasos, cromo y barra inferior =====
  const PRIMARY_TABS = ['career', 'life', 'league', 'more'];
  const SECONDARY_TABS = ['match', 'world', 'save', 'lab', 'settings', 'arcade'];
  const NATIONS = ['ES', 'US', 'FR', 'DE', 'IT', 'TR', 'GR', 'AR', 'BR', 'AU', 'CA', 'LT', 'RS', 'CN', 'JP', 'KR', 'PH', 'ZA'];
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
    const initials = String(club.name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();
    return `<span class="crest" aria-hidden="true" style="--c1:hsl(${hue(club.id)} 62% 42%);--c2:hsl(${(hue(club.id) + 40) % 360} 70% 62%)">${esc(initials)}</span>`;
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
        <div class="stack">${[['es', '🇪🇸', 'Español'], ['en', '🇬🇧', 'English']].map(([code, f, name]) => `<button class="choice" data-action="boot-lang" data-locale="${code}" lang="${code}"><span class="big-flag" aria-hidden="true">${f}</span><b>${name}</b></button>`).join('')}</div></main>`;
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
        <div class="seg" role="group" aria-label="${t('modes.league')}"><button aria-pressed="true">${t('modes.men')}</button><button disabled aria-pressed="false">${t('modes.women')} · ${t('modes.soonShort')}</button></div>
        ${card('player', true)}${card('coach', true)}${card('club', false)}${card('eras', false)}
        <button class="ghost-btn" data-action="boot-back">${t('wiz.back')}</button></main>`;
    }
    return renderCreate();
  }

  function renderCreate() {
    const c = state.career, w = state.wizard;
    const player = c.mode === 'player';
    const total = player ? 4 : 2;
    const step = Math.min(w.step, total);
    const pick = (field, value, label, sub) => `<button class="pick" data-action="wiz-set" data-field="${field}" data-value="${esc(value)}" aria-pressed="${String(c[field]) === String(value)}"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
    let body = '';
    const stepKey = player ? ['who', 'position', 'talent', 'club'][step - 1] : ['who', 'club'][step - 1];
    if (stepKey === 'who') {
      body = `<label for="career-name">${t(player ? 'wiz.name' : 'wiz.coachName')}<input id="career-name" value="${esc(draft('career-name', c.name))}" maxlength="40" autocomplete="off" placeholder="${t('career.namePlaceholder')}"></label>
        ${player ? `<label for="career-nationality">${t('career.nationality')}<select id="career-nationality">${NATIONS.map(n => `<option value="${n}" ${n === c.nationality ? 'selected' : ''}>${flag(n)} ${esc(nationName(n))}</option>`).join('')}</select></label>` : ''}`;
    } else if (stepKey === 'position') {
      body = `<h3 class="eyebrow">${t('career.pos')}</h3><div class="pick-grid">${['PG', 'SG', 'SF', 'PF', 'C'].map(p => pick('pos', p, p, t('pos.' + p))).join('')}</div>
        <h3 class="eyebrow">${t('career.archetype')}</h3><div class="pick-list">${CAA.Player.ARCHETYPES.map(a => pick('archetype', a, t('career.archetype.' + a), t('arch.' + a))).join('')}</div>
        <h3 class="eyebrow">${t('career.handedness')}</h3><div class="pick-grid two">${pick('handedness', 'right', t('career.right'))}${pick('handedness', 'left', t('career.left'))}</div>
        <h3 class="eyebrow">${t('wiz.number')}</h3><div class="pick-grid nums">${NUMBERS.map(n => pick('number', n, String(n))).join('')}</div>`;
    } else if (stepKey === 'talent') {
      body = `<div class="pick-list">${['promise', 'gem', 'chosen', 'mystery'].map(k => pick('talent', k, t('talent.' + k), t('talent.' + k + 'Desc'))).join('')}</div>`;
    } else {
      const routes = player ? ['eu-academy', 'na-draft', 'na-undrafted'] : ['eu-academy', 'na-draft'];
      body = `<h3 class="eyebrow">${t('wiz.path')}</h3><div class="pick-list">${routes.map(r => pick('route', r, t('route.' + r), t('route.' + r + 'Desc'))).join('')}</div>
        <h3 class="eyebrow">${t(c.route === 'na-draft' ? 'wiz.preferredClub' : 'wiz.firstClub')}</h3>
        ${c.clubsLoading ? `<p class="muted">${t('status.working')}</p>` : `<div class="pick-list clubs">${c.clubs.map(x => `<button class="pick club" data-action="wiz-set" data-field="clubId" data-value="${esc(x.id)}" aria-pressed="${x.id === c.clubId}">${crest(x)}<b>${esc(x.name)}</b><small>${esc(t('league.' + (c.route === 'eu-academy' ? 'es-ascenso-iberico' : 'na-boreal-men')))}</small></button>`).join('')}</div>`}
        <p class="muted small">${t(c.route === 'na-draft' ? 'career.draftClubNote' : 'career.clubNote')}</p>
        <details><summary>${t('wiz.advanced')}</summary><label for="career-seed">${t('career.seed')}<input id="career-seed" value="${esc(draft('career-seed', c.seed))}"></label></details>`;
    }
    const last = step === total;
    return `<main id="panel" class="boot create" tabindex="-1"><p class="eyebrow">${t('wiz.step', { n: step, total })}</p>
      <div class="steps" aria-hidden="true">${Array.from({ length: total }, (_, i) => `<i class="${i < step ? 'on' : ''}"></i>`).join('')}</div>
      <h1 class="boot-title small">${t('wiz.' + stepKey + (player ? '' : 'Coach'))}</h1>${body}
      <div class="wiz-nav"><button class="ghost-btn" data-action="${step === 1 ? 'wiz-cancel' : 'wiz-back'}">${t(step === 1 ? 'confirm.cancel' : 'wiz.back')}</button>
      ${last ? `<button class="cta" data-action="career-create" ${c.clubsLoading || !c.clubId ? 'disabled' : ''}>${t('wiz.start')} <span aria-hidden="true">▶</span></button>` : `<button class="cta" data-action="wiz-next">${t('wiz.next')}</button>`}</div></main>`;
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

  function newsText(i) {
    const vars = { weeks: i.weeks || 0, pick: i.detail && i.detail.overall, us: i.score ? i.score.join('–') : '', team: i.detail && i.detail.team || '' };
    const key = 'inbox.' + i.type + (i.type === 'live' ? (i.won ? 'Won' : 'Lost') : '');
    return t(key, vars);
  }

  function chips(fx) {
    const out = [];
    for (const [k, v] of Object.entries(fx || {})) {
      if (['agent', 'sponsor', 'flag', 'unflag', 'xp'].includes(k)) continue;
      if (k === 'attr') { for (const [a, d] of Object.entries(v)) out.push(`<span class="chip ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d} ${t('attr.' + a)}</span>`); continue; }
      if (k === 'salary') { out.push(`<span class="chip ${v >= 1 ? 'up' : 'down'}">${v >= 1 ? '+' : ''}${Math.round((v - 1) * 100)} % ${t('effect.salary')}</span>`); continue; }
      if (k === 'injuryWeeks') { out.push(`<span class="chip ${v < 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${v} ${t('effect.injuryWeeks')}</span>`); continue; }
      if (k === 'fatigue') { out.push(`<span class="chip ${v < 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${Math.round(v * 100)} ${t('effect.fatigue')}</span>`); continue; }
      const bad = k === 'load' ? v > 0 : v < 0;
      out.push(`<span class="chip ${bad ? 'down' : 'up'}">${v > 0 ? '+' : ''}${k === 'cash' ? v.toLocaleString(CAA.I18N.getLocale()) : v} ${t('effect.' + k)}</span>`);
    }
    return out.join('');
  }
  function renderHome() {
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
    const segs = 5, seg = Math.min(segs - 1, Math.floor(s.round / Math.max(1, s.totalRounds) * segs));
    const season = `<section class="season"><div class="season-head"><h2>${t('home.season', { season: seasonLabel(s.year) })}</h2><span class="muted">${s.round >= s.totalRounds ? t('home.seasonEnd') : t('home.round', { n: s.round + 1, total: s.totalRounds })}</span></div>
      <ol class="timeline" aria-label="${t('home.timeline')}">${Array.from({ length: segs }, (_, i) => `<li class="${i < seg ? 'done' : i === seg ? 'now' : ''}" ${i === seg ? 'aria-current="step"' : ''}>${t('home.seg' + i)}</li>`).join('')}</ol>
      <div class="meters">${s.player ? meter(t('meter.form'), m.form) + meter(t('meter.morale'), m.morale) + meter(t('meter.fitness'), m.fitness) + meter(t('meter.trust'), m.trust) + meter(t('meter.fans'), m.fans)
        : meter(t('meter.morale'), m.morale) + meter(t('meter.board'), m.trust) + meter(t('meter.locker'), m.locker) + meter(t('meter.fitness'), m.fitness) + meter(t('meter.fans'), m.fans)}</div></section>`;
    const ev = s.event;
    const L = pair => pair ? (CAA.I18N.getLocale() === 'en' ? pair.en : pair.es) : '';
    const decision = ev ? `<section class="card decision"><div class="guide-head"><span class="tag led">● ${t(ev.story ? 'home.story' : 'home.decision')}</span><span class="muted small">${esc(t('eventcat.' + ev.category))}</span></div>
      <h3>${esc(L(ev.title))}</h3><p>${esc(L(ev.body))}</p>
      <div class="stack">${ev.options.map(o => `<button class="option" data-action="life-event" data-option="${o.id}"><span class="opt-head"><b>${esc(L(o.label))}</b><span class="odds ${o.p == null ? 'sure' : o.p >= 0.6 ? 'hi' : o.p >= 0.45 ? 'mid' : 'lo'}">${o.p == null ? t('odds.sure') : t('odds.pct', { p: Math.round(o.p * 100) })}</span></span>${o.desc ? `<span class="muted small">${esc(L(o.desc))}</span>` : ''}
        <span class="chips">${o.p == null ? chips(o.effects) : `<span class="chip-label">${t('odds.ifGood')}</span>${chips(o.ok)}<span class="chip-label">${t('odds.ifBad')}</span>${chips(o.ko)}`}</span></button>`).join('')}</div></section>` : '';
    const lo = life.lastOutcome;
    const outcome = lo && !ev ? `<section class="card outcome ${lo.uncertain ? (lo.good ? 'good' : 'bad') : ''}"><span class="eyebrow">${esc(L(lo.title))} · ${esc(L(lo.label))}</span><p><b>${esc(L(lo.result))}</b></p><span class="chips">${chips(lo.effects)}</span></section>` : '';
    const next = s.next ? `<section class="card next"><span class="eyebrow">${t('home.next', { n: s.next.round })} · ${t(s.next.home ? 'home.home' : 'home.away')}</span>
      <div class="versus">${crest(s.club)}<b>${esc(s.club.name)}</b><span class="muted">${s.club.wins}-${s.club.losses}</span><em>vs</em>${crest(s.next.opponent)}<b>${esc(s.next.opponent.name)}</b><span class="muted">${s.next.opponent.wins}-${s.next.opponent.losses}</span></div></section>` : '';
    const recent = s.recent.length ? `<section class="card"><div class="guide-head"><h3>${t('home.lastGame')}</h3>${c.state.lastMatch ? `<button class="small-btn" data-action="career-watch">${t('career.watch')}</button>` : ''}</div>
      <p class="result ${s.recent[0].won ? 'ok' : 'bad'}"><b>${t(s.recent[0].won ? 'home.win' : 'home.loss')}</b> ${s.recent[0].us}–${s.recent[0].them} ${t(s.recent[0].home ? 'home.vsHome' : 'home.vsAway', { team: s.recent[0].opponent })}</p>
      <p class="form-strip" aria-label="${t('home.formStrip')}">${s.recent.map(r => `<span class="${r.won ? 'w' : 'l'}">${t(r.won ? 'home.w' : 'home.l')}</span>`).join('')}</p></section>` : '';
    const week = s.player && !(c.state.live && c.state.live.week === c.state.week) && s.next ? `<section class="card"><h3>${t('home.week')}</h3><p class="muted small">${t('home.weekDesc')}</p>
      <div class="stack"><button class="option" data-action="career-train"><b>${t('home.train')}</b><span class="muted small">${t('home.trainDesc')}</span></button><button class="option" data-action="career-rest"><b>${t('home.rest')}</b><span class="muted small">${t('home.restDesc')}</span></button></div></section>` : '';
    const market = s.market.length ? `<section class="card"><h3>${t('career.market')}</h3><div class="stack">${s.market.map((mk, i) => `<div class="offer"><span>${esc(mk.contract.salary.toLocaleString(CAA.I18N.getLocale()))} €/$ · ${mk.contract.years} ${t('career.years')}</span><button class="small-btn" data-action="career-sign" data-index="${i}">${t('career.sign')}</button></div>`).join('')}</div></section>` : '';
    const news = s.inbox.slice().reverse().map(i => `<li>${esc(newsText(i))}</li>`).concat((life.press || []).slice(-4).reverse().map(p => `<li class="press">📰 ${esc(CAA.I18N.getLocale() === 'en' ? p.en : p.es)}</li>`)).slice(0, 8).join('');
    return `${guide}${renderLive(c)}${decision}${outcome}${season}${next}${week}${recent}${market}<section class="card"><h3>${t('home.news')}</h3><ul class="news">${news}</ul></section>`;
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
      <p class="muted small">${t('me.contract', { salary: p.contract.salary.toLocaleString(CAA.I18N.getLocale()), years: p.contract.years })}</p></section>` : '';
    const best = (life.arcade && life.arcade.best) || {};
    const minis = `<section class="card"><div class="guide-head"><h3>${t('arcade.title')}</h3><span class="tag led">${t('arcade.plays', { n: life.counters.arcadePlays || 0 })}</span></div><div class="minis">${CAA.Arcade.TYPES.map(g => `<div class="mini"><span class="mini-ico" aria-hidden="true">${{ freeThrow: '🎯', three: '🏀', buzzer: '⏱', dunk: '🚀', defense: '🛡', street: '🏙' }[g]}</span><span><b>${t('arcade.' + g)}</b><small>${t('arcade.' + g + 'Desc')}</small><small class="best">${best[g] != null ? t('arcade.best', { n: best[g] }) : t('arcade.noBest')}</small></span><span class="mini-btns"><button class="small-btn primary" data-action="arcade-start" data-game="${g}">${t('arcade.play')}</button><button class="small-btn" data-action="arcade-auto" data-game="${g}">${t('arcade.auto')}</button></span></div>`).join('')}</div>
      ${life.pendingArcade ? `<p class="muted small">${t('arcade.pending', { game: t('arcade.' + life.pendingArcade.type) })}</p><div class="row"><button class="small-btn" data-action="arcade-resume">${t('arcade.resume')}</button><button class="small-btn" data-action="arcade-cancel">${t('arcade.abandon')}</button></div>` : ''}</section>`;
    const practice = `<section class="card"><h3>${t('me.practice')}</h3><p class="muted small">${t('me.practiceDesc')}</p>
      <div class="pick-grid two"><button class="option" data-action="life-practice-start"><b>${t('life.practiceManual')}</b></button><button class="option" data-action="life-practice-auto"><b>${t('life.practiceAuto')}</b></button><button class="option" data-action="life-buzzer-start"><b>${t('life.buzzerManual')}</b></button><button class="option" data-action="life-buzzer-auto"><b>${t('life.buzzerAuto')}</b></button></div>
      ${state.practice && state.practice.start != null ? `<button class="cta" data-action="life-practice-release">${t('life.release')}</button>` : ''}
      ${life.pendingPractice ? `<p class="muted small">${t('life.pendingAttempt', { type: t(life.pendingPractice.type === 'buzzer' ? 'life.buzzerAuto' : 'life.practiceAuto'), id: life.pendingPractice.id })}</p><div class="row"><button class="small-btn" data-action="life-practice-resume">${t('life.resumeAttempt')}</button><button class="small-btn" data-action="life-practice-cancel">${t('life.cancelAttempt')}</button></div>` : ''}
      ${state.practice && state.practice.result ? `<p class="${state.practice.result.made ? 'ok' : 'bad'}"><b>${state.practice.result.made ? t('life.made') : t('life.missed')}</b></p>` : ''}</section>`;
    const shop = `<section class="card"><div class="guide-head"><h3>${t('life.shop')}</h3><span class="tag">${t('life.style')}: ${life.style} · ${t('life.cash')}: ${life.cash}</span></div><div class="shop">${packs.shop.items.map(i => {
      const owned = life.owned.includes(i.id), equipped = (life.equipment || {})[i.slot] === i.id;
      return `<div class="item"><span class="swatch" style="background:${esc(i.color)}" aria-hidden="true"></span><span><b>${esc(loc(i.name))}</b><small>${t('slot.' + i.slot)} · ${i.cost} ${t('life.style')}</small></span>${owned ? `<button class="small-btn" data-action="life-equip" data-item="${i.id}" ${equipped ? 'disabled' : ''}>${equipped ? t('me.equipped') : t('life.equip')}</button>` : `<button class="small-btn" data-action="life-buy" data-item="${i.id}">${t('life.buy')}</button>`}</div>`; }).join('')}</div></section>`;
    const all = packs.achievements.achievements.filter(a => !a.mode || a.mode === 'any' || a.mode === s.mode), unlocked = all.filter(a => life.achievements.includes(a.id)).length;
    const trophies = `<section class="card"><div class="guide-head"><h3>${t('me.trophies')}</h3><span class="tag led">${unlocked}/${all.length}</span></div><ul class="trophies" tabindex="0" aria-label="${t('me.trophies')}">${all.map(a => { const ok = life.achievements.includes(a.id); return `<li class="${ok ? 'ok' : 'locked'}"><span aria-hidden="true">${ok ? '🏆' : '🔒'}</span><span><b>${esc(loc(a.title))}</b><small>${esc(t('ach.' + a.metric, { n: a.threshold.toLocaleString(CAA.I18N.getLocale()) }))}</small></span></li>`; }).join('')}</ul></section>`;
    const press = (life.press || []).length ? `<section class="card"><h3>${t('life.press')}</h3><ul class="news">${life.press.slice().reverse().map(x => `<li>📰 ${esc(CAA.I18N.getLocale() === 'en' ? x.en : x.es)}</li>`).join('')}</ul></section>` : '';
    return hero + offcourt + minis + attrs + stats + practice + shop + trophies + press;
  }

  function renderLeague() {
    if (!hasCareer()) return renderHome();
    const s = state.career.summary;
    const rows = s.table.map(r => `<tr class="${r.id === s.club.id ? 'me' : ''}"><td>${r.rank}</td><td>${esc(r.name)}</td><td>${r.wins}</td><td>${r.losses}</td><td>${r.diff > 0 ? '+' : ''}${r.diff}</td></tr>`).join('');
    return `<section class="card"><span class="eyebrow">${t('league.kicker', { season: seasonLabel(s.year) })}</span><h2>${esc(s.leagueName)}</h2>
      <div class="table-scroll compact" tabindex="0" role="region" aria-label="${t('league.table')}"><table><caption class="muted">${t('league.table')}</caption><thead><tr><th>#</th><th>${t('league.team')}</th><th>${t('league.w')}</th><th>${t('league.l')}</th><th>${t('league.diff')}</th></tr></thead><tbody>${rows}</tbody></table></div></section>
      ${s.recent.length ? `<section class="card"><h3>${t('league.results')}</h3><ul class="news">${s.recent.map(r => `<li><span class="${r.won ? 'ok' : 'bad'}">${t(r.won ? 'home.w' : 'home.l')}</span> ${t('league.roundShort', { n: r.round })} · ${r.us}–${r.them} ${t(r.home ? 'home.vsHome' : 'home.vsAway', { team: r.opponent })}</li>`).join('')}</ul></section>` : ''}
      <section class="card"><h3>${t('league.otherWorld')}</h3><p class="muted small">${t('league.otherWorldDesc')}</p><button class="small-btn" data-action="career-crossing">${t('career.crossing')}</button></section>`;
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
      <div class="row"><button class="cta" data-action="arcade-start" data-game="${a.type}">${t('arcade.again')}</button><button class="small-btn" data-tab="life">${t('arcade.back')}</button></div></section>` : '';
    return `<section class="card arcade"><div class="guide-head"><div><span class="eyebrow">${t('arcade.round', { n: Math.min(a.round + 1, g.rounds), total: g.rounds })}</span><h2>${t('arcade.' + a.type)}</h2></div><div class="arcade-score"><b>${scoreTxt}</b><small>${t('arcade.streak', { n: a.streak })}</small></div></div>
      <canvas id="arcade-canvas" width="640" height="420" role="img" aria-label="${t('arcade.canvas', { game: t('arcade.' + a.type) })}" aria-describedby="arcade-help"></canvas>
      <p id="arcade-help" class="muted small">${t('arcade.help.' + g.meter)}</p>
      <p class="sr-only" role="status" aria-live="polite">${esc(a.lastText || '')}</p>
      ${done ? '' : `<button class="cta shoot" data-action="arcade-release" ${a.phase !== 'aim' ? 'disabled' : ''}>${t(a.type === 'defense' || (a.type === 'street' && a.round % 2 === 1) ? 'arcade.defend' : a.type === 'dunk' ? 'arcade.beat' : 'arcade.shoot')}</button>`}
      </section>${summary}`;
  }
  function renderMore() {
    const row = (tab, ico) => `<button class="row-link" data-tab="${tab}" id="more-${tab}"><span class="ico" aria-hidden="true">${ico}</span><span><b>${t('more.' + tab)}</b><small>${t('more.' + tab + 'Sub')}</small></span><span aria-hidden="true">›</span></button>`;
    return `<section class="card"><h2>${t('nav.more')}</h2><div class="stack">${row('match', '🏀')}${row('save', '💾')}${row('settings', '⚙')}${row('world', '🌍')}${row('lab', '🧪')}
      <button class="row-link" data-action="boot-menu"><span class="ico" aria-hidden="true">⌂</span><span><b>${t('more.menu')}</b><small>${t('more.menuSub')}</small></span><span aria-hidden="true">›</span></button></div></section>`;
  }

  function renderActionBar() {
    if (!hasCareer() || state.tab !== 'career') return '';
    const c = state.career;
    const liveNow = c.state.live && c.state.live.week === c.state.week;
    if (liveNow) return '';
    const s = c.summary;
    if (!s.next) return `<div class="actionbar"><button class="cta" data-action="career-play">${t('home.advance')} ▶</button></div>`;
    return `<div class="actionbar"><button class="cta" data-action="live-start">${t('home.playLive', { team: s.next.opponent.name })} <span aria-hidden="true">▶</span></button><button class="sim-btn" data-action="career-play" aria-label="${t('home.simulateLabel')}">${t('home.simulate')}</button></div>`;
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
    doc.documentElement.lang = CAA.I18N.getLocale();
    const status = `<div id="global-status" role="status" aria-live="polite" aria-atomic="true" class="${state.messageError ? 'bad' : 'muted'}">${esc(state.message || (state.busy ? t('status.working') : ''))}</div>`;
    const confirm = state.confirm ? `<section class="panel confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description"><h2 id="confirm-title">${t('confirm.title')}</h2><p id="confirm-description">${esc(state.confirm.text)}</p><div class="row"><button id="confirm-cancel" data-action="confirm-cancel">${t('confirm.cancel')}</button><button data-action="confirm-yes" class="danger">${t('confirm.yes')}</button></div></section>` : '';
    doc.body.dataset.screen = state.screen;
    if (state.screen !== 'game') {
      doc.getElementById('app').innerHTML = `<a class="skip-link" href="#panel">${t('a11y.skip')}</a>${confirm}${renderBoot()}${status}`;
    } else {
      const tab = state.tab;
      const body = tab === 'career' ? renderHome() : tab === 'life' ? renderMe() : tab === 'league' ? renderLeague() : tab === 'more' ? renderMore() : tab === 'world' ? renderWorld() : tab === 'match' ? renderMatch() : tab === 'save' ? renderSave() : tab === 'lab' ? renderLab() : tab === 'arcade' ? renderArcade() : renderSettings();
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
    if (state.arcade && state.tab === 'arcade' && arcadeRaf == null) arcadeSync();
    if (state.heroShot && heroRaf == null) heroRaf = root.requestAnimationFrame(heroDraw);
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

  // ===== Minijuegos: bucle de juego (el resultado lo decide CAA.Arcade con el tick de suelta) =====
  let arcadeRaf = null;
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
    CAA.Arcade2D.draw(ctx, canvas.width, canvas.height, { type: a.type, round: a.round, phase: a.phase, spec, cursor: a.phase === 'aim' ? CAA.Arcade.cursorAt(spec, tick) : spec.center, meterType: CAA.Arcade.GAMES[a.type].meter,
      anim, now: ts, label: a.label, labelGood: a.labelGood, flash: a.flash ? Math.max(0, 1 - (ts - (a.anim ? a.anim.start : ts)) / 250) : 0, netKick: anim && anim.made && anim.t > 0.7 ? 1 - (anim.t - 0.7) / 0.3 : 0, hype: Math.min(1, a.streak / 4) },
      { colorMode: state.settings.colorMode, jersey: jerseyItem ? jerseyItem.color : null });
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
      else if (name === 'boot-lang') { CAA.I18N.setLocale(el.dataset.locale === 'en' ? 'en' : 'es'); saveSettings(); state.screen = 'menu'; }
      else if (name === 'boot-new') { state.screen = 'modes'; }
      else if (name === 'boot-continue') { state.screen = 'game'; state.tab = 'career'; }
      else if (name === 'boot-open') { state.screen = 'game'; state.tab = el.dataset.target || 'more'; }
      else if (name === 'boot-menu' || name === 'boot-back') { state.screen = 'menu'; state.match.playing = false; }
      else if (name === 'boot-mode') {
        state.career.mode = el.dataset.mode === 'coach' ? 'coach' : 'player'; state.wizard = { step: 1 };
        if (state.career.mode === 'coach' && state.career.route === 'na-undrafted') state.career.route = 'eu-academy';
        state.screen = 'create'; ensureClubs(state.career.route);
      } else if (name === 'wiz-next' || name === 'wiz-back' || name === 'wiz-cancel') {
        const nameEl = doc.getElementById('career-name'); if (nameEl) state.career.name = nameEl.value;
        const natEl = doc.getElementById('career-nationality'); if (natEl) state.career.nationality = natEl.value;
        const seedEl = doc.getElementById('career-seed'); if (seedEl) state.career.seed = seedEl.value;
        if (name === 'wiz-cancel') state.screen = 'modes'; else state.wizard.step = Math.max(1, state.wizard.step + (name === 'wiz-next' ? 1 : -1));
      } else if (name === 'wiz-set') {
        const field = el.dataset.field, value = el.dataset.value;
        if (field === 'number') state.career.number = Number(value);
        else if (field === 'route') { state.career.route = value; state.career.clubId = ''; state.busy = false; await ensureClubs(value); }
        else if (['pos', 'archetype', 'handedness', 'talent', 'clubId'].includes(field)) state.career[field] = value;
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
        if (!state.career.clubId) throw new Error(t('career.clubRequired'));
        const created = await worker.send('career.create', { mode: state.career.mode, route: state.career.route, seed: state.career.seed, nationality: state.career.nationality, pos: state.career.pos, clubId: state.career.clubId, archetype: state.career.archetype, handedness: state.career.handedness, name: state.career.name || undefined, number: state.career.number, quality });
        if (audio) audio.play('success');
        state.career.state = CAA.Career.resume(created); state.career.summary = CAA.Career.summary(state.career.state); state.practice = null; await persistCareer();
        state.screen = 'game'; state.tab = 'career'; state.wizard = { step: 1 }; notify(t('wiz.welcome'));
      } else if (name === 'career-play' || name === 'career-train' || name === 'career-rest') {
        if (!state.career.state) throw new Error(t('career.empty'));
        const action = name === 'career-train' ? { type: 'train', focus: 'tiroTriple' } : name === 'career-rest' ? { type: 'rest' } : { type: 'play' };
        const res = await worker.send('career.advance', { state: state.career.state, action });
        await acceptCareer(res);
      } else if (name === 'live-start' || name === 'live-next' || name === 'live-end' || name === 'live-choice') {
        if (!state.career.state) throw new Error(t('career.empty'));
        const payloadLive = { state: state.career.state, start: name === 'live-start', toEnd: name === 'live-end', choice: name === 'live-choice' ? el.dataset.choice : undefined, release: el && el.dataset && el.dataset.release != null ? Number(el.dataset.release) : undefined };
        state.heroShot = null;
        const res = await worker.send('career.live', payloadLive);
        await acceptCareer(res);
        if (audio) audio.play(res.live.finished ? (res.live.outcome && res.live.outcome.won ? 'success' : 'fail') : res.live.moment ? 'whistle' : 'click');
        notify(res.live.finished ? t(res.live.outcome.won ? 'live.won' : 'live.lost') : res.live.moment ? t('live.moment.' + res.live.moment.type) : t('live.started'));
      } else if (name === 'live-hero') {
        state.heroShot = { aimStart: root.performance.now() }; if (audio) audio.play('whistle');
      } else if (name === 'arcade-start' || name === 'arcade-resume') {
        if (!state.career.state) throw new Error(t('career.empty'));
        const res = await worker.send('career.arcade', { state: state.career.state, start: true, type: el.dataset.game || (state.career.state.life.pendingArcade || {}).type });
        await acceptCareer(res); arcadeBegin(res.arcade.pending);
      } else if (name === 'arcade-auto') {
        if (!state.career.state) throw new Error(t('career.empty'));
        if (!state.career.state.life.pendingArcade) { const st = await worker.send('career.arcade', { state: state.career.state, start: true, type: el.dataset.game }); await acceptCareer(st); }
        const pend = state.career.state.life.pendingArcade;
        const res = await worker.send('career.arcade', { state: state.career.state, auto: true });
        await acceptCareer(res); arcadeBegin(pend); state.arcade.final = res.arcade; state.arcade.phase = 'done'; state.arcade.round = CAA.Arcade.GAMES[pend.type].rounds - 1; state.arcade.live = { score: res.arcade.score, opponent: res.arcade.opponent || 0 };
      } else if (name === 'arcade-release') { state.busy = false; arcadeRelease(); return;
      } else if (name === 'arcade-cancel') {
        const res = await worker.send('career.arcade', { state: state.career.state, cancel: true }); await acceptCareer(res); state.arcade = null; if (state.tab === 'arcade') state.tab = 'life';
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
