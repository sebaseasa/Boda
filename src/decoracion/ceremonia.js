import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { CEREMONIA } from '../config.js';
import { CONSTRUCTORES } from './arcos.js';
import { crearSillas } from './sillas.js';
import { crearPiedras, crearFaroles, pasilloDeFlores } from './pasillo.js';
import { crearNovios } from './novios.js';
import { crearInvitados } from './invitados.js';
import { cortinaDeLuces, velasEnVidrio, grupoDeVelas, TIEMPO } from './luces.js';
import { lluviaDePetalos } from './lluvia.js';
import { pradoFloral } from './flores.js';

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
  let invitados = null;
  let conInvitados = true;
  function ponerSillas(distribucion) {
    for (const g of [sillas, invitados]) {
      if (!g) continue;
      grupo.remove(g);
      g.traverse((o) => o.isInstancedMesh && o.dispose());
    }
    sillas = crearSillas(madera, distribucion);
    // Misma semilla siempre: cada invitado conserva su ropa al cambiar la distribución.
    invitados = crearInvitados(sillas.userData.matrices, generadorAleatorio(71));
    invitados.visible = conInvitados;
    grupo.add(sillas, invitados);
  }
  function mostrarInvitados(si) {
    conInvitados = si;
    if (invitados) invitados.visible = si;
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

  // Extras del atardecer: cortina de luces detrás del altar y velas en vidrio.
  const aleatorioExtras = generadorAleatorio(91);
  const cortina = cortinaDeLuces({ x0: -3.2, x1: 3.4, z0: -0.95, z1: -0.35, arriba: [4.3, 5.0], abajo: [1.0, 2.3] }, 46, aleatorioExtras);
  const luzAltar = new THREE.PointLight(0xffb46b, 0, 7, 2);
  luzAltar.position.set(0, 2.2, 0.2);
  cortina.grupo.add(luzAltar);
  lugarArco.add(cortina.grupo);

  const { arco, pasillo } = CEREMONIA;
  const velas = [
    ...grupoDeVelas(new THREE.Vector3(arco.x - 2.7, 0, arco.z + 1.4), 7, 0.4, aleatorioExtras),
    ...grupoDeVelas(new THREE.Vector3(arco.x + 2.9, 0, arco.z + 1.2), 7, 0.4, aleatorioExtras),
  ];
  for (let z = pasillo.desdeZ + 0.8; z < pasillo.hastaZ; z += 1.6) {
    for (const lado of [-1, 1]) velas.push(...grupoDeVelas(new THREE.Vector3(arco.x + lado * (pasillo.ancho / 2 + 0.55), 0, z), 3, 0.15, aleatorioExtras));
  }
  const grupoVelas = velasEnVidrio(velas);
  const lucesVelas = [
    [arco.x - 2.7, arco.z + 1.4],
    [arco.x + 2.9, arco.z + 1.2],
    [arco.x, THREE.MathUtils.lerp(pasillo.desdeZ, pasillo.hastaZ, 0.45)],
  ].map(([x, z]) => {
    const l = new THREE.PointLight(0xffa860, 0, 4.5, 2);
    l.position.set(x, 0.45, z);
    grupoVelas.add(l);
    return l;
  });
  grupo.add(grupoVelas);

  // Pétalos que lanzan los invitados de las primeras filas, a ambos lados del pasillo.
  const borde = pasillo.ancho / 2;
  const lluvia = lluviaDePetalos(
    [
      { x0: arco.x - borde - 2.2, x1: arco.x - borde - 0.2, z0: arco.z + 3.6, z1: arco.z + 5.2 },
      { x0: arco.x + borde + 0.2, x1: arco.x + borde + 2.2, z0: arco.z + 3.6, z1: arco.z + 5.2 },
    ],
    new THREE.Vector3(arco.x, 0, arco.z + 1.3),
    480,
    generadorAleatorio(5),
  );
  grupo.add(lluvia.malla);

  // Prados de flores a la entrada del pasillo, como en las referencias de Caro.
  for (const lado of [-1, 1]) {
    const entrada = pradoFloral(new THREE.Vector3(arco.x + lado * (borde + 0.75), 0, pasillo.hastaZ - 0.2), {
      radio: 0.85,
      cantidad: 28,
      alto: 0.5,
      espigas: 12,
      rosaGeo,
      aleatorio: generadorAleatorio(lado > 0 ? 81 : 83),
    });
    pasillos.flores.add(entrada);
  }

  function ponerExtras({ luces, velas: conVelas }) {
    cortina.grupo.visible = luces;
    grupoVelas.visible = conVelas;
  }
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
  let ultimaAltura = 30;
  function aplicarLuz(luz, altura = ultimaAltura) {
    ultimaLuz = luz;
    ultimaAltura = altura;
    // Las luces del altar se encienden entre las 5:15 y las 5:50, cuando el sol baja de 16° a 9°.
    const encendido = 1 - THREE.MathUtils.smoothstep(altura, 9, 16);
    cortina.encender(encendido);
    luzAltar.intensity = 3 * encendido;
    // Las velas están prendidas siempre; su luz se nota al caer la tarde.
    const tarde = 1 - THREE.MathUtils.smoothstep(altura, 2, 20);
    for (const l of lucesVelas) l.intensity = 1.2 * tarde;
    // Los faroles se notan al caer la tarde.
    const noche = 1 - THREE.MathUtils.smoothstep(luz, 0.05, 0.6);
    for (const l of faroles.luces) l.intensity = pasilloActual === 'piedra' ? 1.6 * noche : 0;
    for (const l of actual?.userData.luces ?? []) l.intensity = 2.5 * noche;
  }

  return {
    ponerArco,
    ponerPasillo,
    ponerSillas,
    mostrarInvitados,
    ponerExtras,
    novios,
    aplicarLuz,
    besar() {
      novios.besar();
      lluvia.soltar();
    },
    actualizar(ahora, segundos) {
      TIEMPO.value = segundos;
      novios.actualizar(ahora);
      lluvia.actualizar(ahora);
    },
  };
}

function rectanguloPasillo() {
  const { arco, pasillo } = CEREMONIA;
  return new THREE.Vector4(arco.x - pasillo.ancho / 2 - 0.05, pasillo.desdeZ - 0.05, arco.x + pasillo.ancho / 2 + 0.05, pasillo.hastaZ + 0.05);
}

// Zona sin hierba instanciada, en coordenadas del mundo (x0, z0, x1, z1). La hierba lee este
// mismo objeto, así que basta con cambiarlo al elegir el tipo de pasillo.
export const ZONA_SIN_HIERBA = rectanguloPasillo();
