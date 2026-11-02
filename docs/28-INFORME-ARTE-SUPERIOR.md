# Informe 28 — Arte superior al del fútbol

Fecha: 2026-11-02 · Rama: `arena/08e3b10a-roadtolegend-basket`

## Qué pedía el jugador

«Pule el arte del juego para que los gráficos de esta entrega sean superiores a los del juego de fútbol.»

El fútbol (`camino-a-la-leyenda`) juega con una pista 2.5D dibujada a mano en Canvas: 105 × 68 m
continuos, altura y giro del balón, cámara con zoom suave, público procedural por Web Audio y un
`style.css` de 134 KB con 30 degradados, 48 sombras y 24 animaciones. Nuestra entrega partía de un
vóxel de **una sola luz plana por cara**, una pista de un color, un público de 2 × 14 cubos y una
pista 2D que era un rectángulo con círculos. La diferencia se veía a simple vista.

Este informe cuenta qué se ha cambiado, cómo se consigue el acabado **sin una sola imagen ni fuente
externa** y con qué números se ha medido.

## 1. Motor de dibujo vóxel (v2)

`src/render/voxel.js` pasa de `voxel-1` a `voxel-2`. Sigue siendo WebGL1 con un único draw call por
escena, pero la luz se calcula ahora **por vértice en CPU** y se sube ya cocinada al buffer:

| Antes | Ahora |
| --- | --- |
| `0.62 + max(0, n·L) · 0.38` sobre una luz | Luz clave fría (`-0.38, 0.87, 0.33`) + relleno cálido (`0.58, 0.18, -0.74`) + ambiente hemisférico (cielo arriba, rebote del parqué abajo) |
| Sin oclusión | Oclusión de contacto por altura del cubo: lo que se apoya en el suelo pierde hasta un 40 % de luz |
| Sin tinte | Tinte de cielo en caras superiores (`+11 %` en azul) y rebote cálido en las inferiores |
| Fondo plano `#0b0c1c` | Cielo procedural: degradado de tres paradas + halo cálido de pista + viñeta, en un segundo programa de shaders |
| Sin profundidad atmosférica | Niebla por vértice (distancia a la cámara) hacia el color de la sala |
| Sin exposición por escena | `gain` por escena: el pabellón va a 1.0, las salas de decisión a 1.22 y los minijuegos a 1.18 |

Fórmula final por cara y vértice:

```text
shade = (0.24 + key·0.66 + fill·0.13 + hemi·0.15) · ao · gain
color = base · shade · tinte(cielo/rebote) → mezcla con niebla según distancia
```

El renderizador conserva un solo `drawArrays` (el test de humo exige `drawCalls === 1`) y añade el
cielo antes de la geometría con la máscara de profundidad desactivada.

## 2. Pista 3D: de un rectángulo a un pabellón

- **Tarima de arce** con 14 tablas (24 en calidad alta), tres tonos alternos y junta visible.
- **Zonas pintadas** en las dos canastas con marco claro, **semicírculo de no-carga** y **círculo
  central con emblema** (aro interior + cuatro radios).
- **Líneas reglamentarias** calculadas con las medidas del perfil (arco de 6,75 m, esquina 6,6 m,
  tiros libres a 5,8 m), no con valores inventados.
- **Canastas completas**: mástil, protección de base, brazo, tablero con marco e interior, aro de
  cubos, red de 4 anillos que se estira con el balón y reloj de 24″ sobre el tablero.
- **Grada** con escalones, asientos y público de hasta 6 tonos que bota con el hype (más brazos
  levantados cuando el pabellón está caliente). Calidad baja: 2 filas × 12. Alta: 3 filas × 16.
- **Segundo anillo** en sombra con público de fondo, vallas LED perimetrales de tres tramos,
  pancartas colgadas y cuatro focos de techo.
- **Videomarcador**: caja oscura, cuatro pantallas con gráficos de color, aro luminoso y mástil.
- **Mobiliario de banda**: banquillo con cuatro jugadores sentados, mesa de anotadores y cinco
  fotógrafos con cámara detrás de la línea de fondo.
