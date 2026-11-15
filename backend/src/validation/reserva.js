// Validación de los identificadores que llegan en la URL de las reservas (E04-HU07).
// Los identificadores son UUID que genera la aplicación.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validarIdentificador(valor, { campo, mensaje }) {
  const id = typeof valor === "string" ? valor.trim().toLowerCase() : "";
  if (!UUID.test(id)) {
    return { ok: false, mensaje, errores: [{ campo, mensaje }] };
  }
  return { ok: true, datos: { id } };
}

export function validarIdTrayecto(valor) {
  return validarIdentificador(valor, { campo: "trayectoId", mensaje: "El trayecto no es válido." });
}
