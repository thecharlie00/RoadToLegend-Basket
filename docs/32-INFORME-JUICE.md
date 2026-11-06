# 32 · Juice: respuesta y espectáculo

## Directo
- **Rótulos de televisión** sobre el 3D: ¡TRIPLE!, ¡MATE!, ¡TAPÓN! y ¡ROBO!, con el nombre de quien la hace. Naranja si es tu equipo y azul si es el rival.
- **Sonido por jugada**: red en las canastas, rebote en el aro, silbato en las faltas, ovación en triples y mates, golpe en los tapones.
- **Cámara**: sacudida corta en canastas y tapones. La grada se viene arriba tras cada canasta.
- **Marcador**:
  - Parciales: «Parcial 8-0» con golpe y ovación si es tuyo, sacudida si es del rival.
  - Cambios de líder: destello verde o rojo y «¡Por delante!».
- **Final**: confeti y vibración si ganas.

## Fuera de la pista
- **Decisiones**: el resultado entra con golpe y partículas si sale bien, o con una sacudida si sale mal. Las fichas de efecto aparecen una a una.
- **Mercado**: sonido de monedas y partículas doradas al fichar o vender.
- **Mascota**: corazón flotante y partículas en cada acción.

## Interfaz
- **Botones**: se hunden al pulsarlos y brillan al pasar el ratón; las opciones de decisión tienen un reflejo al pasar por encima.
- **Pestañas**: las tarjetas entran escalonadas al cambiar (solo movimiento, sin transparencia, para no afectar al contraste).
- **Barras y avisos**: las barras se llenan con transición y los avisos entran con rebote.
- **Movimiento reducido**: todo lo anterior se desactiva.

## Corrección
- La capa de partículas heredaba la regla global de `canvas` (fondo oscuro y 640 px de ancho máximo). Tras el primer efecto quedaba un panel oscuro sobre media pantalla. Ahora es transparente y ocupa toda la pantalla.
