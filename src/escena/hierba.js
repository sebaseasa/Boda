import * as THREE from 'three';
import { MANCHAS_GLSL } from './manchas.js';

// Hierba instanciada: cada hoja es un mismo triángulo alargado que el shader coloca, dobla y mueve
// con el viento. El césped se divide en baldosas; las lejanas dibujan menos hojas y desde
// DISTANCIA_MAX solo queda la textura del suelo.
const BALDOSA = 6; // metros
const AREA = { x0: -36, x1: 36, z0: -42, z1: 30 };
const HOJAS_POR_M2 = 700;
const DISTANCIA_LLENA = 5;
const DISTANCIA_MAX = 24;
const SEGMENTOS = 4;

function geometriaHoja() {
  const posiciones = [];
  for (let i = 0; i < SEGMENTOS; i++) {
    const y = i / SEGMENTOS;
    const ancho = 0.5 * (1 - y * 0.85);
    posiciones.push(-ancho, y, 0, ancho, y, 0);
  }
  posiciones.push(0, 1, 0);
  const indices = [];
  for (let i = 0; i < SEGMENTOS - 1; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const ultimo = (SEGMENTOS - 1) * 2;
  indices.push(ultimo, ultimo + 1, ultimo + 2);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(posiciones.length).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3));
  g.setIndex(indices);
  return g;
}

function atributosInstancia(cantidad, aleatorio) {
  const desplazamiento = new Float32Array(cantidad * 3); // x, z, giro
  const parametros = new Float32Array(cantidad * 4); // alto, ancho, inclinación, variación de color
  for (let i = 0; i < cantidad; i++) {
    desplazamiento[i * 3] = (aleatorio() - 0.5) * BALDOSA;
    desplazamiento[i * 3 + 1] = (aleatorio() - 0.5) * BALDOSA;
    desplazamiento[i * 3 + 2] = aleatorio() * Math.PI * 2;
    parametros[i * 4] = 0.045 + Math.pow(aleatorio(), 1.5) * 0.08;
    parametros[i * 4 + 1] = 0.012 + aleatorio() * 0.01;
    parametros[i * 4 + 2] = (aleatorio() - 0.3) * 0.6;
    parametros[i * 4 + 3] = aleatorio();
  }
  return {
    desplazamiento: new THREE.InstancedBufferAttribute(desplazamiento, 3),
    parametros: new THREE.InstancedBufferAttribute(parametros, 4),
  };
}

