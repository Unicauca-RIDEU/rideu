import { describe, test, expect, jest, beforeEach } from "@jest/globals";

const query = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query },
}));

const { crearSesion, buscarUsuarioPorSesion } = await import("../../src/models/sesion.js");
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
      ["usuario-1", hashToken(token), expect.any(Date)],
    );
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
    expect(query.mock.calls[0][1][0]).toBe(hashToken("token-sesion"));
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
