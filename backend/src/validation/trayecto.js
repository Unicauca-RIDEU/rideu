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

export const RUTA_PERFIL_VEHICULO = "/perfil/vehiculo";
const ESTADO_HABILITADO = "Habilitado";

// Un conductor puede publicar si su cuenta está «Habilitado», tiene vehículo
// registrado y su licencia vence hoy o después (fecha de Colombia).
export function verificarConductorHabilitado(perfil, { ahora = new Date() } = {}) {
  if (
    !perfil ||
    perfil.estado !== ESTADO_HABILITADO ||
    !perfil.vehiculo_id ||
    !perfil.licencia_vencimiento
  ) {
    return {
      ok: false,
      motivo: "sin_vehiculo_o_licencia",
      mensaje:
        "Registra tu vehículo y una licencia vigente para habilitar tu perfil de conductor y poder publicar.",
    };
  }
  if (perfil.licencia_vencimiento < fechaEnColombia(ahora)) {
    return {
      ok: false,
      motivo: "licencia_vencida",
      mensaje: "La licencia no está vigente. Actualízala para habilitar tu perfil de conductor.",
    };
  }
  return { ok: true };
}

export function fechaEnColombia(ahora = new Date()) {
  return momentoEnColombia(ahora).slice(0, 10);
}

// Fecha y hora actual de Colombia como 'AAAA-MM-DD HH:MM'.
export function momentoEnColombia(ahora = new Date()) {
  const enColombia = new Date(ahora.getTime() - DESFASE_COLOMBIA_HORAS * 60 * 60 * 1000);
  return enColombia.toISOString().slice(0, 16).replace("T", " ");
}

// Filtros de la búsqueda de trayectos (E03-HU06). Llegan como texto en la URL
// (?sedeDestinoId=1&fecha=AAAA-MM-DD&horaDesde=HH:MM) y los tres son obligatorios.
export function validarBusqueda(filtros) {
  const datos = filtros && typeof filtros === "object" ? filtros : {};
  const errores = [];
  const sede = texto(datos.sedeDestinoId);
  const fecha = texto(datos.fecha);
  const horaDesde = texto(datos.horaDesde);

  if (!sede) {
    errores.push({ campo: "sedeDestinoId", mensaje: "La sede de destino es obligatoria." });
  } else if (!/^[1-9]\d*$/.test(sede)) {
    errores.push({ campo: "sedeDestinoId", mensaje: "La sede de destino no es válida." });
  }
  validarFecha(fecha, errores);
  if (!horaDesde) {
    errores.push({ campo: "horaDesde", mensaje: "La hora es obligatoria." });
  } else if (!HORA.test(horaDesde)) {
    errores.push({ campo: "horaDesde", mensaje: "La hora debe tener el formato HH:MM (24 horas)." });
  }

  if (errores.length > 0) {
    return rechazar(
      errores.length === 1 ? errores[0].mensaje : "Selecciona la sede, la fecha y la hora.",
      errores,
    );
  }
  return { ok: true, datos: { sedeDestinoId: Number(sede), fecha, horaDesde } };
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
