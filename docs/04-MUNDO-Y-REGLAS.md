# 04 — MVP, mundo editable y reglas verificadas

## 1. Mundo MVP

| Bloque | Contenido | Estado |
|---|---|---|
| España 1 | 18 clubes, 34 jornadas. Playoff propuesto: 8 equipos, cuartos al mejor de 3, semifinales/final al mejor de 5. | 18/34 verificado 2026–27; formato de series documentado en bases 2025–26 y pendiente de revalidar bases propias 2026–27. [1](https://acb.com/es/liga/noticias/las-fechas-de-la-temporada-2026-27-145584) [2](https://www.acb.com/es/liga/noticias/bases-legales-bracket-playoff-2026-145216) |
| España 2 | 18 clubes, 34 jornadas; campeón asciende directo, segundo ascenso por playoff; 3 descensos. | Primera FEB 2026–27 verificada. [FEB](https://www.feb.es/primerafeb/2026/5/30/baloncesto/las-ligas-feb-inician-ilusionante-campana-202627-asentando-sus-bases-asamblea-feb/104958.aspx) |
| Norteamérica | 30 franquicias, 82 partidos, play-in 7–10 y playoffs al mejor de 7. | Estructura NBA verificada; liga ficticia. [1](https://www.nba.com/news/2026-nba-playoffs-play-in-preview-2) |
| Draft NA | 2 rondas, lotería de 14 equipos; los 3 peores registros tienen 14% cada uno para el pick 1. | Sistema 2026 verificado; no asumir reformas futuras. [1](https://www.nba.com/news/nba-draft-lottery-explainer) |
| Desarrollo NA | Asignaciones, minutos y progreso abstractos; no calendario completo de liga menor. | Simplificación MVP explícita. |
| Resto del mundo | Generadores de prospectos y clubs de fondo, no ligas jugables completas. | Datos editables. |

La segunda española es la ampliación recomendada: sin ella, ascenso/descenso sería una etiqueta. Ambos niveles usan el mismo motor; segunda tiene menos eventos/prensa propios. No se simulan 90 ligas en MVP.

### Competiciones posteriores

- España: copa doméstica y supercopa; Europa: tres niveles continentales con clasificación, presupuesto y viajes. EuroLeague 2026–27: 20 equipos/38 jornadas, seis directos a playoff, play-in 7–10, series al mejor de 5 y Final Four. [EuroLeague](https://mediacentre.euroleague.net/en/app/2/communication/communication/preview/24407)
- Ligas mayores: Italia, Alemania, Francia, Grecia, Turquía, Adriático, Lituania; después Australia, China, Japón, Argentina, Brasil. Cada paquete trae calendario, reglas, economía, cupos y nombres propios.
- NA: copa de temporada integrada en 82 partidos salvo la final; liga de desarrollo completa; All-Star. La NBA Cup 2026 tiene seis grupos de cinco y ocho equipos eliminatorios; 67 partidos cuentan para temporada salvo el campeonato. [NBA](https://www.nba.com/news/nba-cup-101)
- Selecciones: ventanas, clasificatorios, Mundial, Juegos Olímpicos y torneos continentales. Calendario por ciclo, no fechas eternas. Mundial 2027: 32 equipos. [FIBA](https://about.fiba.basketball/en/our-sport/basketball/national-team-competition-systems/fiba-basketball-world-cup)
- NCAA: recruiting, becas, conferencias, torneo y draft. Desde 2027 el torneo DI masculino/femenino pasa a 76 equipos; no hardcodear 64/68. [1](https://www.ncaa.com/news/basketball-men/article/2026-05-07/ncaa-reveals-new-76-team-bracket-di-mens-and-womens-basketball-championships)
- Crea tu club: entrada por escalera europea o expansión NA, con identidad vóxel y consecuencias económicas.

### Cobertura mundial obligatoria

Objetivo confirmado: censo de todas las ligas existentes, con estructura, país, nivel, género, categoría, temporada, reglas, calendario, economía y nombres editables. Incluye senior/pro/semipro, amateur/regional, juveniles/canteras y universitario. La implementación será por paquetes de datos y generadores, no por ramas de código. El MVP puede arrancar con un núcleo jugable, pero el diseño no puede cerrarse a “las grandes ligas”. El estado de cobertura será `seed`, `partial` o `complete`; solo se marcará `complete` por país/categoría cuando exista fuente y validación.

Estado fase 2: `data/world/seed.json` versión 0.2.0, estado `partial`, 41 competiciones de muestra: 10 verificadas y 31 pendientes. Incluye pro, semipro, amateur, regional, youth, academy, university/college, masculino/femenino/mixto y varias confederaciones. Esto prueba el contrato de censo; no afirma cobertura mundial completa.

## 2. Perfiles de regla

Valores principales comprobados el 31-10-2026. “Oficial” se refiere a la fuente real; el juego usa nombres ficticios y puede simplificar administración, pero no mezclar reglas silenciosamente.

| Campo | FIBA 2026 | NA/NBA 2026–27 | NCAA M 2026–27 | NCAA W 2026–27 |
|---|---|---|---|---|
| Juego | 4×10 min; OT 5 | 4×12 min; OT 5 | 2×20 min; OT 5 | 4×10 min; OT 5 |
| Cancha | 28×15 m | 28,65×15,24 m | 28,65×15,24 m | 28,65×15,24 m |
| Triple | 6,75 m arco; 6,60 m esquina | 7,24 m arco; 6,70 m esquina | 6,75 m arco; 6,60 m esquina | 6,75 m arco; 6,60 m esquina |
| Jugadores en pista | 5 | 5 | 5 | 5 |
| Exclusión personal | 5 faltas | 6 faltas | 5 faltas | 5 faltas |
| Bonus equipo | 2 TL desde 5ª falta común de cuarto; OT cuenta como Q4 | 2 TL desde 5ª falta de cuarto o 2ª en últimos 2 min; OT desde 4ª o 2ª en últimos 2 min | 1+1 desde 7ª falta de mitad; 2 TL desde 10ª; reset al descanso | 2 TL desde 5ª falta de cuarto; reset por cuarto; sin 1+1 |
| Reloj posesión | 24 s; 14 s tras rebote ofensivo y resets elegibles | 24 s; 14 s tras rebote ofensivo y resets elegibles | 30 s; 20 s en rebote ofensivo/resets elegibles | 30 s; 20 s en rebote ofensivo/resets elegibles |
| Avance de campo | 8 s | 8 s | 10 s | 10 s |
| Inicio / retenida | Salto inicial; flecha de posesión alterna | Salto inicial/OT; periodos con posesión asignada | Salto inicial; flecha | Salto inicial; flecha |
| Timeouts equipo | 2 primera parte + 3 segunda; máx. 2 en últimos 2 min; 1 por OT | 7; máx. 4 en Q4; máx. 2 tras 3:00 o segundo mandatory; 2 por OT | Depende de contrato de medios; no inventar número universal | Depende de contrato de medios; no inventar número universal |
| Revisión entrenador | IRS/challenge según competición; no asumir universal | 1 challenge; segundo si acierta; requiere timeout legal | Appeals y challenges separados; 1 challenge, segundo si acierta y devuelve timeout | Reglamento femenino propio; verificar antes de activar |
| Defensa 3 s | No | Sí | No | No |

Fuentes: FIBA 2026 v1.1 y cambios 2026; NBA Official Playing Rules 2026–27, Rules 5/12/14; NCAA Major Rules Differences 2026–27, Table Crew y Coaches Appeals. Enlaces y estado en documento 06.

### Detalles que no se pueden “simplificar” mal

- **Reset 24/14:** no basta un contador global. Distinguir cambio de control, rebote ofensivo, balón que toca aro, falta/violación defensiva, out-of-bounds, timeout y avance de campo. FIBA/NBA/NCAA tienen condiciones distintas.
- **Bocina:** el release debe ocurrir antes de 0.0; el vuelo puede continuar. Falta y release se ordenan por décimas/evento, no por orden de render.
- **Técnicos:** FIBA 2026 revisa categorías; no copiar tabla de 2024. NBA y NCAA tienen penalizaciones/posesiones distintas.
- **Goaltending/interferencia:** FIBA permite jugar el balón tras tocar aro en tiro de campo con restricciones; NBA/NCAA tienen reglas de cilindro/tablero diferentes. Casos límite se prueban contra interpretaciones oficiales.
- **Faltas de equipo:** no arrastrar bonus NBA a FIBA ni 1+1 a mujeres NCAA.
- **Roster administrativo:** FIBA permite 12; MVP usa 12 convocados por partido en ambos ecosistemas como simplificación de gestión. Contrato/activo NA completo y dos vías se verifican contra CBA antes de activarse.

## 3. Economía NA

Cifras oficiales 2026–27 guardadas por temporada, no constantes eternas: cap $164,961 M; tax $200,428 M; suelo $148,465 M; primer apron $209,015 M; segundo $221,686 M. [NBA](https://pr.nba.com/2026-27-salary-cap/)

MVP: cap blando, suelo, tax, escala rookie, máximos/mínimos, derechos de renovación básicos, una excepción media simplificada, opciones, oferta restringida, picks/protecciones, waivers y legalidad de trades. Aprons completos, múltiples excepciones, sign-and-trade, agregación y matching detallado por CBA quedan para fase posterior.

No hardcodear “125%” como matching universal: depende de situación/apron/CBA. Los importes rookie y máximos/mínimos exactos deben cargarse de tabla oficial de temporada; si falta fuente, se marca pendiente y no se publica como regla real. La IA ejecutiva valora picks, ventana, coste, rol y riesgo, no solo cuadre salarial.

## 4. Economía europea

Presupuesto, salarios netos/brutos según país, buyouts, cláusulas, préstamos, ventanas, formación/cupos y contratos multianual. MVP: presupuesto, salarios, duración, cláusula de salida, préstamo simple y ventanas. Cupos ACB exactos y licencias están pendientes de reglamento oficial; no se presenta la prensa secundaria como regla verificada.

Draft-and-stash: derechos NA persisten mientras el jugador sigue en Europa; edad, contrato y desarrollo afectan la decisión de viajar. Un club europeo no vende a un jugador que no tiene contrato solo porque fue drafteado.

## 5. Datos editables y versionado

Entidades: `SeasonPack`, `Competition`, `Club`, `Person`, `Contract`, `RuleSet`, `Calendar`, `Economy`, `NamePool`, `Event`, `Achievement`, `Cosmetic`.

Cada paquete tiene `id`, `version`, `validFrom`, `validTo`, `sourceStatus`, `locale` y `schemaVersion`. Una carrera guarda el pack usado; actualizar el juego no reescribe silently una temporada histórica. Migraciones explícitas y backup antes de cambiar schema.

Datos reales de investigación son opcionales, versionados y alterados antes de publicar. Separar investigación interna de datos de juego. Sin logos/marcas; nombres paródicos editables y procedencia documentada.

## 6. Mujeres y épocas

Mismo motor y sistemas de carrera; paquetes de reglas, calendarios, atributos base, economía y nombres propios. No escalar salarios femeninos con un porcentaje arbitrario del masculino. Activar carrera femenina completa cuando haya datos y pruebas suficientes; arquitectura preparada desde fase 1.

Épocas: `RuleSet` y `SeasonPack` por año; sin triple antes de introducción, sin shot clock antes de adopción, estética/audio y mercado de época. No meter “if year < X” disperso en UI/motor.
