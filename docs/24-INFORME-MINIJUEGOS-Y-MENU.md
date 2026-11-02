# Informe 24 — Minijuegos distintos y menú en calma

Fecha: 2026-11-02 · Rama: `arena/08e3b10a-roadtolegend-basket`

## Qué pedía el jugador

1. Los seis minijuegos debían **ser distintos** y **sentirse bien**.
2. El menú debía **dejar de agobiar**.

## Diagnóstico (antes del cambio)

Los seis minijuegos compartían un único medidor triangular y una única regla: *"suelta cuando el cursor
esté en la zona verde"*. Cambiaban el número de rondas, el ancho de la zona y el texto, pero la mano
hacía siempre el mismo gesto. `minigames.js` (tiro libre / bocina de un solo tiro) era una API aparte
que el bucle arcade ni siquiera usaba.

En el menú: portada con dos botones grandes + dos filas + un GOAT deshabilitado + una nota de "próxima
versión"; cinco tarjetas de modo en una sola lista; y una pestaña «Más» con **14 filas** en tres grupos.

## Minijuegos: seis mecánicas, no seis pieles

El motor (`src/match/arcade.js`) sigue siendo puro y determinista (`roundSpec → cursorAt → quality →
resolveRound → play`), con semilla `:easy|:hard`, ticks a 60 Hz y `autoTicks` accesible. Lo que cambia
es **cómo se genera la calidad**.

| Juego | Entrada | Lo que se siente | Fin de partida |
| --- | --- | --- | --- |
| Tiro libre | Barra vertical de **potencia** que rebota | Ritmo suave, 10 tiros | 10 tiros |
| Concurso de triples | **Bandeja** que barre una sola vez por tiro, 5 racks de 5 | Cadencia de concurso real; el 5.º balón vale 2 | 25 tiros |
| Tiro final | **Fuerza que sube una vez** y llega arriba con la bocina | Presión: si pasas la línea roja, el tiro no vale | 5 tiros (3 pts) |
| Concurso de mates | **Tres tiempos por mate** (1·2·3) y jueces 5–10 | Música: encadenar los tres tiempos sube la nota | 2 mates |
| Defensa | **No hay cursor**: el rival arranca y tienes ~0,3 s | Reflejos: adelantarte puntúa 0, llegar tarde también | 8 paradas |
| 1×1 de calle | **Calle de 3 carriles**: el defensor se inclina; atacas el lado libre y cubres el suyo | Lectura + ejecución, posesiones alternas | primero a 7 |

Detalles de diseño:

- **Bocina**: la fuerza sube una sola vez (`cursorAt = progreso`) y el mejor instante está al 88 % del
  recorrido. El intento caduca solo en la bocina (`deadlineTicks`), también en el tiro final del partido
  en directo (usa el mismo `roundSpec('buzzer', …)`).
- **Defensa**: calidad 0 antes del estímulo (`cueTick`), 1 en el instante exacto y decae en la ventana
  de reacción. Hay aviso táctil + sonido en el instante del estímulo.
- **1×1**: ataque y defensa de la misma posesión comparten la inclinación del defensor (misma semilla),
  así que el lado que atacas y el que cubres son coherentes; el marcador es posesión a posesión.
- **Mates**: cada mate son tres tiempos; los jueces puntúan 5–10 y el total de dos mates se suma con
  bonus de ritmo (+3 si los tres tiempos van por encima de 0,7).
- **Triples**: la barrida acelera por rack y el quinto balón vale doble (30 puntos posibles).
- **Auto** (accesibilidad): sigue eligiendo el tick más cercano a calidad 0,6 para que valga igual en las
  seis mecánicas, y nunca llega a perfecto.

## Render: que se reconozca de un vistazo

`src/render/arcade2d.js` dibuja un medidor distinto por mecánica: barra con cursor y halo, bandeja con
los cinco balones del rack, reloj que se llena y cuenta atrás 24→00 con línea roja, tres pips de ritmo,
anillo de reacción **sin cursor** (con barra lateral que se vacía) y calle de tres carriles con flecha
de peso del defensor. Todos los textos salen de claves de idioma (×5). La escena gana cinta LED, cancha
más grande, estela del balón, destello radial al acertar y un balón que bota a la cadera en el tiro libre
para no tapar la cabeza del jugador.

## Menú en calma

- **Portada**: título, arte, tres cifras del censo y **dos acciones** (Continuar / Nueva partida) más dos
  mosaicos (Ajustes, Más). Se retiró el GOAT deshabilitado con su nota y la fila redundante de partidas.
- **Modos**: solo tres tarjetas (Jugador, Entrenador, Crea tu club). Eras y Retos viven en un
  `<details>` «Más modos»: siguen accesibles, no compiten en la primera decisión.
- **Más**: una sola tarjeta con «Simular temporada» y ocho mosaicos en dos grupos (Tu club / Sistema).
  Las 14 filas anteriores se reducen a 9 objetivos táctiles, cada uno con icono propio.
- **Minijuegos** (pestaña Yo): cada juego es una fila con icono, nombre, récord y un botón de jugar
  (icono de balón) + un botón AUTO discreto. La descripción larga se queda en la ayuda y en el
  `aria-label`.

## Verificación

- `npm run validate:world` → 41 competiciones OK.
- `npm test` → **139/139** (7 pruebas nuevas de mecánicas, 1 de render 2D).
- `npm run test:browser` → **21/21**, 0 errores de consola, 0 de página, 0 peticiones externas,
  0 violaciones axe, 0 claves de idioma ausentes.
- `npm run build` → 3 225 915 B (`2d8c430e059d`), sin recursos externos (CSP intacta).
- Idiomas: **1466 claves ×5** (21 nuevas: ayudas por mecánica, chips, textos de medidor, «Más modos»).
- Capturas revisadas a 390×844: portada, modos, Más, lista de minijuegos y los seis medidores.

## Límites honestos

- La sensación se ha validado en escritorio headless y con capturas de móvil emulado; **no** hay
  certificación de dispositivo de gama baja (el muestreo vóxel del laboratorio sigue ≈9 fps en CI).
- Las animaciones de medidor respetan `prefers-reduced-motion` (sin *hit-stop* ni destellos largos),
  pero el pulso de reacción de defensa no se puede "reducir" sin romper la mecánica: se mantiene.
