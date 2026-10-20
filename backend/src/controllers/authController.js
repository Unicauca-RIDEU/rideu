import bcrypt from "bcryptjs";
import { crearTokenVerificacion, crearUsuario, buscarPorCorreo } from "../models/usuario.js";
import { validarRegistro } from "../validation/registro.js";

const RONDAS_BCRYPT = 10;

export async function registrar(req, res) {
  const validacion = validarRegistro(req.body);
  if (!validacion.ok) {
    return res.status(400).json({
      mensaje: validacion.mensaje,
      errores: validacion.errores,
    });
  }

  try {
    const { nombre, correo, contrasena, whatsapp } = validacion.datos;
    const existente = await buscarPorCorreo(correo);
    if (existente) {
      return res.status(409).json({
        mensaje: "Ya existe una cuenta con este correo institucional.",
      });
    }

    const contrasenaHash = await bcrypt.hash(contrasena, RONDAS_BCRYPT);
    const { tokenHash, expira } = crearTokenVerificacion();
    const usuario = await crearUsuario({
      nombre,
      correo,
      contrasenaHash,
      whatsapp,
      tokenHash,
      tokenExpira: expira,
    });

    return res.status(201).json({
      mensaje: "Cuenta creada en estado «Sin verificar».",
      usuario,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        mensaje: "Ya existe una cuenta con este correo institucional.",
      });
    }
    console.error("Error al registrar usuario:", error);
    return res.status(500).json({ mensaje: "No se pudo crear la cuenta." });
  }
}
