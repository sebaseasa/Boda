import * as THREE from 'three';
import { tarjetasFollaje } from '../escena/follaje.js';

// Ramas de rusco (el follaje de los centros de mesa de la prueba): se dibujan en un canvas con
// transparencia y se usan como tarjetas de hoja.
function texturaRusco() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const x = c.getContext('2d');
  x.strokeStyle = '#3d5a2c';
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(128, 512);
  x.quadraticCurveTo(120, 260, 132, 8);
  x.stroke();
  for (let i = 0; i < 9; i++) {
    const y = 470 - i * 52;
    const lado = i % 2 ? 1 : -1;
    const largo = 95 - i * 5;
    x.save();
    x.translate(128 + lado * 6, y);
    x.rotate(lado * (0.75 - i * 0.03));
    const g = x.createLinearGradient(0, 0, 0, -largo);
    g.addColorStop(0, '#2c4a22');
    g.addColorStop(0.6, '#3f6530');
    g.addColorStop(1, '#55793d');
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(0, 0);
    x.bezierCurveTo(largo * 0.42, -largo * 0.25, largo * 0.3, -largo * 0.85, 0, -largo);
    x.bezierCurveTo(-largo * 0.3, -largo * 0.85, -largo * 0.42, -largo * 0.25, 0, 0);
    x.fill();
    // Nervio central.
    x.strokeStyle = 'rgba(160, 190, 120, 0.35)';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(0, -4);
    x.lineTo(0, -largo + 8);
    x.stroke();
    x.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

let materialRuscoCache = null;
export function materialRusco() {
  if (!materialRuscoCache) {
    materialRuscoCache = new THREE.MeshStandardMaterial({
      map: texturaRusco(),
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.55,
      metalness: 0,
    });
  }
  return materialRuscoCache;
}

const materialRosa = new THREE.MeshStandardMaterial({ color: 0xf7f2e8, roughness: 0.62, side: THREE.DoubleSide });
const materialGypso = new THREE.MeshStandardMaterial({ color: 0xfbf9f3, roughness: 0.8 });
const geometriaGypso = new THREE.IcosahedronGeometry(1, 0);

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _arriba = new THREE.Vector3(0, 1, 0);

// Arreglo floral sobre una lista de puntos { p, n } (posición y hacia dónde mira la flor):
// follaje de rusco, rosas blancas y gypsophila alrededor.
export function arregloFloral(puntos, { rosaGeo, aleatorio, rosas = 1, radioFollaje = 0.3, densidad = 40, tamanoRosa = 0.09 }) {
  const grupo = new THREE.Group();

  const volumenes = puntos.map(({ p }) => ({
    c: p,
    r: new THREE.Vector3(radioFollaje, radioFollaje, radioFollaje * 0.8),
  }));
  const follaje = new THREE.Mesh(tarjetasFollaje(volumenes, densidad, 0.13, aleatorio), materialRusco());
  follaje.castShadow = true;
  grupo.add(follaje);

  const elegidos = puntos.filter(() => aleatorio() < rosas);
  const rosasMalla = new THREE.InstancedMesh(rosaGeo, materialRosa, elegidos.length * 2);
  let k = 0;
  for (const { p, n } of elegidos) {
    for (let j = 0; j < 2; j++) {
      const dir = n.clone().add(new THREE.Vector3(aleatorio() - 0.5, aleatorio() - 0.5, aleatorio() - 0.5).multiplyScalar(0.7)).normalize();
      _q.setFromUnitVectors(_arriba, dir);
      _q2.setFromAxisAngle(dir, aleatorio() * Math.PI * 2);
      _q.premultiply(_q2);
      const d = tamanoRosa * (1 + aleatorio() * 0.55);
      const pos = p.clone().addScaledVector(dir, radioFollaje * 0.55).add(new THREE.Vector3(aleatorio() - 0.5, aleatorio() - 0.5, aleatorio() - 0.5).multiplyScalar(radioFollaje * 0.8));
      _m.compose(pos, _q, _s.setScalar(d));
      rosasMalla.setMatrixAt(k++, _m);
    }
  }
  rosasMalla.count = k;
  rosasMalla.castShadow = true;
  grupo.add(rosasMalla);

  // Gypsophila: nubes de florcitas blancas entre las rosas.
  const cantidad = puntos.length * 14;
  const gypso = new THREE.InstancedMesh(geometriaGypso, materialGypso, cantidad);
  for (let i = 0; i < cantidad; i++) {
    const { p, n } = puntos[Math.floor(aleatorio() * puntos.length)];
    const pos = p
      .clone()
      .addScaledVector(n, radioFollaje * (0.6 + aleatorio() * 0.5))
      .add(new THREE.Vector3(aleatorio() - 0.5, aleatorio() - 0.5, aleatorio() - 0.5).multiplyScalar(radioFollaje * 1.6));
    _m.compose(pos, _q.identity(), _s.setScalar(0.008 + aleatorio() * 0.006));
    gypso.setMatrixAt(i, _m);
  }
  grupo.add(gypso);
  return grupo;
}

// Reparte puntos a lo largo de una curva 3D, mirando hacia afuera de la curva y hacia los invitados (+Z).
export function puntosEnCurva(curva, separacion, { haciaAfuera = 0.6, centro = null } = {}) {
  const largo = curva.getLength();
  const n = Math.max(2, Math.round(largo / separacion));
  const puntos = [];
  for (let i = 0; i <= n; i++) {
    const p = curva.getPointAt(i / n);
    const afuera = centro ? p.clone().sub(centro).setZ(0).normalize() : new THREE.Vector3();
    const dir = new THREE.Vector3(0, 0, 1).addScaledVector(afuera, haciaAfuera).normalize();
    puntos.push({ p, n: dir });
  }
  return puntos;
}

// Pétalos sueltos sobre el pasto: tarjetas pequeñas, curvadas y casi planas.
export const materialPetalo = new THREE.MeshStandardMaterial({ color: 0xf8f3ea, roughness: 0.7, side: THREE.DoubleSide });
export function geometriaPetalo() {
  const g = new THREE.PlaneGeometry(1, 1, 2, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    // Óvalo con las puntas hacia arriba, como un pétalo de rosa caído.
    p.setX(i, x * (1 - Math.abs(y) * 0.6));
    p.setZ(i, (x * x + y * y) * 0.35);
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

// zonas: [{ x0, z0, x1, z1, cantidad }] en las coordenadas del grupo donde se agrega la malla.
export function crearPetalos(zonas, aleatorio) {
  const total = zonas.reduce((t, z) => t + z.cantidad, 0);
  const malla = new THREE.InstancedMesh(geometriaPetalo(), materialPetalo, total);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const esc = new THREE.Vector3();
  let k = 0;
  for (const z of zonas) {
    for (let i = 0; i < z.cantidad; i++) {
      pos.set(THREE.MathUtils.lerp(z.x0, z.x1, aleatorio()), 0.012 + aleatorio() * 0.01, THREE.MathUtils.lerp(z.z0, z.z1, aleatorio()));
      e.set((aleatorio() - 0.5) * 0.5, aleatorio() * Math.PI * 2, (aleatorio() - 0.5) * 0.5);
      const t = 0.035 + aleatorio() * 0.02;
      m.compose(pos, q.setFromEuler(e), esc.set(t, t, t * 1.3));
      malla.setMatrixAt(k++, m);
    }
  }
  malla.receiveShadow = true;
  return malla;
}

// Alhelí blanco (como en los centros de mesa de la prueba): espigas altas con florcitas apiñadas.
// espigas: [{ p: base, alto }]
const materialTallo = new THREE.MeshStandardMaterial({ color: 0x5d7a45, roughness: 0.8 });
const materialAlheli = new THREE.MeshStandardMaterial({ color: 0xfaf7f0, roughness: 0.75 });
export function espigasDeAlheli(espigas, aleatorio) {
  const grupo = new THREE.Group();
  const tallos = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.004, 0.006, 1, 5).translate(0, 0.5, 0), materialTallo, espigas.length);
  const porEspiga = 22;
  const florcitas = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), materialAlheli, espigas.length * porEspiga);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let k = 0;
  espigas.forEach(({ p: base, alto }, i) => {
    // Un poco inclinada, nunca perfectamente vertical.
    const inclinacion = new THREE.Euler((aleatorio() - 0.5) * 0.35, 0, (aleatorio() - 0.5) * 0.35);
    q.setFromEuler(inclinacion);
    tallos.setMatrixAt(i, m.compose(base, q, s.set(1, alto, 1)));
    const eje = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    for (let j = 0; j < porEspiga; j++) {
      const t = 0.62 + (j / porEspiga) * 0.38;
      const a = j * 2.4;
      const r = 0.022 * (1 - t * 0.6);
      p.copy(base).addScaledVector(eje, alto * t).add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      florcitas.setMatrixAt(k++, m.compose(p, q.identity(), s.setScalar(0.011 + aleatorio() * 0.006 - t * 0.004)));
      q.setFromEuler(inclinacion);
    }
  });
  tallos.castShadow = florcitas.castShadow = true;
  grupo.add(tallos, florcitas);
  return grupo;
}

