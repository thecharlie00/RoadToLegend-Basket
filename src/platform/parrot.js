(function (root) {
  'use strict';
  // Voz del loro: graba unos segundos de micrófono, recorta el silencio y lo repite con un timbre de loro
  // (pitch alto, saturación, formante, modulación en anillo y eco). Todo local: el audio nunca sale del
  // dispositivo, no se guarda en la partida y se descarta al salir de la pantalla.
  const CAA = root.CAA = root.CAA || {};
  const MAX_MS = 4000, MIN_MS = 400, LIMIT_RATE = 1.5;
  let ctx = null, stream = null, recorder = null, chunks = [], audioBuffer = null, stopTimer = null;
  let playing = [], status = 'idle', error = null, listeners = [];
  let recordedMs = 0, lastMs = 0, plays = 0;

  function emit() { for (const fn of listeners) { try { fn(info()); } catch (_) {} } }
  function fail(code) { const e = new Error(code); e.code = code; return e; }
  function win() { return root; }
  function media() { const w = win(); return w.navigator && w.navigator.mediaDevices; }
  function audioClass() { const w = win(); return w.AudioContext || w.webkitAudioContext; }
  function supported() { return !!(media() && media().getUserMedia && audioClass() && (win().MediaRecorder || win().webkitMediaRecorder)); }

  // --- utilidades puras (probadas sin navegador) ---
  function peak(data) { let p = 0; for (let i = 0; i < data.length; i++) { const v = Math.abs(data[i]); if (v > p) p = v; } return p; }
  // Recorta silencio con margen y normaliza; devuelve el mismo Float32Array si no hay nada que recortar.
  function trimChannel(data, sampleRate) {
    const p = peak(data);
    if (!(p > 0.008)) return { data: new Float32Array(0), ms: 0, peak: p };
    const threshold = Math.max(0.008, p * 0.08), pad = Math.round(sampleRate * 0.06);
    let start = 0, end = data.length - 1;
    while (start < data.length && Math.abs(data[start]) < threshold) start++;
    while (end > start && Math.abs(data[end]) < threshold) end--;
    start = Math.max(0, start - pad); end = Math.min(data.length - 1, end + pad);
    const slice = data.slice(start, end + 1), gain = 0.92 / p;
    for (let i = 0; i < slice.length; i++) slice[i] = Math.max(-1, Math.min(1, slice[i] * gain));
    return { data: slice, ms: Math.round((slice.length / sampleRate) * 1000), peak: p };
  }
  // Curva de saturación suave para el WaveShaper (timbre rasposo sin romper el oído).
  function curve(amount) {
    const n = 1024, out = new Float32Array(n), k = amount || 3;
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; out[i] = Math.tanh(k * x) / Math.tanh(k); }
    return out;
  }
  function pickMime() {
    const M = win().MediaRecorder || win().webkitMediaRecorder;
    if (!M || !M.isTypeSupported) return '';
    for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']) if (M.isTypeSupported(m)) return m;
    return '';
  }
  function mapError(e) {
    const name = e && e.name;
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'blocked';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'nodevice';
    if (e && e.code) return e.code;
    return 'failed';
  }
  function info() { return { status, error, ms: recordedMs, lastMs, plays, supported: supported(), ready: !!audioBuffer }; }
  function subscribe(fn) { listeners.push(fn); return () => { listeners = listeners.filter(x => x !== fn); }; }
  function set(s, e) { status = s; error = e || null; emit(); }

  function context() {
    const AC = audioClass();
    if (!AC) return null;
    if (!ctx) { try { ctx = new AC(); } catch (_) { ctx = null; } }
    if (ctx && ctx.state === 'suspended' && ctx.resume) { try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (_) {} }
    return ctx;
  }
  function stopTracks() {
    if (stream) { try { stream.getTracks().forEach(t => t.stop()); } catch (_) {} stream = null; }
  }
  function stopPlayback() {
    for (const node of playing) { try { node.stop(); } catch (_) {} try { node.disconnect(); } catch (_) {} }
    playing = [];
  }

  async function start() {
    if (!supported()) { set('error', 'unsupported'); throw fail('unsupported'); }
    if (status === 'recording') return info();
    stopPlayback();
    const AC = context();
    if (!AC) { set('error', 'unsupported'); throw fail('unsupported'); }
    try { stream = await media().getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch (e) { const code = mapError(e); set('error', code); throw fail(code); }
    const M = win().MediaRecorder || win().webkitMediaRecorder;
    const mime = pickMime();
    try { recorder = mime ? new M(stream, { mimeType: mime }) : new M(stream); }
    catch (e) { stopTracks(); set('error', 'unsupported'); throw fail('unsupported'); }
    chunks = [];
    recorder.ondataavailable = ev => { if (ev.data && ev.data.size) chunks.push(ev.data); };
    audioBuffer = null; recordedMs = 0;
    try { recorder.start(); } catch (e) { stopTracks(); set('error', 'failed'); throw fail('failed'); }
    const startedAt = (win().performance || Date).now();
    set('recording');
    clearTimeout(stopTimer);
    stopTimer = setTimeout(() => { finish().catch(() => {}); }, MAX_MS);
    return { status, startedAt, maxMs: MAX_MS };
  }

  // Cierra la grabación, recorta y deja la toma lista para repetirla.
  async function finish() {
    if (status !== 'recording' || !recorder) return info();
    clearTimeout(stopTimer); stopTimer = null;
    const rec = recorder;
    const done = new Promise(resolve => { rec.onstop = resolve; });
    try { if (rec.state !== 'inactive') rec.stop(); } catch (_) {}
    await done;
    stopTracks();
    const type = (chunks[0] && chunks[0].type) || rec.mimeType || 'audio/webm';
    const blob = new (win().Blob || function () {})(chunks, { type });
    const AC = context();
    if (!AC || !blob.size) { recorder = null; set('error', 'failed'); throw fail('failed'); }
    let decoded;
    try { decoded = await decode(AC, await blob.arrayBuffer()); }
    catch (e) { recorder = null; set('error', 'decode'); throw fail('decode'); }
    recorder = null; chunks = [];
    const raw = decoded.getChannelData(0), trimmed = trimChannel(raw, decoded.sampleRate);
    if (trimmed.ms < MIN_MS) { set('error', 'short'); throw fail('short'); }
    // Reconstruye el buffer ya recortado para que el loro no repita el silencio de antes y de después.
    const out = AC.createBuffer(1, trimmed.data.length, decoded.sampleRate);
    out.copyToChannel ? out.copyToChannel(trimmed.data, 0) : out.getChannelData(0).set(trimmed.data);
    audioBuffer = out; recordedMs = trimmed.ms; lastMs = trimmed.ms;
    set('ready');
    return info();
  }
  function decode(ac, data) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const ok = b => { if (!settled) { settled = true; resolve(b); } };
      const ko = e => { if (!settled) { settled = true; reject(e); } };
      try {
        const p = ac.decodeAudioData(data, ok, ko);
        if (p && p.then) p.then(ok, ko);
      } catch (e) { ko(e); }
    });
  }

  // Reproduce la grabación con el timbre del loro. Devuelve la duración audible.
  function say() {
    if (!audioBuffer) return Promise.reject(fail('empty'));
    const AC = context();
    if (!AC) return Promise.reject(fail('unsupported'));
    stopPlayback();
    const now = AC.currentTime, src = AC.createBufferSource();
    src.buffer = audioBuffer;
    src.playbackRate.setValueAtTime(LIMIT_RATE + 0.12, now);
    src.playbackRate.linearRampToValueAtTime(LIMIT_RATE - 0.1, now + Math.min(2.5, audioBuffer.duration / LIMIT_RATE));
    const vibrato = AC.createOscillator(), vibratoGain = AC.createGain();
    vibrato.type = 'sine'; vibrato.frequency.value = 11; vibratoGain.gain.value = 0.06;
    vibrato.connect(vibratoGain); vibratoGain.connect(src.playbackRate);
    const highpass = AC.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 300;
    const drive = AC.createWaveShaper(); drive.curve = curve(4); drive.oversample = '2x';
    const band = AC.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 1500; band.Q.value = 0.85;
    const formant = AC.createBiquadFilter(); formant.type = 'peaking'; formant.frequency.value = 2700; formant.gain.value = 9; formant.Q.value = 1.1;
    const ring = AC.createGain(); ring.gain.value = 1;
    const tremolo = AC.createOscillator(), tremoloGain = AC.createGain();
    tremolo.type = 'square'; tremolo.frequency.value = 52; tremoloGain.gain.value = 0.45;
    tremolo.connect(tremoloGain); tremoloGain.connect(ring.gain);
    const out = AC.createGain(); out.gain.value = 0.85;
    const delay = AC.createDelay(0.6); delay.delayTime.value = 0.16;
    const feedback = AC.createGain(); feedback.gain.value = 0.24;
    const wet = AC.createGain(); wet.gain.value = 0.2;
    src.connect(highpass); highpass.connect(drive); drive.connect(band); band.connect(formant);
    formant.connect(ring); ring.connect(out); out.connect(AC.destination);
    ring.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(wet); wet.connect(AC.destination);
    const seconds = audioBuffer.duration / LIMIT_RATE;
    playing = [src, vibrato, tremolo];
    plays++;
    set('playing');
    return new Promise(resolve => {
      src.onended = () => {
        try { vibrato.stop(); tremolo.stop(); } catch (_) {}
        for (const n of [src, highpass, drive, band, formant, ring, out, delay, feedback, wet, vibratoGain, tremoloGain]) { try { n.disconnect(); } catch (_) {} }
        playing = [];
        if (status === 'playing') set('ready');
        resolve(seconds);
      };
      try { vibrato.start(now); tremolo.start(now); src.start(now); }
      catch (e) { playing = []; set('error', 'failed'); resolve(0); }
    });
  }

  // Voz de repuesto cuando no hay micrófono: el navegador lee el texto con tono alto y ritmo rápido.
  function sayText(text, lang) {
    const synth = win().speechSynthesis;
    const clean = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!synth || !clean) return Promise.resolve(0);
    const Utter = win().SpeechSynthesisUtterance;
    if (!Utter) return Promise.resolve(0);
    try { synth.cancel(); } catch (_) {}
    const u = new Utter(clean);
    u.lang = lang || 'es'; u.pitch = 1.85; u.rate = 1.15; u.volume = 1;
    try { synth.speak(u); } catch (_) { return Promise.resolve(0); }
    return Promise.resolve(clean.length);
  }

  function forget() {
    stopPlayback(); audioBuffer = null; recordedMs = 0; error = null;
    if (status === 'recording') { clearTimeout(stopTimer); stopTimer = null; try { recorder && recorder.stop(); } catch (_) {} stopTracks(); recorder = null; chunks = []; }
    status = 'idle'; emit();
    return info();
  }
  function stop() { stopPlayback(); if (status === 'recording') { clearTimeout(stopTimer); stopTimer = null; try { recorder && recorder.stop(); } catch (_) {} stopTracks(); recorder = null; chunks = []; } if (status === 'playing') status = 'ready'; emit(); }
  function dispose() {
    stop(); forget();
    for (const fn of listeners) { try { fn(info()); } catch (_) {} }
    listeners = [];
    if (ctx && ctx.close) { try { ctx.close(); } catch (_) {} }
    ctx = null;
  }

  CAA.Parrot = { MAX_MS, MIN_MS, supported, info, subscribe, start, finish, stop, say, sayText, forget, dispose, peak, trimChannel, curve };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Parrot;
})(typeof globalThis !== 'undefined' ? globalThis : this);
