import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CEREMONIA } from '../config.js';
import { arregloFloral, crearPetalos } from './flores.js';

// Camino de piedra del pasillo y faroles con vela a los lados.

const METROS_TEXTURA_PIEDRA = 1.8;

export function crearPiedras(material, aleatorio) {
  const { arco, pasillo } = CEREMONIA;
  const piezas = [];
  const columnas = 3;
  const anchoCol = pasillo.ancho / columnas;
  for (let z = pasillo.desdeZ + 0.25; z < pasillo.hastaZ; z += 0.5) {
    for (let c = 0; c < columnas; c++) {
      if (aleatorio() < 0.06) continue;
      const radio = 0.2 + aleatorio() * 0.05;
      const g = new THREE.CylinderGeometry(radio, radio * 0.95, 0.05, 9, 1);
      const p = g.attributes.position;
      const fase = aleatorio() * 6;
      // Bordes irregulares.
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const zz = p.getZ(i);
        const a = Math.atan2(zz, x);
        const f = 1 + 0.16 * Math.sin(a * 3 + fase) + 0.08 * Math.sin(a * 5 + fase * 2);
        p.setX(i, x * f * 1.15);
        p.setZ(i, zz * f);
      }
      g.rotateY(aleatorio() * Math.PI);
      g.translate(
        arco.x - pasillo.ancho / 2 + anchoCol * (c + 0.5) + (aleatorio() - 0.5) * 0.08,
        0.02 + aleatorio() * 0.01,
        z + (aleatorio() - 0.5) * 0.08,
      );
      piezas.push(g.toNonIndexed());
    }
  }
  const geo = mergeGeometries(piezas);
  // UV desde arriba, en metros, para que la textura no se estire.
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getX(i) / METROS_TEXTURA_PIEDRA;
    uv[i * 2 + 1] = -p.getZ(i) / METROS_TEXTURA_PIEDRA;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const malla = new THREE.Mesh(geo, material);
  malla.receiveShadow = true;
  malla.castShadow = true;
  return malla;
}

function geometriaFarol() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const caja = (sx, sy, sz, x, y, z) => new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z).toNonIndexed();
  const partes = [caja(0.2, 0.03, 0.2, 0, 0.015, 0), caja(0.19, 0.02, 0.19, 0, 0.34, 0)];
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) partes.push(caja(0.014, 0.32, 0.014, x * 0.088, 0.18, z * 0.088));
  const techo = new THREE.ConeGeometry(0.15, 0.09, 4).rotateY(Math.PI / 4).translate(0, 0.395, 0);
  partes.push(techo.toNonIndexed());
  const aro = new THREE.TorusGeometry(0.03, 0.006, 6, 12).translate(0, 0.47, 0);
  partes.push(aro.toNonIndexed());
  for (const g of partes) g.deleteAttribute('uv');
  return mergeGeometries(partes);
}

export function posicionesFaroles() {
  const { arco, pasillo } = CEREMONIA;
  const lista = [];
  for (let z = pasillo.desdeZ + 1.3; z < pasillo.hastaZ; z += 2) {
    for (const lado of [-1, 1]) lista.push(new THREE.Vector3(arco.x + lado * (pasillo.ancho / 2 + 0.12), 0, z));
  }
  return lista;
}

const marcoFarol = new THREE.MeshStandardMaterial({ color: 0x1d1b18, metalness: 0.7, roughness: 0.45 });
const vidrioFarol = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.18, depthWrite: false });
const velaFarol = new THREE.MeshStandardMaterial({ color: 0xf3ead6, roughness: 0.6, emissive: 0xffb060, emissiveIntensity: 0.15 });
const llamaFarol = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffb35a).multiplyScalar(6) });

