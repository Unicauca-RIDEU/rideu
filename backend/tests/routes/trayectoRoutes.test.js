import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";

const buscarUsuarioPorSesion = jest.fn();
const buscarPerfilConductor = jest.fn();
const crearTrayecto = jest.fn();
const buscarSedePorId = jest.fn();
const listarSedes = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

jest.unstable_mockModule("../../src/models/sesion.js", () => ({
  crearSesion: jest.fn(),
  buscarUsuarioPorSesion,
}));

jest.unstable_mockModule("../../src/models/trayecto.js", () => ({
  ESTADO_DISPONIBLE: "Disponible",
  buscarPerfilConductor,
  crearTrayecto,
}));

jest.unstable_mockModule("../../src/models/sede.js", () => ({
  buscarSedePorId,
  listarSedes,
}));

const { createApp } = await import("../../src/app.js");
const { fechaEnColombia } = await import("../../src/validation/trayecto.js");

const UN_DIA = 24 * 60 * 60 * 1000;
const manana = fechaEnColombia(new Date(Date.now() + UN_DIA));
const ayer = fechaEnColombia(new Date(Date.now() - UN_DIA));

const usuarioSesion = {
  id: "11111111-1111-4111-8111-111111111111",
  nombre: "Mariana Gómez",
  correo: "mariana.gomez@unicauca.edu.co",
  estado: "Habilitado",
};

const perfilHabilitado = {
  id: usuarioSesion.id,
  nombre: usuarioSesion.nombre,
  estado: "Habilitado",
  vehiculo_id: "22222222-2222-4222-8222-222222222222",
  placa: "FKU 284",
  marca: "Chevrolet",
  modelo: "Onix",
  color: "Blanco",
  capacidad_pasajeros: 4,
  licencia_categoria: "B1",
  licencia_vencimiento: "2099-09-15",
};

const sede = { id: 1, nombre: "Facultad de Ingeniería Civil", direccion: "Tulcán", ciudad: "Popayán" };

const trayectoValido = {
  origen: "Bello Horizonte",
  sedeDestinoId: 1,
  fecha: manana,
  hora: "07:00",
  cupos: 4,
  aporteSugerido: 2500,
};

const SESION = { Authorization: "Bearer token-valido" };

