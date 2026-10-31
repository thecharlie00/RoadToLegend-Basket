# 12 — Fase 6, primera entrega: nombre, replay de carrera y jugadas voxel

**Fecha:** 31-10-2026. **Estado:** implemented for review / implementado para revisión. No es una certificación Android ni el cierre completo de la fase 6.

**Nombre visible exacto:** `Baketball: Road to legend`. Se conserva la grafía indicada por el usuario, incluido `Baketball`.

## 1. Cambios

- Título web, cabecera, Android label, paquete npm y documentación actualizados. El nuevo nombre no hereda el cribado legal del título anterior; sigue pendiente de revisión de marca/tiendas.
- **Compatibilidad:** no cambian `applicationId`, paquete Java, ID de juego del save, base IndexedDB ni schema. Las partidas y exports anteriores siguen siendo válidos. Solo cambian nombre visible y nombre de archivo exportado.
- Nueva vista **Jugada voxel 3D** en Partido, junto a la táctica 2D. Runtime WebGL1 propio, sin Three.js, sin modelos externos y sin solicitudes de red.
- Cancha procedural según dimensiones del rule set; aro a 3,05 m; diez jugadores voxel, balón, tableros y gradas opcionales.
- Dos calidades: **Baja · ahorro** y **Media · gradas**. Cámaras de transmisión y lateral. Geometría agrupada en un draw call por frame.
- Selector de jugadas clave: tapones, triples, robos, canastas y adicionales, momentos clutch y final. Orden cronológico tras priorizar importancia.
- **Carrera → jugar semana → Ver partido de la semana:** la carrera guarda un replay ligero del partido real de su club. Al abrirlo no se vuelve a simular; conserva marcador, box score y hash.
- Descripción textual de cada jugada con jugador, resultado, periodo, reloj y marcador acumulado. La vista 3D no es la única fuente de información.
- Fallback automático a 2D si WebGL no está disponible o se pierde el contexto. Movimiento reducido desactiva reproducción automática y mantiene paso, lista y navegación manual.
- Tablas anchas desplazables horizontalmente en móvil, sin comprimir cada columna a una letra.

## 2. Arquitectura y límites

- `src/render/voxel.js`: selección de jugadas, geometría, rigs, paletas, matrices y renderer. No importa dominio ni decide resultados.
- `src/match/engine.js#replay`: snapshot de presentación con eventos, equipos mínimos, box score y validación. El motor autoritativo no cambia.
- `src/domain/career.js`: almacena `lastMatch` de la semana del club y lo valida al reanudar. El replay es ilustrativo: no reproduce aún todos los desplazamientos tácticos reales de los diez jugadores.
- `src/ui/app.js`: ciclo de vida del renderer, controles, fallback, pausa y reproducción. Al salir de Partido se liberan buffers/programa WebGL.
- Animación de tiro/balón derivada del evento registrado. No es captura de movimiento completa ni un nuevo motor de físicas.
- Sin audio, skins 3D, editor de identidad voxel, celebraciones ni partículas todavía. Android sigue sin compilarse/probarse en dispositivo.

## 3. Pruebas ejecutadas

- `npm run check:browser`: censo OK, build OK, **75/75 tests Node**, **10/10 escenarios Chromium**.
- **12 auditorías axe** WCAG 2 A/AA + 2.1 AA: cero violaciones detectadas en los estados recorridos, incluida la vista voxel móvil.
- Cero errores de consola, excepciones de página, solicitudes HTTP externas y claves de traducción faltantes en los escenarios.
- Tests nuevos: nombre exacto y compatibilidad de save/Android; selección de jugadas determinista y acotada; frames finitos; dimensiones por reglas; presupuesto de cubos; replay de carrera guarda/carga sin reroll; RPC; marcador por prefijo de eventos.
- Navegador: carrera → semana → replay voxel; siguiente jugada clave; solo clave; calidad/cámara; overflow móvil; pérdida de contexto; WebGL ausente; movimiento reducido.
- `git diff --check`: limpio. Fuentes JS y XML revisados. No se ha generado AAB ni ejecutado Gradle.

## 4. Rendimiento medido

Chromium headless 153, escritorio Linux, DPR 1, muestra de 180 intervalos con voxel calidad media en viewport 390×844:

| Métrica | Resultado |
|---|---:|
| Media | 16,666 ms |
| Mediana | 16,7 ms |
| p95 | 16,7 ms |
| Máximo | 16,8 ms |
| FPS medios | 60,00 |
| Intervalos >33,34 ms | 0 |
| Long tasks | 0 |
| Heap JS usado | 60,3 MB |

Calidad baja observada: 200 cubos, 7.200 vértices, 1 draw call. Calidad media añade gradas/detalle y mantiene el presupuesto de 512 cubos. El contador estricto >16,67 ms marca jitter de 16,7/16,8 ms; no son frames perdidos.

**No se afirma 60 fps en Android gama baja.** Falta medir en WebView real, sesión prolongada, temperatura y memoria con otros procesos. La muestra de escritorio solo valida que el camino de render es funcional y barato en este entorno.

## 5. Archivos principales

- `src/render/voxel.js`, `src/ui/app.js`, `src/ui/style.css`
- `src/match/engine.js`, `src/domain/career.js`, `src/worker/handler.js`
- `src/locales/{es,en}.json`, `src/manifest.json`, `tools/build.py`
- `tests/phase6.test.js`, `tools/browser_smoke.mjs`, `data/qa/phase6-browser.json`
- `README.md`, `android/README.md`, `docs/00`, `docs/02`, `docs/05`, `docs/06`

## 6. Assets y siguiente paso

No se necesita ningún modelo externo para esta entrega: todo el voxel es procedural original. Para producción se debe aprobar silueta/paleta y repetir cribado legal del nuevo título. Si se aportan modelos después: escala metros, root en pies, Y arriba, +Z frente, anclajes `hand.L/R`, `head`, `chest`, `ball`, balón ~0,24 m como referencia visual.

Siguiente puerta: probar en Android real y completar captura táctica de desplazamientos/rotaciones para que el replay 3D represente mejor la posesión completa. Después, audio procedural y personalidad voxel visible en carrera/Me. No push ni AAB sin instrucción explícita.
