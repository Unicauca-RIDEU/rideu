import { pool } from "../config/database.js";

// Comprueba la conexión a Oracle con las variables de .env: npm run db:check --prefix backend
try {
  const version = await pool.query("SELECT banner FROM v$version");
  const sesion = await pool.query(
    "SELECT USER AS usuario, SYS_CONTEXT('USERENV', 'SERVICE_NAME') AS servicio FROM dual",
  );
  const tablas = await pool.query("SELECT COUNT(*) AS total FROM user_tables");
  console.log(`Conexión correcta: ${version.rows[0].banner}`);
  console.log(`Usuario ${sesion.rows[0].usuario}, servicio ${sesion.rows[0].servicio}.`);
  console.log(`Tablas en el esquema: ${tablas.rows[0].total} (6 después de npm run db:migrate).`);
} catch (error) {
  console.error(`No se pudo conectar a Oracle: ${error.message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
