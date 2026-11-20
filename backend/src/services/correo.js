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

  await entregar(mensaje, {
    ...dependencias,
    config,
    log,
    resumen: `[Ride U] Enlace de verificación para ${correo}: ${enlace}`,
  });
  return { enlace };
}

// Aviso al pasajero de que el conductor canceló el trayecto y su reserva (E02-HU05).
// trayecto: { fecha: 'AAAA-MM-DD', hora: 'HH:MM', origen, sede_destino }.
export async function enviarCorreoTrayectoCancelado(
  { nombre, correo, trayecto },
  dependencias = {},
) {
  const config = dependencias.config ?? env;
  const log = dependencias.log ?? console.log;
  const ruta = `${trayecto.origen} → ${trayecto.sede_destino}`;
  const salida = `${trayecto.fecha} a las ${trayecto.hora}`;
  const mensaje = {
    from: config.mailFrom,
    to: correo,
    subject: "Tu trayecto de Ride U fue cancelado",
    text: [
      `Hola ${nombre}.`,
      "",
      "El conductor canceló el trayecto en el que tenías una reserva:",
      `${ruta}, ${salida}.`,
      "",
      "Tu reserva quedó cancelada. Puedes buscar otro trayecto en Ride U.",
    ].join("\n"),
    html: `<p>Hola ${escapeHtml(nombre)}.</p>
<p>El conductor canceló el trayecto en el que tenías una reserva:</p>
<p><strong>${escapeHtml(ruta)}</strong>, ${escapeHtml(salida)}.</p>
<p>Tu reserva quedó cancelada. Puedes buscar otro trayecto en Ride U.</p>`,
  };

  await entregar(mensaje, {
    ...dependencias,
    config,
    log,
    resumen: `[Ride U] Aviso de trayecto cancelado para ${correo}: ${ruta}, ${salida}.`,
  });
}

// Aviso al conductor de que un pasajero canceló su reserva y se liberó un cupo (E04-HU08).
// trayecto: { fecha: 'AAAA-MM-DD', hora: 'HH:MM', origen, sede_destino, cupos_disponibles }.
export async function enviarCorreoReservaCancelada(
  { nombre, correo, pasajero, trayecto },
  dependencias = {},
) {
  const config = dependencias.config ?? env;
  const log = dependencias.log ?? console.log;
  const ruta = `${trayecto.origen} → ${trayecto.sede_destino}`;
  const salida = `${trayecto.fecha} a las ${trayecto.hora}`;
  const disponibles = trayecto.cupos_disponibles;
  const cupos = disponibles === 1 ? "1 cupo disponible" : `${disponibles} cupos disponibles`;
  const mensaje = {
    from: config.mailFrom,
    to: correo,
    subject: "Un pasajero canceló su reserva en Ride U",
    text: [
      `Hola ${nombre}.`,
      "",
      `${pasajero} canceló su reserva en tu trayecto:`,
      `${ruta}, ${salida}.`,
      "",
      `Se liberó 1 cupo. Ahora el trayecto tiene ${cupos}.`,
    ].join("\n"),
    html: `<p>Hola ${escapeHtml(nombre)}.</p>
<p>${escapeHtml(pasajero)} canceló su reserva en tu trayecto:</p>
<p><strong>${escapeHtml(ruta)}</strong>, ${escapeHtml(salida)}.</p>
<p>Se liberó 1 cupo. Ahora el trayecto tiene ${escapeHtml(cupos)}.</p>`,
  };

  await entregar(mensaje, {
    ...dependencias,
    config,
    log,
    resumen: `[Ride U] Aviso de reserva cancelada para ${correo}: ${pasajero} liberó 1 cupo en ${ruta}, ${salida}.`,
  });
}

// En modo console solo imprime el resumen; en modo smtp envía el mensaje.
async function entregar(mensaje, { config, log, resumen, enviarSmtp }) {
  if (config.mailMode === "console") {
    log(resumen);
    return;
  }

  if (config.mailMode !== "smtp") {
    throw new Error("MAIL_MODE debe ser console o smtp.");
  }
  if (!config.smtpHost || !config.mailFrom) {
    throw new Error("Faltan SMTP_HOST o MAIL_FROM.");
  }

  const enviar = enviarSmtp ?? enviarPorSmtp;
  await enviar(mensaje, config);
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
