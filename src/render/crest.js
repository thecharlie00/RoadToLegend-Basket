(function (root) {
  'use strict';
  // Escudos en SVG (paridad con crest.js del fútbol): forma y patrón deterministas a partir del nombre del club y
  // colores reales para los clubes conocidos (si no, una pareja de la paleta). No reproduce escudos reales: solo
  // forma, colores y siglas.
  const CAA = root.CAA = root.CAA || {};
  const SHAPES = ['shield', 'pointed', 'round', 'ring', 'hexagon', 'diamond', 'ball', 'pennant', 'square', 'octagon'];
  const PATS = ['plain', 'stripes', 'band', 'halves', 'sash', 'chevron', 'hoops', 'border'];
  const PAL = [['#0b2a5b', '#f6c83a'], ['#c9183c', '#ffffff'], ['#1d6b3a', '#ffffff'], ['#552583', '#fdb927'], ['#0e2240', '#fec524'], ['#ce1141', '#000000'], ['#006bb6', '#f58426'], ['#007a33', '#ba9653'],
    ['#1d1160', '#00788c'], ['#e03a3e', '#c1d32f'], ['#002b5c', '#e31837'], ['#000000', '#c4ced4'], ['#5a2d81', '#63727a'], ['#ff7a1f', '#0b0d1c'], ['#00471b', '#eee1c6'], ['#860038', '#fdbb30'], ['#3a8d4f', '#f3f1ea'], ['#8b5cf6', '#ffd23f']];
  // Colores de clubes conocidos (aproximados; sin escudos).
  const KNOWN = {
    'Real Madrid': ['#ffffff', '#5b2a86'], 'Barça': ['#a50044', '#004d98'], 'Valencia Basket': ['#f39200', '#111111'], 'Unicaja': ['#00843d', '#7a2b8f'], 'Baskonia': ['#0b2a5b', '#c9183c'],
    'Joventut Badalona': ['#00843d', '#111111'], 'Movistar Estudiantes': ['#0060a8', '#ffffff'], 'Fenerbahçe Beko': ['#002d72', '#ffd500'], 'Anadolu Efes': ['#003a70', '#ffffff'],
    'Olympiacos': ['#c8102e', '#ffffff'], 'Panathinaikos AKTOR': ['#00843d', '#ffffff'], 'Žalgiris Kaunas': ['#006a44', '#ffffff'], 'Partizan Mozzart Bet': ['#111111', '#ffffff'],
    'Crvena Zvezda Meridianbet': ['#c8102e', '#ffffff'], 'AS Monaco': ['#c8102e', '#ffffff'], 'Olimpia Milano': ['#c8102e', '#ffffff'], 'Virtus Bologna': ['#111111', '#ffffff'], 'FC Bayern München': ['#dc052d', '#0066b2'],
    'ALBA Berlin': ['#ffd700', '#0055a4'], 'Boston Celtics': ['#007a33', '#ffffff'], 'Los Angeles Lakers': ['#552583', '#fdb927'], 'Golden State Warriors': ['#1d428a', '#ffc72c'], 'Chicago Bulls': ['#ce1141', '#000000'],
    'Miami Heat': ['#98002e', '#f9a01b'], 'New York Knicks': ['#006bb6', '#f58426'], 'Oklahoma City Thunder': ['#007ac1', '#ef3b24'], 'Denver Nuggets': ['#0e2240', '#fec524'], 'Cleveland Cavaliers': ['#860038', '#fdbb30'],
    'Milwaukee Bucks': ['#00471b', '#eee1c6'], 'Dallas Mavericks': ['#00538c', '#b8c4ca'], 'San Antonio Spurs': ['#000000', '#c4ced4'], 'Phoenix Suns': ['#1d1160', '#e56020'], 'Toronto Raptors': ['#ce1141', '#000000'],
    'Indiana Fever': ['#002d62', '#e03a3e'], 'Las Vegas Aces': ['#000000', '#c4ced4'], 'New York Liberty': ['#6eceb2', '#000000'], 'Minnesota Lynx': ['#0c2340', '#78be20'], 'Boca Juniors': ['#103f79', '#f3b229'], 'Flamengo': ['#c8102e', '#111111']
  };
  function hash(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function lum(c) { const m = /^#([0-9a-f]{6})$/i.exec(c); if (!m) return 0.5; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  const PATH = {
    shield: 'M4 3h36v20c0 13-9 21-18 25C13 44 4 36 4 23z', pointed: 'M4 3h36v18L22 48 4 21z', round: null, ring: null,
    hexagon: 'M22 2 41 13v24L22 48 3 37V13z', diamond: 'M22 1 43 25 22 49 1 25z', ball: null, pennant: 'M3 3h38L22 48z', square: 'M8 4h28a5 5 0 0 1 5 5v32a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V9a5 5 0 0 1 5-5z',
    octagon: 'M14 2h16l12 12v22L30 48H14L2 36V14z'
  };
  let uid = 0;
  function abbr(name) {
    const w = String(name || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').split(/\s+/).filter(x => x && !/^(de|del|la|el|los|las|of|the|BC|CB|KK|FC|AS|SC|CD|y)$/i.test(x));
    return (w.length >= 2 ? w.slice(0, 3).map(x => x[0]).join('') : (w[0] || '?').slice(0, 3)).toUpperCase();
  }
  function svg(club, size) {
    const name = club && club.name || '?', h = hash(name), z = size || 24;
    const cu = club && club.custom;
    const [c0, c1] = cu ? [cu.primary, cu.secondary] : KNOWN[name] || PAL[h % PAL.length];
    const shape = SHAPES[(h >> 5) % SHAPES.length], pat = PATS[(h >> 9) % PATS.length], id = 'cr' + (++uid);
    const ab = esc(cu && cu.abbr ? cu.abbr : abbr(name));
    const outline = PATH[shape] ? `<path d="${PATH[shape]}"/>` : '<circle cx="22" cy="25" r="21"/>';
    const P = {
      plain: '', stripes: [10, 18, 26, 34].map(x => `<rect x="${x}" y="0" width="4" height="50" fill="${c1}"/>`).join(''), band: `<rect x="0" y="18" width="44" height="12" fill="${c1}"/>`,
      halves: `<rect x="22" y="0" width="22" height="50" fill="${c1}"/>`, sash: `<path d="M0 8 8 0 44 36 36 44z" fill="${c1}"/>`, chevron: `<path d="M0 20 22 36 44 20v10L22 46 0 30z" fill="${c1}"/>`,
      hoops: [10, 24, 38].map(y => `<rect x="0" y="${y}" width="44" height="5" fill="${c1}"/>`).join(''), border: ''
    }[pat];
    const extra = shape === 'ball' ? `<path d="M1 25h42M22 4v42M8 10c8 8 8 22 0 30M36 10c-8 8-8 22 0 30" stroke="${c1}" stroke-width="2" fill="none"/>` : shape === 'ring' ? `<circle cx="22" cy="25" r="15" fill="none" stroke="${c1}" stroke-width="4"/>` : '';
    const txt = lum(pat === 'halves' || pat === 'band' ? c1 : c0) > 0.6 ? '#111' : '#fff';
    const fs = ab.length >= 3 ? 11 : 14;
    return `<svg class="crest-svg" width="${z}" height="${Math.round(z * 50 / 44)}" viewBox="0 0 44 50" aria-hidden="true"><defs><clipPath id="${id}">${outline}</clipPath></defs>`
      + `<g clip-path="url(#${id})"><rect width="44" height="50" fill="${c0}"/>${P}${extra}</g>`
      + `<g fill="none" stroke="${pat === 'border' ? c1 : 'rgba(0,0,0,.35)'}" stroke-width="${pat === 'border' ? 4 : 2}">${outline}</g>`
      + `<text x="22" y="${shape === 'pennant' ? 22 : 30}" text-anchor="middle" font-family="'Bebas Neue','Oswald',system-ui,sans-serif" font-weight="700" font-size="${fs}" fill="${txt}" stroke="${txt === '#fff' ? 'rgba(0,0,0,.45)' : 'rgba(255,255,255,.4)'}" stroke-width=".6" paint-order="stroke">${ab}</text></svg>`;
  }
  CAA.Crest = { SHAPES, PATS, KNOWN, svg, abbr };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Crest;
})(typeof globalThis !== 'undefined' ? globalThis : this);
