import { Router } from "express";
import {
  buscarTrayectos,
  datosPublicacion,
  publicarTrayecto,
} from "../controllers/trayectoController.js";
import { requiereSesion } from "../middleware/requiereSesion.js";

export const trayectoRouter = Router();

trayectoRouter.get("/publicacion", requiereSesion, datosPublicacion);
trayectoRouter.get("/", requiereSesion, buscarTrayectos);
trayectoRouter.post("/", requiereSesion, publicarTrayecto);
