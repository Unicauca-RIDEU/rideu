import { Router } from "express";
import {
  iniciarSesion,
  registrar,
  sesionActual,
  verificar,
} from "../controllers/authController.js";
import { requiereSesion } from "../middleware/requiereSesion.js";

export const authRouter = Router();

authRouter.post("/registro", registrar);
authRouter.post("/verificacion", verificar);
authRouter.post("/login", iniciarSesion);
authRouter.get("/sesion", requiereSesion, sesionActual);
