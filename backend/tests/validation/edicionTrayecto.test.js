import { describe, test, expect } from "@jest/globals";
import {
  motivoParaNoModificar,
  validarEdicionTrayecto,
} from "../../src/validation/trayecto.js";

// Edición y cancelación de trayectos (E02-HU05).
// «ahora» fijo: 20 de noviembre de 2026, 06:00 en Colombia (11:00 UTC).
const AHORA = new Date("2026-11-20T11:00:00Z");
const CONDUCTOR = "22222222-2222-4222-8222-222222222222";
const valido = { fecha: "2026-11-21", hora: "07:30", cupos: 3 };
const opciones = (cambios = {}) => ({ cuposMaximos: 4, cuposReservados: 0, ahora: AHORA, ...cambios });

describe("validarEdicionTrayecto (HU05)", () => {
  test("criterio 3: debería aceptar una nueva fecha, hora y cupos válidos", () => {
    expect(validarEdicionTrayecto(valido, opciones())).toEqual({ ok: true, datos: valido });
  });

  test("criterio 3: debería limpiar los espacios de la fecha y la hora", () => {
    const resultado = validarEdicionTrayecto({ fecha: " 2026-11-21 ", hora: " 07:30 ", cupos: 2 }, opciones());
    expect(resultado.datos).toEqual({ fecha: "2026-11-21", hora: "07:30", cupos: 2 });
  });

  test("criterio 3: debería aceptar cupos iguales a las reservas confirmadas", () => {
    expect(validarEdicionTrayecto({ ...valido, cupos: 2 }, opciones({ cuposReservados: 2 })).ok).toBe(true);
  });

  test("criterio 3: debería rechazar cupos por debajo de las reservas confirmadas", () => {
    const resultado = validarEdicionTrayecto({ ...valido, cupos: 1 }, opciones({ cuposReservados: 2 }));
    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toEqual([
      { campo: "cupos", mensaje: "El trayecto tiene 2 reservas confirmadas: ofrece al menos 2 cupos." },
    ]);
  });

  test("criterio 3: debería rechazar cupos por encima del máximo del vehículo", () => {
    const resultado = validarEdicionTrayecto({ ...valido, cupos: 4 }, opciones({ cuposMaximos: 3 }));
    expect(resultado.mensaje).toBe("La capacidad máxima es 3.");
  });

  test.each([
    [0, "Ingresa al menos 1 cupo."],
    [2.5, "Los cupos deben ser un número entero."],
    ["3", "Los cupos deben ser un número entero."],
    [undefined, "Los cupos son obligatorios."],
  ])("criterio 3: debería rechazar los cupos %p", (cupos, mensaje) => {
    const resultado = validarEdicionTrayecto({ ...valido, cupos }, opciones());
    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toBe(mensaje);
  });

  test("criterio 3: debería rechazar una salida que no es posterior al momento actual", () => {
    const resultado = validarEdicionTrayecto({ ...valido, fecha: "2026-11-20", hora: "06:00" }, opciones());
    expect(resultado.errores).toEqual([
      { campo: "fecha", mensaje: "La fecha y la hora de salida deben ser posteriores al momento actual." },
    ]);
  });

  test("criterio 3: debería rechazar una fecha y una hora con formato inválido", () => {
    const resultado = validarEdicionTrayecto({ fecha: "21/11/2026", hora: "7:30", cupos: 2 }, opciones());
    expect(resultado.mensaje).toBe("Revisa la fecha, la hora y los cupos.");
    expect(resultado.errores.map((error) => error.campo)).toEqual(["fecha", "hora"]);
  });

  test.each([null, [], "texto"])("debería rechazar un cuerpo %p", (cuerpo) => {
    const resultado = validarEdicionTrayecto(cuerpo, opciones());
    expect(resultado.errores[0].campo).toBe("body");
  });
});

describe("motivoParaNoModificar (HU05)", () => {
  const trayecto = (cambios = {}) => ({ conductor_id: CONDUCTOR, estado: "Disponible", vigente: 1, ...cambios });

  test("criterios 1 a 3: debería permitir modificar un trayecto vigente propio", () => {
    expect(motivoParaNoModificar(trayecto(), CONDUCTOR)).toBeNull();
  });

  test.each([
    ["inexistente", null, "trayecto_inexistente"],
    ["de otro conductor", { conductor_id: "otro" }, "trayecto_ajeno"],
    ["cancelado", { estado: "Cancelado" }, "trayecto_cancelado"],
    ["que ya salió", { vigente: 0 }, "trayecto_iniciado"],
  ])("debería impedir modificar un trayecto %s", (_caso, cambios, motivo) => {
    const valor = cambios === null ? null : trayecto(cambios);
    expect(motivoParaNoModificar(valor, CONDUCTOR)).toBe(motivo);
  });
});
