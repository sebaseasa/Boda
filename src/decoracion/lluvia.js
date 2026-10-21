import * as THREE from 'three';
import { geometriaPetalo, materialPetalo } from './flores.js';

// Lluvia de pétalos sobre los novios en el beso: caen girando y meciéndose, y se quedan en el pasto.
export function lluviaDePetalos(centro, cantidad, aleatorio) {
  const malla = new THREE.InstancedMesh(geometriaPetalo(), materialPetalo, cantidad);
  malla.visible = false;
  malla.frustumCulled = false;
  const petalos = Array.from({ length: cantidad }, () => ({
    x: centro.x + (aleatorio() - 0.5) * 3.2,
    z: centro.z + (aleatorio() - 0.5) * 2.4,
    y0: 3.2 + aleatorio() * 2.5,
    retraso: aleatorio() * 3,
    velocidad: 0.45 + aleatorio() * 0.3,
    fase: aleatorio() * 6.28,
    giro: (aleatorio() - 0.5) * 6,
    tam: 0.035 + aleatorio() * 0.02,
  }));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const esc = new THREE.Vector3();
  let inicio = null;

  return {
    malla,
    soltar() {
      inicio = performance.now();
      malla.visible = true;
    },
    actualizar(ahora) {
      if (inicio === null) return;
      const t = (ahora - inicio) / 1000;
      let cayendo = false;
      petalos.forEach((p, i) => {
        const tt = Math.max(0, t - p.retraso);
        let y = p.y0 - tt * p.velocidad;
        const enSuelo = y <= 0.015;
        if (enSuelo) y = 0.015;
        else cayendo = true;
        const vaiven = enSuelo ? 0 : 1;
        pos.set(p.x + Math.sin(tt * 1.7 + p.fase) * 0.25 * vaiven + tt * 0.08 * vaiven, y, p.z + Math.cos(tt * 1.3 + p.fase) * 0.15 * vaiven);
        e.set(enSuelo ? 0.1 : Math.sin(tt * 2 + p.fase) * 1.2, p.fase + (enSuelo ? 0 : tt * p.giro), enSuelo ? 0.1 : Math.cos(tt * 2.3 + p.fase) * 1.2);
        m.compose(pos, q.setFromEuler(e), esc.set(p.tam, p.tam, p.tam * 1.3));
        malla.setMatrixAt(i, m);
      });
      malla.instanceMatrix.needsUpdate = true;
      if (!cayendo && t > 4) inicio = null;
    },
  };
}
