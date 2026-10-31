# Informe fase 1 — Fundaciones offline y censo mundial

**Fecha:** 31-10-2026

**Estado:** completada para revisión. No es todavía un partido jugable.

## Cambios

- Aprobación de alcance recibida y corrección registrada: **todas las ligas existentes, ecosistema completo**.
- Núcleo determinista: hash estable, RNG sembrado/restaurbable, paso fijo y reloj de partido.
- Guardado versionado con checksum, migración 0→1, backup, journal local, exportación/importación y 10 ranuras.
- i18n es/en con fallback; accesibilidad base: texto grande, azul/naranja, movimiento reducido, vibración/audio.
- Censo mundial editable: esquema, validador JS/Python, importador/merge y semilla de 12 competiciones.
- Worker con fallback a main thread; UI de laboratorio, mundo, guardado y ajustes.
- Builder de HTML único offline con CSP `connect-src 'none'`.

## Archivos principales

- `src/core/`, `src/data/world.js`, `src/platform/`, `src/worker/`, `src/ui/`
- `data/world/schema.json`, `data/world/seed.json`
- `tools/build.py`, `tools/census_import.py`
- `tests/core.test.js`, `tests/world.test.js`, `tests/storage.test.js`, `tests/build.test.js`
- `dist/index.html` generado

## Pruebas ejecutadas

- `npm run check`
  - `validate:world`: OK, 12 competiciones semilla.
  - `build`: OK, `dist/index.html`, 57.400 bytes aprox.
  - `node --test`: **18 passed, 0 failed**.
- `git diff --check`: OK.

## Rendimiento / consola

- No hay todavía medición real de 60 fps en gama baja; la fase 1 no tiene partido ni 3D.
- No se ha ejecutado navegador headless en este entorno; la prueba de consola queda pendiente para la fase de presentación.
- El build no incluye assets externos ni solicitudes de red por defecto.

## Incertidumbres

- El censo semilla **no** representa todas las ligas del mundo; solo prueba el pipeline.
- IndexedDB en WebView/file:// debe probarse en dispositivo real; existe fallback localStorage.
- Worker Blob en WebView debe probarse en dispositivo real; existe fallback main thread.
- Fuentes Atkinson/Pixelify y assets vóxel/audio aún no se han incorporado.

## Assets necesarios

- Ninguno bloqueante para fase 1.
- Antes de fase visual: aprobar paleta/silueta, fuentes con licencia, dispositivo gama baja de referencia.

## Siguiente paso

Fase 2: motor de posesiones y perfiles de reglas FIBA/NA/NCAA, con laboratorio de calibración. En paralelo, ampliar el censo por paquetes país/categoría hasta cobertura completa verificable.
