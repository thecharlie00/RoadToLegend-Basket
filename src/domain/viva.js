(function (root) {
  'use strict';
  // Temporada Viva (paridad con season-viva.js del fútbol):
  //  · Foco de jornada: la acción que conviene hacer ahora, con su motivo, sin bloquear «Avanzar».
  //  · Crónicas: dos puntos de giro por temporada (mitad y tramo decisivo) y la temporada en tres
  //    momentos al cerrarla. Todo sale de la propia partida: sin azar nuevo ni hechos externos.
  const CAA = root.CAA = root.CAA || {};
  const MAX_CHRONICLES = 40;

  function ensure(state) {
    let v = state.viva;
    if (!v || v.v !== 1 || !Array.isArray(v.marks)) v = state.viva = { v: 1, y: state.year, marks: [], seen: [] };
    if (v.y !== state.year) { v.y = state.year; v.marks = []; v.seen = []; }
    if (!v.marks.length) v.marks.push(snapshot(state, 0));
    return v;
  }
  function myClub(state) { return state.season.clubsById[state.clubId] || (state.topSeason && state.topSeason.clubsById[state.clubId]) || { wins: 0, losses: 0, roster: [] }; }
  function snapshot(state, round) {
    const c = myClub(state), st = state.player && state.player.stats ? state.player.stats : null;
    return { r: round, w: c.wins || 0, l: c.losses || 0, gp: st ? st.gp : 0, pts: st ? st.pts : 0, reb: st ? st.reb : 0, ast: st ? st.ast : 0 };
  }
  function rankOf(state) {
    const clubs = state.season.clubs.slice().sort((a, b) => b.wins - a.wins || (b.pf - b.pa) - (a.pf - a.pa) || a.id.localeCompare(b.id));
    return clubs.findIndex(c => c.id === state.clubId) + 1;
  }
  function push(state, entry) {
    const life = state.life || (state.life = {});
    const list = life.chronicles = Array.isArray(life.chronicles) ? life.chronicles : [];
    list.push(Object.assign({ id: state.year + ':' + entry.kind + ':' + (entry.n || 0), year: state.year, week: state.week, seen: false }, entry));
    if (list.length > MAX_CHRONICLES) list.splice(0, list.length - MAX_CHRONICLES);
  }
  // Tras cada jornada de liga: a mitad de curso y al entrar en el tramo decisivo, una crónica del tramo.
  function afterWeek(state) {
    if (!state.season || state.season.playoffs) return;
    const v = ensure(state), len = state.season.schedule.length, r = state.season.round;
    [[1, Math.floor(len / 2)], [2, Math.floor(len * 3 / 4)]].forEach(([n, at]) => {
      const key = 'block' + n;
      if (r !== at || at <= 0 || v.seen.includes(key)) return;
      const prev = v.marks[v.marks.length - 1], cur = snapshot(state, r);
      const w = cur.w - prev.w, l = cur.l - prev.l, gp = cur.gp - prev.gp;
      const entry = { kind: 'block', n, w, l, rank: rankOf(state), teams: state.season.clubs.length, tone: w > l ? 'good' : l > w ? 'hard' : 'open' };
      if (state.player) Object.assign(entry, { gp, ppg: gp ? Math.round((cur.pts - prev.pts) / gp * 10) / 10 : 0, rpg: gp ? Math.round((cur.reb - prev.reb) / gp * 10) / 10 : 0, apg: gp ? Math.round((cur.ast - prev.ast) / gp * 10) / 10 : 0 });
      push(state, entry);
      v.seen.push(key); v.marks.push(cur);
    });
  }
  // Al cerrar la temporada: logro personal, giro de la competición y una historia de la partida.
  function seasonEnd(state, sum, extra = {}) {
    if (!sum) return;
    const v = ensure(state);
    if (v.seen.includes('season')) return;
    const moments = [];
    if (sum.stats && sum.stats.gp) {
      const g = sum.stats.gp;
      moments.push({ k: 'personal', key: 'player', ppg: Math.round(sum.stats.pts / g * 10) / 10, rpg: Math.round(sum.stats.reb / g * 10) / 10, apg: Math.round(sum.stats.ast / g * 10) / 10, gp: g, high: extra.high || 0 });
    } else if (state.player) moments.push({ k: 'personal', key: 'noGames' });
    else moments.push({ k: 'personal', key: 'coach', wins: sum.record.wins, losses: sum.record.losses });
    moments.push({ k: 'competition', key: sum.myChampion ? 'champion' : sum.promoted ? 'promoted' : 'rank', rank: sum.rank, teams: sum.teams, result: sum.result || 'none', champion: sum.champion });
    const award = (sum.awards || []).find(a => a.mine);
    if (award) moments.push({ k: 'story', key: 'award', award: award.award });
    else if (extra.rival) moments.push({ k: 'story', key: 'rival', rival: extra.rival.name, w: extra.rival.w, l: extra.rival.l });
    else if (extra.jm && extra.jm.plays) moments.push({ k: 'story', key: 'jm', plays: extra.jm.plays, made: extra.jm.made });
    else moments.push({ k: 'story', key: 'open' });
    push(state, { kind: 'season', moments });
    v.seen.push('season');
  }
  // Foco de jornada: una sola acción prioritaria y su motivo.
  function focus(state, ctx = {}) {
    if (!state.season || state.retirement || state.careerOver || ctx.event || ctx.live) return null;
    const c = myClub(state);
    if (state.player && state.player.injury && state.player.injury.weeksRemaining > 0) return { key: 'injury', weeks: state.player.injury.weeksRemaining, tab: 'life' };
    if (state.coach) {
      const out = (c.roster || []).filter(p => p.injury && p.injury.weeksRemaining > 0 && p.starter !== false).slice(0, 5);
      const starters = ctx.starters || [];
      const hurt = out.filter(p => starters.includes(p.id));
      if (hurt.length) return { key: 'lineup', n: hurt.length, names: hurt.map(p => p.name).slice(0, 2), tab: 'life' };
    }
    if (ctx.next && ctx.next.opponent) {
      const o = state.season.clubsById[ctx.next.opponent.id] || {};
      return { key: ctx.playoffs ? 'series' : 'next', opponent: ctx.next.opponent.name, w: o.wins || 0, l: o.losses || 0, home: !!ctx.next.home, streak: c.streak || 0, tab: 'league' };
    }
    return { key: 'season', tab: 'league' };
  }
  function latest(state) {
    const list = state.life && state.life.chronicles;
    if (!list || !list.length) return null;
    const last = list[list.length - 1];
    return last.seen ? null : last;
  }
  function markSeen(state) { const l = latest(state); if (l) l.seen = true; return l; }

  CAA.Viva = { ensure, afterWeek, seasonEnd, focus, latest, markSeen };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Viva;
})(typeof globalThis !== 'undefined' ? globalThis : this);
