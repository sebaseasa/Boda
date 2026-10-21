import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { DISTRIBUCION } from '../config.js';

// Marcadores de posición del árbol grande y la palmera, a su escala aproximada.
// Se reemplazarán por modelos reales (o por el escaneo del jardín).

function generadorAleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Deforma una esfera para que la copa no se vea perfecta. El desvío depende solo de la posición,
// así los vértices compartidos se mueven juntos y la superficie no se rompe.
function grumo(radio, aleatorio) {
  let g = new THREE.IcosahedronGeometry(radio, 3);
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  g = mergeVertices(g);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  const fase = aleatorio() * 10;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const u = v.clone().divideScalar(radio);
    const n = Math.sin(u.x * 4.1 + fase) * Math.sin(u.y * 3.7 + fase * 0.5) * Math.sin(u.z * 4.3 + fase * 0.3);
    const fino = Math.sin(u.x * 11 + u.z * 7 + fase) * Math.sin(u.y * 9 - u.x * 5);
    v.multiplyScalar(1 + n * 0.16 + fino * 0.05);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

function arbolGrande() {
  const aleatorio = generadorAleatorio(5);
  const grupo = new THREE.Group();
  const corteza = new THREE.MeshStandardMaterial({ color: 0x5b4a3c, roughness: 0.95 });
  const hojas = new THREE.MeshStandardMaterial({ color: 0x3f6a2c, roughness: 0.9 });

  // Varios troncos que salen de la base y se abren hacia arriba.
  const troncos = [];
  const puntas = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + aleatorio() * 0.6;
    const apertura = 0.18 + aleatorio() * 0.22;
    const largo = 5.2 + aleatorio() * 1.6;
    const pts = [0, 0.33, 0.66, 1].map((t) => {
      const r = Math.sin(apertura) * largo * t * (0.6 + 0.4 * t);
      return new THREE.Vector3(Math.cos(a) * (0.15 + r), t * largo * Math.cos(apertura * 0.6), Math.sin(a) * (0.15 + r));
    });
    const curva = new THREE.CatmullRomCurve3(pts);
    const tubo = new THREE.TubeGeometry(curva, 12, 0.2, 8, false);
    // Afinar hacia la punta.
    const p = tubo.attributes.position;
    const v = new THREE.Vector3();
    for (let j = 0; j < p.count; j++) {
      const t = Math.floor(j / 9) / 12;
      const c = curva.getPointAt(Math.min(t, 1));
      v.fromBufferAttribute(p, j).sub(c).multiplyScalar(1.25 - t * 0.75).add(c);
      p.setXYZ(j, v.x, v.y, v.z);
    }
    tubo.computeVertexNormals();
    troncos.push(tubo);
    puntas.push(pts[3]);
  }
  const mallaTroncos = new THREE.Mesh(mergeGeometries(troncos), corteza);
  mallaTroncos.castShadow = mallaTroncos.receiveShadow = true;
  grupo.add(mallaTroncos);

  // Copa ancha y algo plana, hecha de grumos alrededor de las puntas de los troncos.
  const grumos = [];
  for (const punta of puntas) {
    for (let k = 0; k < 4; k++) {
      const g = grumo(1.3 + aleatorio() * 0.9, aleatorio);
      g.scale(1.25, 0.75, 1.25);
      g.translate(
        punta.x * 1.15 + (aleatorio() - 0.5) * 2.4,
        punta.y + (aleatorio() - 0.3) * 1.4,
        punta.z * 1.15 + (aleatorio() - 0.5) * 2.4,
      );
      grumos.push(g);
    }
  }
  const copa = new THREE.Mesh(mergeGeometries(grumos), hojas);
  copa.castShadow = copa.receiveShadow = true;
  grupo.add(copa);
  return grupo;
}

function palmera() {
  const aleatorio = generadorAleatorio(11);
  const grupo = new THREE.Group();
  const corteza = new THREE.MeshStandardMaterial({ color: 0x75644f, roughness: 1 });
  const verde = new THREE.MeshStandardMaterial({ color: 0x7d9257, roughness: 0.85, side: THREE.DoubleSide });
  const seca = new THREE.MeshStandardMaterial({ color: 0x9c8356, roughness: 1, side: THREE.DoubleSide });

  const alto = 6.2;
  const curva = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.08, alto * 0.35, 0),
    new THREE.Vector3(0.22, alto * 0.7, 0.05),
    new THREE.Vector3(0.38, alto, 0.08),
  ]);
  const tronco = new THREE.TubeGeometry(curva, 24, 0.24, 10, false);
  // Anillos del tronco.
  const p = tronco.attributes.position;
  const v = new THREE.Vector3();
  for (let j = 0; j < p.count; j++) {
    const t = Math.floor(j / 11) / 24;
    const c = curva.getPointAt(Math.min(t, 1));
    const anillo = 1 + 0.06 * Math.abs(Math.sin(t * 24 * Math.PI));
    v.fromBufferAttribute(p, j).sub(c).multiplyScalar((1.15 - t * 0.3) * anillo).add(c);
    p.setXYZ(j, v.x, v.y, v.z);
  }
  tronco.computeVertexNormals();
  const mallaTronco = new THREE.Mesh(tronco, corteza);
  mallaTronco.castShadow = mallaTronco.receiveShadow = true;
  grupo.add(mallaTronco);

  // Hojas: tiras curvadas hacia abajo, más angostas en la punta.
  const copa = curva.getPointAt(1);
  const verdes = [];
  const secas = [];
  for (let i = 0; i < 26; i++) {
    const esSeca = i >= 20;
    const largo = 2.6 + aleatorio() * 0.9;
    const g = new THREE.PlaneGeometry(0.55, largo, 1, 10);
    g.translate(0, largo / 2, 0);
    const pos = g.attributes.position;
    const caida = esSeca ? 2.4 : 0.9 + aleatorio() * 0.6;
    for (let j = 0; j < pos.count; j++) {
      const y = pos.getY(j);
      const t = y / largo;
      pos.setX(j, pos.getX(j) * (1 - t * 0.85));
      // Arco: al girarla, este desvío hace que la hoja caiga hacia la punta.
      pos.setZ(j, t * t * caida);
    }
    g.rotateX(Math.PI / 2 - (esSeca ? 0.2 : 0.55 + aleatorio() * 0.35));
    g.rotateY((i / 20) * Math.PI * 2 + aleatorio() * 0.3);
    g.translate(copa.x, copa.y - (esSeca ? 0.35 : 0), copa.z);
    g.computeVertexNormals();
    (esSeca ? secas : verdes).push(g);
  }
  for (const [lista, material] of [[verdes, verde], [secas, seca]]) {
    const m = new THREE.Mesh(mergeGeometries(lista), material);
    m.castShadow = m.receiveShadow = true;
    grupo.add(m);
  }
  return grupo;
}

export function crearVegetacion(escena) {
  const arbol = arbolGrande();
  arbol.position.set(DISTRIBUCION.arbol.x, 0, DISTRIBUCION.arbol.z);
  const palma = palmera();
  palma.position.set(DISTRIBUCION.palmera.x, 0, DISTRIBUCION.palmera.z);
  escena.add(arbol, palma);
  return { arbol, palmera: palma };
}