function materialHierba(tiempo, sinHierba) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.5,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = tiempo;
    shader.uniforms.uSinHierba = { value: sinHierba };
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uTiempo;
        uniform vec4 uSinHierba;
        attribute vec3 aDesplazamiento;
        attribute vec4 aParametros;
        varying float vAltura;
        varying float vVariacion;
        varying float vSeco;
        ${MANCHAS_GLSL}
        vec2 girar(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x - s * v.y, s * v.x + c * v.y); }`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
        vec3 objectNormal = vec3(0.0, 0.0, 1.0);
        objectNormal.xz = girar(objectNormal.xz, aDesplazamiento.z);
        // Normales casi verticales: el césped se ilumina como una superficie y no se ve a rayas.
        objectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), 0.65));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(1.0, 0.0, 0.0);
        #endif`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        float y = position.y;
        vAltura = y;
        vVariacion = aParametros.w;
        vec3 transformed = vec3(position.x * aParametros.y, y * aParametros.x, 0.0);
        transformed.z += aParametros.z * y * y * aParametros.x;
        transformed.xz = girar(transformed.xz, aDesplazamiento.z);
        transformed.xz += aDesplazamiento.xy;
        vec2 mundo = (modelMatrix * vec4(transformed, 1.0)).xz;
        vSeco = manchaSeca(mundo);
        // En las zonas secas la hierba es más baja.
        transformed.y *= mix(1.0, 0.7, vSeco);
        // Bajo el camino de piedra no crece hierba.
        if (mundo.x > uSinHierba.x && mundo.x < uSinHierba.z && mundo.y > uSinHierba.y && mundo.y < uSinHierba.w) transformed.y = -0.01;
        float rafaga = sin(uTiempo * 1.3 + mundo.x * 0.28 + mundo.y * 0.17) * 0.5 + 0.5;
        float temblor = sin(uTiempo * 4.1 + mundo.x * 2.3 + mundo.y * 1.9 + aParametros.w * 6.28);
        float doblez = y * y * aParametros.x * (0.35 * rafaga + 0.08 * temblor);
        transformed.xz += normalize(vec2(0.8, 0.45)) * doblez;
        transformed.y -= doblez * doblez * 1.5;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying float vAltura;
        varying float vVariacion;
        varying float vSeco;`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `
        vec3 raiz = mix(vec3(0.06, 0.075, 0.025), vec3(0.15, 0.12, 0.06), vSeco);
        vec3 puntaVerde = mix(vec3(0.08, 0.12, 0.03), vec3(0.14, 0.17, 0.05), vVariacion);
        vec3 puntaSeca = mix(vec3(0.24, 0.2, 0.09), vec3(0.34, 0.28, 0.14), vVariacion);
        // Aun en lo seco quedan algunas hojas verdes, y viceversa.
        float mezcla = clamp(vSeco + (vVariacion - 0.5) * 0.7, 0.0, 1.0);
        vec3 punta = mix(puntaVerde, puntaSeca, mezcla);
        diffuseColor.rgb *= mix(raiz, punta, smoothstep(0.0, 1.0, vAltura));`,
      )
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = faceDirection * normal;')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= mix(0.35, 1.0, vAltura);');
  };
  return material;
}

function generadorAleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function crearHierba(escena, sinHierba = new THREE.Vector4(0, 0, 0, 0)) {
  const maximo = Math.round(BALDOSA * BALDOSA * HOJAS_POR_M2);
  const hoja = geometriaHoja();
  const instancias = atributosInstancia(maximo, generadorAleatorio(7));
  const tiempo = { value: 0 };
  const material = materialHierba(tiempo, sinHierba);

  const baldosas = [];
  for (let x = AREA.x0 + BALDOSA / 2; x < AREA.x1; x += BALDOSA) {
    for (let z = AREA.z0 + BALDOSA / 2; z < AREA.z1; z += BALDOSA) {
      const g = new THREE.InstancedBufferGeometry();
      g.index = hoja.index;
      g.setAttribute('position', hoja.getAttribute('position'));
      g.setAttribute('normal', hoja.getAttribute('normal'));
      g.setAttribute('aDesplazamiento', instancias.desplazamiento);
      g.setAttribute('aParametros', instancias.parametros);
      g.instanceCount = 0;
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.1, 0), BALDOSA * 0.75);
      const malla = new THREE.Mesh(g, material);
      malla.position.set(x, 0, z);
      malla.receiveShadow = true;
      malla.matrixAutoUpdate = false;
      malla.updateMatrix();
      escena.add(malla);
      baldosas.push(malla);
    }
  }

  const centro = new THREE.Vector3();
  function actualizar(segundos, camara, densidad) {
    tiempo.value = segundos;
    // La distancia se mide en el suelo, al punto bajo la cámara.
    centro.set(camara.position.x, 0, camara.position.z);
    const alturaCamara = Math.max(0, camara.position.y - 1.7);
    let total = 0;
    for (const b of baldosas) {
      const d = Math.hypot(b.position.x - centro.x, b.position.z - centro.z, alturaCamara);
      const t = 1 - THREE.MathUtils.clamp((d - DISTANCIA_LLENA) / (DISTANCIA_MAX - DISTANCIA_LLENA), 0, 1);
      const cantidad = Math.round(maximo * densidad * t * t * t);
      b.geometry.instanceCount = cantidad;
      b.visible = cantidad > 0;
      total += cantidad;
    }
    return total;
  }

  return { actualizar };
}
