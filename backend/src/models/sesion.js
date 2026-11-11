import { randomBytes, randomUUID } from "node:crypto";
import { pool } from "../config/database.js";
import { hashToken } from "./usuario.js";

const HORAS_SESION = 24 * 7;

export async function crearSesion(usuarioId) {
  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + HORAS_SESION * 60 * 60 * 1000);
  // Las sesiones vencidas del usuario ya no sirven: se borran para que la tabla no crezca sin límite.
  // La limpieza es accesoria: si falla, no debe impedir el inicio de sesión.
  try {
    await pool.query(
      `DELETE FROM sesiones
       WHERE usuario_id = :usuario_id
         AND expira <= SYSTIMESTAMP`,
      { usuario_id: usuarioId },
    );
  } catch (error) {
    console.error("No se pudieron borrar las sesiones vencidas:", error);
  }
  await pool.query(
    `INSERT INTO sesiones (id, usuario_id, token_hash, expira)
     VALUES (:id, :usuario_id, :token_hash, :expira)`,
    { id: randomUUID(), usuario_id: usuarioId, token_hash: hashToken(token), expira },
  );
  return { token, expira };
}

export async function eliminarSesion(token) {
  await pool.query("DELETE FROM sesiones WHERE token_hash = :token_hash", {
    token_hash: hashToken(token),
  });
}

export async function buscarUsuarioPorSesion(token) {
  const resultado = await pool.query(
    `SELECT u.id, u.nombre, u.correo, u.estado
     FROM sesiones s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = :token_hash
       AND s.expira > SYSTIMESTAMP`,
    { token_hash: hashToken(token) },
  );
  return resultado.rows[0] ?? null;
}
