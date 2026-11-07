# 33 · Modo Épocas completo (paridad con el fútbol)

Siguiendo el GDD del Modo Épocas del fútbol, adaptado al baloncesto. Antes existía un modo básico (década, reglas por año, estética de televisión y leyendas ficticias), escondido en «Más modos».

## Inicio y visibilidad
- **Visible**: el modo aparece junto a Jugador, Entrenador y Crear club.
- **Inicio libre**: década → país → liga existente ese año → club, con puesto y talento si eres jugador.
- **Sin anacronismos**: las plantillas reales versionadas ya no se aplican en Épocas (en 1972 no puede jugar una estrella de 2026); los jugadores son generados.

## Competiciones de época (`src/domain/era-world.js`)
Cada competición existe solo los años en que existió, con su nombre de entonces, y se clasifica por la liga:

| Competición | Años | Plaza |
|---|---|---|
| Copa de Europa → Liga Europea (1992) → Euroliga (2001) | 1958 → hoy | Campeón (1.º-2.º desde 1992, 1.º-3.º desde 2001) |
| Recopa → Copa de Europa FIBA (1992) → Copa Saporta (1997) | 1967 → 2002 | Campeón de copa o 2.º |
| Copa Korać | 1972 → 2002 | 3.º-4.º |
| Eurocup | 2003 → hoy | 4.º-6.º |
| Copa de Europa femenina → Euroliga Femenina (1996) | 1959 → hoy | 1.ª-2.ª |
| Copa Ronchetti / Eurocup femenina | 1972-2002 / 2003 → hoy | 3.ª-4.ª / 3.ª-5.ª |
| Sudamericano de Clubes / Liga de las Américas / BCL Américas | 1946-2007 / 2008-2019 / 2020 → hoy | 1.º-2.º |
| Copa Intercontinental | 1966-1987 y desde 2013 | Si ganas tu gran copa continental |

- **Formato**: cuadro de 8 a partido único contra clubes de otras ligas de tu continente que existían ese año. Resultados en una tarjeta al acabar la temporada, con el campeón real de ese año al lado.
- **Palmarés**: los títulos van a tu palmarés de época.

## Anuario
- **Contenido**: cada temporada guarda tu club y puesto, el campeón de tu partida y el campeón real. Cuenta las temporadas que se apartan de la historia y los títulos reescritos (ganas uno que en la realidad fue de otro). Esto último genera noticia y cromo.
- **Linaje de franquicias**: Minneapolis Lakers = Los Angeles Lakers, Syracuse Nationals = Philadelphia 76ers, Seattle SuperSonics = Oklahoma City Thunder, Barcelona = Barça…, para no contar divergencias falsas.
- **Datos reales** consultados en noviembre de 2026:
  - NBA (1947-2026): [lista de campeones](https://en.wikipedia.org/wiki/List_of_NBA_champions); 2026, [Knicks](https://www.nba.com/news/live-updates-2026-nba-finals-game-5-knicks-seek-first-title-since-1973).
  - Liga Española (1957-2026): [lista de campeones](https://en.wikipedia.org/wiki/List_of_Spanish_basketball_champions).
  - Copa de Europa/Euroliga (1958-2026): [historia](https://en.wikipedia.org/wiki/FIBA_European_Champions_Cup_and_EuroLeague_history); 2026, [Olympiacos](https://en.wikipedia.org/wiki/2026_EuroLeague_Final_Four).
  - WNBA (1997-2026): [finales](https://en.wikipedia.org/wiki/WNBA_Finals).
  - Euroliga Femenina (1959-2026): [palmarés](https://en.wikipedia.org/wiki/EuroLeague_Women).
- **Israel**: por decisión del proyecto, no se muestran los títulos de clubes israelíes.
- **Nombres**: los clubes del juego llevan su nombre actual.

## Momentos de leyenda
- **Formato**: tres por década (La gran final, La remontada, La sorpresa). Eliges un plan (correr, defender o triples si ya existe la línea) y se juega con las reglas del año contra el gigante de la liga o el club de tu némesis.
- **Estrellas**: objetivo principal (ganar) y tres secundarios (margen, defensa y tus puntos), hasta 4 estrellas. Se puede repetir y se guarda la mejor.
- **Hechos**: solo hechos de partido; nunca se atribuye nada a personas reales.

## Leyendas rivales
- Las leyendas ficticias de tu década juegan en clubes rivales. Cada duelo contra su club queda registrado (victorias, derrotas y último resultado).
- La más enfrentada es tu **némesis**, y es el rival de tus Momentos.

## Álbum de la década
- **Cromos**: 22 por década, cada uno con una forma concreta de ganarse:
  - Enfrentarte a cada leyenda y ganarle.
  - Una estrella y las 4 estrellas en cada momento.
  - Jugar, llegar a la final y ganar una competición de época.
  - Terminar entre los cuatro primeros, ser campeón, reescribir la historia, y jugar dos y cinco temporadas en la década.
- **Huecos**: muestran la pista.
- **Sin azar**: ni sobres ni compras.

## Mecánica de firma
- **Antes de la ley Bosman** (diciembre de 1995), en Europa: límite de extranjeros por equipo (1 hasta 1979, 2 hasta 1995). Aplica en el mercado y en el último día de mercado.
- **Desde 1996**: aviso de la ley Bosman.

## Fuera del alcance de este paso
- Nombres de clubes por año (requiere un histórico de clubes verificado).
- Dinastía de Épocas y reto diario.
- Recompensas cosméticas fuera del modo.
