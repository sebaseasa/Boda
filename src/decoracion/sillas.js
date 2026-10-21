import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CEREMONIA } from '../config.js';

// Silla crossback de madera con cojín marfil. Mira hacia -Z (hacia el altar).
function pieza(desde, hasta, ancho, fondo) {
  const largo = desde.distanceTo(hasta);
  const g = new THREE.BoxGeometry(ancho, largo, fondo);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), hasta.clone().sub(desde).normalize());
  g.applyQuaternion(q);
  const c = desde.clone().add(hasta).multiplyScalar(0.5);
  g.translate(c.x, c.y, c.z);
  return g;
}

function geometriaSilla() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const L = 0.035; // grosor de patas
  const partes = [
    // Asiento.
    pieza(v(0, 0.43, 0), v(0, 0.465, 0), 0.44, 0.42),
    // Patas delanteras.
    pieza(v(-0.195, 0, -0.185), v(-0.195, 0.44, -0.185), L, L),
    pieza(v(0.195, 0, -0.185), v(0.195, 0.44, -0.185), L, L),
    // Patas traseras, que siguen hasta el respaldo con una leve inclinación.
    pieza(v(-0.195, 0, 0.19), v(-0.19, 0.93, 0.24), L, L),
    pieza(v(0.195, 0, 0.19), v(0.19, 0.93, 0.24), L, L),
    // Travesaños del respaldo.
    pieza(v(-0.19, 0.87, 0.235), v(0.19, 0.87, 0.235), 0.06, 0.025),
    pieza(v(-0.19, 0.56, 0.21), v(0.19, 0.56, 0.21), 0.04, 0.025),
    // La cruz.
    pieza(v(-0.17, 0.575, 0.214), v(0.17, 0.85, 0.232), 0.035, 0.018),
    pieza(v(0.17, 0.575, 0.214), v(-0.17, 0.85, 0.232), 0.035, 0.018),
    // Travesaños bajos.
    pieza(v(-0.195, 0.16, -0.185), v(0.195, 0.16, -0.185), 0.025, 0.025),
    pieza(v(-0.195, 0.2, -0.185), v(-0.195, 0.2, 0.19), 0.025, 0.025),
    pieza(v(0.195, 0.2, -0.185), v(0.195, 0.2, 0.19), 0.025, 0.025),
  ].map((g) => g.toNonIndexed());
  return mergeGeometries(partes);
}

// Silla plegable blanca de jardín (la de la referencia de Caro): asiento y respaldo de tablillas.
function geometriaPlegable() {
  const v = (x, y, z) => new THREE.Vector3(x, y, z);
  const L = 0.03;
  const partes = [
    pieza(v(-0.19, 0, -0.2), v(-0.19, 0.45, -0.17), L, L),
    pieza(v(0.19, 0, -0.2), v(0.19, 0.45, -0.17), L, L),
    pieza(v(-0.19, 0, 0.21), v(-0.185, 0.86, 0.2), L, L),
    pieza(v(0.19, 0, 0.21), v(0.185, 0.86, 0.2), L, L),
    // Tablillas del asiento.
    ...[-0.13, -0.045, 0.04, 0.125].map((z) => pieza(v(-0.2, 0.455, z), v(0.2, 0.455, z), 0.075, 0.022)),
    // Respaldo: dos tablas anchas.
    pieza(v(-0.19, 0.8, 0.2), v(0.19, 0.8, 0.2), 0.08, 0.02),
    pieza(v(-0.19, 0.66, 0.2), v(0.19, 0.66, 0.2), 0.05, 0.02),
    // Travesaños.
    pieza(v(-0.19, 0.12, -0.19), v(0.19, 0.12, -0.19), 0.022, 0.022),
    pieza(v(-0.19, 0.12, 0.21), v(0.19, 0.12, 0.21), 0.022, 0.022),
    pieza(v(-0.19, 0.2, -0.19), v(-0.19, 0.2, 0.21), 0.022, 0.022),
    pieza(v(0.19, 0.2, -0.19), v(0.19, 0.2, 0.21), 0.022, 0.022),
  ].map((g) => g.toNonIndexed());
  return mergeGeometries(partes);
}

