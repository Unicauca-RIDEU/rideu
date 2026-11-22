import { Children, cloneElement, isValidElement, useId } from "react";
import { clases } from "./clases.js";

// Etiqueta, control, pista y error de un campo de formulario. Conecta el control hijo con su
// etiqueta y sus mensajes (htmlFor, aria-describedby, aria-invalid).
export default function Campo({ etiqueta, error, pista, ancho = false, className, children }) {
  const id = useId();
  const idPista = pista ? `${id}-pista` : undefined;
  const idError = error ? `${id}-error` : undefined;
  const control = Children.only(children);
  const idControl = (isValidElement(control) && control.props.id) || id;

  const conectado = isValidElement(control)
    ? cloneElement(control, {
        id: idControl,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": clases(control.props["aria-describedby"], idPista, idError) || undefined,
      })
    : control;

  return (
    <div className={clases("campo", ancho && "campo-ancho", className)}>
      <label htmlFor={idControl}>{etiqueta}</label>
      {conectado}
      {pista ? (
        <small id={idPista} className="pista">
          {pista}
        </small>
      ) : null}
      {error ? <small id={idError}>{error}</small> : null}
    </div>
  );
}
