#!/usr/bin/env python3
"""Decisiones de carrera v2 (baloncesto). Escritas a mano, bilingües es/en, deterministas.

Formato: ev(id, categoría, modo, título, texto, opciones, cond=..., story=..., once=...)
- O(etiqueta, descripción, efectos, resultado): desenlace seguro.
- U(etiqueta, descripción, p, efectos_ok, resultado_ok, efectos_ko, resultado_ko): desenlace incierto (p visible).
Marcadores en textos: {club} {opponent} {teammate} {star} {rival} {number} {name}.
Sin opción correcta obvia; varias dejan marcas (flag) que disparan consecuencias semanas después.
"""

EVENTS = []

def O(label, desc, fx, result):
    return {'label': {'es': label[0], 'en': label[1]}, 'desc': {'es': desc[0], 'en': desc[1]}, 'effects': fx, 'result': {'es': result[0], 'en': result[1]}}

def U(label, desc, p, okfx, okres, kofx, kores):
    return {'label': {'es': label[0], 'en': label[1]}, 'desc': {'es': desc[0], 'en': desc[1]}, 'p': p,
            'ok': {'effects': okfx, 'result': {'es': okres[0], 'en': okres[1]}},
            'ko': {'effects': kofx, 'result': {'es': kores[0], 'en': kores[1]}}}

def ev(eid, cat, mode, title, body, opts, cond=None, story=False, once=False, weight=6, cooldown=12, repeat=False):
    c = {'mode': mode}
    c.update(cond or {})
    for i, o in enumerate(opts):
        o['id'] = 'abcd'[i]
    EVENTS.append({'id': eid, 'category': cat, 'story': story, 'once': (once or story) and not repeat, 'weight': weight, 'cooldownWeeks': cooldown,
                   'conditions': c, 'title': {'es': title[0], 'en': title[1]}, 'body': {'es': body[0], 'en': body[1]}, 'options': opts})

P, C, A = 'player', 'coach', 'any'

# ======================= HISTORIA: JUGADOR =======================
ev('agent', 'agency', P, ('Elige a tu agente', 'Choose your agent'),
   ('Acabas de firmar con el {club} y tres representantes quieren llevar tu carrera. De esta decisión dependen tus ofertas y lo que te quedas de cada nómina.',
    'You just signed with {club} and three agents want to run your career. Your offers, and how much of each paycheck you keep, depend on this.'),
   [O(('Agencia de estrellas', 'Star agency'), ('Más ofertas y mejores sueldos. Se queda el 10 %.', 'More offers and bigger deals. Takes 10%.'), {'agent': 'star', 'fame': 3},
      ('Firmas con una agencia que mueve medio baloncesto. Tu teléfono ya no para.', 'You sign with an agency that moves half of basketball. Your phone never stops.')),
    O(('Tu tía, que te conoce desde el minibasket', 'Your aunt, who has known you since mini-basketball'), ('Cercana y leal. Se queda el 5 %.', 'Close and loyal. Takes 5%.'), {'agent': 'family', 'morale': 6},
      ('Todo queda en familia. Te sientes arropado y con los pies en el suelo.', 'It stays in the family. You feel backed and grounded.')),
    O(('Ir por libre', 'Go it alone'), ('Sin comisiones, pero los clubes te verán con lupa.', 'No commission, but clubs will scrutinise you.'), {'agent': 'self', 'xp': 4},
      ('Negociarás tú mismo. Ahorras, aunque las ofertas llegarán más bajas.', "You'll negotiate yourself. You save money, though offers will come in lower."))],
   cond={'maxWeek': 2}, story=True)

ev('sneakers', 'sponsor', P, ('Una marca de zapatillas llama', 'A sneaker brand calls'),
   ('Tus últimos partidos han llamado la atención. Dos marcas quieren verte con sus zapatillas en la pista.', 'Your recent games caught the eye. Two brands want you wearing their shoes on court.'),
   [O(('Aerolift (la grande)', 'Aerolift (the big one)'), ('Contrato modesto, escaparate enorme.', 'Modest deal, huge showcase.'), {'sponsor': 'aerolift', 'fame': 4, 'style': 6},
      ('Tu cara aparece en un cartel en el centro. Tus colegas no paran de mandarte fotos.', 'Your face goes up on a billboard downtown. Your friends keep sending you photos.')),
    O(('Parquet Lab (la emergente)', 'Parquet Lab (the upstart)'), ('Te diseñan tu propio modelo y pagan más.', 'They design your own model and pay more.'), {'sponsor': 'parquet', 'cash': 6000, 'style': 3, 'flag': 'signature-shoe'},
      ('Te mandan bocetos de "tu" zapatilla. Pequeña marca, pero toda para ti.', 'They send sketches of "your" shoe. Small brand, but all yours.')),
    O(('Esperar a algo mejor', 'Wait for something better'), ('Si sigues rindiendo, llegará otra oferta… o no.', 'If you keep producing, another offer will come… or not.'), {'morale': 1},
      ('Les dices que no por ahora. Tu agente resopla, pero lo entiende.', "You say not for now. Your agent sighs but understands."))],
   cond={'minWeek': 5, 'noSponsor': True, 'minFame': 4}, story=True)

ev('sneakers-late', 'sponsor', P, ('La marca vuelve a llamar', 'The brand calls again'),
   ('Sin patrocinador todavía. Una marca mediana te ofrece un contrato sencillo para lo que queda de temporada.', 'Still no sponsor. A mid-size brand offers a simple deal for the rest of the season.'),
   [O(('Aceptar', 'Accept'), ('Dinero fijo y algo de visibilidad.', 'Steady money and some visibility.'), {'sponsor': 'courtline', 'cash': 2500, 'style': 2},
      ('Firmas. No es un cartel en el centro, pero es un comienzo.', "You sign. It's not a downtown billboard, but it's a start.")),
    O(('Seguir esperando', 'Keep waiting'), ('Apuestas por ti mismo.', 'You bet on yourself.'), {'confidence': 1, 'morale': -1},
      ('Rechazas. Te toca demostrar en la pista que vales más.', 'You decline. Time to prove on court you are worth more.'))],
   cond={'minWeek': 18, 'noSponsor': True}, story=True)

ev('signature-shoe', 'sponsor', P, ('Tu zapatilla sale a la venta', 'Your shoe goes on sale'),
   ('Parquet Lab lanza tu modelo con el {number} en el talón. Quieren que hagas la presentación antes del partido contra {opponent}.', 'Parquet Lab launches your model with {number} on the heel. They want you to present it before the game against {opponent}.'),
   [O(('Presentarla a lo grande', 'Launch it big'), ('Fiesta, prensa y redes. Llegas justo al calentamiento.', 'Party, press and social. You arrive just in time for warm-ups.'), {'fame': 5, 'style': 8, 'load': 6, 'trust': -3},
      ('Se agotan en dos horas. Al entrenador no le hizo gracia verte llegar con la hora pegada.', 'They sell out in two hours. The coach did not love you arriving at the last minute.')),
    O(('Algo discreto en la tienda del barrio', 'Something low-key at the neighbourhood store'), ('Menos ruido, más cariño.', 'Less noise, more love.'), {'fame': 2, 'style': 4, 'morale': 4},
      ('Firmas zapatillas a los chavales del barrio. Hay algún llanto, y no solo de ellos.', 'You sign shoes for the neighbourhood kids. There are some tears, and not only theirs.'))],
   cond={'flags': ['signature-shoe'], 'flagDelay': 8}, story=True)

ev('renewal', 'contract', P, ('Te queda un año de contrato', 'One year left on your deal'),
   ('El {club} quiere hablar. Si no firmas, en verano serás agente libre… o te quedarás sin equipo.', '{club} wants to talk. If you do not sign, you will be a free agent this summer… or left without a team.'),
   [O(('Firmar la renovación', 'Sign the extension'), ('Más años y un 15 % más de sueldo.', 'More years and a 15% raise.'), {'salary': 1.15, 'morale': 4, 'trust': 4, 'fans': 3},
      ('Firmas. La grada corea tu dorsal en el siguiente partido.', 'You sign. The crowd chants your number at the next game.')),
    U(('Pedir mucho más', 'Ask for a lot more'), ('Puede salir muy bien o romper la relación.', 'It may go great or break the relationship.'), 0.45,
      {'salary': 1.45, 'morale': 6, 'fame': 2}, ('El club cede: firmas el contrato de tu vida.', 'The club caves: you sign the deal of your life.'),
      {'trust': -8, 'fans': -5, 'morale': -4}, ('La directiva se levanta de la mesa. El ambiente se enrarece.', 'The front office walks out. Things turn sour.')),
    O(('No renovar', 'Do not renew'), ('Te irás en verano. Al club no le gustará.', 'You leave in summer. The club will not like it.'), {'trust': -10, 'fans': -6, 'flag': 'lame-duck'},
      ('Comunicas que no renuevas. Tus minutos empiezan a bailar.', 'You announce you will not renew. Your minutes start to wobble.'))],
   cond={'contractYears': 1, 'lateSeason': True}, story=True)

ev('serious-injury', 'health', P, ('Lesión seria: ¿cómo la tratas?', 'Serious injury: how do you treat it?'),
   ('Los médicos confirman semanas de baja. Hay varios caminos y ninguno es perfecto.', 'Doctors confirm weeks out. There are several paths and none is perfect.'),
   [O(('Operarte', 'Surgery'), ('Más baja, recuperación completa.', 'Longer out, full recovery.'), {'injuryWeeks': 2, 'attr': {'durabilidad': 1}, 'morale': -2},
      ('La operación sale bien. Será largo, pero volverás sin miedo.', 'Surgery goes well. It will be long, but you will come back without fear.')),
    U(('Tratamiento conservador', 'Conservative treatment'), ('Vuelves antes, con riesgo de recaída.', 'Back sooner, risk of relapse.'), 0.62,
      {'injuryWeeks': -2, 'morale': 3}, ('Respondes bien y vuelves antes de lo previsto.', 'You respond well and return ahead of schedule.'),
      {'injuryWeeks': 2, 'attr': {'durabilidad': -2, 'salto': -1}, 'morale': -6}, ('Recaída. Esta vez deja huella.', 'Relapse. This time it leaves a mark.')),
    O(('Clínica de élite (25.000)', 'Elite clinic (25,000)'), ('Cara, pero acelera la vuelta con seguridad.', 'Expensive, but speeds the return safely.'), {'cash': -25000, 'injuryWeeks': -1},
      ('Te tratas en una clínica puntera. Acortas plazos sin arriesgar.', 'You get treated at a top clinic. Shorter timeline, no risk.'))],
   cond={'injured': True, 'minInjuryWeeks': 3}, weight=20, cooldown=20)

ev('first-start', 'milestone', P, ('Tu primera titularidad', 'Your first start'),
   ('El entrenador te llama a su despacho: esta noche sales de inicio contra {opponent}. ¿Cómo lo preparas?', 'The coach calls you in: you start tonight against {opponent}. How do you prepare?'),
   [O(('Vídeo hasta las tantas', 'Film until late'), ('Te sabes de memoria las ayudas de {opponent}.', 'You learn {opponent}\'s help rotations by heart.'), {'attr': {'lectura': 1}, 'load': 4, 'trust': 3},
      ('Llegas cansado, pero sabes dónde va a estar cada uno.', 'You arrive tired, but you know where everyone will be.')),
    O(('Rutina de siempre', 'Usual routine'), ('Que no cambie nada.', 'Change nothing.'), {'confidence': 2, 'morale': 3},
      ('Duermes como un bebé. La calma se nota en el primer tiro.', 'You sleep like a baby. The calm shows on your first shot.')),
    O(('Llamar a casa', 'Call home'), ('Que tu gente lo viva contigo.', 'Let your people live it with you.'), {'morale': 6, 'fans': 2},
      ('Tu madre ya ha avisado a medio barrio. Habrá pancarta.', 'Your mum has already told half the neighbourhood. There will be a banner.'))],
   cond={'trustAbove': 70}, story=True)

ev('lame-duck', 'contract', P, ('El último año se hace largo', 'The final year drags on'),
   ('Desde que anunciaste que no renuevas, el entrenador te da menos minutos. {teammate} te pregunta si te quieres ir ya.', 'Since you announced you will not renew, the coach gives you fewer minutes. {teammate} asks if you want out now.'),
   [O(('Pedir el traspaso', 'Request a trade'), ('Puede abrir una puerta… o cerrarla.', 'May open a door… or close one.'), {'trust': -6, 'fame': 2, 'unflag': 'lame-duck'},
      ('Tu agente filtra la petición. El vestuario te mira raro.', 'Your agent leaks the request. The locker room looks at you funny.')),
    O(('Callar y trabajar', 'Keep quiet and work'), ('Ganarte otra vez los minutos.', 'Earn the minutes back.'), {'trust': 5, 'load': 6, 'morale': -2, 'unflag': 'lame-duck'},
      ('Entrenas como el primer día. Poco a poco vuelves a la rotación.', 'You train like day one. Bit by bit you return to the rotation.'))],
   cond={'flags': ['lame-duck'], 'flagDelay': 3}, story=True)

ev('hero-aftermath', 'press', P, ('Todos hablan de tu canasta', 'Everyone is talking about your shot'),
   ('La canasta del final está en todos los resúmenes. Te piden entrevistas, un pódcast y hasta un anuncio de cereales.', 'Your game-winner is on every highlight reel. They want interviews, a podcast and even a cereal ad.'),
   [O(('Decir que sí a todo', 'Say yes to everything'), ('Fama y dinero, menos descanso.', 'Fame and money, less rest.'), {'fame': 6, 'cash': 4000, 'load': 8, 'chemistry': -3},
      ('Sales hasta en la caja de cereales. Algún compañero ya te llama "el anuncio".', 'You are even on the cereal box. Some teammates now call you "the ad".')),
    O(('Repartir el mérito', 'Share the credit'), ('Solo hablas del pase de {teammate}.', 'You only talk about {teammate}\'s pass.'), {'chemistry': 6, 'trust': 3, 'fame': 2},
      ('{teammate} te invita a cenar. El vestuario cierra filas.', '{teammate} takes you to dinner. The locker room closes ranks.'))],
   cond={'minLive': 1}, weight=3, cooldown=30)

# ======================= ALEATORIAS: JUGADOR =======================
ev('late-night', 'life', P, ('Fiesta la víspera', 'Party the night before'),
   ('{teammate} cumple años y lo celebra la noche antes de jugar contra {opponent}. Todo el vestuario va.', '{teammate} turns a year older and celebrates the night before facing {opponent}. The whole team is going.'),
   [O(('Ir un rato y volver pronto', 'Go for a bit, leave early'), ('Quedas bien con todos.', 'You keep everyone happy.'), {'chemistry': 4, 'load': 3},
      ('Te vas a la una. Nadie se acuerda, salvo tú cuando suena el despertador.', 'You leave at one. Nobody remembers, except you when the alarm goes off.')),
    U(('Quedarte hasta el final', 'Stay till the end'), ('La noche promete.', 'The night looks promising.'), 0.55,
      {'chemistry': 8, 'morale': 5, 'fatigue': 0.15}, ('Noche legendaria y nadie lo ve. Al día siguiente estás vivo de milagro.', 'Legendary night and nobody saw it. Next day you are somehow alive.'),
      {'chemistry': 6, 'fatigue': 0.2, 'trust': -6, 'flag': 'party-photo'}, ('Alguien sube una foto a las cuatro de la mañana.', 'Someone posts a photo at four in the morning.')),
    O(('Quedarte en casa', 'Stay home'), ('Profesional. Algo aburrido.', 'Professional. A bit boring.'), {'chemistry': -3, 'form': 1},
      ('Te llegan vídeos de la fiesta mientras estiras. Duermes nueve horas.', 'Party videos arrive while you stretch. You sleep nine hours.'))])

