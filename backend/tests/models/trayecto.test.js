import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const query = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query },
}));

const { crearTrayecto, buscarPerfilConductor, buscarTrayectosDisponibles, ESTADO_DISPONIBLE } = await import(
  "../../src/models/trayecto.js"
);

const datos = {
  conductorId: "11111111-1111-4111-8111-111111111111",
  vehiculoId: "22222222-2222-4222-8222-222222222222",
  sedeDestinoId: 1,
  origen: "Bello Horizonte",
  fecha: "2026-11-05",
  hora: "07:00",
  cupos: 4,
  aporteSugerido: 2500,
};

describe("modelo trayecto", () => {
  beforeEach(() => {
    query.mockReset();
  });

  test("debería crear el trayecto con estado «Disponible»", async () => {
    // Arrange
    const fila = { id: "t1", ...datos, estado: ESTADO_DISPONIBLE };
    query.mockResolvedValueOnce({ rows: [fila] });

    // Act
    const creado = await crearTrayecto(datos);

    // Assert
    expect(ESTADO_DISPONIBLE).toBe("Disponible");
    expect(creado).toEqual(fila);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO trayectos"), [
      datos.conductorId,
      datos.vehiculoId,
      datos.sedeDestinoId,
      datos.origen,
      datos.fecha,
      datos.hora,
      datos.cupos,
      datos.aporteSugerido,
      "Disponible",
    ]);
  });

  test("debería iniciar los cupos disponibles iguales a los cupos ofrecidos (HU06)", async () => {
    // Arrange
    query.mockResolvedValueOnce({ rows: [{ id: "t1" }] });

    // Act
    await crearTrayecto(datos);

    // Assert: la columna cupos_disponibles reutiliza el parámetro $7 (cupos)
    const sql = query.mock.calls[0][0];
    expect(sql).toMatch(/estado,\s*cupos_disponibles\s*\)/);
    expect(sql).toContain("VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $7)");
  });

  test("debería usar el cliente de base de datos recibido (transacción)", async () => {
    // Arrange
    const cliente = { query: jest.fn().mockResolvedValueOnce({ rows: [{ id: "t1" }] }) };

    // Act
    await crearTrayecto(datos, cliente);

    // Assert
    expect(cliente.query).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
  });

  test("debería devolver el perfil del conductor con vehículo y licencia", async () => {
    // Arrange
    const perfil = {
      id: datos.conductorId,
      nombre: "Mariana Gómez",
      estado: "Habilitado",
      vehiculo_id: datos.vehiculoId,
      capacidad_pasajeros: 4,
      licencia_vencimiento: "2029-09-15",
    };
    query.mockResolvedValueOnce({ rows: [perfil] });

    // Act
    const encontrado = await buscarPerfilConductor(datos.conductorId);

    // Assert
    expect(encontrado).toEqual(perfil);
    const [sql, parametros] = query.mock.calls[0];
    expect(sql).toContain("FROM vehiculos");
    expect(sql).toContain("FROM licencias");
    expect(parametros).toEqual([datos.conductorId]);
  });

  test("debería devolver null si el usuario no existe", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    expect(await buscarPerfilConductor("no-existe")).toBeNull();
  });

  describe("buscarTrayectosDisponibles (HU06)", () => {
    const filtros = {
      sedeDestinoId: 1,
      fecha: "2026-11-05",
      horaDesde: "06:30",
      ahoraColombia: "2026-11-04 07:00",
    };

    test("debería devolver las filas de la consulta", async () => {
      const fila = { id: "t1", hora: "06:45", cupos_disponibles: 2, conductor_nombre: "Sofía López" };
      query.mockResolvedValueOnce({ rows: [fila] });

      expect(await buscarTrayectosDisponibles(filtros)).toEqual([fila]);
    });

    test("debería filtrar por estado, sede, fecha, hora desde y momento actual", async () => {
      // Arrange
      query.mockResolvedValueOnce({ rows: [] });

      // Act
      await buscarTrayectosDisponibles(filtros);

      // Assert
      const [, parametros] = query.mock.calls[0];
      expect(parametros).toEqual(["Disponible", 1, "2026-11-05", "06:30", "2026-11-04 07:00"]);
    });

    test("criterio 3: debería excluir los trayectos sin cupos disponibles", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await buscarTrayectosDisponibles(filtros);

      expect(query.mock.calls[0][0]).toContain("t.cupos_disponibles > 0");
    });

    test("criterio 1: debería ordenar por hora de salida", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await buscarTrayectosDisponibles(filtros);

      expect(query.mock.calls[0][0]).toMatch(/ORDER BY t\.hora/);
    });

    test("debería ocultar los trayectos que ya salieron", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await buscarTrayectosDisponibles(filtros);

      expect(query.mock.calls[0][0]).toContain("(t.fecha + t.hora) > $5::timestamp");
    });

    test("debería devolver una lista vacía si no hay coincidencias", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      expect(await buscarTrayectosDisponibles(filtros)).toEqual([]);
    });
  });
});
