# 11 — Informe de fase 5: endurecimiento web y preparación Android

**Fecha:** 31-10-2026. **Estado:** implementación de endurecimiento entregada para revisión; **no es un cierre de beta ni una certificación Android**. Falta compilar/probar el shell en dispositivos reales. No se ha hecho push, generado AAB ni configurado firma/publicación.

**Build:** `dist/index.html`, 594.337 bytes; SHA-256 `98fcbdd6eb62663541686cd221f94bd67383d394d1e5267b3b3dca7c8b7260b8`. El asset Android generado coincide byte a byte; está ignorado por Git y se regenera con `npm run android:sync`.

## 1. Cambios principales

### Guardado y recuperación

- Sobre schema 1: límite de importación de 2 MiB de caracteres UTF-16, profundidad máxima 64, valores finitos, identificadores de ranura seguros, metadatos y checksum.
- El checksum detecta corrupción accidental; **no es firma ni protección antitrampas**. Un editor puede modificar payload y recalcularlo.
- Validación estructural de carrera, calendario, clubes, vida e intento de práctica antes de cargar/importar. Se comprueba la forma real `{ round, games }` de las jornadas, no se confunden con arrays.
- Al reanudar se reconstruyen índices de clubes y la referencia compartida jugador/plantilla. Test de cinco semanas confirma que no se bifurcan las estadísticas.
- IndexedDB: transacciones, backup anterior, tombstones y operaciones serializadas. localStorage: staging verificado, backup y recuperación de escritura interrumpida. No se presenta localStorage como transaccional.
- Fallback automático IDB → localStorage → memoria, con aviso persistente si no hay persistencia. Diez ranuras, autoguardado tras decisiones, carga automática de la última ranura válida.
- Exportar archivo, importar por selector o texto, validar/previsualizar, confirmar sustitución/borrado/carga. Exportación de la partida abierta aunque falle el almacenamiento.
- Migración schema 0→1 sin volver a firmar un checksum antiguo corrupto. Las fechas antiguas no parseables se normalizan de forma determinista.

### Práctica resistente a interrupciones

- RPC separadas `career.practice.begin`, `resolve`, `cancel`; se conserva la RPC automática anterior.
- El inicio guarda tipo, semana, contador y semilla del intento. Reanudar no cambia esos datos; la UI solo aporta el tick de soltado. Cancelar consume el intento.
- Validación de entradas numéricas de TL/bocina: no producen NaN/Infinity. El modo automático mantiene el centro de la ventana, sin penalización de accesibilidad.
- Al ocultar la página o recibir pausa nativa se detiene la animación, se invalida el reloj manual y se guarda. Al volver hay que reanudar o cancelar el intento, no se resuelve con el tiempo transcurrido en segundo plano.

### Worker y UI

- Worker Blob con timeout de 15 s, fallback ordenado al hilo principal, rechazo de errores y de peticiones pendientes al parar. La ruta local también convierte excepciones síncronas en rechazos.
- Pestañas ARIA con una sola parada de tabulación, flechas/Home/End; foco y campos preservados entre renders; región de estado separada del contenido interactivo.
- Confirmaciones inline `alertdialog`, fondo inerte, foco contenido, Escape/cancelar y prueba de tabulación. No se usa un diálogo nativo que bloquee el WebView.
- Texto grande, alto contraste, azul/naranja, movimiento reducido del sistema o explícito, skip-link, tablas desplazables con nombre, objetivos de al menos 44 px y safe-area CSS.
- Español/inglés: **179 claves por idioma**, paridad verificada. Audio/vibración son preferencias preparadas; todavía no hay audio/hápticos reales y se indica en la UI.
- Corregidos el efecto de moral del entrenador, el contador de logros codificado a 50 y una rama de cancelación duplicada.

### Android preparado, no ejecutado

- Nuevo `android/`: shell Java, AssetLoader en origen reservado, bloqueo de navegación externa, sin permiso INTERNET, sin acceso file/content genérico, SAF para importar/exportar, atrás y pausa/reanudación.
- Mismo HTML y reglas que web. No hay SDK de anuncios, compras, telemetría ni servidores de juego.
- AGP/Gradle/AndroidX fijados; wrapper oficial con checksum. No hay JDK/SDK aquí: **las versiones y el código Java no se han validado mediante compilación**.
- `android/README.md` documenta preparación, futuro build de depuración y puerta de dispositivo. No se ha ejecutado ninguna tarea Gradle.

## 2. Archivos principales

