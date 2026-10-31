# 03 — Especificación del motor determinista por posesiones

## 1. Contrato

Motor puro, sin DOM, red, audio ni reloj de pared. Entrada: estado del mundo, plantilla, reglas, táctica, semilla y acciones. Salida: nuevo estado, eventos de posesión, box score y hash. La UI reproduce eventos; no inventa goles, faltas ni reloj.

- Paso lógico fijo: **100 ms** (10 Hz) para reloj/acciones; render a 60 fps con interpolación.
- Minijuegos: muestreo de entrada a paso fijo de 60 Hz; el release se cuantiza al tick lógico y se compromete antes de resolver. La animación no añade física aleatoria.
- Reloj en décimas enteras; prórrogas y secuencias de tiro libre como submáquina, no como “saltos” de marcador.
- RNG sembrado por carrera y streams separados: mundo, partido, eventos, scouting, cosmética. Contador persistido.
- Prohibido `Math.random`, `Date.now`, iteración dependiente de orden inestable o física de render dentro del resultado.
- Resumen, 2D y 3D consumen el mismo log. Cambiar velocidad/cámara no cambia resultados.
- Guardar en límite de acción/posesión y antes de decisiones; al reanudar no se repite una tirada.

## 2. Estado mínimo

`matchId`, versión de reglas, periodo, reloj de juego/posesión, marcador, equipo con balón, fase, cinco en pista, banquillo, faltas personales/equipo, bonus, timeouts, flecha de posesión si aplica, revisión pendiente, fatiga, forma, química, táctica, emparejamientos, acumuladores de stats y RNG.

`World` no se muta durante una posesión salvo eventos explícitos al terminar partido. Lesiones y disciplina se aplican por efectos versionados.

## 3. Máquina de estados

`PRE_GAME → TIP/O_ASSIGNED → LIVE_CONTROL → ACTION_SETUP → RELEASE/PASS/DRIVE → BALL_FLIGHT → RESOLVE → REBOUND/FOUL/TURNOVER/SCORE → NEXT_POSSESSION`.

Ramas: `OUT_OF_BOUNDS`, `FREE_THROWS`, `TIMEOUT`, `SUBSTITUTION`, `REVIEW`, `PERIOD_BREAK`, `OVERTIME`, `FINAL`.

Una acción tiene duración, actores, zona, ventaja, contestación, coste de fatiga y resultado. El motor puede saltar tiempos muertos en simulación rápida, pero conserva las mismas decisiones legales y consumo de reloj.

### Definición de posesión

Posesión termina con canasta, pérdida, rebote defensivo controlado o fin de periodo. Un rebote ofensivo prolonga la misma posesión a efectos de contador/pace, aunque reinicia el reloj de posesión según reglas. Una secuencia de TL pertenece a la posesión que la originó salvo cambio de control tras el último TL; una técnica administrativa no crea una posesión ofensiva ficticia. And-one no duplica posesión. El contador exacto del motor se guarda; las fórmulas estimadas de pace solo se usan para comparar con estadísticas publicadas.

## 4. Creación de ventaja

1. **Contexto:** transición/media cancha, spacing, matchup, carga, rol, química y reloj.
2. **Intento:** sistema ofensivo elige acción (PnR, poste, corte, tiro rápido, isolation, movimiento); el jugador puede pedir/forzar dentro de su rol.
3. **Ventaja:** manejo vs defensa exterior, fuerza/salto vs contacto, visión vs ayuda, pase vs robo, tamaño vs cambio defensivo.
4. **Colapso:** ayuda deja tirador, roll, corte o pase extra; la defensa no teletransporta.
5. **Finalización:** zona, contestación, equilibrio, mano, fatiga y clutch.
6. **Resolución:** canasta, fallo, falta, tapón, pérdida, rebote o violación.

Las posiciones no son bonos planos. Un base pequeño puede crear ventaja por aceleración; un interior por fuerza/envergadura. Un mal emparejamiento abre una ventaja concreta que la ayuda puede cerrar.

## 5. Tiro, rebote y fatiga

