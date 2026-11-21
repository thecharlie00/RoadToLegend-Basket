# Informe 36: Jugada Maestra al estilo de los juegos de jugadas dibujadas

La Jugada Maestra pasa a jugarse como los juegos de fútbol de jugadas dibujadas (del tipo de *Score! Hero*), adaptada al baloncesto. Es una versión propia: no usa su nombre, sus gráficos, sus niveles ni sus textos, y no tiene energía, vidas ni pagos.

## Qué toma del género

| Del género | En la Jugada Maestra |
| --- | --- |
| Modo historia por niveles | 30 jugadas en 5 etapas: instituto, universidad, debut profesional, playoffs y final. Cada etapa abre con un texto de historia y cada jugada con su situación (marcador y segundos) |
| Tres estrellas por nivel | ★ anotar · ★ hacerlo en las acciones justas · ★ objetivo de la etapa: que toquen el balón 3 jugadores, tiro limpio al centro del aro, mate tras pase o sin botar |
| Vista 3D con cámara tras el balón | Pista vóxel con los diez jugadores; la cámara sigue al balón y se acerca y baja en el tiro |
| Dibujar con el dedo sobre la escena | El trazo sale de quien lleva el balón: hasta un compañero es un pase (con curva si la dibujas), hasta el aro es un tiro y a un hueco es una penetración |
| Los compañeros se desmarcan | Tras cada pase, el compañero más libre corta hacia el aro si tiene el camino despejado |
| Apuntar el disparo | Cuanto más cerca del centro del aro acaba el gesto, más limpio es el tiro, y uno limpio perdona algo más de defensa |
| Repetición de la jugada | Botón «Repetición» al terminar |
| Celebración | Grito en pantalla (¡Canasta!, ¡Triple!, ¡Mate!, ¡Tapón!…), cámara lenta en la canasta, red que se mueve y estrellas que aparecen una a una |

## Cómo se juega

- Tarjeta previa con la historia, la situación y las tres estrellas; luego «¡A jugar!».
- **Anillos de ayuda**: dorado para quien lleva el balón, azules discontinuos para los receptores, y en el aro un círculo blanco con el centro dorado del tiro limpio.
- Sigue habiendo botones para pasar, penetrar y tirar (teclado y lector de pantalla), y la pizarra 2D de siempre con «Ver en pizarra 2D». El navegador recuerda la vista elegida.
- **En la carrera**: el momento clave de los partidos usa la misma vista 3D, con las equipaciones de los dos clubes. En partido no hay estrellas: lo que pasa cuenta en el marcador.

## Motor

- El aro está ahora a 1,575 m del fondo, como en la pista real.
- Los cortes, el tiro limpio y el mate tras pase están en el motor (`src/match/jugada.js`), así que el trabajador valida igual lo que se juega en partido.
- Las 30 jugadas se han vuelto a generar (`tools/jugada_levels.mjs`) con estas reglas. Cada una:
  - tiene solución;
  - no se gana con un tiro directo;
  - enseña lo de su etapa;
  - permite la tercera estrella dentro de sus acciones.
- Las medallas guardadas siguen valiendo: ahora cuentan estrellas (0–3).

## Archivos

- `src/ui/jugada-3d.js`: escena 3D, cámara, gestos sobre la escena (de pantalla al plano a la altura del pecho), animaciones, gritos y repetición. La capa 3D vive fuera de `#app`, así que los repintados de la interfaz no la destruyen.
- `src/ui/views/jugada.js`: historia, tarjeta previa, estrellas, alternancia 3D/2D y momento clave.
- `src/match/jugada.js`: estrellas, cortes, tiro limpio y mates.

## Pruebas

- `npm test`: 187 pruebas. En el motor: campaña resoluble con tercera estrella alcanzable, tiro limpio, cortes y mates.
- Navegador: la jugada 1 se juega en 3D con gestos reales hasta conseguir la estrella de la etapa; después repetición, cambio a 2D y vuelta, y el momento clave de una jornada simulada. axe 0.
