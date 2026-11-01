# Informe fase 8 — "que se parezca a Camino a la Leyenda"

Fecha: 2026-11-01. Objetivo de esta tanda, en palabras de Carlos: "continúa hasta que haya algo que se asemeje al proyecto de fútbol". Se estudió el juego de fútbol compilado (`build_legacy_game.py`) y sus pantallas, y se llevó el baloncesto a la misma estructura, estética y bucle de juego.

## Qué cambió

1. **Interfaz como el fútbol** (`src/ui/app.js`, `style.css`, `tools/build.py`)
   - Arranque: idioma → portada (NUEVA PARTIDA / CONTINUAR, GOAT Ladder marcado "pronto", AJUSTES Y PARTIDAS, MÁS) → ELIGE UN MODO (jugador, entrenador; Crea tu club y Épocas visibles como "en desarrollo") → creación en 4 pasos (quién eres; posición, arquetipo, mano y dorsal; talento; camino y club).
   - Juego: cromo fijo (media con tier oro, plata o bronce, dorsal, escudo generado, edad y bandera), barra **INICIO · YO · LIGA · MÁS**, botón de acción fijo "JUGAR vs rival" + "Simular".
   - Paleta "estadio de noche" y fuente CamDisp (letras Pixelify + cifras Atkinson), igual que el fútbol.
2. **Contenido v2** (`src/domain/content.js`, `tools/content_*.py`)
   - 104 decisiones escritas a mano (es/en), con contexto ({club}, {rival}, {compañero}), escenas de historia (agente, draft, renovación, lesión grave, primera charla…), desenlaces inciertos con % visible, texto de resultado y **consecuencias diferidas** por marcas.
   - Agente con comisión real, patrocinio de zapatillas, fama, ingresos semanales y prensa basada en el último partido real.
   - **199 trofeos** con guiños a la cultura pop y un platino por modo.
   - Ayuda contra malas rachas oculta (equivalente a blp47).
3. **Minijuegos (fase g)** (`src/match/arcade.js`, `src/render/arcade2d.js`)
   - Seis juegos: tiros libres, concurso de triples, tiro final, mates, defensa y 1×1.
   - Animación con anticipación, aplastamiento y estiramiento del balón, gesto final y destello.
   - Sesiones comprometidas (no se puede repetir cerrando la app), récords, recompensas y modo automático accesible.
   - En el partido en directo, "Jugármela" se decide con el tiro final.
4. **Mascota** (`src/domain/pet.js`, `src/render/petvox.js`): perro, gato o conejo en vóxel.
   - Tres cuidados por semana y 8 trucos de baloncesto.
   - Accesorios visibles en el modelo y concursos con corona.
   - Su estado afecta a tu moral.
5. **Playoffs, premios y resumen** (`src/domain/playoffs.js`)
   - Liga Boreal con conferencias, play-in y series al mejor de 7. Liga Ibérica con top 8. Ascenso con playoff.
   - Jugables semana a semana y en directo.
   - Premios: MVP, mejor defensor, novato, sexto hombre, más mejorado, quinteto ideal, MVP de la final y mejor entrenador.
   - Resumen de temporada, cuadro e historial.
6. **Entrenador**: quinteto elegible, táctica en 3 ejes con efecto medible en el motor, semana de trabajo (suave, normal o intensa) e informe del rival.
7. **Guía del juego** y **Salón de la fama** en MÁS.
8. **Equilibrio**:
   - Desarrollo semanal recalibrado: antes ~19 puntos por temporada, ahora unos 4-6 hasta el potencial.
   - Potencial del jugador del usuario con margen real.
   - Carga física con recuperación proporcional: antes siempre se saturaba.

## QA

- `npm test`: **99/99**.
- `npm run test:browser`: **13/13** escenarios Chromium y 0 errores de consola o página, sin peticiones externas ni traducciones faltantes. Auditorías axe en arranque, todas las pestañas, minijuego, mascota, plantilla y partido en directo, con **0 violaciones**.
- `dist/index.html` ≈ 1,15 MB (contenido y locales embebidos). Asset de Android sincronizado. **Sin Gradle ni AAB.**

## Paridad con "Camino a la Leyenda"

| Fútbol | Baloncesto | Estado |
|---|---|---|
| Portada, modos, creación por pasos, cromo y barra inferior | Igual | Hecho |
| engine-core / save56 / i18n | Motor de posesiones, guardado, es/en | Hecho (falta fr/de/it) |
| match41 partido en directo | Momentos clave + tiro final | Hecho |
| pitch / pitch3d / vox | Cancha 2D + jugadas vóxel | Hecho (sin público animado) |
| events* / press / social | 104 decisiones, prensa real | Hecho (objetivo final: 300) |
| achieve / ach36 / trophies | 199 trofeos + platino | Hecho |
| life (agente, patrocinio, dinero) | Agente, zapatillas, fama, ingresos | Hecho (sin inversiones ni estilo de vida avanzados) |
| minigame / shootout / sp-* | 6 minijuegos | Hecho (modo por gestos pendiente) |
| pets / pet-* | Mascota vóxel con trucos y concursos | Hecho (sin paseos 3D ni mundo propio) |
| world45 play-offs | Playoffs, ascensos, premios | Hecho |
| engine-manager / week29 | Quinteto, táctica, semana, informe del rival | Hecho (sin staff ni despacho) |
| ui-guide / salón de la fama | Guía y Salón de la fama | Hecho |
| engine-market / market26 | Ofertas, cruces, draft | Parcial (sin tope salarial completo ni traspasos) |
| chal32 / story33 | Desafíos y vestuario | Parcial (historias vía decisiones) |
| club30 Crea tu club | — | Pendiente |
| nat31 selecciones | Evento de convocatoria | Pendiente |
| dyn46 / fam48 | — | Pendiente |
| edit35 editor y carrera rápida | — | Pendiente |
| goat / ui-goat + worker | Botón "pronto" | Pendiente |
| eras | Botón "en desarrollo" | Pendiente |
| lang-de/fr/it, lang-fem | — | Pendiente |
| Web pública y workflows | — | Pendiente |

## Datos dudosos

- Umbrales de diseño (momentos del directo, probabilidades de decisiones, premios, mascota) ajustables en datos y sin referencia oficial.
- La tabla de premios usa una valoración propia simplificada.
- Las conferencias de la Liga Boreal siguen la geografía de las ciudades ficticias.
- Nombres de jugadores "inspirados" siguen `pending-clearance`.

## Assets

Ninguno necesario: todo es procedural. Si en el futuro quieres modelos de mascota más detallados: rejilla vóxel o GLB de ≤150 cubos, pivote entre las patas, +X al frente, anclajes `head`, `neck`, `body` y `feet`.

## Siguiente paso recomendado

1. **Familia y Dinastías** (fam48/dyn46): pareja, hijos y relevo generacional.
2. **Crea tu club** (club30): finanzas, pabellón e instalaciones.
3. **Selecciones** (nat31): ventanas FIBA, Mundial y Juegos.
4. **fr/de/it y textos femeninos**: volumen grande de traducción; conviene hacerlo con todo el contenido cerrado.
5. **GOAT Ladder**: cliente, worker y página, cuando autorices red.
