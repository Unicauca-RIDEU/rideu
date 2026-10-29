const CLAVE_USUARIO = "rideu.usuario";
const verificaciones = new Map();

export function usuarioLocal() {
  try {
    const valor = localStorage.getItem(CLAVE_USUARIO);
    return valor ? JSON.parse(valor) : null;
  } catch {
    return null;
  }
}

export function guardarUsuarioLocal(usuario) {
  if (!usuario?.id) return;
  localStorage.setItem(
    CLAVE_USUARIO,
    JSON.stringify({
      id: usuario.id,
      nombre: usuario.nombre ?? "",
      correo: usuario.correo ?? "",
      estado: usuario.estado ?? "",
    }),
  );
}

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
        const resultado = { ok: respuesta.ok, status: respuesta.status, ...cuerpo };
        if (resultado.ok) guardarUsuarioLocal(resultado.usuario);
        return resultado;
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
