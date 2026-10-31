# 01 — Auditoría del juego de fútbol y plan de reutilización

## 1. Foto real de la referencia

- Repositorio: `thecharlie00/camino-a-la-leyenda`; clon read-only en `/home/user/reference-camino-a-la-leyenda`.
- Commit: `8e9c093ca025e04ab8c0978528aac0855fee7c9b`; versión visible 5.19 (69) [web].
- 742 archivos versionados, alrededor de 65 MB. `legacy-game/src/`: 128 JS; 123 de runtime sin los cinco `lang-*`; 47.952 líneas de runtime y ~94.305 incluyendo traducciones.
- `legacy-game/assets`: ~1,27 MB incluyendo metadatos de directorio. No es un juego con gigabytes de assets.
- 17 archivos de test/build/runtime. **No se han ejecutado** en esta auditoría.
- Sin modificaciones en el clon: `git status --porcelain` vacío.

## 2. Arquitectura observada

Es JavaScript clásico con módulos IIFE/globales (`S`, `W`, `DATA`, `UIX`) y un `ORDER` explícito en `build_legacy_game.py`. El builder genera un HTML único con código, CSS, fuentes y assets embebidos. Web arranca de forma monolítica; Android ejecuta módulos numerados de forma incremental y difiere idiomas/modelos. La app Android es una WebView Java empaquetada manualmente con AAPT2/D8/bundletool; hay workflows de AAB y Pages.

Esto es reutilizable como **estrategia de distribución**, no como prueba de que cada módulo sea independiente. El mismo HTML debe seguir siendo la unidad de juego; las diferencias de arranque no deben bifurcar reglas ni experiencia.

## 3. Matriz de reutilización

| Zona / evidencia | Veredicto | Qué se copia o adapta | Qué se sustituye |
|---|---|---|---|
| `i18n.js` (216 líneas), carga diferida de idiomas | Adaptar | Diccionarios, claves, fallback, carga por idioma y overlay femenino. | Textos, posiciones, monedas y supuestos de fútbol. |
| `anim.js` (225), `sfx.js` (116) | Adaptar | Pooling, easing, hápticos, mezclador y gating de audio. | Clips, rebote/zapatillas/red/bocina y mezcla de pabellón. |
| `ui-steps.js:10–52` | Adaptar | Tamaños de texto, azul/naranja, movimiento reducido, vibración y audio. | Guía y logros de baloncesto; añadir foco/teclado y objetivos táctiles. |
| `names.js` (105) | Adaptar con cambios | Pools por nacionalidad y estructura nombre/apellido. | Inyectar RNG; eliminar `Math.random` del camino determinista. |
| `events.js` (1.217) y extensiones | Patrón reutilizable | Condiciones, pesos, opciones, efectos, cooldowns y resolución. | Vocabulario de efectos, mundo, minutos, posesiones, contratos y lesiones. |
| `engine-player.js:1130–1265` | Patrón reutilizable | Cola de decisiones y pipeline de efectos. | Consultas futbolísticas y efectos de goles/partidos. |
| `achieve.js`, `trophies.js`, `ui-steps.js` | Adaptar | Desbloqueo, catálogo, vitrina y notificación. | Logros, condiciones y trofeos de baloncesto. |
| `gx-core.js`, `gx-items.js`, `look56.js`, `ui-gear.js`, `ui-shop.js` | Adaptar | Inventario, equipo visible, tienda y desafíos. | Botas/guantes → zapatillas, mangas, rodilleras, calentamiento; bonuses pequeños. |
| `pet-sim.js` (441) | Reutilizable después | Necesidades, vínculo, decaimiento offline y persistencia. | Contrato de reloj/energía y contenido; fuera del MVP. |
| `pet-world.js`, `pet-rig.js`, `pet-models.js` | Reutilizable después | Mundo, modelos y rig procedural. | Desacoplar de `VoxCore`/fútbol; nuevas escenas y accesorios. |
| `vox-core.js` (500) | Extraer núcleo | Greedy meshing, AO, batching, cámara, calidad automática. | Depende directamente de `Pitch3D.core`; no funciona aislado tal cual. |
| `rig.js`, `sp-rig.js`, `view3d.js`, `ui-yo3d.js` | Adaptar/reescribir piezas | Pivotes, caché de mallas, equipo y animación procedural. | Cuerpo, gestos y clips de baloncesto; anclajes de balón/manos. |
| `pitch.js`, `pitch3d*.js`, `match41.js`, `sp-*`, `shootout.js` | No copiar como lógica | Ideas de presentación y separación de vistas. | Geometría de cancha, posesiones, física, IA y minijuegos nuevos. |
| `engine-core.js`, `engine-player.js`, `engine-manager.js`, `engine-market.js` | Reescribir dominio | Experiencia de diseño y algunos helpers puros. | Mundo, calendario, mercados, draft, cap, stats y simulación. |
| `ui.js:105–228` (`Store`) | Adaptar con correcciones | Slots, compresión, índice, backup, exportación. | Validación `o.cr && (o.p || o.m)`, sync de cuenta y atomicidad insuficiente. |
| `save56.js`, `eras-core.js` | Patrón | Migraciones y snapshots por época. | Esquema y migraciones propias desde v1. |
| `build_legacy_game.py` | Adaptar | HTML único, fuentes/assets embebidos, orden y versiones. | Manifest de dependencias, presupuestos de carga y lazy-load igual en web/WebView. |
| `android/` y workflows | Adaptar | WebView local, empaquetado, CI y firma. | IDs, URLs, red, anuncios, nombre y pruebas de baloncesto. |
| `goat.js`, `ui-goat.js`, worker | Opcional posterior | Publicación opt-in y ranking comunitario. | Namespace/métricas de baloncesto; nunca sincronización autoritativa de saves. |
| `test/` | Adaptar arnés | Smoke de build, arranque, runtime y publicación. | Expectativas/versiones/datos de fútbol; añadir pruebas de motor/reglas/save. |

