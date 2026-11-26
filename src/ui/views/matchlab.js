(function (root) {
  'use strict';
  // Partido de demostración del laboratorio (reproducción animada de un partido completo).
  // Vista extraída de app.js: lo compartido (estado, traductor, trabajador, otras vistas…) llega en `ui`.
  const CAA = root.CAA = root.CAA || {};
  const doc = root.document;
  CAA.UIViews = CAA.UIViews || {};
  CAA.UIViews["matchlab"] = function (ui) {
    const { notify, render, state, t } = ui;
    function drawMatchFrame() {
      const m = state.match;
      if (!m.result || state.tab !== 'match' || state.screen !== 'game') return;
      const events = m.result.state.events;
      m.frame = Math.max(0, Math.min(m.frame, events.length - 1));
      if (m.view === '3d') {
        const canvas = doc.getElementById('court3d');
        if (!canvas) return;
        try {
          if (!ui.voxelRenderer || ui.voxelCanvas !== canvas) {
            ui.voxelCanvas = canvas;
            ui.voxelRenderer = CAA.Voxel.createRenderer(canvas, { onContextLost: () => { m.view = '2d'; m.playing = false; notify(t('match.contextLost'), true); setTimeout(() => { render(); syncAnimation(); }, 0); } });
          }
          const scene = CAA.Voxel.geometry(m.result.state, m.frame, m.progress, { women: m.source === 'career' && ui.careerWomen(), me: m.source === 'career' && ui.meOnCourt ? ui.meOnCourt() : null, quality: m.quality, colorMode: state.settings.colorMode, highContrast: state.settings.highContrast, reducedMotion: CAA.A11Y.reduced(state.settings) });
          ui.voxelRenderer.draw(scene, m.camera);
        } catch (_) { m.view = '2d'; m.playing = false; notify(t('match.noWebgl'), true); setTimeout(() => { render(); syncAnimation(); }, 0); }
        return;
      }
      const canvas = doc.getElementById('court2d');
      if (!canvas) return;
      const frame = CAA.Court2D.frameForEvent(events[m.frame], m.frame);
      CAA.Court2D.drawCourt(canvas.getContext('2d'), canvas.width, canvas.height, frame, { colorMode: state.settings.colorMode });
    }
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
      const keys = ui.matchKeys();
      if (m.keyOnly && keys.length) {
        const at = keys.findIndex(k => k.index === m.frame);
        const next = at < 0 ? (direction > 0 ? keys.find(k => k.index > m.frame) || keys[0] : keys.slice().reverse().find(k => k.index < m.frame) || keys[keys.length - 1]) : keys[(at + direction + keys.length) % keys.length];
        m.frame = next.index;
      } else m.frame = (m.frame + direction + m.result.state.events.length) % m.result.state.events.length;
      m.progress = 1;
      if (ui.audio) ui.audio.play(audioCueForEvent(m.result.state.events[m.frame]));
      updatePlayUi();
    }
    function updatePlayUi() {
      const description = doc.getElementById('play-description'); if (description) description.textContent = ui.currentPlay() || '';
      const counter = doc.getElementById('play-counter'); if (counter && state.match.result) counter.textContent = t('match.frame') + ' ' + (state.match.frame + 1) + '/' + state.match.result.state.events.length;
      doc.querySelectorAll('[data-action="match-key-jump"]').forEach(b => { if (+b.dataset.frame === state.match.frame) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    }
    function animate(ts) {
      const m = state.match;
      if (state.tab === 'match' && m.playing && m.result) {
        if (!ui.playStarted) { ui.playStarted = ts; ui.lastAnim = ts; }
        if (m.view === '3d') {
          const duration = m.quality === 'balanced' ? 1100 : 950;
          m.progress = Math.min(1, (ts - ui.playStarted) / duration);
          drawMatchFrame();
          if (m.progress >= 1 && ts - ui.playStarted > duration + 350) { stepMatch(1); ui.playStarted = ts; }
        } else if (ts - ui.lastAnim > 120) { ui.lastAnim = ts; stepMatch(1); drawMatchFrame(); }
      }
      ui.animationId = root.requestAnimationFrame(animate);
    }
    function syncAnimation() { ui.playStarted = 0; if (ui.animationId != null) root.cancelAnimationFrame(ui.animationId); ui.animationId = null; if (state.match.playing && state.tab === 'match' && !doc.hidden && !CAA.A11Y.reduced(state.settings)) ui.animationId = root.requestAnimationFrame(animate); }
    return { drawMatchFrame, audioCueForEvent, stepMatch, updatePlayUi, animate, syncAnimation };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
