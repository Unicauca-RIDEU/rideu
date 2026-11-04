import { describe, test, expect } from "@jest/globals";
import { validarVehiculoYLicencia } from "../../src/validation/vehiculoLicencia.js";

const valido = {
  placa: "FKU 284",
  marca: "Chevrolet",
  modelo: "Onix 2022",
  color: "Blanco",
  capacidadPasajeros: 4,
  categoriaLicencia: "B1",
  fechaVencimientoLicencia: "2099-09-15",
};

function campos(resultado) {
  return resultado.errores.map((error) => error.campo);
}

describe("validarVehiculoYLicencia (E02-HU03)", () => {
  test("debería aceptar un vehículo y una licencia vigente", () => {
    const resultado = validarVehiculoYLicencia(valido);

    expect(resultado.ok).toBe(true);
    expect(resultado.datos).toEqual(valido);
  });

  test("no debería exigir ni devolver usuarioId (lo pone la sesión)", () => {
    const resultado = validarVehiculoYLicencia({ ...valido, usuarioId: "otro-usuario" });

    expect(resultado.ok).toBe(true);
    expect(resultado.datos).not.toHaveProperty("usuarioId");
  });

  test("debería aceptar la placa sin espacio y normalizar espacios repetidos", () => {
    expect(validarVehiculoYLicencia({ ...valido, placa: "FKU284" }).ok).toBe(true);
    const resultado = validarVehiculoYLicencia({ ...valido, marca: "  Renault   Logan " });
    expect(resultado.datos.marca).toBe("Renault Logan");
  });

  test.each([null, undefined, "texto", [valido]])(
    "debería rechazar un cuerpo que no es objeto (%p)",
    (body) => {
      const resultado = validarVehiculoYLicencia(body);

      expect(resultado.ok).toBe(false);
      expect(campos(resultado)).toEqual(["body"]);
    },
  );

  test("criterio 3: debería señalar todos los campos obligatorios vacíos", () => {
    const resultado = validarVehiculoYLicencia({});

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toBe("Completa los campos obligatorios.");
    expect(campos(resultado).sort()).toEqual(
      [
        "placa",
        "marca",
        "modelo",
        "color",
        "capacidadPasajeros",
        "categoriaLicencia",
        "fechaVencimientoLicencia",
      ].sort(),
    );
  });

  test("criterio 3: debería devolver el mensaje del campo cuando solo falta uno", () => {
    const resultado = validarVehiculoYLicencia({ ...valido, color: "   " });

    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toBe("El color es obligatorio.");
    expect(campos(resultado)).toEqual(["color"]);
  });

  test.each(["AB 123", "ABCD 123", "ABC 12", "123 ABC", "ABC-123"])(
    "criterio 3: debería rechazar la placa con formato inválido %p",
    (placa) => {
      const resultado = validarVehiculoYLicencia({ ...valido, placa });

      expect(resultado.ok).toBe(false);
      expect(resultado.errores).toEqual([
        {
          campo: "placa",
          mensaje: "Formato inválido. Usa 3 letras y 3 números (ejemplo ABC 123).",
        },
      ]);
    },
  );

  test.each([0, -1, 2.5, "4"])(
    "debería rechazar la capacidad de pasajeros %p",
    (capacidadPasajeros) => {
      const resultado = validarVehiculoYLicencia({ ...valido, capacidadPasajeros });

      expect(resultado.ok).toBe(false);
      expect(resultado.mensaje).toBe("La capacidad de pasajeros debe ser un entero mayor que 0.");
    },
  );

  test.each(["15/09/2029", "2029-13-01", "2029-02-30"])(
    "debería rechazar la fecha de vencimiento mal formada %p",
    (fechaVencimientoLicencia) => {
      const resultado = validarVehiculoYLicencia({ ...valido, fechaVencimientoLicencia });

      expect(resultado.ok).toBe(false);
      expect(resultado.mensaje).toBe("La fecha de vencimiento debe tener el formato AAAA-MM-DD.");
    },
  );

  test("criterio 2: debería rechazar una licencia vencida", () => {
    const resultado = validarVehiculoYLicencia({
      ...valido,
      fechaVencimientoLicencia: "2000-01-01",
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toEqual([
      { campo: "fechaVencimientoLicencia", mensaje: "La licencia no está vigente" },
    ]);
  });
});
