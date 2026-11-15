import { buscarDetalleTrayecto, confirmarReserva } from "../models/reserva.js";
import { validarIdTrayecto } from "../validation/reserva.js";
import { momentoEnColombia } from "../validation/trayecto.js";

// Reserva de cupos (E04-HU07).
// El pasajero es siempre el usuario de la sesión (req.usuario), nunca un dato del cuerpo.

export const MENSAJE_CUPOS_AGOTADOS = "Cupos agotados";
const MENSAJE_NO_EXISTE = "El trayecto no existe.";

// Motivo por el que no se pudo reservar → estado HTTP, código y mensaje.
const RECHAZOS = {
  trayecto_inexistente: { status: 404, codigo: "TRAYECTO_INEXISTENTE", mensaje: MENSAJE_NO_EXISTE },
  trayecto_propio: {
    status: 403,
    codigo: "TRAYECTO_PROPIO",
    mensaje: "No puedes reservar un cupo en tu propio trayecto.",
  },
  trayecto_no_disponible: {
    status: 409,
    codigo: "TRAYECTO_NO_DISPONIBLE",
    mensaje: "Este trayecto ya no admite reservas.",
  },
  reserva_duplicada: {
    status: 409,
    codigo: "RESERVA_DUPLICADA",
    mensaje: "Ya tienes una reserva confirmada en este trayecto.",
  },
  sin_cupos: { status: 409, codigo: "CUPOS_AGOTADOS", mensaje: MENSAJE_CUPOS_AGOTADOS },
};

// Lo que la pantalla de reserva necesita del trayecto. No incluye el WhatsApp del conductor.
function presentarTrayecto(detalle, usuarioId) {
  return {
    id: detalle.id,
    fecha: detalle.fecha,
    hora: detalle.hora,
    origen: detalle.origen,
    sede_destino_id: detalle.sede_destino_id,
    sede_destino: detalle.sede_destino,
    cupos: detalle.cupos,
    cupos_disponibles: detalle.cupos_disponibles,
    cupos_reservados: detalle.cupos_reservados,
    aporte_sugerido: detalle.aporte_sugerido,
    estado: detalle.estado,
    vigente: detalle.vigente === 1,
    conductor_nombre: detalle.conductor_nombre,
    vehiculo: {
      marca: detalle.vehiculo_marca,
      modelo: detalle.vehiculo_modelo,
      color: detalle.vehiculo_color,
      placa: detalle.vehiculo_placa,
      capacidad_pasajeros: detalle.vehiculo_capacidad,
    },
    es_conductor: detalle.conductor_id === usuarioId,
    reserva_id: detalle.reserva_id ?? null,
  };
}

async function consultarTrayecto(trayectoId, usuarioId) {
  const detalle = await buscarDetalleTrayecto({
    trayectoId,
    usuarioId,
    ahoraColombia: momentoEnColombia(),
  });
  return detalle ? presentarTrayecto(detalle, usuarioId) : null;
}

// GET /api/trayectos/:id — detalle del trayecto para la pantalla /trayectos/reservar.
export async function detalleTrayecto(req, res) {
  const validacion = validarIdTrayecto(req.params.id);
  if (!validacion.ok) {
    return res.status(400).json({ mensaje: validacion.mensaje, errores: validacion.errores });
  }

  try {
    const trayecto = await consultarTrayecto(validacion.datos.id, req.usuario.id);
    if (!trayecto) {
      return res.status(404).json({ mensaje: MENSAJE_NO_EXISTE });
    }
    return res.status(200).json({ trayecto });
  } catch (error) {
    console.error("Error al consultar el trayecto:", error);
    return res.status(500).json({ mensaje: "No se pudo cargar el trayecto." });
  }
}

// POST /api/trayectos/:id/reservas — confirma la reserva de un cupo para el usuario de la sesión.
// Si no se puede reservar, la respuesta incluye el trayecto con su disponibilidad actual.
export async function reservarCupo(req, res) {
  const validacion = validarIdTrayecto(req.params.id);
  if (!validacion.ok) {
    return res.status(400).json({ mensaje: validacion.mensaje, errores: validacion.errores });
  }
  const trayectoId = validacion.datos.id;

  try {
    const resultado = await confirmarReserva({
      trayectoId,
      pasajeroId: req.usuario.id,
      ahoraColombia: momentoEnColombia(),
    });
    const trayecto = await consultarTrayecto(trayectoId, req.usuario.id);

    if (!resultado.ok) {
      const rechazo = RECHAZOS[resultado.motivo];
      return res.status(rechazo.status).json({
        codigo: rechazo.codigo,
        mensaje: rechazo.mensaje,
        trayecto,
      });
    }

    return res.status(201).json({
      mensaje: "Reserva confirmada. Tu cupo quedó asegurado.",
      reserva: resultado.reserva,
      trayecto,
    });
  } catch (error) {
    console.error("Error al reservar el cupo:", error);
    return res.status(500).json({ mensaje: "No se pudo confirmar la reserva." });
  }
}
