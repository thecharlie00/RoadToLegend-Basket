(function (root) {
  'use strict';
  // Red social (adaptación de social-data del fútbol) con cuentas 100 % ficticias: ninguna imita a una persona real.
  // Cada semana se publican 2-3 mensajes según lo que pasa: resultado, tu partido, rachas, lesiones, rumores, playoffs.
  const CAA = root.CAA = root.CAA || {};
  const RNG = CAA.RNG || (typeof require === 'function' ? require('../core/rng.js') : null);
  const ACCOUNTS = [
    { id: 'insider', name: 'Rumores del Parqué', handle: 'rumoresparque', av: '🚨', verified: true },
    { id: 'pundit', name: 'La Pizarra', handle: 'lapizarra_tv', av: '📋', verified: true },
    { id: 'stats', name: 'Datos en Cancha', handle: 'datosencancha', av: '📊', verified: true },
    { id: 'fan', name: 'Grada Joven', handle: 'gradajoven', av: '📣', verified: false },
    { id: 'club', name: '{club}', handle: 'oficial', av: '🏀', verified: true },
    { id: 'meme', name: 'Memes de Baloncesto', handle: 'memesdebalon', av: '😂', verified: false },
    { id: 'rival', name: 'Ultras Rivales', handle: 'ultrasrivales', av: '😤', verified: false },
    { id: 'legend', name: 'El Abuelo del Aro', handle: 'abuelodelaro', av: '👴', verified: false }
  ];
  // Plantillas por situación: [cuenta, es, en]. Marcadores: {club} {opponent} {name} {us} {them} {pts} {streak} {weeks}.
  const T = {
    win: [['club', '¡Victoria! {club} {us}-{them} {opponent}. 💪', 'Win! {club} {us}-{them} {opponent}. 💪'], ['fan', 'Así se juega. Esta afición se lo merece.', 'That is how you play. These fans deserve it.'],
      ['pundit', 'Buen ajuste defensivo de {club} en la segunda parte.', 'Good defensive adjustment by {club} in the second half.'], ['rival', 'Hoy os ha salido todo. No os acostumbréis.', 'Everything went your way today. Do not get used to it.'],
      ['legend', 'En mis tiempos ganábamos igual, pero con menos tatuajes.', 'In my day we won the same way, just with fewer tattoos.']],
    loss: [['club', 'Derrota ante {opponent} ({us}-{them}). A levantarse.', 'Loss to {opponent} ({us}-{them}). Time to get up.'], ['fan', 'Así no. Queremos actitud.', 'Not like this. We want attitude.'],
      ['pundit', 'A {club} le faltó rebote defensivo. Así es imposible.', '{club} lacked defensive rebounding. Impossible like that.'], ['rival', 'Jajaja {us}-{them}. Próximo partido, más de lo mismo.', 'Hahaha {us}-{them}. Next game, more of the same.'],
      ['meme', 'La defensa de {club} hoy: 🚪🚪🚪', '{club} defence tonight: 🚪🚪🚪']],
    big: [['stats', '{name}: {pts} puntos. Su mejor partido de la temporada.', '{name}: {pts} points. Best game of the season.'], ['fan', '{name} es otro nivel. ¡Que alguien le pare!', '{name} is another level. Somebody stop him!'],
      ['meme', 'Los defensores de {opponent} intentando parar a {name}: 🤡', '{opponent} defenders trying to stop {name}: 🤡'], ['legend', 'Ese chico tiene muñeca. Me recuerda a mí… con más pelo.', 'That kid has a wrist. Reminds me of me… with more hair.']],
    poor: [['stats', '{name}: {pts} puntos. Noche para olvidar.', '{name}: {pts} points. A night to forget.'], ['fan', 'Todos tenemos días malos, {name}. Arriba.', 'Everyone has bad days, {name}. Chin up.'], ['rival', '¿Dónde estaba {name}? Que alguien llame a la policía.', 'Where was {name}? Someone call the police.']],
    streakW: [['stats', '{streak} victorias seguidas para {club}. La mejor racha de la liga.', '{streak} straight wins for {club}. The best run in the league.'], ['insider', 'En el vestuario de {club} no se habla de otra cosa que del título.', 'In the {club} locker room they talk of nothing but the title.']],
    streakL: [['insider', 'Tras {streak} derrotas seguidas, la directiva de {club} se reunirá esta semana.', 'After {streak} straight losses, the {club} board meets this week.'], ['fan', '{streak} derrotas. Esto no puede seguir así.', '{streak} losses. This cannot go on.']],
    injury: [['insider', 'Confirmado: {name} estará unas {weeks} semanas de baja.', 'Confirmed: {name} will be out about {weeks} weeks.'], ['fan', 'Recupérate pronto, {name}. Te esperamos. ❤️', 'Get well soon, {name}. We are waiting for you. ❤️']],
    rumor: [['insider', 'Varios clubes preguntan por {name}. Atentos al verano. 👀', 'Several clubs are asking about {name}. Watch the summer. 👀'], ['insider', 'EXCLUSIVA: {club} sondea el mercado para reforzar el puesto de base.', 'EXCLUSIVE: {club} is scouting the market for a point guard.'],
      ['pundit', 'Si yo fuera {club}, no dejaría escapar a {name}.', 'If I were {club}, I would not let {name} go.']],
    playoffs: [['club', '¡Estamos en playoffs! Gracias, afición. 🔥', 'We are in the playoffs! Thank you, fans. 🔥'], ['pundit', 'Ojo con {club} en playoffs: nadie quiere cruzarse con ellos.', 'Watch {club} in the playoffs: nobody wants to face them.']],
    title: [['club', '🏆 ¡CAMPEONES! Gracias a todos.', '🏆 CHAMPIONS! Thank you all.'], ['legend', 'Lloro como en el 82. Gracias, chavales.', 'I am crying like in 82. Thank you, kids.'], ['meme', 'La afición de {club} esta noche: 🥳🥳🥳', '{club} fans tonight: 🥳🥳🥳']],
    idle: [['meme', 'Nadie: … El base de {club} en el calentamiento: tiro desde medio campo.', 'Nobody: … The {club} guard in warm-ups: half-court shot.'], ['legend', 'Antes el balón pesaba el doble y no nos quejábamos.', 'The ball used to weigh twice as much and we never complained.'],
      ['stats', 'Dato: los equipos que ganan el rebote ganan el 68 % de los partidos de la liga.', 'Stat: teams that win the boards win 68% of league games.'], ['pundit', 'La liga más igualada de los últimos años. Cualquiera puede ganar a cualquiera.', 'The most balanced league in years. Anyone can beat anyone.']]
  };
  function fill(text, v) { return String(text).replace(/\{(\w+)\}/g, (_, k) => v[k] == null ? '' : String(v[k])); }
  function post(rng, key, v, week) {
    const list = T[key]; if (!list) return null;
    const [acc, es, en] = list[rng.int(0, list.length - 1)];
    const a = ACCOUNTS.find(x => x.id === acc);
    return { acc, name: fill(a.name, v), handle: a.handle === 'oficial' ? String(v.club || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15) : a.handle, av: a.av, verified: a.verified, text: { es: fill(es, v), en: fill(en, v) }, week, likes: Math.round(40 + rng.float() * (key === 'title' ? 9000 : 1800)) };
  }
  // Mensajes de la semana a partir del último partido y del contexto de la carrera.
  function weekly(state, info) {
    const rng = RNG.create(state.seed + ':social:' + state.year + ':' + state.week);
    const club = state.season.clubsById[state.clubId], v = Object.assign({ club: club ? club.name : '', name: state.player ? state.player.name : (state.coach ? state.coach.name : ''), streak: Math.abs(club ? club.streak : 0) }, info || {});
    const out = [];
    if (info && info.us != null) out.push(post(rng, info.us > info.them ? 'win' : 'loss', v, state.week));
    if (info && info.pts != null && state.player) { if (info.pts >= 25) out.push(post(rng, 'big', v, state.week)); else if (info.pts <= 4 && rng.float() < 0.5) out.push(post(rng, 'poor', v, state.week)); }
    if (club && club.streak >= 4) out.push(post(rng, 'streakW', v, state.week));
    if (club && club.streak <= -4) out.push(post(rng, 'streakL', v, state.week));
    if (info && info.injuryWeeks) out.push(post(rng, 'injury', Object.assign({}, v, { weeks: info.injuryWeeks }), state.week));
    if (rng.float() < 0.25) out.push(post(rng, 'rumor', v, state.week));
    if (out.length < 2) out.push(post(rng, 'idle', v, state.week));
    return out.filter(Boolean).slice(0, 3);
  }
  function push(state, posts) {
    const life = state.life; if (!life) return;
    life.social = (life.social || []).concat(posts).slice(-15);
  }
  function special(state, key, extra) {
    const rng = RNG.create(state.seed + ':social-' + key + ':' + state.year + ':' + state.week);
    const club = state.season.clubsById[state.clubId];
    push(state, [post(rng, key, Object.assign({ club: club ? club.name : '', name: state.player ? state.player.name : '' }, extra || {}), state.week)].filter(Boolean));
  }
  CAA.Social = { ACCOUNTS, TEMPLATES: T, weekly, push, special };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Social;
})(typeof globalThis !== 'undefined' ? globalThis : this);
