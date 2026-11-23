import { clases } from "./clases.js";

// Contenedor blanco con borde. «acciones» se muestra al pie: un botón principal y, si hace falta, uno secundario.
export default function Tarjeta({
  as: Elemento = "section",
  titulo,
  nivelTitulo = 2,
  activa = false,
  acciones,
  className,
  children,
  ...resto
}) {
  const Titulo = `h${nivelTitulo}`;
  return (
    <Elemento className={clases("tarjeta", activa && "tarjeta-activa", className)} {...resto}>
      {titulo ? <Titulo>{titulo}</Titulo> : null}
      {children}
      {acciones ? <div className="tarjeta-acciones">{acciones}</div> : null}
    </Elemento>
  );
}
