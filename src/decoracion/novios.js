import * as THREE from 'three';
import { CEREMONIA } from '../config.js';
import { arregloFloral } from './flores.js';

// Novios como figuras estilizadas (tipo maniquí elegante, sin rostro), como pide la guía:
// nada de humanos "casi reales". Alturas y colores son provisionales hasta tener sus fotos.
const NOVIO = { alto: 1.76, terno: 0xcdb99b, camisa: 0xf6f3ec, zapatos: 0x4a3426, cabello: 0x2b1d14 };
const NOVIA = { alto: 1.63, vestido: 0xf8f4ec, cabello: 0x3a2618 };
const PIEL = 0xc69a7c;

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

function torno(perfil, material, escalaX = 1, escalaZ = 1, segmentos = 32) {
  const g = new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), segmentos);
  g.scale(escalaX, 1, escalaZ);
  const m = new THREE.Mesh(g, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function capsula(desde, hasta, radio, material) {
  const largo = desde.distanceTo(hasta);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radio, largo, 6, 12), material);
  m.position.copy(desde).add(hasta).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hasta.clone().sub(desde).normalize());
  m.castShadow = true;
  return m;
}

function esfera(radio, escala, posicion, material) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radio, 24, 16), material);
  m.scale.set(...escala);
  m.position.copy(posicion);
  m.castShadow = true;
  return m;
}

// Cabeza sin rostro con el cabello.
function cabeza(grupo, y, piel, cabello, { mono = false } = {}) {
  const v = (a, b, c) => new THREE.Vector3(a, b, c);
  grupo.add(capsula(v(0, y - 0.17, 0), v(0, y - 0.08, 0), 0.045, piel));
  grupo.add(esfera(0.1, [0.92, 1.12, 1], v(0, y, 0), piel));
  // Cabello: casquete sobre la parte de arriba y de atrás.
  const casco = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), cabello);
  casco.scale.set(0.95, 1.12, 1.04);
  casco.position.set(0, y + 0.012, 0.006);
  casco.rotation.x = 0.35;
  casco.castShadow = true;
  grupo.add(casco);
  if (mono) grupo.add(esfera(0.055, [1.2, 0.9, 0.9], v(0, y - 0.04, 0.1), cabello));
}

function novio(rosaGeo, aleatorio) {
  const g = new THREE.Group();
  const s = NOVIO.alto / 1.76;
  const terno = mat(NOVIO.terno, { roughness: 0.85 });
  const camisa = mat(NOVIO.camisa);
  const piel = mat(PIEL, { roughness: 0.6 });
  const zapatos = mat(NOVIO.zapatos, { roughness: 0.4 });
  const v = (a, b, c) => new THREE.Vector3(a, b, c);
  for (const x of [-0.09, 0.09]) {
    g.add(capsula(v(x, 0.1, 0), v(x, 0.9, 0), 0.068, terno));
    g.add(esfera(0.06, [0.8, 0.5, 1.7], v(x, 0.035, -0.04), zapatos));
  }
  // Saco: de la cadera a los hombros, algo plano de frente.
  g.add(torno([[0, 0.8], [0.18, 0.8], [0.17, 0.95], [0.155, 1.05], [0.18, 1.25], [0.205, 1.4], [0.17, 1.46], [0.06, 1.5]], terno, 1.12, 0.72));
  // Camisa visible en el escote del saco.
  const pechera = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.22), camisa);
  pechera.position.set(0, 1.37, -0.125);
  pechera.rotation.y = Math.PI;
  g.add(pechera);
  g.add(capsula(v(0, 1.47, 0), v(0, 1.52, 0), 0.052, camisa));
  for (const lado of [-1, 1]) {
    g.add(capsula(v(lado * 0.215, 1.39, 0), v(lado * 0.24, 1.08, -0.02), 0.048, terno));
    g.add(capsula(v(lado * 0.24, 1.08, -0.02), v(lado * 0.2, 0.85, -0.07), 0.042, terno));
    g.add(esfera(0.04, [0.8, 1.2, 0.9], v(lado * 0.195, 0.8, -0.08), piel));
  }
  cabeza(g, 1.64, piel, mat(NOVIO.cabello, { roughness: 0.7 }));
  // Botonier de rosa blanca.
  const boton = arregloFloral([{ p: v(-0.11, 1.36, -0.13), n: v(0, 0.2, -1).normalize() }], {
    rosaGeo,
    aleatorio,
    radioFollaje: 0.025,
    densidad: 900,
    tamanoRosa: 0.035,
  });
  g.add(boton);
  g.scale.setScalar(s);
  return g;
}

