// Contacto por WhatsApp (E05-HU10 y E05-HU11).
// RideU solo arma el enlace wa.me: la conversación ocurre en WhatsApp y no se almacena.

// Número colombiano de celular tal como se guarda en el registro: +57 y diez dígitos que empiezan por 3.
const WHATSAPP_COLOMBIA = /^\+573\d{9}$/;

// Devuelve el enlace wa.me del número o null si el número no es válido.
export function enlaceWhatsApp(numero) {
  const limpio = typeof numero === "string" ? numero.trim() : "";
  if (!WHATSAPP_COLOMBIA.test(limpio)) return null;
  return `https://wa.me/${limpio.slice(1)}`;
}
