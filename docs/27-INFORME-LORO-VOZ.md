# Informe 27 — El loro repite tu voz

Fecha: 2026-11-02 · Rama: `arena/08e3b10a-roadtolegend-basket`

## Qué pedía el jugador

«El loro tiene que tener la función de que el usuario hable y él repita lo que ha dicho el usuario con
voz distorsionada.»

## Cómo se juega

En **YO → mascota → Cuidar**, si tu mascota es un loro aparece la **Clase de habla**:

1. **Grabar**: pide el micrófono y graba hasta 4 segundos. El icono rojo parpadea mientras escucha.
2. **Parar** (o esperar a que se acabe el tiempo): recorta el silencio de delante y de detrás,
   normaliza el volumen y **el loro repite tu frase automáticamente** con su voz.
3. **Que lo repita**: vuelve a escucharlo cuando quieras (sin volver a grabar).
4. **Borrar**: descarta la toma. El audio se destruye al salir de la pantalla, al cambiar de pestaña
   y al suspender la app.

La primera vez de cada semana el jugador gana **vínculo +3, diversión +12 y cariño +10**, y la toma
queda en el álbum («Habló por el loro»). Las veces siguientes se puede seguir repitiendo, pero no da
más recompensa. Es un cuidado con reglas por especie (`speak`), así que otras mascotas no lo tienen:
al perro, al gato o al pez no se les puede enseñar a hablar.

## Cómo suena: la cadena de distorsión

No hay archivos de audio ni modelos: todo es Web Audio en el dispositivo.

| Etapa | Ajuste | Para qué |
| --- | --- | --- |
| Velocidad | `playbackRate` 1,5 con una pequeña rampa | el loro habla más rápido |
| Vibrato | oscilador de 11 Hz modulando la velocidad (±0,06) | el temblor de las aves |
| Paso alto | 300 Hz | quita el retumbe de la sala |
| Saturación | `WaveShaper` con `tanh(4x)` normalizada | voz rasposa, no un simple eco |
| Banda + formante | paso de banda a 1,5 kHz y pico de +9 dB a 2,7 kHz | timbre de loro, no de persona |
| Modulación en anillo | cuadrado a 52 Hz sobre la ganancia | el «kraa» metálico |
| Eco | delay de 160 ms con realimentación 0,24 | sensación de jaula |

El resultado es la **voz del jugador**, reconocible, pero con timbre, velocidad y textura de loro. La
curva de saturación está acotada a ±1 y es monótona (probado), así que no puede pinchar el oído ni
romper el audio del juego. El volumen de salida es 0,85 × 0,18 del bus general.

## Privacidad y permisos

- El audio **no sale del dispositivo**: se graba con `MediaRecorder`, se decodifica en memoria y no se
  guarda ni en la partida ni en IndexedDB. No hay red (`connect-src 'none'` en la CSP).
- El micrófono **solo se abre al pulsar Grabar**, y las pistas se cierran al parar (el indicador del
  sistema desaparece). Al cambiar de pestaña, suspender la app o cerrar la vista, se libera.
- Si el jugador deniega el permiso, el panel lo explica con texto y abre un **plan B**: escribir una
  frase y que el loro la lea con la **voz del sistema** (`speechSynthesis`, tono 1,85 y ritmo 1,15).
- En **Android** se añadió el permiso `RECORD_AUDIO`, que **solo** se pide en tiempo de ejecución al
  pulsar Grabar (`WebChromeClient.onPermissionRequest` + `onRequestPermissionsResult`) y que solo
  concede `RESOURCE_AUDIO_CAPTURE`; cualquier otro recurso se deniega. Sigue sin haber `INTERNET`.
- No hay micrófono en escritorio sin permisos ni en navegadores viejos: el módulo dice
  `unsupported` y la interfaz ofrece el plan B, sin romper nada.

## Arquitectura

- `src/platform/parrot.js` (nuevo, módulo `parrot` del manifiesto, solo interfaz):
  `supported`, `start`, `finish`, `say`, `sayText`, `stop`, `forget`, `dispose`, `info`, `subscribe`
  y las utilidades puras `trimChannel`, `peak` y `curve`. Estados: `idle → recording → ready → playing`.
- `src/domain/pet.js`: cuidado `speak` (solo loro) y `Pet.speak(state)` con la recompensa semanal.
- `src/domain/career.js`: operación `speak` en `petOp`, así que pasa por el worker y por el guardado
  como cualquier otra acción.
- `src/ui/app.js`: panel `#parrot`, `paintParrot()` que actualiza **solo el panel** (un `render()`
  completo cortaría la grabación o la reproducción), y limpieza al cambiar de pestaña o suspender.
- Locales: **30 claves nuevas × 5 idiomas** (incluidos los seis errores posibles).
- Estilos: bloque `.parrot` con indicador de grabación y respeto a `prefers-reduced-motion`.

## Pruebas

| Comprobación | Resultado |
| --- | --- |
| `npm test` | **154/154** (6 nuevas en `tests/phase13-parrot.test.js`) |
| Recorte de silencio | 2 s de señal con 0,5 s de voz → 0,5–0,7 s útiles, pico normalizado a 0,92 |
| Curva de distorsión | acotada ±1, monótona, cruza cero en el centro |
| Sin micrófono | `supported() === false`, `start()` rechaza con `unsupported`, `say()` con `empty`, sin excepciones sueltas |
| Recompensa | +vínculo, +diversión, +cariño, memoria en el álbum una sola vez; se renueva a la semana siguiente |
| `npm run test:browser` | **24/24** escenarios (2 nuevos de loro). Con micrófono sintético (Chrome `--use-fake-device-for-media-stream`): graba, recorta ~0,7–1,1 s, repite sola al parar, «Que lo repita» vuelve a sonar, vínculo 10 → 13, álbum `adopted, speak`, axe 0 y 0 px de desbordamiento a 360 px |
| Permiso denegado | mensaje propio, panel de texto abierto y recompensa por la vía escrita |
| Build | `dist/index.html` de **3.317.473 B** con `npm run build`; `npm run android:sync` sin errores |

## Activos que debe aportar el jugador (opcional)

No hace falta nada: la distorsión es procedural. Si algún día se quiere una voz de loro pregrabada,
haría falta un banco de 6–10 frases cortas (OGG/Opus mono 48 kHz, < 60 KB) **con licencia propia**, y
una versión del juego que las mezcle con la toma del jugador. No se ha hecho porque el juego promete
audio original y cero archivos externos.

## Limitaciones conocidas

- La toma dura como máximo 4 segundos (límite del recorte); frases más largas se cortan.
- La reproducción depende del `AudioContext`: si el navegador lo tiene suspendido, el primer toque lo
  reanuda (igual que el resto del audio del juego).
- `speechSynthesis` cambia mucho entre sistemas: el plan B suena distinto en cada móvil, aunque el
  loro distorsiona la toma grabada de forma idéntica en todos.
- No se guarda la toma entre sesiones ni se comparte: es una clase de habla en vivo.
- Sin prueba en un Android real (no hay SDK en este entorno): el permiso y el `PermissionRequest` del
  WebView están preparados, pero quedan en la lista de comprobación del dispositivo.
