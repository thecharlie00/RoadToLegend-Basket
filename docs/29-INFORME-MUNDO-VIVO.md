# 29 · Mundo vivo, sorteo en directo, pizarra táctica y más contenido

Paridad con `world45.js`, `draw.js`, la pizarra del directo y la prensa/redes de *Camino a la Leyenda*.

## Mundo vivo (`src/domain/world.js`, `CAA.LiveWorld`)
- **Torneo de verano**: en cada pretemporada tu club juega un cuadrangular (semifinal, final o tercer puesto) contra un club de tu liga y dos clubes reales de otras ligas del mismo nivel y género. Ganarlo suma estilo y el contador `summerCups`. Tarjeta en el inicio con los cuatro resultados y tus puntos.
- **Copa juvenil**: el jugador de 19 años o menos con menos de 18 minutos de media la disputa al final de la temporada y gana potencial; el entrenador ve a su cantera y puede **subir a la perla** al primer equipo.
- **Día de cierre del mercado** (entrenador): en la semana del 60 % de la liga regular llegan cuatro gangas al 55 % de su traspaso. Un reloj corre de 18:00 a 24:00 y cada oferta se activa a su hora; lo que no se firme antes del cierre se pierde.
- El play-off de ascenso ya existía (`playoffs.js`, formato `eu-promotion`).

## Sorteo de copa en directo
- Los cruces de cuartos se sortean de forma aleatoria y determinista (`seed:cup-draw`). La tarjeta saca las bolas una a una, forma las parejas (1.ª contra 2.ª…) y después muestra los resultados ronda a ronda.

## Pizarra táctica 2D en el directo
- Conmutador 3D / Pizarra 2D. La pista entera en SVG muestra a los diez jugadores en formación de ataque y defensa, el jugador de la jugada resaltado y el balón siguiendo cada acción (tiro por zona, tiro libre, canasta). Las posiciones se animan con transiciones CSS y respetan el movimiento reducido.

## Contenido
- **Prensa**: de 17 a 57 titulares, con prioridad por situación y elección al azar entre los no leídos recientemente.
- **Redes**: 4 cuentas ficticias nuevas (Ojeador Anónimo, Radio Bocina, Peque del Tercer Anfiteatro, Métrica Avanzada) y 32 mensajes más.
- **Decisiones**: de 304 a 321, con condiciones nuevas `summerCup`, `deadline`, `academy` y `cupDraw`.
- Todo en español, inglés, francés, alemán e italiano.

## Pruebas
- `tests/liveworld.test.js`: torneo de verano, día de cierre, sorteo emparejado según las bolas y copa juvenil.
- Navegador: escenario «Living world» (tarjeta del verano, axe y pizarra 2D con diez jugadores).
