import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { SALIDA } from "../helpers/database.js";

const query = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query },
  SALIDA,
}));

const {
  crearTrayecto,
  buscarPerfilConductor,
  buscarTrayectosDisponibles,
  existeTrayectoEnHorario,
  listarTrayectosDeConductor,
  ESTADO_DISPONIBLE,
} = await import(
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
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO trayectos"),
      expect.objectContaining({
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        conductor_id: datos.conductorId,
        vehiculo_id: datos.vehiculoId,
        sede_destino_id: datos.sedeDestinoId,
        origen: datos.origen,
        fecha: datos.fecha,
        hora: datos.hora,
        cupos: datos.cupos,
        aporte_sugerido: datos.aporteSugerido,
        estado: "Disponible",
      }),
    );
  });

  test("debería iniciar los cupos disponibles iguales a los cupos ofrecidos (HU06)", async () => {
    // Arrange
    query.mockResolvedValueOnce({ rows: [{ id: "t1" }] });

    // Act
    await crearTrayecto(datos);

    // Assert: la columna cupos_disponibles reutiliza el parámetro :cupos
    const sql = query.mock.calls[0][0];
    expect(sql).toMatch(/estado,\s*cupos_disponibles\s*\)/);
    expect(sql).toMatch(/:cupos,\s*:aporte_sugerido,\s*:estado,\s*:cupos\s*\)/);
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

  test("debería detectar un trayecto «Disponible» del conductor en la misma fecha y hora", async () => {
    query.mockResolvedValueOnce({ rows: [{ existe: 1 }] });

    const existe = await existeTrayectoEnHorario({
      conductorId: "conductor-1",
      fecha: "2030-05-20",
      hora: "07:00",
    });

    expect(existe).toBe(true);
    const [sql, parametros] = query.mock.calls[0];
    expect(sql).toContain("FROM trayectos");
    expect(parametros).toEqual({
      conductor_id: "conductor-1",
      fecha: "2030-05-20",
      hora: "07:00",
      estado: ESTADO_DISPONIBLE,
    });
  });

  test("debería indicar que no hay trayecto en ese horario", async () => {
    query.mockResolvedValueOnce({ rows: [{ existe: 0 }] });

    const existe = await existeTrayectoEnHorario({
      conductorId: "conductor-1",
      fecha: "2030-05-20",
      hora: "09:00",
    });

    expect(existe).toBe(false);
  });

  describe("listarTrayectosDeConductor (HU09)", () => {
    const filtros = { conductorId: "conductor-1", ahoraColombia: "2026-11-10 09:00" };

    test("criterio 1: debería listar solo los trayectos del conductor, del más reciente al más antiguo", async () => {
      const filas = [{ id: "t2" }, { id: "t1" }];
      query.mockResolvedValueOnce({ rows: filas });

      const trayectos = await listarTrayectosDeConductor(filtros);

      expect(trayectos).toEqual(filas);
      const [sql, parametros] = query.mock.calls[0];
      expect(sql).toContain("WHERE t.conductor_id = :conductor_id");
      expect(sql).toContain("ORDER BY t.fecha DESC, t.hora DESC");
      expect(parametros).toEqual({
        conductor_id: "conductor-1",
        ahora_colombia: "2026-11-10 09:00",
      });
    });

    test("criterio 1: debería marcar «Completado» el trayecto cuya salida ya pasó y «Pendiente» el resto", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      await listarTrayectosDeConductor(filtros);

      const [sql] = query.mock.calls[0];
      expect(sql).toMatch(
        /t\.hora, 'YYYY-MM-DD HH24:MI'\) <= TO_DATE\(:ahora_colombia, 'YYYY-MM-DD HH24:MI'\)\s+THEN 'Completado'/,
      );
      expect(sql).toContain("ELSE 'Pendiente'");
      expect(sql).toContain("AS estado_historial");
    });

    test("criterio 2: debería devolver una lista vacía si el conductor no ha publicado trayectos", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      expect(await listarTrayectosDeConductor(filtros)).toEqual([]);
    });
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
    expect(parametros).toEqual({ id: datos.conductorId });
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
      expect(parametros).toEqual({
        estado: "Disponible",
        sede_destino_id: 1,
        fecha: "2026-11-05",
        hora_desde: "06:30",
        ahora_colombia: "2026-11-04 07:00",
      });
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

      expect(query.mock.calls[0][0]).toContain(
        "t.hora, 'YYYY-MM-DD HH24:MI') > TO_DATE(:ahora_colombia, 'YYYY-MM-DD HH24:MI')",
      );
    });

    test("debería devolver una lista vacía si no hay coincidencias", async () => {
      query.mockResolvedValueOnce({ rows: [] });

      expect(await buscarTrayectosDisponibles(filtros)).toEqual([]);
    });
  });
});
