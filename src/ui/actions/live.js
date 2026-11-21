(function (root) {
  'use strict';
  // Acciones · Partido en directo: arranque, avance, decisiones, velocidad y vista.
  // Cada entrada recibe (name, el) igual que antes en la cadena de action(); lo compartido llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  CAA.UIActions = CAA.UIActions || {};
  CAA.UIActions["live"] = function (ui) {
    const { acceptCareer, haptic, notify, pbCatchUp, pbCaught, state, t } = ui;
    const exact = {}, patterns = [];
    exact["live-view"] = async (name, el) => { state.liveView = el.dataset.view; if (el.dataset.view === '2d') state.liveViewOff = false; };
    exact["live-speed"] = async (name, el) => { ui.pb.speed = Number(el.dataset.speed) || 0; };
    exact["live-skip"] = async (name, el) => { if (state.career.state && state.career.state.live) pbCatchUp(state.career.state.live); };
    const h3 = async (name, el) => {
      if (!state.career.state) throw new Error(t('career.empty'));
      const payloadLive = { state: state.career.state, start: name === 'live-start', toEnd: name === 'live-end', choice: name === 'live-choice' ? el.dataset.choice : undefined, release: el && el.dataset && el.dataset.release != null ? Number(el.dataset.release) : undefined };
      state.heroShot = null;
      const res = await ui.worker.send('career.live', payloadLive);
      await acceptCareer(res);
      if (name === 'live-end') pbCatchUp(state.career.state.live);
      if (name === 'live-start') { if (!ui.pb.speed) ui.pb.speed = 1; state.liveFocus = true; CAA.PlayStore.showAd(root, 'match_start'); }
      const caught = pbCaught(state.career.state.live);
      if (ui.audio && name !== 'live-next') ui.audio.play(caught && res.live.finished ? (res.live.outcome && res.live.outcome.won ? 'success' : 'fail') : 'whistle');
      // Bocina final; si ganas, confeti (el resultado de la semana ya celebra o tiembla por su cuenta).
      if (caught && res.live.finished) { const won = res.live.outcome && res.live.outcome.won; if (won && CAA.Juice) CAA.Juice.confetti(0.9); haptic(won ? 'success' : 'fail'); if (ui.audio) ui.audio.play('buzzer'); if (won) state.juice = (state.juice || []).concat([{ k: 'cup' }]); }
      if (name === 'live-start') notify(t('live.started')); else if (caught && res.live.finished) notify(t(res.live.outcome.won ? 'live.won' : 'live.lost'));
    };
    for (const k of ["live-start","live-next","live-end","live-choice"]) exact[k] = h3;

    return { exact, patterns };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
