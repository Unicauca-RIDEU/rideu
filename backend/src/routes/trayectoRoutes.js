import { Router } from "express";
import { datosPublicacion, publicarTrayecto } from "../controllers/trayectoController.js";
import { requiereSesion } from "../middleware/requiereSesion.js";

export const trayectoRouter = Router();

trayectoRouter.get("/publicacion", requiereSesion, datosPublicacion);
trayectoRouter.post("/", requiereSesion, publicarTrayecto);
