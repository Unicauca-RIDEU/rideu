import { randomUUID } from "node:crypto";
import { SALIDA, pool } from "../config/database.js";
import { ESTADO_DISPONIBLE } from "./trayecto.js";

export const ESTADO_CONFIRMADA = "Confirmada";

// Momento de salida del trayecto: fecha (DATE a las 00:00) más hora («HH24:MI»).
const SALIDA_DEL_TRAYECTO =
  "TO_DATE(TO_CHAR(t.fecha, 'YYYY-MM-DD') || ' ' || t.hora, 'YYYY-MM-DD HH24:MI')";

// Detalle de un trayecto para la pantalla de reserva (E04-HU07).
// vigente = 1 si aún no ha salido; reserva_id es la reserva confirmada del usuario, si la tiene.
// ahoraColombia es la fecha y hora actual de Colombia como 'AAAA-MM-DD HH:MM'.
export async function buscarDetalleTrayecto({ trayectoId, usuarioId, ahoraColombia }) {
  const resultado = await pool.query(
    `SELECT t.id,
            TO_CHAR(t.fecha, 'YYYY-MM-DD') AS fecha,
            t.hora,
            t.origen,
            t.sede_destino_id,
            s.nombre AS sede_destino,
            t.cupos,
            t.cupos_disponibles,
            t.cupos - t.cupos_disponibles AS cupos_reservados,
            t.aporte_sugerido,
            t.estado,
            t.conductor_id,
            u.nombre AS conductor_nombre,
            v.marca AS vehiculo_marca,
            v.modelo AS vehiculo_modelo,
            v.color AS vehiculo_color,
            v.placa AS vehiculo_placa,
            v.capacidad_pasajeros AS vehiculo_capacidad,
            CASE
              WHEN ${SALIDA_DEL_TRAYECTO} > TO_DATE(:ahora_colombia, 'YYYY-MM-DD HH24:MI')
                THEN 1
              ELSE 0
            END AS vigente,
            (SELECT r.id
             FROM reservas r
             WHERE r.trayecto_id = t.id
               AND r.pasajero_id = :usuario_id
               AND r.estado = :estado_reserva) AS reserva_id
     FROM trayectos t
     JOIN sedes s ON s.id = t.sede_destino_id
     JOIN usuarios u ON u.id = t.conductor_id
     JOIN vehiculos v ON v.id = t.vehiculo_id
     WHERE t.id = :id`,
    {
      id: trayectoId,
      usuario_id: usuarioId,
      ahora_colombia: ahoraColombia,
      estado_reserva: ESTADO_CONFIRMADA,
    },
  );
  return resultado.rows[0] ?? null;
}

// Confirma la reserva de un cupo (E04-HU07) en una sola transacción.
// La fila del trayecto se bloquea con FOR UPDATE: si dos pasajeros piden el último cupo
// a la vez, el segundo espera a que termine el primero y encuentra el trayecto sin cupos.
// Devuelve { ok: true, reserva } o { ok: false, motivo }.
export async function confirmarReserva({ trayectoId, pasajeroId, ahoraColombia }) {
  const cliente = await pool.connect();
  try {
    const bloqueado = await cliente.query(
      `SELECT t.conductor_id,
              t.estado,
              t.cupos_disponibles,
              CASE
                WHEN ${SALIDA_DEL_TRAYECTO} > TO_DATE(:ahora_colombia, 'YYYY-MM-DD HH24:MI')
                  THEN 1
                ELSE 0
              END AS vigente
       FROM trayectos t
       WHERE t.id = :id
       FOR UPDATE`,
      { id: trayectoId, ahora_colombia: ahoraColombia },
    );
    const trayecto = bloqueado.rows[0];
    if (!trayecto) {
      await cliente.rollback();
      return { ok: false, motivo: "trayecto_inexistente" };
    }
    if (trayecto.conductor_id === pasajeroId) {
      await cliente.rollback();
      return { ok: false, motivo: "trayecto_propio" };
    }
    if (trayecto.estado !== ESTADO_DISPONIBLE || trayecto.vigente !== 1) {
      await cliente.rollback();
      return { ok: false, motivo: "trayecto_no_disponible" };
    }

    const previa = await cliente.query(
      `SELECT COUNT(*) AS existe
       FROM reservas
       WHERE trayecto_id = :trayecto_id
         AND pasajero_id = :pasajero_id`,
      { trayecto_id: trayectoId, pasajero_id: pasajeroId },
    );
    if (previa.rows[0]?.existe > 0) {
      await cliente.rollback();
      return { ok: false, motivo: "reserva_duplicada" };
    }
    if (trayecto.cupos_disponibles <= 0) {
      await cliente.rollback();
      return { ok: false, motivo: "sin_cupos" };
    }

    const descuento = await cliente.query(
      `UPDATE trayectos
       SET cupos_disponibles = cupos_disponibles - 1
       WHERE id = :id
         AND cupos_disponibles > 0`,
      { id: trayectoId },
    );
    if (descuento.rowCount !== 1) {
      await cliente.rollback();
      return { ok: false, motivo: "sin_cupos" };
    }

    const creada = await cliente.query(
      `INSERT INTO reservas (id, trayecto_id, pasajero_id, estado)
       VALUES (:id, :trayecto_id, :pasajero_id, :estado)
       RETURNING id, trayecto_id, pasajero_id, estado, creado_en
       INTO :r_id, :r_trayecto_id, :r_pasajero_id, :r_estado, :r_creado_en`,
      {
        id: randomUUID(),
        trayecto_id: trayectoId,
        pasajero_id: pasajeroId,
        estado: ESTADO_CONFIRMADA,
        r_id: SALIDA.texto,
        r_trayecto_id: SALIDA.texto,
        r_pasajero_id: SALIDA.texto,
        r_estado: SALIDA.texto,
        r_creado_en: SALIDA.instante,
      },
    );
    await cliente.commit();
    return { ok: true, reserva: creada.rows[0] };
  } catch (error) {
    await cliente.rollback();
    if (error.code === "ORA-00001" && error.constraint === "reservas_pasajero_unico") {
      return { ok: false, motivo: "reserva_duplicada" };
    }
    throw error;
  } finally {
    await cliente.release();
  }
}

// Historial (E04-HU09): reservas del usuario, de la salida más reciente a la más antigua.
// Una reserva cuyo trayecto ya salió se muestra como «Completado».
// ahoraColombia es la fecha y hora actual de Colombia como 'AAAA-MM-DD HH:MM'.
export async function listarReservasDePasajero({ pasajeroId, ahoraColombia }) {
  const resultado = await pool.query(
    `SELECT r.id,
            r.estado,
            t.id AS trayecto_id,
            TO_CHAR(t.fecha, 'YYYY-MM-DD') AS fecha,
            t.hora,
            t.origen,
            s.nombre AS sede_destino,
            t.aporte_sugerido,
            u.nombre AS conductor_nombre,
            CASE
              WHEN ${SALIDA_DEL_TRAYECTO} <= TO_DATE(:ahora_colombia, 'YYYY-MM-DD HH24:MI')
                THEN 'Completado'
              ELSE 'Pendiente'
            END AS estado_historial
     FROM reservas r
     JOIN trayectos t ON t.id = r.trayecto_id
     JOIN sedes s ON s.id = t.sede_destino_id
     JOIN usuarios u ON u.id = t.conductor_id
     WHERE r.pasajero_id = :pasajero_id
     ORDER BY t.fecha DESC, t.hora DESC`,
    { pasajero_id: pasajeroId, ahora_colombia: ahoraColombia },
  );
  return resultado.rows;
}
