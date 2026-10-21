// Saca una sola rosa (solo los pétalos) del ramo "Bouquet of white roses" de alex.yefremov
// (Sketchfab, CC BY), la centra y la deja de 1 unidad de diámetro para instanciarla.
// Uso: node herramientas/preparar-rosa.mjs <ramo.glb> <salida.glb>
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, prune, quantize, simplifyPrimitive, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const [entrada, salida] = process.argv.slice(2);
await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const origen = await io.read(entrada);

// Cada rosa del ramo es un nodo "polySurfaceN"; los pétalos usan el material blanco "lambert2".
const nodo = origen.getRoot().listNodes().find((n) => n.getName() === 'polySurface5');
const petalos = nodo.listChildren().find((c) => c.getName().includes('lambert2')).getMesh().listPrimitives()[0];
const pos = petalos.getAttribute('POSITION');
const nor = petalos.getAttribute('NORMAL');
const idx = petalos.getIndices();

const min = pos.getMin([]);
const max = pos.getMax([]);
const centro = min.map((v, i) => (v + max[i]) / 2);
const tamano = Math.max(max[0] - min[0], max[2] - min[2]);
const p = Array.from(pos.getArray());
for (let i = 0; i < p.length; i += 3) {
  // La flor mira hacia +Y; su base queda en y = 0.
  p[i] = (p[i] - centro[0]) / tamano;
  p[i + 1] = (p[i + 1] - min[1]) / tamano;
  p[i + 2] = (p[i + 2] - centro[2]) / tamano;
}

const doc = new Document();
const buffer = doc.createBuffer();
const prim = doc
  .createPrimitive()
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(p)).setBuffer(buffer))
  .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(Float32Array.from(nor.getArray())).setBuffer(buffer))
  .setIndices(doc.createAccessor().setType('SCALAR').setArray(Uint32Array.from(idx.getArray())).setBuffer(buffer))
  .setMaterial(doc.createMaterial('petalos').setBaseColorFactor([0.96, 0.94, 0.89, 1]).setRoughnessFactor(0.6).setDoubleSided(true));
const mesh = doc.createMesh('rosa').addPrimitive(prim);
doc.createScene().addChild(doc.createNode('rosa').setMesh(mesh));

await doc.transform(weld());
simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: 0.55, error: 0.01 });
console.log('triángulos:', prim.getIndices().getCount() / 3);
await doc.transform(prune(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(salida, doc);
