import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "../config/database.js";
import { env } from "../config/env.js";
import { hashToken } from "../models/usuario.js";
import { fechaEnColombia } from "../validation/trayecto.js";

// Datos de prueba para recorrer todas las funcionalidades (HU01–HU11) en el navegador.
// Uso: npm run db:seed --prefix backend   (después de npm run db:migrate)
//
// - Solo inserta: nunca borra ni modifica filas existentes.
// - Es idempotente: los identificadores se derivan de una clave fija, así que repetirlo
//   el mismo día no duplica nada. Los trayectos se fechan respecto al día en que se ejecuta;
//   al repetirlo otro día se agrega un lote nuevo con fechas vigentes.
// - Todas las cuentas usan la contraseña CONTRASENA_PRUEBA y correos «prueba.*».
//
// Cuentas:
//   prueba.conductora@unicauca.edu.co   Habilitado, vehículo de 4 pasajeros, licencia vigente
//   prueba.conductor@unicauca.edu.co    Habilitado, vehículo de 2 pasajeros, licencia vigente
//   prueba.licencia@unicauca.edu.co     Habilitado, licencia vencida: no puede publicar
//   prueba.pasajera@unicauca.edu.co     Verificada, con reservas confirmadas y canceladas
//   prueba.pasajero@unicauca.edu.co     Verificada, con reservas confirmadas
//   prueba.sinverificar@unicauca.edu.co Sin verificar, enlace de verificación vigente
//   prueba.expirado@unicauca.edu.co     Sin verificar, enlace de verificación expirado

export const CONTRASENA_PRUEBA = "RideU.prueba1";
const RONDAS_BCRYPT = 10;
const DIA_MS = 24 * 60 * 60 * 1000;

const USUARIOS = [
  { clave: "conductora", nombre: "Laura Muñoz Gómez", whatsapp: "+573001110001", estado: "Habilitado" },
  { clave: "conductor", nombre: "Andrés Calvache Ruiz", whatsapp: "+573001110002", estado: "Habilitado" },
  { clave: "licencia", nombre: "Camilo Ordóñez Paz", whatsapp: "+573001110003", estado: "Habilitado" },
  { clave: "pasajera", nombre: "Valentina Chicangana López", whatsapp: "+573001110004", estado: "Verificada" },
  { clave: "pasajero", nombre: "Santiago Guzmán Velasco", whatsapp: "+573001110005", estado: "Verificada" },
  { clave: "sinverificar", nombre: "Daniela Erazo Muñoz", whatsapp: "+573001110006", estado: "Sin verificar", tokenHoras: 24 },
  { clave: "expirado", nombre: "Felipe Bolaños Castro", whatsapp: "+573001110007", estado: "Sin verificar", tokenHoras: -24 },
];

// Vehículo y licencia de cada conductor. diasLicencia es relativo al día de ejecución.
const VEHICULOS = [
  { usuario: "conductora", placa: "PRU 101", marca: "Chevrolet", modelo: "Onix 2022", color: "Blanco", capacidad: 4, categoria: "B1", diasLicencia: 730 },
  { usuario: "conductor", placa: "PRU 202", marca: "Renault", modelo: "Kwid 2021", color: "Azul", capacidad: 2, categoria: "B1", diasLicencia: 365 },
  { usuario: "licencia", placa: "PRU 303", marca: "Mazda", modelo: "2 Sedán 2019", color: "Gris", capacidad: 4, categoria: "B1", diasLicencia: -30 },
];

// Sedes (004_sedes.sql): 1 FIET, 2 Ingeniería Civil, 3 Salud, 4 Humanas, 6 Artes, 7 Agropecuarias.
// dias es relativo al día de ejecución (negativo = ya ocurrió: «Completado» en el historial).
const TRAYECTOS = [
  { clave: "t1", conductor: "conductora", dias: 1, hora: "06:30", origen: "Barrio Bello Horizonte", sede: 1, cupos: 4, aporte: 3000 },
  { clave: "t2", conductor: "conductora", dias: 1, hora: "07:00", origen: "Parque Caldas", sede: 2, cupos: 3, aporte: 2500 },
  { clave: "t3", conductor: "conductora", dias: 2, hora: "06:45", origen: "La Esmeralda", sede: 1, cupos: 2, aporte: 2000 },
  { clave: "t4", conductor: "conductora", dias: 3, hora: "12:30", origen: "Barrio Bello Horizonte", sede: 4, cupos: 4, aporte: 3000 },
  { clave: "t5", conductor: "conductora", dias: 2, hora: "17:00", origen: "Campanario", sede: 1, cupos: 3, aporte: 2500, estado: "Cancelado" },
  { clave: "t6", conductor: "conductora", dias: -2, hora: "06:30", origen: "Barrio Bello Horizonte", sede: 1, cupos: 4, aporte: 3000 },
  { clave: "t7", conductor: "conductora", dias: -5, hora: "18:00", origen: "Parque Caldas", sede: 3, cupos: 2, aporte: 2000 },
  { clave: "t8", conductor: "conductor", dias: 1, hora: "06:15", origen: "Pomona", sede: 1, cupos: 2, aporte: 2500 },
  { clave: "t9", conductor: "conductor", dias: 0, hora: "23:30", origen: "Terminal de Transporte", sede: 6, cupos: 2, aporte: 4000 },
  { clave: "t10", conductor: "conductor", dias: 4, hora: "14:00", origen: "Pomona", sede: 7, cupos: 2, aporte: 5000 },
  { clave: "t11", conductor: "conductor", dias: -1, hora: "07:00", origen: "Pomona", sede: 2, cupos: 2, aporte: 2500 },
];