ev('party-photo', 'press', P, ('La foto de la fiesta', 'The party photo'),
   ('La foto de aquella noche llega a un programa de televisión. El club pide explicaciones.', 'The photo from that night reaches a TV show. The club wants an explanation.'),
   [O(('Pedir perdón en público', 'Apologise publicly'), ('Humildad delante de todos.', 'Humility in front of everyone.'), {'fame': -2, 'trust': 4, 'morale': -3, 'unflag': 'party-photo'},
      ('Tu comunicado es sincero. El entrenador lo valora.', 'Your statement is sincere. The coach appreciates it.')),
    O(('Quitarle hierro', 'Brush it off'), ('"Era un cumpleaños, no un crimen".', '"It was a birthday, not a crime."'), {'fame': 3, 'trust': -5, 'fans': -3, 'unflag': 'party-photo'},
      ('Tus seguidores lo celebran. La directiva, no tanto.', 'Your followers love it. The front office, not so much.'))],
   cond={'flags': ['party-photo'], 'flagDelay': 2}, story=True)

ev('extra-shooting', 'training', P, ('Tiro extra a las siete', 'Extra shooting at seven'),
   ('El asistente de tiro se ofrece a quedarse contigo cada mañana antes del entrenamiento.', 'The shooting coach offers to stay with you every morning before practice.'),
   [O(('Todas las mañanas', 'Every morning'), ('500 tiros diarios.', '500 shots a day.'), {'attr': {'tiroTriple': 1, 'tiroMedia': 1}, 'load': 10},
      ('Tu mecánica mejora. Tus rodillas protestan un poco.', 'Your mechanics improve. Your knees grumble a bit.')),
    O(('Dos días por semana', 'Twice a week'), ('Equilibrio.', 'Balance.'), {'attr': {'tiroLibre': 1}, 'load': 4},
      ('Ganas confianza en el tiro libre sin machacarte.', 'You gain free-throw confidence without wrecking yourself.')),
    O(('Prefiero el gimnasio', 'I prefer the gym'), ('Fuerza en vez de muñeca.', 'Strength over touch.'), {'attr': {'fuerza': 1}, 'load': 6},
      ('Ganas un par de kilos de músculo. El tiro sigue igual.', 'You add a couple of kilos of muscle. Your shot stays the same.'))])

ev('mentor', 'locker', P, ('El veterano te ofrece consejo', 'The veteran offers advice'),
   ('{star}, el jugador más veterano del vestuario, te ha visto trabajar y quiere ayudarte… a su manera.', '{star}, the locker room\'s veteran, has seen you work and wants to help… his way.'),
   [O(('Escucharle en todo', 'Listen to everything'), ('Aprenderás a leer el juego.', 'You will learn to read the game.'), {'attr': {'lectura': 1, 'liderazgo': 1}, 'chemistry': 4},
      ('Te enseña trucos que no salen en ningún vídeo.', 'He teaches you tricks that are not in any video.')),
    O(('Tomar solo lo que te sirve', 'Take only what works for you'), ('Tu propio camino.', 'Your own path.'), {'confidence': 1, 'chemistry': -1},
      ('Te quedas con dos ideas buenas. Él nota que no le sigues del todo.', 'You keep two good ideas. He notices you do not fully follow him.'))])

ev('role-talk', 'coach', P, ('Hablar con el entrenador sobre tu rol', 'Talk to the coach about your role'),
   ('Llevas semanas con pocos minutos. Puedes llamar a la puerta del despacho.', 'You have had few minutes for weeks. You could knock on the office door.'),
   [U(('Pedir más minutos', 'Ask for more minutes'), ('Directo. Puede salir bien o mal.', 'Direct. Can go either way.'), 0.5,
      {'trust': 8, 'morale': 4}, ('Te dice que lo ha notado y te da la oportunidad.', 'He says he noticed and gives you a chance.'),
      {'trust': -6, 'morale': -3}, ('"Los minutos se ganan en el entrenamiento". La puerta se cierra.', '"Minutes are earned in practice." The door closes.')),
    O(('Preguntar qué mejorar', 'Ask what to improve'), ('Humildad y plan.', 'Humility and a plan.'), {'trust': 4, 'attr': {'defExterior': 1}},
      ('Te pide defensa. Te pones a ello.', 'He asks for defence. You get to work.')),
    O(('No decir nada', 'Say nothing'), ('Esperar tu momento.', 'Wait for your moment.'), {'morale': -2, 'confidence': -1},
      ('Sigues esperando. A veces el momento llega solo.', 'You keep waiting. Sometimes the moment comes on its own.'))],
   cond={'trustBelow': 58})

ev('trade-rumor', 'market', P, ('Rumor de traspaso', 'Trade rumour'),
   ('Un periodista dice que el {club} escucha ofertas por ti. El vestuario lo ha leído.', 'A reporter says {club} is listening to offers for you. The locker room has read it.'),
   [O(('Desmentirlo con una sonrisa', 'Deny it with a smile'), ('Calma y profesionalidad.', 'Calm and professionalism.'), {'chemistry': 3, 'morale': -1},
      ('"Aquí estoy feliz". Nadie sabe si es verdad, ni siquiera tú.', '"I\'m happy here." Nobody knows if it is true, not even you.')),
    O(('Pedir a tu agente que se informe', 'Have your agent look into it'), ('Saber es poder.', 'Knowledge is power.'), {'fame': 2, 'trust': -3},
      ('Hay interés de dos equipos. El club sabe que preguntas.', 'Two teams are interested. The club knows you asked.')),
    O(('Responder en redes', 'Respond on social media'), ('Un emoji vale más que mil palabras.', 'An emoji is worth a thousand words.'), {'fame': 4, 'fans': 3, 'trust': -5},
      ('Tu 👀 tiene un millón de visualizaciones. Al club no le hace gracia.', 'Your 👀 hits a million views. The club is not amused.'))], cond={'minWeek': 8})

ev('charity-camp', 'community', P, ('Campus de verano en tu barrio', 'Summer camp in your neighbourhood'),
   ('La cancha donde aprendiste a botar está hecha polvo. Te proponen organizar un campus y arreglarla.', 'The court where you learned to dribble is falling apart. They propose you run a camp and fix it.'),
   [O(('Pagar la cancha nueva (8.000)', 'Pay for a new court (8,000)'), ('Tu nombre en el aro para siempre.', 'Your name on the rim forever.'), {'cash': -8000, 'fame': 3, 'morale': 6, 'fans': 4},
      ('Inauguras la cancha con un mate. Los chavales gritan como si fuera una final.', 'You open the court with a dunk. The kids scream like it is a final.')),
    O(('Dar un día de clinic', 'Give a one-day clinic'), ('Tu tiempo, no tu dinero.', 'Your time, not your money.'), {'fame': 1, 'morale': 3, 'load': 3},
      ('Enseñas a tirar a cien niños. Te duelen los brazos de chocar manos.', 'You teach a hundred kids to shoot. Your arms ache from high-fives.')),
    O(('Ahora no puedo', 'Not now'), ('La temporada manda.', 'The season comes first.'), {'form': 1},
      ('Prometes que el año que viene. Te lo recordarán.', 'You promise next year. They will remind you.'))])

ev('investment', 'money', P, ('Una inversión "segura"', 'A "safe" investment'),
   ('Un conocido de un conocido te ofrece entrar en una cadena de hamburgueserías gourmet.', 'A friend of a friend offers you a stake in a gourmet burger chain.'),
   [U(('Invertir 15.000', 'Invest 15,000'), ('Podría salir muy bien.', 'Could go very well.'), 0.4,
      {'cash': 30000, 'morale': 3}, ('Abren tres locales y te pagan dividendos.', 'They open three locations and pay you dividends.'),
      {'cash': -15000, 'morale': -4}, ('La cadena cierra antes de abrir. Tu dinero, también.', 'The chain closes before opening. So does your money.')),
    O(('Consultar a un asesor', 'Ask an adviser'), ('Más lento, más seguro.', 'Slower, safer.'), {'cash': 2000, 'xp': 2},
      ('El asesor te recomienda un fondo aburrido. Aburrido y rentable.', 'The adviser recommends a boring fund. Boring and profitable.')),
    O(('No meterte', 'Stay out'), ('Lo tuyo es el baloncesto.', 'Basketball is your thing.'), {},
      ('Dices que no. Meses después lo verás en las noticias, para bien o para mal.', 'You say no. Months later you will see it on the news, for better or worse.'))],
   cond={'minWeek': 6})

ev('jersey-number', 'locker', P, ('El dorsal que querías', 'The number you wanted'),
   ('{teammate} lleva el número que siempre has querido. Se va a cambiar de equipo el año que viene… o no.', '{teammate} wears the number you have always wanted. He may leave next year… or not.'),
   [O(('Ofrecerle una cena por él', 'Offer him dinner for it'), ('A la antigua.', 'Old-school.'), {'chemistry': 3, 'cash': -300, 'morale': 2},
      ('Se ríe y te dice que se lo pensará. La cena fue buena.', 'He laughs and says he will think about it. Dinner was good.')),
    O(('Quedarte con el {number}', 'Keep {number}'), ('Ya es tuyo.', 'It is already yours.'), {'confidence': 1},
      ('Decides que el {number} será el que recuerden.', 'You decide {number} will be the one they remember.'))])

ev('nutritionist', 'health', P, ('Dieta nueva', 'New diet'),
   ('El nutricionista del club cree que puedes ganar explosividad si cambias la dieta. Adiós a tus tortitas de los domingos.', 'The club nutritionist thinks you can gain explosiveness by changing your diet. Goodbye Sunday pancakes.'),
   [O(('Seguirla al pie de la letra', 'Follow it to the letter'), ('Disciplina total.', 'Total discipline.'), {'attr': {'salto': 1, 'aceleracion': 1}, 'morale': -3},
      ('Pierdes tres kilos y algo de alegría.', 'You lose three kilos and a bit of joy.')),
    O(('Seguirla de lunes a sábado', 'Follow it Monday to Saturday'), ('Las tortitas son innegociables.', 'Pancakes are non-negotiable.'), {'attr': {'resistencia': 1}, 'morale': 1},
      ('Un término medio que tu cuerpo agradece.', 'A middle ground your body appreciates.')),
    O(('Pasar', 'Pass'), ('Te sientes bien como estás.', 'You feel fine as you are.'), {'trust': -2, 'morale': 2},
      ('El nutricionista lo anota en su libreta. Muy serio.', 'The nutritionist writes it in his notebook. Very serious.'))])

ev('rival-trash', 'rivalry', P, ('{rival} habla de ti', '{rival} talks about you'),
   ('Antes del partido contra {opponent}, {rival} dice en rueda de prensa que no sabe ni quién eres.', 'Before facing {opponent}, {rival} says at a press conference he does not even know who you are.'),
   [O(('Responder en la pista', 'Answer on the court'), ('Ni una palabra.', 'Not a word.'), {'confidence': 2, 'form': 1},
      ('Te guardas la rabia para el primer cuarto.', 'You save the anger for the first quarter.')),
    O(('Responder en redes', 'Answer on social media'), ('Con estilo.', 'With style.'), {'fame': 4, 'style': 3, 'trust': -2, 'flag': 'feud'},
      ('Tu respuesta es tendencia. Ahora todos esperan el duelo.', 'Your reply trends. Now everyone awaits the duel.')),
    O(('Ignorarle', 'Ignore him'), ('No le das ese gusto.', 'You do not give him the satisfaction.'), {'morale': 1},
      ('Silencio. Él tampoco sabe qué pensar.', 'Silence. He does not know what to think either.'))])

ev('feud', 'rivalry', P, ('El duelo con {rival} sigue', 'The feud with {rival} goes on'),
   ('Desde aquel cruce en redes, cada partido contra {rival} es un espectáculo. Una cadena quiere grabar un documental.', 'Since that social media spat, every game against {rival} is a show. A network wants to shoot a documentary.'),
   [O(('Aceptar el documental', 'Do the documentary'), ('Cámaras en tu vida.', 'Cameras in your life.'), {'fame': 6, 'cash': 5000, 'load': 5, 'unflag': 'feud'},
      ('El tráiler arrasa. Tu madre sale más que tú.', 'The trailer blows up. Your mum appears more than you.')),
    O(('Hacer las paces', 'Make peace'), ('Un mensaje privado.', 'A private message.'), {'morale': 4, 'fame': -1, 'unflag': 'feud'},
      ('{rival} contesta con un "respeto". Ya está.', '{rival} replies "respect". That is it.'))],
   cond={'flags': ['feud'], 'flagDelay': 6}, story=True)

ev('rookie-hazing', 'locker', P, ('Las novatadas', 'Rookie duties'),
   ('Como novato te toca llevar los balones y comprar el desayuno en cada viaje. {star} quiere además que cantes en el autobús.', 'As a rookie you carry the balls and buy breakfast on every trip. {star} also wants you to sing on the bus.'),
   [O(('Cantar con todo', 'Sing your heart out'), ('Vergüenza efímera, respeto eterno.', 'Brief shame, eternal respect.'), {'chemistry': 6, 'morale': 2, 'style': 1},
      ('Tu versión del himno del club ya circula por el grupo del equipo.', 'Your version of the club anthem is already on the team chat.')),
    O(('Negarte con educación', 'Politely refuse'), ('Tienes tus límites.', 'You have your limits.'), {'chemistry': -4, 'confidence': 1},
      ('Te ganas el apodo de "El Serio". No es el peor.', 'You earn the nickname "Mr Serious". Not the worst.'))],
   cond={'maxWeek': 12})

ev('fan-kid', 'community', P, ('Un niño con tu camiseta', 'A kid in your jersey'),
   ('Después del partido, un niño espera con tu camiseta y un cartel. Su padre te dice que es su cumpleaños.', 'After the game, a kid waits in your jersey with a sign. His dad says it is his birthday.'),
   [O(('Regalarle tus zapatillas', 'Give him your shoes'), ('Un recuerdo para siempre.', 'A memory forever.'), {'fans': 4, 'morale': 4, 'style': 2},
      ('El vídeo del niño abrazando las zapatillas da la vuelta al mundo.', 'The video of the kid hugging the shoes goes around the world.')),
    O(('Foto y firma rápida', 'Quick photo and autograph'), ('Mañana hay entrenamiento.', 'Practice tomorrow.'), {'fans': 1},
      ('Sonríe de oreja a oreja. Con poco basta.', 'He grins from ear to ear. A little goes a long way.'))])

ev('load-management', 'health', P, ('El preparador quiere que descanses', 'The trainer wants you to rest'),
   ('Tu carga es alta. El preparador físico propone que no juegues contra {opponent}. Tú te ves bien.', 'Your load is high. The strength coach suggests sitting out against {opponent}. You feel fine.'),
   [O(('Hacerle caso', 'Listen to him'), ('El cuerpo manda.', 'The body rules.'), {'load': -15, 'fatigue': -0.15, 'fans': -2},
      ('Ves el partido desde el banquillo con chándal. Tu cuerpo lo agradece.', 'You watch from the bench in sweats. Your body thanks you.')),
    U(('Jugar igualmente', 'Play anyway'), ('Puedes con todo… o eso crees.', 'You can handle it… or so you think.'), 0.7,
      {'trust': 3, 'form': 1}, ('Juegas suelto y sin molestias.', 'You play loose and pain-free.'),
      {'load': 10, 'attr': {'durabilidad': -1}, 'morale': -2}, ('Acabas con el gemelo cargado. Aviso recibido.', 'You finish with a tight calf. Message received.'))],
   cond={'minLoad': 55})

ev('national-call', 'national', P, ('Te llama la selección', 'The national team calls'),
   ('El seleccionador quiere verte en la ventana de clasificación. Supone viajar en plena temporada.', 'The national coach wants you for the qualifying window. It means travelling mid-season.'),
   [O(('Ir con orgullo', 'Go with pride'), ('La camiseta de tu país.', 'Your country\'s jersey.'), {'fame': 5, 'morale': 6, 'load': 10, 'flag': 'national'},
      ('Debutas con tu país. Tu familia viaja a verte.', 'You debut for your country. Your family travels to watch.')),
    O(('Pedir no ir esta vez', 'Ask to skip this time'), ('Priorizas el club.', 'You prioritise your club.'), {'trust': 4, 'fame': -2},
      ('El club te lo agradece. El seleccionador apunta tu nombre en otra lista.', 'The club thanks you. The national coach writes your name on another list.'))],
   cond={'minOvr': 60, 'minWeek': 10}, once=True)

