// Sustituto de SALIDA (src/config/database.js) para las pruebas con la base simulada:
// los modelos lo usan para declarar los binds de salida de RETURNING ... INTO.
export const SALIDA = {
  texto: "salida:texto",
  numero: "salida:numero",
  fecha: "salida:fecha",
  instante: "salida:instante",
};
