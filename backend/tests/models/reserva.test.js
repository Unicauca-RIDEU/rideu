import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { SALIDA } from "../helpers/database.js";

const query = jest.fn();
const cliente = { query: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
const connect = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query, connect },
  SALIDA,
}));

const { ESTADO_CONFIRMADA, buscarDetalleTrayecto, confirmarReserva, listarReservasDePasajero } =
  await import("../../src/models/reserva.js");

const TRAYECTO = "3f2b8c1e-9d4a-4e7b-8a61-5c0d2e9f7b13";
const PASAJERO = "11111111-1111-4111-8111-111111111111";
const CONDUCTOR = "22222222-2222-4222-8222-222222222222";
const AHORA = "2026-11-20 06:00";
const entrada = { trayectoId: TRAYECTO, pasajeroId: PASAJERO, ahoraColombia: AHORA };

const bloqueado = (cambios = {}) => ({
  rows: [{ conductor_id: CONDUCTOR, estado: "Disponible", cupos_disponibles: 2, vigente: 1, ...cambios }],
});

// Reserva de cupos (E04-HU07).
describe("modelo reserva", () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset();
    Object.values(cliente).forEach((simulacion) => simulacion.mockReset());
    connect.mockResolvedValue(cliente);
  });

  describe("confirmarReserva", () => {
    test("criterio 1: debería descontar un cupo y crear la reserva confirmada en una transacción", async () => {
      const reserva = { id: "r1", trayecto_id: TRAYECTO, pasajero_id: PASAJERO, estado: "Confirmada" };
      cliente.query
        .mockResolvedValueOnce(bloqueado())
        .mockResolvedValueOnce({ rows: [{ existe: 0 }] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [reserva] });

      const resultado = await confirmarReserva(entrada);

      expect(ESTADO_CONFIRMADA).toBe("Confirmada");
      expect(resultado).toEqual({ ok: true, reserva });
      expect(cliente.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("SET cupos_disponibles = cupos_disponibles - 1"),
        { id: TRAYECTO },
      );
      expect(cliente.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining("INSERT INTO reservas"),
        expect.objectContaining({
          id: expect.stringMatching(/^[0-9a-f-]{36}$/),
          trayecto_id: TRAYECTO,
          pasajero_id: PASAJERO,
          estado: "Confirmada",
        }),
      );
      expect(cliente.commit).toHaveBeenCalledTimes(1);
      expect(cliente.rollback).not.toHaveBeenCalled();
      expect(cliente.release).toHaveBeenCalledTimes(1);
    });

    test("criterio 3: debería bloquear la fila del trayecto para atender una solicitud a la vez", async () => {
      cliente.query.mockResolvedValueOnce(bloqueado({ cupos_disponibles: 0 }));
      cliente.query.mockResolvedValueOnce({ rows: [{ existe: 0 }] });

      await confirmarReserva(entrada);

      expect(cliente.query).toHaveBeenNthCalledWith(1, expect.stringContaining("FOR UPDATE"), {
        id: TRAYECTO,
        ahora_colombia: AHORA,
      });
    });

    test("criterio 2: debería rechazar la reserva si el trayecto no tiene cupos", async () => {
      cliente.query
        .mockResolvedValueOnce(bloqueado({ cupos_disponibles: 0 }))
        .mockResolvedValueOnce({ rows: [{ existe: 0 }] });

      const resultado = await confirmarReserva(entrada);

      expect(resultado).toEqual({ ok: false, motivo: "sin_cupos" });
      expect(cliente.query).toHaveBeenCalledTimes(2);
      expect(cliente.rollback).toHaveBeenCalledTimes(1);
      expect(cliente.commit).not.toHaveBeenCalled();
      expect(cliente.release).toHaveBeenCalledTimes(1);
    });

    test("criterio 3: debería rechazar si el descuento ya no encuentra cupo", async () => {
      cliente.query
        .mockResolvedValueOnce(bloqueado({ cupos_disponibles: 1 }))
        .mockResolvedValueOnce({ rows: [{ existe: 0 }] })
        .mockResolvedValueOnce({ rowCount: 0 });

      const resultado = await confirmarReserva(entrada);

      expect(resultado).toEqual({ ok: false, motivo: "sin_cupos" });
      expect(cliente.query).toHaveBeenCalledTimes(3);
      expect(cliente.commit).not.toHaveBeenCalled();
    });

    test("debería rechazar si el trayecto no existe", async () => {
      cliente.query.mockResolvedValueOnce({ rows: [] });

      expect(await confirmarReserva(entrada)).toEqual({ ok: false, motivo: "trayecto_inexistente" });
      expect(cliente.rollback).toHaveBeenCalledTimes(1);
      expect(cliente.release).toHaveBeenCalledTimes(1);
    });

    test("debería rechazar al conductor que reserva en su propio trayecto", async () => {
      cliente.query.mockResolvedValueOnce(bloqueado({ conductor_id: PASAJERO }));

      expect(await confirmarReserva(entrada)).toEqual({ ok: false, motivo: "trayecto_propio" });
      expect(cliente.query).toHaveBeenCalledTimes(1);
    });

    test.each([
      ["ya salió", { vigente: 0 }],
      ["no está disponible", { estado: "Cancelado" }],
    ])("debería rechazar si el trayecto %s", async (_caso, cambios) => {
      cliente.query.mockResolvedValueOnce(bloqueado(cambios));

      expect(await confirmarReserva(entrada)).toEqual({ ok: false, motivo: "trayecto_no_disponible" });
    });

    test("debería rechazar una segunda reserva del mismo pasajero sin descontar cupo", async () => {
      cliente.query.mockResolvedValueOnce(bloqueado()).mockResolvedValueOnce({ rows: [{ existe: 1 }] });

      expect(await confirmarReserva(entrada)).toEqual({ ok: false, motivo: "reserva_duplicada" });
      expect(cliente.query).toHaveBeenCalledTimes(2);
    });

    test("debería tratar la restricción única de la base como reserva repetida", async () => {
      const error = Object.assign(new Error("ORA-00001"), {
        code: "ORA-00001",
        constraint: "reservas_pasajero_unico",
      });
      cliente.query
        .mockResolvedValueOnce(bloqueado())
        .mockResolvedValueOnce({ rows: [{ existe: 0 }] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockRejectedValueOnce(error);

      expect(await confirmarReserva(entrada)).toEqual({ ok: false, motivo: "reserva_duplicada" });
      expect(cliente.rollback).toHaveBeenCalledTimes(1);
      expect(cliente.release).toHaveBeenCalledTimes(1);
    });

    test("debería deshacer la transacción y propagar un error inesperado", async () => {
      cliente.query.mockRejectedValueOnce(new Error("sin conexión"));

      await expect(confirmarReserva(entrada)).rejects.toThrow("sin conexión");
      expect(cliente.rollback).toHaveBeenCalledTimes(1);
      expect(cliente.commit).not.toHaveBeenCalled();
      expect(cliente.release).toHaveBeenCalledTimes(1);
    });
  });

  describe("buscarDetalleTrayecto", () => {
    test("criterio 1: debería devolver el trayecto con sus cupos disponibles", async () => {
      const fila = { id: TRAYECTO, cupos: 3, cupos_disponibles: 2, cupos_reservados: 1, vigente: 1 };
      query.mockResolvedValueOnce({ rows: [fila] });

      const detalle = await buscarDetalleTrayecto({ trayectoId: TRAYECTO, usuarioId: PASAJERO, ahoraColombia: AHORA });

      expect(detalle).toEqual(fila);
      expect(query).toHaveBeenCalledWith(expect.stringContaining("FROM trayectos t"), {
        id: TRAYECTO,
        usuario_id: PASAJERO,
        ahora_colombia: AHORA,
        estado_reserva: "Confirmada",
      });
    });

    test("debería devolver null si el trayecto no existe", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      expect(
        await buscarDetalleTrayecto({ trayectoId: TRAYECTO, usuarioId: PASAJERO, ahoraColombia: AHORA }),
      ).toBeNull();
    });

    test("no debería consultar el WhatsApp del conductor", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await buscarDetalleTrayecto({ trayectoId: TRAYECTO, usuarioId: PASAJERO, ahoraColombia: AHORA });

      expect(query.mock.calls[0][0]).not.toMatch(/whatsapp/i);
    });
  });

  describe("listarReservasDePasajero", () => {
    test("debería listar solo las reservas del pasajero indicado", async () => {
      const filas = [{ id: "r1", estado: "Confirmada", estado_historial: "Pendiente" }];
      query.mockResolvedValueOnce({ rows: filas });

      const reservas = await listarReservasDePasajero({ pasajeroId: PASAJERO, ahoraColombia: AHORA });

      expect(reservas).toEqual(filas);
      expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE r.pasajero_id = :pasajero_id"), {
        pasajero_id: PASAJERO,
        ahora_colombia: AHORA,
        estado_cancelada: "Cancelada",
      });
    });
  });
});
