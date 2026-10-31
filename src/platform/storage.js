(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const Save = CAA.Save || (typeof require === 'function' ? require('../core/save.js') : null);
  const PREFIX = 'caa.';
  const SUFFIXES = ['.current', '.backup', '.staging', '.journal'];
  function createMemoryStorage() {
    const map = new Map();
    return {
      getItem: k => map.has(k) ? map.get(k) : null,
      setItem: (k, v) => { map.set(k, String(v)); },
      removeItem: k => { map.delete(k); }, key: i => Array.from(map.keys())[i] || null,
      get length() { return map.size; }
    };
  }
  function serial(queue) {
    return fn => { const next = queue.then(fn, fn); queue = next.catch(() => {}); return next; };
  }
  function validator(options) {
    return env => {
      const result = Save.validateEnvelope(env, options);
      if (!result.ok) throw new Error('invalid save: ' + result.errors.join('; '));
      return env;
    };
  }
  function parse(text, options) { return Save.parseEnvelope(text, options); }
  function createLocalStorageAdapter(storage, options = {}) {
    const ls = storage || root.localStorage;
    if (!ls) throw new Error('localStorage unavailable');
    const validate = validator(options), enqueue = serial(Promise.resolve());
    const key = slot => PREFIX + 'slot.' + slot;
    const get = k => ls.getItem(k), put = (k, v) => ls.setItem(k, v), del = k => ls.removeItem(k);
    async function save(slot, envelope) {
      Save.assertSlot(slot); validate(envelope);
      const text = JSON.stringify(envelope), k = key(slot);
      put(k + '.staging', text);
      if (get(k + '.staging') !== text) throw new Error('staging verify failed');
      put(k + '.journal', JSON.stringify({ slot, stage: 'prepared', at: Date.now() }));
      const old = get(k + '.current');
      if (old) {
        try { validate(parse(old, options)); put(k + '.backup', old); } catch (_) { /* Preserve the last valid backup. */ }
      }
      put(k + '.current', text);
      if (get(k + '.current') !== text) throw new Error('commit verify failed');
      del(PREFIX + 'tomb.' + slot); del(k + '.staging'); del(k + '.journal');
      return envelope;
    }
    async function load(slot) {
      Save.assertSlot(slot);
      if (get(PREFIX + 'tomb.' + slot) != null) return null;
      const k = key(slot);
      for (const suffix of ['.current', '.backup', '.staging']) {
        try { const text = get(k + suffix); if (text) return parse(text, options); } catch (_) {}
      }
      return null;
    }
    async function list() {
      const slots = new Set();
      for (let i = 0; i < ls.length; i++) {
        const k = ls.key(i);
        if (k && k.startsWith(PREFIX + 'slot.') && k.endsWith('.current')) slots.add(k.slice((PREFIX + 'slot.').length, -'.current'.length));
      }
      const out = [];
      for (const slot of slots) {
        const env = await load(slot);
        if (env) out.push({ slot, careerId: env.careerId, updatedAt: env.updatedAt, year: env.payload.career && env.payload.career.year, mode: env.payload.career && env.payload.career.mode });
      }
      return out.sort((a, b) => a.slot.localeCompare(b.slot, 'en', { numeric: true }));
    }
    async function remove(slot) {
      Save.assertSlot(slot);
      // Tombstone first: an interrupted deletion must never resurrect a backup.
      put(PREFIX + 'tomb.' + slot, String(Date.now()));
      for (const suffix of SUFFIXES) del(key(slot) + suffix);
    }
    const wrap = fn => (...args) => enqueue(() => fn(...args));
    const probe = PREFIX + 'probe';
    put(probe, '1'); if (get(probe) !== '1') throw new Error('localStorage write probe failed'); del(probe);
    return { kind: 'localStorage', persistent: true, save: wrap(save), load: wrap(load), list: wrap(list), remove: wrap(remove) };
  }
  function createIndexedDBAdapter(dbName = 'camino-al-aro', version = 1, options = {}) {
    const idb = options.indexedDB || root.indexedDB;
    if (!idb) throw new Error('IndexedDB unavailable');
    const validate = validator(options), enqueue = serial(Promise.resolve());
    let dbPromise, closed = false;
    function open() {
      if (closed) return Promise.reject(new Error('database closed'));
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        let settled = false;
        const finish = (err, db) => { if (settled) return; settled = true; clearTimeout(timer); err ? reject(err) : resolve(db); };
        const timer = setTimeout(() => { dbPromise = null; finish(new Error('database open timeout')); }, options.openTimeoutMs || 3000);
        let req;
        try { req = idb.open(dbName, version); } catch (err) { finish(err); return; }
        req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv'); };
        req.onsuccess = () => {
          const db = req.result;
          db.onversionchange = () => { db.close(); dbPromise = null; };
          if (closed || settled) db.close(); else finish(null, db);
        };
        req.onerror = () => { dbPromise = null; finish(req.error || new Error('database open failed')); };
        req.onblocked = () => { dbPromise = null; finish(new Error('database blocked by another tab')); };
      });
      return dbPromise;
    }
    async function tx(mode, fn) {
      const db = await open();
      return new Promise((resolve, reject) => {
        let t, result, failure;
        try {
          t = db.transaction('kv', mode);
          const store = t.objectStore('kv');
          result = fn(store);
        } catch (err) { reject(err); return; }
        t.oncomplete = () => resolve(typeof IDBRequest !== 'undefined' && result instanceof IDBRequest ? result.result : result);
        t.onerror = () => { failure = t.error || new Error('transaction failed'); };
        t.onabort = () => reject(failure || t.error || new Error('transaction aborted'));
      });
    }
    const key = slot => 'slot.' + slot;
    async function save(slot, envelope) {
      Save.assertSlot(slot); validate(envelope);
      const text = JSON.stringify(envelope);
      await tx('readwrite', store => {
        const old = store.get(key(slot) + '.current');
        old.onsuccess = () => {
          if (old.result) {
            try { validate(parse(old.result, options)); store.put(old.result, key(slot) + '.backup'); } catch (_) {}
          }
          store.put(text, key(slot) + '.current');
          store.delete(key(slot) + '.staging'); store.delete(key(slot) + '.journal'); store.delete('tomb.' + slot);
        };
      });
      return envelope;
    }
    async function load(slot) {
      Save.assertSlot(slot);
      const values = await tx('readonly', store => {
        const out = {};
        for (const name of ['tomb.' + slot, key(slot) + '.current', key(slot) + '.backup']) {
          const req = store.get(name); req.onsuccess = () => { out[name] = req.result; };
        }
        return out;
      });
      if (values['tomb.' + slot] != null) return null;
      for (const suffix of ['.current', '.backup']) {
        try { if (values[key(slot) + suffix]) return parse(values[key(slot) + suffix], options); } catch (_) {}
      }
      return null;
    }
    async function list() {
      const keys = await tx('readonly', store => store.getAllKeys());
      const out = [];
      for (const k of keys || []) {
        if (typeof k !== 'string' || !k.startsWith('slot.') || !k.endsWith('.current')) continue;
        const slot = k.slice(5, -8), env = await load(slot);
        if (env) out.push({ slot, careerId: env.careerId, updatedAt: env.updatedAt, year: env.payload.career && env.payload.career.year, mode: env.payload.career && env.payload.career.mode });
      }
      return out.sort((a, b) => a.slot.localeCompare(b.slot, 'en', { numeric: true }));
    }
    async function remove(slot) {
      Save.assertSlot(slot);
      await tx('readwrite', store => {
        store.put(String(Date.now()), 'tomb.' + slot);
        for (const suffix of SUFFIXES) store.delete(key(slot) + suffix);
      });
    }
    async function close() { closed = true; if (dbPromise) { try { (await dbPromise).close(); } catch (_) {} } dbPromise = null; }
    const wrap = fn => (...args) => enqueue(() => fn(...args));
    return { kind: 'indexedDB', persistent: true, save: wrap(save), load: wrap(load), list: wrap(list), remove: wrap(remove), close: wrap(close), probe: () => tx('readwrite', store => { store.put('1', '__probe__'); store.delete('__probe__'); }) };
  }
  async function createAutoAdapter(options = {}) {
    const attempts = [];
    try {
      const adapter = createIndexedDBAdapter(options.dbName || 'camino-al-aro', 1, options);
      await adapter.probe(); adapter.diagnostics = { attempts }; return adapter;
    } catch (err) { attempts.push({ backend: 'indexedDB', error: String(err.message || err) }); }
    try { const adapter = createLocalStorageAdapter(options.localStorage, options); adapter.diagnostics = { attempts }; return adapter; }
    catch (err) { attempts.push({ backend: 'localStorage', error: String(err.message || err) }); }
    const adapter = createLocalStorageAdapter(createMemoryStorage(), options);
    adapter.kind = 'memory'; adapter.persistent = false; adapter.diagnostics = { attempts };
    return adapter;
  }
  CAA.Storage = { createMemoryStorage, createLocalStorageAdapter, createIndexedDBAdapter, createAutoAdapter };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Storage;
})(typeof globalThis !== 'undefined' ? globalThis : this);
