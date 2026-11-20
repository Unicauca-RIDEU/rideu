import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { SALIDA } from "../helpers/database.js";
import request from "supertest";

const buscarUsuarioPorSesion = jest.fn();
const listarReservasConfirmadas = jest.fn();
const cancelarReserva = jest.fn();
const enviarCorreoReservaCancelada = jest.fn();

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
  buscarDetalleTrayecto: jest.fn(),
  confirmarReserva: jest.fn(),
  listarReservasDePasajero: jest.fn(),
  listarReservasConfirmadas,
  cancelarReserva,
}));

jest.unstable_mockModule("../../src/services/correo.js", () => ({
  enviarCorreoVerificacion: jest.fn(),
  enviarCorreoTrayectoCancelado: jest.fn(),
  enviarCorreoReservaCancelada,
}));

const { createApp } = await import("../../src/app.js");

// Cancelación de reservas (E04-HU08).
const RESERVA = "7a1c5d2e-3b4f-4a6b-9c8d-0e1f2a3b4c5d";
const SESION = { Authorization: "Bearer token-valido" };

const pasajero = {
  id: "11111111-1111-4111-8111-111111111111",
  nombre: "Mariana Gómez",
  correo: "mariana.gomez@unicauca.edu.co",
  estado: "Verificada",
};

const cancelada = {
  ok: true,
  reserva: { id: RESERVA, estado: "Cancelada" },
  trayecto: {
    id: "3f2b8c1e-9d4a-4e7b-8a61-5c0d2e9f7b13",
    fecha: "2026-11-21",
    hora: "07:00",
    origen: "Bello Horizonte",
    sede_destino: "Facultad de Ingeniería Civil",
    cupos: 3,
    cupos_disponibles: 1,
  },
  conductor: { nombre: "Camilo Rojas", correo: "camilo.rojas@unicauca.edu.co" },
};

