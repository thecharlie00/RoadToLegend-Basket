(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};

  function stableStringify(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
  }

  function hashString(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  function hashObject(value) {
    return hashString(stableStringify(value));
  }

  function hex32(n) {
    return (n >>> 0).toString(16).padStart(8, '0');
  }

  CAA.Hash = { stableStringify, hashString, hashObject, hex32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Hash;
})(typeof globalThis !== 'undefined' ? globalThis : this);
