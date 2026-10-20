import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../config/database.js";

const dbDir = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.resolve(dbDir, "../../sql/001_usuarios.sql");
const sql = fs.readFileSync(sqlPath, "utf8");

try {
  await pool.query(sql);
  console.log("Tabla usuarios lista.");
} finally {
  await pool.end();
}
