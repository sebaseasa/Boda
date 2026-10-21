import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Invitados sentados: figuras estilizadas (como los novios, sin rostro), instanciadas para que
// 50 personas cuesten lo mismo que unas pocas. Cada figura está en coordenadas de la silla
// (mira hacia -Z, asiento a 0.51 m) y varía en colores de ropa, piel y cabello.

const v = (x, y, z) => new THREE.Vector3(x, y, z);

function capsula(desde, hasta, radio) {
  const largo = desde.distanceTo(hasta);
  const g = new THREE.CapsuleGeometry(radio, largo, 2, 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(v(0, 1, 0), hasta.clone().sub(desde).normalize()));
  const c = desde.clone().add(hasta).multiplyScalar(0.5);
  return g.translate(c.x, c.y, c.z);
}

function esfera(radio, [sx, sy, sz], p) {
  return new THREE.SphereGeometry(radio, 12, 8).scale(sx, sy, sz).translate(p.x, p.y, p.z);
}

function torno(perfil, escalaX, escalaZ, z = 0) {
  return new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), 14).scale(escalaX, 1, escalaZ).translate(0, 0, z);
}

// Las piezas comparten atributos (posición, normal, uv) para poder unirlas.
const unir = (piezas) => mergeGeometries(piezas.map((g) => (g.index ? g.toNonIndexed() : g)));

function cabeza(piel, cabello, { largo = false } = {}) {
  piel.push(capsula(v(0, 1.07, 0.07), v(0, 1.15, 0.07), 0.045), esfera(0.1, [0.92, 1.12, 1], v(0, 1.25, 0.06)));
  const casco = new THREE.SphereGeometry(0.105, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
  casco.scale(0.95, 1.12, 1.04).rotateX(0.35).translate(0, 1.262, 0.066);
  cabello.push(casco);
  // Cabello largo hasta los hombros.
  if (largo) cabello.push(esfera(0.1, [1.05, 1.5, 0.6], v(0, 1.13, 0.13)));
}

function hombre() {
  const ropa = [];
  const piel = [];
  const cabello = [];
  for (const x of [-0.095, 0.095]) {
    ropa.push(capsula(v(x, 0.56, 0.06), v(x * 1.05, 0.56, -0.33), 0.072));
    ropa.push(capsula(v(x * 1.05, 0.54, -0.36), v(x * 1.05, 0.09, -0.39), 0.058));
    ropa.push(esfera(0.055, [0.8, 0.5, 1.6], v(x * 1.05, 0.035, -0.44)));
  }
  ropa.push(torno([[0, 0.52], [0.17, 0.52], [0.16, 0.7], [0.18, 0.86], [0.2, 0.98], [0.16, 1.04], [0.06, 1.08]], 1.12, 0.72, 0.08));
  for (const lado of [-1, 1]) {
    ropa.push(capsula(v(lado * 0.2, 0.98, 0.08), v(lado * 0.22, 0.74, 0.02), 0.046));
    ropa.push(capsula(v(lado * 0.22, 0.74, 0.02), v(lado * 0.12, 0.62, -0.2), 0.04));
    piel.push(esfera(0.04, [0.8, 0.7, 1.2], v(lado * 0.1, 0.61, -0.24)));
  }
  cabeza(piel, cabello);
  return { ropa: unir(ropa), piel: unir(piel), cabello: unir(cabello) };
}

function mujer() {
  const ropa = [];
  const piel = [];
  const cabello = [];
  for (const x of [-0.085, 0.085]) {
    // Vestido largo: cubre muslos y piernas.
    ropa.push(capsula(v(x, 0.57, 0.06), v(x, 0.57, -0.32), 0.085));
    ropa.push(capsula(v(x, 0.55, -0.35), v(x, 0.1, -0.37), 0.075));
    piel.push(esfera(0.045, [0.75, 0.5, 1.5], v(x, 0.035, -0.42)));
  }
  // Falda que une las piernas.
  ropa.push(new THREE.BoxGeometry(0.2, 0.12, 0.38).translate(0, 0.58, -0.13));
  ropa.push(torno([[0, 0.52], [0.16, 0.52], [0.14, 0.66], [0.15, 0.82], [0.16, 0.94], [0.13, 1.0], [0.05, 1.04]], 1.08, 0.74, 0.08));
  for (const lado of [-1, 1]) {
    piel.push(capsula(v(lado * 0.17, 0.95, 0.08), v(lado * 0.19, 0.74, 0.02), 0.034));
    piel.push(capsula(v(lado * 0.19, 0.74, 0.02), v(lado * 0.09, 0.63, -0.2), 0.03));
  }
  cabeza(piel, cabello, { largo: true });
  return { ropa: unir(ropa), piel: unir(piel), cabello: unir(cabello) };
}

const ROPA_HOMBRE = [0x2f3a4f, 0x4a4d52, 0x6b5b4a, 0x8c7a62, 0x3d4a3a, 0x222428, 0x5a6470, 0x9a8a72];
const ROPA_MUJER = [0x7b8f6a, 0xa98274, 0x6e4552, 0x3b4a63, 0xc2a98a, 0x8a9aa8, 0x5e6b4f, 0xb89a8c, 0x4f3b45];
const PIELES = [0xe0b494, 0xd1a07d, 0xc28d6b, 0xb07a58, 0x9a6646, 0xe8c4a8];
const CABELLOS = [0x1c1410, 0x2b1d14, 0x3a2618, 0x4a3422, 0x8a8a86, 0xb8b6b0, 0x5b3a22];

const materiales = {
  ropa: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
  piel: new THREE.MeshStandardMaterial({ roughness: 0.6 }),
  cabello: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
};

let geometrias = null;

export function crearInvitados(matrices, aleatorio) {
  geometrias ??= { hombre: hombre(), mujer: mujer() };
  const elegir = (lista) => lista[Math.floor(aleatorio() * lista.length)];
  // Mitad y mitad, mezclados.
  const tipos = matrices.map(() => (aleatorio() < 0.5 ? 'hombre' : 'mujer'));
  // Estaturas un poco distintas (una por persona, igual para todas sus partes).
  const escalas = tipos.map((t) => (t === 'hombre' ? 1 : 0.94) * (0.94 + aleatorio() * 0.1));
  const grupo = new THREE.Group();
  const color = new THREE.Color();
  const escala = new THREE.Matrix4();
  for (const tipo of ['hombre', 'mujer']) {
    const indices = tipos.map((t, i) => (t === tipo ? i : -1)).filter((i) => i >= 0);
    const geo = geometrias[tipo];
    for (const parte of ['ropa', 'piel', 'cabello']) {
      const malla = new THREE.InstancedMesh(geo[parte], materiales[parte], indices.length);
      indices.forEach((i, k) => {
        const s = escalas[i];
        malla.setMatrixAt(k, escala.makeScale(s, s, s).premultiply(matrices[i]));
      });
      malla.castShadow = true;
      grupo.add(malla);
    }
    // Colores por persona (se reparten después para no depender del orden de las partes).
    const [ropa, piel, cabello] = grupo.children.slice(-3);
    indices.forEach((_, k) => {
      ropa.setColorAt(k, color.set(elegir(tipo === 'hombre' ? ROPA_HOMBRE : ROPA_MUJER)));
      piel.setColorAt(k, color.set(elegir(PIELES)));
      cabello.setColorAt(k, color.set(elegir(CABELLOS)));
    });
  }
  return grupo;
}
