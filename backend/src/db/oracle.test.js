import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { createApp } from "../app.js";
import { pool } from "../config/database.js";
import { buscarLicenciasPorUsuario } from "../models/licencia.js";
import { eliminarUsuario } from "../models/usuario.js";
import { buscarVehiculosPorUsuario, guardarVehiculoYLicencia } from "../models/vehiculo.js";
import { fechaEnColombia } from "../validation/trayecto.js";

// Pruebas de integración contra Oracle real: conexión, CRUD, relaciones, restricciones,
// transacciones y los endpoints de la API. Se omiten si Oracle no está disponible.
// Cada prueba crea sus propios datos con correos y placas únicos y los borra al terminar.

const app = createApp();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const LETRAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

test.after(() => pool.end());

async function oracleDisponible(t) {
  try {
    await pool.query("SELECT 1 FROM dual");
    return true;
  } catch {
    t.skip("Oracle no está disponible");
    return false;
  }
}

function correoUnico(prefijo) {
  return `${prefijo}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@unicauca.edu.co`;
}

function placaUnica() {
  const letra = () => LETRAS[Math.floor(Math.random() * LETRAS.length)];
  const numero = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `${letra()}${letra()}${letra()} ${numero}`;
}

function fechaFutura(dias) {
  return fechaEnColombia(new Date(Date.now() + dias * 24 * 60 * 60 * 1000));
}

// Registra la cuenta por la API y toma el token del enlace que el modo consola imprime.
async function registrar(correo) {
  const original = console.log;
  let token = null;
  console.log = (...partes) => {
    const encontrado = /token=([0-9a-f]+)/.exec(partes.join(" "));
    if (encontrado) {
      token = encontrado[1];
    }
  };
  try {
    const respuesta = await request(app).post("/api/auth/registro").send({
      nombre: "Ana Pérez Ñandú",
      correo,
      contrasena: "secreta12",
      whatsapp: "3001234567",
    });
    return { respuesta, token };
  } finally {
    console.log = original;
  }
}

async function crearCuentaConSesion(prefijo) {
  const correo = correoUnico(prefijo);
  const { respuesta, token } = await registrar(correo);
  assert.equal(respuesta.status, 201);
  const verificada = await request(app).post("/api/auth/verificacion").send({ token });
  assert.equal(verificada.status, 200);
  const login = await request(app).post("/api/auth/login").send({ correo, contrasena: "secreta12" });
  assert.equal(login.status, 200);
  return { correo, id: respuesta.body.usuario.id, sesion: `Bearer ${login.body.token}` };
}

function datosVehiculo(extra = {}) {
  return {
    placa: placaUnica(),
    marca: "Renault",
    modelo: "Logan",
    color: "Gris",
    capacidadPasajeros: 4,
    categoriaLicencia: "B1",
    fechaVencimientoLicencia: fechaFutura(365),
    ...extra,
  };
}

async function contar(tabla, columna, valor) {
  const resultado = await pool.query(
    `SELECT COUNT(*) AS total FROM ${tabla} WHERE ${columna} = :valor`,
    { valor },
  );
  return resultado.rows[0].total;
}

test("Oracle responde y el esquema tiene las seis tablas y las siete sedes", async (t) => {
  if (!(await oracleDisponible(t))) return;

  const version = await pool.query("SELECT banner FROM v$version");
  t.diagnostic(version.rows[0].banner);

  const tablas = await pool.query("SELECT table_name FROM user_tables ORDER BY table_name");
  assert.deepEqual(
    tablas.rows.map((fila) => fila.table_name),
    ["LICENCIAS", "SEDES", "SESIONES", "TRAYECTOS", "USUARIOS", "VEHICULOS"],
  );

  const sedes = await pool.query("SELECT id, nombre, ciudad FROM sedes ORDER BY id");
  assert.equal(sedes.rows.length, 7);
  assert.deepEqual(sedes.rows[4], {
    id: 5,
    nombre: "Sede Norte del Cauca",
    ciudad: "Santander de Quilichao",
  });
  assert.equal(sedes.rows[0].nombre, "Facultad de Ingeniería Electrónica y Telecomunicaciones");
});

