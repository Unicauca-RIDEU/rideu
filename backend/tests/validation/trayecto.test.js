import { describe, test, expect } from "@jest/globals";
import {
  CUPOS_MAXIMOS,
  RUTA_PERFIL_VEHICULO,
  cuposPermitidos,
  fechaEnColombia,
  validarTrayecto,
  verificarConductorHabilitado,
} from "../../src/validation/trayecto.js";

// 4 nov 2026, 07:00 en Colombia (12:00 UTC).
const AHORA = new Date("2026-11-04T12:00:00Z");

const trayectoValido = {
  origen: "Bello Horizonte",
  sedeDestinoId: 1,
  fecha: "2026-11-05",
  hora: "07:00",
  cupos: 4,
  aporteSugerido: 2500,
};

function validar(cambios = {}, opciones = {}) {
  return validarTrayecto({ ...trayectoValido, ...cambios }, { ahora: AHORA, ...opciones });
}

function mensajeDe(resultado, campo) {
  return resultado.errores.find((error) => error.campo === campo)?.mensaje;
}

describe("cuposPermitidos", () => {
  test("debería limitar los cupos al menor valor entre la capacidad y 4", () => {
    expect(CUPOS_MAXIMOS).toBe(4);
    expect(cuposPermitidos(2)).toBe(2);
    expect(cuposPermitidos(3)).toBe(3);
    expect(cuposPermitidos(4)).toBe(4);
    expect(cuposPermitidos(7)).toBe(4);
  });

  test("debería devolver 0 si la capacidad no es un entero positivo", () => {
    expect(cuposPermitidos(0)).toBe(0);
    expect(cuposPermitidos(-1)).toBe(0);
    expect(cuposPermitidos(2.5)).toBe(0);
    expect(cuposPermitidos(undefined)).toBe(0);
    expect(cuposPermitidos("4")).toBe(0);
  });
});

describe("validarTrayecto", () => {
  test("debería aceptar un trayecto válido y normalizar el origen", () => {
    // Act
    const resultado = validar({ origen: "  Bello   Horizonte " });

    // Assert
    expect(resultado).toEqual({
      ok: true,
      datos: { ...trayectoValido, origen: "Bello Horizonte" },
    });
  });

  test("no debería incluir datos del conductor aunque vengan en el cuerpo", () => {
    // Act
    const resultado = validar({ conductorId: "otro-usuario", usuarioId: "otro-usuario" });

    // Assert
    expect(resultado.ok).toBe(true);
    expect(resultado.datos).not.toHaveProperty("conductorId");
    expect(resultado.datos).not.toHaveProperty("usuarioId");
  });

  test.each([null, undefined, "texto", [], 5])(
    "debería rechazar un cuerpo que no es un objeto (%p)",
    (cuerpo) => {
      const resultado = validarTrayecto(cuerpo, { ahora: AHORA });
      expect(resultado.ok).toBe(false);
      expect(resultado.errores[0].campo).toBe("body");
    },
  );

  test("debería señalar todos los campos obligatorios vacíos", () => {
    // Act
    const resultado = validarTrayecto({}, { ahora: AHORA });

    // Assert
    expect(resultado.ok).toBe(false);
    expect(resultado.mensaje).toBe("Completa los campos obligatorios.");
    expect(resultado.errores.map((error) => error.campo)).toEqual([
      "origen",
      "sedeDestinoId",
      "fecha",
      "hora",
      "cupos",
      "aporteSugerido",
    ]);
  });

  test.each([
    ["origen", "", "El origen es obligatorio."],
    ["origen", "   ", "El origen es obligatorio."],
    ["sedeDestinoId", "", "La sede de destino es obligatoria."],
    ["sedeDestinoId", null, "La sede de destino es obligatoria."],
    ["fecha", "", "La fecha es obligatoria."],
    ["hora", "", "La hora es obligatoria."],
    ["cupos", "", "Los cupos son obligatorios."],
    ["aporteSugerido", undefined, "El aporte sugerido es obligatorio."],
  ])("debería exigir %s (valor %p)", (campo, valor, mensaje) => {
    // Act
    const resultado = validar({ [campo]: valor });

    // Assert
    expect(resultado.ok).toBe(false);
    expect(resultado.errores).toEqual([{ campo, mensaje }]);
    expect(resultado.mensaje).toBe(mensaje);
  });

  test.each([0, -1, -4])("debería rechazar cupos menores o iguales a cero (%p)", (cupos) => {
    const resultado = validar({ cupos });
    expect(resultado.ok).toBe(false);
    expect(mensajeDe(resultado, "cupos")).toBe("Ingresa al menos 1 cupo.");
  });

  test.each([1.5, "2", "dos"])("debería rechazar cupos que no son enteros (%p)", (cupos) => {
    const resultado = validar({ cupos });
    expect(mensajeDe(resultado, "cupos")).toBe("Los cupos deben ser un número entero.");
  });

  test("debería rechazar más de 4 cupos aunque no se indique la capacidad", () => {
    const resultado = validar({ cupos: 5 });
    expect(mensajeDe(resultado, "cupos")).toBe("La capacidad máxima es 4.");
  });

  test("debería rechazar cupos por encima de la capacidad del vehículo e informar el máximo", () => {
    // Arrange: vehículo de 3 pasajeros
    const opciones = { cuposMaximos: cuposPermitidos(3) };

    // Act / Assert
    expect(mensajeDe(validar({ cupos: 4 }, opciones), "cupos")).toBe("La capacidad máxima es 3.");
    expect(validar({ cupos: 3 }, opciones).ok).toBe(true);
  });

  test("debería aplicar el tope de 4 aunque el vehículo tenga más capacidad", () => {
    const opciones = { cuposMaximos: cuposPermitidos(7) };
    expect(mensajeDe(validar({ cupos: 5 }, opciones), "cupos")).toBe("La capacidad máxima es 4.");
    expect(validar({ cupos: 4 }, opciones).ok).toBe(true);
  });

  test("debería aceptar un aporte sugerido de 0", () => {
    const resultado = validar({ aporteSugerido: 0 });
    expect(resultado.ok).toBe(true);
    expect(resultado.datos.aporteSugerido).toBe(0);
  });

  test.each([-1, 2500.5, "2500"])("debería rechazar un aporte inválido (%p)", (aporteSugerido) => {
    const resultado = validar({ aporteSugerido });
    expect(mensajeDe(resultado, "aporteSugerido")).toBe(
      "El aporte sugerido debe ser un número entero mayor o igual a 0.",
    );
  });

  test.each([0, -2, 1.5, "1"])("debería rechazar una sede que no es un id válido (%p)", (sedeDestinoId) => {
    const resultado = validar({ sedeDestinoId });
    expect(mensajeDe(resultado, "sedeDestinoId")).toBe("La sede de destino no es válida.");
  });

  test.each(["05/11/2026", "2026-02-30", "2026-13-01"])(
    "debería rechazar una fecha con formato inválido (%p)",
    (fecha) => {
      const resultado = validar({ fecha });
      expect(mensajeDe(resultado, "fecha")).toBe("La fecha debe tener el formato AAAA-MM-DD.");
    },
  );

  test.each(["7:00", "24:00", "07:60", "7 a. m."])(
    "debería rechazar una hora con formato inválido (%p)",
    (hora) => {
      const resultado = validar({ hora });
      expect(mensajeDe(resultado, "hora")).toBe("La hora debe tener el formato HH:MM (24 horas).");
    },
  );

  test.each([
    ["2026-11-03", "18:00"],
    ["2026-11-04", "06:59"],
    ["2026-11-04", "07:00"],
  ])("debería rechazar una salida que ya pasó en hora de Colombia (%s %s)", (fecha, hora) => {
    const resultado = validar({ fecha, hora });
    expect(resultado.ok).toBe(false);
    expect(mensajeDe(resultado, "fecha")).toBe(
      "La fecha y la hora de salida deben ser posteriores al momento actual.",
    );
  });

  test("debería aceptar una salida del mismo día posterior a la hora actual de Colombia", () => {
    // 07:01 en Colombia aún es futuro, aunque en UTC ya sean más de las 12:00.
    expect(validar({ fecha: "2026-11-04", hora: "07:01" }).ok).toBe(true);
  });
});

