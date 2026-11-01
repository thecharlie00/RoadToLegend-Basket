# Informe — Todas las ligas del baloncesto mundial

Fecha: 2026-11-01. Encargo de Carlos: "Añade todas las ligas que existan de basketball, todas".

## Qué hay ahora

- **224 ligas en 148 países** de las cinco zonas FIBA: 156 masculinas y 68 femeninas.
  - Cada país con competición nacional de baloncesto tiene su liga: Europa (Rusia, Israel, Eslovenia, Letonia, Finlandia, Reino Unido, Ucrania, Rumanía, los Balcanes, los nórdicos, los microestados…), América (Caribe, Centroamérica, Andes y Cono Sur), Asia (Golfo, Irán, Asia Central, Sudeste Asiático, subcontinente indio), Oceanía (liga del Pacífico) y África (más de 30 países, además de la liga panafricana).
  - Femeninas donde hay liga profesional o semiprofesional.
  - Norteamérica suma la **Liga Universitaria** (masculina y femenina, con reglas universitarias de 2×20 y 30 s) y la **Liga de Desarrollo**.
  - Se mantienen las 6 pirámides con ascenso y descenso (España masculina y femenina, Francia, Italia, Alemania, Turquía y Argentina).
- **Sin marcas**: todo es ficticio. Ciudades reales, nombres de liga inventados (Liga del Volga, Liga de la Teranga, Liga Quisqueyana…) y apodos de club generados sin repetir dentro de cada liga.
- **Nombres de jugadores realistas**: 15 familias de nombres nuevas (rusa, nórdica, finesa, rumana, persa, israelí, india, tailandesa, vietnamita, georgiana, albanesa, África central, África oriental, lusófona y británica). Cada país usa la de su región, con apellidos femeninos en ruso.
- **Selecciones**: fuerza para más de 130 selecciones masculinas y femeninas. Los torneos continentales usan el continente real de cada país.
- **Selector en dos pasos**: primero el país (por continente) y luego su liga, en la creación de carrera y al pedir ofertas. Los campeones del mundo se agrupan por continente en desplegables.

## QA

- `npm test`: **123/123**, entre ellas una que crea temporada en las 224 ligas y otra que juega temporadas completas en una liga nacional nueva y en la universitaria femenina.
- `npm run test:browser`: **20/20**, 0 errores, **0 violaciones axe**.
- `dist/index.html` ≈ 1,84 MB. Android sincronizado (solo copia). **Sin Gradle, sin AAB, sin push.**

## Límites y datos dudosos

- **Una liga por país**: en la mayoría de países es solo la primera división. Las divisiones regionales y amateurs (miles en el mundo) no están.
- **Fuerza, presupuesto y fundación**: la fuerza y el presupuesto de cada liga son de diseño. En el modo Épocas, los países nuevos usan una fecha de fundación genérica (1950 masculina, 1975 femenina).
- **Apodos genéricos**: alguna combinación de ciudad y apodo podría parecerse por casualidad a un club real. Si detectas alguna, se cambia en el catálogo (`leagues-world.js`).
- **Competiciones de clubes continentales**: no están (copas europeas, africana, asiática…). Pueden añadirse como torneo ficticio entre campeones.
