import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";

const buscarUsuarioPorSesion = jest.fn();
const guardarVehiculoYLicencia = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

jest.unstable_mockModule("../../src/models/sesion.js", () => ({
  crearSesion: jest.fn(),
  buscarUsuarioPorSesion,
}));

jest.unstable_mockModule("../../src/models/vehiculo.js", () => ({
  guardarVehiculoYLicencia,
}));

const { createApp } = await import("../../src/app.js");

const usuarioSesion = {
  id: "11111111-1111-4111-8111-111111111111",
  nombre: "Mariana Gómez",
  correo: "mariana.gomez@unicauca.edu.co",
  estado: "Verificada",
};

const vehiculoValido = {
  placa: "FKU 284",
  marca: "Chevrolet",
  modelo: "Onix 2022",
  color: "Blanco",
  capacidadPasajeros: 4,
  categoriaLicencia: "B1",
  fechaVencimientoLicencia: "2099-09-15",
};

const SESION = { Authorization: "Bearer token-valido" };

describe("rutas /api/vehiculos (Supertest)", () => {
  let app;

  beforeEach(() => {
    app = createApp();
    buscarUsuarioPorSesion.mockReset();
    guardarVehiculoYLicencia.mockReset();

    buscarUsuarioPorSesion.mockImplementation(async (token) =>
      token === "token-valido" ? usuarioSesion : null,
    );
    guardarVehiculoYLicencia.mockImplementation(async (datos) => ({
      ok: true,
      usuario: { ...usuarioSesion, estado: "Habilitado" },
      vehiculo: {
        id: "22222222-2222-4222-8222-222222222222",
        usuario_id: datos.usuarioId,
        placa: datos.placa,
        marca: datos.marca,
        modelo: datos.modelo,
        color: datos.color,
        capacidad_pasajeros: datos.capacidadPasajeros,
      },
      licencia: {
        id: "33333333-3333-4333-8333-333333333333",
        usuario_id: datos.usuarioId,
        categoria: datos.categoriaLicencia,
        fecha_vencimiento: datos.fechaVencimientoLicencia,
      },
    }));
  });

  test("debería exigir sesión iniciada", async () => {
    const res = await request(app).post("/api/vehiculos").send(vehiculoValido);

    expect(res.status).toBe(401);
    expect(guardarVehiculoYLicencia).not.toHaveBeenCalled();
  });

  test("debería rechazar un token de sesión inválido", async () => {
    const res = await request(app)
      .post("/api/vehiculos")
      .set({ Authorization: "Bearer token-falso" })
      .send(vehiculoValido);

    expect(res.status).toBe(401);
    expect(guardarVehiculoYLicencia).not.toHaveBeenCalled();
  });

  test("criterio 1: debería registrar el vehículo y la licencia y habilitar la cuenta", async () => {
    const res = await request(app).post("/api/vehiculos").set(SESION).send(vehiculoValido);

    expect(res.status).toBe(201);
    expect(res.body.mensaje).toBe(
      "Vehículo y licencia registrados. Tu cuenta quedó en estado «Habilitado».",
    );
    expect(res.body.usuario.estado).toBe("Habilitado");
    expect(res.body.vehiculo).toMatchObject({ placa: "FKU 284", capacidad_pasajeros: 4 });
    expect(res.body.licencia).toMatchObject({ categoria: "B1" });
  });

  test("debería usar el usuario de la sesión e ignorar el usuarioId del cuerpo", async () => {
    const otro = "99999999-9999-4999-8999-999999999999";

    await request(app)
      .post("/api/vehiculos")
      .set(SESION)
      .send({ ...vehiculoValido, usuarioId: otro });

    expect(guardarVehiculoYLicencia).toHaveBeenCalledTimes(1);
    expect(guardarVehiculoYLicencia.mock.calls[0][0].usuarioId).toBe(usuarioSesion.id);
  });

  test("criterio 2: debería rechazar una licencia vencida sin guardar nada", async () => {
    const res = await request(app)
      .post("/api/vehiculos")
      .set(SESION)
      .send({ ...vehiculoValido, fechaVencimientoLicencia: "2000-01-01" });

    expect(res.status).toBe(400);
    expect(res.body.mensaje).toBe("La licencia no está vigente");
    expect(guardarVehiculoYLicencia).not.toHaveBeenCalled();
  });

  test("criterio 3: debería señalar campos vacíos y placa inválida sin guardar nada", async () => {
    const res = await request(app)
      .post("/api/vehiculos")
      .set(SESION)
      .send({ ...vehiculoValido, placa: "AB-12", marca: "" });

    expect(res.status).toBe(400);
    expect(res.body.errores.map((error) => error.campo).sort()).toEqual(["marca", "placa"]);
    expect(guardarVehiculoYLicencia).not.toHaveBeenCalled();
  });

  test("debería responder 404 si la cuenta de la sesión ya no existe", async () => {
    guardarVehiculoYLicencia.mockResolvedValueOnce({ ok: false, motivo: "usuario_inexistente" });

    const res = await request(app).post("/api/vehiculos").set(SESION).send(vehiculoValido);

    expect(res.status).toBe(404);
  });

  test.each([
    ["Sin verificar", "Debes verificar tu cuenta antes de registrar el vehículo y la licencia."],
    ["Otro", "Solo una cuenta en estado «Verificada» puede registrar el vehículo y la licencia."],
  ])("debería responder 403 para una cuenta en estado %p", async (estado, mensaje) => {
    guardarVehiculoYLicencia.mockResolvedValueOnce({ ok: false, motivo: "no_verificada", estado });

    const res = await request(app).post("/api/vehiculos").set(SESION).send(vehiculoValido);

    expect(res.status).toBe(403);
    expect(res.body.mensaje).toBe(mensaje);
  });

  test("debería responder 200 al actualizar el vehículo y la licencia de una cuenta «Habilitado»", async () => {
    guardarVehiculoYLicencia.mockResolvedValueOnce({
      ok: true,
      actualizado: true,
      usuario: { ...usuarioSesion, estado: "Habilitado" },
      vehiculo: { id: "v1", placa: "FKU 284" },
      licencia: { id: "l1", categoria: "B1" },
    });

    const res = await request(app).post("/api/vehiculos").set(SESION).send(vehiculoValido);

    expect(res.status).toBe(200);
    expect(res.body.mensaje).toBe(
      "Vehículo y licencia actualizados. Tu cuenta sigue en estado «Habilitado».",
    );
    expect(res.body.usuario.estado).toBe("Habilitado");
  });

  test("debería responder 409 si la placa ya está registrada", async () => {
    guardarVehiculoYLicencia.mockRejectedValueOnce(
      Object.assign(new Error("duplicada"), {
        code: "23505",
        constraint: "vehiculos_placa_unica",
      }),
    );

    const res = await request(app).post("/api/vehiculos").set(SESION).send(vehiculoValido);

    expect(res.status).toBe(409);
    expect(res.body.mensaje).toBe("Ya existe un vehículo con esta placa.");
  });

  test("debería responder 500 ante un error inesperado", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    guardarVehiculoYLicencia.mockRejectedValueOnce(new Error("se cayó la base"));

    const res = await request(app).post("/api/vehiculos").set(SESION).send(vehiculoValido);

    expect(res.status).toBe(500);
    expect(res.body.mensaje).toBe("No se pudo registrar el vehículo y la licencia.");
  });
});
