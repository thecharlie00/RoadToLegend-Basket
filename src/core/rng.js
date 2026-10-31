(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const Hash = CAA.Hash || (typeof require === 'function' ? require('./hash.js') : null);

  function normalizeSeed(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0;
    if (typeof seed === 'string' && Hash) return Hash.hashString(seed);
    return 0x9e3779b9;
  }

  function create(seed) {
    const initial = normalizeSeed(seed);
    let state = initial;
    let count = 0;

    function nextUint32() {
      state = (state + 0x9e3779b9) | 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
      t = (t ^ (t >>> 15)) >>> 0;
      count++;
      return t;
    }

    function float() {
      return nextUint32() / 4294967296;
    }

    function int(min, max) {
      if (max < min) throw new RangeError('max < min');
      return min + Math.floor(float() * (max - min + 1));
    }

    function pick(arr) {
      if (!arr.length) throw new RangeError('empty array');
      return arr[int(0, arr.length - 1)];
    }

    function shuffle(arr) {
      const out = arr.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }

    function fork(label) {
      const mix = Hash ? Hash.hashString(String(label)) : 0;
      return create((state ^ mix ^ count) >>> 0);
    }

    function serialize() {
      return { seed: initial, state: state >>> 0, count };
    }

    function restore(snapshot) {
      if (!snapshot || typeof snapshot.state !== 'number') throw new TypeError('invalid rng snapshot');
      state = snapshot.state >>> 0;
      count = snapshot.count >>> 0;
    }

    return { nextUint32, float, int, pick, shuffle, fork, serialize, restore };
  }

  CAA.RNG = { create, normalizeSeed };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.RNG;
})(typeof globalThis !== 'undefined' ? globalThis : this);
