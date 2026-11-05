import { Router } from "express";
import { obtenerSedes } from "../controllers/sedeController.js";
import { requiereSesion } from "../middleware/requiereSesion.js";

export const sedeRouter = Router();

sedeRouter.get("/", requiereSesion, obtenerSedes);
