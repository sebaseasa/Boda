# Créditos y licencias

Cada asset usado en el simulador, de dónde viene y con qué licencia.

## Modelos 3D

| Archivo | Origen | Autor | Licencia | Cambios |
|---|---|---|---|---|
| `public/modelos/jacaranda.glb` | [Realistic HD Blue jacaranda (20/40)](https://sketchfab.com/3d-models/e0b9e43b34cf41678f56ed7fd7e4d961), Sketchfab | [PlantCatalog](https://sketchfab.com/PlantCatalog) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Menos hojas y ramas simplificadas para el celular, texturas a WebP, compresión Meshopt (`herramientas/preparar-modelos.mjs`). Sus hojas también se usan en el seto y los árboles del fondo. |
| `public/modelos/rosa.glb` | Una rosa de [Bouquet of white roses](https://sketchfab.com/3d-models/9934b087c459408db61753fefd27138e), Sketchfab | [alex.yefremov](https://sketchfab.com/alex.yefremov) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Solo los pétalos de una flor, centrada y simplificada (`herramientas/preparar-rosa.mjs`). Se repite en los arcos. |
| `public/modelos/palmera.glb` | [Realistic HD Canary Island date palm (29/40)](https://sketchfab.com/3d-models/70e4e0ca953144c8b485fc6e4d2d3aca), Sketchfab | [PlantCatalog](https://sketchfab.com/PlantCatalog) | [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | Menos folíolos y tronco simplificado, texturas a WebP, compresión Meshopt. |

## Cielo y texturas

| Archivo | Origen | Autor | Licencia | Cambios |
|---|---|---|---|---|
| `public/hdri/cielo-dia-2k.hdr` | [Kloofendal 48d Partly Cloudy Pure Sky](https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky), Poly Haven | Greg Zaal (original), Jarod Guest (cielo) | CC0 | Ninguno (resolución 2K) |
| `public/hdri/cielo-atardecer-2k.hdr` | [Syferfontein 6d Clear Pure Sky](https://polyhaven.com/a/syferfontein_6d_clear_puresky), Poly Haven | Greg Zaal (original), Jarod Guest (cielo) | CC0 | Ninguno (resolución 2K) |
| `public/texturas/cesped-verde-*.webp` | [Leafy Grass](https://polyhaven.com/a/leafy_grass), Poly Haven | Charlotte Baglioni | CC0 | WebP 1K; rugosidad reescalada a 0.5–1 |
| `public/texturas/cesped-seco-*.webp` | [Grass Ground](https://polyhaven.com/a/grass_ground), Poly Haven | Charlotte Baglioni | CC0 | WebP 1K |
| `public/texturas/madera-*.webp` | [Oak Veneer 02](https://polyhaven.com/a/oak_veneer_02), Poly Haven | Jenelle van Heerden | CC0 | WebP 1K; teñida en el material al café de las sillas |
| `public/texturas/piedra-*.webp` | [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), Poly Haven | Dimitrios Savva (foto), Rico Cilliers (proceso) | CC0 | WebP 1K |

El follaje de rusco de los arcos se dibuja en el propio código (sin archivo externo).

## Código de terceros

| Librería | Licencia |
|---|---|
| [three.js](https://threejs.org) 0.186.1 | MIT |
| [postprocessing](https://github.com/pmndrs/postprocessing) 6.39.5 | Zlib |
| [suncalc](https://github.com/mourner/suncalc) 2.1.1 | BSD-2-Clause |
| [Vite](https://vite.dev) 8.3.4 | MIT |
| [glTF Transform](https://gltf-transform.dev) 4.2.1 (solo para preparar modelos) | MIT |
