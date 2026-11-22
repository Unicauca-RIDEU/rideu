import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { Aviso, Boton, Cargando, EncabezadoPagina, EstadoVacio, tonoDeEstado } from "@/components/ui";
import { obtenerHistorial } from "../services/historial.js";
import Pie from "../components/Pie.jsx";
import EncabezadoSesion from "../components/EncabezadoSesion.jsx";
import TarjetaViaje from "../components/TarjetaViaje.jsx";
import { pesos } from "../components/formatoTrayecto.js";
import { datosParaRepetir } from "../services/trayectosFrecuentes.js";

// Historial de trayectos y reservas (E04-HU09) · /historial[?vista=pasajero|conductor]
// Es el punto de partida para gestionar los viajes propios: cada tarjeta lleva a contactar,
// cancelar o editar con el viaje ya seleccionado. La vista elegida queda en la URL.

const VISTAS = [
  { id: "pasajero", titulo: "Como pasajero" },
  { id: "conductor", titulo: "Como conductor" },
];

export default function Historial() {
  const navigate = useNavigate();
  const { usuario } = useOutletContext();
  const [parametros, setParametros] = useSearchParams();
  const [carga, setCarga] = useState({ estado: "cargando" });
  const pestanas = useRef({});

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
  const cantidades = { pasajero: reservas.length, conductor: trayectos.length };
  const vista = vistaInicial(parametros.get("vista"), reservas, trayectos);

  function elegir(id) {
    setParametros({ vista: id }, { replace: true });
  }

  // Flechas izquierda y derecha para moverse entre pestañas (patrón de pestañas accesibles).
  function teclaPestana(evento) {
    if (evento.key !== "ArrowLeft" && evento.key !== "ArrowRight") return;
    const indice = VISTAS.findIndex((item) => item.id === vista);
    const siguiente = VISTAS[(indice + (evento.key === "ArrowRight" ? 1 : VISTAS.length - 1)) % VISTAS.length];
    elegir(siguiente.id);
    pestanas.current[siguiente.id]?.focus();
  }

  return (
    <div className="pantalla perfil">
      <EncabezadoSesion usuario={usuario} activo="Historial" />

      <main className="perfil-cuerpo">
        <EncabezadoPagina
          titulo="Historial"
          intro="Tus viajes como pasajero y como conductor. Desde aquí puedes contactar, editar o cancelar."
          volver={{ texto: "Volver al panel", to: "/panel" }}
        />

        {carga.estado === "cargando" ? <Cargando>Cargando tu historial…</Cargando> : null}

        {carga.estado === "error" ? (
          <Aviso tono="error">
            {carga.mensaje || "No se pudo cargar el historial. Recarga la página para intentarlo de nuevo."}
          </Aviso>
        ) : null}

        {carga.estado === "listo" && total === 0 ? (
          <EstadoVacio
            mensaje={carga.mensaje || "Aún no tienes registros en tu historial."}
            accion={{ texto: "Buscar trayecto", to: "/trayectos/buscar" }}
          />
        ) : null}

        {carga.estado === "listo" && total > 0 ? (
          <>
            <div className="pestanas" role="tablist" aria-label="Tipo de viaje">
              {VISTAS.map((item) => (
                <button
                  key={item.id}
                  ref={(nodo) => {
                    pestanas.current[item.id] = nodo;
                  }}
                  id={`pestana-${item.id}`}
                  className="pestana"
                  type="button"
                  role="tab"
                  aria-selected={vista === item.id}
                  aria-controls={`panel-${item.id}`}
                  tabIndex={vista === item.id ? 0 : -1}
                  onClick={() => elegir(item.id)}
                  onKeyDown={teclaPestana}
                >
                  {item.titulo} <span className="pestana-cantidad">{cantidades[item.id]}</span>
                </button>
              ))}
            </div>

            <section id={`panel-${vista}`} role="tabpanel" aria-labelledby={`pestana-${vista}`}>
              {vista === "pasajero" ? <VistaPasajero reservas={reservas} /> : <VistaConductor trayectos={trayectos} />}
            </section>
          </>
        ) : null}
      </main>

      <Pie />
    </div>
  );
}

function VistaPasajero({ reservas }) {
  if (reservas.length === 0) {
    return (
      <EstadoVacio mensaje="Aún no tienes reservas." accion={{ texto: "Buscar trayecto", to: "/trayectos/buscar" }} />
    );
  }
  return (
    <Grupos
      lista={reservas}
      tarjeta={(reserva) => (
        <TarjetaViaje
          viaje={reserva}
          estado={reserva.estado_historial}
          tono={tonoDeEstado(reserva.estado_historial)}
          detalle={`${reserva.conductor_nombre} · 1 cupo · ${pesos(reserva.aporte_sugerido)} COP`}
          acciones={accionesReserva(reserva)}
        />
      )}
    />
  );
}