// Prado de flores que brota del pasto: rosas, rusco y gypsophila bajos y anchos, con espigas de
// alhelí más altas por encima. lado: hacia dónde se abre más (1 o -1 en X, 0 = parejo).
export function pradoFloral(centro, { radio = 0.9, cantidad = 34, alto = 0.6, espigas = 14, rosaGeo, aleatorio }) {
  const grupo = new THREE.Group();
  const puntos = [];
  for (let i = 0; i < cantidad; i++) {
    const a = aleatorio() * Math.PI * 2;
    const d = Math.sqrt(aleatorio());
    const h = alto * (1 - d * 0.75) * (0.6 + aleatorio() * 0.4);
    const n = new THREE.Vector3(Math.cos(a) * d, 0.8, Math.sin(a) * d + 0.3).normalize();
    puntos.push({ p: new THREE.Vector3(centro.x + Math.cos(a) * d * radio, 0.08 + h, centro.z + Math.sin(a) * d * radio * 0.7), n });
  }
  grupo.add(arregloFloral(puntos, { rosaGeo, aleatorio, rosas: 0.8, radioFollaje: 0.26, densidad: 34 }));
  const lista = Array.from({ length: espigas }, () => {
    const a = aleatorio() * Math.PI * 2;
    const d = Math.sqrt(aleatorio()) * radio * 0.7;
    return { p: new THREE.Vector3(centro.x + Math.cos(a) * d, 0, centro.z + Math.sin(a) * d * 0.7), alto: alto + 0.3 + aleatorio() * 0.45 };
  });
  grupo.add(espigasDeAlheli(lista, aleatorio));
  return grupo;
}

