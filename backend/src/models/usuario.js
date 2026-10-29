import { createHash, randomBytes } from "node:crypto";
import { pool } from "../config/database.js";

export const ESTADO_SIN_VERIFICAR = "Sin verificar";
export const ESTADO_VERIFICADA = "Verificada";
export const ESTADO_HABILITADO = "Habilitado";

const HORAS_TOKEN = 24;

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export function crearTokenVerificacion() {
  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + HORAS_TOKEN * 60 * 60 * 1000);
  return { token, tokenHash: hashToken(token), expira };
}

export async function buscarPorCorreo(correo) {
  const resultado = await pool.query(
    `SELECT id, nombre, correo, whatsapp, estado
     FROM usuarios
     WHERE correo = $1`,
    [correo],
  );
  return resultado.rows[0] ?? null;
}

export async function buscarCredencialesPorCorreo(correo) {
  const resultado = await pool.query(
    `SELECT id, nombre, correo, estado, contrasena_hash
     FROM usuarios
     WHERE correo = $1`,
    [correo],
  );
  return resultado.rows[0] ?? null;
}

export async function crearUsuario({
  nombre,
  correo,
  contrasenaHash,
  whatsapp,
  tokenHash,
  tokenExpira,
}) {
  const resultado = await pool.query(
    `INSERT INTO usuarios (
       nombre,
       correo,
       contrasena_hash,
       whatsapp,
       estado,
       token_verificacion_hash,
       token_verificacion_expira
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, nombre, correo, whatsapp, estado, creado_en`,
    [
      nombre,
      correo,
      contrasenaHash,
      whatsapp,
      ESTADO_SIN_VERIFICAR,
      tokenHash,
      tokenExpira,
    ],
  );
  return resultado.rows[0];
}

export async function eliminarUsuario(id) {
  await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
}

export async function habilitarUsuario(id, db = pool) {
  const resultado = await db.query(
    `UPDATE usuarios
     SET estado = $2
     WHERE id = $1
       AND estado = $3
     RETURNING id, nombre, correo, estado`,
    [id, ESTADO_HABILITADO, ESTADO_VERIFICADA],
  );
  return resultado.rows[0] ?? null;
}

export async function verificarCuenta(token) {
  const tokenHash = hashToken(token);
  const actualizado = await pool.query(
    `UPDATE usuarios
     SET estado = $2
     WHERE token_verificacion_hash = $1
       AND estado = $3
       AND token_verificacion_expira > NOW()
     RETURNING id, nombre, correo, estado`,
    [tokenHash, ESTADO_VERIFICADA, ESTADO_SIN_VERIFICAR],
  );
  if (actualizado.rows[0]) {
    return { ok: true, usuario: actualizado.rows[0] };
  }

  const existente = await pool.query(
    `SELECT estado, token_verificacion_expira
     FROM usuarios
     WHERE token_verificacion_hash = $1`,
    [tokenHash],
  );
  const fila = existente.rows[0];
  if (!fila) {
    return { ok: false, motivo: "invalido" };
  }
  if (fila.estado === ESTADO_VERIFICADA) {
    return { ok: false, motivo: "usado" };
  }
  return { ok: false, motivo: "expirado" };
}
