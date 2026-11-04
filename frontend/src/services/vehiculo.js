import { olvidarSesion, tokenSesion } from "./auth.js";

// Registro de vehículo y licencia (E02-HU03). El backend toma el conductor de la sesión.

export async function registrarVehiculo(datos) {
  const respuesta = await fetch("/api/vehiculos", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenSesion() ?? ""}`,
    },
    body: JSON.stringify(datos),
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
