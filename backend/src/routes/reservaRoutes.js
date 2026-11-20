import { Router } from "express";
import { contactoConductor } from "../controllers/contactoController.js";
import { cancelarReservaPropia, misReservas } from "../controllers/reservaController.js";
import { requiereSesion } from "../middleware/requiereSesion.js";

export const reservaRouter = Router();

// Contacto del conductor por WhatsApp (E05-HU10).
reservaRouter.get("/:id/contacto-conductor", requiereSesion, contactoConductor);
// Cancelación de reservas (E04-HU08).
reservaRouter.get("/", requiereSesion, misReservas);
reservaRouter.post("/:id/cancelacion", requiereSesion, cancelarReservaPropia);
