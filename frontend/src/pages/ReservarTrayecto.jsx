import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Aviso, Boton, Cargando, Chip, EncabezadoPagina, Tarjeta } from "@/components/ui";
import { IconoFlecha } from "../components/Iconos.jsx";
import { obtenerTrayecto, reservarCupo } from "../services/reservas.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";
import TarjetaTrayecto from "../components/TarjetaTrayecto.jsx";
import { fechaLarga, hora12, pesos } from "../components/formatoTrayecto.js";

// Reserva de un cupo (E04-HU07) · /trayectos/reservar?trayecto=<id>
// La URL conserva los filtros de la búsqueda para poder volver a ella sin perderlos.

const FILTROS = ["sedeDestinoId", "fecha", "horaDesde"];
const INTERVALO_ACTUALIZACION_MS = 5000;

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
        <EncabezadoPagina
          titulo="Reservar trayecto"
          intro="Revisa los detalles antes de confirmar tu lugar."
          volver={{ texto: "Volver a la búsqueda", to: rutaBusqueda }}
        />

        {carga.estado === "cargando" ? <Cargando>Cargando el trayecto…</Cargando> : null}

        {carga.estado === "error" ? (
          <>
            <Aviso tono="error">{carga.mensaje}</Aviso>
            <Boton className="boton-cambiar" to={rutaBusqueda}>
              Volver a la búsqueda
            </Boton>
          </>
        ) : null}

        {carga.estado === "listo" ? (
          <div className="publicar-grid">
            <div className="perfil-lado reservar-principal">
              <TarjetaTrayecto trayecto={trayecto} {...etiquetaDe(trayecto)} />

              <Tarjeta titulo="Detalles del viaje" className="reservar-detalle reservar-viaje">
                <dl className="reservar-datos">
                  <div>
                    <dt>Punto de encuentro</dt>
                    <dd>{trayecto.origen}</dd>
                  </div>
                  <div>
                    <dt>Salida</dt>
                    <dd>
                      {fechaLarga(trayecto.fecha)} · {hora12(trayecto.hora)}
                    </dd>
                  </div>
                  <div>
                    <dt>Destino</dt>
                    <dd>{trayecto.sede_destino}, Universidad del Cauca</dd>
                  </div>
                  <div>
                    <dt>Conductor</dt>
                    <dd>
                      {trayecto.conductor_nombre}{" "}
                      <Chip tono="exito" punto className="chip-pequeno">
                        Habilitado
                      </Chip>
                    </dd>
                  </div>
                  <div>
                    <dt>Vehículo</dt>
                    <dd>
                      {resumenVehiculo(trayecto.vehiculo)} · {trayecto.vehiculo.capacidad_pasajeros} pasajeros
                    </dd>
                  </div>
                </dl>
                <p className="pista-lado">
                  Llega unos minutos antes de la salida y confirma el punto de encuentro con el conductor.
                </p>
              </Tarjeta>
            </div>

            <aside className="perfil-lado reservar-lado">
              <Tarjeta titulo="Resumen de tu reserva" className="reservar-detalle" aria-live="polite">
                <p>Pasajero: {nombre}</p>
                <p>
                  1 cupo · {trayecto.origen} → {trayecto.sede_destino}
                </p>
                <p className="reservar-aporte">
                  <span>Aporte por persona</span>
                  <strong>{pesos(trayecto.aporte_sugerido)} COP</strong>
                </p>
                <p className="pista-lado">
                  El aporte ayuda a compartir los gastos del trayecto. Acuerda los detalles con el conductor.
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
              </Tarjeta>
            </aside>
          </div>
        ) : null}
      </main>

      <Pie />
    </div>
  );
}

// Mensajes y botones según el estado de la reserva.
// Cada estado tiene un único botón principal. Tras confirmar, el siguiente paso natural es
// escribirle al conductor para coordinar el encuentro (E05-HU10).
function Acciones({ trayecto, confirmada, aviso, enviando, onConfirmar, rutaBusqueda }) {
  const volver = (
    <Boton variante="secundario" to={rutaBusqueda}>
      Volver a la búsqueda
    </Boton>
  );

  if (confirmada || trayecto.reserva_id) {
    const reserva = trayecto.reserva_id ? encodeURIComponent(trayecto.reserva_id) : null;
    return (
      <>
        <Aviso tono="exito" icono titulo={confirmada ? "Reserva confirmada" : "Ya tienes una reserva en este trayecto"}>
          {confirmada ? "Tu cupo quedó asegurado. " : ""}Escríbele al conductor para coordinar el punto de encuentro.
        </Aviso>
        {reserva ? (
          <Boton to={`/reservas/contacto-conductor?reserva=${reserva}`} icono={<IconoFlecha />}>
            Contactar al conductor
          </Boton>
        ) : null}
        <Boton variante={reserva ? "secundario" : "primario"} to="/historial">
          Ver mis reservas
        </Boton>
        {reserva ? (
          <Link className="enlace-discreto" to={`/reservas/cancelar?reserva=${reserva}`}>
            Cancelar reserva
          </Link>
        ) : null}
      </>
    );
  }

  if (trayecto.es_conductor) {
    return (
      <>
        <Aviso>Este es tu trayecto. No puedes reservar un cupo en él.</Aviso>
        {volver}
      </>
    );
  }

  if (trayecto.estado === "Cancelado") {
    return (
      <>
        <Aviso tono="error">El conductor canceló este trayecto y ya no admite reservas.</Aviso>
        {volver}
      </>
    );
  }

  if (!trayecto.vigente) {
    return (
      <>
        <Aviso tono="error">Este trayecto ya salió y no admite reservas.</Aviso>
        {volver}
      </>
    );
  }

  return (
    <>
      {aviso ? (
        <Aviso tono="error" titulo={aviso.titulo}>
          {aviso.detalle ? <p>{aviso.detalle}</p> : null}
        </Aviso>
      ) : null}
      <Boton
        onClick={onConfirmar}
        disabled={Boolean(aviso?.definitivo)}
        cargando={enviando}
        textoCargando="Confirmando…"
        icono={<IconoFlecha />}
      >
        Confirmar reserva
      </Boton>
      <p className="pista-lado">Tu reserva ocupa 1 cupo.</p>
      {/* Si la reserva no se pudo crear, se ofrece volver a la búsqueda con los mismos filtros (CA-HU07-03). */}
      {aviso ? volver : null}
    </>
  );
}

// Etiqueta de la tarjeta según el estado del trayecto.
function etiquetaDe(trayecto) {
  if (trayecto.estado === "Cancelado") return { estado: "Cancelado", tono: "error" };
  if (!trayecto.vigente) return { estado: "Finalizado", tono: "neutro" };
  if (trayecto.cupos_disponibles === 0) return { estado: "Agotado", tono: "neutro" };
  return { estado: "Disponible", tono: "exito" };
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

