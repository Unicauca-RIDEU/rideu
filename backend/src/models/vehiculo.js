import { randomUUID } from "node:crypto";
import { SALIDA, pool } from "../config/database.js";
import { actualizarLicenciaDeUsuario, crearLicencia } from "./licencia.js";
import { ESTADO_HABILITADO, ESTADO_VERIFICADA, habilitarUsuario } from "./usuario.js";

const DEVOLVER_VEHICULO = `RETURNING id, usuario_id, placa, marca, modelo, color, capacidad_pasajeros
     INTO :r_id, :r_usuario_id, :r_placa, :r_marca, :r_modelo, :r_color, :r_capacidad_pasajeros`;

const SALIDA_VEHICULO = {
  r_id: SALIDA.texto,
  r_usuario_id: SALIDA.texto,
  r_placa: SALIDA.texto,
  r_marca: SALIDA.texto,
  r_modelo: SALIDA.texto,
  r_color: SALIDA.texto,
  r_capacidad_pasajeros: SALIDA.numero,
};

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
       id,
       usuario_id,
       placa,
       marca,
       modelo,
       color,
       capacidad_pasajeros
     )
     VALUES (:id, :usuario_id, :placa, :marca, :modelo, :color, :capacidad_pasajeros)
     ${DEVOLVER_VEHICULO}`,
    {
      id: randomUUID(),
      usuario_id: usuarioId,
      placa,
      marca,
      modelo,
      color,
      capacidad_pasajeros: capacidadPasajeros,
      ...SALIDA_VEHICULO,
    },
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
     SET placa = :placa,
         marca = :marca,
         modelo = :modelo,
         color = :color,
         capacidad_pasajeros = :capacidad_pasajeros
     WHERE id = (
       SELECT id
       FROM vehiculos
       WHERE usuario_id = :usuario_id
       ORDER BY placa
       FETCH FIRST 1 ROWS ONLY
     )
     ${DEVOLVER_VEHICULO}`,
    {
      usuario_id: usuarioId,
      placa,
      marca,
      modelo,
      color,
      capacidad_pasajeros: capacidadPasajeros,
      ...SALIDA_VEHICULO,
    },
  );
  return resultado.rows[0] ?? null;
}

export async function buscarVehiculosPorUsuario(usuarioId) {
  const resultado = await pool.query(
    `SELECT id, usuario_id, placa, marca, modelo, color, capacidad_pasajeros
     FROM vehiculos
     WHERE usuario_id = :usuario_id`,
    { usuario_id: usuarioId },
  );
  return resultado.rows;
}

export async function eliminarVehiculo(id) {
  await pool.query("DELETE FROM vehiculos WHERE id = :id", { id });
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
  // En Oracle la transacción empieza con la primera sentencia de la conexión
  // y termina con commit() o rollback().
  const cliente = await pool.connect();
  try {
    const bloqueado = await cliente.query(
      `SELECT id, nombre, correo, estado
       FROM usuarios
       WHERE id = :id
       FOR UPDATE`,
      { id: usuarioId },
    );
    const fila = bloqueado.rows[0];
    if (!fila) {
      await cliente.rollback();
      return { ok: false, motivo: "usuario_inexistente" };
    }
    if (fila.estado === ESTADO_HABILITADO) {
      // La cuenta ya está habilitada: se actualizan sus datos (por ejemplo, al renovar la licencia).
      // La capacidad no puede quedar por debajo de los cupos de un trayecto que aún no ha salido.
      const publicados = await cliente.query(
        `SELECT MAX(t.cupos) AS cupos
         FROM trayectos t
         JOIN vehiculos v ON v.id = t.vehiculo_id
         WHERE v.usuario_id = :usuario_id
           AND t.estado = 'Disponible'
           AND TO_DATE(TO_CHAR(t.fecha, 'YYYY-MM-DD') || ' ' || t.hora, 'YYYY-MM-DD HH24:MI')
               > CAST(SYSTIMESTAMP AT TIME ZONE 'America/Bogota' AS DATE)`,
        { usuario_id: usuarioId },
      );
      const cuposPublicados = publicados.rows[0]?.cupos ?? 0;
      if (cuposPublicados > capacidadPasajeros) {
        await cliente.rollback();
        return { ok: false, motivo: "capacidad_insuficiente", cuposPublicados };
      }
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
      await cliente.commit();
      return { ok: true, actualizado: true, usuario: fila, vehiculo, licencia };
    }
    if (fila.estado !== ESTADO_VERIFICADA) {
      await cliente.rollback();
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
      await cliente.rollback();
      return { ok: false, motivo: "no_verificada", estado: fila.estado };
    }

    await cliente.commit();
    return { ok: true, usuario, vehiculo, licencia };
  } catch (error) {
    await cliente.rollback();
    throw error;
  } finally {
    await cliente.release();
  }
}
