import { Router } from "express";
import {
  buscarTrayectos,
  datosPublicacion,
  publicarTrayecto,
} from "../controllers/trayectoController.js";
import { detalleTrayecto, reservarCupo } from "../controllers/reservaController.js";
import { requiereSesion } from "../middleware/requiereSesion.js";

export const trayectoRouter = Router();

trayectoRouter.get("/publicacion", requiereSesion, datosPublicacion);
trayectoRouter.get("/", requiereSesion, buscarTrayectos);
trayectoRouter.post("/", requiereSesion, publicarTrayecto);
// Reserva de cupos (E04-HU07). Van después de /publicacion para que :id no lo capture.
trayectoRouter.get("/:id", requiereSesion, detalleTrayecto);
trayectoRouter.post("/:id/reservas", requiereSesion, reservarCupo);
