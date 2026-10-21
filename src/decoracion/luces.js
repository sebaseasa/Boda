import * as THREE from 'three';

// Luces cálidas que dan el "wow" al atardecer: cortina de foquitos colgando de las copas y
// velas en cilindros de vidrio. Los foquitos y las llamas brillan por sí mismos (el bloom les da
// el halo); la luz que cae sobre telas y novios viene de muy pocas luces reales, para el celular.

export const TIEMPO = { value: 0 };

const CALIDO = new THREE.Color(0xffb46b);
const APAGADO = new THREE.Color(0x8d8a80);

// Cortina de foquitos: hilos casi verticales desde las copas, detrás de los novios.
// zona: rectángulo en coordenadas del altar { x0, x1, z0, z1, arriba: [min, max], abajo: [min, max] }.
export function cortinaDeLuces(zona, hilos, aleatorio) {
  const foquitos = [];
  const cables = [];
  for (let h = 0; h < hilos; h++) {
    const x = THREE.MathUtils.lerp(zona.x0, zona.x1, (h + aleatorio() * 0.8) / hilos);
    const z = THREE.MathUtils.lerp(zona.z0, zona.z1, aleatorio());
    const arriba = THREE.MathUtils.lerp(zona.arriba[0], zona.arriba[1], aleatorio());
    const abajo = THREE.MathUtils.lerp(zona.abajo[0], zona.abajo[1], aleatorio());
    // El hilo cuelga con una curva leve, no perfectamente recto.
    const comba = (aleatorio() - 0.5) * 0.12;
    const punto = (t) => new THREE.Vector3(x + Math.sin(t * Math.PI) * comba, THREE.MathUtils.lerp(arriba, abajo, t), z + Math.sin(t * Math.PI) * comba * 0.5);
    const pasos = Math.round((arriba - abajo) / 0.11);
    let anterior = punto(0);
    for (let i = 1; i <= pasos; i++) {
      const p = punto(i / pasos);
      cables.push(anterior.x, anterior.y, anterior.z, p.x, p.y, p.z);
      foquitos.push(p);
      anterior = p;
    }
  }

  const grupo = new THREE.Group();
  const cable = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(cables, 3)),
    new THREE.LineBasicMaterial({ color: 0x3b3a30, transparent: true, opacity: 0.55 }),
  );
  grupo.add(cable);

  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const malla = new THREE.InstancedMesh(new THREE.SphereGeometry(0.009, 5, 3), material, foquitos.length);
  const m = new THREE.Matrix4();
  // Cada foquito brilla un poco distinto, como en una cadena real.
  const brillos = foquitos.map(() => 0.65 + aleatorio() * 0.35);
  foquitos.forEach((p, i) => malla.setMatrixAt(i, m.makeTranslation(p.x, p.y, p.z)));
  grupo.add(malla);

  const color = new THREE.Color();
  function encender(nivel) {
    // nivel 0 = apagadas (vidrio gris de día), 1 = encendidas al atardecer.
    brillos.forEach((b, i) => {
      color.copy(APAGADO).lerp(CALIDO.clone().multiplyScalar(9 * b), nivel);
      malla.setColorAt(i, color);
    });
    malla.instanceColor.needsUpdate = true;
  }
  encender(0);
  return { grupo, encender };
}

// Llama con titileo propio por vela (la fase sale de la posición de cada instancia).
function materialLlama() {
  const material = new THREE.MeshBasicMaterial({ color: CALIDO.clone().multiplyScalar(7) });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTiempo = TIEMPO;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTiempo;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float fase = instanceMatrix[3].x * 7.1 + instanceMatrix[3].z * 3.3;
        #else
          float fase = 0.0;
        #endif
        float titileo = 1.0 + 0.1 * sin(uTiempo * 11.0 + fase) + 0.06 * sin(uTiempo * 23.0 + fase * 1.7);
        transformed.y *= titileo;
        transformed.x += sin(uTiempo * 3.0 + fase) * 0.0015 * transformed.y * 60.0;`,
      );
  };
  return material;
}

const cera = new THREE.MeshStandardMaterial({ color: 0xf1e8d6, roughness: 0.55, emissive: 0xffa860, emissiveIntensity: 0.12 });
const vidrio = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.04,
  metalness: 0,
  transparent: true,
  opacity: 0.1,
  envMapIntensity: 0.8,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const llama = materialLlama();

// Velas de pilar dentro de cilindros de vidrio (hurricanes), en grupos de alturas distintas.
// velas: [{ p: Vector3 (base), alto }]
export function velasEnVidrio(velas) {
  const grupo = new THREE.Group();
  const geoVela = new THREE.CylinderGeometry(0.035, 0.035, 1, 16).translate(0, 0.5, 0);
  const geoVidrio = new THREE.CylinderGeometry(0.075, 0.07, 1, 20, 1, true).translate(0, 0.5, 0);
  const geoLlama = new THREE.SphereGeometry(0.009, 8, 6).translate(0, 0.009, 0).scale(1, 2.6, 1);
  const mVela = new THREE.InstancedMesh(geoVela, cera, velas.length);
  const mVidrio = new THREE.InstancedMesh(geoVidrio, vidrio, velas.length);
  const mLlama = new THREE.InstancedMesh(geoLlama, llama, velas.length);
  const m = new THREE.Matrix4();
  const s = new THREE.Vector3();
  const q = new THREE.Quaternion();
  velas.forEach(({ p, alto }, i) => {
    mVela.setMatrixAt(i, m.compose(p, q, s.set(1, alto, 1)));
    mVidrio.setMatrixAt(i, m.compose(p, q, s.set(1, alto + 0.18, 1)));
    mLlama.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, p.y + alto + 0.012, p.z), q, s.set(1, 1, 1)));
  });
  mVela.castShadow = true;
  grupo.add(mVela, mVidrio, mLlama);
  return grupo;
}

// Grupo de velas alrededor de un punto, de alturas variadas.
export function grupoDeVelas(centro, cantidad, radio, aleatorio) {
  return Array.from({ length: cantidad }, () => {
    const a = aleatorio() * Math.PI * 2;
    const r = radio * Math.sqrt(aleatorio());
    return { p: new THREE.Vector3(centro.x + Math.cos(a) * r, 0, centro.z + Math.sin(a) * r), alto: 0.12 + aleatorio() * 0.32 };
  });
}
