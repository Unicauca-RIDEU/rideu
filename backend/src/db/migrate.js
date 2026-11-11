import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../config/database.js";

const dbDir = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(dbDir, "../../sql");
const archivos = fs
  .readdirSync(sqlDir)
  .filter((archivo) => archivo.endsWith(".sql"))
  .sort();

// Oracle ejecuta una sentencia por llamada: en los archivos, cada sentencia
// (o bloque PL/SQL) termina con una línea que solo contiene «/», como en SQL*Plus.
function separarSentencias(contenido) {
  return contenido
    .split(/^\s*\/\s*$/m)
    .map((sentencia) => sentencia.trim())
    .filter((sentencia) => sentencia.replace(/^\s*--.*$/gm, "").trim() !== "");
}

try {
  for (const archivo of archivos) {
    const contenido = fs.readFileSync(path.join(sqlDir, archivo), "utf8");
    for (const sentencia of separarSentencias(contenido)) {
      await pool.query(sentencia);
    }
    console.log(`Migración aplicada: ${archivo}`);
  }
  console.log("Tablas listas.");
} finally {
  await pool.end();
}