ev('mid-range', 'training', P, ('¿Matar la media distancia?', 'Kill the mid-range?'),
   ('El analista del club te enseña tus números: tus tiros de media distancia son los peores del equipo. Quiere que tires triples o vayas al aro.', 'The club analyst shows you your numbers: your mid-range shots are the team\'s worst. He wants threes or rim attacks.'),
   [O(('Hacerle caso al analista', 'Follow the analyst'), ('Eficiencia.', 'Efficiency.'), {'attr': {'tiroTriple': 1, 'bandeja': 1}, 'confidence': -1},
      ('Tu mapa de tiro parece un manual moderno. Echas de menos tu tiro favorito.', 'Your shot chart looks like a modern textbook. You miss your favourite shot.')),
    O(('Defender tu tiro', 'Defend your shot'), ('Es tu firma.', 'It is your signature.'), {'attr': {'tiroMedia': 2}, 'trust': -2},
      ('Entrenas el fadeaway hasta que entra con los ojos cerrados.', 'You drill the fadeaway until it falls with your eyes closed.'))])

ev('podcast', 'press', P, ('Invitación a un pódcast', 'Podcast invitation'),
   ('El pódcast de baloncesto más escuchado quiere entrevistarte. Son famosos por sacar titulares.', 'The most popular basketball podcast wants to interview you. They are famous for headlines.'),
   [U(('Hablar sin filtro', 'Speak unfiltered'), ('Puedes caer de pie… o no.', 'You may land on your feet… or not.'), 0.55,
      {'fame': 6, 'fans': 4}, ('Te sale natural y gracioso. Te quieren de vuelta.', 'You come across natural and funny. They want you back.'),
      {'fame': 4, 'trust': -6, 'chemistry': -4}, ('Una frase sobre el entrenador sale de contexto.', 'A line about the coach is taken out of context.')),
    O(('Respuestas de manual', 'Textbook answers'), ('Nada que rascar.', 'Nothing to dig into.'), {'fame': 1},
      ('El episodio es correcto y olvidable.', 'The episode is fine and forgettable.')),
    O(('Rechazar', 'Decline'), ('Hablarás en la pista.', 'You will talk on the court.'), {'confidence': 1},
      ('Les dices que cuando ganes algo.', 'You tell them when you win something.'))], cond={'minFame': 6})

ev('car', 'money', P, ('El coche de tus sueños', 'Your dream car'),
   ('Por fin puedes comprarte el coche que tenías de póster en tu cuarto. Tu agente pone cara rara.', 'You can finally buy the car from the poster in your room. Your agent makes a face.'),
   [O(('Comprarlo (40.000)', 'Buy it (40,000)'), ('Se vive una vez.', 'You only live once.'), {'cash': -40000, 'style': 10, 'morale': 6},
      ('Llegas al entrenamiento y todos salen a verlo. Al aparcar, un poco menos.', 'You arrive at practice and everyone comes out to see it. Less so when you park.')),
    O(('Algo más modesto (8.000)', 'Something modest (8,000)'), ('Prudente.', 'Prudent.'), {'cash': -8000, 'style': 2},
      ('Un coche bonito y un agente tranquilo.', 'A nice car and a calm agent.')),
    O(('Ahorrar', 'Save'), ('El póster puede esperar.', 'The poster can wait.'), {'xp': 2},
      ('Sigues yendo en bus. El conductor ya te pide autógrafos.', 'You keep taking the bus. The driver asks for autographs now.'))],
   cond={'minWeek': 10})

ev('dunk-contest-invite', 'milestone', P, ('Invitación al concurso de mates', 'Dunk contest invitation'),
   ('La liga te invita al concurso de mates del fin de semana de las estrellas.', 'The league invites you to the All-Star weekend dunk contest.'),
   [U(('Ir con un mate preparado', 'Go with a prepared dunk'), ('Llevas semanas ensayando algo imposible.', 'You have rehearsed something impossible for weeks.'), 0.5,
      {'fame': 8, 'style': 6, 'confidence': 2}, ('El mate sale a la primera. El pabellón se viene abajo.', 'The dunk lands first try. The arena erupts.'),
      {'fame': 2, 'morale': -3}, ('Fallas tres veces. Te aplauden por insistir.', 'You miss three times. They applaud you for trying.')),
    O(('Rechazar para descansar', 'Decline to rest'), ('Prioridades.', 'Priorities.'), {'load': -8, 'trust': 2},
      ('Ves el concurso desde el sofá. Lo habrías ganado. Seguro.', 'You watch from the couch. You would have won. Surely.'))],
   cond={'minOvr': 58, 'minFame': 8}, once=True)

ev('slump', 'mental', P, ('Racha fría', 'Cold streak'),
   ('Llevas varios partidos sin meter una. La canasta parece más pequeña cada noche.', 'You have not hit anything for several games. The rim looks smaller every night.'),
   [O(('Psicólogo deportivo', 'Sports psychologist'), ('Hablar ayuda.', 'Talking helps.'), {'confidence': 2, 'morale': 4, 'cash': -1500},
      ('Te ayuda a soltar la presión. El tiro vuelve, poco a poco.', 'They help you release the pressure. Your shot returns, slowly.')),
    O(('Más tiros, más horas', 'More shots, more hours'), ('Que la muñeca recuerde.', 'Let the wrist remember.'), {'form': 2, 'load': 8},
      ('Vuelves a sentir la red. Y el hombro.', 'You feel the net again. And your shoulder.')),
    O(('Desconectar un día', 'Switch off for a day'), ('Playa, familia, nada de baloncesto.', 'Beach, family, no basketball.'), {'morale': 5, 'form': 1},
      ('Vuelves con la cabeza limpia.', 'You come back with a clear head.'))],
   cond={'loseStreak': 3})

ev('hot-streak', 'mental', P, ('Estás on fire', "You're on fire"),
   ('Ganáis partido tras partido y tú estás en tu mejor momento. Te empiezan a hacer más caso.', 'You win game after game and you are at your best. People start listening.'),
   [O(('Pedir ser capitán', 'Ask to be captain'), ('Es tu momento.', 'It is your moment.'), {'trust': -2, 'attr': {'liderazgo': 2}, 'fame': 2},
      ('El entrenador no te lo da, pero lo apunta.', 'The coach does not give it to you, but notes it.')),
    O(('Mantener la humildad', 'Stay humble'), ('Partido a partido.', 'One game at a time.'), {'chemistry': 4, 'trust': 3},
      ('"El mérito es del equipo". Y esta vez lo dices de verdad.', '"Credit goes to the team." And this time you mean it.'))],
   cond={'winStreak': 4})

ev('heckler', 'press', P, ('Un aficionado rival te provoca', 'A rival fan heckles you'),
   ('En la pista de {opponent} un aficionado de primera fila lleva todo el partido metiéndose contigo.', 'At {opponent}\'s arena a courtside fan has been on you all game.'),
   [O(('Mandarle un beso al meter', 'Blow a kiss after scoring'), ('Teatro puro.', 'Pure theatre.'), {'fame': 3, 'style': 2, 'trust': -1},
      ('El gesto se hace viral. La grada rival te odia todavía más.', 'The gesture goes viral. The rival crowd hates you even more.')),
    O(('No mirarle', 'Do not look at him'), ('Que hable el marcador.', 'Let the scoreboard talk.'), {'confidence': 1},
      ('Al final se queda callado. Eso dice todo.', 'In the end he goes quiet. That says it all.'))])

ev('teammate-conflict', 'locker', P, ('Choque con {teammate}', 'Clash with {teammate}'),
   ('En el entrenamiento, {teammate} te empuja después de un bloqueo. Hay gritos y el entrenador lo ha visto.', 'At practice, {teammate} shoves you after a screen. There is shouting and the coach saw it.'),
   [O(('Hablarlo en privado', 'Talk it out privately'), ('Madurez.', 'Maturity.'), {'chemistry': 5, 'trust': 2},
      ('Al final era por otra cosa. Os dais la mano.', 'Turns out it was about something else. You shake hands.')),
    O(('Devolverle el golpe en el siguiente ataque', 'Hit back next play'), ('No eres un saco.', 'You are not a punching bag.'), {'chemistry': -6, 'confidence': 2, 'trust': -3},
      ('Te ganas su respeto y una multa.', 'You earn his respect and a fine.')),
    O(('Contárselo al capitán', 'Tell the captain'), ('Que medie.', 'Let him mediate.'), {'chemistry': 2, 'fame': -1},
      ('{star} lo arregla en cinco minutos. Así de fácil.', '{star} fixes it in five minutes. That easy.'))])

ev('summer-league', 'training', P, ('Verano: ¿descanso o trabajo?', 'Summer: rest or work?'),
   ('Se acerca el verano. Tu agente te propone un campus de entrenamiento en otro país con un preparador famoso.', 'Summer approaches. Your agent suggests a training camp abroad with a famous trainer.'),
   [O(('Campus intensivo', 'Intensive camp'), ('Volverás distinto.', 'You will come back different.'), {'attr': {'manejo': 1, 'velocidad': 1}, 'cash': -6000, 'load': 6},
      ('Tres semanas de dolor y progreso.', 'Three weeks of pain and progress.')),
    O(('Vacaciones de verdad', 'Real holidays'), ('Recargar.', 'Recharge.'), {'morale': 8, 'load': -12},
      ('Desconectas por completo. Vuelves con ganas.', 'You fully disconnect. You come back hungry.'))],
   cond={'lateSeason': True}, once=True)

ev('coach-trust-low', 'coach', P, ('El entrenador no cuenta contigo', 'The coach is not counting on you'),
   ('Tu confianza con el entrenador está bajo mínimos. Tu agente sugiere buscar una cesión.', 'Your relationship with the coach is at rock bottom. Your agent suggests a loan.'),
   [O(('Pedir la cesión', 'Request a loan'), ('Minutos en otro lado.', 'Minutes elsewhere.'), {'trust': 6, 'morale': 2, 'fame': -2},
      ('El club acepta estudiarlo. De momento, el entrenador te mira distinto.', 'The club agrees to look into it. For now, the coach sees you differently.')),
    O(('Quedarte y pelear', 'Stay and fight'), ('Nadie te regala nada.', 'Nobody gives you anything.'), {'load': 6, 'confidence': 2, 'trust': 3},
      ('Te quedas después de cada entrenamiento. Se nota.', 'You stay late after every practice. It shows.'))],
   cond={'trustBelow': 35}, cooldown=20)

ev('rookie-wall', 'health', P, ('El muro del novato', 'The rookie wall'),
   ('Nunca habías jugado tantos partidos seguidos. Las piernas pesan y los viajes se acumulan.', 'You have never played so many games in a row. Legs are heavy and trips pile up.'),
   [O(('Dormir más, salir menos', 'Sleep more, go out less'), ('Vida monacal.', 'Monk life.'), {'fatigue': -0.2, 'chemistry': -2},
      ('Recuperas piernas. Te pierdes alguna cena de equipo.', 'You regain your legs. You miss some team dinners.')),
    O(('Cafeína y para adelante', 'Caffeine and push on'), ('Ya descansarás en verano.', 'You will rest in summer.'), {'form': 1, 'load': 8},
      ('Funciona… de momento.', 'It works… for now.'))],
   cond={'minWeek': 20, 'maxOvr': 62})

ev('podium-pressure', 'press', P, ('Pregunta trampa en rueda de prensa', 'Trick question at a press conference'),
   ('Tras perder contra {opponent}, un periodista te pregunta si el sistema del entrenador te favorece.', 'After losing to {opponent}, a reporter asks if the coach\'s system suits you.'),
   [O(('Defender al entrenador', 'Defend the coach'), ('Lealtad.', 'Loyalty.'), {'trust': 5, 'fame': -1},
      ('El entrenador te da una palmada en la espalda al salir.', 'The coach pats your back on the way out.')),
    O(('Ser sincero', 'Be honest'), ('"Podríamos correr más".', '"We could run more."'), {'fame': 3, 'trust': -5, 'fans': 2},
      ('Titular del día. Mañana habrá reunión.', 'Headline of the day. There will be a meeting tomorrow.'))],
   cond={'lastWon': False})

ev('europe-offer', 'market', P, ('Un grande de Europa pregunta por ti', 'A European giant asks about you'),
   ('Un club de la máxima competición continental se interesa. Pagaría tu cláusula si das el visto bueno.', 'A club from the top continental competition is interested. They would pay your buyout if you agree.'),
   [O(('Escuchar la oferta', 'Hear the offer'), ('Sin compromiso.', 'No commitment.'), {'fame': 3, 'trust': -2, 'flag': 'euro-interest'},
      ('Tu agente vuela a reunirse con ellos.', 'Your agent flies to meet them.')),
    O(('Centrarte en el {club}', 'Focus on {club}'), ('Aquí hay un proyecto.', 'There is a project here.'), {'trust': 5, 'fans': 3},
      ('El presidente te llama para darte las gracias.', 'The president calls to thank you.'))],
   cond={'region': 'EU', 'minOvr': 62}, once=True)

ev('euro-interest', 'market', P, ('La oferta europea llega por escrito', 'The European offer arrives in writing'),
   ('El club continental ha mandado la oferta formal: más dinero y minutos en la gran competición. Al {club} le duele.', 'The continental club sends the formal offer: more money and minutes in the big competition. {club} is hurting.'),
   [O(('Forzar la salida', 'Force the move'), ('El salto de tu vida.', 'The leap of your life.'), {'salary': 1.3, 'fans': -8, 'fame': 5, 'unflag': 'euro-interest'},
      ('Se acuerda el traspaso para final de temporada. La grada no te lo perdona aún.', 'A transfer is agreed for season end. The crowd has not forgiven you yet.')),
    O(('Quedarte una temporada más', 'Stay one more season'), ('Lealtad, y quizá más valor.', 'Loyalty, and maybe more value.'), {'fans': 6, 'trust': 5, 'unflag': 'euro-interest'},
      ('Lo anuncias en el centro de la pista. Ovación.', 'You announce it at centre court. Standing ovation.'))],
   cond={'flags': ['euro-interest'], 'flagDelay': 4}, story=True)

ev('g-league', 'market', P, ('Liga de desarrollo', 'Development league'),
   ('El club te propone bajar unas semanas a su filial de la liga de desarrollo para coger ritmo.', 'The club suggests a few weeks with its development league affiliate to get rhythm.'),
   [O(('Aceptar y jugar mucho', 'Accept and play a lot'), ('Minutos de verdad.', 'Real minutes.'), {'form': 3, 'confidence': 2, 'fame': -2},
      ('Promedias 22 puntos en autobuses de ocho horas.', 'You average 22 points on eight-hour bus rides.')),
    O(('Pedir quedarte arriba', 'Ask to stay up'), ('Entrenar con los mejores.', 'Train with the best.'), {'trust': -3, 'attr': {'lectura': 1}},
      ('Te quedas, pero viendo los partidos desde el final del banquillo.', 'You stay, but watching from the end of the bench.'))],
   cond={'region': 'NA', 'trustBelow': 55})

ev('two-way', 'contract', P, ('Contrato dual', 'Two-way contract'),
   ('Tras no ser elegido en el draft, una franquicia te ofrece un contrato dual: unos días arriba, la mayoría en la liga de desarrollo.', 'After going undrafted, a franchise offers a two-way deal: some days up, most in the development league.'),
   [O(('Firmar el dual', 'Sign the two-way'), ('Un pie dentro.', 'A foot in the door.'), {'trust': 6, 'morale': 4},
      ('Firmas. Tu taquilla está al lado de la puerta, pero es tu taquilla.', 'You sign. Your locker is next to the door, but it is your locker.')),
    O(('Probar en Europa', 'Try Europe'), ('Minutos y sueldo seguros.', 'Guaranteed minutes and salary.'), {'cash': 8000, 'flag': 'euro-interest'},
      ('Tu agente empieza a llamar a clubes europeos.', 'Your agent starts calling European clubs.'))],
   cond={'route': ['na-undrafted'], 'maxWeek': 4}, story=True)

ev('draft-night', 'milestone', P, ('La noche del draft', 'Draft night'),
   ('Has sido elegido. Hay prensa, gorra nueva y tu familia llorando en la mesa. ¿Qué dices al subir al escenario?', 'You have been drafted. Press, a new cap and your family crying at the table. What do you say on stage?'),
   [O(('Prometer un anillo', 'Promise a ring'), ('Ambición sin filtro.', 'Unfiltered ambition.'), {'fame': 4, 'fans': 5, 'confidence': 2},
      ('La afición del {club} enloquece. La presión, también.', '{club} fans go wild. So does the pressure.')),
    O(('Dar las gracias a tu familia', 'Thank your family'), ('Lo primero, ellos.', 'Them first.'), {'morale': 8, 'fans': 2},
      ('No hay ni un ojo seco en la sala.', 'There is not a dry eye in the room.'))],
   cond={'route': ['na-draft'], 'maxWeek': 2}, story=True)

