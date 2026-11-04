import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const query = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query },
}));

const { listarSedes, buscarSedePorId } = await import("../../src/models/sede.js");

const sede = {
  id: 1,
  nombre: "Facultad de Ingeniería Electrónica y Telecomunicaciones",
  direccion: "Calle 5 No. 4-70, sector Tulcán",
  ciudad: "Popayán",
};

describe("modelo sede", () => {
  beforeEach(() => {
    query.mockReset();
  });

  test("debería listar las sedes ordenadas por id", async () => {
    query.mockResolvedValueOnce({ rows: [sede] });

    const sedes = await listarSedes();

    expect(sedes).toEqual([sede]);
    expect(query.mock.calls[0][0]).toContain("ORDER BY id");
  });

  test("debería buscar una sede por id", async () => {
    query.mockResolvedValueOnce({ rows: [sede] });

    expect(await buscarSedePorId(1)).toEqual(sede);
    expect(query.mock.calls[0][1]).toEqual([1]);
  });

  test("debería devolver null si la sede no existe", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    expect(await buscarSedePorId(99)).toBeNull();
  });
});
