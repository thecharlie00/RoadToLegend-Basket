(function (root) {
  'use strict';
  // Textos en femenino (equivalente a lang-fem del fútbol). Se aplica al vuelo sobre es/en:
  //  - team: la liga es femenina (compañeras, rivales, veteranas, novatas…).
  //  - self: quien juega eres tú y eres jugadora (adjetivos sobre ti).
  //  - scope: la decisión habla de una jugadora concreta con pronombres (él → ella, he → she).
  const CAA = root.CAA = root.CAA || {};

  const NOUNS_ES = [
    ['jugadores', 'jugadoras'], ['jugador', 'jugadora'], ['compañeros', 'compañeras'], ['compañero', 'compañera'],
    ['veteranos', 'veteranas'], ['veterano', 'veterana'], ['novatos', 'novatas'], ['novato', 'novata'],
    ['chavales', 'chavalas'], ['chaval', 'chavala'], ['capitanes', 'capitanas'], ['capitán', 'capitana'],
    ['canteranos', 'canteranas'], ['canterano', 'canterana'], ['fichajes estrella', 'fichajes estrella']
  ];
  const SCOPE_NOUNS_ES = [['chicos', 'chicas'], ['chico', 'chica'], ['amigos', 'amigas'], ['amigo', 'amiga'], ['él', 'ella'], ['Él', 'Ella'], ['uno de los', 'una de las'], ['Alguno', 'Alguna'], ['alguno', 'alguna']];
  const SELF_ES = [
    ['cansado', 'cansada'], ['preparado', 'preparada'], ['contento', 'contenta'], ['tranquilo', 'tranquila'], ['agotado', 'agotada'],
    ['famoso', 'famosa'], ['lesionado', 'lesionada'], ['bienvenido', 'bienvenida'], ['listo', 'lista'], ['desapercibido', 'desapercibida'],
    ['orgulloso', 'orgullosa'], ['nervioso', 'nerviosa'], ['El elegido', 'La elegida'], ['el elegido', 'la elegida'], ['Sexto hombre', 'Sexta jugadora'], ['sexto hombre', 'sexta jugadora'],
    ['conoce a tu jugador', 'conoce a tu jugadora'], ['Hombre de hierro', 'Mujer de hierro'], ['un saco', 'un saco']
  ];
  const ART = { el: 'la', El: 'La', un: 'una', Un: 'Una', del: 'de la', Del: 'De la', al: 'a la', Al: 'A la', los: 'las', Los: 'Las', unos: 'unas', Unos: 'Unas',
    este: 'esta', Este: 'Esta', ese: 'esa', Ese: 'Esa', estos: 'estas', esos: 'esas', otro: 'otra', Otro: 'Otra', otros: 'otras', nuevo: 'nueva', nuevos: 'nuevas',
    primer: 'primera', buen: 'buena', algún: 'alguna', ningún: 'ninguna', mejor: 'mejor', joven: 'joven', tu: 'tu', tus: 'tus', su: 'su', sus: 'sus', dos: 'dos', tres: 'tres', muchos: 'muchas', pocos: 'pocas', 'todos los': 'todas las', 'Todos los': 'Todas las', 'todos tus': 'todas tus', 'Todos tus': 'Todas tus' };
  const EN_TEAM = [['Sixth Man', 'Sixth Woman'], ['sixth man', 'sixth woman'], ['Iron Man', 'Iron Woman'], ['Trusted Man', 'Trusted Woman'], ['King of', 'Queen of'], ['King in the North', 'Queen in the North'], ['Splash Brother', 'Splash Sister'], ['meet your player', 'meet your player']];
  const EN_PRON = { he: 'she', He: 'She', him: 'her', Him: 'Her', his: 'her', His: 'Her', himself: 'herself', Himself: 'Herself' };
  // Decisiones cuyos pronombres se refieren a una jugadora (compañera, estrella, rival, veterana…).
  const SCOPED = new Set(['mentor', 'jersey-number', 'rival-trash', 'teammate-conflict', 'coach-first-talk', 'star-minutes', 'star-unhappy', 'young-prospect', 'injury-star-coach', 'strict-backfire', 'star-power-favor', 'player-personal', 'local-food', 'jersey-retire', 'veteran-bench', 'injury-crisis']);

  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const W = '(?<![\\p{L}])', E = '(?![\\p{L}])';
  function swapList(text, list) {
    for (const [a, b] of list) if (a !== b) text = text.replace(new RegExp(W + esc(a) + E, 'gu'), b);
    return text;
  }
  function nounsWithArticles(text, list) {
    const arts = Object.keys(ART).sort((a, b) => b.length - a.length).map(esc).join('|');
    for (const [m, f] of list) {
      text = text.replace(new RegExp(W + '(' + arts + ')\\s+(' + esc(m) + ')' + E, 'gu'), (_, art) => ART[art] + ' ' + f);
      // «jugador más veterano» → el adjetivo pospuesto también cambia gracias a la propia lista
      const cap = m.charAt(0).toUpperCase() + m.slice(1), capF = f.charAt(0).toUpperCase() + f.slice(1);
      text = text.replace(new RegExp(W + esc(m) + E, 'gu'), f).replace(new RegExp(W + esc(cap) + E, 'gu'), capF);
    }
    return text;
  }
  function es(text, o) {
    if (!text) return text;
    let s = String(text);
    if (o.scope) s = nounsWithArticles(s, SCOPE_NOUNS_ES.filter(([a]) => !/^(él|Él|uno de los|Alguno|alguno)$/.test(a))), s = swapList(s, SCOPE_NOUNS_ES.filter(([a]) => /^(él|Él|uno de los|Alguno|alguno)$/.test(a)));
    if (o.team) s = nounsWithArticles(s, NOUNS_ES);
    if (o.self || o.team) s = swapList(s, SELF_ES.filter(([a]) => /hombre|elegid|jugador|hierro/i.test(a)));
    if (o.self) s = swapList(s, SELF_ES);
    return s;
  }
  function en(text, o) {
    if (!text) return text;
    let s = String(text);
    if (o.team || o.self) s = swapList(s, EN_TEAM);
    if (o.scope) s = s.replace(/\b(he|He|him|Him|his|His|himself|Himself)\b/g, w => EN_PRON[w]);
    return s;
  }
  function apply(text, locale, o) {
    if (!o || !(o.team || o.self || o.scope)) return text;
    return locale === 'en' ? en(text, o) : es(text, o);
  }
  function pair(p, o) { return p && o && (o.team || o.self || o.scope) ? { es: es(p.es, o), en: en(p.en, o) } : p; }
  function opts(team, self, eventId) { return { team: !!team, self: !!self, scope: !!team && SCOPED.has(eventId) }; }
  CAA.Fem = { apply, pair, opts, SCOPED };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Fem;
})(typeof globalThis !== 'undefined' ? globalThis : this);
