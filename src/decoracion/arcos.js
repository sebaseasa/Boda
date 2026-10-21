import * as THREE from 'three';
import { CEREMONIA, DISTRIBUCION } from '../config.js';
import { arregloFloral, espigasDeAlheli, puntosEnCurva } from './flores.js';
import { hortensias } from './hortensias.js';
import { farolesEn } from './pasillo.js';

// El arco del altar son los propios árboles: el tronco del jacarandá a un lado, el de la palmera
// al otro y las copas que se juntan arriba. Aquí están las formas de decorarlos, en coordenadas
// relativas al centro del altar (CEREMONIA.arco), con los invitados hacia +Z.

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

// Arco de flores que sigue a los árboles (la línea que dibujó Sebas sobre la foto): nace del pasto
// junto al jacarandá, sube por el tronco, cruza bajo las copas sobre los novios y baja por la
// palmera. Es una masa de hortensias blancas con rosas, alhelí, gypsophila y follaje, más gruesa
// abajo. Detrás de los novios, un medio círculo bajo de flores une los dos pies.
function arcoDeFlores(r) {
  const { jacaranda: j, palmera: p } = troncos();
  const g = new THREE.Group();
  const recorrido = curva([
    [j.x + 0.35, 0.25, j.z + 0.45],
    [j.x + 0.45, 1.4, j.z + 0.5],
    [j.x + 0.9, 2.6, j.z + 0.55],
    [j.x + 2.0, 3.45, j.z + 0.75],
    [-0.6, 3.75, 0.2],
    [1.2, 3.7, 0.15],
    [p.x - 1.6, 3.2, p.z + 0.4],
    [p.x - 0.55, 2.2, p.z + 0.45],
    [p.x - 0.3, 1.1, p.z + 0.4],
    [p.x - 0.25, 0.25, p.z + 0.35],
  ]);
  const cabezas = [];
  const puntosRosas = [];
  const largo = recorrido.getLength();
  const pasos = Math.round(largo / 0.11);
  const tangente = new THREE.Vector3();
  const lado1 = new THREE.Vector3();
  const lado2 = new THREE.Vector3();
  for (let i = 0; i <= pasos; i++) {
    const t = i / pasos;
    const c = recorrido.getPointAt(t);
    recorrido.getTangentAt(t, tangente);
    lado1.crossVectors(tangente, new THREE.Vector3(0, 0, 1)).normalize();
    lado2.crossVectors(tangente, lado1).normalize();
    // Grosor: más abundante al pie de los troncos, más liviano arriba.
    const pie = Math.max(1 - c.y / 1.6, 0);
    // Arriba, sobre los novios, también más tupido (como la referencia de Caro).
    const cima = THREE.MathUtils.smoothstep(c.y, 2.9, 3.6);
    const radio = 0.42 + pie * 0.6 + cima * 0.18;
    const porSeccion = 4 + Math.round(pie * 6 + cima * 3);
    for (let k = 0; k < porSeccion; k++) {
      const a = r.aleatorio() * Math.PI * 2;
      const d = 0.55 + r.aleatorio() * 0.45;
      const off = lado1.clone().multiplyScalar(Math.cos(a) * radio * d).addScaledVector(lado2, Math.sin(a) * radio * d * 0.8);
      // Las flores miran hacia afuera del arco y hacia los invitados.
      const n = off.clone().normalize().add(new THREE.Vector3(0, 0, 0.8)).normalize();
      if (n.z < -0.3) continue; // la parte de atrás casi no se ve
      cabezas.push({ p: c.clone().add(off), n, s: 1.1 + r.aleatorio() * 0.6 });
    }
    if (i % 2 === 0) puntosRosas.push({ p: c.clone(), n: new THREE.Vector3(0, c.y > 3 ? -0.5 : 0.2, 1).normalize() });
  }

  // Medio círculo bajo detrás de los novios, entre los dos troncos.
  const fondo = curva([
    [j.x + 0.6, 0.2, j.z + 0.9],
    [-1.5, 0.3, -0.35],
    [0.75, 0.35, -0.6],
    [2.8, 0.3, -0.3],
    [p.x - 0.6, 0.2, p.z + 0.8],
  ]);
  const pasosFondo = Math.round(fondo.getLength() / 0.16);
  for (let i = 0; i <= pasosFondo; i++) {
    const c = fondo.getPointAt(i / pasosFondo);
    for (let k = 0; k < 3; k++) {
      const off = new THREE.Vector3((r.aleatorio() - 0.5) * 0.5, r.aleatorio() * 0.4, (r.aleatorio() - 0.5) * 0.5);
      cabezas.push({ p: c.clone().add(off), n: new THREE.Vector3(r.aleatorio() - 0.5, 1, 0.6).normalize(), s: 0.85 + r.aleatorio() * 0.4 });
    }
    if (i % 2 === 0) puntosRosas.push({ p: c.clone().setY(c.y + 0.2), n: new THREE.Vector3(0, 0.6, 1).normalize() });
  }

  g.add(hortensias(cabezas, r.aleatorio));
  // Rosas, rusco y gypsophila entre las hortensias.
  g.add(arregloFloral(puntosRosas, { ...r, rosas: 0.7, radioFollaje: 0.46, densidad: 18, tamanoRosa: 0.11 }));

  // Espigas de alhelí que salen del arreglo al pie de cada tronco y en el fondo.
  const espigas = [];
  for (const base of [new THREE.Vector3(j.x + 0.5, 0, j.z + 0.6), new THREE.Vector3(p.x - 0.4, 0, p.z + 0.5)]) {
    for (let k = 0; k < 18; k++) {
      espigas.push({ p: base.clone().add(new THREE.Vector3((r.aleatorio() - 0.5) * 1.3, 0, (r.aleatorio() - 0.3) * 0.9)), alto: 0.8 + r.aleatorio() * 0.8 });
    }
  }
  for (let k = 0; k < 20; k++) {
    const c = fondo.getPointAt(r.aleatorio());
    espigas.push({ p: c.clone().setY(0), alto: 0.6 + r.aleatorio() * 0.5 });
  }
  g.add(espigasDeAlheli(espigas, r.aleatorio));
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

export const CONSTRUCTORES = { flores: arcoDeFlores, base, guirnalda, faroles };
