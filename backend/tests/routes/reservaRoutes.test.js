import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { SALIDA } from "../helpers/database.js";
import request from "supertest";

const buscarUsuarioPorSesion = jest.fn();
const buscarDetalleTrayecto = jest.fn();
const confirmarReserva = jest.fn();
const buscarContactoDeConductor = jest.fn();
const buscarTrayectoParaContacto = jest.fn();
const listarPasajerosConfirmados = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
  SALIDA,
}));

jest.unstable_mockModule("../../src/models/sesion.js", () => ({
  eliminarSesion: jest.fn(),
  crearSesion: jest.fn(),
  buscarUsuarioPorSesion,
}));

jest.unstable_mockModule("../../src/models/reserva.js", () => ({
  ESTADO_CONFIRMADA: "Confirmada",
  ESTADO_CANCELADA: "Cancelada",
  buscarDetalleTrayecto,
  confirmarReserva,
  listarReservasDePasajero: jest.fn(),
  listarReservasConfirmadas: jest.fn(),
  cancelarReserva: jest.fn(),
}));

jest.unstable_mockModule("../../src/models/contacto.js", () => ({
  buscarContactoDeConductor,
  buscarTrayectoParaContacto,
  listarPasajerosConfirmados,
}));

const { createApp } = await import("../../src/app.js");

const TRAYECTO = "3f2b8c1e-9d4a-4e7b-8a61-5c0d2e9f7b13";
const RESERVA = "7a1c5d2e-3b4f-4a6b-9c8d-0e1f2a3b4c5d";
const CONDUCTOR = "22222222-2222-4222-8222-222222222222";
const SESION = { Authorization: "Bearer token-valido" };

const usuarioSesion = {
  id: "11111111-1111-4111-8111-111111111111",
  nombre: "Mariana Gómez",
  correo: "mariana.gomez@unicauca.edu.co",
  estado: "Verificada",
};

const detalle = (cambios = {}) => ({
  id: TRAYECTO,
  fecha: "2030-05-21",
  hora: "07:00",
  origen: "Bello Horizonte",
  sede_destino_id: 1,
  sede_destino: "Facultad de Ingeniería Civil",
  cupos: 3,
  cupos_disponibles: 3,
  cupos_reservados: 0,
  aporte_sugerido: 2500,
  estado: "Disponible",
  conductor_id: CONDUCTOR,
  conductor_nombre: "Camilo Rojas",
  conductor_whatsapp: "+573104567890",
  vehiculo_marca: "Chevrolet",
  vehiculo_modelo: "Spark",
  vehiculo_color: "Gris",
  vehiculo_placa: "IVL 969",
  vehiculo_capacidad: 4,
  vigente: 1,
  reserva_id: null,
  ...cambios,
});

