const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validarVehiculoYLicencia(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return rechazar("El cuerpo de la solicitud debe incluir el vehículo y la licencia.", [
      {
        campo: "body",
        mensaje: "El cuerpo de la solicitud debe incluir el vehículo y la licencia.",
      },
    ]);
  }

  const errores = [];
  const usuarioId = texto(body.usuarioId);
  const placa = texto(body.placa);
  const marca = texto(body.marca);
  const modelo = texto(body.modelo);
  const color = texto(body.color);
  const categoriaLicencia = texto(body.categoriaLicencia);
  const fechaVencimientoLicencia = texto(body.fechaVencimientoLicencia);

  if (!usuarioId) {
    errores.push({ campo: "usuarioId", mensaje: "El usuario es obligatorio." });
  } else if (!UUID.test(usuarioId)) {
    errores.push({ campo: "usuarioId", mensaje: "El usuario no es válido." });
  }

  if (!placa) {
    errores.push({ campo: "placa", mensaje: "La placa es obligatoria." });
  }
  if (!marca) {
    errores.push({ campo: "marca", mensaje: "La marca es obligatoria." });
  }
  if (!modelo) {
    errores.push({ campo: "modelo", mensaje: "El modelo es obligatorio." });
  }
  if (!color) {
    errores.push({ campo: "color", mensaje: "El color es obligatorio." });
  }
  if (!categoriaLicencia) {
    errores.push({
      campo: "categoriaLicencia",
      mensaje: "La categoría de la licencia es obligatoria.",
    });
  }
  if (!fechaVencimientoLicencia) {
    errores.push({
      campo: "fechaVencimientoLicencia",
      mensaje: "La fecha de vencimiento de la licencia es obligatoria.",
    });
  } else if (!esFechaIso(fechaVencimientoLicencia)) {
    errores.push({
      campo: "fechaVencimientoLicencia",
      mensaje: "La fecha de vencimiento debe tener el formato AAAA-MM-DD.",
    });
  } else if (esAnteriorAHoy(fechaVencimientoLicencia)) {
    errores.push({
      campo: "fechaVencimientoLicencia",
      mensaje: "La licencia no está vigente",
    });
  }

  const capacidadPasajeros = body.capacidadPasajeros;
  if (capacidadPasajeros === undefined || capacidadPasajeros === null || capacidadPasajeros === "") {
    errores.push({
      campo: "capacidadPasajeros",
      mensaje: "La capacidad de pasajeros es obligatoria.",
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
      usuarioId,
      placa,
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

function esAnteriorAHoy(iso) {
  const hoy = new Date();
  const actual = [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0"),
  ].join("-");
  return iso < actual;
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
