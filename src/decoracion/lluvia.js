import * as THREE from 'three';
import { geometriaPetalo, materialPetalo } from './flores.js';

// Pétalos que lanzan los invitados en el beso: salen de las primeras filas, suben en arco sobre
// los novios y caen girando y meciéndose hasta quedarse en el pasto.
// origenes: zonas { x0, x1, z0, z1 } desde donde lanzan; destino: punto sobre los novios.
export function lluviaDePetalos(origenes, destino, cantidad, aleatorio) {
  const malla = new THREE.InstancedMesh(geometriaPetalo(), materialPetalo, cantidad);
  malla.visible = false;
  malla.frustumCulled = false;
  const petalos = Array.from({ length: cantidad }, () => {
    const o = origenes[Math.floor(aleatorio() * origenes.length)];
    return {
      x0: THREE.MathUtils.lerp(o.x0, o.x1, aleatorio()),
      z0: THREE.MathUtils.lerp(o.z0, o.z1, aleatorio()),
      // Cada invitado apunta distinto: los pétalos se abren sobre los novios.
      x1: destino.x + (aleatorio() - 0.5) * 2.6,
      z1: destino.z + (aleatorio() - 0.5) * 2.0,
      cumbre: 2.4 + aleatorio() * 0.9,
      vuelo: 1.0 + aleatorio() * 0.6,
      retraso: aleatorio() * 1.6,
      caida: 0.35 + aleatorio() * 0.25,
      fase: aleatorio() * 6.28,
      giro: (aleatorio() - 0.5) * 6,
      tam: 0.035 + aleatorio() * 0.02,
    };
  });
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
      let enElAire = false;
      petalos.forEach((p, i) => {
        const tt = Math.max(0, t - p.retraso);
        let x;
        let y;
        let z;
        let mecer = 1;
        if (tt < p.vuelo) {
          // Lanzamiento: arco desde la mano del invitado hasta la cumbre sobre los novios.
          const s = tt / p.vuelo;
          x = THREE.MathUtils.lerp(p.x0, p.x1, s);
          z = THREE.MathUtils.lerp(p.z0, p.z1, s);
          y = THREE.MathUtils.lerp(1.3, p.cumbre, Math.sin((s * Math.PI) / 2));
          enElAire = true;
        } else {
          // Caída lenta, meciéndose.
          const c = tt - p.vuelo;
          y = p.cumbre - c * p.caida;
          x = p.x1 + Math.sin(c * 1.7 + p.fase) * 0.22;
          z = p.z1 + Math.cos(c * 1.3 + p.fase) * 0.14;
          if (y <= 0.015) {
            y = 0.015;
            mecer = 0;
            x = p.x1 + Math.sin(((p.cumbre - 0.015) / p.caida) * 1.7 + p.fase) * 0.22;
            z = p.z1 + Math.cos(((p.cumbre - 0.015) / p.caida) * 1.3 + p.fase) * 0.14;
          } else enElAire = true;
        }
        if (t < p.retraso) y = -1; // todavía en la mano
        pos.set(x, y, z);
        e.set(mecer ? Math.sin(tt * 2 + p.fase) * 1.2 : 0.1, p.fase + tt * p.giro * mecer, mecer ? Math.cos(tt * 2.3 + p.fase) * 1.2 : 0.1);
        m.compose(pos, q.setFromEuler(e), esc.set(p.tam, p.tam, p.tam * 1.3));
        malla.setMatrixAt(i, m);
      });
      malla.instanceMatrix.needsUpdate = true;
      if (!enElAire && t > 3) inicio = null;
    },
  };
}
