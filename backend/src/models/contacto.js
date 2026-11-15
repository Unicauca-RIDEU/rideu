import { pool } from "../config/database.js";
import { ESTADO_CONFIRMADA } from "./reserva.js";

// Contacto del conductor para el pasajero (E05-HU10).
// Solo responde si la reserva es del pasajero indicado y está confirmada.
export async function buscarContactoDeConductor({ reservaId, pasajeroId }) {
  const resultado = await pool.query(
    `SELECT r.id AS reserva_id,
            r.estado AS reserva_estado,
            t.id AS trayecto_id,
            TO_CHAR(t.fecha, 'YYYY-MM-DD') AS fecha,
            t.hora,
            t.origen,
            s.nombre AS sede_destino,
            u.nombre AS conductor_nombre,
            u.whatsapp AS conductor_whatsapp
     FROM reservas r
     JOIN trayectos t ON t.id = r.trayecto_id
     JOIN sedes s ON s.id = t.sede_destino_id
     JOIN usuarios u ON u.id = t.conductor_id
     WHERE r.id = :reserva_id
       AND r.pasajero_id = :pasajero_id
       AND r.estado = :estado`,
    { reserva_id: reservaId, pasajero_id: pasajeroId, estado: ESTADO_CONFIRMADA },
  );
  return resultado.rows[0] ?? null;
}
