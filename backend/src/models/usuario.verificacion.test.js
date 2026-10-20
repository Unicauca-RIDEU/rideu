import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import {
  crearTokenVerificacion,
  crearUsuario,
  eliminarUsuario,
  verificarCuenta,
  ESTADO_SIN_VERIFICAR,
  ESTADO_VERIFICADA,
} from "./usuario.js";

test("el token válido verifica una sola vez", async (t) => {
  try {
    await pool.query("SELECT 1");
  } catch {
    t.skip("PostgreSQL no está disponible");
    return;
  }

  const correo = `verificacion.${Date.now()}@unicauca.edu.co`;
  const { token, tokenHash, expira } = crearTokenVerificacion();
  const usuario = await crearUsuario({
    nombre: "Ana Pérez",
    correo,
    contrasenaHash: await bcrypt.hash("secreta12", 4),
    whatsapp: "+573001234567",
    tokenHash,
    tokenExpira: expira,
  });

  try {
    const primera = await verificarCuenta(token);
    assert.equal(primera.ok, true);
    assert.equal(primera.usuario.estado, ESTADO_VERIFICADA);
    assert.equal(primera.usuario.correo, correo);

    const segunda = await verificarCuenta(token);
    assert.deepEqual(segunda, { ok: false, motivo: "usado" });

    const invalido = await verificarCuenta("token-que-no-existe");
    assert.deepEqual(invalido, { ok: false, motivo: "invalido" });
  } finally {
    await eliminarUsuario(usuario.id);
  }
});

test("un token vencido no cambia el estado", async (t) => {
  try {
    await pool.query("SELECT 1");
  } catch {
    t.skip("PostgreSQL no está disponible");
    return;
  }

  const correo = `vencido.${Date.now()}@unicauca.edu.co`;
  const { token, tokenHash } = crearTokenVerificacion();
  const usuario = await crearUsuario({
    nombre: "Ana Pérez",
    correo,
    contrasenaHash: await bcrypt.hash("secreta12", 4),
    whatsapp: "+573001234567",
    tokenHash,
    tokenExpira: new Date(Date.now() - 60_000),
  });

  try {
    const resultado = await verificarCuenta(token);
    assert.deepEqual(resultado, { ok: false, motivo: "expirado" });
    const fila = await pool.query("SELECT estado FROM usuarios WHERE id = $1", [usuario.id]);
    assert.equal(fila.rows[0].estado, ESTADO_SIN_VERIFICAR);
  } finally {
    await eliminarUsuario(usuario.id);
  }
});
