(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  const Hash = CAA.Hash || (typeof require === 'function' ? require('./hash.js') : null);
  const SCHEMA_VERSION = 1;
  const GAME = 'camino-al-aro';
  const MAX_IMPORT_CHARS = 2 * 1024 * 1024;
  const SLOT = /^[a-z0-9][a-z0-9_-]{0,63}$/;
  const isObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);

  function validSlot(slot) { return typeof slot === 'string' && SLOT.test(slot); }
  function assertSlot(slot) { if (!validSlot(slot)) throw new TypeError('invalid slot identifier'); }
  function checksum(envelope) {
    const copy = Object.assign({}, envelope);
    delete copy.checksum;
    return Hash.hex32(Hash.hashObject(copy));
  }
  function checkTree(value, depth = 0) {
    if (depth > 64) return false;
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value !== 'object') return false;
    if (Array.isArray(value)) return value.length <= 100000 && value.every(v => checkTree(v, depth + 1));
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return false;
    return Object.keys(value).length <= 100000 && Object.values(value).every(v => checkTree(v, depth + 1));
  }
  function createEnvelope(careerId, payload, meta = {}) {
    assertSlot(careerId);
    if (!isObject(meta)) throw new TypeError('save metadata must be an object');
    if (!isObject(payload)) throw new TypeError('payload must be an object');
    const env = {
      game: GAME, schemaVersion: SCHEMA_VERSION, careerId,
      updatedAt: meta.updatedAt || new Date().toISOString(),
      seed: meta.seed == null ? null : meta.seed,
      rngCounters: meta.rngCounters || {}, packVersions: meta.packVersions || {}, payload
    };
    env.checksum = checksum(env);
    const validation = validateEnvelope(env);
    if (!validation.ok) throw new TypeError('invalid save: ' + validation.errors.join('; '));
    return env;
  }
  function validateEnvelope(env, options = {}) {
    const errors = [];
    if (!isObject(env)) return { ok: false, errors: ['envelope must be object'] };
    if (env.game !== GAME) errors.push('game mismatch');
    if (!Number.isInteger(env.schemaVersion) || env.schemaVersion < 0) errors.push('schemaVersion required');
    else if (env.schemaVersion > SCHEMA_VERSION) errors.push('future schema');
    if (!validSlot(env.careerId)) errors.push('valid careerId required');
    if (typeof env.updatedAt !== 'string' || !Number.isFinite(Date.parse(env.updatedAt))) errors.push('valid updatedAt required');
    if (!isObject(env.payload)) errors.push('payload object required');
    if (!isObject(env.rngCounters) || !isObject(env.packVersions)) errors.push('metadata objects required');
    if (env.seed != null && !['string', 'number'].includes(typeof env.seed)) errors.push('invalid seed');
    if (!checkTree(env)) errors.push('unsupported payload values or nesting');
    if (errors.length) return { ok: false, errors };
    if (typeof env.checksum !== 'string') errors.push('checksum required');
    else if (env.checksum !== checksum(env)) errors.push('checksum mismatch');
    if (!errors.length && env.payload.career != null && typeof options.careerValidator === 'function') {
      const career = options.careerValidator(env.payload.career);
      if (!career.ok) errors.push.apply(errors, career.errors);
    }
    return { ok: errors.length === 0, errors };
  }
  function migrateEnvelope(env) {
    if (!isObject(env)) throw new TypeError('invalid envelope');
    if (env.schemaVersion === SCHEMA_VERSION) return env;
    if (env.schemaVersion === 0 && env.game === GAME) {
      // Verify the old checksum before changing its schema; never bless a corrupt import.
      if (typeof env.checksum === 'string' && env.checksum !== checksum(env)) throw new Error('invalid save: legacy checksum mismatch');
      const migrated = Object.assign({}, env, {
        schemaVersion: 1, rngCounters: isObject(env.rngCounters) ? env.rngCounters : {},
        packVersions: isObject(env.packVersions) ? env.packVersions : {}, payload: isObject(env.payload) ? env.payload : {}, updatedAt: typeof env.updatedAt === 'string' && Number.isFinite(Date.parse(env.updatedAt)) ? env.updatedAt : new Date(0).toISOString()
      });
      migrated.checksum = checksum(migrated);
      return migrated;
    }
    throw new Error('unsupported schema migration: ' + env.schemaVersion);
  }
  function parseEnvelope(text, options = {}) {
    if (typeof text !== 'string') throw new Error('empty save');
    if (text.length > MAX_IMPORT_CHARS) throw new Error('save exceeds import size limit');
    if (!text.trim()) throw new Error('empty save');
    let env;
    try { env = JSON.parse(text); } catch (_) { throw new Error('corrupt JSON'); }
    const migrated = migrateEnvelope(env);
    const v = validateEnvelope(migrated, options);
    if (!v.ok) throw new Error('invalid save: ' + v.errors.join('; '));
    return migrated;
  }
  CAA.Save = { SCHEMA_VERSION, GAME, MAX_IMPORT_CHARS, validSlot, assertSlot, createEnvelope, validateEnvelope, migrateEnvelope, parseEnvelope, checksum };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Save;
})(typeof globalThis !== 'undefined' ? globalThis : this);
