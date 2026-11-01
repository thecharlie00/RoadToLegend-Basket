# Informe 21 — Paridad de contenido con *Camino a la Leyenda*

## Qué se añadió
- **Decisiones narrativas: de 129 a 304.** Incluye unos 60 eventos de jugador, 60 de entrenador, 55 de vida, prensa y comunidad, varios arcos argumentales y 14 decisiones de época que dependen del año. Hay **220 trofeos**: copa, medallas, oros, instalaciones, desafíos y tienda.
- **Red social ficticia** (adaptada de social-data). Tiene 8 cuentas inventadas, ninguna basada en una persona real, y publica 2-3 mensajes por semana según el resultado, tu partido, las rachas, las lesiones, los rumores, los playoffs y los títulos.
- **Rivalidades, récords y diario.** Hay un rival de liga con balance cara a cara, récords personales y de liga en Historia, y un diario de temporada.
- **18 momentos históricos** (adaptados de eras-moments): finales reales entre selecciones de 1936 a 2024. Se juegan con las reglas de su año y con un ritmo calibrado al marcador real; puedes elegir selección y táctica y cambiar la historia. Los jugadores son generados, no los reales.
- **Mercado y cuerpo técnico del entrenador** (adaptados de market26 y mgr-plus).
  - Cada semana sale una lista de jugadores libres o con traspaso. El mercado cierra al 60 % de la liga.
  - Fichar se paga con la caja del club. Cortar a un jugador cuesta el 30 % de su sueldo. La plantilla va de 10 a 15 jugadores.
  - Puedes contratar asistente, fisioterapeuta y ojeador con niveles 0-3. Tienen sueldo semanal y efectos reales: ánimo, progreso de los jóvenes, lesiones más cortas y un mercado más amplio.

## Traducción completa a francés, alemán e italiano
- 2.499 frases por idioma: 304 decisiones con sus opciones y resultados, 220 trofeos, prensa, guía, tienda, red social, momentos históricos y equipamiento.
- Los diccionarios viven en `tools/i18n/{fr,de,it}.json` (frase inglesa → traducción). `tools/content_i18n.py` las inyecta en `data/content/*.json` y genera `src/domain/content-i18n.js` para los textos definidos en código; `content_v2.py` lo ejecuta al final, así que regenerar el contenido conserva las traducciones.
- `tools/i18n/check.py` valida que cada traducción mantiene los marcadores (`{club}`, `{opponent}`…).

## Verificación
- `npm test`: 125/125 (incluye una prueba de que todo el contenido existe en fr/de/it).
- `npm run test:browser`: 21/21 escenarios. El nuevo cubre mercado, staff, red social, Historia y un momento histórico. Axe da 0 violaciones.

## Pendiente
- En francés, alemán e italiano el texto narrativo usa el masculino genérico; el femenino automático (jugadora o liga femenina) solo existe en español e inglés.
- GOAT Ladder (aplazado por decisión del autor). AAB sin compilar.
