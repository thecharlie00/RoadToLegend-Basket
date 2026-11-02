# Informe 22 — Nombres reales y pulido de minijuegos, simulación, mascota y personalización

## Nombres reales (decisión del autor, como en *Camino a la Leyenda*)
- **Ligas, copas y clubes con su nombre real** (`src/domain/real-world.js`): NBA, WNBA, G League, NCAA, Liga Endesa, Primera FEB, Liga Femenina Endesa, Betclic Élite, LBA, BBL, BSL, GBL, LKL, ABA Liga, NBB, LNB, CBA, B.League, KBL, PBA, NBL, BAL… 95 ligas con clubes reales. Sin escudos ni logotipos.
- Donde los clubes no se conocen con seguridad no se inventan falsos «reales»: nombre descriptivo del país («Liga de Bahamas») y clubes con su ciudad («BC Nasáu»).
- Los IDs internos no cambian: las partidas guardadas siguen cargando.
- En la NBA el orden de los equipos respeta las conferencias Este y Oeste de los playoffs.
- **Plantillas versionadas tipo PES** (`src/domain/real-rosters.js`): 78 clubes y 749 jugadores (NBA, Liga Endesa, Euroliga y WNBA) con nombres alterados que se parecen a los reales sin serlo. Plantillas 2025-26 aproximadas; el resto de cada plantilla se genera. Las fuentes con los nombres reales no están en el repositorio.
- Siguen sin aparecer clubes ni jugadores de Israel.

## Minijuegos
- Dificultad fácil, normal y difícil (difícil: zona más estrecha y ×1,5 de recompensa).
- Tres retos semanales (+8 estilo y 500 € cada uno).
- Estadísticas por juego: media y porcentaje de acierto.
- **Fin de semana All-Star** (equivalente a la tanda de penaltis): concurso de triples o de mates contra los tres mejores jugadores reales de tu liga, una vez por temporada, con clasificación y premios.

## Simulación en directo
- Medidor de momentum (últimas 12 canastas).
- Estadísticas comparadas de los dos equipos: tiros de campo, triples, tiros libres, rebotes y pérdidas.
- Parciales por cuarto, todo actualizado en tiempo real.

## Mascota (paridad con pets + pet-sim)
- 10 especies, 4 de ellas exóticas (guacamayo, erizo, fénec y capibara, 5.000 €), con modelo vóxel propio (cuadrúpedo, pequeño, caparazón, pez en pecera y ave).
- Seis necesidades: saciedad, hidratación, limpieza, energía, diversión y cariño.
- Cuidados rápidos semanales (agua, cepillado y mimos) más tres cuidados principales.
- Etapas cría, joven, adulta y senior, con tamaño visible.
- Personalidad: activa, cariñosa, curiosa, independiente o glotona.
- Comida premium y premios, juguetes, accesorios con rareza.
- Cuatro rutas de paseo que se desbloquean con el vínculo.
- Concursos local, comarcal y nacional (corona y medalla).
- Álbum de recuerdos.
- Ayudas ocultas: suelo de necesidades, racha de fallos que facilita el siguiente intento y rivales algo más flojos tras derrotas.

## Personalización
- 14 peinados, 5 barbas y 9 celebraciones.
- Botón «Celebrar»: tu modelo vóxel hace la celebración elegida.
- Caras procedurales para todos los jugadores (`src/render/faces.js`) en la plantilla del entrenador y en el mercado.

## Verificación
- `npm test`: 127/127.
- `npm run test:browser`: 21/21, sin violaciones de accesibilidad.

## Calidad visual al nivel del fútbol (comparación con capturas reales de ambos juegos)
- **Escenas vóxel en las decisiones** (`src/render/scenes.js`): tu personaje dentro de un escenario según el evento. Hay ocho escenarios: despacho, vestuario (con pizarra en las tácticas), pista, sala de prensa, clínica, casa, pista de barrio y viaje.
- **Escudos procedurales** (`src/render/crest.js`): 10 formas y 8 patrones, con colores reales aproximados para los clubes conocidos. Aparecen en la cabecera, la tabla, el partido, la elección de club y el cromo.
- **Cromo del jugador** en «Yo»: bronce, plata, oro o especial según la media, con dorsal, escudo y seis valoraciones.
- **Tabla de liga**: escudos, columna PJ, marcas de playoff y descenso, y nada de saltos de línea en móvil.
- **Marcador de directo** estilo televisión, con escudos y siglas. La tabla de estadísticas ya se ve bien en móvil.
- **Textos**:
  - Ya no quedan nombres de liga antiguos en ninguno de los cinco idiomas, tampoco en las decisiones.
  - La portada cuenta países en vez de «2 mundos».
  - La guía y la bienvenida del modo entrenador ya no hablan de «tu jugador».
  - Las especies de mascota ya no parten la palabra.

## Interfaz simplificada y personaje pulido
- **Franja «ahora»** arriba del inicio: dice siempre qué pasa y qué toca hacer (decisión pendiente, partido en directo, próximo partido, playoffs o fin de temporada).
- **Decisión pendiente**: se muestra sola; el resto de la semana queda en un desplegable.
- **Directo**: solo la franja y el partido.
- **Sin decisión**: se ve el resultado, las ofertas, el último partido, el próximo, el plan de la semana y la temporada; lo demás queda en «Novedades y más».
- **Avisos**: se borran solos a los 4,5 s; los errores se quedan.
- **«Yo»**:
  - Una sola tarjeta: el modelo vóxel sobre una peana con el color de su nivel, con cámara en ligero vaivén (quieta con movimiento reducido), al lado del cromo. Ya no se repiten nombre ni datos.
  - Mascota (si aún no hay), minijuegos, atributos, temporada, entrenamiento, fuera de la pista, tienda, trofeos y prensa quedan plegados con títulos claros.
- **Ilustraciones de decisiones**: encuadre más cercano, con el personaje como protagonista.
- Las pruebas de navegador abren los desplegables antes de pulsar.
