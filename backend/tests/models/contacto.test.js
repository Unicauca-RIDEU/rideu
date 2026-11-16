import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { SALIDA } from "../helpers/database.js";

const query = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query, connect: jest.fn() },
  SALIDA,
}));

const { buscarContactoDeConductor, buscarTrayectoParaContacto, listarPasajerosConfirmados } =
  await import("../../src/models/contacto.js");

const TRAYECTO = "3f2b8c1e-9d4a-4e7b-8a61-5c0d2e9f7b13";
const RESERVA = "7a1c5d2e-3b4f-4a6b-9c8d-0e1f2a3b4c5d";
const PASAJERO = "11111111-1111-4111-8111-111111111111";

// Contacto por WhatsApp (E05-HU10 y E05-HU11).
describe("modelo contacto", () => {
  beforeEach(() => {
    query.mockReset();
  });

  test("HU10 criterio 1: debería buscar el contacto solo con una reserva confirmada del pasajero", async () => {
    const fila = { reserva_id: RESERVA, conductor_nombre: "Camilo Rojas", conductor_whatsapp: "+573104567890" };
    query.mockResolvedValueOnce({ rows: [fila] });

    const contacto = await buscarContactoDeConductor({ reservaId: RESERVA, pasajeroId: PASAJERO });

    expect(contacto).toEqual(fila);
    const [sql, binds] = query.mock.calls[0];
    expect(sql).toContain("r.pasajero_id = :pasajero_id");
    expect(sql).toContain("r.estado = :estado");
    expect(binds).toEqual({ reserva_id: RESERVA, pasajero_id: PASAJERO, estado: "Confirmada" });
  });

  test("HU10: debería devolver null si el usuario no tiene esa reserva confirmada", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    expect(await buscarContactoDeConductor({ reservaId: RESERVA, pasajeroId: PASAJERO })).toBeNull();
  });

  test("HU10 criterio 1: no debería escribir nada en la base (no se almacenan conversaciones)", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await buscarContactoDeConductor({ reservaId: RESERVA, pasajeroId: PASAJERO });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).not.toMatch(/INSERT|UPDATE|DELETE/i);
  });

  test("HU11: debería devolver el trayecto con su conductor", async () => {
    const fila = { id: TRAYECTO, conductor_id: PASAJERO, origen: "Bello Horizonte" };
    query.mockResolvedValueOnce({ rows: [fila] });

    expect(await buscarTrayectoParaContacto({ trayectoId: TRAYECTO })).toEqual(fila);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE t.id = :id"), { id: TRAYECTO });
  });

  test("HU11: debería devolver null si el trayecto no existe", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    expect(await buscarTrayectoParaContacto({ trayectoId: TRAYECTO })).toBeNull();
  });

  test("HU11 criterios 1 y 2: debería listar solo los pasajeros con reserva confirmada", async () => {
    const filas = [{ reserva_id: RESERVA, nombre: "Mariana Gómez", whatsapp: "+573009998877" }];
    query.mockResolvedValueOnce({ rows: filas });

    const pasajeros = await listarPasajerosConfirmados({ trayectoId: TRAYECTO });

    expect(pasajeros).toEqual(filas);
    const [sql, binds] = query.mock.calls[0];
    expect(sql).toContain("r.estado = :estado");
    expect(binds).toEqual({ trayecto_id: TRAYECTO, estado: "Confirmada" });
  });
});
