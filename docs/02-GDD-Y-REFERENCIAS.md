# 02 — GDD, referencias, modos y economía

## 1. Identidad y público

Juego de carrera/gestión de baloncesto, offline-first, para móvil Android/WebView y web. Público: jugadores de Retro Bowl/New Star que quieren profundidad, aficionados NBA/Euroliga que quieren una carrera personal y managers que prefieren decisiones legibles a hojas de cálculo infinitas. No es un simulador de stick completo ni un manager de PC con 40 pestañas obligatorias.

**Fantasía:** empezar en una cancha de barrio, ganarse un sitio, elegir continente y rol, sobrevivir a una mala temporada, convertirse en franquicia o construir una dinastía, retirarse y ver el legado.

## 2. Referencias estudiadas

| Referencia | Fortalezas observadas | Adaptación a Baketball: Road to legend | Exclusiones deliberadas |
|---|---|---|---|
| NBA 2K MyCAREER / MyNBA | Identidad de jugador, construcción, franquicia y expresión. [1](https://2k.com/games/nba2k/) | Creación, roles, momentos clave, vitrina y gestión de franquicia en sesiones cortas. | Ciudad online obligatoria, compras de progreso, simulación de stick completa y licencias. |
| Basketball GM | Simulación client-side, IndexedDB, worker, carreras largas y mercado. [README](https://github.com/zengm-games/zengm/blob/master/README.md) | Mundo persistente, stats, draft/contratos y simulación masiva local. | Copiar código: su README declara que no es open source; interfaz de PC sin jerarquía móvil. |
| Football Manager | Alineación táctica, adecuación de plantilla, ajustes en vivo y narrativa de temporada. [1](https://www.footballmanager.com/fm27/features) | Roles ofensivos/defensivos, rotación, scouting, promesas y presión de junta. | Complejidad administrativa exhaustiva y partidos que exigen 40 minutos. |
| Pro Basketball Manager 2026 | Gestión específicamente de baloncesto, ligas domésticas/continentales, editor de datos. [1](https://store.steampowered.com/app/3585230/Pro_Basketball_Manager_2026/) | Separación de sistemas europeos/americanos y mundo editable. | Escala mundial desde el día uno, 3D completo y datos/licencias de terceros. |
| Retro Bowl | Gestión sencilla, prensa, egos y acción retro/offline. [Ficha](https://play.google.com/store/apps/details?id=com.newstargames.retrobowl&hl=en) | Resumen rápido, decisiones de vestuario y momentos jugables. | Control arcade de fútbol americano y mercado demasiado superficial. |
| New Star Soccer | Carrera personal, entrenamiento, agente y patrocinios. [1](https://play.google.com/store/apps/details?id=com.newstargames.newstarsoccer&hl=en) | Agencia, zapatillas ficticias, relación con entrenador y minijuegos integrados. | Energía que obligue a esperar/pagar y anuncios como única vía. |
| BitLife | Vida completa por decisiones, consecuencias y rejugabilidad. [Ficha](https://play.google.com/store/apps/details?id=com.candywriter.bitlife&hl=en) | Eventos de carrera, relaciones, dinero, salud y retiro. | Azar arbitrario que arruine una carrera sin señales ni agencia. |
| Camino a la Leyenda | HTML único, WebView, saves, eventos, tienda, mascotas, GOAT y cinco idiomas. | Infraestructura y lenguaje visual probados, con correcciones documentadas. | Motor, calendario, mercado, posiciones y estadísticas de fútbol. |

Las fichas describen diseño observable; no se ha hecho una prueba comparativa de rendimiento ni se copian assets/código de estos juegos.

## 3. Bucles

- **30–90 s:** revisar bandeja, una decisión, entrenamiento corto o tiro libre; guardar y salir.
- **2–5 min:** un partido resumido/2D con 2–4 intervenciones significativas, o una jornada de gestión.
- **15–30 min:** varios partidos, mercado, draft o playoffs; siempre con puntos de salida seguros.
- **Temporada:** objetivos → carga/rotación → competición → premios/mercado → envejecimiento → nuevas decisiones.
- **Carrera:** origen → oportunidad → consolidación → pico → declive → retiro → legado/HOF.

No hay muros de energía. La sesión corta es una opción, no un recorte de contenido. El modo rápido y el detallado usan el mismo motor y los mismos resultados para el mismo estado/acciones.

## 4. Creación y carrera de jugador

### Creación

Nombre, nacionalidad/segunda nacionalidad, edad inicial, género/carrera, mano dominante, altura, envergadura, peso, cinco posiciones base (PG/SG/SF/PF/C) y dos híbridos (p. ej. PG/SG, SF/PF). Arquetipos: creador, tirador, finalizador, bidireccional, interior dominante, point forward, interior pasador. Los arquetipos sesgan costes/techos, no bloquean tiros ni obligan a reiniciar.

**25 atributos visibles:** tiro cercano, media distancia, triple, tiro libre, bandeja, mate, juego de poste, manejo, pase, visión, defensa exterior, defensa interior, robo, tapón, rebote ofensivo, rebote defensivo, velocidad, aceleración, salto, fuerza, resistencia, durabilidad, lectura táctica, clutch y liderazgo.

Altura/envergadura/peso/mano son físicos separados. OVR = media ponderada por posición/arquetipo, no suma universal. Potencial real oculto; scouting muestra rangos que se estrechan con observación. Equipamiento: bonuses pequeños y topados; nunca convierte un suplente en estrella.

### Rutas

- **Europa:** barrio → academia → filial/segunda → primera; préstamos, buyouts, cupos y ventanas. MVP: academia como origen abstracto y dos niveles profesionales jugables.
- **Norteamérica:** instituto → recruiting/ofertas/becas → NCAA → combine/entrevistas → lotería/draft; también salida directa a liga menor. NCAA completa es posterior.
- **No drafteado:** contrato parcial, desarrollo, dos vías cuando se active CBA completo, verano y oportunidad por lesiones.
- **Cruces:** europeo drafteado y stash; estrella europea hacia NA; jugador NA hacia Europa por minutos/rol/contrato. Nacionalidad, edad, contrato y nivel afectan la decisión, no solo el salario.

### Vida deportiva y personal

Entrenamiento por bloques, carga, lesiones con recuperación y recaída, forma, química, minutos, rol, promesas, agente, zapatillas ficticias, prensa/social, finanzas, salud y envejecimiento. All-Star, premios, récords, camiseta retirada y HOF en fases posteriores. El retiro permite continuar como entrenador o manager en el mismo mundo.

## 5. Carrera de entrenador / autoridad

Inicio como asistente, club pequeño o cualquier club disponible con objetivos acordes. Dos presets y delegación ajustable:

- **Entrenador:** rotación, minutos, roles, táctica, disciplina, carga y moral; el GM propone contratos.
- **Entrenador-GM:** además presupuesto, fichajes, draft, picks, staff y planes de franquicia.

No hay un tercer modo GM completo en MVP. La autoridad se expresa con permisos, objetivos y consecuencias: pedir un fichaje caro puede romper el vestuario; renovar a un veterano puede bloquear a un joven; una promesa incumplida reduce confianza.

Táctica: ritmo, spacing, pick-and-roll/pop, poste, motion, isolation, transición; defensas individual, zona 2-3/3-2, switch/drop/blitz, presión y ayudas. Ajustes de emparejamiento, uso de faltas, tiempos muertos, última jugada y revisión legal. La pizarra cambia probabilidades/espacios, no garantiza resultado.

Staff, selecciones y disciplina avanzada se amplían después. Crea tu club permitirá identidad vóxel, pabellón, presupuesto y entrada en escalera europea o expansión NA; no será un simple cambio de nombre.

## 6. Partido y minijuegos

Tres capas sobre el mismo estado: **resumen**, **2D táctico** y, después, **jugadas clave 3D**. El jugador controla decisiones de su personaje; el entrenador controla equipo. La cámara nunca decide el resultado.

MVP: tiros libres y tiro sobre la bocina. Posteriores: concurso de triples, mates, skills, defensa y street 1v1. En carrera, un minijuego sustituye una acción real y consume el mismo reloj/posesión. Se puede resolver automáticamente con distribución equivalente; no hay penalización por accesibilidad. Cerrar la app no permite repetir una tirada ya comprometida.

## 7. Economía y recompensas

| Recurso | Fuentes | Sumideros | Regla |
|---|---|---|---|
| XP / puntos de desarrollo | Partidos, entrenamiento, objetivos y mentoría. | Atributos, rasgos y especialización. | Rendimiento + decisiones; no solo victorias. |
| Dinero personal | Contrato, premios, patrocinios ficticios e inversiones. | Estilo, salud, entorno y decisiones vitales. | No compra OVR directamente. |
| Moneda de estilo | Logros, hitos, tienda y rewarded opcional. | Cosméticos y variantes visibles. | Todo artículo tiene vía offline; sin azar pagado. |
| Presupuesto de club | Taquilla, premios, propietarios y ventas. | Salarios, staff, cantera y instalaciones. | Separado del dinero personal. |
| Confianza / química | Cumplir rol, promesas, liderazgo y decisiones. | Se pierde por conflictos, carga o incumplimiento. | No es una barra que se compra. |

Rewarded: cantidad diaria limitada, nunca necesaria para continuar, sin interstitials obligatorios en MVP. Si no hay red/SDK/consentimiento, se ofrece la alternativa local sin anunciar “ayuda anti-frustración”. Las ayudas internas de estabilidad no se comunican como modo especial ni alteran el resultado de un tiro ya resuelto.

## 8. Eventos, logros y legado

Meta: **300 eventos** y **150 logros + platino**. MVP: **100 eventos** y **50 logros**; el platino completo llega cuando exista el catálogo completo.

Distribución objetivo de eventos: 70 jugador, 55 entrenador, 45 agencia/contrato, 35 vestuario, 30 prensa/social, 25 salud/carga, 20 finanzas/vida, 20 hitos/legado. Cada evento tiene condiciones, peso, opciones, efectos inmediatos/diferidos, cooldown, banderas y texto localizado. Ejemplo: exigir más minutos mejora ingreso potencial pero puede romper química; descansar protege carga pero permite que un rival gane rol.

Logros de estadística, carrera, playoffs, clutch, gestión, estilo y cultura pop con nombres originales. Referencias reconocibles sin usar marcas, logos ni frases protegidas comoactivo principal. Vitrina de trofeos, récords por franquicia/liga, camiseta retirada y HOF ponderan pico, longevidad, títulos, premios y contribución; no solo puntos acumulados.

## 9. Presentación, audio y accesibilidad

Vóxel limpio, cancha legible, equipación original y avatar “Me” jugador/entrenador. Atkinson Hyperlegible Next para texto/cifras; Pixelify Sans para títulos, manteniendo cifras en Atkinson. Audio procedural: bote por superficie, zapatillas, red, tablero, bocina, público por intensidad y mezcla que no tape decisiones.

MVP es/en; después fr/de/it. Texto normal/grande/muy grande, azul/naranja, movimiento reducido, vibración/audio independientes, controles táctiles y ratón, foco visible, navegación por teclado, sin información solo por color, alternativa automática a minijuegos de tiempo. Guía de primera temporada por pasos, glosario y explicación de consecuencias antes de confirmar operaciones irreversibles.

Mascota y mundo de mascotas se reutilizan después con decaimiento offline limitado y sin castigar ausencia. GOAT es publicación opt-in de métricas resumidas, no cuenta obligatoria ni save remoto.

## 10. Futuro sin deuda estructural

- Carreras femeninas completas: mismos sistemas, datos/reglas/economía propios; no un simple filtro ni salary escalado al 4%.
- Épocas: reglas, calendarios, nombres, estética y economía versionados por temporada; el motor no lleva “año actual” hardcodeado.
- Mundo ampliado: ligas, continentes y selecciones como paquetes de datos, no ramas de código.
- 3D: solo jugadas clave al principio; nunca requisito para simular ni para entender una decisión.
