# 05 — Arquitectura técnica, rendimiento y fases

## 1. Stack propuesto

Mismo juego en web y Android WebView: JavaScript clásico modular, HTML/CSS/Canvas 2D, WebGL propio para vóxel posterior, Web Worker para simulación, Python para empaquetado. Sin servidor de juego, sin cuenta obligatoria, sin Unity/Three.js como requisito MVP.

- `core/`: RNG, reloj, eventos, efectos, invariantes.
- `domain/`: jugador, entrenador, contratos, draft, lesiones, mundo.
- `match/`: motor de posesiones, reglas, stats, táctica.
- `data/`: paquetes de temporada, nombres, eventos, logros, cosméticos.
- `ui/`: pantallas, resumen, 2D, minijuegos, tienda, accesibilidad.
- `platform/`: storage, audio, hápticos, WebView bridge, ads/GOAT opt-in.
- `render/`: runtime vóxel neutral, rigs, cancha, calidad.
- `tools/`: builder, validadores, laboratorio de calibración, migraciones.
- `tests/`: unit, rules, save, determinism, smoke, performance.

Dependencias explícitas y manifest de carga. El dominio no importa UI ni plataforma. El motor no lee DOM. El mismo HTML funciona en ambos targets; solo cambian arranque/bridge.

## 2. Offline y red

Política por defecto: cero solicitudes. Assets, fuentes, idiomas y datos embebidos o cacheados localmente. CSP restrictiva; WebView sin navegación externa arbitraria. Eliminar el chequeo nativo de versión cada dos minutos heredado del fútbol.

Red solo para: (a) rewarded opcional con SDK/consentimiento real; (b) GOAT opt-in posterior. Ninguno es necesario para jugar, guardar, entrenar, fichar o desbloquear contenido. Si falla red, el juego continúa. No subir saves completos ni datos personales a GOAT.

Web: service worker/PWA opcional para caché; Android: assets locales. IndexedDB como almacenamiento principal si el origen local lo soporta; fallback localStorage comprimido probado en WebView. No depender de `file://` para IDB sin prueba. Valorar origen local seguro de WebViewAssetLoader en fase 1 si simplifica compatibilidad.

## 3. Guardado

10 slots, autoguardado, backup anterior, exportación/importación y borrado con tombstone. Registro con `schemaVersion`, `careerId`, `seed`, `rngCounters`, `packVersions`, `checksum`, `updatedAt`.

Escritura: validar → migrar a copia → escribir journal/staging → commit → actualizar índice → limpiar. En IDB usar transacción; en localStoragereconocer que no hay transacción multi-clave y recuperar por journal. Probar cuota llena, corrupción, cierre durante escritura y backup válido. Nunca borrar el único save bueno antes de confirmar el nuevo.

Guardar en límites de posesión/acción, antes/después de decisiones, mercado, draft y minijuegos. Una tirada comprometida no se repite al cerrar. Sync de cuenta del fútbol queda fuera del MVP offline.

## 4. Rendimiento y accesibilidad

Objetivo: 60 fps en dispositivo gama baja de referencia, main thread <8 ms por frame de UI, simulación en worker, cero errores de consola. Presupuestos iniciales: 2D MVP; 3D posterior solo jugadas clave, LOD, pooling, greedy meshing, calidad automática y límite de partículas. No se afirma 60 fps hasta medir en dispositivo real.

Atkinson Hyperlegible Next + Pixelify Sans; texto/números legibles, títulos pixel. Controles táctiles ≥44 px, foco visible, teclado/ratón, texto grande, azul/naranja, movimiento reducido, vibración/audio, alternativa automática a minijuegos. Guía de primera temporada y glosario. es/en MVP; fr/de/it después.

## 5. Fases y puertas

