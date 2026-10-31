# Informe fase 7 — partido en directo con decisiones clave (fase f del brief, paridad match41)

Fecha: 2026-11-01. Título: **Baketball: Road to legend**.

## Entregado

1. **Módulo `src/match/live.js`**: el motor de posesiones avanza hasta un momento clave, se detiene y el usuario decide. Es determinista: misma semilla y mismas decisiones dan el mismo partido. La opción por defecto de cada momento no toca el motor, así que un directo "sin intervenir" reproduce **exactamente** el hash de la simulación normal (test FIBA y NA).

| Momento | Modo | Opciones | Efecto real en el motor |
|---|---|---|---|
| El rival se escapa (parcial ≥ 8-0) | Entrenador | Tiempo muerto / Presión a toda pista / Aguantar | TM: −1 tiempo muerto, −0,12 fatiga de la plantilla y evento grabado. Presión: `press` 0,55 y más ayudas (más robos, más faltas). |
| Problemas de faltas (límite − 2, antes del último cuarto) | Ambos (en jugador, solo el tuyo) | Banquillo hasta el final / Que siga | Banquillo: peso de rotación ×0,03 hasta el último periodo. Si sigue y acaba eliminado: −2 de confianza y −2 de moral. |
| Últimos minutos (≤ 3:00, ±8) | Entrenador | Atacar el aro / Tirar de tres / Gastar reloj / Mantener | Cambia `insideRate`, `threeRate` y `pace` de verdad. |
| Paso adelante (≤ 3:00, ±8) | Jugador | Pedir el balón / Jugar para el equipo | Pedir: eres el tirador en tus 3 siguientes ataques. |
| Última posesión (≤ 24 s, perdiendo por 0–3) | Ambos | Jugármela (o jugada para la estrella) / Pasarla / Que fluya | Fija el tirador y la zona: triple si pierdes por 3, aro si no. El elegido sale a pista. |
| Falta para parar el reloj (≤ 40 s, perdiendo por 1–6, balón rival) | Entrenador | Falta táctica / Defender | Falta intencional nueva en el motor sobre el peor tirador de libres, con bonus real del reglamento. Máximo 4 por partido. |

En simulación de muestra salen de 3 a 4 momentos por partido, pensado para sesiones cortas en móvil.

2. **Consecuencias en la carrera**
   - El resultado del directo es el **resultado oficial** de la jornada: `Season.playRound(..., overrides)` y `applyGameResult` comparten el mismo camino que la simulación.
   - Jugador: moral, `confidence` (−8..+8, suma al atributo clutch en cada partido) y `coachTrust`. Con 75 o más de confianza del entrenador entras en el quinteto inicial.
   - Entrenador: moral y confianza de la directiva (±).
   - Bandeja de entrada (`live`), contadores `life.counters.live` y `clutchMakes` (listos para logros de la fase h) y evento en el hash de carrera.
   - Se puede guardar a mitad de partido; `Career.validate` comprueba el estado `live`.

3. **UI** (pestaña Carrera): botón **Jugar en directo**, marcador con periodo, reloj y tiempos muertos, tarjeta de decisión, **Seguir hasta el próximo momento clave**, **Simular hasta el final**, jugada a jugada enfocable y máximos anotadores. Al terminar se muestran victoria o derrota y las consecuencias, con el botón **Cerrar la semana**. Audio opcional con silbato en cada momento clave. Textos en es/en (309 claves cada uno).

## Archivos

Nuevos: `src/match/live.js`, `tests/phase7.test.js`, `data/qa/phase7-live-screen.png`.
Tocados: `src/match/engine.js` (ganchos `team.live`: banquillo, intención de tiro, falta intencional, `recordEvent`/`consume`), `src/domain/season.js`, `src/domain/player.js`, `src/domain/career.js`, `src/worker/handler.js` (RPC `career.live`), `src/ui/app.js`, `src/ui/style.css`, locales, `src/manifest.json` y `tools/browser_smoke.mjs`.

## QA

