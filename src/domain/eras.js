(function (root) {
  'use strict';
  // Modo Épocas (1920-2020), adaptación de eras-core del fútbol: empiezas en una década y el juego evoluciona
  // con la historia del baloncesto. Las reglas cambian con el año (reloj de posesión, línea de tres, cuartos),
  // cada liga existe desde un año, la estética imita la televisión de cada época y hay leyendas ficticias.
  // Las fechas de las reglas son las publicadas por FIBA y por la liga profesional norteamericana; las fechas
  // de fundación de las ligas del juego son ficticias e inspiradas, como las propias ligas.
  const CAA = root.CAA = root.CAA || {};
  const Rules = CAA.Rules || (typeof require === 'function' ? require('../match/rules.js') : null);
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const Names = CAA.Names || (typeof require === 'function' ? require('./names.js') : null);

  const DECADES = ['1920s', '1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'].map(id => ({ id, start: Number(id.slice(0, 4)) + 2 }));

  // Reglas internacionales (FIBA): sin reloj hasta 1956 (30 s), triple en 1984 (6,25 m), 24 s y 4×10 en 2000, triple a 6,75 m en 2010.
  function fibaEra(y) {
    if (y >= 2010) return null;
    if (y >= 2000) return { periods: 4, periodMinutes: 10, shotClock: 24, three: 6.25, pace: 0.97, shootMod: 0, threeCap: 0.42 };
    if (y >= 1984) return { periods: 2, periodMinutes: 20, shotClock: 30, three: 6.25, pace: 0.93, shootMod: -0.01, threeCap: y >= 1990 ? 0.32 : 0.18 };
    if (y >= 1956) return { periods: 2, periodMinutes: 20, shotClock: 30, three: 0, pace: y >= 1970 ? 0.9 : 0.84, shootMod: y >= 1970 ? -0.02 : -0.04 };
    if (y >= 1946) return { periods: 2, periodMinutes: 20, shotClock: 0, three: 0, pace: 0.62, shootMod: -0.06 };
    if (y >= 1936) return { periods: 2, periodMinutes: 20, shotClock: 0, three: 0, pace: 0.46, shootMod: -0.09 };
    return { periods: 2, periodMinutes: 20, shotClock: 0, three: 0, pace: 0.38, shootMod: -0.11 };
  }
  // Liga norteamericana: 4×12 desde el principio, reloj de 24 s en 1954, triple (7,24 m) en 1979.
  function naEra(y) {
    if (y >= 2010) return null;
    if (y >= 1979) return { periods: 4, periodMinutes: 12, shotClock: 24, three: 7.24, pace: y >= 1995 ? 0.92 : 0.98, shootMod: 0, threeCap: y >= 1995 ? 0.3 : y >= 1987 ? 0.16 : 0.06 };
    if (y >= 1954) return { periods: 4, periodMinutes: 12, shotClock: 24, three: 0, pace: y >= 1970 ? 1.02 : 1.1, shootMod: y >= 1970 ? -0.03 : -0.06 };
    return { periods: 4, periodMinutes: 12, shotClock: 0, three: 0, pace: 0.7, shootMod: -0.08 };
  }
  function ruleSetFor(year, league) {
    const base = league.ruleSet || 'FIBA-2026';
    const cfg = base.startsWith('NA') ? naEra(year) : fibaEra(year);
    return cfg ? Rules.eraId(base, cfg) : base;
  }
  // Rasgos visibles de las reglas de un año (para noticias y la guía de la época).
  function traits(year, league) {
    const cfg = (league.ruleSet || 'FIBA').startsWith('NA') ? naEra(year) : fibaEra(year);
    if (!cfg) return { shotClock: 24, three: true, quarters: true };
    return { shotClock: cfg.shotClock || 0, three: !!cfg.three, quarters: cfg.periods === 4 };
  }

  // Año (ficticio) desde el que existe cada liga del juego. Las segundas divisiones, diez años después.
  const SINCE = {
    IT: 1920, FR: 1921, LT: 1924, UY: 1925, GR: 1927, BE: 1927, PL: 1928, AR: 1929, CZ: 1929, PR: 1930, PT: 1932, HU: 1933, EG: 1945, RS: 1945,
    US: 1946, ES: 1957, MA: 1960, AF: 1962, BR: 1965, DE: 1966, TR: 1966, JP: 1967, MX: 1974, VE: 1974, PH: 1975, AU: 1979, NZ: 1982, ID: 1982, KR: 1983, HR: 1991, LB: 1992, CN: 1995, CA: 1996, TW: 2003
  };
  const SINCE_WOMEN = { IT: 1930, FR: 1937, CZ: 1949, HU: 1950, PL: 1952, ES: 1964, BR: 1966, JP: 1967, DE: 1971, AU: 1981, TR: 1984, KR: 1998, AR: 1993, CN: 1995, US: 1997 };
  function since(league) {
    const table = league.gender === 'f' ? SINCE_WOMEN : SINCE;
    const base = table[league.country] != null ? table[league.country] : league.gender === 'f' ? 1975 : 1950;
    return base + (league.level === 2 ? 10 : 0);
  }
  function available(league, year) { return since(league) <= year; }

  // Leyendas ficticias de cada década (nombres inventados): estrellas que coinciden contigo en la liga.
  function legends(decadeId, gender, seed) {
    const rng = RNG.create(seed + ':legends:' + decadeId + ':' + gender);
    const nats = ['US', 'FR', 'IT', 'LT', 'AR', 'ES', 'RS', 'GR', 'BR', 'CZ', 'TR', 'AU'];
    const pos = ['PG', 'SG', 'SF', 'PF', 'C'];
    return Array.from({ length: 4 }, (_, i) => {
      const nat = rng.pick(nats), n = Names.generateName(seed + ':legend:' + decadeId + ':' + i, nat, gender === 'f' ? 'f' : 'm');
      return { name: n.full, nationality: nat, pos: pos[i % 5], ovr: 80 + rng.int(0, 8), nick: rng.pick(['showman', 'wall', 'sniper', 'general', 'flyer', 'iron', 'magician', 'professor']) };
    });
  }
  // Estética de televisión por año: sepia, blanco y negro, color desvaído o moderno.
  function look(year) { return year < 1950 ? 'sepia' : year < 1966 ? 'bw' : year < 1986 ? 'faded' : year < 2006 ? 'sd' : 'hd'; }
  function ballColor(year) { return year < 1937 ? '#6b4423' : year < 1958 ? '#8a5a2e' : null; }
  function decadeOf(year) { return Math.floor(year / 10) * 10 + 's'; }

  CAA.Eras = { DECADES, ruleSetFor, traits, since, available, legends, look, ballColor, decadeOf, fibaEra, naEra };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Eras;
})(typeof globalThis !== 'undefined' ? globalThis : this);
