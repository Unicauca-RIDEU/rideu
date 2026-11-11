import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

if (!env.dbUser || !env.dbPassword || !env.dbConnectString) {
  console.error(
    "Faltan DB_USER, DB_PASSWORD o DB_CONNECT_STRING en .env. La API no puede conectarse a Oracle.",
  );
}

console.log(`Correo de verificación en modo ${env.mailMode}.`);

app.listen(env.port, () => {
  console.log(`API de Ride U en http://localhost:${env.port}`);
});