Modelo base por zona y liga: `p = clamp(baseZone + skillDelta - contest - fatigue + creation + clutch + form, pMin, pMax)`.

- Zonas: restringida, pintura no restringida, media corta/larga, corner 3, above-break 3; distancia real según reglas.
- Contestación combina defensor primario, ayuda, tamaño, salto, posición y equilibrio; no solo OVR defensivo.
- Fatiga reduce salto/velocidad/defensa y aumenta pérdidas; no un castigo oculto al usuario.
- Forma es una desviación pequeña y transitoria. “Hot hand” máximo propuesto: +3 puntos porcentuales, decae rápido y nunca garantiza canasta.
- Clutch usa atributo y presión situacional; no cambia el aro ni fuerza un final.
- Rebote: posición, box-out, salto, fuerza, alcance y rebote de equipo. Se registra ORB/DRB y rebotes de equipo cuando nadie controla.
- Faltas: probabilidad por contacto/intento, no por necesidad de marcador. Técnicas/flagrantes/disruptivas según perfil.

Todos los coeficientes son datos calibrables. Los límites son de seguridad, no mecanismos para forzar resultados.

## 6. Táctica e IA

Ataque: ritmo, spacing, PnR/pop, poste, motion, isolation, transición, crash de rebote. Defensa: individual, zona 2-3/3-2, switch/drop/blitz, presión, ayuda y negación. Cada sistema tiene fortalezas y exposición: blitz concede pase corto; zona concede tiro exterior; switch castiga tamaño; correr aumenta puntos y fatiga/pérdidas.

IA ejecutiva evalúa necesidad, edad, potencial, rol, química, contrato, riesgo, ventana competitiva y coste. No acepta trades absurdos solo porque cuadre salario. Dificultad cambia calidad de información/decisión, no probabilidades secretas del usuario.

Entrenador puede cambiar emparejamiento, ritmo, sistema, rotación, hack-a-player, falta intencionada, timeout y última jugada en ventanas legales. Jugador puede pedir balón, corte, bloqueo o tiro; el compañero puede rechazar según rol/confianza.

## 7. Reglas por perfil

Cada perfil define duración, periodos, cancha, línea 3, faltas, bonus, shot clock, reset, avance de balón, timeouts, revisión, sustituciones, goaltending y técnicas. No se heredan silenciosamente valores NBA en FIBA/NCAA.

Casos obligatorios: reloj 24/14 vs 30/20; 8 vs 10 s; bonus por cuarto/mitad; faltas 5/6; one-and-one NCAA masculino; flecha FIBA/NCAA vs jump ball NBA; canasta sobre bocina; falta antes/después de release; técnico y posesión; revisión que revierte puntos/faltas; prórroga y arrastre de faltas. Ver tabla y fuentes en documento 04.

## 8. Estadísticas

**Tradicionales:** MIN, PTS, FGM/FGA, 2PM/2PA, 3PM/3PA, FTM/FTA, ORB, DRB, REB, AST, STL, BLK, TOV, PF, +/- y rebotes de equipo.

**Avanzadas de tiro:** eFG%=(FGM+0.5·3PM)/FGA; TS%=PTS/(2·(FGA+0.44·FTA)).

**Avanzadas de jugador** (MP=minutos propios, TmMP=minutos totales del equipo): ORB%=100·ORB·(TmMP/5)/(MP·(TmORB+OppDRB)); DRB%=100·DRB·(TmMP/5)/(MP·(TmDRB+OppORB)); AST%=100·AST/(((MP/(TmMP/5))·TmFGM)-FGM); STL%=100·STL·(TmMP/5)/(MP·OppPoss); BLK%=100·BLK·(TmMP/5)/(MP·Opp2PA); TOV%=100·TOV/(FGA+0.44·FTA+TOV); USG%=100·((FGA+0.44·FTA+TOV)·(TmMP/5))/(MP·(TmFGA+0.44·TmFTA+TmTOV)). Ratings por 100 posesiones con denominador explícito.