const resinaBlanca = new THREE.MeshStandardMaterial({ color: 0xf4f3ee, roughness: 0.45 });

function geometriaCojin() {
  const g = new THREE.BoxGeometry(0.4, 0.045, 0.38, 6, 2, 6);
  const p = g.attributes.position;
  // Redondea bordes y abomba un poco el centro.
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / 0.2;
    const z = p.getZ(i) / 0.19;
    const y = p.getY(i);
    const borde = Math.max(Math.abs(x), Math.abs(z));
    if (y > 0) p.setY(i, y + 0.012 * (1 - borde * borde));
  }
  g.computeVertexNormals();
  g.translate(0, 0.49, 0);
  return g;
}

// Cada silla: posición y giro (0 = mirando hacia -Z, al altar).
// rectas: filas paralelas. curvas: arcos alrededor del altar. v: filas en diagonal que se abren
// hacia el altar, como en las referencias de Caro.
export function posicionesSillas(distribucion = 'rectas') {
  const { invitados, sillasPorLado, primeraFilaZ, separacionFilas, separacionSillas, arco, pasillo } = CEREMONIA;
  const porFila = sillasPorLado * 2;
  const filas = Math.ceil(invitados / porFila);
  const borde = pasillo.ancho / 2 + 0.3;
  const centro = new THREE.Vector2(arco.x, arco.z + 1.2);
  const lista = [];
  for (let f = 0; f < filas; f++) {
    for (let k = 0; k < porFila && lista.length < invitados; k++) {
      const lado = k < sillasPorLado ? -1 : 1;
      const i = k % sillasPorLado;
      if (distribucion === 'curvas') {
        // Arco de radio creciente; las sillas se reparten por distancia a lo largo del arco.
        const radio = primeraFilaZ - centro.y + f * separacionFilas;
        const a = (borde + i * separacionSillas) / radio;
        const x = centro.x + lado * Math.sin(a) * radio;
        const z = centro.y + Math.cos(a) * radio;
        lista.push({ x, z, giro: Math.atan2(-(centro.x - x), -(centro.y - z)) });
      } else if (distribucion === 'v') {
        const angulo = 0.35;
        const x0 = arco.x + lado * borde;
        const z0 = primeraFilaZ + f * separacionFilas * 1.05;
        const d = i * separacionSillas;
        lista.push({ x: x0 + lado * Math.cos(angulo) * d, z: z0 - Math.sin(angulo) * d, giro: lado * angulo });
      } else {
        lista.push({ x: arco.x + lado * (borde + i * separacionSillas), z: primeraFilaZ + f * separacionFilas, giro: 0 });
      }
    }
  }
  return lista;
}

export function crearSillas(madera, distribucion, modelo = 'crossback') {
  const posiciones = posicionesSillas(distribucion);
  const cojin = new THREE.MeshStandardMaterial({ color: 0xeee6d6, roughness: 0.92 });
  const grupo = new THREE.Group();
  // Un poco de desorden: nadie alinea 50 sillas al milímetro.
  const matrices = posiciones.map((p, i) => {
    const giro = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    return new THREE.Matrix4().makeRotationY(p.giro + giro * 0.06).setPosition(p.x + giro * 0.02, 0, p.z - giro * 0.03);
  });
  const piezas = modelo === 'plegable' ? [[geometriaPlegable(), resinaBlanca]] : [[geometriaSilla(), madera], [geometriaCojin(), cojin]];
  for (const [geo, material] of piezas) {
    const malla = new THREE.InstancedMesh(geo, material, posiciones.length);
    matrices.forEach((m, i) => malla.setMatrixAt(i, m));
    malla.castShadow = malla.receiveShadow = true;
    grupo.add(malla);
  }
  // Los invitados se sientan con estas mismas posiciones.
  grupo.userData.matrices = matrices;
  grupo.userData.posiciones = posiciones;
  return grupo;
}