ev('academy-promotion', 'milestone', P, ('Del filial al primer equipo', 'From the reserves to the first team'),
   ('Te han subido a entrenar con el primer equipo del {club}. {star} te mira de arriba abajo.', 'You have been called up to train with {club}\'s first team. {star} sizes you up.'),
   [O(('Pedir el balón desde el primer día', 'Ask for the ball from day one'), ('Hambre.', 'Hunger.'), {'confidence': 2, 'chemistry': -3, 'trust': 2},
      ('Algún veterano frunce el ceño. El entrenador sonríe.', 'Some veterans frown. The coach smiles.')),
    O(('Trabajar en silencio', 'Work quietly'), ('Que te descubran.', 'Let them discover you.'), {'chemistry': 4, 'attr': {'defExterior': 1}},
      ('Defiendes como un perro. Te ganas al vestuario.', 'You defend like a dog. You win over the locker room.'))],
   cond={'route': ['eu-academy'], 'maxWeek': 3}, story=True)

# ======================= ENTRENADOR =======================
ev('coach-first-talk', 'locker', C, ('Tu primera charla', 'Your first team talk'),
   ('Primer día en el banquillo del {club}. El vestuario espera tu discurso. {star} se cruza de brazos.', 'First day on {club}\'s bench. The locker room awaits your speech. {star} folds his arms.'),
   [O(('Mano dura', 'Iron fist'), ('Normas claras desde el minuto uno.', 'Clear rules from minute one.'), {'board': 4, 'locker': -4, 'flag': 'strict'},
      ('Silencio absoluto. Saben quién manda.', 'Dead silence. They know who is boss.')),
    O(('Cercanía', 'Closeness'), ('Un equipo, una familia.', 'One team, one family.'), {'locker': 6, 'board': -2},
      ('Risas y aplausos. Habrá que ver cuando lleguen las derrotas.', 'Laughs and applause. We will see when losses come.')),
    O(('Darle el mando a {star}', 'Hand the reins to {star}'), ('Tu estrella, tu aliado.', 'Your star, your ally.'), {'locker': 3, 'morale': 2, 'flag': 'star-power'},
      ('{star} sonríe. Ahora le debes una.', '{star} smiles. Now you owe him one.'))],
   cond={'maxWeek': 2}, story=True)

ev('star-minutes', 'locker', C, ('{star} quiere más balones', '{star} wants more touches'),
   ('Tu estrella se queja en voz baja: el sistema reparte demasiado. Quiere jugadas para él al final de los partidos.', 'Your star complains quietly: the system spreads it too much. He wants plays for him in crunch time.'),
   [O(('Dárselas', 'Give them'), ('Las estrellas ganan partidos.', 'Stars win games.'), {'locker': -3, 'morale': 2, 'board': 2},
      ('{star} está feliz. Los demás, menos.', '{star} is happy. The rest, less so.')),
    O(('Mantener el sistema', 'Keep the system'), ('Nadie está por encima.', 'Nobody is above it.'), {'locker': 4, 'board': -2, 'flag': 'star-unhappy'},
      ('El vestuario lo respeta. {star} cuenta los días.', 'The locker room respects it. {star} counts the days.'))],
   cond={'minWeek': 4})

ev('star-unhappy', 'locker', C, ('{star} pide el traspaso', '{star} requests a trade'),
   ('Lo que temías: tu estrella ha pedido salir. La directiva quiere saber qué opinas.', 'What you feared: your star wants out. The front office wants your view.'),
   [O(('Dejarle ir', 'Let him go'), ('Proyecto por encima de nombres.', 'Project over names.'), {'board': 4, 'locker': 2, 'fame': -2, 'unflag': 'star-unhappy'},
      ('La directiva aplaude tu firmeza. El calendario dirá si fue buena idea.', 'The board applauds your firmness. The schedule will tell if it was wise.')),
    O(('Convencerle de quedarse', 'Convince him to stay'), ('Cena larga y promesas.', 'Long dinner and promises.'), {'locker': -2, 'morale': 3, 'unflag': 'star-unhappy'},
      ('Se queda, con condiciones. Ya sabes lo que eso significa.', 'He stays, with conditions. You know what that means.'))],
   cond={'flags': ['star-unhappy'], 'flagDelay': 5}, story=True)

ev('board-pressure', 'board', C, ('La directiva aprieta', 'The board tightens the screws'),
   ('Tres derrotas seguidas. El presidente te recuerda que el objetivo de la temporada no es negociable.', 'Three straight losses. The president reminds you the season goal is not negotiable.'),
   [O(('Pedir paciencia', 'Ask for patience'), ('El plan funciona, aunque no lo parezca.', 'The plan works, even if it does not look like it.'), {'board': -3, 'morale': 2},
      ('Te dan dos semanas. Ni una más.', 'They give you two weeks. Not one more.')),
    O(('Cambiar el quinteto', 'Change the starting five'), ('Golpe de efecto.', 'A jolt.'), {'locker': -3, 'board': 3},
      ('Los suplentes salen con hambre. Los titulares, mosqueados.', 'Bench players come out hungry. Starters, annoyed.')),
    O(('Entrenamientos dobles', 'Double sessions'), ('Más trabajo, menos excusas.', 'More work, no excuses.'), {'locker': -5, 'board': 4, 'morale': -2},
      ('El equipo resopla. La directiva asiente.', 'The team groans. The board nods.'))],
   cond={'loseStreak': 3})

ev('analytics', 'tactics', C, ('El departamento de datos', 'The analytics department'),
   ('Tu nuevo analista dice que tirar más triples y dejar la media distancia subiría vuestra eficiencia un 6 %.', 'Your new analyst says more threes and no mid-range would lift your efficiency by 6%.'),
   [O(('Abrazar los números', 'Embrace the numbers'), ('El baloncesto moderno.', 'Modern basketball.'), {'board': 3, 'locker': -1},
      ('Pizarra nueva, flechas hacia la línea de tres.', 'New whiteboard, arrows to the three-point line.')),
    O(('Confiar en tu ojo', 'Trust your eye'), ('Los números no lo ven todo.', 'Numbers do not see everything.'), {'locker': 2, 'board': -2},
      ('El analista se va con su portátil y una cara larga.', 'The analyst leaves with his laptop and a long face.'))])

ev('referee', 'press', C, ('Arbitraje polémico', 'Controversial officiating'),
   ('Perdéis contra {opponent} con dos decisiones muy dudosas al final. Los micrófonos te esperan.', 'You lose to {opponent} with two very questionable late calls. The microphones await.'),
   [O(('Cargar contra los árbitros', 'Blast the referees'), ('Defiendes a los tuyos.', 'You defend your team.'), {'locker': 5, 'cash': -3000, 'board': -2, 'fame': 2},
      ('Multa de la liga. Tu vestuario te adora.', 'League fine. Your locker room adores you.')),
    O(('Mirar hacia dentro', 'Look inward'), ('"No hemos hecho lo suficiente".', '"We did not do enough."'), {'board': 3, 'locker': -2},
      ('La directiva aprecia la clase. Algún jugador esperaba otra cosa.', 'The board appreciates the class. Some players expected otherwise.'))],
   cond={'lastWon': False})

ev('young-prospect', 'development', C, ('El chaval de la cantera', 'The academy kid'),
   ('Un chico de 17 años lo está rompiendo en los entrenamientos. Darle minutos significa quitárselos a un veterano.', 'A 17-year-old is tearing it up in practice. Playing him means benching a veteran.'),
   [O(('Darle minutos', 'Give him minutes'), ('El futuro es ahora.', 'The future is now.'), {'fame': 3, 'locker': -2, 'board': 2},
      ('El chaval anota en su debut. El veterano no te saluda.', 'The kid scores on debut. The veteran ignores you.')),
    O(('Protegerle un año más', 'Protect him another year'), ('Sin prisa.', 'No rush.'), {'locker': 3},
      ('Sigue en el filial. Y sigue creciendo.', 'He stays with the reserves. And keeps growing.'))])

ev('road-trip', 'locker', C, ('Gira de cinco partidos fuera', 'Five-game road trip'),
   ('Viene una gira larga. Puedes organizar una actividad de equipo o mantenerlo todo profesional.', 'A long road trip is coming. You can organise a team activity or keep it all business.'),
   [O(('Cena de equipo y bolera', 'Team dinner and bowling'), ('Química.', 'Chemistry.'), {'locker': 6, 'cash': -1000},
      ('{star} resulta ser un genio de la bolera. Nadie lo sabía.', '{star} turns out to be a bowling genius. Nobody knew.')),
    O(('Vídeo y descanso', 'Film and rest'), ('Concentración total.', 'Total focus.'), {'board': 2, 'locker': -1},
      ('Llegáis frescos y aburridos.', 'You arrive fresh and bored.'))])

ev('injury-star-coach', 'health', C, ('Tu estrella quiere jugar lesionada', 'Your star wants to play hurt'),
   ('{star} tiene molestias en el tobillo pero insiste en jugar contra {opponent}. El médico duda.', '{star} has ankle pain but insists on playing against {opponent}. The doctor hesitates.'),
   [U(('Dejarle jugar', 'Let him play'), ('Es su decisión… y la tuya.', 'His call… and yours.'), 0.6,
      {'morale': 3, 'locker': 3}, ('Juega bien y sin dolor. Te da las gracias.', 'He plays well and pain-free. He thanks you.'),
      {'board': -5, 'locker': -3}, ('Se resiente en el segundo cuarto. Dos semanas fuera.', 'He aggravates it in the second quarter. Two weeks out.')),
    O(('Sentarle', 'Sit him'), ('La salud primero.', 'Health first.'), {'board': 2, 'locker': -2},
      ('Se enfada contigo. El médico, no.', 'He is mad at you. The doctor is not.'))])

ev('fan-protest', 'fans', C, ('Pancartas contra ti', 'Banners against you'),
   ('Parte de la grada saca pancartas pidiendo tu salida. Hay cámaras.', 'Part of the crowd unfurls banners demanding your exit. Cameras are rolling.'),
   [O(('Hablar con la peña', 'Meet the fan club'), ('Dar la cara.', 'Face them.'), {'board': 2, 'morale': -2, 'fame': 1},
      ('Os escucháis. No os queréis, pero os respetáis.', 'You listen to each other. No love, but respect.')),
    O(('Ignorarlo', 'Ignore it'), ('Solo importa el equipo.', 'Only the team matters.'), {'morale': -3},
      ('Las pancartas siguen. Ganar es la única respuesta.', 'The banners stay. Winning is the only answer.'))],
   cond={'loseStreak': 4})

ev('assistant-poached', 'staff', C, ('Te quieren robar al asistente', 'They want to poach your assistant'),
   ('Tu primer asistente tiene una oferta para ser entrenador principal en otro club.', 'Your lead assistant has an offer to be head coach elsewhere.'),
   [O(('Animarle a irse', 'Encourage him to go'), ('Es su oportunidad.', 'It is his chance.'), {'fame': 2, 'locker': -1},
      ('Se va agradecido. Tendrás un aliado en otro banquillo.', 'He leaves grateful. You will have an ally on another bench.')),
    O(('Pedir a la directiva que le suba el sueldo', 'Ask the board to give him a raise'), ('No puedes perderle.', 'You cannot lose him.'), {'board': -3, 'locker': 2},
      ('Se queda. La directiva toma nota.', 'He stays. The board takes note.'))])

ev('tank-question', 'board', C, ('¿Perder para ganar?', 'Lose to win?'),
   ('Vais a la cola. Un directivo insinúa que una mala temporada daría mejor posición en el draft.', 'You are near the bottom. An executive hints a bad season would mean a better draft pick.'),
   [O(('Negarte en redondo', 'Flat refusal'), ('Se compite siempre.', 'You always compete.'), {'locker': 5, 'board': -4},
      ('El vestuario se entera y te respeta más.', 'The locker room hears of it and respects you more.')),
    O(('Dar minutos a los jóvenes', 'Play the youngsters'), ('Desarrollo… y lo que venga.', 'Development… and whatever follows.'), {'board': 4, 'locker': -3},
      ('Los resultados empeoran. Los chavales crecen.', 'Results worsen. The kids grow.'))],
   cond={'region': 'NA', 'loseStreak': 3, 'minWeek': 20})

ev('timeout-legend', 'press', C, ('Tu tiempo muerto se hace viral', 'Your timeout goes viral'),
   ('Un micrófono captó tu bronca en el último tiempo muerto. Ya tiene millones de reproducciones.', 'A mic caught your rant in the last timeout. It has millions of views.'),
   [O(('Reírte de ti mismo', 'Laugh at yourself'), ('Humor.', 'Humour.'), {'fame': 5, 'locker': 3},
      ('Hacen camisetas con tu frase. Te regalan una.', 'They make T-shirts with your line. They give you one.')),
    O(('Pedir que se retire', 'Ask for it to be taken down'), ('Lo del vestuario se queda en el vestuario.', 'What happens in the locker room stays there.'), {'board': 2, 'fame': -1},
      ('Lo retiran. Internet nunca olvida.', 'They take it down. The internet never forgets.'))],
   cond={'minLive': 2}, once=True)

ev('strict-backfire', 'locker', C, ('La mano dura cansa', 'The iron fist wears thin'),
   ('Tus normas estrictas empiezan a pesar. {teammate} llega tarde y todo el vestuario mira qué haces.', 'Your strict rules start to weigh. {teammate} arrives late and the whole locker room watches what you do.'),
   [O(('Multarle como a cualquiera', 'Fine him like anyone'), ('Coherencia.', 'Consistency.'), {'board': 3, 'locker': -3, 'unflag': 'strict'},
      ('Pagas tú la cena del equipo esa noche para suavizarlo.', 'You buy the team dinner that night to soften it.')),
    O(('Hacer una excepción', 'Make an exception'), ('Leer la situación.', 'Read the room.'), {'locker': 4, 'board': -2, 'unflag': 'strict'},
      ('Nadie dice nada. Todos lo han visto.', 'Nobody says a thing. Everybody saw it.'))],
   cond={'flags': ['strict'], 'flagDelay': 8}, story=True)

ev('star-power-favor', 'locker', C, ('{star} se cobra el favor', '{star} calls in the favour'),
   ('Le diste el mando al principio. Ahora {star} quiere que su amigo, un veterano sin equipo, entre en la plantilla.', 'You gave him the reins early on. Now {star} wants his friend, an unsigned veteran, on the roster.'),
   [O(('Ficharle', 'Sign him'), ('Paz en el vestuario.', 'Locker room peace.'), {'locker': 4, 'board': -4, 'unflag': 'star-power'},
      ('El amigo llega con más ganas que piernas.', 'The friend arrives with more heart than legs.')),
    O(('Decir que no', 'Say no'), ('Hasta aquí.', 'This far and no further.'), {'locker': -4, 'board': 3, 'unflag': 'star-power'},
      ('{star} no lo entiende. Ya lo entenderá.', '{star} does not get it. He will.'))],
   cond={'flags': ['star-power'], 'flagDelay': 10}, story=True)

ev('scouting-trip', 'staff', C, ('Viaje de scouting', 'Scouting trip'),
   ('Hay un torneo juvenil en el extranjero con talento escondido. Ir significa perderte dos entrenamientos.', 'There is a youth tournament abroad with hidden talent. Going means missing two practices.'),
   [O(('Ir tú mismo', 'Go yourself'), ('Ojo propio.', 'Your own eyes.'), {'fame': 1, 'locker': -2, 'xp': 6},
      ('Vuelves con un nombre apuntado en la libreta.', 'You come back with a name in your notebook.')),
    O(('Mandar al asistente', 'Send the assistant'), ('Delegar.', 'Delegate.'), {'locker': 1, 'xp': 2},
      ('Te trae un informe correcto. Sin magia.', 'He brings a decent report. No magic.'))])

