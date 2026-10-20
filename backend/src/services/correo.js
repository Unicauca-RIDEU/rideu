import nodemailer from "nodemailer";
import { env } from "../config/env.js";

export function enlaceVerificacion(token, appUrl = env.appUrl) {
  const base = String(appUrl || "").replace(/\/$/, "");
  return `${base}/registro/verificacion?token=${encodeURIComponent(token)}`;
}

export async function enviarCorreoVerificacion(
  { nombre, correo, token },
  dependencias = {},
) {
  const config = dependencias.config ?? env;
  const log = dependencias.log ?? console.log;
  const enlace = enlaceVerificacion(token, config.appUrl);
  const mensaje = {
    from: config.mailFrom,
    to: correo,
    subject: "Verifica tu correo institucional de Ride U",
    text: [
      `Hola ${nombre}.`,
      "",
      "Para verificar tu cuenta de Ride U abre este enlace:",
      enlace,
      "",
      "El enlace vence en 24 horas.",
    ].join("\n"),
    html: `<p>Hola ${escapeHtml(nombre)}.</p>
<p>Para verificar tu cuenta de Ride U abre este enlace:</p>
<p><a href="${escapeHtml(enlace)}">${escapeHtml(enlace)}</a></p>
<p>El enlace vence en 24 horas.</p>`,
  };

  if (config.mailMode === "console") {
    log(`[Ride U] Enlace de verificación para ${correo}: ${enlace}`);
    return { enlace };
  }

  if (config.mailMode !== "smtp") {
    throw new Error("MAIL_MODE debe ser console o smtp.");
  }
  if (!config.smtpHost || !config.mailFrom) {
    throw new Error("Faltan SMTP_HOST o MAIL_FROM.");
  }

  const enviar = dependencias.enviarSmtp ?? enviarPorSmtp;
  await enviar(mensaje, config);
  return { enlace };
}

async function enviarPorSmtp(mensaje, config) {
  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    auth: config.smtpUser
      ? { user: config.smtpUser, pass: config.smtpPass }
      : undefined,
  });
  await transporter.sendMail(mensaje);
}

function escapeHtml(valor) {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
