import * as THREE from 'three';
import { CEREMONIA, DISTRIBUCION } from '../config.js';
import { arregloFloral, crearPetalos, pradoFloral, puntosEnCurva } from './flores.js';
import { TIEMPO } from './luces.js';
import { farolesEn } from './pasillo.js';

// El arco del altar son los propios árboles: el tronco del jacarandá a un lado, el de la palmera
// al otro y las copas que se juntan arriba. Aquí están las formas de decorarlos, en coordenadas
// relativas al centro del altar (CEREMONIA.arco), con los invitados hacia +Z.
// crearPetalos recibe zonas en las coordenadas del grupo donde se agrega.

const chifon = new THREE.MeshPhysicalMaterial({
  color: 0xf4eee2,
  roughness: 0.7,
  sheen: 1,
  sheenColor: new THREE.Color(0xffffff),
  sheenRoughness: 0.5,
  transparent: true,
  opacity: 0.82,
  side: THREE.DoubleSide,
  depthWrite: false,
});
// Viento: la tela ondea suave, más en el medio de su altura (arriba está amarrada y abajo apoyada).
chifon.onBeforeCompile = (shader) => {
  shader.uniforms.uTiempo = TIEMPO;
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTiempo;').replace(
    '#include <begin_vertex>',
    `#include <begin_vertex>
    vec4 mundoTela = modelMatrix * vec4(transformed, 1.0);
    float sujeta = sin(3.14159 * clamp(mundoTela.y / 4.8, 0.0, 1.0));
    float rafaga = 0.6 + 0.4 * sin(uTiempo * 0.35 + mundoTela.x * 0.2);
    transformed.z += sujeta * rafaga * (0.07 * sin(uTiempo * 1.1 + mundoTela.x * 2.1 + mundoTela.y * 1.3)
      + 0.03 * sin(uTiempo * 2.4 + mundoTela.y * 3.7));`,
  );
};
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

// Caída de chifón desde una rama hasta el suelo, como en las referencias de Caro: recogida arriba,
// abierta abajo, con pliegues y la cola arrastrándose en el pasto hacia los invitados.
function caida(desde, ancho, cola, fase) {
  const alto = desde.y;
  const largo = alto + cola;
  const geo = new THREE.PlaneGeometry(ancho, largo, 18, 40);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / ancho; // -0.5 a 0.5
    const s = largo / 2 - pos.getY(i); // recorrido desde arriba
    const t = THREE.MathUtils.clamp(s / alto, 0, 1);
    const abierto = 0.22 + 0.78 * Math.pow(t, 0.7);
    const pliegue = Math.sin(u * Math.PI * 7 + fase) * 0.06 * (0.2 + t);
    let y = alto - s;
    let z = pliegue;
    let x = u * ancho * abierto;
    if (s > alto) {
      // Cola sobre el pasto.
      const c = s - alto;
      y = 0.015 + Math.abs(pliegue) * 0.3;
      z = c * 0.9 + pliegue * 0.5;
      x *= 1 + c * 0.5;
    }
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, chifon);
  m.position.set(desde.x, 0, desde.z);
  m.castShadow = true;
  return m;
}

// Tela en U entre dos puntos, con varias capas para que se vea voluminosa.
function guirnaldaTela(a, b, caidaU, capas) {
  const g = new THREE.Group();
  for (let k = 0; k < capas; k++) {
    const largo = a.distanceTo(b);
    const geo = new THREE.PlaneGeometry(largo, 0.55, 48, 6);
    const pos = geo.attributes.position;
    const hondo = caidaU * (0.8 + k * 0.18);
    for (let i = 0; i < pos.count; i++) {
      const t = pos.getX(i) / (largo / 2);
      const y = pos.getY(i);
      // La tela cuelga más por abajo y se recoge en las puntas.
      const recogido = 0.3 + 0.7 * (1 - Math.pow(Math.abs(t), 4));
      pos.setY(i, y * recogido - hondo * (1 - t * t));
      pos.setZ(i, Math.sin(y * 16 + k) * 0.025 + k * 0.03);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, chifon);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

// Prado de flores al pie de cada caída de tela.
function arregloPie(r, centro, lado) {
  return pradoFloral(centro.clone().add(new THREE.Vector3(-lado * 0.25, 0, 0.1)), { ...r, radio: 1.0, cantidad: 36, alto: 0.6, espigas: 16 });
}

function telas(r) {
  const { jacaranda: j, palmera: p } = troncos();
  const g = new THREE.Group();
  const izq = new THREE.Vector3(j.x + 1.5, 4.7, j.z + 0.7);
  const der = new THREE.Vector3(p.x - 1.0, 4.5, p.z + 0.5);
  for (const [punto, lado] of [[izq, -1], [der, 1]]) {
    // Dos capas por lado, un poco corridas, como tela pasada por encima de la rama.
    g.add(caida(punto, 1.1, 0.9, 0));
    g.add(caida(punto.clone().add(new THREE.Vector3(lado * 0.18, 0, -0.08)), 0.9, 0.7, 1.7));
    g.add(arregloPie(r, new THREE.Vector3(punto.x - lado * 0.15, 0, punto.z + 0.55), lado));
  }
  g.add(guirnaldaTela(izq.clone().add(new THREE.Vector3(0.1, 0, 0.05)), der.clone().add(new THREE.Vector3(-0.1, 0, 0.05)), 1.5, 3));
  // Pétalos al pie de las telas (en coordenadas del altar, igual que el resto del grupo).
  g.add(crearPetalos([izq, der].map((c) => ({ x0: c.x - 1, x1: c.x + 1, z0: c.z + 0.6, z1: c.z + 2.2, cantidad: 220 })), r.aleatorio));
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
