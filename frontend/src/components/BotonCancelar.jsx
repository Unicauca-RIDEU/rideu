import { useState } from "react";
import { Boton, DialogoConfirmar } from "@/components/ui";

// Permite salir de un formulario sin guardar. Si hay cambios, pide confirmación antes
// con el diálogo nativo de la aplicación (antes era el confirm del navegador).
export const MENSAJE_CAMBIOS_SIN_GUARDAR = "Tienes cambios sin guardar. ¿Quieres salir sin guardarlos?";

// Compara campo por campo dos objetos planos de formulario.
export function hayCambios(actual, inicial) {
  return Object.keys({ ...actual, ...inicial }).some(
    (campo) => String(actual[campo] ?? "") !== String(inicial[campo] ?? ""),
  );
}

export default function BotonCancelar({ hayCambios, onCancelar, disabled, children = "Cancelar" }) {
  const [confirmando, setConfirmando] = useState(false);

  function cancelar() {
    if (hayCambios) {
      setConfirmando(true);
      return;
    }
    onCancelar();
  }

  return (
    <>
      <Boton variante="secundario" className="boton-cancelar" onClick={cancelar} disabled={disabled}>
        {children}
      </Boton>
      <DialogoConfirmar
        abierto={confirmando}
        titulo={MENSAJE_CAMBIOS_SIN_GUARDAR}
        textoConfirmar="Salir sin guardar"
        textoCancelar="Seguir editando"
        peligro
        onConfirmar={() => {
          setConfirmando(false);
          onCancelar();
        }}
        onCancelar={() => setConfirmando(false)}
      />
    </>
  );
}
