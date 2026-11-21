(function (root) {
  'use strict';
  // Acciones · Navegación: idioma, menú, modos, Modo Épocas y asistente de creación.
  // Cada entrada recibe (name, el) igual que antes en la cadena de action(); lo compartido llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIActions = CAA.UIActions || {};
  CAA.UIActions["nav"] = function (ui) {
    const { action, ensureClubs, eraDefaultLeague, haptic, notify, saveSettings, state, t } = ui;
    const exact = {}, patterns = [];
    exact["confirm-cancel"] = async (name, el) => { state.confirm = null; };
    exact["confirm-yes"] = async (name, el) => { haptic('confirm'); const pending = state.confirm; state.confirm = null; state.confirmed = true; state.busy = false; await action(pending.name, pending.el); return; };
    exact["boot-lang"] = async (name, el) => { state.navDir = 'fwd'; CAA.I18N.setLocale(['en', 'fr', 'de', 'it'].includes(el.dataset.locale) ? el.dataset.locale : 'es'); saveSettings(); state.screen = 'menu'; };
    exact["boot-new"] = async (name, el) => { state.navDir = 'fwd'; state.screen = 'modes'; };
    exact["boot-continue"] = async (name, el) => { state.screen = 'game'; state.tab = 'career'; };
    exact["boot-open"] = async (name, el) => { state.screen = 'game'; state.tab = el.dataset.target || 'more'; };
    const h6 = async (name, el) => { const fromGame = state.screen === 'game'; state.navDir = 'back'; state.screen = 'menu'; state.match.playing = false; if (fromGame) CAA.PlayStore.showAd(root, 'menu'); };
    for (const k of ["boot-menu","boot-back"]) exact[k] = h6;
    exact["mode-gender"] = async (name, el) => {
      const c = state.career; c.gender = el.dataset.gender === 'f' ? 'f' : 'm';
      if (CAA.Season.LEAGUES[c.leagueId].gender !== c.gender) c.leagueId = c.gender === 'f' ? 'es-iberica-women' : 'fr-hexagone-men';
      if (c.gender === 'f' && c.route === 'eu-academy') c.route = 'world'; c.clubId = ''; c.clubsRoute = null;
    };
    exact["boot-mode"] = async (name, el) => {
      state.navDir = 'fwd';
      state.career.eraYear = el.dataset.mode === 'eras' ? (state.career.eraYear || 1952) : null;
      state.career.challenge = el.dataset.mode === 'challenge' ? (state.career.challenge || 'save') : null;
      state.career.newClub = el.dataset.mode === 'club' ? (state.career.newClub || { name: '', abbr: '', primary: '#ff7a1f', secondary: '#0b0d1c' }) : null;
      state.career.mode = el.dataset.mode === 'coach' || el.dataset.mode === 'club' || el.dataset.mode === 'challenge' ? 'coach' : 'player'; state.wizard = { step: 1 };
      if (state.career.newClub) { state.career.route = 'world'; if (CAA.Season.LEAGUES[state.career.leagueId].level !== 2 && state.career.gender !== 'f') state.career.leagueId = 'es-ascenso-iberico'; state.career.clubId = ''; state.career.clubsRoute = null; }
      if (state.career.eraYear) { state.career.route = 'world'; eraDefaultLeague(); }
      if (state.career.mode === 'coach' && state.career.route === 'na-undrafted') state.career.route = state.career.gender === 'f' ? 'na-draft' : 'eu-academy';
      if (el.dataset.mode === 'eras') { state.eraMenu = state.eraMenu || { year: state.career.eraYear || 1975, mode: 'player' }; state.screen = 'eras'; }
      else { state.screen = 'create'; ensureClubs(state.career.route); }
    };
    exact["era-start"] = async (name, el) => {
      const em = state.eraMenu; state.career.eraYear = em.year; state.career.mode = em.mode === 'coach' ? 'coach' : 'player'; state.career.route = 'world'; eraDefaultLeague();
      state.wizard = { step: 1 }; state.navDir = 'fwd'; state.screen = 'create'; ensureClubs('world');
    };
    exact["era-back"] = async (name, el) => { state.screen = 'modes'; state.navDir = 'back'; };
    exact["era-load"] = async (name, el) => {
      state.slot = el.dataset.slot; const env = await ui.storage.load(state.slot);
      if (env && env.payload && env.payload.career) { state.career.state = CAA.Career.resume(env.payload.career); state.career.summary = CAA.Career.summary(state.career.state); state.screen = 'game'; state.tab = 'career'; notify(t('career.loaded')); } else notify(t('save.empty'));
    };
    exact["era-moments"] = async (name, el) => { state.career.challenge = 'save'; state.career.eraYear = null; state.career.mode = 'coach'; state.wizard = { step: 1 }; state.screen = 'create'; ensureClubs(state.career.route); };
    const h13 = async (name, el) => {
      const nameEl = doc.getElementById('career-name'); if (nameEl) state.career.name = nameEl.value;
      if (state.career.newClub) for (const [id, k] of [['club-name', 'name'], ['club-abbr', 'abbr'], ['club-primary', 'primary'], ['club-secondary', 'secondary']]) { const e = doc.getElementById(id); if (e) state.career.newClub[k] = e.value; }
      const natEl = doc.getElementById('career-nationality'); if (natEl) state.career.nationality = natEl.value;
      const seedEl = doc.getElementById('career-seed'); if (seedEl) state.career.seed = seedEl.value;
      state.navDir = name === 'wiz-next' ? 'fwd' : 'back';
      if (name === 'wiz-cancel') state.screen = state.career.eraYear ? 'eras' : 'modes'; else state.wizard.step = Math.max(1, state.wizard.step + (name === 'wiz-next' ? 1 : -1));
    };
    for (const k of ["wiz-next","wiz-back","wiz-cancel"]) exact[k] = h13;
    exact["wiz-set"] = async (name, el) => {
      const field = el.dataset.field, value = el.dataset.value;
      if (field === 'number') state.career.number = Number(value);
      else if (field === 'route') { state.career.route = value; state.career.clubId = ''; state.busy = false; await ensureClubs(value); }
      else if (field === 'eraYear') { state.career.eraYear = Number(value); eraDefaultLeague(); state.busy = false; await ensureClubs('world'); }
      else if (field === 'gender') {
        const c = state.career; c.gender = value === 'f' ? 'f' : 'm';
        if (CAA.Season.LEAGUES[c.leagueId].gender !== c.gender) c.leagueId = c.gender === 'f' ? 'es-iberica-women' : 'fr-hexagone-men';
        if (c.gender === 'f' && c.route === 'eu-academy') c.route = 'world';
        c.clubId = ''; c.clubsRoute = null; eraDefaultLeague(); state.busy = false; await ensureClubs(c.route);
      }
      else if (field === 'pos') {
        state.career.pos = value;
        const list = CAA.Player.profilesFor(value);
        if (!list.some(x => x.archetype === state.career.archetype)) state.career.archetype = list[0].archetype;
        haptic('select');
      }
      else if (['archetype', 'handedness', 'talent', 'clubId', 'challenge'].includes(field)) state.career[field] = value;
      if (ui.audio) ui.audio.play('click');
    };

    return { exact, patterns };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
