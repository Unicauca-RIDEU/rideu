import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { IconoTelefono } from "../components/Iconos.jsx";
import { obtenerContactoConductor } from "../services/contacto.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";

// Contacto del conductor por WhatsApp (E05-HU10) · /reservas/contacto-conductor?reserva=<id>
// RideU solo abre el enlace wa.me: la conversación ocurre en WhatsApp y no se almacena.

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

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

  const volver = (
    <Link className="boton-contorno reservar-enlace" to="/historial">
      Volver a mis reservas
    </Link>
  );

  return (
    <div className="pantalla perfil">
      <EncabezadoSesion usuario={usuario} activo="Historial" />

      <main className="perfil-cuerpo">
        <Link className="volver" to="/historial">
          ← Volver a mis reservas
        </Link>
        <h1>Contacto del conductor</h1>
        <p className="perfil-intro">Coordina el punto de encuentro por WhatsApp.</p>

        {carga.estado === "cargando" ? <p className="pista-lado">Cargando el contacto…</p> : null}

        {carga.estado === "error" ? (
          <section className="tarjeta reservar-detalle contacto-tarjeta">
            <p className="aviso aviso-error" role="alert">
              {carga.mensaje}
            </p>
            {volver}
          </section>
        ) : null}

        {carga.estado === "listo" ? (
          <section className="tarjeta reservar-detalle contacto-tarjeta">
            <div className="previa-cabecera">
              <h2>{carga.conductor.nombre}</h2>
              <p className="chip chip-ok">
                <i />
                Reserva confirmada
              </p>
            </div>
            <p>
              <strong>
                {carga.trayecto.origen} → {carga.trayecto.sede_destino}
              </strong>
            </p>
            <p>
              {fechaLarga(carga.trayecto.fecha)} · Salida a las {hora12(carga.trayecto.hora)}
            </p>

            {carga.contacto.disponible ? (
              <>
                <a
                  className="boton reservar-enlace boton-whatsapp"
                  href={carga.contacto.enlace}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <IconoTelefono />
                  WhatsApp
                </a>
                <p className="pista-lado">
                  Se abrirá WhatsApp con el chat del conductor. RideU no guarda la conversación.
                </p>
              </>
            ) : (
              <div className="aviso aviso-error" role="alert">
                <strong>{carga.contacto.mensaje || "El contacto por WhatsApp no está disponible."}</strong>
                <p>No pudimos abrir el contacto del conductor. Intenta de nuevo más tarde.</p>
              </div>
            )}
            {volver}
          </section>
        ) : null}
      </main>

      <Pie />
    </div>
  );
}

function hora12(hora) {
  const [h, m] = hora.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

function fechaLarga(fecha) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
  return `${DIAS[diaSemana]} ${dia} de ${MESES_LARGOS[mes - 1]} de ${anio}`;
}
