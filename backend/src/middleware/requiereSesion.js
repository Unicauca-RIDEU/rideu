import { buscarUsuarioPorSesion } from "../models/sesion.js";

export async function requiereSesion(req, res, next) {
  const [tipo, token] = (req.get("Authorization") ?? "").split(" ");
  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ mensaje: "Debes iniciar sesión." });
  }

  try {
    const usuario = await buscarUsuarioPorSesion(token);
    if (!usuario) {
      return res.status(401).json({ mensaje: "Tu sesión no es válida o expiró." });
    }
    req.usuario = usuario;
    return next();
  } catch (error) {
    console.error("Error al validar la sesión:", error);
    return res.status(500).json({ mensaje: "No se pudo validar la sesión." });
  }
}
