import { Router } from "express";
import { registrar } from "../controllers/authController.js";

export const authRouter = Router();

authRouter.post("/registro", registrar);
