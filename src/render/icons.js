(function (root) {
  'use strict';
  const CAA = root.CAA = root.CAA || {};
  // Set de iconos propio (trazo 2, 24×24) para no depender de la fuente de emoji del sistema.
  // Todos heredan currentColor y son decorativos: el texto del botón sigue siendo la etiqueta.
  const P = {
    career: '<path d="M4 20V9l8-5 8 5v11"/><path d="M9 20v-6h6v6"/>',
    life: '<path d="M9 4h6l1 3 3 2v3l-2 1 2 3-1 4-3-1-1 3h-4l-1-3-3 1-1-4 2-3-2-1V9l3-2z"/>',
    league: '<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="7" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    more: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    edit: '<path d="M4 20h4L20 8l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    fastForward: '<path d="M4 6l7 6-7 6z"/><path d="M13 6l7 6-7 6z"/>',
    trophy: '<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/><path d="M12 13v4M8 20h8"/>',
    arena: '<path d="M3 17a9 5 0 0 1 18 0"/><path d="M3 17h18v3H3z"/><path d="M8 12V7M16 12V7"/>',
    handshake: '<path d="M3 12l4-4 5 4 5-4 4 4-4 5-5-4-5 4z"/>',
    bag: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c2 0 2-2 1-3s0-3 2-3h2a4 4 0 0 0 4-4c0-5-4-8-9-8z"/><circle cx="8" cy="9" r="1.2"/><circle cx="12" cy="7" r="1.2"/><circle cx="16" cy="10" r="1.2"/>',
    film: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4"/>',
    hall: '<path d="M3 20h18"/><path d="M5 20V9l7-4 7 4v11"/><path d="M9 20v-6h6v6"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z"/><path d="M8 3v18"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3v18"/><path d="M5 5c4 3 4 11 0 14M19 5c-4 3-4 11 0 14"/>',
    save: '<path d="M4 4h12l4 4v12H4z"/><path d="M8 4v6h8V4"/><rect x="8" y="13" width="8" height="7"/>',
    gear: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    flask: '<path d="M9 3h6M10 3v7l-5 8a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-8V3"/><path d="M7 15h10"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/>',
    play: '<path d="M8 5l11 7-11 7z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    whistle: '<circle cx="9" cy="15" r="5"/><path d="M14 15h6l1-4h-6l-2 4z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };
  function svg(name, size) {
    const d = P[name] || P.ball, z = size || 22;
    return `<svg class="ico-svg" viewBox="0 0 24 24" width="${z}" height="${z}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
  }
  CAA.Icons = { PATHS: P, svg, has: name => Object.prototype.hasOwnProperty.call(P, name) };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Icons;
})(typeof globalThis !== 'undefined' ? globalThis : this);
