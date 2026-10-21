import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Hortensias blancas: cada cabeza es una bola de florcitas de cuatro pétalos (tarjetas con
// transparencia), unida en una sola geometría e instanciada. De lejos dan el volumen que las
// rosas solas no alcanzan.

function texturaFlorcita() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.translate(32, 32);
  for (let i = 0; i < 4; i++) {
    x.save();
    x.rotate((i * Math.PI) / 2 + 0.2);
    const g = x.createRadialGradient(0, -13, 2, 0, -13, 15);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.75, '#f6f4ec');
    g.addColorStop(1, '#dfe3d2');
    x.fillStyle = g;
    x.beginPath();
    x.ellipse(0, -13, 11, 14, 0, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }
  x.fillStyle = '#c9d3a8';
  x.beginPath();
  x.arc(0, 0, 3, 0, Math.PI * 2);
  x.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function geometriaCabeza() {
  const florcitas = [];
  const n = 48;
  const v = new THREE.Vector3();
  const q = new THREE.Quaternion();
  const z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < n; i++) {
    // Reparto uniforme sobre una semiesfera un poco achatada (espiral de Fibonacci).
    const y = 1 - (i / (n - 1)) * 1.15;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * 2.39996;
    v.set(Math.cos(a) * r, y, Math.sin(a) * r);
    const g = new THREE.PlaneGeometry(0.06, 0.06).rotateZ(a);
    q.setFromUnitVectors(z, v.clone().normalize());
    g.applyQuaternion(q);
    g.translate(v.x * 0.1, v.y * 0.085, v.z * 0.1);
    florcitas.push(g);
  }
  return mergeGeometries(florcitas);
}

const material = new THREE.MeshStandardMaterial({
  map: texturaFlorcita(),
  alphaTest: 0.5,
  side: THREE.DoubleSide,
  roughness: 0.75,
});

let geometria = null;
const TONOS = [0xffffff, 0xfbfaf4, 0xf4f6ea, 0xeef2e0];

// cabezas: [{ p: posición, n: hacia dónde mira, s: escala }]
export function hortensias(cabezas, aleatorio) {
  geometria ??= geometriaCabeza();
  const malla = new THREE.InstancedMesh(geometria, material, cabezas.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const q2 = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const arriba = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  cabezas.forEach(({ p, n, s: escala }, i) => {
    q.setFromUnitVectors(arriba, n);
    q2.setFromAxisAngle(n, aleatorio() * Math.PI * 2);
    m.compose(p, q.premultiply(q2), s.setScalar(escala));
    malla.setMatrixAt(i, m);
    malla.setColorAt(i, color.set(TONOS[Math.floor(aleatorio() * TONOS.length)]));
  });
  malla.castShadow = true;
  malla.receiveShadow = true;
  return malla;
}