test("flujo completo por la API: registro, sesión, vehículo, trayecto, búsqueda e historial", async (t) => {
  if (!(await oracleDisponible(t))) return;

  const correo = correoUnico("flujo");
  const ids = [];
  try {
    // Registro (crear) y duplicado.
    const { respuesta: registro, token } = await registrar(correo);
    assert.equal(registro.status, 201);
    const usuario = registro.body.usuario;
    ids.push(usuario.id);
    assert.match(usuario.id, UUID);
    assert.deepEqual(Object.keys(usuario).sort(), [
      "correo",
      "creado_en",
      "estado",
      "id",
      "nombre",
      "whatsapp",
    ]);
    assert.equal(usuario.nombre, "Ana Pérez Ñandú");
    assert.equal(usuario.whatsapp, "+573001234567");
    assert.equal(usuario.estado, "Sin verificar");
    assert.ok(Math.abs(new Date(usuario.creado_en).getTime() - Date.now()) < 5 * 60 * 1000);

    const duplicado = await registrar(correo);
    assert.equal(duplicado.respuesta.status, 409);

    // Inicio de sesión antes y después de verificar (actualizar estado).
    const sinVerificar = await request(app)
      .post("/api/auth/login")
      .send({ correo, contrasena: "secreta12" });
    assert.equal(sinVerificar.status, 403);
    assert.equal(sinVerificar.body.codigo, "EMAIL_NOT_VERIFIED");

    const verificacion = await request(app).post("/api/auth/verificacion").send({ token });
    assert.equal(verificacion.status, 200);
    assert.deepEqual(verificacion.body.usuario, {
      id: usuario.id,
      nombre: usuario.nombre,
      correo,
      estado: "Verificada",
    });
    const repetida = await request(app).post("/api/auth/verificacion").send({ token });
    assert.equal(repetida.status, 409);
    const invalida = await request(app).post("/api/auth/verificacion").send({ token: "no-existe" });
    assert.equal(invalida.status, 400);

    const login = await request(app).post("/api/auth/login").send({ correo, contrasena: "secreta12" });
    assert.equal(login.status, 200);
    const expira = new Date(login.body.expira).getTime() - Date.now();
    assert.ok(expira > 6.9 * 24 * 3600 * 1000 && expira <= 7 * 24 * 3600 * 1000);
    const sesion = `Bearer ${login.body.token}`;

    const actual = await request(app).get("/api/auth/sesion").set("Authorization", sesion);
    assert.equal(actual.status, 200);
    assert.deepEqual(actual.body.usuario, {
      id: usuario.id,
      nombre: usuario.nombre,
      correo,
      estado: "Verificada",
    });
    const sinSesion = await request(app).get("/api/auth/sesion").set("Authorization", "Bearer x");
    assert.equal(sinSesion.status, 401);

    // Vehículo y licencia: sin datos, creación en transacción y actualización.
    const vacio = await request(app).get("/api/vehiculos").set("Authorization", sesion);
    assert.deepEqual(vacio.body, { vehiculo: null, licencia: null });

    const sinPerfil = await request(app)
      .post("/api/trayectos")
      .set("Authorization", sesion)
      .send({});
    assert.equal(sinPerfil.status, 403);

    const vehiculo = datosVehiculo();
    const creado = await request(app).post("/api/vehiculos").set("Authorization", sesion).send(vehiculo);
    assert.equal(creado.status, 201);
    assert.equal(creado.body.usuario.estado, "Habilitado");
    assert.match(creado.body.vehiculo.id, UUID);
    assert.equal(creado.body.vehiculo.usuario_id, usuario.id);
    assert.equal(creado.body.vehiculo.placa, vehiculo.placa);
    assert.equal(creado.body.vehiculo.capacidad_pasajeros, 4);
    assert.equal(creado.body.licencia.categoria, "B1");
    assert.equal(typeof creado.body.licencia.fecha_vencimiento, "string");

    const nuevaFecha = fechaFutura(730);
    const actualizado = await request(app)
      .post("/api/vehiculos")
      .set("Authorization", sesion)
      .send({ ...vehiculo, color: "Azul", capacidadPasajeros: 3, fechaVencimientoLicencia: nuevaFecha });
    assert.equal(actualizado.status, 200);
    assert.equal(actualizado.body.vehiculo.id, creado.body.vehiculo.id);
    assert.equal(actualizado.body.vehiculo.color, "Azul");
    assert.equal(await contar("vehiculos", "usuario_id", usuario.id), 1);
    assert.equal(await contar("licencias", "usuario_id", usuario.id), 1);

    const consultado = await request(app).get("/api/vehiculos").set("Authorization", sesion);
    assert.deepEqual(consultado.body, {
      vehiculo: {
        placa: vehiculo.placa,
        marca: "Renault",
        modelo: "Logan",
        color: "Azul",
        capacidadPasajeros: 3,
      },
      licencia: { categoria: "B1", fechaVencimiento: nuevaFecha },
    });

    // La placa única se cumple entre usuarios y la API responde 409.
    const otra = await crearCuentaConSesion("placa");
    ids.push(otra.id);
    const placaRepetida = await request(app)
      .post("/api/vehiculos")
      .set("Authorization", otra.sesion)
      .send(datosVehiculo({ placa: vehiculo.placa }));
    assert.equal(placaRepetida.status, 409);
    assert.equal(placaRepetida.body.mensaje, "Ya existe un vehículo con esta placa.");
    assert.equal(await contar("vehiculos", "usuario_id", otra.id), 0);
    assert.equal(await contar("licencias", "usuario_id", otra.id), 0);

    // Publicación de trayectos.
    const publicacion = await request(app).get("/api/trayectos/publicacion").set("Authorization", sesion);
    assert.equal(publicacion.status, 200);
    assert.equal(publicacion.body.habilitado, true);
    assert.equal(publicacion.body.cuposMaximos, 3);
    assert.equal(publicacion.body.sedes.length, 7);
    assert.deepEqual(Object.keys(publicacion.body.sedes[0]), ["id", "nombre", "direccion", "ciudad"]);

    const fecha = fechaFutura(2);
    const trayecto = {
      origen: "Bello Horizonte",
      sedeDestinoId: 1,
      fecha,
      hora: "07:30",
      cupos: 3,
      aporteSugerido: 2500,
    };
    const publicado = await request(app).post("/api/trayectos").set("Authorization", sesion).send(trayecto);
    assert.equal(publicado.status, 201);
    assert.match(publicado.body.trayecto.id, UUID);
    const { id: trayectoId, creado_en: creadoEn, ...resto } = publicado.body.trayecto;
    assert.ok(!Number.isNaN(new Date(creadoEn).getTime()));
    assert.deepEqual(resto, {
      conductor_id: usuario.id,
      vehiculo_id: creado.body.vehiculo.id,
      sede_destino_id: 1,
      origen: "Bello Horizonte",
      fecha,
      hora: "07:30",
      cupos: 3,
      cupos_disponibles: 3,
      aporte_sugerido: 2500,
      estado: "Disponible",
      sede_destino: "Facultad de Ingeniería Electrónica y Telecomunicaciones",
    });

    const mismoHorario = await request(app).post("/api/trayectos").set("Authorization", sesion).send(trayecto);
    assert.equal(mismoHorario.status, 409);
    const sedeInexistente = await request(app)
      .post("/api/trayectos")
      .set("Authorization", sesion)
      .send({ ...trayecto, hora: "09:00", sedeDestinoId: 999 });
    assert.equal(sedeInexistente.status, 400);

    const segundo = await request(app)
      .post("/api/trayectos")
      .set("Authorization", sesion)
      .send({ ...trayecto, hora: "06:15", cupos: 1 });
    assert.equal(segundo.status, 201);

    // Búsqueda: filtra por sede, fecha y hora, y ordena por hora de salida.
    const busqueda = await request(app)
      .get("/api/trayectos")
      .query({ sedeDestinoId: 1, fecha, horaDesde: "06:00" })
      .set("Authorization", otra.sesion);
    assert.equal(busqueda.status, 200);
    const propios = busqueda.body.trayectos.filter((fila) => fila.conductor_nombre === usuario.nombre);
    assert.deepEqual(
      propios.map((fila) => fila.hora).filter((hora) => hora === "06:15" || hora === "07:30"),
      ["06:15", "07:30"],
    );
    const encontrado = busqueda.body.trayectos.find((fila) => fila.id === trayectoId);
    assert.deepEqual(encontrado, {
      id: trayectoId,
      fecha,
      hora: "07:30",
      origen: "Bello Horizonte",
      sede_destino_id: 1,
      sede_destino: "Facultad de Ingeniería Electrónica y Telecomunicaciones",
      cupos: 3,
      cupos_disponibles: 3,
      cupos_reservados: 0,
      aporte_sugerido: 2500,
      estado: "Disponible",
      conductor_nombre: usuario.nombre,
    });
    const desdeLas7 = await request(app)
      .get("/api/trayectos")
      .query({ sedeDestinoId: 1, fecha, horaDesde: "07:00" })
      .set("Authorization", otra.sesion);
    assert.ok(!desdeLas7.body.trayectos.some((fila) => fila.id === segundo.body.trayecto.id));
    assert.ok(desdeLas7.body.trayectos.some((fila) => fila.id === trayectoId));
    const otraSede = await request(app)
      .get("/api/trayectos")
      .query({ sedeDestinoId: 7, fecha, horaDesde: "00:00" })
      .set("Authorization", otra.sesion);
    assert.ok(!otraSede.body.trayectos.some((fila) => fila.id === trayectoId));

    // La capacidad no puede bajar de los cupos de un trayecto que aún no ha salido.
    const capacidadMenor = await request(app)
      .post("/api/vehiculos")
      .set("Authorization", sesion)
      .send({ ...vehiculo, capacidadPasajeros: 2 });
    assert.equal(capacidadMenor.status, 409);
    assert.match(capacidadMenor.body.mensaje, /con 3 cupos/);

    // Historial: solo lo propio, del más reciente al más antiguo.
    const historial = await request(app).get("/api/historial").set("Authorization", sesion);
    assert.equal(historial.status, 200);
    assert.equal(historial.body.total, 2);
    assert.deepEqual(historial.body.trayectos[0], {
      id: trayectoId,
      fecha,
      hora: "07:30",
      origen: "Bello Horizonte",
      sede_destino: "Facultad de Ingeniería Electrónica y Telecomunicaciones",
      cupos: 3,
      cupos_disponibles: 3,
      aporte_sugerido: 2500,
      estado_historial: "Pendiente",
    });
    assert.equal(historial.body.trayectos[1].hora, "06:15");
    const historialAjeno = await request(app).get("/api/historial").set("Authorization", otra.sesion);
    assert.equal(historialAjeno.body.total, 0);

    // Un trayecto cuya salida ya pasó figura como «Completado» y no aparece en la búsqueda.
    await pool.query("UPDATE trayectos SET fecha = TO_DATE(:fecha, 'YYYY-MM-DD') WHERE id = :id", {
      fecha: fechaFutura(-1),
      id: trayectoId,
    });
    const historialPasado = await request(app).get("/api/historial").set("Authorization", sesion);
    const pasado = historialPasado.body.trayectos.find((fila) => fila.id === trayectoId);
    assert.equal(pasado.estado_historial, "Completado");
    const busquedaPasada = await request(app)
      .get("/api/trayectos")
      .query({ sedeDestinoId: 1, fecha: fechaFutura(-1), horaDesde: "00:00" })
      .set("Authorization", sesion);
    assert.ok(!busquedaPasada.body.trayectos.some((fila) => fila.id === trayectoId));

    const sedes = await request(app).get("/api/sedes").set("Authorization", sesion);
    assert.equal(sedes.body.sedes.length, 7);

    // Cierre de sesión (eliminar).
    const cierre = await request(app).post("/api/auth/logout").set("Authorization", sesion);
    assert.equal(cierre.status, 200);
    const despues = await request(app).get("/api/auth/sesion").set("Authorization", sesion);
    assert.equal(despues.status, 401);

    // Borrar el usuario elimina en cascada sus sesiones, vehículos, licencias y trayectos.
    assert.equal(await contar("trayectos", "conductor_id", usuario.id), 2);
    await eliminarUsuario(usuario.id);
    for (const [tabla, columna] of [
      ["usuarios", "id"],
      ["sesiones", "usuario_id"],
      ["vehiculos", "usuario_id"],
      ["licencias", "usuario_id"],
      ["trayectos", "conductor_id"],
    ]) {
      assert.equal(await contar(tabla, columna, usuario.id), 0, tabla);
    }
  } finally {
    for (const id of ids) {
      await eliminarUsuario(id);
    }
  }
});

