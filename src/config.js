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

export const POR_DEFECTO = {
  hora: 17.83, // 5:50 pm, beso de casados al atardecer
};

export const HORA_MIN = 15;
export const HORA_MAX = 21;
