# Informe 26 — Mascotas vóxel con el contenido del fútbol

Fecha: 2026-11-02 · Rama: `arena/08e3b10a-roadtolegend-basket`

## Qué pedía el jugador

Que las mascotas fueran **estilo vóxel** y tuvieran **el mismo contenido que el juego de fútbol** en
esa parcela. La referencia es el sistema de mascotas de `camino-a-la-leyenda` (`src/pets.js` +
`src/ui-pets.js`): catálogo de especies, cuidados con reglas por especie, colores de pelaje, fondos,
accesorios con desbloqueo por trofeo, etapas de crecimiento, mantenimiento y su efecto real en la
carrera.

## Lo que hay ahora

### Especies: 13 (antes 10)

Las mismas especies de la referencia, con nombres y descripciones propias del baloncesto:

| Normales (adopción gratuita) | Exóticas (5.000 € y más riesgo) |
| --- | --- |
| Perro, gato, conejo, hámster, tortuga, pez | Loro, erizo, fennec, capibara, iguana, pitón, tarántula |

Cada especie define forma vóxel, colores (cuerpo, barriga, oreja), etapa de trucos máxima, si pasea,
mantenimiento por temporada y cuatro modificadores reales:

- `fame`: puntos extra en los concursos de trucos.
- `mor`: si es ≥ 1,2 y está feliz, sube la moral del dueño (+1 cada cuatro semanas).
- `calm`: reduce la caída semanal de diversión (se altera menos si la dejas sola).
- `risk`: probabilidad de susto veterinario al cerrar temporada (factura, nunca muerte).

### Cuidados: 13 acciones con reglas por especie

A las ocho de la casa (comer, jugar, pasear, bañar, entrenar, mimos, agua, cepillar) se suman las
del fútbol adaptadas: **acariciar, mirar, foto, spa y terrario**. Cada especie admite un subconjunto
(`CARE_ACTIONS`): un pez no se deja acariciar ni llevar al spa; un perro no se queda quieto mirando;
solo los animales de terrario aceptan «terrario». La interfaz **oculta** lo que la especie no admite
en vez de mostrar botones muertos.

- **Foto**: da estilo según los accesorios puestos (1 + 0,2 por pieza) y algún fan si vas muy
  arreglado; queda en el álbum.
- **Spa**: 400 €, higiene al 100 % y vínculo.
- **Terrario**: higiene y diversión sin coste.

### Estilo: 10 pelajes, 7 fondos, 30 accesorios

- **10 pelajes** con tinte por vóxel (natural, nieve, carbón, chocolate, rosa, azul, verde, morado,
  oro, arcoíris). El oro exige ganar un concurso regional; el arcoíris, el nacional. Los candados se
  anuncian con icono y texto, no solo con color.
- **7 fondos**: sin fondo, pista, cielo, rosa, atardecer, noche y **colores del club** (se toman del
  escudo generado del club, `CAA.Crest.colors`).
- **30 accesorios en 6 huecos** (cabeza, cara, cuello, cuerpo, patas y juguete), frente a los 21 de
  cuatro huecos del fútbol. Quince son nuevos: cascabel, perlas, lazo, sombrero de paja, birrete,
  chistera, gafas de pasta, gafas de sol, bigote de pega, hueso, pelota, peluche, estrella, cadena de
  oro y copa. Los accesorios de trofeo (corona, estrella, medalla, cadena y copa) **no se compran**:
  se ganan en los concursos.

### Etapas y encuadre

`baby → young → adult → senior` por semanas (34 por temporada) con escala 0,72 / 0,86 / 1 / 0,96.
Los trucos siguen limitados por especie (`maxTrick`) y las etapas afectan al entrenamiento como
antes. El retrato mantiene el tamaño de la etapa y el tinte del pelaje.

### Economía y decisión sobre la muerte

- Adopción: gratuita para las especies normales; **5.000 €** para las exóticas (misma cifra que ya
  usaba el juego).
- **Mantenimiento por temporada** tomado de la especie (60–520 €), más factura veterinaria
  (`upkeep × 1,5`) si salta el `risk`.
- **La mascota no muere.** Es una decisión explícita: la cabecera de contenido de `pet.js` promete
  «No muere nunca» y el pilar anti-frustración del proyecto evita castigos irreversibles. Se portaron
  el mantenimiento, el riesgo y el desgaste, pero no la muerte ni el memorial. Si el jugador quiere
  el ciclo completo (muerte a los 9–15 años y memorial con legado), se puede activar después con un
  `schemaVersion` nuevo y una migración; no se ha hecho sin instrucción.

## Render vóxel

`src/render/petvox.js` genera la escena en cubos (sin texturas externas, compatible con la CSP):

- 8 plantillas de forma: cuadrúpedo, pequeño, caparazón, pez, ave, lagarto, serpiente y tarántula;
  cada una compone patas, cola, hocico, pico, cresta o quelíceros con cubos.
