import { Router } from "express";
import { publicarTrayecto } from "../controllers/trayectoController.js";
import { requiereSesion } from "../middleware/requiereSesion.js";

// Se monta en app.js (/api/trayectos) cuando el endpoint esté completo (V2).
export const trayectoRouter = Router();

trayectoRouter.post("/", requiereSesion, publicarTrayecto);
