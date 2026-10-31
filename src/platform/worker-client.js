(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  function createClient(options = {}) {
    let worker = null, seq = 0, mode = 'main', generation = 0;
    const pending = new Map();
    const timeoutMs = Math.max(100, options.timeoutMs || 15000);
    function local(msg) {
      return Promise.resolve().then(() => {
        const result = CAA.WorkerHandler.handle(msg);
        if (!result.ok) throw new Error(result.error);
        return result.result;
      });
    }
    function clearPending(fn) { for (const p of pending.values()) { clearTimeout(p.timer); fn(p); } pending.clear(); }
    function fallback() {
      generation++;
      if (worker) { worker.onmessage = worker.onerror = worker.onmessageerror = null; try { worker.terminate(); } catch (_) {} worker = null; }
      mode = 'main';
      const jobs = Array.from(pending.values()); clearPending(() => {});
      // Preserve request order and reject domain errors instead of resolving undefined.
      for (const p of jobs) local(p.msg).then(p.resolve, p.reject);
      if (options.onFallback) options.onFallback();
    }
    function start() {
      if (worker) return true;
      const code = options.workerCode;
      if (!code || typeof root.Worker !== 'function' || typeof root.Blob !== 'function' || !root.URL || typeof root.URL.createObjectURL !== 'function') return false;
      let url;
      try {
        url = root.URL.createObjectURL(new root.Blob([code], { type: 'text/javascript' }));
        const instance = new root.Worker(url), token = ++generation;
        worker = instance;
        instance.onmessage = e => {
          if (worker !== instance || token !== generation) return;
          const msg = e.data;
          if (!msg || !pending.has(msg.id)) return;
          const p = pending.get(msg.id); pending.delete(msg.id); clearTimeout(p.timer);
          if (msg.ok) p.resolve(msg.result); else p.reject(new Error(msg.error || 'worker request failed'));
        };
        instance.onerror = e => { if (e && e.preventDefault) e.preventDefault(); if (worker === instance) fallback(); };
        instance.onmessageerror = () => { if (worker === instance) fallback(); };
        mode = 'worker'; return true;
      } catch (_) { fallback(); return false; }
      finally { if (url) { try { root.URL.revokeObjectURL(url); } catch (_) {} } }
    }
    function send(type, payload) {
      const msg = { id: ++seq, type, payload };
      if (mode !== 'worker' || !worker) return local(msg);
      const instance = worker, token = generation;
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { if (worker === instance && token === generation) fallback(); }, timeoutMs);
        pending.set(msg.id, { resolve, reject, msg, timer });
        try { instance.postMessage(msg); } catch (_) { if (worker === instance) fallback(); }
      });
    }
    function ready() { return send('ping'); }
    function stop() {
      generation++;
      if (worker) { worker.onmessage = worker.onerror = worker.onmessageerror = null; try { worker.terminate(); } catch (_) {} }
      worker = null; mode = 'main'; clearPending(p => p.reject(new Error('worker stopped')));
    }
    return { start, ready, send, getMode: () => mode, stop };
  }
  CAA.WorkerClient = { createClient };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.WorkerClient;
})(typeof globalThis !== 'undefined' ? globalThis : this);
