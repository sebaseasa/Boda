import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { CEREMONIA } from '../config.js';
import { CONSTRUCTORES } from './arcos.js';
import { crearSillas } from './sillas.js';
import { crearPiedras, crearFaroles, pasilloDeFlores } from './pasillo.js';
import { crearNovios } from './novios.js';

function generadorAleatorio(semilla) {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function materialPBR(cargador, nombre, { repetir = 1, color = 0xffffff, normal = true } = {}) {
  const preparar = (archivo, srgb) => {
    const t = cargador.load(archivo);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.setScalar(repetir);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const orm = preparar(`texturas/${nombre}-orm.webp`, false);
  return new THREE.MeshStandardMaterial({
    color,
    map: preparar(`texturas/${nombre}-color.webp`, true),
    normalMap: normal ? preparar(`texturas/${nombre}-normal.webp`, false) : null,
    aoMap: orm,
    roughnessMap: orm,
    metalness: 0,
  });
}

// Ceremonia: arco (se puede cambiar entre los cinco tipos), sillas, pasillo de piedra y faroles.
export async function crearCeremonia(escena, manager) {
  const base = import.meta.env.BASE_URL;
  const texturas = new THREE.TextureLoader(manager).setPath(base);
  const gltf = await new GLTFLoader(manager).setPath(base).setMeshoptDecoder(MeshoptDecoder).loadAsync('modelos/rosa.glb');
  let rosaGeo = null;
  gltf.scene.traverse((o) => {
    if (o.isMesh && !rosaGeo) rosaGeo = o.geometry;
  });

  // Roble claro teñido al café cálido de las sillas crossback.
  const madera = materialPBR(texturas, 'madera', { repetir: 0.6, color: 0x8f6a4c, normal: false });
  const piedra = materialPBR(texturas, 'piedra', { color: 0xa39b8e });

  const grupo = new THREE.Group();
  escena.add(grupo);

  // Sillas: se rearman al cambiar la distribución (son pocas mallas instanciadas).
  let sillas = null;
  function ponerSillas(distribucion) {
    if (sillas) {
      grupo.remove(sillas);
      sillas.traverse((o) => o.isInstancedMesh && o.dispose());
    }
    sillas = crearSillas(madera, distribucion);
    grupo.add(sillas);
  }

  // Pasillo: camino de piedra con faroles, o pasto con flores y pétalos.
  const faroles = crearFaroles();
  const pasillos = {
    piedra: new THREE.Group().add(crearPiedras(piedra, generadorAleatorio(17)), faroles.grupo),
    flores: pasilloDeFlores(rosaGeo, generadorAleatorio(23)),
  };
  for (const g of Object.values(pasillos)) grupo.add(g);
  let pasilloActual = 'piedra';
  function ponerPasillo(tipo) {
    pasilloActual = tipo;
    for (const [k, g] of Object.entries(pasillos)) g.visible = k === tipo;
    // Sobre el camino de piedra no crece hierba; en el de pasto, sí.
    if (tipo === 'piedra') ZONA_SIN_HIERBA.copy(rectanguloPasillo());
    else ZONA_SIN_HIERBA.set(0, 0, 0, 0);
    aplicarLuz(ultimaLuz);
  }

  const novios = crearNovios(rosaGeo, generadorAleatorio(53));
  grupo.add(novios.grupo);

  const lugarArco = new THREE.Group();
  lugarArco.position.set(CEREMONIA.arco.x, 0, CEREMONIA.arco.z);
  grupo.add(lugarArco);
  const arcos = {};
  function ponerArco(tipo) {
    if (!arcos[tipo]) {
      arcos[tipo] = CONSTRUCTORES[tipo]({ rosaGeo, aleatorio: generadorAleatorio(31) });
      lugarArco.add(arcos[tipo]);
    }
    for (const [k, g] of Object.entries(arcos)) g.visible = k === tipo;
    actual = arcos[tipo];
    aplicarLuz(ultimaLuz);
  }

  let actual = null;
  let ultimaLuz = 1;
  function aplicarLuz(luz) {
    ultimaLuz = luz;
    // Los faroles se notan al caer la tarde.
    const noche = 1 - THREE.MathUtils.smoothstep(luz, 0.05, 0.6);
    for (const l of faroles.luces) l.intensity = pasilloActual === 'piedra' ? 1.6 * noche : 0;
    for (const l of actual?.userData.luces ?? []) l.intensity = 2.5 * noche;
  }

  return {
    ponerArco,
    ponerPasillo,
    ponerSillas,
    novios,
    aplicarLuz,
  };
}

function rectanguloPasillo() {
  const { arco, pasillo } = CEREMONIA;
  return new THREE.Vector4(arco.x - pasillo.ancho / 2 - 0.05, pasillo.desdeZ - 0.05, arco.x + pasillo.ancho / 2 + 0.05, pasillo.hastaZ + 0.05);
}

// Zona sin hierba instanciada, en coordenadas del mundo (x0, z0, x1, z1). La hierba lee este
// mismo objeto, así que basta con cambiarlo al elegir el tipo de pasillo.
export const ZONA_SIN_HIERBA = rectanguloPasillo();
