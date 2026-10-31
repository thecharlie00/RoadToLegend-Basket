# Baketball: Road to legend — Propuesta de preproducción

**Estado:** fase 6 en desarrollo: jugadas clave voxel y replay de carrera, con fallback 2D. Android fuente sin compilar y beta real pendiente. **Fecha:** 31-10-2026. **Alcance actual:** fundaciones offline, guardado, i18n/a11y, worker, censo mundial parcial, motor determinista, carreras MVP jugador/entrenador, España 1+2, NA 30/draft, contratos, lesiones, carga, mercado, cruces, presentación 2D, minijuegos TL/bocina, vida/eventos/logros/tienda/Me/prensa/guía y nombres de jugador inspirados `pending-clearance`.

## Decisión recomendada

Construir el juego en este repositorio independiente, copiando del juego de fútbol únicamente los módulos comunes que superen una prueba de aislamiento. Mantener `camino-a-la-leyenda` intacto. No extraer ahora un paquete compartido: sus módulos dependen de globals, orden de carga, contenido futbolístico y formato de partida. Cuando ambos juegos estén estables, valorar un núcleo compartido versionado.

La referencia auditada es `thecharlie00/camino-a-la-leyenda`, commit `8e9c093ca025e04ab8c0978528aac0855fee7c9b` (`main`, 30-10-2026). Se clonó fuera de este repositorio y no se modificó.

## Promesa

**De la cancha del barrio al Salón de la Fama.** Una carrera de baloncesto offline donde importan tanto el tiro que entra en el último segundo como el contrato, la rotación o la decisión de vestuario que cambia una temporada. Dos ecosistemas creíbles —Europa y Norteamérica— con carreras de jugador y entrenador, sesiones móviles breves y un mundo que envejece contigo.

## Pilares

1. **La posesión cuenta:** creación, ventaja, ayuda, rebote y finalización; no un porcentaje de acierto disfrazado de partido.
2. **Dos carreras, un mundo:** el jugador vive minutos, rol y cuerpo; el entrenador vive plantilla, táctica, autoridad y presión.
3. **Dos caminos reales:** academia, ascensos, contratos y buyouts frente a draft, cap, picks y franquicia.
4. **Elegir deja huella:** consecuencias visibles a corto plazo y rastros posteriores; nunca una opción “correcta” evidente.
5. **Móvil sin espera obligatoria:** sesiones de 2–5 minutos, simulación rápida y continuidad de carreras largas.
6. **Vóxel con identidad:** cancha, sonido y equipo legibles; rendimiento antes que espectáculo.

## Requisito adicional de cobertura mundial

El usuario exige **todas las ligas de baloncesto existentes** como objetivo de máximo realismo y confirmó **todo el ecosistema**: senior/pro/semipro, amateur/regional, juveniles/canteras y universitario, masculino y femenino. Esto sustituye la idea de “solo ligas mayores”: el mundo debe diseñarse como censo global versionado por país/confederación, no como una lista corta hardcodeada. La cobertura se cargará por paquetes verificables; no se afirmará “completo” hasta que el censo y sus fuentes lo estén.

## MVP propuesto

| Área | Incluido en el primer lanzamiento |
|---|---|
| Carreras | Jugador y entrenador; elección libre de club disponible;presets de autoridad entrenador / entrenador-GM. |
| Europa | Ecosistema español: primera división de 18 clubes y segunda de 18 como categoría satélite jugable, con ascensos/descensos reales. Misma simulación; menos eventos exclusivos en segunda. |
| Norteamérica | Liga ficticia de 30 franquicias, temporada de 82 partidos, play-in, playoffs al mejor de siete, draft de dos rondas, combine/orientaciones y ruta de no drafteado. Desarrollo juvenil/delegado abstracto, no temporada completa de G League. |
| Partido | Motor determinista por posesiones; resumen y vista táctica 2D; decisiones de entrenador en momentos legales. |
| Minijuegos | Tiros libres y tiro sobre la bocina integrados en el partido, con resolución automática equivalente. |
| Gestión | Contratos, agentes, cargas, lesiones, forma, química, rotación, cap simplificado pero legal, mercado europeo y cruces entre continentes. |
| Contenido | 100 eventos y 50 logros iniciales, tienda básica, avatar “Me” 2D con equipo visible, prensa/social local. |
| Plataforma | Web y Android WebView con el mismo juego; guardado local, exportación/importación, es/en, accesibilidad y funcionamiento sin red. |
| Monetización | Sin compras con dinero real ni azar pagado. Anuncios recompensados opcionales solo cuando exista SDK/consentimiento real; siempre habrá alternativa offline. |

