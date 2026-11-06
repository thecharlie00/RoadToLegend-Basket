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
  const TEAM_PHRASES_ES = [
    ['El mejor defensor', 'La mejor defensora'], ['el mejor defensor', 'la mejor defensora'], ['Mejor defensor', 'Mejor defensora'], ['mejor defensor', 'mejor defensora'],
    ['El mejor jugador', 'La mejor jugadora'], ['el mejor jugador', 'la mejor jugadora'], ['Mejor jugador', 'Mejor jugadora'], ['Mejor sexto hombre', 'Mejor sexta jugadora'],
    ['Novato del año', 'Novata del año'], ['novato del año', 'novata del año'], ['Jugador más mejorado', 'Jugadora más mejorada'], ['más mejorado', 'más mejorada'],
    ['Tirador puro', 'Tiradora pura'], ['Alero creador', 'Alera creadora'], ['Pívot pasador', 'Pívot pasadora'], ['Base anotador', 'Base anotadora'], ['Escolta anotador', 'Escolta anotadora'],
    ['Hombre de confianza', 'Mujer de confianza'], ['hombre de confianza', 'mujer de confianza'], ['Hombre de hierro', 'Mujer de hierro']
  ];
  // Posiciones y perfiles: «el base» → «la base», «el alero» → «la alera», «tirador» → «tiradora».
  const ROLE_NOUNS_ES = [
    ['tiradores', 'tiradoras'], ['tirador', 'tiradora'], ['aleros', 'aleras'], ['alero', 'alera'], ['pasadores', 'pasadoras'], ['pasador', 'pasadora'],
    ['creadores', 'creadoras'], ['creador', 'creadora'], ['anotadores', 'anotadoras'], ['anotador', 'anotadora'], ['defensores', 'defensoras'], ['defensor', 'defensora'],
    ['reboteadores', 'reboteadoras'], ['reboteador', 'reboteadora'], ['taponadores', 'taponadoras'], ['taponador', 'taponadora'], ['especialistas', 'especialistas'],
    ['pívot', 'pívot'], ['base', 'base'], ['escolta', 'escolta'], ['ala-pívot', 'ala-pívot'], ['MVP', 'MVP']
  ];
  const SCOPE_NOUNS_ES = [['chicos', 'chicas'], ['chico', 'chica'], ['amigos', 'amigas'], ['amigo', 'amiga'], ['él', 'ella'], ['Él', 'Ella'], ['uno de los', 'una de las'], ['Alguno', 'Alguna'], ['alguno', 'alguna']];
  const SELF_ES = [
    ['cansado', 'cansada'], ['preparado', 'preparada'], ['contento', 'contenta'], ['tranquilo', 'tranquila'], ['agotado', 'agotada'],
    ['famoso', 'famosa'], ['lesionado', 'lesionada'], ['bienvenido', 'bienvenida'], ['listo', 'lista'], ['desapercibido', 'desapercibida'],
    ['orgulloso', 'orgullosa'], ['nervioso', 'nerviosa'], ['El elegido', 'La elegida'], ['el elegido', 'la elegida'], ['Sexto hombre', 'Sexta jugadora'], ['sexto hombre', 'sexta jugadora'],
    ['conoce a tu jugador', 'conoce a tu jugadora'], ['Hombre de hierro', 'Mujer de hierro'], ['un saco', 'un saco'],
    // Títulos de logros y estados sobre ti (solo formas sueltas: «te han elegido» no cambia).
    ['Elegido', 'Elegida'], ['Bienvenido', 'Bienvenida'], ['Atrapado', 'Atrapada'], ['Abonado', 'Abonada'], ['Equipado', 'Equipada'], ['Zapatillero', 'Zapatillera'],
    ['El más valioso', 'La más valiosa'], ['el más valioso', 'la más valiosa'], ['eres entrenador', 'eres entrenadora'], ['no drafteado', 'no drafteada'], ['Invicto', 'Invicta'],
    ['Intocable', 'Intocable'], ['Imparable', 'Imparable'], ['Leyenda', 'Leyenda'], ['el mejor', 'la mejor'], ['El mejor', 'La mejor'], ['único', 'única'], ['Único', 'Única']
  ];
  const ART = { el: 'la', El: 'La', un: 'una', Un: 'Una', del: 'de la', Del: 'De la', al: 'a la', Al: 'A la', los: 'las', Los: 'Las', unos: 'unas', Unos: 'Unas',
    este: 'esta', Este: 'Esta', ese: 'esa', Ese: 'Esa', estos: 'estas', esos: 'esas', otro: 'otra', Otro: 'Otra', otros: 'otras', nuevo: 'nueva', nuevos: 'nuevas',
    primer: 'primera', buen: 'buena', algún: 'alguna', ningún: 'ninguna', mejor: 'mejor', joven: 'joven', tu: 'tu', tus: 'tus', su: 'su', sus: 'sus', dos: 'dos', tres: 'tres', muchos: 'muchas', pocos: 'pocas', 'todos los': 'todas las', 'Todos los': 'Todas las', 'todos tus': 'todas tus', 'Todos tus': 'Todas tus' };
  const EN_TEAM = [['Sixth Man', 'Sixth Woman'], ['sixth man', 'sixth woman'], ['Iron Man', 'Iron Woman'], ['Trusted Man', 'Trusted Woman'], ['King of', 'Queen of'], ['King in the North', 'Queen in the North'], ['Splash Brother', 'Splash Sister'], ['meet your player', 'meet your player']];
  const FR_TEAM = [['Sixième homme', 'Sixième femme'], ['sixième homme', 'sixième femme'], ['Meilleur défenseur', 'Meilleure défenseure'], ['Rookie de l’année', 'Rookie de l’année'],
    ['le meilleur joueur', 'la meilleure joueuse'], ['Meilleur joueur', 'Meilleure joueuse'], ['ton joueur', 'ta joueuse'], ['Ton joueur', 'Ta joueuse'], ['un joueur', 'une joueuse'], ['Un joueur', 'Une joueuse'],
    ['le joueur', 'la joueuse'], ['Le joueur', 'La joueuse'], ['du joueur', 'de la joueuse'], ['au joueur', 'à la joueuse'], ['les joueurs', 'les joueuses'], ['des joueurs', 'des joueuses'], ['joueurs', 'joueuses'], ['joueur', 'joueuse'], ['Joueur', 'Joueuse'],
    ['tes coéquipiers', 'tes coéquipières'], ['coéquipiers', 'coéquipières'], ['coéquipier', 'coéquipière'], ['le capitaine', 'la capitaine'], ['vétérans', 'vétéranes'], ['vétéran', 'vétérane'],
    ['Tireur pur', 'Tireuse pure'], ['tireurs', 'tireuses'], ['tireur', 'tireuse'], ['Tireur', 'Tireuse'], ['meneur', 'meneuse'], ['Meneur', 'Meneuse'], ['ailier fort', 'ailière forte'], ['Ailier fort', 'Ailière forte'], ['ailier', 'ailière'], ['Ailier', 'Ailière'],
    ['passeur', 'passeuse'], ['Passeur', 'Passeuse'], ['défenseur', 'défenseure'], ['Défenseur', 'Défenseure'], ['marqueur', 'marqueuse'], ['créateur', 'créatrice'], ['Homme de fer', 'Femme de fer']];
  const DE_TEAM = [['Sechster Mann', 'Sechste Frau'], ['sechster Mann', 'sechste Frau'], ['Bester Verteidiger', 'Beste Verteidigerin'], ['Bester Spieler', 'Beste Spielerin'], ['Eiserner Mann', 'Eiserne Frau'],
    ['deinen Spieler', 'deine Spielerin'], ['dein Spieler', 'deine Spielerin'], ['Dein Spieler', 'Deine Spielerin'], ['einen Spieler', 'eine Spielerin'], ['ein Spieler', 'eine Spielerin'], ['Ein Spieler', 'Eine Spielerin'],
    ['der Spieler', 'die Spielerin'], ['Der Spieler', 'Die Spielerin'], ['den Spieler', 'die Spielerin'], ['dem Spieler', 'der Spielerin'], ['des Spielers', 'der Spielerin'], ['Spielern', 'Spielerinnen'],
    ['deine Mitspieler', 'deine Mitspielerinnen'], ['Mitspielern', 'Mitspielerinnen'], ['Mitspieler', 'Mitspielerinnen'], ['der Kapitän', 'die Kapitänin'], ['Kapitän', 'Kapitänin'], ['Veteranen', 'Veteraninnen'], ['Veteran', 'Veteranin'],
    ['Reiner Schütze', 'Reine Schützin'], ['Schützen', 'Schützinnen'], ['Schütze', 'Schützin'], ['Flügelspieler', 'Flügelspielerin'], ['Spielmacher', 'Spielmacherin'], ['Verteidiger', 'Verteidigerin'], ['Passgeber', 'Passgeberin'], ['Scorer', 'Scorerin']];
  const IT_TEAM = [['Sesto uomo', 'Sesta donna'], ['sesto uomo', 'sesta donna'], ['Miglior difensore', 'Miglior difensora'], ['Miglior giocatore', 'Miglior giocatrice'], ['Uomo di ferro', 'Donna di ferro'],
    ['il tuo giocatore', 'la tua giocatrice'], ['Il tuo giocatore', 'La tua giocatrice'], ['tuo giocatore', 'tua giocatrice'], ['un giocatore', 'una giocatrice'], ['Un giocatore', 'Una giocatrice'], ['il giocatore', 'la giocatrice'], ['Il giocatore', 'La giocatrice'],
    ['del giocatore', 'della giocatrice'], ['al giocatore', 'alla giocatrice'], ['i giocatori', 'le giocatrici'], ['I giocatori', 'Le giocatrici'], ['dei giocatori', 'delle giocatrici'], ['giocatori', 'giocatrici'], ['giocatore', 'giocatrice'], ['Giocatore', 'Giocatrice'],
    ['i tuoi compagni', 'le tue compagne'], ['tuoi compagni', 'tue compagne'], ['compagni', 'compagne'], ['compagno', 'compagna'], ['il capitano', 'la capitana'], ['capitano', 'capitana'], ['veterani', 'veterane'], ['veterano', 'veterana'],
    ['Tiratore puro', 'Tiratrice pura'], ['tiratori', 'tiratrici'], ['tiratore', 'tiratrice'], ['Tiratore', 'Tiratrice'], ['difensore', 'difensora'], ['realizzatore', 'realizzatrice'], ['passatore', 'passatrice'], ['il pivot', 'la pivot'], ['il playmaker', 'la playmaker']];
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
    if (o.team) { s = swapList(s, TEAM_PHRASES_ES); s = nounsWithArticles(s, NOUNS_ES); s = nounsWithArticles(s, ROLE_NOUNS_ES); }
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
  function other(text, list, o) { return text && (o.team || o.self) ? swapList(String(text), list) : text; }
  function apply(text, locale, o) {
    if (!o || !(o.team || o.self || o.scope)) return text;
    if (locale === 'en') return en(text, o);
    if (locale === 'fr') return other(text, FR_TEAM, o);
    if (locale === 'de') return other(text, DE_TEAM, o);
    if (locale === 'it') return other(text, IT_TEAM, o);
    return es(text, o);
  }
  function pair(p, o) { return p && o && (o.team || o.self || o.scope) ? Object.assign({}, p, { es: es(p.es, o), en: en(p.en, o) }) : p; }
  function opts(team, self, eventId) { return { team: !!team, self: !!self, scope: !!team && SCOPED.has(eventId) }; }
  CAA.Fem = { apply, pair, opts, SCOPED };
  if (typeof module !== 'undefined' && module.exports) module.exports = CAA.Fem;
})(typeof globalThis !== 'undefined' ? globalThis : this);
