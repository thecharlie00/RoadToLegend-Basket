# Camino al Aro / RoadToLegend-Basket

Carrera de baloncesto offline-first para web y Android WebView. Hermano de `camino-a-la-leyenda`, con repositorio y dominio propios.

**Estado:** fase 5 de endurecimiento implementada para revisión; shell Android preparado sin compilar, certificación en dispositivo y beta pendientes. Hay fundaciones offline, guardado, i18n/a11y, worker, censo mundial parcial, motor determinista, carreras MVP jugador/entrenador, España 1+2, NA 30/draft, contratos, lesiones, carga, mercado, cruces, vista 2D, minijuegos TL/bocina, 100 eventos/50 logros, tienda/Me 2D, prensa, guía y fuentes offline. Solo se modifican nombres de jugadores; los equipos no se renombran desde el motor. Los nombres inspirados están `pending-clearance`.

Objetivo de mundo confirmado: **todas las ligas existentes, ecosistema completo** (senior/pro/semipro, amateur/regional, juveniles/canteras y universitario). La cobertura se ampliará por paquetes verificables.

- [Propuesta y alcance MVP](docs/00-PROPUESTA.md)
- [Auditoría y reutilización](docs/01-AUDITORIA-Y-REUTILIZACION.md)
- [GDD y referencias](docs/02-GDD-Y-REFERENCIAS.md)
- [Motor de posesiones](docs/03-MOTOR-DE-POSESIONES.md)
- [Mundo y reglas](docs/04-MUNDO-Y-REGLAS.md)
- [Arquitectura y fases](docs/05-ARQUITECTURA-Y-FASES.md)
- [Fuentes y nombres](docs/06-FUENTES-Y-NOMBRES.md)
- [Informe fase 1](docs/07-INFORME-FASE-1.md)
- [Informe fase 2](docs/08-INFORME-FASE-2.md)
- [Informe fase 3](docs/09-INFORME-FASE-3.md)
- [Informe fase 4](docs/10-INFORME-FASE-4.md)
- [Informe fase 5](docs/11-INFORME-FASE-5.md)
- [Shell Android y checklist real](android/README.md)

## Desarrollo

```bash
npm run check
```

Genera `dist/index.html` y ejecuta validación del censo, build y tests Node.

```bash
npm ci
npm run check:browser   # añade 7 escenarios Chromium y auditorías axe
npm run android:sync    # copia el HTML a assets; NO compila Android
```

Las pruebas de navegador usan dependencias de desarrollo; el juego no descarga nada. En Linux, el helper extrae las librerías del paquete Chromium a `.cache/`. Se puede usar `CAA_CHROMIUM_PATH` para un Chromium ya instalado. El resultado de escritorio no certifica WebView ni 60 fps en gama baja. Ver límites y mediciones en el informe de fase 5.

```bash
npm run calibrate -- --games 2000 --seed phase2-lock --rules NA-2026-27
```

No hacer push ni generar/lanzar AAB hasta aprobación explícita del usuario.
