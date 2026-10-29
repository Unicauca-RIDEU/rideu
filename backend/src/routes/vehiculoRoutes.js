import { Router } from "express";
import { registrarVehiculoYLicencia } from "../controllers/vehiculoController.js";

export const vehiculoRouter = Router();

vehiculoRouter.post("/", registrarVehiculoYLicencia);
