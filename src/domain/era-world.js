(function (root) {
  'use strict';
  // Mundo del Modo Épocas (paridad con eras-comps, eras-moments, eras-legends y el Anuario del fútbol):
  //  · Competiciones de época: cada copa existe solo los años en que existió y con su nombre de la época (Copa de
  //    Europa, Recopa, Korać, Ronchetti, Sudamericano de Clubes, Intercontinental…). Se clasifica por la liga.
  //  · Anuario: la historia real (campeones publicados) frente a la tuya, con las divergencias contadas.
  //  · Momentos de leyenda: tres por década, con objetivo principal y tres secundarios (4 estrellas).
  //  · Leyendas rivales: las estrellas ficticias de tu década recuerdan cada duelo contigo.
  //  · Álbum de la década: cromos con una forma concreta de ganarse cada uno (sin sobres ni azar de pago).
  //  · Mecánica de firma: límite de extranjeros en Europa hasta la ley Bosman (diciembre de 1995).
  // Campeones reales: Wikipedia (listas de campeones de la NBA, de la Liga Española, de la Copa de Europa/Euroliga,
  // de la WNBA y de la Euroliga Femenina), consultadas en noviembre de 2026. Por decisión del proyecto, los títulos de
  // clubes israelíes no se muestran. Los nombres de los clubes del juego son los actuales (no los de la época).
  const CAA = root.CAA = root.CAA || {};
  const req = (n, p) => CAA[n] || (typeof require === 'function' ? require(p) : null);
  const RNG = req('RNG', '../core/rng.js'), Eras = req('Eras', './eras.js');
  const S = () => CAA.Season, M = () => CAA.Match;

  const parse = s => Object.fromEntries(s.split('|').map(x => { const i = x.indexOf(':'); return [Number(x.slice(0, i)), x.slice(i + 1)]; }));
  const REAL = {
    'na-boreal-men': parse('1947:Philadelphia Warriors|1948:Baltimore Bullets|1949:Minneapolis Lakers|1950:Minneapolis Lakers|1951:Rochester Royals|1952:Minneapolis Lakers|1953:Minneapolis Lakers|1954:Minneapolis Lakers|1955:Syracuse Nationals|1956:Philadelphia Warriors|1957:Boston Celtics|1958:St. Louis Hawks|1959:Boston Celtics|1960:Boston Celtics|1961:Boston Celtics|1962:Boston Celtics|1963:Boston Celtics|1964:Boston Celtics|1965:Boston Celtics|1966:Boston Celtics|1967:Philadelphia 76ers|1968:Boston Celtics|1969:Boston Celtics|1970:New York Knicks|1971:Milwaukee Bucks|1972:Los Angeles Lakers|1973:New York Knicks|1974:Boston Celtics|1975:Golden State Warriors|1976:Boston Celtics|1977:Portland Trail Blazers|1978:Washington Bullets|1979:Seattle SuperSonics|1980:Los Angeles Lakers|1981:Boston Celtics|1982:Los Angeles Lakers|1983:Philadelphia 76ers|1984:Boston Celtics|1985:Los Angeles Lakers|1986:Boston Celtics|1987:Los Angeles Lakers|1988:Los Angeles Lakers|1989:Detroit Pistons|1990:Detroit Pistons|1991:Chicago Bulls|1992:Chicago Bulls|1993:Chicago Bulls|1994:Houston Rockets|1995:Houston Rockets|1996:Chicago Bulls|1997:Chicago Bulls|1998:Chicago Bulls|1999:San Antonio Spurs|2000:Los Angeles Lakers|2001:Los Angeles Lakers|2002:Los Angeles Lakers|2003:San Antonio Spurs|2004:Detroit Pistons|2005:San Antonio Spurs|2006:Miami Heat|2007:San Antonio Spurs|2008:Boston Celtics|2009:Los Angeles Lakers|2010:Los Angeles Lakers|2011:Dallas Mavericks|2012:Miami Heat|2013:Miami Heat|2014:San Antonio Spurs|2015:Golden State Warriors|2016:Cleveland Cavaliers|2017:Golden State Warriors|2018:Golden State Warriors|2019:Toronto Raptors|2020:Los Angeles Lakers|2021:Milwaukee Bucks|2022:Golden State Warriors|2023:Denver Nuggets|2024:Boston Celtics|2025:Oklahoma City Thunder|2026:New York Knicks'),
    'es-iberica-men': parse('1957:Real Madrid|1958:Real Madrid|1959:Barcelona|1960:Real Madrid|1961:Real Madrid|1962:Real Madrid|1963:Real Madrid|1964:Real Madrid|1965:Real Madrid|1966:Real Madrid|1967:Joventut Badalona|1968:Real Madrid|1969:Real Madrid|1970:Real Madrid|1971:Real Madrid|1972:Real Madrid|1973:Real Madrid|1974:Real Madrid|1975:Real Madrid|1976:Real Madrid|1977:Real Madrid|1978:Joventut Badalona|1979:Real Madrid|1980:Real Madrid|1981:Barcelona|1982:Real Madrid|1983:Barcelona|1984:Real Madrid|1985:Real Madrid|1986:Real Madrid|1987:Barcelona|1988:Barcelona|1989:Barcelona|1990:Barcelona|1991:Joventut Badalona|1992:Joventut Badalona|1993:Real Madrid|1994:Real Madrid|1995:Barcelona|1996:Barcelona|1997:Barcelona|1998:Manresa|1999:Barcelona|2000:Real Madrid|2001:Barcelona|2002:Baskonia|2003:Barcelona|2004:Barcelona|2005:Real Madrid|2006:Unicaja|2007:Real Madrid|2008:Baskonia|2009:Barcelona|2010:Baskonia|2011:Barcelona|2012:Barcelona|2013:Real Madrid|2014:Barcelona|2015:Real Madrid|2016:Real Madrid|2017:Valencia Basket|2018:Real Madrid|2019:Real Madrid|2020:Baskonia|2021:Barcelona|2022:Real Madrid|2023:Barcelona|2024:Real Madrid|2025:Real Madrid|2026:Valencia Basket'),
    'na-boreal-women': parse('1997:Houston Comets|1998:Houston Comets|1999:Houston Comets|2000:Houston Comets|2001:Los Angeles Sparks|2002:Los Angeles Sparks|2003:Detroit Shock|2004:Seattle Storm|2005:Sacramento Monarchs|2006:Detroit Shock|2007:Phoenix Mercury|2008:Detroit Shock|2009:Phoenix Mercury|2010:Seattle Storm|2011:Minnesota Lynx|2012:Indiana Fever|2013:Minnesota Lynx|2014:Phoenix Mercury|2015:Minnesota Lynx|2016:Los Angeles Sparks|2017:Minnesota Lynx|2018:Seattle Storm|2019:Washington Mystics|2020:Seattle Storm|2021:Chicago Sky|2022:Las Vegas Aces|2023:Las Vegas Aces|2024:New York Liberty|2025:Las Vegas Aces|2026:Golden State Valkyries'),
    // Copa de Europa / Euroliga (1958-2026); 2020 cancelada. Los años de clubes israelíes (1977, 1981, 2001, 2004,
    // 2005 y 2014) no se muestran.
    'eu-cup-m': parse('1958:Rīgas ASK|1959:Rīgas ASK|1960:Rīgas ASK|1961:CSKA Moscú|1962:Dinamo Tbilisi|1963:CSKA Moscú|1964:Real Madrid|1965:Real Madrid|1966:Simmenthal Milano|1967:Real Madrid|1968:Real Madrid|1969:CSKA Moscú|1970:Ignis Varese|1971:CSKA Moscú|1972:Ignis Varese|1973:Ignis Varese|1974:Real Madrid|1975:Ignis Varese|1976:Mobilgirgi Varese|1978:Real Madrid|1979:Bosna|1980:Real Madrid|1982:Squibb Cantù|1983:Ford Cantù|1984:Banco di Roma|1985:Cibona|1986:Cibona|1987:Tracer Milano|1988:Tracer Milano|1989:Jugoplastika|1990:Jugoplastika|1991:Pop 84 Split|1992:Partizan|1993:Limoges CSP|1994:7up Joventut|1995:Real Madrid|1996:Panathinaikos|1997:Olympiacos|1998:Kinder Bologna|1999:Žalgiris|2000:Panathinaikos|2002:Panathinaikos|2003:Barcelona|2006:CSKA Moscú|2007:Panathinaikos|2008:CSKA Moscú|2009:Panathinaikos|2010:Barcelona|2011:Panathinaikos|2012:Olympiacos|2013:Olympiacos|2015:Real Madrid|2016:CSKA Moscú|2017:Fenerbahçe|2018:Real Madrid|2019:CSKA Moscú|2021:Anadolu Efes|2022:Anadolu Efes|2023:Real Madrid|2024:Panathinaikos|2025:Fenerbahçe|2026:Olympiacos'),
    'eu-cup-f': parse('1959:Slavia Sofía|1960:Daugava Riga|1961:Daugava Riga|1962:Daugava Riga|1963:Slavia Sofía|1964:Daugava Riga|1965:Daugava Riga|1966:Daugava Riga|1967:Daugava Riga|1968:Daugava Riga|1969:Daugava Riga|1970:Daugava Riga|1971:Daugava Riga|1972:Daugava Riga|1973:Daugava Riga|1974:Daugava Riga|1975:Daugava Riga|1976:Sparta Praga|1977:Daugava Riga|1978:Sesto Geas|1979:Crvena Zvezda|1980:FIAT Torino|1981:Daugava Riga|1982:Daugava Riga|1983:Zolu Vicenza|1984:Levski Sofía|1985:Fiorella Vicenza|1986:Primigi Vicenza|1987:Primigi Vicenza|1988:Primigi Vicenza|1989:Jedinstvo Tuzla|1990:Enimont Priolo|1991:Conad Cesena|1992:Dorna Godella|1993:Dorna Godella|1994:Pool Comense|1995:Pool Comense|1996:Wuppertal|1997:Bourges|1998:Bourges|1999:Ružomberok|2000:Ružomberok|2001:Bourges|2002:Valenciennes|2003:UMMC Ekaterinburg|2004:Valenciennes|2005:Samara|2006:Gambrinus Brno|2007:Spartak Moscú Región|2008:Spartak Moscú Región|2009:Spartak Moscú Región|2010:Spartak Moscú Región|2011:Halcón Avenida|2012:Ros Casares Valencia|2013:UMMC Ekaterinburg|2014:Galatasaray|2015:USK Praga|2016:UMMC Ekaterinburg|2017:Dynamo Kursk|2018:UMMC Ekaterinburg|2019:UMMC Ekaterinburg|2021:UMMC Ekaterinburg|2022:Sopron Basket|2023:Fenerbahçe|2024:Fenerbahçe|2025:USK Praga|2026:Fenerbahçe')
  };
  // Linaje de franquicias: nombre histórico → club actual del juego (para comparar sin divergencias falsas).
  const LINEAGE = { 'Minneapolis Lakers': 'Los Angeles Lakers', 'Philadelphia Warriors': 'Golden State Warriors', 'San Francisco Warriors': 'Golden State Warriors', 'Syracuse Nationals': 'Philadelphia 76ers',
    'Rochester Royals': 'Sacramento Kings', 'St. Louis Hawks': 'Atlanta Hawks', 'Washington Bullets': 'Washington Wizards', 'Seattle SuperSonics': 'Oklahoma City Thunder', 'Barcelona': 'Barça', 'Manresa': 'BAXI Manresa',
    'Detroit Shock': 'Dallas Wings', 'San Antonio Silver Stars': 'Las Vegas Aces' };
  const lineage = n => LINEAGE[n] || n;
  const SOURCES = ['https://en.wikipedia.org/wiki/List_of_NBA_champions', 'https://en.wikipedia.org/wiki/List_of_Spanish_basketball_champions', 'https://en.wikipedia.org/wiki/FIBA_European_Champions_Cup_and_EuroLeague_history', 'https://en.wikipedia.org/wiki/WNBA_Finals', 'https://en.wikipedia.org/wiki/EuroLeague_Women'];

  // ---------- Competiciones de época ----------
  // Rango de años, región, género, cómo se clasifica (puestos de liga o campeón de copa) y nombre por años.
  const COMPS = [
    { id: 'euro-champions', region: 'EU', g: 'm', from: 1958, to: 2099, qualify: { ranks: [1, 1], ranksFrom: { 1992: [1, 2], 2001: [1, 3] } }, names: [[1958, 'comp.euroCup'], [1992, 'comp.euroLeague92'], [1997, 'comp.euroLeague']], realKey: 'eu-cup-m', tier: 1 },
    { id: 'cup-winners', region: 'EU', g: 'm', from: 1967, to: 2002, qualify: { cupWinner: true, ranks: [2, 2] }, names: [[1967, 'comp.cupWinners'], [1992, 'comp.euroCupFiba'], [1998, 'comp.saporta']], tier: 2 },
    { id: 'korac', region: 'EU', g: 'm', from: 1972, to: 2002, qualify: { ranks: [3, 4] }, names: [[1972, 'comp.korac']], tier: 3 },
    { id: 'eurocup', region: 'EU', g: 'm', from: 2003, to: 2099, qualify: { ranks: [4, 6] }, names: [[2003, 'comp.ulebCup'], [2009, 'comp.eurocup']], tier: 2 },
    { id: 'euro-champions-w', region: 'EU', g: 'f', from: 1959, to: 2099, qualify: { ranks: [1, 2] }, names: [[1959, 'comp.euroCupW'], [1996, 'comp.euroLeagueW']], realKey: 'eu-cup-f', tier: 1 },
    { id: 'ronchetti', region: 'EU', g: 'f', from: 1972, to: 2002, qualify: { ranks: [3, 4] }, names: [[1972, 'comp.ronchetti']], tier: 2 },
    { id: 'eurocup-w', region: 'EU', g: 'f', from: 2003, to: 2099, qualify: { ranks: [3, 5] }, names: [[2003, 'comp.eurocupW']], tier: 2 },
    { id: 'south-american', region: 'SA', g: 'm', from: 1946, to: 2007, qualify: { ranks: [1, 2] }, names: [[1946, 'comp.southAmerican']], tier: 1 },
    { id: 'americas-league', region: 'SA', g: 'm', from: 2008, to: 2019, qualify: { ranks: [1, 2] }, names: [[2008, 'comp.americasLeague']], tier: 1 },
    { id: 'bcl-americas', region: 'SA', g: 'm', from: 2020, to: 2099, qualify: { ranks: [1, 2] }, names: [[2020, 'comp.bclAmericas']], tier: 1 }
  ];
  // Copa Intercontinental FIBA: 1966-1987 y desde 2013, entre campeones continentales.
  const INTERCONTINENTAL = y => (y >= 1966 && y <= 1987) || y >= 2013;
  const EU = ['ES', 'IT', 'FR', 'DE', 'GR', 'TR', 'LT', 'RS', 'HR', 'PL', 'CZ', 'HU', 'BE', 'PT', 'NL', 'SI', 'ME', 'LV', 'BG', 'RU', 'UA', 'FI', 'SE', 'DK', 'AT', 'CH', 'GB', 'IE', 'NO', 'SK', 'RO', 'BA', 'MK', 'EE', 'CY', 'IS', 'LU', 'AL', 'GE', 'AM', 'AZ', 'BY', 'XK', 'MT'];
  const SA = ['AR', 'BR', 'UY', 'CL', 'PY', 'PE', 'BO', 'EC', 'CO', 'VE', 'MX', 'PR', 'DO', 'PA', 'CR', 'CU', 'GT', 'HN', 'NI', 'SV', 'JM', 'BS', 'TT'];
  const regionOf = L => EU.includes(L.country) ? 'EU' : SA.includes(L.country) ? 'SA' : null;
  const nameAt = (c, y) => c.names.filter(n => n[0] <= y).pop()[1];
  function compsFor(league, year) {
    const r = regionOf(league), g = league.gender === 'f' ? 'f' : 'm';
    return COMPS.filter(c => c.region === r && c.g === g && year >= c.from && year <= c.to).map(c => Object.assign({}, c, { nameKey: nameAt(c, year) }));
  }
  function ranksFor(c, year) { let r = c.qualify.ranks; for (const [y, v] of Object.entries(c.qualify.ranksFrom || {})) if (year >= Number(y)) r = v; return r; }
  function rivalsFor(state, league, c, n, rng) {
    const r = regionOf(league), g = league.gender;
    const ls = S().leagueList(g).filter(l => l.id !== league.id && regionOf(S().LEAGUES[l.id]) === r && (S().LEAGUES[l.id].level || 1) === 1 && (!Eras || Eras.available(S().LEAGUES[l.id], state.year)));
    const out = [];
    for (let i = 0; out.length < n && i < 40 && ls.length; i++) {
      const lid = ls[rng.int(0, ls.length - 1)].id, s = S().createSeason(lid, state.seed + ':era-comp:' + state.year + ':' + lid, null, { noReal: true });
      const pick = s.clubs[Math.min(s.clubs.length - 1, rng.int(0, c.tier === 1 ? 2 : 6))];
      if (!out.some(x => x.name === pick.name)) out.push(pick);
    }
    return out;
  }
  function game(state, a, b, tag) {
    const st = M().simulateMatch({ seed: state.seed + ':eracomp:' + state.year + ':' + tag, ruleSetId: state.season.ruleSet, teams: [S().clubToMatchTeam(a), S().clubToMatchTeam(b)], matchId: 'eracomp-' + tag });
    return { a: a.name, b: b.name, score: st.score.slice(), winnerId: st.winner === 0 ? a.id : b.id, st };
  }
  // Al acabar la temporada: competiciones de época en las que tu club se clasificó (cuadro de 8 a partido único).
  function continental(state, table) {
    if (!state.era || !state.clubId) return [];
    const league = S().LEAGUES[state.season.leagueId], me = state.season.clubsById[state.clubId];
    const rank = table.find(r => r.id === state.clubId).rank, cupWin = state.season.cup && state.season.cup.champion === state.clubId;
    const played = [];
    for (const c of compsFor(league, state.year)) {
      const [a, b] = ranksFor(c, state.year);
      const ok = (c.qualify.cupWinner && cupWin) || (rank >= a && rank <= b);
      if (!ok || played.some(p => p.tier === c.tier)) continue;
      const rng = RNG.create(state.seed + ':eracomp:' + c.id + ':' + state.year);
      const field = [me].concat(rivalsFor(state, league, c, 7, rng));
      if (field.length < 4) continue;
      while (field.length & (field.length - 1)) field.pop();
      let alive = field.slice(), round = 0, myStage = 'r' + field.length, mine = [];
      const rounds = [];
      while (alive.length > 1) {
        const next = [], games = [];
        for (let i = 0; i < alive.length; i += 2) {
          const g = game(state, alive[i], alive[i + 1], c.id + ':' + round + ':' + i);
          const w = g.winnerId === alive[i].id ? alive[i] : alive[i + 1];
          next.push(w); games.push({ a: g.a, b: g.b, score: g.score, mine: alive[i] === me || alive[i + 1] === me });
          if (alive[i] === me || alive[i + 1] === me) { mine.push(g); if (w === me) myStage = alive.length === 2 ? 'champion' : 'r' + alive.length / 2; else if (alive.length === 2) myStage = 'final'; }
        }
        rounds.push(games); alive = next; round++;
      }
      let pts = null;
      if (state.player) pts = mine.reduce((acc, g) => { const side = g.st.teams[0].players.some(p => p.id === state.player.id) ? 0 : 1, p = g.st.teams[side].players.find(q => q.id === state.player.id); return acc + (p && p.stats ? p.stats.pts : 0); }, 0);
      const real = c.realKey && REAL[c.realKey] ? REAL[c.realKey][state.year] || null : null;
      played.push({ id: c.id, nameKey: c.nameKey, tier: c.tier, year: state.year, stage: myStage, champion: alive[0].name, rounds, pts, real });
    }
    // Intercontinental: si ganas la gran copa de tu continente en un año en que se jugaba.
    const top = played.find(p => p.tier === 1 && p.stage === 'champion');
    if (top && INTERCONTINENTAL(state.year)) {
      const rng = RNG.create(state.seed + ':intercont:' + state.year), other = regionOf(league) === 'EU' ? 'SA' : 'EU';
      const ls = S().leagueList(league.gender).filter(l => regionOf(S().LEAGUES[l.id]) === other && (S().LEAGUES[l.id].level || 1) === 1);
      if (ls.length) {
        const s = S().createSeason(ls[rng.int(0, ls.length - 1)].id, state.seed + ':ic:' + state.year, null, { noReal: true }), opp = s.clubs[0];
        const g = game(state, me, opp, 'ic');
        played.push({ id: 'intercontinental', nameKey: 'comp.intercontinental', tier: 0, year: state.year, stage: g.winnerId === me.id ? 'champion' : 'final', champion: g.winnerId === me.id ? me.name : opp.name, rounds: [[{ a: g.a, b: g.b, score: g.score, mine: true }]], pts: null, real: null });
      }
    }
    if (played.length) {
      state.eraComps = (state.eraComps || []).concat(played);
      const life = state.life;
      for (const p of played) {
        state.inbox.push({ type: 'era-comp', week: state.week, detail: { comp: p.nameKey, stage: p.stage } });
        if (life && p.stage === 'champion') { life.counters.eraCups = (life.counters.eraCups || 0) + 1; life.style = (life.style || 0) + 6; }
      }
    }
    return played;
  }

  // ---------- Anuario ----------
  function annual(state, champName) {
    if (!state.era) return null;
    const lid = state.season.leagueId, real = REAL[lid] ? REAL[lid][state.year] : undefined;
    const L = S().LEAGUES[lid], euroKey = L.gender === 'f' ? 'eu-cup-f' : 'eu-cup-m';
    const comps = (state.eraComps || []).filter(c => c.year === state.year);
    const top = comps.find(c => c.tier === 1);
    const myClub = state.season.clubsById[state.clubId];
    const e = { year: state.year, leagueId: lid, club: myClub ? myClub.name : null, rank: (S().standings(state.season.clubs).find(r => r.id === state.clubId) || {}).rank || null,
      champion: champName, real: real === undefined ? null : real, euro: regionOf(L) === 'EU' ? { real: REAL[euroKey][state.year] || null, game: top ? top.champion : null } : null,
      won: state.season.champion === state.clubId };
    // Divergencia: la historia cambia cuando el campeón del juego no es el real (o cuando tú ganas un título que en la
    // realidad fue de otro).
    e.diverged = e.real != null && lineage(e.real) !== champName;
    e.rewritten = e.won && e.real != null && lineage(e.real) !== (myClub && myClub.name);
    state.annual = (state.annual || []).concat(e);
    if (e.rewritten) state.inbox.push({ type: 'era-rewrite', week: state.week, detail: { real: e.real, year: e.year } });
    return e;
  }

  // ---------- Leyendas rivales ----------
  // Recorre los partidos de la temporada y apunta cada duelo de tu club contra el club de una leyenda.
  function duels(state) {
    if (!state.era || !state.era.legends || !state.season) return;
    const byName = {}; for (const c of state.season.clubs) byName[c.name] = c.id;
    const rec = state.eraDuels = state.eraDuels || {};
    for (const lg of state.era.legends) {
      const cid = byName[lg.club]; if (!cid || cid === state.clubId) continue;
      const r = rec[lg.name] = rec[lg.name] || { w: 0, l: 0, seen: [], club: lg.club, decade: state.era.decade };
      for (const g of state.season.results || []) {
        const key = state.year + ':' + g.id;
        if (r.seen.includes(key)) continue;
        const mine = g.home === state.clubId ? 0 : g.away === state.clubId ? 1 : -1, theirs = g.home === cid ? 0 : g.away === cid ? 1 : -1;
        if (mine < 0 || theirs < 0) continue;
        r.seen.push(key); if (g.score[mine] > g.score[theirs]) r.w++; else r.l++;
        r.last = { year: state.year, score: [g.score[mine], g.score[theirs]] };
        if (r.seen.length > 80) r.seen.splice(0, r.seen.length - 80);
      }
    }
  }
  function nemesis(state) {
    const d = state.eraDuels || {}, legends = (state.era && state.era.legends) || [];
    let best = null;
    for (const lg of legends) { const r = d[lg.name]; if (r && (r.w + r.l) && (!best || r.w + r.l > best.r.w + best.r.l)) best = { lg, r }; }
    return best ? { name: best.lg.name, club: best.lg.club, nick: best.lg.nick, ovr: best.lg.ovr, w: best.r.w, l: best.r.l, last: best.r.last || null } : null;
  }

  // ---------- Momentos de leyenda ----------
  // Tres por década; cada uno tiene un objetivo principal y tres secundarios. Se juegan con las reglas del año contra
  // un rival histórico de la época (nombres de clubes actuales). Solo hechos de partido: nunca personas reales.
  const MOMENT_KINDS = [
    { id: 'final', goals: [{ k: 'win' }, { k: 'margin', n: 8 }, { k: 'oppUnder', n: 0.95 }, { k: 'mine', n: 14 }], boost: 2 },
    { id: 'comeback', goals: [{ k: 'win' }, { k: 'margin', n: 1 }, { k: 'mine', n: 18 }, { k: 'oppUnder', n: 1 }], boost: -4 },
    { id: 'upset', goals: [{ k: 'win' }, { k: 'oppUnder', n: 0.9 }, { k: 'margin', n: 5 }, { k: 'mine', n: 12 }], boost: -7 }
  ];
  const TACTICS = { run: { pace: 1.08, att: 3, def: -2 }, defense: { pace: 0.94, att: -1, def: 4 }, three: { pace: 1, att: 2, def: 0, three: 1 } };
  function momentsFor(state) {
    if (!state.era) return [];
    const dec = Eras.decadeOf(state.year), start = Number(dec.slice(0, 4));
    return MOMENT_KINDS.map((k, i) => ({ id: dec + '-' + k.id, decade: dec, kind: k.id, year: Math.max(state.era.start, start) + i * 3 - (start + i * 3 > 2026 ? 3 : 0), stars: (state.eraMoments || {})[dec + '-' + k.id] || 0 }));
  }
  function playMoment(state, id, tactic) {
    const m = momentsFor(state).find(x => x.id === id); if (!m) throw new Error('unknown moment');
    const kind = MOMENT_KINDS.find(k => k.id === m.kind), tac = TACTICS[tactic] || TACTICS.run;
    const me = state.season.clubsById[state.clubId], rng = RNG.create(state.seed + ':moment:' + id + ':' + ((state.eraMomentTries || 0)));
    state.eraMomentTries = (state.eraMomentTries || 0) + 1;
    // Rival: el mejor club de la liga (o el club de tu némesis) reforzado según el momento.
    const nem = nemesis(state), table = S().standings(state.season.clubs).filter(r => r.id !== state.clubId);
    const oppClub = (nem && state.season.clubs.find(c => c.name === nem.club)) || state.season.clubsById[table[0].id];
    const a = S().clubToMatchTeam(me), b = S().clubToMatchTeam(oppClub);
    const tune = (team, d) => { for (const p of team.players) { for (const k of Object.keys(p.attrs || {})) p.attrs[k] = Math.max(25, Math.min(99, p.attrs[k] + d)); } };
    tune(a, tac.att + (kind.boost > 0 ? kind.boost : 0)); tune(b, -kind.boost + tac.def * -0.5);
    const st = M().simulateMatch({ seed: state.seed + ':moment:' + id + ':' + rng.int(0, 1e6), ruleSetId: state.season.ruleSet, teams: [a, b], matchId: 'moment-' + id });
    const my = st.score[0], op = st.score[1], avgOpp = st.score[1] / Math.max(1, (st.score[0] + st.score[1]) / 2);
    const mine = state.player ? ((st.teams[0].players.find(p => p.id === state.player.id) || {}).stats || {}).pts || 0 : my / 5;
    const ok = kind.goals.map(g => g.k === 'win' ? my > op : g.k === 'margin' ? my - op >= g.n : g.k === 'oppUnder' ? avgOpp < g.n : g.k === 'mine' ? mine >= (state.player ? g.n : g.n * 1.2) : false);
    const stars = ok[0] ? ok.filter(Boolean).length : 0;
    state.eraMoments = state.eraMoments || {};
    const best = Math.max(state.eraMoments[id] || 0, stars); state.eraMoments[id] = best;
    if (stars > 0 && state.life) state.life.xp = (state.life.xp || 0) + stars * 5;
    return { id, kind: m.kind, year: m.year, opp: oppClub.name, score: [my, op], goals: kind.goals.map((g, i) => ({ k: g.k, n: g.n, ok: ok[i] })), stars, best, mine: state.player ? mine : null };
  }

  // ---------- Álbum de la década ----------
  // Cada cromo tiene una forma concreta de ganarse; los huecos muestran la pista.
  function album(state) {
    if (!state.era) return null;
    const dec = Eras.decadeOf(state.year), cards = [];
    const add = (id, ok, hint, extra) => cards.push(Object.assign({ id, ok: !!ok, hint }, extra || {}));
    const duelsRec = state.eraDuels || {};
    for (const lg of (state.era.legends || [])) add('legend:' + lg.name, duelsRec[lg.name] && (duelsRec[lg.name].w + duelsRec[lg.name].l) > 0, 'album.h.legend', { name: lg.name });
    for (const lg of (state.era.legends || [])) add('legendWin:' + lg.name, duelsRec[lg.name] && duelsRec[lg.name].w > 0, 'album.h.legendWin', { name: lg.name });
    for (const m of momentsFor(state)) { add('moment:' + m.id, m.stars >= 1, 'album.h.moment', { kind: m.kind }); add('momentStar:' + m.id, m.stars >= 4, 'album.h.momentStar', { kind: m.kind }); }
    const comps = (state.eraComps || []).filter(c => Eras.decadeOf(c.year) === dec);
    add('comp:played', comps.length, 'album.h.compPlayed'); add('comp:final', comps.some(c => c.stage === 'final' || c.stage === 'champion'), 'album.h.compFinal'); add('comp:win', comps.some(c => c.stage === 'champion'), 'album.h.compWin');
    const ann = (state.annual || []).filter(a => Eras.decadeOf(a.year) === dec);
    add('season:top4', ann.some(a => a.rank && a.rank <= 4), 'album.h.top4'); add('season:title', ann.some(a => a.won), 'album.h.title'); add('season:rewrite', ann.some(a => a.rewritten), 'album.h.rewrite');
    add('season:two', ann.length >= 2, 'album.h.two'); add('season:decade', ann.length >= 5, 'album.h.decade');
    return { decade: dec, cards, got: cards.filter(c => c.ok).length, total: cards.length };
  }

  // ---------- Mecánica de firma: límite de extranjeros (Europa, antes de la ley Bosman) ----------
  function foreignLimit(state) {
    if (!state.era || state.year >= 1996) return null;
    const L = S().LEAGUES[state.season.leagueId];
    if (regionOf(L) !== 'EU') return null;
    return state.year < 1980 ? 1 : 2;
  }
  function foreignCount(state, club) { const L = S().LEAGUES[state.season.leagueId]; return club.roster.filter(p => p.nationality !== L.country).length; }
  function canSignForeign(state, club, player) {
    const lim = foreignLimit(state); if (lim == null) return true;
    const L = S().LEAGUES[state.season.leagueId]; if (player.nationality === L.country) return true;
    return foreignCount(state, club) < lim + 1; // el cupo cuenta los extranjeros en plantilla (uno de margen para cubrir lesiones)
  }

  // ---------- Nombres de liga y de copa nacional según el año ----------
  // Fuentes: Wikipedia (Liga Española de Baloncesto 1957-1983 y Liga ACB; Copa del Rey de Baloncesto; Copa de la Reina
  // de Baloncesto; NBA/BAA). null = el nombre actual del juego. '@generic' = torneo sin nombre propio en esa época.
  const LEAGUE_NAMES = {
    'es-iberica-men': [[1957, 'Liga Nacional'], [1984, 'Liga ACB'], [2012, null]],
    'na-boreal-men': [[1946, 'BAA'], [1950, null]],
    'es-iberica-women': [[1964, 'Liga Femenina'], [2018, null]]
  };
  const CUP_NAMES = {
    'es-iberica-men': [[1933, 'Copa de España'], [1940, 'Copa del Generalísimo'], [1977, null]],
    'es-iberica-women': [[1943, 'Campeonato de España femenino'], [1978, null]],
    'na-boreal-men': [[1946, '@generic'], [2024, 'NBA In-Season Tournament'], [2025, null]],
    'na-boreal-women': [[1997, '@generic'], [2021, null]]
  };
  const at = (rows, y) => { if (!rows) return undefined; let v; for (const [from, name] of rows) if (y >= from) v = name; return v; };
  function leagueNameAt(leagueId, year) { const v = at(LEAGUE_NAMES[leagueId], year); return v === undefined || v === null ? null : v; }
  function cupNameAt(leagueId, year) { const v = at(CUP_NAMES[leagueId], year); return v === undefined || v === null ? null : v; }
  CAA.EraWorld = { LEAGUE_NAMES, CUP_NAMES, leagueNameAt, cupNameAt, REAL, SOURCES, LINEAGE, lineage, COMPS, compsFor, continental, annual, duels, nemesis, momentsFor, playMoment, album, foreignLimit, canSignForeign, regionOf, INTERCONTINENTAL, TACTICS };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.EraWorld;
})(typeof globalThis !== 'undefined' ? globalThis : this);
