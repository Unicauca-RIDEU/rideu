import { Router } from "express";
import { registrar, verificar } from "../controllers/authController.js";

export const authRouter = Router();

authRouter.post("/registro", registrar);
authRouter.post("/verificacion", verificar);
