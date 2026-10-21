import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { iniciarSesion } from "./authController.js";
import {
  crearTokenVerificacion,
  crearUsuario,
  eliminarUsuario,
  verificarCuenta,
} from "../models/usuario.js";

test("el login con correo sin verificar responde 403 y no abre sesión", async (t) => {
  try {
    await pool.query("SELECT 1");
  } catch {
    t.skip("PostgreSQL no está disponible");
    return;
  }

  const correo = `login.sin-verificar.${Date.now()}@unicauca.edu.co`;
  const contrasena = "secreta12";
  const { token, tokenHash, expira } = crearTokenVerificacion();
  const usuario = await crearUsuario({
    nombre: "Ana Pérez",
    correo,
    contrasenaHash: await bcrypt.hash(contrasena, 4),
    whatsapp: "+573001234567",
    tokenHash,
    tokenExpira: expira,
  });

  try {
    const rechazado = await llamarLogin({ correo, contrasena });
    assert.equal(rechazado.statusCode, 403);
    assert.equal(rechazado.cuerpo.codigo, "EMAIL_NOT_VERIFIED");
    assert.equal(rechazado.cuerpo.mensaje, "Debes verificar tu correo institucional para acceder");
    assert.equal(rechazado.cuerpo.token, undefined);
    assert.equal(await contarSesiones(usuario.id), 0);

    const incorrecto = await llamarLogin({ correo, contrasena: "otra-clave" });
    assert.equal(incorrecto.statusCode, 401);
    assert.equal(incorrecto.cuerpo.mensaje, "No se pudo iniciar sesión.");
    assert.equal(incorrecto.cuerpo.codigo, undefined);
    assert.equal(incorrecto.cuerpo.token, undefined);

    await verificarCuenta(token);
    const aceptado = await llamarLogin({ correo, contrasena });
    assert.equal(aceptado.statusCode, 200);
    assert.equal(typeof aceptado.cuerpo.token, "string");
  } finally {
    await eliminarUsuario(usuario.id);
  }
});

function llamarLogin(body) {
  const res = {
    statusCode: 0,
    cuerpo: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(cuerpo) {
      this.cuerpo = cuerpo;
      return this;
    },
  };
  return iniciarSesion({ body }, res).then(() => res);
}

function contarSesiones(usuarioId) {
  return pool
    .query("SELECT COUNT(*)::int AS total FROM sesiones WHERE usuario_id = $1", [usuarioId])
    .then((resultado) => resultado.rows[0].total);
}
