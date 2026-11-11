import { pool } from "../config/database.js";

export async function listarSedes() {
  const resultado = await pool.query(
    `SELECT id, nombre, direccion, ciudad
     FROM sedes
     ORDER BY id`,
  );
  return resultado.rows;
}

export async function buscarSedePorId(id) {
  const resultado = await pool.query(
    `SELECT id, nombre, direccion, ciudad
     FROM sedes
     WHERE id = :id`,
    { id },
  );
  return resultado.rows[0] ?? null;
}