## 4. Hallazgos que cambian el diseño

### Guardado

`Store.atomic()` usa claves temporales y fallback, pero no hay transacción entre partida, índice y backup. La validación acepta estructuras de fútbol. El nuevo juego necesita esquema propio, checksum, migración antes de activar, journal/transacción y recuperación explícita. No copiar la promesa de “atomicidad” multi-clave de localStorage.

### Aleatoriedad

`engine-core.js:13` persiste `S.rng`, pero nombres, efectos visuales y algunos minijuegos usan `Math.random`/`Date.now`. En baloncesto, toda decisión deportiva debe recibir RNG con stream y contador; reloj y cosmética no pueden alterar resultados.

### Presentación 3D

No hay dependencia runtime de Three.js en los fuentes auditados. Es WebGL propio. `VoxCore` devuelve `null` si falta `Pitch3D.core`; `SpRig` depende de partes futbolísticas. Primero se extrae un `VoxelRuntime` neutral; después se reutilizan rigs/mascotas. No prometer “copiar el 3D” sin ese trabajo.

### Tipografía

El builder real ya usa **Atkinson Hyperlegible Next** para texto/cifras y **Pixelify Sans** para títulos (`CamDisp`), con dígitos de títulos en Atkinson. Los WOFF2 existen en `legacy-game/fonts/files/`. El `fonts/package.json` de la raíz describe otras fuentes y no representa el runtime actual. No se localizó un aviso OFL junto a los WOFF2: antes de copiarlos hay que añadir procedencia y licencia upstream.

### Offline y anuncios

Los métodos nativos de anuncios son stubs y ambos targets sustituyen `NO_ADS=false` por `true`. No hay SDK productivo de rewarded/consentimiento que dar por hecho. Además, `MainActivity.java:41–43` consulta un puntero de versión cada dos minutos y tiene endpoint GOAT. El nuevo juego debe eliminar/gatear **ambos** caminos; “sin anuncios” no basta para ser offline-first.

### Licencias y pruebas

No se encontró un archivo de licencia raíz por nombre; eso no demuestra ausencia de derechos ni autoriza copiar assets de terceros. Cada copia llevará procedencia. Los tests existentes están acoplados a versión y fútbol: sirven de arnés, no de certificado del nuevo motor.

## 5. Repositorio separado frente a núcleo compartido

| Opción | Ventajas | Costes / riesgos | Recomendación |
|---|---|---|---|
| Repo nuevo + copia selectiva | Aislamiento total, releases independientes, sin romper fútbol, libertad para corregir save/RNG. | Duplicación temporal y port manual de fixes. | **Ahora.** |
| Monorepo / paquete compartido inmediato | Un fix llega a ambos, menos duplicación. | Acoplar globals, builds, saves y calendarios de release; migrar fútbol sin necesidad. | No ahora. |
| Núcleo compartido posterior | Reutilizar lo ya estable con contratos y versiones. | Requiere API, tests de compatibilidad y gobernanza. | Reevaluar tras MVP y un ciclo estable. |

Crear `THIRD_PARTY_NOTICES.md` y `docs/UPSTREAM_SYNC.md` al iniciar implementación: commit origen, módulos copiados, licencia, cambios y fixes pendientes. No usar submódulo vivo que cambie el juego bajo los pies.

## 6. Orden de extracción seguro

1. Utilidades puras, RNG, i18n, accesibilidad y audio.
2. Persistencia con contrato de dominio y pruebas de cuota/corrupción.
3. Eventos/logros/tienda con vocabulario de baloncesto.
4. Runtime vóxel neutral y avatar.
5. Mascota, GOAT y escenas complejas cuando entren en fase.

Cada módulo copiado debe arrancar en un arnés mínimo sin globals de fútbol. Si no puede, se documenta el adaptador o se reescribe; no se arrastra medio juego para usar una función.
