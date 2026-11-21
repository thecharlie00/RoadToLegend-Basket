# Informe 35: lo nuevo del fútbol (noviembre) y refactor del código

## Qué tenía el fútbol que faltaba aquí

Comparado con el repositorio del fútbol a 16 de noviembre de 2026 (versión 5.37).

| Del fútbol | En el básquet |
| --- | --- |
| Jugada Maestra (campaña de 30 jugadas dibujadas y momento clave en la carrera, nunca más de 3 partidos sin una) | Hecho, adaptado a media pista: pases, penetraciones y tiro; triples y zonas reales |
| Temporada Viva (foco de jornada y crónicas) | Hecho: foco en INICIO, dos crónicas por temporada y la temporada en tres momentos; archivo en Historial |
| Trofeos con icono en el historial | Hecho: liga, final, copa, ascenso y premios propios |
| Logros: aviso solo la primera vez en el dispositivo | Hecho |
| Logros en Google Play Juegos | Preparado: falta el ID del proyecto de Play Juegos y el mapa de logros |
| Decisiones condicionales nuevas (events-universo) | 18 decisiones nuevas en 5 idiomas que dependen del estado de la partida |
| Anuncios intersticiales de AdMob con consentimiento UMP | Hecho, solo en transiciones seguras y nunca durante un partido; faltan los IDs reales de AdMob |
| Aviso de versión nueva en Google Play | Hecho (consulta a Google Play, sin servidor propio) |
| Petición de valoración | Hecho: tras 15 minutos de juego, como mucho 3 veces y con 14 días entre una y otra |
| Política de privacidad de la app | `docs/politica-privacidad-app.html` |
| Ligas de Azerbaiyán, tiro libre más permisivo, GOAT LADDER | No aplica (ligas y minijuego del fútbol) o descartado (GOAT LADDER) |

## Jugada Maestra

- `src/match/jugada.js`: motor puro y con semilla. Coordenadas de media pista (1 unidad ≈ 0,15 m), aro, línea de 6,75 m y esquinas.
  - **Pase**: el trazo no puede pasar a menos de 4 unidades de un defensor y el receptor necesita 3 de espacio.
  - **Penetración**: hasta unos 3,5 m; si el trazo pisa a un defensor es falta en ataque. La ayuda sale al balón y deja a alguien libre.
  - **Tiro en la campaña**: sin azar; deciden la defensa más cercana, la zona y el tapón del pívot.
  - **Tiro en partido**: anclado en la probabilidad que el motor daba a ese jugador en esa zona; jugar bien la mejora y forzar la empeora.
- Las 30 jugadas se generaron una vez con `tools/jugada_levels.mjs`. Cada una tiene solución, no se gana con un tiro directo y pide lo que enseña su capítulo.
- **En la carrera** (opción en Ajustes, activada de inicio): una posesión por partido. La primera llega en los tres primeros partidos y nunca pasan más de 3 sin una. «Simular» se detiene en ella; en directo aparece como momento clave.
- El trabajador repite los trazos sobre el tablero sellado y el resultado entra en el motor como una posesión más (canasta, fallo o pérdida), con el acta de estadísticas válida.

## Temporada Viva

`src/domain/viva.js`:

- **Foco de jornada**: lesión propia, bajas en tu quinteto, próximo rival o eliminatoria, con su motivo y un acceso directo. Se oculta si hay una decisión o un directo pendiente.
- **Crónicas**: a mitad de temporada y en el tramo decisivo, el balance del tramo y tus números. Al cerrar la temporada, tres momentos: tu temporada, la competición y una historia (premio, rival o Jugadas Maestras). Todo sale de la propia partida.

## Android

- `PlayServices.java` reúne AdMob con UMP, opciones de privacidad, versión nueva y Play Juegos. `MainActivity` solo los expone a la página.
- `INTERNET` lo usan solo esos SDK nativos; la página del juego sigue sin red.
- Sin IDs propios, debug usa anuncios de prueba y release no muestra anuncios. Ver `android/README.md`.

## Refactor

El comportamiento no cambia: las mismas pruebas pasan antes y después.

- **Interfaz**: `src/ui/app.js` baja de 2.375 a ~440 líneas. Es el armazón: estado, ajustes, guardado, `render()`, ciclo de vida y despacho.
  - 13 vistas en `src/ui/views/`: directo, inicio, YO, liga, Épocas, más, Temporada Viva, Jugada Maestra, ayudas, minijuegos, laboratorio y juice.
  - 8 módulos de acciones en `src/ui/actions/`. La cadena de 85 `if/else` de `action()` es ahora una tabla nombre → función, con el mismo orden: nombres exactos primero y patrones después.
  - Vistas y acciones reciben el contexto `ui`. Funciones y constantes se toman por su nombre y las variables mutables por getter/setter, así que se comparte exactamente el mismo estado que antes.
- **Dominio**: `src/domain/career.js` baja de 1.090 a ~550 líneas. Las partes de vida, mundo, club y lectura (resumen y validación) van a `career-*.js` con el contexto `K`; la API pública `CAA.Career` es la misma.
- **Código muerto**: imports sin usar (RNG, Rules, Hash), funciones de dibujo sin uso, variables sin leer y destructurados innecesarios.
- La separación se hizo con un análisis de ámbitos real (espree + eslint-scope), no con buscar y reemplazar. La herramienta comprueba que ninguna inicialización use un nombre movido antes de tiempo.

## Pruebas

- `npm test`: 185 pruebas. Nuevas: `jugada.test.js` (campaña resoluble y sin azar, reglas, zonas, directo y acta válida), `viva.test.js`, `playstore.test.js` y el test del armazón de Android con la nueva política de red.
- Navegador: nuevo escenario de Jugada Maestra (una jugada de la campaña con gestos reales y el momento clave de una jornada simulada, axe 0).
- El código Java no se ha compilado aquí (sin SDK de Android).
