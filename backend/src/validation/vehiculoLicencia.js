import { fechaEnColombia } from "./trayecto.js";

// El usuario no viaja en el cuerpo: el controlador lo toma de la sesión (req.usuario).
const PLACA = /^[A-Za-z]{3} ?\d{3}$/;
const MENSAJE_PLACA = "La placa debe tener tres letras y tres números.";
const MENSAJE_OBLIGATORIO = "Este campo es obligatorio.";
const MENSAJE_LICENCIA_VENCIDA = "La licencia de conducción no está vigente.";

export function validarVehiculoYLicencia(body, { ahora = new Date() } = {}) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return rechazar("El cuerpo de la solicitud debe incluir el vehículo y la licencia.", [
      {
        campo: "body",
        mensaje: "El cuerpo de la solicitud debe incluir el vehículo y la licencia.",
      },
    ]);
  }

  const errores = [];
  const placaEntrada = texto(body.placa);
  const marca = texto(body.marca);
  const modelo = texto(body.modelo);
  const color = texto(body.color);
  const categoriaLicencia = texto(body.categoriaLicencia);
  const fechaVencimientoLicencia = texto(body.fechaVencimientoLicencia);

  if (!placaEntrada) {
    errores.push({ campo: "placa", mensaje: MENSAJE_OBLIGATORIO });
  } else if (!PLACA.test(placaEntrada)) {
    errores.push({ campo: "placa", mensaje: MENSAJE_PLACA });
  }
  if (!marca) {
    errores.push({ campo: "marca", mensaje: MENSAJE_OBLIGATORIO });
  }
  if (!modelo) {
    errores.push({ campo: "modelo", mensaje: MENSAJE_OBLIGATORIO });
  }
  if (!color) {
    errores.push({ campo: "color", mensaje: MENSAJE_OBLIGATORIO });
  }
  if (!categoriaLicencia) {
    errores.push({
      campo: "categoriaLicencia",
      mensaje: MENSAJE_OBLIGATORIO,
    });
  }
  if (!fechaVencimientoLicencia) {
    errores.push({
      campo: "fechaVencimientoLicencia",
      mensaje: MENSAJE_OBLIGATORIO,
    });
  } else if (!esFechaIso(fechaVencimientoLicencia)) {
    errores.push({
      campo: "fechaVencimientoLicencia",
      mensaje: "La fecha de vencimiento debe tener el formato AAAA-MM-DD.",
    });
  } else if (fechaVencimientoLicencia < fechaEnColombia(ahora)) {
    errores.push({
      campo: "fechaVencimientoLicencia",
      mensaje: MENSAJE_LICENCIA_VENCIDA,
    });
  }

  const capacidadPasajeros = body.capacidadPasajeros;
  if (capacidadPasajeros === undefined || capacidadPasajeros === null || capacidadPasajeros === "") {
    errores.push({
      campo: "capacidadPasajeros",
      mensaje: MENSAJE_OBLIGATORIO,
    });
  } else if (!Number.isInteger(capacidadPasajeros) || capacidadPasajeros <= 0) {
    errores.push({
      campo: "capacidadPasajeros",
      mensaje: "La capacidad de pasajeros debe ser un entero mayor que 0.",
    });
  }

  if (errores.length > 0) {
    return rechazar(errores.length === 1 ? errores[0].mensaje : "Completa los campos obligatorios.", errores);
  }

  return {
    ok: true,
    datos: {
      placa: normalizarPlaca(placaEntrada),
      marca,
      modelo,
      color,
      capacidadPasajeros,
      categoriaLicencia,
      fechaVencimientoLicencia,
    },
  };
}

function texto(valor) {
  return typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
}

// Formato único «ABC 123»: así la restricción de placa única detecta la misma placa
// aunque se escriba en minúsculas o sin espacio.
function normalizarPlaca(placa) {
  const compacta = placa.replace(" ", "").toUpperCase();
  return `${compacta.slice(0, 3)} ${compacta.slice(3)}`;
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

function rechazar(mensaje, errores) {
  return { ok: false, mensaje, errores };
}
