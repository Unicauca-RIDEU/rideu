import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { IconoCheck, IconoFlecha } from "../components/Iconos.jsx";
import { obtenerTrayecto, reservarCupo } from "../services/reservas.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";

// Reserva de un cupo (E04-HU07) · /trayectos/reservar?trayecto=<id>
// La URL conserva los filtros de la búsqueda para poder volver a ella sin perderlos.

const FILTROS = ["sedeDestinoId", "fecha", "horaDesde"];
const INTERVALO_ACTUALIZACION_MS = 5000;
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const formatoPesos = new Intl.NumberFormat("es-CO");

export default function ReservarTrayecto() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [parametros] = useSearchParams();
  const trayectoId = parametros.get("trayecto") ?? "";
  const [carga, setCarga] = useState({ estado: "cargando" });
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState(null);
  const [confirmada, setConfirmada] = useState(false);
  // Cupos que la pantalla mostraba cuando el pasajero pulsó «Confirmar reserva».
  const cuposMostrados = useRef(0);

  const nombre = usuario?.nombre || "Tu perfil";
  const rutaBusqueda = rutaDeBusqueda(parametros);
  const trayecto = carga.trayecto;

  // Carga el trayecto y lo vuelve a consultar cada pocos segundos para mostrar
  // la disponibilidad al día mientras el pasajero decide.
  useEffect(() => {
    if (!trayectoId) {
      setCarga({ estado: "error", mensaje: "No se indicó el trayecto que quieres reservar." });
      return undefined;
    }

    let activo = true;
    async function consultar(primera) {
      try {
        const respuesta = await obtenerTrayecto(trayectoId);
        if (!activo) return;
        if (respuesta.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (respuesta.ok && respuesta.trayecto) {
          setCarga({ estado: "listo", trayecto: respuesta.trayecto });
        } else if (primera) {
          setCarga({ estado: "error", mensaje: respuesta.mensaje || "No se pudo cargar el trayecto." });
        }
      } catch {
        if (activo && primera) {
          setCarga({
            estado: "error",
            mensaje: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
          });
        }
      }
    }

    consultar(true);
    const temporizador = setInterval(() => consultar(false), INTERVALO_ACTUALIZACION_MS);
    return () => {
      activo = false;
      clearInterval(temporizador);
    };
  }, [trayectoId, navigate]);

  async function confirmar() {
    if (!trayecto || enviando) return;
    cuposMostrados.current = trayecto.cupos_disponibles;
    setEnviando(true);
    setAviso(null);
    try {
      const respuesta = await reservarCupo(trayecto.id);
      if (respuesta.status === 401) {
        navigate("/login", { replace: true });
        return;
      }
      if (respuesta.trayecto) {
        setCarga({ estado: "listo", trayecto: respuesta.trayecto });
      }
      if (respuesta.ok) {
        setConfirmada(true);
        return;
      }
      setAviso(avisoDeRechazo(respuesta, cuposMostrados.current));
    } catch {
      setAviso({
        titulo: "No se pudo confirmar la reserva.",
        detalle: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
      });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla perfil">
      <EncabezadoSesion usuario={usuario} activo="Buscar" />

      <main className="perfil-cuerpo">
        <Link className="volver" to={rutaBusqueda}>
          ← Volver a la búsqueda
        </Link>
        <h1>Reservar trayecto</h1>
        <p className="perfil-intro">Revisa los detalles antes de confirmar tu lugar.</p>

        {carga.estado === "cargando" ? <p className="pista-lado">Cargando el trayecto…</p> : null}

        {carga.estado === "error" ? (
          <>
            <p className="aviso aviso-error" role="alert">
              {carga.mensaje}
            </p>
            <Link className="boton boton-cambiar" to={rutaBusqueda}>
              Volver a la búsqueda
            </Link>
          </>
        ) : null}

        {carga.estado === "listo" ? (
          <div className="publicar-grid">
            <div className="perfil-lado">
              <TarjetaTrayecto trayecto={trayecto} />

              <section className="tarjeta reservar-detalle">
                <h2>Punto de encuentro</h2>
                <p>
                  <strong>{trayecto.origen}</strong>
                </p>
                <p>
                  {fechaLarga(trayecto.fecha)} · Salida a las {hora12(trayecto.hora)}
                </p>
                <p>Destino: {trayecto.sede_destino}, Universidad del Cauca.</p>
                <p className="pista-lado">
                  Llega unos minutos antes de la salida y confirma el punto de encuentro con el conductor.
                </p>
              </section>

              <section className="tarjeta reservar-detalle">
                <div className="previa-cabecera">
                  <h2>{trayecto.conductor_nombre}</h2>
                  <p className="chip chip-ok">
                    <i />
                    Habilitado
                  </p>
                </div>
                <p>{resumenVehiculo(trayecto.vehiculo)}</p>
                <p>
                  Capacidad: {trayecto.vehiculo.capacidad_pasajeros} pasajeros · Aporte sugerido: $
                  {formatoPesos.format(trayecto.aporte_sugerido)} COP por persona.
                </p>
              </section>
            </div>

            <aside className="perfil-lado">
              <section className="tarjeta reservar-detalle" aria-live="polite">
                <h2>Resumen de tu reserva</h2>
                <p>Pasajero: {nombre}</p>
                <p>
                  1 cupo · {trayecto.origen} → {trayecto.sede_destino}
                </p>
                <p className="reservar-aporte">
                  <span>Aporte por persona</span>
                  <strong>${formatoPesos.format(trayecto.aporte_sugerido)} COP</strong>
                </p>
                <p>{textoCupos(trayecto)}</p>

                <Acciones
                  trayecto={trayecto}
                  confirmada={confirmada}
                  aviso={aviso}
                  enviando={enviando}
                  onConfirmar={confirmar}
                  rutaBusqueda={rutaBusqueda}
                />
              </section>

              <section className="consejo">
                <strong>Un aporte para el camino</strong>
                <span>
                  El valor ayuda a compartir los gastos del trayecto. Acuerda los detalles con el conductor.
                </span>
              </section>
            </aside>
          </div>
        ) : null}
      </main>

      <Pie />
    </div>
  );
}

// Mensajes y botones según el estado de la reserva.
function Acciones({ trayecto, confirmada, aviso, enviando, onConfirmar, rutaBusqueda }) {
  const volver = (
    <Link className="boton-contorno reservar-enlace" to={rutaBusqueda}>
      Volver a la búsqueda
    </Link>
  );

  if (confirmada || trayecto.reserva_id) {
    return (
      <>
        <p className="nota-ok nota-publicado" role="status">
          <span className="nota-icono" aria-hidden="true">
            <IconoCheck />
          </span>
          {confirmada
            ? "Reserva confirmada. Tu cupo quedó asegurado."
            : "Ya tienes una reserva confirmada en este trayecto."}
        </p>
        <Link className="boton reservar-enlace" to="/historial">
          <IconoFlecha />
          Ver mis reservas
        </Link>
        {trayecto.reserva_id ? (
          <Link
            className="boton-contorno reservar-enlace"
            to={`/reservas/contacto-conductor?reserva=${encodeURIComponent(trayecto.reserva_id)}`}
          >
            Contactar al conductor
          </Link>
        ) : null}
        {trayecto.reserva_id ? (
          <Link
            className="boton-contorno reservar-enlace"
            to={`/reservas/cancelar?reserva=${encodeURIComponent(trayecto.reserva_id)}`}
          >
            Cancelar reserva
          </Link>
        ) : null}
        {volver}
      </>
    );
  }

  if (trayecto.es_conductor) {
    return (
      <>
        <p className="aviso" role="status">
          Este es tu trayecto. No puedes reservar un cupo en él.
        </p>
        {volver}
      </>
    );
  }

  if (trayecto.estado === "Cancelado") {
    return (
      <>
        <p className="aviso aviso-error" role="alert">
          El conductor canceló este trayecto y ya no admite reservas.
        </p>
        {volver}
      </>
    );
  }

  if (!trayecto.vigente) {
    return (
      <>
        <p className="aviso aviso-error" role="alert">
          Este trayecto ya salió y no admite reservas.
        </p>
        {volver}
      </>
    );
  }

  return (
    <>
      {aviso ? (
        <div className="aviso aviso-error" role="alert">
          <strong>{aviso.titulo}</strong>
          {aviso.detalle ? <p>{aviso.detalle}</p> : null}
        </div>
      ) : null}
      <button
        className="boton reservar-enlace"
        type="button"
        onClick={onConfirmar}
        disabled={enviando || Boolean(aviso?.definitivo)}
      >
        <IconoFlecha />
        {enviando ? "Confirmando…" : "Confirmar reserva"}
      </button>
      <p className="pista-lado">Tu reserva ocupa 1 cupo.</p>
      {volver}
    </>
  );
}

function TarjetaTrayecto({ trayecto }) {
  const reservas = trayecto.cupos_reservados;
  const disponibles = trayecto.cupos_disponibles;
  const cancelado = trayecto.estado === "Cancelado";
  const disponible = !cancelado && trayecto.vigente && disponibles > 0;
  return (
    <article className="tarjeta tarjeta-previa">
      <div className="previa-cabecera">
        <strong>{fechaCorta(trayecto.fecha, trayecto.hora)}</strong>
        <p className={disponible ? "chip chip-ok" : "chip"}>
          <i />
          {cancelado ? "Cancelado" : disponible ? "Disponible" : disponibles > 0 ? "Finalizado" : "Agotado"}
        </p>
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
          <strong>${formatoPesos.format(trayecto.aporte_sugerido)}</strong>
          <small>COP / persona</small>
        </span>
      </div>
    </article>
  );
}

// Si la pantalla aún mostraba cupos cuando el pasajero confirmó, otra persona se llevó
// el último cupo en ese momento; si ya mostraba cero, el trayecto estaba agotado.
function avisoDeRechazo(respuesta, cuposMostrados) {
  if (respuesta.codigo === "CUPOS_AGOTADOS") {
    if (cuposMostrados > 0) {
      return {
        titulo: "No se creó la reserva porque el cupo ya fue asignado.",
        detalle: "Otra persona reservó el último cupo antes de completar tu solicitud.",
        definitivo: true,
      };
    }
    const cupos = respuesta.trayecto?.cupos;
    return {
      titulo: respuesta.mensaje || "Cupos agotados",
      detalle: cupos
        ? `Este trayecto ya tiene ${cupos === 1 ? "su cupo reservado" : `sus ${cupos} cupos reservados`}.`
        : null,
      definitivo: true,
    };
  }
  return {
    titulo: respuesta.mensaje || "No se pudo confirmar la reserva.",
    detalle: null,
    definitivo: respuesta.status === 403 || respuesta.status === 404 || respuesta.status === 409,
  };
}

function textoCupos(trayecto) {
  const disponibles = trayecto.cupos_disponibles;
  const ofrecidos = `${trayecto.cupos === 1 ? "del cupo ofrecido" : `de los ${trayecto.cupos} ofrecidos`}`;
  if (disponibles === 0) {
    return trayecto.cupos === 1
      ? "El único cupo ofrecido ya está reservado."
      : `No quedan cupos disponibles ${ofrecidos}.`;
  }
  if (disponibles === 1) return `Queda 1 cupo disponible ${ofrecidos}.`;
  return `Quedan ${disponibles} cupos disponibles ${ofrecidos}.`;
}

function rutaDeBusqueda(parametros) {
  const filtros = new URLSearchParams();
  for (const filtro of FILTROS) {
    const valor = parametros.get(filtro);
    if (valor) filtros.set(filtro, valor);
  }
  const consulta = filtros.toString();
  return consulta ? `/trayectos/buscar?${consulta}` : "/trayectos/buscar";
}

function resumenVehiculo(vehiculo) {
  const modelo = [vehiculo.marca, vehiculo.modelo].filter(Boolean).join(" ");
  return [modelo, vehiculo.color, vehiculo.placa].filter(Boolean).join(" · ");
}

function hora12(hora) {
  const [h, m] = hora.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${sufijo}`;
}

function fechaCorta(fecha, hora) {
  const [, mes, dia] = fecha.split("-").map(Number);
  return `${dia} ${MESES[mes - 1]} · ${hora12(hora)}`;
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
