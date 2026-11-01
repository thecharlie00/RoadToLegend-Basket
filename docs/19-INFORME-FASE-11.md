# Informe fase 11 — Crea tu club, selecciones, copa, desafíos, editor e idiomas

Fecha: 2026-11-01. Encargo de Carlos: "Continúa para tener todo completo" (sin el GOAT Ladder de momento).

## Qué cambió

1. **Crea tu club** (`src/domain/finance.js`, equivalente a club30). Fundas el club con nombre, siglas y colores, y ocupas la plaza más modesta de la liga elegida.
   - Finanzas semanales: taquilla (según aforo, precio, afición y resultados), televisión, patrocinio, sueldos y mantenimiento.
   - Precio de entradas: populares, normales o caras.
   - Cuatro instalaciones con 5 niveles: pabellón (aforo), ciudad deportiva (progreso de los jóvenes), cantera (canteranos cada verano) y servicios médicos.
   - La directiva fija un objetivo y emite un informe; también hay avisos de juego limpio financiero.
   - Las finanzas también están activas en las carreras de entrenador normales.
2. **Selecciones nacionales** (`src/domain/national.js`, equivalente a nat31).
   - Te convocan según tu media y la fuerza de tu país, en 38 selecciones masculinas y femeninas.
   - Dos ventanas internacionales por temporada.
   - Torneo de verano: Campeonato continental, Mundial o Juegos de Verano, con grupos, cuartos, semis, final y bronce, y medallas.
   - Respeta las fechas históricas en el modo Épocas: Juegos desde 1936 (femenino desde 1976) y Mundial desde 1950 (femenino desde 1953).
3. **Copa** (`src/domain/cup.js`): a mitad de liga, los 8 primeros juegan cuartos, semis y final a partido único.
4. **Desafíos** con medallas: Salvar al colista, Club en crisis, Recién llegado y Sin estrellas.
5. **Editor**: nombres de clubes y de liga, guardados en la partida. **Carrera rápida**: la partida termina tras 10 temporadas. **Simular temporada**: el resto de la temporada de una vez.
6. **Fallo de fondo corregido**: en carreras largas las plantillas se quedaban sin jugadores. Ahora cada verano hay relevo de jóvenes.
7. **Idiomas**: francés, alemán e italiano en toda la interfaz (1.232 textos por idioma), con selector en el arranque y en Ajustes.
8. **13 trofeos nuevos** (220 en total): copas, medallas, instalaciones, desafíos y equipamiento.

## QA

- `npm test`: **121/121**. `npm run test:browser`: **20/20** escenarios, entre ellos club, desafío, editor, temporada simulada con copa y selección, y uno por idioma sin textos sin traducir. 0 errores y **0 violaciones axe**.
- `dist/index.html` ≈ 1,78 MB. Android sincronizado (solo copia). **Sin Gradle, sin AAB, sin push.**

## Pendiente

- **Contenido narrativo en fr/de/it**: decisiones, prensa y trofeos (~46.000 caracteres por idioma) se muestran en inglés en esos tres idiomas.
- **Fuerza de las selecciones y economía**: los valores de las selecciones y de la economía del club son de diseño y ajustables.
- **Torneos de selecciones**: se resuelven con una simulación ligera por fuerza, no con el motor de posesiones.
- **GOAT Ladder**: aparcado, a petición tuya.
