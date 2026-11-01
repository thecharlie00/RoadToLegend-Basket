(function (root) {
  'use strict';
  // Caras procedurales (paridad con faces.js del fútbol): cada jugador tiene una cara fija derivada de un hash de su
  // id y su nombre. No se guarda ninguna imagen: solo un vector [piel, pelo, color, barba, ojos, boca].
  // Piel: 6 tonos · Pelo: 10 estilos y 6 colores · Barba: 4 · Ojos: 3 · Boca: 3. SVG puro.
  const CAA = root.CAA = root.CAA || {};
  const SKIN = ['#f6d7c3', '#ecbf9e', '#d9a07a', '#b97a52', '#8d5a3b', '#5e3b27'];
  const HAIRC = ['#1d1714', '#3b2619', '#6b4428', '#b98a4d', '#a8462a', '#9a9a9a'];
  // Reparto aproximado de tonos por zona (solo para variar, como en el fútbol).
  const ZONE = { africa: [0, 2, 6, 18, 36, 38], europe: [32, 32, 20, 9, 5, 2], americas: [16, 22, 24, 18, 12, 8], asia: [26, 34, 26, 10, 3, 1], oceania: [20, 24, 20, 16, 12, 8] };
  const AFR = new Set('NG SN CM CD CI ML GN AO ZA KE RW UG TZ ET GH BF BJ TG GA CG CF TD NE SD SS MZ ZW ZM NA MG BI CV'.split(' '));
  const ASIA = new Set('CN JP KR PH TW ID TH VN MY SG HK IN PK BD NP LK KH MN KZ KG UZ IR IQ JO LB SY PS SA QA AE BH KW OM'.split(' '));
  const AME = new Set('US CA MX AR BR UY VE PR CL CO CU DO EC SV GT HN JM NI PA PY PE TT BS BB BZ BO CR'.split(' '));
  function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pickW(w, r) { const tot = w.reduce((a, b) => a + b, 0); let x = r % tot; for (let i = 0; i < w.length; i++) { if (x < w[i]) return i; x -= w[i]; } return 0; }
  function vector(p) {
    const h = hash((p.id || '') + '|' + (p.name || '')), h2 = hash(h + 'b');
    const nat = p.nationality || 'ES', zone = AFR.has(nat) ? 'africa' : ASIA.has(nat) ? 'asia' : AME.has(nat) ? 'americas' : nat === 'AU' || nat === 'NZ' ? 'oceania' : 'europe';
    const skin = pickW(ZONE[zone], h);
    const women = p.gender === 'women' || p.gender === 'f';
    const hair = women ? [3, 4, 5, 6, 7][h2 % 5] : (h2 >> 3) % 10;
    const color = skin >= 4 ? (h2 >> 7) % 2 : (h2 >> 7) % (p.age > 33 ? 6 : 5);
    const beard = women ? 0 : (h2 >> 11) % 4;
    return [skin, hair, color, beard, (h2 >> 14) % 3, (h2 >> 17) % 3];
  }
  function svg(p, size) {
    const [sk, hs, hc, bd, ey, mo] = vector(p), S = SKIN[sk], C = HAIRC[hc], z = size || 28;
    const hairShapes = [
      '', // rapado
      '<rect x="7" y="4" width="18" height="5" rx="2"/>',
      '<rect x="6" y="3" width="20" height="7" rx="3"/>',
      '<circle cx="16" cy="8" r="10"/>', // afro
      '<rect x="6" y="3" width="20" height="6" rx="3"/><rect x="5" y="7" width="4" height="15" rx="2"/><rect x="23" y="7" width="4" height="15" rx="2"/>', // largo
      '<rect x="6" y="3" width="20" height="6" rx="3"/><circle cx="16" cy="3" r="3.5"/>', // moño
      '<rect x="6" y="3" width="20" height="6" rx="3"/><rect x="24" y="8" width="4" height="11" rx="2"/>', // coleta
      '<rect x="6" y="3" width="20" height="6" rx="3"/><rect x="8" y="8" width="2" height="12"/><rect x="13" y="8" width="2" height="12"/><rect x="18" y="8" width="2" height="12"/><rect x="23" y="8" width="2" height="12"/>', // trenzas
      '<rect x="14" y="0" width="4" height="9" rx="1"/>', // cresta
      '<circle cx="11" cy="5" r="4"/><circle cx="16" cy="4" r="4"/><circle cx="21" cy="5" r="4"/>' // rizado
    ];
    const eyes = ['<circle cx="12" cy="15" r="1.4"/><circle cx="20" cy="15" r="1.4"/>', '<rect x="10.5" y="14.5" width="3" height="1.4" rx=".7"/><rect x="18.5" y="14.5" width="3" height="1.4" rx=".7"/>', '<circle cx="12" cy="15" r="1.1"/><circle cx="20" cy="15" r="1.1"/>'][ey];
    const mouth = ['<path d="M13 21 Q16 23 19 21" stroke="#3a2418" stroke-width="1.2" fill="none"/>', '<rect x="13" y="20.6" width="6" height="1.2" rx=".6" fill="#3a2418"/>', '<path d="M13 21.5 Q16 20 19 21.5" stroke="#3a2418" stroke-width="1.2" fill="none"/>'][mo];
    const beard = ['', '<path d="M8 18 Q16 30 24 18 L24 22 Q16 31 8 22Z" opacity=".55"/>', '<path d="M8 17 Q16 32 24 17 L24 23 Q16 33 8 23Z"/>', '<rect x="14" y="22" width="4" height="4" rx="1.5"/>'][bd];
    return `<svg class="face" width="${z}" height="${z}" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="16" fill="#1d2240"/><ellipse cx="16" cy="16" rx="9.5" ry="11" fill="${S}"/><g fill="${C}">${hairShapes[hs]}${beard}</g><g fill="#16191b">${eyes}</g>${mouth}</svg>`;
  }
  CAA.Faces = { SKIN, HAIRC, vector, svg };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Faces;
})(typeof globalThis !== 'undefined' ? globalThis : this);
