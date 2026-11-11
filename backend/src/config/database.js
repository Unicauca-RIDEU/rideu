import oracledb from "oracledb";
import { env } from "./env.js";

// Conexión centralizada a Oracle Database con node-oracledb en modo Thin
// (no necesita Oracle Instant Client). Los modelos solo usan `pool` y `SALIDA`.

// Tipos para los binds de salida de `RETURNING ... INTO :r_columna`.
export const SALIDA = {
  texto: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 4000 },
  numero: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  fecha: { dir: oracledb.BIND_OUT, type: oracledb.DATE },
  instante: { dir: oracledb.BIND_OUT, type: oracledb.DB_TYPE_TIMESTAMP_TZ },
};

const PREFIJO_SALIDA = "r_";
const OPCIONES = { outFormat: oracledb.OUT_FORMAT_OBJECT };

let poolOracle = null;

// El pool se crea en la primera consulta, para que el proceso arranque aunque la base no responda.
function obtenerPool() {
  if (!poolOracle) {
    poolOracle = oracledb
      .createPool({
        user: env.dbUser,
        password: env.dbPassword,
        connectString: env.dbConnectString,
        poolMin: env.dbPoolMin,
        poolMax: env.dbPoolMax,
        poolIncrement: 1,
      })
      .catch((error) => {
        poolOracle = null;
        throw error;
      });
  }
  return poolOracle;
}

// Oracle devuelve los nombres de columna en mayúscula; la aplicación los usa en minúscula.
function filaEnMinusculas(fila) {
  const salida = {};
  for (const [columna, valor] of Object.entries(fila)) {
    salida[columna.toLowerCase()] = valor;
  }
  return salida;
}

// Convierte los binds de salida de un DML con RETURNING ({ r_id: [..], r_nombre: [..] })
// en filas ({ id, nombre }), una por cada fila afectada.
function filasDeSalida(outBinds) {
  const columnas = Object.keys(outBinds);
  const total = Array.isArray(outBinds[columnas[0]]) ? outBinds[columnas[0]].length : 0;
  const filas = [];
  for (let i = 0; i < total; i += 1) {
    const fila = {};
    for (const columna of columnas) {
      const nombre = columna.startsWith(PREFIJO_SALIDA)
        ? columna.slice(PREFIJO_SALIDA.length)
        : columna;
      fila[nombre.toLowerCase()] = outBinds[columna][i];
    }
    filas.push(fila);
  }
  return filas;
}

// ORA-00001: deja el nombre de la restricción en error.constraint, en minúscula y sin esquema.
// El mensaje la trae como «(ESQUEMA.NOMBRE)», sea cual sea el idioma de la sesión.
function completarError(error) {
  if (error?.errorNum === 1 && typeof error.message === "string") {
    const nombres = /\(([\w$#]+)\.([\w$#]+)\)/.exec(error.message);
    if (nombres) {
      error.constraint = nombres[2].toLowerCase();
    }
  }
  return error;
}

async function ejecutar(conexion, sql, binds, autoCommit) {
  try {
    const resultado = await conexion.execute(sql, binds, { ...OPCIONES, autoCommit });
    if (resultado.outBinds && !Array.isArray(resultado.outBinds)) {
      const rows = filasDeSalida(resultado.outBinds);
      return { rows, rowCount: resultado.rowsAffected ?? rows.length };
    }
    const rows = (resultado.rows ?? []).map(filaEnMinusculas);
    return { rows, rowCount: resultado.rowsAffected ?? rows.length };
  } catch (error) {
    throw completarError(error);
  }
}

export const pool = {
  // Consulta suelta: toma una conexión, confirma el cambio y la devuelve al pool.
  async query(sql, binds = {}) {
    const conexion = await (await obtenerPool()).getConnection();
    try {
      return await ejecutar(conexion, sql, binds, true);
    } finally {
      await conexion.close();
    }
  },

  // Conexión para una transacción: nada se confirma hasta llamar a commit().
  async connect() {
    const conexion = await (await obtenerPool()).getConnection();
    return {
      query: (sql, binds = {}) => ejecutar(conexion, sql, binds, false),
      commit: () => conexion.commit(),
      rollback: () => conexion.rollback(),
      release: () => conexion.close(),
    };
  },

  async end() {
    if (poolOracle) {
      const abierto = await poolOracle;
      poolOracle = null;
      await abierto.close(10);
    }
  },
};
