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
