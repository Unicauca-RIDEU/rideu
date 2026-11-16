import { describe, test, expect } from "@jest/globals";
import { enlaceWhatsApp } from "../../src/validation/contacto.js";

// Enlace wa.me del contacto por WhatsApp (E05-HU10 y E05-HU11).
describe("enlaceWhatsApp", () => {
  test("HU10 criterio 1: debería armar el enlace wa.me con el número sin el signo +", () => {
    expect(enlaceWhatsApp("+573104567890")).toBe("https://wa.me/573104567890");
  });

  test("debería ignorar los espacios alrededor del número", () => {
    expect(enlaceWhatsApp(" +573104567890 ")).toBe("https://wa.me/573104567890");
  });

  test.each([
    ["sin número", null],
    ["indefinido", undefined],
    ["vacío", ""],
    ["sin indicativo", "3104567890"],
    ["con menos dígitos", "+57310456789"],
    ["con más dígitos", "+5731045678901"],
    ["fijo, no celular", "+576028209800"],
    ["con letras", "+57310456789a"],
    ["de otro país", "+13104567890"],
    ["numérico, no texto", 573104567890],
  ])("HU10 criterio 2: debería devolver null con un número no válido (%s)", (_caso, numero) => {
    expect(enlaceWhatsApp(numero)).toBeNull();
  });
});
