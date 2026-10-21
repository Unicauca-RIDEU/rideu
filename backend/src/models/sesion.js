import { randomBytes } from "node:crypto";
import { pool } from "../config/database.js";
import { hashToken } from "./usuario.js";

const HORAS_SESION = 24 * 7;

export async function crearSesion(usuarioId) {
  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + HORAS_SESION * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO sesiones (usuario_id, token_hash, expira)
     VALUES ($1, $2, $3)`,
    [usuarioId, hashToken(token), expira],
  );
  return { token, expira };
}

export async function buscarUsuarioPorSesion(token) {
  const resultado = await pool.query(
    `SELECT u.id, u.nombre, u.correo, u.estado
     FROM sesiones s
     JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = $1
       AND s.expira > NOW()`,
    [hashToken(token)],
  );
  return resultado.rows[0] ?? null;
}
