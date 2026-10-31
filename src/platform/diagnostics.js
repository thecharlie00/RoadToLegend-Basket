(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  function percentile(values, p) {
    if (!values.length) return null;
    const sorted = values.slice().sort((a, b) => a - b);
    return +sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1)].toFixed(3);
  }
  function summarize(intervals, context = {}) {
    const valid = intervals.filter(v => Number.isFinite(v) && v > 0);
    const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
    return { schemaVersion: 1, kind: 'frame-sample', measuredAt: new Date().toISOString(),
      frames: valid.length, meanFrameMs: +mean.toFixed(3), medianFrameMs: percentile(valid, 0.5), p95FrameMs: percentile(valid, 0.95), maxFrameMs: percentile(valid, 1),
      meanFps: mean ? +(1000 / mean).toFixed(2) : null, framesOver16_67Ms: valid.filter(v => v > 16.67).length, framesOver33_34Ms: valid.filter(v => v > 33.34).length,
      deviceCertified: false, note: 'Browser sample only; not a low-end Android certification.', context };
  }
  function sampleFrames(options = {}) {
    if (typeof root.requestAnimationFrame !== 'function') return Promise.reject(new Error('requestAnimationFrame unavailable'));
    const count = Math.max(10, Math.min(600, options.frames || 180));
    return new Promise(resolve => {
      const intervals = [], longTasks = [];
      let observer, previous, stopped = false;
      if (typeof root.PerformanceObserver === 'function') {
        try { observer = new root.PerformanceObserver(list => { for (const e of list.getEntries()) longTasks.push(+e.duration.toFixed(3)); }); observer.observe({ entryTypes: ['longtask'] }); } catch (_) {}
      }
      function finish(wasStopped) {
        if (stopped) return;
        stopped = true;
        if (observer) observer.disconnect();
        if (root.document && root.document.removeEventListener) root.document.removeEventListener('visibilitychange', visibility);
        const result = summarize(intervals, Object.assign({ userAgent: root.navigator && root.navigator.userAgent, viewport: root.innerWidth + 'x' + root.innerHeight, pixelRatio: root.devicePixelRatio, visibility: root.document && root.document.visibilityState }, options.context || {}));
        result.longTasks = longTasks; result.stopped = wasStopped;
        if (root.performance && root.performance.memory) result.jsHeapUsedBytes = root.performance.memory.usedJSHeapSize;
        resolve(result);
      }
      const stop = () => finish(true);
      function visibility() { if (root.document.hidden) stop(); }
      if (root.document && root.document.addEventListener) root.document.addEventListener('visibilitychange', visibility);
      function frame(ts) {
        if (stopped) return;
        // Headless/WebView clocks can occasionally emit duplicate rAF timestamps.
        // Count only positive intervals so a requested 180-frame sample stays 180.
        if (previous != null && ts > previous) intervals.push(ts - previous);
        previous = ts;
        try { if (options.onFrame) options.onFrame(intervals.length); } catch (_) {}
        if (intervals.length >= count) finish(false);
        else root.requestAnimationFrame(frame);
      }
      root.requestAnimationFrame(frame);
    });
  }
  CAA.Diagnostics = { percentile, summarize, sampleFrames };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Diagnostics;
})(typeof globalThis !== 'undefined' ? globalThis : this);
