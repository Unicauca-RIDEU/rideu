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
