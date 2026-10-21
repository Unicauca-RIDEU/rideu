import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { buscarUsuarioPorSesion, crearSesion } from "./sesion.js";
import {
  crearTokenVerificacion,
  crearUsuario,
  eliminarUsuario,
  verificarCuenta,
} from "./usuario.js";

test("una sesión creada identifica al usuario verificado", async (t) => {
  try {
    await pool.query("SELECT 1");
  } catch {
    t.skip("PostgreSQL no está disponible");
    return;
  }

  const correo = `sesion.${Date.now()}@unicauca.edu.co`;
  const { token: tokenVerificacion, tokenHash, expira } = crearTokenVerificacion();
  const usuario = await crearUsuario({
    nombre: "Ana Pérez",
    correo,
    contrasenaHash: await bcrypt.hash("secreta12", 4),
    whatsapp: "+573001234567",
    tokenHash,
    tokenExpira: expira,
  });

  try {
    await verificarCuenta(tokenVerificacion);
    const { token } = await crearSesion(usuario.id);

    const encontrado = await buscarUsuarioPorSesion(token);
    assert.equal(encontrado.id, usuario.id);
    assert.equal(encontrado.correo, correo);

    assert.equal(await buscarUsuarioPorSesion("token-que-no-existe"), null);
  } finally {
    await eliminarUsuario(usuario.id);
  }
});
