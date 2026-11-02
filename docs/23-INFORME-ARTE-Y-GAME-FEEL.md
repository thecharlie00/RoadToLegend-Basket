# Informe 23 — Arte y *game feel*: menús y juego

Objetivo: que la portada, los menús y el partido se sientan como un juego terminado, no como un
prototipo. Todo es CSS/SVG/procedural: sin imágenes, fuentes, vídeos ni audio externos, y respetando
el modo de movimiento reducido, el contraste alto y el texto grande.

## Portada y menús

- **Ilustración de portada** (`bootArt()`): pabellón nocturno en SVG con focos, grada, parqué, aro,
  balón flotante y marcador LED animado. Es decorativa (`aria-hidden`) y no añade texto.
- **Cifras de portada** en tres tarjetas LED (ligas, clubes, países) en lugar de una línea suelta.
- **Selector de idioma** con banderas SVG propias (antes eran emoji: en plataformas sin fuente de
  emoji se veían como cuadros vacíos) y el código ISO a la derecha.
- **Modos de carrera** numerados 01–05 con borde superior encendido y estado «próximamente» atenuado.
- **Pantalla «Más»** rediseñada: panel de carrera con escudo, nombre, club, liga y cuatro cifras
  (semana, balance, trofeos, puesto), y tres grupos —*Tu carrera*, *Tu club*, *Sistema*— en lugar de
  una lista única de 15 filas.
- **Iconos SVG propios** (`src/render/icons.js`, 25 símbolos de trazo 2 px): sustituyen a los emoji
  del menú, del dock y de la cabecera, que dependían de la fuente del sistema.
- **Cabecera de carrera** con filete del color real del club (escudo + colores de `Crest.colors`).
- **Avatares y estados**: anillo para las banderas, píldora de aviso con LED, barra de carga de
  progreso (`busy-rail`) y `aria-busy` en la aplicación.

## Movimiento y respuesta

- **Entrada por vista**: una animación corta de elevación por cambio de pantalla, pestaña o paso del
  asistente (`viewIn`/`riseIn`). Solo transformación: **nunca** se baja la opacidad del contenido,
  porque eso falsea el contraste en las auditorías y en pantallas lentas.
- **Física de pulsación**: el botón principal baja 3 px y reduce su sombra; los secundarios tienen
  relieve inferior. Con puntero fino hay elevación contenida de tarjetas y brillo de barrido en el CTA.
- **Dock**: indicador superior, icono activo con rebote corto (`navPop`) y fondo tipo cristal.
- Todo el movimiento está desactivado con `prefers-reduced-motion` o el ajuste del juego (`:root.rm`).

## Partido y minijuegos

- **HUD de directo** estilo televisión: punto «en vivo» parpadeante (se apaga al terminar), escudos,
  siglas, marcador con LED cian y **rebote del marcador** (`scoreBump`) al anotar.
- **Crónica**: el último acontecimiento entra con animación (`fresh`) y se mantiene el resaltado del
  jugador propio.
- **Vídeo 3D**: viñeteado interior sobre el lienzo para integrarlo con la interfaz.
- **Minijuegos**: escenario enmarcado con halo, marcador grande, botón «¡Tira!» con respiración
  luminosa y destello del marco en canastas perfectas o mates altos.
- **Entrada en partido**: al iniciar el directo la vista se desplaza al panel del partido (con
  `scroll-margin` para no quedar bajo la cabecera) y vuelve a hacerlo cuando un momento clave
  requiere decisión. Sin movimiento reducido el salto es instantáneo.
- **Orden de la semana**: el directo y la decisión pendiente pasan al principio de la pantalla; la
  guía, la familia y el resumen de temporada van después.

## Vibración (nueva)

- `src/platform/haptics.js`: patrones discretos (`tap`, `select`, `confirm`, `success`, `fail`,
  `score`, `buzzer`), todos ≤ 80 ms por pulso.
- Se activa solo si el ajuste **Vibración** está encendido y `navigator.vibrate` existe; nunca lanza
  excepciones ni sustituye a un aviso visual.
- Conectada a navegación, confirmaciones, creación de carrera, tiros libres, decisiones de directo,
  minijuegos, mascota y marcador. El texto de ajustes ya no dice que la vibración llegará «más tarde».

## Correcciones de juego detectadas al pulir el HUD

- **Porcentaje de triples irreal**: `pbView` usaba `points || 2`, y los tiros fallados guardan
  `points: 0`. Se contaban como intentos de dos y el directo mostraba 18/18 en triples. Ahora el valor
  sale de la zona (`src/match/live.js#shotPoints`) y el marcador/parciales usan la misma fuente.
  Cubierto por `tests/feel.test.js` con una comprobación sobre un partido simulado.
- **Tabla comparativa del directo**: la regla `.live` limitaba las columnas a `3.2em` y cortaba los
  porcentajes; ahora ocupa el ancho completo con cifras tabulares.
- **Roles ARIA**: la tabla de comparación ya no duplica encabezados vacíos y el marcador mantiene
  `role="status"` sin robar foco.

## Verificación

- `npm test`: **132/132** (5 nuevas en `tests/feel.test.js`: vibración, colores de escudo y puntos por zona).
- `npm run test:browser`: **21/21** escenarios, 0 errores de consola o página, 0 peticiones externas y
  **0 violaciones de accesibilidad** (39 auditorías axe). Durante la pasada, axe detectó que la
  animación de entrada bajaba la opacidad: se corrigió en el mismo turno.
- `npm run build`: 3.199.277 bytes antes de los últimos retoques de iconos.
- Revisión visual a 390×844 con capturas de portada, idioma, asistente, inicio, directo, decisión,
  «Yo», minijuegos y «Más»: sin desbordamiento horizontal y sin errores de página.

## Pendiente / riesgo

- El muestreo de fotogramas del partido vóxel en este entorno de CI (2 núcleos, renderizado software)
  sigue por debajo de 60 fps y muy variable (≈9–13 fps). No es una certificación de dispositivo y estas
  mejoras de interfaz no lo empeoran, pero **sigue haciendo falta medir en un Android real** y decidir
  si se recorta la escena o se añade degradación automática de calidad.
- El `dist` supera los 3,19 MB (fuentes embebidas + contenido multilingüe). Si el arranque en WebView
  se nota lento, el siguiente paso es separar datos de idioma del paquete inicial.

## Activos que debe aportar el usuario

- Ninguno obligatorio: no se han añadido imágenes ni audio.
- Opcional: set de iconos propio en SVG si quiere sustituir el actual, y una ilustración de portada
  pintada a mano (hoy es vectorial generada por código) con proporción 560×230 y fondo transparente.
