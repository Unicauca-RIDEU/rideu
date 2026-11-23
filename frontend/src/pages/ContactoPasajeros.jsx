import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Aviso, Boton, Cargando, EncabezadoPagina, Tarjeta } from "@/components/ui";
import { IconoTelefono } from "../components/Iconos.jsx";
import { fechaLarga, hora12, iniciales } from "../components/formatoTrayecto.js";
import { obtenerContactoPasajeros } from "../services/contacto.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";

// Contacto de los pasajeros por WhatsApp (E05-HU11) · /trayectos/pasajeros/contacto?trayecto=<id>
// Solo el conductor del trayecto ve la lista, y solo con los pasajeros de reserva confirmada.

const VOLVER = { texto: "Volver al historial", to: "/historial?vista=conductor" };

export default function ContactoPasajeros() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const trayectoId = parametros.get("trayecto") ?? "";
  const [carga, setCarga] = useState({ estado: "cargando" });
  const [actualizando, setActualizando] = useState(false);

  // Consulta la lista al backend; cada consulta trae solo las reservas confirmadas en ese momento.
  const consultar = useCallback(async () => {
    try {
      const respuesta = await obtenerContactoPasajeros(trayectoId);
      if (respuesta.status === 401) {
        navigate("/login", { replace: true });
        return null;
      }
      if (!respuesta.ok || !Array.isArray(respuesta.pasajeros)) {
        return {
          estado: "error",
          mensaje: respuesta.mensaje || "No se pudo cargar el contacto de los pasajeros.",
        };
      }
      return { estado: "listo", ...respuesta };
    } catch {
      return { estado: "error", mensaje: "No se pudo conectar con el servidor. Inténtalo de nuevo." };
    }
  }, [trayectoId, navigate]);

  useEffect(() => {
    if (!trayectoId) {
      setCarga({ estado: "error", mensaje: "No se indicó el trayecto." });
      return undefined;
    }
    let activo = true;
    setCarga({ estado: "cargando" });
    consultar().then((resultado) => {
      if (activo && resultado) setCarga(resultado);
    });
    return () => {
      activo = false;
    };
  }, [trayectoId, consultar]);

  // Criterio 2: al actualizar, los pasajeros que cancelaron dejan de aparecer.
  async function actualizar() {
    setActualizando(true);
    const resultado = await consultar();
    if (resultado) setCarga(resultado);
    setActualizando(false);
  }

  return (
    <div className="pantalla perfil">
      <EncabezadoSesion usuario={usuario} activo="Historial" />

      <main className="perfil-cuerpo">
        <EncabezadoPagina
          titulo="Contacto de pasajeros"
          intro="Coordina el encuentro con tus pasajeros por WhatsApp."
          volver={VOLVER}
        />

        {carga.estado === "cargando" ? <Cargando>Cargando los pasajeros…</Cargando> : null}

        {carga.estado === "error" ? (
          <Tarjeta className="contacto-tarjeta">
            <Aviso tono="error">{carga.mensaje}</Aviso>
            <Boton variante="secundario" to={VOLVER.to}>
              {VOLVER.texto}
            </Boton>
          </Tarjeta>
        ) : null}

        {carga.estado === "listo" ? (
          <Tarjeta className="contacto-tarjeta" aria-live="polite">
            <dl className="reservar-datos">
              <div>
                <dt>Ruta</dt>
                <dd>
                  {carga.trayecto.origen} → {carga.trayecto.sede_destino}
                </dd>
              </div>
              <div>
                <dt>Salida</dt>
                <dd>
                  {fechaLarga(carga.trayecto.fecha)} · {hora12(carga.trayecto.hora)}
                </dd>
              </div>
            </dl>

            <div className="contacto-cabecera">
              <h2>Pasajeros confirmados ({carga.pasajeros.length})</h2>
              <button className="boton-favorita" type="button" onClick={actualizar} disabled={actualizando}>
                {actualizando ? "Actualizando…" : "↻ Actualizar lista"}
              </button>
            </div>

            {carga.pasajeros.length === 0 ? (
              <Aviso>Aún no hay pasajeros con reserva confirmada en este trayecto.</Aviso>
            ) : (
              <ul className="contacto-lista">
                {carga.pasajeros.map((pasajero) => (
                  <li key={pasajero.reserva_id}>
                    <span className="avatar" aria-hidden="true">
                      {iniciales(pasajero.nombre)}
                    </span>
                    <span className="contacto-nombre">
                      <strong>{pasajero.nombre}</strong>
                      <small>
                        {pasajero.contacto.disponible
                          ? "Reserva confirmada"
                          : "El contacto por WhatsApp no está disponible."}
                      </small>
                    </span>
                    {pasajero.contacto.disponible ? (
                      <Boton
                        variante="whatsapp"
                        className="boton-whatsapp-fila"
                        href={pasajero.contacto.enlace}
                        icono={<IconoTelefono />}
                        aria-label={`WhatsApp de ${pasajero.nombre}`}
                      >
                        WhatsApp
                      </Boton>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="pista-lado">
              Solo se muestran los contactos de pasajeros con reserva confirmada. RideU no guarda las
              conversaciones.
            </p>
          </Tarjeta>
        ) : null}
      </main>

      <Pie />
    </div>
  );
}
