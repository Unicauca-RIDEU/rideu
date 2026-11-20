import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { SALIDA } from "../helpers/database.js";

const query = jest.fn();
const cliente = { query: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
const connect = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query, connect },
  SALIDA,
}));

const { ESTADO_CANCELADA, cancelarReserva, confirmarReserva, listarReservasConfirmadas } = await import(
  "../../src/models/reserva.js"
);

// Cancelación de reservas (E04-HU08).
const RESERVA = "7a1c5d2e-3b4f-4a6b-9c8d-0e1f2a3b4c5d";
const TRAYECTO = "3f2b8c1e-9d4a-4e7b-8a61-5c0d2e9f7b13";
const PASAJERO = "11111111-1111-4111-8111-111111111111";
const CONDUCTOR = "22222222-2222-4222-8222-222222222222";
const AHORA = "2026-11-20 06:00";
const entrada = { reservaId: RESERVA, pasajeroId: PASAJERO, ahoraColombia: AHORA };

const bloqueada = (cambios = {}) => ({
  rows: [
    {
      id: RESERVA,
      pasajero_id: PASAJERO,
      estado: "Confirmada",
      trayecto_id: TRAYECTO,
      fecha: "2026-11-21",
      hora: "07:00",
      origen: "Bello Horizonte",
      sede_destino: "Facultad de Ingeniería Civil",
      cupos: 3,
      cupos_disponibles: 0,
      conductor_nombre: "Camilo Rojas",
      conductor_correo: "camilo.rojas@unicauca.edu.co",
      vigente: 1,
      ...cambios,
    },
  ],
});

describe("modelo reserva · cancelación (HU08)", () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset();
    Object.values(cliente).forEach((simulacion) => simulacion.mockReset());
    connect.mockResolvedValue(cliente);
  });

  describe("cancelarReserva", () => {
    test("criterio 1: debería cancelar la reserva y liberar el cupo en la misma transacción", async () => {
      cliente.query
        .mockResolvedValueOnce(bloqueada())
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const resultado = await cancelarReserva(entrada);

      expect(ESTADO_CANCELADA).toBe("Cancelada");
      expect(resultado).toEqual({
        ok: true,
        reserva: { id: RESERVA, estado: "Cancelada" },
        trayecto: {
          id: TRAYECTO,
          fecha: "2026-11-21",
          hora: "07:00",
          origen: "Bello Horizonte",
          sede_destino: "Facultad de Ingeniería Civil",
          cupos: 3,
          cupos_disponibles: 1,
        },
        conductor: { nombre: "Camilo Rojas", correo: "camilo.rojas@unicauca.edu.co" },
      });
      expect(cliente.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining("FOR UPDATE OF r.estado, t.cupos_disponibles"),
        { id: RESERVA, ahora_colombia: AHORA },
      );
      expect(cliente.query).toHaveBeenNthCalledWith(2, expect.stringContaining("UPDATE reservas"), {
        id: RESERVA,
        estado: "Cancelada",
      });
      expect(cliente.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("SET cupos_disponibles = cupos_disponibles + 1"),
        { id: TRAYECTO },
      );
      expect(cliente.commit).toHaveBeenCalledTimes(1);
      expect(cliente.release).toHaveBeenCalledTimes(1);
    });

    test("criterio 2: debería devolver el conductor para avisarle de la cancelación", async () => {
      cliente.query
        .mockResolvedValueOnce(bloqueada({ cupos_disponibles: 1 }))
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 });

      const resultado = await cancelarReserva(entrada);

      expect(resultado.conductor).toEqual({ nombre: "Camilo Rojas", correo: "camilo.rojas@unicauca.edu.co" });
      expect(resultado.trayecto.cupos_disponibles).toBe(2);
    });

    test("criterio 3: debería impedir cancelar la reserva de un trayecto que ya inició", async () => {
      cliente.query.mockResolvedValueOnce(bloqueada({ vigente: 0 }));

      await expect(cancelarReserva(entrada)).resolves.toEqual({ ok: false, motivo: "trayecto_iniciado" });
      expect(cliente.query).toHaveBeenCalledTimes(1);
      expect(cliente.rollback).toHaveBeenCalledTimes(1);
      expect(cliente.commit).not.toHaveBeenCalled();
    });

    test.each([
      ["inexistente", { rows: [] }, "reserva_inexistente"],
      ["de otro pasajero", bloqueada({ pasajero_id: CONDUCTOR }), "reserva_ajena"],
      ["ya cancelada", bloqueada({ estado: "Cancelada" }), "reserva_cancelada"],
    ])("debería rechazar una reserva %s sin cambiar nada", async (_caso, fila, motivo) => {
      cliente.query.mockResolvedValueOnce(fila);

      await expect(cancelarReserva(entrada)).resolves.toEqual({ ok: false, motivo });
      expect(cliente.query).toHaveBeenCalledTimes(1);
      expect(cliente.rollback).toHaveBeenCalledTimes(1);
      expect(cliente.release).toHaveBeenCalledTimes(1);
    });

    test("debería deshacer todo si el cupo no se puede liberar", async () => {
      cliente.query
        .mockResolvedValueOnce(bloqueada({ cupos_disponibles: 3 }))
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 0 });

      await expect(cancelarReserva(entrada)).rejects.toThrow(
        "Los cupos del trayecto no coinciden con sus reservas confirmadas.",
      );
      expect(cliente.rollback).toHaveBeenCalledTimes(1);
      expect(cliente.commit).not.toHaveBeenCalled();
      expect(cliente.release).toHaveBeenCalledTimes(1);
    });
  });

  describe("confirmarReserva tras una cancelación", () => {
    test("criterio 1: el cupo liberado se puede volver a reservar reactivando la reserva cancelada", async () => {
      const reactivada = { id: RESERVA, trayecto_id: TRAYECTO, pasajero_id: PASAJERO, estado: "Confirmada" };
      cliente.query
        .mockResolvedValueOnce({
          rows: [{ conductor_id: CONDUCTOR, estado: "Disponible", cupos_disponibles: 1, vigente: 1 }],
        })
        .mockResolvedValueOnce({ rows: [{ id: RESERVA, estado: "Cancelada" }] })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rows: [reactivada] });

      const resultado = await confirmarReserva({ trayectoId: TRAYECTO, pasajeroId: PASAJERO, ahoraColombia: AHORA });

      expect(resultado).toEqual({ ok: true, reserva: reactivada });
      expect(cliente.query).toHaveBeenNthCalledWith(
        4,
        expect.stringContaining("UPDATE reservas"),
        expect.objectContaining({ id: RESERVA, estado: "Confirmada" }),
      );
      expect(cliente.query.mock.calls.some(([sql]) => sql.includes("INSERT INTO reservas"))).toBe(false);
      expect(cliente.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe("listarReservasConfirmadas", () => {
    test("criterios 1 y 3: debería listar las reservas confirmadas del pasajero indicando si el trayecto inició", async () => {
      const filas = [{ id: RESERVA, iniciado: 0 }];
      query.mockResolvedValueOnce({ rows: filas });

      await expect(listarReservasConfirmadas({ pasajeroId: PASAJERO, ahoraColombia: AHORA })).resolves.toBe(filas);

      const [sql, binds] = query.mock.calls[0];
      expect(sql).toContain("END AS iniciado");
      expect(sql).toContain("ORDER BY t.fecha, t.hora");
      expect(binds).toEqual({ pasajero_id: PASAJERO, estado: "Confirmada", ahora_colombia: AHORA });
    });
  });
});
