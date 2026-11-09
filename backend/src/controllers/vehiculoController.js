import { buscarPerfilConductor } from "../models/trayecto.js";
import { guardarVehiculoYLicencia } from "../models/vehiculo.js";
import { ESTADO_SIN_VERIFICAR } from "../models/usuario.js";
import { validarVehiculoYLicencia } from "../validation/vehiculoLicencia.js";

// Registro de vehículo y licencia (E02-HU03). Una cuenta «Habilitado» actualiza los que ya tiene.
// El conductor es siempre el usuario de la sesión (req.usuario), nunca un dato del cuerpo.

export async function registrarVehiculoYLicencia(req, res) {
  const validacion = validarVehiculoYLicencia(req.body);
  if (!validacion.ok) {
    return res.status(400).json({
      mensaje: validacion.mensaje,
      errores: validacion.errores,
    });
  }

  try {
    const resultado = await guardarVehiculoYLicencia({
      ...validacion.datos,
      usuarioId: req.usuario.id,
    });
    if (!resultado.ok && resultado.motivo === "usuario_inexistente") {
      return res.status(404).json({ mensaje: "No existe una cuenta con ese usuario." });
    }
    if (!resultado.ok && resultado.motivo === "no_verificada") {
      return res.status(403).json({ mensaje: mensajeCuentaNoVerificada(resultado.estado) });
    }
    if (!resultado.ok && resultado.motivo === "capacidad_insuficiente") {
      const mensaje = `Tienes un trayecto publicado con ${resultado.cuposPublicados} cupos. La capacidad del vehículo no puede ser menor.`;
      return res.status(409).json({
        mensaje,
        errores: [{ campo: "capacidadPasajeros", mensaje }],
      });
    }
    if (resultado.actualizado) {
      return res.status(200).json({
        mensaje: "Vehículo y licencia actualizados. Tu cuenta sigue en estado «Habilitado».",
        usuario: resultado.usuario,
        vehiculo: resultado.vehiculo,
        licencia: resultado.licencia,
      });
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

// Vehículo y licencia del usuario de la sesión, para mostrarlos en /perfil/vehiculo.
export async function obtenerVehiculoYLicencia(req, res) {
  try {
    const perfil = await buscarPerfilConductor(req.usuario.id);
    return res.status(200).json({
      vehiculo: perfil?.vehiculo_id
        ? {
            placa: perfil.placa,
            marca: perfil.marca,
            modelo: perfil.modelo,
            color: perfil.color,
            capacidadPasajeros: perfil.capacidad_pasajeros,
          }
        : null,
      licencia: perfil?.licencia_vencimiento
        ? { categoria: perfil.licencia_categoria, fechaVencimiento: perfil.licencia_vencimiento }
        : null,
    });
  } catch (error) {
    console.error("Error al consultar vehículo y licencia:", error);
    return res.status(500).json({ mensaje: "No se pudieron cargar el vehículo y la licencia." });
  }
}

function mensajeCuentaNoVerificada(estado) {
  if (estado === ESTADO_SIN_VERIFICAR) {
    return "Debes verificar tu cuenta antes de registrar el vehículo y la licencia.";
  }
  return "Solo una cuenta en estado «Verificada» puede registrar el vehículo y la licencia.";
}
