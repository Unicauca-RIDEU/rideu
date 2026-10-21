const CLAVE_SESION = "rideu.sesion";
const verificaciones = new Map();

export async function iniciarSesion(credenciales) {
  const respuesta = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credenciales),
  });
  const cuerpo = await leerJson(respuesta);
  if (respuesta.ok && cuerpo.token) {
    localStorage.setItem(CLAVE_SESION, cuerpo.token);
  }
  return { ok: respuesta.ok, status: respuesta.status, ...cuerpo };
}

export function tokenSesion() {
  return localStorage.getItem(CLAVE_SESION);
}

export function olvidarSesion() {
  localStorage.removeItem(CLAVE_SESION);
}

export async function obtenerSesion() {
  const token = tokenSesion();
  if (!token) return { ok: false, status: 401 };
  const respuesta = await fetch("/api/auth/sesion", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const cuerpo = await leerJson(respuesta);
  if (respuesta.status === 401) olvidarSesion();
  return { ok: respuesta.ok, status: respuesta.status, ...cuerpo };
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
