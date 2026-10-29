import assert from "node:assert/strict";
import test from "node:test";
import { validarRegistro } from "./registro.js";

const valido = {
  nombre: "Ana Pérez",
  correo: "ana.perez@unicauca.edu.co",
  contrasena: "secreta12",
  whatsapp: "3001234567",
};

test("acepta el correo institucional y normaliza los datos", () => {
  const resultado = validarRegistro({
    ...valido,
    correo: "  Ana.Perez@Unicauca.edu.co ",
    whatsapp: "+57 300 123 4567",
  });

  assert.equal(resultado.ok, true);
  assert.equal(resultado.datos.correo, "ana.perez@unicauca.edu.co");
  assert.equal(resultado.datos.whatsapp, "+573001234567");
  assert.equal(resultado.datos.nombre, "Ana Pérez");
});

test("rechaza un dominio distinto al institucional", () => {
  const resultado = validarRegistro({ ...valido, correo: "ana.perez@gmail.com" });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.mensaje, "Solo se permite el correo institucional @unicauca.edu.co.");
  assert.deepEqual(resultado.errores, [
    { campo: "correo", mensaje: "Solo se permite el correo institucional @unicauca.edu.co." },
  ]);
});

test("rechaza un dominio que solo contiene unicauca.edu.co", () => {
  const resultado = validarRegistro({ ...valido, correo: "ana@unicauca.edu.co.evil.com" });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.errores[0].campo, "correo");
});

test("indica cada campo obligatorio que falta", () => {
  const resultado = validarRegistro({});

  assert.equal(resultado.ok, false);
  assert.equal(resultado.mensaje, "Completa los campos obligatorios.");
  assert.deepEqual(
    resultado.errores.map((error) => error.campo),
    ["nombre", "correo", "contrasena", "whatsapp"],
  );
});

test("rechaza una contraseña de menos de 8 caracteres", () => {
  const resultado = validarRegistro({ ...valido, contrasena: "corta" });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.errores[0].mensaje, "La contraseña debe tener al menos 8 caracteres.");
});

test("rechaza un WhatsApp que no es un celular colombiano", () => {
  const resultado = validarRegistro({ ...valido, whatsapp: "12345" });

  assert.equal(resultado.ok, false);
  assert.equal(resultado.errores[0].campo, "whatsapp");
});
