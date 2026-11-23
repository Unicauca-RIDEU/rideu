import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import { SALIDA } from "../helpers/database.js";
import request from "supertest";

const buscarUsuarioPorSesion = jest.fn();
const listarTrayectosEditables = jest.fn();
const buscarTrayectoParaEdicion = jest.fn();
const actualizarTrayecto = jest.fn();
const cancelarTrayecto = jest.fn();
const existeTrayectoEnHorario = jest.fn();
const enviarCorreoTrayectoCancelado = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
  SALIDA,
}));

jest.unstable_mockModule("../../src/models/sesion.js", () => ({
  eliminarSesion: jest.fn(),
  crearSesion: jest.fn(),
  buscarUsuarioPorSesion,
}));

jest.unstable_mockModule("../../src/models/trayecto.js", () => ({
  ESTADO_DISPONIBLE: "Disponible",
  ESTADO_CANCELADO: "Cancelado",
  buscarPerfilConductor: jest.fn(),
  listarTrayectosDeConductor: jest.fn(),
  crearTrayecto: jest.fn(),
  existeTrayectoEnHorario,
  buscarTrayectosDisponibles: jest.fn(),
  listarTrayectosProximos: jest.fn(),
  listarTrayectosEditables,
  buscarTrayectoParaEdicion,
  actualizarTrayecto,
  cancelarTrayecto,
}));

jest.unstable_mockModule("../../src/services/correo.js", () => ({
  enviarCorreoVerificacion: jest.fn(),
  enviarCorreoTrayectoCancelado,
  enviarCorreoReservaCancelada: jest.fn(),
}));

const { createApp } = await import("../../src/app.js");
const { fechaEnColombia } = await import("../../src/validation/trayecto.js");

// Edición y cancelación de trayectos (E02-HU05).
const TRAYECTO = "3f2b8c1e-9d4a-4e7b-8a61-5c0d2e9f7b13";
const SESION = { Authorization: "Bearer token-valido" };
const UN_DIA = 24 * 60 * 60 * 1000;
const manana = fechaEnColombia(new Date(Date.now() + UN_DIA));
const pasadoManana = fechaEnColombia(new Date(Date.now() + 2 * UN_DIA));

const conductor = {
  id: "22222222-2222-4222-8222-222222222222",
  nombre: "Camilo Rojas",
  correo: "camilo.rojas@unicauca.edu.co",
  estado: "Habilitado",
};

const actual = (cambios = {}) => ({
  id: TRAYECTO,
  conductor_id: conductor.id,
  fecha: manana,
  hora: "07:00",
  cupos: 3,
  cupos_disponibles: 2,
  cupos_reservados: 1,
  estado: "Disponible",
  vehiculo_capacidad: 4,
  vigente: 1,
  ...cambios,
});

const trayectoCancelado = {
  id: TRAYECTO,
  fecha: manana,
  hora: "07:00",
  origen: "Bello Horizonte",
  sede_destino: "Facultad de Ingeniería Civil",
  estado: "Cancelado",
};

