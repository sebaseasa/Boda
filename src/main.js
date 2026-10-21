import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  SMAAEffect,
  SMAAPreset,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { POR_DEFECTO, HORA_MIN, HORA_MAX, ARCOS, PASILLOS, DISTRIBUCIONES, INVITADOS, CEREMONIA } from './config.js';
import { crearCalidad } from './calidad.js';
import { crearCielo } from './escena/cielo.js';
import { crearSol } from './escena/sol.js';
import { crearTerreno } from './escena/terreno.js';
import { crearHierba } from './escena/hierba.js';
import { crearVegetacion } from './escena/vegetacion.js';
import { crearCeremonia, ZONA_SIN_HIERBA } from './decoracion/ceremonia.js';

const $ = (s) => document.querySelector(s);
const contenedor = $('#stage');
const calidad = crearCalidad();

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, stencil: false, powerPreference: 'high-performance' });
} catch (e) {
  $('#error').hidden = false;
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, calidad.actual.pixeles));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
contenedor.appendChild(renderer.domElement);

const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(50, 1, 0.1, 700);
// Vista inicial: desde donde se sientan los invitados (ver VISTAS más abajo).
camara.position.set(1.15, 1.5, -8.4);

const controles = new OrbitControls(camara, renderer.domElement);
controles.target.set(0.75, 1.4, -18.6);
controles.enableDamping = true;
controles.dampingFactor = 0.08;
controles.minDistance = 2;
controles.maxDistance = 70;
controles.maxPolarAngle = Math.PI * 0.49;
controles.enablePan = true;
controles.update();

// Posprocesado (pmndrs): bloom suave, tone mapping AgX y SMAA.
const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
composer.addPass(new RenderPass(escena, camara));
const bloom = new BloomEffect({ intensity: 0.35, luminanceThreshold: 1.2, luminanceSmoothing: 0.3, mipmapBlur: true });
const tonos = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
const smaa = new SMAAEffect({ preset: SMAAPreset.MEDIUM });
const pasoEfectos = new EffectPass(camara, bloom, tonos, smaa);
composer.addPass(pasoEfectos);

// Pantalla de carga con porcentaje.
const manager = new THREE.LoadingManager();
manager.onProgress = (_url, cargados, total) => {
  const pct = Math.round((cargados / total) * 100);
  $('#carga-progreso').style.width = pct + '%';
  $('#carga-texto').textContent = `Cargando ${pct}%`;
};

const sol = crearSol(escena, calidad.actual);
crearTerreno(escena, manager, renderer.capabilities.getMaxAnisotropy());
const hierba = crearHierba(escena, ZONA_SIN_HIERBA);
const vegetacionLista = crearVegetacion(escena, manager);
const ceremoniaLista = crearCeremonia(escena, manager);
const cieloListo = crearCielo(escena, renderer, manager);
const todoCargado = new Promise((resolver) => (manager.onLoad = resolver));

function aplicarCalidad(nivel) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, nivel.pixeles));
  sol.ajustarSombra(nivel.sombra);
  bloom.blendMode.opacity.value = nivel.bloom ? 1 : 0;
  redimensionar();
}
calidad.alCambiar(aplicarCalidad);

// Hora del día. El deslizador trabaja en minutos (de 5 en 5) para no arrastrar decimales.
const deslizador = $('#hora');
deslizador.min = HORA_MIN * 60;
deslizador.max = HORA_MAX * 60;
deslizador.step = 5;
deslizador.value = Math.round((POR_DEFECTO.hora * 60) / 5) * 5;
const leerHora = () => +deslizador.value / 60;

function formatoHora(h) {
  const minutos = Math.round(h * 60);
  const hh = Math.floor(minutos / 60);
  const mm = minutos % 60;
  const h12 = hh > 12 ? hh - 12 : hh;
  return `${h12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'pm' : 'am'}`;
}

let cielo = null;
let vegetacion = null;
let ceremonia = null;
function aplicarHora(h) {
  sol.aplicarHora(h);
  const luz = cielo?.aplicarSol(sol.estado) ?? 1;
  vegetacion?.aplicarLuz(luz);
  ceremonia?.aplicarLuz(luz);
  $('#hora-valor').textContent = formatoHora(h);
}
deslizador.addEventListener('input', () => aplicarHora(leerHora()));

