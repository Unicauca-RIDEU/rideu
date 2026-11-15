import {
  buscarContactoDeConductor,
  buscarTrayectoParaContacto,
  listarPasajerosConfirmados,
} from "../models/contacto.js";
import { enlaceWhatsApp } from "../validation/contacto.js";
import { validarIdReserva, validarIdTrayecto } from "../validation/reserva.js";

// Contacto por WhatsApp (E05-HU10 y E05-HU11).
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

// GET /api/trayectos/:id/pasajeros — contacto de los pasajeros con reserva confirmada,
// solo para el conductor del trayecto, para la pantalla /trayectos/pasajeros/contacto.
export async function contactoPasajeros(req, res) {
  const validacion = validarIdTrayecto(req.params.id);
  if (!validacion.ok) {
    return res.status(400).json({ mensaje: validacion.mensaje, errores: validacion.errores });
  }
  const trayectoId = validacion.datos.id;

  try {
    const trayecto = await buscarTrayectoParaContacto({ trayectoId });
    if (!trayecto) {
      return res.status(404).json({ mensaje: "El trayecto no existe." });
    }
    if (trayecto.conductor_id !== req.usuario.id) {
      return res
        .status(403)
        .json({ mensaje: "Solo el conductor del trayecto puede ver el contacto de sus pasajeros." });
    }

    const filas = await listarPasajerosConfirmados({ trayectoId });
    const pasajeros = filas.map((fila) => ({
      reserva_id: fila.reserva_id,
      nombre: fila.nombre,
      contacto: presentarContacto(fila.whatsapp),
    }));

    return res.status(200).json({
      trayecto: {
        id: trayecto.id,
        fecha: trayecto.fecha,
        hora: trayecto.hora,
        origen: trayecto.origen,
        sede_destino: trayecto.sede_destino,
        cupos: trayecto.cupos,
        cupos_disponibles: trayecto.cupos_disponibles,
      },
      total: pasajeros.length,
      pasajeros,
    });
  } catch (error) {
    console.error("Error al consultar el contacto de los pasajeros:", error);
    return res.status(500).json({ mensaje: "No se pudo cargar el contacto de los pasajeros." });
  }
}
