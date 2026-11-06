# 30 · Directo 3D como una retransmisión, animaciones y luz

## Directo 3D (`src/render/livesim.js`, `CAA.LiveSim`)
Paridad con `pitch3d.js` del fútbol: el partido se ve como una retransmisión continua, no como clips sueltos.
- Los diez jugadores se mueven siempre: el base sube el balón botando y el ataque rota entre tres esquemas con pases. La defensa es individual: cada defensor se coloca entre su par y el aro.
- Cada evento del motor se escenifica:
  - **Tiro**: pase del asistente, carrera a la zona del tiro, salto, defensor que puntea y parábola real.
  - **Resultado del tiro**: si entra, la red se mueve y los equipos vuelven a defender. Si falla, el balón rebota en el aro y los pívots van al rebote. Los tapones se escenifican.
  - **Rebote**: salto y recepción.
  - **Robo**: contraataque.
  - **Falta**: silbato; el infractor levanta la mano y el árbitro señala.
  - **Tiros libres**: lanzador en la línea, cajones ocupados y el resto tras el triple.
  - **Salto inicial y final.**
- **Cola con retardo de televisión**: el directo emite unos 20 segundos de partido por segundo real, así que el 3D reproduce cada jugada a ritmo de pista. Si se acumulan jugadas, descarta primero las de relleno y nunca se queda más de cuatro jugadas por detrás. El marcador lo manda siempre el motor.
- **Cámara de televisión** en la banda: sigue el balón con suavidad y se cierra en los tiros.
- **Ambiente**: tres árbitros que siguen la jugada y equipaciones con los colores de cada club (si coinciden, el visitante viste de blanco). Hay banquillos con suplentes, mesa de anotadores, cinco filas de grada en el lado opuesto y el lado de la cámara abierto.
- **Figuras animadas**: zancada con piernas y brazos alternos, postura defensiva, salto, brazos arriba en el tiro y bote con la mano fuerte.

## Animaciones en Yo y en las decisiones
- **Yo**: el avatar respira, balancea los brazos y bota el balón; la cámara se mueve en vaivén.
- **Ilustraciones de las decisiones**: personaje vivo y deriva lenta de cámara. Con movimiento reducido todo queda estático.

## Luz
- Más luz ambiental y menos oclusión por defecto para todos los modelos vóxel (directo, minijuegos, mascota, avatar y escenas). Una curva suave levanta las sombras sin quemar las caras iluminadas.

## Interfaz
- Se quita la tarjeta «Plan de la semana» (entrenar/descansar/familia) y su paso en la guía: la semana se juega o se simula directamente.