- Dominio/save: `src/core/save.js`, `src/domain/career.js`, `src/domain/content.js`, `src/match/minigames.js`.
- Plataforma: `src/platform/{storage,worker-client,diagnostics}.js`, `src/core/a11y.js`, `src/worker/handler.js`.
- Presentación: `src/ui/{app.js,style.css}`, `src/locales/{es,en}.json`, `src/manifest.json`, `tools/build.py`.
- Android: `android/`, `tools/sync_android.py`.
- QA: `tests/phase5.test.js`, `tools/browser-env.mjs`, `tools/browser_smoke.mjs`, `data/qa/phase5-browser.json`.
- Guías: `README.md`, `android/README.md`, `android/NOTICE.md`.

## 3. Pruebas realmente ejecutadas

- `npm run check:browser`: censo OK, build OK, **68/68 tests Node**, **7/7 escenarios Chromium**.
- Chromium headless 153.0.8010.0, archivo local `file://`, sin desactivar seguridad web/CORS. Los flags de sandbox del entorno CI no cambian la política del juego.
- Escenarios: carrera/autoguardado/reload/eventos/práctica; móvil 360 px con carrera y partido; inglés/texto grande/contraste/movimiento; recuperación IDB/selector SAF-equivalente/pausa; contrato de bridge Android; worker ausente; almacenamiento denegado con exportación.
- **11 auditorías axe** WCAG 2 A/AA + 2.1 AA: cero violaciones detectadas en las pantallas/estados recorridos. Esto no sustituye TalkBack/NVDA ni certifica toda la aplicación.
- **Cero errores de consola, cero excepciones de página y cero solicitudes HTTP externas** en esos siete escenarios.
- Pruebas de cuota, corrupción/backup, staging, tombstone, importación hostil, commitment de práctica, identidad jugador/plantilla, timeout/orden del worker, teclado, diagnósticos y estructura offline Android.
- Auditoría de nombres: cero referencias reales exactas del paquete de investigación en el HTML; los equipos no se han renombrado.
- `git diff --check`: sin errores. `node --check`: fuentes JS válidas. Asset web/Android: hashes idénticos.

## 4. Rendimiento medido y límites

Muestra final con Canvas2D visible, 180 intervalos, escritorio 1280×900, DPR 1, worker activo:

| Métrica | Resultado |
|---|---:|
| Media | 16,666 ms |
| Mediana | 16,7 ms |
| p95 | 16,8 ms |
| Máximo | 16,8 ms |
| FPS medios | 60,00 |
| Intervalos >33,34 ms | 0 |
| Long tasks observadas | 0 |

El contador estricto >16,67 marca 111 intervalos de 16,7/16,8 ms: es jitter de presentación, no 116 frames perdidos. La reproducción táctica cambia de evento cada ~120 ms; los minijuegos usan ticks lógicos de 60 Hz. Esta muestra **no demuestra animación interpolada ni 60 fps en gama baja Android**.

No hay móvil físico, JDK/SDK, WebView remoto, sesión de beta cerrada ni prueba de temperatura/memoria prolongada. La puerta de rendimiento Android y la beta siguen pendientes. El juego web es un HTML autocontenido que funciona sin red una vez abierto; no se ha añadido service worker/PWA, por lo que no se promete que una URL hospedada vuelva a cargar tras perder conexión.

## 5. Incertidumbres y alcance no ampliado

- No se activa publicidad: no hay consentimiento que mostrar todavía. Cualquier futura integración requiere revisión de privacidad, permiso INTERNET explícitamente separado y recompensa siempre opcional.
- Persistencia del navegador puede ser evacuable por el sistema; exportar sigue siendo la copia portátil. El guardado en memoria se avisa como no persistente.
- Nombres inspirados siguen `pending-clearance`; no implica autorización de imagen/marca. Investigación real excluida del build.
- Censo mundial intacto: 41 competiciones, 10 verificadas/31 pendientes, cobertura parcial. No se afirma incluir ya todas las ligas del mundo.
- Sigue fuera de esta fase: 3D, audio real, NCAA/copas/selecciones jugables, censos completos, mujeres/épocas, mercado/playoffs completos y economía totalmente verificada. No se han alterado las limitaciones de fases 2–4 para simular que están resueltas.

## 6. Assets y siguiente puerta

No hace falta un modelo/logo nuevo para probar esta fase. El icono Android es vectorial original provisional. Hace falta acceso a un Android de gama baja y otro dispositivo/WebView antiguo para validar el shell; idealmente teclado externo y lector de pantalla. Para fase 6 se mantienen los requisitos de escala/anclajes de `docs/05`.

Siguiente paso: compilar una beta de depuración en un entorno Android autorizado, ejecutar la checklist de `android/README.md`, corregir incompatibilidades y medir antes de declarar cerrada la fase 5. Después, fase 6 —jugadas clave voxel 3D con fallback 2D— o ampliar datos/reglas según prioridad. **No push ni AAB sin instrucción explícita.**
