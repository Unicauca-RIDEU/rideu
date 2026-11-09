import { pool } from "../config/database.js";

export async function crearLicencia({ usuarioId, categoria, fechaVencimiento }, db = pool) {
  const resultado = await db.query(
    `INSERT INTO licencias (
       usuario_id,
       categoria,
       fecha_vencimiento
     )
     VALUES ($1, $2, $3)
     RETURNING id, usuario_id, categoria, fecha_vencimiento`,
    [usuarioId, categoria, fechaVencimiento],
  );
  return resultado.rows[0];
}

// Actualiza la licencia más reciente del usuario; devuelve null si no tiene ninguna.
export async function actualizarLicenciaDeUsuario({ usuarioId, categoria, fechaVencimiento }, db = pool) {
  const resultado = await db.query(
    `UPDATE licencias
     SET categoria = $2,
         fecha_vencimiento = $3
     WHERE id = (
       SELECT id
       FROM licencias
       WHERE usuario_id = $1
       ORDER BY fecha_vencimiento DESC
       LIMIT 1
     )
     RETURNING id, usuario_id, categoria, fecha_vencimiento`,
    [usuarioId, categoria, fechaVencimiento],
  );
  return resultado.rows[0] ?? null;
}

export async function buscarLicenciasPorUsuario(usuarioId) {
  const resultado = await pool.query(
    `SELECT id, usuario_id, categoria, fecha_vencimiento
     FROM licencias
     WHERE usuario_id = $1`,
    [usuarioId],
  );
  return resultado.rows;
}

export async function eliminarLicencia(id) {
  await pool.query("DELETE FROM licencias WHERE id = $1", [id]);
}
