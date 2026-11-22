import { Chip, Tarjeta } from "@/components/ui";
import { fechaCorta, iniciales, pesos } from "./formatoTrayecto.js";

// Tarjeta de un trayecto: salida, ruta, conductor, cupos y aporte.
// «estado» y «tono» definen la etiqueta; «acciones» se muestra al pie (un solo botón principal).
export default function TarjetaTrayecto({ trayecto, estado = "Disponible", tono = "exito", acciones }) {
  const reservas = trayecto.cupos_reservados;
  const disponibles = trayecto.cupos_disponibles;
  return (
    <Tarjeta as="article" className="tarjeta-previa" acciones={acciones}>
      <div className="previa-cabecera">
        <strong>{fechaCorta(trayecto.fecha, trayecto.hora)}</strong>
        <Chip tono={tono} punto>
          {estado}
        </Chip>
      </div>
      <ol className="previa-ruta">
        <li>{trayecto.origen}</li>
        <li>{trayecto.sede_destino}</li>
      </ol>
      <div className="previa-pie">
        <span className="avatar" aria-hidden="true">
          {iniciales(trayecto.conductor_nombre)}
        </span>
        <span className="previa-conductor">
          <strong>{trayecto.conductor_nombre}</strong>
          <small>
            {reservas} {reservas === 1 ? "reserva" : "reservas"} · {disponibles}{" "}
            {disponibles === 1 ? "disponible" : "disponibles"}
          </small>
        </span>
        <span className="previa-precio">
          <strong>{pesos(trayecto.aporte_sugerido)}</strong>
          <small>COP / persona</small>
        </span>
      </div>
    </Tarjeta>
  );
}
