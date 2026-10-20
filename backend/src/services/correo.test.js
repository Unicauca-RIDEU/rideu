import assert from "node:assert/strict";
import test from "node:test";
import { enlaceVerificacion, enviarCorreoVerificacion } from "./correo.js";

test("arma el enlace de verificación con el token", () => {
  const enlace = enlaceVerificacion("abc123", "http://localhost:5173/");
  assert.equal(enlace, "http://localhost:5173/registro/verificacion?token=abc123");
});

test("en modo consola escribe el enlace y no usa SMTP", async () => {
  const lineas = [];
  const resultado = await enviarCorreoVerificacion(
    { nombre: "Ana Pérez", correo: "ana.perez@unicauca.edu.co", token: "tok-en" },
    {
      config: {
        mailMode: "console",
        appUrl: "http://localhost:5173",
        mailFrom: "Ride U <no-reply@rideu.local>",
      },
      log: (linea) => lineas.push(linea),
      enviarSmtp: async () => {
        throw new Error("no debía enviar por SMTP");
      },
    },
  );

  assert.equal(resultado.enlace, "http://localhost:5173/registro/verificacion?token=tok-en");
  assert.equal(lineas.length, 1);
  assert.match(lineas[0], /ana\.perez@unicauca\.edu\.co/);
  assert.match(lineas[0], /token=tok-en/);
});

test("en modo smtp exige host y remitente antes de enviar", async () => {
  await assert.rejects(
    () =>
      enviarCorreoVerificacion(
        { nombre: "Ana", correo: "ana.perez@unicauca.edu.co", token: "tok-en" },
        { config: { mailMode: "smtp", appUrl: "http://localhost:5173", smtpHost: "", mailFrom: "" } },
      ),
    /SMTP_HOST o MAIL_FROM/,
  );
});

test("en modo smtp envía el enlace al correo institucional", async () => {
  const enviados = [];
  await enviarCorreoVerificacion(
    { nombre: "Ana Pérez", correo: "ana.perez@unicauca.edu.co", token: "tok-en" },
    {
      config: {
        mailMode: "smtp",
        appUrl: "http://localhost:5173",
        smtpHost: "sandbox.smtp.mailtrap.io",
        smtpPort: 2525,
        smtpUser: "usuario-de-prueba",
        smtpPass: "secreto-de-prueba",
        mailFrom: "Ride U <no-reply@rideu.local>",
      },
      enviarSmtp: async (mensaje, config) => {
        enviados.push({ mensaje, config });
      },
    },
  );

  assert.equal(enviados.length, 1);
  assert.equal(enviados[0].mensaje.to, "ana.perez@unicauca.edu.co");
  assert.match(enviados[0].mensaje.text, /token=tok-en/);
  assert.equal(enviados[0].config.smtpPass, "secreto-de-prueba");
});
