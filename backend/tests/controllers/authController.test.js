import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { crearRequest, crearRespuestaMock } from "../helpers/http.js";

const buscarPorCorreo = jest.fn();
const crearUsuario = jest.fn();
const eliminarUsuario = jest.fn();
const verificarCuenta = jest.fn();
const buscarCredencialesPorCorreo = jest.fn();
const crearTokenVerificacion = jest.fn();
const crearSesion = jest.fn();
const enviarCorreoVerificacion = jest.fn();
const validarRegistro = jest.fn();
const bcryptHash = jest.fn();
const bcryptCompare = jest.fn();
const bcryptHashSync = jest.fn(() => "$2a$10$ausente");

jest.unstable_mockModule("../../src/validation/registro.js", () => ({
  validarRegistro,
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
}));

jest.unstable_mockModule("../../src/models/sesion.js", () => ({
  crearSesion,
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

const { registrar, verificar, iniciarSesion, sesionActual } = await import(
  "../../src/controllers/authController.js"
);

const datosValidos = {
  nombre: "Ana Pérez",
  correo: "ana.perez@unicauca.edu.co",
  contrasena: "secreta12",
  whatsapp: "+573001234567",
};

describe("authController.registrar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validarRegistro.mockReturnValue({ ok: true, datos: datosValidos });
    buscarPorCorreo.mockResolvedValue(null);
    bcryptHash.mockResolvedValue("hash-seguro");
    crearTokenVerificacion.mockReturnValue({
      token: "tok",
      tokenHash: "tok-hash",
      expira: new Date("2030-01-01"),
    });
    crearUsuario.mockResolvedValue({
      id: "u1",
      nombre: datosValidos.nombre,
      correo: datosValidos.correo,
      estado: "Sin verificar",
    });
    enviarCorreoVerificacion.mockResolvedValue({ enlace: "http://x" });
  });

  test("debería responder 400 si la validación falla", async () => {
    // Arrange
    validarRegistro.mockReturnValue({
      ok: false,
      mensaje: "Solo se permite el correo institucional @unicauca.edu.co.",
      errores: [{ campo: "correo", mensaje: "Solo se permite el correo institucional @unicauca.edu.co." }],
    });
    const res = crearRespuestaMock();

    // Act
    await registrar(crearRequest({ correo: "a@gmail.com" }), res);

    // Assert
    expect(res.statusCode).toBe(400);
    expect(res.cuerpo.mensaje).toMatch(/institucional/);
    expect(crearUsuario).not.toHaveBeenCalled();
  });

  test("debería responder 409 si el correo ya existe", async () => {
    // Arrange
    buscarPorCorreo.mockResolvedValue({ id: "u0" });
    const res = crearRespuestaMock();

    // Act
    await registrar(crearRequest(datosValidos), res);

    // Assert
    expect(res.statusCode).toBe(409);
    expect(res.cuerpo.mensaje).toMatch(/Ya existe/);
  });

  test("debería crear la cuenta y responder 201 en el caso feliz", async () => {
    // Arrange
    const res = crearRespuestaMock();

    // Act
    await registrar(crearRequest(datosValidos), res);

    // Assert
    expect(bcryptHash).toHaveBeenCalledWith("secreta12", 10);
    expect(enviarCorreoVerificacion).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.cuerpo.usuario.correo).toBe(datosValidos.correo);
  });

  test("debería responder 500 y deshacer el usuario si falla el correo", async () => {
    // Arrange
    enviarCorreoVerificacion.mockRejectedValue(new Error("SMTP caído"));
    eliminarUsuario.mockResolvedValue(undefined);
    const res = crearRespuestaMock();

    // Act
    await registrar(crearRequest(datosValidos), res);

    // Assert
    expect(eliminarUsuario).toHaveBeenCalledWith("u1");
    expect(res.statusCode).toBe(500);
  });

  test("debería responder 409 ante violación de unicidad en base de datos", async () => {
    // Arrange
    crearUsuario.mockRejectedValue({ code: "23505" });
    const res = crearRespuestaMock();

    // Act
    await registrar(crearRequest(datosValidos), res);

    // Assert
    expect(res.statusCode).toBe(409);
  });
});

describe("authController.verificar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("debería responder 400 si el token está vacío", async () => {
    // Arrange
    const res = crearRespuestaMock();

    // Act
    await verificar(crearRequest({ token: "   " }), res);

    // Assert
    expect(res.statusCode).toBe(400);
    expect(res.cuerpo.mensaje).toMatch(/obligatorio/);
  });

  test("debería responder 200 cuando la verificación es exitosa", async () => {
    // Arrange
    verificarCuenta.mockResolvedValue({
      ok: true,
      usuario: { id: "u1", correo: "ana@unicauca.edu.co", estado: "Verificada" },
    });
    const res = crearRespuestaMock();

    // Act
    await verificar(crearRequest({ token: "tok" }), res);

    // Assert
    expect(res.statusCode).toBe(200);
    expect(res.cuerpo.usuario.estado).toBe("Verificada");
  });

  test("debería responder 409 si el enlace ya fue usado", async () => {
    // Arrange
    verificarCuenta.mockResolvedValue({ ok: false, motivo: "usado" });
    const res = crearRespuestaMock();

    // Act
    await verificar(crearRequest({ token: "tok" }), res);

    // Assert
    expect(res.statusCode).toBe(409);
  });

  test("debería responder 400 si el enlace expiró", async () => {
    // Arrange
    verificarCuenta.mockResolvedValue({ ok: false, motivo: "expirado" });
    const res = crearRespuestaMock();

    // Act
    await verificar(crearRequest({ token: "tok" }), res);

    // Assert
    expect(res.statusCode).toBe(400);
    expect(res.cuerpo.mensaje).toMatch(/expiró/);
  });

  test("debería responder 400 si el enlace no es válido", async () => {
    // Arrange
    verificarCuenta.mockResolvedValue({ ok: false, motivo: "invalido" });
    const res = crearRespuestaMock();

    // Act
    await verificar(crearRequest({ token: "tok" }), res);

    // Assert
    expect(res.statusCode).toBe(400);
  });
});