test("la transacción de vehículo y licencia se revierte completa si falla un paso", async (t) => {
  if (!(await oracleDisponible(t))) return;

  const cuenta = await crearCuentaConSesion("transaccion");
  try {
    // El vehículo se inserta, la licencia falla (categoría más larga que la columna):
    // el vehículo no debe quedar guardado ni la cuenta habilitada.
    const { fechaVencimientoLicencia, categoriaLicencia: _categoria, ...vehiculo } = datosVehiculo();
    await assert.rejects(
      guardarVehiculoYLicencia({
        ...vehiculo,
        usuarioId: cuenta.id,
        categoriaLicencia: "B".repeat(101),
        fechaVencimientoLicencia,
      }),
      { code: "ORA-12899" },
    );
    assert.deepEqual(await buscarVehiculosPorUsuario(cuenta.id), []);
    assert.deepEqual(await buscarLicenciasPorUsuario(cuenta.id), []);
    const estado = await pool.query("SELECT estado FROM usuarios WHERE id = :id", { id: cuenta.id });
    assert.equal(estado.rows[0].estado, "Verificada");

    // Con datos válidos la misma operación confirma los tres cambios.
    const guardado = await guardarVehiculoYLicencia({
      ...vehiculo,
      usuarioId: cuenta.id,
      categoriaLicencia: "B1",
      fechaVencimientoLicencia,
    });
    assert.equal(guardado.ok, true);
    assert.equal(guardado.usuario.estado, "Habilitado");
    const licencias = await buscarLicenciasPorUsuario(cuenta.id);
    assert.equal(licencias.length, 1);
    assert.ok(licencias[0].fecha_vencimiento instanceof Date);
    assert.equal((await buscarVehiculosPorUsuario(cuenta.id)).length, 1);

    // Una conexión de transacción no confirma nada hasta commit().
    const cliente = await pool.connect();
    try {
      await cliente.query("UPDATE usuarios SET nombre = 'Sin confirmar' WHERE id = :id", {
        id: cuenta.id,
      });
      const fuera = await pool.query("SELECT nombre FROM usuarios WHERE id = :id", { id: cuenta.id });
      assert.equal(fuera.rows[0].nombre, "Ana Pérez Ñandú");
      await cliente.rollback();
    } finally {
      await cliente.release();
    }
    const final = await pool.query("SELECT nombre FROM usuarios WHERE id = :id", { id: cuenta.id });
    assert.equal(final.rows[0].nombre, "Ana Pérez Ñandú");
  } finally {
    await eliminarUsuario(cuenta.id);
  }
});

