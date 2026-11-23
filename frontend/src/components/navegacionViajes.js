import { useEffect } from "react";

// Enlace «volver» de Cancelar reserva y Editar trayecto: regresa al historial (en la pestaña
// correspondiente) si la persona llegó desde allí, o al panel en los demás casos.
export function volverDesde(estado, vista) {
  if (estado?.desde === "historial") {
    return { texto: "Volver al historial", to: `/historial?vista=${vista}` };
  }
  return { texto: "Volver al panel", to: "/panel" };
}

// En pantallas angostas el detalle queda debajo de la lista: al elegir un elemento,
// se desplaza hasta el detalle para que la persona vea el resultado de su elección.
export function usarEnfoqueEnMovil(referencia, clave) {
  useEffect(() => {
    if (!clave || !referencia.current) return;
    if (!window.matchMedia("(max-width: 900px)").matches) return;
    referencia.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [clave, referencia]);
}
