import * as THREE from 'three';
import { arregloFloral, puntosEnCurva } from './flores.js';

// Los cinco tipos de arco del prototipo. Cada uno se arma centrado en el origen, de pie sobre
// el suelo y con el frente hacia +Z (hacia los invitados).

const metalOscuro = new THREE.MeshStandardMaterial({ color: 0x2a2620, metalness: 0.8, roughness: 0.5 });
const dorado = new THREE.MeshStandardMaterial({ color: 0xc9a24a, metalness: 1, roughness: 0.32 });
const yeso = new THREE.MeshStandardMaterial({ color: 0xefe9dd, roughness: 0.85 });
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

function tubo(curva, radio, material, segmentos = 64) {
  const m = new THREE.Mesh(new THREE.TubeGeometry(curva, segmentos, radio, 8, false), material);
  m.castShadow = m.receiveShadow = true;
  return m;
}

function viga(desde, hasta, grosor, material) {
  const largo = desde.distanceTo(hasta);
  const g = new THREE.BoxGeometry(grosor, largo, grosor);
  const m = new THREE.Mesh(g, material);
  m.position.copy(desde).add(hasta).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hasta.clone().sub(desde).normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}

function curvaPuntos(puntos, cerrada = false) {
  return new THREE.CatmullRomCurve3(puntos, cerrada, 'centripetal');
}

function arcoJardin(r) {
  const g = new THREE.Group();
  const ancho = 1.2;
  const recto = 1.5;
  const pts = [new THREE.Vector3(-ancho, 0, 0), new THREE.Vector3(-ancho, recto, 0)];
  for (let i = 1; i < 12; i++) {
    const a = Math.PI - (i / 12) * Math.PI;
    pts.push(new THREE.Vector3(Math.cos(a) * ancho, recto + Math.sin(a) * ancho, 0));
  }
  pts.push(new THREE.Vector3(ancho, recto, 0), new THREE.Vector3(ancho, 0, 0));
  const suave = curvaPuntos(pts);
  g.add(tubo(suave, 0.02, metalOscuro, 96));
  // Cubierto entero de follaje; las rosas se concentran arriba.
  const puntos = puntosEnCurva(suave, 0.16, { centro: new THREE.Vector3(0, recto, 0), haciaAfuera: 0.4 });
  const arriba = puntos.filter(({ p }) => p.y > 1.1);
  const abajo = puntos.filter(({ p }) => p.y <= 1.1);
  g.add(arregloFloral(arriba, { ...r, rosas: 0.85 }));
  g.add(arregloFloral(abajo, { ...r, rosas: 0.3 }));
  return g;
}

function arcoCircular(r) {
  const g = new THREE.Group();
  const radio = 1.25;
  const cy = radio + 0.15;
  const anillo = new THREE.EllipseCurve(0, cy, radio, radio, 0, Math.PI * 2);
  const pts = anillo.getPoints(96).map((p) => new THREE.Vector3(p.x, p.y, 0));
  g.add(tubo(curvaPuntos(pts, true), 0.022, dorado, 128));
  // Patas en forma de base.
  g.add(viga(new THREE.Vector3(-0.5, 0.01, 0), new THREE.Vector3(0.5, 0.01, 0), 0.03, dorado));
  g.add(viga(new THREE.Vector3(-0.35, 0.01, 0), new THREE.Vector3(-0.12, cy - radio, 0), 0.025, dorado));
  g.add(viga(new THREE.Vector3(0.35, 0.01, 0), new THREE.Vector3(0.12, cy - radio, 0), 0.025, dorado));
  const centro = new THREE.Vector3(0, cy, 0);
  const tramo = (a0, a1) =>
    curvaPuntos(
      Array.from({ length: 10 }, (_, i) => {
        const a = a0 + ((a1 - a0) * i) / 9;
        return new THREE.Vector3(Math.cos(a) * radio, cy + Math.sin(a) * radio, 0);
      }),
    );
  // Arreglo asimétrico: abajo a la izquierda y arriba a la derecha.
  g.add(arregloFloral(puntosEnCurva(tramo(3.4, 4.7), 0.14, { centro }), { ...r, rosas: 0.9 }));
  g.add(arregloFloral(puntosEnCurva(tramo(0.5, 1.35), 0.14, { centro }), { ...r, rosas: 0.8, radioFollaje: 0.2 }));
  return g;
}