test("las restricciones de integridad rechazan los datos inválidos", async (t) => {
  if (!(await oracleDisponible(t))) return;

  const cuenta = await crearCuentaConSesion("restricciones");
  try {
    const vehiculo = await request(app)
      .post("/api/vehiculos")
      .set("Authorization", cuenta.sesion)
      .send(datosVehiculo());
    assert.equal(vehiculo.status, 201);

    const usuarioInvalido = (cambios) =>
      pool.query(
        `INSERT INTO usuarios (id, nombre, correo, contrasena_hash, whatsapp, estado,
                               token_verificacion_hash, token_verificacion_expira)
         VALUES (:id, 'Prueba', :correo, 'hash', :whatsapp, :estado, :token, SYSTIMESTAMP)`,
        {
          id: `prueba-${Date.now()}`,
          correo: correoUnico("invalido"),
          whatsapp: "+573001234567",
          estado: "Sin verificar",
          token: `t-${Date.now()}`,
          ...cambios,
        },
      );
    const trayectoInvalido = (cambios) =>
      pool.query(
        `INSERT INTO trayectos (id, conductor_id, vehiculo_id, sede_destino_id, origen, fecha, hora,
                                cupos, aporte_sugerido, cupos_disponibles)
         VALUES (:id, :conductor_id, :vehiculo_id, :sede, :origen, TO_DATE(:fecha, 'YYYY-MM-DD HH24:MI'),
                 :hora, :cupos, :aporte, :disponibles)`,
        {
          id: `prueba-${Date.now()}`,
          conductor_id: cuenta.id,
          vehiculo_id: vehiculo.body.vehiculo.id,
          sede: 1,
          origen: "Centro",
          fecha: `${fechaFutura(3)} 00:00`,
          hora: "08:00",
          cupos: 2,
          aporte: 0,
          disponibles: 2,
          ...cambios,
        },
      );

    // CHECK (ORA-02290), con el nombre de cada restricción.
    const casos = [
      [() => usuarioInvalido({ correo: "ana@gmail.com" }), "USUARIOS_CORREO_INSTITUCIONAL"],
      [() => usuarioInvalido({ correo: "ana perez@unicauca.edu.co" }), "USUARIOS_CORREO_INSTITUCIONAL"],
      [() => usuarioInvalido({ whatsapp: "+571001234567" }), "USUARIOS_WHATSAPP_COLOMBIA"],
      [() => usuarioInvalido({ estado: "Bloqueado" }), "USUARIOS_ESTADO_VALIDO"],
      [() => trayectoInvalido({ cupos: 5, disponibles: 5 }), "TRAYECTOS_CUPOS_VALIDOS"],
      [() => trayectoInvalido({ disponibles: 3 }), "TRAYECTOS_CUPOS_DISPONIBLES_VALIDOS"],
      [() => trayectoInvalido({ aporte: -1 }), "TRAYECTOS_APORTE_VALIDO"],
      [() => trayectoInvalido({ hora: "24:00" }), "TRAYECTOS_HORA_VALIDA"],
      [() => trayectoInvalido({ fecha: `${fechaFutura(3)} 10:30` }), "TRAYECTOS_FECHA_SIN_HORA"],
    ];
    for (const [insertar, restriccion] of casos) {
      await assert.rejects(insertar(), (error) => {
        assert.equal(error.code, "ORA-02290", restriccion);
        assert.ok(error.message.includes(restriccion), `${restriccion}: ${error.message}`);
        return true;
      });
    }

    // NOT NULL: en Oracle una cadena vacía o de solo espacios en origen no pasa.
    await assert.rejects(trayectoInvalido({ origen: "" }), { code: "ORA-01400" });
    await assert.rejects(trayectoInvalido({ origen: "   " }), { code: "ORA-02290" });

    // Claves foráneas (ORA-02291): sede, conductor y vehículo deben existir.
    await assert.rejects(trayectoInvalido({ sede: 999 }), { code: "ORA-02291" });
    await assert.rejects(trayectoInvalido({ conductor_id: "no-existe" }), { code: "ORA-02291" });
    await assert.rejects(trayectoInvalido({ vehiculo_id: "no-existe" }), { code: "ORA-02291" });

    // Una sede con trayectos no se puede borrar (ORA-02292): esa relación no es en cascada.
    const valido = await trayectoInvalido({});
    assert.equal(valido.rowCount, 1);
    await assert.rejects(pool.query("DELETE FROM sedes WHERE id = 1"), { code: "ORA-02292" });

    // Unicidad (ORA-00001) con el nombre de la restricción en error.constraint.
    await assert.rejects(usuarioInvalido({ correo: cuenta.correo }), {
      code: "ORA-00001",
      constraint: "usuarios_correo_unico",
    });
    assert.equal(await contar("usuarios", "nombre", "Prueba"), 0);
  } finally {
    await eliminarUsuario(cuenta.id);
  }
});