describe("rutas /api/trayectos (Supertest)", () => {
  let app;

  beforeEach(() => {
    app = createApp();
    buscarUsuarioPorSesion.mockReset();
    buscarPerfilConductor.mockReset();
    crearTrayecto.mockReset();
    buscarSedePorId.mockReset();
    listarSedes.mockReset();

    buscarUsuarioPorSesion.mockImplementation(async (token) =>
      token === "token-valido" ? usuarioSesion : null,
    );
    buscarPerfilConductor.mockResolvedValue(perfilHabilitado);
    buscarSedePorId.mockResolvedValue(sede);
    listarSedes.mockResolvedValue([sede]);
    crearTrayecto.mockImplementation(async (datos) => ({
      id: "33333333-3333-4333-8333-333333333333",
      conductor_id: datos.conductorId,
      vehiculo_id: datos.vehiculoId,
      sede_destino_id: datos.sedeDestinoId,
      origen: datos.origen,
      fecha: datos.fecha,
      hora: datos.hora,
      cupos: datos.cupos,
      aporte_sugerido: datos.aporteSugerido,
      estado: "Disponible",
    }));
  });

  describe("POST /api/trayectos", () => {
    test("debería exigir sesión iniciada", async () => {
      const res = await request(app).post("/api/trayectos").send(trayectoValido);

      expect(res.status).toBe(401);
      expect(crearTrayecto).not.toHaveBeenCalled();
    });

    test("debería rechazar un token de sesión inválido", async () => {
      const res = await request(app)
        .post("/api/trayectos")
        .set({ Authorization: "Bearer token-falso" })
        .send(trayectoValido);

      expect(res.status).toBe(401);
      expect(crearTrayecto).not.toHaveBeenCalled();
    });

    test("criterio 1 y 2: debería crear el trayecto en estado «Disponible»", async () => {
      // Act
      const res = await request(app).post("/api/trayectos").set(SESION).send(trayectoValido);

      // Assert
      expect(res.status).toBe(201);
      expect(res.body.mensaje).toBe("Trayecto publicado. Ya está disponible para los pasajeros.");
      expect(res.body.trayecto).toMatchObject({
        origen: "Bello Horizonte",
        sede_destino_id: 1,
        sede_destino: "Facultad de Ingeniería Civil",
        fecha: manana,
        hora: "07:00",
        cupos: 4,
        aporte_sugerido: 2500,
        estado: "Disponible",
      });
      expect(crearTrayecto).toHaveBeenCalledWith({
        ...trayectoValido,
        conductorId: usuarioSesion.id,
        vehiculoId: perfilHabilitado.vehiculo_id,
      });
    });

    test("debería tomar el conductor de la sesión e ignorar el enviado por el frontend", async () => {
      // Act
      const res = await request(app)
        .post("/api/trayectos")
        .set(SESION)
        .send({
          ...trayectoValido,
          conductorId: "99999999-9999-4999-8999-999999999999",
          usuarioId: "99999999-9999-4999-8999-999999999999",
          vehiculoId: "88888888-8888-4888-8888-888888888888",
        });

      // Assert
      expect(res.status).toBe(201);
      expect(buscarPerfilConductor).toHaveBeenCalledWith(usuarioSesion.id);
      const datos = crearTrayecto.mock.calls[0][0];
      expect(datos.conductorId).toBe(usuarioSesion.id);
      expect(datos.vehiculoId).toBe(perfilHabilitado.vehiculo_id);
      expect(datos).not.toHaveProperty("usuarioId");
    });

    test("debería aceptar un aporte sugerido de 0", async () => {
      const res = await request(app)
        .post("/api/trayectos")
        .set(SESION)
        .send({ ...trayectoValido, aporteSugerido: 0 });

      expect(res.status).toBe(201);
      expect(res.body.trayecto.aporte_sugerido).toBe(0);
    });

    test("criterio 3: debería señalar los campos faltantes y no crear el trayecto", async () => {
      // Act
      const res = await request(app).post("/api/trayectos").set(SESION).send({});

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.mensaje).toBe("Completa los campos obligatorios.");
      expect(res.body.errores.map((error) => error.campo)).toEqual([
        "origen",
        "sedeDestinoId",
        "fecha",
        "hora",
        "cupos",
        "aporteSugerido",
      ]);
      expect(crearTrayecto).not.toHaveBeenCalled();
    });

    test.each([0, -1])("criterio 4: debería rechazar %p cupos", async (cupos) => {
      const res = await request(app)
        .post("/api/trayectos")
        .set(SESION)
        .send({ ...trayectoValido, cupos });

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual([{ campo: "cupos", mensaje: "Ingresa al menos 1 cupo." }]);
      expect(crearTrayecto).not.toHaveBeenCalled();
    });

    test("criterio 5: debería rechazar cupos por encima de la capacidad del vehículo e informar el máximo", async () => {
      // Arrange: vehículo de 3 pasajeros
      buscarPerfilConductor.mockResolvedValue({ ...perfilHabilitado, capacidad_pasajeros: 3 });

      // Act
      const res = await request(app).post("/api/trayectos").set(SESION).send(trayectoValido);

      // Assert
      expect(res.status).toBe(400);
      expect(res.body.mensaje).toBe("La capacidad máxima es 3.");
      expect(res.body.cuposMaximos).toBe(3);
      expect(crearTrayecto).not.toHaveBeenCalled();
    });

    test("criterio 5: debería limitar a 4 cupos aunque el vehículo tenga más capacidad", async () => {
      buscarPerfilConductor.mockResolvedValue({ ...perfilHabilitado, capacidad_pasajeros: 7 });

      const res = await request(app)
        .post("/api/trayectos")
        .set(SESION)
        .send({ ...trayectoValido, cupos: 5 });

      expect(res.status).toBe(400);
      expect(res.body.mensaje).toBe("La capacidad máxima es 4.");
      expect(res.body.cuposMaximos).toBe(4);
    });

    test.each([
      ["sin vehículo ni licencia", { estado: "Verificada", vehiculo_id: null, licencia_vencimiento: null }, "sin_vehiculo_o_licencia"],
      ["con vehículo pero sin licencia", { licencia_vencimiento: null }, "sin_vehiculo_o_licencia"],
      ["con la licencia vencida", { licencia_vencimiento: ayer }, "licencia_vencida"],
    ])("criterio 6: debería impedir publicar a un usuario %s y dirigir a /perfil/vehiculo", async (_caso, cambios, motivo) => {
      // Arrange
      buscarPerfilConductor.mockResolvedValue({ ...perfilHabilitado, ...cambios });

      // Act
      const res = await request(app).post("/api/trayectos").set(SESION).send(trayectoValido);

      // Assert
      expect(res.status).toBe(403);
      expect(res.body.motivo).toBe(motivo);
      expect(res.body.redireccion).toBe("/perfil/vehiculo");
      expect(crearTrayecto).not.toHaveBeenCalled();
    });

    test("criterio 6: debería bloquear antes de validar los campos", async () => {
      buscarPerfilConductor.mockResolvedValue({ ...perfilHabilitado, vehiculo_id: null });

      const res = await request(app).post("/api/trayectos").set(SESION).send({});

      expect(res.status).toBe(403);
      expect(res.body.redireccion).toBe("/perfil/vehiculo");
    });

    test("debería rechazar una salida que ya pasó", async () => {
      const res = await request(app)
        .post("/api/trayectos")
        .set(SESION)
        .send({ ...trayectoValido, fecha: ayer });

      expect(res.status).toBe(400);
      expect(res.body.errores[0].campo).toBe("fecha");
      expect(crearTrayecto).not.toHaveBeenCalled();
    });

    test("debería rechazar una sede de destino que no existe", async () => {
      buscarSedePorId.mockResolvedValue(null);

      const res = await request(app)
        .post("/api/trayectos")
        .set(SESION)
        .send({ ...trayectoValido, sedeDestinoId: 99 });

      expect(res.status).toBe(400);
      expect(res.body.errores).toEqual([
        { campo: "sedeDestinoId", mensaje: "La sede de destino no existe." },
      ]);
      expect(crearTrayecto).not.toHaveBeenCalled();
    });

    test("debería responder 500 si falla la base de datos", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      crearTrayecto.mockRejectedValue(new Error("caída"));

      const res = await request(app).post("/api/trayectos").set(SESION).send(trayectoValido);

      expect(res.status).toBe(500);
      expect(res.body.mensaje).toBe("No se pudo publicar el trayecto.");
    });
  });

  describe("GET /api/trayectos/publicacion", () => {
    test("debería exigir sesión iniciada", async () => {
      const res = await request(app).get("/api/trayectos/publicacion");
      expect(res.status).toBe(401);
    });

    test("debería devolver vehículo, cupos máximos y sedes a un conductor habilitado", async () => {
      // Act
      const res = await request(app).get("/api/trayectos/publicacion").set(SESION);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        habilitado: true,
        motivo: null,
        mensaje: null,
        redireccion: null,
        conductor: { nombre: "Mariana Gómez", estado: "Habilitado" },
        vehiculo: {
          placa: "FKU 284",
          marca: "Chevrolet",
          modelo: "Onix",
          color: "Blanco",
          capacidadPasajeros: 4,
        },
        cuposMaximos: 4,
        sedes: [sede],
      });
    });

    test("debería indicar el bloqueo y la redirección a un usuario sin vehículo", async () => {
      // Arrange
      buscarPerfilConductor.mockResolvedValue({
        ...perfilHabilitado,
        estado: "Verificada",
        vehiculo_id: null,
        licencia_vencimiento: null,
      });

      // Act
      const res = await request(app).get("/api/trayectos/publicacion").set(SESION);

      // Assert
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        habilitado: false,
        motivo: "sin_vehiculo_o_licencia",
        redireccion: "/perfil/vehiculo",
        vehiculo: null,
        cuposMaximos: 0,
      });
    });

    test("debería usar el nombre de la sesión si no se encuentra el perfil", async () => {
      buscarPerfilConductor.mockResolvedValue(null);

      const res = await request(app).get("/api/trayectos/publicacion").set(SESION);

      expect(res.status).toBe(200);
      expect(res.body.habilitado).toBe(false);
      expect(res.body.conductor).toEqual({ nombre: "Mariana Gómez", estado: null });
    });

    test("debería responder 500 si falla la base de datos", async () => {
      jest.spyOn(console, "error").mockImplementation(() => {});
      listarSedes.mockRejectedValue(new Error("caída"));

      const res = await request(app).get("/api/trayectos/publicacion").set(SESION);

      expect(res.status).toBe(500);
    });
  });
});
