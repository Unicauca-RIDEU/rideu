import { pool } from "../config/database.js";

export async function crearVehiculo({
  usuarioId,
  placa,
  marca,
  modelo,
  color,
  capacidadPasajeros,
}) {
  const resultado = await pool.query(
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