describe("rutas de reservas y contacto (Supertest)", () => {
  let app;

  beforeEach(() => {
    app = createApp();
    for (const simulacion of [
      buscarUsuarioPorSesion,
      buscarDetalleTrayecto,
      confirmarReserva,
      buscarContactoDeConductor,
      buscarTrayectoParaContacto,
      listarPasajerosConfirmados,
    ]) {
      simulacion.mockReset();
    }
    buscarUsuarioPorSesion.mockImplementation(async (token) =>
      token === "token-valido" ? usuarioSesion : null,
    );
  });

  // E04-HU07 · Reservar cupo en trayecto
  describe("GET /api/trayectos/:id", () => {
    test("debería exigir sesión iniciada", async () => {
      const res = await request(app).get(`/api/trayectos/${TRAYECTO}`);

      expect(res.status).toBe(401);
      expect(buscarDetalleTrayecto).not.toHaveBeenCalled();
    });

    test("HU07 criterio 1: debería devolver el trayecto con su disponibilidad actual", async () => {
      buscarDetalleTrayecto.mockResolvedValueOnce(detalle({ cupos_disponibles: 2, cupos_reservados: 1 }));

      const res = await request(app).get(`/api/trayectos/${TRAYECTO}`).set(SESION);

      expect(res.status).toBe(200);
      expect(res.body.trayecto).toMatchObject({
        id: TRAYECTO,
        cupos: 3,
        cupos_disponibles: 2,
        cupos_reservados: 1,
        vigente: true,
        es_conductor: false,
        reserva_id: null,
        conductor_nombre: "Camilo Rojas",
        vehiculo: { marca: "Chevrolet", modelo: "Spark", color: "Gris", placa: "IVL 969", capacidad_pasajeros: 4 },
      });
      expect(buscarDetalleTrayecto).toHaveBeenCalledWith(
        expect.objectContaining({ trayectoId: TRAYECTO, usuarioId: usuarioSesion.id }),
      );
    });

    test("no debería exponer el WhatsApp del conductor antes de reservar", async () => {
      buscarDetalleTrayecto.mockResolvedValueOnce(detalle());

      const res = await request(app).get(`/api/trayectos/${TRAYECTO}`).set(SESION);

      expect(JSON.stringify(res.body)).not.toContain("573104567890");
    });

    test("debería responder 404 si el trayecto no existe", async () => {
      buscarDetalleTrayecto.mockResolvedValueOnce(null);

      const res = await request(app).get(`/api/trayectos/${TRAYECTO}`).set(SESION);

      expect(res.status).toBe(404);
      expect(res.body.mensaje).toBe("El trayecto no existe.");
    });

    test("debería responder 400 con un identificador inválido", async () => {
      const res = await request(app).get("/api/trayectos/abc").set(SESION);

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual([{ campo: "trayectoId", mensaje: "El trayecto no es válido." }]);
      expect(buscarDetalleTrayecto).not.toHaveBeenCalled();
    });

    test("debería responder 500 si falla la consulta", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      buscarDetalleTrayecto.mockRejectedValueOnce(new Error("sin conexión"));

      const res = await request(app).get(`/api/trayectos/${TRAYECTO}`).set(SESION);

      expect(res.status).toBe(500);
      expect(res.body.mensaje).toBe("No se pudo cargar el trayecto.");
    });
  });

  describe("POST /api/trayectos/:id/reservas", () => {
    test("debería exigir sesión iniciada", async () => {
      const res = await request(app).post(`/api/trayectos/${TRAYECTO}/reservas`);

      expect(res.status).toBe(401);
      expect(confirmarReserva).not.toHaveBeenCalled();
    });

    test("HU07 criterio 1: debería confirmar la reserva y devolver la disponibilidad actualizada", async () => {
      const reserva = { id: RESERVA, trayecto_id: TRAYECTO, pasajero_id: usuarioSesion.id, estado: "Confirmada" };
      confirmarReserva.mockResolvedValueOnce({ ok: true, reserva });
      buscarDetalleTrayecto.mockResolvedValueOnce(
        detalle({ cupos_disponibles: 2, cupos_reservados: 1, reserva_id: RESERVA }),
      );

      const res = await request(app).post(`/api/trayectos/${TRAYECTO}/reservas`).set(SESION);

      expect(res.status).toBe(201);
      expect(res.body.mensaje).toBe("Reserva confirmada. Tu cupo quedó asegurado.");
      expect(res.body.reserva).toEqual(reserva);
      expect(res.body.trayecto).toMatchObject({ cupos_disponibles: 2, cupos_reservados: 1, reserva_id: RESERVA });
    });

    test("debería reservar a nombre del usuario de la sesión e ignorar el pasajero del cuerpo", async () => {
      confirmarReserva.mockResolvedValueOnce({ ok: true, reserva: { id: RESERVA } });
      buscarDetalleTrayecto.mockResolvedValueOnce(detalle());

      await request(app)
        .post(`/api/trayectos/${TRAYECTO}/reservas`)
        .set(SESION)
        .send({ pasajeroId: CONDUCTOR, pasajero_id: CONDUCTOR });

      expect(confirmarReserva).toHaveBeenCalledWith(
        expect.objectContaining({ trayectoId: TRAYECTO, pasajeroId: usuarioSesion.id }),
      );
    });

    test("HU07 criterio 2: debería impedir la reserva y responder «Cupos agotados» si no hay cupos", async () => {
      confirmarReserva.mockResolvedValueOnce({ ok: false, motivo: "sin_cupos" });
      buscarDetalleTrayecto.mockResolvedValueOnce(detalle({ cupos_disponibles: 0, cupos_reservados: 3 }));

      const res = await request(app).post(`/api/trayectos/${TRAYECTO}/reservas`).set(SESION);

      expect(res.status).toBe(409);
      expect(res.body.codigo).toBe("CUPOS_AGOTADOS");
      expect(res.body.mensaje).toBe("Cupos agotados");
      expect(res.body.reserva).toBeUndefined();
    });

    test("HU07 criterio 3: al que pierde el último cupo debería devolverle la disponibilidad actualizada", async () => {
      confirmarReserva.mockResolvedValueOnce({ ok: false, motivo: "sin_cupos" });
      buscarDetalleTrayecto.mockResolvedValueOnce(detalle({ cupos: 1, cupos_disponibles: 0, cupos_reservados: 1 }));

      const res = await request(app).post(`/api/trayectos/${TRAYECTO}/reservas`).set(SESION);

      expect(res.status).toBe(409);
      expect(res.body.trayecto).toMatchObject({ id: TRAYECTO, cupos: 1, cupos_disponibles: 0 });
    });

    test.each([
      ["trayecto_inexistente", 404, "TRAYECTO_INEXISTENTE"],
      ["trayecto_propio", 403, "TRAYECTO_PROPIO"],
      ["trayecto_no_disponible", 409, "TRAYECTO_NO_DISPONIBLE"],
      ["reserva_duplicada", 409, "RESERVA_DUPLICADA"],
    ])("debería responder al motivo %s con %i y el código %s", async (motivo, estado, codigo) => {
      confirmarReserva.mockResolvedValueOnce({ ok: false, motivo });
      buscarDetalleTrayecto.mockResolvedValueOnce(motivo === "trayecto_inexistente" ? null : detalle());

      const res = await request(app).post(`/api/trayectos/${TRAYECTO}/reservas`).set(SESION);

      expect(res.status).toBe(estado);
      expect(res.body.codigo).toBe(codigo);
      expect(typeof res.body.mensaje).toBe("string");
    });

    test("debería responder 400 con un identificador inválido sin intentar reservar", async () => {
      const res = await request(app).post("/api/trayectos/abc/reservas").set(SESION);

      expect(res.status).toBe(400);
      expect(confirmarReserva).not.toHaveBeenCalled();
    });

    test("debería responder 500 si falla la reserva", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      confirmarReserva.mockRejectedValueOnce(new Error("sin conexión"));

      const res = await request(app).post(`/api/trayectos/${TRAYECTO}/reservas`).set(SESION);

      expect(res.status).toBe(500);
      expect(res.body.mensaje).toBe("No se pudo confirmar la reserva.");
    });
  });

  // E05-HU10 · Contacto WhatsApp para el pasajero
  describe("GET /api/reservas/:id/contacto-conductor", () => {
    const fila = (cambios = {}) => ({
      reserva_id: RESERVA,
      reserva_estado: "Confirmada",
      trayecto_id: TRAYECTO,
      fecha: "2030-05-21",
      hora: "07:00",
      origen: "Bello Horizonte",
      sede_destino: "Facultad de Ingeniería Civil",
      conductor_nombre: "Camilo Rojas",
      conductor_whatsapp: "+573104567890",
      ...cambios,
    });

    test("debería exigir sesión iniciada", async () => {
      const res = await request(app).get(`/api/reservas/${RESERVA}/contacto-conductor`);

      expect(res.status).toBe(401);
      expect(buscarContactoDeConductor).not.toHaveBeenCalled();
    });

    test("HU10 criterio 1: debería devolver el enlace wa.me del conductor de la reserva confirmada", async () => {
      buscarContactoDeConductor.mockResolvedValueOnce(fila());

      const res = await request(app).get(`/api/reservas/${RESERVA}/contacto-conductor`).set(SESION);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        reserva: { id: RESERVA, estado: "Confirmada" },
        trayecto: {
          id: TRAYECTO,
          fecha: "2030-05-21",
          hora: "07:00",
          origen: "Bello Horizonte",
          sede_destino: "Facultad de Ingeniería Civil",
        },
        conductor: { nombre: "Camilo Rojas" },
        contacto: { disponible: true, enlace: "https://wa.me/573104567890" },
      });
      expect(buscarContactoDeConductor).toHaveBeenCalledWith({
        reservaId: RESERVA,
        pasajeroId: usuarioSesion.id,
      });
    });

    test.each([null, "", "3104567890", "+57310"])(
      "HU10 criterio 2: debería indicar que el contacto no está disponible con el número %p",
      async (numero) => {
        buscarContactoDeConductor.mockResolvedValueOnce(fila({ conductor_whatsapp: numero }));

        const res = await request(app).get(`/api/reservas/${RESERVA}/contacto-conductor`).set(SESION);

        expect(res.status).toBe(200);
        expect(res.body.contacto).toEqual({
          disponible: false,
          enlace: null,
          mensaje: "El contacto por WhatsApp no está disponible.",
        });
      },
    );

    test("debería responder 404 si el usuario no tiene esa reserva confirmada", async () => {
      buscarContactoDeConductor.mockResolvedValueOnce(null);

      const res = await request(app).get(`/api/reservas/${RESERVA}/contacto-conductor`).set(SESION);

      expect(res.status).toBe(404);
      expect(res.body.contacto).toBeUndefined();
    });

    test("debería responder 400 con un identificador inválido", async () => {
      const res = await request(app).get("/api/reservas/abc/contacto-conductor").set(SESION);

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual([{ campo: "reservaId", mensaje: "La reserva no es válida." }]);
    });

    test("debería responder 500 si falla la consulta", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      buscarContactoDeConductor.mockRejectedValueOnce(new Error("sin conexión"));

      const res = await request(app).get(`/api/reservas/${RESERVA}/contacto-conductor`).set(SESION);

      expect(res.status).toBe(500);
    });
  });

  // E05-HU11 · Contacto WhatsApp para el conductor
  describe("GET /api/trayectos/:id/pasajeros", () => {
    const trayecto = (cambios = {}) => ({
      id: TRAYECTO,
      conductor_id: usuarioSesion.id,
      fecha: "2030-05-21",
      hora: "07:00",
      origen: "Bello Horizonte",
      sede_destino: "Facultad de Ingeniería Civil",
      cupos: 3,
      cupos_disponibles: 1,
      ...cambios,
    });
    const pasajeros = [
      { reserva_id: "r1", nombre: "Daniel Ortiz", whatsapp: "+573207776655" },
      { reserva_id: "r2", nombre: "Sara Pérez", whatsapp: "+573015554433" },
    ];

    test("debería exigir sesión iniciada", async () => {
      const res = await request(app).get(`/api/trayectos/${TRAYECTO}/pasajeros`);

      expect(res.status).toBe(401);
      expect(listarPasajerosConfirmados).not.toHaveBeenCalled();
    });

    test("HU11 criterio 1: debería devolver un enlace wa.me por cada pasajero confirmado", async () => {
      buscarTrayectoParaContacto.mockResolvedValueOnce(trayecto());
      listarPasajerosConfirmados.mockResolvedValueOnce(pasajeros);

      const res = await request(app).get(`/api/trayectos/${TRAYECTO}/pasajeros`).set(SESION);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.pasajeros).toEqual([
        { reserva_id: "r1", nombre: "Daniel Ortiz", contacto: { disponible: true, enlace: "https://wa.me/573207776655" } },
        { reserva_id: "r2", nombre: "Sara Pérez", contacto: { disponible: true, enlace: "https://wa.me/573015554433" } },
      ]);
      expect(res.body.trayecto).toEqual({
        id: TRAYECTO,
        fecha: "2030-05-21",
        hora: "07:00",
        origen: "Bello Horizonte",
        sede_destino: "Facultad de Ingeniería Civil",
        cupos: 3,
        cupos_disponibles: 1,
      });
    });

    test("HU11 criterio 2: al volver a consultar no debería incluir al pasajero que ya no tiene reserva confirmada", async () => {
      buscarTrayectoParaContacto.mockResolvedValue(trayecto());
      listarPasajerosConfirmados.mockResolvedValueOnce(pasajeros).mockResolvedValueOnce([pasajeros[1]]);

      const antes = await request(app).get(`/api/trayectos/${TRAYECTO}/pasajeros`).set(SESION);
      const despues = await request(app).get(`/api/trayectos/${TRAYECTO}/pasajeros`).set(SESION);

      expect(antes.body.total).toBe(2);
      expect(despues.body.total).toBe(1);
      expect(despues.body.pasajeros.map((p) => p.nombre)).toEqual(["Sara Pérez"]);
      expect(JSON.stringify(despues.body)).not.toContain("573207776655");
    });

    test("debería responder con la lista vacía si aún no hay reservas", async () => {
      buscarTrayectoParaContacto.mockResolvedValueOnce(trayecto());
      listarPasajerosConfirmados.mockResolvedValueOnce([]);

      const res = await request(app).get(`/api/trayectos/${TRAYECTO}/pasajeros`).set(SESION);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 0, pasajeros: [] });
    });

    test("debería negar la lista a quien no es el conductor del trayecto", async () => {
      buscarTrayectoParaContacto.mockResolvedValueOnce(trayecto({ conductor_id: CONDUCTOR }));

      const res = await request(app).get(`/api/trayectos/${TRAYECTO}/pasajeros`).set(SESION);

      expect(res.status).toBe(403);
      expect(res.body.pasajeros).toBeUndefined();
      expect(listarPasajerosConfirmados).not.toHaveBeenCalled();
    });

    test("debería marcar sin contacto al pasajero con un número no válido", async () => {
      buscarTrayectoParaContacto.mockResolvedValueOnce(trayecto());
      listarPasajerosConfirmados.mockResolvedValueOnce([{ reserva_id: "r1", nombre: "Daniel Ortiz", whatsapp: null }]);

      const res = await request(app).get(`/api/trayectos/${TRAYECTO}/pasajeros`).set(SESION);

      expect(res.body.pasajeros[0].contacto).toMatchObject({ disponible: false, enlace: null });
    });

    test("debería responder 404 si el trayecto no existe", async () => {
      buscarTrayectoParaContacto.mockResolvedValueOnce(null);

      const res = await request(app).get(`/api/trayectos/${TRAYECTO}/pasajeros`).set(SESION);

      expect(res.status).toBe(404);
    });

    test("debería responder 400 con un identificador inválido", async () => {
      const res = await request(app).get("/api/trayectos/abc/pasajeros").set(SESION);

      expect(res.status).toBe(400);
      expect(buscarTrayectoParaContacto).not.toHaveBeenCalled();
    });

    test("debería responder 500 si falla la consulta", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      buscarTrayectoParaContacto.mockRejectedValueOnce(new Error("sin conexión"));

      const res = await request(app).get(`/api/trayectos/${TRAYECTO}/pasajeros`).set(SESION);

      expect(res.status).toBe(500);
    });
  });
});
