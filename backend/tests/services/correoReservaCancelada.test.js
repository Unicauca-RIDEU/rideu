import { describe, test, expect, jest } from "@jest/globals";
import { enviarCorreoReservaCancelada } from "../../src/services/correo.js";

// Aviso por correo al conductor cuando un pasajero cancela su reserva (E04-HU08, criterio 2).
const trayecto = {
  fecha: "2026-11-21",
  hora: "07:00",
  origen: "Bello Horizonte",
  sede_destino: "Facultad de Ingeniería Civil",
  cupos_disponibles: 1,
};
const aviso = (cambios = {}) => ({
  nombre: "Camilo <Rojas>",
  correo: "camilo.rojas@unicauca.edu.co",
  pasajero: "Mariana Gómez",
  trayecto,
  ...cambios,
});
const config = (cambios = {}) => ({
  mailMode: "smtp",
  smtpHost: "smtp.ethereal.email",
  mailFrom: "Ride U <no-reply@rideu.local>",
  ...cambios,
});

describe("servicio correo · reserva cancelada (HU08)", () => {
  test("criterio 2: debería avisar al conductor de la cancelación y del cupo liberado", async () => {
    const enviarSmtp = jest.fn().mockResolvedValue(undefined);

    await enviarCorreoReservaCancelada(aviso(), { config: config(), enviarSmtp });

    const [mensaje] = enviarSmtp.mock.calls[0];
    expect(mensaje).toMatchObject({
      to: "camilo.rojas@unicauca.edu.co",
      subject: "Un pasajero canceló su reserva en Ride U",
    });
    expect(mensaje.text).toContain("Mariana Gómez canceló su reserva en tu trayecto:");
    expect(mensaje.text).toContain("Bello Horizonte → Facultad de Ingeniería Civil, 2026-11-21 a las 07:00.");
    expect(mensaje.text).toContain("Se liberó 1 cupo. Ahora el trayecto tiene 1 cupo disponible.");
    expect(mensaje.html).toContain("Camilo &lt;Rojas&gt;");
  });

  test("criterio 2: debería indicar en plural los cupos disponibles", async () => {
    const enviarSmtp = jest.fn().mockResolvedValue(undefined);

    await enviarCorreoReservaCancelada(aviso({ trayecto: { ...trayecto, cupos_disponibles: 3 } }), {
      config: config(),
      enviarSmtp,
    });

    expect(enviarSmtp.mock.calls[0][0].text).toContain("Ahora el trayecto tiene 3 cupos disponibles.");
  });

  test("criterio 2: en modo console debería escribir el aviso sin usar SMTP", async () => {
    const lineas = [];
    const enviarSmtp = jest.fn();

    await enviarCorreoReservaCancelada(aviso(), {
      config: config({ mailMode: "console" }),
      log: (linea) => lineas.push(linea),
      enviarSmtp,
    });

    expect(lineas).toEqual([
      "[Ride U] Aviso de reserva cancelada para camilo.rojas@unicauca.edu.co: Mariana Gómez liberó 1 cupo en Bello Horizonte → Facultad de Ingeniería Civil, 2026-11-21 a las 07:00.",
    ]);
    expect(enviarSmtp).not.toHaveBeenCalled();
  });
});
