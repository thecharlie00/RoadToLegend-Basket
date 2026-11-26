(function (root) {
  'use strict';
  // Armazón de la interfaz: estado, ajustes, traductor, guardado, render() y despacho de acciones.
  // Lo que se pinta vive en src/ui/views/*.js y lo que hace cada botón en src/ui/actions/*.js; ambos
  // reciben el contexto `ui` que se crea al final de este archivo.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  if (!doc) return;

  const payload = JSON.parse(doc.getElementById('caa-payload').textContent);
  const workerCode = JSON.parse(doc.getElementById('caa-worker-code').textContent);
  const world = payload.data.seed || payload.data.world || { competitions: [] };
  const state = { screen: 'lang', wizard: { step: 1 }, tab: 'career', slot: 'slot-1', message: '', lab: '', match: { ruleSetId: 'FIBA-2026', seed: 'camino-demo', result: null, calibration: null, frame: 0, playing: false, view: '2d', quality: 'low', camera: 'broadcast', keyOnly: false, progress: 1, source: 'lab' }, career: { mode: 'player', gender: 'm', leagueId: 'fr-hexagone-men', route: 'eu-academy', seed: 'carrera-demo', nationality: 'ES', pos: 'SG', clubId: '', archetype: 'shooter', handedness: 'right', name: '', number: 7, talent: 'gem', clubs: [], clubsRoute: null, clubsLoading: false, state: null, summary: null }, practice: null, busy: false, saveState: 'idle', saveError: '', slots: [], importText: '', importPreview: null, confirm: null, diagnostics: null, drafts: {}, settings: CAA.A11Y.DEFAULTS };
  let storage, worker, voxelRenderer = null, voxelCanvas = null, avatarRenderer = null, avatarCanvas = null, audio = null, clubRequest = 0;
  const saveOptions = () => ({ careerValidator: CAA.Career.validate });
  function notify(text, error = false) {
    state.message = text; state.messageError = error;
    if (!error) root.setTimeout(() => { if (state.message === text) { state.message = ''; const el = doc.getElementById('global-status'); if (el) el.textContent = ''; } }, 4500);
  }
  function haptic(kind) { try { if (state.settings.vibration && CAA.Haptic) CAA.Haptic.pulse(root, kind); } catch (_) {} }
  function draft(id, value) { return Object.prototype.hasOwnProperty.call(state.drafts, id) ? state.drafts[id] : value; }

  function syncEraLook() { const s = hasCareer() && state.screen === 'game' ? state.career.summary : null; const v = s && s.era ? s.era.look : ''; if (doc.body.dataset.era !== v) doc.body.dataset.era = v; }
  function femOpts() {
    const c = state.career && state.career.state;
    // Al crear la carrera: si se elige femenino, los textos ya salen en femenino (jugadora, compañeras…).
    if (state.screen !== 'game') return state.career && state.career.gender === 'f' && (state.screen === 'modes' || state.screen === 'create') ? CAA.Fem.opts(true, state.career.mode !== 'coach', null) : null;
    if (!c) return null;
    const team = CAA.Season.genderOf(c.season.leagueId) === 'women', self = !!(c.player && c.player.gender === 'women');
    return team || self ? CAA.Fem.opts(team, self, null) : null;
  }
  function t(key, vars) { const s = CAA.I18N.t(key, vars), o = femOpts(); return o ? CAA.Fem.apply(s, CAA.I18N.getLocale(), o) : s; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  if (CAA.Juice) CAA.Juice.setReduced(() => CAA.A11Y.reduced(state.settings));
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





  // Texto ya rellenado (eventos, prensa): idioma propio si existe; si no, español o inglés.
  function pick(o) { if (!o) return ''; const l = CAA.I18N.getLocale(); return o[l] || (l === 'es' ? o.es : o.en) || o.es || ''; }
  function loc(obj) {
    if (!obj) return '';
    const l = CAA.I18N.getLocale(), own = obj[l] || (l !== 'es' && l !== 'en' && CAA.ContentI18n ? CAA.ContentI18n.tr(l, obj.en) : null);
    const v = own || (l === 'es' ? obj.es : obj.en) || obj.es || '', lang = own ? l : (l === 'es' ? 'es' : 'en');
    const o = femOpts();
    return o && v ? CAA.Fem.apply(v, lang, o) : v;
  }
  async function ensureClubs(route) {
    const c = state.career;
    const key = route === 'world' ? 'world:' + c.leagueId : route;
    if (c.clubsRoute === key && c.clubs.length) return;
    const token = ++clubRequest;
    c.clubsLoading = true; c.clubs = []; c.clubsRoute = null; render();
    try {
      const res = await worker.send('career.clubs', { route, leagueId: c.leagueId, gender: c.gender });
      if (token !== clubRequest) return;
      c.clubs = res.clubs; c.clubsRoute = key;
      if (!c.clubs.some(x => x.id === c.clubId)) c.clubId = c.clubs.length ? c.clubs[0].id : '';
    } catch (err) { if (token === clubRequest) notify(t('status.error') + ': ' + err.message, true); }
    finally { if (token === clubRequest) { c.clubsLoading = false; render(); } }
  }
  let petRenderer = null, petCanvas = null, petTimer = null;
  // Escena vóxel de la decisión pendiente (como las escenas de eventos del fútbol). Se dibuja una vez por evento.
  let dlTimer = null;
  let sceneRenderer = null, sceneCanvas = null;
  let avatarTimer = null, sceneTimer = null;
  let liveSim = null, liveSimT = 0, liveRenderer = null, liveCanvas = null, liveRaf = null;
 // décimas de partido por segundo real (×1 ≈ un minuto cada 3 s)
  let pb = { key: null, seq: 0, cursor: 0, speed: 1, hold: 0 }, pbTimer = null, pbLast = 0, pbFetching = false;
  // ===== Armazón tipo "Camino a la Leyenda": arranque, menú, modos, creación por pasos, cromo y barra inferior =====
  const PRIMARY_TABS = ['career', 'life', 'league', 'more'];
  // Orden de navegación para que el panel entre desde el lado correcto al cambiar de pestaña.
  const TAB_ORDER = ['career', 'life', 'talents', 'league', 'movements', 'more', 'editor', 'market', 'club', 'shop', 'look', 'national', 'moments', 'history', 'guide', 'world', 'match', 'save', 'settings', 'lab', 'arcade'];
  function tabDir(from, to) {
    const a = TAB_ORDER.indexOf(from), b = TAB_ORDER.indexOf(to);
    if (a < 0 || b < 0 || a === b) return 'fwd';
    return b > a ? 'fwd' : 'back';
  }
  const SECONDARY_TABS = ['jugada', 'match', 'world', 'save', 'lab', 'settings', 'arcade', 'guide', 'history', 'shop', 'look', 'club', 'national', 'editor', 'moments', 'market'];
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
  function abbrOf(name) { return CAA.Crest ? CAA.Crest.abbr(name) : String(name || '').slice(0, 3).toUpperCase(); }
  function crest(club, size) {
    if (CAA.Crest) return `<span class="crest-wrap" aria-hidden="true">${CAA.Crest.svg(club, size || 24)}</span>`;
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





  function leagueName(id, year) { const L = CAA.Season.LEAGUES[id], y = year || eraYearNow(); const h = y && CAA.EraWorld ? CAA.EraWorld.leagueNameAt(id, y) : null; return h || (L ? L.name : id); }
  function leagueLabel(id, year) { const L = CAA.Season.LEAGUES[id]; return L ? (L.country === 'AF' ? '🌍' : flag(L.country)) + ' ' + leagueName(id, year) : id; }





  let jmUnbind = null;

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
    maybeStartCoach();
    doc.body.dataset.screen = state.screen;
    // Una animación de entrada por cambio de pantalla/pestaña/paso, no en cada repintado.
    const viewKey = state.screen + ':' + (state.screen === 'game' ? state.tab : state.screen === 'create' ? 'create:' + state.wizard.step : state.screen);
    const entered = state.viewKey !== viewKey; state.viewKey = viewKey;
    const rail = state.busy ? '<div class="busy-rail" aria-hidden="true"><i></i></div>' : '';
    if (state.screen !== 'game') {
      doc.getElementById('app').innerHTML = `${rail}<a class="skip-link" href="#panel">${t('a11y.skip')}</a>${confirm}${renderBoot()}${status}`;
    } else {
      const tab = state.tab;
      const body = tab === 'career' ? renderHome() : tab === 'life' ? renderMe() : tab === 'talents' ? ui.renderTalents() : tab === 'league' ? renderLeague() : tab === 'more' ? renderMore() : tab === 'jugada' ? renderJugadaCampaign() : tab === 'world' ? renderWorld() : tab === 'match' ? renderMatch() : tab === 'save' ? renderSave() : tab === 'lab' ? renderLab() : tab === 'arcade' ? renderArcade() : tab === 'guide' ? renderGuide() : tab === 'history' ? renderHistory() : tab === 'moments' ? renderMoments() : tab === 'editor' ? renderEditor() : tab === 'club' ? renderClub() : tab === 'market' ? renderMarket() : tab === 'national' ? renderNational() : tab === 'shop' ? renderShop() : tab === 'look' ? renderLook() : renderSettings();
      const sel = PRIMARY_TABS.includes(tab) ? tab : tab === 'arcade' || tab === 'talents' ? 'life' : 'more';
      const icons = { career: CAA.Icons.svg('career'), life: CAA.Icons.svg('life'), league: CAA.Icons.svg('league'), more: CAA.Icons.svg('more') };
      doc.getElementById('app').innerHTML = `${rail}<a class="skip-link" href="#panel">${t('a11y.skip')}</a>${renderCromo()}
      ${storage && !storage.persistent ? `<p class="bad">${t('save.memoryWarning')}</p>` : ''}${status}
      ${state.saveError && state.career.state ? `<div class="row"><button data-action="save-export-current">${t('save.exportCurrent')}</button></div>` : ''}${confirm}
      <main id="panel" role="tabpanel" aria-labelledby="tab-${sel}" tabindex="-1">${SECONDARY_TABS.includes(tab) ? `<button class="back" data-tab="${tab === 'arcade' ? 'life' : 'more'}">‹ ${t(tab === 'arcade' ? 'nav.life' : 'nav.more')}</button>` : ''}${body}</main>
      ${renderCoach()}${renderJm()}${renderRate()}<footer class="dock">${renderActionBar()}<nav role="tablist" aria-label="${t('a11y.sections')}">${PRIMARY_TABS.map(x => `<button id="tab-${x}" role="tab" aria-controls="panel" aria-selected="${sel === x}" tabindex="${sel === x ? 0 : -1}" data-tab="${x}"><span aria-hidden="true">${icons[x]}</span>${t('nav.' + x)}</button>`).join('')}</nav></footer>`;
    }
    const appEl = doc.getElementById('app');
    const mainEl = doc.getElementById('panel');
    if (mainEl) {
      mainEl.classList.remove('view-in', 'nav-fwd', 'nav-back');
      if (entered) { void mainEl.offsetWidth; mainEl.classList.add('view-in', 'nav-' + (state.navDir || 'fwd')); }
    }
    appEl.setAttribute('aria-busy', state.busy ? 'true' : 'false');
    for (const child of appEl.children) child.inert = (!!state.confirm && !child.classList.contains('confirm') && child.id !== 'global-status') || (!state.confirm && !!coachStep() && child.id !== 'coach' && child.id !== 'global-status') || (!state.confirm && !!state.jmPanel && child.id !== 'jm' && child.id !== 'global-status') || (!state.confirm && !state.jmPanel && !!state.rate && child.id !== 'rate' && child.id !== 'global-status');
    doc.querySelectorAll('[data-action]').forEach(b => { b.disabled = state.busy || b.disabled || !!state.confirm; });
    if (state.confirm) doc.querySelectorAll('.confirm button').forEach(b => { b.disabled = false; });
    doc.querySelectorAll('details').forEach((d, i) => { if (openDetails[i] !== undefined) d.open = openDetails[i]; });
    let restore = focusId && doc.getElementById(focusId);
    if (!restore && focusAction) restore = Array.from(doc.querySelectorAll('[data-action]')).find(b => b.dataset.action === focusAction && Object.keys(focusData).every(k => b.dataset[k] === focusData[k]));
    if (state.confirm) restore = doc.getElementById('confirm-cancel');
    else if (coachStep()) restore = doc.getElementById('coach-next');
    else if (state.jmPanel && !doc.getElementById('jm').contains(doc.activeElement)) restore = doc.getElementById('jm-title');
    else if (state.rate && doc.getElementById('rate') && !doc.getElementById('rate').contains(doc.activeElement)) restore = doc.getElementById('rate-yes');
    else if (focusAction === 'confirm-cancel' || focusAction === 'confirm-yes') restore = doc.getElementById('tab-' + state.tab) || doc.getElementById('panel');
    if (restore && !restore.disabled) restore.focus({ preventScroll: true });
    placeCoach();
    jmAfterRender();
    drawMatchFrame();
    drawAvatar();
    drawPet();
    if (state.juice && !state.busy) { const q = state.juice; state.juice = null; root.requestAnimationFrame(() => runJuice(q)); }
    drawScene();
    deadlineClock();
    if (state.arcade && state.tab === 'arcade' && arcadeRaf == null) arcadeSync();
    if (state.heroShot && heroRaf == null) heroRaf = root.requestAnimationFrame(heroDraw);
    if (liveRaf != null) { root.cancelAnimationFrame(liveRaf); liveRaf = null; }
    if (doc.getElementById('live3d')) liveRaf = root.requestAnimationFrame(drawLive3d);
    syncEraLook();
    if (state.liveFocus) {
      state.liveFocus = false;
      const lp = doc.getElementById('live-panel');
      if (lp && !CAA.A11Y.reduced(state.settings) && typeof lp.scrollIntoView === 'function') lp.scrollIntoView({ block: 'start', behavior: 'smooth' });
      else if (lp && typeof lp.scrollIntoView === 'function') lp.scrollIntoView({ block: 'start' });
    }
    { const lp = doc.getElementById('live-panel'); if (lp && !lp.dataset.caught && pb.speed) pbStart(); else pbStop(); }
    if (CAA.Parrot) { if (doc.getElementById('parrot')) paintParrot(); else CAA.Parrot.stop(); }
  }
  let lastAnim = 0, playStarted = 0, animationId = null;

  // ===== Minijuegos: bucle de juego (el resultado lo decide CAA.Arcade con el tick de suelta) =====
  let arcadeRaf = null, arcadeRenderer = null, arcadeGlCanvas = null;
  let heroRaf = null;
  async function persistCareer() {
    if (!state.career.state) return;
    state.saveState = 'saving';
    try {
      const snapshot = CAA.Career.serialize(state.career.state);
      const env = CAA.Save.createEnvelope(state.slot, { career: snapshot }, { seed: snapshot.seed, packVersions: { world: world.version, game: payload.manifest.version }, rngCounters: snapshot.rng });
      await storage.save(state.slot, env); state.slots = await storage.list();
      eraIndexUpdate();
      state.saveState = storage.persistent ? 'saved' : 'memory'; state.saveError = '';
      try { root.localStorage.setItem('caa.lastSlot', state.slot); } catch (_) {}
    } catch (err) { state.saveState = 'error'; state.saveError = t('save.failed') + ': ' + err.message; notify(state.saveError, true); }
  }
  async function acceptCareer(result) { const prev = state.career.summary; state.career.state = result.state; state.career.summary = result.summary; try { const q = juiceDiff(prev, result.summary); if (q.length) state.juice = (state.juice || []).concat(q); } catch (_) {} await persistCareer(); }
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
      const run = ACTIONS.exact[name] || (ACTIONS.patterns.find(p => p.test(name)) || {}).run;
      if (run) await run(name, el);
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
      const go = e.target.closest('[data-tab-go]'); if (go) { if (CAA.Parrot) CAA.Parrot.stop(); haptic('select'); state.navDir = tabDir(state.tab, go.dataset.tabGo); state.tab = go.dataset.tabGo; render(); const f = doc.getElementById('tab-' + state.tab); if (f) f.focus(); return; }
      const tab = e.target.closest('[data-tab]'); if (tab) { if (CAA.Parrot) CAA.Parrot.stop(); haptic('select'); state.navDir = tabDir(state.tab, tab.dataset.tab); state.tab = tab.dataset.tab; state.match.playing = false; render(); syncAnimation(); tabEnter(); const f = doc.getElementById('tab-' + state.tab) || doc.getElementById('panel'); if (f) f.focus(); root.scrollTo && root.scrollTo(0, 0); return; }
      { const jb = e.target.closest('[data-action="jm-act"]'); if (jb && state.jmPanel) { haptic('tap'); jmActButton(jb); return; } }
      const btn = e.target.closest('[data-action]'); if (btn) { haptic('tap'); if (CAA.Juice && btn.dataset.action === 'life-event') { CAA.Juice.pop(btn, 1.04); CAA.Juice.burstAt(btn, { count: 14, speed: 180 }); if (audio) audio.play('pop'); } if (btn.dataset.index != null) state.career.signIndex = +btn.dataset.index; action(btn.dataset.action, btn); }
    });
    doc.getElementById('app').addEventListener('keydown', e => {
      if (!state.confirm && coachStep()) {
        if (e.key === 'Escape') { e.preventDefault(); coachFinish(); render(); return; }
        if (e.key === 'Tab') { const b = Array.from(doc.querySelectorAll('#coach button')); const i = b.indexOf(doc.activeElement); e.preventDefault(); b[(i + (e.shiftKey ? b.length - 1 : 1) + b.length) % b.length].focus(); return; }
      }
      if (state.confirm) {
        if (e.key === 'Escape') { e.preventDefault(); state.confirm = null; render(); }
        if (e.key === 'Tab') { const buttons = Array.from(doc.querySelectorAll('.confirm button')); const i = buttons.indexOf(doc.activeElement); e.preventDefault(); buttons[(i + (e.shiftKey ? buttons.length - 1 : 1)) % buttons.length].focus(); }
        return;
      }
      const tab = e.target.closest('[role=tab][data-tab]'); if (!tab) return;
      const next = CAA.A11Y.tabKey(e.key, PRIMARY_TABS.indexOf(tab.dataset.tab), PRIMARY_TABS.length); if (next == null) return;
      e.preventDefault(); haptic('select'); state.tab = PRIMARY_TABS[next]; state.match.playing = false; render(); syncAnimation(); tabEnter(); doc.getElementById('tab-' + state.tab).focus();
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
      if (el.id === 'era-decade' || el.id === 'era-year' || el.id === 'era-mode') {
        const em = state.eraMenu;
        if (el.id === 'era-decade') { const d = CAA.Eras.DECADES.find(x => x.id === el.value); em.year = d ? Math.min(2025, Number(d.id.slice(0, 4)) + (em.year % 10)) : em.year; if (em.year < 1920) em.year = 1920; }
        else if (el.id === 'era-year') em.year = Number(el.value);
        else em.mode = el.value;
        render(); const f = doc.getElementById(el.id); if (f) f.focus(); return;
      }
      if (el.id === 'match-camera') { state.match.camera = el.value === 'sideline' ? 'sideline' : 'broadcast'; drawMatchFrame(); return; }
      if (el.id === 'match-key-only') { state.match.keyOnly = el.checked; state.match.playing = false; if (el.checked) { const keys = matchKeys(); if (keys.length) state.match.frame = keys[0].index; } render(); syncAnimation(); return; }
      if (el.id === 'match-rules') { state.match.ruleSetId = el.value; return; }
      if (el.id === 'match-seed') { state.match.seed = el.value; return; }
      const key = el.dataset.setting; if (!key) return;
      if (key === 'locale') CAA.I18N.setLocale(el.value);
      else if (key === 'fontSize') state.settings.fontSize = +el.value;
      else if (key === 'vibration' || key === 'audio' || key === 'highContrast') state.settings[key] = el.value === 'true';
      else if (key === 'reminders') {
        state.settings.reminders = el.value === 'true' && CAA.Reminders.available(root);
        if (state.settings.reminders && CAA.Reminders.status(root) !== 'granted') CAA.Reminders.ask(root);
        if (!state.settings.reminders) CAA.Reminders.cancel(root);
        if (state.settings.reminders) notify(t('settings.remindersOn'));
      }
      else state.settings[key] = el.value;
      CAA.A11Y.apply(state.settings, doc); if (audio) { audio.setEnabled(state.settings.audio); if (state.settings.audio) { audio.unlock(); audio.play('click'); } } if (key === 'vibration') haptic('confirm'); if (CAA.A11Y.reduced(state.settings)) state.match.playing = false; saveSettings(); render(); syncAnimation();
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
    if (CAA.Parrot) CAA.Parrot.subscribe(() => paintParrot());
    bind(); render();
    const suspend = () => { if (CAA.Parrot) CAA.Parrot.stop(); if (state.arcade && state.arcade.phase === 'aim') state.arcade.aimStart = root.performance.now(); state.match.playing = false; if (audio) audio.suspend(); if (state.practice && state.practice.start != null) state.practice.start = null; syncAnimation(); if (state.career.state) persistCareer(); armReminders(); };
    doc.addEventListener('visibilitychange', () => { if (doc.hidden) suspend(); else { CAA.Reminders.cancel(root); CAA.A11Y.apply(state.settings, doc); if (audio) audio.resume(); render(); } });
    root.addEventListener('caa:notify-permission', e => { if (e.detail !== 'granted' && state.settings.reminders) { state.settings.reminders = false; saveSettings(); notify(t('settings.remindersDenied'), true); render(); } });
    root.addEventListener('resize', () => placeCoach());
    root.addEventListener('caa:update', () => render());
    root.setInterval(rateTick, 15000);
    root.addEventListener('pagehide', suspend);
    root.addEventListener('caa:native-pause', suspend);
    root.addEventListener('caa:native-resume', () => { CAA.Reminders.cancel(root); CAA.A11Y.apply(state.settings, doc); if (audio) audio.resume(); render(); });
    const motion = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)'); if (motion && motion.addEventListener) motion.addEventListener('change', () => { CAA.A11Y.apply(state.settings, doc); if (CAA.A11Y.reduced(state.settings)) state.match.playing = false; syncAnimation(); });
    root.CAA_APP = { state, storage, worker, world, persistCareer, jm3dClient: p => ui.jm3dClient(p), jmDo: a => ui.jmDo(a), rendererStats: () => voxelRenderer ? voxelRenderer.stats() : null, avatarStats: () => avatarRenderer ? avatarRenderer.stats() : null, audioStats: () => audio ? audio.stats() : null, handleBack: () => { if (state.busy) return true; if (state.confirm) { state.confirm = null; render(); return true; }
      if (coachStep()) { coachFinish(); render(); return true; }
      if (state.jmPanel) { state.jmPanel = null; render(); return true; }
      if (state.rate) { state.rate = false; render(); return true; }
      if (state.screen === 'create') { if (state.wizard.step > 1) state.wizard.step--; else state.screen = state.career.eraYear ? 'eras' : 'modes'; render(); return true; }
      if (state.screen === 'eras') { state.screen = 'modes'; render(); return true; }
      if (state.screen === 'modes') { state.screen = 'menu'; render(); return true; }
      if (state.screen === 'game') { if (SECONDARY_TABS.includes(state.tab)) state.tab = 'more'; else if (state.tab !== 'career') state.tab = 'career'; else state.screen = 'menu'; state.match.playing = false; render(); syncAnimation(); return true; }
      return false; } };
  }
  function start() { init().catch(err => { const el = doc.getElementById('app'); if (el) { el.textContent = 'No se pudo iniciar / Could not start: ' + err.message; el.setAttribute('role', 'alert'); } }); }
  // ===== Vistas por módulos (src/ui/views/*.js) =====
  // Cada vista recibe este contexto; lo que exporta se añade aquí y app.js lo usa por su nombre.
  const ui = {
    get ATTR_GROUPS() { return ATTR_GROUPS; },
    get NATIONS() { return NATIONS; },
    get NUMBERS() { return NUMBERS; },
    get abbrOf() { return abbrOf; },
    get acceptCareer() { return acceptCareer; },
    get action() { return action; },
    get animationId() { return animationId; }, set animationId(v) { animationId = v; },
    get arcadeGlCanvas() { return arcadeGlCanvas; }, set arcadeGlCanvas(v) { arcadeGlCanvas = v; },
    get arcadeRaf() { return arcadeRaf; }, set arcadeRaf(v) { arcadeRaf = v; },
    get arcadeRenderer() { return arcadeRenderer; }, set arcadeRenderer(v) { arcadeRenderer = v; },
    get audio() { return audio; }, set audio(v) { audio = v; },
    get avatarCanvas() { return avatarCanvas; }, set avatarCanvas(v) { avatarCanvas = v; },
    get avatarRenderer() { return avatarRenderer; }, set avatarRenderer(v) { avatarRenderer = v; },
    get avatarTimer() { return avatarTimer; }, set avatarTimer(v) { avatarTimer = v; },
    get bar() { return bar; },
    get crest() { return crest; },
    get dlTimer() { return dlTimer; }, set dlTimer(v) { dlTimer = v; },
    get draft() { return draft; },
    get esc() { return esc; },
    get flag() { return flag; },
    get haptic() { return haptic; },
    get hasCareer() { return hasCareer; },
    get heroRaf() { return heroRaf; }, set heroRaf(v) { heroRaf = v; },
    get jmUnbind() { return jmUnbind; }, set jmUnbind(v) { jmUnbind = v; },
    get lastAnim() { return lastAnim; }, set lastAnim(v) { lastAnim = v; },
    get leagueLabel() { return leagueLabel; },
    get leagueName() { return leagueName; },
    get liveCanvas() { return liveCanvas; }, set liveCanvas(v) { liveCanvas = v; },
    get liveRaf() { return liveRaf; }, set liveRaf(v) { liveRaf = v; },
    get liveRenderer() { return liveRenderer; }, set liveRenderer(v) { liveRenderer = v; },
    get liveSim() { return liveSim; }, set liveSim(v) { liveSim = v; },
    get liveSimT() { return liveSimT; }, set liveSimT(v) { liveSimT = v; },
    get loc() { return loc; },
    get meter() { return meter; },
    get nationName() { return nationName; },
    get notify() { return notify; },
    get payload() { return payload; },
    get pb() { return pb; }, set pb(v) { pb = v; },
    get pbFetching() { return pbFetching; }, set pbFetching(v) { pbFetching = v; },
    get pbLast() { return pbLast; }, set pbLast(v) { pbLast = v; },
    get pbTimer() { return pbTimer; }, set pbTimer(v) { pbTimer = v; },
    get petCanvas() { return petCanvas; }, set petCanvas(v) { petCanvas = v; },
    get petRenderer() { return petRenderer; }, set petRenderer(v) { petRenderer = v; },
    get petTimer() { return petTimer; }, set petTimer(v) { petTimer = v; },
    get pick() { return pick; },
    get playStarted() { return playStarted; }, set playStarted(v) { playStarted = v; },
    get render() { return render; },
    get sceneCanvas() { return sceneCanvas; }, set sceneCanvas(v) { sceneCanvas = v; },
    get sceneRenderer() { return sceneRenderer; }, set sceneRenderer(v) { sceneRenderer = v; },
    get sceneTimer() { return sceneTimer; }, set sceneTimer(v) { sceneTimer = v; },
    get seasonLabel() { return seasonLabel; },
    get state() { return state; },
    get storage() { return storage; }, set storage(v) { storage = v; },
    get t() { return t; },
    get tier() { return tier; },
    get voxelCanvas() { return voxelCanvas; }, set voxelCanvas(v) { voxelCanvas = v; },
    get voxelRenderer() { return voxelRenderer; }, set voxelRenderer(v) { voxelRenderer = v; },
    get worker() { return worker; }, set worker(v) { worker = v; },
    get world() { return world; },
    get TALENT() { return TALENT; },
    get ensureClubs() { return ensureClubs; },
    get persistCareer() { return persistCareer; },
    get saveOptions() { return saveOptions; },
    get saveSettings() { return saveSettings; }
  };
  for (const name of ["live","boot","home","me","league","era","more","viva","talents","jugada","assist","arcade","matchlab","juice"]) Object.assign(ui, CAA.UIViews[name](ui));
  const { drawLive3d, pbStart, pbStop, renderBoot, renderHome, renderActionBar, deadlineClock, drawPet, drawScene, drawAvatar, renderCromo, renderMe, paintParrot, renderShop, renderLook, renderLeague, renderWorld, renderNational, eraYearNow, eraIndexUpdate, renderSave, renderLab, matchKeys, renderMatch, renderGuide, renderHistory, renderClub, renderMarket, renderEditor, renderMoments, renderMore, renderSettings, renderJugadaCampaign, renderJm, jmAfterRender, jmActButton, renderRate, rateTick, armReminders, coachStep, maybeStartCoach, coachFinish, renderCoach, placeCoach, renderArcade, arcadeRelease, arcadeSync, heroRelease, heroDraw, drawMatchFrame, syncAnimation, juiceDiff, tabEnter, runJuice } = ui;
  // Acciones por módulos (src/ui/actions/*.js): nombres exactos primero, después los patrones en su orden.
  const ACTIONS = { exact: {}, patterns: [] };
  for (const name of ["nav","system","jugada","saves","lab","life","career","live"]) { const a = CAA.UIActions[name](ui); Object.assign(ACTIONS.exact, a.exact); ACTIONS.patterns.push(...a.patterns); }
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
})(typeof globalThis !== 'undefined' ? globalThis : this);
