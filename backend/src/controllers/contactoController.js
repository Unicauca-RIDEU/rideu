import { buscarContactoDeConductor } from "../models/contacto.js";
import { enlaceWhatsApp } from "../validation/contacto.js";
import { validarIdReserva } from "../validation/reserva.js";

// Contacto por WhatsApp (E05-HU10).
// El usuario es siempre el de la sesión (req.usuario). RideU no guarda conversaciones:
// solo entrega el enlace wa.me para abrir el chat en WhatsApp.

export const MENSAJE_CONTACTO_NO_DISPONIBLE = "El contacto por WhatsApp no está disponible.";
const MENSAJE_SIN_RESERVA = "No tienes una reserva confirmada con ese identificador.";

function presentarContacto(numero) {
  const enlace = enlaceWhatsApp(numero);
  if (!enlace) {
    return { disponible: false, enlace: null, mensaje: MENSAJE_CONTACTO_NO_DISPONIBLE };
  }
  return { disponible: true, enlace };
}

// GET /api/reservas/:id/contacto-conductor — contacto del conductor de una reserva confirmada
// del usuario de la sesión, para la pantalla /reservas/contacto-conductor.
export async function contactoConductor(req, res) {
  const validacion = validarIdReserva(req.params.id);
  if (!validacion.ok) {
    return res.status(400).json({ mensaje: validacion.mensaje, errores: validacion.errores });
  }

  try {
    const fila = await buscarContactoDeConductor({
      reservaId: validacion.datos.id,
      pasajeroId: req.usuario.id,
    });
    if (!fila) {
      return res.status(404).json({ mensaje: MENSAJE_SIN_RESERVA });
    }

    return res.status(200).json({
      reserva: { id: fila.reserva_id, estado: fila.reserva_estado },
      trayecto: {
        id: fila.trayecto_id,
        fecha: fila.fecha,
        hora: fila.hora,
        origen: fila.origen,
        sede_destino: fila.sede_destino,
      },
      conductor: { nombre: fila.conductor_nombre },
      contacto: presentarContacto(fila.conductor_whatsapp),
    });
  } catch (error) {
    console.error("Error al consultar el contacto del conductor:", error);
    return res.status(500).json({ mensaje: "No se pudo cargar el contacto del conductor." });
  }
}
