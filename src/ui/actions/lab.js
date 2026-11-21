(function (root) {
  'use strict';
  // Acciones · Laboratorio y partido de demostración.
  // Cada entrada recibe (name, el) igual que antes en la cadena de action(); lo compartido llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIActions = CAA.UIActions || {};
  CAA.UIActions["lab"] = function (ui) {
    const { drawMatchFrame, matchKeys, payload, render, state, stepMatch, t, world } = ui;
    const exact = {}, patterns = [];
    exact["match-simulate"] = async (name, el) => {
      const seedEl = doc.getElementById('match-seed'); if (seedEl) state.match.seed = seedEl.value || 'camino-demo';
      state.match.result = await ui.worker.send('match.simulate', { seed: state.match.seed, ruleSetId: state.match.ruleSetId });
      state.match.source = 'lab'; state.match.frame = 0; state.match.progress = 1; state.match.playing = false;
      if (state.match.keyOnly) { const keys = matchKeys(); if (keys.length) state.match.frame = keys[0].index; }
    };
    exact["match-play"] = async (name, el) => {
      state.match.playing = !state.match.playing;
    };
    exact["match-step"] = async (name, el) => { state.match.playing = false; stepMatch(1); };
    const h3 = async (name, el) => {
      state.match.playing = false; const keys = matchKeys(); const direction = name === 'match-key-next' ? 1 : -1;
      if (keys.length) { const at = keys.findIndex(k => k.index === state.match.frame); const next = at < 0 ? (direction > 0 ? keys.find(k => k.index > state.match.frame) || keys[0] : keys.slice().reverse().find(k => k.index < state.match.frame) || keys[keys.length - 1]) : keys[(at + direction + keys.length) % keys.length]; state.match.frame = next.index; state.match.progress = 1; }
    };
    for (const k of ["match-key-prev","match-key-next"]) exact[k] = h3;
    exact["match-key-jump"] = async (name, el) => { state.match.playing = false; state.match.frame = Number(el.dataset.frame); state.match.progress = 1; };
    exact["match-calibrate"] = async (name, el) => {
      state.match.calibration = await ui.worker.send('calibration.batch', { games: 200, seed: state.match.seed, ruleSetId: state.match.ruleSetId });
    };
    exact["lab-performance"] = async (name, el) => {
      const courtVisible = !!state.match.result;
      if (courtVisible) { state.tab = 'match'; render(); }
      doc.body.dataset.measuring = 'true';
      try {
        state.diagnostics = await CAA.Diagnostics.sampleFrames({ frames: 180, context: { worker: ui.worker.getMode(), storage: ui.storage.kind, workload: courtVisible ? (state.match.view === '3d' ? 'voxel-' + state.match.quality : 'court2d') : 'static-ui' }, onFrame: () => { if (state.match.result) { state.match.progress = 1; stepMatch(1); drawMatchFrame(); } } });
      } finally { delete doc.body.dataset.measuring; }
      state.lab = JSON.stringify(state.diagnostics, null, 2); state.tab = 'lab';
    };
    exact["lab-export"] = async (name, el) => {
      const report = { game: payload.manifest.game, title: t('app.title'), build: payload.manifest, worker: ui.worker.getMode(), storage: { kind: ui.storage.kind, persistent: ui.storage.persistent, diagnostics: ui.storage.diagnostics }, performance: state.diagnostics, missingTranslations: CAA.I18N.missingKeys() };
      state.lab = JSON.stringify(report, null, 2);
    };
    patterns.push({ test: name => name.startsWith('lab-'), run: async (name, el) => {
      const kind = name.slice(4);
      const type = kind === 'ping' ? 'ping' : kind === 'rng' ? 'rng' : kind === 'clock' ? 'clock' : 'hash';
      const payload = kind === 'rng' ? { seed: 'camino', n: 5 } : kind === 'clock' ? { periodMinutes: 10, ticks: 25 } : kind === 'hash' ? world : {};
      const result = await ui.worker.send(type, payload);
      state.lab = JSON.stringify(result, null, 2);
    } });
    return { exact, patterns };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
