# 39 · Talentos (RPG) del jugador y del entrenador

Fecha: noviembre de 2026. Investigación sobre cómo personalizan y hacen progresar al jugador y al entrenador los juegos del género, qué critican sus jugadores y cómo lo resolvemos con un sistema de talentos que cambia los atributos de los partidos.

## 1. Qué hacen otros juegos y qué opinan sus jugadores

| Juego | Sistema | Críticas | Lo que piden |
|---|---|---|---|
| **NBA 2K (MyPlayer, insignias)** | Constructor con topes por arquetipo; insignias por niveles que suben y **bajan** según cómo juegas; fichas por categoría, sinergias y conjuntos | Topes que impiden crear la estrella completa offline. La **regresión** de insignias hace perder progreso. El *grind* aburre. Se puede pagar para subir (unos 270.000 VC por un personaje al máximo). Los parches devalúan lo invertido. Mucha matemática de ventajas. Se juega «para la insignia» y no para ganar. | Progreso que refleje cómo juegas sin bajadas, reasignar la construcción, menos cálculo, sin atajos de pago, y ver el desglose de atributos como los jugadores reales |
| **EA College Football 26 (entrenador)** | Árboles por arquetipo de entrenador; nivel máximo subido de 50 a 100; mejorar dentro de tu arquetipo cuesta menos que abrir otro; progresión manual de jugadores con puntos | El tope de 50 se alcanzaba demasiado pronto. Los foros se quejan de no entender cómo se gana la moneda de mejora ni de verla en un sitio central. | Reto y control; que no se pueda tener todo |
| **Football Manager Mobile (mánager)** | Insignias de entrenador por logros (bronce, plata, oro) que mejoran el entrenamiento; perfiles con bonus (ataque, defensa, motivación, juveniles, físico) | — | — |
| **Basketball Superstar 2** | Medallas que suben una habilidad | Las medallas «apenas hacen nada»; la interfaz sugiere que suben una categoría y sube una sola habilidad; harían falta unas 40 partidas para mejorarlo todo; progresión lenta adrede; pagar para avanzar | Explicación al pasar por encima (*tooltip*), mejores recompensas por temporada, una habilidad especial propia («como las estrellas»), altura y peso |
| **Hoop Land (comunidad)** | Desarrollo por partidos y entrenamientos | Sin partidos excepcionales es casi imposible llegar a la élite | Que entrenar y jugar se noten |

## 2. Cómo lo hacemos («Talentos»)

**Experiencia y niveles**
- Se gana XP con lo que pasa en la pista.
- Jugador, por partido: 10 + 0,5 por punto y rebote + 0,7 por asistencia + 1 por robo o tapón + 8 si gana, +6 en playoffs. También entrenando, en las prácticas, y con premios y títulos.
- Entrenador, por partido: 12 + 15 si gana, más según la diferencia, +8 en playoffs. Premios y títulos dan mucho más.
- Cada nivel da 1 punto. El nivel máximo es 40, y una temporada da unos 6 niveles.
- **Nunca se pierde XP ni nivel.**

**Árboles del jugador** (6): Tiro, Finalización, Creación, Defensa, Físico y Mentalidad.
- Cada árbol tiene 4 talentos: dos de base (3 rangos), uno de segundo escalón (2 rangos) y una **firma ✦** (1 rango).
- Cada rango suma un número exacto a atributos concretos, por ejemplo «Rango largo: +1 Triple por rango» o «Francotirador: +3 Triple, +2 Clutch».
- Esos atributos son los que usa el simulador: acierto por zona, defensa sobre el tiro, robos, tapones, rebotes, cansancio y clutch.

**Árboles del entrenador** (4):
- **Pizarra** y **Defensa** suben atributos de **toda tu plantilla** en los partidos.
- **Desarrollo** añade un % de mejora semanal a los jóvenes o a todos, y baja la carga.
- **Liderazgo** da moral y confianza de la directiva por semana, +2 de clutch al equipo y una moral mínima de 55 con su firma.

**Reglas para que haya decisiones** (no se puede tener todo):
- El segundo escalón pide 3 puntos en ese árbol.
- Las firmas piden 6 puntos en el árbol y nivel 15, y solo puedes llevar 2.
- Hay un tope por atributo: +10 para el jugador y +6 para el equipo.
- Repartir todos los puntos posibles exigiría unos 54; al nivel 40 tienes 40.

**Reasignar** es gratis una vez por temporada.

**Transparencia:**
- Cada talento muestra su efecto exacto y por qué está bloqueado.
- La ficha enseña «Media X · en partido con talentos: Y» y la lista de lo que suma ahora.
- En la temporada aparece un aviso «¡Subes al nivel N!».

## 3. En qué mejoramos a cada uno

- **NBA 2K:**
  - no hay regresión ni moneda de pago;
  - se reasigna gratis;
  - no hay topes de arquetipo que te impidan crear tu estrella: el límite es la elección entre árboles;
  - los efectos se leen en una línea;
  - la XP premia también ganar y defender, no solo anotar.
- **College Football 26:**
  - el mismo principio de «no se puede todo», con un tope (nivel 40) que no se alcanza en un par de temporadas;
  - cómo se gana XP está escrito en la pantalla de talentos;
  - todo está en una sola vista.
- **Football Manager Mobile:** los perfiles del mánager pasan a ser árboles que puedes combinar y reasignar, con efectos visibles en el partido y no solo en el entrenamiento.
- **Basketball Superstar 2:**
  - cada punto se nota: un rango equivale a +1 o +2 en un atributo de partido;
  - las firmas son la habilidad especial que pedían;
  - nada se compra.

## 4. Para la siguiente tanda

- Firmas con efecto propio en el directo (por ejemplo, un tiro garantizado una vez por partido en la Jugada Maestra).
- Arquetipo inicial con un punto gratis en su árbol natural (la «afinidad» de College Football).

## Fuentes

- NBA 2K23: los jugadores piden rehacer el constructor (dexerto.com/nba-2k/nba-2k23-players-myplayer-builder-attributes-rework-1907019)
- NBA 2K24: regresión de insignias y microtransacciones (operationsports.com/badge-regression-and-the-yearly-nba-2k24-microtransaction-mess)
- NBA 2K24: sistema de insignias explicado (si.com/esports/sports-games/nba-2k24-badge-system-explained-nba-player-template-level-progression-system)
- NBA 2K17: el problema de los topes de atributos (hashtagbasketball.com/nba-2k/content/nba-2k17-mycareer-the-problem-with-attribute-caps)
- NBA 2K27: nuevo sistema de insignias (nba.2k.com/2k27/learn-2k/new-badge-system/)
- College Football 26, Dynasty: análisis en profundidad (cbssports.com/college-football/news/ea-sports-college-football-26-dynasty-mode-deep-dive-exploring-the-biggest-changes-and-updates)
- College Football 25: mejoras y habilidades de jugadores, foro de EA (forums.ea.com/discussions/college-football-25-dynasty-en/player-upgrades--abilities/7084476/replies/7084478)
- Football Manager Mobile 2024: «You the Manager» (community.sports-interactive.com/sigames-manual/football-manager-mobile-2024/you-the-manager-r5238)
- Basketball Superstar 2, reseñas (justuseapp.com/en/app/6444349148/basketball-superstar-2/reviews)
- r/HoopLand, desarrollo del personaje (reddit: r/HoopLand/comments/1kzenhl/character_development)
