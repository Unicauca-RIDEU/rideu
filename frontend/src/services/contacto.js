import { olvidarSesion, tokenSesion } from "./auth.js";

// Contacto por WhatsApp (E05-HU10 y E05-HU11). El backend toma el usuario de la sesión.

export async function obtenerContactoConductor(reservaId) {
  return llamar(`/api/reservas/${encodeURIComponent(reservaId)}/contacto-conductor`);
}

export async function obtenerContactoPasajeros(trayectoId) {
  return llamar(`/api/trayectos/${encodeURIComponent(trayectoId)}/pasajeros`);
}

async function llamar(ruta) {
  const respuesta = await fetch(ruta, {
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