ev('practice-intensity', 'tactics', C, ('Intensidad en los entrenamientos', 'Practice intensity'),
   ('El preparador físico avisa de que la plantilla está cargada. Quedan partidos clave.', 'The strength coach warns the roster is overloaded. Key games ahead.'),
   [O(('Bajar el ritmo', 'Ease off'), ('Piernas frescas.', 'Fresh legs.'), {'locker': 3},
      ('Entrenamientos cortos y tiros libres. El equipo respira.', 'Short practices and free throws. The team breathes.')),
    O(('Apretar igualmente', 'Push anyway'), ('El título se gana en febrero.', 'Titles are won in February.'), {'board': 2, 'locker': -4},
      ('Ganáis en competitividad. Y en bolsas de hielo.', 'You gain edge. And ice bags.'))])

ev('contract-coach', 'contract', C, ('La directiva ofrece renovarte', 'The board offers you an extension'),
   ('Las cosas van bien y el presidente quiere atarte dos años más.', 'Things are going well and the president wants to tie you down for two more years.'),
   [O(('Firmar ya', 'Sign now'), ('Estabilidad.', 'Stability.'), {'board': 6, 'morale': 4, 'cash': 10000},
      ('Firmas en el despacho del presidente con foto incluida.', 'You sign in the president\'s office, photo included.')),
    U(('Pedir poder en los fichajes', 'Ask for say on signings'), ('Más control, más riesgo.', 'More control, more risk.'), 0.5,
      {'board': 4, 'fame': 3, 'flag': 'gm-power'}, ('Aceptan: tendrás voz en el mercado.', 'They agree: you will have a voice in the market.'),
      {'board': -6}, ('"Tú entrena, que de fichar nos ocupamos nosotros".', '"You coach, we handle signings."'))],
   cond={'winStreak': 3, 'minWeek': 12}, once=True)

ev('rival-coach', 'rivalry', C, ('El entrenador rival te provoca', 'The rival coach needles you'),
   ('El técnico de {opponent} dice que tu equipo "juega a no perder".', '{opponent}\'s coach says your team "plays not to lose".'),
   [O(('Contestar con ironía', 'Reply with irony'), ('Tú también sabes jugar.', 'You can play this game too.'), {'fame': 3, 'locker': 2},
      ('Tu respuesta es la mejor frase de la jornada.', 'Your reply is the line of the week.')),
    O(('No entrar al trapo', 'Do not take the bait'), ('Elegancia.', 'Elegance.'), {'board': 2},
      ('"Respeto a todos los rivales". Aburrido y eficaz.', '"I respect every opponent." Boring and effective.'))])

ev('mvp-chant', 'fans', C, ('El pabellón está contigo', 'The arena is with you'),
   ('Cuatro victorias seguidas. La grada corea tu nombre al salir del túnel.', 'Four straight wins. The crowd chants your name as you walk out of the tunnel.'),
   [O(('Saludar a la grada', 'Salute the crowd'), ('Disfrutarlo.', 'Enjoy it.'), {'fame': 3, 'morale': 4},
      ('Te sale una sonrisa que no recordabas.', 'A smile you had forgotten appears.')),
    O(('Señalar a los jugadores', 'Point to the players'), ('Ellos lo merecen.', 'They deserve it.'), {'locker': 5},
      ('Los jugadores lo ven. Y lo agradecen.', 'The players see it. And appreciate it.'))],
   cond={'winStreak': 4})

ev('coach-national', 'national', C, ('La federación te tienta', 'The federation tempts you'),
   ('La federación busca seleccionador y tu nombre suena. Sería compatible con el club, pero con menos tiempo.', 'The federation needs a national coach and your name is mentioned. It would fit with the club, but less time.'),
   [O(('Aceptar el doble cargo', 'Accept both jobs'), ('Prestigio.', 'Prestige.'), {'fame': 6, 'board': -3, 'locker': -2, 'flag': 'national-coach'},
      ('Serás seleccionador. El club no está del todo contento.', 'You will be national coach. The club is not entirely happy.')),
    O(('Centrarte en el club', 'Focus on the club'), ('Un solo proyecto.', 'One project.'), {'board': 4},
      ('El presidente te lo agradece con un abrazo.', 'The president thanks you with a hug.'))],
   cond={'minWeek': 15}, once=True)

ev('tech-foul', 'discipline', C, ('Técnica por protestar', 'Technical for arguing'),
   ('Te pitan una técnica por protestar a gritos. La liga avisa: una más y habrá sanción.', 'You get a technical for loud protesting. The league warns: one more and you are suspended.'),
   [O(('Calmarte', 'Calm down'), ('Cabeza fría.', 'Cool head.'), {'board': 2, 'locker': -1},
      ('Te sientas y respiras. Los jugadores lo notan.', 'You sit down and breathe. The players notice.')),
    O(('Seguir protestando', 'Keep protesting'), ('Defender a los tuyos tiene precio.', 'Defending your team has a price.'), {'locker': 4, 'board': -4, 'cash': -2000},
      ('Expulsado. El equipo remonta sin ti… o no.', 'Ejected. The team comes back without you… or not.'))],
   cond={'lastWon': False})

ev('player-personal', 'locker', C, ('Un jugador pasa un mal momento', 'A player is going through a rough patch'),
   ('{teammate} tiene problemas personales y su rendimiento cae. Te pide unos días.', '{teammate} has personal issues and his game is slipping. He asks for a few days off.'),
   [O(('Dárselos', 'Give them'), ('Las personas primero.', 'People first.'), {'locker': 5, 'board': -1},
      ('Vuelve en una semana y te da un abrazo.', 'He returns in a week and gives you a hug.')),
    O(('Pedirle que aguante', 'Ask him to hang on'), ('El equipo le necesita.', 'The team needs him.'), {'board': 2, 'locker': -3},
      ('Juega, pero no está. Todos lo notan.', 'He plays, but he is not there. Everyone notices.'))])

# ======================= CUALQUIER MODO =======================
ev('family-wedding', 'family', A, ('Boda en la familia', 'Family wedding'),
   ('Tu primo se casa el mismo día que jugáis contra {opponent}.', 'Your cousin is getting married the same day you play {opponent}.'),
   [O(('Ir a la boda', 'Go to the wedding'), ('La familia es la familia.', 'Family is family.'), {'morale': 6, 'trust': -4, 'board': -2},
      ('Bailas hasta tarde. Tus compañeros pierden sin ti.', 'You dance till late. Your teammates lose without you.')),
    O(('Mandar un vídeo', 'Send a video'), ('Te perdonarán.', 'They will forgive you.'), {'morale': -2},
      ('Tu tía dice que no pasa nada. Sí pasa.', 'Your aunt says it is fine. It is not.'))], cond={'minWeek': 4})

ev('documentary-offer', 'media', A, ('Una plataforma quiere grabar la temporada', 'A platform wants to film the season'),
   ('Una plataforma de streaming quiere seguir al {club} toda la temporada: vestuario, viajes y despacho.', 'A streaming platform wants to follow {club} all season: locker room, travel and office.'),
   [O(('Dar acceso total', 'Grant full access'), ('Exposición máxima.', 'Maximum exposure.'), {'fame': 6, 'cash': 6000, 'chemistry': -4, 'locker': -3},
      ('Las cámaras lo graban todo. Hasta lo que no debería.', 'The cameras catch everything. Even what they should not.')),
    O(('Acceso limitado', 'Limited access'), ('Algunas puertas cerradas.', 'Some doors closed.'), {'fame': 3, 'cash': 2000},
      ('Un documental correcto, sin dramas.', 'A decent documentary, no drama.')),
    O(('Rechazar', 'Decline'), ('El vestuario es sagrado.', 'The locker room is sacred.'), {'chemistry': 3, 'locker': 3},
      ('Tus jugadores lo agradecen en silencio.', 'Your players quietly appreciate it.'))], once=True, cond={'minWeek': 3})

ev('charity-gala', 'community', A, ('Gala benéfica', 'Charity gala'),
   ('La fundación del {club} organiza una gala. Te piden subastar algo personal.', '{club}\'s foundation is holding a gala. They ask you to auction something personal.'),
   [O(('Subastar tu primera camiseta', 'Auction your first jersey'), ('Duele, pero vale la pena.', 'It hurts, but it is worth it.'), {'fame': 3, 'fans': 4, 'morale': 2},
      ('Recaudáis una fortuna para el hospital infantil.', 'You raise a fortune for the children\'s hospital.')),
    O(('Donar dinero (5.000)', 'Donate money (5,000)'), ('Discreto.', 'Discreet.'), {'cash': -5000, 'fans': 2},
      ('Nadie lo sabe salvo los que tienen que saberlo.', 'Nobody knows except those who should.'))])

ev('social-detox', 'mental', A, ('Demasiadas redes', 'Too much social media'),
   ('Lees comentarios hasta las tres de la mañana. Algunos duelen.', 'You read comments until three in the morning. Some hurt.'),
   [O(('Borrar las apps un mes', 'Delete the apps for a month'), ('Paz mental.', 'Peace of mind.'), {'morale': 5, 'fame': -2},
      ('Duermes mejor. Te pierdes algún meme bueno.', 'You sleep better. You miss a few good memes.')),
    O(('Contestar a los haters', 'Reply to the haters'), ('Que se enteren.', 'Let them know.'), {'fame': 3, 'morale': -3},
      ('Ganas una discusión y pierdes una noche.', 'You win an argument and lose a night.'))])

ev('tv-show', 'media', A, ('Invitación a un programa de televisión', 'TV show invitation'),
   ('Un programa de humor quiere que participes en un sketch sobre baloncesto.', 'A comedy show wants you in a basketball sketch.'),
   [U(('Aceptar', 'Accept'), ('Hace falta gracia.', 'You need to be funny.'), 0.6,
      {'fame': 6, 'style': 4}, ('Eres lo mejor del programa.', 'You steal the show.'),
      {'fame': 2, 'morale': -3}, ('El sketch no tiene gracia. Mucha gente te lo recuerda.', 'The sketch flops. Plenty of people remind you.')),
    O(('Rechazar', 'Decline'), ('Mejor no.', 'Better not.'), {},
      ('Te ahorras el riesgo. Y la diversión.', 'You skip the risk. And the fun.'))], cond={'minFame': 5})

ev('old-coach', 'family', A, ('Tu primer entrenador', 'Your first coach'),
   ('Tu entrenador del colegio se jubila. Te invitan a un homenaje el día de descanso.', 'Your school coach is retiring. You are invited to a tribute on your day off.'),
   [O(('Ir y dar un discurso', 'Go and give a speech'), ('Le debes mucho.', 'You owe him a lot.'), {'morale': 6, 'load': 3},
      ('Hablas cinco minutos y lloran cincuenta personas.', 'You speak five minutes and fifty people cry.')),
    O(('Mandarle una carta', 'Send him a letter'), ('Desde el corazón.', 'From the heart.'), {'morale': 2},
      ('Te contesta con una foto vuestra de hace quince años.', 'He replies with a photo of you two from fifteen years ago.'))])

ev('home-sick', 'family', A, ('Echas de menos tu casa', 'You miss home'),
   ('Llevas meses lejos de tu ciudad. Las videollamadas ya no bastan.', 'You have been far from home for months. Video calls are not enough.'),
   [O(('Traer a tu familia unos días', 'Bring your family over'), ('Gastar en lo que importa.', 'Spend on what matters.'), {'cash': -3000, 'morale': 8},
      ('Tu familia en la grada. Juegas con otra energía.', 'Your family in the stands. You play with different energy.')),
    O(('Aguantar', 'Tough it out'), ('Es parte del trabajo.', 'It is part of the job.'), {'morale': -3, 'confidence': 1},
      ('Se hace largo, pero te hace más fuerte.', 'It drags on, but it makes you stronger.'))], cond={'minWeek': 10})

ev('video-game-cover', 'media', A, ('Portada de un videojuego', 'Video game cover'),
   ('Un estudio pequeño quiere tu imagen para la portada de su juego de baloncesto arcade.', 'A small studio wants your image on the cover of its arcade basketball game.'),
   [O(('Aceptar por cariño', 'Accept for the love of it'), ('Pagan poco, pero es divertido.', 'They pay little, but it is fun.'), {'fame': 4, 'style': 5, 'cash': 1500},
      ('Te ves en píxeles. Es lo mejor que te ha pasado esta semana.', 'You see yourself in pixels. Best thing this week.')),
    O(('Pedir más dinero', 'Ask for more money'), ('Tu imagen vale.', 'Your image has value.'), {'cash': 4000, 'fame': 1},
      ('Pagan, pero la portada es más pequeña.', 'They pay, but the cover image is smaller.'))], cond={'minFame': 10}, once=True)

ev('bad-flight', 'travel', A, ('Vuelo cancelado', 'Cancelled flight'),
   ('Tormenta: el vuelo para jugar contra {opponent} se cancela. Opciones: autobús nocturno de nueve horas o vuelo al amanecer.', 'Storm: the flight to play {opponent} is cancelled. Options: a nine-hour night bus or a dawn flight.'),
   [O(('Autobús nocturno', 'Night bus'), ('Seguro que llegas.', 'You will definitely arrive.'), {'fatigue': 0.15, 'chemistry': 4, 'locker': 2},
      ('Karaoke en el autobús hasta las dos. Llegáis rotos y unidos.', 'Bus karaoke till two. You arrive broken and united.')),
    U(('Vuelo al amanecer', 'Dawn flight'), ('Si sale a tiempo, descansáis.', 'If it is on time, you rest.'), 0.65,
      {'fatigue': -0.05}, ('Despega puntual. Siesta en el hotel.', 'Takes off on time. Hotel nap.'),
      {'fatigue': 0.2, 'morale': -3, 'locker': -2}, ('Retrasado tres horas. Llegáis al pabellón directos.', 'Delayed three hours. You go straight to the arena.'))])

ev('lucky-socks', 'superstition', A, ('Los calcetines de la suerte', 'Lucky socks'),
   ('Ganáis siempre que llevas los mismos calcetines. Ya huelen. El utillero te mira mal.', 'You win every time you wear the same socks. They smell now. The equipment manager glares.'),
   [O(('Seguir con ellos', 'Keep wearing them'), ('La racha manda.', 'The streak rules.'), {'confidence': 2, 'chemistry': -2, 'locker': -1},
      ('Nadie se sienta a tu lado en el autobús.', 'Nobody sits next to you on the bus.')),
    O(('Lavarlos', 'Wash them'), ('Higiene ante todo.', 'Hygiene first.'), {'chemistry': 2},
      ('Calcetines limpios. Ya veremos la racha.', 'Clean socks. We will see about the streak.'))], cond={'winStreak': 3})

ev('autograph-line', 'fans', A, ('Cola de autógrafos', 'Autograph line'),
   ('Después del entrenamiento abierto hay doscientas personas esperando firmas. Tienes fisio en media hora.', 'After open practice, two hundred people are waiting for autographs. You have physio in half an hour.'),
   [O(('Firmar a todos', 'Sign for everyone'), ('Hasta el último.', 'Until the last one.'), {'fans': 5, 'fame': 2, 'load': 4},
      ('Te duele la mano. Merece la pena.', 'Your hand hurts. Worth it.')),
    O(('Firmar media hora y disculparte', 'Sign for half an hour and apologise'), ('Equilibrio.', 'Balance.'), {'fans': 2},
      ('Algunos se quedan sin firma, pero entienden.', 'Some miss out, but they understand.'))])

ev('local-food', 'community', A, ('El bar de la esquina', 'The corner bar'),
   ('El bar de al lado del pabellón quiere poner tu nombre a un bocadillo.', 'The bar next to the arena wants to name a sandwich after you.'),
   [O(('Sí, con mi receta', 'Yes, with my recipe'), ('Tortilla de patatas y pimientos.', 'Spanish omelette and peppers.'), {'fans': 3, 'style': 2},
      ('"El {number}" es el más pedido los días de partido.', '"The {number}" is the bestseller on game days.')),
    O(('Mejor no', 'Better not'), ('Prefieres pasar desapercibido.', 'You prefer to go unnoticed.'), {},
      ('El bar le pone el nombre de {teammate}. Él encantado.', 'The bar names it after {teammate}. He is thrilled.'))])