function VistaConductor({ trayectos }) {
  if (trayectos.length === 0) {
    return (
      <EstadoVacio
        mensaje="Aún no has publicado trayectos."
        accion={{ texto: "Publicar trayecto", to: "/trayectos/publicar" }}
      />
    );
  }
  return (
    <Grupos
      lista={trayectos}
      tarjeta={(trayecto) => {
        const pasajeros = trayecto.cupos - trayecto.cupos_disponibles;
        return (
          <TarjetaViaje
            viaje={trayecto}
            estado={trayecto.estado_historial}
            tono={tonoDeEstado(trayecto.estado_historial)}
            detalle={`${pasajeros} de ${trayecto.cupos} ${trayecto.cupos === 1 ? "cupo reservado" : "cupos reservados"} · ${pesos(trayecto.aporte_sugerido)} COP`}
            acciones={accionesTrayecto(trayecto, pasajeros)}
          />
        );
      }}
    />
  );
}

// Próximos primero (el más cercano arriba) y después los anteriores (el más reciente arriba).
function Grupos({ lista, tarjeta }) {
  const proximos = lista.filter((item) => item.estado_historial === "Pendiente").sort(porSalida);
  const anteriores = lista
    .filter((item) => item.estado_historial !== "Pendiente")
    .sort((a, b) => porSalida(b, a));
  return (
    <>
      <Grupo titulo="Próximos" lista={proximos} tarjeta={tarjeta} vacio="No tienes viajes próximos." />
      <Grupo titulo="Anteriores" lista={anteriores} tarjeta={tarjeta} />
    </>
  );
}

function Grupo({ titulo, lista, tarjeta, vacio }) {
  if (lista.length === 0 && !vacio) return null;
  return (
    <section className="historial-grupo">
      <h2 className="historial-titulo">
        {titulo} <span>({lista.length})</span>
      </h2>
      {lista.length === 0 ? (
        <p className="pista-lado">{vacio}</p>
      ) : (
        <ul className="buscar-resultados historial-lista">
          {lista.map((item) => (
            <li key={item.id}>{tarjeta(item)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Una acción principal por tarjeta; las demás quedan como enlaces discretos.
function accionesReserva(reserva) {
  if (reserva.estado !== "Confirmada") return null;
  const id = encodeURIComponent(reserva.id);
  const contactar = `/reservas/contacto-conductor?reserva=${id}`;
  if (reserva.estado_historial !== "Pendiente") {
    return (
      <Boton variante="secundario" to={contactar}>
        Contactar al conductor
      </Boton>
    );
  }
  return (
    <>
      <Boton to={contactar}>Contactar al conductor</Boton>
      <Link className="enlace-discreto" to={`/reservas/cancelar?reserva=${id}`} state={{ desde: "historial" }}>
        Cancelar reserva
      </Link>
    </>
  );
}

function accionesTrayecto(trayecto, pasajeros) {
  const id = encodeURIComponent(trayecto.id);
  const repetir = (
    <Link className="enlace-secundario" to="/trayectos/publicar" state={{ repetir: datosParaRepetir(trayecto) }}>
      Repetir trayecto
    </Link>
  );
  if (trayecto.estado_historial === "Cancelado") {
    return repetir;
  }
  const contactar = `/trayectos/pasajeros/contacto?trayecto=${id}`;
  if (trayecto.estado_historial !== "Pendiente") {
    return (
      <>
        <Boton variante="secundario" to={contactar}>
          Contactar pasajeros
        </Boton>
        {repetir}
      </>
    );
  }
  const editar = `/trayectos/editar?trayecto=${id}`;
  // Con pasajeros, lo urgente es coordinar con ellos; sin pasajeros, mantener la oferta al día.
  return (
    <>
      {pasajeros > 0 ? (
        <Boton to={contactar}>Contactar pasajeros</Boton>
      ) : (
        <Boton to={editar} state={{ desde: "historial" }}>
          Editar o cancelar
        </Boton>
      )}
      <div className="enlaces-tarjeta">
        {pasajeros > 0 ? (
          <Link className="enlace-secundario" to={editar} state={{ desde: "historial" }}>
            Editar o cancelar
          </Link>
        ) : null}
        {repetir}
      </div>
    </>
  );
}

// Sin vista en la URL, se abre la que tenga el próximo viaje; si no hay próximos, la que tenga registros.
function vistaInicial(pedida, reservas, trayectos) {
  if (VISTAS.some((item) => item.id === pedida)) return pedida;
  const proximo = (lista) =>
    lista.filter((item) => item.estado_historial === "Pendiente").sort(porSalida)[0] ?? null;
  const reserva = proximo(reservas);
  const trayecto = proximo(trayectos);
  if (reserva && trayecto) return porSalida(reserva, trayecto) <= 0 ? "pasajero" : "conductor";
  if (reserva) return "pasajero";
  if (trayecto) return "conductor";
  return reservas.length > 0 || trayectos.length === 0 ? "pasajero" : "conductor";
}

function porSalida(a, b) {
  return `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`);
}
