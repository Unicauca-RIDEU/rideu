import { guardarVehiculoYLicencia } from "../models/vehiculo.js";
import { ESTADO_HABILITADO, ESTADO_SIN_VERIFICAR } from "../models/usuario.js";
import { validarVehiculoYLicencia } from "../validation/vehiculoLicencia.js";

export async function registrarVehiculoYLicencia(req, res) {
  const validacion = validarVehiculoYLicencia(req.body);
  if (!validacion.ok) {
    return res.status(400).json({
      mensaje: validacion.mensaje,
      errores: validacion.errores,
    });
  }

  try {
    const resultado = await guardarVehiculoYLicencia(validacion.datos);
    if (!resultado.ok && resultado.motivo === "usuario_inexistente") {
      return res.status(404).json({ mensaje: "No existe una cuenta con ese usuario." });
    }
    if (!resultado.ok && resultado.motivo === "no_verificada") {
      return res.status(403).json({ mensaje: mensajeCuentaNoVerificada(resultado.estado) });
    }

    return res.status(201).json({
      mensaje: "Vehículo y licencia registrados. Tu cuenta quedó en estado «Habilitado».",
      usuario: resultado.usuario,
      vehiculo: resultado.vehiculo,
      licencia: resultado.licencia,
    });
  } catch (error) {
    if (error.code === "23505" && error.constraint === "vehiculos_placa_unica") {
      return res.status(409).json({ mensaje: "Ya existe un vehículo con esta placa." });
    }
    console.error("Error al registrar vehículo y licencia:", error);
    return res.status(500).json({ mensaje: "No se pudo registrar el vehículo y la licencia." });
  }
}

function mensajeCuentaNoVerificada(estado) {
  if (estado === ESTADO_SIN_VERIFICAR) {
    return "Debes verificar tu cuenta antes de registrar el vehículo y la licencia.";
  }
  if (estado === ESTADO_HABILITADO) {
    return "Tu cuenta ya está habilitada. Este registro solo aplica a cuentas en estado «Verificada».";
  }
  return "Solo una cuenta en estado «Verificada» puede registrar el vehículo y la licencia.";
}
