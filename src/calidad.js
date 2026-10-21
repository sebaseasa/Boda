// Calidad automática: arranca según el dispositivo y baja un nivel si el promedio cae de 30 fps.

const NIVELES = [
  { nombre: 'baja', pixeles: 1, sombra: 1024, hierba: 0.25, bloom: false },
  { nombre: 'media', pixeles: 1.35, sombra: 1024, hierba: 0.5, bloom: true },
  { nombre: 'alta', pixeles: 2, sombra: 2048, hierba: 1, bloom: true },
];

const FPS_MINIMO = 30;
const VENTANA_MS = 2500;

export function crearCalidad() {
  const esMovil = matchMedia('(pointer: coarse)').matches;
  let indice = esMovil ? 1 : 2;
  const forzado = new URLSearchParams(location.search).get('calidad');
  const fijo = NIVELES.findIndex((n) => n.nombre === forzado);
  if (fijo >= 0) indice = fijo;

  let alCambiar = () => {};
  let cuadros = 0;
  let inicio = performance.now();
  let fps = 0;
  let calentando = true;

  function medir(ahora) {
    cuadros++;
    const transcurrido = ahora - inicio;
    if (transcurrido < VENTANA_MS) return;
    fps = (cuadros * 1000) / transcurrido;
    cuadros = 0;
    inicio = ahora;
    // La primera ventana incluye la compilación de shaders: no cuenta.
    if (calentando) {
      calentando = false;
      return;
    }
    if (fijo < 0 && fps < FPS_MINIMO && indice > 0) {
      indice--;
      alCambiar(NIVELES[indice]);
    }
  }

  return {
    get actual() {
      return NIVELES[indice];
    },
    get fps() {
      return fps;
    },
    medir,
    alCambiar(fn) {
      alCambiar = fn;
    },
  };
}
