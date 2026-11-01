# Informe — Ligas de todo el mundo, masculinas y femeninas

Fecha: 2026-11-01. Encargo de Carlos: "Añade ligas de todo el mundo, femenino y masculino".

## Qué hay

**28 ligas jugables** (`src/domain/leagues.js`). Todas son ficticias: nombres de liga y apodos de club inventados sobre ciudades reales, sin marcas ni logotipos. Se revisaron los apodos para no traducir nombres de clubes, selecciones ni patrocinadores reales.

| Continente | Masculinas | Femeninas |
|---|---|---|
| Europa | Liga Ibérica + Ascenso Ibérico, Ligue Hexagone (FR), Lega Penisola (IT), Rhein Liga (DE), Liga del Bósforo (TR), Liga Egea (GR), Liga Báltica (LT), Liga Adriática (RS) | Ibérica, Hexagone, Penisola y Bósforo femeninas |
| América | Liga Boreal (NA), Liga Pampa (AR), Liga Atlântica (BR), Liga del Sol (MX) | Liga Boreal Femenina, Liga Atlântica Feminina |
| Asia | Liga del Dragón (CN), Liga Sakura (JP), Liga Han (KR), Liga Archipiélago (PH) | Dragón y Sakura femeninas |
| Oceanía | Liga Austral (AU) | Liga Austral Femenina |
| África | Liga Sabana (panafricana) | — |

- Cada liga tiene su nivel, presupuesto, nacionalidades en plantilla y jerarquía de clubes (las primeras ciudades son las potencias). Hay calendario de 26 a 38 jornadas y playoff de 8.
- **Jugadora o jugador** desde el primer paso del asistente. El entrenador elige categoría masculina o femenina. Nombres femeninos para 21 nacionalidades (con apellidos femeninos en Lituania y Grecia) y nuevas nacionalidades: Nigeria, Senegal y México.
- **Camino "Ligas del mundo"**: eliges liga agrupada por continente y luego tu club.
- **Traspasos internacionales reales**. Al final de temporada llegan ofertas de otras ligas según tu nivel, y en LIGA puedes pedir una oferta a cualquier liga de tu categoría.
  - Si firmas antes del primer partido, el traspaso es inmediato. Si no, se hace efectivo en verano.
  - Nunca se mezclan categorías.
  - Al entrar o salir de España se mantienen enlazadas las dos divisiones con ascensos.
- **Campeones del mundo**: tarjeta en LIGA con los campeones de todas las demás ligas, por continente (simulación ligera).
- **Relevo con hija**: ya puede tomar el relevo. Empieza en la liga femenina de su país, o en la Ibérica femenina si su país no tiene.
- Avatar vóxel con coleta en carreras femeninas (ficha y pista).
- Arreglado: el botón "Firmar" siempre firmaba la primera oferta de la lista.

## QA

- `npm test`: **111/111** (6 pruebas nuevas). Cubren el catálogo completo y sin marcas reales, las ligas femeninas, una temporada completa en Oceanía, traspasos inmediatos y diferidos, la entrada en la pirámide española y el relevo con hija.
- `npm run test:browser`: **15/15** escenarios. El nuevo crea una jugadora en Japón, pide oferta en Australia y firma. 0 errores, 0 peticiones externas, **0 violaciones axe**.
- `dist/index.html` ≈ 1,36 MB. Android sincronizado (solo copia). **Sin Gradle, sin AAB, sin push.**

## Pendiente o dudoso

- **Textos en femenino**: menús y decisiones siguen en masculino ("conoce a tu jugador", "el novato"…). Es el bloque lang-fem pendiente; conviene hacerlo de una vez sobre todo el contenido.
- Varias decisiones narrativas hablan de "Europa" aunque juegues en Asia o América.
- Solo España tiene dos divisiones con ascensos; el resto son ligas de una división.
- La fuerza relativa entre ligas (masculinas y femeninas por separado) es de diseño y ajustable en `leagues.js`.
- No hay competiciones continentales ni selecciones (nat31): sería el paso natural siguiente.
