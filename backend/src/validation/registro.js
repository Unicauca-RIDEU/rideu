const CORREO_INSTITUCIONAL = /^[^\s@]+@unicauca\.edu\.co$/;
const MENSAJE_DOMINIO = "Solo se permite el correo institucional @unicauca.edu.co.";

export function validarRegistro(body) {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return rechazar("El cuerpo de la solicitud debe incluir los datos del registro.", [
      { campo: "body", mensaje: "El cuerpo de la solicitud debe incluir los datos del registro." },
    ]);
  }

  const errores = [];
  const nombre = texto(body.nombre);
  const correo = texto(body.correo).toLowerCase();
  const contrasena = typeof body.contrasena === "string" ? body.contrasena : "";
  const whatsappEntrada = texto(body.whatsapp);

  if (!nombre) {
    errores.push({ campo: "nombre", mensaje: "El nombre completo es obligatorio." });
  } else if (nombre.length < 3 || nombre.length > 120) {
    errores.push({
      campo: "nombre",
      mensaje: "El nombre completo debe tener entre 3 y 120 caracteres.",
    });
  }

  if (!correo) {
    errores.push({ campo: "correo", mensaje: "El correo institucional es obligatorio." });
  } else if (!CORREO_INSTITUCIONAL.test(correo)) {
    errores.push({ campo: "correo", mensaje: MENSAJE_DOMINIO });
  }

  if (!contrasena) {
    errores.push({ campo: "contrasena", mensaje: "La contraseña es obligatoria." });
  } else if (contrasena.length < 8) {
    errores.push({
      campo: "contrasena",
      mensaje: "La contraseña debe tener al menos 8 caracteres.",
    });
  } else if (contrasena.length > 72) {
    errores.push({
      campo: "contrasena",
      mensaje: "La contraseña no puede superar 72 caracteres.",
    });
  }

  const whatsapp = normalizarWhatsapp(whatsappEntrada);
  if (!whatsappEntrada) {
    errores.push({ campo: "whatsapp", mensaje: "El número de WhatsApp es obligatorio." });
  } else if (!whatsapp) {
    errores.push({
      campo: "whatsapp",
      mensaje: "Ingresa un número de celular de Colombia, de 10 dígitos y que empiece por 3.",
    });
  }

  if (errores.length > 0) {
    return rechazar(resumen(errores), errores);
  }

  return {
    ok: true,
    datos: { nombre, correo, contrasena, whatsapp },
  };
}

function texto(valor) {
  return typeof valor === "string" ? valor.trim().replace(/\s+/g, " ") : "";
}

function normalizarWhatsapp(valor) {
  const digitos = valor.replace(/\D/g, "");
  const local = digitos.startsWith("57") && digitos.length === 12 ? digitos.slice(2) : digitos;
  if (!/^3\d{9}$/.test(local)) {
    return "";
  }
  return `+57${local}`;
}

function resumen(errores) {
  if (errores.length === 1) {
    return errores[0].mensaje;
  }
  const dominio = errores.find((error) => error.mensaje === MENSAJE_DOMINIO);
  if (dominio) {
    return `${MENSAJE_DOMINIO} Completa también los demás campos obligatorios.`;
  }
  return "Completa los campos obligatorios.";
}

function rechazar(mensaje, errores) {
  return { ok: false, mensaje, errores };
}
