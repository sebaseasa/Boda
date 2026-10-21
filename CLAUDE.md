# Boda Sebas & Caro — simulador 3D realista

Recorrido 3D web y realista de nuestra boda para decidir decoración, distribución y recorrido.
Fecha: 20 de febrero de 2027. Boda íntima en jardín de finca (Quito / valles), con Plan B de carpa.
Lo trabajo desde el celular (Samsung Galaxy Z Fold 5) y se publica en GitHub Pages.

## Cómo quiero que trabajes
- Responde en español ecuatoriano, con "tú" (nada de voseo).
- Cuando cambies un archivo, entrégame el archivo completo, no parches sueltos.
- Antes de un cambio grande, dime en 3-5 líneas qué vas a hacer y espera mi visto bueno.
- Prueba que compile (`npm run build`) antes de decir que algo está listo.
- Si algo no se puede hacer realista en un celular, dímelo claro y propón la alternativa.

## Stack
- Vite + three.js (última versión estable, módulos ES). Sin React salvo que lo pida.
- Posprocesado: librería `postprocessing` (pmndrs): SMAA, N8AO (oclusión ambiental), Bloom suave para faroles y velas, tone mapping AgX o ACES.
- Modelos en glTF/GLB comprimidos (Draco o Meshopt) y texturas KTX2.
- Escaneo del lugar: Gaussian Splatting (`.ply`, `.splat` o `.spz`) cargado con una librería de splats compatible con three.js (por ejemplo Spark o GaussianSplats3D; elige la que mejor rinda en móvil).
- Posición del sol: `suncalc` con las coordenadas de Quito y la fecha 20/02/2027, para que la luz de cada hora sea la real.
- Despliegue: GitHub Actions → GitHub Pages (`base` de Vite configurado al nombre del repo).

## Realismo (prioridades)
1. **El lugar real**: el jardín se carga desde un escaneo Gaussian Splat hecho con el celular (carpeta `public/escaneo/`). Si no existe todavía, usa un terreno de césped con hierba instanciada por shader, el árbol grande de varios troncos y la palmera como placeholders.
2. **Luz**: cielo HDRI (Poly Haven, CC0) que cambie entre tarde, atardecer y noche, sol con sombras suaves (cascaded shadow maps), faroles y velas con luz cálida real.
3. **Materiales PBR**: madera, metal dorado, vidrio de copas (transmisión), lino del mantel, chifón de las fajas, piedra del camino.
4. **Modelos**: preferir assets CC0 (Poly Haven, ambientCG) o con licencia clara. Anotar cada asset y su licencia en `CREDITOS.md`. Nunca usar assets sin licencia.
5. **Personas**: nada de humanos "casi reales" que se vean raros. Novios como siluetas elegantes o figuras estilizadas; la cámara puede ir en primera persona.

## Rendimiento (manda el celular)
- Objetivo: 30+ fps en el Fold 5. Mide con un contador de FPS en modo desarrollo.
- Sillas, copas, cubiertos, flores y piedras siempre instanciados (`InstancedMesh`).
- LOD para modelos pesados; texturas máximo 2K en móvil.
- Calidad automática: si baja de 30 fps, apagar AO y bajar sombras y resolución.
- Carga progresiva con pantalla de carga y porcentaje.

## Estilo (nuestro moodboard)
- Concepto: íntima, natural, elegante, atemporal, significativa.
- Paleta: beige, verde oliva / salvia, marfil y dorado.
- Lo que NO buscamos: fiesta grande, barra libre, decoración recargada, evento tradicional.
- Ceremonia: el arco son los propios árboles (decisión de Sebas): el altar va entre el tronco del jacarandá y el de la palmera, bajo sus copas, y se decoran los árboles (no se arma un arco aparte). Camino de piedra con faroles, 50 sillas crossback de madera con cojín.
- Recepción (según la prueba de mesa): mesas redondas con mantel marfil, plato base de vidrio con borde dorado texturizado, servilleta verde satinada con argolla dorada, copa verde tallada + copa de vino + copa de champán, cubiertos dorados, centro bajo de rosas blancas, alhelí y gypsophila dorada con candeleros dorados altos y caminos de tela verde arrugada. Sillas Tiffany doradas con faja de chifón marfil y lazo.
- Extras: letrero "Bienvenidos a nuestro comienzo", lounge con fogata y sillones de ratán, faroles colgando del árbol grande, luces colgantes.

## Itinerario (modo "La experiencia")
La boda empieza a las **12:00** y la **ceremonia es a las 12:00, dura alrededor de 1 h 30** (correcciones de Sebas). Los detalles "wow" deben lucir de día, al mediodía.

| Hora | Momento | Vista |
|---|---|---|
| 12:00 pm | Ceremonia: entrada de la novia | Pasillo |
| 1:20 pm | Beso de casados (pétalos de los invitados) | Altar |
| 1:30 pm | Fin de la ceremonia | |

Por confirmar (venían del itinerario anterior, que ponía la ceremonia en la tarde): ceremonia civil (mesa del registro junto al altar), fotos bajo el árbol grande, cena de 3 tiempos, brindis y despedida en el lounge con fogata.

## Funciones que deben existir (vienen del prototipo)
El prototipo está en `referencia/simulador-boda.html`; úsalo como especificación de funciones, no de estilo visual.
- Opciones: paleta, sillas de ceremonia y de recepción, decoración de los árboles del altar, pasillo (piedra, alfombra, césped), pétalos, faroles, letrero, invitados (20-150), mesas (redondas de 10, imperiales de madera, mixta), lounge, carpa Plan B, pista de baile, luces, hora del día.
- Vistas de cámara con transición suave y control táctil (girar, acercar).
- Animación de la entrada de la novia.
- "Guardar esta opción" con votos ♥ Seba y ♥ Caro; cuando los dos votan la misma, se marca como Decidido.
- Botón "Al azar".
- Panel inferior en celular (y lateral en pantalla grande / Fold abierto).

## Estructura sugerida
```
src/
  main.js          arranque, renderer, loop
  escena/          terreno, cielo, luces, escaneo
  decoracion/      arco, sillas, mesas, centros, faroles, lounge, carpa
  ui/              panel, pestañas, guardadas, itinerario
  config.js        opciones por defecto y catálogo
public/
  modelos/  texturas/  hdri/  escaneo/
referencia/
  simulador-boda.html
CREDITOS.md
```
