#!/usr/bin/env python3
"""Decisiones de carrera, bloque 2 (paridad de contenido con el fútbol). Bilingües, sin opción obvia.
Formato compacto: E(id, cat, modo, (título es, en), (texto es, en), [opciones], **condiciones)
  o((etiqueta es, en), efectos, (resultado es, en))           desenlace seguro
  u((etiqueta es, en), p, ok_fx, (ok es, en), ko_fx, (ko es, en))   desenlace incierto
Historias encadenadas: una opción deja flag y el capítulo siguiente pide flags=[...] y flagDelay=semanas.
"""

def register(ev, O, U):
    def o(lab, fx, res):
        return O(lab, ('', ''), fx, res)
    def u(lab, p, okfx, okres, kofx, kores):
        return U(lab, ('', ''), p, okfx, okres, kofx, kores)
    def E(eid, cat, mode, title, body, opts, once=False, story=False, repeat=False, **cond):
        ev(eid, cat, mode, title, body, opts, cond=cond, once=once, story=story, repeat=repeat)
    P, C, A = 'player', 'coach', 'any'

    # ===================== JUGADOR: VESTUARIO Y CANCHA =====================
    E('pre-game-ritual', 'superstition', P, ('Tu ritual', 'Your ritual'),
      ('Antes de cada partido haces lo mismo desde juvenil. Hoy un compañero se burla delante de todos.', 'You have done the same thing before every game since youth ball. Today a teammate mocks it in front of everyone.'),
      [o(('Mantener el ritual', 'Keep the ritual'), {'confidence': 1, 'chemistry': -1}, ('Lo haces igual. Esa noche metes los dos primeros tiros.', 'You do it anyway. That night you hit your first two shots.')),
       o(('Reírte con él y dejarlo', 'Laugh along and drop it'), {'chemistry': 2, 'confidence': -1}, ('El vestuario se ríe contigo. Te sientes un poco desnudo en el calentamiento.', 'The locker room laughs with you. You feel a bit naked in warm-ups.'))])
    E('film-session', 'training', P, ('Sesión de vídeo', 'Film session'),
      ('El cuerpo técnico te pone cinco minutos de tus errores defensivos delante del equipo.', 'The staff shows five minutes of your defensive mistakes in front of the team.'),
      [o(('Tomar notas y callar', 'Take notes, stay quiet'), {'attr': {'defExterior': 1}, 'trust': 2}, ('Al día siguiente corriges dos de los cinco.', 'The next day you fix two of the five.')),
       o(('Defenderte', 'Defend yourself'), {'trust': -3, 'morale': 2}, ('Explicas el contexto. El asistente toma nota, pero no le gusta.', 'You explain the context. The assistant notes it, and does not like it.'))])
    E('free-throw-yips', 'mental', P, ('Los tiros libres no entran', 'Free throws will not fall'),
      ('Llevas tres partidos fallando tiros libres decisivos. Se habla de ti en las tertulias.', 'You have missed key free throws three games running. The talk shows are on it.'),
      [o(('Cien tiros cada mañana', 'A hundred every morning'), {'attr': {'tiroLibre': 2}, 'load': 6}, ('La mecánica vuelve. Los hombros, no tanto.', 'The mechanics come back. The shoulders, less so.')),
       u(('Cambiar la rutina de tiro', 'Change your routine'), 0.55, {'attr': {'tiroLibre': 3}, 'confidence': 2}, ('Dos botes, respiración, arriba. Entran.', 'Two dribbles, breathe, up. They drop.'), {'confidence': -2}, ('La nueva rutina te descoloca aún más.', 'The new routine throws you off even more.'))],
      minWeek=6)
    E('minutes-cut', 'locker', P, ('Te recortan minutos', 'Your minutes get cut'),
      ('El entrenador te ha bajado de 28 a 15 minutos sin explicación.', 'The coach has cut you from 28 to 15 minutes without explanation.'),
      [o(('Pedir una reunión', 'Ask for a meeting'), {'trust': 3}, ('Te dice qué quiere ver. Al menos ya lo sabes.', 'He tells you what he wants to see. At least now you know.')),
       o(('Responder en la pista', 'Answer on the court'), {'confidence': 2, 'load': 4}, ('En tus 15 minutos haces 14 puntos. Él lo ve.', 'In your 15 minutes you score 14. He notices.')),
       o(('Quejarte a tu agente', 'Complain to your agent'), {'trust': -4, 'fame': 1, 'flag': 'agent-noise'}, ('Tu agente llama a la directiva. Ya veremos.', 'Your agent calls the front office. We will see.'))],
      minWeek=4)
    E('agent-noise-later', 'agency', P, ('El ruido de tu agente', 'Your agent\'s noise'),
      ('La llamada de tu agente se ha filtrado a la prensa: "Quiere más minutos o salir".', 'Your agent\'s call leaked to the press: "He wants more minutes or out".'),
      [o(('Desmentirlo', 'Deny it'), {'trust': 2, 'fame': -1, 'unflag': 'agent-noise'}, ('Calmas el vestuario, pero el entrenador ya lo sabe.', 'You calm the locker room, but the coach already knows.')),
       o(('Confirmarlo', 'Confirm it'), {'trust': -4, 'fame': 3, 'unflag': 'agent-noise'}, ('Titulares por todas partes. Algún club ya pregunta.', 'Headlines everywhere. Some clubs are already asking.'))],
      flags=['agent-noise'], flagDelay=3, once=True)
    E('back-to-back', 'health', P, ('Partidos seguidos', 'Back-to-back'),
      ('Segundo partido en dos noches y te duelen las piernas.', 'Second game in two nights and your legs ache.'),
      [o(('Pedir descanso', 'Ask for rest'), {'load': -10, 'trust': -1}, ('Ves el partido desde el banquillo con hielo.', 'You watch from the bench with ice.')),
       u(('Jugar igual', 'Play anyway'), 0.7, {'trust': 2, 'load': 8}, ('Aguantas y ayudas a ganar.', 'You hold up and help win.'), {'injure': 1, 'load': 10}, ('Un tirón en el tercer cuarto. Una semana fuera.', 'A tweak in the third quarter. A week out.'))],
      minLoad=40)
    E('travel-delay', 'travel', P, ('Vuelo cancelado', 'Flight cancelled'),
      ('El vuelo del equipo se cancela y llegáis a la ciudad del partido de madrugada.', 'The team flight is cancelled and you reach the game city at dawn.'),
      [o(('Dormir lo que se pueda', 'Sleep what you can'), {'fatigue': -0.2, 'morale': -1}, ('Tres horas de sueño. Algo es algo.', 'Three hours of sleep. Better than nothing.')),
       o(('Organizar unas cartas con el equipo', 'Start a card game with the team'), {'chemistry': 3, 'fatigue': 0.2}, ('Nadie duerme, pero todos se ríen.', 'Nobody sleeps, but everyone laughs.'))])
    E('equipment-man', 'locker', P, ('El utillero', 'The equipment manager'),
      ('El utillero lleva treinta años en el club y nunca le han dado las gracias en público.', 'The equipment manager has been at the club thirty years and has never been thanked publicly.'),
      [o(('Regalarle tus zapatillas firmadas', 'Give him your signed shoes'), {'chemistry': 2, 'fans': 2}, ('Las cuelga en el almacén. Se emociona.', 'He hangs them in the storeroom. He tears up.')),
       o(('Dedicarle tu próximo partido en prensa', 'Dedicate your next game to him'), {'fame': 2, 'chemistry': 2}, ('La afición le aplaude en el siguiente partido.', 'The crowd applauds him at the next game.'))])
    E('ball-boy', 'community', P, ('El recogepelotas', 'The ball kid'),
      ('Un recogepelotas te pasa todos los balones en el calentamiento y te pide un consejo.', 'A ball kid feeds you every ball in warm-ups and asks for advice.'),
      [o(('Quedarte diez minutos con él', 'Stay ten minutes with him'), {'fans': 2, 'morale': 2}, ('Le enseñas a abrir la mano al tirar. Se va flotando.', 'You show him how to open his hand on the release. He floats away.')),
       o(('Firmarle algo y seguir', 'Sign something and move on'), {'xp': 1}, ('Se va contento. Tú, centrado.', 'He leaves happy. You stay focused.'))])
    E('new-coach-arrives', 'coach', P, ('Entrenador nuevo', 'New coach'),
      ('El club ha despedido al entrenador. El nuevo llega con fama de exigente.', 'The club fired the coach. The new one arrives known as demanding.'),
      [o(('Ser el primero en entrenar', 'Be first to practice'), {'trust': 4, 'load': 4}, ('Te ve llegar a las ocho. Lo apunta.', 'He sees you arrive at eight. He writes it down.')),
       o(('Esperar a ver qué pide', 'Wait to see what he wants'), {'morale': 1}, ('Prudencia. Ni bien ni mal.', 'Caution. Neither good nor bad.'))],
      minWeek=10, once=True)
    E('lockout-rumors', 'media', P, ('Rumores de huelga', 'Strike rumours'),
      ('Los jugadores de la liga hablan de parar por los derechos de imagen.', 'League players are talking about stopping over image rights.'),
      [o(('Apoyar públicamente', 'Back it publicly'), {'fame': 3, 'trust': -2, 'chemistry': 2}, ('Tu voz suma. La directiva no está contenta.', 'Your voice counts. The front office is not pleased.')),
       o(('No posicionarte', 'Stay out of it'), {'trust': 1}, ('Silencio. Algún compañero te mira raro.', 'Silence. A teammate gives you a look.'))],
      once=True, minWeek=12)
    E('signature-move', 'development', P, ('Tu movimiento firma', 'Your signature move'),
      ('En el entrenamiento te sale un paso atrás que nadie sabe defender.', 'In practice you pull off a step-back nobody can guard.'),
      [o(('Pulirlo en secreto', 'Polish it in secret'), {'attr': {'tiroMedia': 2}}, ('Lo guardas para un partido grande.', 'You save it for a big game.')),
       o(('Usarlo ya en partido', 'Use it in a game now'), {'fame': 2, 'confidence': 1}, ('Sale en todos los resúmenes. Los rivales ya lo estudian.', 'It is on every highlight reel. Opponents are already studying it.'))])
    E('shoe-deal-rival', 'sponsor', P, ('La competencia llama', 'The rival brand calls'),
      ('Otra marca de zapatillas te ofrece el doble si cambias a mitad de temporada.', 'Another sneaker brand offers double if you switch mid-season.'),
      [o(('Cambiar de marca', 'Switch brands'), {'cash': 15000, 'fame': 1, 'fans': -1}, ('Más dinero. Algunos fans no lo entienden.', 'More money. Some fans do not get it.')),
       o(('Ser fiel', 'Stay loyal'), {'fans': 2, 'morale': 1}, ('Tu marca lo agradece con una edición especial.', 'Your brand thanks you with a special edition.'))],
      hasSponsor=True, once=True)
    E('injury-rehab-choice', 'health', P, ('La recuperación', 'The rehab'),
      ('El médico te da dos caminos: rehabilitación lenta y segura o un tratamiento nuevo que acelera la vuelta.', 'The doctor offers two paths: slow, safe rehab or a new treatment that speeds up your return.'),
      [o(('Lenta y segura', 'Slow and safe'), {'injuryWeeks': 1, 'attr': {'durabilidad': 1}}, ('Una semana más, pero vuelves entero.', 'One more week, but you return whole.')),
       u(('Tratamiento nuevo', 'New treatment'), 0.6, {'injuryWeeks': -2, 'confidence': 1}, ('Vuelves antes y sin molestias.', 'You return early and pain-free.'), {'injuryWeeks': 2, 'morale': -3}, ('Recaída. Más tiempo fuera.', 'Setback. More time out.'))],
      injured=True)
    E('team-dinner', 'locker', P, ('La cena de equipo', 'Team dinner'),
      ('El capitán organiza una cena el día antes de un partido importante.', 'The captain organises a dinner the night before a big game.'),
      [o(('Ir y quedarte hasta el final', 'Go and stay till the end'), {'chemistry': 3, 'fatigue': 0.2}, ('Noche larga. El equipo, más unido.', 'Long night. A tighter team.')),
       o(('Ir un rato y dormir pronto', 'Go for a bit, sleep early'), {'chemistry': 1}, ('Equilibrio. Nadie se queja.', 'Balance. Nobody complains.')),
       o(('No ir', 'Skip it'), {'chemistry': -2, 'fatigue': -0.2}, ('Descansas. Te preguntan por qué no fuiste.', 'You rest. They ask why you did not come.'))])
    E('clutch-reputation', 'mental', P, ('Fama de frío', 'Ice-cold reputation'),
      ('La prensa dice que no apareces en los finales apretados.', 'The press says you vanish in tight finishes.'),
      [o(('Pedir el balón en el próximo final', 'Call for the ball next time'), {'confidence': 2, 'flag': 'prove-clutch'}, ('Lo dices en el vestuario. Ahora toca cumplir.', 'You say it in the locker room. Now you must deliver.')),
       o(('Ignorar a la prensa', 'Ignore the press'), {'morale': 1}, ('Sigues a lo tuyo.', 'You keep doing your thing.'))],
      minWeek=8, once=True)
    E('prove-clutch', 'milestone', P, ('El balón es tuyo', 'The ball is yours'),
      ('Último minuto, empate. Tus compañeros te miran: lo prometiste.', 'Last minute, tied. Your teammates look at you: you promised.'),
      [u(('Tirar', 'Shoot'), 0.5, {'confidence': 4, 'fame': 4, 'trust': 3}, ('¡Dentro! El pabellón explota.', 'Good! The arena erupts.'), {'confidence': -3, 'fame': -1}, ('Fuera. Pero lo intentaste.', 'Missed. But you tried.')),
       o(('Pasar al tirador libre', 'Pass to the open shooter'), {'chemistry': 2, 'trust': 1, 'unflag': 'prove-clutch'}, ('Asistencia y victoria. La prensa sigue dudando.', 'Assist and a win. The press still doubts.'))],
      flags=['prove-clutch'], flagDelay=2, once=True)
    E('youth-camp', 'community', P, ('Campus de verano', 'Summer camp'),
      ('Te ofrecen dirigir un campus para niños en tu barrio.', 'You are offered to run a kids\' camp in your neighbourhood.'),
      [o(('Aceptar gratis', 'Do it for free'), {'fans': 4, 'fame': 2}, ('Doscientos niños con tu dorsal.', 'Two hundred kids wearing your number.')),
       o(('Aceptar cobrando', 'Do it for a fee'), {'cash': 6000, 'fans': 1}, ('Buen sueldo de verano.', 'Nice summer pay.')),
       o(('Rechazar y descansar', 'Decline and rest'), {'load': -10}, ('Vacaciones de verdad.', 'Real holidays.'))],
      maxWeek=3)
    E('stat-tracker', 'media', P, ('Las estadísticas avanzadas', 'Advanced stats'),
      ('Una web de estadística te sitúa entre los peores defensores de la liga.', 'A stats site ranks you among the league\'s worst defenders.'),
      [o(('Estudiar los datos', 'Study the data'), {'attr': {'defInterior': 1, 'lectura': 1}}, ('Tienen razón en dos cosas. Las corriges.', 'They are right about two things. You fix them.')),
       o(('Burlarte en redes', 'Mock it online'), {'fame': 2, 'trust': -1}, ('Tu respuesta se hace viral. Los números siguen ahí.', 'Your reply goes viral. The numbers are still there.'))])
    E('crowd-chant', 'fans', P, ('Cántico propio', 'Your own chant'),
      ('La grada te ha inventado un cántico. Algunos lo encuentran ofensivo para el rival.', 'The stands made up a chant for you. Some find it insulting to the opponent.'),
      [o(('Pedir que lo cambien', 'Ask them to change it'), {'fans': -1, 'fame': 2, 'morale': 1}, ('Lo cambian por otro con tu apodo. Mejor.', 'They switch to one with your nickname. Better.')),
       o(('Disfrutarlo', 'Enjoy it'), {'fans': 2, 'trust': -1}, ('El rival se queja a la liga.', 'The opponent complains to the league.'))])
    E('weight-room', 'training', P, ('Gimnasio o pista', 'Gym or court'),
      ('El preparador quiere que ganes cuatro kilos de músculo este mes.', 'The strength coach wants you to add four kilos of muscle this month.'),
      [o(('Hacerle caso', 'Do it'), {'attr': {'fuerza': 2, 'velocidad': -1}}, ('Más fuerte en el poste. Un pelo más lento.', 'Stronger in the post. A hair slower.')),
       o(('Priorizar la velocidad', 'Prioritise speed'), {'attr': {'velocidad': 1, 'aceleracion': 1}, 'trust': -1}, ('Sigues siendo un rayo. El preparador refunfuña.', 'Still lightning quick. The coach grumbles.'))])
    E('three-point-contest', 'milestone', P, ('Invitación al concurso de triples', 'Three-point contest invite'),
      ('La liga te invita al concurso de triples del fin de semana de las estrellas.', 'The league invites you to the all-star three-point contest.'),
      [u(('Ir a por el trofeo', 'Go for the trophy'), 0.4, {'fame': 6, 'confidence': 3, 'cash': 5000}, ('¡Campeón! Último balón de dinero dentro.', 'Champion! Last money ball drops.'), {'fame': 1}, ('Eliminado en primera ronda. Experiencia.', 'Out in round one. Experience.')),
       o(('Rechazar para descansar', 'Decline to rest'), {'load': -10}, ('Fin de semana libre.', 'A free weekend.'))],
      minOvr=68, once=True, minWeek=14)
    E('trade-deadline', 'market', P, ('Cierre de mercado', 'Trade deadline'),
      ('Faltan 24 horas para el cierre y tu nombre aparece en todas las quinielas.', 'Twenty-four hours to the deadline and your name is in every rumour.'),
      [o(('Pedir al club que te mantenga', 'Ask the club to keep you'), {'trust': 2, 'morale': -1}, ('Te dicen que eres parte del proyecto. Respiras.', 'They say you are part of the project. You breathe.')),
       o(('Dejar que decidan', 'Let them decide'), {'morale': -2}, ('No pasa nada. Las 24 horas más largas de tu vida.', 'Nothing happens. The longest 24 hours of your life.'))],
      minWeek=15, maxWeek=20, once=True)
    E('community-court', 'community', P, ('La cancha de tu infancia', 'Your childhood court'),
      ('La cancha donde aprendiste está destrozada. Una empresa quiere ponerle su logotipo si la arreglas con ella.', 'The court where you learned is ruined. A company wants its logo on it if you fix it together.'),
      [o(('Pagarla tú', 'Pay for it yourself'), {'cash': -8000, 'fans': 5, 'fame': 3}, ('La cancha lleva tu nombre. El barrio, orgulloso.', 'The court bears your name. The neighbourhood is proud.')),
       o(('Aceptar a la empresa', 'Accept the company'), {'fans': 2, 'cash': 2000}, ('Cancha nueva, logotipo enorme.', 'New court, huge logo.'))],
      minFame=20, once=True)
    E('late-bloomer', 'mental', P, ('Comparaciones', 'Comparisons'),
      ('Un jugador de tu generación ya es estrella y la prensa te compara con él.', 'A player from your class is already a star and the press compares you.'),
      [o(('Usarlo de motivación', 'Use it as fuel'), {'confidence': 2, 'load': 4}, ('Entrenas con rabia.', 'You train angry.')),
       o(('Cada uno tiene su camino', 'Everyone has their path'), {'morale': 2}, ('Paz mental.', 'Peace of mind.'))],
      maxOvr=65)
    E('veteran-advice', 'locker', P, ('El consejo del veterano', 'The veteran\'s advice'),
      ('{star} te dice que dejes de forzar tiros y juegues para el equipo.', '{star} tells you to stop forcing shots and play for the team.'),
      [o(('Hacerle caso', 'Listen'), {'chemistry': 2, 'attr': {'pase': 1}}, ('Tus asistencias suben. Tus puntos, un poco menos.', 'Your assists go up. Your points, slightly down.')),
       o(('Seguir a tu manera', 'Keep your way'), {'confidence': 1, 'chemistry': -1}, ('Anotas igual. El veterano se encoge de hombros.', 'You still score. The veteran shrugs.'))])
    E('practice-fight', 'discipline', P, ('Pelea en el entrenamiento', 'Practice fight'),
      ('Dos compañeros se pegan en el entrenamiento. Tú estabas al lado.', 'Two teammates fight in practice. You were right there.'),
      [o(('Separarlos', 'Split them up'), {'chemistry': 2, 'trust': 2}, ('Te llevas un codazo, pero lo paras.', 'You take an elbow, but you stop it.')),
       o(('Llamar al entrenador', 'Call the coach'), {'trust': 1}, ('Sanciones para los dos.', 'Both get suspended.')),
       o(('No meterte', 'Stay out'), {'chemistry': -1}, ('Se calma solo. Alguien te lo recuerda.', 'It calms down. Someone remembers you stayed out.'))])
    E('documentary-cameo', 'media', P, ('Una serie sobre la liga', 'A series on the league'),
      ('Una plataforma graba una serie sobre la temporada y quiere seguirte a casa.', 'A platform is filming a series on the season and wants to follow you home.'),
      [o(('Abrir las puertas', 'Open the doors'), {'fame': 5, 'morale': -1}, ('Sales en tres episodios. Te paran por la calle.', 'You appear in three episodes. People stop you in the street.')),
       o(('Solo en la pista', 'Only on the court'), {'fame': 1}, ('Apareces poco, pero bien.', 'You appear little, but well.'))],
      minFame=15, once=True)
    E('altitude-game', 'travel', P, ('Partido en altura', 'Game at altitude'),
      ('Jugáis a dos mil metros. El aire pesa en los pulmones desde el calentamiento.', 'You play at two thousand metres. The air weighs on your lungs from warm-ups.'),
      [o(('Dosificarte', 'Pace yourself'), {'load': -4}, ('Juegas menos intenso, pero llegas al final.', 'You play less intense, but you reach the end.')),
       u(('Ir a tope', 'Go all out'), 0.5, {'fame': 2, 'confidence': 1}, ('Partidazo. Te falta el aire pero ganáis.', 'Great game. Breathless, but you win.'), {'load': 10, 'fatigue': 0.3}, ('Te vacías en el tercer cuarto.', 'You run out of gas in the third quarter.'))])
    E('autograph-dealer', 'fans', P, ('El revendedor de firmas', 'The autograph reseller'),
      ('Un hombre te pide diez firmas al día y las vende por internet.', 'A man asks you for ten autographs a day and sells them online.'),
      [o(('Seguir firmando', 'Keep signing'), {'fans': 1}, ('Firmas igual. Los niños también reciben la suya.', 'You keep signing. The kids get theirs too.')),
       o(('Firmar solo a niños', 'Sign only for kids'), {'fans': 2, 'fame': 1}, ('El revendedor se va. Los niños, felices.', 'The reseller leaves. The kids are happy.'))])
    E('playoff-beard', 'superstition', P, ('La barba de los playoffs', 'The playoff beard'),
      ('El equipo decide no afeitarse hasta perder. A ti te queda fatal.', 'The team decides not to shave until they lose. It looks terrible on you.'),
      [o(('Sumarte', 'Join in'), {'chemistry': 3}, ('Pareces un náufrago. El vestuario, encantado.', 'You look like a castaway. The locker room loves it.')),
       o(('Pasar', 'Pass'), {'chemistry': -1, 'style': 2}, ('Impecable en las fotos.', 'Spotless in photos.'))],
      lateSeason=True)
    E('car-accident-scare', 'health', P, ('Un susto en la carretera', 'A scare on the road'),
      ('Un coche se salta un semáforo y te roza. Estás bien, pero asustado.', 'A car runs a red light and clips you. You are fine, but shaken.'),
      [o(('Jugar el siguiente partido', 'Play the next game'), {'trust': 2, 'morale': -2}, ('Juegas con la cabeza en otra parte.', 'You play with your head elsewhere.')),
       o(('Tomarte unos días', 'Take a few days'), {'morale': 3, 'load': -10}, ('El club lo entiende.', 'The club understands.'))],
      once=True)
    E('mid-season-break', 'life', P, ('Parón de selecciones', 'International break'),
      ('Una semana libre sin partidos. ¿Qué haces?', 'A free week without games. What do you do?'),
      [o(('Viaje con amigos', 'Trip with friends'), {'morale': 4, 'load': -8}, ('Vuelves con las pilas cargadas.', 'You return recharged.')),
       o(('Entrenamiento individual', 'Individual training'), {'attr': {'manejo': 1, 'tiroTriple': 1}, 'load': 4}, ('Una semana de mejora pura.', 'A week of pure improvement.')),
       o(('Quedarte en casa', 'Stay home'), {'load': -12}, ('Sofá, series y descanso.', 'Sofa, shows and rest.'))],
      minWeek=10, maxWeek=14)
    E('rival-friend', 'rivalry', P, ('Tu amigo en el rival', 'Your friend on the rival'),
      ('Tu mejor amigo de la infancia juega en {opponent}. Os toca enfrentaros.', 'Your best childhood friend plays for {opponent}. You face each other.'),
      [o(('Apostar una cena', 'Bet a dinner'), {'morale': 2, 'confidence': 1}, ('Gane quien gane, cenáis juntos.', 'Whoever wins, you have dinner together.')),
       o(('Ni hablarle esa semana', 'Not speak that week'), {'confidence': 2, 'morale': -1}, ('Modo competición total.', 'Full competition mode.'))])
    E('kids-hospital', 'community', P, ('Visita al hospital', 'Hospital visit'),
      ('El club organiza una visita al hospital infantil el día libre.', 'The club organises a children\'s hospital visit on the day off.'),
      [o(('Ir', 'Go'), {'fans': 3, 'morale': 3}, ('Una niña te dice que eres su jugador favorito. Te lo llevas dentro.', 'A girl says you are her favourite player. It stays with you.')),
       o(('Ir y volver cada mes', 'Go and return monthly'), {'fans': 5, 'fame': 2, 'load': 2}, ('Se convierte en tradición.', 'It becomes a tradition.'))])
    E('ref-apology', 'press', P, ('El árbitro se equivocó', 'The referee got it wrong'),
      ('El colegio arbitral admite que la falta que te pitaron al final era inexistente.', 'The referees\' body admits the late foul called on you never happened.'),
      [o(('Pedir que se repita el partido', 'Ask for a replay'), {'fame': 2, 'trust': -1}, ('No se repite, pero se habla mucho.', 'No replay, but plenty of talk.')),
       o(('Pasar página', 'Move on'), {'morale': 1, 'trust': 1}, ('Madurez. La liga lo valora.', 'Maturity. The league notes it.'))],
      lastWon=False)
    E('nickname', 'media', P, ('Un apodo', 'A nickname'),
      ('Un comentarista te ha puesto un apodo y se ha hecho popular.', 'A commentator gave you a nickname and it caught on.'),
      [o(('Adoptarlo', 'Embrace it'), {'fame': 3, 'style': 2}, ('Ya está en las camisetas de la tienda.', 'It is already on shirts in the store.')),
       o(('Pedir que no lo usen', 'Ask them not to use it'), {'fame': -1, 'morale': 1}, ('Lo siguen usando igual.', 'They keep using it anyway.'))],
      minFame=10, once=True)
    E('contract-year', 'contract', P, ('Año de contrato', 'Contract year'),
      ('Es tu último año de contrato. Cada partido cuenta para tu próximo sueldo.', 'It is your last contract year. Every game counts toward your next deal.'),
      [o(('Jugar para las estadísticas', 'Play for the numbers'), {'confidence': 1, 'chemistry': -2}, ('Tus números suben. El vestuario lo nota.', 'Your numbers rise. The locker room notices.')),
       o(('Jugar para ganar', 'Play to win'), {'chemistry': 2, 'trust': 2}, ('Ganáis más. El mercado también lo ve.', 'You win more. The market sees that too.'))],
      contractYears=1, once=True)
    E('jet-lag', 'travel', P, ('Gira asiática', 'Asian tour'),
      ('La liga organiza dos partidos de pretemporada al otro lado del mundo.', 'The league stages two preseason games on the other side of the world.'),
      [o(('Hacer turismo', 'Go sightseeing'), {'morale': 3, 'fatigue': 0.3}, ('Templos, mercados y un jet lag brutal.', 'Temples, markets and brutal jet lag.')),
       o(('Hotel y descanso', 'Hotel and rest'), {'fatigue': -0.2}, ('Llegas fresco al partido.', 'You arrive fresh for the game.'))],
      maxWeek=2)
    E('locker-leader', 'locker', P, ('Hablar en el descanso', 'Speak at halftime'),
      ('Vais perdiendo de 18 al descanso. Nadie dice nada en el vestuario.', 'You are down 18 at halftime. Nobody says a word in the locker room.'),
      [u(('Levantarte y hablar', 'Stand up and speak'), 0.55, {'chemistry': 3, 'attr': {'liderazgo': 2}}, ('Remontáis. Nace un líder.', 'You come back. A leader is born.'), {'chemistry': -1}, ('No remontáis. Alguno piensa que no te tocaba.', 'No comeback. Some think it was not your place.')),
       o(('Dejarlo al entrenador', 'Leave it to the coach'), {'trust': 1}, ('Él habla. Vosotros escucháis.', 'He talks. You listen.'))],
      minWeek=4)
    E('bench-celebration', 'fans', P, ('El banquillo enloquece', 'The bench goes wild'),
      ('Tu celebración desde el banquillo tras una jugada de un compañero se hace viral.', 'Your bench celebration after a teammate\'s play goes viral.'),
      [o(('Repetirla cada partido', 'Repeat it every game'), {'fame': 2, 'chemistry': 2}, ('Ya es tu sello.', 'It is your trademark now.')),
       o(('Dejarlo ahí', 'Leave it'), {'chemistry': 1}, ('Un momento bonito.', 'A nice moment.'))])
    E('rookie-mentor', 'locker', P, ('Tu primer pupilo', 'Your first protégé'),
      ('Un novato de 19 años te pide que le ayudes a adaptarse.', 'A 19-year-old rookie asks you to help him settle in.'),
      [o(('Adoptarlo', 'Take him under your wing'), {'chemistry': 3, 'attr': {'liderazgo': 1}, 'load': 2}, ('Te sigue a todas partes. Mejora rápido.', 'He follows you everywhere. He improves fast.')),
       o(('Darle un par de consejos', 'Give him a couple of tips'), {'chemistry': 1}, ('Suficiente para empezar.', 'Enough to get started.'))],
      minAge=28)
    E('social-meme', 'media', P, ('Eres un meme', 'You are a meme'),
      ('Tu cara al fallar un mate se ha convertido en meme mundial.', 'Your face after a missed dunk has become a global meme.'),
      [o(('Reírte de ti mismo', 'Laugh at yourself'), {'fame': 4, 'morale': 2}, ('Publicas el meme tú. Te adoran.', 'You post the meme yourself. People love you.')),
       o(('Ignorarlo', 'Ignore it'), {'fame': 2, 'morale': -1}, ('Pasa en una semana. Más o menos.', 'It fades in a week. Roughly.'))])
    E('tattoo', 'life', P, ('El tatuaje', 'The tattoo'),
      ('Quieres tatuarte el escudo del club. Tu agente dice que es mala idea si algún día te vas.', 'You want to tattoo the club crest. Your agent says it is a bad idea if you ever leave.'),
      [o(('Hacértelo', 'Get it'), {'fans': 4, 'style': 1}, ('La grada lo celebra. Para siempre.', 'The stands celebrate. Forever.')),
       o(('Algo más neutro', 'Something more neutral'), {'style': 2}, ('Un balón y una fecha. Elegante.', 'A ball and a date. Classy.'))],
      once=True)
    E('court-surface', 'health', P, ('Pista resbaladiza', 'Slippery court'),
      ('La pista del rival está mojada por una gotera. Los árbitros dudan si suspender.', 'The away court is wet from a leak. Referees are unsure about suspending.'),
      [o(('Pedir que se suspenda', 'Ask to suspend'), {'trust': -1, 'load': -4}, ('Se aplaza. El rival se queja.', 'Postponed. The opponent complains.')),
       u(('Jugar con cuidado', 'Play carefully'), 0.8, {'trust': 2}, ('Sin incidentes.', 'No incidents.'), {'injure': 2}, ('Resbalón y torcedura.', 'Slip and sprain.'))],
      once=True)
    E('podium-speech', 'milestone', P, ('Discurso de capitán', 'Captain\'s speech'),
      ('Te eligen capitán por votación del vestuario.', 'The locker room votes you captain.'),
      [o(('Aceptar con un discurso', 'Accept with a speech'), {'attr': {'liderazgo': 2}, 'chemistry': 2}, ('Pocas palabras, muy claras.', 'Few words, very clear.')),
       o(('Rechazarlo para centrarte', 'Decline to stay focused'), {'confidence': 1}, ('Sorprende. Respetan tu decisión.', 'It surprises them. They respect it.'))],
      minAge=26, trustAbove=70, once=True)
    E('gaming-night', 'fun', P, ('Torneo de videojuegos', 'Video game tournament'),
      ('El vestuario monta un torneo de videojuegos de baloncesto. Tú sales con tu propio jugador.', 'The locker room runs a basketball video game tournament. You play as yourself.'),
      [o(('Ganarlo como sea', 'Win at all costs'), {'confidence': 1, 'chemistry': -1}, ('Campeón virtual. Algún pique real.', 'Virtual champion. Some real grudges.')),
       o(('Jugar por diversión', 'Play for fun'), {'chemistry': 3}, ('Risas hasta las dos.', 'Laughs until two.'))])
    E('ankle-brace', 'health', P, ('La tobillera', 'The ankle brace'),
      ('Los médicos te recomiendan jugar siempre con tobillera. Te resta sensibilidad.', 'Doctors advise always playing with an ankle brace. It costs you feel.'),
      [o(('Usarla', 'Wear it'), {'attr': {'durabilidad': 2, 'velocidad': -1}}, ('Más seguro, algo más lento.', 'Safer, a bit slower.')),
       o(('Solo vendaje', 'Just tape'), {'attr': {'velocidad': 1}}, ('Te sientes libre. El médico, no tanto.', 'You feel free. The doctor, less so.'))],
      once=True)
    E('opponent-trash-talk', 'rivalry', P, ('Provocación en pista', 'On-court trash talk'),
      ('{rival} no para de hablarte en cada defensa.', '{rival} keeps talking at you on every possession.'),
      [o(('Contestar con canastas', 'Answer with buckets'), {'confidence': 2}, ('Tres canastas seguidas. Se calla.', 'Three straight buckets. He shuts up.')),
       u(('Contestar con palabras', 'Answer with words'), 0.5, {'fame': 2, 'confidence': 1}, ('Le sacas de quicio. Técnica para él.', 'You get under his skin. Technical on him.'), {'trust': -2}, ('Técnica para ti.', 'Technical on you.'))])
    E('first-all-star', 'milestone', P, ('Partido de las estrellas', 'All-star game'),
      ('Los aficionados te han votado para el partido de las estrellas.', 'Fans voted you into the all-star game.'),
      [o(('Ir a por el espectáculo', 'Go for the show'), {'fame': 6, 'fans': 3}, ('Un mate entre las piernas. Portada.', 'A between-the-legs dunk. Front page.')),
       o(('Jugar suave y descansar', 'Coast and rest'), {'fame': 3, 'load': -6}, ('Disfrutas sin riesgos.', 'You enjoy it, no risks.'))],
      minOvr=72, minWeek=14, once=True)

    # ===================== JUGADOR: HISTORIAS ENCADENADAS =====================
    E('story-coach-son', 'locker', P, ('El hijo del entrenador', 'The coach\'s son'),
      ('El hijo del entrenador juega en tu puesto y recibe minutos que no merece.', 'The coach\'s son plays your position and gets minutes he has not earned.'),
      [o(('Callar y trabajar', 'Keep quiet and work'), {'load': 4, 'flag': 'coach-son-quiet'}, ('Entrenas más que nadie.', 'You outwork everyone.')),
       o(('Plantearlo al capitán', 'Raise it with the captain'), {'chemistry': 1, 'flag': 'coach-son-loud'}, ('El capitán te dice que esperes.', 'The captain tells you to wait.'))],
      minWeek=5, once=True)
    E('story-coach-son-2', 'locker', P, ('El hijo del entrenador: el día', 'The coach\'s son: the day'),
      ('El hijo del entrenador se tuerce el tobillo. Te toca salir de inicio.', 'The coach\'s son sprains his ankle. You start.'),
      [u(('Partido de tu vida', 'Game of your life'), 0.6, {'trust': 6, 'confidence': 3, 'unflag': 'coach-son-quiet'}, ('Treinta puntos. El entrenador te abraza.', 'Thirty points. The coach hugs you.'), {'trust': 1, 'unflag': 'coach-son-quiet'}, ('Partido normal. La oportunidad pasa.', 'An ordinary game. The chance passes.')),
       o(('Jugar para el equipo', 'Play for the team'), {'chemistry': 2, 'trust': 2, 'unflag': 'coach-son-quiet'}, ('Repartes el balón. Ganáis y el entrenador lo valora.', 'You share the ball. You win and the coach notices.'))],
      flags=['coach-son-quiet'], flagDelay=4, once=True)
    E('story-coach-son-3', 'locker', P, ('El hijo del entrenador: la charla', 'The coach\'s son: the talk'),
      ('El capitán habló con el entrenador. Ahora te llama a su despacho.', 'The captain spoke to the coach. Now he calls you to his office.'),
      [o(('Ser sincero', 'Be honest'), {'trust': -2, 'morale': 3, 'unflag': 'coach-son-loud'}, ('Te escucha. Las cosas cambian poco a poco.', 'He listens. Things change slowly.')),
       o(('Echarte atrás', 'Back down'), {'morale': -2, 'unflag': 'coach-son-loud'}, ('Sales con la sensación de haber perdido.', 'You leave feeling you lost.'))],
      flags=['coach-son-loud'], flagDelay=3, once=True)
    E('story-hometown', 'contract', P, ('El club de tu ciudad', 'Your hometown club'),
      ('El club de tu ciudad, recién ascendido, te llama: "Vuelve a casa el año que viene".', 'Your newly promoted hometown club calls: "Come home next year".'),
      [o(('Prometer pensarlo', 'Promise to think about it'), {'morale': 2, 'flag': 'hometown'}, ('Te ilusiona más de lo que admites.', 'It excites you more than you admit.')),
       o(('Decir que no', 'Say no'), {'trust': 2}, ('Tu club actual se entera y lo agradece.', 'Your current club hears and appreciates it.'))],
      minWeek=8, once=True)
    E('story-hometown-2', 'contract', P, ('Volver a casa', 'Going home'),
      ('El club de tu ciudad te manda una oferta formal: menos dinero, más corazón.', 'Your hometown club sends a formal offer: less money, more heart.'),
      [o(('Aceptar para el verano', 'Accept for the summer'), {'fans': 5, 'morale': 5, 'salary': 0.85, 'unflag': 'hometown'}, ('El barrio entero celebra.', 'The whole neighbourhood celebrates.')),
       o(('Quedarte donde estás', 'Stay where you are'), {'trust': 3, 'unflag': 'hometown'}, ('Algún día, quizá.', 'Someday, maybe.'))],
      flags=['hometown'], flagDelay=6, once=True)
    E('story-injury-comeback', 'health', P, ('Volver a jugar', 'Back to playing'),
      ('Tras la lesión, te notas inseguro en cada salto.', 'After the injury, you feel unsure on every jump.'),
      [o(('Psicólogo deportivo', 'Sports psychologist'), {'confidence': 2, 'flag': 'comeback'}, ('Hablar ayuda.', 'Talking helps.')),
       o(('Forzarte', 'Force yourself'), {'load': 6, 'flag': 'comeback'}, ('A base de repeticiones.', 'Through repetition.'))],
      minInjuryWeeks=0, injured=True, once=True)
    E('story-injury-comeback-2', 'health', P, ('El primer mate', 'The first dunk'),
      ('Contraataque solo. Es tu primer mate desde la lesión.', 'Fast break, alone. Your first dunk since the injury.'),
      [u(('Machacar', 'Throw it down'), 0.7, {'confidence': 4, 'fans': 3, 'unflag': 'comeback'}, ('Mate brutal. Has vuelto.', 'Brutal dunk. You are back.'), {'confidence': -2, 'unflag': 'comeback'}, ('El aro te escupe el balón. Paciencia.', 'The rim spits it out. Patience.')),
       o(('Bandeja segura', 'Safe layup'), {'confidence': 1, 'unflag': 'comeback'}, ('Dos puntos y una sonrisa.', 'Two points and a smile.'))],
      flags=['comeback'], flagDelay=3, once=True)

    # ===================== ENTRENADOR =====================
    E('c-preseason-goals', 'board', C, ('Objetivos de pretemporada', 'Preseason goals'),
      ('La directiva te pide fijar el objetivo de la temporada delante de la prensa.', 'The board asks you to state the season goal in front of the press.'),
      [o(('Prometer playoffs', 'Promise playoffs'), {'trust': 4, 'morale': -1, 'flag': 'promised-po'}, ('Titular ambicioso. Ahora toca cumplir.', 'Bold headline. Now deliver.')),
       o(('Hablar de crecer', 'Talk about growth'), {'trust': -1, 'morale': 2}, ('La directiva esperaba más. El vestuario respira.', 'The board wanted more. The locker room breathes.'))],
      maxWeek=2, once=True)
    E('c-promised-po-check', 'board', C, ('La promesa de los playoffs', 'The playoff promise'),
      ('La directiva te recuerda tu promesa de playoffs en una reunión tensa.', 'The board reminds you of your playoff promise in a tense meeting.'),
      [o(('Pedir paciencia', 'Ask for patience'), {'trust': -3, 'unflag': 'promised-po'}, ('Te dan unas semanas.', 'They give you a few weeks.')),
       o(('Pedir un fichaje', 'Ask for a signing'), {'trust': -1, 'locker': 1, 'unflag': 'promised-po'}, ('Te prometen mirar el mercado.', 'They promise to look at the market.'))],
      flags=['promised-po'], flagDelay=20, once=True)
    E('c-rotation-complaint', 'locker', C, ('Quejas por la rotación', 'Rotation complaints'),
      ('Tres suplentes se quejan de que juegan menos de diez minutos.', 'Three bench players complain they play under ten minutes.'),
      [o(('Ampliar la rotación', 'Widen the rotation'), {'locker': 3, 'chemistry': 2, 'trust': -1}, ('Más contentos. Algún partido se escapa.', 'Happier. A game slips away.')),
       o(('Mantenerla corta', 'Keep it short'), {'locker': -3, 'trust': 2}, ('Los titulares rinden. Los suplentes, enfadados.', 'Starters deliver. The bench is upset.'))])
    E('c-zone-experiment', 'tactics', C, ('Probar la zona', 'Try the zone'),
      ('Tu asistente cree que una zona 1-3-1 sorprendería al próximo rival.', 'Your assistant thinks a 1-3-1 zone would surprise the next opponent.'),
      [u(('Probarla', 'Try it'), 0.5, {'trust': 3, 'morale': 2}, ('El rival se atasca. Victoria táctica.', 'The opponent stalls. Tactical win.'), {'trust': -2}, ('Os llueven triples.', 'Threes rain down on you.')),
       o(('Seguir con la individual', 'Stay man-to-man'), {'chemistry': 1}, ('Lo de siempre. Funciona.', 'The usual. It works.'))])
    E('c-star-late', 'discipline', C, ('La estrella llega tarde', 'Star shows up late'),
      ('{star} llega veinte minutos tarde al entrenamiento previo a un partido clave.', '{star} is twenty minutes late to practice before a key game.'),
      [o(('Dejarle en el banquillo de inicio', 'Bench him to start'), {'locker': 3, 'trust': 1, 'chemistry': -1}, ('Mensaje claro. Él no está contento.', 'Clear message. He is not happy.')),
       o(('Multa discreta', 'Discreet fine'), {'locker': 1}, ('Nadie se entera. Él tampoco cambia.', 'Nobody knows. He does not change either.'))])
    E('c-assistant-idea', 'staff', C, ('El asistente propone', 'Your assistant suggests'),
      ('Tu asistente quiere dirigir él los tiempos muertos del último cuarto.', 'Your assistant wants to run the fourth-quarter timeouts himself.'),
      [o(('Darle la oportunidad', 'Give him the chance'), {'locker': 2, 'trust': -1}, ('Lo hace bien. Se siente valorado.', 'He does well. He feels valued.')),
       o(('Mantener el control', 'Keep control'), {'trust': 1}, ('Tú decides. Él lo acepta, con desgana.', 'You decide. He accepts, reluctantly.'))])
    E('c-young-pg', 'development', C, ('El base joven', 'The young point guard'),
      ('Un base de 19 años pide dirigir el equipo en el último cuarto.', 'A 19-year-old point guard asks to run the team in the fourth.'),
      [u(('Dárselo', 'Give it to him'), 0.45, {'locker': 2, 'morale': 3}, ('Lo borda. Ha nacido un base.', 'He nails it. A point guard is born.'), {'trust': -2}, ('Pérdidas y derrota. Aprenderá.', 'Turnovers and a loss. He will learn.')),
       o(('Esperar', 'Wait'), {'trust': 1}, ('El veterano cierra el partido.', 'The veteran closes it.'))])
    E('c-media-rival', 'press', C, ('El entrenador rival te ataca', 'The rival coach attacks you'),
      ('El entrenador de {opponent} dice que tu equipo juega "sucio".', 'The {opponent} coach says your team plays "dirty".'),
      [o(('Responder con ironía', 'Answer with irony'), {'fame': 2, 'morale': 2}, ('Tu respuesta se hace viral.', 'Your reply goes viral.')),
       o(('No entrar', 'Do not engage'), {'trust': 1}, ('Silencio. La directiva lo valora.', 'Silence. The board values it.'))])
    E('c-practice-closed', 'media', C, ('Entrenamientos a puerta cerrada', 'Closed practices'),
      ('La prensa se queja de que cierras todos los entrenamientos.', 'The press complains you close every practice.'),
      [o(('Abrir uno a la semana', 'Open one a week'), {'fame': 2, 'locker': -1}, ('Mejor relación con los medios.', 'Better media relations.')),
       o(('Seguir cerrando', 'Keep them closed'), {'locker': 2, 'fame': -1}, ('El vestuario lo agradece.', 'The locker room appreciates it.'))])
    E('c-injury-rush', 'health', C, ('Forzar a un lesionado', 'Rush an injured player'),
      ('El médico dice que tu pívot necesita una semana más. Hay partido grande.', 'The doctor says your center needs another week. Big game coming.'),
      [o(('Respetar al médico', 'Trust the doctor'), {'locker': 2, 'trust': -1}, ('Perdéis sin él, pero vuelve sano.', 'You lose without him, but he returns healthy.')),
       u(('Jugar con él', 'Play him'), 0.55, {'trust': 3}, ('Aguanta y ganáis.', 'He holds up and you win.'), {'locker': -3, 'trust': -2}, ('Recae. Un mes fuera.', 'Relapse. A month out.'))])
    E('c-fan-sign', 'fans', C, ('Pancarta contra ti', 'Banner against you'),
      ('Tras tres derrotas, aparece una pancarta pidiendo tu dimisión.', 'After three losses, a banner demands your resignation.'),
      [o(('Ir a hablar con la grada', 'Go talk to the stands'), {'fans': 3, 'morale': -1}, ('Te escuchan. Te dan tiempo.', 'They listen. They give you time.')),
       o(('Ignorarla', 'Ignore it'), {'morale': -2}, ('La pancarta sigue la semana siguiente.', 'The banner returns next week.'))],
      loseStreak=3)
    E('c-captain-vote', 'locker', C, ('Votación de capitán', 'Captain vote'),
      ('El vestuario quiere votar al capitán; tú prefieres elegirlo.', 'The locker room wants to vote the captain; you prefer to choose.'),
      [o(('Dejar votar', 'Let them vote'), {'locker': 3, 'chemistry': 2}, ('Eligen a quien tú habrías elegido. Casi.', 'They pick who you would have picked. Almost.')),
       o(('Elegirlo tú', 'Choose yourself'), {'trust': 2, 'locker': -2}, ('Autoridad. Algún murmullo.', 'Authority. Some murmurs.'))],
      maxWeek=4, once=True)
    E('c-hot-hand', 'tactics', C, ('La mano caliente', 'The hot hand'),
      ('Un suplente lleva 18 puntos en el tercer cuarto. Tu titular espera para volver.', 'A reserve has 18 points in the third quarter. Your starter waits to return.'),
      [o(('Dejar al suplente', 'Keep the reserve in'), {'locker': 1, 'chemistry': 1}, ('Sigue enchufado. El titular, serio.', 'He stays hot. The starter is unhappy.')),
       o(('Volver al titular', 'Bring the starter back'), {'trust': 1}, ('Jerarquía respetada.', 'Hierarchy respected.'))])
    E('c-long-trip', 'travel', C, ('Gira de cinco partidos', 'Five-game road trip'),
      ('Cinco partidos fuera en diez días. El equipo está fundido.', 'Five road games in ten days. The team is spent.'),
      [o(('Entrenamientos ligeros', 'Light practices'), {'fatigue': -0.3, 'trust': -1}, ('Piernas frescas, sistemas oxidados.', 'Fresh legs, rusty sets.')),
       o(('Mantener la exigencia', 'Keep the intensity'), {'fatigue': 0.3, 'trust': 1}, ('Disciplina. Alguno se resiente.', 'Discipline. Some feel it.'))])
    E('c-analytics-hire', 'staff', C, ('Contratar un analista', 'Hire an analyst'),
      ('La directiva ofrece pagar un analista de datos si lo pides.', 'The board offers to pay a data analyst if you ask.'),
      [o(('Contratarlo', 'Hire him'), {'trust': 2, 'locker': -1}, ('Gráficos por todas partes. Algunos jugadores bostezan.', 'Charts everywhere. Some players yawn.')),
       o(('Seguir con tu ojo', 'Trust your eye'), {'locker': 1}, ('Baloncesto de siempre.', 'Old-school basketball.'))],
      once=True)
    E('c-rookie-wall', 'development', C, ('El muro del novato', 'The rookie wall'),
      ('Tu novato estrella lleva tres semanas sin acertar. Está hundido.', 'Your star rookie has not hit for three weeks. He is crushed.'),
      [o(('Darle descanso', 'Rest him'), {'locker': 1, 'morale': 1}, ('Vuelve renovado dos semanas después.', 'He returns refreshed two weeks later.')),
       o(('Más minutos para que salga', 'More minutes to play through'), {'trust': -1, 'chemistry': 1}, ('Sufre, pero acaba saliendo.', 'He struggles, then breaks out.'))],
      minWeek=10)
    E('c-ref-meeting', 'press', C, ('Reunión con los árbitros', 'Referee meeting'),
      ('La liga te cita tras tus críticas al arbitraje.', 'The league summons you after your criticism of officiating.'),
      [o(('Disculparte', 'Apologise'), {'trust': 1, 'fame': -1}, ('Asunto cerrado.', 'Matter closed.')),
       o(('Mantener tus palabras', 'Stand by your words'), {'fame': 2, 'cash': -2000}, ('Multa. La afición te aplaude.', 'Fine. The fans applaud.'))],
      once=True)
    E('c-player-holdout', 'contract', C, ('Un jugador no entrena', 'Player holdout'),
      ('Tu mejor reboteador no entrena hasta que le renueven.', 'Your best rebounder will not practice until he gets a new deal.'),
      [o(('Pedir a la directiva que renueve', 'Ask the board to renew'), {'locker': 2, 'trust': -2}, ('Renueva. La directiva no olvida.', 'He renews. The board does not forget.')),
       o(('Apoyar a la directiva', 'Back the board'), {'trust': 2, 'locker': -3}, ('Vuelve a entrenar, sin ganas.', 'He returns, reluctantly.'))],
      once=True)
    E('c-viral-timeout', 'media', C, ('Tu tiempo muerto viral', 'Your viral timeout'),
      ('Las cámaras captan tu bronca en un tiempo muerto. Millones de visitas.', 'Cameras caught your timeout rant. Millions of views.'),
      [o(('Pedir perdón al equipo', 'Apologise to the team'), {'locker': 2}, ('Se lo toman bien.', 'They take it well.')),
       o(('No arrepentirte', 'No regrets'), {'fame': 3, 'locker': -1}, ('Ya eres un personaje.', 'You are a character now.'))])
    E('c-press-conference-walkout', 'press', C, ('Pregunta incómoda', 'Awkward question'),
      ('Un periodista pregunta por la vida privada de un jugador.', 'A reporter asks about a player\'s private life.'),
      [o(('Cortar en seco', 'Shut it down'), {'locker': 3, 'fame': -1}, ('El vestuario lo agradece.', 'The locker room appreciates it.')),
       o(('Responder con evasivas', 'Dodge it'), {'locker': -1}, ('Nadie queda contento.', 'Nobody is happy.'))])
    E('c-team-retreat', 'locker', C, ('Retiro en la montaña', 'Mountain retreat'),
      ('Propones tres días de convivencia en la montaña a mitad de temporada.', 'You propose a three-day mountain retreat mid-season.'),
      [o(('Hacerlo', 'Do it'), {'chemistry': 4, 'fatigue': -0.2, 'trust': -1}, ('Vuelven más unidos.', 'They return closer.')),
       o(('No es el momento', 'Not the time'), {'trust': 1}, ('Seguís con la rutina.', 'You stick to routine.'))],
      minWeek=8, maxWeek=16, once=True)
    E('c-scout-gem', 'market', C, ('Una joya escondida', 'A hidden gem'),
      ('Tu ojeador ha encontrado un jugador de segunda división que podría ser titular.', 'Your scout found a second-division player who could start.'),
      [o(('Pedir que lo fichen', 'Ask to sign him'), {'trust': -1, 'locker': 1, 'cash': -5000}, ('Llega a prueba. Promete.', 'He arrives on trial. Promising.')),
       o(('Seguirlo un año más', 'Track him another year'), {'xp': 2}, ('Lo apuntas.', 'You note him.'))])
    E('c-tank-pressure', 'board', C, ('Perder para mejorar', 'Lose to get better'),
      ('Un directivo te sugiere en privado "no esforzarse" en el tramo final.', 'A director privately suggests "not trying too hard" down the stretch.'),
      [o(('Negarte', 'Refuse'), {'locker': 3, 'trust': -2}, ('El vestuario se entera y te respeta.', 'The locker room hears and respects you.')),
       o(('Dar minutos a los jóvenes', 'Give minutes to youngsters'), {'trust': 1, 'locker': 1}, ('Una salida elegante.', 'An elegant way out.'))],
      lateSeason=True, once=True)
    E('c-player-religion', 'locker', C, ('Ayuno durante la temporada', 'Fasting mid-season'),
      ('Un jugador ayuna por motivos personales durante unas semanas.', 'A player fasts for personal reasons for a few weeks.'),
      [o(('Adaptar sus cargas', 'Adapt his workload'), {'locker': 3}, ('Se siente respetado.', 'He feels respected.')),
       o(('Mantener el plan', 'Keep the plan'), {'locker': -2, 'trust': 1}, ('Rinde menos esas semanas.', 'He performs less those weeks.'))],
      once=True)
    E('c-ex-player-return', 'rivalry', C, ('Vuelve un ex', 'An ex returns'),
      ('Un jugador que echaste vuelve con {opponent} y promete venganza.', 'A player you cut returns with {opponent} promising revenge.'),
      [o(('Defensa especial sobre él', 'Special defence on him'), {'trust': 1}, ('Le dejáis en 6 puntos.', 'You hold him to 6.')),
       o(('Tratarlo como uno más', 'Treat him normally'), {'locker': 1}, ('Hace 25. Pero ganáis.', 'He scores 25. But you win.'))])
    E('c-home-court', 'fans', C, ('Pabellón medio vacío', 'Half-empty arena'),
      ('La afición no llena el pabellón y la directiva pide ideas.', 'Fans are not filling the arena and the board wants ideas.'),
      [o(('Entrenamiento abierto gratis', 'Free open practice'), {'fans': 4, 'fatigue': 0.1}, ('Lleno hasta arriba.', 'Packed to the rafters.')),
       o(('Firmas tras cada partido', 'Autographs after every game'), {'fans': 3, 'locker': -1}, ('Algún jugador protesta.', 'Some players grumble.'))])
    E('c-tech-foul-strategy', 'tactics', C, ('Técnica a propósito', 'Technical on purpose'),
      ('El equipo está apagado. Una técnica tuya podría despertarlo.', 'The team is flat. A technical on you might wake them up.'),
      [u(('Provocarla', 'Get one'), 0.5, {'morale': 3, 'locker': 2}, ('El pabellón ruge. Remontada.', 'The arena roars. Comeback.'), {'trust': -2}, ('Tiros libres para el rival y nada cambia.', 'Free throws for them and nothing changes.')),
       o(('Tiempo muerto tranquilo', 'Calm timeout'), {'trust': 1}, ('Ajustes. Mejoráis un poco.', 'Adjustments. Slight improvement.'))])
    E('c-old-mentor', 'coach', C, ('Tu mentor en el otro banquillo', 'Your mentor on the other bench'),
      ('Tu antiguo mentor dirige a {opponent}. Te escribe antes del partido.', 'Your old mentor coaches {opponent}. He texts you before the game.'),
      [o(('Quedar a cenar después', 'Plan dinner after'), {'morale': 3}, ('Gane quien gane, buena noche.', 'Whoever wins, a good night.')),
       o(('Esquivarle esa semana', 'Avoid him that week'), {'trust': 1}, ('Concentración total.', 'Full focus.'))],
      once=True)
    E('c-salary-dump', 'board', C, ('Recortes', 'Cutbacks'),
      ('La directiva quiere recortar un 10 % de la masa salarial.', 'The board wants to cut 10% of the payroll.'),
      [o(('Aceptar', 'Accept'), {'trust': 3, 'locker': -2, 'cash': 10000}, ('Cuadran las cuentas. El vestuario, preocupado.', 'Books balance. Locker room worried.')),
       o(('Plantarte', 'Push back'), {'trust': -3, 'locker': 2}, ('Se aplaza. La relación se enfría.', 'Postponed. Relations cool.'))],
      once=True, minWeek=6)
    E('c-player-podcast', 'media', C, ('El podcast de un jugador', 'A player\'s podcast'),
      ('Un jugador critica tus sistemas en su podcast.', 'A player criticises your systems on his podcast.'),
      [o(('Hablarlo en privado', 'Talk privately'), {'locker': 2}, ('Se disculpa.', 'He apologises.')),
       o(('Sanción', 'Suspend him'), {'trust': 2, 'locker': -2}, ('Mensaje recibido. Él, resentido.', 'Message received. He is resentful.'))])
    E('c-youth-coach', 'staff', C, ('El entrenador de cantera', 'The youth coach'),
      ('El técnico de la cantera quiere que subas a tres juveniles a entrenar contigo.', 'The youth coach wants you to bring three juniors to train with you.'),
      [o(('Subirlos', 'Bring them up'), {'locker': 1, 'xp': 2}, ('Uno de ellos sorprende.', 'One of them surprises.')),
       o(('Más adelante', 'Later'), {'trust': 1}, ('Los entrenamientos siguen intensos.', 'Practices stay intense.'))])
    E('c-new-arena', 'board', C, ('Nuevo pabellón', 'New arena'),
      ('El ayuntamiento propone un pabellón nuevo a cambio de jugar dos años en uno provisional.', 'The city proposes a new arena in exchange for two years in a temporary one.'),
      [o(('Apoyar el proyecto', 'Back the project'), {'trust': 3, 'fans': -2}, ('Dos años incómodos, futuro brillante.', 'Two awkward years, a bright future.')),
       o(('Pedir que se espere', 'Ask to wait'), {'fans': 2, 'trust': -2}, ('La afición conserva su casa.', 'Fans keep their home.'))],
      once=True, minWeek=10)
    E('c-press-favourite', 'press', C, ('El periodista favorito', 'The favourite reporter'),
      ('Un periodista siempre te trata bien. Otros dicen que le das exclusivas.', 'One reporter always treats you well. Others say you give him scoops.'),
      [o(('Repartir exclusivas', 'Share scoops around'), {'fame': 1}, ('Todos contentos, nadie fiel.', 'Everyone happy, no one loyal.')),
       o(('Seguir con él', 'Stick with him'), {'fame': 2, 'trust': -1}, ('Un aliado en los medios.', 'An ally in the media.'))])
    E('c-two-way-big', 'tactics', C, ('Dos pívots', 'Two bigs'),
      ('Tienes dos pívots buenos. ¿Juegan juntos?', 'You have two good centers. Do they play together?'),
      [o(('Juntos', 'Together'), {'locker': 2}, ('Dominio del rebote, menos espacio.', 'Rebound dominance, less spacing.')),
       o(('Repartir minutos', 'Split minutes'), {'chemistry': 1}, ('Siempre hay uno fresco.', 'One is always fresh.'))])
    E('c-holiday-practice', 'training', C, ('Entrenar en festivo', 'Practice on a holiday'),
      ('Mañana es festivo y el equipo esperaba descansar.', 'Tomorrow is a holiday and the team expected rest.'),
      [o(('Dar el día libre', 'Give the day off'), {'locker': 3, 'fatigue': -0.2}, ('Vuelven con ganas.', 'They return eager.')),
       o(('Entrenar igual', 'Practice anyway'), {'locker': -2, 'trust': 1}, ('Disciplina, caras largas.', 'Discipline, long faces.'))])
    E('c-rival-tape', 'tactics', C, ('Te llega un vídeo del rival', 'You get a rival tape'),
      ('Alguien te envía de forma anónima un vídeo de los entrenamientos del rival.', 'Someone anonymously sends you footage of the rival\'s practices.'),
      [o(('No verlo y avisar a la liga', 'Do not watch, tell the league'), {'fame': 2, 'trust': 2}, ('Gesto de deportividad.', 'A sporting gesture.')),
       u(('Verlo', 'Watch it'), 0.6, {'morale': 2}, ('Ganáis. Nadie se entera.', 'You win. Nobody finds out.'), {'trust': -6, 'fame': -3}, ('Se filtra. Escándalo.', 'It leaks. Scandal.'))],
      once=True)
    E('c-player-baby', 'locker', C, ('Paternidad', 'Fatherhood'),
      ('Un titular va a ser padre la semana del partido más importante.', 'A starter is becoming a father the week of the biggest game.'),
      [o(('Que vaya al hospital', 'Let him go to the hospital'), {'locker': 4}, ('Perdéis sin él. El vestuario te admira.', 'You lose without him. The locker room admires you.')),
       o(('Pedirle que juegue', 'Ask him to play'), {'locker': -3, 'trust': 1}, ('Juega con la cabeza en otro sitio.', 'He plays with his mind elsewhere.'))],
      once=True)
    E('c-final-speech', 'milestone', C, ('Charla antes de la final', 'Speech before the final'),
      ('Último partido de la temporada. El vestuario espera tus palabras.', 'Last game of the season. The locker room awaits your words.'),
      [o(('Emoción', 'Emotion'), {'morale': 4, 'locker': 2}, ('Salen a la pista con lágrimas en los ojos.', 'They take the floor with tears in their eyes.')),
       o(('Táctica pura', 'Pure tactics'), {'trust': 2}, ('Nadie olvida su asignación.', 'Nobody forgets their assignment.'))],
      lateSeason=True)
    E('c-international-call', 'national', C, ('La selección te quiere', 'The national team wants you'),
      ('La federación te ofrece ser seleccionador además de entrenar al club.', 'The federation offers you the national team job alongside the club.'),
      [o(('Aceptar', 'Accept'), {'fame': 5, 'trust': -2, 'fatigue': 0.2}, ('Doble trabajo, doble prestigio.', 'Double job, double prestige.')),
       o(('Rechazar', 'Decline'), {'trust': 3}, ('El club te lo agradece.', 'The club thanks you.'))],
      minFame=30, once=True)
    E('c-ex-star-coach', 'staff', C, ('Una leyenda quiere ayudar', 'A legend wants to help'),
      ('Una leyenda del club se ofrece como asistente sin experiencia.', 'A club legend offers to be an assistant with no experience.'),
      [o(('Aceptarla', 'Accept'), {'fans': 3, 'locker': 1}, ('La afición encantada. Él aprende rápido.', 'Fans delighted. He learns fast.')),
       o(('Rechazarla con tacto', 'Decline gently'), {'trust': 1}, ('Lo entiende.', 'He understands.'))],
      once=True)
    E('c-fake-injury', 'discipline', C, ('Lesión fingida', 'Faked injury'),
      ('Sospechas que un jugador finge molestias para no viajar.', 'You suspect a player fakes pain to avoid travel.'),
      [o(('Pruebas médicas', 'Medical tests'), {'locker': -1, 'trust': 1}, ('No tiene nada. Viaja.', 'Nothing wrong. He travels.')),
       o(('Confiar en él', 'Trust him'), {'locker': 1}, ('Se queda. Quizá era verdad.', 'He stays. Maybe it was true.'))])
    E('c-crowd-music', 'fans', C, ('La música del pabellón', 'Arena music'),
      ('Los jugadores quieren cambiar la música del calentamiento.', 'Players want to change the warm-up music.'),
      [o(('Que elijan ellos', 'Let them choose'), {'chemistry': 2}, ('Calentamientos con más energía.', 'Warm-ups with more energy.')),
       o(('Lo decide el club', 'The club decides'), {'trust': 1}, ('Música de siempre.', 'The usual playlist.'))])
    E('c-tired-legs', 'health', C, ('Piernas cansadas', 'Tired legs'),
      ('El preparador físico avisa: el equipo está al límite de carga.', 'The fitness coach warns: the team is at its load limit.'),
      [o(('Semana suave', 'Easy week'), {'fatigue': -0.4, 'trust': -1}, ('Recuperación total.', 'Full recovery.')),
       o(('Aguantar hasta el parón', 'Push to the break'), {'fatigue': 0.2, 'trust': 1}, ('Un par de molestias.', 'A couple of knocks.'))],
      minWeek=12)
    E('c-board-son', 'board', C, ('El hijo del presidente', 'The president\'s son'),
      ('El presidente te pide que dé minutos a su hijo, suplente del equipo.', 'The president asks you to give minutes to his son, a reserve.'),
      [o(('Dárselos', 'Give them'), {'trust': 3, 'locker': -3}, ('El presidente feliz. El vestuario, no.', 'The president is happy. The locker room is not.')),
       o(('Negarte', 'Refuse'), {'trust': -3, 'locker': 3}, ('Respeto en el vestuario. Frío en el palco.', 'Respect in the locker room. Chill in the box.'))],
      once=True)
    E('c-rookie-prank', 'locker', C, ('Novatada', 'Rookie prank'),
      ('Los veteranos le gastan una novatada pesada a un novato.', 'Veterans pull a harsh prank on a rookie.'),
      [o(('Pararla', 'Stop it'), {'locker': 1, 'chemistry': -1}, ('Los veteranos se quejan.', 'The veterans complain.')),
       o(('Dejar que siga la tradición', 'Let tradition be'), {'chemistry': 2, 'locker': -1}, ('El novato lo supera.', 'The rookie gets through it.'))])
    E('c-press-tactics', 'press', C, ('Te piden explicar la táctica', 'Explain your tactics'),
      ('Un periodista técnico pregunta por tu defensa en ayudas.', 'A tactics reporter asks about your help defence.'),
      [o(('Explicarla a fondo', 'Explain it in depth'), {'fame': 2, 'trust': -1}, ('Gran artículo. El rival también lo lee.', 'Great article. The rival reads it too.')),
       o(('Guardar secretos', 'Keep secrets'), {'trust': 1}, ('"Lo veréis en la pista".', '"You will see on the court".'))])
    E('c-win-streak-relax', 'mental', C, ('Racha de victorias', 'Winning streak'),
      ('Seis victorias seguidas. Notas al equipo relajado.', 'Six straight wins. The team feels relaxed.'),
      [o(('Apretar en el entrenamiento', 'Push in practice'), {'trust': 2, 'locker': -1}, ('Nadie se duerme.', 'Nobody falls asleep.')),
       o(('Disfrutar el momento', 'Enjoy the moment'), {'locker': 2, 'morale': 2}, ('Buen ambiente.', 'Great vibes.'))],
      winStreak=5)
    E('c-sponsor-shirt', 'sponsor', C, ('Camiseta especial', 'Special jersey'),
      ('El patrocinador quiere una camiseta rosa fosforito para un partido.', 'The sponsor wants a neon pink jersey for one game.'),
      [o(('Aceptar', 'Accept'), {'cash': 8000, 'fans': -1}, ('Se agotan en la tienda.', 'They sell out in the store.')),
       o(('Rechazar', 'Decline'), {'fans': 1, 'trust': -1}, ('Tradición respetada.', 'Tradition respected.'))],
      once=True)
    E('c-player-agent-call', 'market', C, ('Un agente te llama', 'An agent calls'),
      ('Un agente te ofrece a una estrella de otra liga si convences a la directiva.', 'An agent offers you a star from another league if you convince the board.'),
      [o(('Presionar a la directiva', 'Pressure the board'), {'trust': -2, 'locker': 1}, ('Se estudia en verano.', 'It will be studied in summer.')),
       o(('No es el momento', 'Not the time'), {'trust': 1}, ('Sigues con lo que tienes.', 'You stay with what you have.'))])
    E('c-own-mistake', 'mental', C, ('Te equivocaste', 'You got it wrong'),
      ('Tu cambio en el último minuto costó el partido. Todos lo saben.', 'Your last-minute substitution cost the game. Everyone knows.'),
      [o(('Asumirlo en prensa', 'Own it publicly'), {'locker': 3, 'fame': 1}, ('El vestuario valora tu honestidad.', 'The locker room values your honesty.')),
       o(('Hablar del arbitraje', 'Blame the referees'), {'locker': -2, 'fame': -1}, ('Nadie se lo cree.', 'Nobody buys it.'))],
      lastWon=False)
    E('c-season-review', 'board', C, ('Balance a mitad de temporada', 'Mid-season review'),
      ('La directiva te pide un informe por escrito de la primera mitad.', 'The board asks for a written report on the first half.'),
      [o(('Honesto y autocrítico', 'Honest and self-critical'), {'trust': 2}, ('Valoran la claridad.', 'They value the clarity.')),
       o(('Destacar lo positivo', 'Highlight the positives'), {'trust': -1, 'morale': 1}, ('Les parece optimista.', 'They find it optimistic.'))],
      minWeek=14, maxWeek=18, once=True)
    E('c-story-star-contract', 'contract', C, ('La renovación de la estrella', 'The star\'s renewal'),
      ('{star} quiere renovar y pide que le garantices tiros en los finales.', '{star} wants to renew and asks you to guarantee him crunch-time shots.'),
      [o(('Prometérselo', 'Promise it'), {'locker': -1, 'flag': 'star-promise'}, ('Renueva. La promesa queda en el aire.', 'He renews. The promise hangs in the air.')),
       o(('Sin promesas', 'No promises'), {'locker': 1, 'trust': 1}, ('Se lo piensa.', 'He thinks it over.'))],
      once=True, minWeek=6)
    E('c-story-star-contract-2', 'contract', C, ('La promesa', 'The promise'),
      ('Final apretado. Tu sistema pide otro tirador, pero prometiste el balón a {star}.', 'Tight finish. Your play calls for another shooter, but you promised {star} the ball.'),
      [u(('Cumplir la promesa', 'Keep the promise'), 0.5, {'locker': 2, 'trust': 2, 'unflag': 'star-promise'}, ('La mete. Promesa cumplida.', 'He hits it. Promise kept.'), {'locker': -1, 'unflag': 'star-promise'}, ('La falla. El vestuario murmura.', 'He misses. The locker room murmurs.')),
       o(('Seguir el sistema', 'Run the play'), {'locker': -3, 'trust': 1, 'unflag': 'star-promise'}, ('Ganáis, pero {star} no te habla.', 'You win, but {star} will not speak to you.'))],
      flags=['star-promise'], flagDelay=5, once=True)

    # ===================== CUALQUIER MODO: VIDA, DINERO, MEDIOS =====================
    def S(eid, cat, title, body, a, b, mode=A, **cond):
        E(eid, cat, mode, title, body, [a, b], **cond)
    S('a-apartment', 'money', ('Piso nuevo', 'New apartment'), ('Te ofrecen un ático céntrico con vistas al pabellón.', 'You are offered a downtown penthouse overlooking the arena.'),
      o(('Comprarlo', 'Buy it'), {'cash': -20000, 'morale': 4, 'style': 2}, ('Vistas increíbles. Hipoteca también.', 'Incredible views. So is the mortgage.')),
      o(('Seguir de alquiler', 'Keep renting'), {'cash': 2000}, ('Prudencia financiera.', 'Financial prudence.')))
    S('a-financial-advisor', 'money', ('Asesor financiero', 'Financial adviser'), ('Un asesor promete duplicar tus ahorros en un año.', 'An adviser promises to double your savings in a year.'),
      u(('Invertir con él', 'Invest with him'), 0.35, {'cash': 25000}, ('La inversión sale bien. Por esta vez.', 'The investment works. This time.'), {'cash': -15000, 'morale': -3}, ('Era humo. Pierdes dinero.', 'It was smoke. You lose money.')),
      o(('Fondo indexado aburrido', 'Boring index fund'), {'cash': 3000}, ('Crece despacio y seguro.', 'Grows slowly and safely.')))
    S('a-charity-match', 'community', ('Partido benéfico', 'Charity game'), ('Te invitan a un partido benéfico en verano contra famosos.', 'You are invited to a summer charity game against celebrities.'),
      o(('Jugar en serio', 'Play for real'), {'fame': 2, 'fans': 2}, ('Ganáis de 40. Los famosos se ríen.', 'You win by 40. The celebrities laugh.')),
      o(('Hacer el payaso', 'Clown around'), {'fans': 3, 'style': 2}, ('Vídeo viral de tus tonterías.', 'A viral video of your antics.')), maxWeek=4)
    S('a-old-friend-money', 'life', ('Un amigo pide dinero', 'A friend asks for money'), ('Un amigo de la infancia te pide un préstamo para su negocio.', 'A childhood friend asks for a loan for his business.'),
      u(('Prestárselo', 'Lend it'), 0.5, {'morale': 3, 'cash': 2000}, ('El negocio funciona y te devuelve con intereses.', 'The business works and he repays with interest.'), {'cash': -10000, 'morale': -2}, ('El negocio cierra. Y la amistad se enfría.', 'The business closes. And the friendship cools.')),
      o(('Ayudarle de otra manera', 'Help another way'), {'morale': 1}, ('Le presentas a gente útil.', 'You introduce him to useful people.')))
    S('a-radio-interview', 'media', ('Entrevista en la radio local', 'Local radio interview'), ('La radio de la ciudad te quiere una hora en directo.', 'The city radio wants you live for an hour.'),
      o(('Ir y abrirte', 'Go and open up'), {'fans': 3, 'fame': 1}, ('La ciudad te conoce mejor.', 'The city gets to know you.')),
      o(('Respuestas cortas', 'Short answers'), {'fame': 1}, ('Correcto, sin titulares.', 'Correct, no headlines.')))
    S('a-cooking-show', 'fun', ('Programa de cocina', 'Cooking show'), ('Un programa de cocina te invita a un especial de deportistas.', 'A cooking show invites you to an athletes\' special.'),
      u(('Ir a por la victoria', 'Go for the win'), 0.4, {'fame': 4, 'morale': 2}, ('Ganas con una tortilla perfecta.', 'You win with a perfect omelette.'), {'fame': 1, 'morale': -1}, ('Quemas el postre en directo.', 'You burn the dessert live.')),
      o(('Rechazar', 'Decline'), {'load': -4}, ('Tarde libre.', 'A free afternoon.')))
    S('a-language-class', 'life', ('Aprender el idioma', 'Learn the language'), ('En el club hay compañeros de seis países. Podrías aprender otro idioma.', 'The club has teammates from six countries. You could learn a new language.'),
      o(('Clases tres días a la semana', 'Classes three days a week'), {'chemistry': 2, 'xp': 2, 'load': 2}, ('Ya bromeas con ellos en su idioma.', 'You already joke with them in their language.')),
      o(('Ya habrá tiempo', 'There will be time'), {'load': -2}, ('Te quedas con lo básico.', 'You stick to the basics.')))
    S('a-paparazzi', 'media', ('Paparazzi', 'Paparazzi'), ('Unos fotógrafos te siguen a la salida de un restaurante.', 'Photographers follow you out of a restaurant.'),
      o(('Posar y sonreír', 'Pose and smile'), {'fame': 2, 'style': 1}, ('Buenas fotos. Te dejan en paz.', 'Nice photos. They leave you alone.')),
      o(('Taparte y salir rápido', 'Cover up and leave fast'), {'morale': -1}, ('La foto borrosa sale igual.', 'The blurry photo runs anyway.')), minFame=15)
    S('a-hometown-statue', 'legacy', ('Un mural en tu barrio', 'A mural in your neighbourhood'), ('Unos artistas quieren pintarte en un mural de tu barrio.', 'Artists want to paint you on a mural in your neighbourhood.'),
      o(('Ir a la inauguración', 'Attend the unveiling'), {'fans': 4, 'fame': 2}, ('Fotos con todo el barrio.', 'Photos with the whole neighbourhood.')),
      o(('Pedir que pinten a otro', 'Ask them to paint someone else'), {'morale': 2}, ('Eliges a tu primer entrenador. Emotivo.', 'You pick your first coach. Moving.')), minFame=30, once=True)
    S('a-sleep-study', 'health', ('Estudio del sueño', 'Sleep study'), ('El club te ofrece un estudio del sueño con pulsera y aplicación.', 'The club offers a sleep study with a band and an app.'),
      o(('Aceptar', 'Accept'), {'fatigue': -0.3, 'xp': 1}, ('Descubres que duermes fatal. Lo arreglas.', 'You learn you sleep terribly. You fix it.')),
      o(('Dormir a tu manera', 'Sleep your way'), {'morale': 1}, ('Tus ocho horas de siempre.', 'Your usual eight hours.')))
    S('a-yoga', 'training', ('Yoga', 'Yoga'), ('El fisioterapeuta recomienda yoga dos veces por semana.', 'The physio recommends yoga twice a week.'),
      o(('Probarlo', 'Try it'), {'load': -6, 'xp': 1}, ('Flexibilidad y calma.', 'Flexibility and calm.')),
      o(('Gimnasio de siempre', 'Usual gym'), {'load': 2}, ('Más pesas.', 'More weights.')))
    S('a-video-game-company', 'money', ('Una empresa de videojuegos', 'A video game company'), ('Una empresa te ofrece invertir en un juego de baloncesto independiente.', 'A company offers you a stake in an indie basketball game.'),
      u(('Invertir', 'Invest'), 0.45, {'cash': 20000, 'fame': 2}, ('El juego triunfa. Sales en la portada.', 'The game is a hit. You are on the cover.'), {'cash': -8000}, ('No se vende.', 'It does not sell.')),
      o(('Pasar', 'Pass'), {}, ('Otra vez será.', 'Another time.')))
    S('a-fan-letter', 'fans', ('Carta de un aficionado', 'A fan letter'), ('Recibes una carta escrita a mano de un aficionado de 80 años.', 'You receive a handwritten letter from an 80-year-old fan.'),
      o(('Responderle a mano', 'Reply by hand'), {'morale': 3, 'fans': 2}, ('Te manda otra carta. Y una foto de su nieto.', 'He writes back. With a photo of his grandson.')),
      o(('Invitarle al pabellón', 'Invite him to the arena'), {'fans': 4, 'fame': 1}, ('Asiento a pie de pista y ovación.', 'Courtside seat and an ovation.')))
    S('a-esports-team', 'fun', ('Equipo de esports', 'Esports team'), ('Te proponen crear un equipo de esports con tu nombre.', 'You are invited to start an esports team with your name.'),
      o(('Crearlo', 'Start it'), {'fame': 3, 'cash': -5000, 'style': 2}, ('Jóvenes que no ven baloncesto ahora te conocen.', 'Youngsters who do not watch basketball now know you.')),
      o(('No es lo tuyo', 'Not your thing'), {}, ('Sigues con la pelota.', 'You stick to the ball.')), minFame=20, once=True)
    S('a-mental-coach', 'mental', ('Coach mental', 'Mental coach'), ('Un coach mental te ofrece sesiones semanales.', 'A mental coach offers weekly sessions.'),
      o(('Aceptar', 'Accept'), {'confidence': 2, 'cash': -3000, 'morale': 2}, ('Respiras mejor en los finales.', 'You breathe better in tight finishes.')),
      o(('No hace falta', 'No need'), {}, ('Confías en tu cabeza.', 'You trust your head.')))
    S('a-car-sponsor', 'sponsor', ('Coche de patrocinio', 'Sponsored car'), ('Un concesionario te ofrece un coche a cambio de fotos.', 'A dealership offers a car in exchange for photos.'),
      o(('Aceptar', 'Accept'), {'style': 3, 'fame': 1}, ('Llegas al pabellón con estilo.', 'You arrive at the arena in style.')),
      o(('Rechazar', 'Decline'), {'fans': 1}, ('Sigues en tu coche viejo. La afición lo valora.', 'You keep your old car. Fans like it.')))
    S('a-national-anthem', 'milestone', ('Cantar el himno', 'Sing the anthem'), ('Te piden cantar el himno en un acto del club.', 'You are asked to sing the anthem at a club event.'),
      u(('Cantarlo', 'Sing it'), 0.4, {'fame': 4, 'fans': 3}, ('Afinado. Ovación.', 'In tune. Ovation.'), {'fame': 2, 'morale': -2}, ('Desafinas. Meme instantáneo.', 'Off-key. Instant meme.')),
      o(('Declinar con humor', 'Decline with humour'), {'fans': 1}, ('"Mejor tiro libres".', '"Better I shoot free throws".')), once=True)
    S('a-fan-fight', 'fans', ('Pelea en la grada', 'Fight in the stands'), ('Dos aficionados se pelean en la grada durante el partido.', 'Two fans fight in the stands during the game.'),
      o(('Pedir calma por megafonía', 'Ask for calm over the PA'), {'fans': 2, 'fame': 1}, ('Se calma. Gesto aplaudido.', 'It calms down. An applauded gesture.')),
      o(('Seguir concentrado', 'Stay focused'), {}, ('Seguridad lo resuelve.', 'Security handles it.')))
    S('a-heat-wave', 'health', ('Ola de calor', 'Heat wave'), ('El aire acondicionado del pabellón se estropea en plena ola de calor.', 'The arena air conditioning breaks in a heat wave.'),
      o(('Pedir pausas de hidratación', 'Ask for water breaks'), {'fatigue': -0.1}, ('La liga lo acepta.', 'The league agrees.')),
      o(('Jugar igual', 'Play anyway'), {'fatigue': 0.3, 'trust': 1}, ('Partido agónico.', 'An agonising game.')))
    S('a-time-capsule', 'legacy', ('Cápsula del tiempo', 'Time capsule'), ('El club entierra una cápsula del tiempo y te pide un objeto.', 'The club buries a time capsule and asks you for an object.'),
      o(('Tus primeras zapatillas', 'Your first shoes'), {'fans': 2, 'morale': 2}, ('Abrirán la cápsula dentro de 50 años.', 'They will open it in 50 years.')),
      o(('Una carta al futuro', 'A letter to the future'), {'fame': 1, 'morale': 2}, ('Escribes sobre lo que sueñas.', 'You write about your dreams.')), once=True)
    S('a-blood-drive', 'community', ('Donación de sangre', 'Blood drive'), ('El club organiza una campaña de donación de sangre.', 'The club runs a blood drive.'),
      o(('Donar y salir en el vídeo', 'Donate and appear in the video'), {'fans': 3, 'load': 2}, ('Cientos de donantes nuevos.', 'Hundreds of new donors.')),
      o(('Animar sin donar', 'Promote without donating'), {'fans': 1}, ('Te toca partido en dos días.', 'You have a game in two days.')))
    S('a-book-offer', 'media', ('Escribir un libro', 'Write a book'), ('Una editorial quiere tu autobiografía.', 'A publisher wants your autobiography.'),
      o(('Escribirlo tú', 'Write it yourself'), {'fame': 3, 'load': 3, 'cash': 8000}, ('Noches escribiendo. Sincero.', 'Nights writing. Honest.')),
      o(('Con un escritor fantasma', 'With a ghostwriter'), {'fame': 2, 'cash': 12000}, ('Se vende bien. No suena del todo a ti.', 'It sells well. It does not quite sound like you.')), minFame=35, once=True)
    S('a-street-game', 'fun', ('Partido en la calle', 'Street game'), ('Pasas por una cancha callejera y unos chavales te retan.', 'You pass a street court and some kids challenge you.'),
      o(('Jugar un rato', 'Play a while'), {'fans': 3, 'morale': 3, 'load': 2}, ('Vídeo en redes. Te sigues divirtiendo como ellos.', 'Video online. You still have fun like them.')),
      o(('Saludar y seguir', 'Wave and move on'), {}, ('Les prometes volver.', 'You promise to come back.')))
    S('a-lucky-number-store', 'superstition', ('El número de la suerte', 'Lucky number'), ('Un vidente asegura que cambiar tu dorsal te traerá suerte.', 'A fortune teller says changing your number will bring luck.'),
      o(('Ignorarle', 'Ignore him'), {}, ('Tu número es tu número.', 'Your number is your number.')),
      o(('Llevar su amuleto', 'Wear his charm'), {'confidence': 1, 'style': 1}, ('Por si acaso.', 'Just in case.')))
    S('a-locker-pet', 'fun', ('Una mascota en el vestuario', 'A pet in the locker room'), ('Un perro abandonado aparece en el pabellón. El vestuario lo adopta.', 'A stray dog turns up at the arena. The locker room adopts it.'),
      o(('Mascota oficial', 'Official mascot'), {'chemistry': 3, 'fans': 2}, ('Se llama Rebote y es el más querido.', 'His name is Rebound and he is the most loved.')),
      o(('Buscarle familia', 'Find him a home'), {'fans': 1, 'morale': 1}, ('Un utillero se lo lleva a casa.', 'An equipment man takes him home.')), once=True)
    S('a-tax-audit', 'money', ('Inspección fiscal', 'Tax audit'), ('Hacienda revisa tus ingresos de imagen.', 'The tax office reviews your image income.'),
      o(('Pagar y regularizar', 'Pay and regularise'), {'cash': -6000, 'morale': -1}, ('Asunto cerrado.', 'Case closed.')),
      u(('Pelear en los tribunales', 'Fight in court'), 0.5, {'cash': 3000}, ('Ganas el recurso.', 'You win the appeal.'), {'cash': -12000, 'fame': -2}, ('Pierdes y sale en prensa.', 'You lose and it makes the papers.')), minFame=10, once=True)
    S('a-doping-test', 'health', ('Control antidopaje sorpresa', 'Surprise doping test'), ('Control a las siete de la mañana. Todo limpio, pero el día empieza raro.', 'Test at seven in the morning. All clean, but the day starts oddly.'),
      o(('Tomárselo con humor', 'Take it with humour'), {'morale': 1}, ('Desayuno de campeones después.', 'Champions\' breakfast afterwards.')),
      o(('Quejarte del horario', 'Complain about the hour'), {'fame': 1, 'morale': -1}, ('La liga toma nota. No cambia nada.', 'The league notes it. Nothing changes.')))
    S('a-winter-storm', 'travel', ('Temporal de nieve', 'Snowstorm'), ('La nieve deja al equipo atrapado en el autobús seis horas.', 'Snow strands the team on the bus for six hours.'),
      o(('Cantar en el autobús', 'Sing on the bus'), {'chemistry': 3}, ('Concierto improvisado. Inolvidable.', 'An improvised concert. Unforgettable.')),
      o(('Dormir', 'Sleep'), {'fatigue': -0.2}, ('Llegas descansado, al menos.', 'You arrive rested, at least.')))
    S('a-fan-tattoo', 'fans', ('Un fan se tatúa tu cara', 'A fan tattoos your face'), ('Un aficionado se ha tatuado tu cara en la pierna.', 'A fan tattooed your face on his leg.'),
      o(('Invitarle al vestuario', 'Invite him to the locker room'), {'fans': 3, 'fame': 1}, ('Llora de emoción.', 'He cries with joy.')),
      o(('Mandarle una camiseta', 'Send him a jersey'), {'fans': 2}, ('Tatuaje y camiseta a juego.', 'Tattoo and a matching jersey.')), minFame=25, once=True)
    S('a-climate-campaign', 'community', ('Campaña verde', 'Green campaign'), ('Te proponen ser imagen de una campaña para reducir plásticos en el pabellón.', 'You are asked to front a campaign to cut plastic at the arena.'),
      o(('Aceptar', 'Accept'), {'fans': 2, 'fame': 2}, ('Botellas reutilizables para todos.', 'Reusable bottles for everyone.')),
      o(('Prefiero no mezclar', 'Prefer not to mix'), {}, ('Sigues a lo tuyo.', 'You keep to yourself.')))
    S('a-old-video', 'media', ('Un vídeo antiguo', 'An old video'), ('Sale un vídeo tuyo de hace años haciendo el ridículo en una fiesta.', 'An old video of you embarrassing yourself at a party surfaces.'),
      o(('Reírte de ti mismo', 'Laugh at yourself'), {'fame': 2, 'fans': 1}, ('"Todos fuimos jóvenes".', '"We were all young".')),
      o(('Pedir que lo borren', 'Ask to remove it'), {'fame': -1}, ('Cuanto más lo borras, más circula.', 'The more you delete it, the more it spreads.')))
    S('a-music-video', 'fun', ('Videoclip', 'Music video'), ('Un cantante famoso te quiere en su videoclip.', 'A famous singer wants you in his music video.'),
      o(('Salir', 'Appear'), {'fame': 4, 'style': 3, 'load': 2}, ('Millones de reproducciones.', 'Millions of views.')),
      o(('Rechazar', 'Decline'), {'load': -2}, ('El baloncesto primero.', 'Basketball first.')), minFame=25, once=True)
    S('a-retired-legend-dinner', 'legacy', ('Cena con leyendas', 'Dinner with legends'), ('Varias leyendas retiradas del club te invitan a cenar.', 'Several retired club legends invite you to dinner.'),
      o(('Ir y escuchar', 'Go and listen'), {'xp': 3, 'attr': {'lectura': 1}}, ('Historias que no salen en ningún libro.', 'Stories that are in no book.')),
      o(('Excusarte', 'Excuse yourself'), {}, ('Otra vez será.', 'Another time.')), minWeek=6, once=True)
    S('a-holiday-gifts', 'community', ('Regalos de Navidad', 'Holiday gifts'), ('El club reparte regalos en un barrio humilde.', 'The club hands out gifts in a poor neighbourhood.'),
      o(('Disfrazarte y repartir', 'Dress up and hand out'), {'fans': 4, 'morale': 3}, ('Los niños no se lo creen.', 'The kids cannot believe it.')),
      o(('Donar sin salir en fotos', 'Donate without photos'), {'morale': 2, 'cash': -2000}, ('Nadie lo sabe. Tú sí.', 'Nobody knows. You do.')), minWeek=10, maxWeek=14)
    S('a-twitch-stream', 'media', ('Directo en internet', 'Live stream'), ('Te proponen hacer un directo jugando y charlando con fans.', 'You are invited to stream gaming and chatting with fans.'),
      o(('Hacerlo cada semana', 'Do it weekly'), {'fame': 3, 'fans': 2, 'load': 2}, ('Comunidad fiel.', 'A loyal community.')),
      o(('Solo una vez', 'Just once'), {'fame': 1}, ('Un buen rato.', 'A good time.')))
    S('a-injury-scare-kid', 'community', ('El niño lesionado', 'The injured kid'), ('Un niño de la cantera se ha roto la rodilla y está hundido.', 'A youth player broke his knee and is devastated.'),
      o(('Visitarle con el equipo', 'Visit with the team'), {'chemistry': 2, 'fans': 2}, ('Promete volver más fuerte.', 'He promises to come back stronger.')),
      o(('Mandarle un vídeo', 'Send him a video'), {'fans': 1}, ('Lo ve cien veces.', 'He watches it a hundred times.')))
    S('a-fashion-week', 'fun', ('Semana de la moda', 'Fashion week'), ('Una diseñadora te invita a desfilar en la semana de la moda.', 'A designer invites you to walk at fashion week.'),
      o(('Desfilar', 'Walk'), {'style': 5, 'fame': 3, 'trust': -1}, ('Portada de revistas. Al club no le hace gracia.', 'Magazine covers. The club is not amused.')),
      o(('Mejor en primera fila', 'Better in the front row'), {'style': 2}, ('Elegante y discreto.', 'Elegant and discreet.')), minFame=30, once=True)
    S('a-hall-of-fame-visit', 'legacy', ('Visita al museo del baloncesto', 'Basketball museum visit'), ('Visitas el museo del baloncesto con el equipo.', 'You visit the basketball museum with the team.'),
      o(('Prometer volver como leyenda', 'Promise to return as a legend'), {'confidence': 2, 'fame': 1}, ('Foto delante de la vitrina vacía.', 'Photo in front of an empty case.')),
      o(('Disfrutar la historia', 'Enjoy the history'), {'xp': 2}, ('Aprendes de los que abrieron camino.', 'You learn from those who paved the way.')), once=True)
    S('a-insomnia', 'mental', ('No duermes', 'You cannot sleep'), ('Llevas una semana durmiendo cuatro horas por los nervios.', 'You have slept four hours a night for a week from nerves.'),
      o(('Hablar con el médico del club', 'Talk to the club doctor'), {'fatigue': -0.3, 'morale': 2}, ('Rutina nueva. Duermes mejor.', 'A new routine. You sleep better.')),
      o(('Aguantar', 'Tough it out'), {'fatigue': 0.3, 'morale': -2}, ('Se pasa solo. Despacio.', 'It passes. Slowly.')))
    S('a-camp-abroad', 'travel', ('Campus en el extranjero', 'Camp abroad'), ('Te invitan a un campus de verano en otro continente.', 'You are invited to a summer camp on another continent.'),
      o(('Ir', 'Go'), {'fame': 2, 'xp': 2, 'load': 3}, ('Conoces otra forma de entender el baloncesto.', 'You discover another way to see basketball.')),
      o(('Quedarte', 'Stay'), {'load': -4}, ('Descanso.', 'Rest.')), maxWeek=3)
    S('a-gift-from-rival', 'rivalry', ('Un regalo del rival', 'A gift from the rival'), ('Tras un partido durísimo, {rival} te manda una camiseta firmada.', 'After a brutal game, {rival} sends you a signed jersey.'),
      o(('Devolver el gesto', 'Return the gesture'), {'fame': 2, 'morale': 2}, ('Respeto mutuo.', 'Mutual respect.')),
      o(('Guardarla en silencio', 'Keep it quietly'), {'morale': 1}, ('La cuelgas en casa.', 'You hang it at home.')))
    S('a-school-talk', 'community', ('Charla en un colegio', 'School talk'), ('Un colegio te pide una charla sobre esfuerzo y estudios.', 'A school asks for a talk on effort and studies.'),
      o(('Ir y hablar de tus fracasos', 'Go and talk about your failures'), {'fans': 3, 'morale': 2}, ('Los chavales escuchan de verdad.', 'The kids really listen.')),
      o(('Mandar un vídeo', 'Send a video'), {'fans': 1}, ('Lo ponen en clase.', 'They play it in class.')))
    S('a-celebrity-courtside', 'media', ('Famoso en primera fila', 'Celebrity courtside'), ('Un actor famoso se sienta en primera fila y te reta a meter un triple.', 'A famous actor sits courtside and dares you to hit a three.'),
      u(('Aceptar el reto', 'Accept the dare'), 0.45, {'fame': 4, 'confidence': 1}, ('¡Dentro! Te choca la mano.', 'Good! He high-fives you.'), {'fame': 1}, ('Ladrillo. Se ríe.', 'Brick. He laughs.')),
      o(('Sonreír y seguir', 'Smile and carry on'), {}, ('Profesional.', 'Professional.')), minFame=20)
    S('a-library-donation', 'community', ('Una biblioteca', 'A library'), ('Te proponen donar libros a la biblioteca de tu antiguo colegio.', 'You are asked to donate books to your old school library.'),
      o(('Donar y leer a los niños', 'Donate and read to the kids'), {'fans': 3, 'morale': 2}, ('Una tarde distinta.', 'A different afternoon.')),
      o(('Donar sin más', 'Just donate'), {'fans': 1, 'cash': -1000}, ('Estanterías llenas.', 'Full shelves.')))
    S('a-weather-cancel', 'travel', ('Partido aplazado', 'Game postponed'), ('Un temporal aplaza el partido. Tienes un día libre inesperado.', 'A storm postpones the game. You get an unexpected day off.'),
      o(('Entrenar solo', 'Train alone'), {'attr': {'tiroTriple': 1}, 'load': 2}, ('Cien triples en un pabellón vacío.', 'A hundred threes in an empty arena.')),
      o(('Día en familia', 'Family day'), {'morale': 3, 'load': -4}, ('Desconexión total.', 'Total disconnection.')))
    S('a-veteran-retire-talk', 'mental', ('¿Cuánto te queda?', 'How long do you have left?'), ('Un periodista te pregunta cuándo piensas retirarte.', 'A reporter asks when you plan to retire.'),
      o(('"Cuando el cuerpo diga basta"', '"When my body says stop"'), {'morale': 1}, ('Respuesta honesta.', 'An honest answer.')),
      o(('"Me quedan diez años"', '"I have ten years left"'), {'confidence': 2, 'fame': 1}, ('Titular desafiante.', 'A defiant headline.')), minAge=31)
    S('a-old-teammate-coach', 'locker', ('Un excompañero entrenador', 'An ex-teammate now coaching'), ('Un excompañero ya entrena en la liga y te pide consejo.', 'An ex-teammate now coaches in the league and asks your advice.'),
      o(('Ayudarle', 'Help him'), {'xp': 2, 'morale': 1}, ('Os veis más a menudo.', 'You see each other more often.')),
      o(('Mantener distancia', 'Keep distance'), {}, ('Ahora sois rivales.', 'You are rivals now.')))
    S('a-photo-shoot', 'sponsor', ('Sesión de fotos', 'Photo shoot'), ('Tu patrocinador quiere una sesión de fotos de seis horas el día libre.', 'Your sponsor wants a six-hour photo shoot on your day off.'),
      o(('Hacerla', 'Do it'), {'style': 2, 'fatigue': 0.2, 'cash': 3000}, ('Fotos espectaculares.', 'Spectacular photos.')),
      o(('Reducirla a dos horas', 'Cut it to two hours'), {'style': 1}, ('Acuerdo intermedio.', 'A compromise.')), hasSponsor=True)
    S('a-foundation', 'community', ('Tu fundación', 'Your foundation'), ('Tienes fama y dinero suficientes para crear una fundación.', 'You have enough fame and money to start a foundation.'),
      o(('Crearla', 'Start it'), {'cash': -15000, 'fans': 6, 'fame': 4}, ('Becas para jóvenes deportistas.', 'Scholarships for young athletes.')),
      o(('Más adelante', 'Later'), {}, ('Lo apuntas para el futuro.', 'You note it for the future.')), minFame=40, once=True)
    S('a-retro-night', 'fans', ('Noche retro', 'Retro night'), ('El club juega con la camiseta de hace cuarenta años.', 'The club plays in its jersey from forty years ago.'),
      o(('Peinado retro a juego', 'Matching retro hairstyle'), {'fans': 3, 'style': 2}, ('La grada enloquece.', 'The stands go wild.')),
      o(('Solo la camiseta', 'Just the jersey'), {'fans': 1}, ('Bonito homenaje.', 'A nice tribute.')))
    S('a-quarantine-week', 'health', ('Virus en el vestuario', 'Virus in the locker room'), ('Un virus estomacal recorre el vestuario.', 'A stomach bug sweeps the locker room.'),
      o(('Aislarte en casa', 'Isolate at home'), {'load': -6, 'chemistry': -1}, ('No te contagias.', 'You do not catch it.')),
      u(('Seguir entrenando', 'Keep practising'), 0.5, {'trust': 1}, ('Te libras.', 'You avoid it.'), {'fatigue': 0.4, 'morale': -2}, ('Caes enfermo dos días.', 'You are sick for two days.')))

    # ===================== MODO ÉPOCAS: MÁS DECISIONES DE CADA DÉCADA =====================
    def ER(eid, title, body, a, b, **cond):
        E(eid, 'era', A, title, body, [a, b], once=True, era=True, **cond)
    ER('era-dance-hall', ('Baile después del partido', 'A dance after the game'), ('Se juega en un salón de baile: al acabar, la orquesta toca y el público se queda a bailar.', 'The game is in a dance hall: afterwards the band plays and the crowd stays to dance.'),
       o(('Quedarte al baile', 'Stay for the dance'), {'fans': 3, 'fatigue': 0.2}, ('La ciudad habla de ti al día siguiente.', 'The town talks about you the next day.')),
       o(('Volver a casa a descansar', 'Go home to rest'), {'fatigue': -0.2}, ('Mañana hay trabajo.', 'There is work tomorrow.')), maxYear=1935)
    ER('era-laced-ball', ('El balón con cordones', 'The laced ball'), ('El balón de cuero lleva cordones y bota de forma imprevisible.', 'The leather ball has laces and bounces unpredictably.'),
       o(('Jugar a base de pases', 'Play by passing'), {'attr': {'pase': 2}}, ('Mejor que botar esa cosa.', 'Better than dribbling that thing.')),
       o(('Dominar el bote igualmente', 'Master the dribble anyway'), {'attr': {'manejo': 2}, 'load': 3}, ('Horas en el gimnasio. Ahora es tuyo.', 'Hours in the gym. Now it obeys you.')), maxYear=1940)
    ER('era-center-jump', ('Salto entre dos tras cada canasta', 'Jump ball after every basket'), ('En tu liga aún se hace salto entre dos después de cada canasta. Se debate eliminarlo.', 'Your league still has a jump ball after every basket. There is talk of scrapping it.'),
       o(('Defender la tradición', 'Defend tradition'), {'trust': 2, 'attr': {'salto': 1}}, ('Los pívots altos te lo agradecen.', 'The tall centres thank you.')),
       o(('Pedir juego continuo', 'Call for continuous play'), {'fame': 2, 'attr': {'velocidad': 1}}, ('El futuro es más rápido.', 'The future is faster.')), maxYear=1938)
    ER('era-radio', ('El partido en la radio', 'The game on the radio'), ('Por primera vez, una emisora narra vuestro partido. Tu familia lo escucha en el pueblo.', 'For the first time a station broadcasts your game. Your family listens back home.'),
       o(('Dedicarles una canasta', 'Dedicate a basket to them'), {'morale': 4, 'fans': 2}, ('El locutor lo cuenta. Tu madre llora.', 'The announcer mentions it. Your mother cries.')),
       o(('Jugar como siempre', 'Play as always'), {'trust': 1}, ('Concentración.', 'Focus.')), minYear=1930, maxYear=1950)
    ER('era-goaltending', ('La regla del pívot gigante', 'The giant centre rule'), ('Un pívot rival tapona los tiros cuando ya bajan. La liga estudia prohibirlo.', 'A rival centre swats shots on the way down. The league is studying a ban.'),
       o(('Tirar más arriba', 'Shoot higher'), {'attr': {'tiroMedia': 1, 'tiroCerca': 1}}, ('Parábolas imposibles.', 'Impossible arcs.')),
       o(('Esperar a la nueva regla', 'Wait for the new rule'), {'morale': 1}, ('Llega al año siguiente.', 'It arrives the next year.')), minYear=1940, maxYear=1950)
    ER('era-canvas', ('Zapatillas de lona', 'Canvas sneakers'), ('Tus zapatillas de lona están rotas y el club no tiene presupuesto para otras.', 'Your canvas sneakers are torn and the club has no budget for new ones.'),
       o(('Comprarlas de tu bolsillo', 'Buy them yourself'), {'cash': -200, 'attr': {'velocidad': 1}}, ('Recién estrenadas, vuelas.', 'Brand new, you fly.')),
       o(('Remendarlas', 'Patch them up'), {'fans': 1, 'morale': -1}, ('Cinta adhesiva y a jugar.', 'Tape and play.')), minYear=1945, maxYear=1975)
    ER('era-rival-league', ('Una liga rival', 'A rival league'), ('Una liga nueva con balón tricolor y línea de tres te ofrece el doble de sueldo.', 'A new league with a tricolour ball and a three-point line offers you double the salary.'),
       u(('Saltar a la liga nueva', 'Jump to the new league'), 0.5, {'cash': 20000, 'fame': 4}, ('Espectáculo y dinero. La liga sobrevive.', 'Showtime and money. The league survives.'), {'cash': 5000, 'fame': -1}, ('La liga quiebra a mitad de temporada.', 'The league folds mid-season.')),
       o(('Quedarte en la de siempre', 'Stay in the established league'), {'trust': 3}, ('Lealtad.', 'Loyalty.')), minYear=1967, maxYear=1976)
    ER('era-dunk-ban', ('Prohibido machacar', 'Dunking banned'), ('La liga universitaria ha prohibido el mate. Tus amigos de la universidad se quejan.', 'The college league has banned the dunk. Your college friends complain.'),
       o(('Trabajar el gancho', 'Work on the hook shot'), {'attr': {'tiroCerca': 2}}, ('Un gancho que nadie para.', 'A hook nobody can stop.')),
       o(('Machacar en los entrenamientos', 'Dunk in practice anyway'), {'attr': {'mate': 1}, 'fans': 1}, ('El público de los entrenamientos lo adora.', 'Practice crowds love it.')), minYear=1967, maxYear=1976)
    ER('era-breakaway-rim', ('Aros que se doblan', 'Rims that bend'), ('Llegan los aros basculantes: ya no se rompen los tableros al machacar.', 'Breakaway rims arrive: backboards no longer shatter on dunks.'),
       o(('Machacar sin miedo', 'Dunk without fear'), {'attr': {'mate': 2}, 'fame': 1}, ('Por fin, sin cristales.', 'Finally, no broken glass.')),
       o(('Seguir con bandejas', 'Stick to layups'), {'attr': {'bandeja': 1}}, ('Fiable como siempre.', 'Reliable as ever.')), minYear=1978, maxYear=1985)
    ER('era-tv-timeouts', ('Tiempos muertos de televisión', 'TV timeouts'), ('La televisión pide pausas cada pocos minutos para los anuncios.', 'TV demands breaks every few minutes for commercials.'),
       o(('Aprovecharlas para descansar', 'Use them to rest'), {'fatigue': -0.2}, ('Piernas frescas en el final.', 'Fresh legs at the end.')),
       o(('Quejarte del ritmo roto', 'Complain about the broken rhythm'), {'fame': 1}, ('Nadie te hace caso.', 'Nobody listens.')), minYear=1975, maxYear=1995)
    ER('era-streetball', ('Cintas de streetball', 'Streetball tapes'), ('Circulan cintas con jugadas imposibles de las canchas de la calle.', 'Tapes of impossible street-court moves are circulating.'),
       o(('Copiar los movimientos', 'Copy the moves'), {'attr': {'manejo': 2}, 'style': 2}, ('Tu bote ya tiene otro ritmo.', 'Your handle has a new rhythm.')),
       o(('Fundamentos de siempre', 'Stick to fundamentals'), {'trust': 2}, ('El entrenador asiente.', 'The coach nods.')), minYear=1990, maxYear=2005)
    ER('era-forums', ('Los foros de internet', 'Internet forums'), ('En los foros de internet discuten cada partido tuyo durante horas.', 'Internet forums debate your every game for hours.'),
       o(('Leerlos', 'Read them'), {'fame': 1, 'morale': -1}, ('Aprendes algo. Y te enfadas.', 'You learn something. And get angry.')),
       o(('No entrar nunca', 'Never log on'), {'morale': 1}, ('Paz mental.', 'Peace of mind.')), minYear=1998, maxYear=2010)
    ER('era-social-media', ('Tu primera red social', 'Your first social network'), ('Tu agente quiere que abras un perfil en la red social de moda.', 'Your agent wants you on the trendy social network.'),
       o(('Abrirlo y publicar a diario', 'Open it and post daily'), {'fame': 4, 'fans': 2}, ('Miles de seguidores. Y algún troll.', 'Thousands of followers. And some trolls.')),
       o(('Esperar', 'Wait'), {}, ('Ya llegarás.', 'You will get there.')), minYear=2008, maxYear=2014)
    ER('era-bubble', ('Partidos sin público', 'Games behind closed doors'), ('La temporada se juega en pabellones vacíos. Solo se oyen las zapatillas.', 'The season is played in empty arenas. Only the squeak of sneakers.'),
       o(('Hablar más en pista', 'Talk more on court'), {'chemistry': 2, 'attr': {'liderazgo': 1}}, ('Tu voz llena el pabellón.', 'Your voice fills the arena.')),
       o(('Centrarte en tu juego', 'Focus on your game'), {'confidence': 1}, ('Sin presión de la grada.', 'No pressure from the stands.')), minYear=2020, maxYear=2021)