function novia(rosaGeo, aleatorio) {
  const g = new THREE.Group();
  const s = NOVIA.alto / 1.63;
  const vestido = new THREE.MeshPhysicalMaterial({
    color: NOVIA.vestido,
    roughness: 0.55,
    sheen: 1,
    sheenRoughness: 0.4,
    sheenColor: new THREE.Color(0xffffff),
    side: THREE.DoubleSide,
  });
  const piel = mat(PIEL, { roughness: 0.6 });
  const v = (a, b, c) => new THREE.Vector3(a, b, c);

  // Falda en A con cola hacia atrás y pliegues suaves.
  const falda = torno(
    [[0.56, 0.0], [0.5, 0.15], [0.4, 0.4], [0.27, 0.7], [0.16, 0.95], [0.13, 1.02]],
    vestido,
    1,
    1,
    64,
  );
  const p = falda.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const a = Math.atan2(z, x);
    const abajo = 1 - y / 1.02;
    const pliegue = 1 + 0.035 * Math.sin(a * 14) * abajo;
    let nz = z * pliegue;
    // Cola: la parte de atrás (+Z) se alarga a ras del suelo.
    if (z > 0) nz += Math.pow(abajo, 3) * 0.75 * (z / 0.56);
    p.setXYZ(i, x * pliegue, y, nz);
  }
  falda.geometry.computeVertexNormals();
  g.add(falda);
  // Corpiño.
  g.add(torno([[0.13, 1.0], [0.125, 1.08], [0.145, 1.2], [0.15, 1.27], [0.12, 1.31], [0, 1.31]], vestido, 1.1, 0.78));
  // Hombros, brazos y cuello en piel (escote).
  g.add(torno([[0.13, 1.29], [0.17, 1.33], [0.16, 1.37], [0.05, 1.41], [0, 1.41]], piel, 1.1, 0.7));
  for (const lado of [-1, 1]) {
    g.add(capsula(v(lado * 0.175, 1.33, 0), v(lado * 0.19, 1.08, -0.03), 0.034, piel));
    g.add(capsula(v(lado * 0.19, 1.08, -0.03), v(lado * 0.07, 0.96, -0.14), 0.03, piel));
  }
  cabeza(g, 1.53, piel, mat(NOVIA.cabello, { roughness: 0.7 }), { mono: true });
  // Velo largo desde el moño.
  const veloGeo = new THREE.PlaneGeometry(0.55, 1.5, 8, 16);
  const pv = veloGeo.attributes.position;
  for (let i = 0; i < pv.count; i++) {
    const t = (0.75 - pv.getY(i)) / 1.5;
    pv.setX(i, pv.getX(i) * (0.35 + t * 0.9));
    pv.setZ(i, 0.05 + t * 0.25 + Math.sin(pv.getX(i) * 20) * 0.01);
  }
  veloGeo.computeVertexNormals();
  const velo = new THREE.Mesh(
    veloGeo,
    new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.6, side: THREE.DoubleSide, depthWrite: false }),
  );
  // Cuelga desde el moño (arriba del plano) hasta media falda.
  velo.position.set(0, 1.5 - 0.75, 0.13);
  g.add(velo);
  // Ramo frente a las manos.
  const puntos = Array.from({ length: 7 }, () => {
    const n = v(aleatorio() - 0.5, aleatorio() * 0.6 + 0.2, -0.6 - aleatorio() * 0.4).normalize();
    return { p: v(0, 0.98, -0.2).addScaledVector(n, 0.06), n };
  });
  g.add(arregloFloral(puntos, { rosaGeo, aleatorio, radioFollaje: 0.07, densidad: 300, tamanoRosa: 0.06 }));
  g.scale.setScalar(s);
  return g;
}

export function crearNovios(rosaGeo, aleatorio) {
  const { arco, pasillo } = CEREMONIA;
  const el = novio(rosaGeo, aleatorio);
  const ella = novia(rosaGeo, aleatorio);
  const grupo = new THREE.Group();
  grupo.add(el, ella);

  // En el altar, frente a frente y un poco abiertos hacia los invitados.
  const altarNovio = { x: arco.x - 0.45, z: arco.z + 1.1, giro: -Math.PI / 2 - 0.35 };
  const altarNovia = { x: arco.x + 0.45, z: arco.z + 1.1, giro: Math.PI / 2 + 0.35 };
  const colocar = (o, { x, z, giro }) => {
    o.position.set(x, 0, z);
    o.rotation.y = giro;
  };
  colocar(el, altarNovio);
  colocar(ella, altarNovia);

  // Entrada de la novia: camina por el pasillo hasta el altar.
  let entrada = null;
  return {
    grupo,
    entrar(alTerminar) {
      entrada = { inicio: performance.now(), duracion: 15000, alTerminar };
    },
    get caminando() {
      return entrada !== null;
    },
    posicionNovia: ella.position,
    actualizar(ahora) {
      if (!entrada) return;
      const t = Math.min(1, (ahora - entrada.inicio) / entrada.duracion);
      const e = t < 0.85 ? t / 0.85 : 1;
      const z0 = pasillo.hastaZ + 1;
      const zFin = altarNovia.z + 0.4;
      if (t < 0.85) {
        // Paso lento de ceremonia, con un leve vaivén.
        ella.position.set(arco.x + 0.15, Math.abs(Math.sin(e * Math.PI * 22)) * 0.012, THREE.MathUtils.lerp(z0, zFin, e));
        ella.rotation.y = 0;
        ella.rotation.z = Math.sin(e * Math.PI * 22) * 0.012;
      } else {
        // Al final se coloca frente al novio.
        const f = (t - 0.85) / 0.15;
        ella.position.set(THREE.MathUtils.lerp(arco.x + 0.15, altarNovia.x, f), 0, THREE.MathUtils.lerp(zFin, altarNovia.z, f));
        ella.rotation.set(0, THREE.MathUtils.lerp(0, altarNovia.giro, f), 0);
      }
      if (t >= 1) {
        const fin = entrada.alTerminar;
        entrada = null;
        colocar(ella, altarNovia);
        fin?.();
      }
    },
  };
}
