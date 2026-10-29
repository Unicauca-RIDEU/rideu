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

try {
  for (const archivo of archivos) {
    await pool.query(fs.readFileSync(path.join(sqlDir, archivo), "utf8"));
    console.log(`Migración aplicada: ${archivo}`);
  }
  console.log("Tablas listas.");
} finally {
  await pool.end();
}
