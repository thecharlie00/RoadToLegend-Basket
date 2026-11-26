(function (root) {
  'use strict';
  // Libro de estadísticas de la carrera (lo que más piden los jugadores de estos juegos):
  //  · partido a partido de la temporada (tu línea en cada partido, o la del equipo si entrenas);
  //  · mapa de tiro por zonas de la temporada y de toda la carrera;
  //  · progresión temporada a temporada (media, puntos, rebotes y asistencias).
  // Todo sale de los partidos ya jugados: no añade azar ni cambia resultados.
  const CAA = root.CAA = root.CAA || {};
  const ZONES = ['restricted', 'paint', 'midShort', 'midLong', 'corner3', 'above3'];
  const MAX_LOG = 100;

  function book(state) {
    const life = state.life || (state.life = {});
    let b = life.book;
    if (!b || b.v !== 1) b = life.book = { v: 1, y: state.year, log: [], zones: {}, careerZones: {}, seasons: [] };
    if (b.y !== state.year) { b.y = state.year; b.log = []; b.zones = {}; }
    return b;
  }
  const add = (map, z, made) => { const r = map[z] || (map[z] = [0, 0]); r[1]++; if (made) r[0]++; };
  // Tras cada jornada, con el partido de tu club (estado completo del motor).
  function track(state, mine) {
    if (!mine) return null;
    const b = book(state), me = mine.teams.findIndex(t => t.id === state.clubId);
    if (me < 0) return null;
    const opp = mine.teams[1 - me], us = mine.teams[me], won = mine.winner === me;
    const entry = { y: state.year, w: state.week, opp: opp.name, home: me === 0, won, score: [mine.score[me], mine.score[1 - me]], po: !!(state.season && state.season.playoffs) };
    const pid = state.player ? state.player.id : null;
    if (pid) {
      const p = us.players.find(x => x.id === pid);
      if (!p || !p.stats || !p.stats.min) entry.dnp = true;
      else {
        const s = p.stats;
        Object.assign(entry, { min: Math.round(s.min), pts: s.pts, reb: (s.orb || 0) + (s.drb || 0), ast: s.ast, stl: s.stl, blk: s.blk, fgm: s.fgm, fga: s.fga, tpm: s['3pm'], tpa: s['3pa'] });
        // Tiros y tapones sufridos (un tiro taponado cuenta como intento fallado).
        for (const e of mine.events || []) {
          const own = (e.type === 'shot' && e.player === pid) || (e.type === 'block' && e.shooter === pid);
          if (own && ZONES.includes(e.zone)) { const made = e.type === 'shot' && e.made; add(b.zones, e.zone, made); add(b.careerZones, e.zone, made); }
        }
      }
    } else {
      const top = us.players.filter(x => x.stats).sort((a, c) => c.stats.pts - a.stats.pts)[0];
      if (top) Object.assign(entry, { top: top.name, topPts: top.stats.pts });
    }
    b.log.push(entry);
    if (b.log.length > MAX_LOG) b.log.splice(0, b.log.length - MAX_LOG);
    return entry;
  }
  // Al cerrar la temporada: una fila de progresión (media y números por partido, o balance si entrenas).
  function seasonClose(state, sum) {
    const b = book(state);
    if (b.seasons.some(x => x.y === state.year)) return;
    const row = { y: state.year, league: state.season ? state.season.leagueId : null, rank: sum ? sum.rank : null };
    if (state.player) {
      const s = state.player.stats || {}, g = Math.max(1, s.gp || 0);
      Object.assign(row, { ovr: state.player.ovr, gp: s.gp || 0, ppg: Math.round((s.pts || 0) / g * 10) / 10, rpg: Math.round((s.reb || 0) / g * 10) / 10, apg: Math.round((s.ast || 0) / g * 10) / 10 });
    } else if (sum && sum.record) Object.assign(row, { wins: sum.record.wins, losses: sum.record.losses });
    b.seasons.push(row);
    if (b.seasons.length > 40) b.seasons.splice(0, b.seasons.length - 40);
  }
  function zoneTable(map) { return ZONES.map(z => { const r = map[z] || [0, 0]; return { zone: z, made: r[0], att: r[1], pct: r[1] ? Math.round(r[0] / r[1] * 1000) / 10 : null }; }); }
  // Lo que ve la interfaz.
  function view(state) {
    const b = book(state);
    const cur = state.player ? (() => { const s = state.player.stats || {}, g = Math.max(1, s.gp || 0); return { y: state.year, ovr: state.player.ovr, gp: s.gp || 0, ppg: Math.round((s.pts || 0) / g * 10) / 10, rpg: Math.round((s.reb || 0) / g * 10) / 10, apg: Math.round((s.ast || 0) / g * 10) / 10, live: true }; })() : null;
    return { log: b.log.slice(-MAX_LOG), zones: zoneTable(b.zones), careerZones: zoneTable(b.careerZones), seasons: b.seasons.concat(cur && cur.gp ? [cur] : []) };
  }
  CAA.StatsBook = { ZONES, book, track, seasonClose, view, zoneTable };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.StatsBook;
})(typeof globalThis !== 'undefined' ? globalThis : this);
