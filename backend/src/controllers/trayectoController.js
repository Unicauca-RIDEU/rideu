import { buscarSedePorId, listarSedes } from "../models/sede.js";
import {
  actualizarTrayecto,
  buscarPerfilConductor,
  buscarTrayectoParaEdicion,
  buscarTrayectosDisponibles,
  cancelarTrayecto,
  crearTrayecto,
  existeTrayectoEnHorario,
  listarTrayectosEditables,
  listarTrayectosProximos,
} from "../models/trayecto.js";
import { enviarCorreoTrayectoCancelado } from "../services/correo.js";
import { validarIdTrayecto } from "../validation/reserva.js";
import {
  RUTA_PERFIL_VEHICULO,
  cuposPermitidos,
  momentoEnColombia,
  motivoParaNoModificar,
  validarBusqueda,
  validarEdicionTrayecto,
  validarFiltrosListado,
  validarTrayecto,
  verificarConductorHabilitado,
} from "../validation/trayecto.js";

// Publicación de trayectos (E02-HU04).
// El conductor es siempre el usuario de la sesión (req.usuario), nunca un dato del cuerpo.

export async function publicarTrayecto(req, res) {
  try {
    const perfil = await buscarPerfilConductor(req.usuario.id);
    const habilitacion = verificarConductorHabilitado(perfil);
    if (!habilitacion.ok) {
      return res.status(403).json({
        mensaje: habilitacion.mensaje,
        motivo: habilitacion.motivo,
        redireccion: RUTA_PERFIL_VEHICULO,
      });
    }

    const cuposMaximos = cuposPermitidos(perfil.capacidad_pasajeros);
    const validacion = validarTrayecto(req.body, { cuposMaximos });
    if (!validacion.ok) {
      return res.status(400).json({
        mensaje: validacion.mensaje,
        errores: validacion.errores,
        cuposMaximos,
      });
    }

    const sede = await buscarSedePorId(validacion.datos.sedeDestinoId);
    if (!sede) {
      const mensaje = "La sede de destino no existe.";
      return res.status(400).json({
        mensaje,
        errores: [{ campo: "sedeDestinoId", mensaje }],
        cuposMaximos,
      });
    }

    const duplicado = await existeTrayectoEnHorario({
      conductorId: req.usuario.id,
      fecha: validacion.datos.fecha,
      hora: validacion.datos.hora,
    });
    if (duplicado) {
      const mensaje = "Ya tienes un trayecto publicado para esa fecha y hora.";
      return res.status(409).json({
        mensaje,
        errores: [{ campo: "hora", mensaje }],
        cuposMaximos,
      });
    }

    const trayecto = await crearTrayecto({
      ...validacion.datos,
      conductorId: req.usuario.id,
      vehiculoId: perfil.vehiculo_id,
    });

    return res.status(201).json({
      mensaje: "Trayecto publicado. Ya está disponible para los pasajeros.",
      trayecto: { ...trayecto, sede_destino: sede.nombre },
    });
  } catch (error) {
    console.error("Error al publicar el trayecto:", error);
    return res.status(500).json({ mensaje: "No se pudo publicar el trayecto." });
  }
}

// Datos que necesita la pantalla /trayectos/publicar: si el conductor puede publicar,
// su vehículo, el máximo de cupos permitido y las sedes de destino.
export async function datosPublicacion(req, res) {
  try {
    const [perfil, sedes] = await Promise.all([
      buscarPerfilConductor(req.usuario.id),
      listarSedes(),
    ]);
    const habilitacion = verificarConductorHabilitado(perfil);

    return res.status(200).json({
      habilitado: habilitacion.ok,
      motivo: habilitacion.ok ? null : habilitacion.motivo,
      mensaje: habilitacion.ok ? null : habilitacion.mensaje,
      redireccion: habilitacion.ok ? null : RUTA_PERFIL_VEHICULO,
      conductor: { nombre: perfil?.nombre ?? req.usuario.nombre, estado: perfil?.estado ?? null },
      vehiculo: perfil?.vehiculo_id
        ? {
            placa: perfil.placa,
            marca: perfil.marca,
            modelo: perfil.modelo,
            color: perfil.color,
            capacidadPasajeros: perfil.capacidad_pasajeros,
          }
        : null,
      cuposMaximos: habilitacion.ok ? cuposPermitidos(perfil.capacidad_pasajeros) : 0,
      sedes,
    });
  } catch (error) {
    console.error("Error al consultar los datos de publicación:", error);
    return res.status(500).json({ mensaje: "No se pudieron cargar los datos para publicar." });
  }
}

