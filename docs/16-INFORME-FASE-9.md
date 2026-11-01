# Informe fase 9 — Familia y Dinastías, 3D y estética propia

Fecha: 2026-11-01. Encargo de Carlos: "Sí, y con los minijuegos y simulación en 3D, cambia la estética para diferenciarlo del de fútbol".

## Qué cambió

1. **Estética "PABELLÓN"** (`src/ui/style.css`, `tools/build.py`)
   - Se acabó la paleta "estadio de noche" del fútbol. Ahora el fondo es azul marino de pabellón (#0b0d1c), el acento naranja balón (#ff7a1f) y el detalle cian marcador (#3be3ff).
   - Motivos de baloncesto: líneas de pista, franja de parqué, botones píldora, media con forma de camiseta y barra inferior flotante.
   - Tipografías nuevas (OFL, embebidas): Bebas Neue para titulares y Barlow Condensed para cifras e interfaz. Atkinson Hyperlegible Next se mantiene en el texto. Se eliminaron Pixelify y CamDisp.
2. **Partido en directo en 3D** (`src/render/voxel.js`, `src/ui/app.js`)
   - El directo se ve en un pabellón vóxel con cámara en perspectiva.
   - El público se mueve más cuanto más emoción hay en el partido. Hay videomarcador, vallas LED y una red que se deforma con cada canasta.
   - Si el dispositivo no tiene WebGL, se vuelve a la vista 2D.
3. **Minijuegos en 3D** (`src/render/arcade3d.js`)
   - Los seis minijuegos tienen escena 3D con cámara propia. El HUD 2D va por encima.
   - Se puede desactivar el 3D en Ajustes.
4. **Familia y Dinastías** (`src/domain/family.js`, eventos nuevos y UI)
   - Al empezar eliges tu situación: sin pareja, con pareja, o con pareja e hijo pequeño.
   - Nueva acción semanal **"Semana en familia"**. Entrenar extra resiente a la pareja y a los hijos, y la felicidad de la pareja influye en tu moral.
   - 13 decisiones nuevas: conocer a alguien, pedir matrimonio, bebé, trabajo de la pareja, aniversario, crisis, primer partido del hijo, que quiera jugar, función del colegio, vacaciones, la pregunta de la despedida, la sombra de la leyenda y la leyenda en la grada.
   - **Retirada**: llega con la gira de despedida o cuando el cuerpo dice basta. Al retirarte eliges entre seguir como entrenador, pasar el relevo a tu hijo o cerrar la carrera.
   - Si eliges el relevo, tu hijo empieza con 18 años. Su nivel inicial depende del legado del padre (títulos, premios y pico de media) y puede heredar el dorsal.
   - La leyenda anterior sigue presente en el mundo y en las decisiones. El Salón de la fama la conserva.
   - 8 trofeos nuevos de familia y dinastía (207 en total).
5. **Ascensos en Europa corregidos**. Si tu club ascendía, la partida quedaba rota. Ahora la temporada activa es siempre la de tu liga, y la otra se simula de fondo con su playoff.
6. **Retirada y guardado corregidos**. Al retirarte, tu jugador salía de la plantilla antes de que eligieras qué hacer, y la partida guardada ya no se podía cargar. Ahora sigue en la plantilla hasta que eliges. Hay una prueba de regresión que simula el ida y vuelta del worker.

## QA

- `npm test`: **105/105**.
- `npm run test:browser`: **14/14** escenarios en Chromium, entre ellos el de familia, retirada y relevo en móvil. 0 errores de consola o página, 0 peticiones externas y **0 violaciones axe**.
- `dist/index.html` ≈ 1,30 MB. Android sincronizado (solo copia). **Sin Gradle ni AAB. Sin push.**

## Paridad actualizada

| Fútbol | Baloncesto | Estado |
|---|---|---|
| dyn46 / fam48 | Familia, retirada, entrenador o relevo generacional | Hecho (sin ligas femeninas para hijas) |
| pitch3d / vox con público | Pabellón 3D con público, videomarcador y red | Hecho |
| sp-* minijuegos 3D | 6 minijuegos en 3D | Hecho |
| club30 Crea tu club | — | Pendiente |
| nat31 selecciones | Evento de convocatoria | Pendiente |
| goat / eras / fr-de-it | — | Pendiente |

## Pendiente o dudoso

- Si tienes una hija, ahora mismo no puede tomar el relevo: el juego todavía no tiene ligas femeninas. La tarjeta lo explica.
- Los valores de la conciliación (cuánto suben o bajan pareja e hijos cada semana) son de diseño y se pueden ajustar en datos.

## Siguiente paso recomendado

1. Crea tu club (club30).
2. Selecciones (nat31).
3. Ligas femeninas: desbloquearían el relevo con hija y los textos femeninos.
