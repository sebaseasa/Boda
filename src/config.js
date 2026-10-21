// Datos fijos del lugar y opciones por defecto.

export const LUGAR = {
  nombre: 'Quito',
  latitud: -0.1807,
  longitud: -78.4678,
  // Ecuador no usa horario de verano: siempre UTC-5.
  utcOffsetHoras: -5,
};

export const FECHA = { anio: 2027, mes: 2, dia: 20 };

// Hacia qué rumbo (grados desde el norte, en sentido horario) mira el eje -Z del mundo,
// es decir, desde los invitados hacia el altar. 270 = oeste: el sol baja detrás del altar.
// Ajustar cuando se conozca la orientación real del jardín.
export const RUMBO_FONDO = 270;

// Distribución del jardín (metros). Coincide con el prototipo de referencia.
export const DISTRIBUCION = {
  arbol: { x: -4, z: -19.5 },
  palmera: { x: 5.5, z: -18.8 },
  altarZ: -14,
};

// Ceremonia: el arco va entre el jacarandá y la palmera y los invitados lo miran (hacia -Z).
export const CEREMONIA = {
  arco: { x: 0.75, z: -18.6 },
  invitados: 50,
  sillasPorLado: 5, // por fila, a cada lado del pasillo
  primeraFilaZ: -14.3,
  separacionFilas: 1.0,
  separacionSillas: 0.55,
  pasillo: { ancho: 1.5, desdeZ: -15.8, hastaZ: -2.5 },
};

export const ARCOS = [
  ['jardin', 'Arco de jardín'],
  ['circular', 'Circular'],
  ['hexagonal', 'Hexagonal'],
  ['madera', 'Madera con telas'],
  ['columnas', 'Columnas de flores'],
];

export const POR_DEFECTO = {
  hora: 17.83, // 5:50 pm, beso de casados al atardecer
  arco: 'jardin',
};

export const HORA_MIN = 12; // la boda empieza al mediodía
export const HORA_MAX = 21;