export const MENSAJE_SIN_RESULTADOS = "No hay resultados disponibles";

// Búsqueda de trayectos (E03-HU06): GET /api/trayectos?sedeDestinoId=&fecha=&horaDesde=
// Devuelve los trayectos activos con cupos, ordenados por hora de salida.
export async function buscarTrayectos(req, res) {
  const validacion = validarBusqueda(req.query);
  if (!validacion.ok) {
    return res.status(400).json({ mensaje: validacion.mensaje, errores: validacion.errores });
  }

  try {
    const sede = await buscarSedePorId(validacion.datos.sedeDestinoId);
    if (!sede) {
      const mensaje = "La sede de destino no existe.";
      return res.status(400).json({ mensaje, errores: [{ campo: "sedeDestinoId", mensaje }] });
    }

    const trayectos = await buscarTrayectosDisponibles({
      ...validacion.datos,
      ahoraColombia: momentoEnColombia(),
    });

    return res.status(200).json({
      mensaje: trayectos.length === 0 ? MENSAJE_SIN_RESULTADOS : null,
      total: trayectos.length,
      filtros: { ...validacion.datos, sedeDestino: sede.nombre },
      trayectos,
    });
  } catch (error) {
    console.error("Error al buscar trayectos:", error);
    return res.status(500).json({ mensaje: "No se pudieron buscar los trayectos." });
  }
}

// Listado de trayectos próximos (E03-HU06, rediseño de Buscar) · GET /api/trayectos/disponibles
// Sin filtros devuelve todos los trayectos próximos con cupos; sede, fecha y hora son opcionales.
export async function listarTrayectosDisponibles(req, res) {
  const validacion = validarFiltrosListado(req.query);
  if (!validacion.ok) {
    return res.status(400).json({ mensaje: validacion.mensaje, errores: validacion.errores });
  }

  try {
    let sedeDestino = null;
    if (validacion.datos.sedeDestinoId) {
      const sede = await buscarSedePorId(validacion.datos.sedeDestinoId);
      if (!sede) {
        const mensaje = "La sede de destino no existe.";
        return res.status(400).json({ mensaje, errores: [{ campo: "sedeDestinoId", mensaje }] });
      }
      sedeDestino = sede.nombre;
    }

    const trayectos = await listarTrayectosProximos({
      ...validacion.datos,
      ahoraColombia: momentoEnColombia(),
    });

    return res.status(200).json({
      mensaje: trayectos.length === 0 ? MENSAJE_SIN_RESULTADOS : null,
      total: trayectos.length,
      filtros: { ...validacion.datos, sedeDestino },
      trayectos,
    });
  } catch (error) {
    console.error("Error al listar los trayectos:", error);
    return res.status(500).json({ mensaje: "No se pudieron cargar los trayectos." });
  }
}

// Edición y cancelación de trayectos (E02-HU05).
// Solo el conductor que publicó el trayecto (req.usuario) puede editarlo o cancelarlo,
// y solo mientras está «Disponible» y no ha salido.

export const MENSAJE_SIN_EDITABLES = "No tienes trayectos vigentes para editar o cancelar.";

