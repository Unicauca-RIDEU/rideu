import { createHash, randomBytes, randomUUID } from "node:crypto";
import { SALIDA, pool } from "../config/database.js";

export const ESTADO_SIN_VERIFICAR = "Sin verificar";
export const ESTADO_VERIFICADA = "Verificada";
export const ESTADO_HABILITADO = "Habilitado";

const HORAS_TOKEN = 24;

const DEVOLVER_USUARIO = `RETURNING id, nombre, correo, estado
     INTO :r_id, :r_nombre, :r_correo, :r_estado`;

const SALIDA_USUARIO = {
  r_id: SALIDA.texto,
  r_nombre: SALIDA.texto,
  r_correo: SALIDA.texto,
  r_estado: SALIDA.texto,
};

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
     WHERE correo = :correo`,
    { correo },
  );
  return resultado.rows[0] ?? null;
}

export async function buscarCredencialesPorCorreo(correo) {
  const resultado = await pool.query(
    `SELECT id, nombre, correo, estado, contrasena_hash
     FROM usuarios
     WHERE correo = :correo`,
    { correo },
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
       id,
       nombre,
       correo,
       contrasena_hash,
       whatsapp,
       estado,
       token_verificacion_hash,
       token_verificacion_expira
     )
     VALUES (
       :id,
       :nombre,
       :correo,
       :contrasena_hash,
       :whatsapp,
       :estado,
       :token_hash,
       :token_expira
     )
     RETURNING id, nombre, correo, whatsapp, estado, creado_en
     INTO :r_id, :r_nombre, :r_correo, :r_whatsapp, :r_estado, :r_creado_en`,
    {
      id: randomUUID(),
      nombre,
      correo,
      contrasena_hash: contrasenaHash,
      whatsapp,
      estado: ESTADO_SIN_VERIFICAR,
      token_hash: tokenHash,
      token_expira: tokenExpira,
      r_id: SALIDA.texto,
      r_nombre: SALIDA.texto,
      r_correo: SALIDA.texto,
      r_whatsapp: SALIDA.texto,
      r_estado: SALIDA.texto,
      r_creado_en: SALIDA.instante,
    },
  );
  return resultado.rows[0];
}

export async function eliminarUsuario(id) {
  await pool.query("DELETE FROM usuarios WHERE id = :id", { id });
}

export async function habilitarUsuario(id, db = pool) {
  const resultado = await db.query(
    `UPDATE usuarios
     SET estado = :estado_nuevo
     WHERE id = :id
       AND estado = :estado_actual
     ${DEVOLVER_USUARIO}`,
    { id, estado_nuevo: ESTADO_HABILITADO, estado_actual: ESTADO_VERIFICADA, ...SALIDA_USUARIO },
  );
  return resultado.rows[0] ?? null;
}

export async function verificarCuenta(token) {
  const tokenHash = hashToken(token);
  const actualizado = await pool.query(
    `UPDATE usuarios
     SET estado = :estado_nuevo
     WHERE token_verificacion_hash = :token_hash
       AND estado = :estado_actual
       AND token_verificacion_expira > SYSTIMESTAMP
     ${DEVOLVER_USUARIO}`,
    {
      token_hash: tokenHash,
      estado_nuevo: ESTADO_VERIFICADA,
      estado_actual: ESTADO_SIN_VERIFICAR,
      ...SALIDA_USUARIO,
    },
  );
  if (actualizado.rows[0]) {
    return { ok: true, usuario: actualizado.rows[0] };
  }

  const existente = await pool.query(
    `SELECT estado, token_verificacion_expira
     FROM usuarios
     WHERE token_verificacion_hash = :token_hash`,
    { token_hash: tokenHash },
  );
  const fila = existente.rows[0];
  if (!fila) {
    return { ok: false, motivo: "invalido" };
  }
  // El enlace ya se usó si la cuenta dejó de estar «Sin verificar» («Verificada» o «Habilitado»).
  if (fila.estado !== ESTADO_SIN_VERIFICAR) {
    return { ok: false, motivo: "usado" };
  }
  return { ok: false, motivo: "expirado" };
}
