// Permite salir de un formulario sin guardar. Si hay cambios, pide confirmación antes.
export const MENSAJE_CAMBIOS_SIN_GUARDAR = "Tienes cambios sin guardar. ¿Quieres salir sin guardarlos?";

// Compara campo por campo dos objetos planos de formulario.
export function hayCambios(actual, inicial) {
  return Object.keys({ ...actual, ...inicial }).some(
    (campo) => String(actual[campo] ?? "") !== String(inicial[campo] ?? ""),
  );
}

export default function BotonCancelar({ hayCambios, onCancelar, disabled, children = "Cancelar" }) {
  function cancelar() {
    if (hayCambios && !window.confirm(MENSAJE_CAMBIOS_SIN_GUARDAR)) return;
    onCancelar();
  }

  return (
    <button
      className="boton-contorno reservar-enlace boton-cancelar"
      type="button"
      onClick={cancelar}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
