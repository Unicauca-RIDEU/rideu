import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { crearRequest, crearRespuestaMock } from "../helpers/http.js";

const buscarUsuarioPorSesion = jest.fn();

jest.unstable_mockModule("../../src/models/sesion.js", () => ({
  buscarUsuarioPorSesion,
}));

const { requiereSesion } = await import("../../src/middleware/requiereSesion.js");

describe("middleware requiereSesion", () => {
  beforeEach(() => {
    buscarUsuarioPorSesion.mockReset();
  });

  test("debería responder 401 si no hay encabezado Authorization Bearer", async () => {
    // Arrange
    const res = crearRespuestaMock();
    const next = jest.fn();

    // Act
    await requiereSesion(crearRequest({}, {}), res, next);

    // Assert
    expect(res.statusCode).toBe(401);
    expect(res.cuerpo.mensaje).toMatch(/iniciar sesión/);
    expect(next).not.toHaveBeenCalled();
  });

  test("debería rechazar el esquema Basic y exigir Bearer", async () => {
    // Arrange — criterio: solo Authorization: Bearer <token> es válido
    buscarUsuarioPorSesion.mockResolvedValue({
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
    });
    const res = crearRespuestaMock();
    const next = jest.fn();

    // Act
    await requiereSesion(
      crearRequest({}, { Authorization: "Basic token-que-parece-sesion" }),
      res,
      next,
    );

    // Assert
    expect(res.statusCode).toBe(401);
    expect(buscarUsuarioPorSesion).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  test("debería responder 401 si el token de sesión no es válido", async () => {
    // Arrange
    buscarUsuarioPorSesion.mockResolvedValue(null);
    const res = crearRespuestaMock();
    const next = jest.fn();

    // Act
    await requiereSesion(
      crearRequest({}, { Authorization: "Bearer token-malo" }),
      res,
      next,
    );

    // Assert
    expect(res.statusCode).toBe(401);
    expect(res.cuerpo.mensaje).toMatch(/no es válida|expiró/);
    expect(next).not.toHaveBeenCalled();
  });

  test("debería adjuntar el usuario y continuar si la sesión es válida", async () => {
    // Arrange
    const usuario = { id: "u1", nombre: "Ana", correo: "ana@unicauca.edu.co" };
    buscarUsuarioPorSesion.mockResolvedValue(usuario);
    const req = crearRequest({}, { Authorization: "Bearer token-bueno" });
    const res = crearRespuestaMock();
    const next = jest.fn();

    // Act
    await requiereSesion(req, res, next);

    // Assert
    expect(req.usuario).toEqual(usuario);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(0);
  });

  test("debería responder 500 si falla la consulta de sesión", async () => {
    // Arrange
    buscarUsuarioPorSesion.mockRejectedValue(new Error("DB caída"));
    const res = crearRespuestaMock();
    const next = jest.fn();

    // Act
    await requiereSesion(
      crearRequest({}, { Authorization: "Bearer token" }),
      res,
      next,
    );

    // Assert
    expect(res.statusCode).toBe(500);
    expect(next).not.toHaveBeenCalled();
  });
});