function arcoHexagonal(r, madera) {
  const g = new THREE.Group();
  const radio = 1.35;
  const cy = radio * Math.sin(Math.PI / 3);
  const v = Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return new THREE.Vector3(Math.cos(a) * radio, cy + Math.sin(a) * radio, 0);
  });
  // Sin el lado de abajo: los dos vértices inferiores apoyan en el suelo.
  for (let i = 0; i < 6; i++) {
    if (i === 4) continue;
    g.add(viga(v[i], v[(i + 1) % 6], 0.07, madera));
  }
  const centro = new THREE.Vector3(0, cy, 0);
  const esquina = (a, b, c) => curvaPuntos([a.clone().lerp(b, 0.4), b, b.clone().lerp(c, 0.6)]);
  g.add(arregloFloral(puntosEnCurva(esquina(v[1], v[2], v[3]), 0.13, { centro }), { ...r, rosas: 0.9 }));
  g.add(arregloFloral(puntosEnCurva(esquina(v[5], v[0], v[1]), 0.13, { centro }), { ...r, rosas: 0.8, radioFollaje: 0.25 }));
  return g;
}

// Tela de chifón: una tira que cuelga con pliegues verticales.
function tela(ancho, alto, caida, pliegues) {
  const geo = new THREE.PlaneGeometry(ancho, alto, 24, 20);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const t = (alto / 2 - y) / alto; // 0 arriba, 1 abajo
    p.setZ(i, Math.sin((x / ancho) * Math.PI * pliegues) * 0.04 * (0.3 + t) + caida * t * t);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, chifon);
  m.castShadow = true;
  return m;
}

function arcoMadera(r, madera) {
  const g = new THREE.Group();
  const x = 1.25;
  const alto = 2.5;
  g.add(viga(new THREE.Vector3(-x, 0, 0), new THREE.Vector3(-x, alto, 0), 0.09, madera));
  g.add(viga(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, alto, 0), 0.09, madera));
  g.add(viga(new THREE.Vector3(-x - 0.2, alto, 0), new THREE.Vector3(x + 0.2, alto, 0), 0.09, madera));

  // Guirnalda de tela arriba y dos caídas a los lados.
  const guirnalda = new THREE.PlaneGeometry(2.6, 0.55, 30, 4);
  const pg = guirnalda.attributes.position;
  for (let i = 0; i < pg.count; i++) {
    const t = pg.getX(i) / 1.3;
    pg.setY(i, pg.getY(i) - 0.35 * (1 - t * t));
    pg.setZ(i, 0.06 + Math.sin(pg.getY(i) * 18) * 0.015);
  }
  guirnalda.computeVertexNormals();
  const swag = new THREE.Mesh(guirnalda, chifon);
  swag.position.set(0, alto - 0.25, 0.05);
  g.add(swag);
  for (const lado of [-1, 1]) {
    const caida = tela(0.55, alto - 0.05, 0.12, 3);
    caida.position.set(lado * (x + 0.05), alto / 2, 0.07);
    g.add(caida);
  }
  const esquina = curvaPuntos([
    new THREE.Vector3(-x + 0.9, alto + 0.05, 0.05),
    new THREE.Vector3(-x, alto + 0.05, 0.05),
    new THREE.Vector3(-x, alto - 0.8, 0.05),
  ]);
  g.add(arregloFloral(puntosEnCurva(esquina, 0.13), { ...r, rosas: 0.9 }));
  const baja = curvaPuntos([new THREE.Vector3(x, 0.7, 0.05), new THREE.Vector3(x, 0.15, 0.05), new THREE.Vector3(x - 0.5, 0.1, 0.1)]);
  g.add(arregloFloral(puntosEnCurva(baja, 0.14), { ...r, rosas: 0.8, radioFollaje: 0.2 }));
  return g;
}

function arcoColumnas(r) {
  const g = new THREE.Group();
  for (const lado of [-1, 1]) {
    const x = lado * 1.2;
    const columna = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.1, 24), yeso);
    columna.position.set(x, 0.55, 0);
    columna.castShadow = columna.receiveShadow = true;
    g.add(columna);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 24), yeso);
    base.position.set(x, 0.04, 0);
    g.add(base);
    // Globo de flores encima de cada columna.
    const puntos = [];
    for (let i = 0; i < 22; i++) {
      const n = new THREE.Vector3(r.aleatorio() - 0.5, r.aleatorio() * 0.8, r.aleatorio() - 0.2).normalize();
      puntos.push({ p: new THREE.Vector3(x, 1.45, 0).addScaledVector(n, 0.32), n });
    }
    g.add(arregloFloral(puntos, { ...r, rosas: 0.9 }));
  }
  return g;
}

export const CONSTRUCTORES = {
  jardin: arcoJardin,
  circular: arcoCircular,
  hexagonal: arcoHexagonal,
  madera: arcoMadera,
  columnas: arcoColumnas,
};
