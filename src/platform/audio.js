(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  // Original procedural cues only: no samples, network, music or paid randomness.
  const CUES = {
    click: { kind: 'tone', freq: 660, end: 440, dur: 0.06, gain: 0.25 },
    bounce: { kind: 'tone', freq: 180, end: 90, dur: 0.09, gain: 0.5 },
    swish: { kind: 'noise', dur: 0.18, gain: 0.35, filter: 2600 },
    rim: { kind: 'tone', freq: 320, end: 210, dur: 0.14, gain: 0.45 },
    whistle: { kind: 'tone', freq: 1800, end: 2200, dur: 0.22, gain: 0.18 },
    buzzer: { kind: 'tone', freq: 140, end: 120, dur: 0.6, gain: 0.4 },
    success: { kind: 'tone', freq: 520, end: 880, dur: 0.16, gain: 0.3 },
    fail: { kind: 'tone', freq: 260, end: 160, dur: 0.18, gain: 0.3 }
  };
  function createAudio(options = {}) {
    const win = options.window || root;
    let enabled = options.enabled !== false, ctx = null, master = null, noise = null, unlocked = false, disposed = false;
    const last = Object.create(null), counts = Object.create(null);
    let played = 0;
    function ensureContext() {
      if (ctx || disposed) return ctx;
      const AC = win.AudioContext || win.webkitAudioContext;
      if (!AC) return null;
      try {
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.18; master.connect(ctx.destination);
        const length = Math.floor(ctx.sampleRate * 0.25);
        noise = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = noise.getChannelData(0);
        let seed = 22222;
        for (let i = 0; i < length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; data[i] = (seed / 4294967296) * 2 - 1; }
      } catch (_) { ctx = null; master = null; noise = null; }
      return ctx;
    }
    function unlock() {
      if (disposed || !enabled) return false;
      if (!ensureContext()) return false;
      unlocked = true;
      if (ctx.state === 'suspended' && ctx.resume) { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
      return ctx.state === 'running';
    }
    function play(name) {
      const cue = CUES[name];
      if (disposed || !enabled || !cue || !ctx || ctx.state !== 'running') return false;
      const now = ctx.currentTime;
      if (last[name] != null && now - last[name] < 0.06) return false;
      last[name] = now;
      try {
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(cue.gain, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + cue.dur);
        gain.connect(master);
        let source;
        if (cue.kind === 'noise') {
          source = ctx.createBufferSource(); source.buffer = noise;
          const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = cue.filter; filter.Q.value = 0.8;
          source.connect(filter); filter.connect(gain);
        } else {
          source = ctx.createOscillator(); source.type = name === 'buzzer' ? 'sawtooth' : 'sine';
          source.frequency.setValueAtTime(cue.freq, now);
          source.frequency.exponentialRampToValueAtTime(cue.end, now + cue.dur);
          source.connect(gain);
        }
        source.onended = () => { try { source.disconnect(); gain.disconnect(); } catch (_) {} };
        source.start(now); source.stop(now + cue.dur + 0.02);
        played++; counts[name] = (counts[name] || 0) + 1;
        return true;
      } catch (_) { return false; }
    }
    function setEnabled(value) { enabled = !!value; if (!enabled && ctx && ctx.suspend) { try { const p = ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (_) {} } }
    function suspend() { if (ctx && ctx.state === 'running' && ctx.suspend) { try { const p = ctx.suspend(); if (p && p.catch) p.catch(() => {}); } catch (_) {} } }
    function resume() { if (enabled && unlocked && ctx && ctx.state === 'suspended' && ctx.resume) { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (_) {} } }
    function dispose() { disposed = true; if (ctx && ctx.close) { try { const p = ctx.close(); if (p && p.catch) p.catch(() => {}); } catch (_) {} } ctx = null; master = null; noise = null; }
    function stats() { return { enabled, unlocked, disposed, state: ctx ? ctx.state : 'none', played, cues: Object.assign({}, counts) }; }
    return { unlock, play, setEnabled, suspend, resume, dispose, stats, CUES };
  }
  CAA.Audio = { createAudio, CUES };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Audio;
})(typeof globalThis !== 'undefined' ? globalThis : this);