ev('heat-check', 'mental', A, ('¿Tiro forzado o pase?', 'Heat check or pass?'),
   ('Llevas tres triples seguidos en el último partido y el entrenador lo comenta en el vídeo: ¿fue valentía o egoísmo?', 'You hit three straight threes last game and the coach brings it up in film: bravery or selfishness?'),
   [O(('Defender la valentía', 'Defend the bravery'), ('Si estás caliente, tiras.', 'If you are hot, you shoot.'), {'confidence': 2, 'trust': -2},
      ('El entrenador sonríe a medias. A medias.', 'The coach half-smiles. Half.')),
    O(('Aceptar la crítica', 'Accept the critique'), ('El equipo primero.', 'Team first.'), {'trust': 3, 'chemistry': 2},
      ('Pasas el balón en la siguiente. Es canasta fácil para {teammate}.', 'You pass next time. Easy bucket for {teammate}.'))], cond={'mode': 'player', 'lastWon': True})

ev('ankle-tweak', 'health', A, ('Torcedura en el entrenamiento', 'Ankle tweak in practice'),
   ('Pisas a un compañero y el tobillo se dobla. No parece grave, pero duele.', 'You land on a teammate and roll your ankle. Not serious, but it hurts.'),
   [O(('Parar dos días', 'Rest two days'), ('Prudencia.', 'Caution.'), {'load': -10, 'form': -1},
      ('El tobillo se desinflama. La forma, también.', 'The swelling goes down. So does your form.')),
    U(('Vendarlo y seguir', 'Tape it and keep going'), ('Mentalidad de acero.', 'Steel mentality.'), 0.7,
      {'trust': 3}, ('Ni se nota. El entrenador lo valora.', 'Barely noticeable. The coach values it.'),
      {'load': 12, 'attr': {'velocidad': -1}}, ('Empeora. Pierdes algo de chispa.', 'It gets worse. You lose a step.'))], cond={'mode': 'player'})

ev('mascot-prank', 'fun', A, ('La mascota del club', 'The club mascot'),
   ('La mascota del {club} te propone una broma para el descanso: un mate con trampolín vestido de mascota.', '{club}\'s mascot proposes a halftime prank: a trampoline dunk in the mascot suit.'),
   [U(('Hacerlo', 'Do it'), ('Puede ser épico.', 'Could be epic.'), 0.7,
      {'fans': 6, 'fame': 3, 'style': 3}, ('El pabellón no da crédito. Nadie sabe quién era. Todos lo saben.', 'The arena cannot believe it. Nobody knows who it was. Everybody knows.'),
      {'load': 8, 'trust': -3}, ('Caes mal del trampolín. Nada grave, salvo tu orgullo.', 'You land badly off the trampoline. Nothing serious, except your pride.')),
    O(('Mejor solo animar', 'Just cheer'), ('Tu cuerpo es tu herramienta.', 'Your body is your tool.'), {'fans': 1},
      ('Le chocas la mano a la mascota. Suficiente.', 'You high-five the mascot. Enough.'))])

ev('jersey-retire', 'milestone', A, ('Un veterano se retira', 'A veteran retires'),
   ('{star} anuncia que esta es su última temporada. El club prepara un homenaje y te pide unas palabras.', '{star} announces this is his final season. The club plans a tribute and asks you to say a few words.'),
   [O(('Discurso emotivo', 'Emotional speech'), ('Desde el corazón.', 'From the heart.'), {'chemistry': 5, 'locker': 4, 'fans': 3},
      ('Os abrazáis en el centro de la pista. No queda nadie sin aplaudir.', 'You embrace at centre court. Everyone applauds.')),
    O(('Algo breve y con humor', 'Something short and funny'), ('Como era él.', 'Like he was.'), {'fans': 2, 'morale': 3},
      ('Le recuerdas aquel tiro libre que se le cayó de las manos. Él se ríe el primero.', 'You recall the free throw he dropped. He laughs first.'))],
   cond={'lateSeason': True}, once=True)

ev('weather-gym', 'travel', A, ('El pabellón se queda sin calefacción', 'The arena loses its heating'),
   ('Hace un frío terrible en el pabellón el día del partido contra {opponent}. Os ofrecen calentar en el vestuario.', 'It is freezing in the arena on game day against {opponent}. You can warm up in the locker room.'),
   [O(('Calentar el doble', 'Warm up twice as long'), ('Que no se enfríen los músculos.', 'Keep the muscles warm.'), {'load': 4, 'form': 1},
      ('Salís como motos. Ellos tiritan.', 'You come out flying. They are shivering.')),
    O(('Bromear con el frío', 'Joke about the cold'), ('Ambiente.', 'Atmosphere.'), {'chemistry': 3, 'locker': 2},
      ('Gorros de lana en el banquillo. La foto del año.', 'Woolly hats on the bench. Photo of the year.'))])

ev('book-club', 'life', A, ('El club de lectura del vestuario', 'The locker room book club'),
   ('{teammate} ha montado un club de lectura en los viajes. El primer libro tiene 900 páginas.', '{teammate} started a book club for road trips. The first book has 900 pages.'),
   [O(('Apuntarte', 'Join'), ('Cultura y química.', 'Culture and chemistry.'), {'chemistry': 4, 'attr': {'lectura': 1}},
      ('Llegas a la página 200. Las conversaciones valen la pena.', 'You reach page 200. The conversations are worth it.')),
    O(('Prefieres videojuegos', 'You prefer video games'), ('Cada uno a lo suyo.', 'To each their own.'), {'morale': 2},
      ('Te conviertes en el campeón del vestuario a tu juego favorito.', 'You become locker room champion at your favourite game.'))])

ev('fan-art', 'fans', A, ('Un mural con tu cara', 'A mural of your face'),
   ('Un artista callejero ha pintado un mural tuyo en tu barrio. La alcaldía quiere borrarlo porque no tiene permiso.', 'A street artist painted a mural of you in your neighbourhood. City hall wants it removed for lack of a permit.'),
   [O(('Pagar el permiso y conservarlo', 'Pay the permit and keep it'), ('Es arte.', 'It is art.'), {'cash': -2000, 'fans': 5, 'fame': 2},
      ('El mural se convierte en lugar de peregrinación.', 'The mural becomes a pilgrimage site.')),
    O(('Dejar que decidan', 'Let them decide'), ('No es tu pelea.', 'Not your fight.'), {'fans': -1},
      ('Lo borran. Una foto en tu móvil es lo que queda.', 'They paint over it. A photo on your phone is what remains.'))], cond={'minFame': 12}, once=True)

# ======================= MÁS ENTRENADOR =======================
ev('zone-debate', 'tactics', C, ('¿Defensa zonal?', 'Zone defence?'),
   ('{opponent} tira fatal desde fuera. Tu asistente propone una 2-3 toda la noche. Tus jugadores prefieren individual.', '{opponent} shoots badly from outside. Your assistant proposes a 2-3 all night. Your players prefer man-to-man.'),
   [O(('Zona todo el partido', 'Zone all game'), ('Que tiren de lejos.', 'Make them shoot from deep.'), {'board': 2, 'locker': -2},
      ('Los jugadores se aburren atrás, pero el plan es sólido.', 'The players get bored at the back, but the plan is solid.')),
    O(('Individual, como siempre', 'Man-to-man, as always'), ('Identidad.', 'Identity.'), {'locker': 3},
      ('Defendéis con orgullo. A ver si basta.', 'You defend with pride. We will see if it is enough.'))])

ev('pace-debate', 'tactics', C, ('¿Correr o jugar lento?', 'Run or slow it down?'),
   ('Tu plantilla es joven y atlética, pero pierde muchos balones cuando corre.', 'Your roster is young and athletic, but turns it over a lot when running.'),
   [O(('Correr y que se equivoquen', 'Run and let them err'), ('Divertido y arriesgado.', 'Fun and risky.'), {'locker': 4, 'fame': 2},
      ('La grada disfruta. Las pérdidas, también.', 'The crowd loves it. The turnovers too.')),
    O(('Juego posicional', 'Half-court sets'), ('Control.', 'Control.'), {'board': 3, 'locker': -2},
      ('Partidos feos. Victorias a veces.', 'Ugly games. Wins sometimes.'))])

ev('captain-choice', 'locker', C, ('¿Quién es el capitán?', 'Who is captain?'),
   ('Toca elegir capitán. {star} es el mejor; {teammate}, el más querido.', 'Time to pick a captain. {star} is the best; {teammate}, the most liked.'),
   [O(('{star}', '{star}'), ('Liderazgo con el ejemplo.', 'Lead by example.'), {'morale': 2, 'locker': -1},
      ('{star} acepta el brazalete con una sonrisa ladeada.', '{star} takes the armband with a sideways grin.')),
    O(('{teammate}', '{teammate}'), ('El pegamento del vestuario.', 'The locker room glue.'), {'locker': 5},
      ('El vestuario aplaude. {star} también, aunque algo más flojo.', 'The locker room applauds. {star} too, a bit softer.'))], once=True, cond={'maxWeek': 6})

ev('media-day', 'press', C, ('Día de medios', 'Media day'),
   ('La liga organiza un día de medios. Los periodistas preguntan por tus objetivos.', 'The league runs a media day. Reporters ask about your goals.'),
   [O(('Hablar de título', 'Talk about the title'), ('Ambición.', 'Ambition.'), {'fame': 3, 'board': 2, 'locker': -1},
      ('Titulares grandes. Expectativas, más.', 'Big headlines. Bigger expectations.')),
    O(('Partido a partido', 'One game at a time'), ('Prudencia.', 'Prudence.'), {'locker': 2},
      ('Nadie escribe nada interesante. Perfecto.', 'Nobody writes anything interesting. Perfect.'))], cond={'maxWeek': 4})

ev('veteran-bench', 'locker', C, ('El veterano no acepta el banquillo', 'The veteran rejects the bench'),
   ('{teammate}, uno de los veteranos, no acepta salir desde el banquillo y lo dice delante de todos.', '{teammate}, one of the veterans, refuses to come off the bench and says so in front of everyone.'),
   [O(('Sanción ejemplar', 'Make an example'), ('Autoridad.', 'Authority.'), {'board': 3, 'locker': -4},
      ('Nadie volverá a hacerlo. Nadie lo olvidará.', 'Nobody will do it again. Nobody will forget.')),
    O(('Hablar en privado', 'Talk privately'), ('Respeto.', 'Respect.'), {'locker': 3},
      ('Se disculpa con el grupo al día siguiente.', 'He apologises to the group the next day.')),
    O(('Devolverle al quinteto', 'Restore him to the starting five'), ('Ceder para sumar.', 'Give a little to gain a lot.'), {'locker': 1, 'board': -3, 'morale': -2},
      ('Vuelve a salir de inicio. Tu autoridad, un poco menos.', 'He starts again. Your authority, a little less.'))])

ev('sponsor-coach', 'money', C, ('Patrocinio para el entrenador', 'Coach sponsorship'),
   ('Una marca de relojes quiere que lleves su reloj en las ruedas de prensa.', 'A watch brand wants you to wear its watch at press conferences.'),
   [O(('Aceptar', 'Accept'), ('Dinero fácil.', 'Easy money.'), {'cash': 8000, 'fame': 2, 'style': 4},
      ('Te ves muy elegante mirando la hora en cada respuesta.', 'You look very elegant checking the time at every answer.')),
    O(('Rechazar', 'Decline'), ('No vendes tu imagen.', 'You do not sell your image.'), {'board': 1},
      ('El presidente valora tu discreción.', 'The president values your discretion.'))], cond={'minFame': 5}, once=True)

ev('playbook-leak', 'staff', C, ('Se filtran tus jugadas', 'Your plays leak'),
   ('{opponent} parece saberse tus jugadas de memoria. Sospechas de un exjugador que fichó por ellos.', '{opponent} seems to know your plays by heart. You suspect a former player who joined them.'),
   [O(('Rehacer el libro de jugadas', 'Rewrite the playbook'), ('Trabajo extra para todos.', 'Extra work for everyone.'), {'locker': -3, 'board': 2, 'xp': 4},
      ('Noches en vela con la pizarra. Merecerá la pena.', 'Sleepless nights with the whiteboard. It will pay off.')),
    O(('Usar las mismas con trampa', 'Use the same with a twist'), ('Que crean que saben.', 'Let them think they know.'), {'fame': 2, 'locker': 2},
      ('La jugada señuelo funciona a la perfección.', 'The decoy play works perfectly.'))])

ev('mvp-locker', 'locker', C, ('Celos por los minutos', 'Jealousy over minutes'),
   ('Dos jugadores de la rotación discuten por los minutos. El ambiente se tensa.', 'Two rotation players argue over minutes. Tension builds.'),
   [O(('Rotación fija y clara', 'Fixed, clear rotation'), ('Que cada uno sepa su papel.', 'Everyone knows their role.'), {'locker': 3, 'board': 1},
      ('Cada uno sabe cuándo juega. Menos dramas.', 'Everyone knows when they play. Less drama.')),
    O(('Que se lo ganen cada día', 'Make them earn it daily'), ('Competencia sana.', 'Healthy competition.'), {'locker': -2, 'board': 3},
      ('Los entrenamientos parecen finales.', 'Practices feel like finals.'))])

ev('injury-crisis', 'health', C, ('Plaga de lesiones', 'Injury crisis'),
   ('Tres jugadores en la enfermería. Puedes subir chavales del filial o pedir un fichaje temporal.', 'Three players in the infirmary. You can call up academy kids or ask for a temporary signing.'),
   [O(('Subir chavales', 'Call up the kids'), ('Oportunidad para la cantera.', 'Chance for the academy.'), {'locker': 3, 'fame': 1},
      ('Los chavales juegan sin miedo. Alguno se queda.', 'The kids play fearlessly. One of them sticks.')),
    O(('Pedir un fichaje', 'Request a signing'), ('Experiencia ya.', 'Experience now.'), {'board': -3, 'locker': 1},
      ('Llega un veterano libre. Sabe lo que hace.', 'A free-agent veteran arrives. He knows what he is doing.'))], cond={'minWeek': 8})

ev('locker-music', 'fun', C, ('La música del vestuario', 'Locker room music'),
   ('Los veteranos quieren silencio antes de los partidos; los jóvenes, música a todo volumen.', 'Veterans want silence before games; youngsters want loud music.'),
   [O(('Música', 'Music'), ('Energía.', 'Energy.'), {'locker': 2},
      ('Los jóvenes bailan. Los veteranos se ponen tapones.', 'The kids dance. The veterans put in earplugs.')),
    O(('Silencio', 'Silence'), ('Concentración.', 'Focus.'), {'locker': 1, 'board': 1},
      ('Cada uno con sus cascos. Paz.', 'Everyone with their headphones. Peace.')),
    O(('Que elija el último que haya metido un triple ganador', 'Last game-winner picks'), ('Tradición nueva.', 'A new tradition.'), {'locker': 4},
      ('Nace una costumbre que durará años.', 'A custom is born that will last years.'))], once=True)

# ======================= MÁS JUGADOR =======================
ev('buyout-clause', 'contract', P, ('La cláusula de la liga americana', 'The NA-league buyout clause'),
   ('Tu agente propone incluir una cláusula de salida a la Liga Boreal en tu próximo contrato.', 'Your agent proposes adding a Liga Boreal exit clause to your next contract.'),
   [O(('Incluirla', 'Include it'), ('La puerta abierta.', 'The door stays open.'), {'salary': 0.95, 'fame': 2, 'flag': 'na-clause'},
      ('Cobras un poco menos, pero puedes soñar.', 'You earn a bit less, but you can dream.')),
    O(('No incluirla', 'Leave it out'), ('Compromiso total.', 'Full commitment.'), {'trust': 4, 'salary': 1.05},
      ('El club te lo agradece con un pequeño aumento.', 'The club thanks you with a small raise.'))], cond={'region': 'EU', 'minOvr': 60, 'minWeek': 10}, once=True)

ev('vet-minimum', 'contract', P, ('El último contrato', 'The last contract'),
   ('A tu edad, los equipos ofrecen mínimos. Un aspirante al título te quiere como veterano de banquillo.', 'At your age, teams offer minimums. A title contender wants you as a bench veteran.'),
   [O(('Ir a por el anillo', 'Chase the ring'), ('Menos minutos, más opciones.', 'Fewer minutes, better odds.'), {'salary': 0.7, 'fame': 2, 'morale': 4},
      ('Firmas por el mínimo. Te gusta cómo suena "campeón".', 'You sign for the minimum. You like the sound of "champion".')),
    O(('Quedarte donde eres titular', 'Stay where you start'), ('Seguir jugando.', 'Keep playing.'), {'trust': 5, 'fans': 3},
      ('Sigues siendo importante. Y lo sabes.', 'You are still important. And you know it.'))], cond={'minAge': 31}, once=True)

