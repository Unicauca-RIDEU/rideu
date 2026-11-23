import { Chip, Tarjeta } from "@/components/ui";
import { fechaCorta } from "./formatoTrayecto.js";

// Tarjeta compacta de un viaje propio (trayecto publicado o reserva): salida, estado, ruta,
// un resumen en una línea y, al pie, sus acciones. La usan Historial, Cancelar reserva y Editar trayecto.
export default function TarjetaViaje({ viaje, estado, tono, detalle, activa = false, acciones }) {
  return (
    <Tarjeta as="article" className="tarjeta-previa tarjeta-viaje" activa={activa} acciones={acciones}>
      <div className="previa-cabecera">
        <strong>{fechaCorta(viaje.fecha, viaje.hora)}</strong>
        <Chip tono={tono} punto>
          {estado}
        </Chip>
      </div>
      <ol className="previa-ruta">
        <li>{viaje.origen}</li>
        <li>{viaje.sede_destino}</li>
      </ol>
      {detalle ? <p className="viaje-detalle">{detalle}</p> : null}
    </Tarjeta>
  );
}
