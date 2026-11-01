# Informe fase 10 — Tiempo real, tienda, aspecto, Épocas y más ligas

Fecha: 2026-11-01. Encargo de Carlos: "corrige lo que falta, añade más ligas, añade todo el tema de tienda, personalización, eras (1920-2020)… lo que tiene el juego de fútbol adaptado al de básquet", "la simulación tiene que ser a tiempo real, como en la app de fútbol" y "crea también un artifact para probar el juego".

## Qué cambió

1. **Directo en tiempo real** (`src/ui/app.js`), como match41 del fútbol.
   - El reloj corre solo, y marcador, crónica, anotadores y vista 3D avanzan jugada a jugada.
   - Velocidades: ⏸, ×1 (≈2 min por partido), ×2 y ×4. También "Saltar al momento clave" y "Simular hasta el final".
   - Bocina y pausa breve entre periodos.
   - Las decisiones solo aparecen cuando el reloj llega a ellas; mientras tanto, el motor calcula el siguiente tramo sin parar el reloj.
2. **53 ligas**: 37 masculinas y 16 femeninas.
   - Segundas divisiones con ascenso y descenso: Francia, Italia, Alemania, Turquía, Argentina y la femenina española.
   - 16 países nuevos: Polonia, Croacia, Chequia, Bélgica y Países Bajos, Portugal, Hungría, Uruguay, Venezuela, Puerto Rico, Canadá, Nueva Zelanda, Egipto, Marruecos, Indonesia, Taiwán y Líbano.
   - 7 ligas femeninas nuevas.
   - Nombres propios en 16 nacionalidades más, con apellidos femeninos correctos en Polonia y Chequia.
   - Apodos revisados para no coincidir con equipos reales.
3. **Textos en femenino** (`src/core/fem.js`, equivalente a lang-fem).
   - En ligas femeninas y con jugadora: compañeras, veteranas, novatas, capitana, artículos concordados…
   - En inglés, los pronombres de las decisiones que hablan de una jugadora pasan a she/her.
4. **"Europa" solo en Europa**: las decisiones europeas ya no salen en Asia, América, Oceanía o África.
5. **Tienda** (`src/domain/gear.js`, adaptación de gx-items y ui-shop).
   - 12 ranuras de jugador y 8 de entrenador, 41 piezas y 6 tiers (de Común a Leyenda) con mejora pagada.
   - 6 conjuntos con bonus. Requisitos según media, fama, títulos o temporadas.
   - Escaparate semanal con 3 destacados y 2 ofertas al -30 %.
   - Las piezas suman a los atributos de partido con tope (+4 por atributo, +9 en total). No cambian la media.
   - Todo se paga con dinero del juego: sin dinero real ni azar de pago.
6. **Aspecto** (look56): tono de piel, 8 peinados, color de pelo, barba y celebración. Las prendas equipadas se ven en el avatar vóxel.
7. **Modo Épocas 1920-2020** (`src/domain/eras.js`).
   - Eliges década y la carrera avanza con la historia. Las reglas cambian solas, con su noticia:
     - sin reloj de posesión hasta 1956 (FIBA) o 1954 (Norteamérica);
     - sin triple hasta 1984 (FIBA, a 6,25 m) o 1979 (Norteamérica, a 7,24 m);
     - 2×20 hasta el 2000, y la línea a 6,75 m en 2010.
   - Ritmo y acierto de cada época: en los años 20 los marcadores son bajos y apenas se usan triples al principio.
   - Cada liga existe desde un año (fundaciones ficticias, inspiradas).
   - 4 leyendas ficticias por década.
   - 12 decisiones históricas: final al aire libre bajo la lluvia, tiro a una mano, tiro en suspensión, llegada del reloj, balón naranja, primera retransmisión, debut olímpico femenino en 1976, línea de tres en Norteamérica y en FIBA, profesionales en los Juegos, cuartos y 24 s, y analítica.
   - Estética de televisión de cada época (sepia, blanco y negro, color desvaído) y balón marrón antes de 1958.
8. **Artifact para probar el juego**: el juego compilado se publica como página privada y se actualiza en el mismo enlace.

## QA

- `npm test`: **118/118**. `npm run test:browser`: **16/16** escenarios, entre ellos directo en tiempo real y Épocas con tienda y aspecto. 0 errores y **0 violaciones axe**.
- `dist/index.html` ≈ 1,53 MB. Android sincronizado (solo copia). **Sin Gradle, sin AAB, sin push.**

## Pendiente o dudoso

- **Fechas de fundación**: las de las ligas del juego son inventadas. Las fechas de reglas son las publicadas (FIBA y liga norteamericana), simplificadas a nivel de año.
- **Ritmos y porcentajes**: los de cada época son de diseño, calibrados a ojo con marcadores aproximados.
- **Salarios**: los de épocas antiguas no se ajustan a la inflación.
- **Femenino**: cubre la interfaz y las decisiones más comunes. Puede quedar alguna frase masculina suelta.
- **Exportar partida**: dentro del artifact no funciona, porque la plataforma no permite descargas.
- **Fuera de esta fase**: Crea tu club, selecciones nacionales, GOAT Ladder, editor y carrera rápida, y fr/de/it.
