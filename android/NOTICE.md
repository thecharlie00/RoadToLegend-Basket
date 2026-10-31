# Procedencia del wrapper

`gradlew`, `gradlew.bat` y `gradle/wrapper/gradle-wrapper.jar` se copiaron sin modificar desde https://github.com/gradle/gradle/tree/v8.13.0 (Gradle, Apache-2.0).

- Blob Git del JAR: `9bbc975c742b298b441bfb90dbc124400a3751b9`.
- SHA-256 del JAR: `81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f`.
- `gradle-wrapper.properties` se adaptó a la distribución estable 8.13, no a la RC del tag de origen.
- Distribución: https://github.com/gradle/gradle-distributions/releases/tag/v8.13.0
- SHA-256 publicado para `gradle-8.13-bin.zip`: `20f1b1176237254a6fc204d8434196fa11a4cfb387567519c61556e8710aed78`.

Las dependencias Android se resuelven en el futuro build desde Google Maven/Maven Central; no se incluyen sus binarios aquí. Licencias de fuentes OFL: `src/assets/fonts/OFL-*.txt`, también embebidas en el HTML.
