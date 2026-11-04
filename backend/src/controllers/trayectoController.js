import { buscarSedePorId, listarSedes } from "../models/sede.js";
import {
  buscarPerfilConductor,
  buscarTrayectosDisponibles,
  crearTrayecto,
} from "../models/trayecto.js";
import {
  RUTA_PERFIL_VEHICULO,
  cuposPermitidos,
  momentoEnColombia,
  validarBusqueda,
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
