import { clases } from "./clases.js";

const TONOS = {
  neutro: "",
  exito: "chip-ok",
  error: "chip-error",
};

// Tono de cada estado que devuelve el backend, para que el mismo estado tenga el mismo color en todas
// las pantallas. «Completado» e «Iniciado» quedan en neutro.
const TONO_POR_ESTADO = {
  Pendiente: "exito",
  Confirmada: "exito",
  Cancelado: "error",
  Cancelada: "error",
};

export function tonoDeEstado(estado) {
  return TONO_POR_ESTADO[estado] ?? "neutro";
}

// Etiqueta de estado. Con «onClick» se muestra como botón (atajos de búsqueda).
export default function Chip({ tono = "neutro", punto = false, onClick, className, children, ...resto }) {
  if (onClick) {
    return (
      <button className={clases("chip chip-atajo", TONOS[tono], className)} type="button" onClick={onClick} {...resto}>
        {punto ? <i /> : null}
        {children}
      </button>
    );
  }

  return (
    <p className={clases("chip", TONOS[tono], className)} {...resto}>
      {punto ? <i /> : null}
      {children}
    </p>
  );
}
