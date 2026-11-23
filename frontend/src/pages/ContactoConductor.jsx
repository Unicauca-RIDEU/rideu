import { useEffect, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Aviso, Boton, Cargando, Chip, EncabezadoPagina, Tarjeta } from "@/components/ui";
import { IconoTelefono } from "../components/Iconos.jsx";
import { fechaLarga, hora12, iniciales } from "../components/formatoTrayecto.js";
import { obtenerContactoConductor } from "../services/contacto.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";

// Contacto del conductor por WhatsApp (E05-HU10) · /reservas/contacto-conductor?reserva=<id>
// RideU solo abre el enlace wa.me: la conversación ocurre en WhatsApp y no se almacena.

const VOLVER = { texto: "Volver al historial", to: "/historial?vista=pasajero" };

export default function ContactoConductor() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const reservaId = parametros.get("reserva") ?? "";
  const [carga, setCarga] = useState({ estado: "cargando" });

  useEffect(() => {
    if (!reservaId) {
      setCarga({ estado: "error", mensaje: "No se indicó la reserva." });
      return undefined;
    }

    let activo = true;
    setCarga({ estado: "cargando" });
    obtenerContactoConductor(reservaId)
      .then((respuesta) => {
        if (!activo) return;
        if (respuesta.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!respuesta.ok || !respuesta.contacto) {
          setCarga({
            estado: "error",
            mensaje: respuesta.mensaje || "No se pudo cargar el contacto del conductor.",
          });
          return;
        }
        setCarga({ estado: "listo", ...respuesta });
      })
      .catch(() => {
        if (activo) {
          setCarga({ estado: "error", mensaje: "No se pudo conectar con el servidor. Inténtalo de nuevo." });
        }
      });
    return () => {
      activo = false;
    };
  }, [reservaId, navigate]);

  return (
    <div className="pantalla perfil">
      <EncabezadoSesion usuario={usuario} activo="Historial" />

      <main className="perfil-cuerpo">
        <EncabezadoPagina
          titulo="Contacto del conductor"
          intro="Coordina el punto de encuentro por WhatsApp."
          volver={VOLVER}
        />

        {carga.estado === "cargando" ? <Cargando>Cargando el contacto…</Cargando> : null}

        {carga.estado === "error" ? (
          <Tarjeta className="contacto-tarjeta">
            <Aviso tono="error">{carga.mensaje}</Aviso>
            <Boton variante="secundario" to={VOLVER.to}>
              {VOLVER.texto}
            </Boton>
          </Tarjeta>
        ) : null}

        {carga.estado === "listo" ? (
          <Tarjeta className="contacto-tarjeta">
            <div className="contacto-persona">
              <span className="avatar avatar-grande" aria-hidden="true">
                {iniciales(carga.conductor.nombre)}
              </span>
              <span>
                <h2>{carga.conductor.nombre}</h2>
                <Chip tono="exito" punto>
                  Reserva confirmada
                </Chip>
              </span>
            </div>

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

            {carga.contacto.disponible ? (
              <>
                <Boton variante="whatsapp" href={carga.contacto.enlace} icono={<IconoTelefono />}>
                  Escribir por WhatsApp
                </Boton>
                <p className="pista-lado">
                  Se abrirá WhatsApp con el chat del conductor. RideU no guarda la conversación.
                </p>
              </>
            ) : (
              <Aviso tono="error" titulo={carga.contacto.mensaje || "El contacto por WhatsApp no está disponible."}>
                <p>No pudimos abrir el contacto del conductor. Intenta de nuevo más tarde.</p>
              </Aviso>
            )}
          </Tarjeta>
        ) : null}
      </main>

      <Pie />
    </div>
  );
}