describe("fechaEnColombia", () => {
  test("debería usar la fecha de Colombia (UTC-5) y no la de UTC", () => {
    // 4 nov 2026 a las 03:00 UTC todavía es 3 nov en Colombia.
    expect(fechaEnColombia(new Date("2026-11-04T03:00:00Z"))).toBe("2026-11-03");
    expect(fechaEnColombia(new Date("2026-11-04T05:00:00Z"))).toBe("2026-11-04");
  });
});

describe("verificarConductorHabilitado", () => {
  const perfilHabilitado = {
    id: "u1",
    estado: "Habilitado",
    vehiculo_id: "v1",
    capacidad_pasajeros: 4,
    licencia_vencimiento: "2029-09-15",
  };

  test("debería permitir publicar a un conductor habilitado con licencia vigente", () => {
    expect(verificarConductorHabilitado(perfilHabilitado, { ahora: AHORA })).toEqual({ ok: true });
  });

  test("debería permitir publicar si la licencia vence el mismo día", () => {
    const perfil = { ...perfilHabilitado, licencia_vencimiento: "2026-11-04" };
    expect(verificarConductorHabilitado(perfil, { ahora: AHORA }).ok).toBe(true);
  });

  test.each([
    ["no existe el perfil", null],
    ["la cuenta está «Verificada» pero no «Habilitado»", { estado: "Verificada" }],
    ["no tiene vehículo", { vehiculo_id: null }],
    ["no tiene licencia", { licencia_vencimiento: null }],
  ])("debería bloquear y pedir registrar el vehículo si %s", (_caso, cambios) => {
    // Arrange
    const perfil = cambios === null ? null : { ...perfilHabilitado, ...cambios };

    // Act
    const resultado = verificarConductorHabilitado(perfil, { ahora: AHORA });

    // Assert
    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe("sin_vehiculo_o_licencia");
    expect(resultado.mensaje).toMatch(/Registra tu vehículo y una licencia vigente/);
  });

  test("debería bloquear si la licencia venció", () => {
    // Arrange
    const perfil = { ...perfilHabilitado, licencia_vencimiento: "2026-11-03" };

    // Act
    const resultado = verificarConductorHabilitado(perfil, { ahora: AHORA });

    // Assert
    expect(resultado).toEqual({
      ok: false,
      motivo: "licencia_vencida",
      mensaje: "La licencia no está vigente. Actualízala para habilitar tu perfil de conductor.",
    });
  });

  test("debería dirigir a la pantalla de registro de vehículo", () => {
    expect(RUTA_PERFIL_VEHICULO).toBe("/perfil/vehiculo");
  });
});
