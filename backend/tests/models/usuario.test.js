import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { SALIDA } from "../helpers/database.js";

const query = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query },
  SALIDA,
}));

const {
  hashToken,
  crearTokenVerificacion,
  buscarPorCorreo,
  buscarCredencialesPorCorreo,
  crearUsuario,
  eliminarUsuario,
  verificarCuenta,
  ESTADO_SIN_VERIFICAR,
  ESTADO_VERIFICADA,
} = await import("../../src/models/usuario.js");

describe("modelo usuario", () => {
  beforeEach(() => {
    query.mockReset();
  });

  test("debería hashear el token con SHA-256 en hexadecimal", () => {
    // Arrange / Act
    const hash = hashToken("abc");

    // Assert
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashToken("abc"));
    expect(hash).not.toBe(hashToken("abd"));
  });

  test("debería crear un token de verificación opaco con expiración futura", () => {
    // Arrange
    const antes = Date.now();

    // Act
    const { token, tokenHash, expira } = crearTokenVerificacion();

    // Assert
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).toBe(hashToken(token));
    expect(expira.getTime()).toBeGreaterThan(antes);
    expect(expira.getTime()).toBeLessThanOrEqual(antes + 24 * 60 * 60 * 1000 + 1000);
  });

  test("debería devolver null si el correo no existe", async () => {
    // Arrange
    query.mockResolvedValueOnce({ rows: [] });

    // Act
    const usuario = await buscarPorCorreo("nadie@unicauca.edu.co");

    // Assert
    expect(usuario).toBeNull();
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE correo = :correo"), {
      correo: "nadie@unicauca.edu.co",
    });
  });

  test("debería devolver credenciales cuando el correo existe", async () => {
    // Arrange
    const fila = {
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      estado: ESTADO_VERIFICADA,
      contrasena_hash: "$2a$04$hash",
    };
    query.mockResolvedValueOnce({ rows: [fila] });

    // Act
    const usuario = await buscarCredencialesPorCorreo(fila.correo);

    // Assert
    expect(usuario).toEqual(fila);
  });

  test("debería insertar usuario en estado Sin verificar", async () => {
    // Arrange
    const creado = {
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      whatsapp: "+573001234567",
      estado: ESTADO_SIN_VERIFICAR,
      creado_en: new Date().toISOString(),
    };
    query.mockResolvedValueOnce({ rows: [creado] });
    const payload = {
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      contrasenaHash: "hash",
      whatsapp: "+573001234567",
      tokenHash: "th",
      tokenExpira: new Date(),
    };

    // Act
    const resultado = await crearUsuario(payload);

    // Assert
    expect(resultado).toEqual(creado);
    const parametros = query.mock.calls[0][1];
    expect(parametros.estado).toBe(ESTADO_SIN_VERIFICAR);
    // Oracle no genera el UUID: lo crea la aplicación y lo envía en el INSERT.
    expect(parametros.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(parametros).toMatchObject({
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      contrasena_hash: "hash",
      whatsapp: "+573001234567",
      token_hash: "th",
      token_expira: payload.tokenExpira,
    });
    expect(query.mock.calls[0][0]).toMatch(/RETURNING[\s\S]+INTO :r_id/);
  });

  test("debería eliminar un usuario por id", async () => {
    // Arrange
    query.mockResolvedValueOnce({ rows: [] });

    // Act
    await eliminarUsuario("u1");

    // Assert
    expect(query).toHaveBeenCalledWith("DELETE FROM usuarios WHERE id = :id", { id: "u1" });
  });

  test("debería marcar la cuenta como verificada con token válido", async () => {
    // Arrange
    const usuario = {
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      estado: ESTADO_VERIFICADA,
    };
    query.mockResolvedValueOnce({ rows: [usuario] });

    // Act
    const resultado = await verificarCuenta("token-valido");

    // Assert
    expect(resultado).toEqual({ ok: true, usuario });
    const [sql, parametros] = query.mock.calls[0];
    expect(sql).toContain("token_verificacion_expira > SYSTIMESTAMP");
    expect(parametros).toMatchObject({
      token_hash: hashToken("token-valido"),
      estado_nuevo: ESTADO_VERIFICADA,
      estado_actual: ESTADO_SIN_VERIFICAR,
    });
  });

  test("debería reportar motivo invalido cuando el token no existe", async () => {
    // Arrange
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({ rows: [] });

    // Act
    const resultado = await verificarCuenta("token-fantasma");

    // Assert
    expect(resultado).toEqual({ ok: false, motivo: "invalido" });
  });

  test("debería reportar motivo usado si la cuenta ya está verificada", async () => {
    // Arrange
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({
      rows: [{ estado: ESTADO_VERIFICADA, token_verificacion_expira: new Date() }],
    });

    // Act
    const resultado = await verificarCuenta("token-usado");

    // Assert
    expect(resultado).toEqual({ ok: false, motivo: "usado" });
  });

  test("debería reportar motivo usado si la cuenta ya pasó a «Habilitado»", async () => {
    // Arrange: la cuenta se verificó con este enlace y después registró su vehículo.
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({
      rows: [
        {
          estado: "Habilitado",
          token_verificacion_expira: new Date(Date.now() + 60 * 60 * 1000),
        },
      ],
    });

    // Act
    const resultado = await verificarCuenta("token-usado-habilitado");

    // Assert
    expect(resultado).toEqual({ ok: false, motivo: "usado" });
  });

  test("debería reportar motivo expirado si el token venció", async () => {
    // Arrange
    query.mockResolvedValueOnce({ rows: [] });
    query.mockResolvedValueOnce({
      rows: [
        {
          estado: ESTADO_SIN_VERIFICAR,
          token_verificacion_expira: new Date(Date.now() - 60_000),
        },
      ],
    });

    // Act
    const resultado = await verificarCuenta("token-vencido");

    // Assert
    expect(resultado).toEqual({ ok: false, motivo: "expirado" });
  });
});
