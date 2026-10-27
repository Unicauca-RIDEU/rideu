import { describe, test, expect } from "@jest/globals";
import { validarRegistro } from "../../src/validation/registro.js";

const valido = {
  nombre: "Ana Pérez",
  correo: "ana.perez@unicauca.edu.co",
  contrasena: "secreta12",
  whatsapp: "3001234567",
};

describe("validarRegistro", () => {
  test("debería aceptar un registro válido y normalizar correo y WhatsApp", () => {
    // Arrange
    const body = {
      ...valido,
      correo: "  Ana.Perez@Unicauca.edu.co ",
      whatsapp: "+57 300 123 4567",
      nombre: "  Ana   Pérez ",
    };

    // Act
    const resultado = validarRegistro(body);

    // Assert
    expect(resultado.ok).toBe(true);
    expect(resultado.datos).toEqual({
      nombre: "Ana Pérez",
      correo: "ana.perez@unicauca.edu.co",
      contrasena: "secreta12",
      whatsapp: "+573001234567",
    });
  });

  test("debería rechazar el registro si el correo no es institucional", () => {
    // Arrange / Act
    const resultado = validarRegistro({ ...valido, correo: "ana.perez@gmail.com" });

    // Assert
    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toBe("Solo se permite el correo institucional @unicauca.edu.co.");
    expect(resultado.errores).toEqual([
      { campo: "correo", mensaje: "Solo se permite el correo institucional @unicauca.edu.co." },
    ]);
  });

  test("debería rechazar un correo que solo contiene unicauca.edu.co como subcadena", () => {
    // Arrange / Act
    const resultado = validarRegistro({
      ...valido,
      correo: "ana@unicauca.edu.co.evil.com",
    });

    // Assert
    expect(resultado.ok).toBe(false);
    expect(resultado.errores[0].campo).toBe("correo");
  });

  test("debería rechazar campos vacíos o nulos en el cuerpo", () => {
    // Arrange / Act
    const vacio = validarRegistro({});
    const nulo = validarRegistro(null);
    const arreglo = validarRegistro([]);

    // Assert
    expect(vacio.ok).toBe(false);
    expect(vacio.errores.map((e) => e.campo)).toEqual([
      "nombre",
      "correo",
      "contrasena",
      "whatsapp",
    ]);
    expect(nulo.ok).toBe(false);
    expect(arreglo.ok).toBe(false);
  });

  test("debería rechazar nombre fuera de rango 3-120 caracteres", () => {
    // Arrange / Act
    const corto = validarRegistro({ ...valido, nombre: "Al" });
    const largo = validarRegistro({ ...valido, nombre: "A".repeat(121) });

    // Assert
    expect(corto.ok).toBe(false);
    expect(corto.errores[0].mensaje).toMatch(/entre 3 y 120/);
    expect(largo.ok).toBe(false);
  });

  test("debería rechazar contraseña menor a 8 o mayor a 72 caracteres", () => {
    // Arrange / Act
    const corta = validarRegistro({ ...valido, contrasena: "corta" });
    const larga = validarRegistro({ ...valido, contrasena: "x".repeat(73) });

    // Assert
    expect(corta.ok).toBe(false);
    expect(corta.errores[0].mensaje).toMatch(/al menos 8/);
    expect(larga.ok).toBe(false);
    expect(larga.errores[0].mensaje).toMatch(/72/);
  });

  test("debería rechazar WhatsApp que no sea celular colombiano", () => {
    // Arrange / Act
    const resultado = validarRegistro({ ...valido, whatsapp: "12345" });
    const fijo = validarRegistro({ ...valido, whatsapp: "6012345678" });

    // Assert
    expect(resultado.ok).toBe(false);
    expect(resultado.errores[0].campo).toBe("whatsapp");
    expect(fijo.ok).toBe(false);
  });

  test("debería normalizar WhatsApp con prefijo 57 a formato +57", () => {
    // Arrange / Act
    const resultado = validarRegistro({ ...valido, whatsapp: "573001234567" });

    // Assert
    expect(resultado.ok).toBe(true);
    expect(resultado.datos.whatsapp).toBe("+573001234567");
  });
});
