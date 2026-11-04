// Validación de los datos para publicar un trayecto (E02-HU04).
// No recibe el conductor: el usuario se obtiene siempre de la sesión.

export const CUPOS_MAXIMOS = 4;

// Colombia (America/Bogota) usa UTC-5 todo el año, sin horario de verano.
const DESFASE_COLOMBIA_HORAS = 5;
const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function cuposPermitidos(capacidadVehiculo) {
  if (!Number.isInteger(capacidadVehiculo) || capacidadVehiculo <= 0) {
    return 0;
  }
  return Math.min(capacidadVehiculo, CUPOS_MAXIMOS);
}

export function validarTrayecto(body, { cuposMaximos = CUPOS_MAXIMOS, ahora = new Date() } = {}) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    const mensaje = "El cuerpo de la solicitud debe incluir los datos del trayecto.";
    return rechazar(mensaje, [{ campo: "body", mensaje }]);
  }

  const errores = [];
  const origen = texto(body.origen);
  const fecha = texto(body.fecha);
  const hora = texto(body.hora);
  const { sedeDestinoId, cupos, aporteSugerido } = body;

  if (!origen) {
    errores.push({ campo: "origen", mensaje: "El origen es obligatorio." });
  }

  if (estaVacio(sedeDestinoId)) {
    errores.push({ campo: "sedeDestinoId", mensaje: "La sede de destino es obligatoria." });
  } else if (!Number.isInteger(sedeDestinoId) || sedeDestinoId <= 0) {
    errores.push({ campo: "sedeDestinoId", mensaje: "La sede de destino no es válida." });
  }

  const fechaValida = validarFecha(fecha, errores);
  const horaValida = validarHora(hora, errores);
  if (fechaValida && horaValida && !esFutura(fecha, hora, ahora)) {
    errores.push({
      campo: "fecha",
      mensaje: "La fecha y la hora de salida deben ser posteriores al momento actual.",
    });
  }

  if (estaVacio(cupos)) {
    errores.push({ campo: "cupos", mensaje: "Los cupos son obligatorios." });
  } else if (!Number.isInteger(cupos)) {
    errores.push({ campo: "cupos", mensaje: "Los cupos deben ser un número entero." });
  } else if (cupos <= 0) {
    errores.push({ campo: "cupos", mensaje: "Ingresa al menos 1 cupo." });
  } else if (cupos > cuposMaximos) {
    errores.push({ campo: "cupos", mensaje: `La capacidad máxima es ${cuposMaximos}.` });
  }

  if (estaVacio(aporteSugerido)) {
    errores.push({ campo: "aporteSugerido", mensaje: "El aporte sugerido es obligatorio." });
  } else if (!Number.isInteger(aporteSugerido) || aporteSugerido < 0) {
    errores.push({
      campo: "aporteSugerido",
      mensaje: "El aporte sugerido debe ser un número entero mayor o igual a 0.",
    });
  }

  if (errores.length > 0) {
    return rechazar(
      errores.length === 1 ? errores[0].mensaje : "Completa los campos obligatorios.",
      errores,
    );
  }

  return {
    ok: true,
    datos: { origen, sedeDestinoId, fecha, hora, cupos, aporteSugerido },
  };
}

function validarFecha(fecha, errores) {
  if (!fecha) {
    errores.push({ campo: "fecha", mensaje: "La fecha es obligatoria." });
    return false;
  }
  if (!esFechaIso(fecha)) {
    errores.push({ campo: "fecha", mensaje: "La fecha debe tener el formato AAAA-MM-DD." });
    return false;
  }
  return true;
}

function validarHora(hora, errores) {
  if (!hora) {
    errores.push({ campo: "hora", mensaje: "La hora es obligatoria." });
    return false;
  }
  if (!HORA.test(hora)) {
    errores.push({ campo: "hora", mensaje: "La hora debe tener el formato HH:MM (24 horas)." });
    return false;
  }
  return true;
}

function esFutura(fecha, hora, ahora) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [horas, minutos] = hora.split(":").map(Number);
  const salidaUtc = Date.UTC(anio, mes - 1, dia, horas + DESFASE_COLOMBIA_HORAS, minutos);
  return salidaUtc > ahora.getTime();
}

function esFechaIso(valor) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    return false;
  }
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
}

function estaVacio(valor) {
  return valor === undefined || valor === null || valor === "";
}

function texto(valor) {
  return typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
}

function rechazar(mensaje, errores) {
  return { ok: false, mensaje, errores };
}
