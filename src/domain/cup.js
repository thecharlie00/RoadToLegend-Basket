(function (root) {
  'use strict';
  // Copa nacional (equivalente a ui-cups del fútbol): a mitad de liga, los ocho primeros juegan una
  // eliminatoria a partido único (cuartos, semifinales y final) en sede neutral durante un fin de semana.
  // No cuenta para la clasificación de la liga; el campeón levanta un título más.
  const CAA = root.CAA = root.CAA || {};
  function S() { return CAA.Season; }
  function M() { return CAA.Match; }
  function due(season) { return !season.cup && season.round === Math.floor(season.schedule.length / 2); }
  function play(season, seed, myClubId, myPlayerId) {
    const table = S().standings(season.clubs).slice(0, 8).map(r => r.id);
    const cup = { seeds: table.slice(), rounds: [], champion: null, runnerUp: null, mine: table.includes(myClubId) ? 'qf' : 'out', myPts: 0 };
    let alive = table.slice();
    for (const name of ['qf', 'sf', 'final']) {
      const games = [], next = [];
      for (let i = 0; i < alive.length / 2; i++) {
        const a = alive[i], b = alive[alive.length - 1 - i];
        const st = M().simulateMatch({ seed: seed + ':cup:' + name + ':' + i, ruleSetId: season.ruleSet, teams: [S().clubToMatchTeam(season.clubsById[a]), S().clubToMatchTeam(season.clubsById[b])], matchId: 'cup-' + name + '-' + i });
        const w = st.winner === 0 ? a : b;
        games.push({ a, b, score: st.score.slice(), winner: w });
        next.push(w);
        if ((a === myClubId || b === myClubId) && myPlayerId) {
          const side = a === myClubId ? 0 : 1, me = st.teams[side].players.find(p => p.id === myPlayerId);
          if (me && me.stats) cup.myPts += me.stats.pts;
        }
        if (a === myClubId || b === myClubId) cup.mine = w === myClubId ? (name === 'final' ? 'champion' : name === 'qf' ? 'sf' : 'final') : (name === 'final' ? 'runnerUp' : name);
      }
      cup.rounds.push({ name, games });
      alive = next;
    }
    const f = cup.rounds[2].games[0];
    cup.champion = f.winner; cup.runnerUp = f.winner === f.a ? f.b : f.a;
    cup.championName = season.clubsById[cup.champion].name;
    season.cup = cup;
    return cup;
  }
  CAA.Cup = { due, play };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Cup;
})(typeof globalThis !== 'undefined' ? globalThis : this);
