import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

if (!env.databaseUrl) {
  console.error("Falta DATABASE_URL en .env. El registro no puede guardar cuentas.");
}

console.log(`Correo de verificación en modo ${env.mailMode}.`);

app.listen(env.port, () => {
  console.log(`API de Ride U en http://localhost:${env.port}`);
});
