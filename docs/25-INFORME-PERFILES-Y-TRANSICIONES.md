# Informe 25 — Perfiles por posición y transiciones con dirección

Fecha: 2026-11-02 · Rama: `arena/08e3b10a-roadtolegend-basket`

## Qué pedía el jugador

1. En la selección de perfil, **que haya perfiles distintos según la posición** elegida.
2. **Transiciones en el menú** para que la navegación se sienta fluida.

## Perfiles por posición

Antes el paso «posición» mostraba los siete arquetipos del motor a todo el mundo: un Base podía
elegir «Pívot dominante» y un Pívot «Director de juego». La lista era idéntica para los cinco puestos.

Ahora cada posición tiene **cuatro perfiles propios**, en orden de recomendación, cada uno mapeado a un
arquetipo legal del motor (mismos sesgos de atributos ya probados, sin tocar el balance):

| Posición | Perfiles (etiqueta / arquetipo) |
| --- | --- |
| Base (PG) | Director de juego · Base anotador · Base defensor · Base eléctrico |
| Escolta (SG) | Tirador puro · Escolta explosivo · Escolta con balón · Escolta defensivo |
| Alero (SF) | Alero organizador · Alero atlético · Alero abierto · Alero stopper |
| Ala-pívot (PF) | Ala-pívot de fuerza · Ala-pívot móvil · Ala-pívot distribuidor · Ala-pívot defensivo |
| Pívot (C) | Pívot dominante · Pívot distribuidor · Pívot protector · Pívot atlético |

Cada tarjeta muestra además **tres fortalezas reales**, calculadas como peso de la posición (×1,4) más
sesgo del arquetipo: el Base «Director de juego» enseña Bote · Pase · Visión; el Pívot dominante, Poste ·
Fuerza · Rebote defensivo; el Alero «Alero atlético», Bandeja · Salto · Mate.

Reglas de coherencia:

- Al cambiar de posición, si el perfil elegido no existe en la nueva, se selecciona el primero de esa
  posición (nunca queda un arquetipo inválido ni una tarjeta sin marcar).
- Los híbridos (`PG/SG`…) usan su posición primaria.
- Si se crea una carrera sin perfil explícito, se usa el primero de la posición (`career.js`), así el
  jugador nunca empieza con un arquetipo incoherente.
- El perfil sigue siendo un `archetype` del motor, de modo que **los saves anteriores y el resto del
  juego no cambian**: solo cambia lo que se ofrece en el asistente y sus etiquetas.

## Transiciones con dirección

- **Dirección real**: cada cambio de pantalla o pestaña entra desde el lado correcto. Avanzar
  (portada → modos → asistente, pestañas hacia la derecha) desliza desde +26 px; retroceder, desde
  −26 px. La dirección se decide con el orden de navegación `TAB_ORDER`, no por adivinación.
- **Cascada corta** en cada entrada: los bloques del panel aparecen escalonados 28 ms (hasta ocho
  bloques), nunca más de ~200 ms de retardo total.
- Solo se anima `transform` (nunca `opacity`), para no romper el contraste que audita axe durante la
  entrada.
- Los detalles plegables («Más modos») y el marcador activo del dock también se animan al cambiar de
  estado; los botones tienen un `:active` de 0,985 para dar respuesta al tacto.
- Todo respeta `prefers-reduced-motion` y el ajuste interno de movimiento reducido: la hoja global
  desactiva animaciones y transiciones, y el juego sigue siendo usable.

## Verificación

- `npm test` → **142/142** (3 pruebas nuevas: perfiles por posición, carrera sin arquetipo y etiquetas
  en los cinco idiomas).
- `npm run test:browser` → **21/21**, 0 errores de consola, 0 de página, 0 peticiones externas,
  **0 violaciones axe**, 0 claves ausentes. El escenario móvil comprueba ahora: cuatro perfiles por
  posición, uno seleccionado, doce «chips» de fortalezas, que el Pívot cambia la lista respecto al
  Escolta y que el asistente entra con `nav-fwd` y vuelve con `nav-back`.
- `npm run build` → 3 237 817 B (`de6a62739e03`), 1487 claves ×5 idiomas (21 nuevas).
- Capturas 390×844 revisadas: paso de posición con los perfiles de Escolta, Pívot y Ala-pívot.

## Límites honestos

- El cambio de perfil se ha validado con capturas y pruebas automatizadas; no hay prueba con usuarios
  reales ni medición de FPS en un móvil de gama baja.
- Las etiquetas nuevas son copy propio; si se prefiere otra nomenclatura (por ejemplo «Combo guard» en
  inglés), se cambia solo en los cinco JSON de idioma.