// Motivo por el que no se puede modificar el trayecto → estado HTTP, código y mensaje.
const RECHAZOS_GESTION = {
  trayecto_inexistente: { status: 404, codigo: "TRAYECTO_INEXISTENTE", mensaje: "El trayecto no existe." },
  trayecto_ajeno: {
    status: 403,
    codigo: "TRAYECTO_AJENO",
    mensaje: "Solo el conductor que publicó el trayecto puede modificarlo.",
  },
  trayecto_cancelado: {
    status: 409,
    codigo: "TRAYECTO_CANCELADO",
    mensaje: "Este trayecto ya fue cancelado.",
  },
  trayecto_iniciado: {
    status: 409,
    codigo: "TRAYECTO_INICIADO",
    mensaje: "Este trayecto ya inició y no se puede modificar.",
  },
};

function responderRechazo(res, motivo) {
  const rechazo = RECHAZOS_GESTION[motivo];
  return res.status(rechazo.status).json({ codigo: rechazo.codigo, mensaje: rechazo.mensaje });
}

// Lo que la pantalla /trayectos/editar necesita de cada trayecto.
function presentarEditable(fila) {
  return {
    id: fila.id,
    fecha: fila.fecha,
    hora: fila.hora,
    origen: fila.origen,
    sede_destino: fila.sede_destino,
    cupos: fila.cupos,
    cupos_disponibles: fila.cupos_disponibles,
    cupos_reservados: fila.cupos_reservados,
    aporte_sugerido: fila.aporte_sugerido,
    estado: fila.estado,
    cupos_maximos: cuposPermitidos(fila.vehiculo_capacidad),
  };
}

// GET /api/trayectos/mios — trayectos vigentes del conductor de la sesión.
export async function misTrayectos(req, res) {
  try {
    const filas = await listarTrayectosEditables({
      conductorId: req.usuario.id,
      ahoraColombia: momentoEnColombia(),
    });
    return res.status(200).json({
      mensaje: filas.length === 0 ? MENSAJE_SIN_EDITABLES : null,
      total: filas.length,
      trayectos: filas.map(presentarEditable),
    });
  } catch (error) {
    console.error("Error al consultar los trayectos del conductor:", error);
    return res.status(500).json({ mensaje: "No se pudieron cargar tus trayectos." });
  }
}

// PATCH /api/trayectos/:id — cambia la fecha, la hora o los cupos de un trayecto vigente.
// Los pasajeros que aún no han reservado ven el cambio en la búsqueda y en el detalle.
export async function editarTrayecto(req, res) {
  const id = validarIdTrayecto(req.params.id);
  if (!id.ok) {
    return res.status(400).json({ mensaje: id.mensaje, errores: id.errores });
  }
  const trayectoId = id.datos.id;

  try {
    const ahoraColombia = momentoEnColombia();
    const actual = await buscarTrayectoParaEdicion({ trayectoId, ahoraColombia });
    const motivo = motivoParaNoModificar(actual, req.usuario.id);
    if (motivo) {
      return responderRechazo(res, motivo);
    }

    const cuposMaximos = cuposPermitidos(actual.vehiculo_capacidad);
    const validacion = validarEdicionTrayecto(req.body, {
      cuposMaximos,
      cuposReservados: actual.cupos_reservados,
    });
    if (!validacion.ok) {
      return res.status(400).json({
        mensaje: validacion.mensaje,
        errores: validacion.errores,
        cuposMaximos,
        cuposReservados: actual.cupos_reservados,
      });
    }
    const { fecha, hora, cupos } = validacion.datos;

    if (fecha !== actual.fecha || hora !== actual.hora) {
      const duplicado = await existeTrayectoEnHorario({
        conductorId: req.usuario.id,
        fecha,
        hora,
        excluirId: trayectoId,
      });
      if (duplicado) {
        const mensaje = "Ya tienes un trayecto publicado para esa fecha y hora.";
        return res.status(409).json({ mensaje, errores: [{ campo: "hora", mensaje }] });
      }
    }

    const actualizado = await actualizarTrayecto({
      trayectoId,
      conductorId: req.usuario.id,
      fecha,
      hora,
      cupos,
      ahoraColombia,
    });
    if (!actualizado) {
      return res.status(409).json({
        codigo: "TRAYECTO_MODIFICADO",
        mensaje: "El trayecto cambió mientras lo editabas. Vuelve a cargarlo e inténtalo de nuevo.",
      });
    }

    const reservados = actual.cupos_reservados;
    return res.status(200).json({
      mensaje: "Cambios guardados. Los pasajeros ya ven la información actualizada.",
      trayecto: {
        id: trayectoId,
        fecha,
        hora,
        cupos,
        cupos_reservados: reservados,
        cupos_disponibles: cupos - reservados,
        cupos_maximos: cuposMaximos,
      },
    });
  } catch (error) {
    console.error("Error al editar el trayecto:", error);
    return res.status(500).json({ mensaje: "No se pudieron guardar los cambios." });
  }
}