ev('stat-padding', 'mental', P, ('Inflar números', 'Stat padding'),
   ('Ganáis de 25 y quedan tres minutos. Te faltan dos asistencias para tu primer triple-doble.', 'You are up 25 with three minutes left. You are two assists from your first triple-double.'),
   [O(('Ir a por él', 'Go for it'), ('Un número para la historia.', 'A number for history.'), {'fame': 3, 'chemistry': -2},
      ('Lo consigues. Algún rival no te da la mano al final.', 'You get it. A rival skips the handshake.')),
    O(('Sentarte', 'Sit down'), ('Deportividad.', 'Sportsmanship.'), {'chemistry': 3, 'trust': 2},
      ('El entrenador te da una palmada al llegar al banquillo.', 'The coach pats you on the way to the bench.'))], cond={'minOvr': 60, 'lastWon': True})

ev('new-move', 'training', P, ('Un movimiento nuevo', 'A new move'),
   ('Has visto un movimiento en un vídeo antiguo y quieres incorporarlo: un paso atrás imposible.', 'You saw a move in an old video and want to add it: an impossible step-back.'),
   [U(('Usarlo ya en partido', 'Use it in a game now'), ('O sale o haces el ridículo.', 'It works or you look silly.'), 0.5,
      {'attr': {'manejo': 1, 'tiroTriple': 1}, 'fame': 3, 'confidence': 2}, ('Lo clavas delante de {rival}. El vídeo vuela.', 'You nail it in front of {rival}. The clip flies.'),
      {'confidence': -2, 'trust': -2}, ('Pasos. El árbitro, la grada y tu entrenador te miran.', 'Travelling. The ref, the crowd and your coach stare.')),
    O(('Pulirlo en el entrenamiento', 'Polish it in practice'), ('Paciencia.', 'Patience.'), {'attr': {'manejo': 1}, 'load': 3},
      ('Dentro de un mes será tuyo.', 'In a month it will be yours.'))])

ev('shoe-malfunction', 'sponsor', P, ('Se rompe tu zapatilla', 'Your shoe breaks'),
   ('En pleno partido se te abre la suela. Tu patrocinador entra en pánico; otra marca te manda un mensaje.', 'Mid-game your sole splits. Your sponsor panics; another brand messages you.'),
   [O(('Seguir con tu marca', 'Stick with your brand'), ('Lealtad.', 'Loyalty.'), {'cash': 3000, 'fame': 1},
      ('Te pagan un extra por las molestias y por no decir nada.', 'They pay you extra for the trouble and your silence.')),
    O(('Escuchar a la competencia', 'Listen to the competition'), ('Oportunidad.', 'Opportunity.'), {'sponsor': 'aerolift', 'fame': 3, 'trust': -1},
      ('Cambias de marca. La foto de la zapatilla rota la ven millones.', 'You switch brands. Millions see the broken shoe photo.'))], cond={'hasSponsor': True}, once=True)

ev('big-game-nerves', 'mental', P, ('Nervios antes del gran partido', 'Big-game nerves'),
   ('Mañana jugáis contra {opponent}, el gran rival. No puedes dormir.', 'Tomorrow you face {opponent}, the big rival. You cannot sleep.'),
   [O(('Llamar a {teammate}', 'Call {teammate}'), ('Hablar ayuda.', 'Talking helps.'), {'chemistry': 3, 'morale': 2},
      ('Os pasáis una hora hablando de todo menos de baloncesto.', 'You spend an hour talking about everything except basketball.')),
    O(('Ver tus mejores jugadas', 'Watch your best highlights'), ('Confianza.', 'Confidence.'), {'confidence': 2, 'fatigue': 0.05},
      ('Te duermes a las tres, pero con una sonrisa.', 'You fall asleep at three, but smiling.'))])

# ======================= MÁS CUALQUIER MODO =======================
ev('fan-wedding', 'fans', A, ('Pedida de mano en la grada', 'Proposal in the stands'),
   ('Un aficionado te pide ayuda para pedir matrimonio a su pareja en el descanso del próximo partido.', 'A fan asks for your help proposing to his partner at halftime of the next game.'),
   [O(('Ayudarle', 'Help him'), ('El anillo en una pelota firmada.', 'The ring inside a signed ball.'), {'fans': 5, 'fame': 2},
      ('Dice que sí. El pabellón entero se levanta.', 'She says yes. The whole arena stands up.')),
    O(('Desearle suerte', 'Wish him luck'), ('Tú, a lo tuyo.', 'You focus on your job.'), {},
      ('Dice que sí igualmente. Menos mal.', 'She says yes anyway. Phew.'))])

ev('rookie-card', 'fun', A, ('Tu cromo de novato', 'Your rookie card'),
   ('Sale la colección de cromos de la liga. Tu foto es terrible: estás pestañeando.', 'The league card set comes out. Your photo is terrible: you are blinking.'),
   [O(('Reírte y firmarlos', 'Laugh and sign them'), ('Ya es de culto.', 'It is already cult.'), {'fans': 3, 'style': 3},
      ('Tu cromo pestañeando se vuelve el más buscado.', 'Your blinking card becomes the most wanted.')),
    O(('Pedir que la cambien', 'Ask for a new photo'), ('Tienes una imagen.', 'You have an image.'), {'style': 1},
      ('La cambian en la segunda edición. La primera vale una fortuna.', 'They change it in the second print. The first is worth a fortune.'))], once=True)

ev('rivalry-derby', 'rivalry', A, ('Semana de derbi', 'Derby week'),
   ('Se acerca el derbi contra {opponent}. La ciudad no habla de otra cosa.', 'Derby against {opponent} is coming. The city talks of nothing else.'),
   [O(('Echar leña al fuego', 'Pour fuel on the fire'), ('Que se caliente.', 'Turn up the heat.'), {'fame': 3, 'fans': 3, 'morale': -1},
      ('Las entradas se agotan en minutos. Tú serás el blanco de todos.', 'Tickets sell out in minutes. You will be everyone\'s target.')),
    O(('Rebajar la tensión', 'Lower the temperature'), ('Respeto al rival.', 'Respect the rival.'), {'morale': 2},
      ('La prensa te llama aburrido. Tu cabeza, tranquila.', 'The press calls you boring. Your head, calm.'))])

# ======================= FAMILIA Y DINASTÍAS =======================
ev('meet-someone', 'family', P, ('Alguien especial', 'Someone special'),
   ('En la gala benéfica del {club} conoces a alguien que no tiene ni idea de baloncesto. Y eso te encanta.', 'At {club}\'s charity gala you meet someone who knows nothing about basketball. And you love that.'),
   [U(('Pedirle una cita', 'Ask them out'), ('Puede salir bien… o no.', 'It may work out… or not.'), 0.65,
      {'familyStatus': 'dating', 'morale': 6, 'flag': 'dating'}, ('Primera cita en un restaurante pequeño. Hablas de todo menos de baloncesto.', 'First date at a small restaurant. You talk about everything but basketball.'),
      {'morale': -2}, ('Te da su número… y nunca contesta. Al menos lo intentaste.', 'They give you their number… and never reply. At least you tried.')),
    O(('Centrarte en la carrera', 'Focus on your career'), ('Ahora no es el momento.', 'Not the time now.'), {'confidence': 1},
      ('Te vas pronto a casa. Mañana hay entrenamiento.', 'You head home early. Practice tomorrow.'))],
   cond={'familyStatus': ['single'], 'minWeek': 6}, weight=4, cooldown=30)

ev('propose', 'family', P, ('¿Es el momento?', 'Is it time?'),
   ('Llevas tiempo con {partner}. Tus compañeros bromean con que ya te toca. Tú llevas semanas mirando anillos.', 'You have been with {partner} for a while. Teammates joke it is about time. You have been looking at rings for weeks.'),
   [U(('Pedirle matrimonio en el centro de la pista', 'Propose at centre court'), ('Delante de todo el pabellón.', 'In front of the whole arena.'), 0.75,
      {'familyStatus': 'married', 'partnerHappiness': 20, 'fans': 6, 'fame': 3, 'unflag': 'dating'}, ('¡Dice que sí! El pabellón entero estalla. El vídeo da la vuelta al mundo.', 'They say yes! The whole arena erupts. The video goes around the world.'),
      {'partnerHappiness': -15, 'morale': -6}, ('Se queda en blanco. "Aquí no". Hablaréis en casa.', 'They freeze. "Not here." You will talk at home.')),
    O(('Una cena tranquila, solo vosotros', 'A quiet dinner, just you two'), ('Íntimo.', 'Intimate.'), {'familyStatus': 'married', 'partnerHappiness': 15, 'morale': 5, 'unflag': 'dating'},
      ('Dice que sí entre lágrimas. Nadie más lo sabe… hasta mañana.', 'They say yes in tears. Nobody else knows… until tomorrow.')),
    O(('Esperar un poco más', 'Wait a bit longer'), ('No hay prisa.', 'No rush.'), {'partnerHappiness': -4},
      ('Guardas el anillo en un cajón.', 'You put the ring in a drawer.'))],
   cond={'familyStatus': ['dating', 'partner'], 'flags': ['dating'], 'flagDelay': 14}, weight=6)

ev('baby', 'family', P, ('Vais a ser padres', 'You are going to be parents'),
   ('{partner} te enseña la ecografía antes del entrenamiento. Nacerá a mitad de temporada.', '{partner} shows you the scan before practice. The baby will arrive mid-season.'),
   [O(('Pedir dos semanas de permiso', 'Ask for two weeks of leave'), ('La familia primero.', 'Family first.'), {'baby': True, 'partnerHappiness': 15, 'trust': -4, 'morale': 6},
      ('Estás en el parto. Te pierdes dos partidos y no te arrepientes ni un segundo.', 'You are there for the birth. You miss two games and do not regret a second.')),
    O(('Seguir jugando', 'Keep playing'), ('El equipo te necesita.', 'The team needs you.'), {'baby': True, 'partnerHappiness': -10, 'trust': 3},
      ('Llegas al hospital con la camiseta de juego. {partner} no dice nada. Lo dice todo.', 'You arrive at the hospital in your game jersey. {partner} says nothing. Says everything.'))],
   cond={'familyStatus': ['partner', 'married'], 'minWeek': 8}, weight=3, cooldown=40)

ev('partner-job', 'family', P, ('Una oferta para {partner}', 'An offer for {partner}'),
   ('A {partner} le ofrecen el trabajo de su vida… en otra ciudad. Te mira esperando una respuesta.', '{partner} is offered a dream job… in another city. They look at you, waiting.'),
   [O(('Apoyarle aunque estéis lejos', 'Support them even far apart'), ('Distancia y videollamadas.', 'Distance and video calls.'), {'partnerHappiness': 15, 'morale': -3, 'flag': 'long-distance'},
      ('Os veréis los días libres. Cuesta, pero es lo justo.', 'You will meet on days off. It is hard, but fair.')),
    O(('Pedirle que se quede', 'Ask them to stay'), ('Juntos aquí.', 'Together here.'), {'partnerHappiness': -15, 'morale': 2},
      ('Se queda. Lo nota cada vez que suena su antiguo móvil del trabajo.', 'They stay. They feel it every time the old work phone rings.'))],
   cond={'familyStatus': ['partner', 'married'], 'minWeek': 10}, once=True)

ev('anniversary', 'family', P, ('Aniversario y derbi el mismo día', 'Anniversary and derby on the same day'),
   ('Es vuestro aniversario y jugáis contra {opponent}. {partner} había reservado mesa.', 'It is your anniversary and you play {opponent}. {partner} had booked a table.'),
   [O(('Cena después del partido', 'Dinner after the game'), ('Llegarás tarde, pero llegarás.', 'You will be late, but you will be there.'), {'partnerHappiness': 8, 'fatigue': 0.1},
      ('Cenáis a medianoche con el pelo aún mojado. Perfecto.', 'You eat at midnight, hair still wet. Perfect.')),
    O(('Posponerlo', 'Postpone it'), ('Ya lo celebraréis.', 'You will celebrate later.'), {'partnerHappiness': -12},
      ('"Siempre hay un partido", dice. No es una pregunta.', '"There is always a game," they say. It is not a question.'))],
   cond={'familyStatus': ['partner', 'married']}, weight=3, cooldown=40)

ev('family-crisis', 'family', P, ('Crisis en casa', 'Trouble at home'),
   ('{partner} siente que vive con una agenda, no con una persona. La conversación se alarga hasta las tantas.', '{partner} feels they live with a schedule, not a person. The talk runs late into the night.'),
   [O(('Terapia de pareja (2.000)', 'Couples therapy (2,000)'), ('Pedir ayuda.', 'Ask for help.'), {'cash': -2000, 'partnerHappiness': 22},
      ('Aprendéis a hablar sin gritar. Funciona.', 'You learn to talk without shouting. It works.')),
    U(('Prometer cambiar', 'Promise to change'), ('Palabras… y hechos.', 'Words… and deeds.'), 0.5,
      {'partnerHappiness': 15}, ('Cumples. Las cosas mejoran.', 'You keep your word. Things improve.'),
      {'familyStatus': 'single', 'morale': -10}, ('No es suficiente. {partner} se marcha.', 'It is not enough. {partner} leaves.'))],
   cond={'familyStatus': ['partner', 'married'], 'partnerHappyBelow': 30}, story=True, repeat=True, cooldown=12)

ev('kid-first-game', 'family', P, ('Tu peque en la grada', 'Your kid in the stands'),
   ('{child} viene por primera vez a verte jugar contra {opponent}. Lleva una camiseta con tu dorsal que le queda enorme.', '{child} comes to watch you play {opponent} for the first time, wearing a jersey with your number that is far too big.'),
   [O(('Dedicarle la primera canasta', 'Dedicate your first basket'), ('Un gesto para siempre.', 'A gesture forever.'), {'childBond': 12, 'fans': 3, 'morale': 4},
      ('Señalas a la grada. {child} se lo cuenta a todo el colegio durante un mes.', 'You point to the stands. {child} tells the whole school for a month.')),
    O(('Concentrarte en el partido', 'Focus on the game'), ('Hoy toca ganar.', 'Today is about winning.'), {'form': 1, 'childBond': 2},
      ('Juegas serio. Al acabar, te abraza igual.', 'You play serious. Afterwards, the hug comes anyway.'))],
   cond={'hasChildren': True, 'minChildAge': 4}, once=True)

ev('kid-basketball', 'family', P, ('{child} quiere jugar al baloncesto', '{child} wants to play basketball'),
   ('{child} ha pedido apuntarse al equipo del colegio. Te pregunta si le enseñas a tirar como tú.', '{child} asked to join the school team. They ask if you will teach them to shoot like you.'),
   [O(('Entrenarle tú', 'Coach them yourself'), ('Tardes de canasta en el patio.', 'Afternoons at the backyard hoop.'), {'childBond': 12, 'load': 4, 'flag': 'heir-trained'},
      ('Le enseñas la rutina de tiro libre. Tiene muñeca. Mucha.', 'You teach your free-throw routine. They have touch. A lot.')),
    O(('Que elija su camino', 'Let them choose their path'), ('Sin presión.', 'No pressure.'), {'childBond': 6},
      ('Prueba el baloncesto y la natación. Ya verá.', 'They try basketball and swimming. They will see.'))],
   cond={'hasChildren': True, 'minChildAge': 7}, once=True)

ev('school-play', 'family', P, ('La función del colegio', 'The school play'),
   ('{child} es el árbol número tres en la función del colegio. Coincide con el entrenamiento de tiro.', '{child} is tree number three in the school play. It clashes with shooting practice.'),
   [O(('Ir a la función', 'Go to the play'), ('Primera fila.', 'Front row.'), {'childBond': 10, 'trust': -3},
      ('El árbol número tres saluda desde el escenario. Tú saludas más.', 'Tree number three waves from the stage. You wave harder.')),
    O(('Ir al entrenamiento', 'Go to practice'), ('El deber.', 'Duty.'), {'childBond': -6, 'attr': {'tiroMedia': 1}},
      ('Te mandan el vídeo. Lo ves cinco veces en el vestuario.', 'They send you the video. You watch it five times in the locker room.'))],
   cond={'hasChildren': True, 'minChildAge': 5}, weight=3, cooldown=40)

