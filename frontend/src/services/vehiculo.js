export async function registrarVehiculo(datos) {
  const respuesta = await fetch("/api/vehiculos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const cuerpo = await leerJson(respuesta);
  return { ok: respuesta.ok, status: respuesta.status, ...cuerpo };
}

async function leerJson(respuesta) {
  try {
    return await respuesta.json();
  } catch {
    return {};
  }
}