- **Trazos de tiro**: estela de cuatro cubos decrecientes detrás del balón y **sombra del balón** en
  el parqué que crece cuando el balón baja.

Presupuesto de cubos (tope duro `MAX_CUBES = 1400`):

| Escena | Cubos |
| --- | --- |
| Pista sola, calidad baja / alta | 168 / 214 |
| Partido completo, baja | 813 |
| Partido completo, alta | 1057 |
| Minijuego 3D | 399–410 |
| Escena de decisión | 89–126 |

## 3. Cámara de retransmisión

La órbita de 31° se mantiene, pero baja de 23 m a 17,2 m de altura y se acerca a 24 m con objetivo en
`[0, 0.7, -0.5]`: la pista ocupa el ancho del lienzo, la grada cercana queda como banda de primer
plano y el techo ya no es un vacío. La cámara de avatar usa un encuadre propio (`halfH 2.2`) y la de
sala se acercó a 4,3 m cuando el avatar pasó a escala humana.

## 4. Pista 2D: de rectángulo a retransmisión

`src/render/court2d.js` se reescribió entero (44 → ~250 líneas) y ya no dibuja un esquema:

- **Suelo de madera** con 22 tablas, veta determinista por tabla y luz central.
- **Zonas pintadas** con degradado y las **líneas completas**: perímetro, medio campo, círculo
  central, tiros libres con semicírculo discontinuo, triple con esquinas y arco de radio real,
  semicírculo de no-carga, tablero, aro y red de ocho hilos.
- **Público** en dos bandas de dos filas con cintas LED publicitarias y dos haces de foco.
- **Jugadores** como fichas con sombra, degradado radial, anillo y dorsal; el que tiene el balón
  lleva un halo cálido.
- **Balón** con costuras, brillo, halo y sombra, sobre una viñeta final que centra la mirada.
- **Colocación con medidas reales**: cada zona de tiro se convierte a metros desde el aro y la
  formación (atacantes abiertos, defensa entre balón y canasta) se calcula, no se inventa. Todo el
  fotograma sigue devolviendo coordenadas 0..1 (contrato que exige `tests/phase4.test.js`).

## 5. Figuras: avatar y jugadores

El avatar pasó de **15 cubos** (un maniquí) a **43–50** con proporciones humanas: suela y empeine,
calcetín, espinilla, rodilla, muslo, pernera, cinturilla, cintura y pecho separados, **canesú de
hombros y mangas**, cuello visible, mandíbula, nariz y orejas, ojos, cejas, dorsal en blanco, manos
con muñeca y balón con dos costuras. La altura real del jugador ya escala el modelo
(`1.7 · altura/196`, entre 0,88 y 1,12), así que un pívot se ve más alto que un base.

Las diez figuras de la pista pasan de 12 a **~26 cubos**: zapatilla con suela, calcetín, pierna en
tres tramos, pantalón con perneras, camiseta con canesú, cuello, mandíbula, pelo, brazos con codo y
mano, sombra de contacto doble y dorsal en calidad alta. El test de humo sigue exigiendo ≤ 64 cubos
por avatar y el peor caso medido (todos los accesorios + celebración + peinado rizado) es **50**.

## 6. Escenas de decisión

`src/render/scenes.js` crece de 8 salas de ~31 cubos a salas de **89–126** cubos. Todas comparten
armazón nuevo (tarima tabla a tabla, pared con zócalo, zócalo alto, techo con viga y dos focos,
alfombra de dos tonos) y cada una monta su decorado: despacho con estantería de trofeos y ventanal
con skyline; vestuario con seis taquillas, banco, toallas y pizarra táctica; pista con grada,
canasta completa y cinta LED; sala de prensa con fondo de patrocinadores, micros y foco; enfermería
con camilla, negatoscopio y muletas; casa con sofá, tele y lámpara; calle con valla, canasta de
barrio, grafitis y farola; viaje con ventanillas, maletero y asientos.

