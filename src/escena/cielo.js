import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

// Poly Haven "Syferfontein 6d Clear Pure Sky" (CC0). El sol de la foto está en u = 0.599
// del panorama, a 6° sobre el horizonte; se gira el cielo para que coincida con el sol calculado.
const ARCHIVO = 'hdri/cielo-atardecer-2k.hdr';
const SOL_EN_HDRI_U = 0.599;
// El disco del sol concentra la mitad de la energía de la foto. Se recorta para que la luz
// directa venga solo del sol calculado (DirectionalLight) y no de la posición fija de la foto.
const BRILLO_MAXIMO = 20;
const COLOR_HORIZONTE = new THREE.Color(0.62, 0.55, 0.42);

function recortarBrillo(textura, maximo) {
  const datos = textura.image.data;
  const tope = THREE.DataUtils.toHalfFloat(maximo);
  for (let i = 0; i < datos.length; i += 4) {
    // En media precisión positiva, comparar los bits equivale a comparar los valores.
    if (datos[i] > tope) datos[i] = tope;
    if (datos[i + 1] > tope) datos[i + 1] = tope;
    if (datos[i + 2] > tope) datos[i + 2] = tope;
  }
}

export async function crearCielo(escena, renderer, manager) {
  const textura = await new HDRLoader(manager).setPath(import.meta.env.BASE_URL).loadAsync(ARCHIVO);
  recortarBrillo(textura, BRILLO_MAXIMO);
  textura.mapping = THREE.EquirectangularReflectionMapping;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const entorno = pmrem.fromEquirectangular(textura).texture;
  pmrem.dispose();

  escena.background = textura;
  escena.environment = entorno;
  escena.fog = new THREE.Fog(COLOR_HORIZONTE.clone(), 140, 560);

  // Luz tenue y azulada de noche para que el jardín no quede negro (los faroles vendrán después).
  const nocturna = new THREE.HemisphereLight(0x7f8fc4, 0x1a2414, 0);
  escena.add(nocturna);

  const anguloSolHdri = (SOL_EN_HDRI_U - 0.5) * Math.PI * 2;

  function aplicarSol(sol) {
    // Gira el panorama alrededor del eje vertical hasta que su sol quede en el rumbo del sol real.
    const anguloSol = Math.atan2(sol.direccion.z, sol.direccion.x);
    const giro = anguloSolHdri - anguloSol;
    escena.backgroundRotation.y = giro;
    escena.environmentRotation.y = giro;

    // Tras la puesta (18:31) el cielo se oscurece hacia el crepúsculo.
    const luz = THREE.MathUtils.lerp(0.03, 1, THREE.MathUtils.smoothstep(sol.altura, -14, 3));
    escena.backgroundIntensity = luz;
    escena.environmentIntensity = luz;
    escena.fog.color.copy(COLOR_HORIZONTE).multiplyScalar(luz);
    nocturna.intensity = 0.25 * (1 - THREE.MathUtils.smoothstep(sol.altura, -12, -2));
  }

  return { aplicarSol };
}
