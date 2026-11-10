import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const query = jest.fn();
const clienteQuery = jest.fn();
const release = jest.fn();
const connect = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query, connect },
}));

const { guardarVehiculoYLicencia, buscarVehiculosPorUsuario, eliminarVehiculo } = await import(
  "../../src/models/vehiculo.js"
);
const { crearLicencia, buscarLicenciasPorUsuario, eliminarLicencia } = await import(
  "../../src/models/licencia.js"
);

const USUARIO_ID = "11111111-1111-4111-8111-111111111111";

const datos = {
  usuarioId: USUARIO_ID,
  placa: "FKU 284",
  marca: "Chevrolet",
  modelo: "Onix 2022",
  color: "Blanco",
  capacidadPasajeros: 4,
  categoriaLicencia: "B1",
  fechaVencimientoLicencia: "2099-09-15",
};

const vehiculo = { id: "v1", usuario_id: USUARIO_ID, placa: "FKU 284" };
const licencia = { id: "l1", usuario_id: USUARIO_ID, categoria: "B1" };
const habilitado = { id: USUARIO_ID, estado: "Habilitado" };

// Responde cada consulta de la transacción según su SQL.
function transaccion({ estado = "Verificada", existe = true, habilita = true } = {}) {
  clienteQuery.mockImplementation(async (sql) => {
    if (sql.includes("FOR UPDATE")) return { rows: existe ? [{ id: USUARIO_ID, estado }] : [] };
    if (sql.includes("INSERT INTO vehiculos")) return { rows: [vehiculo] };
    if (sql.includes("INSERT INTO licencias")) return { rows: [licencia] };
    if (sql.includes("UPDATE usuarios")) return { rows: habilita ? [habilitado] : [] };
    return { rows: [] };
  });
}

function sentencias() {
  return clienteQuery.mock.calls.map(([sql]) => sql.trim().split(/\s+/)[0]);
}

