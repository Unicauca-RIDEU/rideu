import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { IconoAuto, IconoFlecha } from "../components/Iconos.jsx";
import { buscarTrayectos, obtenerSedes } from "../services/trayectos.js";

// Búsqueda de trayectos (E03-HU06) · /trayectos/buscar
// Los filtros viven en la URL para conservarlos al recargar o al volver desde otra pantalla.

const NAV = ["Inicio", "Buscar", "Publicar", "Historial"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_LARGOS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const formatoPesos = new Intl.NumberFormat("es-CO");

export default function BuscarTrayecto() {
  const { usuario } = useOutletContext();
  const navigate = useNavigate();
  const [parametros, setParametros] = useSearchParams();
  const selectorSede = useRef(null);
  const [sedes, setSedes] = useState([]);
  const [filtros, setFiltros] = useState(() => ({
    sedeDestinoId: parametros.get("sedeDestinoId") ?? "",
    fecha: parametros.get("fecha") ?? hoyEnColombia(),
    horaDesde: parametros.get("horaDesde") ?? "",
  }));
  const [errores, setErrores] = useState({});
  const [busqueda, setBusqueda] = useState({ estado: "inicial" });
  const [intento, setIntento] = useState(0);

  const nombre = usuario?.nombre || "Tu perfil";
  const siglas = iniciales(nombre);
  const consulta = parametros.toString();

  useEffect(() => {
    let activo = true;
    obtenerSedes()
      .then((respuesta) => {
        if (!activo) return;
        if (respuesta.status === 401) navigate("/login", { replace: true });
        else if (respuesta.ok) setSedes(respuesta.sedes);
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, [navigate]);

  // Cada vez que cambian los filtros de la URL se repite la búsqueda.
  useEffect(() => {
    const actuales = Object.fromEntries(new URLSearchParams(consulta));
    if (!actuales.sedeDestinoId || !actuales.fecha || !actuales.horaDesde) return undefined;

    let activo = true;
    setBusqueda({ estado: "buscando" });
    buscarTrayectos(actuales)
      .then((respuesta) => {
        if (!activo) return;
        if (respuesta.status === 401) {
          navigate("/login", { replace: true });
          return;
        }
        if (!respuesta.ok) {
          setErrores(erroresPorCampo(respuesta.errores));
          setBusqueda({ estado: "error", mensaje: respuesta.mensaje || "No se pudo buscar." });
          return;
        }
        setBusqueda({ estado: "listo", ...respuesta });
      })
      .catch(() => {
        if (activo) {
          setBusqueda({
            estado: "error",
            mensaje: "No se pudo conectar con el servidor. Inténtalo de nuevo.",
          });
        }
      });
    return () => {
      activo = false;
    };
  }, [consulta, intento, navigate]);

  function cambiar(evento) {
    const { name, value } = evento.target;
    setFiltros((actual) => ({ ...actual, [name]: value }));
    setErrores((actual) => ({ ...actual, [name]: "" }));
  }

  function buscar(evento) {
    evento.preventDefault();
    const faltantes = {};
    if (!filtros.sedeDestinoId) faltantes.sedeDestinoId = "Selecciona la sede";
    if (!filtros.fecha) faltantes.fecha = "Selecciona la fecha";
    if (!filtros.horaDesde) faltantes.horaDesde = "Selecciona la hora";
    if (Object.keys(faltantes).length > 0) {
      setErrores(faltantes);
      return;
    }
    setErrores({});
    setParametros(filtros);
    setIntento((actual) => actual + 1);
  }

  function cambiarFiltros() {
    selectorSede.current?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          {NAV.map((item) => (
            <span key={item} className={item === "Buscar" ? "nav-activo" : undefined}>
              {item}
            </span>
          ))}
          <span className="perfil-usuario">
            <span className="avatar" aria-hidden="true">
              {siglas}
            </span>
            <strong>{nombre}</strong>
          </span>
        </div>
      </header>

      <main className="perfil-cuerpo">
        <Link className="volver" to="/panel">
          ← Volver al panel
        </Link>
        <p className="perfil-ruta">/trayectos/buscar</p>
        <h1>Buscar trayecto</h1>
        <p className="perfil-intro">Encuentra personas que comparten tu camino a la U.</p>

        <form className="tarjeta buscar-filtros" onSubmit={buscar} noValidate>
          <h2>¿A qué sede vas?</h2>
          <div className="buscar-campos">
            <Campo etiqueta="Sede de destino" error={errores.sedeDestinoId}>
              <select
                ref={selectorSede}
                name="sedeDestinoId"
                value={filtros.sedeDestinoId}
                onChange={cambiar}
                aria-invalid={Boolean(errores.sedeDestinoId)}
              >
                <option value="">Selecciona la sede</option>
                {sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo etiqueta="Fecha" error={errores.fecha}>
              <input
                type="date"
                name="fecha"
                value={filtros.fecha}
                onChange={cambiar}
                aria-invalid={Boolean(errores.fecha)}
              />
            </Campo>
            <Campo etiqueta="Hora desde" error={errores.horaDesde}>
              <input
                type="time"
                name="horaDesde"
                value={filtros.horaDesde}
                onChange={cambiar}
                aria-invalid={Boolean(errores.horaDesde)}
              />
            </Campo>
            <button className="boton boton-buscar" type="submit" disabled={busqueda.estado === "buscando"}>
              <IconoFlecha />
              {busqueda.estado === "buscando" ? "Buscando…" : "Buscar"}
            </button>
          </div>
        </form>

        <div className="publicar-grid buscar-grid">
          <section aria-live="polite">
            <Resultados busqueda={busqueda} onCambiarFiltros={cambiarFiltros} />
          </section>

          <aside className="perfil-lado">
            <section className="consejo">
              <strong>Comparte el camino con confianza</strong>
              <span>
                Todos los trayectos pertenecen a la comunidad de la Universidad del Cauca, en Popayán.
              </span>
            </section>
            <section className="tarjeta antes-reservar">
              <h2>Antes de reservar</h2>
              <p>Revisa la hora, el punto de encuentro y los cupos disponibles.</p>
              <p>El aporte se muestra en COP por persona. Cada reserva corresponde a 1 cupo.</p>
              <p className="pista-lado">Capacidad máxima: 4 pasajeros por vehículo.</p>
            </section>
          </aside>
        </div>
      </main>

      <footer className="pie">
        <p>RideU · Hecho para la comunidad Unicauca</p>
        <p>¿Necesitas ayuda? · Privacidad y condiciones</p>
      </footer>
    </div>
  );
}

function Resultados({ busqueda, onCambiarFiltros }) {
  if (busqueda.estado === "inicial") {
    return (
      <p className="pista-lado">Selecciona la sede, la fecha y la hora para ver los trayectos disponibles.</p>
    );
  }
  if (busqueda.estado === "buscando") {
    return <p className="pista-lado">Buscando trayectos…</p>;
  }
  if (busqueda.estado === "error") {
    return (
      <p className="aviso aviso-error" role="alert">
        {busqueda.mensaje}
      </p>
    );
  }

  const { total, trayectos, filtros, mensaje } = busqueda;
  return (
    <>
      <h2 className="buscar-total">
        {total} {total === 1 ? "trayecto disponible" : "trayectos disponibles"}
      </h2>
      <p className="buscar-subtitulo">{fechaLarga(filtros.fecha)} · Ordenados por hora de salida</p>

      {total === 0 ? (
        <div className="tarjeta buscar-vacio">
          <IlustracionRuta />
          <h3>{mensaje}</h3>
          <p>Prueba con otra fecha u hora para encontrar un trayecto a {filtros.sedeDestino}.</p>
          <button className="boton boton-cambiar" type="button" onClick={onCambiarFiltros}>
            Cambiar filtros
          </button>
        </div>
      ) : (
        <ul className="buscar-resultados">
          {trayectos.map((trayecto) => (
            <li key={trayecto.id}>
              <TarjetaTrayecto trayecto={trayecto} />
              <div className="acciones-trayecto">
                <button className="boton-contorno" type="button" disabled title="Disponible próximamente (HU07)">
                  Ver trayecto
                </button>
                <button className="boton" type="button" disabled title="Disponible próximamente (HU07)">
                  <IconoFlecha />
                  Reservar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function TarjetaTrayecto({ trayecto }) {
  const reservas = trayecto.cupos_reservados;
  const disponibles = trayecto.cupos_disponibles;
  return (
    <article className="tarjeta tarjeta-previa">
      <div className="previa-cabecera">
        <strong>{fechaCorta(trayecto.fecha, trayecto.hora)}</strong>
        <p className="chip chip-ok">
          <i />
          Disponible
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

function Campo({ etiqueta, error, children }) {
  return (
    <label className="campo">
      <span className="campo-etiqueta">{etiqueta}</span>
      <span className={error ? "caja caja-error" : "caja"}>{children}</span>
      {error ? <small>{error}</small> : null}
    </label>
  );
}

function IlustracionRuta() {
  return (
    <svg className="buscar-ilustracion" viewBox="0 0 240 90" aria-hidden="true">
      <path d="M10 80 C 60 80, 70 30, 110 40 S 180 70, 225 15" fill="none" stroke="#c9d6ea" strokeWidth="3" strokeDasharray="4 7" />
      <rect x="98" y="30" width="34" height="18" rx="6" fill="#fff" stroke="#c9d6ea" strokeWidth="2" />
      <circle cx="225" cy="15" r="7" fill="#fff" stroke="#c9d6ea" strokeWidth="2" />
    </svg>
  );
}

function hoyEnColombia() {
  return new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function fechaCorta(fecha, hora) {
  const [, mes, dia] = fecha.split("-").map(Number);
  const [h, m] = hora.split(":").map(Number);
  const sufijo = h < 12 ? "a. m." : "p. m.";
  const hora12 = h % 12 === 0 ? 12 : h % 12;
  return `${dia} ${MESES[mes - 1]} · ${hora12}:${String(m).padStart(2, "0")} ${sufijo}`;
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

function erroresPorCampo(errores = []) {
  return Object.fromEntries(errores.map((error) => [error.campo, error.mensaje]));
}
