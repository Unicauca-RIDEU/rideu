import express from "express";
import { authRouter } from "./routes/authRoutes.js";
import { vehiculoRouter } from "./routes/vehiculoRoutes.js";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRouter);
  app.use("/api/vehiculos", vehiculoRouter);
  app.use((error, _req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
      return res.status(400).json({ mensaje: "El cuerpo de la solicitud no es JSON válido." });
    }
    return next(error);
  });
  return app;
}
