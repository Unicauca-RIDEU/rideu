import { IconoCheck } from "../Iconos.jsx";
import { clases } from "./clases.js";

const TONOS = {
  info: "",
  error: "aviso-error",
  exito: "aviso-exito",
};

// Mensaje para la persona. Los errores se anuncian de inmediato (role="alert"); el resto, sin interrumpir.
export default function Aviso({ tono = "info", titulo, icono = false, className, children, ...resto }) {
  return (
    <div
      className={clases("aviso", TONOS[tono], icono && "aviso-con-icono", className)}
      role={tono === "error" ? "alert" : "status"}
      {...resto}
    >
      {icono ? (
        <span className="nota-icono" aria-hidden="true">
          <IconoCheck />
        </span>
      ) : null}
      <div>
        {titulo ? <strong className="aviso-titulo">{titulo}</strong> : null}
        {children}
      </div>
    </div>
  );
}
