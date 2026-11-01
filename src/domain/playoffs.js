(function (root) {
  'use strict';
  // Playoffs y premios (paridad con world45/play-offs del fútbol, adaptado a baloncesto).
  // Liga Boreal: dos conferencias, play-in (7-8, 9-10 y repesca) y series al mejor de 7.
  // Liga Ibérica (élite): top 8, cuartos al mejor de 3, semifinales y final al mejor de 5.
  // Ascenso Ibérico: el 1.º sube directo; del 2.º al 9.º, playoff de ascenso al mejor de 3.
  // Se juega un partido de cada serie por semana; las series y los premios son deterministas.
  const CAA = root.CAA = root.CAA || {};
  const Match = CAA.Match || (typeof require === 'function' ? require('../match/engine.js') : null);
  const Hash = CAA.Hash || (typeof require === 'function' ? require('../core/hash.js') : null);
  let Season = null;
  const S = () => Season || (Season = CAA.Season || require('./season.js'));

  const EAST = [1, 2, 3, 7, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28];
  function conferenceOf(club) { const n = Number(String(club.id).split('-').pop()); return EAST.includes(n) ? 'east' : 'west'; }
  function homeOrder(bestOf) { return bestOf === 7 ? [1, 1, 0, 0, 1, 0, 1] : bestOf === 5 ? [1, 1, 0, 0, 1] : bestOf === 3 ? [1, 0, 1] : [1]; }
  function series(id, a, b, bestOf, extra) { return Object.assign({ id, a, b, bestOf, winsA: 0, winsB: 0, games: [], winner: null, loser: null }, extra || {}); }

  function create(season) {
    const league = S().LEAGUES[season.leagueId];
    const table = S().standings(season.clubs);
    const b = { leagueId: season.leagueId, format: league.format || (league.level === 1 ? 'eu-top' : 'eu-promotion'), rounds: [], champion: null, runnerUp: null, promoted: [], seeds: {}, done: false, step: 0 };
    if (b.format === 'na') {
      const confs = { east: [], west: [] };
      for (const r of table) confs[conferenceOf(season.clubsById[r.id])].push(r.id);
      b.seeds = confs;
      const pi = [];
      for (const c of ['east', 'west']) { const t = confs[c]; pi.push(series(c + '-pi-78', t[6], t[7], 1, { conf: c, tag: '78' }), series(c + '-pi-910', t[8], t[9], 1, { conf: c, tag: '910' })); }
      b.rounds.push({ name: 'playin1', series: pi });
    } else if (b.format === 'eu-top') {
      const t = table.slice(0, 8).map(r => r.id); b.seeds = { all: t };
      b.rounds.push({ name: 'qf', series: [[0, 7], [3, 4], [1, 6], [2, 5]].map(([x, y], i) => series('qf' + i, t[x], t[y], 3)) });
    } else {
      b.promoted = [table[0].id];
      const t = table.slice(1, 9).map(r => r.id); b.seeds = { all: t };
      b.rounds.push({ name: 'qf', series: [[0, 7], [3, 4], [1, 6], [2, 5]].map(([x, y], i) => series('qf' + i, t[x], t[y], 3)) });
    }
    return b;
  }
  function current(b) { return b.rounds[b.rounds.length - 1]; }
  function nextRound(b) {
    const cur = current(b), win = id => cur.series.find(x => x.id === id).winner, lose = id => cur.series.find(x => x.id === id).loser;
    if (b.format === 'na') {
      if (cur.name === 'playin1') { b.rounds.push({ name: 'playin2', series: ['east', 'west'].map(c => series(c + '-pi-8', lose(c + '-pi-78'), win(c + '-pi-910'), 1, { conf: c })) }); return; }
      if (cur.name === 'playin2') {
        const r1 = [];
        for (const c of ['east', 'west']) {
          const t = b.seeds[c].slice(0, 6).concat([b.rounds[0].series.find(x => x.id === c + '-pi-78').winner, win(c + '-pi-8')]);
          b.seeds[c + 'Final'] = t;
          [[0, 7], [3, 4], [1, 6], [2, 5]].forEach(([x, y], i) => r1.push(series(c + '-r1-' + i, t[x], t[y], 7, { conf: c })));
        }
        b.rounds.push({ name: 'r1', series: r1 }); return;
      }
      if (cur.name === 'r1' || cur.name === 'r2') {
        const nx = cur.name === 'r1' ? 'r2' : 'cf', out = [];
        for (const c of ['east', 'west']) { const s = cur.series.filter(x => x.conf === c); for (let i = 0; i < s.length; i += 2) out.push(series(c + '-' + nx + '-' + i / 2, s[i].winner, s[i + 1].winner, 7, { conf: c })); }
        b.rounds.push({ name: nx, series: out }); return;
      }
      if (cur.name === 'cf') { b.rounds.push({ name: 'final', series: [series('final', cur.series[0].winner, cur.series[1].winner, 7)] }); return; }
    } else {
      const bo = b.format === 'eu-top' ? 5 : 3;
      if (cur.name === 'qf') { b.rounds.push({ name: 'sf', series: [series('sf0', cur.series[0].winner, cur.series[1].winner, bo), series('sf1', cur.series[2].winner, cur.series[3].winner, bo)] }); return; }
      if (cur.name === 'sf') { b.rounds.push({ name: 'final', series: [series('final', cur.series[0].winner, cur.series[1].winner, bo)] }); return; }
    }
  }
  // Partidos de la semana: el siguiente de cada serie viva de la ronda actual.
  function pending(b) {
    if (b.done) return [];
    return current(b).series.filter(s => !s.winner).map(s => {
      const n = s.games.length, aHome = homeOrder(s.bestOf)[n] === 1;
      return { id: b.leagueId + ':po:' + s.id + ':g' + (n + 1), seriesId: s.id, home: aHome ? s.a : s.b, away: aHome ? s.b : s.a };
    });
  }
  function seedOf(b, seed, g) { return seed + ':' + g.id; }
  function playStep(season, seed, overrides) {
    const b = season.playoffs; if (!b || b.done) return [];
    const games = pending(b), states = [];
    for (const g of games) {
      const s = current(b).series.find(x => x.id === g.seriesId);
      let st = overrides && overrides[g.id];
      if (!st) {
        const teams = [S().clubToMatchTeam(season.clubsById[g.home]), S().clubToMatchTeam(season.clubsById[g.away])];
        st = Match.simulateMatch({ seed: seedOf(b, seed, g), ruleSetId: season.ruleSet, teams, matchId: g.id });
      }
      if (!st.final || st.teams[0].id !== g.home || st.teams[1].id !== g.away) throw new Error('playoff result does not fit ' + g.id);
      const homeWon = st.score[0] > st.score[1];
      const winner = homeWon ? g.home : g.away;
      if (winner === s.a) s.winsA++; else s.winsB++;
      s.games.push({ id: g.id, home: g.home, away: g.away, score: st.score.slice(), hash: st.hash });
      const need = Math.ceil(s.bestOf / 2);
      if (s.winsA >= need || s.winsB >= need) { s.winner = s.winsA >= need ? s.a : s.b; s.loser = s.winner === s.a ? s.b : s.a; }
      for (let ti = 0; ti < 2; ti++) {
        const club = season.clubsById[ti ? g.away : g.home];
        for (const mp of st.teams[ti].players) {
          const p = club.roster.find(x => x.id === mp.id); if (!p) continue;
          if (p.career) { const tt = p.career.totals || (p.career.totals = { gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 }); tt.gp++; tt.pts += mp.stats.pts; tt.reb += mp.stats.orb + mp.stats.drb; tt.ast += mp.stats.ast; tt.stl += mp.stats.stl; tt.blk += mp.stats.blk; }
          const po = p.playoff || (p.playoff = { year: season.season, gp: 0, pts: 0, finalPts: 0 });
          if (po.year !== season.season) Object.assign(po, { year: season.season, gp: 0, pts: 0, finalPts: 0 });
          po.gp++; po.pts += mp.stats.pts; if (current(b).name === 'final') po.finalPts += mp.stats.pts;
          p.load = Math.min(100, (p.load || 0) + mp.stats.min * 0.8);
        }
      }
      states.push(st);
    }
    b.step++;
    if (current(b).series.every(s => s.winner)) {
      if (current(b).name === 'final') {
        const f = current(b).series[0]; b.champion = f.winner; b.runnerUp = f.loser; b.done = true;
        if (b.format === 'eu-promotion') b.promoted.push(f.winner);
      } else nextRound(b);
    }
    return states;
  }
  function playAll(season, seed) { let guard = 0; while (season.playoffs && !season.playoffs.done && guard++ < 60) playStep(season, seed); return season.playoffs; }
  // Hasta dónde llegó un club: 'champion', 'final', 'sf'/'cf', 'r2', 'qf'/'r1', 'playin', 'missed'.
  function resultOf(b, clubId) {
    if (!b) return null;
    if (b.champion === clubId) return 'champion';
    let last = null;
    for (const r of b.rounds) if (r.series.some(s => s.a === clubId || s.b === clubId)) last = r.name;
    if (!last) return 'missed';
    if (last === 'playin1' || last === 'playin2') return 'playin';
    return last;
  }
  function seriesOf(b, clubId) {
    if (!b || b.done) return null;
    const s = current(b).series.find(x => !x.winner && (x.a === clubId || x.b === clubId));
    return s ? { round: current(b).name, id: s.id, opponent: s.a === clubId ? s.b : s.a, wins: s.a === clubId ? s.winsA : s.winsB, losses: s.a === clubId ? s.winsB : s.winsA, bestOf: s.bestOf } : null;
  }

  // Estado del club: 'playing' | 'waiting' (clasificado esperando rival) | 'eliminated' | 'promoted' | 'missed' | 'champion'.
  function status(b, clubId) {
    if (!b) return null;
    if (b.champion === clubId) return 'champion';
    if (seriesOf(b, clubId)) return 'playing';
    const rounds = b.rounds.filter(r => r.series.some(s => s.a === clubId || s.b === clubId));
    if (rounds.length) { const last = rounds[rounds.length - 1].series.find(s => s.a === clubId || s.b === clubId); return last.winner === clubId && !b.done ? 'waiting' : 'eliminated'; }
    if (b.format === 'na' && !b.done && ['east', 'west'].some(c => b.seeds[c].indexOf(clubId) >= 0 && b.seeds[c].indexOf(clubId) < 6)) return 'waiting';
    if (b.promoted.includes(clubId)) return 'promoted';
    return 'missed';
  }
  // ===== Premios de la temporada regular (+ MVP de la final) =====
  function rating(p) { const g = Math.max(1, p.stats.gp); return p.stats.pts / g + 1.2 * p.stats.reb / g + 1.5 * p.stats.ast / g + 2 * (p.stats.stl + p.stats.blk) / g; }
  function awards(season, rounds) {
    const pool = [];
    for (const c of season.clubs) {
      const gp = c.wins + c.losses, pct = gp ? c.wins / gp : 0.5;
      c.roster.forEach((p, i) => { if (p.stats && p.stats.gp >= Math.max(5, rounds * 0.5)) pool.push({ p, club: c, pct, bench: i >= 5 }); });
    }
    if (!pool.length) return [];
    const best = (score, filter) => { const list = pool.filter(filter || (() => true)).map(x => Object.assign({ s: score(x) }, x)).sort((a, b) => b.s - a.s || a.p.id.localeCompare(b.p.id)); return list[0] || null; };
    const pick = (award, x) => x ? { award, playerId: x.p.id, player: x.p.name, clubId: x.club.id, club: x.club.name } : null;
    const out = [
      pick('mvp', best(x => rating(x.p) * (0.75 + x.pct * 0.5))),
      pick('dpoy', best(x => (x.p.stats.stl + x.p.stats.blk) / Math.max(1, x.p.stats.gp) * 3 + x.p.stats.reb / Math.max(1, x.p.stats.gp) * 0.4 + ((x.p.attrs.defExterior + x.p.attrs.defInterior) / 2 - 50) * 0.08)),
      pick('roy', best(x => rating(x.p), x => x.p.age <= 21 || (x.p.career && x.p.career.seasons === 0 && x.p.age <= 23))),
      pick('sixth', best(x => x.p.stats.pts / Math.max(1, x.p.stats.gp), x => x.bench)),
      pick('mip', best(x => (x.p.ovr - (x.p.ovrStart == null ? x.p.ovr : x.p.ovrStart)) * 3 + rating(x.p) * 0.1, x => x.p.ovrStart != null))
    ].filter(Boolean);
    const team = pool.map(x => Object.assign({ s: rating(x.p) * (0.85 + x.pct * 0.3) }, x)).sort((a, b) => b.s - a.s || a.p.id.localeCompare(b.p.id)).slice(0, 5);
    for (const x of team) out.push(pick('allLeague', x));
    return out;
  }
  function finalsMvp(season) {
    const b = season.playoffs; if (!b || !b.champion) return null;
    const club = season.clubsById[b.champion];
    const x = club.roster.slice().filter(p => p.playoff && p.playoff.year === season.season).sort((a, c) => c.playoff.finalPts - a.playoff.finalPts || a.id.localeCompare(c.id))[0];
    return x ? { award: 'finalsMvp', playerId: x.id, player: x.name, clubId: club.id, club: club.name } : null;
  }
  function hash(b) { return Hash.hex32(Hash.hashObject(b)); }

  CAA.Playoffs = { create, pending, playStep, playAll, resultOf, seriesOf, status, awards, finalsMvp, conferenceOf, current, hash };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Playoffs;
})(typeof globalThis !== 'undefined' ? globalThis : this);
