import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { IconoAuto, IconoEscudo } from "../components/Iconos.jsx";
import { obtenerHistorial } from "../services/historial.js";

const formatoPesos = new Intl.NumberFormat("es-CO");

// Historial de trayectos y reservas (E04-HU09).
export default function Historial() {
  const navigate = useNavigate();
  const { usuario } = useOutletContext();
  const [carga, setCarga] = useState({ estado: "cargando" });

  useEffect(() => {
    let activo = true;
    obtenerHistorial()
      .then((respuesta) => {
        if (!activo) return;
        if (respuesta.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!respuesta.ok) {
          setCarga({ estado: "error", mensaje: respuesta.mensaje });
          return;
        }
        if (!Array.isArray(respuesta.trayectos)) {
          setCarga({ estado: "error" });
          return;
        }
        setCarga({ estado: "listo", ...respuesta });
      })
      .catch(() => {
        if (activo) setCarga({ estado: "error" });
      });
    return () => {
      activo = false;
    };
  }, [navigate]);

  const trayectos = carga.trayectos ?? [];
  const reservas = carga.reservas ?? [];
  const total = trayectos.length + reservas.length;

  return (
    <div className="pantalla">
      <header className="barra">
        <Link to="/panel" className="marca">
          <span className="marca-icono">
            <IconoAuto />
          </span>
          <span>
            <strong>RideU</strong>
            <small>Universidad del Cauca</small>
          </span>
        </Link>
        <p className="exclusivo">
          <IconoEscudo />
          {usuario?.correo}
        </p>
      </header>

      <main className="panel-principal">
        <Link className="volver" to="/panel">
          ← Volver al panel
        </Link>
        <p className="kicker">/historial</p>
        <h2>Historial</h2>
        <p className="ayuda">Tus trayectos publicados y tus reservas.</p>

        {carga.estado === "cargando" ? <p className="ayuda">Cargando tu historial…</p> : null}

        {carga.estado === "error" ? (
          <p className="aviso aviso-error" role="alert">
            {carga.mensaje || "No se pudo cargar el historial. Recarga la página para intentarlo de nuevo."}
          </p>
        ) : null}

        {carga.estado === "listo" && total === 0 ? (
          <p className="aviso" role="status">
            {carga.mensaje || "Aún no tienes registros en tu historial."}
          </p>
        ) : null}

        {carga.estado === "listo" && total > 0 ? (
          <>
            <section aria-labelledby="historial-trayectos">
              <h3 id="historial-trayectos">Trayectos publicados ({trayectos.length})</h3>
              <ul className="buscar-resultados">
                {trayectos.map((trayecto) => (
                  <li key={trayecto.id}>
                    <article className="tarjeta tarjeta-previa">
                      <div className="previa-cabecera">
                        <strong>
                          {trayecto.fecha} · {trayecto.hora}
                        </strong>
                        <p className={trayecto.estado_historial === "Pendiente" ? "chip chip-ok" : "chip"}>
                          <i />
                          {trayecto.estado_historial}
                        </p>
                      </div>
                      <ol className="previa-ruta">
                        <li>{trayecto.origen}</li>
                        <li>{trayecto.sede_destino}</li>
                      </ol>
                      <p className="ayuda">
                        {trayecto.cupos} {trayecto.cupos === 1 ? "cupo" : "cupos"} · $
                        {formatoPesos.format(trayecto.aporte_sugerido)} COP por persona
                      </p>
                    </article>
                  </li>
                ))}
              </ul>
            </section>

            <section aria-labelledby="historial-reservas">
              <h3 id="historial-reservas">Reservas ({reservas.length})</h3>
              {reservas.length === 0 ? <p className="ayuda">Aún no tienes reservas.</p> : null}
            </section>
          </>
        ) : null}
      </main>

      <footer className="pie">
        <p>RideU · Hecho para la comunidad Unicauca</p>
        <p>¿Necesitas ayuda? · Privacidad y condiciones</p>
      </footer>
    </div>
  );
}