describe("authController.iniciarSesion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("debería responder 400 si faltan correo o contraseña", async () => {
    // Arrange
    const res = crearRespuestaMock();

    // Act
    await iniciarSesion(crearRequest({ correo: "", contrasena: "" }), res);

    // Assert
    expect(res.statusCode).toBe(400);
  });

  test("debería responder 401 con el mismo mensaje si el correo no existe", async () => {
    // Arrange
    buscarCredencialesPorCorreo.mockResolvedValue(null);
    bcryptCompare.mockResolvedValue(false);
    const res = crearRespuestaMock();

    // Act
    await iniciarSesion(
      crearRequest({ correo: "nadie@unicauca.edu.co", contrasena: "secreta12" }),
      res,
    );

    // Assert
    expect(res.statusCode).toBe(401);
    expect(res.cuerpo.mensaje).toBe("Correo o contraseña incorrectos");
  });

  test("debería responder 401 si la contraseña no coincide", async () => {
    // Arrange
    buscarCredencialesPorCorreo.mockResolvedValue({
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      estado: "Verificada",
      contrasena_hash: "hash",
    });
    bcryptCompare.mockResolvedValue(false);
    const res = crearRespuestaMock();

    // Act
    await iniciarSesion(
      crearRequest({ correo: "ana@unicauca.edu.co", contrasena: "mala" }),
      res,
    );

    // Assert
    expect(res.statusCode).toBe(401);
    expect(res.cuerpo.mensaje).toBe("Correo o contraseña incorrectos");
    expect(crearSesion).not.toHaveBeenCalled();
  });

  test("debería normalizar el correo a minúsculas antes de buscar credenciales", async () => {
    // Arrange
    buscarCredencialesPorCorreo.mockResolvedValue({
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      estado: "Verificada",
      contrasena_hash: "hash",
    });
    bcryptCompare.mockResolvedValue(true);
    crearSesion.mockResolvedValue({ token: "t", expira: new Date("2030-01-01") });
    const res = crearRespuestaMock();

    // Act
    await iniciarSesion(
      crearRequest({ correo: "Ana.Perez@Unicauca.edu.co", contrasena: "secreta12" }),
      res,
    );

    // Assert
    expect(buscarCredencialesPorCorreo).toHaveBeenCalledWith("ana.perez@unicauca.edu.co");
    expect(res.statusCode).toBe(200);
  });

  test("debería responder 403 si el correo no está verificado", async () => {
    // Arrange
    buscarCredencialesPorCorreo.mockResolvedValue({
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      estado: "Sin verificar",
      contrasena_hash: "hash",
    });
    bcryptCompare.mockResolvedValue(true);
    const res = crearRespuestaMock();

    // Act
    await iniciarSesion(
      crearRequest({ correo: "ana@unicauca.edu.co", contrasena: "secreta12" }),
      res,
    );

    // Assert
    expect(res.statusCode).toBe(403);
    expect(res.cuerpo.codigo).toBe("EMAIL_NOT_VERIFIED");
    expect(crearSesion).not.toHaveBeenCalled();
  });

  test("debería responder 200 y devolver token en el caso feliz", async () => {
    // Arrange
    buscarCredencialesPorCorreo.mockResolvedValue({
      id: "u1",
      nombre: "Ana",
      correo: "ana@unicauca.edu.co",
      estado: "Verificada",
      contrasena_hash: "hash",
    });
    bcryptCompare.mockResolvedValue(true);
    crearSesion.mockResolvedValue({
      token: "sesion-token",
      expira: new Date("2030-01-01"),
    });
    const res = crearRespuestaMock();

    // Act
    await iniciarSesion(
      crearRequest({ correo: " Ana@Unicauca.edu.co ", contrasena: "secreta12" }),
      res,
    );

    // Assert
    expect(buscarCredencialesPorCorreo).toHaveBeenCalledWith("ana@unicauca.edu.co");
    expect(res.statusCode).toBe(200);
    expect(res.cuerpo.token).toBe("sesion-token");
    expect(res.cuerpo.usuario.id).toBe("u1");
  });
});

describe("authController.sesionActual", () => {
  test("debería responder 200 con el usuario de la petición", () => {
    // Arrange
    const res = crearRespuestaMock();
    const req = { usuario: { id: "u1", correo: "ana@unicauca.edu.co" } };

    // Act
    sesionActual(req, res);

    // Assert
    expect(res.statusCode).toBe(200);
    expect(res.cuerpo.usuario.id).toBe("u1");
  });
});
