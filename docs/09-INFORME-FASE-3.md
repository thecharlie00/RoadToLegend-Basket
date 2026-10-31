# 09 — Informe de fase 3: carreras MVP

**Fecha:** 31-10-2026. **Estado:** implementado para revisión. **Build:** `dist/index.html`, 245.073 bytes, sha256 `8e726f58fca8…`. **Tests:** 46/46. **Push/AAB:** no realizados.

## Instrucción de nombres aplicada

Solo se generan/alteran **nombres de jugadores**. Los nombres de equipos, clubes y competiciones se mantienen como datos del paquete; el motor no los renombra. `demoTeam` conserva `Home`/`Away` y ahora genera nombres de jugador; los clubes MVP usan nombres ficticios de datos, no modificaciones de nombres reales.

## Cambios

- `src/domain/names.js`: pools de nombres de jugador por nacionalidad, deterministas y sin tocar equipos.
- `src/domain/player.js`: creación de jugador, 25 atributos, OVR por posición, potencial oculto, físico, mano, forma/moral/carga, desarrollo, lesiones, envejecimiento y retiro.
- `src/domain/contracts.js`: contratos, cap/tax/suelo/aprons NA 2026–27, máximos/mínimos, escala rookie provisional marcada `pending`, ofertas EU/NA, buyout, matching simplificado y expiración.
- `src/domain/season.js`: ligas MVP España 1+2 y NA 30, clubes/rosters generados, calendario, simulación por jornada con el motor de fase 2, clasificación, ascensos/descensos y semillas NA.
- `src/domain/draft.js`: lotería de 14 equipos, dos rondas/60 picks, prospectos, no drafteados y oferta parcial.
- `src/domain/career.js`: carrera jugador/entrenador, rutas academia europea/draft/no drafteado, avance semanal, entrenamiento/descanso, lesiones, mercado, cruces con buyout/draft-and-stash, historial, hash y guardado.
- Worker RPC: `career.create`, `career.advance`, `career.sign`, `career.summary`, `career.crossing`, `season.play`, `draft.run`.
- UI: pestaña **Carrera** con creación, avance, entrenamiento/descanso, mercado, cruces, guardado/carga e historial.
- Tests: `tests/domain.test.js`, `tests/career.test.js`.

## Pruebas ejecutadas

- `npm run check`: censo OK, build OK, **46/46 tests**.
- Determinismo de carrera: misma semilla/acciones → mismo hash y resumen.
- Save/resume de carrera mediante sobre checksum; no diverge al reanudar.
- Carrera larga: 70 semanas, dos temporadas, guardado y reanudación.
- Temporada española completa: 34 jornadas, 18 equipos, clasificación cuadrada.
- Ascenso/descenso: 2 clubes bajan y 2 suben.
- Draft: lotería 14, orden 30+30, 60 picks y no drafteados.
- Rutas NA draft/no drafteado y carrera de entrenador.
- Cruce EU→NA con buyout y posibilidad draft-and-stash.
- Simulación manual NA completa: 82 jornadas, 1.230 partidos, lotería y draft.

## Incertidumbres / límites honestos

- Economía NA: cap/tax/aprons verificados; escala rookie, máximos/mínimos exactos, excepciones, dos vías, sign-and-trade y matching por apron siguen `pending` hasta CBA completo.
- Economía EU: presupuestos, cupos y ventanas son propuesta MVP pendiente de reglamento por competición.
- Playoffs NA/ACB completos, premios, All-Star, agentes, prensa y eventos todavía no están implementados.
- No hay 2D, minijuegos, tienda/Me ni audio.
- No se ha medido 60 fps ni consola en navegador/WebView real.
- El censo mundial sigue `partial`: 41 competiciones, 10 verificadas y 31 pendientes.
- FIBA/ACB no está calibrado con tabla objetivo oficial completa.

## Assets que debe aportar o aprobar el usuario

- Ningún asset bloqueante para esta fase.
- Aprobar nombres ficticios de clubes/competiciones y pools de nombres de jugador.
- Fuentes con licencia: Atkinson Hyperlegible Next y Pixelify Sans.
- Audio procedural o samples con licencia para fase 4.
- Para 3D posterior: escala/anclajes ya documentados en fase 2.

## Siguiente paso

Fase 4: presentación MVP — vista táctica 2D, tiros libres/bocina, 100 eventos/50 logros, tienda/Me 2D, prensa, guía y localización es/en completa.
