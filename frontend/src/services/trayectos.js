import { olvidarSesion, tokenSesion } from "./auth.js";

// Publicación de trayectos (E02-HU04). El backend toma el conductor de la sesión.

export async function obtenerDatosPublicacion() {
  return llamar("/api/trayectos/publicacion");
}

export async function publicarTrayecto(datos) {
  return llamar("/api/trayectos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

// Edición y cancelación de trayectos (E02-HU05). El backend toma el conductor de la sesión.

export async function obtenerMisTrayectos() {
  return llamar("/api/trayectos/mios");
}

export async function editarTrayecto(trayectoId, datos) {
  return llamar(`/api/trayectos/${encodeURIComponent(trayectoId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
}

// Con reservas confirmadas, el backend exige confirmar: true.
export async function cancelarTrayecto(trayectoId, { confirmar = false } = {}) {
  return llamar(`/api/trayectos/${encodeURIComponent(trayectoId)}/cancelacion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ confirmar }),
  });
}

// Búsqueda de trayectos (E03-HU06).

export async function obtenerSedes() {
  return llamar("/api/sedes");
}

// Todos los trayectos próximos con cupos; sede, fecha y hora son filtros opcionales.
export async function listarTrayectosDisponibles(filtros = {}) {
  const parametros = new URLSearchParams();
  for (const campo of ["sedeDestinoId", "fecha", "horaDesde"]) {
    if (filtros[campo]) parametros.set(campo, filtros[campo]);
  }
  const consulta = parametros.toString();
  return llamar(`/api/trayectos/disponibles${consulta ? `?${consulta}` : ""}`);
}

export async function buscarTrayectos({ sedeDestinoId, fecha, horaDesde }) {
  const parametros = new URLSearchParams({ sedeDestinoId, fecha, horaDesde });
  return llamar(`/api/trayectos?${parametros}`);
}

async function llamar(ruta, opciones = {}) {
  const respuesta = await fetch(ruta, {
    ...opciones,
    headers: { ...opciones.headers, Authorization: `Bearer ${tokenSesion() ?? ""}` },
  });
  const cuerpo = await leerJson(respuesta);
  if (respuesta.status === 401) olvidarSesion();
  return { ok: respuesta.ok, status: respuesta.status, ...cuerpo };
}

async function leerJson(respuesta) {
  try {
    return await respuesta.json();
  } catch {
    return {};
  }
}
