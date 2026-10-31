# Baketball: Road to legend — shell Android

**Estado: fuentes preparadas, no compiladas ni firmadas.** No se ha generado un APK/AAB ni se ha hecho push. Este directorio no contiene claves de publicación.

## Contenido

- `MainActivity.java`: `ComponentActivity`, WebView local, `WebViewAssetLoader`, bloqueo de navegación/red externa, ciclo de vida, atrás y exportación/importación mediante Storage Access Framework.
- Origen reservado: `https://appassets.androidplatform.net/assets/game/index.html`. No es un servidor: las respuestas proceden de assets locales. El permiso `INTERNET` no está declarado.
- Mismo HTML/CSP/juego que web; no se bifurca el dominio. JavaScript/DOM storage habilitados solo para este contenido; acceso a archivos/contenido del WebView deshabilitado. El archivo de importación llega mediante el selector del sistema, no mediante `file://`.
- El nombre visible cambia; `applicationId`, paquete Java, base IndexedDB y formato de guardado conservan sus IDs anteriores para no perder partidas.

- `minSdk 24`, `targetSdk/compileSdk 36`, Java 17, AndroidX WebKit 1.14.0 y Activity 1.10.1; AGP 8.13.0 y Gradle 8.13. Versiones fijadas para una primera compilación reproducible, **no certificadas aquí por falta de JDK/SDK**.
- Wrapper procedente de `gradle/gradle`, tag `v8.13.0`; la distribución descargada por un futuro build se verifica con el SHA-256 publicado en `gradle/gradle-distributions`, release `v8.13.0`.
- Icono vectorial original provisional. No contiene logos de clubes/ligas ni assets de terceros.

## Preparar assets desde la raíz

```sh
npm ci
npm run check:browser
npm run android:sync
```

`android:sync` solo genera el HTML y lo copia a `app/src/main/assets/game/`. No llama a Gradle. Los assets generados están ignorados por Git; hay que sincronizarlos antes de compilar.

## Compilación futura, con autorización y entorno Android

Requisitos: JDK 17, Android SDK 36 y herramientas de build instaladas/configuradas por el desarrollador. Desde este directorio, un build de depuración sería:

```sh
./gradlew assembleDebug
```

**No ejecutar tareas de bundle/release/publicación sin instrucción explícita.** Hace falta configurar firma fuera del repositorio. La primera compilación de Gradle descarga herramientas: esa descarga pertenece al entorno de desarrollo, no al juego. El juego terminado no solicita red.

## Puerta pendiente en dispositivo real

Probar API 24 y WebView actual, además del móvil gama baja que se elija como referencia:

1. Arranque sin conexión, worker Blob bajo CSP, IndexedDB y fallbacks.
2. Guardar, forzar cierre, reanudar, backup corrupto, cuota, borrar/importar/exportar y cancelar selectores SAF.
3. Atrás dentro de pestañas/diálogos; atrás en raíz; pause/resume durante práctica y reproducción.
4. TalkBack, teclado externo, fuentes grandes, contraste, movimiento reducido y objetivos táctiles.
5. Medir 180 frames de Canvas2D, p95, tareas largas, memoria y temperatura tras una sesión prolongada. Exportar diagnóstico desde Laboratorio.
6. Verificar consola remota y ausencia de solicitudes externas. No basta el resultado de Chromium de escritorio.

No hay SDK de anuncios ni consentimiento de anuncios porque los anuncios están desactivados. Si se activan en otra fase, deberán diseñar consentimiento/privacidad y una alternativa no publicitaria antes de integrar SDK/red.