describe("rutas de edición y cancelación de trayectos (Supertest)", () => {
  let app;

  beforeEach(() => {
    app = createApp();
    for (const simulacion of [
      buscarUsuarioPorSesion,
      listarTrayectosEditables,
      buscarTrayectoParaEdicion,
      actualizarTrayecto,
      cancelarTrayecto,
      existeTrayectoEnHorario,
      enviarCorreoTrayectoCancelado,
    ]) {
      simulacion.mockReset();
    }
    buscarUsuarioPorSesion.mockResolvedValue(conductor);
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("GET /api/trayectos/mios", () => {
    test("debería listar los trayectos vigentes del conductor con su máximo de cupos", async () => {
      listarTrayectosEditables.mockResolvedValueOnce([
        {
          id: TRAYECTO,
          fecha: manana,
          hora: "07:00",
          origen: "Bello Horizonte",
          sede_destino: "Facultad de Ingeniería Civil",
          cupos: 3,
          cupos_disponibles: 2,
          cupos_reservados: 1,
          aporte_sugerido: 2500,
          estado: "Disponible",
          vehiculo_capacidad: 5,
        },
      ]);

      const respuesta = await request(app).get("/api/trayectos/mios").set(SESION);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.total).toBe(1);
      expect(respuesta.body.mensaje).toBeNull();
      expect(respuesta.body.trayectos[0]).toMatchObject({ id: TRAYECTO, cupos_reservados: 1, cupos_maximos: 4 });
      expect(respuesta.body.trayectos[0]).not.toHaveProperty("vehiculo_capacidad");
      expect(listarTrayectosEditables).toHaveBeenCalledWith({
        conductorId: conductor.id,
        ahoraColombia: expect.stringMatching(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/),
      });
    });

    test("debería indicar que no hay trayectos para editar", async () => {
      listarTrayectosEditables.mockResolvedValueOnce([]);
      const respuesta = await request(app).get("/api/trayectos/mios").set(SESION);
      expect(respuesta.body).toEqual({
        mensaje: "No tienes trayectos vigentes para editar o cancelar.",
        total: 0,
        trayectos: [],
      });
    });

    test("debería responder 401 sin sesión", async () => {
      const respuesta = await request(app).get("/api/trayectos/mios");
      expect(respuesta.status).toBe(401);
      expect(listarTrayectosEditables).not.toHaveBeenCalled();
    });

    test("debería responder 500 si falla la consulta", async () => {
      listarTrayectosEditables.mockRejectedValueOnce(new Error("ORA-03113"));
      const respuesta = await request(app).get("/api/trayectos/mios").set(SESION);
      expect(respuesta.status).toBe(500);
      expect(respuesta.body.mensaje).toBe("No se pudieron cargar tus trayectos.");
    });
  });

  describe("PATCH /api/trayectos/:id", () => {
    const cambios = { fecha: pasadoManana, hora: "08:15", cupos: 4 };

    test("criterio 3: debería guardar los cambios de un trayecto vigente", async () => {
      buscarTrayectoParaEdicion.mockResolvedValueOnce(actual());
      existeTrayectoEnHorario.mockResolvedValueOnce(false);
      actualizarTrayecto.mockResolvedValueOnce(true);

      const respuesta = await request(app).patch(`/api/trayectos/${TRAYECTO}`).set(SESION).send(cambios);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({
        mensaje: "Cambios guardados. Los pasajeros ya ven la información actualizada.",
        trayecto: {
          id: TRAYECTO,
          fecha: pasadoManana,
          hora: "08:15",
          cupos: 4,
          cupos_reservados: 1,
          cupos_disponibles: 3,
          cupos_maximos: 4,
        },
      });
      expect(existeTrayectoEnHorario).toHaveBeenCalledWith({
        conductorId: conductor.id,
        fecha: pasadoManana,
        hora: "08:15",
        excluirId: TRAYECTO,
      });
      expect(actualizarTrayecto).toHaveBeenCalledWith(
        expect.objectContaining({ trayectoId: TRAYECTO, conductorId: conductor.id, ...cambios }),
      );
    });

    test("criterio 3: no debería comprobar el horario si solo cambian los cupos", async () => {
      buscarTrayectoParaEdicion.mockResolvedValueOnce(actual());
      actualizarTrayecto.mockResolvedValueOnce(true);

      const respuesta = await request(app)
        .patch(`/api/trayectos/${TRAYECTO}`)
        .set(SESION)
        .send({ fecha: manana, hora: "07:00", cupos: 2 });

      expect(respuesta.status).toBe(200);
      expect(existeTrayectoEnHorario).not.toHaveBeenCalled();
    });

    test("criterio 3: debería responder 400 si los cupos quedan por debajo de las reservas", async () => {
      buscarTrayectoParaEdicion.mockResolvedValueOnce(actual({ cupos_reservados: 2 }));

      const respuesta = await request(app)
        .patch(`/api/trayectos/${TRAYECTO}`)
        .set(SESION)
        .send({ ...cambios, cupos: 1 });

      expect(respuesta.status).toBe(400);
      expect(respuesta.body).toMatchObject({ cuposMaximos: 4, cuposReservados: 2 });
      expect(respuesta.body.errores[0].campo).toBe("cupos");
      expect(actualizarTrayecto).not.toHaveBeenCalled();
    });

    test("criterio 3: debería responder 409 si ya tiene otro trayecto en ese horario", async () => {
      buscarTrayectoParaEdicion.mockResolvedValueOnce(actual());
      existeTrayectoEnHorario.mockResolvedValueOnce(true);

      const respuesta = await request(app).patch(`/api/trayectos/${TRAYECTO}`).set(SESION).send(cambios);

      expect(respuesta.status).toBe(409);
      expect(respuesta.body.mensaje).toBe("Ya tienes un trayecto publicado para esa fecha y hora.");
      expect(actualizarTrayecto).not.toHaveBeenCalled();
    });

    test("criterio 3: debería responder 409 si el trayecto cambió mientras se editaba", async () => {
      buscarTrayectoParaEdicion.mockResolvedValueOnce(actual());
      existeTrayectoEnHorario.mockResolvedValueOnce(false);
      actualizarTrayecto.mockResolvedValueOnce(false);

      const respuesta = await request(app).patch(`/api/trayectos/${TRAYECTO}`).set(SESION).send(cambios);

      expect(respuesta.status).toBe(409);
      expect(respuesta.body.codigo).toBe("TRAYECTO_MODIFICADO");
    });

    test.each([
      ["no existe", null, 404, "TRAYECTO_INEXISTENTE"],
      ["es de otro conductor", actual({ conductor_id: "otro" }), 403, "TRAYECTO_AJENO"],
      ["está cancelado", actual({ estado: "Cancelado" }), 409, "TRAYECTO_CANCELADO"],
      ["ya salió", actual({ vigente: 0 }), 409, "TRAYECTO_INICIADO"],
    ])("debería rechazar la edición si el trayecto %s", async (_caso, fila, status, codigo) => {
      buscarTrayectoParaEdicion.mockResolvedValueOnce(fila);

      const respuesta = await request(app).patch(`/api/trayectos/${TRAYECTO}`).set(SESION).send(cambios);

      expect(respuesta.status).toBe(status);
      expect(respuesta.body.codigo).toBe(codigo);
      expect(actualizarTrayecto).not.toHaveBeenCalled();
    });

    test("debería responder 400 con un identificador inválido", async () => {
      const respuesta = await request(app).patch("/api/trayectos/abc").set(SESION).send(cambios);
      expect(respuesta.status).toBe(400);
      expect(buscarTrayectoParaEdicion).not.toHaveBeenCalled();
    });

    test("debería responder 500 si falla la base", async () => {
      buscarTrayectoParaEdicion.mockRejectedValueOnce(new Error("ORA-03113"));
      const respuesta = await request(app).patch(`/api/trayectos/${TRAYECTO}`).set(SESION).send(cambios);
      expect(respuesta.status).toBe(500);
      expect(respuesta.body.mensaje).toBe("No se pudieron guardar los cambios.");
    });
  });

  describe("POST /api/trayectos/:id/cancelacion", () => {
    test("criterio 1: debería cancelar un trayecto sin reservas", async () => {
      cancelarTrayecto.mockResolvedValueOnce({ ok: true, trayecto: trayectoCancelado, pasajeros: [] });

      const respuesta = await request(app).post(`/api/trayectos/${TRAYECTO}/cancelacion`).set(SESION);

      expect(respuesta.status).toBe(200);
      expect(respuesta.body).toEqual({
        mensaje: "Trayecto cancelado. Ya no aparece en los resultados de búsqueda.",
        trayecto: trayectoCancelado,
        pasajerosAfectados: 0,
        pasajerosNotificados: 0,
      });
      expect(cancelarTrayecto).toHaveBeenCalledWith({
        trayectoId: TRAYECTO,
        conductorId: conductor.id,
        ahoraColombia: expect.any(String),
        confirmar: false,
      });
      expect(enviarCorreoTrayectoCancelado).not.toHaveBeenCalled();
    });

    test("criterio 2: debería pedir confirmación indicando el número de pasajeros afectados", async () => {
      cancelarTrayecto.mockResolvedValueOnce({ ok: false, motivo: "requiere_confirmacion", pasajerosAfectados: 2 });

      const respuesta = await request(app).post(`/api/trayectos/${TRAYECTO}/cancelacion`).set(SESION).send({});

      expect(respuesta.status).toBe(409);
      expect(respuesta.body).toEqual({
        codigo: "CONFIRMACION_REQUERIDA",
        mensaje:
          "Este trayecto tiene 2 pasajeros con reserva confirmada. Confirma la cancelación para cancelar sus reservas y avisarles.",
        pasajerosAfectados: 2,
      });
      expect(enviarCorreoTrayectoCancelado).not.toHaveBeenCalled();
    });

    test("criterio 2: al confirmar, debería cancelar las reservas y avisar por correo a cada pasajero", async () => {
      const pasajeros = [
        { nombre: "Mariana Gómez", correo: "mariana.gomez@unicauca.edu.co" },
        { nombre: "Andrés Paz", correo: "andres.paz@unicauca.edu.co" },
      ];
      cancelarTrayecto.mockResolvedValueOnce({ ok: true, trayecto: trayectoCancelado, pasajeros });
      enviarCorreoTrayectoCancelado.mockResolvedValue(undefined);

      const respuesta = await request(app)
        .post(`/api/trayectos/${TRAYECTO}/cancelacion`)
        .set(SESION)
        .send({ confirmar: true });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.mensaje).toBe(
        "Trayecto cancelado. Se cancelaron las reservas de 2 pasajeros y se les avisó por correo.",
      );
      expect(respuesta.body).toMatchObject({ pasajerosAfectados: 2, pasajerosNotificados: 2 });
      expect(cancelarTrayecto).toHaveBeenCalledWith(expect.objectContaining({ confirmar: true }));
      expect(enviarCorreoTrayectoCancelado).toHaveBeenCalledTimes(2);
      expect(enviarCorreoTrayectoCancelado).toHaveBeenCalledWith({ ...pasajeros[0], trayecto: trayectoCancelado });
      expect(enviarCorreoTrayectoCancelado).toHaveBeenCalledWith({ ...pasajeros[1], trayecto: trayectoCancelado });
    });

    test("criterio 2: debería mantener la cancelación e informar si un correo no se pudo enviar", async () => {
      const pasajeros = [
        { nombre: "Mariana Gómez", correo: "mariana.gomez@unicauca.edu.co" },
        { nombre: "Andrés Paz", correo: "andres.paz@unicauca.edu.co" },
      ];
      cancelarTrayecto.mockResolvedValueOnce({ ok: true, trayecto: trayectoCancelado, pasajeros });
      enviarCorreoTrayectoCancelado.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("SMTP"));

      const respuesta = await request(app)
        .post(`/api/trayectos/${TRAYECTO}/cancelacion`)
        .set(SESION)
        .send({ confirmar: true });

      expect(respuesta.status).toBe(200);
      expect(respuesta.body.mensaje).toBe(
        "Trayecto cancelado. Se cancelaron las reservas de 2 pasajeros, pero no se pudo avisar por correo a 1 pasajero.",
      );
      expect(respuesta.body.pasajerosNotificados).toBe(1);
    });

    test("criterio 2: solo un true explícito confirma la cancelación", async () => {
      cancelarTrayecto.mockResolvedValueOnce({ ok: false, motivo: "requiere_confirmacion", pasajerosAfectados: 1 });

      const respuesta = await request(app)
        .post(`/api/trayectos/${TRAYECTO}/cancelacion`)
        .set(SESION)
        .send({ confirmar: "true" });

      expect(respuesta.body.mensaje).toContain("1 pasajero con reserva confirmada");
      expect(cancelarTrayecto).toHaveBeenCalledWith(expect.objectContaining({ confirmar: false }));
    });

    test.each([
      ["trayecto_inexistente", 404],
      ["trayecto_ajeno", 403],
      ["trayecto_cancelado", 409],
      ["trayecto_iniciado", 409],
    ])("debería responder según el motivo %s", async (motivo, status) => {
      cancelarTrayecto.mockResolvedValueOnce({ ok: false, motivo });
      const respuesta = await request(app).post(`/api/trayectos/${TRAYECTO}/cancelacion`).set(SESION);
      expect(respuesta.status).toBe(status);
    });

    test("debería responder 400 con un identificador inválido", async () => {
      const respuesta = await request(app).post("/api/trayectos/abc/cancelacion").set(SESION);
      expect(respuesta.status).toBe(400);
      expect(cancelarTrayecto).not.toHaveBeenCalled();
    });

    test("debería responder 500 si falla la base", async () => {
      cancelarTrayecto.mockRejectedValueOnce(new Error("ORA-03113"));
      const respuesta = await request(app).post(`/api/trayectos/${TRAYECTO}/cancelacion`).set(SESION);
      expect(respuesta.status).toBe(500);
      expect(respuesta.body.mensaje).toBe("No se pudo cancelar el trayecto.");
    });
  });
});
