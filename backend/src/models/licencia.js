import { randomUUID } from "node:crypto";
import { SALIDA, pool } from "../config/database.js";

const DEVOLVER_LICENCIA = `RETURNING id, usuario_id, categoria, fecha_vencimiento
     INTO :r_id, :r_usuario_id, :r_categoria, :r_fecha_vencimiento`;

const SALIDA_LICENCIA = {
  r_id: SALIDA.texto,
  r_usuario_id: SALIDA.texto,
  r_categoria: SALIDA.texto,
  r_fecha_vencimiento: SALIDA.fecha,
};

export async function crearLicencia({ usuarioId, categoria, fechaVencimiento }, db = pool) {
  const resultado = await db.query(
    `INSERT INTO licencias (
       id,
       usuario_id,
       categoria,
       fecha_vencimiento
     )
     VALUES (:id, :usuario_id, :categoria, TO_DATE(:fecha_vencimiento, 'YYYY-MM-DD'))
     ${DEVOLVER_LICENCIA}`,
    {
      id: randomUUID(),
      usuario_id: usuarioId,
      categoria,
      fecha_vencimiento: fechaVencimiento,
      ...SALIDA_LICENCIA,
    },
  );
  return resultado.rows[0];
}

// Actualiza la licencia más reciente del usuario; devuelve null si no tiene ninguna.
export async function actualizarLicenciaDeUsuario({ usuarioId, categoria, fechaVencimiento }, db = pool) {
  const resultado = await db.query(
    `UPDATE licencias
     SET categoria = :categoria,
         fecha_vencimiento = TO_DATE(:fecha_vencimiento, 'YYYY-MM-DD')
     WHERE id = (
       SELECT id
       FROM licencias
       WHERE usuario_id = :usuario_id
       ORDER BY fecha_vencimiento DESC
       FETCH FIRST 1 ROWS ONLY
     )
     ${DEVOLVER_LICENCIA}`,
    {
      usuario_id: usuarioId,
      categoria,
      fecha_vencimiento: fechaVencimiento,
      ...SALIDA_LICENCIA,
    },
  );
  return resultado.rows[0] ?? null;
}

export async function buscarLicenciasPorUsuario(usuarioId) {
  const resultado = await pool.query(
    `SELECT id, usuario_id, categoria, fecha_vencimiento
     FROM licencias
     WHERE usuario_id = :usuario_id`,
    { usuario_id: usuarioId },
  );
  return resultado.rows;
}

export async function eliminarLicencia(id) {
  await pool.query("DELETE FROM licencias WHERE id = :id", { id });
}