**Equipo:** ORB%=ORB/(ORB+OppDRB), DRB%=DRB/(DRB+OppORB), pace estimado y rating ofensivo/defensivo por 100 posesiones. Guardar numerador/denominador para evitar medias de medias; distinguir posesiones exactas del motor de estimaciones publicadas.

Box score debe cuadrar: puntos = 2·2PM + 3·3PM + FTM; FGA=2PA+3PA; rebotes/faltas/asistencias con invariantes de equipo. Minutos de pista suman duración del partido por equipo, con prórrogas. Stats de carrera excluyen pruebas/simulaciones de laboratorio.

## 9. Calibración

Referencia NBA 2025–26 completa: 30 equipos × 82 = 2.460 partidos-equipo. Totales de liga recuperados de Basketball-Reference, no líderes individuales. [Fuente](https://www.basketball-reference.com/leagues/NBA_2026.html)

| Métrica por equipo/partido | Objetivo derivado |
|---|---:|
| PTS | 115,61 |
| FGM / FGA | 41,97 / 89,09 |
| 3PM / 3PA | 13,30 / 36,97 |
| FTM / FTA | 18,38 / 23,49 |
| ORB / DRB | 11,38 / 32,39 |
| AST / STL / BLK | 26,74 / 8,42 / 4,84 |
| TOV / PF | 14,51 / 19,87 |
| FG% / 3P% / FT% | 47,11 / 35,98 / 78,26 |
| 3PAr / FTr | 41,50% / 0,264 |
| eFG% / TS% | 54,57 / 58,14 |

Totales crudos: FG 103241/219157; 3P 32724/90951; FT 45216/57779; ORB 27999; DRB 79669; AST 65789; STL 20711; BLK 11899; TOV 35693; PF 48867; PTS 284397. Pace publicado de referencia: 99,4 posesiones estimadas por 48 min; no confundir con el contador exacto del motor.

Herramienta de laboratorio: ejecutar N partidos con plantillas/ratings controlados,semillas fijos y perfiles de reglas;exportar distribución, medias, percentiles, varianza, rating ofensivo/defensivo, upset rate y correlación talento-victoria. Calibrar primero liga neutra, después estilos/equipos. No ajustar a líderes ni a partidos sueltos.

Objetivo MVP: medias dentro de ±3% y percentiles/distribución de margen razonables frente a referencia completa; FIBA/ACB necesita su propia tabla oficial antes de cerrar calibración. No se fuerza cada partido a terminar cerca de la media: la varianza y las derrotas de favoritos son parte del juego.

### Resultado de calibración fase 2

`node tools/calibrate.js --games 2000 --seed phase2-lock --rules NA-2026-27` produjo 4.000 partidos-equipo con medias dentro de ±3% en todas las métricas objetivo; desviación máxima absoluta 2,57% (FGM). PTS 113,27; FGA 87,44; 3PA 36,26; FTA 23,28; ORB 11,18; DRB 32,81; AST 26,07; STL 8,32; BLK 4,75; TOV 14,49; PF 19,76; posesiones 101,30. FG% 46,76; 3P% 36,71; FT% 78,08; 3PAr 41,46%; FTr 0,266; eFG% 54,37; TS% 57,98. Margen medio 14,02; p10 3; p90 28. FIBA se simuló como perfil propio, pero todavía no tiene tabla objetivo oficial completa; no se declara calibrado FIBA/ACB.

## 10. Pruebas de aceptación

- Determinismo: mismo estado+acciones+semilla → mismo hash en web, WebView y runner; resumen/2D/3D idénticos.
- Reglas: tabla de casos oficiales, incluyendo resets, bonus, bocina, técnicos y revisión.
- Stats: invariantes por partido/temporada/carrera; sin doble conteo de and-one/TL.
- Save: cerrar en acción, TL, timeout, revisión y prórroga; reanudar sin duplicar efectos.
- Calibración: miles de partidos por perfil y prueba de varianza; herramientas no entran en stats de carrera.
- Rendimiento: worker para simulación masiva, main thread libre, 60 fps en vista activa y cero errores de consola en dispositivo de referencia.
