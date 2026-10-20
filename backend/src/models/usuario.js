import { createHash, randomBytes } from "node:crypto";
import { pool } from "../config/database.js";

export const ESTADO_SIN_VERIFICAR = "Sin verificar";
export const ESTADO_VERIFICADA = "Verificada";

const HORAS_TOKEN = 24;

export function crearTokenVerificacion() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expira = new Date(Date.now() + HORAS_TOKEN * 60 * 60 * 1000);
  return { token, tokenHash, expira };
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