// Faroles con vela en las posiciones dadas, más unas pocas luces reales (cada una cuesta en el
// celular) en los puntos indicados. Las luces arrancan apagadas: se encienden al caer la tarde.
export function farolesEn(posiciones, puntosLuz) {
  const grupo = new THREE.Group();
  const piezas = [
    [geometriaFarol(), marcoFarol, true],
    [new THREE.BoxGeometry(0.17, 0.3, 0.17).translate(0, 0.18, 0), vidrioFarol, false],
    [new THREE.CylinderGeometry(0.03, 0.03, 0.11, 12).translate(0, 0.085, 0), velaFarol, true],
    [new THREE.SphereGeometry(0.012, 8, 6).scale(1, 2.2, 1).translate(0, 0.165, 0), llamaFarol, false],
  ];
  const m = new THREE.Matrix4();
  for (const [geo, material, sombra] of piezas) {
    const malla = new THREE.InstancedMesh(geo, material, posiciones.length);
    posiciones.forEach((p, i) => malla.setMatrixAt(i, m.makeRotationY(i * 0.4).setPosition(p)));
    malla.castShadow = sombra;
    grupo.add(malla);
  }
  const luces = puntosLuz.map((p) => {
    const luz = new THREE.PointLight(0xffb068, 0, 5, 2);
    luz.position.copy(p);
    grupo.add(luz);
    return luz;
  });
  return { grupo, luces };
}

export function crearFaroles() {
  const { arco, pasillo } = CEREMONIA;
  const luces = [0.15, 0.5, 0.85].map((t) => new THREE.Vector3(arco.x, 0.35, THREE.MathUtils.lerp(pasillo.desdeZ, pasillo.hastaZ, t)));
  return farolesEn(posicionesFaroles(), luces);
}

// Pasillo de pasto bordeado por filas bajas de flores blancas y pétalos regados, como en las
// referencias de Caro. Las flores se juntan más en la entrada y junto al altar.
export function pasilloDeFlores(rosaGeo, aleatorio) {
  const { arco, pasillo } = CEREMONIA;
  const grupo = new THREE.Group();
  for (const lado of [-1, 1]) {
    const puntos = [];
    for (let z = pasillo.desdeZ + 0.6; z < pasillo.hastaZ; z += 0.32) {
      const t = (z - pasillo.desdeZ) / (pasillo.hastaZ - pasillo.desdeZ);
      // Más alto y frondoso en los extremos del pasillo.
      const extremo = Math.max(1 - t / 0.18, (t - 0.82) / 0.18, 0);
      const alto = 0.12 + aleatorio() * 0.18 + extremo * 0.45;
      const x = arco.x + lado * (pasillo.ancho / 2 + 0.12 + aleatorio() * 0.1 + extremo * 0.2);
      puntos.push({ p: new THREE.Vector3(x, alto, z), n: new THREE.Vector3(-lado * 0.6, 1, 0.2).normalize() });
      if (extremo > 0.3) puntos.push({ p: new THREE.Vector3(x + lado * 0.35, alto * 0.7, z + 0.1), n: new THREE.Vector3(lado * 0.3, 1, 0.3).normalize() });
    }
    grupo.add(arregloFloral(puntos, { rosaGeo, aleatorio, rosas: 0.55, radioFollaje: 0.24, densidad: 30 }));
  }
  grupo.add(
    crearPetalos(
      [
        // Ralos en el centro del pasillo, más tupidos junto a las flores.
        { x0: arco.x - pasillo.ancho / 2, x1: arco.x + pasillo.ancho / 2, z0: pasillo.desdeZ, z1: pasillo.hastaZ, cantidad: 500 },
        { x0: arco.x - pasillo.ancho / 2, x1: arco.x - pasillo.ancho / 2 + 0.3, z0: pasillo.desdeZ, z1: pasillo.hastaZ, cantidad: 450 },
        { x0: arco.x + pasillo.ancho / 2 - 0.3, x1: arco.x + pasillo.ancho / 2, z0: pasillo.desdeZ, z1: pasillo.hastaZ, cantidad: 450 },
      ],
      aleatorio,
    ),
  );
  return grupo;
}
