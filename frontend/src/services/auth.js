const verificaciones = new Map();

export async function registrarUsuario(datos) {
  const respuesta = await fetch("/api/auth/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datos),
  });
  const cuerpo = await leerJson(respuesta);
  return { ok: respuesta.ok, status: respuesta.status, ...cuerpo };
}

export function verificarCorreo(token) {
  if (!verificaciones.has(token)) {
    const promesa = fetch("/api/auth/verificacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (respuesta) => {
        const cuerpo = await leerJson(respuesta);
        return { ok: respuesta.ok, status: respuesta.status, ...cuerpo };
      })
      .catch((error) => {
        verificaciones.delete(token);
        throw error;
      });
    verificaciones.set(token, promesa);
  }
  return verificaciones.get(token);
}

async function leerJson(respuesta) {
  try {
    return await respuesta.json();
  } catch {
    return {};
  }
}
