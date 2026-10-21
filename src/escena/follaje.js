import * as THREE from 'three';

// Follaje hecho con tarjetas de hoja (cualquier textura de hoja con transparencia) repartidas sobre la superficie
// de un volumen. Las normales apuntan hacia afuera del centro, así el bulto se ilumina como una copa.
export function tarjetasFollaje(volumenes, porM2, tamano, aleatorio) {
  const posiciones = [];
  const normales = [];
  const uvs = [];
  const indices = [];
  const centro = new THREE.Vector3();
  const punto = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const eje1 = new THREE.Vector3();
  const eje2 = new THREE.Vector3();
  for (const { c, r } of volumenes) {
    centro.copy(c);
    const area = 4 * Math.PI * Math.pow((r.x * r.y + r.x * r.z + r.y * r.z) / 3, 1);
    const cantidad = Math.round(area * porM2);
    for (let i = 0; i < cantidad; i++) {
      // Punto en la superficie del elipsoide, con algo de profundidad hacia adentro.
      normal.set(aleatorio() * 2 - 1, aleatorio() * 2 - 1, aleatorio() * 2 - 1).normalize();
      const hondo = 0.75 + aleatorio() * 0.3;
      punto.set(normal.x * r.x, normal.y * r.y, normal.z * r.z).multiplyScalar(hondo).add(centro);
      if (punto.y < 0.05) continue;
      const s = tamano * (0.7 + aleatorio() * 0.6);
      eje1.set(aleatorio() - 0.5, aleatorio() - 0.5, aleatorio() - 0.5).normalize();
      eje2.crossVectors(normal, eje1).normalize();
      eje1.crossVectors(eje2, normal).normalize();
      const base = posiciones.length / 3;
      for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 1]]) {
        posiciones.push(
          punto.x + (eje1.x * (u - 0.5) + eje2.x * (v - 0.5) * 2) * s,
          punto.y + (eje1.y * (u - 0.5) + eje2.y * (v - 0.5) * 2) * s,
          punto.z + (eje1.z * (u - 0.5) + eje2.z * (v - 0.5) * 2) * s,
        );
        normales.push(normal.x, normal.y, normal.z);
        uvs.push(u, v);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(posiciones, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(normales, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  return g;
}
