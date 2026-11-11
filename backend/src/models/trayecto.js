import { randomUUID } from "node:crypto";
import { SALIDA, pool } from "../config/database.js";

export const ESTADO_DISPONIBLE = "Disponible";

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
export async function existeTrayectoEnHorario({ conductorId, fecha, hora }) {
  const resultado = await pool.query(
    `SELECT COUNT(*) AS existe
     FROM trayectos
     WHERE conductor_id = :conductor_id
       AND fecha = TO_DATE(:fecha, 'YYYY-MM-DD')
       AND hora = :hora
       AND estado = :estado
       AND ROWNUM = 1`,
    { conductor_id: conductorId, fecha, hora, estado: ESTADO_DISPONIBLE },
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
// Un trayecto cuya fecha y hora de salida ya pasaron se muestra como «Completado».
// Cuando E02-HU05 agregue el estado «Cancelado», debe evaluarse antes que la fecha.
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
              WHEN ${SALIDA_DEL_TRAYECTO} <= TO_DATE(:ahora_colombia, 'YYYY-MM-DD HH24:MI')
                THEN 'Completado'
              ELSE 'Pendiente'
            END AS estado_historial
     FROM trayectos t
     JOIN sedes s ON s.id = t.sede_destino_id
     WHERE t.conductor_id = :conductor_id
     ORDER BY t.fecha DESC, t.hora DESC`,
    { conductor_id: conductorId, ahora_colombia: ahoraColombia },
  );
  return resultado.rows;
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
