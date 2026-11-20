import { describe, test, expect, jest } from "@jest/globals";
import { enviarCorreoTrayectoCancelado } from "../../src/services/correo.js";

// Aviso por correo a los pasajeros de un trayecto cancelado (E02-HU05, criterio 2).
const trayecto = {
  fecha: "2026-11-21",
  hora: "07:00",
  origen: "Bello Horizonte",
  sede_destino: "Facultad de Ingeniería Civil",
};
const pasajero = { nombre: "Mariana <Gómez>", correo: "mariana.gomez@unicauca.edu.co", trayecto };
const config = (cambios = {}) => ({
  mailMode: "smtp",
  smtpHost: "smtp.ethereal.email",
  mailFrom: "Ride U <no-reply@rideu.local>",
  ...cambios,
});

describe("servicio correo · trayecto cancelado (HU05)", () => {
  test("criterio 2: debería avisar al pasajero con la ruta y la salida del trayecto cancelado", async () => {
    const enviarSmtp = jest.fn().mockResolvedValue(undefined);

    await enviarCorreoTrayectoCancelado(pasajero, { config: config(), enviarSmtp });

    const [mensaje] = enviarSmtp.mock.calls[0];
    expect(mensaje).toMatchObject({
      from: "Ride U <no-reply@rideu.local>",
      to: "mariana.gomez@unicauca.edu.co",
      subject: "Tu trayecto de Ride U fue cancelado",
    });
    expect(mensaje.text).toContain("Bello Horizonte → Facultad de Ingeniería Civil, 2026-11-21 a las 07:00.");
    expect(mensaje.text).toContain("Tu reserva quedó cancelada.");
    expect(mensaje.html).toContain("Mariana &lt;Gómez&gt;");
  });

  test("criterio 2: en modo console debería escribir el aviso sin usar SMTP", async () => {
    const lineas = [];
    const enviarSmtp = jest.fn();

    await enviarCorreoTrayectoCancelado(pasajero, {
      config: config({ mailMode: "console" }),
      log: (linea) => lineas.push(linea),
      enviarSmtp,
    });

    expect(lineas).toEqual([
      "[Ride U] Aviso de trayecto cancelado para mariana.gomez@unicauca.edu.co: Bello Horizonte → Facultad de Ingeniería Civil, 2026-11-21 a las 07:00.",
    ]);
    expect(enviarSmtp).not.toHaveBeenCalled();
  });

  test("debería fallar si MAIL_MODE no es válido", async () => {
    await expect(
      enviarCorreoTrayectoCancelado(pasajero, { config: config({ mailMode: "otro" }) }),
    ).rejects.toThrow("MAIL_MODE debe ser console o smtp.");
  });

  test("debería fallar si falta la configuración SMTP", async () => {
    await expect(
      enviarCorreoTrayectoCancelado(pasajero, { config: config({ smtpHost: "" }) }),
    ).rejects.toThrow("Faltan SMTP_HOST o MAIL_FROM.");
  });
});
