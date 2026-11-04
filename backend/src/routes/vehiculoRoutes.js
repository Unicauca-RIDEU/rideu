import { Router } from "express";
import { registrarVehiculoYLicencia } from "../controllers/vehiculoController.js";
import { requiereSesion } from "../middleware/requiereSesion.js";

export const vehiculoRouter = Router();

vehiculoRouter.post("/", requiereSesion, registrarVehiculoYLicencia);
