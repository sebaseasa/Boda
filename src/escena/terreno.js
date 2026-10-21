import * as THREE from 'three';
import { MANCHAS_GLSL } from './manchas.js';

// Poly Haven "Leafy Grass" (2 m) y "Grass Ground" (2.5 m), ambos CC0. ORM: R = oclusión, G = rugosidad.
// Se mezclan por manchas como el césped de la finca: seco y amarillento con zonas verdes.
const TAMANO = 1400; // metros de lado
const METROS_VERDE = 2;
const METROS_SECO = 2.5;

export function crearTerreno(escena, manager, anisotropia) {
  const cargador = new THREE.TextureLoader(manager).setPath(import.meta.env.BASE_URL);
  const preparar = (archivo, srgb) => {
    const t = cargador.load(archivo);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropia;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };

  const verde = {
    color: preparar('texturas/cesped-verde-color.webp', true),
    normal: preparar('texturas/cesped-verde-normal.webp', false),
    orm: preparar('texturas/cesped-verde-orm.webp', false),
  };
  const seco = {
    color: preparar('texturas/cesped-seco-color.webp', true),
    normal: preparar('texturas/cesped-seco-normal.webp', false),
    orm: preparar('texturas/cesped-seco-orm.webp', false),
  };

  // Los mapas "oficiales" del material son los verdes (así three.js activa normal, AO y rugosidad);
  // el shader mezcla encima los secos.
  const material = new THREE.MeshStandardMaterial({
    map: verde.color,
    normalMap: verde.normal,
    aoMap: verde.orm,
    roughnessMap: verde.orm,
    roughness: 1,
    metalness: 0,
  });

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      uSecoColor: { value: seco.color },
      uSecoNormal: { value: seco.normal },
      uSecoOrm: { value: seco.orm },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vMundoXZ;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMundoXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec2 vMundoXZ;
        uniform sampler2D uSecoColor;
        uniform sampler2D uSecoNormal;
        uniform sampler2D uSecoOrm;
        ${MANCHAS_GLSL}
        float seco;
        vec2 uvVerde;
        vec2 uvSeco;`,
      )
      .replace(
        'void main() {',
        `void main() {
        // v crece hacia -z, igual que la UV del plano, para que el mapa de normales quede bien orientado.
        vec2 plano = vec2(vMundoXZ.x, -vMundoXZ.y);
        uvVerde = plano / ${METROS_VERDE.toFixed(1)};
        uvSeco = plano / ${METROS_SECO.toFixed(1)} + vec2(0.37, 0.71);
        seco = manchaSeca(vMundoXZ);`,
      )
      .replace(
        '#include <map_fragment>',
        `vec4 colorVerde = texture2D(map, uvVerde);
        // Segunda muestra a otra escala para que no se note la repetición.
        colorVerde = mix(colorVerde, texture2D(map, uvVerde * 0.31 + 0.5), 0.35);
        vec4 colorSeco = texture2D(uSecoColor, uvSeco);
        colorSeco = mix(colorSeco, texture2D(uSecoColor, uvSeco * 0.29 + 0.2), 0.35);
        vec4 colorCesped = mix(colorVerde, colorSeco, seco);
        colorCesped.rgb *= mix(0.9, 1.06, ruido(vMundoXZ * 0.3 + 11.0));
        diffuseColor *= colorCesped;`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `float roughnessFactor = roughness * mix(texture2D(roughnessMap, uvVerde).g, texture2D(uSecoOrm, uvSeco).g, seco);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `vec3 mapN = mix(texture2D(normalMap, uvVerde).xyz, texture2D(uSecoNormal, uvSeco).xyz, seco) * 2.0 - 1.0;
        mapN.xy *= normalScale;
        normal = normalize(tbn * mapN);`,
      )
      .replace(
        '#include <aomap_fragment>',
        `float ambientOcclusion = (mix(texture2D(aoMap, uvVerde).r, texture2D(uSecoOrm, uvSeco).r, seco) - 1.0) * aoMapIntensity + 1.0;
        reflectedLight.indirectDiffuse *= ambientOcclusion;
        #if defined( USE_CLEARCOAT )
          clearcoatSpecularIndirect *= ambientOcclusion;
        #endif
        #if defined( USE_SHEEN )
          sheenSpecularIndirect *= ambientOcclusion;
        #endif
        #if defined( USE_ENVMAP ) && defined( STANDARD )
          float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
          reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
        #endif`,
      );
  };

  const geometria = new THREE.PlaneGeometry(TAMANO, TAMANO);
  geometria.rotateX(-Math.PI / 2);
  const suelo = new THREE.Mesh(geometria, material);
  suelo.receiveShadow = true;
  escena.add(suelo);
  return suelo;
}
