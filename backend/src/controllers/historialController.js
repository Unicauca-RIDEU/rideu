import { listarTrayectosDeConductor } from "../models/trayecto.js";
import { momentoEnColombia } from "../validation/trayecto.js";

export const MENSAJE_SIN_REGISTROS = "Aún no tienes registros en tu historial.";

// Historial de trayectos y reservas (E04-HU09): GET /api/historial
// Muestra la actividad del usuario de la sesión (req.usuario), nunca la de otro usuario.
// Las reservas llegan con E04-HU07; hasta entonces la lista va vacía.
export async function obtenerHistorial(req, res) {
  try {
    const trayectos = await listarTrayectosDeConductor({
      conductorId: req.usuario.id,
      ahoraColombia: momentoEnColombia(),
    });
    const reservas = [];
    const total = trayectos.length + reservas.length;

    return res.status(200).json({
      mensaje: total === 0 ? MENSAJE_SIN_REGISTROS : null,
      total,
      trayectos,
      reservas,
    });
  } catch (error) {
    console.error("Error al consultar el historial:", error);
    return res.status(500).json({ mensaje: "No se pudo cargar el historial." });
  }
}
