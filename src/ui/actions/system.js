(function (root) {
  'use strict';
  // Acciones · Sistema: Google Play, tutorial, guía y sonido.
  // Cada entrada recibe (name, el) igual que antes en la cadena de action(); lo compartido llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIActions = CAA.UIActions || {};
  CAA.UIActions["system"] = function (ui) {
    const { coachAdvance, coachFinish, hasCareer, saveSettings, state, t } = ui;
    const exact = {}, patterns = [];
    const h0 = async (name, el) => { CAA.PlayStore.openStore(root); if (name === 'rate-yes') { CAA.PlayStore.rateDone(); state.rate = false; } };
    for (const k of ["store-update","rate-yes"]) exact[k] = h0;
    exact["rate-later"] = async (name, el) => { state.rate = false; };
    exact["ads-privacy"] = async (name, el) => { CAA.PlayStore.showPrivacy(root); };
    exact["pgs-show"] = async (name, el) => { CAA.PlayGames.show(root); if (hasCareer() && state.career.summary.life) CAA.PlayGames.unlock(root, state.career.summary.life.achievements); };
    exact["coach-next"] = async (name, el) => { coachAdvance(1); };
    exact["coach-skip"] = async (name, el) => { coachFinish(); };
    exact["coach-replay"] = async (name, el) => { try { root.localStorage.removeItem('caa.tutorialDone'); } catch (_) {} state.tab = 'career'; state.coach = { step: 0 }; state.coachPrompted = true; };
    exact["guide-skip"] = async (name, el) => { try { root.localStorage.setItem('caa.guideSkip.' + state.career.summary.careerId, '1'); } catch (_) {} };
    exact["toggle-audio"] = async (name, el) => { state.settings.audio = !state.settings.audio; CAA.A11Y.apply(state.settings, doc); if (ui.audio) { ui.audio.setEnabled(state.settings.audio); if (state.settings.audio) { ui.audio.unlock(); ui.audio.play('click'); } } saveSettings(); };
    exact["audio-test"] = async (name, el) => {
      if (!state.settings.audio) throw new Error(t('settings.audioOff'));
      if (ui.audio) { ui.audio.unlock(); ui.audio.play('swish'); }
    };

    return { exact, patterns };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
