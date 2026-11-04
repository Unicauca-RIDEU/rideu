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
       estado
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
