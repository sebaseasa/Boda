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
import { POR_DEFECTO, HORA_MIN, HORA_MAX } from './config.js';
import { crearCalidad } from './calidad.js';
import { crearCielo } from './escena/cielo.js';
import { crearSol } from './escena/sol.js';
import { crearTerreno } from './escena/terreno.js';
import { crearHierba } from './escena/hierba.js';
import { crearVegetacion } from './escena/vegetacion.js';

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
camara.position.set(9, 3.2, 12);

const controles = new OrbitControls(camara, renderer.domElement);
controles.target.set(0, 1.2, -12);
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
const hierba = crearHierba(escena);
crearVegetacion(escena);
const cieloListo = crearCielo(escena, renderer, manager);
const todoCargado = new Promise((resolver) => (manager.onLoad = resolver));

function aplicarCalidad(nivel) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, nivel.pixeles));
  sol.ajustarSombra(nivel.sombra);
  bloom.blendMode.opacity.value = nivel.bloom ? 1 : 0;
  redimensionar();
}
calidad.alCambiar(aplicarCalidad);

// Hora del día.
const deslizador = $('#hora');
deslizador.min = HORA_MIN;
deslizador.max = HORA_MAX;
deslizador.value = POR_DEFECTO.hora;

function formatoHora(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  const h12 = hh > 12 ? hh - 12 : hh;
  return `${h12}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'pm' : 'am'}`;
}

let cielo = null;
function aplicarHora(h) {
  sol.aplicarHora(h);
  cielo?.aplicarSol(sol.estado);
  $('#hora-valor').textContent = formatoHora(h);
}
deslizador.addEventListener('input', () => aplicarHora(+deslizador.value));

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
  controles.update();
  hojas = hierba.actualizar(reloj.getElapsed(), camara, calidad.actual.hierba);
  composer.render(reloj.getDelta());
  calidad.medir(ahora);
  if (verFps) {
    etiquetaFps.textContent = `${calidad.fps.toFixed(0)} fps · ${calidad.actual.nombre} · ${(hojas / 1000).toFixed(0)}k hojas`;
  }
}

Promise.all([cieloListo, todoCargado]).then(([c]) => {
  cielo = c;
  aplicarHora(+deslizador.value);
  renderer.setAnimationLoop(cuadro);
  requestAnimationFrame(() => $('#carga').classList.add('oculta'));
});
aplicarHora(+deslizador.value);