- `npm run check`: censo OK, build OK, **86/86** tests Node (6 nuevos: paridad directo = simulación, determinismo, validez de box en 80 partidos con decisiones, ganchos del motor, integración con la carrera y guardado a mitad, consecuencias y RPC).
- `npm run test:browser`: **12/12** escenarios (nuevo: carrera de entrenador → directo → decisiones → resultado oficial), **14** auditorías axe con 0 violaciones, 0 errores de consola o página, 0 requests externos y 0 traducciones faltantes. Muestra de rendimiento de navegador: 60 fps medios en `court2d` (no certifica gama baja).
- `dist/index.html`: 708366 bytes, SHA-256 `1396fff0de851a238841bcffe5a6aad2efebe3bf5502cb7f604d03fa72442f27`. El asset de Android está sincronizado con el mismo hash. **No se ha ejecutado Gradle ni AAB.**

## Datos dudosos y límites

- Umbrales de los momentos (parcial de 8-0, 3:00, 24 s, 40 s) y efectos (−0,12 de fatiga por tiempo muerto, +4 de confianza por canasta ganadora) son de diseño: ajustables en `live.js`, sin referencia oficial.
- En carrera de jugador, el desarrollo semanal se aplica después de jugar en directo. El partido usa la plantilla tal como estaba al saltar a la pista. En entrenador, la paridad con la simulación es exacta (test).
- La revisión de vídeo (challenge) y la pizarra de último segundo con jugadas dibujadas siguen pendientes; el directo cubre tiempo muerto, cambio, última jugada, falta táctica y jugársela o pasarla.

## Assets necesarios

Ninguno.

## Paridad con "Camino a la Leyenda" (estado tras la fase 7)

| Fútbol | Baloncesto | Estado |
|---|---|---|
| engine-core / build / save56 / i18n | Motor de posesiones, builder, guardado versionado | Hecho (es/en) |
| match41 partido en directo | `live.js` + panel de Carrera | **Hecho (fase 7)** |
| pitch / pitch3d / vox-core / view3d | Cancha 2D + jugadas vóxel 3D | Hecho (sin red deformable ni público con instancing) |
| engine-player / engine-manager | Carrera jugador / entrenador MVP | Parcial: falta táctica completa, staff y despacho |
| engine-market / market26 / draft | Contratos, draft, mercado y cruces | Parcial: falta tope salarial completo y traspasos |
| minigame / shootout / sp-* | Tiro libre y bocina | Parcial: faltan triples, mates, habilidades, defensa, 1×1 y All-Star |
| events* / press-* / achieve / ach36 | 100 eventos, prensa, 50 logros | Parcial (objetivo: 300 eventos y 150 logros + platino) |
| gx-* / ui-shop / ui-yo3d | Tienda y avatar vóxel | Parcial: equipamiento visible limitado; falta la zona «Yo» del entrenador |
| life | Vida (efectivo, estilo, equipamiento) | Parcial: agente, patrocinio e inversiones pendientes |
| week29 / chal32 / story33 | Semana de trabajo, desafíos, vestuario | Pendiente |
| club30 / nat31 / world45 | Crea tu club, selecciones, mundo vivo | Pendiente (ascensos y descensos básicos hechos) |
| blp47 | Protección contra malas rachas | Pendiente |
| pets / pet-* | Mascota | Pendiente |
| dyn46 / fam48 | Dinastías y Familia | Pendiente |
| edit35 | Editor y carrera rápida | Pendiente |
| goat / ui-goat + worker | GOAT Ladder | Pendiente |
| eras-core / ui-eras | Épocas | Pendiente |
| lang-* / lang-fem | fr/de/it + textos femeninos | Pendiente |
| web pública / workflows | Web multilingüe, Actions | Pendiente |

## Siguiente paso recomendado

Fase g del brief: **minijuegos y All-Star**, con concurso de triples, mates y habilidades, defensa (robo y tapón), 1×1 de calle y fin de semana All-Star en el calendario. La última posesión del directo puede enlazar con el minijuego de bocina ya existente (resultado con timing en lugar de tirada). Después, fase h: subir a 300 eventos y 150 logros, usando ya los contadores `live` y `clutchMakes`.