**Ampliación deliberada:** la segunda española añade 18 clubes, pero evita un ascenso falso contra equipos inexistentes. Es la única ampliación estructural recomendada sobre el MVP planteado.

**Fuera del MVP, con arquitectura preparada:** NCAA jugable, G League completa, otras ligas europeas/mundiales, competiciones continentales, selecciones, Crea tu club, All-Star, mascota, GOAT online, 3D de jugadas clave, carreras femeninas completas y épocas. No se prometen fechas sin conocer equipo y dispositivo de referencia.

## Reglas y datos: criterio de cierre

- Perfiles separados `FIBA-2026`, `NA-2026-27`, `NCAA-M-2026-27` y `NCAA-W-2026-27`; ninguno es un simple “modo difícil”.
- Números principales verificados contra fuentes oficiales en `04-MUNDO-Y-REGLAS.md` y `06-FUENTES-Y-NOMBRES.md`.
- Cupos ACB, CBA completo, calendarios de ventanas y competiciones futuras todavía tienen campos pendientes de fuente primaria. Se marcarán `pendingVerification` y no se presentarán como reglas reales confirmadas.
- Datos estadísticos de calibración: temporada completa 2025–26, no líderes individuales ni muestra parcial 2026–27.
- Nombres y escudos originales/paródicos editables. Sin logos, marcas, camisetas ni bases de datos con licencia no autorizada.

## Documento de lectura

1. [Auditoría y reutilización](01-AUDITORIA-Y-REUTILIZACION.md)
2. [GDD, referencias y economía](02-GDD-Y-REFERENCIAS.md)
3. [Especificación del motor de posesiones](03-MOTOR-DE-POSESIONES.md)
4. [MVP, mundo y reglas](04-MUNDO-Y-REGLAS.md)
5. [Arquitectura, fases y informes](05-ARQUITECTURA-Y-FASES.md)
6. [Fuentes, datos y nombres](06-FUENTES-Y-NOMBRES.md)
7. [Informe fase 1](07-INFORME-FASE-1.md)
8. [Informe fase 2](08-INFORME-FASE-2.md)
9. [Informe fase 3](09-INFORME-FASE-3.md)
10. [Informe fase 4](10-INFORME-FASE-4.md)
11. [Informe fase 5](11-INFORME-FASE-5.md)

## Aprobación solicitada

Aprobar o ajustar: **(a)** repositorio separado con copia selectiva; **(b)** MVP con España de dos niveles + liga norteamericana/draft; **(c)** 3D, NCAA, selecciones, Crea tu club, mascota y GOAT después del MVP; **(d)** título provisional histórico “Camino al Aro”, sustituido después por **Baketball: Road to legend**; sin autorización legal definitiva.

Tras el OK se empezará por la fase 1 —fundaciones, reglas y motor verificable—, no por empaquetar Android. No se hará push ni se generará/lanzará un AAB sin instrucción explícita.


## Actualización de nombre y fase 6

El usuario fijó el nombre visible exacto **Baketball: Road to legend** (31-10-2026). Los documentos históricos conservan sus resultados de fase; las referencias antiguas al título no son nombres de producto vigentes. El nuevo título no tiene cribado legal definitivo. IDs internos de guardado/Android se conservan por compatibilidad. Desarrollo actual: jugadas clave voxel con fallback 2D.
