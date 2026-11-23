// Formatos de fecha, hora, dinero e iniciales que comparten las pantallas de trayectos.

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const formatoPesos = new Intl.NumberFormat("es-CO");

// 3000 → "$3.000"
export function pesos(valor) {
  return `$${formatoPesos.format(valor)}`;
}

// "06:30" → "6:30 a. m."
export function hora12(hora) {
  const [h, m] = hora.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

// "2026-11-23", "06:30" → "23 nov · 6:30 a. m."
export function fechaCorta(fecha, hora) {
  const [, mes, dia] = fecha.split("-").map(Number);
  return `${dia} ${MESES[mes - 1]} · ${hora12(hora)}`;
}

// "2026-11-23" → "Lunes 23 de noviembre de 2026"
export function fechaLarga(fecha) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return `${DIAS[diaSemana]} ${dia} de ${MESES_LARGOS[mes - 1]} de ${anio}`;
}

// "Laura Muñoz Gómez" → "LM"
export function iniciales(nombre) {
  const partes = (nombre || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "RU";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}
