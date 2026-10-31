(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};

  const ENUMS = {
    confederation: ['fiba-africa', 'fiba-americas', 'fiba-asia', 'fiba-europe', 'fiba-oceania', 'continental', 'national'],
    kind: ['league', 'cup', 'playoff', 'tournament', 'national-team'],
    level: ['international', 'continental', 'national', 'regional', 'local'],
    gender: ['men', 'women', 'mixed'],
    ageGroup: ['senior', 'university', 'u23', 'u21', 'u20', 'u19', 'u18', 'u17', 'u16', 'u15', 'youth'],
    category: ['pro', 'semipro', 'amateur', 'regional', 'youth', 'academy', 'university', 'college'],
    sourceStatus: ['verified', 'pending', 'fictionalized']
  };
  const REQUIRED = ['id', 'displayName', 'referenceName', 'country', 'confederation', 'kind', 'level', 'gender', 'ageGroup', 'category', 'season', 'ruleSet', 'sourceStatus', 'sourceUrl'];

  function validatePack(pack) {
    const errors = [];
    if (!pack || typeof pack !== 'object') return { ok: false, errors: ['pack must be object'] };
    if (pack.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    for (const k of ['packId', 'version', 'validFrom']) if (typeof pack[k] !== 'string' || !pack[k]) errors.push(k + ' required');
    if (!pack.coverage || pack.coverage.target !== 'full_ecosystem') errors.push('coverage.target must be full_ecosystem');
    if (!['seed', 'partial', 'complete'].includes(pack.coverage && pack.coverage.status)) errors.push('coverage.status invalid');
    if (!Array.isArray(pack.competitions)) errors.push('competitions must be array');
    const ids = new Set();
    (pack.competitions || []).forEach((c, i) => {
      const at = 'competitions[' + i + ']';
      if (!c || typeof c !== 'object') { errors.push(at + ' must be object'); return; }
      for (const k of REQUIRED) if (c[k] == null || c[k] === '') errors.push(at + '.' + k + ' required');
      if (typeof c.id === 'string') {
        if (!/^[a-z0-9-]+$/.test(c.id)) errors.push(at + '.id invalid');
        if (ids.has(c.id)) errors.push(at + '.id duplicate');
        ids.add(c.id);
      }
      for (const [k, vals] of Object.entries(ENUMS)) if (c[k] != null && !vals.includes(c[k])) errors.push(at + '.' + k + ' invalid');
      if (c.teams != null && (!Number.isInteger(c.teams) || c.teams < 2)) errors.push(at + '.teams invalid');
      if (typeof c.sourceUrl === 'string' && !/^https?:\/\//.test(c.sourceUrl)) errors.push(at + '.sourceUrl must be http(s)');
    });
    return { ok: errors.length === 0, errors };
  }

  function coverage(pack) {
    const out = { total: 0, byStatus: {}, byCategory: {}, byGender: {}, byConfederation: {}, byCountry: {} };
    for (const c of pack.competitions || []) {
      out.total++;
      const bump = (obj, k) => { obj[k] = (obj[k] || 0) + 1; };
      bump(out.byStatus, c.sourceStatus);
      bump(out.byCategory, c.category);
      bump(out.byGender, c.gender);
      bump(out.byConfederation, c.confederation);
      bump(out.byCountry, c.country);
    }
    return out;
  }

  function mergePacks(packs) {
    const map = new Map();
    for (const pack of packs) {
      const v = validatePack(pack);
      if (!v.ok) throw new Error('invalid pack ' + pack.packId + ': ' + v.errors.join('; '));
      for (const c of pack.competitions) map.set(c.id, Object.assign({ packId: pack.packId, packVersion: pack.version }, c));
    }
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }

  CAA.World = { ENUMS, validatePack, coverage, mergePacks };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.World;
})(typeof globalThis !== 'undefined' ? globalThis : this);
