import { pool } from "../config/database.js";

export const ESTADO_DISPONIBLE = "Disponible";

const COLUMNAS_TRAYECTO = `id,
       conductor_id,
       vehiculo_id,
       sede_destino_id,
       origen,
       to_char(fecha, 'YYYY-MM-DD') AS fecha,
       to_char(hora, 'HH24:MI') AS hora,
       cupos,
       cupos_disponibles,
       aporte_sugerido,
       estado,
       creado_en`;

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
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $7)
     RETURNING ${COLUMNAS_TRAYECTO}`,
    [
      conductorId,
      vehiculoId,
      sedeDestinoId,
      origen,
      fecha,
      hora,
      cupos,
      aporteSugerido,
      ESTADO_DISPONIBLE,
    ],
  );
  return resultado.rows[0];
}

// Búsqueda de trayectos (E03-HU06): activos («Disponible», con cupos y que aún no han salido)
// hacia una sede, en una fecha y desde una hora, ordenados por hora de salida.
// ahoraColombia es la fecha y hora actual de Colombia como 'AAAA-MM-DD HH:MM'.
export async function buscarTrayectosDisponibles({ sedeDestinoId, fecha, horaDesde, ahoraColombia }) {
  const resultado = await pool.query(
    `SELECT t.id,
            to_char(t.fecha, 'YYYY-MM-DD') AS fecha,
            to_char(t.hora, 'HH24:MI') AS hora,
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
     WHERE t.estado = $1
       AND t.cupos_disponibles > 0
       AND t.sede_destino_id = $2
       AND t.fecha = $3
       AND t.hora >= $4
       AND (t.fecha + t.hora) > $5::timestamp
     ORDER BY t.hora, t.creado_en`,
    [ESTADO_DISPONIBLE, sedeDestinoId, fecha, horaDesde, ahoraColombia],
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
            to_char(l.fecha_vencimiento, 'YYYY-MM-DD') AS licencia_vencimiento
     FROM usuarios u
     LEFT JOIN LATERAL (
       SELECT id, placa, marca, modelo, color, capacidad_pasajeros
       FROM vehiculos
       WHERE usuario_id = u.id
       ORDER BY placa
       LIMIT 1
     ) v ON TRUE
     LEFT JOIN LATERAL (
       SELECT categoria, fecha_vencimiento
       FROM licencias
       WHERE usuario_id = u.id
       ORDER BY fecha_vencimiento DESC
       LIMIT 1
     ) l ON TRUE
     WHERE u.id = $1`,
    [usuarioId],
  );
  return resultado.rows[0] ?? null;
}