// Opciones para comparar: decoración de los árboles, pasillo y sillas. Se recuerda la última
// elección en este navegador.
const GRUPOS = [
  { clave: 'arco', etiqueta: 'Árboles', lista: ARCOS, aplicar: (id) => ceremonia?.ponerArco(id) },
  { clave: 'pasillo', etiqueta: 'Pasillo', lista: PASILLOS, aplicar: (id) => ceremonia?.ponerPasillo(id) },
  { clave: 'sillas', etiqueta: 'Sillas', lista: DISTRIBUCIONES, aplicar: (id) => ceremonia?.ponerSillas(id) },
  { clave: 'invitados', etiqueta: 'Invitados', lista: INVITADOS, aplicar: (id) => ceremonia?.mostrarInvitados(id === 'si') },
];
const elegido = {};
const contOpciones = $('#opciones');
for (const g of GRUPOS) {
  elegido[g.clave] = POR_DEFECTO[g.clave];
  try {
    const guardado = localStorage.getItem(g.clave);
    // Solo si sigue existiendo esa opción (antes había arcos armados que ya no están).
    if (g.lista.some(([id]) => id === guardado)) elegido[g.clave] = guardado;
  } catch {}
  const fila = document.createElement('div');
  fila.className = 'fila-opciones';
  fila.innerHTML = `<span>${g.etiqueta}</span>` + g.lista.map(([id, nombre]) => `<button data-id="${id}">${nombre}</button>`).join('');
  fila.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-id]');
    if (b) elegir(g, b.dataset.id);
  });
  g.fila = fila;
  contOpciones.appendChild(fila);
}
function elegir(g, id) {
  elegido[g.clave] = id;
  g.aplicar(id);
  for (const b of g.fila.querySelectorAll('button')) b.classList.toggle('activo', b.dataset.id === id);
  try {
    localStorage.setItem(g.clave, id);
  } catch {}
}
const aplicarOpciones = () => GRUPOS.forEach((g) => elegir(g, elegido[g.clave]));
aplicarOpciones();

// Vistas de cámara con transición suave.
const { arco } = CEREMONIA;
const VISTAS = {
  invitados: { nombre: 'Desde los invitados', p: [arco.x + 0.4, 1.5, -8.4], t: [arco.x, 1.4, arco.z] },
  pasillo: { nombre: '▶ Entrada de la novia', p: [arco.x - 1.7, 1.6, arco.z + 2.8], t: [arco.x + 0.2, 1.1, -5] },
  altar: { nombre: 'Desde el altar', p: [arco.x + 0.3, 1.7, arco.z + 2.2], t: [arco.x, 1.1, -8] },
  general: { nombre: 'General', p: [13, 7, -4], t: [arco.x, 1.2, -14] },
  jardin: { nombre: 'Como en las fotos', p: [2.5, 1.7, -1], t: [0.5, 3.2, -19] },
};
const contVistas = $('#vistas');
contVistas.innerHTML = Object.entries(VISTAS)
  .map(([id, v]) => `<button data-vista="${id}">${v.nombre}</button>`)
  .join('');
let transicion = null;
function irAVista(id) {
  const v = VISTAS[id];
  transicion = {
    p0: camara.position.clone(),
    t0: controles.target.clone(),
    p1: new THREE.Vector3(...v.p),
    t1: new THREE.Vector3(...v.t),
    inicio: performance.now(),
    duracion: 1600,
  };
  for (const b of contVistas.children) b.classList.toggle('activo', b.dataset.vista === id);
}
contVistas.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-vista]');
  if (!b) return;
  irAVista(b.dataset.vista);
  if (b.dataset.vista === 'pasillo') ceremonia?.novios.entrar();
});
controles.addEventListener('start', () => {
  transicion = null;
  for (const b of contVistas.children) b.classList.remove('activo');
});
function avanzarTransicion(ahora) {
  if (!transicion) return;
  const t = Math.min(1, (ahora - transicion.inicio) / transicion.duracion);
  const e = t * t * (3 - 2 * t);
  camara.position.lerpVectors(transicion.p0, transicion.p1, e);
  controles.target.lerpVectors(transicion.t0, transicion.t1, e);
  if (t >= 1) transicion = null;
}

function redimensionar() {
  const w = contenedor.clientWidth;
  const h = contenedor.clientHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h, false);
  camara.aspect = w / h;
  // En pantallas angostas (Fold doblado) se abre un poco el ángulo para no perder el paisaje.
  camara.fov = camara.aspect < 0.8 ? 62 : 50;
  camara.updateProjectionMatrix();
}
addEventListener('resize', redimensionar);
redimensionar();

const verFps = import.meta.env.DEV || new URLSearchParams(location.search).has('fps');
const etiquetaFps = $('#fps');
etiquetaFps.hidden = !verFps;

const reloj = new THREE.Timer();
let hojas = 0;
function cuadro(ahora) {
  reloj.update(ahora);
  avanzarTransicion(ahora);
  ceremonia?.novios.actualizar(ahora);
  controles.update();
  hojas = hierba.actualizar(reloj.getElapsed(), camara, calidad.actual.hierba);
  composer.render(reloj.getDelta());
  calidad.medir(ahora);
  if (verFps) {
    etiquetaFps.textContent = `${calidad.fps.toFixed(0)} fps · ${calidad.actual.nombre} · ${(hojas / 1000).toFixed(0)}k hojas`;
  }
}

Promise.all([cieloListo, vegetacionLista, ceremoniaLista, todoCargado]).then(([c, v, cer]) => {
  cielo = c;
  vegetacion = v;
  ceremonia = cer;
  aplicarOpciones();
  aplicarHora(leerHora());
  renderer.setAnimationLoop(cuadro);
  requestAnimationFrame(() => $('#carga').classList.add('oculta'));
});
aplicarHora(leerHora());
