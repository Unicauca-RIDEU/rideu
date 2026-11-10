import { Router } from "express";
import { obtenerHistorial } from "../controllers/historialController.js";
import { requiereSesion } from "../middleware/requiereSesion.js";

export const historialRouter = Router();

historialRouter.get("/", requiereSesion, obtenerHistorial);
