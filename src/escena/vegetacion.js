import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { DISTRIBUCION } from '../config.js';
import { tarjetasFollaje } from './follaje.js';

// Jacarandá y palmera: modelos de PlantCatalog (Sketchfab, CC BY), aligerados con
// herramientas/preparar-modelos.mjs. Alturas medidas a ojo en las fotos de la finca.
const MODELOS = {
  arbol: { archivo: 'modelos/jacaranda.glb', alto: 11, giro: 0.6 },
  palmera: { archivo: 'modelos/palmera.glb', alto: 9.5, giro: 2.1 },
};

function generadorAleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

async function cargarModelo(cargador, { archivo, alto, giro }, posicion) {
  const gltf = await cargador.loadAsync(archivo);
  const modelo = gltf.scene;
  const caja = new THREE.Box3().setFromObject(modelo);
  const escala = alto / (caja.max.y - caja.min.y);
  modelo.scale.setScalar(escala);
  modelo.rotation.y = giro;
  // Apoyar la base en el suelo y centrar el tronco en la posición indicada.
  const centro = caja.getCenter(new THREE.Vector3()).multiplyScalar(escala);
  const pivote = new THREE.Group();
  modelo.position.set(-centro.x, -caja.min.y * escala, -centro.z);
  pivote.add(modelo);
  pivote.position.set(posicion.x, 0, posicion.z);
  modelo.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const m = o.material;
    if (m.alphaTest > 0) m.side = THREE.DoubleSide;
    m.envMapIntensity = 0.7;
  });
  return pivote;
}

// Núcleo oscuro que tapa los huecos entre tarjetas.
function nucleo(volumenes, material, escala = 0.82) {
  const piezas = volumenes.map(({ c, r }) => {
    const g = new THREE.IcosahedronGeometry(1, 1);
    g.deleteAttribute('uv');
    g.scale(r.x * escala, r.y * escala, r.z * escala);
    g.translate(c.x, c.y, c.z);
    return g;
  });
  return new THREE.Mesh(mergeGeometries(piezas), material);
}

function materialHojas(base, tono) {
  const m = base.clone();
  m.color.set(tono);
  m.side = THREE.DoubleSide;
  m.alphaTest = 0.5;
  m.transparent = false;
  return m;
}

// Seto que cierra el fondo del jardín, como en las fotos.
function seto(hoja, aleatorio) {
  const volumenes = [];
  for (let x = -34; x < 20; x += 1.4) {
    const alto = 1.3 + aleatorio() * 0.6;
    volumenes.push({
      c: new THREE.Vector3(x, alto * 0.85, -31 - aleatorio() * 1.2),
      r: new THREE.Vector3(1.3, alto, 1.1),
    });
  }
  const grupo = new THREE.Group();
  const interior = nucleo(volumenes, new THREE.MeshStandardMaterial({ color: 0x0d140a, roughness: 1 }));
  const hojas = new THREE.Mesh(tarjetasFollaje(volumenes, 9, 0.35, aleatorio), materialHojas(hoja, 0x4c5e3a));
  for (const m of [interior, hojas]) {
    m.castShadow = m.receiveShadow = true;
    grupo.add(m);
  }
  return grupo;
}

