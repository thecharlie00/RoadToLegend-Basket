(function (root) {
  'use strict';
  // «Mundo vivo» (adaptación de world45.js del fútbol):
  //  1) Torneo de verano: en pretemporada tu club juega un cuadrangular (semifinal y final o tercer puesto) contra
  //     clubes reales de otras ligas de su nivel.
  //  2) Copa juvenil: el jugador de 19 años o menos con pocos minutos la juega al final de la temporada; el míster ve a
  //     su cantera en la final y puede subir al mejor juvenil.
  //  3) Día de cierre del mercado (míster): la última semana con el mercado abierto llegan gangas con un reloj de
  //     18:00 a 24:00; lo que no se firme antes del cierre se pierde.
  // El play-off de ascenso ya existe en las segundas divisiones (playoffs.js, formato eu-promotion).
  const CAA = root.CAA = root.CAA || {};
  const req = (n, p) => CAA[n] || (typeof require === 'function' ? require(p) : null);
  const RNG = req('RNG', '../core/rng.js'), Player = req('Player', './player.js'), Contracts = req('Contracts', './contracts.js');
  const S = () => CAA.Season, M = () => CAA.Match;

  // ---------- 1) Torneo de verano ----------
  function summerRivals(state) {
    const L = S().LEAGUES[state.season.leagueId], rng = RNG.create(state.seed + ':summer-pick:' + state.year);
    const g = S().genderOf(state.season.leagueId);
    const real = S().leagueList().filter(l => (l.gender === g || S().genderOf(l.id) === g) && l.id !== state.season.leagueId && S().LEAGUES[l.id].realClubs);
    const same = real.filter(l => (S().LEAGUES[l.id].level || 1) === (L.level || 1));
    const pool = (same.length >= 2 ? same : real).slice();
    const picks = [];
    for (let i = 0; i < 2 && pool.length; i++) picks.push(pool.splice(rng.int(0, pool.length - 1), 1)[0].id);
    const out = [];
    const mine = state.season.clubs.filter(c => c.id !== state.clubId);
    out.push({ club: mine[rng.int(0, Math.min(5, mine.length - 1))], league: state.season.leagueId });
    for (const id of picks) { const s = S().createSeason(id, state.seed + ':summer:' + state.year + ':' + id, null, state.era ? { noReal: true } : undefined); out.push({ club: s.clubs[rng.int(0, Math.min(4, s.clubs.length - 1))], league: id }); }
    return out;
  }
  function game(state, a, b, tag) {
    const st = M().simulateMatch({ seed: state.seed + ':summer:' + state.year + ':' + tag, ruleSetId: state.season.ruleSet, teams: [S().clubToMatchTeam(a), S().clubToMatchTeam(b)], matchId: 'summer-' + tag });
    return { a: a.name, b: b.name, score: st.score.slice(), winner: st.winner === 0 ? a.name : b.name, aId: a.id, bId: b.id, st };
  }
  function summer(state) {
    if (!state.season || state.summerCup && state.summerCup.year === state.year) return state.summerCup;
    const me = state.season.clubsById[state.clubId]; if (!me) return null;
    const rivals = summerRivals(state); if (rivals.length < 3) return null;
    const sf1 = game(state, me, rivals[0].club, 'sf1'), sf2 = game(state, rivals[1].club, rivals[2].club, 'sf2');
    const won = sf1.winner === me.name;
    const finalists = [won ? me : rivals[0].club, sf2.winner === rivals[1].club.name ? rivals[1].club : rivals[2].club];
    const losers = [won ? rivals[0].club : me, sf2.winner === rivals[1].club.name ? rivals[2].club : rivals[1].club];
    const fin = game(state, finalists[0], finalists[1], 'final'), third = game(state, losers[0], losers[1], 'third');
    const place = won ? (fin.winner === me.name ? 1 : 2) : (third.winner === me.name ? 3 : 4);
    let pts = null;
    if (state.player) { const g = [sf1, won ? fin : third]; pts = g.reduce((a, x) => { const side = x.aId === me.id ? 0 : 1, p = x.st.teams[side].players.find(q => q.id === state.player.id); return a + (p && p.stats ? p.stats.pts : 0); }, 0); }
    const strip = x => ({ a: x.a, b: x.b, score: x.score, winner: x.winner });
    state.summerCup = { year: state.year, teams: [me.name].concat(rivals.map(r => r.club.name)), leagues: rivals.map(r => r.league), games: [strip(sf1), strip(sf2), strip(third), strip(fin)], place, pts, seen: false };
    if (place === 1) { const life = state.life; if (life) { life.counters.summerCups = (life.counters.summerCups || 0) + 1; life.style += 5; } }
    state.inbox.push({ type: 'summer-cup', week: state.week, detail: { place, club: fin.winner } });
    return state.summerCup;
  }

  // ---------- 2) Copa juvenil ----------
  function youth(state, rng) {
    const out = { year: state.year, played: false };
    if (state.player && state.player.age <= 19) {
      const st = state.player.stats || {}, avgMin = st.gp ? (st.min || 0) / st.gp : 0;
      if (avgMin < 18) {
        const rounds = ['sf', 'final'], my = state.player;
        let alive = true, pts = 0, stage = 'sf';
        for (const r of rounds) {
          if (!alive) break;
          const myPts = Math.max(2, Math.round((my.ovr - 40) * 0.55 + rng.float() * 14));
          pts += myPts;
          const p = 0.42 + (my.ovr - 55) * 0.012 + rng.float() * 0.25;
          if (rng.float() < Math.min(0.85, p)) stage = r === 'final' ? 'champion' : 'final'; else { alive = false; stage = r === 'final' ? 'runnerUp' : 'sf'; }
        }
        Object.assign(out, { played: true, kind: 'player', stage, pts });
        my.potential = Math.min(99, my.potential + (stage === 'champion' ? 2 : 1));
        if (state.life) { state.life.xp = (state.life.xp || 0) + 10; if (stage === 'champion') state.life.counters.youthCups = (state.life.counters.youthCups || 0) + 1; }
      }
    } else if (state.mode === 'coach' && state.clubId) {
      const club = state.season.clubsById[state.clubId];
      const win = rng.float() < 0.45;
      const prospect = Player.createPlayer({ seed: state.seed + ':youth:' + state.year, age: 17, quality: 45 + rng.int(0, 10), pos: rng.pick(['PG', 'SG', 'SF', 'PF', 'C']), nationality: (S().LEAGUES[state.season.leagueId].pool || ['ES'])[0], gender: S().genderOf(state.season.leagueId) });
      prospect.potential = Math.min(95, prospect.potential + (win ? 8 : 4));
      Object.assign(out, { played: true, kind: 'coach', stage: win ? 'champion' : 'runnerUp', prospect: { id: prospect.id, name: prospect.name, pos: prospect.pos, ovr: prospect.ovr, potential: prospect.potential } });
      state.academy = { prospect, year: state.year };
      void club;
    }
    if (out.played) state.inbox.push({ type: 'youth-cup', week: state.week, detail: { stage: out.stage } });
    state.youthCup = out;
    return out;
  }
  function promoteProspect(state) {
    const a = state.academy; if (!a || !a.prospect) throw new Error('no prospect');
    const club = state.season.clubsById[state.clubId];
    if (club.roster.length >= 15) throw new Error('roster full');
    const p = a.prospect; p.contract = Contracts.offerForPlayer(p, club, RNG.create(state.seed + ':prospect'), Contracts.NA_ECONOMY_2026_27);
    club.roster.push(p); state.academy = null;
    state.inbox.push({ type: 'signed', week: state.week, detail: { club: p.name, fee: 0 } });
    return p;
  }

  // ---------- 3) Día de cierre del mercado (míster) ----------
  function deadlineWeek(state) { const s = state.season; return !s.playoffs && s.round === Math.floor(s.schedule.length * 0.6); }
  function deadline(state) {
    if (state.mode !== 'coach' || !CAA.Market || !deadlineWeek(state)) return null;
    if (state.deadline && state.deadline.key === state.year + ':' + state.week) return state.deadline;
    const list = CAA.Market.list(state).slice(0, 4);
    // Gangas: traspaso rebajado y una hora de llegada en el reloj (18:00-23:30).
    const offers = list.map((x, i) => ({ id: x.id, name: x.player.name, pos: x.player.pos, ovr: x.player.ovr, age: x.player.age, nat: x.player.nationality, salary: x.player.contract.salary, fee: Math.round(x.fee * 0.55), at: 18 * 60 + 40 + i * 75 }));
    state.deadline = { key: state.year + ':' + state.week, offers, signed: [] };
    return state.deadline;
  }
  function deadlineSign(state, id) {
    const d = deadline(state); if (!d) throw new Error('not deadline day');
    const o = d.offers.find(x => x.id === id); if (!o) throw new Error('not available');
    if (d.signed.includes(id)) throw new Error('already signed');
    const club = state.season.clubsById[state.clubId], fin = state.clubFin;
    if (club.roster.length >= 15) throw new Error('roster full');
    if (fin.cash < o.fee) throw new Error('not enough cash');
    const it = CAA.Market.list(state).find(x => x.id === id);
    if (CAA.EraWorld && !CAA.EraWorld.canSignForeign(state, club, it.player)) throw new Error('foreign limit');
    fin.cash -= o.fee; club.roster.push(it.player); d.signed.push(id);
    state.inbox.push({ type: 'signed', week: state.week, detail: { club: o.name, fee: o.fee } });
    return o;
  }
  CAA.LiveWorld = { summer, summerRivals, youth, promoteProspect, deadline, deadlineWeek, deadlineSign };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.LiveWorld;
})(typeof globalThis !== 'undefined' ? globalThis : this);
