import bcrypt from "bcryptjs";
import {
  crearTokenVerificacion,
  crearUsuario,
  buscarPorCorreo,
  eliminarUsuario,
  verificarCuenta,
} from "../models/usuario.js";
import { enviarCorreoVerificacion } from "../services/correo.js";
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
    const { token, tokenHash, expira } = crearTokenVerificacion();
    const usuario = await crearUsuario({
      nombre,
      correo,
      contrasenaHash,
      whatsapp,
      tokenHash,
      tokenExpira: expira,
    });

    try {
      await enviarCorreoVerificacion({ nombre, correo, token });
    } catch (error) {
      await eliminarUsuario(usuario.id).catch((borrado) => {
        console.error("No se pudo deshacer el registro tras fallar el correo:", borrado);
      });
      console.error("Error al enviar el correo de verificación:", error);
      return res.status(500).json({
        mensaje: "No se pudo enviar el correo de verificación. Inténtalo de nuevo.",
      });
    }

    return res.status(201).json({
      mensaje: "Cuenta creada en estado «Sin verificar». Enviamos el enlace de verificación a tu correo institucional.",
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

export async function verificar(req, res) {
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!token) {
    return res.status(400).json({ mensaje: "El token de verificación es obligatorio." });
  }

  try {
    const resultado = await verificarCuenta(token);
    if (resultado.ok) {
      return res.status(200).json({
        mensaje: "Tu cuenta quedó en estado «Verificada».",
        usuario: resultado.usuario,
      });
    }
    if (resultado.motivo === "usado") {
      return res.status(409).json({ mensaje: "Este enlace de verificación ya fue usado." });
    }
    if (resultado.motivo === "expirado") {
      return res.status(400).json({ mensaje: "El enlace de verificación expiró." });
    }
    return res.status(400).json({ mensaje: "El enlace de verificación no es válido." });
  } catch (error) {
    console.error("Error al verificar la cuenta:", error);
    return res.status(500).json({ mensaje: "No se pudo verificar la cuenta." });
  }
}
