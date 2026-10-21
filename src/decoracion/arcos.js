import * as THREE from 'three';
import { CEREMONIA, DISTRIBUCION } from '../config.js';
import { arregloFloral, puntosEnCurva } from './flores.js';
import { farolesEn } from './pasillo.js';

// El arco del altar son los propios árboles: el tronco del jacarandá a un lado, el de la palmera
// al otro y las copas que se juntan arriba. Aquí están las formas de decorarlos, en coordenadas
// relativas al centro del altar (CEREMONIA.arco), con los invitados hacia +Z.

const chifon = new THREE.MeshPhysicalMaterial({
  color: 0xf4eee2,
  roughness: 0.7,
  sheen: 1,
  sheenColor: new THREE.Color(0xffffff),
  sheenRoughness: 0.5,
  transparent: true,
  opacity: 0.6,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const cuerda = new THREE.MeshStandardMaterial({ color: 0x3a2c20, roughness: 1 });

function troncos() {
  const { arco } = CEREMONIA;
  return {
    jacaranda: new THREE.Vector3(DISTRIBUCION.arbol.x - arco.x, 0, DISTRIBUCION.arbol.z - arco.z),
    palmera: new THREE.Vector3(DISTRIBUCION.palmera.x - arco.x, 0, DISTRIBUCION.palmera.z - arco.z),
  };
}

const curva = (puntos) => new THREE.CatmullRomCurve3(puntos.map(([x, y, z]) => new THREE.Vector3(x, y, z)), false, 'centripetal');

// Arreglo bajo al pie de cada tronco, abierto hacia los invitados y hacia el centro.
function floresBase(r, tronco, haciaCentro) {
  const puntos = [];
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI * 0.15 + (i / 17) * Math.PI * 0.95;
    const dir = new THREE.Vector3(Math.cos(a) * haciaCentro, 0, Math.sin(a));
    const alto = 0.15 + r.aleatorio() * 0.55 * (1 - Math.abs(i / 17 - 0.5));
    puntos.push({
      p: tronco.clone().addScaledVector(dir, 0.45 + r.aleatorio() * 0.25).setY(alto),
      n: dir.clone().setY(0.6).normalize(),
    });
  }
  return arregloFloral(puntos, { ...r, rosas: 0.9 });
}

function base(r) {
  const { jacaranda, palmera } = troncos();
  const g = new THREE.Group();
  g.add(floresBase(r, jacaranda, 1), floresBase(r, palmera, -1));
  return g;
}

// Guirnalda que sube por el tronco del jacarandá, cruza bajo las copas y baja por la palmera,
// siguiendo el arco natural de los árboles.
function guirnalda(r) {
  const { jacaranda: j, palmera: p } = troncos();
  const g = base(r);
  const c = curva([
    [j.x + 0.3, 0.4, j.z + 0.35],
    [j.x + 0.55, 2.0, j.z + 0.4],
    [j.x + 1.4, 3.6, j.z + 0.5],
    [-1.4, 4.6, -0.3],
    [0.6, 4.85, -0.2],
    [2.6, 4.5, -0.1],
    [p.x - 0.9, 3.4, p.z + 0.35],
    [p.x - 0.35, 1.8, p.z + 0.35],
    [p.x - 0.25, 0.4, p.z + 0.3],
  ]);
  g.add(arregloFloral(puntosEnCurva(c, 0.2, { centro: new THREE.Vector3(0.3, 1.5, 0), haciaAfuera: -0.3 }), { ...r, rosas: 0.75 }));
  return g;
}

// Tela de chifón que cae desde la copa hasta el suelo, con pliegues y un poco de cola.
function caida(desde, alto, ancho) {
  const geo = new THREE.PlaneGeometry(ancho, alto, 16, 24);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const t = (alto / 2 - pos.getY(i)) / alto; // 0 arriba, 1 abajo
    pos.setX(i, x * (0.45 + t * 0.9));
    pos.setZ(i, Math.sin((x / ancho) * Math.PI * 5) * 0.05 * (0.3 + t) + Math.pow(t, 6) * 0.6);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, chifon);
  m.position.set(desde.x, desde.y - alto / 2 + 0.02, desde.z);
  m.castShadow = true;
  return m;
}

function telas(r) {
  const { jacaranda: j, palmera: p } = troncos();
  const g = base(r);
  const izq = new THREE.Vector3(j.x + 1.6, 4.4, j.z + 0.6);
  const der = new THREE.Vector3(p.x - 1.2, 4.2, p.z + 0.5);
  g.add(caida(izq, 4.45, 0.9), caida(der, 4.25, 0.9));
  // Guirnalda de tela que cuelga entre las dos caídas, bajo las copas.
  const swag = new THREE.PlaneGeometry(der.x - izq.x, 0.8, 40, 4);
  const ps = swag.attributes.position;
  for (let i = 0; i < ps.count; i++) {
    const t = ps.getX(i) / ((der.x - izq.x) / 2);
    ps.setY(i, ps.getY(i) - 0.9 * (1 - t * t));
    ps.setZ(i, Math.sin(ps.getY(i) * 14) * 0.03);
  }
  swag.computeVertexNormals();
  const m = new THREE.Mesh(swag, chifon);
  m.position.set((izq.x + der.x) / 2, (izq.y + der.y) / 2 - 0.3, (izq.z + der.z) / 2);
  g.add(m);
  // Flores donde se recogen las telas.
  for (const punto of [izq, der]) {
    const puntos = Array.from({ length: 6 }, () => {
      const n = new THREE.Vector3(r.aleatorio() - 0.5, r.aleatorio() - 0.5, 1).normalize();
      return { p: punto.clone().addScaledVector(n, 0.15), n };
    });
    g.add(arregloFloral(puntos, { ...r, radioFollaje: 0.25 }));
  }
  return g;
}

// Faroles con vela colgando de las ramas sobre el altar.
function faroles(r) {
  const g = base(r);
  const posiciones = [];
  const cuerdas = [];
  for (let i = 0; i < 9; i++) {
    const x = -3 + i * 0.8 + (r.aleatorio() - 0.5) * 0.4;
    const y = 2.3 + r.aleatorio() * 1.3;
    const z = -0.6 + r.aleatorio() * 1.0;
    posiciones.push(new THREE.Vector3(x, y, z));
    const largo = 4.9 - (y + 0.47);
    const c = new THREE.CylinderGeometry(0.004, 0.004, largo, 4);
    c.translate(x, y + 0.47 + largo / 2, z);
    cuerdas.push(c);
  }
  const f = farolesEn(posiciones, [new THREE.Vector3(0, 2.6, 0)]);
  g.add(f.grupo);
  for (const c of cuerdas) g.add(new THREE.Mesh(c, cuerda));
  g.userData.luces = f.luces;
  return g;
}

export const CONSTRUCTORES = { base, guirnalda, telas, faroles };