- Tinte de pelaje calculado en HSL por vóxel (no filtros CSS): saturación, luminosidad, contraste,
  sepia, giro de tono y arcoíris animado.
- Fondo de estudio con suelo y dos paredes en esquina; el fondo de club usa los dos colores del
  escudo.
- Pequeñas animaciones (respiración, salto, cola, aleteo) con `prefers-reduced-motion` desactivado.
- Presupuesto: 15–33 cubos por escena normal y hasta 44 con todos los accesorios y un fondo, muy por
  debajo de `MAX_CUBES = 800`. El bucle de dibujo sigue a 90 ms y se detiene si la pestaña está oculta.
- Encaje de cámara: el modelo se escala ×1,5 (× etapa) y se desplaza +0,3 en X para centrar el
  retrato; la pecera es un marco abierto porque el renderer no tiene transparencias.

## Interfaz

La tarjeta de mascota se divide en tres pestañas (igual que el fútbol: cuidar / estilo / edición):

- **Cuidar**: retrato, barras, mensaje, cuidados rápidos, cuidados principales (solo los admitidos),
  paseos, trucos, concursos y tienda de comida/juguetes.
- **Estilo**: pelajes con candado, fondos, accesorios agrupados por hueco y lista de trofeos
  pendientes.
- **Datos**: ficha de la especie (mantenimiento, fama, calma, riesgo), cuidados que admite, cambio de
 nombre (sanea etiquetas y limita a 20 caracteres) y recordatorio de que no muere.

Accesibilidad: `aria-pressed` en pestañas y muestras, candados con texto, botones deshabilitados con
motivo, axe sin violaciones y 0 px de desbordamiento a 360 px.

## Pruebas

| Comprobación | Resultado |
| --- | --- |
| `npm test` | **148/148** (6 nuevas en `tests/phase12-pets-voxel.test.js`) |
| `npm run test:browser` | **22/22** escenarios, 0 errores de consola/página, 0 peticiones externas, 0 violaciones axe |
| Escenario nuevo | adopta, cambia pelaje y fondo, renombra, comprueba reglas de cuidado, axe y 360 px |
| Locales | **1568 claves × 5** idiomas, mismo orden en es/en/fr/de/it |
| Build web | `dist/index.html` de **3.288.974 B**, sha256 `8a57a7d8d90d…` (`npm run build`) |

## Archivos tocados

- `src/domain/pet.js`: especies, pelajes, fondos, accesorios, cuidados, mantenimiento, riesgo,
  migración, `rename`, `setCoat`, `setBg`, validación.
- `src/domain/career.js`: operaciones `rename`, `coat`, `bg`; `weekTick` con vida y moral extra.
- `src/render/petvox.js`: reescrito (formas nuevas, tinte, fondos, accesorios, encuadre).
- `src/ui/app.js`: pestañas, muestras, acciones nuevas, fondo de club, rename.
- `src/ui/style.css`: muestras de pelaje/fondo.
- `src/locales/*.json`: 81 claves nuevas × 5.
- `tests/phase12-pets-voxel.test.js`: paridad de contenido, geometría, candados, trofeos, cuidados y nombre.
- `tools/browser_smoke.mjs`: escenario de mascota con axe y 360 px.

## Activos que debe aportar el jugador (opcional)

El modelo es procedural: **no hacen falta activos para jugar**. Si se quiere sustituir por arte
propio, hace falta:

1. **Un GLB por especie** (13) con las cuatro etapas o un morph target por etapa. Escala 1 unidad =
   1 m; altura 0,6–1,4 m; pivote en el centro de los pies `(0, 0, 0)`; delante hacia +Z; menos de
   800 cubos equivalentes.
2. O bien **atlas de vóxeles** 1024×1024 PNG, rejilla de 16×16 celdas de 64 px, sin filtro, con
   anclas por accesorio: cabeza (centro superior), cara (frente), cuello (base), cuerpo (centro),
   patas (inferior) y juguete (suelo, 0,6 m delante).
3. Si se usan iconos propios para los cuidados, SVG 24×24 con `currentColor` (los emoji actuales
   dependen de la fuente del sistema y en CI se ven como cajas).
4. Licencia propia o CC0 y inclusión en el paquete: la CSP prohíbe cargar arte externo en tiempo de
   ejecución.

## Limitaciones conocidas

- El renderer vóxel no tiene transparencias: la pecera es un marco abierto, no un bloque de agua.
- Los accesorios van anclados a posiciones fijas por forma; no hay editor de arrastre como el 2D del
  fútbol (en 3D exigiría gizmos y persistir ajustes por etapa).
- No hay sonido propio de mascota; se mantienen los efectos globales.
- La muerte y el memorial del fútbol no se portaron (ver decisión arriba).
