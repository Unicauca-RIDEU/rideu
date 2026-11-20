import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { SALIDA } from "../helpers/database.js";

const query = jest.fn();
const cliente = { query: jest.fn(), commit: jest.fn(), rollback: jest.fn(), release: jest.fn() };
const connect = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query, connect },
  SALIDA,
}));

const {
  ESTADO_CANCELADO,
  actualizarTrayecto,
  buscarTrayectoParaEdicion,
  cancelarTrayecto,
  existeTrayectoEnHorario,
  listarTrayectosDeConductor,
  listarTrayectosEditables,
} = await import("../../src/models/trayecto.js");
const { listarReservasDePasajero } = await import("../../src/models/reserva.js");

// Edición y cancelación de trayectos (E02-HU05).
const TRAYECTO = "3f2b8c1e-9d4a-4e7b-8a61-5c0d2e9f7b13";
const CONDUCTOR = "22222222-2222-4222-8222-222222222222";
const AHORA = "2026-11-20 06:00";

const bloqueado = (cambios = {}) => ({
  rows: [
    {
      id: TRAYECTO,
      conductor_id: CONDUCTOR,
      estado: "Disponible",
      fecha: "2026-11-21",
      hora: "07:00",
      origen: "Bello Horizonte",
      sede_destino: "Facultad de Ingeniería Civil",
      vigente: 1,
      ...cambios,
    },
  ],
});
const pasajeros = [
  { reserva_id: "r1", nombre: "Mariana Gómez", correo: "mariana.gomez@unicauca.edu.co" },
  { reserva_id: "r2", nombre: "Andrés Paz", correo: "andres.paz@unicauca.edu.co" },
];
const entrada = (cambios = {}) => ({
  trayectoId: TRAYECTO,
  conductorId: CONDUCTOR,
  ahoraColombia: AHORA,
  confirmar: false,
  ...cambios,
});

