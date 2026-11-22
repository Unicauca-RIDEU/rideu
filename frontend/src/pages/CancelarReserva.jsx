import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { IconoAuto, IconoCheck } from "../components/Iconos.jsx";
import { cancelarReserva, obtenerMisReservas } from "../services/reservas.js";
import Pie from "../components/Pie.jsx";
import EnlacesNavegacion from "../components/EnlacesNavegacion.jsx";

// Cancelación de reservas (E04-HU08) · /reservas/cancelar[?reserva=<id>]
// El pasajero elige una de sus reservas confirmadas, pulsa «Cancelar reserva» y confirma.
// El backend libera el cupo y avisa al conductor por correo. Si el trayecto ya inició,
// la cancelación no se permite y se explica el motivo.

const formatoPesos = new Intl.NumberFormat("es-CO");
const MENSAJE_INICIADO = "No puedes cancelar la reserva porque el trayecto ya inició.";

export default function CancelarReserva() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const seleccionId = parametros.get("reserva") ?? "";
  const [carga, setCarga] = useState({ estado: "cargando", reservas: [] });
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const nombre = usuario?.nombre || "Tu perfil";
  const reservas = carga.reservas;
  const seleccionada = reservas.find((reserva) => reserva.id === seleccionId) ?? null;

  const cargar = useCallback(async () => {
    try {
      const respuesta = await obtenerMisReservas();
      if (respuesta.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (!respuesta.ok) {
        setCarga({ estado: "error", reservas: [], mensaje: respuesta.mensaje });
        return;
      }
      setCarga({ estado: "listo", reservas: respuesta.reservas ?? [], mensaje: respuesta.mensaje });
    } catch {
      setCarga({
        estado: "error",
        reservas: [],
        mensaje: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
      });
    }
  }, [navigate]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    setConfirmando(false);
    setAviso(null);
  }, [seleccionId]);

  function seleccionar(id) {
    setResultado(null);
    setParametros(id ? { reserva: id } : {});
  }

  // Criterio 3: con el trayecto iniciado no se pide confirmación; se explica por qué no se puede.
  function pedirCancelacion() {
    if (!seleccionada || enviando) return;
    if (seleccionada.iniciado) {
      setAviso(MENSAJE_INICIADO);
      return;
    }
    setAviso(null);
    setConfirmando(true);
  }

  async function confirmar() {
    if (!seleccionada) return;
    setEnviando(true);
    setAviso(null);
    try {
      const respuesta = await cancelarReserva(seleccionada.id);
      if (respuesta.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      setConfirmando(false);
      if (respuesta.ok) {
        setResultado({ mensaje: respuesta.mensaje, trayecto: respuesta.trayecto });
        setParametros({});
        await cargar();
        return;
      }
      setAviso(respuesta.mensaje || "No se pudo cancelar la reserva.");
      await cargar();
    } catch {
      setAviso("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla perfil">
      <header className="barra perfil-barra">
        <Link to="/panel" className="marca">
          <span className="marca-icono">
            <IconoAuto />
          </span>
          <span>
            <strong>RideU</strong>
            <small>Universidad del Cauca</small>
          </span>
        </Link>
        <div className="perfil-nav">
          <EnlacesNavegacion activo="Historial" />
          <span className="perfil-usuario">
            <span className="avatar" aria-hidden="true">
              {iniciales(nombre)}
            </span>
            <strong>{nombre}</strong>
          </span>
        </div>
      </header>

      <main className="perfil-cuerpo">
        <Link className="volver" to="/panel">
          ← Volver al panel
        </Link>
        <h1>Cancelar reserva</h1>
        <p className="perfil-intro">Si no vas a viajar, libera tu cupo para otro compañero.</p>

        {resultado ? (
          <p className="nota-ok nota-publicado" role="status">
            <span className="nota-icono" aria-hidden="true">
              <IconoCheck />
            </span>
            {resultado.mensaje} {textoDisponibles(resultado.trayecto)}
          </p>
        ) : null}

        {carga.estado === "cargando" ? <p className="pista-lado">Cargando tus reservas…</p> : null}

        {carga.estado === "error" ? (
          <p className="aviso aviso-error" role="alert">
            {carga.mensaje || "No se pudieron cargar tus reservas."}
          </p>
        ) : null}

        {carga.estado === "listo" && reservas.length === 0 ? (
          <>
            <p className="aviso" role="status">
              {carga.mensaje || "No tienes reservas confirmadas."}
            </p>
            <Link className="boton boton-cambiar" to="/trayectos/buscar">
              Buscar trayecto
            </Link>
          </>
        ) : null}

        {carga.estado === "listo" && reservas.length > 0 ? (
          <div className="publicar-grid">
            <section className="perfil-lado" aria-labelledby="mis-reservas">
              <h2 id="mis-reservas" className="titulo-lado">
                Tus reservas confirmadas ({reservas.length})
              </h2>
              <ul className="buscar-resultados">
                {reservas.map((reserva) => (
                  <li key={reserva.id}>
                    <TarjetaReserva
                      reserva={reserva}
                      activa={reserva.id === seleccionId}
                      onSeleccionar={() => seleccionar(reserva.id)}
                    />
                  </li>
                ))}
              </ul>
            </section>

            <aside className="perfil-lado">
              {!seleccionada ? (
                <p className="pista-lado">Selecciona la reserva que quieres cancelar.</p>
              ) : (
                <section className="tarjeta reservar-detalle" aria-live="polite">
                  <h2>Reserva seleccionada</h2>
                  <p>
                    <strong>
                      {seleccionada.origen} → {seleccionada.sede_destino}
                    </strong>
                  </p>
                  <p>
                    {seleccionada.fecha} · Salida a las {seleccionada.hora}
                  </p>
                  <p>Conductor: {seleccionada.conductor_nombre}</p>

                  {aviso ? (
                    <p className="aviso aviso-error" role="alert">
                      {aviso}
                    </p>
                  ) : null}

                  {confirmando ? (
                    <div className="aviso aviso-error" role="alertdialog" aria-labelledby="confirmar-reserva">
                      <strong id="confirmar-reserva">¿Seguro que quieres cancelar esta reserva?</strong>
                      <p>Tu cupo quedará libre para otro pasajero y avisaremos al conductor por correo.</p>
                      <button className="boton reservar-enlace" type="button" onClick={confirmar} disabled={enviando}>
                        {enviando ? "Cancelando…" : "Sí, cancelar reserva"}
                      </button>
                      <button
                        className="boton-contorno reservar-enlace"
                        type="button"
                        onClick={() => setConfirmando(false)}
                        disabled={enviando}
                      >
                        No, mantenerla
                      </button>
                    </div>
                  ) : (
                    <button
                      className="boton-contorno reservar-enlace"
                      type="button"
                      onClick={pedirCancelacion}
                      disabled={enviando}
                    >
                      Cancelar reserva
                    </button>
                  )}
                </section>
              )}
            </aside>
          </div>
        ) : null}
      </main>

      <Pie />
    </div>
  );
}

function TarjetaReserva({ reserva, activa, onSeleccionar }) {
  return (
    <article className="tarjeta tarjeta-previa">
      <div className="previa-cabecera">
        <strong>
          {reserva.fecha} · {reserva.hora}
        </strong>
        <p className={reserva.iniciado ? "chip" : "chip chip-ok"}>
          <i />
          {reserva.iniciado ? "Iniciado" : "Confirmada"}
        </p>
      </div>
      <ol className="previa-ruta">
        <li>{reserva.origen}</li>
        <li>{reserva.sede_destino}</li>
      </ol>
      <p className="ayuda">
        {reserva.conductor_nombre} · 1 cupo reservado · ${formatoPesos.format(reserva.aporte_sugerido)} COP por
        persona
      </p>
      <button
        className={activa ? "boton reservar-enlace" : "boton-contorno reservar-enlace"}
        type="button"
        onClick={onSeleccionar}
        aria-pressed={activa}
      >
        {activa ? "Seleccionada" : "Seleccionar"}
      </button>
    </article>
  );
}

function textoDisponibles(trayecto) {
  if (!trayecto) return "";
  const disponibles = trayecto.cupos_disponibles;
  return `El trayecto ahora tiene ${disponibles} ${disponibles === 1 ? "cupo disponible" : "cupos disponibles"}.`;
}

function iniciales(nombre) {
  const partes = (nombre || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "RU";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}
