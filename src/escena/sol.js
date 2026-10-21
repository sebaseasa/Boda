import * as THREE from 'three';
import { getPosition } from 'suncalc';
import { LUGAR, FECHA, RUMBO_FONDO } from '../config.js';

const GRAD = Math.PI / 180;

// Hora local decimal (15.5 = 3:30 pm) → instante real en Quito.
export function fechaLocal(hora) {
  const h = Math.floor(hora);
  const m = Math.round((hora - h) * 60);
  return new Date(Date.UTC(FECHA.anio, FECHA.mes - 1, FECHA.dia, h - LUGAR.utcOffsetHoras, m));
}

// Rumbo en grados (0 = norte, horario) y altura en grados → dirección en el mundo.
export function direccionDesdeRumbo(rumbo, altura, destino = new THREE.Vector3()) {
  const d = (rumbo - RUMBO_FONDO) * GRAD;
  const a = altura * GRAD;
  return destino.set(Math.cos(a) * Math.sin(d), Math.sin(a), -Math.cos(a) * Math.cos(d));
}

export function posicionSol(hora) {
  // suncalc 2.x devuelve grados: altitude sobre el horizonte, azimuth desde el norte en sentido horario.
  const p = getPosition(fechaLocal(hora), LUGAR.latitud, LUGAR.longitud);
  return { altura: p.altitude, rumbo: p.azimuth, direccion: direccionDesdeRumbo(p.azimuth, p.altitude) };
}

const COLOR_ALTO = new THREE.Color(0xfff3e2);
const COLOR_BAJO = new THREE.Color(0xff9a52);

export function crearSol(escena, calidad) {
  const luz = new THREE.DirectionalLight(0xffffff, 3);
  luz.castShadow = true;
  luz.shadow.mapSize.setScalar(calidad.sombra);
  luz.shadow.radius = 4;
  luz.shadow.blurSamples = 12;
  luz.shadow.bias = -0.0004;
  luz.shadow.normalBias = 0.06;
  const cam = luz.shadow.camera;
  cam.left = cam.bottom = -32;
  cam.right = cam.top = 32;
  cam.near = 1;
  cam.far = 160;
  luz.target.position.set(0, 0, -8);
  escena.add(luz, luz.target);

  const estado = { altura: 0, rumbo: 0, direccion: new THREE.Vector3(0, 1, 0) };

  function aplicarHora(hora) {
    Object.assign(estado, posicionSol(hora));
    luz.position.copy(luz.target.position).addScaledVector(estado.direccion, 80);
    // Cerca del horizonte la luz se vuelve cálida y se apaga al ponerse el sol.
    const t = THREE.MathUtils.smoothstep(estado.altura, -1, 25);
    luz.color.copy(COLOR_BAJO).lerp(COLOR_ALTO, t);
    luz.intensity = 3.2 * THREE.MathUtils.smoothstep(estado.altura, -2, 8) * (0.55 + 0.45 * t);
    luz.visible = luz.intensity > 0.001;
  }

  function ajustarSombra(tamano) {
    if (luz.shadow.mapSize.x === tamano) return;
    luz.shadow.mapSize.setScalar(tamano);
    luz.shadow.map?.dispose();
    luz.shadow.map = null;
  }

  return { luz, estado, aplicarHora, ajustarSombra };
}
