# Baketball: Road to legend / RoadToLegend-Basket

Carrera de baloncesto offline-first para web y Android WebView. Hermano de `camino-a-la-leyenda`, con repositorio y dominio propios.

**Estado:** paridad de contenido con el fútbol: 304 decisiones, 220 trofeos, red social ficticia, rivalidades/récords/diario, 18 momentos históricos y mercado + cuerpo técnico del entrenador. 224 ligas en 148 países (todas las zonas FIBA, masculinas, femeninas, universitarias y de desarrollo). Fase 11: Crea tu club, selecciones, copa, desafíos, editor, carrera rápida e idiomas fr/de/it. Fase 10: directo en tiempo real, tienda con tiers, aspecto personalizable, modo Épocas 1920-2020 y 53 ligas. Antes: 28 ligas de todo el mundo, masculinas y femeninas, con jugadora o jugador y traspasos internacionales. Fase 9: estética propia "Pabellón", partido en directo y minijuegos en 3D, Familia y Dinastías (pareja, hijos, retirada, entrenador o relevo generacional). Fase 8: interfaz y bucle como *Camino a la Leyenda* (portada, modos, creación por pasos, INICIO/YO/LIGA/MÁS), 104 decisiones narrativas, 199 trofeos, minijuegos, mascota vóxel, playoffs con premios, herramientas de entrenador, guía y Salón de la fama. Base anterior: creación con club/arquetipo/mano, avatar voxel en Carrera/Vida, replays 3D con los cinco reales en pista y audio procedural opcional, con fallback 2D. Nombre visible actualizado; IDs internos y partidas anteriores conservados. Android sigue pendiente de compilación y prueba real. Hay fundaciones offline, guardado, i18n/a11y, worker, censo mundial parcial, motor determinista, carreras MVP jugador/entrenador, España 1+2, NA 30/draft, contratos, lesiones, carga, mercado, cruces, vista 2D, minijuegos TL/bocina, 100 eventos/50 logros, tienda, prensa, guía y fuentes offline. Solo se modifican nombres de jugadores; los equipos no se renombran desde el motor. Los nombres inspirados están `pending-clearance`.

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
- [Fase 6: voxel y jugadas clave](docs/12-INFORME-FASE-6.md)
- [Fase 6b: club, avatar, quintetos y audio](docs/13-INFORME-FASE-6B.md)
- [Fase 7: partido en directo y tabla de paridad](docs/14-INFORME-FASE-7.md)
- [Fase 8: parecido con el fútbol, contenido, minijuegos, mascota, playoffs y entrenador](docs/15-INFORME-FASE-8.md)
- [Fase 9: Familia y Dinastías, 3D y estética propia](docs/16-INFORME-FASE-9.md)
- [Ligas de todo el mundo, masculinas y femeninas](docs/17-INFORME-LIGAS-DEL-MUNDO.md)
- [Fase 10: tiempo real, tienda, aspecto, Épocas y más ligas](docs/18-INFORME-FASE-10.md)
- [Fase 11: Crea tu club, selecciones, copa, desafíos, editor e idiomas](docs/19-INFORME-FASE-11.md)
- [Todas las ligas del baloncesto mundial](docs/20-INFORME-LIGAS-MUNDIALES.md)

## Desarrollo

```bash
npm run check
```

Genera `dist/index.html` y ejecuta validación del censo, build y tests Node.

En **Carrera**, elige club inicial, arquetipo y mano dominante; crea la carrera y juega una semana. Pulsa **Ver partido de la semana** y elige **Jugada voxel 3D**, calidad y cámara. En **Vida** aparece el avatar voxel con el equipo comprado. El audio procedural está desactivado por defecto y se activa en **Ajustes**. Si WebGL falla, el juego continúa en 2D con el mismo resultado.

```bash
npm ci
npm run check:browser   # añade 11 escenarios Chromium y auditorías axe
npm run android:sync    # copia el HTML a assets; NO compila Android
```

Las pruebas de navegador usan dependencias de desarrollo; el juego no descarga nada. En Linux, el helper extrae las librerías del paquete Chromium a `.cache/`. Se puede usar `CAA_CHROMIUM_PATH` para un Chromium ya instalado. El resultado de escritorio no certifica WebView ni 60 fps en gama baja. Ver límites y mediciones en el informe de fase 5.

```bash
npm run calibrate -- --games 2000 --seed phase2-lock --rules NA-2026-27
```

No hacer push ni generar/lanzar AAB hasta aprobación explícita del usuario.
