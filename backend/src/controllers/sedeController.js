import { listarSedes } from "../models/sede.js";

// Sedes de destino para los filtros de búsqueda (E03-HU06).
export async function obtenerSedes(_req, res) {
  try {
    const sedes = await listarSedes();
    return res.status(200).json({ sedes });
  } catch (error) {
    console.error("Error al listar las sedes:", error);
    return res.status(500).json({ mensaje: "No se pudieron cargar las sedes." });
  }
}
