import * as THREE from 'three';

// ambientCG "Grass004" (CC0), 1K. ORM: R = oclusión, G = rugosidad (reescalada a 0.8–1:
// la original es muy brillante y el césped a distancia se veía como agua).
const TAMANO = 1400; // metros de lado
const METROS_POR_REPETICION = 2.2;

const RUIDO_GLSL = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
               mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
`;

export function crearTerreno(escena, manager, anisotropia) {
  const cargador = new THREE.TextureLoader(manager).setPath(import.meta.env.BASE_URL);
  const repeticion = TAMANO / METROS_POR_REPETICION;
  const preparar = (archivo, srgb) => {
    const t = cargador.load(archivo);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeticion, repeticion);
    t.anisotropy = anisotropia;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  const orm = preparar('texturas/cesped-orm.webp', false);
  const material = new THREE.MeshStandardMaterial({
    map: preparar('texturas/cesped-color.webp', true),
    normalMap: preparar('texturas/cesped-normal.webp', false),
    normalScale: new THREE.Vector2(0.8, 0.8),
    aoMap: orm,
    roughnessMap: orm,
    roughness: 1,
    metalness: 0,
  });

  // Rompe la repetición: mezcla la textura con una copia a otra escala y añade manchas suaves
  // de color, como un césped real con zonas más secas y más verdes.
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + RUIDO_GLSL)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec4 colorA = texture2D(map, vMapUv);
        vec4 colorB = texture2D(map, vMapUv * 0.37 + vec2(0.21, 0.67));
        float mezcla = ruido(vMapUv * 0.11);
        vec4 colorCesped = mix(colorA, colorB, smoothstep(0.3, 0.7, mezcla));
        float mancha = ruido(vMapUv * 0.035 + 7.0) * 0.6 + ruido(vMapUv * 0.12) * 0.4;
        colorCesped.rgb *= mix(vec3(0.82, 0.86, 0.78), vec3(1.08, 1.04, 0.92), mancha);
        diffuseColor *= colorCesped;
        `,
      );
  };

  const geometria = new THREE.PlaneGeometry(TAMANO, TAMANO);
  geometria.rotateX(-Math.PI / 2);
  const suelo = new THREE.Mesh(geometria, material);
  suelo.receiveShadow = true;
  escena.add(suelo);
  return suelo;
}