// t3 queda agotado (2 de 2) y t5 cancelado con su reserva cancelada.
const RESERVAS = [
  { trayecto: "t1", pasajero: "pasajera" },
  { trayecto: "t1", pasajero: "pasajero" },
  { trayecto: "t3", pasajero: "pasajera" },
  { trayecto: "t3", pasajero: "pasajero" },
  { trayecto: "t5", pasajero: "pasajera", estado: "Cancelada" },
  { trayecto: "t6", pasajero: "pasajera" },
  { trayecto: "t8", pasajero: "pasajero" },
  { trayecto: "t11", pasajero: "pasajera", estado: "Cancelada" },
  { trayecto: "t11", pasajero: "pasajero" },
];

// UUID con formato v4 derivado de una clave: el mismo texto produce siempre el mismo id.
function uuidDe(texto) {
  const h = createHash("sha256").update(`rideu-prueba:${texto}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// Token de verificación conocido, para poder abrir el enlace sin revisar el correo.
function tokenDe(clave) {
  return createHash("sha256").update(`rideu-prueba-token:${clave}`).digest("hex");
}

function correoDe(clave) {
  return `prueba.${clave}@unicauca.edu.co`;
}

function fechaRelativa(hoy, dias) {
  return fechaEnColombia(new Date(Date.parse(`${hoy}T12:00:00Z`) + dias * DIA_MS + 5 * 60 * 60 * 1000));
}

async function insertarSiFalta(cliente, sql, binds) {
  const resultado = await cliente.query(sql, binds);
  return resultado.rowCount;
}

async function sembrar() {
  const hoy = fechaEnColombia();
  const contrasenaHash = await bcrypt.hash(CONTRASENA_PRUEBA, RONDAS_BCRYPT);
  const cliente = await pool.connect();
  const conteo = { usuarios: 0, vehiculos: 0, licencias: 0, trayectos: 0, reservas: 0 };
  const ids = {};

  try {
    for (const usuario of USUARIOS) {
      const correo = correoDe(usuario.clave);
      conteo.usuarios += await insertarSiFalta(
        cliente,
        `INSERT INTO usuarios (id, nombre, correo, contrasena_hash, whatsapp, estado,
                               token_verificacion_hash, token_verificacion_expira)
         SELECT :id, :nombre, :correo, :contrasena_hash, :whatsapp, :estado, :token_hash, :token_expira
         FROM dual
         WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = :correo)`,
        {
          id: uuidDe(`usuario:${usuario.clave}`),
          nombre: usuario.nombre,
          correo,
          contrasena_hash: contrasenaHash,
          whatsapp: usuario.whatsapp,
          estado: usuario.estado,
          token_hash: hashToken(tokenDe(usuario.clave)),
          token_expira: new Date(Date.now() + (usuario.tokenHoras ?? 24) * 60 * 60 * 1000),
        },
      );
      // Si la cuenta ya existía, se usa su id real.
      const fila = await cliente.query("SELECT id FROM usuarios WHERE correo = :correo", { correo });
      ids[usuario.clave] = fila.rows[0].id;
    }

    const vehiculoDe = {};
    for (const vehiculo of VEHICULOS) {
      const usuarioId = ids[vehiculo.usuario];
      const id = uuidDe(`vehiculo:${vehiculo.usuario}`);
      conteo.vehiculos += await insertarSiFalta(
        cliente,
        `INSERT INTO vehiculos (id, usuario_id, placa, marca, modelo, color, capacidad_pasajeros)
         SELECT :id, :usuario_id, :placa, :marca, :modelo, :color, :capacidad
         FROM dual
         WHERE NOT EXISTS (SELECT 1 FROM vehiculos WHERE usuario_id = :usuario_id OR placa = :placa)`,
        {
          id,
          usuario_id: usuarioId,
          placa: vehiculo.placa,
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          color: vehiculo.color,
          capacidad: vehiculo.capacidad,
        },
      );
      const fila = await cliente.query(
        "SELECT id FROM vehiculos WHERE usuario_id = :usuario_id ORDER BY placa",
        { usuario_id: usuarioId },
      );
      vehiculoDe[vehiculo.usuario] = fila.rows[0]?.id;

      conteo.licencias += await insertarSiFalta(
        cliente,
        `INSERT INTO licencias (id, usuario_id, categoria, fecha_vencimiento)
         SELECT :id, :usuario_id, :categoria, TO_DATE(:vence, 'YYYY-MM-DD')
         FROM dual
         WHERE NOT EXISTS (SELECT 1 FROM licencias WHERE usuario_id = :usuario_id)`,
        {
          id: uuidDe(`licencia:${vehiculo.usuario}`),
          usuario_id: usuarioId,
          categoria: vehiculo.categoria,
          vence: fechaRelativa(hoy, vehiculo.diasLicencia),
        },
      );
    }

    const confirmadas = {};
    for (const reserva of RESERVAS) {
      if ((reserva.estado ?? "Confirmada") === "Confirmada") {
        confirmadas[reserva.trayecto] = (confirmadas[reserva.trayecto] ?? 0) + 1;
      }
    }

    const trayectoId = {};
    for (const trayecto of TRAYECTOS) {
      const id = uuidDe(`trayecto:${trayecto.clave}:${hoy}`);
      trayectoId[trayecto.clave] = id;
      const estado = trayecto.estado ?? "Disponible";
      const disponibles = estado === "Cancelado" ? trayecto.cupos : trayecto.cupos - (confirmadas[trayecto.clave] ?? 0);
      conteo.trayectos += await insertarSiFalta(
        cliente,
        `INSERT INTO trayectos (id, conductor_id, vehiculo_id, sede_destino_id, origen, fecha, hora,
                                cupos, cupos_disponibles, aporte_sugerido, estado)
         SELECT :id, :conductor_id, :vehiculo_id, :sede, :origen, TO_DATE(:fecha, 'YYYY-MM-DD'), :hora,
                :cupos, :disponibles, :aporte, :estado
         FROM dual
         WHERE NOT EXISTS (SELECT 1 FROM trayectos WHERE id = :id)`,
        {
          id,
          conductor_id: ids[trayecto.conductor],
          vehiculo_id: vehiculoDe[trayecto.conductor],
          sede: trayecto.sede,
          origen: trayecto.origen,
          fecha: fechaRelativa(hoy, trayecto.dias),
          hora: trayecto.hora,
          cupos: trayecto.cupos,
          disponibles,
          aporte: trayecto.aporte,
          estado,
        },
      );
    }

    for (const reserva of RESERVAS) {
      conteo.reservas += await insertarSiFalta(
        cliente,
        `INSERT INTO reservas (id, trayecto_id, pasajero_id, estado)
         SELECT :id, :trayecto_id, :pasajero_id, :estado
         FROM dual
         WHERE NOT EXISTS (
           SELECT 1 FROM reservas WHERE trayecto_id = :trayecto_id AND pasajero_id = :pasajero_id
         )`,
        {
          id: uuidDe(`reserva:${reserva.trayecto}:${reserva.pasajero}:${hoy}`),
          trayecto_id: trayectoId[reserva.trayecto],
          pasajero_id: ids[reserva.pasajero],
          estado: reserva.estado ?? "Confirmada",
        },
      );
    }

    await cliente.commit();
  } catch (error) {
    await cliente.rollback();
    throw error;
  } finally {
    await cliente.release();
  }

  const enlace = (token) => `${env.appUrl}/registro/verificacion?token=${token}`;
  console.log(`Datos de prueba del ${hoy} (hora de Colombia).`);
  console.log(
    `Insertados: ${conteo.usuarios} usuarios, ${conteo.vehiculos} vehículos, ${conteo.licencias} licencias, ` +
      `${conteo.trayectos} trayectos y ${conteo.reservas} reservas (0 = ya existían).`,
  );
  console.log("Contraseña de todas las cuentas: la constante CONTRASENA_PRUEBA de backend/src/db/sembrar.js.");
  console.log("Enlaces de verificación:");
  console.log(`  Vigente:  ${enlace(tokenDe("sinverificar"))}`);
  console.log(`  Expirado: ${enlace(tokenDe("expirado"))}`);
  console.log(`  Ya usado: ${enlace(tokenDe("pasajera"))}`);
  console.log(`  Inválido: ${enlace("enlace-invalido")}`);
}

try {
  await sembrar();
} finally {
  await pool.end();
}