describe("rutas de cancelación de reservas (Supertest)", () => {
  let app;

  beforeEach(() => {
    app = createApp();
    for (const simulacion of [
      buscarUsuarioPorSesion,
      listarReservasConfirmadas,
      cancelarReserva,
      enviarCorreoReservaCancelada,
    ]) {
      simulacion.mockReset();
    }
    buscarUsuarioPorSesion.mockResolvedValue(pasajero);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET /api/reservas", () => {
    test("criterios 1 y 3: debería listar las reservas confirmadas indicando si el trayecto inició", async () => {
      listarReservasConfirmadas.mockResolvedValueOnce([
        { id: RESERVA, fecha: "2026-11-21", hora: "07:00", iniciado: 0 },
        { id: "otra", fecha: "2026-11-20", hora: "05:00", iniciado: 1 },
      ]);

      const respuesta = await request(app).get("/api/reservas").set(SESION);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.total).toBe(2);
      expect(respuesta.body.reservas.map((reserva) => reserva.iniciado)).toEqual([false, true]);
      expect(listarReservasConfirmadas).toHaveBeenCalledWith({
        pasajeroId: pasajero.id,
        ahoraColombia: expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/),
      });
    });

    test("debería indicar que no hay reservas confirmadas", async () => {
      listarReservasConfirmadas.mockResolvedValueOnce([]);
      const respuesta = await request(app).get("/api/reservas").set(SESION);
      expect(respuesta.body).toEqual({ mensaje: "No tienes reservas confirmadas.", total: 0, reservas: [] });
    });

    test("debería responder 401 sin sesión", async () => {
      const respuesta = await request(app).get("/api/reservas");
      expect(respuesta.status).toBe(401);
      expect(listarReservasConfirmadas).not.toHaveBeenCalled();
    });

    test("debería responder 500 si falla la consulta", async () => {
      listarReservasConfirmadas.mockRejectedValueOnce(new Error("ORA-03113"));
      const respuesta = await request(app).get("/api/reservas").set(SESION);
      expect(respuesta.status).toBe(500);
      expect(respuesta.body.mensaje).toBe("No se pudieron cargar tus reservas.");
    });
  });

  describe("POST /api/reservas/:id/cancelacion", () => {
    test("criterio 1: debería cancelar la reserva y devolver la disponibilidad actualizada del trayecto", async () => {
      cancelarReserva.mockResolvedValueOnce(cancelada);
      enviarCorreoReservaCancelada.mockResolvedValueOnce(undefined);

      const respuesta = await request(app).post(`/api/reservas/${RESERVA}/cancelacion`).set(SESION);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({
        mensaje: "Reserva cancelada. Tu cupo quedó libre y avisamos al conductor por correo.",
        reserva: cancelada.reserva,
        trayecto: cancelada.trayecto,
        conductorNotificado: true,
      });
      expect(cancelarReserva).toHaveBeenCalledWith({
        reservaId: RESERVA,
        pasajeroId: pasajero.id,
        ahoraColombia: expect.any(String),
      });
    });

    test("criterio 2: debería avisar al conductor de la cancelación y del cupo liberado", async () => {
      cancelarReserva.mockResolvedValueOnce(cancelada);
      enviarCorreoReservaCancelada.mockResolvedValueOnce(undefined);

      await request(app).post(`/api/reservas/${RESERVA}/cancelacion`).set(SESION);

      expect(enviarCorreoReservaCancelada).toHaveBeenCalledWith({
        nombre: "Camilo Rojas",
        correo: "camilo.rojas@unicauca.edu.co",
        pasajero: "Mariana Gómez",
        trayecto: cancelada.trayecto,
      });
    });

    test("criterio 2: debería mantener la cancelación e informarlo si el correo al conductor falla", async () => {
      cancelarReserva.mockResolvedValueOnce(cancelada);
      enviarCorreoReservaCancelada.mockRejectedValueOnce(new Error("SMTP"));

      const respuesta = await request(app).post(`/api/reservas/${RESERVA}/cancelacion`).set(SESION);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.conductorNotificado).toBe(false);
      expect(respuesta.body.mensaje).toBe(
        "Reserva cancelada. Tu cupo quedó libre, pero no se pudo avisar al conductor por correo.",
      );
    });

    test("criterio 3: debería impedir la cancelación de un trayecto iniciado con un mensaje que lo explique", async () => {
      cancelarReserva.mockResolvedValueOnce({ ok: false, motivo: "trayecto_iniciado" });

      const respuesta = await request(app).post(`/api/reservas/${RESERVA}/cancelacion`).set(SESION);

      expect(respuesta.status).toBe(409);
      expect(respuesta.body).toEqual({
        codigo: "TRAYECTO_INICIADO",
        mensaje: "No puedes cancelar la reserva porque el trayecto ya inició.",
      });
      expect(enviarCorreoReservaCancelada).not.toHaveBeenCalled();
    });

    test.each([
      ["reserva_inexistente", 404, "RESERVA_INEXISTENTE"],
      ["reserva_ajena", 403, "RESERVA_AJENA"],
      ["reserva_cancelada", 409, "RESERVA_CANCELADA"],
    ])("debería responder según el motivo %s", async (motivo, status, codigo) => {
      cancelarReserva.mockResolvedValueOnce({ ok: false, motivo });

      const respuesta = await request(app).post(`/api/reservas/${RESERVA}/cancelacion`).set(SESION);

      expect(respuesta.status).toBe(status);
      expect(respuesta.body.codigo).toBe(codigo);
      expect(enviarCorreoReservaCancelada).not.toHaveBeenCalled();
    });

    test("debería responder 400 con un identificador inválido", async () => {
      const respuesta = await request(app).post("/api/reservas/abc/cancelacion").set(SESION);
      expect(respuesta.status).toBe(400);
      expect(cancelarReserva).not.toHaveBeenCalled();
    });

    test("debería responder 401 sin sesión", async () => {
      const respuesta = await request(app).post(`/api/reservas/${RESERVA}/cancelacion`);
      expect(respuesta.status).toBe(401);
      expect(cancelarReserva).not.toHaveBeenCalled();
    });

    test("debería responder 500 si falla la base", async () => {
      cancelarReserva.mockRejectedValueOnce(new Error("ORA-03113"));
      const respuesta = await request(app).post(`/api/reservas/${RESERVA}/cancelacion`).set(SESION);
      expect(respuesta.status).toBe(500);
      expect(respuesta.body.mensaje).toBe("No se pudo cancelar la reserva.");
    });
  });
});
