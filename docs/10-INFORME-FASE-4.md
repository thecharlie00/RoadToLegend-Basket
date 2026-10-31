# 10 — Informe de fase 4: presentación MVP, vida y nombres inspirados

**Fecha:** 31-10-2026. **Estado:** implementado para revisión; puerta de rendimiento/consola en dispositivo real todavía pendiente. **Build:** `dist/index.html`, 548.604 bytes, sha256 `19155756add8…`. **Tests:** 56/56. **Push/AAB:** no realizados.

## Instrucciones de nombres aplicadas

- Solo se modifican **nombres de jugadores**. Los nombres de clubes, equipos y competiciones no se renombran desde el motor ni desde el paquete de nombres inspirados.
- Paquete jugable: `data/players/inspired-names.json`, 77 nombres ficticios alterados fonéticamente a partir de jugadores conocidos. Ejemplos: `LeBron Jamison`, `Stephen Curran`, `Nikola Jokanovic`, `Luka Danilovic`, `Victor Wembani`, `Sergio Lull`, `Facundo Campos`, `Eddie Tavares`.
- Auditoría interna: `research/player-name-inspirations.json` conserva `referenceName` solo para revisión; `notForDistribution: true`. No está en `src/manifest.json` y un test verifica que el build no empaqueta el paquete interno ni nombres reales exactos como token independiente.
- Se corrigió una colisión normalizada exacta: `Jan Vesely` → `Jan Vessely`.
- Estado legal: `pending-clearance`. Algunas variantes siguen siendo cercanas a la referencia; antes de publicar hay que revisar riesgo de derecho de imagen/marca y aprobar lista final.

## Cambios principales

- `src/domain/names.js`: API `configure/getPack/inspiredName/assignInspiredToClubs`; asignación determinista de estrellas inspiradas sin tocar nombres de club.
- `src/domain/season.js` y `src/match/engine.js`: clubes MVP y `demoTeam` reciben jugadores inspirados; el nombre del equipo se conserva.
- `tools/generate_content.py`: generador determinista de contenido bilingüe es/en.
- `data/content/`: 100 eventos, 50 logros, 12 objetos de tienda, 6 plantillas de prensa y 8 pasos de guía.
- `src/domain/content.js`: estado de vida, eventos cada 3 semanas, efectos declarativos, logros, compra/equipo, prensa y guía. Los bonus de objeto se aplican una sola vez por carrera; reequipar no apila efectos.
- `src/domain/career.js`: integración de vida/eventos/logros/prensa, entrenamiento/fichajes/práctica/guía, hash y guardado. La práctica usa semilla por intento para no repetir la misma tirada.
- `src/match/minigames.js`: tiro libre y bocina con entrada precomprometida a 60 Hz; modo automático equivalente sin penalización de accesibilidad.
- `src/render/court2d.js`: cancha táctica 2D derivada del mismo log de eventos del motor;_frames acotados y dibujables sin navegador.
- `src/worker/handler.js`: RPC `content.validate`, `career.event`, `career.buy`, `career.equip`, `career.practice`, `career.guide`, `minigame.resolve`.
- `src/ui/app.js` + `style.css`: pestaña **Vida**, eventos pendientes, logros, tienda, Me 2D, prensa, guía, práctica TL/bocina; reproducción 2D en **Partido** con play/pausa/paso.
- `src/locales/{es,en}.json`: claves de fase 4; test de paridad es/en.
- Fuentes offline: Atkinson Hyperlegible Next y Pixelify Sans embebidas como `data:` woff2 con licencias OFL en el HTML; CSP sigue sin permitir red.
- `tools/build.py`: inyecta `CAA_DATA` al worker y fuentes/licencias al HTML principal.
- Tests nuevos: `tests/phase4.test.js`; build test ampliado para fuentes/licencias.

## Pruebas ejecutadas

- `npm run check`: censo OK, build OK, **56/56 tests**.
- Determinismo de nombres inspirados y asignación a clubes sin alterar nombres de equipo.
- Build no contiene `player-name-inspirations`, `notForDistribution` ni nombres reales de referencia como token independiente.
- Contenido bilingüe y conteos: 100 eventos / 50 logros / 12 tienda / 6 prensa / 8 guía.
- Eventos, logros, tienda y prensa con consecuencias deterministas; reequipar no apila bonus.
- Vida sobrevive save/resume; práctica repetida no reutiliza la misma semilla.
- Minijuegos deterministas, 60 Hz lógicos, bocina legal/ilegal y automático no penalizado.
- Court2D: frames acotados, 10 jugadores, balón dentro de cancha y dibujo smoke sin navegador.
- RPC worker de contenido/vida/minijuegos.
- Paridad de claves es/en.

## Rendimiento y errores: límite honesto

- No se afirma 60 fps ni consola limpia: no hay navegador headless ni dispositivo Android gama baja en este entorno.
- La reproducción 2D avanza por jugada cada ~120 ms; no es una animación interpolada a 60 fps. Los minijuegos usan ticks lógicos a 60 Hz, pero el render no se ha medido en dispositivo real.
- Puerta de fase 4 pendiente: medir frame time, memoria y consola en WebView/web real antes de cerrar rendimiento.

## Incertidumbres / límites

- Los 100 eventos son plantillas generadas por temas/variantes, no 100 eventos escritos manualmente uno a uno.
- Nombres inspirados: `pending-clearance`; revisar variantes cercanas antes de publicación.
- Tienda/Me es 2D básico; no hay voxel 3D ni audio todavía.
- Economía NA/EU, playoffs completos, NCAA jugable, copas, selecciones y censo mundial completo siguen fuera de esta fase.
- Censo mundial sigue `partial`: 41 competiciones, 10 verificadas y 31 pendientes.
- FIBA/ACB no está calibrado con tabla objetivo oficial completa.

## Assets que debe aportar o aprobar el usuario

- Aprobar/rechazar la lista de nombres inspirados y asumir revisión legal antes de publicar.
- Ningún asset bloqueante nuevo para esta fase; fuentes OFL ya embebidas.
- Para fase 5/6: dispositivo Android gama baja de referencia, samples de audio con licencia o aprobación de audio procedural, y modelos vóxel con escala/anclajes si se adelanta 3D.

## Siguiente paso

Fase 5: endurecimiento web/Android WebView, export/import completo, accesibilidad completa, medición real de rendimiento/consola y beta cerrada. No push ni AAB hasta instrucción explícita.
