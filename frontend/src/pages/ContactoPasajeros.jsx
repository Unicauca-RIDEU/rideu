import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { IconoTelefono } from "../components/Iconos.jsx";
import { obtenerContactoPasajeros } from "../services/contacto.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";

// Contacto de los pasajeros por WhatsApp (E05-HU11) · /trayectos/pasajeros/contacto?trayecto=<id>
// Solo el conductor del trayecto ve la lista, y solo con los pasajeros de reserva confirmada.

const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

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

  async function actualizar() {
    setActualizando(true);
    const resultado = await consultar();
    if (resultado) setCarga(resultado);
    setActualizando(false);
  }

  const volver = (
    <Link className="boton-contorno reservar-enlace" to="/historial?vista=conductor">
      Volver a mis trayectos
    </Link>
  );

  return (
    <div className="pantalla perfil">
      <EncabezadoSesion usuario={usuario} activo="Historial" />

      <main className="perfil-cuerpo">
        <Link className="volver" to="/historial?vista=conductor">
          ← Volver a mis trayectos
        </Link>
        <h1>Contacto de pasajeros</h1>
        <p className="perfil-intro">Coordina el encuentro con tus pasajeros por WhatsApp.</p>

        {carga.estado === "cargando" ? <p className="pista-lado">Cargando los pasajeros…</p> : null}

        {carga.estado === "error" ? (
          <section className="tarjeta reservar-detalle contacto-tarjeta">
            <p className="aviso aviso-error" role="alert">
              {carga.mensaje}
            </p>
            {volver}
          </section>
        ) : null}

        {carga.estado === "listo" ? (
          <section className="tarjeta reservar-detalle contacto-tarjeta" aria-live="polite">
            <div className="previa-cabecera">
              <h2>Pasajeros confirmados ({carga.pasajeros.length})</h2>
              <button
                className="boton-contorno reservar-enlace contacto-actualizar"
                type="button"
                onClick={actualizar}
                disabled={actualizando}
              >
                {actualizando ? "Actualizando…" : "Actualizar lista"}
              </button>
            </div>
            <p>
              <strong>
                {carga.trayecto.origen} → {carga.trayecto.sede_destino}
              </strong>
            </p>
            <p>
              {fechaLarga(carga.trayecto.fecha)} · Salida a las {hora12(carga.trayecto.hora)}
            </p>

            {carga.pasajeros.length === 0 ? (
              <p className="aviso" role="status">
                Aún no hay pasajeros con reserva confirmada en este trayecto.
              </p>
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
                      <a
                        className="boton reservar-enlace boton-whatsapp"
                        href={pasajero.contacto.enlace}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`WhatsApp de ${pasajero.nombre}`}
                      >
                        <IconoTelefono />
                        WhatsApp
                      </a>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="pista-lado">
              Solo se muestran los contactos de pasajeros con reserva confirmada. RideU no guarda las
              conversaciones.
            </p>
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

function iniciales(nombre) {
  const partes = (nombre || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "RU";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}
