import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../config/database.js";

const dbDir = path.dirname(fileURLToPath(import.meta.url));
const archivos = ["001_usuarios.sql", "002_vehiculos_licencias.sql"];

try {
  for (const archivo of archivos) {
    const sqlPath = path.resolve(dbDir, "../../sql", archivo);
    const sql = fs.readFileSync(sqlPath, "utf8");
    await pool.query(sql);
  }
  console.log("Tablas usuarios, vehiculos y licencias listas.");
} finally {
  await pool.end();
}