// Árboles altos del fondo (eucaliptos y pinos en las fotos): tronco y copa de tarjetas de hoja.
function arbolesFondo(hoja, aleatorio) {
  const troncos = [];
  const volumenes = [];
  const sitios = [
    [15, -33], [21, -36], [27, -32], [33, -38], [10, -41], [38, -31], [44, -36],
    [-27, -40], [-18, -44], [-7, -46], [4, -47], [-36, -45], [-13, -55], [0, -58], [12, -54], [24, -50], [-24, -56], [36, -48],
  ];
  for (const [x, z] of sitios) {
    const alto = 13 + aleatorio() * 9;
    const t = new THREE.CylinderGeometry(0.16, 0.32, alto * 0.75, 7);
    t.deleteAttribute('uv');
    t.translate(x, alto * 0.375, z);
    troncos.push(t);
    // Copa irregular: varios grupos de ramas a distintas alturas y hacia distintos lados.
    for (let k = 0; k < 6; k++) {
      const r = 1.3 + aleatorio() * 1.3;
      const a = aleatorio() * Math.PI * 2;
      const d = 0.5 + aleatorio() * 2.2;
      volumenes.push({
        c: new THREE.Vector3(x + Math.cos(a) * d, alto * (0.45 + aleatorio() * 0.5), z + Math.sin(a) * d),
        r: new THREE.Vector3(r * 1.2, r * 0.9, r * 1.2),
      });
    }
  }
  const grupo = new THREE.Group();
  const tronco = new THREE.Mesh(mergeGeometries(troncos), new THREE.MeshStandardMaterial({ color: 0x4a3d30, roughness: 1 }));
  const interior = nucleo(volumenes, new THREE.MeshStandardMaterial({ color: 0x1b2615, roughness: 1 }), 0.65);
  const hojas = new THREE.Mesh(tarjetasFollaje(volumenes, 4, 0.7, aleatorio), materialHojas(hoja, 0x5d6f4d));
  for (const m of [tronco, interior, hojas]) {
    m.castShadow = true;
    grupo.add(m);
  }
  return grupo;
}

// Anillo de siluetas en el horizonte: montañas de los valles y, más cerca, la línea de árboles
// de las fincas vecinas. Las montañas no usan la niebla de three.js: su tono azulado de lejanía
// va en el propio color.
function horizonte(aleatorio, { radio, base, ondas, color, niebla }) {
  const segmentos = 240;
  const posiciones = [];
  const indices = [];
  const fases = ondas.map(() => aleatorio() * 10);
  for (let i = 0; i <= segmentos; i++) {
    const a = (i / segmentos) * Math.PI * 2;
    let h = base;
    ondas.forEach(([frecuencia, amplitud], k) => {
      h += amplitud * (0.5 + 0.5 * Math.sin(a * frecuencia + fases[k]));
    });
    const x = Math.cos(a) * radio;
    const z = Math.sin(a) * radio;
    posiciones.push(x, -2, z, x, h, z);
    if (i < segmentos) {
      const b = i * 2;
      indices.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  g.setIndex(indices);
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, fog: niebla, side: THREE.DoubleSide }));
}

export async function crearVegetacion(escena, manager) {
  const cargador = new GLTFLoader(manager).setPath(import.meta.env.BASE_URL).setMeshoptDecoder(MeshoptDecoder);
  const aleatorio = generadorAleatorio(5);
  const [arbol, palmera] = await Promise.all([
    cargarModelo(cargador, MODELOS.arbol, DISTRIBUCION.arbol),
    cargarModelo(cargador, MODELOS.palmera, DISTRIBUCION.palmera),
  ]);
  // Material de las hojas del jacarandá, reutilizado para el seto y los árboles del fondo.
  let hoja = null;
  arbol.traverse((o) => {
    if (!hoja && o.isMesh && /leaf_0/i.test(o.material.name)) hoja = o.material;
  });
  const cerros = horizonte(aleatorio, {
    radio: 320, base: 22, color: 0x5d6a7c, niebla: false,
    ondas: [[2, 40], [5, 18], [13, 8]],
  });
  const arboleda = horizonte(aleatorio, {
    radio: 140, base: 2.5, color: 0x1c2817, niebla: true,
    ondas: [[23, 3], [61, 2], [137, 1.5]],
  });
  escena.add(arbol, palmera, seto(hoja, aleatorio), arbolesFondo(hoja, aleatorio), cerros, arboleda);

  // Las montañas se oscurecen con el cielo al caer la noche.
  const colorCerros = cerros.material.color.clone();
  return {
    arbol,
    palmera,
    aplicarLuz(luz) {
      cerros.material.color.copy(colorCerros).multiplyScalar(luz);
    },
  };
}
