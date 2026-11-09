import { Router } from "express";
import {
  obtenerVehiculoYLicencia,
  registrarVehiculoYLicencia,
} from "../controllers/vehiculoController.js";
import { requiereSesion } from "../middleware/requiereSesion.js";

export const vehiculoRouter = Router();

vehiculoRouter.get("/", requiereSesion, obtenerVehiculoYLicencia);
vehiculoRouter.post("/", requiereSesion, registrarVehiculoYLicencia);
