import { describe, test, expect } from "@jest/globals";
import { enlaceVerificacion, enviarCorreoVerificacion } from "../../src/services/correo.js";

describe("servicio correo", () => {
  test("debería armar el enlace de verificación sin barra final duplicada", () => {
    // Arrange / Act
    const enlace = enlaceVerificacion("abc123", "http://localhost:5173/");

    // Assert
    expect(enlace).toBe("http://localhost:5173/registro/verificacion?token=abc123");
  });

  test("debería codificar caracteres especiales del token en el enlace", () => {
    // Arrange / Act
    const enlace = enlaceVerificacion("a b/c", "http://localhost:5173");

    // Assert
    expect(enlace).toContain("token=a%20b%2Fc");
  });

  test("debería escribir el enlace en consola y no usar SMTP en modo console", async () => {
    // Arrange
    const lineas = [];

    // Act
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

    // Assert
    expect(resultado.enlace).toContain("token=tok-en");
    expect(lineas).toHaveLength(1);
    expect(lineas[0]).toMatch(/ana\.perez@unicauca\.edu\.co/);
  });

  test("debería exigir SMTP_HOST y MAIL_FROM en modo smtp", async () => {
    // Arrange / Act / Assert
    await expect(
      enviarCorreoVerificacion(
        { nombre: "Ana", correo: "ana.perez@unicauca.edu.co", token: "tok-en" },
        {
          config: {
            mailMode: "smtp",
            appUrl: "http://localhost:5173",
            smtpHost: "",
            mailFrom: "",
          },
        },
      ),
    ).rejects.toThrow(/SMTP_HOST o MAIL_FROM/);
  });

  test("debería rechazar un MAIL_MODE desconocido", async () => {
    // Arrange / Act / Assert
    await expect(
      enviarCorreoVerificacion(
        { nombre: "Ana", correo: "ana.perez@unicauca.edu.co", token: "tok-en" },
        {
          config: {
            mailMode: "otro",
            appUrl: "http://localhost:5173",
            mailFrom: "Ride U <no-reply@rideu.local>",
          },
        },
      ),
    ).rejects.toThrow(/MAIL_MODE/);
  });

  test("debería enviar por SMTP el enlace al correo institucional", async () => {
    // Arrange
    const enviados = [];

    // Act
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

    // Assert
    expect(enviados).toHaveLength(1);
    expect(enviados[0].mensaje.to).toBe("ana.perez@unicauca.edu.co");
    expect(enviados[0].mensaje.text).toMatch(/token=tok-en/);
  });
});
