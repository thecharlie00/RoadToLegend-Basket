# Herramientas del refactor

Se usaron una vez para partir `src/ui/app.js` y `src/domain/career.js` con un análisis de ámbitos real. No forman parte del build.

- `split2.mjs`: mueve funciones y constantes de nivel superior a módulos y reescribe lo compartido para que llegue por un contexto (`ui` o `K`).
- `actions.mjs`: convierte la cadena de `if/else` de `action()` en tablas de acciones por módulo.
- `dead.mjs`: lista declaraciones que nadie lee.

Necesitan `npm i --no-save espree@10 eslint-scope@8`.
