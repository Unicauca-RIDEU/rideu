import { describe, test, expect } from "@jest/globals";
import bcrypt from "bcryptjs";

const RONDAS = 4;

describe("Hash y comparación de contraseñas (bcryptjs)", () => {
  test("debería generar un hash distinto al texto plano", async () => {
    // Arrange
    const contrasena = "secreta12";

    // Act
    const hash = await bcrypt.hash(contrasena, RONDAS);

    // Assert
    expect(hash).not.toBe(contrasena);
    expect(hash.startsWith("$2")).toBe(true);
  });

  test("debería confirmar la contraseña correcta con bcrypt.compare", async () => {
    // Arrange
    const contrasena = "secreta12";
    const hash = await bcrypt.hash(contrasena, RONDAS);

    // Act
    const coincide = await bcrypt.compare(contrasena, hash);

    // Assert
    expect(coincide).toBe(true);
  });

  test("debería rechazar una contraseña incorrecta", async () => {
    // Arrange
    const hash = await bcrypt.hash("secreta12", RONDAS);

    // Act
    const coincide = await bcrypt.compare("otra-clave", hash);

    // Assert
    expect(coincide).toBe(false);
  });

  test("debería rechazar comparación contra hash vacío o inválido sin lanzar de forma inesperada", async () => {
    // Arrange / Act
    const contraVacio = await bcrypt.compare("secreta12", "");
    const contraInvalido = await bcrypt.compare("secreta12", "no-es-un-hash");

    // Assert
    expect(contraVacio).toBe(false);
    expect(contraInvalido).toBe(false);
  });
});
