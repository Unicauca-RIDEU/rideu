import { pool } from "../config/database.js";
import { crearLicencia } from "./licencia.js";
import { ESTADO_VERIFICADA, habilitarUsuario } from "./usuario.js";

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
      `SELECT id, estado
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