describe("modelo vehiculo: guardarVehiculoYLicencia", () => {
  beforeEach(() => {
    query.mockReset();
    clienteQuery.mockReset();
    release.mockReset();
    connect.mockReset();
    connect.mockResolvedValue({ query: clienteQuery, release });
  });

  test("debería guardar vehículo y licencia y habilitar la cuenta en una transacción", async () => {
    transaccion();

    const resultado = await guardarVehiculoYLicencia(datos);

    expect(resultado).toEqual({ ok: true, usuario: habilitado, vehiculo, licencia });
    expect(sentencias()).toEqual(["BEGIN", "SELECT", "INSERT", "INSERT", "UPDATE", "COMMIT"]);
    expect(clienteQuery).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO vehiculos"), [
      USUARIO_ID,
      "FKU 284",
      "Chevrolet",
      "Onix 2022",
      "Blanco",
      4,
    ]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  test("debería deshacer si la cuenta no existe", async () => {
    transaccion({ existe: false });

    const resultado = await guardarVehiculoYLicencia(datos);

    expect(resultado).toEqual({ ok: false, motivo: "usuario_inexistente" });
    expect(sentencias()).toEqual(["BEGIN", "SELECT", "ROLLBACK"]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  test("debería deshacer si la cuenta no está «Verificada»", async () => {
    transaccion({ estado: "Sin verificar" });

    const resultado = await guardarVehiculoYLicencia(datos);

    expect(resultado).toEqual({ ok: false, motivo: "no_verificada", estado: "Sin verificar" });
    expect(sentencias()).toEqual(["BEGIN", "SELECT", "ROLLBACK"]);
  });

  test("debería deshacer si no se pudo cambiar el estado a «Habilitado»", async () => {
    transaccion({ habilita: false });

    const resultado = await guardarVehiculoYLicencia(datos);

    expect(resultado).toEqual({ ok: false, motivo: "no_verificada", estado: "Verificada" });
    expect(sentencias().at(-1)).toBe("ROLLBACK");
  });

  test("debería actualizar el vehículo y la licencia de una cuenta «Habilitado»", async () => {
    const vehiculoActualizado = { ...vehiculo, placa: "ABC 123" };
    const licenciaActualizada = { ...licencia, fecha_vencimiento: "2099-09-15" };
    clienteQuery.mockImplementation(async (sql) => {
      if (sql.includes("FOR UPDATE")) {
        return { rows: [{ ...habilitado, nombre: "Mariana Gómez", correo: "mariana@unicauca.edu.co" }] };
      }
      if (sql.includes("UPDATE vehiculos")) return { rows: [vehiculoActualizado] };
      if (sql.includes("UPDATE licencias")) return { rows: [licenciaActualizada] };
      return { rows: [] };
    });

    const resultado = await guardarVehiculoYLicencia({ ...datos, placa: "ABC 123" });

    expect(resultado).toEqual({
      ok: true,
      actualizado: true,
      usuario: {
        id: USUARIO_ID,
        nombre: "Mariana Gómez",
        correo: "mariana@unicauca.edu.co",
        estado: "Habilitado",
      },
      vehiculo: vehiculoActualizado,
      licencia: licenciaActualizada,
    });
    expect(sentencias()).toEqual(["BEGIN", "SELECT", "SELECT", "UPDATE", "UPDATE", "COMMIT"]);
    // Los dos UPDATE se limitan al usuario de la sesión.
    expect(clienteQuery).toHaveBeenCalledWith(expect.stringContaining("UPDATE vehiculos"), [
      USUARIO_ID,
      "ABC 123",
      "Chevrolet",
      "Onix 2022",
      "Blanco",
      4,
    ]);
    expect(clienteQuery).toHaveBeenCalledWith(expect.stringContaining("UPDATE licencias"), [
      USUARIO_ID,
      "B1",
      "2099-09-15",
    ]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  test("debería crear el vehículo y la licencia si una cuenta «Habilitado» no los tiene", async () => {
    clienteQuery.mockImplementation(async (sql) => {
      if (sql.includes("FOR UPDATE")) return { rows: [habilitado] };
      if (sql.includes("INSERT INTO vehiculos")) return { rows: [vehiculo] };
      if (sql.includes("INSERT INTO licencias")) return { rows: [licencia] };
      return { rows: [] };
    });

    const resultado = await guardarVehiculoYLicencia(datos);

    expect(resultado.ok).toBe(true);
    expect(resultado.actualizado).toBe(true);
    expect(resultado.vehiculo).toEqual(vehiculo);
    expect(resultado.licencia).toEqual(licencia);
    expect(sentencias()).toEqual([
      "BEGIN",
      "SELECT",
      "SELECT",
      "UPDATE",
      "INSERT",
      "UPDATE",
      "INSERT",
      "COMMIT",
    ]);
  });

  test("debería rechazar una capacidad menor que los cupos de un trayecto publicado", async () => {
    clienteQuery.mockImplementation(async (sql) => {
      if (sql.includes("FOR UPDATE")) return { rows: [habilitado] };
      if (sql.includes("MAX(t.cupos)")) return { rows: [{ cupos: 4 }] };
      return { rows: [] };
    });

    const resultado = await guardarVehiculoYLicencia({ ...datos, capacidadPasajeros: 2 });

    expect(resultado).toEqual({ ok: false, motivo: "capacidad_insuficiente", cuposPublicados: 4 });
    expect(sentencias()).toEqual(["BEGIN", "SELECT", "SELECT", "ROLLBACK"]);
    expect(clienteQuery).toHaveBeenCalledWith(expect.stringContaining("MAX(t.cupos)"), [USUARIO_ID]);
    expect(release).toHaveBeenCalledTimes(1);
  });

  test.each([
    ["igual a los cupos publicados", 3],
    ["sin trayectos publicados", null],
  ])("debería aceptar la capacidad %s", async (_caso, cupos) => {
    clienteQuery.mockImplementation(async (sql) => {
      if (sql.includes("FOR UPDATE")) return { rows: [habilitado] };
      if (sql.includes("MAX(t.cupos)")) return { rows: [{ cupos }] };
      if (sql.includes("UPDATE vehiculos")) return { rows: [vehiculo] };
      if (sql.includes("UPDATE licencias")) return { rows: [licencia] };
      return { rows: [] };
    });

    const resultado = await guardarVehiculoYLicencia({ ...datos, capacidadPasajeros: 3 });

    expect(resultado.ok).toBe(true);
    expect(sentencias().at(-1)).toBe("COMMIT");
  });

  test("debería deshacer y relanzar el error si la placa actualizada ya es de otro vehículo", async () => {
    const duplicada = Object.assign(new Error("duplicada"), { code: "23505" });
    clienteQuery.mockImplementation(async (sql) => {
      if (sql.includes("FOR UPDATE")) return { rows: [habilitado] };
      if (sql.includes("UPDATE vehiculos")) throw duplicada;
      return { rows: [] };
    });

    await expect(guardarVehiculoYLicencia(datos)).rejects.toBe(duplicada);
    expect(sentencias().at(-1)).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledTimes(1);
  });

  test("debería deshacer y relanzar el error si falla un INSERT", async () => {
    const duplicada = Object.assign(new Error("duplicada"), { code: "23505" });
    transaccion();
    clienteQuery.mockImplementation(async (sql) => {
      if (sql.includes("FOR UPDATE")) return { rows: [{ id: USUARIO_ID, estado: "Verificada" }] };
      if (sql.includes("INSERT INTO vehiculos")) throw duplicada;
      return { rows: [] };
    });

    await expect(guardarVehiculoYLicencia(datos)).rejects.toBe(duplicada);
    expect(sentencias().at(-1)).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledTimes(1);
  });
});

describe("modelos vehiculo y licencia: consultas simples", () => {
  beforeEach(() => {
    query.mockReset();
  });

  test("debería listar y eliminar vehículos del usuario", async () => {
    query.mockResolvedValueOnce({ rows: [vehiculo] }).mockResolvedValueOnce({ rows: [] });

    expect(await buscarVehiculosPorUsuario(USUARIO_ID)).toEqual([vehiculo]);
    await eliminarVehiculo("v1");

    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining("FROM vehiculos"), [
      USUARIO_ID,
    ]);
    expect(query).toHaveBeenNthCalledWith(2, "DELETE FROM vehiculos WHERE id = $1", ["v1"]);
  });

  test("debería crear, listar y eliminar licencias", async () => {
    query
      .mockResolvedValueOnce({ rows: [licencia] })
      .mockResolvedValueOnce({ rows: [licencia] })
      .mockResolvedValueOnce({ rows: [] });

    const creada = await crearLicencia({
      usuarioId: USUARIO_ID,
      categoria: "B1",
      fechaVencimiento: "2099-09-15",
    });
    expect(creada).toEqual(licencia);
    expect(await buscarLicenciasPorUsuario(USUARIO_ID)).toEqual([licencia]);
    await eliminarLicencia("l1");

    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining("INSERT INTO licencias"), [
      USUARIO_ID,
      "B1",
      "2099-09-15",
    ]);
    expect(query).toHaveBeenNthCalledWith(3, "DELETE FROM licencias WHERE id = $1", ["l1"]);
  });
});
