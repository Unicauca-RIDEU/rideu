import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";

const buscarPorCorreo = jest.fn();
const crearUsuario = jest.fn();
const eliminarUsuario = jest.fn();
const verificarCuenta = jest.fn();
const buscarCredencialesPorCorreo = jest.fn();
const crearTokenVerificacion = jest.fn();
const crearSesion = jest.fn();
const buscarUsuarioPorSesion = jest.fn();
const enviarCorreoVerificacion = jest.fn();
const bcryptHash = jest.fn();
const bcryptCompare = jest.fn();
const bcryptHashSync = jest.fn(() => "$2a$10$ausente");

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query: jest.fn() },
}));

jest.unstable_mockModule("../../src/models/usuario.js", () => ({
  ESTADO_VERIFICADA: "Verificada",
  ESTADO_SIN_VERIFICAR: "Sin verificar",
  buscarPorCorreo,
  crearUsuario,
  eliminarUsuario,
  verificarCuenta,
  buscarCredencialesPorCorreo,
  crearTokenVerificacion,
  hashToken: (t) => `hash:${t}`,
}));

jest.unstable_mockModule("../../src/models/sesion.js", () => ({
  crearSesion,
  buscarUsuarioPorSesion,
}));

jest.unstable_mockModule("../../src/services/correo.js", () => ({
  enviarCorreoVerificacion,
}));

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    hash: bcryptHash,
    compare: bcryptCompare,
    hashSync: bcryptHashSync,
  },
}));

const { createApp } = await import("../../src/app.js");

const registroValido = {
  nombre: "Ana Pérez",
  correo: "ana.perez@unicauca.edu.co",
  contrasena: "secreta12",
  whatsapp: "3001234567",
};

describe("rutas /api/auth (Supertest)", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
    buscarPorCorreo.mockResolvedValue(null);
    bcryptHash.mockResolvedValue("hash");
    crearTokenVerificacion.mockReturnValue({
      token: "tok",
      tokenHash: "tok-hash",
      expira: new Date("2030-01-01"),
    });
    crearUsuario.mockResolvedValue({
      id: "u1",
      nombre: "Ana Pérez",
      correo: "ana.perez@unicauca.edu.co",
      estado: "Sin verificar",
    });
    enviarCorreoVerificacion.mockResolvedValue({ enlace: "http://x" });
  });

  test("POST /registro debería responder 201 al registrar correctamente", async () => {
    // Arrange / Act
    const respuesta = await request(app).post("/api/auth/registro").send(registroValido);

    // Assert
    expect(respuesta.status).toBe(201);
    expect(respuesta.body.usuario.correo).toBe("ana.perez@unicauca.edu.co");
  });

  test("POST /registro debería usar código 201 y no 200 en el alta exitosa", async () => {
    // Arrange / Act — criterio CU-13: Created
    const respuesta = await request(app).post("/api/auth/registro").send(registroValido);

    // Assert
    expect(respuesta.status).toBe(201);
    expect(respuesta.status).not.toBe(200);
  });

  test("POST /registro debería responder 400 si el correo no es institucional", async () => {
    // Arrange / Act
    const respuesta = await request(app)
      .post("/api/auth/registro")
      .send({ ...registroValido, correo: "ana@gmail.com" });

    // Assert
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toMatch(/institucional/);
  });

  test("POST /registro debería responder 409 si el correo ya está registrado", async () => {
    // Arrange
    buscarPorCorreo.mockResolvedValue({ id: "u0" });

    // Act
    const respuesta = await request(app).post("/api/auth/registro").send(registroValido);

    // Assert
    expect(respuesta.status).toBe(409);
  });

  test("POST /verificacion debería responder 200 con token válido", async () => {
    // Arrange
    verificarCuenta.mockResolvedValue({
      ok: true,
      usuario: { id: "u1", correo: "ana@unicauca.edu.co", estado: "Verificada" },
    });

    // Act
    const respuesta = await request(app)
      .post("/api/auth/verificacion")
      .send({ token: "tok" });

    // Assert
    expect(respuesta.status).toBe(200);
  });

  test("POST /login debería responder 401 con credenciales inválidas", async () => {
    // Arrange
    buscarCredencialesPorCorreo.mockResolvedValue(null);
    bcryptCompare.mockResolvedValue(false);

    // Act
    const respuesta = await request(app)
      .post("/api/auth/login")
      .send({ correo: "ana@unicauca.edu.co", contrasena: "mala" });

    // Assert
    expect(respuesta.status).toBe(401);
  });

  test("POST /login debería responder 403 si el correo no está verificado", async () => {
    // Arrange
    buscarCredencialesPorCorreo.mockResolvedValue({
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      estado: "Sin verificar",
      contrasena_hash: "hash",
    });
    bcryptCompare.mockResolvedValue(true);

    // Act
    const respuesta = await request(app)
      .post("/api/auth/login")
      .send({ correo: "ana@unicauca.edu.co", contrasena: "secreta12" });

    // Assert
    expect(respuesta.status).toBe(403);
    expect(respuesta.body.codigo).toBe("EMAIL_NOT_VERIFIED");
  });

  test("POST /login debería responder 200 y devolver token de sesión", async () => {
    // Arrange
    buscarCredencialesPorCorreo.mockResolvedValue({
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      estado: "Verificada",
      contrasena_hash: "hash",
    });
    bcryptCompare.mockResolvedValue(true);
    crearSesion.mockResolvedValue({ token: "sesion", expira: new Date("2030-01-01") });

    // Act
    const respuesta = await request(app)
      .post("/api/auth/login")
      .send({ correo: "ana@unicauca.edu.co", contrasena: "secreta12" });

    // Assert
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.token).toBe("sesion");
  });

  test("GET /sesion debería responder 401 sin Bearer token", async () => {
    // Arrange / Act
    const respuesta = await request(app).get("/api/auth/sesion");

    // Assert
    expect(respuesta.status).toBe(401);
  });

  test("GET /sesion debería responder 200 con sesión válida", async () => {
    // Arrange
    buscarUsuarioPorSesion.mockResolvedValue({
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      estado: "Verificada",
    });

    // Act
    const respuesta = await request(app)
      .get("/api/auth/sesion")
      .set("Authorization", "Bearer sesion-ok");

    // Assert
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario.correo).toBe("ana@unicauca.edu.co");
  });

  test("debería responder 400 si el cuerpo no es JSON válido", async () => {
    // Arrange / Act
    const respuesta = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{mal");

    // Assert
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.mensaje).toMatch(/JSON/);
  });
});
