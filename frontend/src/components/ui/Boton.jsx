import { Link } from "react-router-dom";
import { clases } from "./clases.js";

// Clases existentes de index.css para cada variante.
const VARIANTES = {
  primario: "boton",
  secundario: "boton-contorno reservar-enlace",
  peligro: "boton boton-peligro",
  whatsapp: "boton boton-whatsapp",
};

// Botón de la marca. Con «to» se muestra como enlace interno, con «href» como enlace externo
// y sin ninguno de los dos como <button>.
export default function Boton({
  variante = "primario",
  to,
  href,
  type = "button",
  cargando = false,
  textoCargando,
  icono,
  disabled = false,
  className,
  children,
  ...resto
}) {
  const clase = clases(VARIANTES[variante] ?? VARIANTES.primario, className);
  const contenido = (
    <>
      {icono}
      {cargando && textoCargando ? textoCargando : children}
    </>
  );

  if (to) {
    return (
      <Link className={clase} to={to} {...resto}>
        {contenido}
      </Link>
    );
  }

  if (href) {
    return (
      <a className={clase} href={href} target="_blank" rel="noopener noreferrer" {...resto}>
        {contenido}
      </a>
    );
  }

  return (
    <button className={clase} type={type} disabled={disabled || cargando} aria-busy={cargando || undefined} {...resto}>
      {contenido}
    </button>
  );
}
