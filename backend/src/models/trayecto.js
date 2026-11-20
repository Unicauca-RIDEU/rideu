import { randomUUID } from "node:crypto";
import { SALIDA, pool } from "../config/database.js";
import { motivoParaNoModificar } from "../validation/trayecto.js";
import {
  ESTADO_CANCELADA,
  ESTADO_CANCELADO,
  ESTADO_CONFIRMADA,
  ESTADO_DISPONIBLE,
} from "./estados.js";

export { ESTADO_CANCELADO, ESTADO_DISPONIBLE };

// Momento de salida del trayecto: fecha (DATE a las 00:00) más hora («HH24:MI»).
const SALIDA_DEL_TRAYECTO =
  "TO_DATE(TO_CHAR(t.fecha, 'YYYY-MM-DD') || ' ' || t.hora, 'YYYY-MM-DD HH24:MI')";

export async function crearTrayecto({
  conductorId,
  vehiculoId,
  sedeDestinoId,
  origen,
  fecha,
  hora,
  cupos,
  aporteSugerido,
}, db = pool) {
  const resultado = await db.query(
    `INSERT INTO trayectos (
       id,
       conductor_id,
       vehiculo_id,
       sede_destino_id,
       origen,
       fecha,
       hora,
       cupos,
       aporte_sugerido,
       estado,
       cupos_disponibles
     )
     VALUES (
       :id,
       :conductor_id,
       :vehiculo_id,
       :sede_destino_id,
       :origen,
       TO_DATE(:fecha, 'YYYY-MM-DD'),
       :hora,
       :cupos,
       :aporte_sugerido,
       :estado,
       :cupos
     )
     RETURNING id,
               conductor_id,
               vehiculo_id,
               sede_destino_id,
               origen,
               TO_CHAR(fecha, 'YYYY-MM-DD'),
               hora,
               cupos,
               cupos_disponibles,
               aporte_sugerido,
               estado,
               creado_en
     INTO :r_id,
          :r_conductor_id,
          :r_vehiculo_id,
          :r_sede_destino_id,
          :r_origen,
          :r_fecha,
          :r_hora,
          :r_cupos,
          :r_cupos_disponibles,
          :r_aporte_sugerido,
          :r_estado,
          :r_creado_en`,
    {
      id: randomUUID(),
      conductor_id: conductorId,
      vehiculo_id: vehiculoId,
      sede_destino_id: sedeDestinoId,
      origen,
      fecha,
      hora,
      cupos,
      aporte_sugerido: aporteSugerido,
      estado: ESTADO_DISPONIBLE,
      r_id: SALIDA.texto,
      r_conductor_id: SALIDA.texto,
      r_vehiculo_id: SALIDA.texto,
      r_sede_destino_id: SALIDA.numero,
      r_origen: SALIDA.texto,
      r_fecha: SALIDA.texto,
      r_hora: SALIDA.texto,
      r_cupos: SALIDA.numero,
      r_cupos_disponibles: SALIDA.numero,
      r_aporte_sugerido: SALIDA.numero,
      r_estado: SALIDA.texto,
      r_creado_en: SALIDA.instante,
    },
  );
  return resultado.rows[0];
}

// Un conductor no puede tener dos trayectos «Disponible» que salgan en la misma fecha y hora.
// Al editar un trayecto (E02-HU05), excluirId deja fuera el propio trayecto.
export async function existeTrayectoEnHorario({ conductorId, fecha, hora, excluirId }) {
  const binds = { conductor_id: conductorId, fecha, hora, estado: ESTADO_DISPONIBLE };
  if (excluirId) {
    binds.excluir_id = excluirId;
  }
  const resultado = await pool.query(
    `SELECT COUNT(*) AS existe
     FROM trayectos
     WHERE conductor_id = :conductor_id
       AND fecha = TO_DATE(:fecha, 'YYYY-MM-DD')
       AND hora = :hora
       AND estado = :estado${excluirId ? "\n       AND id <> :excluir_id" : ""}
       AND ROWNUM = 1`,
    binds,
  );
  return resultado.rows[0]?.existe === 1;
}

