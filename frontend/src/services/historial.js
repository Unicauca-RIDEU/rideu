import { olvidarSesion, tokenSesion } from "./auth.js";

// Historial de trayectos y reservas (E04-HU09). El backend toma el usuario de la sesión.

export async function obtenerHistorial() {
  const respuesta = await fetch("/api/historial", {
    headers: { Authorization: `Bearer ${tokenSesion() ?? ""}` },
  });
  let cuerpo = {};
  try {
    cuerpo = await respuesta.json();
  } catch {
    cuerpo = {};
  }
  if (respuesta.status === 401) olvidarSesion();
  return { ok: respuesta.ok, status: respuesta.status, ...cuerpo };
}
