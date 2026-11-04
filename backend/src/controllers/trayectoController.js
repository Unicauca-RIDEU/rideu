// Publicación de trayectos (E02-HU04).
// Estructura preparada en V1; la lógica de publicación se implementa en V2.

export async function publicarTrayecto(_req, res) {
  return res.status(501).json({ mensaje: "La publicación de trayectos aún no está disponible." });
}