describe("modelo trayecto · edición y cancelación (HU05)", () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset();
    Object.values(cliente).forEach((simulacion) => simulacion.mockReset());
    connect.mockResolvedValue(cliente);
  });

  describe("cancelarTrayecto", () => {
    test("criterio 1: debería cancelar un trayecto sin reservas sin pedir confirmación", async () => {
      cliente.query
        .mockResolvedValueOnce(bloqueado())
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rowCount: 1 });

      const resultado = await cancelarTrayecto(entrada());

      expect(ESTADO_CANCELADO).toBe("Cancelado");
      expect(resultado).toEqual({
        ok: true,
        trayecto: {
          id: TRAYECTO,
          fecha: "2026-11-21",
          hora: "07:00",
          origen: "Bello Horizonte",
          sede_destino: "Facultad de Ingeniería Civil",
          estado: "Cancelado",
        },
        pasajeros: [],
      });
      expect(cliente.query).toHaveBeenNthCalledWith(1, expect.stringContaining("FOR UPDATE"), {
        id: TRAYECTO,
        ahora_colombia: AHORA,
      });
      expect(cliente.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("UPDATE trayectos"),
        { id: TRAYECTO, estado: "Cancelado" },
      );
      expect(cliente.query).toHaveBeenCalledTimes(3);
      expect(cliente.commit).toHaveBeenCalledTimes(1);
      expect(cliente.release).toHaveBeenCalledTimes(1);
    });

    test("criterio 2: debería pedir confirmación e indicar los pasajeros afectados sin cambiar nada", async () => {
      cliente.query.mockResolvedValueOnce(bloqueado()).mockResolvedValueOnce({ rows: pasajeros });

      const resultado = await cancelarTrayecto(entrada());

      expect(resultado).toEqual({ ok: false, motivo: "requiere_confirmacion", pasajerosAfectados: 2 });
      expect(cliente.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining("FROM reservas r"),
        { trayecto_id: TRAYECTO, estado: "Confirmada" },
      );
      expect(cliente.query).toHaveBeenCalledTimes(2);
      expect(cliente.rollback).toHaveBeenCalledTimes(1);
      expect(cliente.commit).not.toHaveBeenCalled();
    });

    test("criterio 2: al confirmar, debería cancelar el trayecto y sus reservas en la misma transacción", async () => {
      cliente.query
        .mockResolvedValueOnce(bloqueado())
        .mockResolvedValueOnce({ rows: pasajeros })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 2 });

      const resultado = await cancelarTrayecto(entrada({ confirmar: true }));

      expect(resultado.ok).toBe(true);
      expect(resultado.pasajeros).toEqual([
        { nombre: "Mariana Gómez", correo: "mariana.gomez@unicauca.edu.co" },
        { nombre: "Andrés Paz", correo: "andres.paz@unicauca.edu.co" },
      ]);
      expect(cliente.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining("cupos_disponibles = cupos"),
        { id: TRAYECTO, estado: "Cancelado" },
      );
      expect(cliente.query).toHaveBeenNthCalledWith(4, expect.stringContaining("UPDATE reservas"), {
        trayecto_id: TRAYECTO,
        estado_cancelada: "Cancelada",
        estado_confirmada: "Confirmada",
      });
      expect(cliente.commit).toHaveBeenCalledTimes(1);
    });

    test.each([
      ["inexistente", { rows: [] }, "trayecto_inexistente"],
      ["de otro conductor", bloqueado({ conductor_id: "otro" }), "trayecto_ajeno"],
      ["ya cancelado", bloqueado({ estado: "Cancelado" }), "trayecto_cancelado"],
      ["que ya salió", bloqueado({ vigente: 0 }), "trayecto_iniciado"],
    ])("debería rechazar un trayecto %s sin cambiar nada", async (_caso, fila, motivo) => {
      cliente.query.mockResolvedValueOnce(fila);

      await expect(cancelarTrayecto(entrada({ confirmar: true }))).resolves.toEqual({ ok: false, motivo });
      expect(cliente.query).toHaveBeenCalledTimes(1);
      expect(cliente.rollback).toHaveBeenCalledTimes(1);
      expect(cliente.release).toHaveBeenCalledTimes(1);
    });

    test("debería deshacer la transacción y propagar un error de la base", async () => {
      const error = new Error("ORA-03113");
      cliente.query.mockResolvedValueOnce(bloqueado()).mockRejectedValueOnce(error);

      await expect(cancelarTrayecto(entrada())).rejects.toBe(error);
      expect(cliente.rollback).toHaveBeenCalledTimes(1);
      expect(cliente.commit).not.toHaveBeenCalled();
      expect(cliente.release).toHaveBeenCalledTimes(1);
    });
  });

  describe("actualizarTrayecto", () => {
    const datos = {
      trayectoId: TRAYECTO,
      conductorId: CONDUCTOR,
      fecha: "2026-11-22",
      hora: "08:15",
      cupos: 3,
      ahoraColombia: AHORA,
    };

    test("criterio 3: debería guardar la fecha, la hora y los cupos conservando las reservas", async () => {
      query.mockResolvedValueOnce({ rowCount: 1 });

      await expect(actualizarTrayecto(datos)).resolves.toBe(true);

      const [sql, binds] = query.mock.calls[0];
      expect(sql).toContain("t.cupos_disponibles = :cupos - (t.cupos - t.cupos_disponibles)");
      expect(sql).toContain("t.cupos - t.cupos_disponibles <= :cupos");
      expect(binds).toEqual({
        id: TRAYECTO,
        conductor_id: CONDUCTOR,
        fecha: "2026-11-22",
        hora: "08:15",
        cupos: 3,
        estado: "Disponible",
        ahora_colombia: AHORA,
      });
    });

    test("criterio 3: debería devolver false si el trayecto cambió y no se actualizó ninguna fila", async () => {
      query.mockResolvedValueOnce({ rowCount: 0 });
      await expect(actualizarTrayecto(datos)).resolves.toBe(false);
    });
  });

  describe("consultas", () => {
    test("debería listar los trayectos vigentes del conductor, del más próximo al más lejano", async () => {
      const filas = [{ id: TRAYECTO }];
      query.mockResolvedValueOnce({ rows: filas });

      await expect(
        listarTrayectosEditables({ conductorId: CONDUCTOR, ahoraColombia: AHORA }),
      ).resolves.toBe(filas);

      const [sql, binds] = query.mock.calls[0];
      expect(sql).toContain("ORDER BY t.fecha, t.hora");
      expect(binds).toEqual({ conductor_id: CONDUCTOR, estado: "Disponible", ahora_colombia: AHORA });
    });

    test("debería buscar el trayecto a editar con su capacidad y vigencia", async () => {
      const fila = { id: TRAYECTO, vigente: 1 };
      query.mockResolvedValueOnce({ rows: [fila] });

      await expect(buscarTrayectoParaEdicion({ trayectoId: TRAYECTO, ahoraColombia: AHORA })).resolves.toBe(fila);
      expect(query.mock.calls[0][1]).toEqual({ id: TRAYECTO, ahora_colombia: AHORA });
    });

    test("debería devolver null si el trayecto a editar no existe", async () => {
      query.mockResolvedValueOnce({ rows: [] });
      await expect(buscarTrayectoParaEdicion({ trayectoId: TRAYECTO, ahoraColombia: AHORA })).resolves.toBeNull();
    });

    test("criterio 3: debería excluir el propio trayecto al comprobar el horario", async () => {
      query.mockResolvedValueOnce({ rows: [{ existe: 0 }] });

      await existeTrayectoEnHorario({
        conductorId: CONDUCTOR,
        fecha: "2026-11-22",
        hora: "08:15",
        excluirId: TRAYECTO,
      });

      const [sql, binds] = query.mock.calls[0];
      expect(sql).toContain("id <> :excluir_id");
      expect(binds).toEqual({
        conductor_id: CONDUCTOR,
        fecha: "2026-11-22",
        hora: "08:15",
        estado: "Disponible",
        excluir_id: TRAYECTO,
      });
    });

    test("criterio 1: el historial debería mostrar «Cancelado» antes que la fecha de salida", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await listarTrayectosDeConductor({ conductorId: CONDUCTOR, ahoraColombia: AHORA });

      const [sql, binds] = query.mock.calls[0];
      expect(sql.indexOf("WHEN t.estado = :estado_cancelado")).toBeLessThan(sql.indexOf("'Completado'"));
      expect(binds.estado_cancelado).toBe("Cancelado");
    });

    test("criterio 2: el historial del pasajero debería mostrar «Cancelada» la reserva cancelada", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await listarReservasDePasajero({ pasajeroId: "p1", ahoraColombia: AHORA });

      const [sql, binds] = query.mock.calls[0];
      expect(sql).toContain("WHEN r.estado = :estado_cancelada THEN 'Cancelada'");
      expect(binds.estado_cancelada).toBe("Cancelada");
    });
  });
});
