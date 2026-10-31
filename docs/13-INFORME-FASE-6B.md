# Informe fase 6b — club, avatar, quintetos reales y audio opcional

Fecha: 2026-10-31. Título exacto: **Baketball: Road to legend**.

## Entregado

1. **Creación de carrera con elección real**
   - Selector de club inicial dependiente de la ruta: Ascenso Ibérico (18) o Liga Boreal (30).
   - RPC `career.clubs` devuelve catálogo ligero `{id,name}`; la UI lo cachea por ruta.
   - Arquetipo (7), mano dominante y nombre opcional. `Career.createCareer` valida arquetipo/mano y pasa los datos a `Player.createPlayer`.
   - En ruta draft el club elegido es preferencia: el draft puede reasignar. Se guarda `startingClubId` y el hash de creación registra el `clubId` final.
   - Los nombres de clubes/competiciones no se modifican; `clubCatalog` reutiliza exactamente los mismos nombres que `defaultClubs`.

2. **Replays 3D con los cinco reales en pista**
   - `engine.record` añade `state.lineups[i] = { seq, teams: [[5 ids],[5 ids]] }` en paralelo a `events`.
   - El hash autoritativo sigue calculándose solo con `event/score/clock`; test lo recomputa sin `lineups`.
   - `Match.replay` incluye `lineups`; `Career.validate` los valida si existen (longitud, seq, 5 ids únicos por equipo).
   - `Voxel.frameAt` usa ese quinteto, no `roster.slice(0,5)`. Incluye suplantes que participaron en la jugada y conserva número/posición.
   - Guardados antiguos sin `lineups` siguen válidos y usan fallback seguro.

3. **Identidad voxel visible**
   - `Voxel.avatarGeometry(profile, options)`: 15 cubos, altura/arquetipo/mano/equipo comprado.
   - Cámara `avatar` y `orthoMatrix` propios; canvas en Carrera y Vida.
   - Fallback 2D con colores de equipo si WebGL no está disponible o se pierde el contexto.

4. **Audio procedural opcional**
   - `src/platform/audio.js`: WebAudio con osciladores/ruido filtrado. Señales: click, bounce, swish, rim, whistle, buzzer, success, fail.
   - Desactivado por defecto (`A11Y.DEFAULTS.audio=false`). Se desbloquea con gesto, respeta `settings.audio`, se suspende en `visibilitychange`, `pagehide`, `caa:native-pause` y reanuda en `caa:native-resume`.
   - Sin samples, música, red ni compras. La vibración sigue reservada.

## Build y compatibilidad

- `dist/index.html`: **651603 bytes**.
- SHA-256: `5a309feb0bbe7c584513a4c21ad69f1a6b7d90b80418da724416ec6c7b1cb7dd`.
- Android asset sincronizado: `android/app/src/main/assets/game/index.html`, mismo SHA-256. No se ejecutó Gradle/AAB.
- IDs estables: `game: camino-al-aro`, `Save.GAME`, IDB, `com.caminoalaro.app`, namespaces `CAA/caa.*`.
- Locales: 251 claves es/en, 0 traducciones faltantes en navegador.

## QA

Comando: `npm run check:browser`.

- Censo: OK.
- Node: **80/80**.
- Chromium: **11/11 escenarios**.
- axe: **13 auditorías**, 0 violaciones.
- 0 errores de consola/página, 0 requests externos, 0 traducciones faltantes.
- Quintetos: partido de carrera con 333 eventos y 333 snapshots; los 10 jugadores del frame coinciden con `lineups`.
- Avatar: 15 cubos, 540 vértices, 1 draw call.
- Audio: desactivado por defecto; tras activar y probar, `state=running`, `played=2`; pausa nativa suspende y resume reanuda.
- Rendimiento muestra navegador 390×844 `voxel-balanced`: 180 frames, media 16.851 ms, p95 16.8 ms, max 50 ms, 59.34 fps medios, 1 frame >33.34 ms, 0 long tasks, heap 56.8 MB. No certifica gama baja/WebView.
- Rendimiento `court2d` 1280×900: 180 frames, 60 fps medios, p95 16.7 ms, 0 frames >33.34 ms.
- Se corrigió un flake de diagnóstico: timestamps rAF duplicados ya no reducen el contador de frames válidos.

Evidencia: `data/qa/phase6-browser.json`, `data/qa/phase6b-avatar-screen.png`, `data/qa/phase6-voxel-screen.png`.

## Límites honestos

- La animación voxel ilustra el evento registrado; no es tracking táctico completo ni live decisions.
- El avatar es procedural simple; no hay editor completo de apariencia ni modelos externos.
- Audio sin música ni vibración real.
- Android sigue sin compilar/probar en dispositivo; no hay AAB ni release.
- Nombres inspirados y título pendientes de revisión legal.
- El censo mundial sigue parcial (31/41 pendientes de verificación en la semilla actual).

## Assets que tendría que aportar el usuario

No se requieren assets externos para esta entrega. Todo es procedural/original.

Si más adelante se desea un avatar/modelo externo:
- Formato GLB o voxel grid propio, escala en metros, pivote en suelo entre pies, orientación +Z frente.
- Presupuesto inicial: ≤512 cubos por escena completa; avatar actual 15 cubos.
- Materiales sin texturas con licencia dudosa; confirmar derechos de nombre/imagen.
- Anclas: `root`, `hand.left`, `hand.right`, `head`, `ball`.

## Siguiente paso recomendado

1. Decisiones live simplificadas (timeout/foul/intención) sobre el motor determinista.
2. Táctica 2D más rica y rotación/minutes visibles por jugador.
3. Ampliar censo verificable y generadores por país sin ramas hardcodeadas.
4. Editor de identidad voxel y creación de club.
5. Compilación Android real y perfilado en gama baja cuando se autorice.