ev('family-holiday', 'family', P, ('Vacaciones en familia', 'Family holiday'),
   ('Se acaba la temporada. {partner} propone un viaje largo, sin balones ni pabellones.', 'The season is ending. {partner} suggests a long trip, no balls, no arenas.'),
   [O(('Viaje de ensueño (6.000)', 'Dream trip (6,000)'), ('Desconexión total.', 'Total disconnection.'), {'cash': -6000, 'partnerHappiness': 15, 'childBond': 8, 'morale': 5, 'load': -15},
      ('Dos semanas sin mirar el móvil. Vuelves con otra cara.', 'Two weeks without checking your phone. You come back a new person.')),
    O(('Escapada corta', 'Short getaway'), ('Algo es algo.', 'Something is something.'), {'cash': -1500, 'partnerHappiness': 6},
      ('Un fin de semana en la costa. Suficiente para recargar.', 'A weekend on the coast. Enough to recharge.'))],
   cond={'familyStatus': ['partner', 'married'], 'lateSeason': True}, once=True)

ev('farewell-question', 'milestone', P, ('¿La última temporada?', 'The final season?'),
   ('Tienes {age} años. Las rodillas te avisan cada mañana. ¿Anuncias que esta será tu última temporada?', 'You are {age}. Your knees warn you every morning. Do you announce this will be your last season?'),
   [O(('Anunciar la gira de despedida', 'Announce a farewell tour'), ('Cada pabellón te despedirá.', 'Every arena will say goodbye.'), {'flag': 'farewell', 'fans': 8, 'fame': 4, 'morale': 4},
      ('Lo anuncias en rueda de prensa. Esa noche, ovación en pie.', 'You announce it at a press conference. That night, a standing ovation.')),
    O(('Seguir compitiendo', 'Keep competing'), ('Aún te queda baloncesto.', 'There is basketball left in you.'), {'confidence': 1},
      ('"Mientras me diviertan, sigo." El vestuario sonríe.', '"While it is fun, I keep going." The locker room smiles.'))],
   cond={'minAge': 33, 'maxWeek': 2, 'notFlags': ['farewell']}, story=True, repeat=True, cooldown=30)

ev('legend-shadow', 'legacy', P, ('La sombra de {legend}', 'In {legend}\'s shadow'),
   ('Los periodistas no paran de compararte con {legend}. "¿Llegarás a su nivel?"', 'Reporters keep comparing you to {legend}. "Will you reach their level?"'),
   [O(('Abrazar la herencia', 'Embrace the legacy'), ('Es tu familia.', 'It is your family.'), {'fame': 4, 'confidence': -1, 'fans': 3},
      ('"Si llego a la mitad, seré feliz." Titular de portada.', '"If I get halfway, I will be happy." Front-page headline.')),
    O(('Reivindicar tu camino', 'Claim your own path'), ('No eres una copia.', 'You are not a copy.'), {'confidence': 2, 'fame': 1},
      ('"Yo soy yo." La frase acaba en camisetas.', '"I am me." The line ends up on T-shirts.'))],
   cond={'minGeneration': 2, 'minWeek': 3}, once=True)

ev('legend-stands', 'legacy', P, ('{legend} en la grada', '{legend} in the stands'),
   ('{legend} ha venido a verte. El pabellón le dedica una ovación antes del salto inicial.', '{legend} came to watch you. The arena gives them an ovation before tip-off.'),
   [O(('Saludar a {legend}', 'Wave to {legend}'), ('Orgullo familiar.', 'Family pride.'), {'morale': 6, 'fans': 3},
      ('Os señaláis mutuamente. La foto sale en todos los periódicos.', 'You point at each other. The photo is in every paper.')),
    O(('Pedirle consejo en el descanso', 'Ask for advice at halftime'), ('Sabiduría.', 'Wisdom.'), {'attr': {'lectura': 1}, 'confidence': 1},
      ('Te dice una sola frase. Es justo la que necesitabas.', 'They tell you one sentence. Exactly the one you needed.'))],
   cond={'minGeneration': 2, 'minWeek': 8}, once=True)

# ======================= MODO ÉPOCAS: MOMENTOS DE LA HISTORIA =======================
# Hechos simplificados y verificables del baloncesto; los clubes y personas del juego siguen siendo ficticios.
ev('era-outdoor-rain', 'era', A, ('Final al aire libre', 'Outdoor final'),
   ('Como en los primeros torneos olímpicos, se juega en una pista de tierra al aire libre. Empieza a llover y el balón de cuero pesa el doble.',
    'Like the early Olympic tournaments, the game is on an outdoor dirt court. It starts to rain and the leather ball weighs twice as much.'),
   [O(('Pases cortos y paciencia', 'Short passes and patience'), ('Nada de botar en el barro.', 'No dribbling in the mud.'), {'attr': {'pase': 1}, 'morale': 2},
      ('Ganáis con un marcador de otra época. Nadie se queja.', 'You win with a score from another age. Nobody complains.')),
    U(('Tirar de lejos igualmente', 'Shoot from deep anyway'), ('Si entra, leyenda.', 'If it drops, legend.'), 0.35, {'fame': 5, 'confidence': 2}, ('Entra. La grada, empapada, enloquece.', 'It goes in. The soaked crowd goes wild.'), {'morale': -2}, ('El balón resbala. Se queda corto.', 'The ball slips. It falls short.'))],
   cond={'era': True, 'maxYear': 1948}, once=True)
ev('era-one-hand', 'era', A, ('El tiro a una mano', 'The one-handed shot'),
   ('Todo el mundo tira con las dos manos desde el pecho. Has visto a un universitario tirar con una sola mano y en carrera. Tu entrenador lo llama "un capricho".',
    'Everyone shoots two-handed from the chest. You saw a college kid shoot one-handed on the move. Your coach calls it "a fad".'),
   [O(('Aprenderlo a escondidas', 'Learn it in secret'), ('El futuro llega antes a quien lo practica.', 'The future comes first to whoever practises it.'), {'attr': {'tiroMedia': 2}, 'xp': 4},
      ('Al mes lo usas en un partido. El entrenador calla.', 'A month later you use it in a game. The coach says nothing.')),
    O(('Respetar la escuela clásica', 'Respect the classic school'), ('Así se ha hecho siempre.', 'This is how it has always been done.'), {'trust': 3, 'attr': {'tiroLibre': 1}},
      ('El entrenador te pone de ejemplo en el vestuario.', 'The coach holds you up as an example.'))],
   cond={'era': True, 'minYear': 1932, 'maxYear': 1950}, once=True)
ev('era-jump-shot', 'era', A, ('Saltar para tirar', 'Jumping to shoot'),
   ('Los jóvenes ya no tiran con los pies en el suelo: saltan y sueltan arriba. Los veteranos dicen que eso no durará.',
    'Youngsters no longer shoot with feet on the floor: they jump and release at the top. Veterans say it will not last.'),
   [O(('Adoptar el tiro en suspensión', 'Adopt the jump shot'), ('Más difícil de tapar.', 'Harder to block.'), {'attr': {'tiroMedia': 1, 'salto': 1}},
      ('Tu porcentaje sube. Los defensores llegan tarde.', 'Your percentage climbs. Defenders arrive late.')),
    O(('Perfeccionar el juego cerca del aro', 'Polish your game near the rim'), ('Lo seguro.', 'The safe bet.'), {'attr': {'tiroCerca': 2}},
      ('Nadie te para en la zona.', 'Nobody stops you in the paint.'))],
   cond={'era': True, 'minYear': 1945, 'maxYear': 1962}, once=True)
ev('era-shot-clock', 'era', A, ('El reloj que lo cambia todo', 'The clock that changes everything'),
   ('Ha llegado el reloj de posesión: se acabó congelar el balón para proteger una ventaja. Los partidos van a ir mucho más rápido.',
    'The shot clock has arrived: no more freezing the ball to protect a lead. Games are about to get much faster.'),
   [O(('Entrenar el físico', 'Train your conditioning'), ('Habrá que correr.', 'There will be running.'), {'attr': {'resistencia': 2}},
      ('En el último cuarto, eres el único que no jadea.', 'In the last quarter you are the only one not gasping.')),
    O(('Trabajar la toma de decisiones', 'Work on decision-making'), ('Menos tiempo para pensar.', 'Less time to think.'), {'attr': {'lectura': 2}},
      ('Lees las defensas antes de cruzar el medio campo.', 'You read defences before crossing half court.'))],
   cond={'era': True, 'minYear': 1954, 'maxYear': 1958}, once=True)
ev('era-orange-ball', 'era', A, ('Un balón naranja', 'An orange ball'),
   ('La liga prueba un balón naranja, más visible para el público y para la televisión. Algunos jugadores dicen que bota raro.',
    'The league is trying an orange ball, easier to see for fans and TV. Some players say it bounces funny.'),
   [O(('Pedir uno para entrenar en casa', 'Ask for one to practise at home'), ('Mejor acostumbrarse.', 'Better get used to it.'), {'attr': {'manejo': 1}, 'xp': 2},
      ('Al cabo de una semana ya no recuerdas el marrón.', 'After a week you no longer remember the brown one.')),
    O(('Quejarte en la prensa', 'Complain to the press'), ('Polémica gratis.', 'Free controversy.'), {'fame': 3, 'trust': -2},
      ('Tu queja sale en los periódicos. El balón naranja se queda.', 'Your complaint makes the papers. The orange ball stays.'))],
   cond={'era': True, 'minYear': 1957, 'maxYear': 1966}, once=True)
ev('era-first-tv', 'era', A, ('Partido televisado', 'Televised game'),
   ('Por primera vez, la televisión retransmite un partido del {club}. Todo el país podrá verte.',
    'For the first time, television is broadcasting a {club} game. The whole country can watch.'),
   [O(('Jugar para la cámara', 'Play for the camera'), ('Espectáculo.', 'Showtime.'), {'fame': 6, 'fans': 4, 'trust': -1},
      ('Un pase por la espalda acaba en todos los noticiarios.', 'A behind-the-back pass ends up on every newscast.')),
    O(('Jugar como siempre', 'Play as always'), ('Lo importante es ganar.', 'Winning is what matters.'), {'trust': 2, 'morale': 2},
      ('El comentarista elogia tu "baloncesto serio".', 'The commentator praises your "serious basketball".'))],
   cond={'era': True, 'minYear': 1958, 'maxYear': 1975}, once=True)
ev('era-women-olympics', 'era', A, ('El baloncesto femenino llega a los Juegos', 'Women\'s basketball reaches the Olympics'),
   ('Este año el baloncesto femenino debuta en los Juegos Olímpicos. Todo el vestuario lo sigue por la radio.',
    'This year women\'s basketball makes its Olympic debut. The whole locker room follows it on the radio.'),
   [O(('Soñar con ir algún día', 'Dream of going one day'), ('Un objetivo nuevo.', 'A new goal.'), {'morale': 5, 'confidence': 1},
      ('Pegas el recorte del periódico en tu taquilla.', 'You tape the newspaper clipping to your locker.')),
    O(('Entrenar el doble esa semana', 'Train twice as hard that week'), ('Hay que estar preparada.', 'You have to be ready.'), {'attr': {'resistencia': 1, 'tiroLibre': 1}},
      ('Nadie se va del pabellón antes que tú.', 'Nobody leaves the gym before you.'))],
   cond={'era': True, 'gender': 'women', 'minYear': 1976, 'maxYear': 1977}, once=True)
ev('era-three-na', 'era', A, ('Una línea nueva en la pista', 'A new line on the court'),
   ('La liga estrena la línea de tres puntos. Muchos entrenadores la consideran un truco de feria.',
    'The league debuts the three-point line. Many coaches consider it a sideshow gimmick.'),
   [O(('Practicar triples cada día', 'Practise threes every day'), ('Ventaja de pioneros.', 'Pioneer\'s edge.'), {'attr': {'tiroTriple': 3}},
      ('Tus compañeros se ríen... hasta que empiezas a meterlos.', 'Teammates laugh... until you start making them.')),
    O(('Seguir atacando el aro', 'Keep attacking the rim'), ('Dos puntos seguros valen más.', 'Two sure points are worth more.'), {'attr': {'tiroCerca': 1, 'bandeja': 1}},
      ('El entrenador asiente. De momento, tiene razón.', 'The coach nods. For now, he is right.'))],
   cond={'era': True, 'region': 'NA', 'minYear': 1979, 'maxYear': 1981}, once=True)
ev('era-three-fiba', 'era', A, ('Llega la línea de 6,25', 'The 6.25 m line arrives'),
   ('FIBA ha aprobado la línea de tres puntos a 6,25 metros. El baloncesto internacional nunca volverá a ser igual.',
    'FIBA has approved the three-point line at 6.25 metres. International basketball will never be the same.'),
   [O(('Convertirte en especialista', 'Become a specialist'), ('Un arma nueva.', 'A new weapon.'), {'attr': {'tiroTriple': 3}},
      ('Te llaman "el de la línea". Te encanta.', 'They call you "the line guy". You love it.')),
    O(('Defender esa línea', 'Defend that line'), ('Alguien tendrá que hacerlo.', 'Someone has to.'), {'attr': {'defExterior': 2}},
      ('Los tiradores rivales empiezan a odiarte.', 'Opposing shooters start to hate you.'))],
   cond={'era': True, 'region': ['EU', 'WORLD'], 'minYear': 1984, 'maxYear': 1986}, once=True)
ev('era-pros-olympics', 'era', A, ('Profesionales en los Juegos', 'Professionals at the Olympics'),
   ('FIBA ha abierto los Juegos a los jugadores profesionales. Las selecciones van a cambiar para siempre.',
    'FIBA has opened the Olympics to professional players. National teams are about to change forever.'),
   [O(('Ponerte a disposición de tu país', 'Make yourself available to your country'), ('Un sueño.', 'A dream.'), {'fame': 5, 'morale': 4},
      ('El seleccionador te llama esa misma semana.', 'The national coach calls you that same week.')),
    O(('Centrarte en tu club', 'Focus on your club'), ('El verano es para descansar.', 'Summer is for resting.'), {'trust': 3},
      ('El club agradece tu compromiso.', 'The club appreciates your commitment.'))],
   cond={'era': True, 'minYear': 1989, 'maxYear': 1993}, once=True)
ev('era-four-quarters', 'era', A, ('Cuatro cuartos y 24 segundos', 'Four quarters and 24 seconds'),
   ('Se acabaron los dos tiempos de 20 minutos: llegan los cuartos de 10 y el reloj de 24 segundos.',
    'Two 20-minute halves are over: 10-minute quarters and the 24-second clock are here.'),
   [O(('Acelerar tu juego', 'Speed up your game'), ('Más posesiones.', 'More possessions.'), {'attr': {'velocidad': 1, 'aceleracion': 1}},
      ('Corres la pista como nunca.', 'You run the floor like never before.')),
    O(('Ser la pausa del equipo', 'Be the team\'s calm'), ('Alguien tiene que ordenar.', 'Someone has to organise.'), {'attr': {'vision': 1, 'pase': 1}},
      ('Cuando el partido se vuelve loco, el balón te busca.', 'When the game goes crazy, the ball finds you.'))],
   cond={'era': True, 'region': ['EU', 'WORLD'], 'minYear': 2000, 'maxYear': 2001}, once=True)
ev('era-analytics', 'era', A, ('Los números mandan', 'Numbers rule'),
   ('El club ha contratado analistas. Su conclusión: tiros libres, triples y bandejas; el tiro de media distancia "no sale a cuenta".',
    'The club has hired analysts. Their verdict: free throws, threes and layups; the mid-range shot "doesn\'t pay".'),
   [O(('Hacer caso a los datos', 'Follow the data'), ('Eficiencia.', 'Efficiency.'), {'attr': {'tiroTriple': 2}, 'trust': 2},
      ('Tu eficiencia se dispara. Los analistas te adoran.', 'Your efficiency soars. The analysts love you.')),
    O(('Defender tu media distancia', 'Defend your mid-range'), ('El arte no se mide.', 'Art cannot be measured.'), {'attr': {'tiroMedia': 2}, 'fans': 2},
      ('Los puristas te convierten en su héroe.', 'The purists make you their hero.'))],
   cond={'era': True, 'minYear': 2012, 'maxYear': 2019}, once=True)


if __name__ == '__main__':
    print(len(EVENTS))