| Fase | Entrega | Pruebas / puerta de salida |
|---|---|---|
| 0 — Aprobación | Este paquete; decisiones de alcance/título/repositorio. | OK explícito del usuario. No programar antes. |
| 1 — Fundaciones | Repo limpio, manifest, RNG, reloj, storage, i18n/a11y base, builder HTML, worker, validadores. | Determinismo, save/cuota/corrupción, smoke web/WebView, offline sin requests, perfil de frame. |
| 2 — Motor y reglas | Posesiones, perfiles FIBA/NA, stats, calibración, resumen. | Casos oficiales, invariantes, miles de partidos, mismo hash resumen/2D. |
| 3 — Carreras MVP | Jugador/entrenador, España 1+2, NA 30/draft, contratos, lesiones, carga, mercado. | Temporada completa simulada, ascensos/descensos, draft/undrafted, cruces, saves largos. |
| 4 — Presentación MVP | 2D, TL/bocina, 100 eventos/50 logros, tienda/Me 2D, prensa, es/en, guía. | 60 fps medido, cero errores, minijuego/auto equivalentes, contenido localizado. |
| 5 — Endurecimiento | Android WebView, export/import, accesibilidad completa, beta cerrada. | Dispositivo real, cierre/reanudación, sin red, rendimiento, consentimiento ads si se activa. |
| 6 — 3D clave | Runtime vóxel neutral, cancha, rigs balón, jugadas clave y calidad. | Mismo resultado que 2D, memoria/frame, fallback 2D. |
| 7 — Mundo | NCAA, G League, copas, Europa continental, selecciones, Crea tu club, All-Star. | Calendarios por temporada, reglas propias, migraciones, simulación masiva. |
| 8 — Vida/legado | Mascota, GOAT opt-in, 300 eventos/150 logros+platino, fr/de/it, HOF completo. | Offline decaimiento, privacidad, ranking no autoritativo, localización. |
| 9 — Mujeres/épocas | Carreras femeninas completas y paquetes históricos. | Datos/reglas/economía propios, saves históricos, no regresión. |

No hay fechas prometidas. Cada fase requiere informe: cambios, archivos, pruebas ejecutadas/resultado, rendimiento, errores, incertidumbres, assets necesarios y siguiente paso. No push ni AAB hasta instrucción explícita.

## 6. Assets que debe aportar o aprobar el usuario

- **MVP:** ninguno bloqueante si se usa procedural. Aprobar paleta, silueta vóxel, nombres ficticios y dirección de audio. Fuentes con licencia/procedencia; no pedir logos reales.
- **3D posterior:** cancha FIBA 28×15 m / NA 28,65×15,24 m; aro 3,05 m. Personas 1,70–2,25 m, root en pies, Y arriba, +Z frente. Anclajes `hand.L`, `hand.R`, `head`, `chest`, `ball`; balón ~0,24 m diámetro como referencia visual, no regla.
- Modelos: formato acordado en fase 6 (GLB o voxel grid propio), presupuesto por personaje acordado tras perfil; sin exigir modelo antes de tiempo. Si el usuario aporta modelo, pedir escala real, pivote, orientación, LODs, materiales y derechos.
- Audio: bote, zapatillas, red, tablero, bocina, público. Procedural primero; samples solo con licencia clara.

## 7. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Copiar fútbol arrastra globals/fechas | Aislamiento por módulo, manifest, tests de arranque sin fútbol. |
| Motor “bonito” pero estadísticamente falso | Calibración por temporada completa y perfiles, no líderes. |
| Reglas mezcladas | RuleSet versionado + casos oficiales + fuente/estado. |
| Save pierde carrera | Journal/transacción, backup, export, pruebas de cuota/cierre. |
| 3D revienta gama baja | 2D primero, 3D clave, LOD/pooling, fallback y medición real. |
| Alcance mundial infinito | MVP cerrado; paquetes de mundo posteriores. |
| Ads/GOAT rompen offline | Opt-in, stubs honestos, cero red por defecto, alternativa local. |
| Datos/licencias dudosas | `pendingVerification`, ficción original, notices y revisión antes de publicar. |

## 8. Informe de fase 0

- Cambios: documentación de preproducción en `docs/`.
- Código ejecutable: ninguno. Builds/tests: no ejecutados porque no hay implementación.
- Referencia: clon read-only limpio; no push, no AAB.
- Incertidumbres: cupos ACB, CBA completo, rookie/max-min exactos, ventanas, calibración FIBA/ACB, dispositivo gama baja, disponibilidad legal de nombres.
- Siguiente: con OK, fase 1; primero contrato de motor/save y arnés de pruebas, no Android.
