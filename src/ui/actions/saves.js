(function (root) {
  'use strict';
  // Acciones · Partidas: crear, guardar, cargar, exportar e importar.
  // Cada entrada recibe (name, el) igual que antes en la cadena de action(); lo compartido llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIActions = CAA.UIActions || {};
  CAA.UIActions["saves"] = function (ui) {
    const { TALENT, haptic, notify, persistCareer, saveOptions, state, t } = ui;
    const exact = {}, patterns = [];
    exact["save-delete"] = async (name, el) => {
      await ui.storage.remove(state.slot); state.slots = await ui.storage.list(); notify(t('save.deleted'));
    };
    const h1 = async (name, el) => {
      const env = name === 'save-export-current' ? CAA.Save.createEnvelope(state.slot, { career: CAA.Career.serialize(state.career.state) }, { seed: state.career.state.seed, rngCounters: state.career.state.rng }) : await ui.storage.load(state.slot);
      if (!env) throw new Error(t('save.empty'));
      const text = JSON.stringify(env, null, 2); state.importText = text;
      if (root.CAAAndroid && typeof root.CAAAndroid.exportSave === 'function') root.CAAAndroid.exportSave(text);
      else {
        const url = root.URL.createObjectURL(new Blob([text], { type: 'application/json' }));
        const a = doc.createElement('a'); a.href = url; a.download = 'baketball-road-to-legend-' + state.slot + '.json'; doc.body.appendChild(a); a.click(); a.remove(); setTimeout(() => root.URL.revokeObjectURL(url), 1000);
      }
      notify(t(root.CAAAndroid ? 'save.exportNative' : 'save.exported'));
    };
    for (const k of ["save-export","save-export-current"]) exact[k] = h1;
    exact["save-preview"] = async (name, el) => {
      const env = CAA.Save.parseEnvelope(state.importText, saveOptions());
      if (env.payload.career) CAA.Career.resume(env.payload.career);
      state.importPreview = env; notify(t('save.validated'));
    };
    exact["save-import"] = async (name, el) => {
      if (!state.importPreview) throw new Error(t('save.previewRequired'));
      await ui.storage.save(state.slot, state.importPreview); state.slots = await ui.storage.list(); state.importPreview = null;
      notify(t('save.imported', { slot: state.slot }));
    };
    exact["career-create"] = async (name, el) => {
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
      const created = await ui.worker.send('career.create', { mode: state.career.mode, gender: state.career.gender, route: state.career.route, leagueId: state.career.route === 'world' ? state.career.leagueId : undefined, eraYear: state.career.eraYear || undefined, newClub: state.career.newClub || undefined, challenge: state.career.challenge && state.career.mode === 'coach' ? state.career.challenge : undefined, quick: !!state.career.quick, seed: state.career.seed, nationality: state.career.nationality, pos: state.career.pos, clubId: state.career.clubId, archetype: state.career.archetype, handedness: state.career.handedness, name: state.career.name || undefined, number: state.career.number, quality });
      if (ui.audio) ui.audio.play('success'); haptic('success');
      state.career.state = CAA.Career.resume(created); state.career.summary = CAA.Career.summary(state.career.state); state.practice = null; await persistCareer();
      state.screen = 'game'; state.tab = 'career'; state.wizard = { step: 1 }; notify(t(state.career.mode === 'coach' ? 'wiz.welcomeCoach' : 'wiz.welcome'));
      CAA.PlayStore.showAd(root, 'career_start');
    };
    exact["career-save"] = async (name, el) => { await persistCareer(); };
    exact["career-load"] = async (name, el) => {
      const env = await ui.storage.load(state.slot);
      if (env && env.payload && env.payload.career) { state.career.state = CAA.Career.resume(env.payload.career); state.career.summary = CAA.Career.summary(state.career.state); state.practice = null; notify(t('career.loaded')); }
      else notify(t('save.empty'));
    };

    return { exact, patterns };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