// Nube de flores colgante: un volumen orgánico de rosas, rusco y gypsophila suspendido bajo las
// copas, con hilos de flores que cuelgan por debajo y cables finos hacia las ramas.
export function nubeDeFlores(centro, { ancho = 2.6, alto = 0.55, fondo = 0.9, hastaRama = 1.6, rosaGeo, aleatorio }) {
  const grupo = new THREE.Group();
  const puntos = [];
  for (let i = 0; i < 70; i++) {
    // Más flores en la parte de abajo, que es la que se ve desde el suelo.
    const n = new THREE.Vector3(aleatorio() * 2 - 1, -Math.pow(aleatorio(), 0.6), aleatorio() * 2 - 1).normalize();
    const forma = 1 + 0.25 * Math.sin(n.x * 5 + n.z * 3);
    puntos.push({
      p: new THREE.Vector3(centro.x + n.x * ancho * 0.5 * forma, centro.y + n.y * alto * 0.5, centro.z + n.z * fondo * 0.5),
      n,
    });
  }
  // Algunas flores arriba para que no se vea hueca de lado.
  for (let i = 0; i < 14; i++) {
    const n = new THREE.Vector3(aleatorio() * 2 - 1, aleatorio() * 0.5, aleatorio() * 2 - 1).normalize();
    puntos.push({ p: new THREE.Vector3(centro.x + n.x * ancho * 0.42, centro.y + n.y * alto * 0.4, centro.z + n.z * fondo * 0.4), n });
  }
  grupo.add(arregloFloral(puntos, { rosaGeo, aleatorio, rosas: 0.85, radioFollaje: 0.27, densidad: 34 }));
  // Hilos colgantes de follaje y flores.
  const colgantes = [];
  for (let h = 0; h < 16; h++) {
    const x = centro.x + (aleatorio() - 0.5) * ancho * 0.9;
    const z = centro.z + (aleatorio() - 0.5) * fondo * 0.7;
    const largo = 0.3 + aleatorio() * 0.65;
    for (let t = 0; t < largo; t += 0.12) {
      colgantes.push({ p: new THREE.Vector3(x + Math.sin(t * 6) * 0.03, centro.y - alto * 0.4 - t, z), n: new THREE.Vector3(0, -0.4, 1).normalize() });
    }
  }
  grupo.add(arregloFloral(colgantes, { rosaGeo, aleatorio, rosas: 0.35, radioFollaje: 0.1, densidad: 70, tamanoRosa: 0.06 }));
  // Cables a las ramas.
  const cables = [];
  for (const [dx, dz] of [[-0.42, 0], [0.42, 0], [0, -0.3], [0, 0.3]]) {
    const x = centro.x + dx * ancho;
    const z = centro.z + dz * fondo;
    cables.push(x, centro.y + alto * 0.3, z, x * 0.95, centro.y + hastaRama, z);
  }
  grupo.add(
    new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(cables, 3)),
      new THREE.LineBasicMaterial({ color: 0x3a3a34, transparent: true, opacity: 0.5 }),
    ),
  );
  return grupo;
}
