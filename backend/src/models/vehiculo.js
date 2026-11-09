import { pool } from "../config/database.js";
import { actualizarLicenciaDeUsuario, crearLicencia } from "./licencia.js";
import { ESTADO_HABILITADO, ESTADO_VERIFICADA, habilitarUsuario } from "./usuario.js";

export async function crearVehiculo({
  usuarioId,
  placa,
  marca,
  modelo,
  color,
  capacidadPasajeros,
}, db = pool) {
  const resultado = await db.query(
    `INSERT INTO vehiculos (
       usuario_id,
       placa,
       marca,
       modelo,
       color,
       capacidad_pasajeros
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, usuario_id, placa, marca, modelo, color, capacidad_pasajeros`,
    [usuarioId, placa, marca, modelo, color, capacidadPasajeros],
  );
  return resultado.rows[0];
}

// Actualiza el vehículo del usuario (el mismo que usa su perfil de conductor);
// devuelve null si no tiene ninguno.
export async function actualizarVehiculoDeUsuario({
  usuarioId,
  placa,
  marca,
  modelo,
  color,
  capacidadPasajeros,
}, db = pool) {
  const resultado = await db.query(
    `UPDATE vehiculos
     SET placa = $2,
         marca = $3,
         modelo = $4,
         color = $5,
         capacidad_pasajeros = $6
     WHERE id = (
       SELECT id
       FROM vehiculos
       WHERE usuario_id = $1
       ORDER BY placa
       LIMIT 1
     )
     RETURNING id, usuario_id, placa, marca, modelo, color, capacidad_pasajeros`,
    [usuarioId, placa, marca, modelo, color, capacidadPasajeros],
  );
  return resultado.rows[0] ?? null;
}

export async function buscarVehiculosPorUsuario(usuarioId) {
  const resultado = await pool.query(
    `SELECT id, usuario_id, placa, marca, modelo, color, capacidad_pasajeros
     FROM vehiculos
     WHERE usuario_id = $1`,
    [usuarioId],
  );
  return resultado.rows;
}

export async function eliminarVehiculo(id) {
  await pool.query("DELETE FROM vehiculos WHERE id = $1", [id]);
}

export async function guardarVehiculoYLicencia({
  usuarioId,
  placa,
  marca,
  modelo,
  color,
  capacidadPasajeros,
  categoriaLicencia,
  fechaVencimientoLicencia,
}) {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const bloqueado = await cliente.query(
      `SELECT id, nombre, correo, estado
       FROM usuarios
       WHERE id = $1
       FOR UPDATE`,
      [usuarioId],
    );
    const fila = bloqueado.rows[0];
    if (!fila) {
      await cliente.query("ROLLBACK");
      return { ok: false, motivo: "usuario_inexistente" };
    }
    if (fila.estado === ESTADO_HABILITADO) {
      // La cuenta ya está habilitada: se actualizan sus datos (por ejemplo, al renovar la licencia).
      const datosVehiculo = { usuarioId, placa, marca, modelo, color, capacidadPasajeros };
      const datosLicencia = {
        usuarioId,
        categoria: categoriaLicencia,
        fechaVencimiento: fechaVencimientoLicencia,
      };
      const vehiculo =
        (await actualizarVehiculoDeUsuario(datosVehiculo, cliente)) ??
        (await crearVehiculo(datosVehiculo, cliente));
      const licencia =
        (await actualizarLicenciaDeUsuario(datosLicencia, cliente)) ??
        (await crearLicencia(datosLicencia, cliente));
      await cliente.query("COMMIT");
      return { ok: true, actualizado: true, usuario: fila, vehiculo, licencia };
    }
    if (fila.estado !== ESTADO_VERIFICADA) {
      await cliente.query("ROLLBACK");
      return { ok: false, motivo: "no_verificada", estado: fila.estado };
    }

    const vehiculo = await crearVehiculo(
      { usuarioId, placa, marca, modelo, color, capacidadPasajeros },
      cliente,
    );
    const licencia = await crearLicencia(
      {
        usuarioId,
        categoria: categoriaLicencia,
        fechaVencimiento: fechaVencimientoLicencia,
      },
      cliente,
    );
    const usuario = await habilitarUsuario(usuarioId, cliente);
    if (!usuario) {
      await cliente.query("ROLLBACK");
      return { ok: false, motivo: "no_verificada", estado: fila.estado };
    }

    await cliente.query("COMMIT");
    return { ok: true, usuario, vehiculo, licencia };
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}
