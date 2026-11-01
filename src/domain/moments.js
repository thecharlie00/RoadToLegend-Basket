(function (root) {
  'use strict';
  // Momentos históricos (adaptación de eras-moments del fútbol): finales reales entre selecciones para revivir con las
  // reglas de su año. Los resultados y datos son los publicados; los jugadores se generan (no son los reales).
  const CAA = root.CAA = root.CAA || {};
  const req = (n, p) => CAA[n] || (typeof require === 'function' ? require(p) : null);
  const Player = req('Player', './player.js'), Match = req('Match', '../match/engine.js'), Eras = req('Eras', './eras.js'), RNG = req('RNG', '../core/rng.js');

  // teams: [código, nombre es, nombre en, fuerza]; real: índice del ganador real; score: marcador real.
  const T = (c, es, en, r) => ({ code: c, es, en, r });
  const MOMENTS = [
    { id: 'm1936', year: 1936, gender: 'm', kind: 'games', teams: [T('US', 'Estados Unidos', 'United States', 80), T('CA', 'Canadá', 'Canada', 72)], real: 0, score: [19, 8],
      fact: { es: 'La primera final olímpica se jugó al aire libre, sobre una pista de tierra convertida en barro por la lluvia. Botar era casi imposible.', en: 'The first Olympic final was played outdoors on a dirt court turned to mud by the rain. Dribbling was almost impossible.' } },
    { id: 'm1950', year: 1950, gender: 'm', kind: 'world', teams: [T('AR', 'Argentina', 'Argentina', 76), T('US', 'Estados Unidos', 'United States', 77)], real: 0, score: [64, 50],
      fact: { es: 'Argentina ganó en casa el primer Mundial de la historia, en Buenos Aires.', en: 'Argentina won the first ever World Championship at home in Buenos Aires.' } },
    { id: 'm1953w', year: 1953, gender: 'f', kind: 'world', teams: [T('US', 'Estados Unidos', 'United States', 78), T('CL', 'Chile', 'Chile', 72)], real: 0, score: [49, 36],
      fact: { es: 'El primer Mundial femenino se celebró en Santiago de Chile y lo ganó Estados Unidos.', en: 'The first women\'s World Championship was held in Santiago, Chile, and won by the United States.' } },
    { id: 'm1959', year: 1959, gender: 'm', kind: 'world', teams: [T('BR', 'Brasil', 'Brazil', 78), T('US', 'Estados Unidos', 'United States', 77)], real: 0, score: [81, 67],
      fact: { es: 'Brasil se proclamó campeón del mundo en Chile y repetiría título en 1963.', en: 'Brazil became world champions in Chile and would repeat the title in 1963.' } },
    { id: 'm1972', year: 1972, gender: 'm', kind: 'games', teams: [T('SU', 'Unión Soviética', 'Soviet Union', 80), T('US', 'Estados Unidos', 'United States', 82)], real: 0, score: [51, 50],
      fact: { es: 'La final de Múnich se decidió en unos últimos tres segundos que se repitieron hasta tres veces; la Unión Soviética ganó por un punto.', en: 'The Munich final came down to final three seconds that were replayed three times; the Soviet Union won by one point.' } },
    { id: 'm1976w', year: 1976, gender: 'f', kind: 'games', teams: [T('SU', 'Unión Soviética', 'Soviet Union', 84), T('US', 'Estados Unidos', 'United States', 76)], real: 0, score: [112, 77],
      fact: { es: 'El baloncesto femenino debutó en los Juegos de Montreal y la Unión Soviética fue campeona invicta.', en: 'Women\'s basketball debuted at the Montreal Games and the Soviet Union won it unbeaten.' } },
    { id: 'm1984', year: 1984, gender: 'm', kind: 'games', teams: [T('US', 'Estados Unidos', 'United States', 86), T('ES', 'España', 'Spain', 78)], real: 0, score: [96, 65],
      fact: { es: 'España llegó a la final de Los Ángeles y se colgó la plata ante Estados Unidos.', en: 'Spain reached the Los Angeles final and took silver against the United States.' } },
    { id: 'm1988', year: 1988, gender: 'm', kind: 'games', teams: [T('SU', 'Unión Soviética', 'Soviet Union', 84), T('YU', 'Yugoslavia', 'Yugoslavia', 83)], real: 0, score: [76, 63],
      fact: { es: 'En Seúl, la Unión Soviética eliminó a Estados Unidos en semifinales y ganó el oro ante Yugoslavia.', en: 'In Seoul the Soviet Union knocked out the United States in the semis and won gold over Yugoslavia.' } },
    { id: 'm1992', year: 1992, gender: 'm', kind: 'games', teams: [T('US', 'Estados Unidos', 'United States', 96), T('HR', 'Croacia', 'Croatia', 82)], real: 0, score: [117, 85],
      fact: { es: 'En Barcelona jugaron por primera vez los profesionales norteamericanos; Croacia, en su primer gran torneo, fue plata.', en: 'In Barcelona North American professionals played for the first time; Croatia, in its first major tournament, took silver.' } },
    { id: 'm1998', year: 1998, gender: 'm', kind: 'world', teams: [T('YU', 'Yugoslavia', 'Yugoslavia', 84), T('RU', 'Rusia', 'Russia', 82)], real: 0, score: [64, 62],
      fact: { es: 'Yugoslavia ganó el Mundial de Atenas en una final decidida por dos puntos.', en: 'Yugoslavia won the Athens World Championship in a final decided by two points.' } },
    { id: 'm2002', year: 2002, gender: 'm', kind: 'world', teams: [T('YU', 'Yugoslavia', 'Yugoslavia', 86), T('AR', 'Argentina', 'Argentina', 85)], real: 0, score: [84, 77],
      fact: { es: 'En Indianápolis, Yugoslavia ganó la final en la prórroga y la anfitriona acabó sexta.', en: 'In Indianapolis, Yugoslavia won the final in overtime and the hosts finished sixth.' } },
    { id: 'm2004', year: 2004, gender: 'm', kind: 'games', teams: [T('AR', 'Argentina', 'Argentina', 86), T('IT', 'Italia', 'Italy', 81)], real: 0, score: [84, 69],
      fact: { es: 'La generación dorada argentina ganó el oro en Atenas tras eliminar a Estados Unidos en semifinales.', en: 'Argentina\'s golden generation won gold in Athens after beating the United States in the semis.' } },
    { id: 'm2006', year: 2006, gender: 'm', kind: 'world', teams: [T('ES', 'España', 'Spain', 87), T('GR', 'Grecia', 'Greece', 84)], real: 0, score: [70, 47],
      fact: { es: 'España ganó su primer Mundial en Japón con una final dominante ante Grecia.', en: 'Spain won its first World Championship in Japan with a dominant final against Greece.' } },
    { id: 'm2008', year: 2008, gender: 'm', kind: 'games', teams: [T('US', 'Estados Unidos', 'United States', 94), T('ES', 'España', 'Spain', 88)], real: 0, score: [118, 107],
      fact: { es: 'La final de Pekín es recordada como una de las más igualadas y anotadoras de la historia olímpica.', en: 'The Beijing final is remembered as one of the closest and highest-scoring in Olympic history.' } },
    { id: 'm2016w', year: 2016, gender: 'f', kind: 'games', teams: [T('US', 'Estados Unidos', 'United States', 96), T('ES', 'España', 'Spain', 86)], real: 0, score: [101, 72],
      fact: { es: 'España jugó su primera final olímpica femenina en Río y se colgó la plata.', en: 'Spain played its first women\'s Olympic final in Rio and took silver.' } },
    { id: 'm2019', year: 2019, gender: 'm', kind: 'world', teams: [T('ES', 'España', 'Spain', 86), T('AR', 'Argentina', 'Argentina', 83)], real: 0, score: [95, 75],
      fact: { es: 'España ganó en China su segundo Mundial ante una Argentina que nadie esperaba en la final.', en: 'Spain won its second World Cup in China against an Argentina nobody expected in the final.' } },
    { id: 'm2023', year: 2023, gender: 'm', kind: 'world', teams: [T('DE', 'Alemania', 'Germany', 86), T('RS', 'Serbia', 'Serbia', 85)], real: 0, score: [83, 77],
      fact: { es: 'Alemania ganó su primer Mundial, invicta, en el torneo disputado entre Filipinas, Japón e Indonesia.', en: 'Germany won its first World Cup, unbeaten, at the tournament held across the Philippines, Japan and Indonesia.' } },
    { id: 'm2024', year: 2024, gender: 'm', kind: 'games', teams: [T('US', 'Estados Unidos', 'United States', 95), T('FR', 'Francia', 'France', 87)], real: 0, score: [98, 87],
      fact: { es: 'En París, la anfitriona llegó a la final y plantó cara a Estados Unidos hasta el último cuarto.', en: 'In Paris the hosts reached the final and pushed the United States into the last quarter.' } }
  ];
  const NAT = { SU: 'RU', YU: 'RS' };
  const TACTICS = { slow: { pace: 0.3, threeRate: 0.25, insideRate: 0.48 }, normal: null, fast: { pace: 0.72, threeRate: 0.4, insideRate: 0.38 } };
  function roster(m, side, seed) {
    const t = m.teams[side], rng = RNG.create(seed + ':' + t.code);
    const pos = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C', 'SF', 'SG'];
    return pos.map((p, i) => Player.createPlayer({ seed: seed + ':' + m.id + ':' + side + ':' + i, pos: p, quality: Math.round(Math.max(45, Math.min(80, 56 + (t.r - 70) * 0.6 + (i < 5 ? 2 : -4) + rng.int(-2, 2)))), age: 22 + rng.int(0, 10), nationality: NAT[t.code] || t.code, gender: m.gender === 'f' ? 'women' : 'men' }));
  }
  // Juega el momento. side = selección elegida por ti; tactic = slow | normal | fast.
  function play(id, side, tactic, seed) {
    const m = MOMENTS.find(x => x.id === id); if (!m) throw new Error('unknown moment');
    const s = seed || 'moment';
    // Reglas del año y un ritmo que reproduce el tipo de marcador de aquella final.
    const Rules = CAA.Rules || require('../match/rules.js');
    const cfg = Object.assign({ periods: 4, periodMinutes: 10, shotClock: 24, three: 6.75, pace: 1, shootMod: 0 }, Eras.fibaEra(m.year) || {});
    const total = m.score[0] + m.score[1];
    cfg.pace = Math.max(0.06, Math.min(1.15, (total - 60) / 155));
    cfg.shootMod = Math.max(-0.2, Math.min(0, (total - 160) / 900));
    const ruleSet = Rules.eraId('FIBA-2026', cfg);
    const teams = [0, 1].map(i => {
      const players = roster(m, i, s);
      const team = { id: m.teams[i].code, name: m.teams[i].es, players: players.map((p, j) => Player.toMatchPlayer(p, j < 5)), tactic: Object.assign({}, Match.DEFAULT_TACTIC) };
      if (i === side && TACTICS[tactic]) Object.assign(team.tactic, TACTICS[tactic]);
      if (i === side) for (const p of team.players) p.attrs.clutch = Math.min(99, p.attrs.clutch + 4);
      return team;
    });
    const st = Match.simulateMatch({ seed: s + ':' + id + ':' + side + ':' + tactic, ruleSetId: ruleSet, teams, matchId: 'moment-' + id });
    const winner = st.winner;
    const top = st.teams[side].players.slice().sort((a, b) => b.stats.pts - a.stats.pts).slice(0, 3).map(p => ({ name: p.name, pts: p.stats.pts }));
    return { id, year: m.year, side, score: st.score.slice(), won: winner === side, changed: winner !== m.real, real: m.score, realWinner: m.real, top, ruleSet };
  }
  CAA.Moments = { MOMENTS, play };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Moments;
})(typeof globalThis !== 'undefined' ? globalThis : this);
