(function (root) {
  'use strict';
  // Selecciones nacionales (adaptación de nat31 del fútbol): convocatorias según tu nivel y tu país, ventanas
  // internacionales y torneos de verano (Campeonato continental, Mundial y Juegos de Verano) con grupos,
  // eliminatorias y medallas. Masculino y femenino. Los nombres de competición son descriptivos, sin marcas.
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Fuerza aproximada de cada selección [masculina, femenina] (de diseño; ajustable).
  const STRENGTH = {
    US: [92, 93], ES: [84, 82], FR: [85, 83], RS: [84, 76], AU: [80, 83], CA: [81, 79], GR: [80, 70], LT: [78, 68], AR: [77, 66], DE: [81, 75], IT: [77, 73],
    TR: [77, 76], BR: [74, 74], CN: [70, 81], JP: [71, 78], PL: [72, 70], HR: [74, 62], CZ: [70, 74], BE: [72, 81], NL: [66, 66], PT: [62, 60], HU: [62, 72],
    UY: [66, 56], VE: [68, 60], PR: [72, 66], NZ: [70, 68], EG: [64, 56], MA: [58, 52], ID: [58, 50], TW: [60, 58], LB: [70, 50], MX: [70, 64], NG: [72, 79],
RU: [82, 80], SI: [82, 68], LV: [76, 70], EE: [66, 58], FI: [74, 60], IL: [70, 62], GE: [74, 52], ME: [76, 66], BA: [70, 56], BG: [64, 60], MK: [64, 54], UA: [70, 66], BY: [62, 72],
    SK: [58, 68], AT: [64, 58], CH: [60, 56], SE: [66, 70], DK: [56, 56], NO: [54, 52], GB: [70, 72], IE: [52, 56], IS: [58, 50], RO: [60, 60], AL: [50, 45], XK: [56, 45], AM: [50, 45], AZ: [52, 45],
    CY: [48, 45], LU: [46, 50], MT: [40, 40], MD: [46, 45], AD: [40, 38], KZ: [58, 60], IR: [72, 50], JO: [70, 52], QA: [58, 45], SA: [58, 45], SY: [60, 50], IQ: [56, 45], KW: [52, 44], BH: [56, 44],
    AE: [52, 44], IN: [54, 58], TH: [56, 56], VN: [50, 50], MY: [50, 50], SG: [48, 48], HK: [50, 52], MN: [50, 52], UZ: [48, 45], KG: [44, 44], PK: [44, 44], BD: [38, 38], NP: [40, 40], LK: [42, 42],
    KH: [40, 40], PS: [54, 45], OM: [42, 40], DO: [74, 62], CU: [62, 66], CL: [60, 58], CO: [62, 62], PA: [62, 52], PY: [58, 58], BO: [50, 48], EC: [52, 50], PE: [48, 48], CR: [50, 48], GT: [46, 45],
    HN: [44, 44], SV: [50, 46], NI: [42, 42], BS: [64, 50], JM: [62, 54], TT: [52, 48], BB: [48, 44], BZ: [46, 42], FJ: [48, 50], AO: [70, 68], CI: [68, 60], CM: [68, 62], TN: [70, 56], DZ: [56, 50],
    CD: [66, 58], ML: [60, 72], RW: [60, 52], KE: [52, 52], UG: [58, 56], SS: [72, 45], CV: [64, 56], GN: [58, 50], GH: [50, 48], MZ: [54, 66], ZM: [46, 44], ZW: [46, 44], TZ: [46, 44], ET: [44, 42],
    LY: [58, 45], SD: [48, 44], MG: [52, 50], BF: [46, 45], BJ: [46, 45], TG: [44, 44], GA: [50, 48], CG: [52, 50], CF: [56, 50], TD: [50, 45], NE: [44, 42], NA: [42, 42], BI: [44, 42],
    SN: [68, 72], KR: [66, 72], PH: [67, 56], ZA: [56, 50]
  };
  const CONTINENT = { US: 'americas', CA: 'americas', AR: 'americas', BR: 'americas', UY: 'americas', VE: 'americas', PR: 'americas', MX: 'americas',
    CN: 'asia', JP: 'asia', KR: 'asia', PH: 'asia', ID: 'asia', TW: 'asia', LB: 'asia', AU: 'asia', NZ: 'asia', EG: 'africa', MA: 'africa', NG: 'africa', SN: 'africa', ZA: 'africa' };
  const contOf = c => { const C = CAA.LeagueCatalog && CAA.LeagueCatalog.COUNTRIES[c]; const k = CONTINENT[c] || (C && C.continent) || 'europe'; return k === 'oceania' ? 'asia' : k; };
  const str = (c, g) => (STRENGTH[c] || [55, 55])[g === 'women' ? 1 : 0];

  // Torneo de verano de un año (o null). Respeta la historia en el modo Épocas.
  function tournamentOf(year, gender) {
    const w = gender === 'women';
    if (year % 4 === 0 && year >= (w ? 1976 : 1936) && year !== 1940 && year !== 1944) return 'games';
    const wc = year >= 2019 ? year % 4 === 3 : year % 4 === 2;
    if (wc && year >= (w ? 1953 : 1950)) return 'world';
    if (year % 2 === 1 && year >= (w ? 1950 : 1935)) return 'continental';
    return null;
  }
  function threshold(country, gender) { return str(country, gender) - 10; }
  function ensure(state) {
    if (!state.national) state.national = { caps: 0, points: 0, medals: [], tournaments: [], called: false, last: null, debut: null };
    return state.national;
  }
  // Ventana internacional de mitad de temporada: convocatoria (o no) y partido de clasificación.
  function window(state, rng) {
    const p = state.player; if (!p) return null;
    const n = ensure(state), g = p.gender || 'men';
    const called = p.ovr >= threshold(p.nationality, g) && p.age >= 18;
    n.called = called;
    if (!called) return { called: false };
    const opp = rng.int(0, 1) ? 'a' : 'b', win = rng.float() < 0.55 + (str(p.nationality, g) - 70) * 0.01;
    const pts = Math.max(0, Math.round((p.ovr - 58) * 0.5 + rng.int(-3, 6)));
    n.caps++; n.points += pts; if (!n.debut) n.debut = state.year;
    state.inbox.push({ type: 'nationalWindow', week: state.week, detail: { win, pts, opp } });
    return { called: true, win, pts };
  }
  function teamsFor(kind, country, gender, rng) {
    const all = Object.keys(STRENGTH);
    let pool;
    if (kind === 'continental') pool = all.filter(c => contOf(c) === contOf(country));
    else pool = all.slice().sort((a, b) => str(b, gender) - str(a, gender) + (rng.float() - 0.5) * 6).slice(0, kind === 'games' ? 12 : 16);
    const n = kind === 'games' ? 12 : pool.length >= 16 ? 16 : pool.length >= 12 ? 12 : 8;
    pool = pool.sort((a, b) => str(b, gender) - str(a, gender)).slice(0, n);
    return pool;
  }
  function play(a, b, gender, rng, bonus) {
    const d = str(a, gender) + (bonus || 0) - str(b, gender) + (rng.float() - 0.5) * 10;
    const pa = 1 / (1 + Math.pow(10, -d / 14)), win = rng.float() < pa;
    const base = 74 + rng.int(-8, 10), margin = 2 + rng.int(0, 16);
    return win ? [base + margin, base] : [base, base + margin];
  }
  // Torneo completo: grupos de 4, mejores pasan a cuartos, semis, final y bronce.
  function runTournament(state, kind, country, gender, seed, mine) {
    const rng = RNG.create(seed);
    const teams = teamsFor(kind, country, gender, rng);
    if (!teams.includes(country)) return { kind, qualified: false, teams };
    const groups = [];
    for (let i = 0; i < teams.length; i++) (groups[i % Math.ceil(teams.length / 4)] = groups[i % Math.ceil(teams.length / 4)] || []).push(teams[i]);
    const p = state.player, bonus = c => (c === country && mine && p ? clamp((p.ovr - 70) * 0.25, -2, 4) : 0);
    const games = [], table = {};
    for (const g of groups) for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) {
      const s = play(g[i], g[j], gender, rng, bonus(g[i]) - bonus(g[j]));
      const w = s[0] > s[1] ? g[i] : g[j];
      for (const c of [g[i], g[j]]) table[c] = table[c] || { w: 0, d: 0, g: groups.indexOf(g) };
      table[w].w++; table[g[i]].d += s[0] - s[1]; table[g[j]].d += s[1] - s[0];
      if (g[i] === country || g[j] === country) games.push({ stage: 'group', a: g[i], b: g[j], score: s });
    }
    const rank = g => g.slice().sort((x, y) => table[y].w - table[x].w || table[y].d - table[x].d);
    const ranked = groups.map(rank);
    let qf = ranked.flatMap(r => r.slice(0, 2));
    if (qf.length < 8) qf = qf.concat(ranked.map(r => r[2]).filter(Boolean).sort((x, y) => table[y].w - table[x].w || table[y].d - table[x].d).slice(0, 8 - qf.length));
    qf = qf.slice(0, 8).sort((x, y) => str(y, gender) - str(x, gender));
    let place = 'group', round = qf.includes(country) ? 'qf' : null;
    const ko = (list, stage) => {
      const next = [], losers = [];
      for (let i = 0; i < list.length / 2; i++) {
        const a = list[i], b = list[list.length - 1 - i], s = play(a, b, gender, rng, bonus(a) - bonus(b));
        const w = s[0] > s[1] ? a : b; next.push(w); losers.push(w === a ? b : a);
        if (a === country || b === country) games.push({ stage, a, b, score: s });
      }
      return { next, losers };
    };
    const r1 = ko(qf, 'qf'); if (r1.losers.includes(country)) place = 'qf';
    const r2 = ko(r1.next, 'sf');
    const fin = ko(r2.next, 'final'), bronze = ko(r2.losers, 'bronze');
    if (fin.next.includes(country)) place = 'gold'; else if (fin.losers.includes(country)) place = 'silver';
    else if (bronze.next.includes(country)) place = 'bronze'; else if (bronze.losers.includes(country)) place = 'fourth';
    return { kind, qualified: true, round, place, champion: fin.next[0], games, teams };
  }
  // Verano: torneo del año para tu selección (si te convocan, juegas; si no, lo sigues por la tele).
  function summer(state, year) {
    const p = state.player; if (!p) return null;
    const n = ensure(state), g = p.gender || 'men';
    const kind = tournamentOf(year, g);
    if (!kind) return null;
    const mine = p.ovr >= threshold(p.nationality, g) && p.age >= 18 && !p.career.retired;
    const res = runTournament(state, kind, p.nationality, g, state.seed + ':nat:' + year, mine);
    const out = { year, kind, country: p.nationality, mine, qualified: res.qualified, place: res.place || null, champion: res.champion || null, games: res.games || [], pts: 0, gp: 0 };
    if (res.qualified && mine) {
      const rng = RNG.create(state.seed + ':natstats:' + year);
      for (const gm of out.games) { gm.myPts = Math.max(0, Math.round((p.ovr - 56) * 0.55 + rng.int(-4, 8))); out.pts += gm.myPts; out.gp++; }
      n.caps += out.gp; n.points += out.pts; if (!n.debut) n.debut = year;
      if (['gold', 'silver', 'bronze'].includes(res.place)) {
        n.medals.push({ year, kind, medal: res.place });
        const lc = state.life && state.life.counters; if (lc) { lc.medals = (lc.medals || 0) + 1; if (res.place === 'gold') lc.golds = (lc.golds || 0) + 1; }
        if (state.life) state.life.fame = Math.min(100, (state.life.fame || 0) + (res.place === 'gold' ? 12 : 6));
      }
    }
    n.tournaments.push({ year, kind, place: out.place, mine, qualified: out.qualified });
    if (n.tournaments.length > 20) n.tournaments.shift();
    n.last = out;
    state.inbox.push({ type: 'nationalSummer', week: 0, detail: { kind, place: out.place, mine, qualified: out.qualified } });
    return out;
  }
  function view(state) {
    const p = state.player; if (!p) return null;
    const n = ensure(state), g = p.gender || 'men';
    return { country: p.nationality, strength: str(p.nationality, g), threshold: threshold(p.nationality, g), eligible: p.ovr >= threshold(p.nationality, g), caps: n.caps, points: n.points,
      medals: n.medals.slice(), last: n.last, next: tournamentOf(state.year + 1, g), tournaments: n.tournaments.slice(-6), debut: n.debut };
  }
  CAA.National = { STRENGTH, tournamentOf, threshold, ensure, window, summer, runTournament, view };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.National;
})(typeof globalThis !== 'undefined' ? globalThis : this);
