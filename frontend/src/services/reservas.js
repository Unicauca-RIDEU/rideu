import { olvidarSesion, tokenSesion } from "./auth.js";

// Reserva de cupos (E04-HU07). El backend toma el pasajero de la sesión.

export async function obtenerTrayecto(trayectoId) {
  return llamar(`/api/trayectos/${encodeURIComponent(trayectoId)}`);
}

export async function reservarCupo(trayectoId) {
  return llamar(`/api/trayectos/${encodeURIComponent(trayectoId)}/reservas`, { method: "POST" });
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
