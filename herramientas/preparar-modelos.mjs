// Aligera los modelos de PlantCatalog (Sketchfab, CC BY) para el celular.
// Uso: node herramientas/preparar-modelos.mjs <entrada.glb> <salida.glb> <perfil>
// Perfiles: "arbol" (jacarandá) o "palmera".
//
// - Tronco y ramas: se simplifican con meshoptimizer.
// - Hojas: cada hoja es una pieza suelta; se conserva solo una parte, elegida al azar,
//   y las que quedan se agrandan un poco para que la copa no se vea rala.
// - Texturas a WebP, geometría cuantizada y comprimida con Meshopt.
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, flatten, join, meshopt, prune, quantize, simplifyPrimitive, textureCompress, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [entrada, salida, perfil] = process.argv.slice(2);

const PERFILES = {
  arbol: {
    // Hojas compuestas: se eligen por su pecíolo y se conservan los folíolos que cuelgan de él.
    ralear: { patron: /stalk/i, conservar: 0.55, agrandar: 1 },
    dependientes: { patron: /leaf 0/i, agrandar: 1.12 },
    simplificar: { patron: /bark|twig|stalk/i, ratio: 0.3, error: 0.004 },
  },
  palmera: {
    ralear: { patron: /leaflet/i, conservar: 0.5, agrandar: 1.15 },
    simplificar: { patron: /trunk|stk|crownshaft|cut/i, ratio: 0.35, error: 0.003 },
  },
};
const config = PERFILES[perfil];
if (!config) throw new Error(`Perfil desconocido: ${perfil}`);

function aleatorio(semilla) {
  let s = semilla >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Agrupa triángulos en piezas conectadas (uniendo vértices con la misma posición, para no
// partir una hoja por sus costuras de UV) y conserva solo una fracción de las piezas.
function ralearHojas(primitiva, elegir, agrandar) {
  const pos = primitiva.getAttribute('POSITION');
  const indices = primitiva.getIndices();
  const n = pos.getCount();
  const padre = new Int32Array(n).map((_, i) => i);
  const raiz = (i) => {
    while (padre[i] !== i) i = padre[i] = padre[padre[i]];
    return i;
  };
  const unir = (a, b) => {
    a = raiz(a);
    b = raiz(b);
    if (a !== b) padre[a] = b;
  };
  const porPosicion = new Map();
  const v = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    pos.getElement(i, v);
    const clave = `${v[0].toFixed(5)},${v[1].toFixed(5)},${v[2].toFixed(5)}`;
    const otro = porPosicion.get(clave);
    if (otro === undefined) porPosicion.set(clave, i);
    else unir(i, otro);
  }
  const idx = indices.getArray();
  for (let t = 0; t < idx.length; t += 3) {
    unir(idx[t], idx[t + 1]);
    unir(idx[t], idx[t + 2]);
  }

  const decision = new Map();
  const queda = (r) => {
    if (!decision.has(r)) decision.set(r, elegir(r, raiz, pos));
    return decision.get(r);
  };
  const nuevos = [];
  for (let t = 0; t < idx.length; t += 3) if (queda(raiz(idx[t]))) nuevos.push(idx[t], idx[t + 1], idx[t + 2]);
  indices.setArray(new Uint32Array(nuevos));

  // Agranda cada hoja conservada desde su centro.
  const suma = new Map();
  for (let i = 0; i < n; i++) {
    const r = raiz(i);
    if (!decision.get(r)) continue;
    pos.getElement(i, v);
    const s = suma.get(r) ?? [0, 0, 0, 0];
    s[0] += v[0];
    s[1] += v[1];
    s[2] += v[2];
    s[3]++;
    suma.set(r, s);
  }
  for (let i = 0; i < n; i++) {
    const s = suma.get(raiz(i));
    if (!s) continue;
    pos.getElement(i, v);
    for (let k = 0; k < 3; k++) v[k] = s[k] / s[3] + (v[k] - s[k] / s[3]) * agrandar;
    pos.setElement(i, v);
  }
  return [idx.length / 3, nuevos.length / 3];
}

// Celdas de 3 cm ocupadas por las hojas conservadas.
const CELDA = 0.03;
const celda = (v) => `${Math.round(v[0] / CELDA)},${Math.round(v[1] / CELDA)},${Math.round(v[2] / CELDA)}`;
function vecinas(v) {
  const r = [];
  for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
      for (let z = -1; z <= 1; z++) r.push(celda([v[0] + x * CELDA, v[1] + y * CELDA, v[2] + z * CELDA]));
  return r;
}

const triangulos = (doc) =>
  doc.getRoot().listMeshes().reduce((t, m) => t + m.listPrimitives().reduce((a, p) => a + p.getIndices().getCount() / 3, 0), 0);

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(entrada);
console.log('triángulos antes:', triangulos(doc));

const azar = aleatorio(perfil === 'arbol' ? 3 : 9);
const ocupadas = new Set();
const v3 = [0, 0, 0];
for (const mesh of doc.getRoot().listMeshes()) {
  if (!config.ralear.patron.test(mesh.getName())) continue;
  for (const p of mesh.listPrimitives()) {
    ralearHojas(p, () => azar() < config.ralear.conservar, config.ralear.agrandar);
    const pos = p.getAttribute('POSITION');
    for (const i of p.getIndices().getArray()) ocupadas.add(celda(pos.getElement(i, v3)));
  }
}
if (config.dependientes) {
  for (const mesh of doc.getRoot().listMeshes()) {
    if (!config.dependientes.patron.test(mesh.getName())) continue;
    for (const p of mesh.listPrimitives()) {
      const idx = p.getIndices().getArray();
      const pos = p.getAttribute('POSITION');
      // Un folíolo se conserva si alguno de sus vértices toca un pecíolo conservado.
      let tocan = null;
      ralearHojas(
        p,
        (r, raiz) => {
          if (!tocan) {
            tocan = new Set();
            for (const i of idx) if (vecinas(pos.getElement(i, v3)).some((c) => ocupadas.has(c))) tocan.add(raiz(i));
          }
          return tocan.has(r);
        },
        config.dependientes.agrandar,
      );
    }
  }
}

// Hojas con recorte (MASK) en lugar de transparencia: se ordenan bien y son más baratas.
for (const mat of doc.getRoot().listMaterials()) {
  if (mat.getAlphaMode() === 'BLEND') mat.setAlphaMode('MASK').setAlphaCutoff(0.5);
}

await doc.transform(weld());
for (const mesh of doc.getRoot().listMeshes()) {
  if (!config.simplificar.patron.test(mesh.getName())) continue;
  for (const p of mesh.listPrimitives()) {
    simplifyPrimitive(p, {
      simplifier: MeshoptSimplifier,
      ratio: config.simplificar.ratio,
      error: config.simplificar.error,
      lockBorder: false,
    });
  }
}
await doc.transform(flatten(), join());
console.log('triángulos después:', triangulos(doc));

await doc.transform(
  dedup(),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 85 }),
  quantize(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(salida, doc);
