import { describe, test, expect } from "@jest/globals";
import {
  validarIdentificador,
  validarIdReserva,
  validarIdTrayecto,
} from "../../src/validation/reserva.js";

const ID = "3f2b8c1e-9d4a-4e7b-8a61-5c0d2e9f7b13";

// Identificadores de la URL de las reservas (E04-HU07, E05-HU10 y E05-HU11).
describe("validación de identificadores de reserva", () => {
  test("debería aceptar un UUID y devolverlo en datos.id", () => {
    expect(validarIdTrayecto(ID)).toEqual({ ok: true, datos: { id: ID } });
    expect(validarIdReserva(ID)).toEqual({ ok: true, datos: { id: ID } });
  });

  test("debería normalizar espacios y mayúsculas", () => {
    expect(validarIdTrayecto(`  ${ID.toUpperCase()} `)).toEqual({ ok: true, datos: { id: ID } });
  });

  test.each([undefined, null, "", "abc", 123, "3f2b8c1e9d4a4e7b8a615c0d2e9f7b13", `${ID}-x`])(
    "debería rechazar el identificador de trayecto %p",
    (valor) => {
      const resultado = validarIdTrayecto(valor);

      expect(resultado.ok).toBe(false);
      expect(resultado.mensaje).toBe("El trayecto no es válido.");
      expect(resultado.errores).toEqual([{ campo: "trayectoId", mensaje: "El trayecto no es válido." }]);
    },
  );

  test("debería rechazar un identificador de reserva que no es UUID", () => {
    const resultado = validarIdReserva("1 OR 1=1");

    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toEqual([{ campo: "reservaId", mensaje: "La reserva no es válida." }]);
  });

  test("debería usar el campo y el mensaje que recibe", () => {
    const resultado = validarIdentificador("x", { campo: "otroId", mensaje: "No es válido." });

    expect(resultado).toEqual({
      ok: false,
      mensaje: "No es válido.",
      errores: [{ campo: "otroId", mensaje: "No es válido." }],
    });
  });
});
