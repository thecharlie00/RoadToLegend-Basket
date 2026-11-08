# Informe 34: tutorial de primera partida y recordatorios locales

## Tutorial de primera partida

Al empezar la primera carrera (jornada 0), el juego señala la pantalla real paso a paso: un foco ilumina cada elemento y el resto se oscurece, con un bocadillo que explica qué es.

| Paso | Qué señala |
| --- | --- |
| 1. Empieza tu camino | Bienvenida, sin foco |
| 2. Tu momento | Las barras de la temporada (en entrenador: moral, directiva, vestuario…) |
| 3. Decisiones | Las opciones de la decisión pendiente, con su probabilidad (solo si hay una) |
| 4. Juega la jornada | Botones de jugar en directo y simular |
| 5. Yo | Pestaña YO (en entrenador: plantilla, quinteto y táctica) |
| 6. Liga | Pestaña LIGA |
| 7. Más | Pestaña MÁS; recuerda que se puede repetir desde la guía |

- Se puede saltar en cualquier paso, cerrar con Escape o con el botón atrás de Android.
- El foco del teclado queda dentro del bocadillo mientras está abierto; el resto de la pantalla queda inerte.
- Si el elemento está dentro de un desplegable cerrado, se abre para poder señalarlo.
- Solo aparece una vez por dispositivo (`caa.tutorialDone`); sustituye a la tarjeta antigua de «Primeros pasos». La guía tiene el botón «Repetir el tutorial».
- Textos en español, inglés, francés, alemán e italiano; con jugadora, en femenino como el resto.

## Recordatorios locales (solo app Android)

- Ajustes → «Recordatorios», **desactivados por defecto**. Al activarlos se pide el permiso de notificaciones del sistema; si se deniega, el ajuste vuelve a «No» y se explica.
- Al salir del juego se programan como mucho 3 avisos, separados al menos 2 horas, y se cancelan al volver:
  - decisión pendiente (3 h),
  - la mascota te echa de menos (6 h),
  - partido contra el próximo rival, playoffs o «tu temporada continúa» (24 h),
  - «tu camino a la leyenda sigue aquí» (3 días).
- Nunca entre las 21:00 y las 10:00: se mueven a las 10:00.
- Todo ocurre en el móvil: alarmas inexactas de Android, sin red ni servidor. Tras reiniciar el móvil se vuelven a programar.
- En la versión web el ajuste aparece desactivado con la nota «solo en la app de Android».

## Archivos

- `src/platform/reminders.js` (`CAA.Reminders`): plan de avisos y puente con Android.
- `android/.../ReminderReceiver.java`, `MainActivity.java` (puente), `AndroidManifest.xml`, `res/drawable/ic_stat_ball.xml`, `res/values/strings.xml`.
- `src/ui/app.js`: tutorial (`coachSteps`, `renderCoach`, `placeCoach`) y ajuste de recordatorios.
- La guía ya no habla del plan semanal eliminado.

## Pruebas

- `tests/reminders.test.js`: horas de silencio, plan, máximo de 3, separación, carrera terminada, puente opcional y textos en los 5 idiomas.
- Navegador: escenario «First-game tutorial…» (cada paso señala un elemento real y el bocadillo cabe en 390 px, foco atrapado, Escape, no vuelve tras terminar, repetir desde la guía, axe 0; recordatorios con puente Android simulado: permiso, programación al salir, sin avisos nocturnos, cancelación al volver). `ONLY=texto npm run test:browser` ejecuta solo los escenarios que contienen ese texto.
- El código Java está preparado pero no compilado aquí (sin SDK de Android); queda en la prueba en dispositivo real (punto 8 de `android/README.md`).
