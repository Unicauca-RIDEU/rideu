import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { SALIDA } from "../helpers/database.js";

const query = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query },
  SALIDA,
}));

const { crearSesion, buscarUsuarioPorSesion, eliminarSesion } = await import(
  "../../src/models/sesion.js"
);
const { hashToken } = await import("../../src/models/usuario.js");

describe("modelo sesion", () => {
  beforeEach(() => {
    query.mockReset();
  });

  test("debería crear una sesión con token opaco y expiración a 7 días", async () => {
    // Arrange
    query.mockResolvedValueOnce({ rows: [] });
    const antes = Date.now();

    // Act
    const { token, expira } = await crearSesion("usuario-1");

    // Assert
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(expira.getTime()).toBeGreaterThan(antes + 6 * 24 * 60 * 60 * 1000);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO sesiones"),
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        usuario_id: "usuario-1",
        token_hash: hashToken(token),
        expira: expect.any(Date),
      },
    );
  });

  test("debería borrar las sesiones vencidas del usuario al crear una nueva", async () => {
    query.mockResolvedValue({ rows: [] });

    await crearSesion("usuario-1");

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM sesiones"),
      { usuario_id: "usuario-1" },
    );
    expect(query.mock.calls[0][0]).toContain("expira <= SYSTIMESTAMP");
  });

  test("debería crear la sesión aunque falle el borrado de las vencidas", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    query.mockRejectedValueOnce(new Error("sin conexión"));
    query.mockResolvedValueOnce({ rows: [] });

    const { token } = await crearSesion("usuario-1");

    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(query.mock.calls[1][0]).toContain("INSERT INTO sesiones");
  });

  test("debería eliminar la sesión por el hash de su token", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await eliminarSesion("token-sesion");

    expect(query).toHaveBeenCalledWith(expect.stringContaining("DELETE FROM sesiones"), {
      token_hash: hashToken("token-sesion"),
    });
  });

  test("debería devolver el usuario si el token de sesión es válido", async () => {
    // Arrange
    const usuario = {
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      estado: "Verificada",
    };
    query.mockResolvedValueOnce({ rows: [usuario] });

    // Act
    const encontrado = await buscarUsuarioPorSesion("token-sesion");

    // Assert
    expect(encontrado).toEqual(usuario);
    expect(query.mock.calls[0][1]).toEqual({ token_hash: hashToken("token-sesion") });
    expect(query.mock.calls[0][0]).toContain("s.expira > SYSTIMESTAMP");
  });

  test("debería devolver null si el token de sesión no existe o expiró", async () => {
    // Arrange
    query.mockResolvedValueOnce({ rows: [] });

    // Act
    const encontrado = await buscarUsuarioPorSesion("token-invalido");

    // Assert
    expect(encontrado).toBeNull();
  });
});