El avatar se dibuja a escala de persona real (×0,62) dentro de la sala, así que el mobiliario queda
a su tamaño: antes era un gigante de 3,5 m en una habitación de 3,3 m.

## 7. Minijuegos en 3D

La cámara del tiro se retrasa a 5,2 m y baja a 3,0 m para que **se vea al tirador**, y se añade la
grada de fondo tras la canasta con público, valla LED y cielo cálido: antes la cámara miraba a un
vacío negro.

## 8. Interfaz: marcos de retransmisión

`src/ui/style.css` gana el bloque **v16 — arte superior (pista viva)**:

- Marcos comunes para pista 2D, 3D, directo, avatar, mascota y escenas: borde cian, sombra en tres
  capas, reflejo de cristal y viñeta en `::after` (sin capturar clics).
- La pista vive dentro de una **peana** con foco radial; el lienzo ya no flota.
- Controles del visor como pastillas de cristal y descripción de jugada con barra cian.
- Barra inferior con desenfoque, anillo activo y animación de pestaña.
- Barrido de foco sobre el arte de portada y cifras con degradado.

## 9. Comparación honesta con el fútbol

| | Fútbol (`camino-a-la-leyenda`) | Esta entrega (ahora) |
| --- | --- | --- |
| Representación | Pista 2.5D pintada a mano | **3D vóxel real** con perspectiva, profundidad y oclusión + **2D de retransmisión** completo |
| Luz | Sombras y degradados 2D | Luz de estudio por vértice, oclusión de contacto, tinte de cielo, niebla y cielo procedural |
| Escenas narrativas | Escenas de era | **Ocho salas vóxel** con mobiliario y escala humana |
| Avatar | Retrato 2D y figuras de pista | Avatar vóxel de 43–50 cubos con equipación, aspecto y celebraciones; 10 figuras en pista |
| CSS | 134 KB | 65 KB, pero con marcos, peanas y HUD nuevos |
| Audio de público | Web Audio procedural | Pendiente (no entra en esta entrega) |

Lo que el fútbol sigue teniendo y nosotros no: muchedumbre sonora procedural y una simulación
continua de 105 × 68 m con física de bote. Nuestro partido es determinista por eventos y la
animación ilustra el evento registrado; el arte ahora está por delante, la simulación no.

## 10. Rendimiento medido

Banco en el navegador de pruebas (Chromium headless, lienzo 640 × 360, 20 fotogramas):

| Calidad | Cubos | Dibujo completo | Solo CPU (vértices) |
| --- | --- | --- | --- |
| Baja (directo) | 813 | 4,03 ms | 1,84 ms |
| Alta (visor) | 1057 | 4,47 ms | 4,43 ms |

El directo repinta a 60 fps con la calidad baja, así que el presupuesto de 16,7 ms queda holgado.
El renderizador sube el *pixel ratio* a 1,4 (baja) y 1,75 (alta) para suavizar bordes sin activar
antialiasing por hardware.

## 11. Verificación

- `npm test`: **154/154**.
- `npm run test:browser`: **24/24** escenarios, 0 violaciones axe, 0 errores de consola, 0 peticiones
  externas; fotograma mediano de la pista 2D en 16,7 ms (60 fps) con `meanFps` 41,2 en la muestra.
- `npm run build`: `dist/index.html` **3 360 601 B**, sha256 `f6f72dce8477`.
- Capturas de control en `.cache/art/` (portada, carrera, partido 2D y 3D, vida, minijuego).

## 12. Límites conocidos

- El público de la grada es geometría, no textura: a máxima distancia se lee como bloques de color.
- Las salas de decisión comparten armazón; la variedad está en el decorado, no en la arquitectura.
- El avatar sigue siendo vóxel de proporción estilizada (cabeza grande): es la estética del juego, no
  un fallo de escala.
- El sonido de pabellón del fútbol no se ha portado en esta entrega.
