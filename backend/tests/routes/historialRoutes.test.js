import { describe, test, expect, jest, beforeEach } from "@jest/globals";
import request from "supertest";

const buscarUsuarioPorSesion = jest.fn();
const listarTrayectosDeConductor = jest.fn();

jest.unstable_mockModule("../../src/config/database.js", () => ({
  pool: { query: jest.fn(), connect: jest.fn() },
}));

jest.unstable_mockModule("../../src/models/sesion.js", () => ({
  eliminarSesion: jest.fn(),
  crearSesion: jest.fn(),
  buscarUsuarioPorSesion,
}));

jest.unstable_mockModule("../../src/models/trayecto.js", () => ({
  ESTADO_DISPONIBLE: "Disponible",
  buscarPerfilConductor: jest.fn(),
  buscarTrayectosDisponibles: jest.fn(),
  crearTrayecto: jest.fn(),
  existeTrayectoEnHorario: jest.fn(),
  listarTrayectosDeConductor,
}));

const { createApp } = await import("../../src/app.js");

const usuarioSesion = {
  id: "11111111-1111-4111-8111-111111111111",
  nombre: "Mariana Gómez",
  correo: "mariana.gomez@unicauca.edu.co",
  estado: "Habilitado",
};

const SESION = { Authorization: "Bearer token-valido" };

const trayectos = [
  {
    id: "t2",
    fecha: "2030-05-21",
    hora: "07:00",
    origen: "Bello Horizonte",
    sede_destino: "Facultad de Ingeniería Civil",
    cupos: 3,
    cupos_disponibles: 3,
    aporte_sugerido: 2500,
    estado_historial: "Pendiente",
  },
  {
    id: "t1",
    fecha: "2026-11-01",
    hora: "06:30",
    origen: "La Esmeralda",
    sede_destino: "Facultad de Artes",
    cupos: 2,
    cupos_disponibles: 2,
    aporte_sugerido: 2000,
    estado_historial: "Completado",
  },
];

// Historial de trayectos y reservas (E04-HU09).
describe("rutas /api/historial (Supertest)", () => {
  let app;

  beforeEach(() => {
    app = createApp();
    buscarUsuarioPorSesion.mockReset();
    listarTrayectosDeConductor.mockReset();
    buscarUsuarioPorSesion.mockImplementation(async (token) =>
      token === "token-valido" ? usuarioSesion : null,
    );
  });

  test("debería exigir sesión iniciada para ver el historial", async () => {
    const res = await request(app).get("/api/historial");

    expect(res.status).toBe(401);
    expect(listarTrayectosDeConductor).not.toHaveBeenCalled();
  });

  test("criterio 1: debería devolver la actividad del usuario con el estado de cada trayecto", async () => {
    listarTrayectosDeConductor.mockResolvedValueOnce(trayectos);

    const res = await request(app).get("/api/historial").set(SESION);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.mensaje).toBeNull();
    expect(res.body.trayectos.map((t) => [t.id, t.estado_historial])).toEqual([
      ["t2", "Pendiente"],
      ["t1", "Completado"],
    ]);
    expect(res.body.reservas).toEqual([]);
  });

  test("criterio 1: debería consultar solo la actividad del usuario de la sesión", async () => {
    listarTrayectosDeConductor.mockResolvedValueOnce([]);

    await request(app).get("/api/historial?conductorId=otro-usuario").set(SESION);

    expect(listarTrayectosDeConductor).toHaveBeenCalledTimes(1);
    expect(listarTrayectosDeConductor.mock.calls[0][0].conductorId).toBe(usuarioSesion.id);
    expect(listarTrayectosDeConductor.mock.calls[0][0].ahoraColombia).toMatch(
      /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    );
  });

  test("criterio 2: debería indicar que aún no hay registros si el usuario no tiene actividad", async () => {
    listarTrayectosDeConductor.mockResolvedValueOnce([]);

    const res = await request(app).get("/api/historial").set(SESION);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      mensaje: "Aún no tienes registros en tu historial.",
      total: 0,
      trayectos: [],
      reservas: [],
    });
  });

  test("debería responder 500 si falla la consulta del historial", async () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    listarTrayectosDeConductor.mockRejectedValueOnce(new Error("sin conexión"));

    const res = await request(app).get("/api/historial").set(SESION);

    expect(res.status).toBe(500);
    expect(res.body.mensaje).toBe("No se pudo cargar el historial.");
  });
});
