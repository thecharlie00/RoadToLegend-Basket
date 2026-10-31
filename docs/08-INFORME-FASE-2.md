# 08 — Informe de fase 2: motor, reglas y calibración

**Fecha:** 31-10-2026. **Estado:** implementado para revisión. **Build:** `dist/index.html`, 140.144 bytes, sha256 `8c480a99557b…`. **Tests:** 32/32. **Push/AAB:** no realizados.

## Cambios

- Motor determinista por posesiones en `src/match/engine.js`: reloj en décimas, eventos con hash acumulativo, zonas de tiro, creación/contestación, fatiga, rotación, faltas, bonus, tiros libres, 1+1, and-one, rebotes ofensivos/defensivos/de equipo, tapones, robos, pérdidas, +/-, prórrogas y box score.
- Perfiles de reglas en `src/match/rules.js`: `FIBA-2026`, `NA-2026-27`, `NCAA-M-2026-27`, `NCAA-W-2026-27`. Separación de 24/14 vs 30/20, 5/6 faltas, bonus por cuarto/mitad, OT, flecha vs posesión asignada y distancias de triple.
- Calibración en `src/match/calibration.js` y CLI `tools/calibrate.js`: medias, percentiles, varianza, porcentajes derivados, márgenes, upset rate y deltas contra objetivo NBA 2025–26.
- Worker RPC: `rules.list`, `rules.profile`, `match.simulate`, `match.box`, `calibration.batch`.
- UI: pestaña **Partido** con selector de reglas, semilla, simulación, box score, últimas jugadas, hash e invariantes; calibración rápida de 200 partidos.
- Censo mundial ampliado a 41 competiciones de muestra, estado `partial`: 10 verificadas, 31 pendientes. Incluye categorías pro/semipro/amateur/regional/youth/academy/university/college y géneros men/women/mixed.
- Documentación actualizada: propuesta, motor, mundo/reglas y README.

## Archivos principales

- `src/match/rules.js`, `src/match/engine.js`, `src/match/calibration.js`
- `src/worker/handler.js`, `src/manifest.json`
- `src/ui/app.js`, `src/ui/style.css`, `src/locales/es.json`, `src/locales/en.json`
- `tests/rules.test.js`, `tests/match.test.js`, `tests/calibration.test.js`
- `tools/calibrate.js`, `data/world/seed.json`, `data/calibration/`
- `docs/00`, `docs/03`, `docs/04`, `README.md`

## Pruebas ejecutadas

- `npm run check`: validación de censo OK, build OK, 32 tests OK.
- Determinismo: misma semilla/reglas → mismo hash y box; semilla distinta → hash distinto.
- Serialize/resume a mitad de partido: no duplica efectos ni diverge del partido completo.
- Invariantes de box score en los cuatro perfiles: puntos, FGA/FGM, 2PA/3PA, sumas jugador-equipo, minutos, +/-, robos vs pérdidas, posesiones y empate final prohibido.
- Casos de reglas: 24/14 vs 30/20; 5/6 faltas; bonus FIBA/NCAA-W por cuarto; NBA 5ª falta, últimos 2 minutos y OT 4ª; NCAA-M 1+1 a la 7ª y dos a la 10ª; arrastre de faltas FIBA/NCAA-M/NCAA-W vs reset NBA.
- Posesión inicial, prórroga y guard de terminación.
- Calibración NA: 2.000 partidos / 4.000 partidos-equipo, semilla `phase2-lock`.

## Calibración NA

Desviación máxima absoluta: **2,57%**, dentro del objetivo ±3%.

| Métrica | Objetivo | Motor | Delta |
|---|---:|---:|---:|
| PTS | 115,61 | 113,27 | -2,02% |
| FGA | 89,09 | 87,44 | -1,85% |
| FGM | 41,97 | 40,89 | -2,57% |
| 3PA | 36,97 | 36,26 | -1,93% |
| 3PM | 13,30 | 13,31 | +0,07% |
| FTA | 23,49 | 23,28 | -0,89% |
| ORB | 11,38 | 11,18 | -1,72% |
| DRB | 32,39 | 32,81 | +1,30% |
| AST | 26,74 | 26,07 | -2,51% |
| STL | 8,42 | 8,32 | -1,24% |
| BLK | 4,84 | 4,75 | -1,88% |
| TOV | 14,51 | 14,49 | -0,17% |
| PF | 19,87 | 19,76 | -0,56% |
| Posesiones | 99,4 | 101,30 | +1,91% |

Derivados: FG% 46,76; 3P% 36,71; FT% 78,08; 3PAr 41,46%; FTr 0,266; eFG% 54,37; TS% 57,98. Margen medio 14,02; p10 3; p90 28.

FIBA se simuló como perfil propio: PTS 92,54; FGA 73,17; 3PA 30,34; FTA 17,17; posesiones 84,17. **No se declara calibrado FIBA/ACB** porque falta tabla objetivo oficial completa.

## Incertidumbres / límites honestos

- No hay navegador headless ni dispositivo gama baja en el sandbox: no se ha medido 60 fps ni consola del navegador/WebView real.
- El motor es de posesión/resumen; todavía no hay 2D, minijuegos, técnicos/flagrantes completos, revisiones, timeouts tácticos ni decisiones en vivo.
- WNBA aparece en el censo como `NA-W-2026` pendiente; ese perfil aún no está implementado en `Rules`.
- 31 competiciones del censo siguen `pending`; no se afirma cobertura mundial completa.
- FIBA/ACB, NCAA y estilos/equipos necesitan calibración propia antes de cerrar balance global.
- Fuentes, Atkinson Hyperlegible Next, Pixelify Sans, audio y modelos vóxel siguen pendientes.

## Assets que debe aportar o aprobar el usuario

- Ningún asset bloqueante para esta fase: todo es procedural/texto.
- Para fase 4: aprobar paleta, silueta vóxel, nombres ficticios y dirección de audio.
- Fuentes con licencia/procedencia clara: Atkinson Hyperlegible Next y Pixelify Sans.
- Samples de audio solo con licencia: bote, zapatillas, red, tablero, bocina, público.
- Para 3D posterior: cancha FIBA 28×15 m / NA 28,65×15,24 m; aro 3,05 m; personas 1,70–2,25 m, root en pies, Y arriba, +Z frente; anclajes `hand.L`, `hand.R`, `head`, `chest`, `ball`; balón ~0,24 m como referencia visual.

## Siguiente paso

Fase 3: carreras MVP — jugador/entrenador, España 1+2, liga norteamericana ficticia de 30 franquicias, draft/undrafted, contratos, lesiones, carga, mercado y temporada completa simulada con saves largos.
