import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';

// Dos cielos HDRI de Poly Haven (CC0): uno de día con nubes y uno de atardecer. Se mezclan según
// la altura del sol. Cada foto se gira para que su sol coincida con el sol calculado para Quito.
// "u" es la posición horizontal del sol en el panorama (medida en el archivo).
const CIELOS = {
  dia: { archivo: 'hdri/cielo-dia-2k.hdr', solU: 0.595, horizonte: new THREE.Color(0.42, 0.45, 0.54) },
  atardecer: { archivo: 'hdri/cielo-atardecer-2k.hdr', solU: 0.599, horizonte: new THREE.Color(0.62, 0.55, 0.42) },
};
// Altura del sol (grados) entre la que se pasa del cielo de atardecer al de día.
const TRANSICION = [14, 28];
// El disco del sol concentra casi la mitad de la energía de cada foto. Se recorta para que la luz
// directa venga solo del sol calculado (DirectionalLight) y no de la posición fija de la foto.
const BRILLO_MAXIMO = 20;

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

// Esfera de fondo que mezcla los dos panoramas, cada uno con su propio giro.
function fondoMezclado(dia, atardecer) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uDia: { value: dia },
      uAtardecer: { value: atardecer },
      uGiroDia: { value: 0 },
      uGiroAtardecer: { value: 0 },
      uMezcla: { value: 1 },
      uBrillo: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDireccion;
      void main() {
        vDireccion = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww; // siempre al fondo
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uDia;
      uniform sampler2D uAtardecer;
      uniform float uGiroDia;
      uniform float uGiroAtardecer;
      uniform float uMezcla;
      uniform float uBrillo;
      varying vec3 vDireccion;
      vec3 muestra(sampler2D t, vec3 d, float giro) {
        float u = (atan(d.z, d.x) + giro) / (2.0 * 3.14159265) + 0.5;
        float v = asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 + 0.5;
        return texture2D(t, vec2(fract(u), v)).rgb;
      }
      void main() {
        vec3 d = normalize(vDireccion);
        vec3 c = mix(muestra(uAtardecer, d, uGiroAtardecer), muestra(uDia, d, uGiroDia), uMezcla);
        gl_FragColor = vec4(c * uBrillo, 1.0);
      }`,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const esfera = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), material);
  esfera.frustumCulled = false;
  esfera.renderOrder = -1;
  // La esfera sigue a la cámara para que el cielo quede siempre "en el infinito".
  esfera.onBeforeRender = (_r, _s, camara) => {
    esfera.position.copy(camara.position);
    esfera.updateMatrixWorld();
  };
  return esfera;
}

export async function crearCielo(escena, renderer, manager) {
  const cargador = new HDRLoader(manager).setPath(import.meta.env.BASE_URL);
  const [dia, atardecer] = await Promise.all([cargador.loadAsync(CIELOS.dia.archivo), cargador.loadAsync(CIELOS.atardecer.archivo)]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const entornos = {};
  for (const [nombre, textura] of [['dia', dia], ['atardecer', atardecer]]) {
    recortarBrillo(textura, BRILLO_MAXIMO);
    textura.mapping = THREE.EquirectangularReflectionMapping;
    textura.needsUpdate = true;
    entornos[nombre] = pmrem.fromEquirectangular(textura).texture;
  }
  pmrem.dispose();

  const fondo = fondoMezclado(dia, atardecer);
  escena.add(fondo);
  escena.background = null;
  escena.fog = new THREE.Fog(CIELOS.atardecer.horizonte.clone(), 140, 560);

  // Luz tenue y azulada de noche para que el jardín no quede negro.
  const nocturna = new THREE.HemisphereLight(0x7f8fc4, 0x1a2414, 0);
  escena.add(nocturna);

  const giro = (nombre, anguloSol) => (CIELOS[nombre].solU - 0.5) * Math.PI * 2 - anguloSol;

  function aplicarSol(sol) {
    const anguloSol = Math.atan2(sol.direccion.z, sol.direccion.x);
    const mezcla = THREE.MathUtils.smoothstep(sol.altura, TRANSICION[0], TRANSICION[1]);
    // Tras la puesta (6:31 pm) el cielo se oscurece hacia el crepúsculo.
    const luz = THREE.MathUtils.lerp(0.03, 1, THREE.MathUtils.smoothstep(sol.altura, -14, 3));

    const u = fondo.material.uniforms;
    u.uGiroDia.value = giro('dia', anguloSol);
    u.uGiroAtardecer.value = giro('atardecer', anguloSol);
    u.uMezcla.value = mezcla;
    u.uBrillo.value = luz;

    // La iluminación ambiente usa el cielo que más pesa en ese momento.
    const nombre = mezcla > 0.5 ? 'dia' : 'atardecer';
    escena.environment = entornos[nombre];
    escena.environmentRotation.y = giro(nombre, anguloSol);
    escena.environmentIntensity = luz;
    escena.fog.color.copy(CIELOS.atardecer.horizonte).lerp(CIELOS.dia.horizonte, mezcla).multiplyScalar(luz);
    nocturna.intensity = 0.25 * (1 - THREE.MathUtils.smoothstep(sol.altura, -12, -2));
    return luz;
  }

  return { aplicarSol };
}