// Búsqueda de trayectos (E03-HU06): activos («Disponible», con cupos y que aún no han salido)
// hacia una sede, en una fecha y desde una hora, ordenados por hora de salida.
// ahoraColombia es la fecha y hora actual de Colombia como 'AAAA-MM-DD HH:MM'.
export async function buscarTrayectosDisponibles({ sedeDestinoId, fecha, horaDesde, ahoraColombia }) {
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
            u.nombre AS conductor_nombre
     FROM trayectos t
     JOIN sedes s ON s.id = t.sede_destino_id
     JOIN usuarios u ON u.id = t.conductor_id
     WHERE t.estado = :estado
       AND t.cupos_disponibles > 0
       AND t.sede_destino_id = :sede_destino_id
       AND t.fecha = TO_DATE(:fecha, 'YYYY-MM-DD')
       AND t.hora >= :hora_desde
       AND ${SALIDA_DEL_TRAYECTO} > TO_DATE(:ahora_colombia, 'YYYY-MM-DD HH24:MI')
     ORDER BY t.hora, t.creado_en`,
    {
      estado: ESTADO_DISPONIBLE,
      sede_destino_id: sedeDestinoId,
      fecha,
      hora_desde: horaDesde,
      ahora_colombia: ahoraColombia,
    },
  );
  return resultado.rows;
}

// Historial (E04-HU09): trayectos publicados por el usuario, del más reciente al más antiguo.
// Un trayecto cancelado (E02-HU05) se muestra como «Cancelado», aunque su salida ya haya pasado.
// Si no, un trayecto cuya fecha y hora de salida ya pasaron se muestra como «Completado».
// ahoraColombia es la fecha y hora actual de Colombia como 'AAAA-MM-DD HH:MM'.
export async function listarTrayectosDeConductor({ conductorId, ahoraColombia }) {
  const resultado = await pool.query(
    `SELECT t.id,
            TO_CHAR(t.fecha, 'YYYY-MM-DD') AS fecha,
            t.hora,
            t.origen,
            s.nombre AS sede_destino,
            t.cupos,
            t.cupos_disponibles,
            t.aporte_sugerido,
            CASE
              WHEN t.estado = :estado_cancelado THEN 'Cancelado'
              WHEN ${SALIDA_DEL_TRAYECTO} <= TO_DATE(:ahora_colombia, 'YYYY-MM-DD HH24:MI')
                THEN 'Completado'
              ELSE 'Pendiente'
            END AS estado_historial
     FROM trayectos t
     JOIN sedes s ON s.id = t.sede_destino_id
     WHERE t.conductor_id = :conductor_id
     ORDER BY t.fecha DESC, t.hora DESC`,
    {
      conductor_id: conductorId,
      ahora_colombia: ahoraColombia,
      estado_cancelado: ESTADO_CANCELADO,
    },
  );
  return resultado.rows;
}

// Pantalla /trayectos/editar (E02-HU05): trayectos del conductor que aún se pueden editar
// o cancelar («Disponible» y que no han salido), del más próximo al más lejano.
// vehiculo_capacidad permite calcular el máximo de cupos del trayecto.
export async function listarTrayectosEditables({ conductorId, ahoraColombia }) {
  const resultado = await pool.query(
    `SELECT t.id,
            TO_CHAR(t.fecha, 'YYYY-MM-DD') AS fecha,
            t.hora,
            t.origen,
            s.nombre AS sede_destino,
            t.cupos,
            t.cupos_disponibles,
            t.cupos - t.cupos_disponibles AS cupos_reservados,
            t.aporte_sugerido,
            t.estado,
            v.capacidad_pasajeros AS vehiculo_capacidad
     FROM trayectos t
     JOIN sedes s ON s.id = t.sede_destino_id
     JOIN vehiculos v ON v.id = t.vehiculo_id
     WHERE t.conductor_id = :conductor_id
       AND t.estado = :estado
       AND ${SALIDA_DEL_TRAYECTO} > TO_DATE(:ahora_colombia, 'YYYY-MM-DD HH24:MI')
     ORDER BY t.fecha, t.hora`,
    { conductor_id: conductorId, estado: ESTADO_DISPONIBLE, ahora_colombia: ahoraColombia },
  );
  return resultado.rows;
}

// Trayecto que el conductor quiere editar (E02-HU05), con lo necesario para validar el cambio.
// vigente = 1 si aún no ha salido.
export async function buscarTrayectoParaEdicion({ trayectoId, ahoraColombia }) {
  const resultado = await pool.query(
    `SELECT t.id,
            t.conductor_id,
            TO_CHAR(t.fecha, 'YYYY-MM-DD') AS fecha,
            t.hora,
            t.cupos,
            t.cupos_disponibles,
            t.cupos - t.cupos_disponibles AS cupos_reservados,
            t.estado,
            v.capacidad_pasajeros AS vehiculo_capacidad,
            CASE
              WHEN ${SALIDA_DEL_TRAYECTO} > TO_DATE(:ahora_colombia, 'YYYY-MM-DD HH24:MI')
                THEN 1
              ELSE 0
            END AS vigente
     FROM trayectos t
     JOIN vehiculos v ON v.id = t.vehiculo_id
     WHERE t.id = :id`,
    { id: trayectoId, ahora_colombia: ahoraColombia },
  );
  return resultado.rows[0] ?? null;
}

// Guarda la nueva fecha, hora y cupos de un trayecto (E02-HU05) en una sola sentencia.
// Los cupos disponibles se recalculan conservando las reservas ya confirmadas.
// Las condiciones del WHERE repiten las reglas para que una reserva o la salida del trayecto
// que ocurran mientras tanto no dejen datos inconsistentes: en ese caso no cambia ninguna fila.
// Devuelve true si el trayecto se actualizó.
export async function actualizarTrayecto({
  trayectoId,
  conductorId,
  fecha,
  hora,
  cupos,
  ahoraColombia,
}) {
  const resultado = await pool.query(
    `UPDATE trayectos t
     SET t.fecha = TO_DATE(:fecha, 'YYYY-MM-DD'),
         t.hora = :hora,
         t.cupos_disponibles = :cupos - (t.cupos - t.cupos_disponibles),
         t.cupos = :cupos
     WHERE t.id = :id
       AND t.conductor_id = :conductor_id
       AND t.estado = :estado
       AND t.cupos - t.cupos_disponibles <= :cupos
       AND ${SALIDA_DEL_TRAYECTO} > TO_DATE(:ahora_colombia, 'YYYY-MM-DD HH24:MI')`,
    {
      id: trayectoId,
      conductor_id: conductorId,
      fecha,
      hora,
      cupos,
      estado: ESTADO_DISPONIBLE,
      ahora_colombia: ahoraColombia,
    },
  );
  return resultado.rowCount === 1;
}

// Cancela un trayecto (E02-HU05) en una sola transacción.
// La fila del trayecto se bloquea con FOR UPDATE: mientras tanto nadie puede reservar en él.
// Si tiene reservas confirmadas y confirmar no es true, no cambia nada y devuelve
// cuántos pasajeros se verían afectados. Al confirmar, el trayecto queda «Cancelado»,
// sus reservas quedan «Cancelada» y sus cupos vuelven a estar libres.
// Devuelve { ok: true, trayecto, pasajeros } o { ok: false, motivo, pasajerosAfectados? }.
export async function cancelarTrayecto({ trayectoId, conductorId, ahoraColombia, confirmar }) {
  const cliente = await pool.connect();
  try {
    const bloqueado = await cliente.query(
      `SELECT t.id,
              t.conductor_id,
              t.estado,
              TO_CHAR(t.fecha, 'YYYY-MM-DD') AS fecha,
              t.hora,
              t.origen,
              s.nombre AS sede_destino,
              CASE
                WHEN ${SALIDA_DEL_TRAYECTO} > TO_DATE(:ahora_colombia, 'YYYY-MM-DD HH24:MI')
                  THEN 1
                ELSE 0
              END AS vigente
       FROM trayectos t
       JOIN sedes s ON s.id = t.sede_destino_id
       WHERE t.id = :id
       FOR UPDATE OF t.estado`,
      { id: trayectoId, ahora_colombia: ahoraColombia },
    );
    const trayecto = bloqueado.rows[0];
    const rechazo = motivoParaNoModificar(trayecto, conductorId);
    if (rechazo) {
      await cliente.rollback();
      return { ok: false, motivo: rechazo };
    }

    const afectados = await cliente.query(
      `SELECT r.id AS reserva_id,
              u.nombre,
              u.correo
       FROM reservas r
       JOIN usuarios u ON u.id = r.pasajero_id
       WHERE r.trayecto_id = :trayecto_id
         AND r.estado = :estado
       ORDER BY r.creado_en, r.id`,
      { trayecto_id: trayectoId, estado: ESTADO_CONFIRMADA },
    );
    const pasajeros = afectados.rows;
    if (pasajeros.length > 0 && confirmar !== true) {
      await cliente.rollback();
      return { ok: false, motivo: "requiere_confirmacion", pasajerosAfectados: pasajeros.length };
    }

    await cliente.query(
      `UPDATE trayectos
       SET estado = :estado,
           cupos_disponibles = cupos
       WHERE id = :id`,
      { id: trayectoId, estado: ESTADO_CANCELADO },
    );
    if (pasajeros.length > 0) {
      await cliente.query(
        `UPDATE reservas
         SET estado = :estado_cancelada
         WHERE trayecto_id = :trayecto_id
           AND estado = :estado_confirmada`,
        {
          trayecto_id: trayectoId,
          estado_cancelada: ESTADO_CANCELADA,
          estado_confirmada: ESTADO_CONFIRMADA,
        },
      );
    }
    await cliente.commit();

    return {
      ok: true,
      trayecto: {
        id: trayecto.id,
        fecha: trayecto.fecha,
        hora: trayecto.hora,
        origen: trayecto.origen,
        sede_destino: trayecto.sede_destino,
        estado: ESTADO_CANCELADO,
      },
      pasajeros: pasajeros.map(({ nombre, correo }) => ({ nombre, correo })),
    };
  } catch (error) {
    await cliente.rollback();
    throw error;
  } finally {
    await cliente.release();
  }
}

// Estado de la cuenta, vehículo y licencia del usuario en una sola consulta.
// Solo lee las tablas de HU03; vehiculo_id y licencia_vencimiento son null si faltan.
export async function buscarPerfilConductor(usuarioId) {
  const resultado = await pool.query(
    `SELECT u.id,
            u.nombre,
            u.estado,
            v.id AS vehiculo_id,
            v.placa,
            v.marca,
            v.modelo,
            v.color,
            v.capacidad_pasajeros,
            l.categoria AS licencia_categoria,
            TO_CHAR(l.fecha_vencimiento, 'YYYY-MM-DD') AS licencia_vencimiento
     FROM usuarios u
     OUTER APPLY (
       SELECT id, placa, marca, modelo, color, capacidad_pasajeros
       FROM vehiculos
       WHERE usuario_id = u.id
       ORDER BY placa
       FETCH FIRST 1 ROWS ONLY
     ) v
     OUTER APPLY (
       SELECT categoria, fecha_vencimiento
       FROM licencias
       WHERE usuario_id = u.id
       ORDER BY fecha_vencimiento DESC
       FETCH FIRST 1 ROWS ONLY
     ) l
     WHERE u.id = :id`,
    { id: usuarioId },
  );
  return resultado.rows[0] ?? null;
}