// POST /api/trayectos/:id/cancelacion — cancela un trayecto vigente.
// Con reservas confirmadas exige { "confirmar": true }; sin ella responde 409 con el número
// de pasajeros afectados. Al cancelar, se avisa por correo a cada pasajero afectado.
export async function cancelarTrayectoPublicado(req, res) {
  const id = validarIdTrayecto(req.params.id);
  if (!id.ok) {
    return res.status(400).json({ mensaje: id.mensaje, errores: id.errores });
  }

  try {
    const resultado = await cancelarTrayecto({
      trayectoId: id.datos.id,
      conductorId: req.usuario.id,
      ahoraColombia: momentoEnColombia(),
      confirmar: req.body?.confirmar === true,
    });

    if (!resultado.ok && resultado.motivo === "requiere_confirmacion") {
      const total = resultado.pasajerosAfectados;
      return res.status(409).json({
        codigo: "CONFIRMACION_REQUERIDA",
        mensaje: `Este trayecto tiene ${textoPasajeros(total)} con reserva confirmada. Confirma la cancelación para cancelar sus reservas y avisarles.`,
        pasajerosAfectados: total,
      });
    }
    if (!resultado.ok) {
      return responderRechazo(res, resultado.motivo);
    }

    const notificados = await notificarPasajeros(resultado.pasajeros, resultado.trayecto);
    return res.status(200).json({
      mensaje: mensajeCancelacion(resultado.pasajeros.length, notificados),
      trayecto: resultado.trayecto,
      pasajerosAfectados: resultado.pasajeros.length,
      pasajerosNotificados: notificados,
    });
  } catch (error) {
    console.error("Error al cancelar el trayecto:", error);
    return res.status(500).json({ mensaje: "No se pudo cancelar el trayecto." });
  }
}

// La cancelación ya quedó guardada: si falla un correo, se registra y no se revierte nada.
async function notificarPasajeros(pasajeros, trayecto) {
  const envios = await Promise.allSettled(
    pasajeros.map((pasajero) => enviarCorreoTrayectoCancelado({ ...pasajero, trayecto })),
  );
  let notificados = 0;
  envios.forEach((envio, indice) => {
    if (envio.status === "fulfilled") {
      notificados += 1;
    } else {
      console.error(`No se pudo avisar a ${pasajeros[indice].correo}:`, envio.reason);
    }
  });
  return notificados;
}

function textoPasajeros(total) {
  return total === 1 ? "1 pasajero" : `${total} pasajeros`;
}

function mensajeCancelacion(afectados, notificados) {
  if (afectados === 0) {
    return "Trayecto cancelado. Ya no aparece en los resultados de búsqueda.";
  }
  const base = `Trayecto cancelado. Se cancelaron las reservas de ${textoPasajeros(afectados)}`;
  if (notificados === afectados) {
    return `${base} y se les avisó por correo.`;
  }
  return `${base}, pero no se pudo avisar por correo a ${textoPasajeros(afectados - notificados)}.`;
}
