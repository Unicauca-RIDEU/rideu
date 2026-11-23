import { useEffect, useId, useRef } from "react";
import Boton from "./Boton.jsx";

// Confirmación modal con el <dialog> nativo: atrapa el foco, cierra con Esc y oscurece el fondo.
// Mientras «enviando» es verdadero no se puede cerrar.
export default function DialogoConfirmar({
  abierto,
  titulo,
  textoConfirmar = "Confirmar",
  textoCancelar = "Cancelar",
  textoEnviando,
  peligro = false,
  enviando = false,
  onConfirmar,
  onCancelar,
  children,
}) {
  const dialogo = useRef(null);
  const idTitulo = useId();

  useEffect(() => {
    const nodo = dialogo.current;
    if (!nodo) return;
    if (abierto && !nodo.open) nodo.showModal();
    if (!abierto && nodo.open) nodo.close();
  }, [abierto]);

  // Esc dispara «cancel»: se evita el cierre nativo para que el estado lo controle quien usa el diálogo.
  function alCancelar(evento) {
    evento.preventDefault();
    if (!enviando) onCancelar();
  }

  return (
    <dialog ref={dialogo} className="dialogo" aria-labelledby={idTitulo} onCancel={alCancelar}>
      <h2 id={idTitulo}>{titulo}</h2>
      {children ? <div className="dialogo-texto">{children}</div> : null}
      <div className="dialogo-acciones">
        <Boton variante="secundario" onClick={onCancelar} disabled={enviando}>
          {textoCancelar}
        </Boton>
        <Boton
          variante={peligro ? "peligro" : "primario"}
          onClick={onConfirmar}
          cargando={enviando}
          textoCargando={textoEnviando}
        >
          {textoConfirmar}
        </Boton>
      </div>
    </dialog>
  );
}
